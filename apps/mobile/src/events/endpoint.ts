import Constants from "expo-constants"
import { DEFAULT_EVENTS_ENDPOINT, resolveEventsEndpointFromGraphql } from "@winelore/core/events"

/**
 * Resolves the SSE events endpoint URL for real-time live updates on mobile.
 * Derivation matches the web (`lib/graphqlEndpoint.ts`) via the shared core
 * helper; only the env/extra lookup is platform-specific.
 */
export function getEventsEndpoint(): string {
    const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined
    const explicit = process.env.EXPO_PUBLIC_EVENTS_ENDPOINT || extra?.EXPO_PUBLIC_EVENTS_ENDPOINT
    if (explicit) return explicit

    const gql =
        process.env.EXPO_PUBLIC_GRAPHQL_ENDPOINT ||
        extra?.EXPO_PUBLIC_GRAPHQL_ENDPOINT ||
        "https://winelore-dev.thewinelore.com/graphql"
    return resolveEventsEndpointFromGraphql(gql, DEFAULT_EVENTS_ENDPOINT)
}
