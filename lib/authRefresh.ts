import { parseJwt } from "./pkce";
import { getAxusGraphQLEndpoint } from "./axusEndpoint";

const AXUS_GRAPHQL_ENDPOINT = getAxusGraphQLEndpoint();

const USER_DETAILS_QUERY = `
  query UserDetails($auid: ID!) {
    usernames(auid: $auid) {
      defaultUsername
    }
    defaultVariation(auid: $auid) {
      variationId
    }
    variations(auid: $auid) {
      id
    }
  }
`;

const VARIATION_NAME_QUERY = `
  query VariationName($variationId: ID!) {
    name(variationId: $variationId) {
      displayName
    }
  }
`;

export interface RefreshResult {
  auid: string;
  username: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function refreshTokens(refreshToken: string): Promise<RefreshResult> {
  const issuer = process.env.NEXT_PUBLIC_AXUS_ID_ISSUER || "https://axusid-website.vercel.app";
  const tokenResponse = await fetch(`${issuer}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.NEXT_PUBLIC_AXUS_ID_CLIENT_ID!,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to refresh token: ${tokenResponse.status} ${tokenResponse.statusText}. Details: ${errorText}`);
  }

  const tokens = await tokenResponse.json();
  const rawTokenToParse = tokens.id_token || tokens.access_token;
  const tokenPayload = parseJwt(rawTokenToParse);
  if (!tokenPayload || !tokenPayload.sub) {
    throw new Error("Invalid token payload during refresh (missing sub/auid)");
  }

  const auid = tokenPayload.sub;
  const username = tokenPayload.preferred_username || tokenPayload.username || "axus_user";
  
  let expiresIn = tokens.expires_in || 43200;
  if (tokenPayload.exp) {
    const calculatedExpiresIn = Math.floor(tokenPayload.exp - (Date.now() / 1000));
    if (calculatedExpiresIn > 0) {
      expiresIn = calculatedExpiresIn;
    }
  }

  // Fetch user details raw GraphQL query to avoid dependencies in Edge runtime
  let displayName = `@${username}`;
  try {
    const res = await fetch(AXUS_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: USER_DETAILS_QUERY,
        variables: { auid: String(auid) },
      }),
    });
    
    if (res.ok) {
      const responseData = await res.json();
      const data = responseData?.data;
      const defaultUsername = data?.usernames?.defaultUsername || username;
      let varId = data?.defaultVariation?.variationId;
      if (!varId && data?.variations && data.variations.length > 0) {
        varId = data.variations[0].id;
      }

      if (varId) {
        const nameRes = await fetch(AXUS_GRAPHQL_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: VARIATION_NAME_QUERY,
            variables: { variationId: varId },
          }),
        });
        if (nameRes.ok) {
          const nameData = await nameRes.json();
          const nameText = nameData?.data?.name?.displayName?.trim();
          if (nameText && nameText !== "Default Variation") {
            displayName = nameText;
          } else {
            displayName = `@${defaultUsername}`;
          }
        } else {
          displayName = `@${defaultUsername}`;
        }
      } else {
        displayName = `@${defaultUsername}`;
      }
    }
  } catch (err) {
    console.error("Failed to fetch user details during token refresh:", err);
  }

  return {
    auid,
    username,
    displayName,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || refreshToken,
    expiresIn,
  };
}
