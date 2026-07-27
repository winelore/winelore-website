"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    Trophy,
    ArrowLeft,
    Globe2,
    Users,
    Plus,
    X,
    Loader2,
    Send,
    CheckCircle2,
    Rocket,
    PauseCircle,
    Archive,
} from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { getDateLocale } from "@/lib/i18n"
import { AppHeader, type AppTabId } from "@/components/AppHeader"
import {
    type CompetitionSeries,
    changeCompetitionSeriesNameAction,
    changeCompetitionSeriesCountriesAction,
    addCompetitionSeriesOwnerAction,
    removeCompetitionSeriesOwnerAction,
    submitCompetitionSeriesForReviewAction,
    approveCompetitionSeriesAction,
    publishCompetitionSeriesAction,
    suspendCompetitionSeriesAction,
    archiveCompetitionSeriesAction,
} from "../actions"

const STATUS_STYLES: Record<string, string> = {
    APPROVED: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    PUBLISHED: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    ARCHIVED: "bg-slate-100 text-slate-500 border border-slate-200",
    SUSPENDED: "bg-rose-50 text-rose-600 border border-rose-100",
    DRAFT: "bg-amber-50 text-amber-600 border border-amber-100",
    IN_REVIEW: "bg-amber-50 text-amber-600 border border-amber-100",
}

// `owners` is a list of lists of auid (number[][]) — flatten for display / membership checks.
function flattenOwners(owners: number[][]): number[] {
    return owners?.flat?.() ?? []
}

export default function CompetitionSeriesClientView({
                                                        initialSeries,
                                                        isOwner,
                                                    }: {
    initialSeries: CompetitionSeries
    isOwner: boolean
}) {
    const [activeTab, setActiveTab] = useState<AppTabId>("competitions")
    const { t, formatStatus, locale } = useTranslation()
    const router = useRouter()

    const [series, setSeries] = useState(initialSeries)
    const [name, setName] = useState(initialSeries.name)
    const [countriesType, setCountriesType] = useState(initialSeries.countriesType)
    const [countriesCodesRaw, setCountriesCodesRaw] = useState((initialSeries.countriesCodes || []).join(", "))
    const [newOwnerAuid, setNewOwnerAuid] = useState("")

    const [savingField, setSavingField] = useState<string | null>(null)
    const [transitioning, setTransitioning] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const formattedDate = series.createdAt ? new Intl.DateTimeFormat(getDateLocale(locale), {
        month: 'long', day: 'numeric', year: 'numeric'
    }).format(new Date(series.createdAt)) : ""

    const isEditable = isOwner && series.status !== "ARCHIVED"
    const owners = flattenOwners(series.owners)

    function withError<T>(fn: () => Promise<T>) {
        setError(null)
        return fn().catch((err: any) => {
            setError(err?.message || "Щось пішло не так")
            throw err
        })
    }

    async function handleSaveName() {
        const trimmed = name.trim()
        if (!trimmed || trimmed === series.name) return
        setSavingField("name")
        try {
            const result = await changeCompetitionSeriesNameAction(series.id, trimmed)
            if (result.success && result.series) {
                setSeries((prev) => ({ ...prev, name: result.series.name }))
            } else {
                setError(result.error || "Не вдалося перейменувати серію")
            }
        } finally {
            setSavingField(null)
        }
    }

    async function handleSaveCountries() {
        setSavingField("countries")
        const countriesCodes = countriesType === "SPECIFIC"
            ? countriesCodesRaw.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean)
            : undefined
        try {
            const result = await changeCompetitionSeriesCountriesAction(series.id, { countriesType, countriesCodes })
            if (result.success && result.series) {
                setSeries((prev) => ({
                    ...prev,
                    countriesType: result.series.countriesType,
                    countriesCodes: result.series.countriesCodes,
                }))
            } else {
                setError(result.error || "Не вдалося оновити країни")
            }
        } finally {
            setSavingField(null)
        }
    }

    async function handleAddOwner() {
        const auid = parseInt(newOwnerAuid, 10)
        if (!Number.isFinite(auid)) return
        setSavingField("owners")
        try {
            const result = await addCompetitionSeriesOwnerAction(series.id, [auid])
            if (result.success && result.series) {
                setSeries((prev) => ({ ...prev, owners: result.series.owners }))
                setNewOwnerAuid("")
            } else {
                setError(result.error || "Не вдалося додати власника")
            }
        } finally {
            setSavingField(null)
        }
    }

    async function handleRemoveOwner(auid: number) {
        setSavingField("owners")
        try {
            const result = await removeCompetitionSeriesOwnerAction(series.id, [auid])
            if (result.success && result.series) {
                setSeries((prev) => ({ ...prev, owners: result.series.owners }))
            } else {
                setError(result.error || "Не вдалося видалити власника")
            }
        } finally {
            setSavingField(null)
        }
    }

    async function handleTransition(
        key: string,
        action: (id: string) => Promise<{ success: boolean; series?: any; error?: string }>,
    ) {
        setTransitioning(key)
        setError(null)
        try {
            const result = await action(series.id)
            if (result.success && result.series) {
                setSeries((prev) => ({ ...prev, status: result.series.status }))
                router.refresh()
            } else {
                setError(result.error || "Дія не вдалася")
            }
        } finally {
            setTransitioning(null)
        }
    }

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-3xl flex flex-col gap-6">

                    <Link
                        href="/competitionSeries"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors w-fit"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("competitionSeries.title")}
                    </Link>

                    {/* Header card */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    <Trophy className="h-7 w-7" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{series.name}</h2>
                                    <p className="text-xs text-slate-400 mt-1">Створено {formattedDate}</p>
                                </div>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLES[series.status] || "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                                <Globe2 className="w-3.5 h-3.5" />
                                {formatStatus(series.status)}
                            </span>
                        </div>

                        {error && (
                            <div className="mt-6 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                                {error}
                            </div>
                        )}

                        {/* Status workflow actions */}
                        {isOwner && (
                            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-50">
                                {series.status === "DRAFT" && (
                                    <ActionButton
                                        label="Надіслати на розгляд"
                                        icon={Send}
                                        loading={transitioning === "submit"}
                                        onClick={() => handleTransition("submit", submitCompetitionSeriesForReviewAction)}
                                    />
                                )}
                                {series.status === "IN_REVIEW" && (
                                    <ActionButton
                                        label="Затвердити"
                                        icon={CheckCircle2}
                                        loading={transitioning === "approve"}
                                        onClick={() => handleTransition("approve", approveCompetitionSeriesAction)}
                                    />
                                )}
                                {(series.status === "APPROVED" || series.status === "SUSPENDED") && (
                                    <ActionButton
                                        label="Опублікувати"
                                        icon={Rocket}
                                        loading={transitioning === "publish"}
                                        onClick={() => handleTransition("publish", publishCompetitionSeriesAction)}
                                    />
                                )}
                                {series.status === "PUBLISHED" && (
                                    <ActionButton
                                        label="Призупинити"
                                        icon={PauseCircle}
                                        variant="warning"
                                        loading={transitioning === "suspend"}
                                        onClick={() => handleTransition("suspend", suspendCompetitionSeriesAction)}
                                    />
                                )}
                                {series.status !== "ARCHIVED" && (
                                    <ActionButton
                                        label="Архівувати"
                                        icon={Archive}
                                        variant="muted"
                                        loading={transitioning === "archive"}
                                        onClick={() => handleTransition("archive", archiveCompetitionSeriesAction)}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Details / editing */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50 flex flex-col gap-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Деталі серії</h3>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Назва</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={name}
                                    disabled={!isEditable}
                                    onChange={(e) => setName(e.target.value)}
                                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                                />
                                {isEditable && name.trim() !== series.name && (
                                    <SaveButton loading={savingField === "name"} onClick={handleSaveName} />
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Охоплення країн</label>
                            <div className="flex flex-col md:flex-row gap-2">
                                <select
                                    value={countriesType}
                                    disabled={!isEditable}
                                    onChange={(e) => setCountriesType(e.target.value)}
                                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white"
                                >
                                    <option value="GLOBAL">Глобальна серія</option>
                                    <option value="NOT_SPECIFIED">Країна не вказана</option>
                                    <option value="SPECIFIC">Визначені країни</option>
                                </select>
                                {countriesType === "SPECIFIC" && (
                                    <input
                                        type="text"
                                        value={countriesCodesRaw}
                                        disabled={!isEditable}
                                        onChange={(e) => setCountriesCodesRaw(e.target.value)}
                                        placeholder="UA, PL, DE"
                                        className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                                    />
                                )}
                                {isEditable && (
                                    countriesType !== series.countriesType ||
                                    countriesCodesRaw !== (series.countriesCodes || []).join(", ")
                                ) && (
                                    <SaveButton loading={savingField === "countries"} onClick={handleSaveCountries} />
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                Власники
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {owners.map((auid) => (
                                    <span
                                        key={auid}
                                        className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-600"
                                    >
                                        {auid}
                                        {isEditable && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOwner(auid)}
                                                disabled={savingField === "owners"}
                                                className="p-1 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                                title="Видалити власника"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </span>
                                ))}
                            </div>
                            {isEditable && (
                                <div className="flex gap-2 mt-1">
                                    <input
                                        type="number"
                                        value={newOwnerAuid}
                                        onChange={(e) => setNewOwnerAuid(e.target.value)}
                                        placeholder="AUID"
                                        className="w-32 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddOwner}
                                        disabled={savingField === "owners" || !newOwnerAuid}
                                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 text-sm font-semibold border border-slate-100 transition-all disabled:opacity-50"
                                    >
                                        {savingField === "owners" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Додати
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    )
}

function SaveButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all disabled:opacity-60"
        >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Зберегти
        </button>
    )
}

function ActionButton({
                          label,
                          icon: Icon,
                          onClick,
                          loading,
                          variant = "primary",
                      }: {
    label: string
    icon: React.ComponentType<{ className?: string }>
    onClick: () => void
    loading: boolean
    variant?: "primary" | "warning" | "muted"
}) {
    const styles = {
        primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
        warning: "bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100",
        muted: "bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-100",
    }[variant]

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-60 ${styles}`}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
            {label}
        </button>
    )
}
