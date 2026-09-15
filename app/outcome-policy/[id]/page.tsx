export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_OUTCOME_POLICY_DETAIL, GET_OUTCOME_POLICY_EDITIONS_BY_POLICY } from "../queries"
import OutcomePolicyDetailView from "../OutcomePolicyDetailView"
import { latestPolicyEdition } from "@winelore/core"

export default async function OutcomePolicyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const cookieStore = await cookies()
    const auid = cookieStore.get("auid")?.value
    if (!auid) {
        redirect("/auth/login")
    }

    let policy = null;
    let edition = null;

    try {
        const [policyResponse, editionsResponse] = await Promise.all([
            fetchGraphQL(GET_OUTCOME_POLICY_DETAIL, { id }),
            fetchGraphQL(GET_OUTCOME_POLICY_EDITIONS_BY_POLICY, { policyId: id, limit: 100 }),
        ]);
        policy = policyResponse.outcomePolicy;

        edition = latestPolicyEdition(editionsResponse.outcomePolicyEditionsByPolicyId?.items);
    } catch (error) {
        console.error("Failed to fetch outcome policy:", error);
    }

    if (!policy) {
        redirect("/myOutcomePolicies")
    }

    return (
        <OutcomePolicyDetailView
            policy={policy}
            edition={edition}
            currentAuid={parseInt(auid, 10)}
        />
    )
}