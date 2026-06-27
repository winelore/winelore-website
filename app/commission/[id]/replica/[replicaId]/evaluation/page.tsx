import { redirect } from "next/navigation"
import { ensureAuthenticated } from "@/lib/auth/session"
import { getCommissionDataAction } from "../../../../actions"

interface Props {
    params: Promise<{ id: string; replicaId: string }>
}

export default async function EvaluationProxyPage({ params }: Props) {
    const { id, replicaId } = await params
    const auidStr = await ensureAuthenticated()
    if (!auidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(auidStr, 10)

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

    // Only the backend's currentCandidateId is authoritative. If it isn't set yet,
    // send the user to the wait page rather than guessing a candidate the backend
    // does not consider current (which would be rejected on submit).
    const targetCandidateId =
        replica.currentCandidateId && replicaCandidates.some((c: any) => c.id === replica.currentCandidateId)
            ? replica.currentCandidateId
            : null

    if (!targetCandidateId) {
        redirect(`/commission/${id}/replica/${replicaId}/wait`)
    }

    redirect(`/commission/${id}/replica/${replicaId}/candidate/${targetCandidateId}`)
}
