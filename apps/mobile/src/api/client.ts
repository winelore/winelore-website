import { print, type DocumentNode } from "graphql"
import { getSdk } from "@winelore/core/gql/sdk"
import { getValidAccessToken } from "../auth/session"

const DEFAULT_GRAPHQL_ENDPOINT = "https://winelore-dev.thewinelore.com/graphql"

function getEndpoint(): string {
    return process.env.EXPO_PUBLIC_GRAPHQL_ENDPOINT || DEFAULT_GRAPHQL_ENDPOINT
}

export interface RequesterOptions {
    headers?: Record<string, string>
}

/**
 * Drives the generated GraphQL SDK — the same one the web app uses — over a
 * native transport.
 *
 * The web app reaches the API through /api/graphql, where the proxy attaches
 * credentials from httpOnly cookies. Native has no such hop, so the bearer
 * token is attached here and refreshed on demand.
 */
const requester = async <R, V>(
    doc: DocumentNode,
    vars?: V,
    options?: RequesterOptions,
): Promise<R> => {
    const accessToken = await getValidAccessToken()

    const response = await fetch(getEndpoint(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...options?.headers,
        },
        body: JSON.stringify({ query: print(doc), variables: vars }),
    })

    const text = await response.text()
    let json: { data?: R; errors?: Array<{ message?: string }> }
    try {
        json = JSON.parse(text)
    } catch {
        throw new Error(`GraphQL server error (${response.status})`)
    }

    if (json.errors?.length && !json.data) {
        throw new Error(json.errors[0]?.message || "GraphQL query failed")
    }
    return json.data as R
}

export const sdk = getSdk<RequesterOptions>(requester)

/**
 * Send a query that is not in the generated SDK.
 *
 * Needed for the deep template query in @winelore/core, which is a hand-built
 * string: it unrolls recursive formula expressions, which GraphQL's schema
 * language cannot express, so codegen cannot produce it.
 */
export async function fetchGraphQLRaw<TResult>(
    query: string,
    variables?: Record<string, unknown>,
): Promise<TResult> {
    const accessToken = await getValidAccessToken()

    const response = await fetch(getEndpoint(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
    })

    const text = await response.text()
    let json: { data?: TResult; errors?: Array<{ message?: string }> }
    try {
        json = JSON.parse(text)
    } catch {
        throw new Error(`GraphQL server error (${response.status})`)
    }
    if (json.errors?.length && !json.data) {
        throw new Error(json.errors[0]?.message || "GraphQL query failed")
    }
    return json.data as TResult
}
