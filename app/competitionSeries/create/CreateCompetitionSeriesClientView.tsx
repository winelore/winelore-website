"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Trophy, ArrowLeft, Loader2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { AppHeader, type AppTabId } from "@/components/AppHeader"
import { createCompetitionSeriesAction } from "../actions"
import CountryMultiSelect from "../CountryMultiSelect"

const COUNTRIES_TYPE_VALUES = ["GLOBAL", "NOT_SPECIFIED", "SPECIFIC"] as const

export default function CreateCompetitionSeriesClientView({ currentAuid }: { currentAuid: number }) {
    const [activeTab, setActiveTab] = useState<AppTabId>("competitions")
    const { t } = useTranslation()
    const router = useRouter()

    const [name, setName] = useState("")
    const [countriesType, setCountriesType] = useState<string>(COUNTRIES_TYPE_VALUES[0])
    const [countriesCodes, setCountriesCodes] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const showCountryCodes = countriesType === "SPECIFIC"

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        const trimmedName = name.trim()
        if (!trimmedName) {
            setError(t("evaluation.fillRequired"))
            return
        }

        setSubmitting(true)
        const result = await createCompetitionSeriesAction({
            name: trimmedName,
            countriesType,
            countriesCodes: showCountryCodes ? countriesCodes : undefined,
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
                        href="/myCompetitionSeries"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors w-fit"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("myCompetitionSeries.title")}
                    </Link>

                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <Trophy className="h-7 w-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t("myCompetitionSeries.createTitle")}</h2>
                                <p className="text-sm text-slate-500 mt-0.5">{t("myCompetitionSeries.createSubtitle")}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="series-name" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    {t("myCompetitionSeries.nameLabel")}
                                </label>
                                <input
                                    id="series-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t("myCompetitionSeries.namePlaceholder")}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="countries-type" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    {t("myCompetitionSeries.countriesTypeLabel")}
                                </label>
                                <select
                                    id="countries-type"
                                    value={countriesType}
                                    onChange={(e) => setCountriesType(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white"
                                >
                                    {COUNTRIES_TYPE_VALUES.map((value) => (
                                        <option key={value} value={value}>{t(`competitionSeriesCountriesType.${value}`)}</option>
                                    ))}
                                </select>
                            </div>

                            {showCountryCodes && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        {t("myCompetitionSeries.countriesCodesLabel")}
                                    </label>
                                    <CountryMultiSelect value={countriesCodes} onChange={setCountriesCodes} />
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
                                {submitting ? t("myCompetitionSeries.creating") : t("myCompetitionSeries.createButton")}
                            </button>
                        </form>
                    </div>

                </div>
            </main>
        </div>
    )
}