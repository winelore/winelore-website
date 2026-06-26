"use client"

import EvaluationForm from "./EvaluationForm"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { MapPin } from "lucide-react"

interface EvaluationCategory {
  id: string
  name: string
  properties: any[]
}

interface CandidateEvaluationClientViewProps {
  replicaName?: string | null
  candidateCode: string
  commissionName: string
  currentIndex: number
  totalCandidates: number
  candidatesLeft: number
  categories: EvaluationCategory[]
  candidateId: string
  commissionId: string
  replicaId: string
  originParts: string[]
  propertyCommentsEnabled: boolean
  voiceCommentsEnabled: boolean
}

export default function CandidateEvaluationClientView({
  replicaName,
  candidateCode,
  commissionName,
  currentIndex,
  totalCandidates,
  candidatesLeft,
  categories,
  candidateId,
  commissionId,
  replicaId,
  originParts,
  propertyCommentsEnabled,
  voiceCommentsEnabled,
}: CandidateEvaluationClientViewProps) {
  const { t, tCount } = useTranslation()
  const displayReplicaName = replicaName || t("common.standard")

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader activeTab="competitions" />

        <main className="flex-1 overflow-auto pt-4 pb-8 px-4 flex justify-center">
            <div className="w-full max-w-[95vw] bg-white rounded-[32px] pt-2 pb-2 px-6 md:pt-5 md:pb-8 md:px-8 shadow-xl shadow-slate-200/50">
                <header className="border-b border-slate-100 pb-3 mb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800">
                            {t("evaluation.candidate", { code: candidateCode })}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm">
                            <p className="text-slate-500">
                                <span className="font-medium text-slate-700">{t("evaluation.commission")}:</span> {commissionName}
                            </p>
                            {originParts.length > 0 && (
                                <div className="flex items-center gap-1.5 text-slate-600 border-l-2 border-slate-100 pl-4">
                                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    <span>{originParts.join(", ")}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {currentIndex !== -1 && (
                        <div className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-500 flex items-center gap-3">
              <span>
                {t("evaluation.candidateProgress", { current: currentIndex + 1, total: totalCandidates })}
              </span>
                            {candidatesLeft > 0 && (
                                <span className="text-indigo-600 border-l-2 border-slate-100 pl-3">
                  {tCount("commission.candidatesLeftToEvaluate", candidatesLeft)}
                </span>
                            )}
                        </div>
                    )}
                </header>

        <EvaluationForm
          categories={categories}
          candidateId={candidateId}
          commissionId={commissionId}
          replicaId={replicaId}
          propertyCommentsEnabled={propertyCommentsEnabled}
          voiceCommentsEnabled={voiceCommentsEnabled}
        />
        </div>
      </main>
    </div>
  )
}
