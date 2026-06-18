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
    return (
        <div className={`relative flex items-center justify-center rounded-full bg-indigo-50/80 dark:bg-indigo-950/40 text-[#5c60f5] dark:text-indigo-400 shrink-0 border border-transparent ${className}`}>
            <User className="h-5 w-5" />
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
        <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-none mb-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {steps.map((step, idx) => {
                    const isCompleted = idx < currentStepIdx
                    const isActive = idx === currentStepIdx
                    return (
                        <div key={step.id} className="flex items-center gap-3">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                                isCompleted 
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : isActive
                                        ? "bg-brand-blue border-brand-blue text-white"
                                        : "border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
                            }`}>
                                {isCompleted ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <span>{idx + 1}</span>
                                )}
                            </div>
                            <div>
                                <h4 className={`text-xs font-bold ${isActive ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"}`}>
                                    {step.label}
                                </h4>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{step.description}</p>
                            </div>
                            {idx < steps.length - 1 && (
                                <div className="hidden sm:block w-8 h-[1px] bg-zinc-100 dark:bg-zinc-800" />
                            )}
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
    const amIReady = localMembers.find(m => m.auid.includes(currentAuid))?.isReady || false
    const isPreStart = initialData.status !== "STARTED" && initialData.status !== "COMPLETED"
    const nonReadyCount = localMembers.filter(m => !m.isReady).length

    const sortedMembers = [...localMembers].sort((a, b) => {
        const roleOrder = { HEAD: 1, EXPERT: 2, TRAINEE_EXPERT: 3 }
        return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99)
    })

    return (
        <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 p-4 md:p-6 lg:p-8 flex items-center justify-center">
            {/* View Box Container */}
            <div className="w-full max-w-7xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.015)] dark:shadow-none p-6 md:p-8 flex flex-col gap-6">
                
                {/* Header (Inside View Box) */}
                <header className="flex shrink-0 items-center justify-between pb-2">
                    <div className="flex-1 flex items-center justify-start">
                        <Link href="/">
                            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight cursor-pointer hover:opacity-90 transition-opacity">
                                WineLore
                            </h1>
                        </Link>
                    </div>

                    {/* Segmented Control */}
                    <div className="flex-none">
                        <nav className="flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800/80 p-0.5 border border-zinc-200/20 dark:border-zinc-700/20">
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

                {/* Stepper (Preserved Feature) */}
                <div className="w-full">
                    <StatusSteps status={initialData.status} />
                </div>

                {/* Main Split Area */}
                <div className="flex flex-col lg:flex-row items-start gap-8">
                    
                    {/* Left Column: Member Grid (Real Data) */}
                    <div className="w-full lg:w-[60%] grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sortedMembers.map((p) => {
                            const isMe = p.auid.includes(currentAuid)
                            return (
                                <div 
                                    key={p.id} 
                                    className={`flex items-center gap-3.5 p-4.5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] dark:shadow-none hover:shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-all ${
                                        isMe 
                                            ? "ring-1 ring-brand-blue/20 bg-brand-blue-soft/5 dark:bg-brand-blue-soft-dark/5" 
                                            : ""
                                    }`}
                                >
                                    <MemberAvatar auid={p.auid} role={p.role} className="h-10 w-10 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                                {isMe ? "likespro" : `AUID: ${p.auid.join(", ")}`}
                                            </span>
                                            {isMe && (
                                                <span className="bg-brand-blue text-white text-[8px] font-bold px-1.5 py-0.2 rounded-xs uppercase tracking-wider">
                                                    You
                                                </span>
                                            )}
                                            {p.role === "HEAD" && (
                                                <span className="bg-[#f0e3ff] text-[#8e45e8] dark:bg-purple-950/50 dark:text-purple-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                                                    Head
                                                </span>
                                            )}
                                            {p.role === "TRAINEE_EXPERT" && (
                                                <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/40 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                                                    Trainee
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold">
                                            <span className={p.isReady ? "text-emerald-500" : "text-amber-500"}>
                                                {p.isReady ? "Ready" : "Not Ready"}
                                            </span>
                                            <span className="text-zinc-300 dark:text-zinc-700">|</span>
                                            <span className="text-emerald-500">On the page</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Right Column: Stacked Cards */}
                    <div className="w-full lg:w-[40%] flex flex-col gap-5">
                        
                        {/* 1. Main Session Details Card (Mockup Styling) */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col gap-4">
                            <div className="flex items-start gap-4">
                                <div className="h-16 w-16 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-[#5c60f5] dark:text-indigo-400 flex items-center justify-center shrink-0 border border-transparent">
                                    <User className="h-8 w-8" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight">
                                        {initialData.name}
                                    </h2>
                                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                                        <span className={initialData.status === "STARTED" ? "text-emerald-500" : "text-zinc-500"}>
                                            {initialData.status === "STARTED" ? "In Progress" : formatEnumStatus(initialData.status)}
                                        </span>
                                        {timeDisplay && (
                                            <>
                                                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                                                <span>{timeDisplay}</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-2">
                                <User className="w-4 h-4 text-purple-500" />
                                <span className="truncate" title={initialData.competition.name}>
                                    {initialData.competition.name}
                                </span>
                                <span className="text-zinc-300 dark:text-zinc-700 font-normal">|</span>
                                <span className="text-zinc-500 font-normal">by</span>
                                <User className="w-4 h-4 text-purple-500" />
                                <span>{creatorNames}</span>
                            </div>

                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                Featuring {initialData.candidateCount} beverage{initialData.candidateCount !== 1 ? 's' : ''}
                            </p>

                            {/* Active Action Button */}
                            {isPreStart && currentUserRole && (
                                <div className="flex items-center gap-4 mt-2">
                                    <button
                                        onClick={() => handleToggleReady(!amIReady)}
                                        disabled={isMutating}
                                        className={`group flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all duration-300 transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                                            amIReady
                                                ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10"
                                                : "bg-brand-blue hover:bg-brand-blue-hover shadow-brand-blue/15"
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
                                            <span>I'm Ready</span>
                                        )}
                                    </button>
                                    
                                    <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                                        {nonReadyCount} Non-Ready member{nonReadyCount !== 1 ? 's' : ''} left
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 2. Timeline Details & Google Calendar (Preserved Feature) */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)] dark:shadow-none">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-405 dark:text-zinc-500 mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-brand-blue dark:text-blue-500" />
                                Timeline Details
                            </h3>
                            <div className="flex flex-col gap-4 relative pl-4 border-l border-zinc-100 dark:border-zinc-800 ml-2.5">
                                {/* Planned Start */}
                                <div className="relative">
                                    <div className="absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full bg-brand-blue border-2 border-white dark:border-zinc-900 shadow-sm" />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Planned Start</span>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                        <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-200">
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
                                        <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-200 mt-0.5">
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
                                    <p className={`text-xs font-semibold mt-0.5 ${initialData.startedAt ? 'text-zinc-800' : 'text-zinc-400'}`}>
                                        {initialData.startedAt ? formatDateTime(initialData.startedAt) : "Not started yet"}
                                    </p>
                                </div>
                                {/* Actual End */}
                                <div className="relative">
                                    <div className={`absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm ${
                                        initialData.endedAt ? 'bg-red-500' : 'bg-zinc-200 dark:bg-zinc-800'
                                    }`} />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Actual End</span>
                                    <p className={`text-xs font-semibold mt-0.5 ${initialData.endedAt ? 'text-zinc-800' : 'text-zinc-400'}`}>
                                        {initialData.endedAt ? formatDateTime(initialData.endedAt) : "Not completed yet"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 3. Session Controls & Banners (Preserved Feature) */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col gap-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                Session Controls
                            </h3>
                            
                            <div className="flex flex-col gap-4">
                                {currentUserRole === "HEAD" && (
                                    <div className="flex flex-col gap-3">
                                        {isPreStart && (
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={handleStartCommission}
                                                    disabled={!isEveryoneReady || isMutating}
                                                    className={`group flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer w-full ${
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
                                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium text-center animate-fade-in-slide">
                                                        Waiting for all members to be ready.
                                                    </span>
                                                )}
                                                {isEveryoneReady && (
                                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1.5 animate-pulse">
                                                        <Check className="w-3.5 h-3.5 shrink-0" />
                                                        Everyone is ready!
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {initialData.status === "STARTED" && (
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={handleCompleteCommission}
                                                    disabled={isMutating}
                                                    className="group flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-red-600/10 transition-all duration-300 transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none w-full cursor-pointer"
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
                                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-500/10 flex items-start gap-2.5">
                                        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-450 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                                                Completed
                                            </h4>
                                            <p className="text-[10px] text-emerald-600/90 dark:text-emerald-400/80 mt-0.5">
                                                Tasting finished. Results archived.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {initialData.status === "STARTED" && currentUserRole !== "HEAD" && (
                                    <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/15 border border-blue-100/50 dark:border-blue-900/20 flex items-start gap-2.5">
                                        <div className="relative flex h-3 w-3 mt-1 shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400">
                                                Tasting is Active
                                            </h4>
                                            <p className="text-[10px] text-zinc-650 dark:text-zinc-400 mt-0.5">
                                                Assess your assigned wines and submit scores.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {isPreStart && currentUserRole !== "HEAD" && (
                                    <div className="p-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800/40 flex items-start gap-2.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse mt-1 shrink-0" />
                                        <div>
                                            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                                Waiting for Start
                                            </h4>
                                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                Waiting for the Head of Commission to start tasting.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

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
    )
}