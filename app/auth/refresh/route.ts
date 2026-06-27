import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  applySessionCookies,
  clearSessionCookies,
  refreshOAuthTokens,
} from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/";
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("axus_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const tokens = await refreshOAuthTokens(refreshToken);
  if (!tokens) {
    await clearSessionCookies(cookieStore);
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const existingDisplayName = cookieStore.get("displayName")?.value;
  await applySessionCookies(cookieStore, tokens, existingDisplayName);

  return NextResponse.redirect(new URL(safeReturnTo, request.url));
}
