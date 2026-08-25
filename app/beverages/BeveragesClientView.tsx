"use client"

import { useState, useEffect } from "react"
import { Wine } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { useRouter, usePathname } from "next/navigation"
import { ListPageShell, ListPageHeader, Pagination, StateCard, EntityCardLink } from "@/components/list"

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

function BeverageCard({ bev, typeMap }: { bev: Beverage; typeMap?: Record<string, string> }) {
    const { formatBeverageType } = useTranslation()

    // Fallback: If we have a typeMap and bev.typeId, use the mapped code.
    // Otherwise, try the old bev.type. Pass the code to formatBeverageType for translation.
    const typeCode = (typeMap && bev.typeId && typeMap[bev.typeId]) || bev.type
    const displayType = typeCode ? formatBeverageType(typeCode) : null

    return (
        <EntityCardLink href={`/beverage/${bev.id}`} padding="compact" layout="row">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <Wine className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
                {displayType && (
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                        {displayType}
                    </span>
                )}
                <h3 className="text-lg font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                    {bev.name}
                </h3>
            </div>
        </EntityCardLink>
    )
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

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {!hasError && beveragesToDisplay.map((bev) => (
                    <BeverageCard
                        key={bev.id}
                        bev={bev}
                        typeMap={beverageTypesMap}
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
