export const DEFAULT_GRAPHQL_ENDPOINT = "https://winelore-dev.thewinelore.com/graphql"
export const DEFAULT_AXUS_GRAPHQL_ENDPOINT = "https://axusid.thewinelore.com/graphql"

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

