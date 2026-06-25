import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getCommissionDataAction } from "../../../../actions"

interface Props {
    params: Promise<{ id: string; replicaId: string }>
}

export default async function EvaluationProxyPage({ params }: Props) {
    const { id, replicaId } = await params
    const cookieStore = await cookies()
    const auidStr = cookieStore.get("auid")?.value
    const currentAuid = auidStr ? parseInt(auidStr, 10) : null

    const commission = await getCommissionDataAction(id)
    if (!commission) {
        redirect(`/`)
    }

    // Find the specific replica
    const replicas = commission.replicas || []
    const replica = replicas.find((r: any) => r.id === replicaId)

    if (!replica || replica.status !== "STARTED") {
        redirect(`/commission/${id}?error=not_started`)
    }

    const replicaCandidates = replica.replicaCandidates || []
    if (replicaCandidates.length === 0) {
        redirect(`/commission/${id}?error=no_candidates`)
    }

    // Redirect to currentCandidateId if set, otherwise fallback to the first candidate
    const targetCandidateId = replica.currentCandidateId && replicaCandidates.some((c: any) => c.id === replica.currentCandidateId)
        ? replica.currentCandidateId
        : replicaCandidates[0]?.id;

    if (!targetCandidateId) {
        redirect(`/commission/${id}?error=no_candidates`)
    }

    redirect(`/commission/${id}/replica/${replicaId}/candidate/${targetCandidateId}`)
}
