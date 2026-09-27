"use client"

import { useState, useEffect } from "react"
import { Layers, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"
import {
    ListPageShell,
    ListPageHeader,
    Pagination,
    StateCard,
    CompetitionSeriesCard,
    type CompetitionSeriesCardData,
} from "@/components/list"

interface Series extends CompetitionSeriesCardData {
    owners?: number[][]
    countriesCodes?: string[] | null
}

interface InitialData {
    series: Series[]
}

interface MyCompetitionSeriesProps {
    initialData: InitialData
    currentPage: number
    totalPages?: number
    totalCount?: number
    hasError?: boolean
    isOwner?: boolean
}

export default function MyCompetitionSeriesClientView({
    initialData,
    currentPage,
    totalPages = 1,
    totalCount = 0,
    hasError = false,
    isOwner = false,
}: MyCompetitionSeriesProps) {
    const { t, tCount } = useTranslation()
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(false)

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
                titleIcon={<Layers className="w-8 h-8 text-indigo-600" />}
                title={t("myCompetitionSeries.title")}
                subtitle={t("myCompetitionSeries.subtitle")}
                countLabel={tCount("common.seriesCount", totalCount)}
                actions={
                    isOwner ? (
                        <Link
                            href="/competitionSeries/create"
                            className="min-w-0 flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-3 text-sm font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer transform active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{t("myCompetitionSeries.createButton")}</span>
                        </Link>
                    ) : undefined
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {hasError && (
                    <StateCard
                        variant="error"
                        title={t("myCompetitionSeries.errorTitle")}
                        description={t("myCompetitionSeries.errorDescription")}
                    />
                )}

                {!hasError &&
                    initialData.series.map((s) => (
                        <CompetitionSeriesCard
                            key={s.id}
                            series={{
                                id: s.id,
                                name: s.name,
                                status: s.status,
                                countriesType: s.countriesType,
                                createdAt: s.createdAt,
                            }}
                        />
                    ))}

                {!hasError && initialData.series.length === 0 && (
                    <StateCard
                        variant="empty"
                        icon={Layers}
                        title={t("myCompetitionSeries.emptyTitle")}
                        description={t("myCompetitionSeries.emptyDescription")}
                    />
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                isLoading={isLoading}
                onPageChange={handleJumpToPage}
            />
        </ListPageShell>
    )
}