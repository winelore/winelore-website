"use client"

import { useState, useEffect, useMemo } from "react"
import { User, Layers } from "lucide-react"
import { AvatarPlaceholder } from "@/components/AvatarPlaceholder"
import { formatTimeRemaining, competitionStatusTextColor } from "@/lib/competitionTiming"
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
                    <h3 className="text-lg font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                        {competition.name}
                    </h3>
                    <p className="text-sm">
                        <span className={`font-medium ${competitionStatusTextColor(competition.status)}`}>
                            {formatStatus(competition.status)}
                        </span>
                        {/* Render time remaining only after client mount */}
                        {isMounted && timeRemaining && <span className="text-slate-400"> | {timeRemaining}</span>}
                    </p>
                </div>
            </div>
            {competition.description && (
                <p className="mt-3 text-sm leading-relaxed text-slate-500 line-clamp-2">
                    <TranslatedText text={competition.description} />
                </p>
            )}
            <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
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

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
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
