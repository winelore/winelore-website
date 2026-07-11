import { getCommissionDataAction, getMyEvaluationForCandidateAction, getReplicaCandidateAction, getReplicaCandidatesAction } from "../../../../../actions"
import { isReplicaCandidateFinished } from "../../../../../replicaUtils"
import { notFound, redirect } from "next/navigation"
import { getGeographicInfo } from "../../../../../../../lib/geocoding"
import CandidateEvaluationClientView from "./CandidateEvaluationClientView"
import { cookies } from "next/headers"

interface Props {
    params: Promise<{ id: string; replicaId: string; candidateId: string }>
}

export default async function CandidateEvaluationPage({ params }: Props) {
    const { id: routeCommissionId, replicaId, candidateId } = await params

    const cookieStore = await cookies()
    const auidStr = cookieStore.get("auid")?.value
    if (!auidStr) {
        redirect("/auth/login")
    }

    // 1. Fetch the replica candidate by its ID (candidateId is replica candidate ID)
    const replicaCandidate = await getReplicaCandidateAction(candidateId)
    if (!replicaCandidate) notFound()

    const commissionId = replicaCandidate.replica.commission.id
    const currentReplicaId = replicaCandidate.replica.id

    // If this candidate round is finished, send the user to the wait page
    if (isReplicaCandidateFinished(replicaCandidate.status)) {
        redirect(`/commission/${commissionId}/replica/${currentReplicaId}/wait`)
    }

    const myEvaluation = await getMyEvaluationForCandidateAction(candidateId)
    if (myEvaluation?.isComplete === true) {
        redirect(`/commission/${commissionId}/replica/${currentReplicaId}/wait`)
    }

    // 2. Fetch the commission data (which includes templates/categories)
    const commission = await getCommissionDataAction(commissionId)
    if (!commission) notFound()

    // 3. Fetch all replica candidates and isolate the PANEL
    const replicaCandidatesAll = await getReplicaCandidatesAction(currentReplicaId)

    // Find current candidate to determine its panel
    const currentIndexAll = replicaCandidatesAll.findIndex((c: any) => c.id === candidateId)
    const currentReplicaCandidate = replicaCandidatesAll[currentIndexAll] || replicaCandidate
    const currentCandidate = currentReplicaCandidate.candidate
    const currentPanelId = currentCandidate.panelId

    const panelCandidates = replicaCandidatesAll.filter((c: any) => c.candidate.panelId === currentPanelId)

    const currentIndex = panelCandidates.findIndex((c: any) => c.id === candidateId)
    const evaluatedCount = panelCandidates.filter((c: any) => isReplicaCandidateFinished(c.status)).length
    const candidatesLeft = panelCandidates.length - evaluatedCount

    const panelName = commission.panels?.find((p: any) => p.id === currentPanelId)?.name || "Panel"

    // Fetch candidate origin
    const originVisible = commission.competition.beverageOriginDuringEvaluationEnabled
    const origin = currentCandidate?.sample?.batch?.beverage?.origin
    let originInfo = null
    if (originVisible && origin && typeof origin.latitude === "number" && typeof origin.longitude === "number") {
        originInfo = await getGeographicInfo(origin.latitude, origin.longitude)
    }

    // Use the dynamic evaluation template from the backend
    const categories = commission.competition?.evaluationTemplateEdition?.categories || []

    return (
        <CandidateEvaluationClientView
            replicaName={replicaCandidate.replica.name}
            candidateCode={currentCandidate?.anonymizedCode || candidateId}
            commissionName={commission.name}
            panelName={panelName}
            currentIndex={currentIndex}
            totalCandidates={panelCandidates.length}
            candidatesLeft={candidatesLeft}
            categories={categories}
            candidateId={candidateId}
            commissionId={commissionId}
            replicaId={currentReplicaId}
            originParts={[originInfo?.country, originInfo?.region, originInfo?.district].filter(Boolean) as string[]}
            propertyCommentsEnabled={commission.competition.propertyCommentsEnabled}
            voiceCommentsEnabled={commission.competition.voiceCommentsEnabled}
        />
    )
}