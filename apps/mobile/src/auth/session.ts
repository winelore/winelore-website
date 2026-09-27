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
    AxusTokenError,
    type AxusSession,
} from "@winelore/core/auth"
import { getAxusConfig, getRedirectUri, nativeCrypto } from "./config"
import { clearSession, loadSession, saveSession } from "./storage"

type StoredSession = Awaited<ReturnType<typeof loadSession>>
const sessionListeners = new Set<(session: StoredSession) => void>()
let sessionGeneration = 0
let signingOut = false

export function subscribeSession(listener: (session: StoredSession) => void): () => void {
    sessionListeners.add(listener)
    return () => { sessionListeners.delete(listener) }
}

function notifySession(session: StoredSession) {
    sessionListeners.forEach((listener) => listener(session))
}

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
    const generation = ++sessionGeneration
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
    if (generation !== sessionGeneration) throw new SignInCancelledError()
    await saveSession(session)
    if (generation !== sessionGeneration) throw new SignInCancelledError()
    notifySession(session)
    return session
}

export async function signOut(): Promise<void> {
    ++sessionGeneration
    signingOut = true
    let refreshToken: string | undefined
    try {
        refreshToken = (await loadSession())?.refreshToken
        await clearSession()
        notifySession(null)
    } finally {
        signingOut = false
    }
    // Remote revocation is best-effort and must not delay local sign-out.
    if (refreshToken) await revokeRefreshToken(getAxusConfig(), refreshToken)
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
 * Returns null when there is no usable session. A rejected refresh token clears
 * the session; a temporary network failure leaves it available for retry.
 */
export async function getValidAccessToken(): Promise<string | null> {
    if (signingOut) return null
    const stored = await loadSession()
    if (!stored?.refreshToken || signingOut) return null

    if (stored.accessToken && !shouldRefreshAccessToken(stored.accessToken)) {
        return stored.accessToken
    }

    if (!inFlightRefresh) {
        const generation = sessionGeneration
        inFlightRefresh = (async () => {
            try {
                const config = getAxusConfig()
                const tokens = await refreshAccessToken(config, stored.refreshToken)
                const session = await sessionFromTokenResponse(config, tokens, stored.refreshToken)
                if (generation !== sessionGeneration || signingOut) return null
                await saveSession(session)
                if (generation !== sessionGeneration || signingOut) return null
                notifySession(session)
                return session.accessToken
            } catch (error) {
                if (generation !== sessionGeneration || signingOut) return null
                if (error instanceof AxusTokenError && (error.status === 400 || error.status === 401)) {
                    await clearSession()
                    notifySession(null)
                    return null
                }
                // A refresh can fail before the old access token expires.
                if (stored.accessToken && !shouldRefreshAccessToken(stored.accessToken, { skewSeconds: 0 })) {
                    return stored.accessToken
                }
                throw error
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
