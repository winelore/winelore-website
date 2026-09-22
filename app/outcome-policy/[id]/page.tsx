export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_OUTCOME_POLICY_DETAIL, GET_OUTCOME_POLICY_EDITIONS_BY_POLICY } from "../queries"
import OutcomePolicyDetailView from "../OutcomePolicyDetailView"
import { latestPolicyEdition } from "@winelore/core"

interface PageProps {
    params: Promise<{ id: string }>
    searchParams: Promise<{ version?: string }>
}

export default async function OutcomePolicyPage({ params, searchParams }: PageProps) {
    const { id } = await params
    const resolvedSearch = await searchParams
    const requestedVersion = resolvedSearch.version ? Number(resolvedSearch.version) : undefined

    const cookieStore = await cookies()
    const auid = cookieStore.get("auid")?.value
    if (!auid) {
        redirect("/auth/login")
    }

    let policy = null
    let editions: any[] = []
    let edition = null

    try {
        const [policyResponse, editionsResponse] = await Promise.all([
            fetchGraphQL(GET_OUTCOME_POLICY_DETAIL, { id }),
            fetchGraphQL(GET_OUTCOME_POLICY_EDITIONS_BY_POLICY, { policyId: id, limit: 100 }),
        ])
        policy = policyResponse.outcomePolicy
        editions = editionsResponse.outcomePolicyEditionsByPolicyId?.items || []
        edition = latestPolicyEdition(editions)
    } catch (error) {
        console.error("Failed to fetch outcome policy:", error)
    }

    if (!policy) {
        redirect("/myOutcomePolicies")
    }

    return (
        <OutcomePolicyDetailView
            policy={policy}
            edition={edition}
            editions={editions}
            initialVersion={Number.isInteger(requestedVersion) ? requestedVersion : undefined}
            currentAuid={parseInt(auid, 10)}
        />
    )
}