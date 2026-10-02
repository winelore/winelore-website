const DEFAULT_AXUS_GRAPHQL_ENDPOINT = "https://axusid.thewinelore.com/graphql"

function looksLikeAxusEndpoint(url: string): boolean {
    const normalized = url.toLowerCase()
    return normalized.includes("axus") || normalized.includes("axusid")
}

export function getAxusGraphQLEndpoint(): string {
    const candidates = [
        process.env.AXUS_GRAPHQL_ENDPOINT,
        process.env.NEXT_PUBLIC_AXUS_GRAPHQL_ENDPOINT,
    ].filter(Boolean) as string[]

    for (const url of candidates) {
        if (looksLikeAxusEndpoint(url)) {
            return url
        }
    }

    if (candidates.length > 0) {
        console.warn(
            "[axus] Ignoring misconfigured GraphQL endpoint (expected AXUS ID, not WineLore backend):",
            candidates[0],
        )
    }

    return DEFAULT_AXUS_GRAPHQL_ENDPOINT
}
