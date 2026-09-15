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

const OWNER_BY_USERNAME_QUERY = `
  query OwnerByUsername($username: String!) {
    ownerByUsername(username: $username)
  }
`

export interface FoundUser {
    auid: number
    username: string
    displayName: string
}

/**
 * Look a person up by their AXUS ID username, as the "add a producer" and
 * "add a member" fields do. A leading `@` is ignored.
 *
 * `null` means nobody has that username; a failed lookup throws, so a field
 * can tell "not found" from "could not search".
 */
export async function findUserByUsername(config: AxusConfig, username: string): Promise<FoundUser | null> {
    const trimmed = username.trim().replace(/^@/, "")
    if (!trimmed) return null

    const response = await fetch(config.graphqlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: OWNER_BY_USERNAME_QUERY, variables: { username: trimmed } }),
    })
    if (!response.ok) throw new Error(`AXUS ID search failed (${response.status})`)
    const json = (await response.json()) as {
        data?: { ownerByUsername?: string | number | null } | null
        errors?: Array<{ message?: string; extensions?: { classification?: string } }>
    }
    const auid = json.data?.ownerByUsername
    if (auid === null || auid === undefined || auid === "") {
        // AXUS ID answers an unknown username with null and a NOT_FOUND error.
        const failure = json.errors?.find((error) => error.extensions?.classification !== "NOT_FOUND")
        if (failure) throw new Error(failure.message || "AXUS ID search failed")
        return null
    }

    return {
        auid: Number(auid),
        username: trimmed,
        displayName: await resolveDisplayName(config, String(auid), trimmed),
    }
}
