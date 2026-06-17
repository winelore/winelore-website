import { getCommissionDataAction } from "../../../actions"
import EvaluationForm from "./EvaluationForm"
import { notFound } from "next/navigation"

interface Props {
    params: Promise<{ id: string; candidateId: string }>
}

export default async function CandidateEvaluationPage({ params }: Props) {
    const { id: commissionId, candidateId } = await params

    const commission = await getCommissionDataAction(commissionId)
    if (!commission) notFound()

    // Logs the full structure to your terminal/server console
    console.log("👉 COMMISSION DEBUG DATA:", JSON.stringify(commission, null, 2))

    // Temporary fallback to prevent crashes while we check the logs
    const categories = (commission as any).categories || []

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8 flex justify-center">
            <div className="w-full max-w-4xl bg-white rounded-[32px] p-6 md:p-8 shadow-xl shadow-slate-200/50">
                <header className="border-b border-slate-100 pb-4 mb-6">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Evaluation Process</span>
                    <h1 className="text-2xl font-extrabold text-slate-800 mt-1">Candidate Rating</h1>
                    <p className="text-sm text-slate-400 mt-1">Commission: {commission.name}</p>
                </header>

                <EvaluationForm
                    categories={categories}
                    candidateId={candidateId}
                />
            </div>
        </div>
    )
}