"use client"

import EvaluationForm from "./EvaluationForm"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { TranslatedText } from "@/lib/i18n/TranslatedText"
import { useTranslation } from "@/lib/i18n/context"

interface EvaluationCategory {
  id: string
  name: string
  properties: any[]
}

interface CandidateEvaluationClientViewProps {
  replicaName: string
  candidateCode: string
  commissionName: string
  currentIndex: number
  totalCandidates: number
  categories: EvaluationCategory[]
  candidateId: string
  commissionId: string
  nextCandidateId: string | null
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
  nextCandidateId,
}: CandidateEvaluationClientViewProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8 flex justify-center">
      <div className="w-full max-w-4xl bg-white rounded-[32px] p-6 md:p-8 shadow-xl shadow-slate-200/50">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>

        <header className="border-b border-slate-100 pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              {t("evaluation.process", { name: replicaName })}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-800 mt-1">
              {t("evaluation.candidate", { code: candidateCode })}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {t("evaluation.commission")}: <TranslatedText text={commissionName} />
            </p>
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
          nextCandidateId={nextCandidateId}
        />
      </div>
    </div>
  )
}
