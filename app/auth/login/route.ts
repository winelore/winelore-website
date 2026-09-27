import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuthorizeUrl, createPkcePair } from "@winelore/core/auth";
import { getAxusConfig, webCrypto } from "@/lib/axusConfig";

export async function GET(request: NextRequest) {
  const config = getAxusConfig();
  const { codeVerifier, codeChallenge } = await createPkcePair(webCrypto);
  const state = webCrypto.randomUuid();

  const cookieStore = await cookies();
  const tempCookie = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production" };
  cookieStore.set("axus_oauth_state", state, tempCookie);
  cookieStore.set("axus_code_verifier", codeVerifier, tempCookie);

  const redirectUri = new URL("/callback", request.url).toString();

  return NextResponse.redirect(
    buildAuthorizeUrl(config, { redirectUri, state, codeChallenge }),
  );
}
