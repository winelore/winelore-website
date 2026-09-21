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

/**
 * `secure: false` is deliberate and long-standing here — the deployment terminates
 * TLS upstream and the app is also reached over plain http in development.
 */
const BASE_COOKIE = { sameSite: "lax" as const, secure: false, path: "/" }

/**
 * Write a session to cookies.
 *
 * auid / username / displayName stay readable from JS (`useCurrentUser` reads
 * them via js-cookie); the tokens are httpOnly.
 */
export function writeSessionCookies(store: CookieWriter, session: AxusSession): void {
    const readable = { ...BASE_COOKIE, httpOnly: false, maxAge: session.expiresIn }
    store.set("auid", session.auid, readable)
    store.set("username", session.username, readable)
    store.set("displayName", session.displayName, readable)
    store.set("axus_access_token", session.accessToken, {
        ...BASE_COOKIE,
        httpOnly: true,
        maxAge: session.expiresIn,
    })
    if (session.refreshToken) {
        store.set("axus_refresh_token", session.refreshToken, {
            ...BASE_COOKIE,
            httpOnly: true,
            maxAge: session.refreshTokenExpiresIn,
        })
    }
}
