import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPkcePair } from "@/lib/pkce";

export async function GET() {
  const { codeVerifier, codeChallenge } = await createPkcePair();
  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set("axus_oauth_state", state, { 
    httpOnly: true, 
    sameSite: "lax", 
    path: "/",
    secure: false
  });
  cookieStore.set("axus_code_verifier", codeVerifier, { 
    httpOnly: true, 
    sameSite: "lax", 
    path: "/",
    secure: false
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.NEXT_PUBLIC_AXUS_ID_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_AXUS_ID_REDIRECT_URI!,
    scope: "openid profile offline_access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const issuer = process.env.NEXT_PUBLIC_AXUS_ID_ISSUER || "https://axusid-website.vercel.app";
  return NextResponse.redirect(
    `${issuer}/authorize?${params}`,
  );
}
