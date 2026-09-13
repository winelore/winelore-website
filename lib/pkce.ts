/**
 * Kept as a re-export so existing imports keep working. The PKCE and JWT logic
 * now lives in @winelore/core/auth, shared with the Expo app; `lib/axusConfig`
 * supplies the web's Web Crypto implementation.
 */
import { createPkcePair as createPkcePairCore } from "@winelore/core/auth"
import { webCrypto } from "./axusConfig"

export { parseJwt } from "@winelore/core/auth"

export function createPkcePair() {
    return createPkcePairCore(webCrypto)
}
