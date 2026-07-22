"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import Link from "next/link"
import { Activity, PlayCircle, CheckCircle, AlertCircle, Calendar, ChevronLeft, ChevronRight, Loader2, ChevronRight as ChevronRightIcon, Timer } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"
import { AppHeader } from "@/components/AppHeader"

// ====================================================================
// INTERFACES
// ====================================================================
type CommissionStatus = "APPROVED" | "CANCELLED" | "COMPLETED" | "DRAFT" | "IN_REVIEW" | "PLANNED" | "STARTED"

interface CompetitionInfo {
    id: string
    name: string
}

interface Commission {
    id: string
    name: string
    status: CommissionStatus
    startedAt: string | null
    endedAt: string | null
    competition: CompetitionInfo
}

interface InitialData {
    commissions: Commission[]
}

interface MyCommissionsProps {
    initialData: InitialData
    nextOffset: string | null
    nextHistory: string
    prevOffset: string | null
    prevHistory: string
    hasPrev: boolean
    hasNext: boolean
    currentPage: number
    totalPages?: number
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
            return "text-slate-500"
        case "CANCELLED":
            return "text-rose-500"
        default:
            return "text-slate-500"
    }
}

function getStatusBgColor(status: string) {
    switch (status) {
        case "IN_PROGRESS":
        case "STARTED":
            return "bg-emerald-50 border-emerald-100"
        case "READY":
        case "PLANNED":
        case "APPROVED":
            return "bg-blue-50 border-blue-100"
        case "FINISHED":
        case "COMPLETED":
            return "bg-slate-50 border-slate-200"
        case "CANCELLED":
            return "bg-rose-50 border-rose-100"
        default:
            return "bg-slate-50 border-slate-200"
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

function CommissionCard({ comm }: { comm: Commission }) {
    const [timeStr, setTimeStr] = useState<string>("")
    const { t } = useTranslation()

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const updateTime = () => {
            if (comm.status === "STARTED" && comm.startedAt) {
                const start = new Date(comm.startedAt).getTime()
                const now = new Date().getTime()
                const diff = Math.max(0, now - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                const time = hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes })
                setTimeStr(`${time} ${seconds}s`)
            } else if (comm.status === "COMPLETED" && comm.startedAt && comm.endedAt) {
                const start = new Date(comm.startedAt).getTime()
                const end = new Date(comm.endedAt).getTime()
                const diff = Math.max(0, end - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                const time = hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes })
                setTimeStr(t("time.lasted", { time }))
            } else {
                setTimeStr("")
            }
        }

        updateTime()

        if (comm.status === "STARTED") {
            intervalId = setInterval(updateTime, 1000)
        }

        return () => clearInterval(intervalId)
    }, [comm.status, comm.startedAt, comm.endedAt, t])

    return (
        <Link
            href={`/commission/${comm.id}`}
            className="group bg-white border border-slate-100 rounded-[32px] p-7 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-300/50 hover:border-emerald-100 flex flex-col min-h-[140px]"
        >
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                    <Activity className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 truncate block">
                        {comm.competition.name}
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">
                        {comm.name}
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(comm.status)} ${getStatusBgColor(comm.status)} border`}>
                    {comm.status === "STARTED" ? <PlayCircle className="w-3 h-3" /> :
                        comm.status === "COMPLETED" ? <CheckCircle className="w-3 h-3" /> :
                            comm.status === "CANCELLED" ? <AlertCircle className="w-3 h-3" /> :
                                <Calendar className="w-3 h-3" />}
                    {formatStatus(comm.status)}
                    {timeStr && (
                        <>
                            <span className="text-slate-300 opacity-50 px-0.5">|</span>
                            <span className="flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                {timeStr}
                            </span>
                        </>
                    )}
                </span>
                
                <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
            </div>
        </Link>
    )
}

export default function MyCommissionsClientView({ initialData, nextOffset, nextHistory, prevOffset, prevHistory, hasPrev, hasNext, currentPage, totalPages = 1 }: MyCommissionsProps) {
    const [currentAuid, setCurrentAuid] = useState<number | null>(null)
    const { t } = useTranslation()
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) setCurrentAuid(parseInt(cookieAuid, 10))
    }, [])

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
        if (!hasNext || !nextOffset) return
        setIsLoading(true)
        router.push(`${pathname}?offset=${nextOffset}&h=${nextHistory}`)
    }

    const handlePrev = () => {
        if (!hasPrev) return
        setIsLoading(true)
        if (!prevOffset) {
            router.push(pathname)
        } else {
            const histParam = prevHistory ? `&h=${prevHistory}` : ''
            router.push(`${pathname}?offset=${prevOffset}${histParam}`)
        }
    }

    const handleJumpToPage = (pageNumber: number) => {
        setIsLoading(true)
        const targetOffset = (pageNumber - 1) * 16
        // Simple history tracking for jump - we just clear history and use the offset
        router.push(`${pathname}?offset=${targetOffset}`)
    }

    useEffect(() => {
        setIsLoading(false)
    }, [initialData])

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="none" />

            <main className="flex-1 overflow-auto p-6 flex flex-col relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-3xl">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                )}

                <div className="flex items-center justify-between mb-4 shrink-0">
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">My Commissions</h2>
                        <p className="text-sm text-slate-500 mt-1">Manage and monitor the commissions you participate in.</p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                    {initialData.commissions.map((comm) => (
                        <CommissionCard key={comm.id} comm={comm} />
                    ))}

                    {initialData.commissions.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-200/50">
                            <Activity className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">No commissions found</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-md">You are not participating in any commissions.</p>
                        </div>
                    )}
                </div>

                {(totalPages > 1) ? (
                    <div className="mt-1 flex items-center justify-center gap-3 shrink-0 pt-2 pb-2">
                        <button
                            onClick={handlePrev}
                            disabled={!hasPrev || isLoading}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-emerald-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
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
                                            ? "bg-emerald-600 text-white shadow-emerald-200/50 pointer-events-none"
                                            : "bg-white border border-slate-100 text-slate-600 shadow-slate-200/50 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-emerald-100"
                                    }`}
                                >
                                    {p}
                                </button>
                            )
                        ))}

                        <button
                            onClick={handleNext}
                            disabled={!hasNext || isLoading}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-emerald-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                ) : (hasPrev || hasNext) ? (
                    <div className="mt-2 flex items-center justify-center gap-3 shrink-0 pt-2 pb-2">
                        <button
                            onClick={handlePrev}
                            disabled={!hasPrev || isLoading}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-emerald-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        <span className="flex h-10 w-10 items-center justify-center text-sm font-semibold text-slate-600">
                            {currentPage}
                        </span>

                        <button
                            onClick={handleNext}
                            disabled={!hasNext || isLoading}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-emerald-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                ) : null}
            </main>
        </div>
    )
}
