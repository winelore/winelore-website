"use client"

import React, { useState, useEffect, useCallback } from "react"
// import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import { FileText, Trophy, Wine, User, Layers, PlayCircle, Crown, GraduationCap, CheckCircle, XCircle } from "lucide-react"
import { ProfileMenu } from "@/components/wine-lore-main"
import { fetchGraphQL } from "../../../lib/apiClient"
import { MARK_MEMBER_READY, MARK_MEMBER_NOT_READY } from "./queries"

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

function AvatarPlaceholder({ className }: { className?: string }) {
    return (
        <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 ${className}`}>
            <User className="h-1/2 w-1/2 text-indigo-300" />
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
    const [creatorNames, setCreatorNames] = useState<string>("Loading creators...")
    const [memberNames, setMemberNames] = useState<Record<string, string>>({})
    const [isMutating, setIsMutating] = useState(false)
    const [timeDisplay, setTimeDisplay] = useState<string>("")

    // const currentAuid = parseInt(Cookies.get("auid") || "0", 10)
    const currentAuid = 1

    // ЗАГЛУШКА: Замінити на реальний fetch до API профілів, коли він буде готовий
    const fetchUsernameMock = useCallback(async (auid: number): Promise<string> => {
        await new Promise(resolve => setTimeout(resolve, 300))
        const mockDatabase: Record<number, string> = {
            1: "AdminCreator",
            101: "John Expert",
            102: "Jane Trainee",
            //[currentAuid]: "My_Test_Account"
        }
        return mockDatabase[auid] || `User_${auid}`
    }, [currentAuid])

    // Визначення ролі та завантаження імен
    useEffect(() => {
        const me = localMembers.find(m => m.auid.includes(currentAuid))
        if (me) {
            setCurrentUserRole(me.role)
            setCurrentMemberId(me.id)
        }

        const loadCreators = async () => {
            if (initialData.competition.holders.length === 0) {
                setCreatorNames("Unknown Creator")
                return
            }
            const names = await Promise.all(initialData.competition.holders.map(id => fetchUsernameMock(id)))
            setCreatorNames(names.join(", "))
        }

        const loadMemberNames = async () => {
            const namesMap: Record<string, string> = {}
            for (const member of initialData.members) {
                const primaryAuid = member.auid[0]
                if (primaryAuid) {
                    namesMap[member.id] = await fetchUsernameMock(primaryAuid)
                }
            }
            setMemberNames(namesMap)
        }

        loadCreators()
        loadMemberNames()
    }, [localMembers, currentAuid, initialData.competition.holders, initialData.members, fetchUsernameMock])

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

    // Фонове оновлення даних (Polling) перевірка чи комімія закінчила роботу
    useEffect(() => {
        const pollInterval = setInterval(() => {
            router.refresh()
        }, 3 * 60 * 1000) // Кожні 3 хвилини

        return () => clearInterval(pollInterval)
    }, [router])

    const handleToggleReady = async (shouldBeReady: boolean) => {
        if (!currentMemberId || isMutating) return
        setIsMutating(true)

        try {
            let updatedMembers;
            if (shouldBeReady) {
                const response = await fetchGraphQL(MARK_MEMBER_READY, {
                    commissionId: initialData.id,
                    memberId: currentMemberId
                })
                updatedMembers = response.markCommissionMemberReady?.members
            } else {
                const response = await fetchGraphQL(MARK_MEMBER_NOT_READY, {
                    commissionId: initialData.id,
                    memberId: currentMemberId
                })
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

    const isEveryoneReady = localMembers.every(m => m.isReady)
    const myStatus = localMembers.find(m => m.auid.includes(currentAuid))
    const amIReady = myStatus?.isReady || false

    return (
        <div className="flex h-screen flex-col bg-background">
            {/* Header */}
            <header className="flex shrink-0 items-center border-b border-border bg-card px-6 py-4">
                <div className="flex-1 flex items-center justify-start">
                    <h1 className="text-2xl font-bold text-card-foreground tracking-tight">
                        WineLore
                    </h1>
                </div>

                <div className="flex-none">
                    <nav className="flex items-center rounded-full border border-border bg-muted/50 p-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive
                                        ? "bg-card text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-card-foreground"
                                    }`}
                                >
                                    <Icon className={`h-4 w-4 ${isActive ? "text-blue-500" : ""}`} />
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
            <main className="flex-1 overflow-auto p-6 flex flex-col items-center">
                <div className="w-full max-w-7xl flex flex-col lg:flex-row items-start">

                    {/* Left Column: Participants List */}
                    <div className="w-full lg:w-1/2 flex flex-col lg:items-end lg:pr-7">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit w-fit">
                            {localMembers.map((p) => (
                                <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-3 transition-shadow hover:shadow-md w-64">
                                    <AvatarPlaceholder className="h-10 w-10 shrink-0"/>
                                    <div className="flex-1 min-w-0">

                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-card-foreground truncate">
                                                {memberNames[p.id] || "Loading..."}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between mt-2">

                                            {/* Блок з роллю */}
                                            <div className="flex items-center">
                                                {p.role === "HEAD" && (
                                                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                        <Crown className="w-3 h-3"/> Head
                    </span>
                                                )}
                                                {p.role === "TRAINEE_EXPERT" && (
                                                    <span className="bg-amber-500/10 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                        <GraduationCap className="w-3 h-3"/> Trainee
                    </span>
                                                )}
                                                {p.role === "EXPERT" && (
                                                    <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        Expert
                    </span>
                                                )}
                                            </div>

                                            {/* Блок зі статусом */}
                                            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                                p.isReady ? "text-emerald-500" : "text-muted-foreground/40"
                                            }`}>
                                                {p.isReady ? (
                                                    <>
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        <span>Ready</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        <span>Not Ready</span>
                                                    </>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Commission Details */}
                    <div className="w-full lg:w-1/2 flex flex-col lg:items-start lg:pl-7 pt-1">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Wine className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-card-foreground tracking-tight">{initialData.name}</h2>
                                <p className="text-lg mt-1 flex items-center">
                                    <span className="font-medium text-emerald-500">{formatEnumStatus(initialData.status)}</span>
                                    {timeDisplay && (
                                        <>
                                            <span className="text-muted-foreground/50 mx-2">|</span>
                                            <span className="text-muted-foreground font-medium">{timeDisplay}</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground mb-6 bg-card border border-border rounded-xl p-4 w-fit shadow-sm">
                            <div className="flex items-center gap-1.5">
                                <Trophy className="h-4 w-4" />
                                <span className="font-medium">{initialData.competition.name}</span>
                            </div>
                            <span className="text-muted-foreground/50">|</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs">by</span>
                                <User className="h-4 w-4" />
                                <span className="font-medium text-card-foreground">{creatorNames}</span>
                            </div>
                        </div>

                        <p className="text-base text-muted-foreground mb-8 flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            Featuring <strong className="text-card-foreground">{initialData.candidateCount}</strong> beverages
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-4 border-t border-border pt-6 mt-auto lg:mt-0">

                            {/* Кнопка підтвердження готовності */}
                            {currentUserRole && (
                                <button
                                    onClick={() => handleToggleReady(!amIReady)}
                                    disabled={isMutating}
                                    className={`flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium shadow transition-opacity hover:opacity-90 disabled:opacity-50 ${
                                        amIReady
                                            ? "bg-secondary text-secondary-foreground border border-border"
                                            : "bg-emerald-600 text-white"
                                    }`}
                                >
                                    {isMutating ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                    ) : (
                                        <CheckCircle className="h-4 w-4" />
                                    )}
                                    {amIReady ? "Cancel Readiness" : "I'm Ready"}
                                </button>
                            )}

                            {/* Кнопка старту (тільки для HEAD) */}
                            {currentUserRole === "HEAD" && (
                                <button
                                    disabled={!isEveryoneReady}
                                    className="flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-opacity hover:opacity-90 disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground"
                                >
                                    <PlayCircle className="h-5 w-5" />
                                    Start Commission
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    )
}