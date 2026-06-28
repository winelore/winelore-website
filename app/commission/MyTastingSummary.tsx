"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Wine } from "lucide-react"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
import {
    hasEvaluationData,
    MemberEvaluationSection,
} from "./EvaluationCommentsDisplay"
import type { ExpertBeverageSummaryEntry, MyTastingSummaryData } from "./expertRanking"
import { formatPropertyScoreValue } from "@/lib/formatPropertyScore"

interface MyTastingSummaryProps {
    data: MyTastingSummaryData | null
    commissionId?: string
    showBackLink?: boolean
}

function BeverageSummaryCard({
    entry,
    data,
    resolveProducerName,
}: {
    entry: ExpertBeverageSummaryEntry
    data: MyTastingSummaryData
    resolveProducerName: (producerAuids: string[]) => string
}) {
    const { t } = useTranslation()
    const [expanded, setExpanded] = useState(false)
    const commentFlags = {
        propertyCommentsEnabled: data.propertyCommentsEnabled,
        voiceCommentsEnabled: data.voiceCommentsEnabled,
    }
    const hasDetails = hasEvaluationData(entry.evaluation, commentFlags)
    const booleanLabels = { yesLabel: t("common.yes"), noLabel: t("common.no") }

    return (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50/60 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                            {entry.order}
                        </span>
                        <h2 className="text-lg font-bold text-slate-800 truncate">
                            {entry.beverageName}
                        </h2>
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5 pl-9">
                        <p>
                            <span className="font-medium text-slate-500">
                                {t("commission.results.producer")}:
                            </span>{" "}
                            {resolveProducerName(entry.producerAuids)}
                        </p>
                        <p className="font-mono text-slate-400">
                            {t("commission.results.candidateCode")}: {entry.code}
                        </p>
                    </div>
                </div>
                <div className="shrink-0 sm:text-right pl-9 sm:pl-0 flex flex-col items-start sm:items-end gap-2">
                    {entry.totalScores && entry.totalScores.length > 0 && (
                        <div className="space-y-2">
                            {entry.totalScores.map((score) => (
                                <div key={score.code} className="sm:text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        {score.name}
                                    </p>
                                    <p className="text-2xl font-extrabold text-indigo-700">
                                        {formatPropertyScoreValue(
                                            score.value,
                                            data.propertyMap[score.code],
                                            booleanLabels,
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                    {hasDetails && (
                        <button
                            type="button"
                            onClick={() => setExpanded((prev) => !prev)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            {expanded ? (
                                <>
                                    <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                                    {t("commission.myRankingCollapseDetails")}
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                                    {t("commission.myRankingExpandDetails")}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {expanded && hasDetails && (
                <div className="px-5 py-4 border-t border-slate-100">
                    <MemberEvaluationSection
                        evaluation={entry.evaluation}
                        propertyMap={data.propertyMap}
                        accent="slate"
                        forceShowAll
                        propertyCommentsEnabled={data.propertyCommentsEnabled}
                        voiceCommentsEnabled={data.voiceCommentsEnabled}
                    />
                </div>
            )}
        </div>
    )
}

export function MyTastingSummary({
    data,
    commissionId,
    showBackLink = false,
}: MyTastingSummaryProps) {
    const { t } = useTranslation()
    const entries = data?.entries ?? null

    const allProducerAuids = useMemo(
        () => Array.from(new Set(entries?.flatMap((entry) => entry.producerAuids) ?? [])),
        [entries],
    )
    const { usernames } = useUsernames(allProducerAuids)

    const resolveProducerName = (producerAuids: string[]) => {
        if (producerAuids.length === 0) return t("commission.results.unknownProducer")
        return producerAuids.map((id) => usernames[id] || id).join(", ")
    }

    return (
        <div className="space-y-8">
            <header className="text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                    <Wine className="w-10 h-10 text-emerald-600" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-800">{t("commission.myRankingTitle")}</h1>
                <p className="text-slate-500 max-w-md mx-auto">{t("commission.myRankingDesc")}</p>
            </header>

            {entries === null ? (
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                        <span>{t("common.loading")}</span>
                    </div>
                </div>
            ) : entries.length === 0 ? (
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <p className="py-16 text-center text-slate-500">{t("commission.myRankingEmpty")}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {entries.map((entry) => (
                        <BeverageSummaryCard
                            key={`${entry.code}-${entry.order}`}
                            entry={entry}
                            data={data!}
                            resolveProducerName={resolveProducerName}
                        />
                    ))}
                </div>
            )}

            {showBackLink && commissionId && (
                <div className="text-center">
                    <Link
                        href={`/commission/${commissionId}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                        {t("commission.backToCommission")}
                    </Link>
                </div>
            )}
        </div>
    )
}
