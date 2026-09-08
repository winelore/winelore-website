"use client"

import { useState, useEffect, useMemo } from "react"
import { Trophy, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
import { ListPageShell, ListPageHeader, Pagination, StateCard, CompetitionCard } from "@/components/list"

// ====================================================================
// INTERFACES
// ====================================================================
type CompetitionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PLANNED" | "STARTED" | "COMPLETED" | "CANCELLED"

interface Series {
    id: string
    name: string
}

interface Competition {
    id: string
    name: string
    status: CompetitionStatus
    startedAt: string | null
    endedAt: string | null
    plannedDates: {
        start: string | null
        end: string | null
    } | null
    series: Series
    holders: number[][]
}

interface InitialData {
    competitions: Competition[]
}

interface MyCompetitionsProps {
    initialData: InitialData
    currentPage: number
    totalPages?: number
    totalCount?: number
    hasError?: boolean
}

export default function MyCompetitionsClientView({ initialData, currentPage, totalPages = 1, totalCount = 0, hasError = false }: MyCompetitionsProps) {
    const { t, tCount } = useTranslation()
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(false)

    const allHolderAuids = useMemo(
        () => Array.from(new Set(initialData.competitions.flatMap((comp) => (comp.holders || []).flat()))),
        [initialData.competitions],
    )
    const { usernames } = useUsernames(allHolderAuids)

    const handleJumpToPage = (pageNumber: number) => {
        setIsLoading(true)
        router.push(`${pathname}?page=${pageNumber}`)
    }

    useEffect(() => {
        setIsLoading(false)
    }, [initialData])

    return (
        <ListPageShell activeTab="competitions" isLoading={isLoading}>
            <ListPageHeader
                title={t("myCompetitions.title")}
                subtitle={t("myCompetitions.subtitle")}
                countLabel={tCount("common.competitionsCount", totalCount)}
                actions={
                    <Link
                        href="/competition/create"
                        className="min-w-0 flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-3 text-sm font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer transform active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t("myCompetitions.createButton")}</span>
                    </Link>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {hasError && (
                    <StateCard variant="error" title={t("myCompetitions.errorTitle")} description={t("myCompetitions.errorDescription")} />
                )}

                {!hasError && initialData.competitions.map((comp) => (
                    <CompetitionCard
                        key={comp.id}
                        competition={{
                            ...comp,
                            plannedStartAt: comp.plannedDates?.start ?? null,
                            plannedEndAt: comp.plannedDates?.end ?? null,
                            holder: (comp.holders || []).flat(),
                        }}
                        usernames={usernames}
                    />
                ))}

                {!hasError && initialData.competitions.length === 0 && (
                    <StateCard variant="empty" icon={Trophy} title={t("myCompetitions.emptyTitle")} description={t("myCompetitions.emptyDescription")} />
                )}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} isLoading={isLoading} onPageChange={handleJumpToPage} />
        </ListPageShell>
    )
}
