import { getCommissionDataAction, getReplicaCandidateAction, getReplicaCandidatesAction } from "../../../../../actions"
import { notFound, redirect } from "next/navigation"
import { getGeographicInfo } from "../../../../../../../lib/geocoding"
import CandidateEvaluationClientView from "./CandidateEvaluationClientView"

interface Props {
    params: Promise<{ id: string; replicaId: string; candidateId: string }>
}

export default async function CandidateEvaluationPage({ params }: Props) {
    const { id: routeCommissionId, replicaId, candidateId } = await params

    // 1. Fetch the replica candidate by its ID (candidateId is replica candidate ID)
    const replicaCandidate = await getReplicaCandidateAction(candidateId)
    if (!replicaCandidate) notFound()

    const commissionId = replicaCandidate.replica.commission.id
    const currentReplicaId = replicaCandidate.replica.id

    // If this candidate was already evaluated, send the user back to the wait page
    if (replicaCandidate.status === "EVALUATED") {
        redirect(`/commission/${commissionId}/replica/${currentReplicaId}/wait`)
    }

    // 2. Fetch the commission data (which includes templates/categories)
    const commission = await getCommissionDataAction(commissionId)
    if (!commission) notFound()

    // 3. Fetch all replica candidates for this replica
    const replicaCandidates = await getReplicaCandidatesAction(currentReplicaId)
    
    const currentIndex = replicaCandidates.findIndex((c: any) => c.id === candidateId)
    const currentReplicaCandidate = replicaCandidates[currentIndex] || replicaCandidate
    const currentCandidate = currentReplicaCandidate.candidate

    // Fetch candidate origin from coordinates if available
    const origin = currentCandidate?.sample?.batch?.beverage?.origin
    let originInfo = null
    if (origin && typeof origin.latitude === "number" && typeof origin.longitude === "number") {
        originInfo = await getGeographicInfo(origin.latitude, origin.longitude)
    }

    // Use the dynamic evaluation template from the backend
    const categories = commission.competition?.evaluationTemplateEdition?.categories || []

    return (
        <CandidateEvaluationClientView
            replicaName={replicaCandidate.replica.name}
            candidateCode={currentCandidate?.anonymizedCode || candidateId}
            commissionName={commission.name}
            currentIndex={currentIndex}
            totalCandidates={replicaCandidates.length}
            categories={categories}
            candidateId={candidateId}
            commissionId={commissionId}
            replicaId={currentReplicaId}
            originParts={[originInfo?.country, originInfo?.region, originInfo?.district].filter(Boolean) as string[]}
        />
    )
}
