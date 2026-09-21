import * as WebBrowser from "expo-web-browser"
import {
    buildAuthorizeUrl,
    createPkcePair,
    exchangeAuthorizationCode,
    refreshAccessToken,
    revokeRefreshToken,
    sessionFromTokenResponse,
    shouldRefreshAccessToken,
    validateCallbackParams,
    type AxusSession,
} from "@winelore/core/auth"
import { getAxusConfig, getRedirectUri, nativeCrypto } from "./config"
import { clearSession, loadSession, saveSession } from "./storage"

export class SignInCancelledError extends Error {
    constructor() {
        super("Sign-in was dismissed")
        this.name = "SignInCancelledError"
    }
}

export class SignInFailedError extends Error {
    constructor(readonly reason: string) {
        super(`Sign-in failed: ${reason}`)
        this.name = "SignInFailedError"
    }
}

/**
 * Run the AXUS ID sign-in flow.
 *
 * `openAuthSessionAsync` presents ASWebAuthenticationSession — the system sheet
 * that shares Safari's cookie jar, so a user already signed in to AXUS ID is
 * recognised, and credentials never pass through our own UI. That shared jar is
 * also why iOS shows a consent prompt before the sheet appears.
 */
export async function signIn(): Promise<AxusSession> {
    const config = getAxusConfig()
    const redirectUri = getRedirectUri()

    const { codeVerifier, codeChallenge } = await createPkcePair(nativeCrypto)
    const state = nativeCrypto.randomUuid()

    const result = await WebBrowser.openAuthSessionAsync(
        buildAuthorizeUrl(config, { redirectUri, state, codeChallenge }),
        redirectUri,
    )

    if (result.type !== "success") throw new SignInCancelledError()

    const returned = new URL(result.url)
    const validation = validateCallbackParams(
        {
            code: returned.searchParams.get("code"),
            state: returned.searchParams.get("state"),
            error: returned.searchParams.get("error"),
        },
        // The verifier stays in memory for the lifetime of this call; on native
        // there is no redirect through a separate process to survive.
        { state, codeVerifier },
    )
    if (!validation.ok) throw new SignInFailedError(validation.reason)

    const tokens = await exchangeAuthorizationCode(config, {
        code: validation.code,
        redirectUri,
        codeVerifier: validation.codeVerifier,
    })
    const session = await sessionFromTokenResponse(config, tokens)
    await saveSession(session)
    return session
}

export async function signOut(): Promise<void> {
    const stored = await loadSession()
    if (stored?.refreshToken) {
        // Best-effort, exactly as on web: never block local sign-out on it.
        await revokeRefreshToken(getAxusConfig(), stored.refreshToken)
    }
    await clearSession()
}

/**
 * In-flight refresh, shared by every concurrent caller.
 *
 * The web app hits this race across separate requests and guards it after the
 * fact in proxy.ts; in a single native process it can be prevented outright, so
 * a screen-load that fires several queries at once performs one refresh rather
 * than several that invalidate each other.
 */
let inFlightRefresh: Promise<string | null> | null = null

/**
 * An access token good for the next few minutes, refreshing if needed.
 *
 * Returns null when there is no usable session — the caller should route to
 * sign-in. On refresh failure the stored session is cleared, since a rejected
 * refresh token cannot be recovered from on device.
 */
export async function getValidAccessToken(): Promise<string | null> {
    const stored = await loadSession()
    if (!stored?.refreshToken) return null

    if (stored.accessToken && !shouldRefreshAccessToken(stored.accessToken)) {
        return stored.accessToken
    }

    if (!inFlightRefresh) {
        inFlightRefresh = (async () => {
            try {
                const config = getAxusConfig()
                const tokens = await refreshAccessToken(config, stored.refreshToken)
                const session = await sessionFromTokenResponse(config, tokens, stored.refreshToken)
                await saveSession(session)
                return session.accessToken
            } catch {
                await clearSession()
                return null
            } finally {
                inFlightRefresh = null
            }
        })()
    }

    return inFlightRefresh
}

/** The stored session without touching the network — for deciding the first screen. */
export async function getStoredSession() {
    return loadSession()
}
