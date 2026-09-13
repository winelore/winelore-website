import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { ExpoConfig } from "expo/config"

/**
 * AXUS ID is a public OAuth client: it holds no secret and authenticates with
 * PKCE, so the web and iOS apps share one client id rather than needing one
 * each. The single source of truth is the repo-root .env the web app already
 * uses, read here at build time so the values cannot drift apart.
 *
 * An EXPO_PUBLIC_* variable in the environment still wins, for pointing a
 * build at a different AXUS ID deployment.
 */
function readRootEnv(): Record<string, string> {
    try {
        const contents = readFileSync(resolve(__dirname, "../../.env"), "utf8")
        const values: Record<string, string> = {}
        for (const line of contents.split("\n")) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith("#")) continue
            const separator = trimmed.indexOf("=")
            if (separator === -1) continue
            values[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim()
        }
        return values
    } catch {
        // No root .env (a CI checkout, say) — fall back to the environment.
        return {}
    }
}

const rootEnv = readRootEnv()

const pick = (expoKey: string, webKey: string) =>
    process.env[expoKey] || rootEnv[webKey] || undefined

const config: ExpoConfig = {
    name: "Winelore",
    slug: "winelore",
    scheme: "winelore",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    ios: {
        supportsTablet: true,
        bundleIdentifier: "com.thewinelore.winelore",
    },
    plugins: ["expo-router", "expo-secure-store", "expo-web-browser"],
    // experiments.typedRoutes is deliberately off. Turning it on makes the CLI
    // load @expo/router-server, which resolves expo-router from its own nested
    // location under node_modules/expo/ and cannot see a workspace-nested copy,
    // so `expo run:ios` dies after installing the app with:
    //   Error: Cannot find module 'expo-router/_ctx-shared'
    // Nothing else in a native build needs that module. The cost is that `href`
    // values are plain strings rather than a generated union.
    extra: {
        EXPO_PUBLIC_AXUS_ID_CLIENT_ID: pick(
            "EXPO_PUBLIC_AXUS_ID_CLIENT_ID",
            "NEXT_PUBLIC_AXUS_ID_CLIENT_ID",
        ),
        EXPO_PUBLIC_AXUS_ID_ISSUER: pick(
            "EXPO_PUBLIC_AXUS_ID_ISSUER",
            "NEXT_PUBLIC_AXUS_ID_ISSUER",
        ),
        EXPO_PUBLIC_AXUS_GRAPHQL_ENDPOINT: pick(
            "EXPO_PUBLIC_AXUS_GRAPHQL_ENDPOINT",
            "NEXT_PUBLIC_AXUS_GRAPHQL_ENDPOINT",
        ),
        EXPO_PUBLIC_GRAPHQL_ENDPOINT: pick(
            "EXPO_PUBLIC_GRAPHQL_ENDPOINT",
            "NEXT_PUBLIC_GRAPHQL_ENDPOINT",
        ),
    },
}

export default config
