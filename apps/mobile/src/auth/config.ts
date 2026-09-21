import Constants from "expo-constants"
import * as Crypto from "expo-crypto"
import * as Linking from "expo-linking"
import type { AxusConfig, CryptoAdapter } from "@winelore/core/auth"

const DEFAULT_AXUS_ISSUER = "https://axusid-website.vercel.app"
const DEFAULT_AXUS_GRAPHQL = "https://axusid.thewinelore.com/graphql"

function env(name: string, fallback?: string): string {
    // EXPO_PUBLIC_* is inlined at build time; extra.* allows per-build overrides.
    const value =
        (process.env[name as keyof typeof process.env] as string | undefined) ??
        (Constants.expoConfig?.extra as Record<string, string> | undefined)?.[name]
    if (!value && fallback === undefined) {
        throw new Error(`Missing required configuration: ${name}`)
    }
    return value ?? fallback!
}

export function getAxusConfig(): AxusConfig {
    return {
        issuer: env("EXPO_PUBLIC_AXUS_ID_ISSUER", DEFAULT_AXUS_ISSUER),
        clientId: env("EXPO_PUBLIC_AXUS_ID_CLIENT_ID"),
        graphqlEndpoint: env("EXPO_PUBLIC_AXUS_GRAPHQL_ENDPOINT", DEFAULT_AXUS_GRAPHQL),
    }
}

/**
 * Where AXUS ID sends the user back after sign-in.
 *
 * In a development or release build this is the app's own scheme,
 * `winelore://callback`. Expo Go would instead produce an `exp://` proxy URL,
 * but Expo Go cannot run this app anyway — it depends on native modules — so
 * the scheme form is what AXUS ID needs to allow.
 *
 * Shown on the sign-in screen so it can be checked against the allowlist
 * without reading a log.
 */
export function getRedirectUri(): string {
    return Linking.createURL("callback")
}

/** Non-secret configuration summary, for the sign-in screen's diagnostics. */
export function describeAuthConfig(): { clientId: string; issuer: string; redirectUri: string } {
    return {
        clientId: env("EXPO_PUBLIC_AXUS_ID_CLIENT_ID", "(unset)"),
        issuer: env("EXPO_PUBLIC_AXUS_ID_ISSUER", DEFAULT_AXUS_ISSUER),
        redirectUri: getRedirectUri(),
    }
}

/**
 * PKCE cryptography for React Native.
 *
 * React Native ships no Web Crypto, so `crypto.subtle` is unavailable; expo-crypto
 * provides the equivalent primitives. The flow itself is shared with the web app
 * in @winelore/core/auth — only this adapter differs.
 */
export const nativeCrypto: CryptoAdapter = {
    randomBytes: (byteLength) => Crypto.getRandomBytes(byteLength),
    sha256: async (input) => {
        const hex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
            encoding: Crypto.CryptoEncoding.HEX,
        })
        const bytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
        }
        return bytes
    },
    randomUuid: () => Crypto.randomUUID(),
}
