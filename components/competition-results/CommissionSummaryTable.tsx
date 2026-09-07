"use client"

import { useTranslation } from "@/lib/i18n/context"
import type { CommissionSummaryRow } from "@/app/competition/[id]/export/exportCompetitionResults"

export function CommissionSummaryTable({ rows }: { rows: CommissionSummaryRow[] }) {
    const { t, formatStatus } = useTranslation()

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-3">{t("commission.results.commissionNameColumn")}</th>
                        <th className="p-3">{t("commission.results.statusColumn")}</th>
                        <th className="p-3 text-center">{t("commission.results.candidatesCountColumn")}</th>
                        <th className="p-3 text-center">{t("commission.results.replicasCountColumn")}</th>
                        <th className="p-3 text-center">{t("commission.results.awardsGrantedColumn")}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {rows.map((row) => (
                        <tr key={row.commissionId} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3 font-bold text-slate-800">{row.commissionName}</td>
                            <td className="p-3">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    {formatStatus(row.status)}
                                </span>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-900">{row.candidateCount}</td>
                            <td className="p-3 text-center font-semibold text-slate-600">{row.replicaCount}</td>
                            <td className="p-3 text-center font-bold text-amber-600">{row.awardsCount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
