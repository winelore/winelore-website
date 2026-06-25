import { getCommissionDataAction, getReplicaCandidateAction, getReplicaCandidatesAction } from "../../../actions"
import EvaluationForm from "./EvaluationForm"
import { notFound } from "next/navigation"

interface Props {
    params: Promise<{ id: string; candidateId: string }>
}

export default async function CandidateEvaluationPage({ params }: Props) {
    const { id: routeCommissionId, candidateId } = await params

    // 1. Fetch the replica candidate by its ID (candidateId is replica candidate ID)
    const replicaCandidate = await getReplicaCandidateAction(candidateId)
    if (!replicaCandidate) notFound()

    const commissionId = replicaCandidate.replica.commission.id
    const replicaId = replicaCandidate.replica.id

    // 2. Fetch the commission data (which includes templates/categories)
    const commission = await getCommissionDataAction(commissionId)
    if (!commission) notFound()

    // 3. Fetch all replica candidates for this replica
    const replicaCandidates = await getReplicaCandidatesAction(replicaId)
    
    const currentIndex = replicaCandidates.findIndex((c: any) => c.id === candidateId)
    const currentReplicaCandidate = replicaCandidates[currentIndex] || replicaCandidate
    const currentCandidate = currentReplicaCandidate.candidate

    const nextCandidateId = currentIndex !== -1 && currentIndex < replicaCandidates.length - 1 
        ? replicaCandidates[currentIndex + 1].id 
        : null

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
                        <p className="text-sm text-slate-400 mt-1">Commission: {commission.name}</p>
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
                    nextCandidateId={nextCandidateId}
                />
            </div>
        </div>
    )
}