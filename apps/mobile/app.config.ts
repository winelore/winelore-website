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

/**
 * The website's origin, for pages the app has not ported yet. Derived from the
 * web's OAuth redirect URI — the one root .env value that names the site
 * itself rather than an API.
 */
function webOrigin(): string | undefined {
    if (process.env.EXPO_PUBLIC_WEB_ORIGIN) return process.env.EXPO_PUBLIC_WEB_ORIGIN
    const redirect = rootEnv.NEXT_PUBLIC_AXUS_ID_REDIRECT_URI
    try {
        return redirect ? new URL(redirect).origin : undefined
    } catch {
        return undefined
    }
}

const config: ExpoConfig = {
    name: "Winelore",
    slug: "winelore",
    scheme: "winelore",
    version: "0.1.0",
    orientation: "portrait",
    // Light only, as the web is: with "automatic", dark mode turns the native
    // nav and tab bars dark around content that stays light.
    userInterfaceStyle: "light",
    // Web is deliberately absent: the dev server would otherwise serve a web
    // bundle needing react-native-web, which this app has no use for since the
    // web product is the Next.js app in this same repo. A browser tab left open
    // on the Metro port is enough to trigger that bundle and fail it.
    platforms: ["ios", "android"],
    ios: {
        supportsTablet: true,
        bundleIdentifier: "com.thewinelore.winelore",
    },
    android: {
        package: "com.thewinelore.winelore",
    },
    // withSceneLifecycle: iOS 27 will not launch an app without UIScene
    // support, which SDK 57's template lacks. Drop it on moving to SDK 58.
    plugins: ["expo-router", "expo-secure-store", "expo-web-browser", "./plugins/withSceneLifecycle"],
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
        EXPO_PUBLIC_WEB_ORIGIN: webOrigin(),
    },
}

export default config
