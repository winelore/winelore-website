"use client"

import React, { useState } from "react"
import { FileText, Trophy, Wine, User, Layers, PlayCircle, Crown, GraduationCap } from "lucide-react"
import { ProfileMenu } from "@/components/wine-lore-main"

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
    username: string;
}

interface InitialData {
    id: string;
    name: string;
    status: string;
    competitionName: string;
    candidateCount: number;
    creatorUsername: string;
    timeElapsed: string;
    members: Member[];
}

export default function CommissionClientView({ initialData }: { initialData: InitialData }) {
    const [activeTab, setActiveTab] = useState("competitions")
    const [isStarting, setIsStarting] = useState(false)

    // Визначаємо роль поточного користувача (можна замінити на реальну перевірку сесії)
    const currentUserRole = initialData.members.find(m => m.role === "HEAD") ? "HEAD" : "EXPERT";

    const handleActionClick = () => {
        setIsStarting(true)
        setTimeout(() => {
            setIsStarting(false)
        }, 1000)
    }

    return (
        <div className="flex h-screen flex-col bg-background">
            {/* Header */}
            <header className="flex shrink-0 items-center border-b border-border bg-card px-6 py-4">
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
                            {initialData.members.map((p) => (
                                <div key={p.id}
                                     className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-3 transition-shadow hover:shadow-md w-64">
                                    <AvatarPlaceholder className="h-10 w-10 shrink-0"/>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-card-foreground truncate">{p.username}</p>
                                        </div>
                                        <div className="flex items-center mt-1">
                                            {/* Рендер бекенд-ролі HEAD */}
                                            {p.role === "HEAD" && (
                                                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                                    <Crown className="w-3 h-3"/> Head
                                                </span>
                                            )}
                                            {/* Рендер НОВОЇ бекенд-ролі TRAINEE_EXPERT */}
                                            {p.role === "TRAINEE_EXPERT" && (
                                                <span className="bg-amber-500/10 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                                    <GraduationCap className="w-3 h-3"/> Trainee
                                                </span>
                                            )}
                                            {/* Рендер бекенд-ролі EXPERT */}
                                            {p.role === "EXPERT" && (
                                                <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                                    Expert
                                                </span>
                                            )}
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
                                <p className="text-lg mt-1">
                                    <span className="font-medium text-emerald-500">{formatEnumStatus(initialData.status)}</span>
                                    <span className="text-muted-foreground/50 mx-2">|</span>
                                    <span className="text-muted-foreground font-medium">{initialData.timeElapsed}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground mb-6 bg-card border border-border rounded-xl p-4 w-fit shadow-sm">
                            <div className="flex items-center gap-1.5">
                                <Trophy className="h-4 w-4" />
                                <span className="font-medium">{initialData.competitionName}</span>
                            </div>
                            <span className="text-muted-foreground/50">|</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs">by</span>
                                <User className="h-4 w-4" />
                                <span className="font-medium text-card-foreground">{initialData.creatorUsername}</span>
                            </div>
                        </div>

                        <p className="text-base text-muted-foreground mb-8 flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            Featuring <strong className="text-card-foreground">{initialData.candidateCount}</strong> beverages
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
                                {isStarting ? "Processing..." : currentUserRole === "HEAD" ? "Start Commission" : "I'm Ready"}
                            </button>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    )
}