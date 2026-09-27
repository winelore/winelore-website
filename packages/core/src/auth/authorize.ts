import type { AxusConfig } from "./types"

export interface AuthorizeUrlParams {
    /** Where AXUS ID sends the user back. An https URL on web, a custom scheme on native. */
    redirectUri: string
    /** CSRF guard; must be compared against the value returned on the callback. */
    state: string
    codeChallenge: string
    /** Defaults to the scopes the app has always requested. */
    scope?: string
    /**
     * Defaults to `consent select_account` so the account picker always
     * appears. Native sign-in may prefer to omit it for a silent re-auth.
     */
    prompt?: string
}

export const DEFAULT_SCOPE = "openid profile offline_access"
export const DEFAULT_PROMPT = "consent select_account"

/** Build the AXUS ID `/authorize` URL to send the user to. */
export function buildAuthorizeUrl(config: AxusConfig, params: AuthorizeUrlParams): string {
    const query = new URLSearchParams({
        response_type: "code",
        client_id: config.clientId,
        redirect_uri: params.redirectUri,
        scope: params.scope ?? DEFAULT_SCOPE,
        state: params.state,
        code_challenge: params.codeChallenge,
        code_challenge_method: "S256",
        prompt: params.prompt ?? DEFAULT_PROMPT,
    })
    return `${config.issuer}/authorize?${query}`
}

/**
 * Validate the parameters AXUS ID sent back to the redirect URI.
 *
 * Returns the authorization code, or a machine-readable reason it was
 * rejected — the same reasons the web callback has always reported.
 */
export function validateCallbackParams(
    received: { code?: string | null; state?: string | null; error?: string | null },
    expected: { state?: string | null; codeVerifier?: string | null },
):
    | { ok: true; code: string; codeVerifier: string }
    | { ok: false; reason: string } {
    if (received.error) return { ok: false, reason: received.error }
    if (!received.code || !received.state) return { ok: false, reason: "missing_oauth_params" }
    if (!expected.state || received.state !== expected.state || !expected.codeVerifier) {
        return { ok: false, reason: "invalid_state" }
    }
    return { ok: true, code: received.code, codeVerifier: expected.codeVerifier }
}
