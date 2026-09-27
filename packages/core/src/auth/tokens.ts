import { parseJwt } from "./jwt"
import type { AxusConfig, AxusTokenResponse } from "./types"

/**
 * Fallback refresh-token lifetime, in seconds, for when AXUS ID exposes none.
 *
 * AXUS ID's official refresh-token lifetime is ~100 years (effectively
 * non-expiring) and is communicated out of band, not via the API. On web, note
 * that browsers clamp cookie `maxAge` to ~400 days (RFC 6265bis / Chrome), so
 * the stored cookie is refreshed long before this nominal value matters.
 */
export const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365 * 100

/** Token-response keys various OAuth servers use to advertise refresh-token lifetime. */
const ADVERTISED_TTL_KEYS = ["refresh_token_expires_in", "refresh_expires_in"] as const

/**
 * Best-effort refresh-token lifetime in seconds.
 *
 * AXUS ID currently advertises no refresh-token TTL: its `/oauth/token`
 * response carries no `refresh_token_expires_in` / `refresh_expires_in`, the
 * refresh token is opaque (a single-segment string, not a JWT, so there is no
 * `exp` to read), and there is no introspection endpoint. This still probes
 * both standard signals, so it starts deriving the real lifetime automatically
 * if AXUS ID ever begins sending them.
 */
export function deriveRefreshTokenTtl(
    tokenResponse: Record<string, unknown> | null | undefined,
    refreshToken: string | undefined | null,
    fallbackSeconds: number = DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
): number {
    for (const key of ADVERTISED_TTL_KEYS) {
        const advertised = tokenResponse?.[key]
        if (typeof advertised === "number" && advertised > 0) return Math.floor(advertised)
    }
    if (refreshToken) {
        const exp = parseJwt(refreshToken)?.exp
        if (typeof exp === "number") {
            const ttl = Math.floor(exp - Date.now() / 1000)
            if (ttl > 0) return ttl
        }
    }
    return Math.floor(fallbackSeconds)
}

/** Thrown when AXUS ID rejects a token request. */
export class AxusTokenError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly body: string,
    ) {
        super(message)
        this.name = "AxusTokenError"
    }
}

async function postToken(
    config: AxusConfig,
    body: Record<string, string>,
): Promise<AxusTokenResponse> {
    const response = await fetch(`${config.issuer}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body),
    })
    if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new AxusTokenError(
            `AXUS ID token request failed: ${response.status} ${response.statusText}`,
            response.status,
            text,
        )
    }
    return (await response.json()) as AxusTokenResponse
}

/** Exchange an authorization code for tokens (the PKCE leg of the flow). */
export function exchangeAuthorizationCode(
    config: AxusConfig,
    params: { code: string; redirectUri: string; codeVerifier: string },
): Promise<AxusTokenResponse> {
    return postToken(config, {
        grant_type: "authorization_code",
        code: params.code,
        redirect_uri: params.redirectUri,
        client_id: config.clientId,
        code_verifier: params.codeVerifier,
    })
}

/** Trade a refresh token for a fresh access token. */
export function refreshAccessToken(
    config: AxusConfig,
    refreshToken: string,
): Promise<AxusTokenResponse> {
    return postToken(config, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
    })
}

/**
 * Revoke a refresh token at sign-out. Best-effort: a failure here must not
 * block clearing local credentials, so this never throws.
 */
export async function revokeRefreshToken(
    config: AxusConfig,
    refreshToken: string,
): Promise<boolean> {
    try {
        const response = await fetch(`${config.issuer}/oauth/revoke`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: refreshToken }),
        })
        return response.ok
    } catch {
        return false
    }
}
