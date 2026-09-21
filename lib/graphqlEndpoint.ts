export const DEFAULT_GRAPHQL_ENDPOINT = "https://winelore-dev.thewinelore.com/graphql"
export const DEFAULT_AXUS_GRAPHQL_ENDPOINT = "https://axusid.thewinelore.com/graphql"
export const DEFAULT_EVENTS_ENDPOINT = "https://winelore-dev.thewinelore.com/api/v1/events"

export function getGraphQLEndpoint() {
    return process.env.GRAPHQL_ENDPOINT
        || process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT
        || DEFAULT_GRAPHQL_ENDPOINT
}

export function getAxusEndpoint() {
    return process.env.AXUS_GRAPHQL_ENDPOINT
        || process.env.NEXT_PUBLIC_AXUS_GRAPHQL_ENDPOINT
        || DEFAULT_AXUS_GRAPHQL_ENDPOINT
}

export function getEventsEndpoint() {
    if (process.env.EVENTS_ENDPOINT) return process.env.EVENTS_ENDPOINT
    if (process.env.NEXT_PUBLIC_EVENTS_ENDPOINT) return process.env.NEXT_PUBLIC_EVENTS_ENDPOINT

    const gqlEndpoint = getGraphQLEndpoint()
    if (gqlEndpoint.includes("/graphql")) {
        return gqlEndpoint.replace(/\/graphql\/?$/, "/api/v1/events")
    }

    return DEFAULT_EVENTS_ENDPOINT
}


