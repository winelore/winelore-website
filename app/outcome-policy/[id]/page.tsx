export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_OUTCOME_POLICY_DETAIL, GET_OUTCOME_POLICY_EDITIONS_BY_POLICY } from "../queries"
import OutcomePolicyDetailView from "../OutcomePolicyDetailView"

export default async function OutcomePolicyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const cookieStore = await cookies()
    if (!cookieStore.get("auid")?.value) {
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

        const items = editionsResponse.outcomePolicyEditionsByPolicyId?.items ?? [];
        edition = items.length
            ? items.reduce((latest: any, curr: any) => (curr.version > latest.version ? curr : latest))
            : null;
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
        />
    )
}