"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import Link from "next/link"
import { FileText, Trophy, Wine, Timer, Calendar, CheckCircle, PlayCircle, AlertCircle, ChevronLeft, ChevronRight, Loader2, Plus, X } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"
import { getDateLocale } from "@/lib/i18n"
import { AppHeader, type AppTabId } from "@/components/AppHeader"
import { createQuickCompetitionAction } from "../competition/actions"
import { getCompetitionSeriesListAction } from "../competition/create/actions"

const tabs = (t: any) => [
    { id: "feed", label: t("common.feed"), icon: FileText },
    { id: "competitions", label: t("common.competitions"), icon: Trophy },
    { id: "beverages", label: t("common.beverages"), icon: Wine },
]

const formatEnumStatus = (status: string | undefined): string => {
    if (!status) return ""
    return status
        .toLowerCase()
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}

// ====================================================================
// INTERFACES
// ====================================================================
type CompetitionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PLANNED" | "STARTED" | "COMPLETED" | "CANCELLED"

interface Series {
    id: string
    name: string
}

interface Competition {
    id: string
    name: string
    status: CompetitionStatus
    startedAt: string | null
    endedAt: string | null
    plannedDates: {
        start: string | null
        end: string | null
    } | null
    series: Series
    holders: number[][]
}

interface InitialData {
    competitions: Competition[]
}

interface MyCompetitionsProps {
    initialData: InitialData
    nextCursor: string | null
    nextHistory: string
    prevCursor: string | null
    prevHistory: string
    hasPrev: boolean
    hasNext: boolean
    currentPage: number
    totalCount?: number
}

function CompetitionCard({ comp }: { comp: Competition }) {
    const [timeStr, setTimeStr] = useState<string>("")
    const { t, formatStatus, locale } = useTranslation()

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const updateTime = () => {
            if (comp.status === "STARTED" && comp.startedAt) {
                const start = new Date(comp.startedAt).getTime()
                const now = new Date().getTime()
                const diff = Math.max(0, now - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                setTimeStr(t("time.durationHoursMinutes", { hours, minutes }))

            } else if (comp.status === "COMPLETED" && comp.startedAt && comp.endedAt) {
                const start = new Date(comp.startedAt).getTime()
                const end = new Date(comp.endedAt).getTime()
                const diff = Math.max(0, end - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                setTimeStr(t("time.lasted", { time: t("time.durationHoursMinutes", { hours, minutes }) }))

            } else if (comp.status === "PLANNED" && comp.plannedDates?.start) {
                const date = new Date(comp.plannedDates.start)
                const formattedDate = new Intl.DateTimeFormat(getDateLocale(locale), {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }).format(date)
                setTimeStr(t("time.planned", { date: formattedDate }))
            } else {
                setTimeStr("")
            }
        }

        updateTime()
        if (comp.status === "STARTED") {
            intervalId = setInterval(updateTime, 60000)
        }
        return () => clearInterval(intervalId)
    }, [comp.status, comp.startedAt, comp.endedAt, comp.plannedDates, t, locale])

    return (
        <Link
            href={`/competition/${comp.id}`}
            className="group bg-white border border-slate-100 rounded-[32px] p-7 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 flex flex-col min-h-[140px]"
        >
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Trophy className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 truncate block">
                        {comp.series?.name || t("common.independent")}
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                        {comp.name}
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    comp.status === "STARTED" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        comp.status === "COMPLETED" ? "bg-slate-100 text-slate-500 border border-slate-200" :
                            comp.status === "CANCELLED" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                "bg-amber-50 text-amber-600 border border-amber-100"
                }`}>
                    {comp.status === "STARTED" ? <PlayCircle className="w-3 h-3" /> :
                        comp.status === "COMPLETED" ? <CheckCircle className="w-3 h-3" /> :
                            comp.status === "CANCELLED" ? <AlertCircle className="w-3 h-3" /> :
                                <Calendar className="w-3 h-3" />}
                    {formatStatus(comp.status)}
                </span>

                {timeStr && (
                    <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 truncate max-w-[50%]">
                        {comp.status === "PLANNED" ? <Calendar className="w-3.5 h-3.5 shrink-0" /> : <Timer className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{timeStr}</span>
                    </span>
                )}
            </div>
        </Link>
    )
}

export default function MyCompetitionsClientView({ initialData, nextCursor, nextHistory, prevCursor, prevHistory, hasPrev, hasNext, currentPage, totalCount = 0 }: MyCompetitionsProps) {
    const [currentAuid, setCurrentAuid] = useState<number | null>(null)
    const { t, tCount } = useTranslation()
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(false)
    const [isCreatingCompetition, setIsCreatingCompetition] = useState(false)
    const [newCompName, setNewCompName] = useState("")
    const [userSeriesList, setUserSeriesList] = useState<{ id: string; name: string }[]>([])
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>("")
    const [isSubmittingComp, setIsSubmittingComp] = useState(false)

    const openCreateModal = async () => {
        setNewCompName("")
        setIsCreatingCompetition(true)
        const cookieAuid = Cookies.get("auid")
        const auid = cookieAuid ? parseInt(cookieAuid, 10) : null

        try {
            const items = await getCompetitionSeriesListAction()
            if (Array.isArray(items)) {
                const mySeries = auid
                    ? items.filter((s: any) => s.owners && s.owners.flat().includes(Number(auid)))
                    : items
                setUserSeriesList(mySeries)
                if (mySeries.length > 0) {
                    setSelectedSeriesId(mySeries[0].id)
                } else {
                    setSelectedSeriesId("")
                }
            }
        } catch (err) {
            console.error("Failed to load user series list:", err)
        }
    }

    const handleCreateCompetition = async () => {
        setIsSubmittingComp(true)
        try {
            const cookieAuid = Cookies.get("auid")
            const auid = cookieAuid ? parseInt(cookieAuid, 10) : null
            const res = await createQuickCompetitionAction(newCompName, auid, selectedSeriesId || null)
            if (res.success && res.competitionId) {
                setIsCreatingCompetition(false)
                router.push(`/competition/${res.competitionId}`)
            } else {
                alert(res.error || "Failed to create competition")
            }
        } catch (err: any) {
            alert(err.message || "An error occurred")
        } finally {
            setIsSubmittingComp(false)
        }
    }

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) setCurrentAuid(parseInt(cookieAuid, 10))
    }, [])

    const handleNext = () => {
        if (!hasNext || !nextCursor) return
        setIsLoading(true)
        router.push(`${pathname}?cursor=${nextCursor}&h=${nextHistory}`)
    }

    const handlePrev = () => {
        if (!hasPrev) return
        setIsLoading(true)
        if (!prevCursor) {
            router.push(pathname)
        } else {
            const histParam = prevHistory ? `&h=${prevHistory}` : ''
            router.push(`${pathname}?cursor=${prevCursor}${histParam}`)
        }
    }

    useEffect(() => {
        setIsLoading(false)
    }, [initialData])

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="none" />

            <main className="flex-1 overflow-auto p-6 flex flex-col relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-3xl">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                )}

                <div className="flex items-center justify-between mb-4 shrink-0">
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{t("myCompetitions.title")}</h2>
                        <p className="text-sm text-slate-500 mt-1">{t("myCompetitions.subtitle")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                            {tCount("common.competitionsCount", totalCount)}
                        </span>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-3 text-sm font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer transform active:scale-95 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Competition</span>
                        </button>
                    </div>
                </div>

                {isCreatingCompetition && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in"
                        onClick={() => setIsCreatingCompetition(false)}
                    >
                        <div
                            className="w-full max-w-md bg-white border border-slate-100 rounded-[28px] p-6 md:p-7 shadow-2xl shadow-slate-900/20 flex flex-col gap-5"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                        <Trophy className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Create Competition</h3>
                                        <p className="text-[11px] text-slate-400 font-medium">Quick setup</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingCompetition(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                                >
                                    <X className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Competition Name
                                    </label>
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="e.g. Summer Tasting 2026"
                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all bg-slate-50/50"
                                        value={newCompName}
                                        onChange={e => setNewCompName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === "Enter") handleCreateCompetition()
                                            if (e.key === "Escape") setIsCreatingCompetition(false)
                                        }}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Competition Series
                                    </label>
                                    <select
                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all bg-slate-50/50 cursor-pointer"
                                        value={selectedSeriesId}
                                        onChange={e => setSelectedSeriesId(e.target.value)}
                                    >
                                        {userSeriesList.length > 0 ? (
                                            userSeriesList.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))
                                        ) : (
                                            <option value="">— Auto-assign Series —</option>
                                        )}
                                    </select>
                                </div>

                                <p className="text-[11px] text-slate-400 font-medium">
                                    You can edit dates, commissions, and settings later inline.
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingCompetition(false)}
                                    disabled={isSubmittingComp}
                                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateCompetition}
                                    disabled={isSubmittingComp}
                                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-75 cursor-pointer"
                                >
                                    {isSubmittingComp ? (
                                        <>
                                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            <span>Create Competition</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                    {initialData.competitions.map((comp) => (
                        <CompetitionCard key={comp.id} comp={comp} />
                    ))}

                    {initialData.competitions.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-200/50">
                            <Trophy className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">{t("myCompetitions.emptyTitle")}</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-md">{t("myCompetitions.emptyDescription")}</p>
                        </div>
                    )}
                </div>

                {(hasPrev || hasNext) && (
                    <div className="mt-2 flex items-center justify-center gap-3 shrink-0 pt-2 pb-2">
                        <button
                            onClick={handlePrev}
                            disabled={!hasPrev || isLoading}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        <span className="flex h-10 w-10 items-center justify-center text-sm font-semibold text-slate-600">
                    {currentPage}
                </span>

                        <button
                            onClick={handleNext}
                            disabled={!hasNext || isLoading}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}