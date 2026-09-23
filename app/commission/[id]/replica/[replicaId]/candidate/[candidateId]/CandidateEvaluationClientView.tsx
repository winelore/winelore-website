"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import EvaluationForm from "./EvaluationForm"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { MapPin, LayoutList, Tag, Wine } from "lucide-react"
import { readCachedWaitEvaluation } from "../../../../../waitEvaluationCache"
import { resolveEvaluationDestination } from "@winelore/core/evaluation"
import { BackLink } from "@/components/BackLink"
import { DiscussionDrawer } from "@/components/discussion/DiscussionDrawer"
import { useMobileNavTitle } from "@/lib/mobileNav"
import { useEvaluationLiveUpdates } from "@/hooks/useEvaluationLiveUpdates"


interface EvaluationCategory {
  id: string
  name: string
  properties: any[]
}

interface CandidateEvaluationClientViewProps {
  replicaName?: string | null
  candidateCode: string
  beverageName?: string | null
  commissionName: string
  panelName?: string
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
  visibleAttributes?: { label: string; value: string }[]
  discussionsEnabled?: boolean
  members?: Array<{ id?: string; auid: number[] | number; role: string }>
}

export default function CandidateEvaluationClientView({
  replicaName,
  candidateCode,
  beverageName,
  commissionName,
  panelName,
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
  visibleAttributes = [],
  discussionsEnabled = true,
  members = [],
}: CandidateEvaluationClientViewProps) {
  const router = useRouter()
  const { t, tCount } = useTranslation()
  const displayReplicaName = replicaName || t("common.standard")
  const candidateTitle = t("evaluation.candidate", { code: candidateCode })
  const titleRef = useMobileNavTitle<HTMLHeadingElement>(candidateTitle)

  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isFormSubmitting, setIsFormSubmitting] = useState(false)

  const isFetchingRef = useRef(false)

  const checkRedirect = useCallback(async () => {
    const cookieAuid = Cookies.get("auid")
    if (!cookieAuid) {
      router.push("/auth/login")
      return
    }

    if (isRedirecting || isFormSubmitting || isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const res = await fetch(`/api/commission/wait-status?commissionId=${commissionId}&replicaId=${replicaId}`, {
        cache: "no-store",
      })
      if (!res.ok) return
      const data = await res.json()
      if (isRedirecting || isFormSubmitting) return

      const destination = resolveEvaluationDestination({
        viewingCandidateId: candidateId,
        replicaStatus: data.replicaStatus,
        isPanelFinished: data.isPanelFinished,
        currentCandidateId: data.currentCandidateId,
        hasCompletedCurrentCandidate: data.hasCompletedCurrentCandidate,
        recentSubmission: readCachedWaitEvaluation(commissionId, replicaId),
      })

      if (destination.kind === "stay") return
      if (destination.kind === "candidate" && destination.candidateId === candidateId) return

      setIsRedirecting(true)
      const base = `/commission/${commissionId}`
      switch (destination.kind) {
        case "results":
          window.location.href = `${base}/results`
          return
        case "panelSummary":
          window.location.href = `${base}/replica/${replicaId}/panel-summary`
          return
        case "candidate":
          window.location.href = `${base}/replica/${replicaId}/candidate/${destination.candidateId}`
          return
        case "wait":
          window.location.href = `${base}/replica/${replicaId}/wait`
          return
      }
    } catch (err) {
      console.error("Evaluation redirect check error:", err)
    } finally {
      isFetchingRef.current = false
    }
  }, [commissionId, replicaId, candidateId, isRedirecting, isFormSubmitting, router])

  // Real-time evaluation updates via SSE with relaxed fallback polling
  useEvaluationLiveUpdates({
    commissionId,
    replicaId,
    onUpdate: checkRedirect,
    enabled: !isRedirecting && !isFormSubmitting,
  })

  return (
    <div className="flex min-h-app flex-col bg-slate-50/50">
      <AppHeader activeTab="competitions" showMobileTabBar={false} />

        <main className="app-main pt-1 pb-0 md:pt-4 md:pb-8 px-4 flex justify-center">
            <div className="w-full max-w-[95vw] md:bg-white md:rounded-[32px] md:pt-5 md:pb-8 md:px-8 md:shadow-xl md:shadow-slate-200/50">
                <header className="border-b border-slate-100 pb-3 mb-3 md:mb-2 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <BackLink
                            href={`/commission/${commissionId}`}
                            label={t("commission.backToCommission")}
                            className="shrink-0"
                        />
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 ref={titleRef} className="text-2xl md:text-xl font-extrabold text-slate-800">
                                    {candidateTitle}
                                </h1>
                                {beverageName && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                        <Wine className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                        {beverageName}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm">
                                <p className="text-slate-500">
                                    <span className="font-medium text-slate-700">{t("evaluation.commission")}:</span> {commissionName}
                                </p>
                                {panelName && (
                                    <div className="flex items-center gap-1.5 sm:border-l-2 border-slate-100 sm:pl-4 sm:px-2 py-0.5">
                                        <LayoutList className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                                        <span className="font-medium text-slate-800">Panel:</span>
                                        <span className="font-normal text-slate-600">{panelName}</span>
                                    </div>
                                )}
                                {originParts.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-slate-600 sm:border-l-2 border-slate-100 sm:pl-4">
                                        <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                        <span>{originParts.join(", ")}</span>
                                    </div>
                                )}
                                {visibleAttributes.length > 0 && visibleAttributes.map((attr, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 sm:border-l-2 border-slate-100 sm:pl-4 sm:px-2 py-0.5">
                                    <Tag className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                                    <span className="font-medium text-slate-800 capitalize">
                                        {attr.label}:
                                    </span>
                                    <span className="font-normal text-slate-600">{attr.value}</span>
                                </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {currentIndex !== -1 && (
                        <div className="self-start md:self-auto px-3 py-1.5 bg-white md:bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-500 flex items-center gap-3">
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
          key={candidateId}
          categories={categories}
          candidateId={candidateId}
          commissionId={commissionId}
          replicaId={replicaId}
          candidateCode={candidateCode}
          beverageName={beverageName}
          visibleAttributes={visibleAttributes}
          propertyCommentsEnabled={propertyCommentsEnabled}
          voiceCommentsEnabled={voiceCommentsEnabled}
          onSubmittingChange={setIsFormSubmitting}
        />
        </div>
      </main>
      {discussionsEnabled && (
          <DiscussionDrawer
              replicaCandidateId={candidateId}
              candidateCode={candidateCode}
              beverageName={beverageName}
              commissionName={commissionName}
              members={members}
              discussionsEnabled={discussionsEnabled}
          />
      )}
    </div>
  )
}
