import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeAuthorizationCode,
  sessionFromTokenResponse,
  validateCallbackParams,
} from "@winelore/core/auth";
import { getAxusConfig } from "@/lib/axusConfig";
import { writeSessionCookies } from "@/lib/authCookies";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const cookieStore = await cookies();

  const validation = validateCallbackParams(
    {
      code: params.get("code"),
      state: params.get("state"),
      error: params.get("error"),
    },
    {
      state: cookieStore.get("axus_oauth_state")?.value,
      codeVerifier: cookieStore.get("axus_code_verifier")?.value,
    },
  );

  if (!validation.ok) {
    console.error("OAuth callback rejected:", validation.reason);
    return NextResponse.redirect(new URL(`/?error=${validation.reason}`, request.url));
  }

  const config = getAxusConfig();
  const redirectUri = new URL("/callback", request.url).toString();

  try {
    const tokens = await exchangeAuthorizationCode(config, {
      code: validation.code,
      redirectUri,
      codeVerifier: validation.codeVerifier,
    });
    const session = await sessionFromTokenResponse(config, tokens);

    writeSessionCookies(cookieStore, session);

    // The PKCE handshake is finished; these must not outlive it.
    cookieStore.delete("axus_oauth_state");
    cookieStore.delete("axus_code_verifier");

    return NextResponse.redirect(new URL("/", request.url));
  } catch (err) {
    console.error("Callback route execution error:", err);
    return NextResponse.redirect(new URL("/?error=callback_error", request.url));
  }
}
