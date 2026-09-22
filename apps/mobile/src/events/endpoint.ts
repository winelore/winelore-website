import Constants from "expo-constants"

const DEFAULT_EVENTS_ENDPOINT = "https://winelore-dev.thewinelore.com/api/v1/events"

/**
 * Resolves the SSE events endpoint URL for real-time live updates on mobile.
 */
export function getEventsEndpoint(): string {
    const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined
    const explicit = process.env.EXPO_PUBLIC_EVENTS_ENDPOINT || extra?.EXPO_PUBLIC_EVENTS_ENDPOINT
    if (explicit) return explicit

    const gql =
        process.env.EXPO_PUBLIC_GRAPHQL_ENDPOINT ||
        extra?.EXPO_PUBLIC_GRAPHQL_ENDPOINT ||
        "https://winelore-dev.thewinelore.com/graphql"
    if (gql.includes("/graphql")) {
        return gql.replace(/\/graphql\/?$/, "/api/v1/events")
    }

    return DEFAULT_EVENTS_ENDPOINT
}
