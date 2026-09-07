"use client"

import { useTranslation } from "@/lib/i18n/context"
import type { CompetitionCommentRow } from "@/app/competition/[id]/export/exportCompetitionResults"

interface CommentsTableProps {
    rows: CompetitionCommentRow[]
    resolvePersonName: (auidStr: string) => string
}

export function CommentsTable({ rows, resolvePersonName }: CommentsTableProps) {
    const { t } = useTranslation()

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-3">{t("commission.results.commissionColumn")}</th>
                        <th className="p-3">{t("commission.results.candidateCode")}</th>
                        <th className="p-3">{t("commission.results.codeBeverage")}</th>
                        <th className="p-3">{t("commission.results.evaluatorColumn")}</th>
                        <th className="p-3">{t("commission.results.propertyColumn")}</th>
                        <th className="p-3">{t("commission.results.commentTextColumn")}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                                {t("commission.results.noComments")}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, i) => (
                            <tr key={`comment-${i}`} className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-3 font-semibold text-indigo-600">{row.commissionName}</td>
                                <td className="p-3 font-bold text-slate-900">{row.code}</td>
                                <td className="p-3 font-semibold text-slate-800">{row.beverage}</td>
                                <td className="p-3 text-slate-600">{resolvePersonName(row.evaluator)}</td>
                                <td className="p-3 font-semibold text-slate-500">{row.property}</td>
                                <td className="p-3 text-slate-800">
                                    {row.commentText && <div>{row.commentText}</div>}
                                    {row.voiceUrl && (
                                        <audio controls src={row.voiceUrl} className="h-8 w-full max-w-xs mt-1" />
                                    )}
                                    {!row.commentText && !row.voiceUrl && "-"}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
