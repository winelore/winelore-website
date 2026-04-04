"use client"

    import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Trophy, Wine, User, Layers, PlayCircle, Crown } from "lucide-react"
import { ProfileMenu } from "@/components/wine-lore-main"

// ====================================================================
// TABS CONFIGURATION (з головної сторінки)
// ====================================================================
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
// ====================================================================
// INTERFACES & MOCK DATA
// ====================================================================

type CommissionMemberRole = "EXPERT" | "HEAD_OF_COMMISSION"
type CommissionStatus = "DRAFT" | "IN_REVIEW" | "READY" | "IN_PROGRESS" | "FINISHED" | "CANCELED" | "SUSPENDED" | "DELETED"

interface Competition {
    id: string
    name: string
}

interface Commission {
    id: string
    competition: Competition
    name: string
    status: CommissionStatus
    plannedStartAt: string | null
    plannedEndAt: string | null
    startedAt: string | null
    endedAt: string | null
    headOfCommissionMemberCount: number
    candidateCount: number
    processedCandidateCount: number
    currentCandidateId: string | null
    createdAt: string

    creatorUsername: string
    timeElapsed: string
}

interface CommissionMember {
    auid: number
    role: CommissionMemberRole
    addedAt: string
    commission?: Commission


    // UI-specific extensions
    username: string
    isReady: boolean
    isOnPage: boolean
}

// ====================================================================
// MOCK DATA
// ====================================================================
const MOCK_MEMBERS: CommissionMember[] = [
    { auid: 1, username: "RED has a long name and last", role: "EXPERT", addedAt: "2026-03-29T16:00:00Z", isReady: true, isOnPage: true },
    { auid: 2, username: "RED", role: "EXPERT", addedAt: "2026-03-29T16:05:00Z", isReady: true, isOnPage: true },
    { auid: 3, username: "WHITE has a long name and last name", role: "EXPERT", addedAt: "2026-03-29T16:10:00Z", isReady: false, isOnPage: true },
    { auid: 4, username: "12342314 has a long name and last name", role: "EXPERT", addedAt: "2026-03-29T16:15:00Z", isReady: true, isOnPage: true },
    { auid: 5, username: "1234324", role: "HEAD_OF_COMMISSION", addedAt: "2026-03-29T16:00:00Z", isReady: true, isOnPage: true },
    { auid: 6, username: "324234", role: "EXPERT", addedAt: "2026-03-29T16:20:00Z", isReady: true, isOnPage: false },
    { auid: 7, username: "qwerqwer", role: "EXPERT", addedAt: "2026-03-29T16:22:00Z", isReady: true, isOnPage: true },
    { auid: 8, username: "2134rwdfsa", role: "EXPERT", addedAt: "2026-03-29T16:25:00Z", isReady: true, isOnPage: true },
    { auid: 9, username: "2314asdf", role: "EXPERT", addedAt: "2026-03-29T16:30:00Z", isReady: true, isOnPage: true },
]

const MOCK_COMMISSION: Commission = {
    id: "comm_123",
    name: "Red Commission",
    status: "IN_PROGRESS",
    plannedStartAt: "2026-03-29T16:00:00Z",
    plannedEndAt: "2026-03-29T20:00:00Z",
    startedAt: "2026-03-29T17:00:00Z",
    endedAt: null,
    headOfCommissionMemberCount: 1,
    candidateCount: 49,
    processedCandidateCount: 0,
    currentCandidateId: "cand_001",
    createdAt: "2026-03-20T10:00:00Z",

    competition: {
        id: "comp_999",
        name: "Mega Competition 2026",
    },

    creatorUsername: "likespro",
    timeElapsed: "3h 27m",
}

// ====================================================================
// COMPONENTS
// ====================================================================
function AvatarPlaceholder({ className }: { className?: string }) {
    return (
        <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 ${className}`}>
            <User className="h-1/2 w-1/2 text-indigo-300" />
        </div>
    )
}

export default function CommissionStartPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("competitions")
    const [loadingData, setLoadingData] = useState<boolean>(true)
    const [commissionMembers, setCommissionMembers] = useState<CommissionMember[]>([])
    const [commission, setCommission] = useState<Commission | null>(null)

    const [currentUserRole, setCurrentUserRole] = useState<CommissionMemberRole>("EXPERT")
    const [isStarting, setIsStarting] = useState(false)

    useEffect(() => {
        const loadMockData = () => {
            setTimeout(() => {
                setCommissionMembers(MOCK_MEMBERS)
                setCommission(MOCK_COMMISSION)
                setCurrentUserRole("EXPERT") // HEAD_OF_COMMISSION для перевірки кнопки старту
                setLoadingData(false)
            }, 800)
        }
        loadMockData()
    }, [])

    const handleActionClick = () => {
        setIsStarting(true)
        setTimeout(() => {
            setIsStarting(false)
            // router.push(`/waiting?commissionId=...`);
        }, 1000)
    }

    const nonReadyCount = commissionMembers.filter((p) => !p.isReady).length

    if (loadingData) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
            </div>
        )
    }

    return (
        <div className="flex h-screen flex-col bg-background">
            {/* Header (ідентичний до WineLoreDashboard) */}
            <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
                <div className="flex items-center">
                    <h1
                        className="text-2xl font-bold text-card-foreground tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => router.push('/')}
                    >
                        WineLore
                    </h1>
                </div>

                <nav className="hidden md:flex items-center rounded-full border border-border bg-muted/50 p-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                    isActive
                                        ? "bg-card text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-card-foreground"
                                }`}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                                <span>{tab.label}</span>
                            </button>
                        )
                    })}
                </nav>

                <ProfileMenu username="likespro" />
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8 lg:gap-12">

                    {/* Left Column: Participants List */}
                    <div className="w-full lg:w-5/12 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
                        {commissionMembers.map((p) => (
                            <div key={p.auid} className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-3 transition-shadow hover:shadow-md">
                                <AvatarPlaceholder className="h-10 w-10 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-card-foreground truncate">{p.username}</p>
                                        {p.role === "HEAD_OF_COMMISSION" && (
                                            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                                <Crown className="w-3 h-3" /> Head
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex text-xs mt-1 font-medium">
                    <span className={p.isReady ? "text-emerald-500" : "text-destructive"}>
                      {p.isReady ? "Ready" : "Not Ready"}
                    </span>
                                        <span className="mx-1.5 text-muted-foreground/50">|</span>
                                        <span className={p.isOnPage ? "text-emerald-500" : "text-destructive"}>
                      {p.isOnPage ? "On the page" : "Not On the page"}
                    </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right Column: Commission Details */}
                    <div className="w-full lg:w-7/12 flex flex-col pt-2">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Wine className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-card-foreground tracking-tight">{commission?.name}</h2>
                                <p className="text-lg mt-1">
                                    <span className="font-medium text-emerald-500">{formatEnumStatus(commission?.status)}</span>
                                    <span className="text-muted-foreground/50 mx-2">|</span>
                                    <span className="text-muted-foreground font-medium">{commission?.timeElapsed}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground mb-6 bg-card border border-border rounded-xl p-4 w-fit shadow-sm">
                            <div className="flex items-center gap-1.5">
                                <Trophy className="h-4 w-4" />
                                <span className="font-medium">{commission?.competition?.name}</span>
                            </div>
                            <span className="text-muted-foreground/50">|</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs">by</span>
                                <User className="h-4 w-4" />
                                <span className="font-medium text-card-foreground">{commission?.creatorUsername}</span>
                            </div>
                        </div>

                        <p className="text-base text-muted-foreground mb-8 flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            Featuring <strong className="text-card-foreground">{commission?.candidateCount}</strong> beverages
                        </p>

                        <div className="flex items-center gap-4 border-t border-border pt-6 mt-auto lg:mt-0">
                            <button
                                onClick={handleActionClick}
                                disabled={isStarting}
                                className="flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {isStarting ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"></div>
                                ) : (
                                    <PlayCircle className="h-5 w-5" />
                                )}
                                {isStarting ? "Processing..." : currentUserRole === "HEAD_OF_COMMISSION" ? "Start Commission" : "I'm Ready"}
                            </button>

                            {nonReadyCount > 0 && (
                                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
                                    {nonReadyCount}
                                  </span>
                                  Non-Ready members left
                                </span>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    )
}