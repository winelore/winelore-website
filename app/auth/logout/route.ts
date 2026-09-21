import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeRefreshToken } from "@winelore/core/auth";
import { getAxusConfig } from "@/lib/axusConfig";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("axus_refresh_token")?.value;

  // Best-effort: a failed revoke must never block clearing local credentials.
  if (refreshToken) {
    await revokeRefreshToken(getAxusConfig(), refreshToken);
  }

  cookieStore.delete("auid");
  cookieStore.delete("username");
  cookieStore.delete("displayName");
  cookieStore.delete("axus_access_token");
  cookieStore.delete("axus_refresh_token");

  return NextResponse.redirect(new URL("/", request.url));
}
