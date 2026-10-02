/** Explicit authorization takes precedence over the configured GraphQL bearer. */
export function axusGraphqlHeaders(
    token?: string,
    overrides?: Record<string, string>,
): Headers {
    const headers = new Headers({ "Content-Type": "application/json" })
    const bearer = token?.trim()
    if (bearer) headers.set("Authorization", `Bearer ${bearer}`)
    for (const [name, value] of Object.entries(overrides ?? {})) {
        headers.set(name, value)
    }
    return headers
}
