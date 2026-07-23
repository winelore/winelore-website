"use client"

import React, { useState, useEffect } from "react"
import { FileText, Trophy, Wine, User, Layers, CheckCircle, Clock, ChevronRight, Activity, CalendarDays, ClipboardList, PlayCircle, AlertCircle, Calendar, Timer } from "lucide-react"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { TranslatedText } from "@/lib/i18n/TranslatedText"
import Link from "next/link"
import { useUsernames } from "@/hooks/useUsernames"

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
            return "bg-slate-50 border-slate-100"
        default:
            return "bg-slate-50 border-slate-100"
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

function CompetitionCard({ competition, usernames }: { competition: any; usernames: Record<string, string> }) {
    const [isMounted, setIsMounted] = useState(false)
    const { t } = useTranslation()

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
            className="group bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100 flex flex-col min-h-[140px]"
        >
            <div className="flex items-start gap-3">
                <AvatarPlaceholder className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                        {competition.name}
                    </h3>
                    <p className="text-xs mt-1">
                        <span className={`font-medium ${getStatusColor(competition.status)}`}>
                            {formatStatus(competition.status)}
                        </span>
                        {isMounted && timeRemaining && <span className="text-slate-400"> | {timeRemaining}</span>}
                    </p>
                </div>
            </div>
            {competition.description && (
                <p className="mt-3 text-xs leading-relaxed text-slate-500 line-clamp-2">
                    <TranslatedText text={competition.description} />
                </p>
            )}
            
            <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                {competition.series?.name && (
                    <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" />
                        <span>{competition.series.name}</span>
                    </div>
                )}
                {competition.holder && competition.holder.length > 0 && (
                    <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        <span>{t("dashboard.holderId", { ids: competition.holder.map((id: number) => usernames[id] || String(id)).join(", ") })}</span>
                    </div>
                )}
            </div>
        </Link>
    )
}

function BeverageCard({ bev, typeMap }: { bev: any; typeMap?: Record<string, string> }) {
    const { formatBeverageType } = useTranslation()
    
    const typeCode = (typeMap && bev.typeId && typeMap[bev.typeId]) || bev.type
    const displayType = typeCode ? formatBeverageType(typeCode) : null

    return (
        <Link
            href={`/beverage/${bev.id}`}
            className="group bg-white border border-slate-100 rounded-[24px] p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100 flex items-center gap-4"
        >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <Wine className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
                {displayType && (
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                        {displayType}
                    </span>
                )}
                <h3 className="text-sm font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                    {bev.name}
                </h3>
            </div>
        </Link>
    )
}

function CommissionCard({ commission }: { commission: any }) {
    const [timeStr, setTimeStr] = useState<string>("")
    const { t } = useTranslation()

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const updateTime = () => {
            if (commission.status === "STARTED" && commission.startedAt) {
                const start = new Date(commission.startedAt).getTime()
                const now = new Date().getTime()
                const diff = Math.max(0, now - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                const time = hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes })
                setTimeStr(`${time} ${seconds}s`)
            } else if (commission.status === "COMPLETED" && commission.startedAt && commission.endedAt) {
                const start = new Date(commission.startedAt).getTime()
                const end = new Date(commission.endedAt).getTime()
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

        if (commission.status === "STARTED") {
            intervalId = setInterval(updateTime, 1000)
        }

        return () => clearInterval(intervalId)
    }, [commission.status, commission.startedAt, commission.endedAt, t])

    return (
        <Link
            href={`/commission/${commission.id}`}
            className="group bg-white border border-slate-100 rounded-[24px] p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100 flex flex-col min-h-[140px]"
        >
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Activity className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 truncate block">
                        {commission.competition?.name}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                        {commission.name}
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(commission.status)} ${getStatusBgColor(commission.status)} border`}>
                    {commission.status === "STARTED" ? <PlayCircle className="w-3 h-3" /> :
                        commission.status === "COMPLETED" ? <CheckCircle className="w-3 h-3" /> :
                            commission.status === "CANCELLED" ? <AlertCircle className="w-3 h-3" /> :
                                <Calendar className="w-3 h-3" />}
                    {formatStatus(commission.status)}
                </span>
                {timeStr && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <Timer className="w-3 h-3" />
                        {timeStr}
                    </div>
                )}
            </div>
        </Link>
    )
}

function TemplateCard({ template }: { template: any }) {
    return (
        <Link
            href={`/templates?templateId=${template.id}-${template.latestEdition?.version || 0}`}
            className="group bg-white border border-slate-100 rounded-[24px] p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100 flex items-center gap-4"
        >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <ClipboardList className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {template.beverageType && (
                        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                            {template.beverageType}
                        </span>
                    )}
                    {template.latestEdition?.version && (
                        <span className="text-[10px] font-bold tracking-widest text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                            v{template.latestEdition.version}
                        </span>
                    )}
                </div>
                <h3 className="text-sm font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                    {template.name}
                </h3>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
        </Link>
    )
}

export default function HomeClientView({
    recentCompetitions,
    myCommissions,
    recentBeverages,
    myTemplates,
    beverageTypesMap
}: {
    recentCompetitions: any[];
    myCommissions: any[];
    recentBeverages: any[];
    myTemplates: any[];
    beverageTypesMap: Record<string, string>;
}) {
    // Collect AUIDs for username fetching
    const auidsToFetch = React.useMemo(() => {
        const ids = new Set<string>()
        recentCompetitions.forEach(c => {
            if (c.holder) {
                c.holder.forEach((id: number) => ids.add(String(id)))
            }
        })
        return Array.from(ids)
    }, [recentCompetitions])

    const { usernames } = useUsernames(auidsToFetch)
    const { t } = useTranslation()

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="home" />

            <main className="flex-1 overflow-auto p-4 lg:p-8">
                <div className="max-w-7xl mx-auto flex flex-col gap-6">
                    
                    {/* Welcome Banner */}
                    <div className="relative overflow-hidden rounded-[32px] bg-white border border-slate-100 p-8 shadow-sm">
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">{t("dashboard.welcomeTitle")}</h1>
                                <p className="text-slate-500 font-medium">{t("dashboard.welcomeSubtitle")}</p>
                            </div>
                        </div>
                        {/* Decorative background shapes for clean light theme */}
                        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-50/50 blur-3xl pointer-events-none"></div>
                        <div className="absolute -bottom-20 right-40 h-48 w-48 rounded-full bg-violet-50/50 blur-2xl pointer-events-none"></div>
                    </div>

                    {/* Bento Box Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Competitions (Priority - spans 2 columns on desktop) */}
                        <div className="lg:col-span-2 flex flex-col gap-4">
                            <div className="flex items-center gap-2 px-2">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">{t("dashboard.myCompetitions")}</h2>
                            </div>
                            
                            {recentCompetitions.length > 0 ? (
                                <div className="bg-white border border-slate-100 rounded-[32px] p-5 shadow-sm h-full flex flex-col">
                                    <div className="grid gap-4 sm:grid-cols-2 flex-1">
                                        {recentCompetitions.slice(0, 8).map(comp => (
                                            <CompetitionCard key={comp.id} competition={comp} usernames={usernames} />
                                        ))}
                                    </div>
                                    <div className="mt-5 flex justify-center border-t border-slate-50 pt-5">
                                        <Link href="/myCompetitions" className="px-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-indigo-600 text-sm font-bold rounded-full transition-colors flex items-center gap-2">
                                            {t("dashboard.viewAll")}
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white border border-slate-100 rounded-[32px] p-8 text-center shadow-sm flex flex-col items-center justify-center h-full min-h-[200px]">
                                    <Trophy className="w-10 h-10 text-slate-200 mb-3" />
                                    <p className="text-sm font-medium text-slate-500">{t("dashboard.noRecentCompetitions")}</p>
                                </div>
                            )}
                        </div>

                        {/* Templates (Utility - spans 1 column) */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 px-2">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                                    <ClipboardList className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">{t("dashboard.myTemplates")}</h2>
                            </div>
                            
                            {myTemplates.length > 0 ? (
                                <div className="bg-white border border-slate-100 rounded-[32px] p-4 shadow-sm h-full flex flex-col">
                                    <div className="flex flex-col gap-3 flex-1">
                                        {myTemplates.slice(0, 8).map((template, idx) => (
                                            <TemplateCard key={`${template.id}-${idx}`} template={template} />
                                        ))}
                                    </div>
                                    <div className="mt-5 flex justify-center border-t border-slate-50 pt-5">
                                        <Link href="/templates" className="px-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-amber-600 text-sm font-bold rounded-full transition-colors flex items-center gap-2">
                                            {t("dashboard.viewAll")}
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white border border-slate-100 rounded-[32px] p-8 text-center shadow-sm flex flex-col items-center justify-center h-full min-h-[200px]">
                                    <FileText className="w-10 h-10 text-slate-200 mb-3" />
                                    <p className="text-sm font-medium text-slate-500">{t("dashboard.noTemplates")}</p>
                                </div>
                            )}
                        </div>

                        {/* Active Commissions */}
                        <div className="lg:col-span-2 flex flex-col gap-4">
                            <div className="flex items-center gap-2 px-2">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">{t("dashboard.activeCommissions")}</h2>
                            </div>
                            
                            {myCommissions.length > 0 ? (
                                <div className="bg-white border border-slate-100 rounded-[32px] p-4 shadow-sm h-full flex flex-col">
                                    <div className="grid gap-3 sm:grid-cols-2 flex-1">
                                        {myCommissions.slice(0, 8).map(comm => (
                                            <CommissionCard key={comm.id} commission={comm} />
                                        ))}
                                    </div>
                                    <div className="mt-5 flex justify-center border-t border-slate-50 pt-5">
                                        <Link href="/myCommissions" className="px-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-emerald-600 text-sm font-bold rounded-full transition-colors flex items-center gap-2">
                                            {t("dashboard.viewAll")}
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white border border-slate-100 rounded-[32px] p-8 text-center shadow-sm flex flex-col items-center justify-center h-full min-h-[200px]">
                                    <CheckCircle className="w-10 h-10 text-slate-200 mb-3" />
                                    <p className="text-sm font-medium text-slate-500">{t("dashboard.noActiveCommissions")}</p>
                                </div>
                            )}
                        </div>

                        {/* Beverages */}
                        <div className="lg:col-span-1 flex flex-col gap-4">
                            <div className="flex items-center gap-2 px-2">
                                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                                    <Wine className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">{t("dashboard.myBeverages")}</h2>
                            </div>
                            
                            {recentBeverages.length > 0 ? (
                                <div className="bg-white border border-slate-100 rounded-[32px] p-5 shadow-sm h-full flex flex-col">
                                    <div className="flex flex-col gap-4 flex-1">
                                        {recentBeverages.slice(0, 8).map(bev => (
                                            <BeverageCard key={bev.id} bev={bev} typeMap={beverageTypesMap} />
                                        ))}
                                    </div>
                                    <div className="mt-5 flex justify-center border-t border-slate-50 pt-5">
                                        <Link href="/myBeverages" className="px-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-rose-600 text-sm font-bold rounded-full transition-colors flex items-center gap-2">
                                            {t("dashboard.viewAll")}
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white border border-slate-100 rounded-[32px] p-8 text-center shadow-sm flex flex-col items-center justify-center h-full min-h-[200px]">
                                    <Wine className="w-10 h-10 text-slate-200 mb-3" />
                                    <p className="text-sm font-medium text-slate-500">{t("dashboard.noRecentBeverages")}</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>
        </div>
    )
}
