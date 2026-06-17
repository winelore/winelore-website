"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import { FileText, Trophy, Wine, User, Timer, CheckCircle, Calendar, Layers, PlayCircle } from "lucide-react"
import { ProfileMenu } from "@/components/wine-lore-main"
import Link from "next/link"
import { startCompetitionAction, getCompetitionDataAction } from "../actions"

const tabs = [
    { id: "feed", label: "Feed", icon: FileText },
    { id: "competitions", label: "Competitions", icon: Trophy },
    { id: "wines", label: "Wines", icon: Wine },
]

const formatEnumStatus = (status: string | undefined): string => {
    if (!status) return ""
    return status
        .toLowerCase()
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}

const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('en-GB', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(d)
}

function getGoogleCalendarUrl(name: string, plannedStartAt: string, plannedEndAt: string | null): string {
    const start = new Date(plannedStartAt)
    const end = plannedEndAt ? new Date(plannedEndAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

    const formatCalDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    }

    const dates = `${formatCalDate(start)}/${formatCalDate(end)}`
    const text = encodeURIComponent(name)
    const details = encodeURIComponent(`WineLore competition: ${name}`)

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`
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

function HolderAvatar({ auid, className }: { auid: number; className?: string }) {
    const gradient = getAvatarGradient(auid)
    const initials = `${auid}`.slice(-2)
    return (
        <div className={`flex items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white font-bold text-[10px] shadow-sm shrink-0 border border-white/10 ${className}`}>
            <span>{initials}</span>
        </div>
    )
}

function StatusSteps({ status }: { status: string }) {
    const steps = [
        { id: "planned", label: "Competition Planned", description: "Awaiting start" },
        { id: "started", label: "Tasting In Progress", description: "Active evaluation" },
        { id: "completed", label: "Competition Completed", description: "Tasting concluded" }
    ]

    let currentStepIdx = 0
    if (status === "STARTED") {
        currentStepIdx = 1
    } else if (status === "COMPLETED") {
        currentStepIdx = 2
    }

    return (
        <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {steps.map((step, idx) => {
                    const isCompleted = idx < currentStepIdx
                    const isActive = idx === currentStepIdx

                    return (
                        <div key={step.id} className="flex items-center gap-3 flex-1 w-full">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold transition-all duration-350 shrink-0 ${
                                isCompleted 
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10" 
                                    : isActive 
                                        ? "bg-brand-blue border-brand-blue text-white shadow-md shadow-brand-blue/10 ring-4 ring-brand-blue/5 dark:ring-blue-500/10" 
                                        : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 text-zinc-400 dark:text-zinc-500"
                            }`}>
                                {isCompleted ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : (
                                    <span>{idx + 1}</span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <h4 className={`text-xs font-bold ${isActive ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500"}`}>{step.label}</h4>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{step.description}</p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function CommissionCard({ comm }: { comm: Commission }) {
    const [timeStr, setTimeStr] = useState<string>("")

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

                setTimeStr(hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`)
            } else if (comm.status === "COMPLETED" && comm.startedAt && comm.endedAt) {
                const start = new Date(comm.startedAt).getTime()
                const end = new Date(comm.endedAt).getTime()
                const diff = Math.max(0, end - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                setTimeStr(`Lasted ${hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}`)
            } else if (comm.status === "PLANNED" && comm.plannedStartAt) {
                const date = new Date(comm.plannedStartAt)
                const formattedDate = new Intl.DateTimeFormat('en-GB', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }).format(date)
                setTimeStr(`Planned for ${formattedDate}`)
            } else {
                setTimeStr("")
            }
        }

        updateTime()

        if (comm.status === "STARTED") {
            intervalId = setInterval(updateTime, 1000)
        }

        return () => clearInterval(intervalId)
    }, [comm.status, comm.startedAt, comm.endedAt, comm.plannedStartAt])

    let statusStyle = "bg-zinc-50 text-zinc-650 dark:bg-zinc-800/60 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-700/10"
    if (comm.status === "STARTED") {
        statusStyle = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/40 dark:border-emerald-500/10"
    } else if (comm.status === "PLANNED") {
        statusStyle = "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200/40 dark:border-blue-500/10"
    }

    return (
        <Link
            href={`/commission/${comm.id}`}
            className="group flex items-center justify-between gap-4 p-4.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors active:opacity-85"
        >
            <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/5 text-brand-blue dark:text-blue-400 border border-brand-blue/10 group-hover:bg-brand-blue group-hover:text-white transition-colors duration-300">
                    <Wine className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <span className="block text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-brand-blue dark:group-hover:text-blue-400 transition-colors duration-200">
                        {comm.name}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-550 uppercase tracking-wide">
                        Commission Session
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusStyle}`}>
                        {formatEnumStatus(comm.status)}
                    </span>
                    {timeStr && (
                        <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5 text-brand-blue dark:text-blue-500" />
                            {timeStr}
                        </span>
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

export default function CompetitionClientView({ initialData: propInitialData }: { initialData: InitialData }) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("competitions")
    const [localData, setLocalData] = useState<InitialData>(propInitialData)
    const [timeDisplay, setTimeDisplay] = useState<string>("")
    const [currentAuid, setCurrentAuid] = useState<number>(1)
    const [isMutating, setIsMutating] = useState(false)

    const initialData = localData

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
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                const formattedTime = hours > 0
                    ? `${hours}h ${minutes}m`
                    : `${minutes}m`

                setTimeDisplay(`Lasted ${formattedTime}`)

            } else if (initialData.status === "PLANNED" && initialData.plannedStartAt) {
                const date = new Date(initialData.plannedStartAt)
                const formattedDate = new Intl.DateTimeFormat('en-GB', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }).format(date)
                setTimeDisplay(`Planned for ${formattedDate}`)

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

    const isHolder = initialData.holders.includes(currentAuid)

    return (
        <div className="flex h-screen flex-col bg-zinc-50/60 dark:bg-zinc-950">
            {/* Translucent Header */}
            <header className="sticky top-0 z-50 flex shrink-0 items-center border-b border-zinc-200/50 dark:border-zinc-800/40 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md px-6 py-3.5">
                <div className="flex-1 flex items-center justify-start">
                    <Link href="/">
                        <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight cursor-pointer hover:opacity-90 transition-opacity">
                            WineLore
                        </h1>
                    </Link>
                </div>
                
                {/* Segmented Control */}
                <div className="flex-none">
                    <nav className="flex items-center rounded-full bg-zinc-150/70 dark:bg-zinc-800/50 p-0.5 border border-zinc-200/20 dark:border-zinc-700/20">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <Link
                                    key={tab.id}
                                    href="/"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${isActive ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
                                >
                                    <Icon className={`h-3.5 w-3.5 ${isActive ? "text-brand-blue dark:text-blue-450" : ""}`} />
                                    <span>{tab.label}</span>
                                </Link>
                            )
                        })}
                    </nav>
                </div>
                
                <div className="flex-1 flex justify-end">
                    <ProfileMenu username="likespro" />
                </div>
            </header>

            {/* Main Area */}
            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-7xl flex flex-col lg:flex-row items-start gap-6">
                    
                    {/* Left Column: Status, Series, timeline */}
                    <div className="w-full lg:w-[45%] flex flex-col gap-5">
                        <StatusSteps status={initialData.status} />

                        {/* Series Details */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue/5 text-brand-blue dark:text-blue-400 border border-brand-blue/10">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                                    Competition Series
                                </span>
                                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">{initialData.series.name}</p>
                            </div>
                        </div>

                        {/* Timeline and Dates */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none">
                            <h3 className="text-sm font-bold tracking-tight text-zinc-800 dark:text-zinc-200 flex items-center gap-2 mb-4">
                                <Calendar className="w-4 h-4 text-brand-blue dark:text-blue-500" />
                                Timeline Details
                            </h3>
                            <div className="flex flex-col gap-4 relative pl-4 border-l border-zinc-100 dark:border-zinc-800 ml-2.5">
                                {/* Planned Start */}
                                <div className="relative">
                                    <div className="absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full bg-brand-blue border-2 border-white dark:border-zinc-900 shadow-sm" />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Planned Start</span>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                            {formatDateTime(initialData.plannedStartAt)}
                                        </p>
                                        {initialData.status === "PLANNED" && initialData.plannedStartAt && (
                                            <a
                                                href={getGoogleCalendarUrl(initialData.name, initialData.plannedStartAt, initialData.plannedEndAt)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-blue hover:text-brand-blue-hover bg-brand-blue-soft dark:bg-brand-blue-soft-dark border border-brand-blue/10 dark:border-brand-blue/30 rounded-md px-1.5 py-0.5 transition-colors"
                                            >
                                                Add to Calendar
                                            </a>
                                        )}
                                    </div>
                                </div>
                                {/* Planned End */}
                                {initialData.plannedEndAt && (
                                    <div className="relative">
                                        <div className="absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full bg-brand-blue border-2 border-white dark:border-zinc-900 shadow-sm" />
                                        <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Planned End</span>
                                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                                            {formatDateTime(initialData.plannedEndAt)}
                                        </p>
                                    </div>
                                )}
                                {/* Actual Start */}
                                <div className="relative">
                                    <div className={`absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm ${
                                        initialData.startedAt ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'
                                    }`} />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Actual Start</span>
                                    <p className={`text-xs font-semibold mt-0.5 ${initialData.startedAt ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-600'}`}>
                                        {initialData.startedAt ? formatDateTime(initialData.startedAt) : "Not started yet"}
                                    </p>
                                </div>
                                {/* Actual End */}
                                <div className="relative">
                                    <div className={`absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm ${
                                        initialData.endedAt ? 'bg-red-500' : 'bg-zinc-200 dark:bg-zinc-800'
                                    }`} />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Actual End</span>
                                    <p className={`text-xs font-semibold mt-0.5 ${initialData.endedAt ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-600'}`}>
                                        {initialData.endedAt ? formatDateTime(initialData.endedAt) : "Not ended yet"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Info & Commissions List */}
                    <div className="w-full lg:w-[55%] flex flex-col gap-5">
                        {/* Competition Header Card */}
                        <div className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none">
                            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand-blue/5 dark:bg-blue-500/5 blur-3xl pointer-events-none" />

                            <div className="flex items-start gap-4 mb-5">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-blue/5 text-brand-blue dark:text-blue-400 border border-brand-blue/10 shadow-inner">
                                    <Trophy className="h-7 w-7" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                                        Competition Panel
                                    </span>
                                    <h2 className="text-xl md:text-2xl font-extrabold text-zinc-800 dark:text-zinc-200 tracking-tight mt-0.5 truncate">
                                        {initialData.name}
                                    </h2>
                                    <p className="text-sm mt-2 flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            initialData.status === "STARTED" 
                                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/40" 
                                                : initialData.status === "COMPLETED"
                                                    ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400 border border-zinc-200/50"
                                                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/40"
                                        }`}>
                                            {initialData.status === "STARTED" && (
                                                <span className="relative flex h-2 w-2 mr-1">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                            )}
                                            {formatEnumStatus(initialData.status)}
                                        </span>
                                        {timeDisplay && (
                                            <>
                                                <span className="text-zinc-200 dark:text-zinc-800">|</span>
                                                <span className="text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-1 text-xs">
                                                    <Timer className="w-3.5 h-3.5 text-brand-blue dark:text-blue-500" />
                                                    {timeDisplay}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-5">
                                <h4 className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                                    Competition Holders
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {initialData.holders.length > 0 ? (
                                        initialData.holders.map((holderAuid) => (
                                            <div key={holderAuid} className="flex items-center gap-2 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-800/30 px-3 py-1 hover:border-brand-blue/20 dark:hover:border-blue-500/20 transition-colors duration-250">
                                                <HolderAvatar auid={holderAuid} className="h-5 w-5" />
                                                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">AUID: {holderAuid}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-xs text-zinc-400 dark:text-zinc-550">No holders listed</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {initialData.status === "PLANNED" && (
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">
                                    Actions & Controls
                                </h3>
                                <div className="flex flex-col gap-4">
                                    {isHolder ? (
                                        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50 flex-wrap sm:flex-nowrap">
                                            <div className="max-w-full sm:max-w-[65%]">
                                                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                                    Start Competition
                                                </h4>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                    As a competition holder, you can start the tasting process once commissions are prepared.
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleStartCompetition}
                                                disabled={isMutating}
                                                className="group flex items-center gap-2 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white shadow-md shadow-brand-blue/15 px-5 py-2.5 text-xs font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
                                            >
                                                {isMutating ? (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                                ) : (
                                                    <PlayCircle className="h-4 w-4" />
                                                )}
                                                <span>Start Competition</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800/40">
                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-pulse" />
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                                    Competition Planned
                                                </h4>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                    This competition has not started yet. Awaiting start by the competition holders.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Commissions list using Grouped List Style */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-base font-bold tracking-tight text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                                        <Wine className="w-4.5 h-4.5 text-brand-blue dark:text-blue-500" />
                                        Commissions
                                    </h3>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        Commissions associated with this competition
                                    </p>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400">
                                    {initialData.commissions.length} Total
                                </span>
                            </div>

                            <div className="rounded-xl border border-zinc-100 dark:border-zinc-800/80 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
                                {initialData.commissions.map((comm) => (
                                    <CommissionCard key={comm.id} comm={comm} />
                                ))}

                                {initialData.commissions.length === 0 && (
                                    <div className="text-zinc-400 dark:text-zinc-500 text-xs py-6 text-center">
                                        No commissions found for this competition.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                </div>
            </main>
        </div>
    )
}