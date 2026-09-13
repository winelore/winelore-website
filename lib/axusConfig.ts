import type { AxusConfig, CryptoAdapter } from "@winelore/core/auth"
import { getAxusEndpoint } from "./graphqlEndpoint"

export const DEFAULT_AXUS_ISSUER = "https://axusid-website.vercel.app"

/** AXUS ID settings for the web app, from the environment. */
export function getAxusConfig(): AxusConfig {
    const override = Number(process.env.AXUS_REFRESH_TOKEN_TTL)
    return {
        issuer: process.env.NEXT_PUBLIC_AXUS_ID_ISSUER || DEFAULT_AXUS_ISSUER,
        clientId: process.env.NEXT_PUBLIC_AXUS_ID_CLIENT_ID!,
        graphqlEndpoint: getAxusEndpoint(),
        refreshTokenTtlFallback:
            Number.isFinite(override) && override > 0 ? Math.floor(override) : undefined,
    }
}

/**
 * Web cryptography for the PKCE flow, backed by Web Crypto. Available in the
 * browser, in Node 18+, and on the Edge runtime, so it serves every place the
 * web app runs. The Expo app supplies an `expo-crypto` implementation instead.
 */
export const webCrypto: CryptoAdapter = {
    randomBytes: (byteLength) => crypto.getRandomValues(new Uint8Array(byteLength)),
    sha256: async (input) => {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
        return new Uint8Array(digest)
    },
    randomUuid: () => crypto.randomUUID(),
}
