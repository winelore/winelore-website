import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseJwt } from "@/lib/pkce";
import { axusSdk } from "@/lib/axusClient";
import { applySessionCookies } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const error = params.get("error");
  if (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  }

  const code = params.get("code");
  const state = params.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("axus_oauth_state")?.value;
  const codeVerifier = cookieStore.get("axus_code_verifier")?.value;

  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    console.error("Invalid state or verifier", { code, state, expectedState, codeVerifier });
    return NextResponse.redirect(new URL("/?error=invalid_state", request.url));
  }

  const issuer = process.env.NEXT_PUBLIC_AXUS_ID_ISSUER || "https://axusid-website.vercel.app";

  try {
    const tokenResponse = await fetch(`${issuer}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.NEXT_PUBLIC_AXUS_ID_REDIRECT_URI!,
        client_id: process.env.NEXT_PUBLIC_AXUS_ID_CLIENT_ID!,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.redirect(new URL("/?error=token_exchange", request.url));
    }

    const tokens = await tokenResponse.json();
    const idTokenPayload = parseJwt(tokens.id_token);
    
    if (!idTokenPayload || !idTokenPayload.sub) {
      console.error("Invalid ID Token payload", idTokenPayload);
      return NextResponse.redirect(new URL("/?error=invalid_id_token", request.url));
    }

    const auid = idTokenPayload.sub;
    const username = idTokenPayload.preferred_username || "axus_user";

    // Fetch display name from AXUS GraphQL API
    let displayName = `@${username}`;
    try {
      const res = await axusSdk.UserDetails({ auid: String(auid) });
      const defaultUsername = res?.usernames?.defaultUsername || username;
      let defaultVar = null;
      if (res?.defaultVariation?.variationId) {
        defaultVar = res.variations?.find(v => v.id === res.defaultVariation?.variationId);
      }
      if (!defaultVar && res?.variations && res.variations.length > 0) {
        defaultVar = res.variations[0];
      }

      const fName = defaultVar?.firstName?.trim();
      const lName = defaultVar?.lastName?.trim();
      const isPlaceholder = fName === "Default" && lName === "Variation";

      if ((fName || lName) && !isPlaceholder) {
        displayName = [fName, lName].filter(Boolean).join(" ");
      } else {
        displayName = `@${defaultUsername}`;
      }
    } catch (err) {
      console.error("Failed to fetch user details during callback:", err);
    }

    await applySessionCookies(cookieStore, tokens, displayName);

    // Clean up temporary OAuth cookies
    cookieStore.delete("axus_oauth_state");
    cookieStore.delete("axus_code_verifier");

    return NextResponse.redirect(new URL("/", request.url));
  } catch (err) {
    console.error("Callback route execution error:", err);
    return NextResponse.redirect(new URL("/?error=callback_error", request.url));
  }
}
