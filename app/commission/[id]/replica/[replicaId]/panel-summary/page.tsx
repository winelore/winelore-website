"use client"

import React, { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import {
    completeCommissionReplicaAction,
    getWaitDataAction,
    startNextPanelAction,
} from "../../../../actions"
import { normalizeAuids } from "../../../../auidUtils"
import WaitPanelResults from "../wait/WaitPanelResults"

type PanelSummaryData = Awaited<ReturnType<typeof getWaitDataAction>>

export default function PanelSummaryPage({ params }: { params: Promise<{ id: string; replicaId: string }> }) {
    const { id: commissionId, replicaId } = use(params)
    const router = useRouter()
    const { t } = useTranslation()
    const [data, setData] = useState<PanelSummaryData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAdvancing, setIsAdvancing] = useState(false)
    const [loadError, setLoadError] = useState(false)

    useEffect(() => {
        if (!Cookies.get("auid")) {
            router.replace("/auth/login")
            return
        }

        let mounted = true
        let summaryPanelId: string | null = null

        const loadSummary = async () => {
            try {
                const nextData = await getWaitDataAction(commissionId, replicaId)
                if (!mounted) return

                if (nextData.replicaStatus === "COMPLETED") {
                    window.location.href = `/commission/${commissionId}/replica/${replicaId}/summary`
                    return
                }

                if (!nextData.currentPanelId) {
                    router.replace(`/commission/${commissionId}`)
                    return
                }

                if (summaryPanelId === null) {
                    if (!nextData.isPanelFinished) {
                        const destination = nextData.currentCandidateId
                            ? `/commission/${commissionId}/replica/${replicaId}/candidate/${nextData.currentCandidateId}`
                            : `/commission/${commissionId}/replica/${replicaId}/wait`
                        router.replace(destination)
                        return
                    }
                    summaryPanelId = nextData.currentPanelId
                } else if (nextData.currentPanelId !== summaryPanelId || !nextData.isPanelFinished) {
                    const destination = nextData.currentCandidateId
                        ? `/commission/${commissionId}/replica/${replicaId}/candidate/${nextData.currentCandidateId}`
                        : `/commission/${commissionId}/replica/${replicaId}/wait`
                    window.location.href = destination
                    return
                }

                setData(nextData)
                setLoadError(false)
            } catch (error) {
                console.error("Failed to load panel summary", error)
                if (mounted) setLoadError(true)
            } finally {
                if (mounted) setIsLoading(false)
            }
        }

        loadSummary()
        const interval = window.setInterval(loadSummary, 3000)
        return () => {
            mounted = false
            window.clearInterval(interval)
        }
    }, [commissionId, replicaId, router])

    const role = useMemo(() => {
        const actorAuid = Cookies.get("auid")
        if (!actorAuid || !data) return null
        return data.members.find((member: any) => normalizeAuids(member.auid).includes(actorAuid))?.role ?? null
    }, [data])

    const handleStartNextPanel = async () => {
        if (!data?.nextPanelId || !data.nextPanelFirstCandidateId || isAdvancing) return
        setIsAdvancing(true)
        try {
            await startNextPanelAction(replicaId, data.nextPanelId, data.nextPanelFirstCandidateId)
            window.location.href = `/commission/${commissionId}/replica/${replicaId}/candidate/${data.nextPanelFirstCandidateId}`
        } catch (error) {
            console.error("Failed to start next panel", error)
            setIsAdvancing(false)
        }
    }

    const handleEndReplica = async () => {
        if (isAdvancing) return
        setIsAdvancing(true)
        try {
            await completeCommissionReplicaAction(replicaId)
            window.location.href = `/commission/${commissionId}/replica/${replicaId}/summary`
        } catch (error) {
            console.error("Failed to complete replica", error)
            setIsAdvancing(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50">
                <AppHeader activeTab="competitions" />
                <main className="flex flex-1 items-center justify-center p-6">
                    <div className="flex items-center gap-3 font-medium text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                        {t("common.loading")}
                    </div>
                </main>
            </div>
        )
    }

    if (!data || !data.currentPanelId) {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50">
                <AppHeader activeTab="competitions" />
                <main className="flex flex-1 items-center justify-center p-6 text-center text-slate-500">
                    {loadError ? t("commission.panelSummaryLoadError") : t("common.loading")}
                </main>
            </div>
        )
    }

    const hasNextPanel = Boolean(data.nextPanelId && data.nextPanelFirstCandidateId)

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <AppHeader activeTab="competitions" />
            <main className="flex-1 p-6 md:p-10">
                <div className="mx-auto max-w-7xl space-y-8">
                    <Link
                        href={`/commission/${commissionId}`}
                        className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t("commission.backToCommission")}
                    </Link>

                    <header className="flex flex-col gap-5 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">
                                    {t("commission.panelSummaryTitle")}: {data.currentPanelName}
                                </h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    {hasNextPanel
                                        ? t("commission.panelCompletedDesc")
                                        : t("commission.finalPanelCompletedDesc")}
                                </p>
                            </div>
                        </div>

                        {role === "HEAD" && (
                            <button
                                type="button"
                                onClick={hasNextPanel ? handleStartNextPanel : handleEndReplica}
                                disabled={isAdvancing}
                                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none"
                            >
                                {isAdvancing ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        {hasNextPanel
                                            ? t("commission.startNextPanel")
                                            : t("commission.endReplica")}
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </button>
                        )}
                    </header>

                    {role !== "HEAD" && (
                        <p className="text-center text-sm font-medium text-slate-500">
                            {hasNextPanel
                                ? t("commission.waitingForNextPanel")
                                : t("commission.waitingForReplicaEnd")}
                        </p>
                    )}

                    <WaitPanelResults
                        commissionId={commissionId}
                        replicaId={replicaId}
                        panelId={data.currentPanelId}
                        panelName={data.currentPanelName || t("commission.panel")}
                        propertyCommentsEnabled={data.propertyCommentsEnabled}
                        voiceCommentsEnabled={data.voiceCommentsEnabled}
                    />

                </div>
            </main>
        </div>
    )
}
