"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Wine } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { ListPageShell, ListPageHeader, Pagination, StateCard, BeverageCard } from "@/components/list"

// ====================================================================
// INTERFACES
// ====================================================================
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

interface InitialData {
    beverages: Beverage[]
}

interface MyBeveragesProps {
    initialData: InitialData
    beverageTypesMap?: Record<string, string>
    currentPage: number
    totalPages: number
    totalCount: number
    hasError?: boolean
}

export default function MyBeveragesClientView({ initialData, beverageTypesMap, currentPage, totalPages, totalCount, hasError = false }: MyBeveragesProps) {
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
        <ListPageShell activeTab="beverages" isLoading={isLoading}>
            <ListPageHeader
                title={t("myBeverages.title")}
                subtitle={t("myBeverages.subtitle")}
                countLabel={tCount("common.beveragesCount", totalCount)}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {hasError && (
                    <StateCard variant="error" title={t("myBeverages.errorTitle")} description={t("myBeverages.errorDescription")} />
                )}

                {!hasError && initialData.beverages.map((bev) => (
                    <BeverageCard key={bev.id} beverage={bev} typeMap={beverageTypesMap} />
                ))}

                {!hasError && initialData.beverages.length === 0 && (
                    <StateCard variant="empty" icon={Wine} title={t("myBeverages.emptyTitle")} description={t("myBeverages.emptyDescription")} />
                )}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} isLoading={isLoading} onPageChange={handleJumpToPage} />
        </ListPageShell>
    )
}
