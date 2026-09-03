"use client"

import { useState, useEffect, useMemo } from "react"
import { Layers } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { useRouter, usePathname } from "next/navigation"
import { useUsernames } from "@/hooks/useUsernames"
import { ListPageShell, ListPageHeader, Pagination, StateCard, CompetitionCard } from "@/components/list"

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
                        density="compact"
                    />
                ))}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} isLoading={isLoading} onPageChange={handleJumpToPage} />
        </ListPageShell>
    )
}
