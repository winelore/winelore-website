"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import Link from "next/link"
import { FileText, Trophy, Wine, Globe2, Plus, Calendar, Settings } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { getDateLocale } from "@/lib/i18n"
import { AppHeader, type AppTabId } from "@/components/AppHeader"

type SeriesStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "ARCHIVED" | "PUBLISHED" | "SUSPENDED"

interface Series {
    id: string
    name: string
    status: SeriesStatus
    countriesType: string
    countriesCodes: string[] | null
    owners: number[][]
    createdAt: string
}

interface InitialData {
    series: Series[]
}

function CompetitionSeriesCard({ series }: { series: Series }) {
    const { formatStatus, locale } = useTranslation()

    const formattedDate = series.createdAt ? new Intl.DateTimeFormat(getDateLocale(locale), {
        month: 'short', day: 'numeric', year: 'numeric'
    }).format(new Date(series.createdAt)) : ""

    return (
        <div
            className="group bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 flex flex-col justify-center min-h-[140px]"
        >
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Trophy className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 truncate block">
                        {series.countriesType}
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                        {series.name}
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        series.status === "APPROVED" || series.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : series.status === "ARCHIVED" || series.status === "SUSPENDED"
                                ? "bg-slate-100 text-slate-500 border border-slate-200"
                                : "bg-amber-50 text-amber-600 border border-amber-100"
                    }`}>
                        <Globe2 className="w-3 h-3" />
                        {formatStatus(series.status)}
                    </span>

                    <Link
                        href={`/competitionSeries/${series.id}`}
                        className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                        title="Edit Series"
                    >
                        <Settings className="w-4 h-4" />
                    </Link>
                </div>

                <Link
                    href={`/competition/create?seriesId=${series.id}`}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl transition-all"
                >
                    Create Competition
                </Link>
            </div>
        </div>
    )
}

export default function MyCompetitionSeriesClientView({ initialData }: { initialData: InitialData }) {
    const [activeTab, setActiveTab] = useState<AppTabId>("competitions")
    const [currentAuid, setCurrentAuid] = useState<number | null>(null)
    const { t } = useTranslation()

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) setCurrentAuid(parseInt(cookieAuid, 10))
    }, [])

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-7xl flex flex-col gap-8">

                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{t("competitionSeries.title")}</h2>
                            <p className="text-sm text-slate-500 mt-1">{t("competitionSeries.subtitle")}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                                {t("competitionSeries.count", { count: initialData.series.length })}
                            </span>
                            <Link
                                href="/competitionSeries/create"
                                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                {t("competitionSeries.startButton")}
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {initialData.series.map((series) => (
                            <CompetitionSeriesCard key={series.id} series={series} />
                        ))}

                        {initialData.series.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-200/50">
                                <Trophy className="w-12 h-12 text-slate-300 mb-4" />
                                <h3 className="text-lg font-bold text-slate-700">{t("competitionSeries.emptyTitle")}</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-md">{t("competitionSeries.emptyDescription")}</p>
                                <Link
                                    href="/competitionSeries/create"
                                    className="mt-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold px-6 py-3 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    {t("competitionSeries.startButton")}
                                </Link>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    )
}
