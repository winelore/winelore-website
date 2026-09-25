import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AxusTokenError, shouldRefreshAccessToken, secondsSinceExpiry } from "@winelore/core/auth";
import { refreshTokens } from "@/lib/authRefresh";
import { AUTH_COOKIE_NAMES, writeSessionCookies } from "@/lib/authCookies";
import { isProd } from "@/lib/isProd";

/**
 * A refresh that fails while the access token expired only moments ago is far
 * more likely to be a concurrent request that already rotated the token than a
 * revoked session. Inside this window we keep the cookies rather than signing
 * the user out mid-tasting.
 */
const REFRESH_RACE_WINDOW_SECONDS = 60;
const REFRESH_SKEW_SECONDS = 60;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Disable dev-tools on production
  if (isProd() && (pathname.startsWith("/dev-tools") || pathname.startsWith("/api/dev-tools"))) {
    return new NextResponse(null, { status: 404 });
  }

  // Do not intercept or try to refresh tokens on auth-related endpoints
  if (pathname.startsWith("/auth/") || pathname === "/callback") {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get("axus_refresh_token")?.value;
  if (!refreshToken) return NextResponse.next();

  const accessToken = request.cookies.get("axus_access_token")?.value;
  const auid = request.cookies.get("auid")?.value;

  // Missing identity cookies mean the session is incomplete regardless of the
  // access token's own expiry.
  const shouldRefresh = !accessToken || !auid || shouldRefreshAccessToken(accessToken, { skewSeconds: REFRESH_SKEW_SECONDS });
  if (!shouldRefresh) return NextResponse.next();

  try {
    const session = await refreshTokens(refreshToken);

    // Rebuild the Cookie header from the refreshed values so that this same
    // request — not just the next one — sees the new session via next/headers.
    request.cookies.set("auid", session.auid);
    request.cookies.set("username", session.username);
    request.cookies.set("displayName", session.displayName);
    request.cookies.set("axus_access_token", session.accessToken);
    request.cookies.set("axus_refresh_token", session.refreshToken);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("cookie", request.cookies.toString());

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    writeSessionCookies(response.cookies, session);
    return response;
  } catch (error) {
    console.error("Failed to refresh tokens in middleware:", error);

    const response = NextResponse.next();
    // A network outage or server error does not mean the session is revoked.
    // Keep it so the next request can retry the refresh.
    if (!(error instanceof AxusTokenError) || (error.status !== 400 && error.status !== 401)) {
      return response;
    }

    const expiredFor = secondsSinceExpiry(accessToken);
    if (expiredFor !== null && expiredFor < REFRESH_RACE_WINDOW_SECONDS) {
      console.warn("Possible token refresh race condition detected. Retaining cookies.");
      return response;
    }

    // The token endpoint rejected this refresh token.
    for (const name of AUTH_COOKIE_NAMES) response.cookies.delete(name);
    return response;
  }
}

export const config = {
  matcher: [
    // Match pages and server actions, exclude static files, public assets,
    // and API routes (API calls already carry their own auth and must not
    // pay for a token refresh on every request).
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.well-known(?:/.*)?$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
