import type { AxusConfig } from "./types"

/**
 * AXUS ID models a user's name as a "variation" — a named persona. The display
 * name is resolved by finding the default variation (or the first one) and
 * reading its name, falling back to `@username` when it has none.
 *
 * These queries are sent as raw strings rather than through the generated SDK
 * so this stays usable from constrained runtimes (the web middleware runs on
 * the Edge) and from native, where the SDK's transport differs.
 */
const USER_DETAILS_QUERY = `
  query UserDetails($auid: ID!) {
    usernames(auid: $auid) { defaultUsername }
    defaultVariation(auid: $auid) { variationId }
    variations(auid: $auid) { id }
  }
`

const VARIATION_NAME_QUERY = `
  query VariationName($variationId: ID!) {
    name(variationId: $variationId) { displayName }
  }
`

/** AXUS ID's placeholder name for an unnamed variation — never shown to users. */
const PLACEHOLDER_VARIATION_NAME = "Default Variation"

async function axusQuery<T>(
    endpoint: string,
    query: string,
    variables: Record<string, unknown>,
): Promise<T | null> {
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, variables }),
        })
        if (!response.ok) return null
        const json = (await response.json()) as { data?: T }
        return json?.data ?? null
    } catch {
        return null
    }
}

/**
 * Resolve a user's display label.
 *
 * Always returns something usable: it degrades to `@defaultUsername`, then to
 * `@fallbackUsername`, rather than failing. A display name is cosmetic, so a
 * transient AXUS ID outage must not block sign-in.
 */
export async function resolveDisplayName(
    config: AxusConfig,
    auid: string,
    fallbackUsername: string,
): Promise<string> {
    const details = await axusQuery<{
        usernames?: { defaultUsername?: string | null } | null
        defaultVariation?: { variationId?: string | null } | null
        variations?: Array<{ id: string }> | null
    }>(config.graphqlEndpoint, USER_DETAILS_QUERY, { auid: String(auid) })

    const defaultUsername = details?.usernames?.defaultUsername || fallbackUsername
    const variationId = details?.defaultVariation?.variationId || details?.variations?.[0]?.id
    if (!variationId) return `@${defaultUsername}`

    const nameResult = await axusQuery<{ name?: { displayName?: string | null } | null }>(
        config.graphqlEndpoint,
        VARIATION_NAME_QUERY,
        { variationId },
    )

    const displayName = nameResult?.name?.displayName?.trim()
    return displayName && displayName !== PLACEHOLDER_VARIATION_NAME
        ? displayName
        : `@${defaultUsername}`
}
