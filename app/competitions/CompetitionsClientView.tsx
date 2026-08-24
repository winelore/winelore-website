"use client"

import { useState, useEffect, useMemo } from "react"
import { User, Layers } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { TranslatedText } from "@/lib/i18n/TranslatedText"
import { useRouter, usePathname } from "next/navigation"
import { useUsernames } from "@/hooks/useUsernames"
import { ListPageShell, ListPageHeader, Pagination, StateCard, EntityCardLink } from "@/components/list"

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
    totalCount?: number
    hasError?: boolean
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
        <EntityCardLink href={`/competition/${competition.id}`} padding="compact">
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
        </EntityCardLink>
    )
}

export default function CompetitionsClientView({
                                              initialCompetitions,
                                              currentPage,
                                              totalPages = 1,
                                              totalCount = 0,
                                              hasError = false
                                          }: DashboardProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { t, tCount } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)

    // Fetch usernames for all competition holders on the dashboard
    const allHolderAuids = useMemo(() => {
        return Array.from(new Set(initialCompetitions.flatMap(c => c.holder || [])))
    }, [initialCompetitions])
    const { usernames } = useUsernames(allHolderAuids)

    const handleJumpToPage = (pageNumber: number) => {
        setIsLoading(true)
        router.push(`${pathname}?page=${pageNumber}`)
    }

    useEffect(() => {
        setIsLoading(false)
    }, [initialCompetitions])

    return (
        <ListPageShell activeTab="competitions" isLoading={isLoading}>
            <ListPageHeader
                title={t("common.competitions")}
                countLabel={tCount("common.competitionsCount", totalCount)}
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {hasError && (
                    <StateCard variant="error" title={t("competitions.errorTitle")} description={t("competitions.errorDescription")} />
                )}

                {!hasError && initialCompetitions.length === 0 && (
                    <StateCard variant="empty" icon={Layers} title={t("competitions.emptyTitle")} description={t("competitions.emptyDescription")} />
                )}

                {!hasError && initialCompetitions.map((competition) => (
                    <CompetitionCard
                        key={competition.id}
                        competition={competition}
                        usernames={usernames}
                    />
                ))}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} isLoading={isLoading} onPageChange={handleJumpToPage} />
        </ListPageShell>
    )
}
