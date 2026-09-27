/** Shared types for the AXUS ID OAuth 2.0 + PKCE flow. */

/**
 * Everything the flow needs to know about the AXUS ID deployment it talks to.
 * Passed in by the caller rather than read from `process.env`, because the two
 * platforms surface configuration differently (Next's `NEXT_PUBLIC_*` vs Expo's
 * `EXPO_PUBLIC_*` inlining).
 */
export interface AxusConfig {
    /** AXUS ID issuer origin, e.g. `https://axusid-website.vercel.app`. */
    issuer: string
    /** OAuth client id registered for this app. Web and native use different ones. */
    clientId: string
    /** AXUS ID GraphQL endpoint, used to resolve a human display name. */
    graphqlEndpoint: string
    /**
     * Refresh-token lifetime in seconds to assume when AXUS ID advertises none.
     * See `deriveRefreshTokenTtl` for why this is nearly always what gets used.
     */
    refreshTokenTtlFallback?: number
}

/**
 * Platform-supplied cryptography.
 *
 * Web has this via `crypto.subtle` / `crypto.getRandomValues`; React Native
 * does not ship Web Crypto and supplies it through `expo-crypto` instead. The
 * OAuth flow itself is identical, so the difference is injected here rather
 * than forked.
 */
export interface CryptoAdapter {
    /** Cryptographically secure random bytes. */
    randomBytes(byteLength: number): Uint8Array
    /** SHA-256 of a UTF-8 string, as raw digest bytes. */
    sha256(input: string): Promise<Uint8Array>
    /** A random UUID, used for the OAuth `state` parameter. */
    randomUuid(): string
}

/** Raw `/oauth/token` response. Fields beyond these are preserved but unused. */
export interface AxusTokenResponse {
    access_token: string
    refresh_token?: string
    id_token?: string
    token_type?: string
    expires_in?: number
    [key: string]: unknown
}

/** A resolved, signed-in AXUS ID session. */
export interface AxusSession {
    /** AXUS user id — the `sub` claim. */
    auid: string
    username: string
    /** Human-facing label; falls back to `@username` when none is set. */
    displayName: string
    accessToken: string
    refreshToken: string
    /** Access-token lifetime in seconds. */
    expiresIn: number
    /** Refresh-token lifetime in seconds. */
    refreshTokenExpiresIn: number
}

/** Decoded JWT claims the flow relies on. Other claims pass through untyped. */
export interface JwtPayload {
    sub?: string
    exp?: number
    preferred_username?: string
    username?: string
    [key: string]: unknown
}
