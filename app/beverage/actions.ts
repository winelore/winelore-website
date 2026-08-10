"use server"

import { cookies } from "next/headers"
import { getGraphQLEndpoint } from "@/lib/graphqlEndpoint"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function submitBeverageForReviewAction(id: string) {
    if (!UUID_REGEX.test(id)) throw new Error("Invalid UUID parameter")

    const cookieStore = await cookies()
    const auid = cookieStore.get("auid")?.value
    if (!auid) throw new Error("Unauthorized: Please sign in")

    const response = await fetch(getGraphQLEndpoint(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            actor: auid,
            "x-actor": auid,
        },
        body: JSON.stringify({
            query: `
                mutation SubmitBeverageForReview($id: ID!) {
                    submitWineForReview(id: $id) {
                        id
                        status
                    }
                }
            `,
            variables: { id },
        }),
        cache: "no-store",
    })

    const text = await response.text()
    let payload: any
    try {
        payload = JSON.parse(text)
    } catch {
        throw new Error(`Invalid GraphQL response (${response.status})`)
    }

    if (!response.ok || payload.errors?.length) {
        throw new Error(payload.errors?.[0]?.message || `Failed to submit beverage for review (${response.status})`)
    }

    return payload.data?.submitWineForReview
}
