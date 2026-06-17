"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FileText, Trophy, Wine, User, Layers, PlayCircle, StopCircle, Crown, GraduationCap, CheckCircle, Users, Timer, Check, Calendar } from "lucide-react"
import { ProfileMenu } from "@/components/wine-lore-main"
import { 
    markMemberReadyAction, 
    markMemberNotReadyAction, 
    startCommissionAction, 
    completeCommissionAction,
    getCommissionDataAction
} from "../actions"

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

function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('en-GB', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date)
}

function getGoogleCalendarUrl(name: string, plannedStartAt: string, plannedEndAt: string | null): string {
    const start = new Date(plannedStartAt)
    const end = plannedEndAt ? new Date(plannedEndAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

    const formatToGCal = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, "")
    }

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(name)}&dates=${formatToGCal(start)}/${formatToGCal(end)}`
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

function MemberAvatar({ auid, role, className }: { auid: number[]; role: string; className?: string }) {
    const primaryAuid = auid[0] || 0
    const gradient = getAvatarGradient(primaryAuid)
    const initials = primaryAuid ? `${primaryAuid}`.slice(-2) : "?"
    
    return (
        <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white font-bold text-[11px] shadow-sm shrink-0 border border-white/10 ${className}`}>
            <span>{initials}</span>
            {role === "HEAD" && (
                <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-background shadow-xs">
                    <Crown className="w-2.5 h-2.5 text-white" />
                </div>
            )}
        </div>
    )
}

function StatusSteps({ status }: { status: string }) {
    const steps = [
        { id: "readying", label: "Readying Members", description: "Waiting for readiness" },
        { id: "tasting", label: "Tasting In Progress", description: "Evaluating wines" },
        { id: "completed", label: "Completed", description: "Results ready" }
    ]

    let currentStepIdx = 0
    if (status === "STARTED") {
        currentStepIdx = 1
    } else if (status === "COMPLETED") {
        currentStepIdx = 2
    }

    return (
        <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none mb-4">
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

interface Member {
    id: string;
    auid: number[];
    role: "HEAD" | "EXPERT" | "TRAINEE_EXPERT";
    isReady: boolean;
}

interface InitialData {
    id: string;
    name: string;
    status: string;
    plannedStartAt: string | null;
    plannedEndAt: string | null;
    startedAt: string | null;
    endedAt: string | null;
    candidateCount: number;
    competition: {
        id: string;
        name: string;
        holders: number[];
    };
    members: Member[];
}

export default function CommissionClientView({ initialData: propInitialData }: { initialData: InitialData }) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("competitions")
    const [localData, setLocalData] = useState<InitialData>(propInitialData)
    const [localMembers, setLocalMembers] = useState<Member[]>(propInitialData.members)
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
    const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
    const [isMutating, setIsMutating] = useState(false)
    const [timeDisplay, setTimeDisplay] = useState<string>("")
    const [currentAuid, setCurrentAuid] = useState<number>(1)

    const initialData = localData

    useEffect(() => {
        setLocalData(propInitialData)
        setLocalMembers(propInitialData.members)
    }, [propInitialData])

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) {
            setCurrentAuid(parseInt(cookieAuid, 10))
        }
    }, [])

    useEffect(() => {
        const me = localMembers.find(m => m.auid.includes(currentAuid))
        if (me) {
            setCurrentUserRole(me.role)
            setCurrentMemberId(me.id)
        } else {
            setCurrentUserRole(null)
            setCurrentMemberId(null)
        }
    }, [localMembers, currentAuid])

    const creatorNames = initialData.competition.holders.length > 0
        ? initialData.competition.holders.join(", ")
        : "Unknown Creator"

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

    useEffect(() => {
        const pollInterval = setInterval(async () => {
            try {
                const updated = await getCommissionDataAction(localData.id)
                if (updated) {
                    setLocalData(updated)
                    setLocalMembers(updated.members)
                }
            } catch (err) {
                console.error("Failed to poll commission data:", err)
            }
        }, 3000)

        return () => clearInterval(pollInterval)
    }, [localData.id])

    const handleToggleReady = async (shouldBeReady: boolean) => {
        if (!currentMemberId || isMutating) return
        setIsMutating(true)

        try {
            let updatedMembers;
            if (shouldBeReady) {
                const response = await markMemberReadyAction(initialData.id, currentMemberId)
                updatedMembers = response.markCommissionMemberReady?.members
            } else {
                const response = await markMemberNotReadyAction(initialData.id, currentMemberId)
                updatedMembers = response.markCommissionMemberNotReady?.members
            }

            if (updatedMembers) {
                setLocalMembers(prev =>
                    prev.map(m => {
                        const match = updatedMembers.find((u: any) => u.id === m.id)
                        return match ? { ...m, isReady: match.isReady } : m
                    })
                )
            }
        } catch (err) {
            console.error("Failed to update readiness status:", err)
        } finally {
            setIsMutating(false)
        }
    }

    const handleStartCommission = async () => {
        if (isMutating) return
        setIsMutating(true)
        try {
            await startCommissionAction(initialData.id)
            router.refresh()
        } catch (err) {
            console.error("Failed to start commission:", err)
        } finally {
            setIsMutating(false)
        }
    }

    const handleCompleteCommission = async () => {
        if (isMutating) return
        setIsMutating(true)
        try {
            await completeCommissionAction(initialData.id)
            router.refresh()
        } catch (err) {
            console.error("Failed to complete commission:", err)
        } finally {
            setIsMutating(false)
        }
    }

    const isEveryoneReady = localMembers.every(m => m.isReady)
    const myStatus = localMembers.find(m => m.auid.includes(currentAuid))
    const amIReady = myStatus?.isReady || false
    const isPreStart = initialData.status !== "STARTED" && initialData.status !== "COMPLETED"
    const nonReadyCount = localMembers.filter(m => !m.isReady).length

    const sortedMembers = [...localMembers].sort((a, b) => {
        const roleOrder = { HEAD: 1, EXPERT: 2, TRAINEE_EXPERT: 3 }
        return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99)
    })

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
                                    className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${isActive
                                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                                    }`}
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

                    {/* Left Column: Stepper and Tasting Panel */}
                    <div className="w-full lg:w-[45%] flex flex-col gap-5">
                        <StatusSteps status={initialData.status} />

                        {/* Tasting Panel: iOS Grouped List layout */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-base font-bold tracking-tight text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                                        <Users className="w-4.5 h-4.5 text-brand-blue dark:text-blue-500" />
                                        Tasting Panel
                                    </h3>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        Members evaluating this competition
                                    </p>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                                    {localMembers.filter(m => m.isReady).length} / {localMembers.length} Ready
                                </span>
                            </div>

                            <div className="rounded-xl border border-zinc-100 dark:border-zinc-800/80 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
                                {sortedMembers.map((p) => {
                                    const isMe = p.auid.includes(currentAuid)
                                    return (
                                        <div key={p.id} className={`flex items-center gap-3.5 p-4 transition-colors ${
                                            isMe 
                                                ? "bg-brand-blue-soft/20 dark:bg-brand-blue-soft-dark/15" 
                                                : "bg-white dark:bg-zinc-900 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40"
                                        }`}>
                                            <MemberAvatar auid={p.auid} role={p.role} className="h-9 w-9 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                                                        <span>AUID: {p.auid.join(", ")}</span>
                                                        {isMe && (
                                                            <span className="text-[8px] bg-brand-blue text-white font-bold px-1.5 py-0.2 rounded-xs uppercase tracking-wider">
                                                                You
                                                            </span>
                                                        )}
                                                    </p>
                                                    <div className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                                                        p.isReady ? "text-emerald-500" : "text-zinc-400 dark:text-zinc-500"
                                                    }`}>
                                                        {p.isReady ? (
                                                            <>
                                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                                <span>Ready</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-3 h-3 rounded-full border border-dashed border-zinc-300 dark:border-zinc-600 animate-spin" style={{ animationDuration: '3s' }} />
                                                                <span>Waiting</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center mt-1.5">
                                                    {p.role === "HEAD" && (
                                                        <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                            <Crown className="w-2.5 h-2.5"/> Head
                                                        </span>
                                                    )}
                                                    {p.role === "TRAINEE_EXPERT" && (
                                                        <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                            <GraduationCap className="w-2.5 h-2.5"/> Trainee
                                                        </span>
                                                    )}
                                                    {p.role === "EXPERT" && (
                                                        <span className="bg-zinc-50 text-zinc-650 dark:bg-zinc-800/80 dark:text-zinc-350 border border-zinc-200/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                            Expert
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Actions & Session Details */}
                    <div className="w-full lg:w-[55%] flex flex-col gap-5">
                        {/* Commission Header Card */}
                        <div className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none">
                            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand-blue/5 dark:bg-blue-500/5 blur-3xl pointer-events-none" />

                            <div className="flex items-start gap-4 mb-5">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-blue/5 text-brand-blue dark:text-blue-400 border border-brand-blue/10 shadow-inner">
                                    <Wine className="h-7 w-7" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                                        Commission Session
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
                                                <span className="text-zinc-550 dark:text-zinc-450 font-semibold flex items-center gap-1 text-xs">
                                                    <Timer className="w-3.5 h-3.5 text-brand-blue dark:text-blue-500" />
                                                    {timeDisplay}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800/60 pt-5">
                                <div className="flex items-start gap-3 bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/60 rounded-xl p-3.5 hover:border-brand-blue/10 transition-colors">
                                    <Trophy className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                                            Competition
                                        </h4>
                                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
                                            {initialData.competition.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/60 rounded-xl p-3.5 hover:border-brand-blue/10 transition-colors">
                                    <User className="h-5 w-5 text-brand-blue dark:text-blue-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                                            Holders
                                        </h4>
                                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate" title={creatorNames}>
                                            {creatorNames}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-brand-blue-soft/40 dark:bg-brand-blue-soft-dark/20 border border-brand-blue/10 dark:border-brand-blue/30 rounded-xl p-3.5 mt-4">
                                <Layers className="h-5 w-5 text-brand-blue dark:text-blue-500 shrink-0" />
                                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                                    Featuring <strong className="text-zinc-800 dark:text-zinc-200 font-bold">{initialData.candidateCount}</strong> selected beverages for tasting
                                </span>
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
                                        {initialData.endedAt ? formatDateTime(initialData.endedAt) : "Not completed yet"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions & Controls */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">
                                Actions & Controls
                            </h3>
                            
                            <div className="flex flex-col gap-5">
                                {isPreStart && currentUserRole && (
                                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50 flex-wrap sm:flex-nowrap">
                                        <div className="max-w-full sm:max-w-[65%]">
                                            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                                Your Readiness
                                            </h4>
                                            <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5">
                                                Mark yourself as ready when you are prepared to start tasting
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleToggleReady(!amIReady)}
                                            disabled={isMutating}
                                            className={`group flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm cursor-pointer shrink-0 ${
                                                amIReady
                                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                                    : "bg-brand-blue hover:bg-brand-blue-hover text-white shadow-lg shadow-brand-blue/15"
                                            }`}
                                        >
                                            {isMutating ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                            ) : amIReady ? (
                                                <>
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span>Ready!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <PlayCircle className="h-4 w-4" />
                                                    <span>Mark Ready</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {currentUserRole === "HEAD" && (
                                    <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-5">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                                            Head of Commission Tools
                                        </h4>
                                        
                                        {isPreStart && (
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <button
                                                        onClick={handleStartCommission}
                                                        disabled={!isEveryoneReady || isMutating}
                                                        className={`group flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                                                            isEveryoneReady 
                                                                ? "bg-brand-blue hover:bg-brand-blue-hover text-white shadow-md shadow-brand-blue/15" 
                                                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-550 border border-zinc-200/50 dark:border-zinc-700/50"
                                                        }`}
                                                    >
                                                        {isMutating ? (
                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                                        ) : (
                                                            <PlayCircle className="h-4 w-4" />
                                                        )}
                                                        <span>Start Commission</span>
                                                    </button>
                                                    
                                                    {!isEveryoneReady && (
                                                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium animate-fade-in-slide">
                                                            Waiting for {nonReadyCount} member{nonReadyCount > 1 ? 's' : ''} to be ready.
                                                        </span>
                                                    )}
                                                    {isEveryoneReady && (
                                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse">
                                                            <Check className="w-3.5 h-3.5 shrink-0" />
                                                            Everyone is ready! Start session.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {initialData.status === "STARTED" && (
                                            <div className="flex flex-col gap-2.5">
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                                                    As the Head of Commission, you can end the evaluation once all members have finished their tasting assessments.
                                                </p>
                                                <button
                                                    onClick={handleCompleteCommission}
                                                    disabled={isMutating}
                                                    className="group flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-red-600/10 transition-all duration-300 transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none w-fit cursor-pointer animate-fade-in-slide"
                                                >
                                                    {isMutating ? (
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                                    ) : (
                                                        <StopCircle className="h-4 w-4" />
                                                    )}
                                                    <span>Complete Commission</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {initialData.status === "COMPLETED" && (
                                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-500/10 flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-450 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                                                Commission Session Completed
                                            </h4>
                                            <p className="text-xs text-emerald-600/90 dark:text-emerald-400/80 mt-1">
                                                All tasting sessions have concluded. The evaluation data has been locked and archived for scoring.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {initialData.status === "STARTED" && currentUserRole !== "HEAD" && (
                                    <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/15 border border-blue-100/50 dark:border-blue-900/20 flex items-start gap-3">
                                        <div className="relative flex h-3 w-3 mt-1.5 shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-550"></span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400">
                                                Tasting is Active
                                            </h4>
                                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                                The commission has started. Please proceed with assessing your assigned wines and submitting scores.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {isPreStart && currentUserRole !== "HEAD" && (
                                    <div className="p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800/40 flex items-start gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse mt-1.5 shrink-0" />
                                        <div>
                                            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                                Waiting for Session Start
                                            </h4>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                Once all members are ready, the Head of Commission will initiate the tasting session.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <style>{`
                            @keyframes fadeInSlide {
                                from {
                                    opacity: 0;
                                    transform: translateY(4px);
                                }
                                to {
                                    opacity: 1;
                                    transform: translateY(0);
                                }
                            }
                            .animate-fade-in-slide {
                                animation: fadeInSlide 0.25s ease-out forwards;
                            }
                        `}</style>
                    </div>

                </div>
            </main>
        </div>
    )
}