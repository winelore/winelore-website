import { base64UrlEncode } from "./jwt"
import type { CryptoAdapter } from "./types"

export interface PkcePair {
    codeVerifier: string
    codeChallenge: string
}

/**
 * Generate a PKCE verifier/challenge pair (S256).
 *
 * The verifier must be held until the redirect comes back — in an httpOnly
 * cookie on web, in memory or SecureStore on native — and never leaves the
 * client.
 */
export async function createPkcePair(crypto: CryptoAdapter): Promise<PkcePair> {
    const codeVerifier = base64UrlEncode(crypto.randomBytes(32))
    const digest = await crypto.sha256(codeVerifier)
    return { codeVerifier, codeChallenge: base64UrlEncode(digest) }
}
