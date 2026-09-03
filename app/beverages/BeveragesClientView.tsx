"use client"

import { useState, useEffect } from "react"
import { Wine } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { useRouter, usePathname } from "next/navigation"
import { ListPageShell, ListPageHeader, Pagination, StateCard, BeverageCard } from "@/components/list"

interface DashboardProps {
    initialBeverages?: any[]
    beverageTypesMap?: Record<string, string>
    currentPage?: number
    totalPages?: number
    totalCount?: number
    hasError?: boolean
}

type BeverageStatus = "APPROVED" | "DRAFT" | "PUBLISHED" | "SUBMITTED" | "SUSPENDED"

interface ProducerDetails {
    id: string
    auid: number[]
    role: "DISTRIBUTOR" | "MAKER" | "OWNER"
}

interface Beverage {
    id: string
    name: string
    status: BeverageStatus
    type?: string
    typeId?: string
    producers: ProducerDetails[]
    originParts?: string[]
}

export default function BeveragesClientView({
                                              initialBeverages,
                                              beverageTypesMap,
                                              currentPage = 1,
                                              totalPages = 0,
                                              totalCount = 0,
                                              hasError = false
                                          }: DashboardProps) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const { t, tCount } = useTranslation()

    const changeBeveragePage = (newPage: number) => {
        setIsLoading(true)
        router.push(`${pathname}?page=${newPage}`)
    }

    const beveragesToDisplay = initialBeverages || []

    useEffect(() => {
        setIsLoading(false)
    }, [initialBeverages])

    return (
        <ListPageShell activeTab="beverages" isLoading={isLoading}>
            <ListPageHeader
                title={t("common.beverages")}
                countLabel={tCount("common.beveragesCount", totalCount)}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {!hasError && beveragesToDisplay.map((bev) => (
                    <BeverageCard
                        key={bev.id}
                        beverage={bev}
                        typeMap={beverageTypesMap}
                        density="compact"
                    />
                ))}

                {hasError && (
                    <StateCard variant="error" title={t("beverages.errorTitle")} description={t("beverages.errorDescription")} />
                )}

                {!hasError && beveragesToDisplay.length === 0 && (
                    <StateCard variant="empty" icon={Wine} title={t("beverages.emptyTitle")} description={t("beverages.emptyDescription")} />
                )}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} isLoading={isLoading} onPageChange={changeBeveragePage} />
        </ListPageShell>
    )
}
