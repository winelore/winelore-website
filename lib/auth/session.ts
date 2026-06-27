import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseJwt } from "@/lib/pkce";
import { authRefreshPath } from "@/lib/auth/paths";

const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;
const TOKEN_REFRESH_BUFFER_SECONDS = 5 * 60;

export interface SessionTokens {
  access_token?: string;
  axus_access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
}

function getIssuer() {
  return process.env.NEXT_PUBLIC_AXUS_ID_ISSUER || "https://axusid-website.vercel.app";
}

function getSessionIdentity(tokens: SessionTokens) {
  if (tokens.id_token) {
    const payload = parseJwt(tokens.id_token);
    if (payload?.sub) {
      return {
        auid: String(payload.sub),
        username: payload.preferred_username || "axus_user",
      };
    }
  }

  const accessToken = tokens.axus_access_token || tokens.access_token;
  if (accessToken) {
    const payload = parseJwt(accessToken);
    if (payload?.sub) {
      return {
        auid: String(payload.sub),
        username: payload.preferred_username || payload.username || "axus_user",
      };
    }
  }

  return null;
}

function isTokenExpiringSoon(token: string, bufferSeconds = TOKEN_REFRESH_BUFFER_SECONDS): boolean {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now() + bufferSeconds * 1000;
}

export async function refreshOAuthTokens(refreshToken: string): Promise<SessionTokens | null> {
  const issuer = getIssuer();
  const response = await fetch(`${issuer}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.NEXT_PUBLIC_AXUS_ID_CLIENT_ID!,
    }),
  });

  if (!response.ok) {
    console.error("Token refresh failed:", await response.text());
    return null;
  }

  return response.json();
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export async function applySessionCookies(
  cookieStore: CookieStore,
  tokens: SessionTokens,
  existingDisplayName?: string,
) {
  const identity = getSessionIdentity(tokens);
  const expiresIn = tokens.expires_in || 3600;
  const accessToken = tokens.axus_access_token || tokens.access_token;
  const cookieBase = {
    sameSite: "lax" as const,
    secure: false,
    path: "/",
  };

  if (identity) {
    cookieStore.set("auid", identity.auid, {
      ...cookieBase,
      httpOnly: false,
      maxAge: expiresIn,
    });
    cookieStore.set("username", identity.username, {
      ...cookieBase,
      httpOnly: false,
      maxAge: expiresIn,
    });
    if (existingDisplayName) {
      cookieStore.set("displayName", existingDisplayName, {
        ...cookieBase,
        httpOnly: false,
        maxAge: expiresIn,
      });
    }
  }

  if (accessToken) {
    cookieStore.set("axus_access_token", accessToken, {
      ...cookieBase,
      httpOnly: true,
      maxAge: expiresIn,
    });
  }

  if (tokens.refresh_token) {
    cookieStore.set("axus_refresh_token", tokens.refresh_token, {
      ...cookieBase,
      httpOnly: true,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }
}

export async function clearSessionCookies(cookieStore: CookieStore) {
  cookieStore.delete("auid");
  cookieStore.delete("username");
  cookieStore.delete("displayName");
  cookieStore.delete("axus_access_token");
  cookieStore.delete("axus_refresh_token");
}

function sessionNeedsRefresh(
  auid: string | undefined,
  accessToken: string | undefined,
  refreshToken: string | undefined,
): boolean {
  return !auid || (accessToken ? isTokenExpiringSoon(accessToken) : Boolean(refreshToken));
}

/** Safe for Server Components: redirects to /auth/refresh instead of mutating cookies. */
export async function ensureAuthenticatedPage(returnTo: string): Promise<string | null> {
  const cookieStore = await cookies();
  const auid = cookieStore.get("auid")?.value;
  const refreshToken = cookieStore.get("axus_refresh_token")?.value;
  const accessToken = cookieStore.get("axus_access_token")?.value;

  if (!sessionNeedsRefresh(auid, accessToken, refreshToken) && auid) {
    return auid;
  }

  if (refreshToken) {
    redirect(authRefreshPath(returnTo));
  }

  return auid ?? null;
}

/** For Server Actions and Route Handlers where cookie mutation is allowed. */
export async function ensureAuthenticated(): Promise<string | null> {
  const cookieStore = await cookies();
  const auid = cookieStore.get("auid")?.value;
  const refreshToken = cookieStore.get("axus_refresh_token")?.value;
  const accessToken = cookieStore.get("axus_access_token")?.value;

  if (!sessionNeedsRefresh(auid, accessToken, refreshToken) && auid) {
    return auid;
  }

  if (!refreshToken) {
    return auid ?? null;
  }

  const tokens = await refreshOAuthTokens(refreshToken);
  if (!tokens) {
    await clearSessionCookies(cookieStore);
    return null;
  }

  const existingDisplayName = cookieStore.get("displayName")?.value;
  await applySessionCookies(cookieStore, tokens, existingDisplayName);

  return getSessionIdentity(tokens)?.auid ?? auid ?? null;
}

export async function requireAuthenticated(): Promise<string> {
  const auid = await ensureAuthenticated();
  if (!auid) {
    throw new Error("Unauthorized: Please sign in");
  }
  return auid;
}