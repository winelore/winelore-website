"use client"

import React, { useState, useEffect, useRef } from "react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import { FileText, Trophy, Wine, User, Layers, PlayCircle, StopCircle, Crown, GraduationCap, CheckCircle, Users, Timer, Check, Calendar } from "lucide-react"
import { ProfileMenu } from "@/components/wine-lore-main"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useTranslation } from "@/lib/i18n/context"
import { 
    markMemberReadyAction, 
    markMemberNotReadyAction, 
    startCommissionAction, 
    completeCommissionAction,
    getCommissionDataAction
} from "../actions"
import { TranslatedText } from "@/lib/i18n/TranslatedText"

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
    const { t } = useTranslation()
    const steps = [
        { id: "readying", label: t("commission.stepReadying"), description: t("commission.stepReadyingDesc") },
        { id: "tasting", label: t("commission.stepTasting"), description: t("commission.stepTastingDesc") },
        { id: "completed", label: t("commission.stepCompleted"), description: t("commission.stepCompletedDesc") }
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

interface Replica {
    id: string;
    name: string;
    type: "STANDARD" | "TRAINEE";
    status: string;
    members: Member[];
    candidateCount: number;
    replicaCandidates: {
        id: string;
        status: string;
        candidate?: {
            id: string;
            anonymizedCode: string | null;
        } | null;
    }[];
    currentCandidateId?: string | null;
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
    replicas: Replica[];
    members: Member[];
}

export default function CommissionClientView({
    initialData: propInitialData,
    serverAuid
}: {
    initialData: InitialData;
    serverAuid?: number | null;
}) {
    const { t, formatStatus, formatReplicaType, formatDateTime, formatShortDateTime } = useTranslation()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("competitions")
    const [localData, setLocalData] = useState<InitialData>(propInitialData)
    const [localReplicas, setLocalReplicas] = useState<Replica[]>(propInitialData.replicas || [])
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
    const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
    const [isMutating, setIsMutating] = useState(false)
    const [timeDisplay, setTimeDisplay] = useState<string>("")
    const [currentAuid, setCurrentAuid] = useState<number>(serverAuid || 1)
    const [hasRedirected, setHasRedirected] = useState(false)

    const initialData = localData

    // Detect user's active replica
    const activeReplica = localReplicas.find(r =>
        r.members.some(m => m.auid.includes(currentAuid))
    ) || localReplicas.find(r => r.type === "STANDARD") || localReplicas[0] || null

    const [selectedReplicaId, setSelectedReplicaId] = useState<string | null>(activeReplica?.id || null)

    const selectedReplica = localReplicas.find(r => r.id === selectedReplicaId) || activeReplica
    const localMembers = selectedReplica ? selectedReplica.members : []

    const prevReplicaStatusRef = useRef(selectedReplica?.status)

    useEffect(() => {
        setLocalData(propInitialData)
        if (propInitialData.replicas) {
            setLocalReplicas(propInitialData.replicas)
            const active = propInitialData.replicas.find(r =>
                r.members.some(m => m.auid.includes(currentAuid))
            ) || propInitialData.replicas.find(r => r.type === "STANDARD") || propInitialData.replicas[0] || null
            if (active && !selectedReplicaId) {
                setSelectedReplicaId(active.id)
            }
        }
    }, [propInitialData, currentAuid, selectedReplicaId])

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
        : t("common.unknownCreator")

    useEffect(() => {
        const prevStatus = prevReplicaStatusRef.current
        const currentStatus = selectedReplica?.status

        if (prevStatus !== "STARTED" && currentStatus === "STARTED" && !hasRedirected && selectedReplica) {
            setHasRedirected(true)
            router.push(`/commission/${localData.id}/replica/${selectedReplica.id}/evaluation`)
        }

        prevReplicaStatusRef.current = currentStatus
    }, [selectedReplica?.status, localData.id, hasRedirected, router, selectedReplica])

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
                    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

                setTimeDisplay(formattedTime)
            } else if (initialData.status === "COMPLETED" && initialData.startedAt && initialData.endedAt) {
                const start = new Date(initialData.startedAt).getTime()
                const end = new Date(initialData.endedAt).getTime()
                const diff = Math.max(0, end - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                setTimeDisplay(hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes }))
            } else if (initialData.status === "PLANNED" && initialData.plannedStartAt) {
                const start = new Date(initialData.plannedStartAt).getTime()
                const now = new Date().getTime()
                const diff = start - now

                if (diff <= 0) {
                    setTimeDisplay(t("time.startingSoon"))
                } else {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                    if (days > 0) {
                        setTimeDisplay(t("time.inDaysHours", { days, hours }))
                    } else {
                        setTimeDisplay(t("time.inHoursMinutes", { hours, minutes }))
                    }
                }
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
                    if (updated.replicas) {
                        setLocalReplicas(updated.replicas)
                    }
                }
            } catch (err) {
                console.error("Failed to poll commission data:", err)
            }
        }, 3000)

        return () => clearInterval(pollInterval)
    }, [localData.id])

    const handleToggleReady = async (shouldBeReady: boolean) => {
        if (!selectedReplica || !currentMemberId || isMutating) return
        setIsMutating(true)

        try {
            let updatedMembers;
            if (shouldBeReady) {
                const response = await markMemberReadyAction(selectedReplica.id, currentMemberId)
                updatedMembers = response.markCommissionReplicaMemberReady?.members
            } else {
                const response = await markMemberNotReadyAction(selectedReplica.id, currentMemberId)
                updatedMembers = response.markCommissionReplicaMemberNotReady?.members
            }

            if (updatedMembers) {
                setLocalReplicas(prev =>
                    prev.map(r => {
                        if (r.id === selectedReplica.id) {
                            return {
                                ...r,
                                members: r.members.map(m => {
                                    const match = updatedMembers.find((u: any) => u.id === m.id)
                                    return match ? { ...m, isReady: match.isReady } : m
                                })
                            }
                        }
                        return r
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
        if (!selectedReplica || isMutating) return
        setIsMutating(true)
        try {
            await startCommissionAction(selectedReplica.id)
            router.push(`/commission/${initialData.id}/replica/${selectedReplica.id}/wait`)
            router.refresh()
        } catch (err) {
            console.error("Failed to start replica tasting session:", err)
        } finally {
            setIsMutating(false)
        }
    }

    const handleCompleteCommission = async () => {
        if (!selectedReplica || isMutating) return
        setIsMutating(true)
        try {
            await completeCommissionAction(selectedReplica.id)
            router.refresh()
        } catch (err) {
            console.error("Failed to complete replica tasting session:", err)
        } finally {
            setIsMutating(false)
        }
    }

    const isEveryoneReady = localMembers.every(m => m.isReady)
    const myStatus = localMembers.find(m => m.auid.includes(currentAuid))
    const amIReady = myStatus?.isReady || false
    const isPreStart = selectedReplica?.status !== "STARTED" && selectedReplica?.status !== "COMPLETED"
    const nonReadyCount = localMembers.filter(m => !m.isReady).length

    const sortedMembers = [...localMembers].sort((a, b) => {
        const roleOrder = { HEAD: 1, EXPERT: 2, TRAINEE_EXPERT: 3 }
        return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99)
    })

    const replicaStatus = selectedReplica?.status || "DRAFT"

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
                        {tabs(t).map((tab) => {
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

                <div className="flex-1 flex justify-end gap-3">
                    <LanguageSwitcher />
                    <ProfileMenu username="likespro" />
                </div>
            </header>

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-7xl flex flex-col lg:flex-row items-start gap-8">

                    {/* Left Column: Replicas, Stepper and Tasting Panel */}
                    <div className="w-full lg:w-[45%] flex flex-col gap-6">

                        {/* Replica Selector Tabs */}
                        {localReplicas.length > 0 && (
                            <div className="bg-white border border-slate-100 rounded-[32px] p-5 shadow-xl shadow-slate-200/50">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-indigo-500" />
                                    {t("commission.tastingReplicas")}
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {localReplicas.map((r) => {
                                        const isSelected = r.id === selectedReplicaId
                                        const isUserReplica = r.members.some(m => m.auid.includes(currentAuid))
                                        return (
                                            <button
                                                key={r.id}
                                                onClick={() => {
                                                    setSelectedReplicaId(r.id)
                                                    setHasRedirected(false)
                                                }}
                                                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition-all border text-left cursor-pointer w-full ${
                                                    isSelected
                                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                                        : "bg-slate-50 hover:bg-slate-100 border-slate-200/60 text-slate-600 hover:text-slate-800"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span><TranslatedText text={r.name} /></span>
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase ${
                                                        isSelected 
                                                            ? "bg-indigo-700/60 border-indigo-500 text-indigo-100" 
                                                            : "bg-slate-150 border-slate-200 text-slate-500"
                                                    }`}>
                                                        {formatReplicaType(r.type)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isUserReplica && (
                                                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                                                            isSelected ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
                                                        }`}>
                                                            {t("commission.myTasting")}
                                                        </span>
                                                    )}
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                                                        r.status === "STARTED"
                                                            ? (isSelected ? "bg-emerald-400 text-indigo-950 font-extrabold" : "bg-emerald-500/10 text-emerald-600")
                                                            : r.status === "COMPLETED"
                                                                ? (isSelected ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-500")
                                                                : (isSelected ? "bg-amber-400 text-indigo-950" : "bg-amber-500/10 text-amber-600")
                                                    }`}>
                                                        {formatStatus(r.status)}
                                                    </span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <StatusSteps status={replicaStatus} />

                        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-indigo-500" />
                                        {t("commission.tastingPanel", { name: <TranslatedText text={selectedReplica?.name || "Standard"} /> })}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {t("commission.tastingPanelSubtitle")}
                                    </p>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                                    {t("commission.readyCount", { 
                                        ready: localMembers.filter(m => m.isReady).length, 
                                        total: localMembers.length 
                                    })}
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
                                                                {t("common.you")}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center">
                                                        {p.role === "HEAD" && (
                                                            <span className="bg-amber-500/10 text-amber-600 border border-amber-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                                <Crown className="w-3 h-3"/> {t("commission.roleHead")}
                                                            </span>
                                                        )}
                                                        {p.role === "TRAINEE_EXPERT" && (
                                                            <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                                <GraduationCap className="w-3 h-3"/> {t("commission.roleTrainee")}
                                                            </span>
                                                        )}
                                                        {p.role === "EXPERT" && (
                                                            <span className="bg-indigo-50/70 text-indigo-600 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                                {t("commission.roleExpert")}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                                        p.isReady ? "text-emerald-500" : "text-slate-400"
                                                    }`}>
                                                        {p.isReady ? (
                                                            <>
                                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                                <span>{t("commission.statusReady")}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-slate-300 animate-spin" style={{ animationDuration: '3s' }} />
                                                                <span>{t("commission.statusWaiting")}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {localMembers.length === 0 && (
                                    <p className="text-sm text-slate-400 text-center py-4">{t("commission.noMembers")}</p>
                                )}
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
                                        {t("commission.session")}
                                    </span>
                                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5 truncate">
                                        <TranslatedText text={initialData.name} />
                                    </h2>
                                    <p className="text-sm mt-1.5 flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            replicaStatus === "STARTED" 
                                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                                                : replicaStatus === "COMPLETED"
                                                    ? "bg-slate-100 text-slate-500 border border-slate-200"
                                                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                        }`}>
                                            {replicaStatus === "STARTED" && (
                                                <span className="relative flex h-2 w-2 mr-1">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                            )}
                                            {formatStatus(replicaStatus)}
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
                                            {t("commission.competition")}
                                        </h4>
                                        <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                                            <TranslatedText text={initialData.competition.name} />
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-slate-50/60 border border-slate-100 rounded-2xl p-4 hover:border-indigo-100 transition-colors">
                                    <User className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                            {t("commission.holders")}
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
                                    {t("commission.replicaBeverages", { count: selectedReplica?.candidateCount || 0 })}
                                </span>
                            </div>
                        </div>

                        {/* Timeline and Dates */}
                        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 animate-fade-in-slide">
                            <h3 className="text-sm font-bold tracking-tight text-slate-800 flex items-center gap-2 mb-4">
                                <Calendar className="w-5 h-5 text-indigo-500" />
                                {t("commission.timelineDetails")}
                            </h3>
                            <div className="flex flex-col gap-4 relative pl-4 border-l border-slate-100 ml-2.5">
                                {/* Planned Start */}
                                <div className="relative">
                                    <div className="absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{t("commission.plannedStart")}</span>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                        <p className="text-xs font-semibold text-slate-800">
                                            {formatDateTime(initialData.plannedStartAt)}
                                        </p>
                                        {selectedReplica?.status === "PLANNED" && initialData.plannedStartAt && (
                                            <a
                                                href={getGoogleCalendarUrl(initialData.name, initialData.plannedStartAt, initialData.plannedEndAt)}
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
                                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{t("commission.plannedEnd")}</span>
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
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{t("commission.actualStart")}</span>
                                    <p className={`text-xs font-semibold mt-0.5 ${initialData.startedAt ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {initialData.startedAt ? formatDateTime(initialData.startedAt) : t("commission.notStartedYet")}
                                    </p>
                                </div>
                                {/* Actual End */}
                                <div className="relative">
                                    <div className={`absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                                        initialData.endedAt ? 'bg-rose-500' : 'bg-slate-200'
                                    }`} />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{t("commission.actualEnd")}</span>
                                    <p className={`text-xs font-semibold mt-0.5 ${initialData.endedAt ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {initialData.endedAt ? formatDateTime(initialData.endedAt) : t("commission.notCompletedYet")}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                                {t("commission.actionsControls")}
                            </h3>
                            
                            <div className="flex flex-col gap-6">
                                {replicaStatus === "STARTED" && (
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => router.push(`/commission/${localData.id}/replica/${selectedReplica.id}/evaluation`)}
                                            className="group flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/15 transition-all duration-300 transform active:scale-95 w-fit cursor-pointer"
                                        >
                                            <FileText className="h-5 w-5" />
                                            <span>{t("commission.continueEvaluation")}</span>
                                        </button>
                                        {selectedReplica?.currentCandidateId && (() => {
                                            const currentCandidateObj = selectedReplica.replicaCandidates.find(rc => rc.id === selectedReplica.currentCandidateId);
                                            const code = currentCandidateObj?.candidate?.anonymizedCode;
                                            return (
                                                <p className="text-xs text-slate-500 font-medium pl-1 flex items-center gap-1.5 flex-wrap">
                                                    <span>{t("commission.currentCandidate", { code: code || "N/A" })}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono font-normal">({selectedReplica.currentCandidateId})</span>
                                                </p>
                                            );
                                        })()}
                                    </div>
                                )}

                                {isPreStart && currentUserRole && (
                                    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/60 border border-slate-100 flex-wrap sm:flex-nowrap">
                                        <div className="max-w-full sm:max-w-[65%]">
                                            <h4 className="text-sm font-bold text-slate-800">
                                                {t("commission.yourReadiness")}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {t("commission.readinessDescription")}
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
                                                    <span>{t("commission.ready")}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <PlayCircle className="h-4 w-4" />
                                                    <span>{t("commission.markReady")}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {currentUserRole === "HEAD" && (
                                    <div className="border-t border-slate-100 pt-6">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                                            {t("commission.headTools", { name: <TranslatedText text={selectedReplica?.name} /> })}
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
                                                        <span>{t("commission.startTasting")}</span>
                                                    </button>
                                                    
                                                    {!isEveryoneReady && (
                                                        <span className="text-xs text-slate-500 font-medium animate-fade-in-slide">
                                                            {t("commission.waitingMembers", { count: nonReadyCount })}
                                                        </span>
                                                    )}
                                                    {isEveryoneReady && (
                                                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 animate-pulse">
                                                            <Check className="w-4 h-4 shrink-0" />
                                                            {t("commission.everyoneReady")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {replicaStatus === "STARTED" && (
                                            <div className="flex flex-col gap-2.5">
                                                <p className="text-xs text-slate-500 mb-1">
                                                    {t("commission.completeDescription")}
                                                </p>
                                                <div className="flex flex-wrap gap-3">
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
                                                        <span>{t("commission.completeTasting")}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {replicaStatus === "COMPLETED" && (
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-800">
                                                {t("commission.sessionCompleted")}
                                            </h4>
                                            <p className="text-xs text-emerald-600/90 mt-1">
                                                {t("commission.sessionCompletedDesc")}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {replicaStatus === "STARTED" && currentUserRole !== "HEAD" && (
                                    <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/50 flex flex-col gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="relative flex h-3 w-3 mt-1.5 shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-indigo-800">
                                                    {t("commission.tastingActive")}
                                                </h4>
                                                <p className="text-xs text-slate-600 mt-1">
                                                    {t("commission.tastingActiveDesc")}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => router.push(`/commission/${localData.id}/replica/${selectedReplica.id}/wait`)}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
                                        >
                                            Enter Tasting Session →
                                        </button>
                                    </div>
                                )}

                                {isPreStart && currentUserRole !== "HEAD" && (
                                    <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 flex items-start gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse mt-1.5 shrink-0" />
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">
                                                {t("commission.waitingStart")}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {t("commission.waitingStartDesc")}
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