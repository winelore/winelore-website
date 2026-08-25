"use client"

import { useState, useEffect } from "react"
import { Activity, PlayCircle, CheckCircle, AlertCircle, Calendar, Timer } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"
import { ListPageShell, ListPageHeader, Pagination, StateCard, StatusBadge, EntityCardLink, type StatusColorScheme } from "@/components/list"

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
    currentPage: number
    totalPages?: number
    totalCount?: number
    hasError?: boolean
}

function commissionStatusAppearance(status: CommissionStatus): { colorScheme: StatusColorScheme; icon: typeof Calendar } {
    if (status === "STARTED") return { colorScheme: "emerald", icon: PlayCircle }
    if (status === "COMPLETED") return { colorScheme: "slate", icon: CheckCircle }
    if (status === "CANCELLED") return { colorScheme: "rose", icon: AlertCircle }
    return { colorScheme: "amber", icon: Calendar }
}

function CommissionCard({ comm }: { comm: Commission }) {
    const [timeStr, setTimeStr] = useState<string>("")
    const { t, formatStatus } = useTranslation()
    const { colorScheme, icon } = commissionStatusAppearance(comm.status)

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
        <EntityCardLink href={`/commission/${comm.id}`}>
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Activity className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 truncate block">
                        {comm.competition.name}
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                        {comm.name}
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4">
                <StatusBadge
                    colorScheme={colorScheme}
                    icon={icon}
                    label={formatStatus(comm.status)}
                    trailing={timeStr || undefined}
                    trailingIcon={Timer}
                />
            </div>
        </EntityCardLink>
    )
}

export default function MyCommissionsClientView({ initialData, currentPage, totalPages = 1, totalCount = 0, hasError = false }: MyCommissionsProps) {
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
        <ListPageShell activeTab="none" isLoading={isLoading}>
            <ListPageHeader
                title={t("common.myCommissions")}
                subtitle={t("myCommissions.subtitle")}
                countLabel={tCount("common.commissionsCount", totalCount)}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {hasError && (
                    <StateCard variant="error" title={t("myCommissions.errorTitle")} description={t("myCommissions.errorDescription")} />
                )}

                {!hasError && initialData.commissions.map((comm) => (
                    <CommissionCard key={comm.id} comm={comm} />
                ))}

                {!hasError && initialData.commissions.length === 0 && (
                    <StateCard variant="empty" icon={Activity} title={t("myCommissions.emptyTitle")} description={t("myCommissions.emptyDescription")} />
                )}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} isLoading={isLoading} onPageChange={handleJumpToPage} />
        </ListPageShell>
    )
}
