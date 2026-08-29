"use client"

import { Award } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import type { CompetitionAwardRow } from "@/app/competition/[id]/export/exportCompetitionResults"

interface AwardsTableProps {
    rows: CompetitionAwardRow[]
    resolvePersonName: (auidStr: string) => string
}

export function AwardsTable({ rows, resolvePersonName }: AwardsTableProps) {
    const { t } = useTranslation()

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-3">{t("commission.results.commissionColumn")}</th>
                        <th className="p-3">{t("commission.results.candidateCode")}</th>
                        <th className="p-3">{t("commission.results.codeBeverage")}</th>
                        <th className="p-3">{t("commission.results.producer")}</th>
                        <th className="p-3">{t("commission.results.awardNameColumn")}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                                {t("commission.results.noAwardsRegistered")}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, i) => (
                            <tr key={`award-${i}`} className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-3 font-semibold text-indigo-600">{row.commissionName}</td>
                                <td className="p-3 font-bold text-slate-900">{row.code}</td>
                                <td className="p-3 font-semibold text-slate-800">{row.beverage}</td>
                                <td className="p-3 text-slate-600">{resolvePersonName(row.producer)}</td>
                                <td className="p-3 font-bold text-amber-600 flex items-center gap-1.5">
                                    <Award className="w-4 h-4 text-amber-500" />
                                    {row.awardName}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
