import { parseJwt } from "./jwt"
import { deriveRefreshTokenTtl } from "./tokens"
import { resolveDisplayName } from "./displayName"
import type { AxusConfig, AxusSession, AxusTokenResponse } from "./types"

/** Raised when a token response carries no usable identity. */
export class AxusIdentityError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "AxusIdentityError"
    }
}

/**
 * Turn a raw `/oauth/token` response into a session, resolving the user's
 * display name along the way.
 *
 * `previousRefreshToken` covers refresh responses that omit `refresh_token`,
 * meaning the existing one stays valid.
 */
export async function sessionFromTokenResponse(
    config: AxusConfig,
    tokens: AxusTokenResponse,
    previousRefreshToken?: string,
): Promise<AxusSession> {
    const accessPayload = parseJwt(tokens.access_token)
    const payload = parseJwt(tokens.id_token || "") || accessPayload
    if (!payload?.sub) {
        throw new AxusIdentityError("AXUS ID returned a token with no `sub` claim")
    }

    const auid = String(payload.sub)
    const username = payload.preferred_username || payload.username || "axus_user"

    // The ID token identifies the user, but its lifetime may differ from the
    // access token. The access cookie and refresh timing follow the latter.
    let expiresIn = tokens.expires_in ?? 43200
    if (accessPayload?.exp) {
        const fromClaim = Math.floor(accessPayload.exp - Date.now() / 1000)
        if (fromClaim > 0) expiresIn = fromClaim
    }

    const refreshToken = tokens.refresh_token || previousRefreshToken || ""

    return {
        auid,
        username,
        displayName: await resolveDisplayName(config, auid, username),
        accessToken: tokens.access_token,
        refreshToken,
        expiresIn,
        refreshTokenExpiresIn: deriveRefreshTokenTtl(
            tokens,
            refreshToken,
            config.refreshTokenTtlFallback,
        ),
    }
}
