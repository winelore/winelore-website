"use client"

import { useTranslation } from "@/lib/i18n/context"
import type { CompetitionExpertScoreRow } from "@/app/competition/[id]/export/exportCompetitionResults"

interface ExpertScoresTableProps {
    rows: CompetitionExpertScoreRow[]
    resolvePersonName: (auidStr: string) => string
}

export function ExpertScoresTable({ rows, resolvePersonName }: ExpertScoresTableProps) {
    const { t } = useTranslation()
    const visibleRows = rows.slice(0, 100)

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-3">{t("commission.results.commissionColumn")}</th>
                        <th className="p-3">{t("commission.results.candidateCode")}</th>
                        <th className="p-3">{t("commission.results.codeBeverage")}</th>
                        <th className="p-3">{t("commission.results.replicaColumn")}</th>
                        <th className="p-3">{t("commission.results.evaluatorColumn")}</th>
                        <th className="p-3">{t("commission.results.scoresOverviewColumn")}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                                {t("commission.results.noExpertScores")}
                            </td>
                        </tr>
                    ) : (
                        visibleRows.map((row, i) => (
                            <tr key={`score-${i}`} className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-3 font-semibold text-indigo-600">{row.commissionName}</td>
                                <td className="p-3 font-bold text-slate-900">{row.code}</td>
                                <td className="p-3 font-semibold text-slate-800">{row.beverage}</td>
                                <td className="p-3 text-slate-600">{row.replicaName}</td>
                                <td className="p-3 text-slate-600">{resolvePersonName(row.evaluator)}</td>
                                <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                        {Object.entries(row.scores).map(([k, v]) => (
                                            <span key={k} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                                                {k}: {v}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            {rows.length > 100 && (
                <div className="p-3 text-center text-[10px] text-slate-400 font-semibold bg-slate-50 border-t border-slate-100">
                    {t("commission.results.showingFirst100", { count: rows.length })}
                </div>
            )}
        </div>
    )
}
