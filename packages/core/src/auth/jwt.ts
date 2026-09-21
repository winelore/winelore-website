import type { JwtPayload } from "./types"

const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

/**
 * base64url-encode raw bytes.
 *
 * Hand-rolled rather than using `btoa`, which is absent from some React Native
 * runtimes and would make this module platform-dependent.
 */
export function base64UrlEncode(bytes: Uint8Array): string {
    let out = ""
    for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i]
        const b1 = bytes[i + 1]
        const b2 = bytes[i + 2]
        out += B64_ALPHABET[b0 >> 2]
        out += B64_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)]
        out += b1 === undefined ? "" : B64_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)]
        out += b2 === undefined ? "" : B64_ALPHABET[b2 & 0x3f]
    }
    return out.replace(/\+/g, "-").replace(/\//g, "_")
}

/** Decode a base64url segment to its UTF-8 string, without `atob`. */
function base64UrlDecodeToString(segment: string): string {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/")
    const bytes: number[] = []
    let buffer = 0
    let bits = 0
    for (const char of normalized) {
        if (char === "=") break
        const value = B64_ALPHABET.indexOf(char)
        if (value === -1) continue
        buffer = (buffer << 6) | value
        bits += 6
        if (bits >= 8) {
            bits -= 8
            bytes.push((buffer >> bits) & 0xff)
        }
    }
    // Decode UTF-8 by hand; TextDecoder is not universally present either.
    let out = ""
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i]
        if (b < 0x80) {
            out += String.fromCharCode(b)
        } else if (b < 0xe0) {
            out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[++i] & 0x3f))
        } else if (b < 0xf0) {
            out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f))
        } else {
            const code =
                ((b & 0x07) << 18) |
                ((bytes[++i] & 0x3f) << 12) |
                ((bytes[++i] & 0x3f) << 6) |
                (bytes[++i] & 0x3f)
            const adjusted = code - 0x10000
            out += String.fromCharCode(0xd800 + (adjusted >> 10), 0xdc00 + (adjusted & 0x3ff))
        }
    }
    return out
}

/**
 * Read a JWT's claims without verifying its signature.
 *
 * Verification is the token endpoint's job — this only inspects tokens AXUS ID
 * just handed us over TLS, to read `sub`, `exp` and `preferred_username`.
 * Never use it to trust a token from an untrusted source.
 */
export function parseJwt(token: string): JwtPayload | null {
    try {
        const segment = token.split(".")[1]
        if (!segment) return null
        return JSON.parse(base64UrlDecodeToString(segment)) as JwtPayload
    } catch {
        return null
    }
}

/**
 * Whether an access token is expired, or close enough that it should be
 * refreshed now. Mirrors the 5-minute skew the web proxy has always used.
 *
 * A token that cannot be parsed, or carries no `exp`, counts as needing
 * refresh — the caller cannot tell how long it is good for.
 */
export function shouldRefreshAccessToken(
    accessToken: string | null | undefined,
    options: { skewSeconds?: number; now?: () => number } = {},
): boolean {
    if (!accessToken) return true
    const { skewSeconds = 300, now = Date.now } = options
    const payload = parseJwt(accessToken)
    if (!payload?.exp) return true
    return payload.exp - Math.floor(now() / 1000) < skewSeconds
}

/**
 * How long ago a token expired, in seconds. Negative if it is still valid,
 * `null` if it carries no readable `exp`.
 *
 * The web proxy uses this to tell a genuinely dead token from a refresh that
 * lost a race with a concurrent request, so it does not sign the user out
 * over the latter.
 */
export function secondsSinceExpiry(
    accessToken: string | null | undefined,
    now: () => number = Date.now,
): number | null {
    if (!accessToken) return null
    const payload = parseJwt(accessToken)
    if (!payload?.exp) return null
    return Math.floor(now() / 1000) - payload.exp
}
