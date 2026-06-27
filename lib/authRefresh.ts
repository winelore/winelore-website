import { parseJwt } from "./pkce";

const AXUS_GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_AXUS_GRAPHQL_ENDPOINT || "http://hayabusa.proxy.rlwy.net:58687/graphql";

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
      firstName
      lastName
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

const REFRESH_MUTATION = `
  mutation RefreshCredentials($refreshToken: String!) {
    refreshCredentials(refreshToken: $refreshToken) {
      accessToken
      refreshToken
      accessTokenExpiresAt
    }
  }
`;

export async function refreshTokens(refreshToken: string): Promise<RefreshResult> {
  const refreshResponse = await fetch(AXUS_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: REFRESH_MUTATION,
      variables: { refreshToken },
    }),
  });

  if (!refreshResponse.ok) {
    throw new Error(`Failed to refresh token network error: ${refreshResponse.status} ${refreshResponse.statusText}`);
  }

  const refreshData = await refreshResponse.json();
  if (refreshData.errors || !refreshData.data?.refreshCredentials) {
    throw new Error(`GraphQL Error during refresh: ${JSON.stringify(refreshData.errors || "Unknown error")}`);
  }

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshData.data.refreshCredentials;
  
  const tokenPayload = parseJwt(newAccessToken);
  if (!tokenPayload || !tokenPayload.sub) {
    throw new Error("Invalid token payload during refresh (missing sub/auid)");
  }

  const auid = tokenPayload.sub;
  const username = tokenPayload.preferred_username || tokenPayload.username || "axus_user";
  
  let expiresIn = 43200;
  if (tokenPayload.exp) {
    expiresIn = Math.floor(tokenPayload.exp - (Date.now() / 1000));
    if (expiresIn <= 0) expiresIn = 43200;
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
      let defaultVar = null;
      if (data?.defaultVariation?.variationId) {
        defaultVar = data.variations?.find((v: any) => v.id === data.defaultVariation?.variationId);
      }
      if (!defaultVar && data?.variations && data.variations.length > 0) {
        defaultVar = data.variations[0];
      }

      const fName = defaultVar?.firstName?.trim();
      const lName = defaultVar?.lastName?.trim();
      const isPlaceholder = fName === "Default" && lName === "Variation";

      if ((fName || lName) && !isPlaceholder) {
        displayName = [fName, lName].filter(Boolean).join(" ");
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
    accessToken: newAccessToken,
    refreshToken: newRefreshToken || refreshToken,
    expiresIn,
  };
}
