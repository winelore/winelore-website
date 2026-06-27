import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseJwt } from "@/lib/pkce";
import { refreshTokens } from "@/lib/authRefresh";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Do not intercept or try to refresh tokens on auth-related endpoints
  if (pathname.startsWith("/auth/") || pathname === "/callback") {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get("axus_refresh_token")?.value;
  const accessToken = request.cookies.get("axus_access_token")?.value;
  const auid = request.cookies.get("auid")?.value;

  let shouldRefresh = false;

  if (refreshToken) {
    if (!accessToken || !auid) {
      shouldRefresh = true;
    } else {
      try {
        const payload = parseJwt(accessToken);
        if (payload && payload.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          // If token expires in less than 5 minutes (300 seconds), refresh it
          if (payload.exp - currentTime < 300) {
            shouldRefresh = true;
          }
        } else {
          shouldRefresh = true;
        }
      } catch (e) {
        shouldRefresh = true;
      }
    }
  }

  if (shouldRefresh && refreshToken) {
    try {
      const refreshed = await refreshTokens(refreshToken);

      // Rebuild Cookie header string from request.cookies so that next/headers cookies() gets them
      request.cookies.set("auid", String(refreshed.auid));
      request.cookies.set("username", String(refreshed.username));
      request.cookies.set("displayName", String(refreshed.displayName));
      request.cookies.set("axus_access_token", refreshed.accessToken);
      request.cookies.set("axus_refresh_token", refreshed.refreshToken);

      const cookieString = request.cookies.getAll().map(c => `${c.name}=${c.value}`).join("; ");
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("cookie", cookieString);

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        }
      });

      // Set cookies on response so browser stores them
      const cookieOptions = {
        sameSite: "lax" as const,
        secure: false,
        path: "/",
      };

      response.cookies.set("auid", String(refreshed.auid), { ...cookieOptions, maxAge: refreshed.expiresIn });
      response.cookies.set("username", String(refreshed.username), { ...cookieOptions, maxAge: refreshed.expiresIn });
      response.cookies.set("displayName", String(refreshed.displayName), { ...cookieOptions, maxAge: refreshed.expiresIn });
      response.cookies.set("axus_access_token", refreshed.accessToken, { ...cookieOptions, httpOnly: true, maxAge: refreshed.expiresIn });
      response.cookies.set("axus_refresh_token", refreshed.refreshToken, { ...cookieOptions, httpOnly: true, maxAge: 60 * 60 * 24 * 30 });

      return response;
    } catch (error) {
      console.error("Failed to refresh tokens in middleware:", error);

      // Check if the access token in the request is already expired by a significant margin (e.g. more than 1 minute)
      // If it is NOT expired by much (or not expired at all), it might be a race condition from a concurrent request that just refreshed it.
      // In that case, we do NOT delete the cookies to prevent logging out the user.
      let shouldDeleteCookies = true;
      if (accessToken) {
        try {
          const payload = parseJwt(accessToken);
          if (payload && payload.exp) {
            const currentTime = Math.floor(Date.now() / 1000);
            const expiredAge = currentTime - payload.exp;
            // If the token expired less than 60 seconds ago, it is likely a race condition.
            if (expiredAge < 60) {
              shouldDeleteCookies = false;
              console.warn("Possible token refresh race condition detected. Retaining cookies.");
            }
          }
        } catch (e) {
          // If JWT parsing fails, it's a truly invalid token, so we should delete cookies.
        }
      }

      // If refresh fails (e.g. token revoked/expired), clean up the invalid cookies so the user is logged out
      const response = NextResponse.next();
      if (shouldDeleteCookies) {
        response.cookies.delete("auid");
        response.cookies.delete("username");
        response.cookies.delete("displayName");
        response.cookies.delete("axus_access_token");
        response.cookies.delete("axus_refresh_token");
      }
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all pages and actions, exclude static files and public assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
