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
  categories: EvaluationCategory[]
  candidateId: string
  commissionId: string
  replicaId: string
  originParts: string[]
}

export default function CandidateEvaluationClientView({
  replicaName,
  candidateCode,
  commissionName,
  currentIndex,
  totalCandidates,
  categories,
  candidateId,
  commissionId,
  replicaId,
  originParts,
}: CandidateEvaluationClientViewProps) {
  const { t } = useTranslation()
  const displayReplicaName = replicaName || t("common.standard")

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader activeTab="competitions" />

      <main className="flex-1 overflow-auto py-8 px-4 md:px-8 flex justify-center">
        <div className="w-full max-w-4xl bg-white rounded-[32px] p-6 md:p-8 shadow-xl shadow-slate-200/50">
        <header className="border-b border-slate-100 pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              {t("evaluation.process", { name: displayReplicaName })}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-800 mt-1">
              {t("evaluation.candidate", { code: candidateCode })}
            </h1>
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-sm text-slate-400">
                {t("evaluation.commission")}: {commissionName}
              </p>
              {originParts.length > 0 && (
                <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="font-medium text-slate-700">{t("evaluation.origin")} </span>
                  <span className="text-slate-600">
                    {originParts.join(", ")}
                  </span>
                </p>
              )}
            </div>
          </div>
          {currentIndex !== -1 && (
            <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-500 text-center">
              {t("evaluation.candidateProgress", {
                current: currentIndex + 1,
                total: totalCandidates,
              })}
            </div>
          )}
        </header>

        <EvaluationForm
          categories={categories}
          candidateId={candidateId}
          commissionId={commissionId}
          replicaId={replicaId}
        />
        </div>
      </main>
    </div>
  )
}
