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

    const isFinished = (status: string) => status === "EVALUATED" || status === "DISQUALIFIED"
    const pointed = replica.currentCandidateId
        ? replicaCandidates.find((c: { id: string; status: string }) => c.id === replica.currentCandidateId)
        : null
    const targetCandidateId = pointed && !isFinished(pointed.status)
        ? pointed.id
        : replicaCandidates.find((c: { status: string }) => !isFinished(c.status))?.id

    if (!targetCandidateId) {
        redirect(`/commission/${id}/replica/${replicaId}/wait`)
    }

    redirect(`/commission/${id}/replica/${replicaId}/candidate/${targetCandidateId}`)
}
