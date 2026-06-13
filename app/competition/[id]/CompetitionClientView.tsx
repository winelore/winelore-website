"use client"

import { FileText, Trophy, Wine, User } from "lucide-react"
import { ProfileMenu } from "@/components/wine-lore-main";
import React, { useState } from "react";
import Link from "next/link";

const UI_ONLY_FIELDS = {
    subtitleText: "This is a system generated competition view.",
    descriptionText: "Detailed description is not available in the current database schema. This area is reserved for future updates when descriptions are added to the Competition model."
}

const calculateTimeElapsed = (startedAt: string | null): string => {
    if (!startedAt) return "Not started"
    const start = new Date(startedAt).getTime()
    const now = new Date().getTime()
    const diffMs = now - start
    if (diffMs < 0) return "Starts in future"
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${diffHrs}h ${diffMins}m`
}

const formatEnumStatus = (status: string | undefined): string => {
    if (!status) return ""
    return status.toLowerCase().split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

// ====================================================================
// INTERFACES
// ====================================================================
type CompetitionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PLANNED" | "STARTED" | "COMPLETED" | "CANCELLED"
type CommissionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PLANNED" | "STARTED" | "COMPLETED" | "CANCELLED"

interface Commission {
    id: string
    name: string
    status: CommissionStatus
    startedAt: string | null
}

interface InitialData {
    id: string
    name: string
    seriesId: string
    status: CompetitionStatus
    startedAt: string | null
    plannedStartAt: string | null
    holders: number[][]
    commissions: Commission[]
}

const tabs = [
    { id: "feed", label: "Feed", icon: FileText },
    { id: "competitions", label: "Competitions", icon: Trophy },
    { id: "wines", label: "Wines", icon: Wine },
]

function AvatarPlaceholder({ className }: { className?: string }) {
    return (
        <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 ${className}`}>
            <User className="h-1/2 w-1/2 text-indigo-300" />
        </div>
    )
}

export default function CompetitionClientView({ initialData }: { initialData: InitialData }) {
    const [activeTab, setActiveTab] = useState("competitions")

    return (
        <div className="flex h-screen flex-col bg-background">
            <header className="flex shrink-0 items-center border-b border-border bg-card px-6 py-4">
                <div className="flex-1 flex items-center justify-start">
                    <h1 className="text-2xl font-bold text-card-foreground tracking-tight">WineLore</h1>
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
                                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-card-foreground"}`}
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

            <main className="flex-1 overflow-y-auto p-8 lg:p-10">
                <div className="mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 gap-16 lg:grid-cols-[600px_1fr] items-stretch">
                        <div className="hidden lg:flex flex-col h-full">
                            <div className="sticky top-28 w-full h-[calc(100vh-200px)] min-h-[600px] rounded-[40px] bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 flex flex-col items-center justify-center">
                                <div className="w-full h-full rounded-[30px] bg-gradient-to-br from-slate-50 to-slate-100 border border-dashed border-slate-200 flex items-center justify-center"></div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-10">
                            <section className="space-y-6">
                                <div className="flex items-start gap-6">
                                    <AvatarPlaceholder className="h-20 w-20 flex-shrink-0" />
                                    <div className="space-y-1">
                                        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                                            {initialData.name}
                                        </h2>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className={`font-bold ${
                                                initialData.status === 'STARTED' ? 'text-emerald-600' :
                                                    initialData.status === 'APPROVED' ? 'text-blue-600' : 'text-amber-500'
                                            }`}>
                                                {formatEnumStatus(initialData.status)}
                                            </span>
                                            <span className="text-slate-300">|</span>
                                            <span className="text-slate-500">{calculateTimeElapsed(initialData.startedAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-lg text-slate-500 leading-relaxed">
                                        {UI_ONLY_FIELDS.subtitleText}
                                    </p>
                                    <p className="text-slate-600 leading-relaxed">
                                        {UI_ONLY_FIELDS.descriptionText}
                                    </p>
                                </div>
                            </section>

                            <section className="flex items-center gap-3 border-t border-slate-100 pt-8">
                                <AvatarPlaceholder className="h-8 w-8" />
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <span className="text-slate-900">Series ID: {initialData.seriesId}</span>
                                    <span className="text-slate-300">| by Holder AUID:</span>
                                    <span className="text-indigo-600 cursor-pointer hover:underline">
                                        {initialData.holders?.[0]?.[0] ?? 'Unknown'}
                                    </span>
                                </div>
                            </section>

                            <section className="space-y-6">
                                <h3 className="text-2xl font-bold text-slate-900">Commissions</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {initialData.commissions.map((comm) => (
                                        <Link
                                            href={`/commission/${comm.id}`}
                                            key={comm.id}
                                            className="group flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/40 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-95"
                                        >
                                            <AvatarPlaceholder className="h-14 w-14 flex-shrink-0" />
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-slate-900">{comm.name}</span>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className={`font-bold ${
                                                        comm.status === 'STARTED' ? 'text-emerald-600' :
                                                            comm.status === 'APPROVED' ? 'text-blue-600' : 'text-amber-500'
                                                    }`}>
                                                        {formatEnumStatus(comm.status)}
                                                    </span>
                                                    <span className="text-slate-300">|</span>
                                                    <span className="text-slate-500">{calculateTimeElapsed(comm.startedAt)}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}

                                    {initialData.commissions.length === 0 && (
                                        <div className="col-span-1 md:col-span-2 text-slate-500 text-sm">
                                            No commissions found for this competition.
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}