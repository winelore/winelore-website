"use client"

import React, { useState, useEffect, useMemo } from "react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import { FileText, Trophy, Wine, User, Timer, CheckCircle, Calendar, Layers, PlayCircle } from "lucide-react"
import { AppHeader, type AppTabId } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
import { getDateLocale } from "@/lib/i18n"
import Link from "next/link"
import { startCompetitionAction, getCompetitionDataAction } from "../actions"

const tabs = (t: any) => [
    { id: "feed", label: t("common.feed"), icon: FileText },
    { id: "competitions", label: t("common.competitions"), icon: Trophy },
    { id: "beverages", label: t("common.beverages"), icon: Wine },
]

function getGoogleCalendarUrl(name: string, details: string, plannedStartAt: string, plannedEndAt: string | null): string {
    const start = new Date(plannedStartAt)
    const end = plannedEndAt ? new Date(plannedEndAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

    const formatCalDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    }

    const dates = `${formatCalDate(start)}/${formatCalDate(end)}`
    const text = encodeURIComponent(name)
    const encodedDetails = encodeURIComponent(details)

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${encodedDetails}`
}

function getAvatarGradient(auid: number): string {
    const gradients = [
        "from-pink-500 via-rose-500 to-red-500",
        "from-indigo-500 via-purple-500 to-pink-500",
        "from-blue-500 via-teal-500 to-emerald-500",
        "from-amber-400 via-orange-500 to-red-500",
        "from-violet-600 via-purple-600 to-indigo-600",
        "from-cyan-500 via-blue-500 to-indigo-500",
        "from-emerald-400 via-teal-500 to-cyan-500",
        "from-fuchsia-500 via-purple-600 to-pink-600",
    ]
    const idx = Math.abs(auid) % gradients.length
    return gradients[idx]
}

function HolderAvatar({ auid, username, className }: { auid: number; username?: string; className?: string }) {
    const gradient = getAvatarGradient(auid)
    const initials = username ? username.slice(0, 2).toUpperCase() : `${auid}`.slice(-2)
    return (
        <div className={`flex items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white font-bold text-[10px] shadow-sm shrink-0 border border-white/10 ${className}`}>
            <span>{initials}</span>
        </div>
    )
}

function StatusSteps({ status }: { status: string }) {
    const { t } = useTranslation()
    const steps = [
        { id: "planned", label: t("competition.stepPlanned"), description: t("competition.stepPlannedDesc") },
        { id: "started", label: t("competition.stepStarted"), description: t("competition.stepStartedDesc") },
        { id: "completed", label: t("competition.stepCompleted"), description: t("competition.stepCompletedDesc") }
    ]

    let currentStepIdx = 0
    if (status === "STARTED") {
        currentStepIdx = 1
    } else if (status === "COMPLETED") {
        currentStepIdx = 2
    }

    return (
        <div className="w-full bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {steps.map((step, idx) => {
                    const isCompleted = idx < currentStepIdx
                    const isActive = idx === currentStepIdx

                    return (
                        <React.Fragment key={step.id}>
                            <div className="flex items-center gap-3 flex-1">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold transition-all duration-350 shrink-0 ${
                                    isCompleted 
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                                        : isActive 
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-500/10" 
                                            : "bg-slate-50 border-slate-200 text-slate-400"
                                }`}>
                                    {isCompleted ? (
                                        <CheckCircle className="w-4 h-4" />
                                    ) : (
                                        <span>{idx + 1}</span>
                                    )}
                                </div>
                                <div>
                                    <h4 className={`text-xs font-bold ${isActive ? "text-slate-900" : "text-slate-500"}`}>{step.label}</h4>
                                    <p className="text-[10px] text-slate-400">{step.description}</p>
                                </div>
                            </div>

                        </React.Fragment>
                    )
                })}
            </div>
        </div>
    )
}

function CommissionCard({ comm }: { comm: Commission }) {
    const [timeStr, setTimeStr] = useState<string>("")
    const { t, formatStatus, locale } = useTranslation()

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const updateTime = () => {
            if (comm.status === "STARTED" && comm.startedAt) {
                const start = new Date(comm.startedAt).getTime()
                const now = new Date().getTime()
                const diff = Math.max(0, now - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                const time = hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes })
                setTimeStr(`${time} ${seconds}s`)
            } else if (comm.status === "COMPLETED" && comm.startedAt && comm.endedAt) {
                const start = new Date(comm.startedAt).getTime()
                const end = new Date(comm.endedAt).getTime()
                const diff = Math.max(0, end - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                const time = hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes })
                setTimeStr(t("time.lasted", { time }))
            } else if (comm.status === "PLANNED" && comm.plannedStartAt) {
                const date = new Date(comm.plannedStartAt)
                const formattedDate = new Intl.DateTimeFormat(getDateLocale(locale), {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }).format(date)
                setTimeStr(t("time.plannedFor", { date: formattedDate }))
            } else {
                setTimeStr("")
            }
        }

        updateTime()

        if (comm.status === "STARTED") {
            intervalId = setInterval(updateTime, 1000)
        }

        return () => clearInterval(intervalId)
    }, [comm.status, comm.startedAt, comm.endedAt, comm.plannedStartAt, t, locale])

    return (
        <Link
            href={`/commission/${comm.id}`}
            className="group flex items-center gap-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-md shadow-slate-100/50 transition-all duration-350 hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-200/40 hover:border-indigo-100 active:scale-[0.98]"
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-350">
                <Wine className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                    {t("commission.session")}
                </span>
                <span className="block text-base font-bold text-slate-800 truncate">
                    {comm.name}
                </span>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider mt-1.5">
                    <span className={
                        comm.status === 'STARTED' ? 'text-emerald-500' :
                        comm.status === 'COMPLETED' ? 'text-slate-400' : 'text-amber-500'
                    }>
                        {formatStatus(comm.status)}
                    </span>
                    {timeStr && (
                        <>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500 flex items-center gap-1">
                                <Timer className="w-3.5 h-3.5" />
                                {timeStr}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </Link>
    )
}

// ====================================================================
// INTERFACES
// ====================================================================
type CompetitionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PLANNED" | "STARTED" | "COMPLETED" | "CANCELLED"
type CommissionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PLANNED" | "STARTED" | "COMPLETED" | "CANCELLED"

interface Series {
    id: string
    name: string
    status: string
}

interface Commission {
    id: string
    name: string
    status: CommissionStatus
    plannedStartAt: string | null
    plannedEndAt: string | null
    startedAt: string | null
    endedAt: string | null
}

interface InitialData {
    id: string
    name: string
    status: CompetitionStatus
    startedAt: string | null
    plannedStartAt: string | null
    plannedEndAt: string | null
    endedAt: string | null
    series: Series
    holders: number[]
    commissions: Commission[]
}

export default function CompetitionClientView({ 
    initialData: propInitialData,
    serverAuid,
    children
}: { 
    initialData: InitialData;
    serverAuid?: number | null;
    children?: React.ReactNode;
}) {
    const { t, locale, formatStatus, formatDateTime } = useTranslation()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<AppTabId>("competitions")
    const [localData, setLocalData] = useState<InitialData>(propInitialData)
    const [timeDisplay, setTimeDisplay] = useState<string>("")
    const [currentAuid, setCurrentAuid] = useState<number | null>(serverAuid || null)
    const [isMutating, setIsMutating] = useState(false)

    const initialData = localData
    const compTabs = tabs(t)

    // Fetch usernames for competition holders
    const allHolderAuids = useMemo(() => {
        return initialData.holders || []
    }, [initialData.holders])
    const { usernames } = useUsernames(allHolderAuids)

    useEffect(() => {
        setLocalData(propInitialData)
    }, [propInitialData])

    useEffect(() => {
        const pollInterval = setInterval(async () => {
            try {
                const updated = await getCompetitionDataAction(localData.id)
                if (updated) {
                    setLocalData(updated)
                }
            } catch (err) {
                console.error("Failed to poll competition data:", err)
            }
        }, 3000)

        return () => clearInterval(pollInterval)
    }, [localData.id])

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) {
            setCurrentAuid(parseInt(cookieAuid, 10))
        }
    }, [])

    const handleStartCompetition = async () => {
        if (isMutating) return
        setIsMutating(true)
        try {
            await startCompetitionAction(initialData.id)
            router.refresh()
        } catch (err) {
            console.error("Failed to start competition:", err)
        } finally {
            setIsMutating(false)
        }
    }

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const updateTime = () => {
            if (initialData.status === "STARTED" && initialData.startedAt) {
                const start = new Date(initialData.startedAt).getTime()
                const now = new Date().getTime()
                const diff = Math.max(0, now - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                const formattedTime = hours > 0
                    ? `${hours}h ${minutes}m ${seconds}s`
                    : `${minutes}m ${seconds}s`

                setTimeDisplay(formattedTime)

            } else if (initialData.status === "COMPLETED" && initialData.startedAt && initialData.endedAt) {
                const start = new Date(initialData.startedAt).getTime()
                const end = new Date(initialData.endedAt).getTime()
                const diff = Math.max(0, end - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                const time = hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes })
                setTimeDisplay(t("time.lasted", { time }))

            } else if (initialData.status === "PLANNED" && initialData.plannedStartAt) {
                const date = new Date(initialData.plannedStartAt)
                const formattedDate = new Intl.DateTimeFormat(getDateLocale(locale), {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }).format(date)
                setTimeDisplay(t("time.plannedFor", { date: formattedDate }))

            } else {
                setTimeDisplay("")
            }
        }

        updateTime()

        if (initialData.status === "STARTED") {
            intervalId = setInterval(updateTime, 1000)
        }

        return () => clearInterval(intervalId)
    }, [initialData.status, initialData.startedAt, initialData.plannedStartAt, initialData.endedAt])

    const isHolder = currentAuid !== null && initialData.holders.includes(currentAuid)

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-7xl flex flex-col gap-8">
                    <div className="w-full flex flex-col lg:flex-row items-start gap-8">
                    
                    {/* Left Column: Status, Series, timeline */}
                    <div className="w-full lg:w-[45%] flex flex-col gap-6">
                        <StatusSteps status={initialData.status} />

                        {/* Series Details */}
                        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-inner">
                                <Layers className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                                    {t("competition.series")}
                                </span>
                                <p className="text-base font-bold text-slate-800 mt-0.5 truncate">
                                    {initialData.series.name}
                                </p>
                            </div>
                        </div>

                        {/* Timeline and Dates */}
                        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50">
                            <h3 className="text-sm font-bold tracking-tight text-slate-800 flex items-center gap-2 mb-4">
                                <Calendar className="w-5 h-5 text-indigo-500" />
                                {t("competition.timelineDetails")}
                            </h3>
                            <div className="flex flex-col gap-4 relative pl-4 border-l border-slate-100 ml-2.5">
                                {/* Planned Start */}
                                <div className="relative">
                                    <div className="absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{t("competition.plannedStart")}</span>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                        <p className="text-xs font-semibold text-slate-800">
                                            {formatDateTime(initialData.plannedStartAt)}
                                        </p>
                                        {initialData.status === "PLANNED" && initialData.plannedStartAt && (
                                            <a
                                                href={getGoogleCalendarUrl(
                                                    initialData.name,
                                                    t("competition.calendarDetails", { name: initialData.name }),
                                                    initialData.plannedStartAt,
                                                    initialData.plannedEndAt
                                                )}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/40 rounded-md px-1.5 py-0.5 transition-colors"
                                            >
                                                {t("common.addToCalendar")}
                                            </a>
                                        )}
                                    </div>
                                </div>
                                {/* Planned End */}
                                {initialData.plannedEndAt && (
                                    <div className="relative">
                                        <div className="absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white" />
                                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{t("competition.plannedEnd")}</span>
                                        <p className="text-xs font-semibold text-slate-800 mt-0.5">
                                            {formatDateTime(initialData.plannedEndAt)}
                                        </p>
                                    </div>
                                )}
                                {/* Actual Start */}
                                <div className="relative">
                                    <div className={`absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                                        initialData.startedAt ? 'bg-emerald-500' : 'bg-slate-200'
                                    }`} />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{t("competition.actualStart")}</span>
                                    <p className={`text-xs font-semibold mt-0.5 ${initialData.startedAt ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {initialData.startedAt ? formatDateTime(initialData.startedAt) : t("competition.notStartedYet")}
                                    </p>
                                </div>
                                {/* Actual End */}
                                <div className="relative">
                                    <div className={`absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                                        initialData.endedAt ? 'bg-rose-500' : 'bg-slate-200'
                                    }`} />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{t("competition.actualEnd")}</span>
                                    <p className={`text-xs font-semibold mt-0.5 ${initialData.endedAt ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {initialData.endedAt ? formatDateTime(initialData.endedAt) : t("competition.notEndedYet")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Info & Commissions List */}
                    <div className="w-full lg:w-[55%] flex flex-col gap-6">
                        {/* Competition Header Card */}
                        <div className="relative overflow-hidden bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50">
                            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-indigo-50/20 blur-3xl pointer-events-none" />

                            <div className="flex items-start gap-4 mb-6">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/55 shadow-sm">
                                    <Trophy className="h-8 w-8" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-xs font-bold tracking-widest uppercase text-slate-400">
                                        {t("competition.panel")}
                                    </span>
                                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5 truncate">
                                        {initialData.name}
                                    </h2>
                                    <p className="text-sm mt-1.5 flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            initialData.status === "STARTED" 
                                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                                                : initialData.status === "COMPLETED"
                                                    ? "bg-slate-100 text-slate-500 border border-slate-200"
                                                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                        }`}>
                                            {initialData.status === "STARTED" && (
                                                <span className="relative flex h-2 w-2 mr-1">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                            )}
                                            {formatStatus(initialData.status)}
                                        </span>
                                        {timeDisplay && (
                                            <>
                                                <span className="text-slate-300">|</span>
                                                <span className="text-slate-500 font-semibold flex items-center gap-1 text-xs">
                                                    <Timer className="w-3.5 h-3.5 text-indigo-500" />
                                                    {timeDisplay}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                                    {t("competition.holders")}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {initialData.holders.length > 0 ? (
                                        initialData.holders.map((holderAuid) => (
                                            <div key={holderAuid} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-1.5 hover:border-indigo-200 transition-colors duration-250">
                                                <HolderAvatar auid={holderAuid} username={usernames[holderAuid]} className="h-5 w-5" />
                                                <span className="text-xs font-bold text-slate-700">{usernames[holderAuid] || String(holderAuid)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-xs text-slate-400">{t("competition.noHolders")}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {initialData.status === "PLANNED" && (
                            <div className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-xl shadow-slate-200/50">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                                    {t("competition.actionsControls")}
                                </h3>
                                <div className="flex flex-col gap-4">
                                    {isHolder ? (
                                        <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-indigo-50/30 border border-indigo-100/50 flex-wrap sm:flex-nowrap">
                                            <div className="max-w-full sm:max-w-[65%]">
                                                <h4 className="text-sm font-bold text-slate-800">
                                                    {t("competition.startTitle")}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {t("competition.startDescription")}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleStartCompetition}
                                                disabled={isMutating}
                                                className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 px-6 py-3 text-sm font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shrink-0"
                                            >
                                                {isMutating ? (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                                ) : (
                                                    <PlayCircle className="h-4 w-4" />
                                                )}
                                                <span>{t("competition.startButton")}</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-3 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-pulse" />
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-slate-800">
                                                    {t("competition.plannedTitle")}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {t("competition.plannedDescription")}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Commissions list */}
                        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
                                        <Wine className="w-5 h-5 text-indigo-500" />
                                        {t("competition.commissions")}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {t("competition.commissionsSubtitle")}
                                    </p>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                                    {t("common.total")}: {initialData.commissions.length}
                                </span>
                            </div>

                            <div className="flex flex-col gap-4">
                                {initialData.commissions.map((comm) => (
                                    <CommissionCard key={comm.id} comm={comm} />
                                ))}

                                {initialData.commissions.length === 0 && (
                                    <div className="text-slate-400 text-sm py-4 text-center">
                                        {t("competition.noCommissions")}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {children}
            </div>
        </main>
        </div>
    )
}