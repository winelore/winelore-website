"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import { FileText, Trophy, Wine, User, Layers, PlayCircle, StopCircle, Crown, GraduationCap, CheckCircle, Users, Timer, Check } from "lucide-react"
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
        <div className="w-full bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 mb-4">
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

    const sortedMembers = [...localMembers].sort((a, b) => {
        const roleOrder = { HEAD: 1, EXPERT: 2, TRAINEE_EXPERT: 3 }
        return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99)
    })

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <header className="flex shrink-0 items-center border-b border-slate-100 bg-white px-6 py-4">
                <div className="flex-1 flex items-center justify-start">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                        WineLore
                    </h1>
                </div>

                <div className="flex-none">
                    <nav className="flex items-center rounded-full border border-slate-100 bg-slate-50/50 p-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive
                                        ? "bg-white text-slate-800 shadow-sm border border-slate-100/50"
                                        : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : ""}`} />
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

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-7xl flex flex-col lg:flex-row items-start gap-8">

                    {/* Left Column: Stepper and Tasting Panel */}
                    <div className="w-full lg:w-[45%] flex flex-col gap-6">
                        <StatusSteps status={initialData.status} />

                        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-indigo-500" />
                                        Tasting Panel
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Members evaluating this competition
                                    </p>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                                    {localMembers.filter(m => m.isReady).length} / {localMembers.length} Ready
                                </span>
                            </div>

                            <div className="flex flex-col gap-3">
                                {sortedMembers.map((p) => {
                                    const isMe = p.auid.includes(currentAuid)
                                    return (
                                        <div key={p.id} className={`relative rounded-xl border p-4 shadow-sm flex items-center gap-3 transition-all duration-300 hover:shadow-md w-full ${
                                            isMe 
                                                ? "border-indigo-200 bg-indigo-50/30 shadow-indigo-100/30 shadow-md" 
                                                : "border-slate-100 bg-slate-50/30 hover:border-slate-200/50 hover:bg-slate-50/50"
                                        }`}>
                                            <MemberAvatar auid={p.auid} role={p.role} className="h-10 w-10 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                                                        <span>AUID: {p.auid.join(", ")}</span>
                                                        {isMe && (
                                                            <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-xs uppercase tracking-wider">
                                                                You
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center">
                                                        {p.role === "HEAD" && (
                                                            <span className="bg-amber-500/10 text-amber-600 border border-amber-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                                <Crown className="w-3 h-3"/> Head
                                                            </span>
                                                        )}
                                                        {p.role === "TRAINEE_EXPERT" && (
                                                            <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                                <GraduationCap className="w-3 h-3"/> Trainee
                                                            </span>
                                                        )}
                                                        {p.role === "EXPERT" && (
                                                            <span className="bg-indigo-50/70 text-indigo-600 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                                Expert
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                                        p.isReady ? "text-emerald-500" : "text-slate-400"
                                                    }`}>
                                                        {p.isReady ? (
                                                            <>
                                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                                <span>Ready</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-slate-300 animate-spin" style={{ animationDuration: '3s' }} />
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

                    {/* Right Column: Actions & Session Details */}
                    <div className="w-full lg:w-[55%] flex flex-col gap-6">
                        <div className="relative overflow-hidden bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50">
                            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-indigo-50/20 blur-3xl pointer-events-none" />

                            <div className="flex items-start gap-4 mb-6">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                                    <Wine className="h-8 w-8" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-xs font-bold tracking-widest uppercase text-slate-400">
                                        Commission Session
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
                                            {formatEnumStatus(initialData.status)}
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                                <div className="flex items-start gap-3 bg-slate-50/60 border border-slate-100 rounded-2xl p-4 hover:border-indigo-100 transition-colors">
                                    <Trophy className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                            Competition
                                        </h4>
                                        <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                                            {initialData.competition.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-slate-50/60 border border-slate-100 rounded-2xl p-4 hover:border-indigo-100 transition-colors">
                                    <User className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                            Holders
                                        </h4>
                                        <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate" title={creatorNames}>
                                            {creatorNames}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4 mt-4">
                                <Layers className="h-5 w-5 text-indigo-500 shrink-0" />
                                <span className="text-sm text-slate-500 font-medium">
                                    Featuring <strong className="text-slate-800 font-bold">{initialData.candidateCount}</strong> selected beverages for tasting
                                </span>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                                Actions & Controls
                            </h3>
                            
                            <div className="flex flex-col gap-6">
                                {isPreStart && currentUserRole && (
                                    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/60 border border-slate-100 flex-wrap sm:flex-nowrap">
                                        <div className="max-w-full sm:max-w-[65%]">
                                            <h4 className="text-sm font-bold text-slate-800">
                                                Your Readiness
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Mark yourself as ready when you are prepared to start tasting
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleToggleReady(!amIReady)}
                                            disabled={isMutating}
                                            className={`group flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-xs cursor-pointer shrink-0 ${
                                                amIReady
                                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/15"
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
                                    <div className="border-t border-slate-100 pt-6">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                                            Head of Commission Tools
                                        </h4>
                                        
                                        {isPreStart && (
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <button
                                                        onClick={handleStartCommission}
                                                        disabled={!isEveryoneReady || isMutating}
                                                        className={`group flex items-center gap-2.5 rounded-xl px-8 py-3 text-sm font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${
                                                            isEveryoneReady 
                                                                ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25" 
                                                                : "bg-slate-100 text-slate-400 border border-slate-200"
                                                        }`}
                                                    >
                                                        {isMutating ? (
                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                                        ) : (
                                                            <PlayCircle className="h-5 w-5" />
                                                        )}
                                                        <span>Start Commission</span>
                                                    </button>
                                                    
                                                    {!isEveryoneReady && (
                                                        <span className="text-xs text-slate-500 font-medium animate-fade-in-slide">
                                                            Waiting for {nonReadyCount} member{nonReadyCount > 1 ? 's' : ''} to be ready.
                                                        </span>
                                                    )}
                                                    {isEveryoneReady && (
                                                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 animate-pulse">
                                                            <Check className="w-4 h-4 shrink-0" />
                                                            Everyone is ready! Start session.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {initialData.status === "STARTED" && (
                                            <div className="flex flex-col gap-2.5">
                                                <p className="text-xs text-slate-500 mb-1">
                                                    As the Head of Commission, you can end the evaluation once all members have finished their tasting assessments.
                                                </p>
                                                <button
                                                    onClick={handleCompleteCommission}
                                                    disabled={isMutating}
                                                    className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/15 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none w-fit cursor-pointer"
                                                >
                                                    {isMutating ? (
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                                    ) : (
                                                        <StopCircle className="h-5 w-5" />
                                                    )}
                                                    <span>Complete Commission</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {initialData.status === "COMPLETED" && (
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-800">
                                                Commission Session Completed
                                            </h4>
                                            <p className="text-xs text-emerald-600/90 mt-1">
                                                All tasting sessions have concluded. The evaluation data has been locked and archived for scoring.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {initialData.status === "STARTED" && currentUserRole !== "HEAD" && (
                                    <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/50 flex items-start gap-3">
                                        <div className="relative flex h-3 w-3 mt-1.5 shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-indigo-800">
                                                Tasting is Active
                                            </h4>
                                            <p className="text-xs text-slate-600 mt-1">
                                                The commission has started. Please proceed with assessing your assigned wines and submitting scores.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {isPreStart && currentUserRole !== "HEAD" && (
                                    <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 flex items-start gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse mt-1.5 shrink-0" />
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">
                                                Waiting for Session Start
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1">
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