export const DEFAULT_GRAPHQL_ENDPOINT = "https://winelore-dev.thewinelore.com/graphql"

export function getGraphQLEndpoint() {
    return process.env.GRAPHQL_ENDPOINT
        || process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT
        || DEFAULT_GRAPHQL_ENDPOINT
}

