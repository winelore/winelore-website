"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Trophy, ArrowLeft, Loader2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { AppHeader, type AppTabId } from "@/components/AppHeader"
import { createCompetitionSeriesAction } from "../actions"

const COUNTRIES_TYPE_OPTIONS = [
    { value: "GLOBAL", label: "Глобальна серія" },
    { value: "NOT_SPECIFIED", label: "Країна не вказана" },
    { value: "SPECIFIC", label: "Визначені країни" },
]

export default function CreateCompetitionSeriesClientView({ currentAuid }: { currentAuid: number }) {
    const [activeTab, setActiveTab] = useState<AppTabId>("competitions")
    const { t } = useTranslation()
    const router = useRouter()

    const [name, setName] = useState("")
    const [countriesType, setCountriesType] = useState(COUNTRIES_TYPE_OPTIONS[0].value)
    const [countriesCodesRaw, setCountriesCodesRaw] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const showCountryCodes = countriesType === "SPECIFIC"

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        const trimmedName = name.trim()
        if (!trimmedName) {
            setError("Введіть назву серії")
            return
        }

        const countriesCodes = showCountryCodes
            ? countriesCodesRaw
                .split(",")
                .map((c) => c.trim().toUpperCase())
                .filter(Boolean)
            : undefined

        setSubmitting(true)
        const result = await createCompetitionSeriesAction({
            name: trimmedName,
            countriesType,
            countriesCodes,
            owners: [[currentAuid]],
        })
        setSubmitting(false)

        if (!result.success || !result.series) {
            setError(result.error || "Не вдалося створити серію")
            return
        }

        router.push(`/competitionSeries/${result.series.id}`)
    }

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-2xl flex flex-col gap-6">

                    <Link
                        href="/competitionSeries"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors w-fit"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("competitionSeries.title")}
                    </Link>

                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <Trophy className="h-7 w-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t("competitionSeries.startButton")}</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Нова серія почнеться в статусі "Чернетка"</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="series-name" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Назва серії
                                </label>
                                <input
                                    id="series-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Наприклад, Wine Championship 2026"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="countries-type" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Охоплення країн
                                </label>
                                <select
                                    id="countries-type"
                                    value={countriesType}
                                    onChange={(e) => setCountriesType(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white"
                                >
                                    {COUNTRIES_TYPE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {showCountryCodes && (
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="countries-codes" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Коди країн (через кому)
                                    </label>
                                    <input
                                        id="countries-codes"
                                        type="text"
                                        value={countriesCodesRaw}
                                        onChange={(e) => setCountriesCodesRaw(e.target.value)}
                                        placeholder="UA, PL, DE"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                                    />
                                </div>
                            )}

                            {error && (
                                <div className="text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-3.5 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {submitting ? "Створення..." : t("competitionSeries.startButton")}
                            </button>
                        </form>
                    </div>

                </div>
            </main>
        </div>
    )
}
