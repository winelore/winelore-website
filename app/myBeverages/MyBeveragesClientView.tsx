"use client"

import { useState, useEffect } from "react"
import Cookies from "js-cookie"
import { useRouter, usePathname } from "next/navigation"
import { Wine, Tag, CheckCircle, AlertCircle, MapPin } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { ListPageShell, ListPageHeader, Pagination, StateCard, StatusBadge, EntityCardLink, type StatusColorScheme } from "@/components/list"

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
    producers: ProducerDetails[]
    originParts?: string[]
}

interface InitialData {
    beverages: Beverage[]
}

interface MyBeveragesProps {
    initialData: InitialData
    currentPage: number
    totalPages: number
    totalCount: number
    hasError?: boolean
}

function beverageStatusAppearance(status: BeverageStatus): { colorScheme: StatusColorScheme; icon: typeof Tag } {
    if (status === "APPROVED" || status === "PUBLISHED") return { colorScheme: "emerald", icon: CheckCircle }
    if (status === "SUSPENDED") return { colorScheme: "rose", icon: AlertCircle }
    return { colorScheme: "amber", icon: Tag }
}

function BeverageCard({ bev }: { bev: Beverage }) {
    const { formatStatus, formatBeverageType, t } = useTranslation()
    const { colorScheme, icon } = beverageStatusAppearance(bev.status)

    return (
        <EntityCardLink href={`/beverage/${bev.id}`}>
            <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Wine className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                        {formatBeverageType(bev.type || "WINE")}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                        {bev.name}
                    </h3>
                    {bev.originParts && bev.originParts.length > 0 && (
                        <p className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 truncate">
                            <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span className="font-medium text-slate-600">{t("myBeverages.origin")}</span>
                            <span>{bev.originParts.join(", ")}</span>
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4">
                <StatusBadge colorScheme={colorScheme} icon={icon} label={formatStatus(bev.status)} />
                <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[50%]">
                    ID: {bev.id.slice(-6)}
                </span>
            </div>
        </EntityCardLink>
    )
}

export default function MyBeveragesClientView({ initialData, currentPage, totalPages, totalCount, hasError = false }: MyBeveragesProps) {
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
                title={t("myBeverages.title")}
                subtitle={t("myBeverages.subtitle")}
                countLabel={tCount("common.beveragesCount", totalCount)}
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {hasError && (
                    <StateCard variant="error" title={t("myBeverages.errorTitle")} description={t("myBeverages.errorDescription")} />
                )}

                {!hasError && initialData.beverages.map((bev) => (
                    <BeverageCard key={bev.id} bev={bev} />
                ))}

                {!hasError && initialData.beverages.length === 0 && (
                    <StateCard variant="empty" icon={Wine} title={t("myBeverages.emptyTitle")} description={t("myBeverages.emptyDescription")} />
                )}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} isLoading={isLoading} onPageChange={handleJumpToPage} />
        </ListPageShell>
    )
}
