import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getCommissionDataAction } from "../../../../actions"
import { normalizeAuids } from "@winelore/core"

interface Props {
    params: Promise<{ id: string; replicaId: string }>
}

export default async function EvaluationProxyPage({ params }: Props) {
    const { id, replicaId } = await params
    const cookieStore = await cookies()
    const auidStr = cookieStore.get("auid")?.value
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

    if (!replica) {
        redirect(`/commission/${id}`)
    }

    // Verify membership: only members of a replica may evaluate its wines
    const isMember = (replica.members || []).some((m: any) =>
        normalizeAuids(m.auid).includes(auidStr)
    )
    if (!isMember) {
        const userReplica = replicas.find((r: any) =>
            (r.members || []).some((m: any) => normalizeAuids(m.auid).includes(auidStr))
        )
        if (userReplica) {
            redirect(`/commission/${id}/replica/${userReplica.id}/evaluation`)
        }
        redirect(`/commission/${id}?error=not_a_member`)
    }

    if (replica.status === "COMPLETED") {
        redirect(`/commission/${id}/results`)
    }

    if (replica.status !== "STARTED") {
        redirect(`/commission/${id}?error=not_started`)
    }

    const currentPanel = (replica.replicaPanels || []).find((p: any) => p.id === replica.currentPanelId)
    if (currentPanel?.status === "COMPLETED") {
        redirect(`/commission/${id}/replica/${replicaId}/panel-summary`)
    }

    const replicaCandidates =
        (replica.replicaPanels || []).flatMap((p: any) => p.replicaCandidates || [])
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
