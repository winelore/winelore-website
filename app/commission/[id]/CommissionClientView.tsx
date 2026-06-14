"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import { FileText, Trophy, Wine, User, Layers, PlayCircle, StopCircle, Crown, GraduationCap, CheckCircle, XCircle, Users, Timer, Check } from "lucide-react"
import { ProfileMenu } from "@/components/wine-lore-main"
import { 
    markMemberReadyAction, 
    markMemberNotReadyAction, 
    startCommissionAction, 
    completeCommissionAction 
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
        { id: "readying", label: "Readying", description: "Waiting for readiness" },
        { id: "tasting", label: "Tasting", description: "Evaluating wines" },
        { id: "completed", label: "Completed", description: "Results ready" }
    ]

    let currentStepIdx = 0
    if (status === "STARTED") {
        currentStepIdx = 1
    } else if (status === "COMPLETED") {
        currentStepIdx = 2
    }

    return (
        <div className="w-full bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl p-4 shadow-xs">
            <div className="flex flex-row items-center justify-between gap-1">
                {steps.map((step, idx) => {
                    const isCompleted = idx < currentStepIdx
                    const isActive = idx === currentStepIdx

                    return (
                        <React.Fragment key={step.id}>
                            <div className="flex items-center gap-2">
                                <div className={`flex items-center justify-center w-5 h-5 rounded-full border text-[10px] font-bold transition-all duration-300 ${
                                    isCompleted 
                                        ? "bg-[#34C759] border-[#34C759] text-white" 
                                        : isActive 
                                            ? "bg-[#007AFF] border-[#007AFF] text-white shadow-xs" 
                                            : "bg-transparent border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-650"
                                }`}>
                                    {isCompleted ? (
                                        <Check className="w-3 h-3 stroke-[2.5]" />
                                    ) : (
                                        <span>{idx + 1}</span>
                                    )}
                                </div>
                                <div className="text-left">
                                    <h4 className={`text-xs font-semibold tracking-tight ${
                                        isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
                                    }`}>{step.label}</h4>
                                </div>
                            </div>
                            {idx < steps.length - 1 && (
                                <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800 mx-2 relative overflow-hidden">
                                    {isCompleted && <div className="absolute inset-0 bg-[#34C759]" />}
                                    {isActive && <div className="absolute inset-0 bg-gradient-to-r from-[#34C759] to-[#007AFF]/30 animate-pulse" />}
                                </div>
                            )}
                        </React.Fragment>
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

export default function CommissionClientView({ initialData }: { initialData: InitialData }) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("competitions")
    const [localMembers, setLocalMembers] = useState<Member[]>(initialData.members)
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
    const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
    const [isMutating, setIsMutating] = useState(false)
    const [timeDisplay, setTimeDisplay] = useState<string>("")
    const [currentAuid, setCurrentAuid] = useState<number>(1)

    useEffect(() => {
        setLocalMembers(initialData.members)
    }, [initialData.members])

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
                    ? `${hours}h ${minutes}m ${seconds}s`
                    : `${minutes}m ${seconds}s`

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
        const pollInterval = setInterval(() => {
            router.refresh()
        }, 3 * 60 * 1000)

        return () => clearInterval(pollInterval)
    }, [router])

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

    return (
        <div className="flex h-screen flex-col bg-[#F2F2F7] dark:bg-black text-zinc-900 dark:text-zinc-100">
            {/* Header */}
            <header className="flex shrink-0 items-center border-b border-zinc-200/50 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-6 py-4">
                <div className="flex-1 flex items-center justify-start">
                    <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        WineLore
                    </h1>
                </div>

                <div className="flex-none">
                    <nav className="flex items-center rounded-full border border-zinc-200/50 dark:border-zinc-800/60 bg-zinc-200/40 dark:bg-zinc-900/60 p-0.5">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${isActive
                                        ? "bg-white dark:bg-zinc-850 text-zinc-900 dark:text-white shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                    }`}
                                >
                                    <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#007AFF]" : ""}`} />
                                    <span>{tab.label}</span>
                                </button>
                            )
                        })}
                    </nav>
                </div>

                <div className="flex-1 flex justify-end">
                    <ProfileMenu username="likespro" />
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-7xl flex flex-col lg:flex-row items-start gap-8">

                    {/* Left Column: Tasting Panel / Participants List */}
                    <div className="w-full lg:w-[45%] flex flex-col gap-5">
                        <StatusSteps status={initialData.status} />

                        <div>
                            <div className="flex items-center justify-between px-1 mb-2">
                                <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                                    Tasting Panel
                                </h3>
                                <span className="text-xs font-medium text-zinc-550 dark:text-zinc-400">
                                    {localMembers.filter(m => m.isReady).length} of {localMembers.length} Ready
                                </span>
                            </div>

                            <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/40 dark:border-zinc-850/40 rounded-2xl shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden">
                                {localMembers.map((p) => {
                                    const isMe = p.auid.includes(currentAuid)
                                    return (
                                        <div key={p.id} className={`flex items-center gap-3 p-4 transition-colors duration-200 ${
                                            isMe 
                                                ? "bg-[#007AFF]/5 dark:bg-[#007AFF]/8" 
                                                : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                                        }`}>
                                            <MemberAvatar auid={p.auid} role={p.role} className="h-9 w-9 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                                                        <span>AUID: {p.auid.join(", ")}</span>
                                                        {isMe && (
                                                            <span className="text-[9px] bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#007AFF]/20 dark:text-blue-400 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                                                                You
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between mt-1.5">
                                                    <div className="flex items-center">
                                                        {p.role === "HEAD" && (
                                                            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                                                <Crown className="w-3 h-3"/> Head
                                                            </span>
                                                        )}
                                                        {p.role === "TRAINEE_EXPERT" && (
                                                            <span className="bg-[#34C759]/10 text-[#34C759] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                                                <GraduationCap className="w-3 h-3"/> Trainee
                                                            </span>
                                                        )}
                                                        {p.role === "EXPERT" && (
                                                            <span className="bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                                                Expert
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                                        p.isReady ? "text-[#34C759]" : "text-zinc-400 dark:text-zinc-500"
                                                    }`}>
                                                        {p.isReady ? (
                                                            <>
                                                                <CheckCircle className="w-3.5 h-3.5 fill-[#34C759]/10 stroke-[#34C759]" />
                                                                <span>Ready</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-3 h-3 rounded-full border-1.5 border-dashed border-zinc-400 dark:border-zinc-500 animate-spin" style={{ animationDuration: '3s' }} />
                                                                <span>Waiting</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Commission Details & Controls */}
                    <div className="w-full lg:w-[55%] flex flex-col gap-6">
                        {/* Details Card */}
                        <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/40 dark:border-zinc-850/40 rounded-2xl p-6 shadow-xs">
                            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

                            <div className="flex items-start gap-4 mb-6">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 text-[#007AFF] border border-zinc-200/50 dark:border-zinc-800/50 shadow-inner">
                                    <Wine className="h-8 w-8 text-[#007AFF]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 dark:text-zinc-500">
                                        Commission Session
                                    </span>
                                    <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight mt-0.5 truncate">
                                        {initialData.name}
                                    </h2>
                                    <p className="text-sm mt-1.5 flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            initialData.status === "STARTED" 
                                                ? "bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20" 
                                                : initialData.status === "COMPLETED"
                                                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200/50 dark:border-zinc-700/50"
                                                    : "bg-amber-500/10 text-amber-550 border border-amber-550/20"
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
                                                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                                                <span className="text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1 text-xs">
                                                    <Timer className="w-3.5 h-3.5" />
                                                    {timeDisplay}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-6">
                                <div className="flex items-start gap-3 bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200/20 dark:border-zinc-800/30 rounded-xl p-4">
                                    <Trophy className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500">
                                            Competition
                                        </h4>
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">
                                            {initialData.competition.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200/20 dark:border-zinc-800/30 rounded-xl p-4">
                                    <User className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500">
                                            Holders
                                        </h4>
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate" title={creatorNames}>
                                            {creatorNames}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-[#007AFF]/5 border border-[#007AFF]/10 rounded-xl p-4 mt-4">
                                <Layers className="h-5 w-5 text-[#007AFF]/70 shrink-0" />
                                <span className="text-sm text-zinc-650 dark:text-zinc-400 font-medium">
                                    Featuring <strong className="text-zinc-900 dark:text-white font-bold">{initialData.candidateCount}</strong> selected beverages for tasting
                                </span>
                            </div>
                        </div>

                        {/* Actions Card */}
                        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/40 dark:border-zinc-850/40 rounded-2xl p-6 shadow-xs">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">
                                Actions & Controls
                            </h3>
                            
                            <div className="flex flex-col gap-6">
                                {isPreStart && currentUserRole && (
                                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200/20 dark:border-zinc-800/30 flex-wrap sm:flex-nowrap">
                                        <div className="max-w-full sm:max-w-[65%]">
                                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                Your Readiness
                                            </h4>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                Mark yourself as ready when you are prepared to start tasting
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleToggleReady(!amIReady)}
                                            disabled={isMutating}
                                            className={`group flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shrink-0 ${
                                                amIReady
                                                    ? "bg-[#34C759] hover:bg-[#34C759]/90 text-white shadow-xs"
                                                    : "bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/15"
                                            }`}
                                        >
                                            {isMutating ? (
                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                            ) : amIReady ? (
                                                <>
                                                    <CheckCircle className="h-3.5 w-3.5 stroke-[2.5]" />
                                                    <span>Ready!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <PlayCircle className="h-3.5 w-3.5" />
                                                    <span>Mark Ready</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* Admin Action section */}
                                {currentUserRole === "HEAD" && (
                                    <div className="border-t border-zinc-200/50 dark:border-zinc-800/40 pt-6">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                                            Head of Commission Tools
                                        </h4>
                                        
                                        {isPreStart && (
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <button
                                                        onClick={handleStartCommission}
                                                        disabled={!isEveryoneReady || isMutating}
                                                        className={`group flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${
                                                            isEveryoneReady 
                                                                ? "bg-[#007AFF] hover:bg-[#007AFF]/90 text-white shadow-xs" 
                                                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-550 border border-zinc-200/50 dark:border-zinc-800/40"
                                                        }`}
                                                    >
                                                        {isMutating ? (
                                                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                                        ) : (
                                                            <PlayCircle className="h-4 w-4" />
                                                        )}
                                                        <span>Start Commission</span>
                                                    </button>
                                                    
                                                    {!isEveryoneReady && (
                                                        <span className="text-xs text-zinc-450 dark:text-zinc-500 font-medium animate-fade-in-slide">
                                                            Waiting for {nonReadyCount} member{nonReadyCount > 1 ? 's' : ''} to be ready.
                                                        </span>
                                                    )}
                                                    {isEveryoneReady && (
                                                        <span className="text-xs text-[#34C759] font-semibold flex items-center gap-1.5 animate-pulse">
                                                            <Check className="w-4 h-4 shrink-0 stroke-[2.5]" />
                                                            Everyone is ready! Start session.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {initialData.status === "STARTED" && (
                                            <div className="flex flex-col gap-2.5">
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                                    As the Head of Commission, you can end the evaluation once all members have finished their tasting assessments.
                                                </p>
                                                <button
                                                    onClick={handleCompleteCommission}
                                                    disabled={isMutating}
                                                    className="group flex items-center justify-center gap-2 rounded-full bg-[#FF3B30] hover:bg-[#FF3B30]/90 px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none w-fit cursor-pointer"
                                                >
                                                    {isMutating ? (
                                                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                                    ) : (
                                                        <StopCircle className="h-4 w-4" />
                                                    )}
                                                    <span>Complete Commission</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Informational notice when commission is completed */}
                                {initialData.status === "COMPLETED" && (
                                    <div className="p-4 rounded-xl bg-[#34C759]/5 border border-[#34C759]/10 flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-[#34C759] shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-[#34C759]">
                                                Commission Session Completed
                                            </h4>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                All tasting sessions have concluded. The evaluation data has been locked and archived for scoring.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Informational notice when tasting is in progress and user is not HEAD */}
                                {initialData.status === "STARTED" && currentUserRole !== "HEAD" && (
                                    <div className="p-4 rounded-xl bg-[#007AFF]/5 border border-[#007AFF]/10 flex items-start gap-3">
                                        <div className="relative flex h-2.5 w-2.5 mt-1.5 shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#007AFF]"></span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-blue-400">
                                                Tasting is Active
                                            </h4>
                                            <p className="text-xs text-zinc-550 dark:text-zinc-450 mt-1">
                                                The commission has started. Please proceed with assessing your assigned wines and submitting scores.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Informational notice when waiting for HEAD to start */}
                                {isPreStart && currentUserRole !== "HEAD" && (
                                    <div className="p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-250/20 dark:border-zinc-800/30 flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mt-2 shrink-0" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-150">
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