"use client"

import { useState, useEffect } from "react"
import { Activity } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"
import { ListPageShell, ListPageHeader, Pagination, StateCard, CommissionCard } from "@/components/list"

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
                title={t("myCommissions.title")}
                subtitle={t("myCommissions.subtitle")}
                countLabel={tCount("common.commissionsCount", totalCount)}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {hasError && (
                    <StateCard variant="error" title={t("myCommissions.errorTitle")} description={t("myCommissions.errorDescription")} />
                )}

                {!hasError && initialData.commissions.map((comm) => (
                    <CommissionCard key={comm.id} commission={comm} />
                ))}

                {!hasError && initialData.commissions.length === 0 && (
                    <StateCard variant="empty" icon={Activity} title={t("myCommissions.emptyTitle")} description={t("myCommissions.emptyDescription")} />
                )}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} isLoading={isLoading} onPageChange={handleJumpToPage} />
        </ListPageShell>
    )
}
