"use client"

import { useTranslation } from "@/lib/i18n/context"

export type ResultsTab = "overview" | "commissions" | "expertScores" | "comments" | "awards"

interface ResultsTabBarProps {
    activeTab: ResultsTab
    onTabChange: (tab: ResultsTab) => void
    counts: Record<ResultsTab, number>
}

export function ResultsTabBar({ activeTab, onTabChange, counts }: ResultsTabBarProps) {
    const { t } = useTranslation()

    const tabs: { id: ResultsTab; label: string }[] = [
        { id: "overview", label: t("commission.results.finalOverview") },
        { id: "commissions", label: t("competition.commissionsBreakdown") },
        { id: "expertScores", label: t("commission.results.expertScoresTab") },
        { id: "comments", label: t("commission.results.commentsTab") },
        { id: "awards", label: t("commission.results.awards") },
    ]

    return (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === tab.id
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                    {tab.label} ({counts[tab.id]})
                </button>
            ))}
        </div>
    )
}
