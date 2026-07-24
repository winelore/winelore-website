"use client"

import React, { useState, useEffect, useMemo } from "react"
import {Wine, User, Layers, ChevronLeft, ChevronRight, Loader2, AlertCircle} from "lucide-react"
import { AppHeader, type AppTabId } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { TranslatedText } from "@/lib/i18n/TranslatedText"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useUsernames } from "@/hooks/useUsernames"



type CompetitionSeriesStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED" | "APPROVED" | "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "SUSPENDED"

interface CompetitionSeries {
    id: string
    name: string
    status: CompetitionSeriesStatus
}

interface Competition {
    id: string
    name: string
    status: string
    description?: string
    holder: number[]
    plannedStartAt: string | null
    plannedEndAt?: string | null
    startedAt: string | null
    endedAt: string | null
    series: CompetitionSeries
}

interface DashboardProps {
    initialCompetitions: Competition[]
    currentPage: number
    totalPages?: number
    // Legacy props to keep local dev server working before full merge
    nextCursor?: string | null
    nextHistory?: string
    prevCursor?: string | null
    prevHistory?: string
    hasPrev?: boolean
    hasNext?: boolean
}

function AvatarPlaceholder({ className }: { className?: string }) {
    return (
        <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 ${className}`}>
            <User className="h-1/2 w-1/2 text-indigo-300" />
        </div>
    )
}

function getStatusColor(status: string) {
    switch (status) {
        case "IN_PROGRESS":
        case "STARTED":
            return "text-emerald-500"
        case "READY":
        case "PLANNED":
        case "APPROVED":
            return "text-blue-500"
        case "FINISHED":
        case "COMPLETED":
            return "text-muted-foreground"
        default:
            return "text-muted-foreground"
    }
}

function formatStatus(status: string) {
    switch (status) {
        case "IN_PROGRESS":
        case "STARTED":
            return "In Progress"
        case "READY":
        case "PLANNED":
        case "APPROVED":
            return "Ready"
        case "FINISHED":
        case "COMPLETED":
            return "Finished"
        default:
            return status
                .toLowerCase()
                .split("_")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")
    }
}

function formatTimeRemaining(plannedStartAt: string | null, plannedEndAt: string | null, status: string, t: any) {
    if (status === "FINISHED" || status === "COMPLETED") return t("time.ended")
    if (!plannedStartAt) return ""

    const now = new Date()
    const startDate = new Date(plannedStartAt)
    const endDate = plannedEndAt ? new Date(plannedEndAt) : null

    if (status === "READY" || status === "PLANNED" || status === "APPROVED") {
        const diff = startDate.getTime() - now.getTime()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        if (days > 0) return t("time.startsInDays", { days })
        if (hours > 0) return t("time.startsInHours", { hours })
        return t("time.startingSoon")
    }

    if ((status === "IN_PROGRESS" || status === "STARTED") && endDate) {
        const diff = endDate.getTime() - now.getTime()
        if (diff < 0) return ""
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        if (days > 0) return t("time.duration", { days, hours })
        if (hours > 0) return t("time.durationHoursMinutes", { hours, minutes })
        return t("time.durationMinutes", { minutes })
    }

    return ""
}

function CompetitionCard({ competition, usernames }: { competition: Competition; usernames: Record<string, string> }) {
    const [isMounted, setIsMounted] = useState(false)
    const { t, formatStatus } = useTranslation()

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const timeRemaining = formatTimeRemaining(
        competition.plannedStartAt,
        competition.plannedEndAt ?? null,
        competition.status,
        t
    )

    return (
        <Link
            href={`/competition/${competition.id}`}
            className="group bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 flex flex-col min-h-[140px]"
        >
            <div className="flex items-start gap-3">
                <AvatarPlaceholder className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-card-foreground truncate">
                        {competition.name}
                    </h3>
                    <p className="text-sm">
                        <span className={`font-medium ${getStatusColor(competition.status)}`}>
                            {formatStatus(competition.status)}
                        </span>
                        {/* Render time remaining only after client mount */}
                        {isMounted && timeRemaining && <span className="text-muted-foreground"> | {timeRemaining}</span>}
                    </p>
                </div>
            </div>
            {competition.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    <TranslatedText text={competition.description} />
                </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    <span>{competition.series.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>{t("dashboard.holderId", { ids: competition.holder.map(id => usernames[id] || String(id)).join(", ") })}</span>
                </div>
            </div>
        </Link>
    )
}
export default function CompetitionsClientView({
                                              initialCompetitions,
                                              nextCursor,
                                              nextHistory,
                                              prevCursor,
                                              prevHistory,
                                              hasPrev,
                                              hasNext,
                                              currentPage,
                                              totalPages = 1 // default for local
                                          }: DashboardProps) {
    const activeTab = "competitions"
    const router = useRouter()
    const pathname = usePathname()

    const [isLoading, setIsLoading] = useState(false)

    // Fetch usernames for all competition holders on the dashboard
    const allHolderAuids = useMemo(() => {
        return Array.from(new Set(initialCompetitions.flatMap(c => c.holder || [])))
    }, [initialCompetitions])
    const { usernames } = useUsernames(allHolderAuids)

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    const handleNext = () => {
        if (currentPage >= totalPages || !nextCursor) return
        setIsLoading(true)
        router.push(`${pathname}?cursor=${nextCursor}&page=${currentPage + 1}`)
    }

    const handleJumpToPage = (pageNumber: number) => {
        setIsLoading(true)
        router.push(`${pathname}?page=${pageNumber}`)
    }

    useEffect(() => {
        setIsLoading(false)
    }, [initialCompetitions])

    return (
        <div className="flex h-screen flex-col bg-background">
            <AppHeader activeTab={activeTab} />

            <main className="flex-1 overflow-auto p-6 flex flex-col relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-3xl">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                            {initialCompetitions.map((competition) => (
                                <CompetitionCard
                                    key={competition.id}
                                    competition={competition}
                                    usernames={usernames}
                                />
                            ))}
                        </div>

                        {(totalPages > 1) ? (
                            <div className="mt-1 flex items-center justify-center gap-3">
                                <button
                                    onClick={() => handleJumpToPage(currentPage - 1)}
                                    disabled={currentPage <= 1 || isLoading}
                                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>

                                {getPageNumbers().map((p, i) => (
                                    p === '...' ? (
                                        <span key={i} className="flex items-center justify-center w-8 h-10 text-slate-400">...</span>
                                    ) : (
                                        <button
                                            key={i}
                                            onClick={() => handleJumpToPage(p as number)}
                                            disabled={isLoading || p === currentPage}
                                            className={`flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold transition-all duration-300 shadow-xl ${
                                                p === currentPage
                                                    ? "bg-indigo-600 text-white shadow-indigo-200/50 pointer-events-none"
                                                    : "bg-white border border-slate-100 text-slate-600 shadow-slate-200/50 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100"
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                ))}

                                <button
                                    onClick={handleNext}
                                    disabled={currentPage >= totalPages || isLoading}
                                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        ) : null}
            </main>
        </div>
    )
}
