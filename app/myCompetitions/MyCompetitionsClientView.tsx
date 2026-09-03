"use client"

import { useState, useEffect } from "react"
import { Trophy, Timer, Calendar, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"
import { getDateLocale } from "@/lib/i18n"
import { ListPageShell, ListPageHeader, Pagination, StateCard, StatusBadge, EntityCardLink, competitionStatusAppearance } from "@/components/list"

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

function CompetitionCard({ comp }: { comp: Competition }) {
    const [timeStr, setTimeStr] = useState<string>("")
    const { t, formatStatus, locale } = useTranslation()
    const { colorScheme, icon } = competitionStatusAppearance(comp.status)

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const updateTime = () => {
            if (comp.status === "STARTED" && comp.startedAt) {
                const start = new Date(comp.startedAt).getTime()
                const now = new Date().getTime()
                const diff = Math.max(0, now - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                setTimeStr(t("time.durationHoursMinutes", { hours, minutes }))

            } else if (comp.status === "COMPLETED" && comp.startedAt && comp.endedAt) {
                const start = new Date(comp.startedAt).getTime()
                const end = new Date(comp.endedAt).getTime()
                const diff = Math.max(0, end - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                setTimeStr(t("time.lasted", { time: t("time.durationHoursMinutes", { hours, minutes }) }))

            } else if (comp.status === "PLANNED" && comp.plannedDates?.start) {
                const date = new Date(comp.plannedDates.start)
                const formattedDate = new Intl.DateTimeFormat(getDateLocale(locale), {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }).format(date)
                setTimeStr(t("time.planned", { date: formattedDate }))
            } else {
                setTimeStr("")
            }
        }

        updateTime()
        if (comp.status === "STARTED") {
            intervalId = setInterval(updateTime, 60000)
        }
        return () => clearInterval(intervalId)
    }, [comp.status, comp.startedAt, comp.endedAt, comp.plannedDates, t, locale])

    return (
        <EntityCardLink href={`/competition/${comp.id}`}>
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Trophy className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 truncate block">
                        {comp.series?.name || t("common.independent")}
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                        {comp.name}
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4">
                <StatusBadge
                    colorScheme={colorScheme}
                    icon={icon}
                    label={formatStatus(comp.status)}
                    trailing={timeStr || undefined}
                    trailingIcon={comp.status === "PLANNED" ? Calendar : Timer}
                />
            </div>
        </EntityCardLink>
    )
}

export default function MyCompetitionsClientView({ initialData, currentPage, totalPages = 1, totalCount = 0, hasError = false }: MyCompetitionsProps) {
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
                    <CompetitionCard key={comp.id} comp={comp} />
                ))}

                {!hasError && initialData.competitions.length === 0 && (
                    <StateCard variant="empty" icon={Trophy} title={t("myCompetitions.emptyTitle")} description={t("myCompetitions.emptyDescription")} />
                )}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} isLoading={isLoading} onPageChange={handleJumpToPage} />
        </ListPageShell>
    )
}
