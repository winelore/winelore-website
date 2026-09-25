import type { AxusSession } from "@winelore/core/auth"

/** Names of every cookie the AXUS ID session occupies. */
export const AUTH_COOKIE_NAMES = [
    "auid",
    "username",
    "displayName",
    "axus_access_token",
    "axus_refresh_token",
] as const

/**
 * Minimal surface shared by `next/headers` cookies() and NextResponse.cookies,
 * so the same writer serves both the callback route and the proxy.
 */
interface CookieWriter {
    set(name: string, value: string, options?: Record<string, unknown>): unknown
}

const BASE_COOKIE = { sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" }
const MAX_COOKIE_AGE_SECONDS = 60 * 60 * 24 * 400

/**
 * Write a session to cookies.
 *
 * auid / username / displayName stay readable from JS (`useCurrentUser` reads
 * them via js-cookie); the tokens are httpOnly.
 */
export function writeSessionCookies(store: CookieWriter, session: AxusSession): void {
    // The access token can expire while the refresh token is still usable.
    // Keep the identity available to client navigation until the session ends.
    const readable = {
        ...BASE_COOKIE,
        httpOnly: false,
        maxAge: Math.min(session.refreshToken ? session.refreshTokenExpiresIn : session.expiresIn, MAX_COOKIE_AGE_SECONDS),
    }
    store.set("auid", session.auid, readable)
    store.set("username", session.username, readable)
    store.set("displayName", session.displayName, readable)
    store.set("axus_access_token", session.accessToken, {
        ...BASE_COOKIE,
        httpOnly: true,
        maxAge: session.expiresIn + 60,
    })
    if (session.refreshToken) {
        store.set("axus_refresh_token", session.refreshToken, {
            ...BASE_COOKIE,
            httpOnly: true,
            maxAge: Math.min(session.refreshTokenExpiresIn, MAX_COOKIE_AGE_SECONDS),
        })
    }
}
