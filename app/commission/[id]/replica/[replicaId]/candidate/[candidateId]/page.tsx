import { getCommissionDataAction, getReplicaCandidateAction, getReplicaCandidatesAction } from "../../../../../actions"
import EvaluationForm from "./EvaluationForm"
import { notFound, redirect } from "next/navigation"
import { MapPin } from "lucide-react"
import { getGeographicInfo } from "../../../../../../../lib/geocoding"

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
        <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8 flex justify-center">
            <div className="w-full max-w-4xl bg-white rounded-[32px] p-6 md:p-8 shadow-xl shadow-slate-200/50">
                <header className="border-b border-slate-100 pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Evaluation Process ({replicaCandidate.replica.name || `${replicaCandidate.replica.type} Replica`})</span>
                        <h1 className="text-2xl font-extrabold text-slate-800 mt-1">
                            Candidate: <span className="text-indigo-600">{currentCandidate?.anonymizedCode || candidateId}</span>
                        </h1>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-sm text-slate-400">Commission: {commission.name}</p>
                            {originInfo && (originInfo.country || originInfo.region || originInfo.district) && (
                                <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-0.5">
                                    <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <span className="font-medium text-slate-700">Origin: </span>
                                    <span className="text-slate-600">
                                        {[originInfo.country, originInfo.region, originInfo.district].filter(Boolean).join(", ")}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>
                    {currentIndex !== -1 && (
                        <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-500 text-center">
                            Candidate {currentIndex + 1} of {replicaCandidates.length}
                        </div>
                    )}
                </header>

                <EvaluationForm
                    categories={categories}
                    candidateId={candidateId}
                    commissionId={commissionId}
                    replicaId={currentReplicaId}
                />
            </div>
        </div>
    )
}
