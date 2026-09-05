"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Wine, Plus } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
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

    const allProducerAuids = useMemo(
        () => Array.from(new Set(initialData.beverages.flatMap((bev) => (bev.producers || []).flatMap((p) => p.auid || [])))),
        [initialData.beverages],
    )
    const { usernames } = useUsernames(allProducerAuids)

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
                actions={
                    <Link
                        href="/beverage/create"
                        className="min-w-0 flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-3 text-sm font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer transform active:scale-95 shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t("myBeverages.createButton", { defaultValue: "Створити напій" })}</span>
                    </Link>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {hasError && (
                    <StateCard variant="error" title={t("myBeverages.errorTitle")} description={t("myBeverages.errorDescription")} />
                )}

                {!hasError && initialData.beverages.map((bev) => (
                    <BeverageCard key={bev.id} beverage={bev} typeMap={beverageTypesMap} usernames={usernames} />
                ))}

                {!hasError && initialData.beverages.length === 0 && (
                    <StateCard variant="empty" icon={Wine} title={t("myBeverages.emptyTitle")} description={t("myBeverages.emptyDescription")} />
                )}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} isLoading={isLoading} onPageChange={handleJumpToPage} />
        </ListPageShell>
    )
}
