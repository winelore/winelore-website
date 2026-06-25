import { getCommissionDataAction, getReplicaCandidateAction, getReplicaCandidatesAction } from "../../../../../actions"
import EvaluationForm from "./EvaluationForm"
import { notFound, redirect } from "next/navigation"
import { FileText, MapPin, Trophy, Wine } from "lucide-react"
import { ProfileMenu } from "@/components/wine-lore-main"
import { getGeographicInfo } from "../../../../../../../lib/geocoding"

const headerTabs = [
    { id: "feed", label: "Feed", icon: FileText, active: false },
    { id: "competitions", label: "Competitions", icon: Trophy, active: true },
    { id: "beverages", label: "Beverages", icon: Wine, active: false },
]

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
        <div className="flex min-h-screen flex-col bg-slate-50">
            <header className="flex shrink-0 items-center border-b border-slate-100 bg-white px-6 py-4">
                <div className="flex-1 flex items-center justify-start">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                        WineLore
                    </h1>
                </div>

                <div className="flex-none">
                    <nav className="flex items-center rounded-full border border-slate-100 bg-slate-50/50 p-1">
                        {headerTabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <span
                                    key={tab.id}
                                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab.active
                                        ? "bg-white text-slate-800 shadow-sm border border-slate-100/50"
                                        : "text-slate-500"
                                    }`}
                                >
                                    <Icon className={`h-4 w-4 ${tab.active ? "text-indigo-600" : ""}`} />
                                    <span>{tab.label}</span>
                                </span>
                            )
                        })}
                    </nav>
                </div>

                <div className="flex-1 flex justify-end">
                    <ProfileMenu username="likespro" />
                </div>
            </header>

            <main className="flex-1 overflow-auto py-8 px-4 md:px-8 flex justify-center">
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
            </main>
        </div>
    )
}
