"use client"

import { FileText, Trophy, Wine, User, Layers, PlayCircle, Crown } from "lucide-react"
import {ProfileMenu} from "@/components/wine-lore-main";
import React, {useEffect, useState} from "react";
import {useRouter} from "next/navigation";


// ====================================================================
// TABS CONFIGURATION (з головної сторінки)
// ====================================================================
const tabs = [
    { id: "feed", label: "Feed", icon: FileText },
    { id: "competitions", label: "Competitions", icon: Trophy },
    { id: "wines", label: "Wines", icon: Wine },
]

// INTERFACES

type CompetitionStatus = "DRAFT" | "IN_REVIEW" | "READY" | "IN_PROGRESS" | "FINISHED" | "CANCELED" | "SUSPENDED" | "DELETED"
type CommissionStatus = "READY" | "IN_PROGRESS" | "NOT READY"

interface Commission {
    commissionName: string
    commissionStatus: CommissionStatus
    timeElapsed: string
}

interface CompetitionDetails {
    id: string
    competitionName: string
    status: CompetitionStatus
    startedAt: string | null
    subtitleText: string
    descriptionText: string

    MainCompetitionName: string
    creatorUsername: string;
    timeElapsed: string;
}

const MOCK_COMMISSIONS: Commission[] = [
    {commissionName: "Red Commission", commissionStatus: "IN_PROGRESS", timeElapsed: "3h 27m"},
    {commissionName: "White Commission", commissionStatus: "NOT READY", timeElapsed: "3h 27m"},
    {commissionName: "Blue Commission", commissionStatus: "READY", timeElapsed: "3h 27m"},
];

const MOCK_COMPETITION: CompetitionDetails = {
    id: "123",
    competitionName: "Mega Competition 2026",
    status: "READY",
    startedAt: "2026-03-29T17:00:00Z",
    subtitleText: "This is an example competition for WineLore mega system demonstrating all abilities.",
    descriptionText: "PENISPENISPENISPENISm demonstrating all abilities. This can be a longer description with more characters and so on very loooooooooooooooooooooooooooooooooooooooooodadwa dwadnawdawdawj dj jd wjad jaw djawkjd wkl jawkj awkldj awld jwal aw djawk djkawj dwj jaw jdkawj dkwa jwlaj dwak jawl jw ala.",
    MainCompetitionName: "Mega Competition 2026",
    creatorUsername: "likespro",
    timeElapsed: "3h 27m",
}

// Components
function AvatarPlaceholder({ className }: { className?: string }) {
    return (
        <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 ${className}`}>
            <User className="h-1/2 w-1/2 text-indigo-300" />
        </div>
    )
}


export default function CompetitionStartPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("competitions")
    const [loadingData, setLoadingData] = useState<boolean>(true)
    const [commissions, setCommissions] = useState<Commission[]>([])
    const [competitionDetails, setCompetitionDetails] = useState<CompetitionDetails | null>(null)

    const [isStarting, setIsStarting] = useState(false)

    useEffect(() => {
        const loadMockData = () => {
            setTimeout(() => {
                setCommissions(MOCK_COMMISSIONS)
                setCompetitionDetails(MOCK_COMPETITION)
                setLoadingData(false)
            }, 800)
        }
        loadMockData()
    }, [])


    return (
        <div className="flex h-screen flex-col bg-background">
            {/* Header */}
            <header className="flex shrink-0 items-center border-b border-border bg-card px-6 py-4">
                {/* Logo */}
                <div className="flex-1 flex items-center justify-start">
                    <h1 className="text-2xl font-bold text-card-foreground tracking-tight">
                        WineLore
                    </h1>
                </div>

                {/* Navigation Tabs */}
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

                {/* User Profile */}
                <div className="flex-1 flex justify-end">
                    <ProfileMenu username="likespro" />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 lg:p-10">
                <div className="mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 gap-16 lg:grid-cols-[600px_1fr] items-stretch">

                        {/* LEFT COLUMN: Large Card Image */}
                        <div className="hidden lg:flex flex-col h-full">
                            <div className="sticky top-28 w-full h-[calc(100vh-200px)] min-h-[600px] rounded-[40px] bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 flex flex-col items-center justify-center">
                                <div className="w-full h-full rounded-[30px] bg-gradient-to-br from-slate-50 to-slate-100 border border-dashed border-slate-200 flex items-center justify-center">
                                </div>
                            </div>
                        </div>
                        {/* RIGHT COLUMN: Info & Commissions */}
                        <div className="flex flex-col gap-10">
                            {/* Section 1: Title & Description */}
                            <section className="space-y-6">
                                <div className="flex items-start gap-6">
                                    <AvatarPlaceholder className="h-20 w-20 flex-shrink-0" />
                                    <div className="space-y-1">
                                        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                                            {competitionDetails?.competitionName}
                                        </h2>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className={`font-bold ${
                                                competitionDetails?.status === 'IN_PROGRESS' ? 'text-emerald-600' :
                                                    competitionDetails?.status === 'READY' ? 'text-blue-600' : 'text-amber-500'
                                            }`}>
                                                {competitionDetails?.status.replace('_', ' ')}
                                            </span>
                                            <span className="text-slate-300">|</span>
                                            <span className="text-slate-500">{competitionDetails?.timeElapsed}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-lg text-slate-500 leading-relaxed">
                                        {competitionDetails?.subtitleText}
                                    </p>
                                    <p className="text-slate-600 leading-relaxed">
                                        {competitionDetails?.descriptionText}
                                    </p>
                                </div>
                            </section>

                            {/* Section 2: Creator Footer */}
                            <section className="flex items-center gap-3 border-t border-slate-100 pt-8">
                                <AvatarPlaceholder className="h-8 w-8" />
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <span className="text-slate-900">{competitionDetails?.MainCompetitionName}</span>
                                    <span className="text-slate-300">| by</span>
                                    <span className="text-indigo-600 cursor-pointer hover:underline">
                                        {competitionDetails?.creatorUsername}
                                    </span>
                                </div>
                            </section>

                            {/* Section 3: Commissions Grid */}
                            <section className="space-y-6">
                                <h3 className="text-2xl font-bold text-slate-900">Commissions</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {commissions.map((comm, idx) => (
                                        <div
                                            key={idx}
                                            className="group flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/40 transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer"
                                        >
                                            <AvatarPlaceholder className="h-14 w-14 flex-shrink-0" />
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-slate-900">{comm.commissionName}</span>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className={`font-bold ${
                                                        comm.commissionStatus === 'IN_PROGRESS' ? 'text-emerald-600' :
                                                            comm.commissionStatus === 'READY' ? 'text-blue-600' : 'text-amber-500'
                                                    }`}>
                                                        {comm.commissionStatus.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-slate-300">|</span>
                                                    <span className="text-slate-500">{comm.timeElapsed}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                        </div>
                    </div>
                </div>
            </main>

        </div>

    )
}