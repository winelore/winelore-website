"use client"

import { useState, useEffect, useMemo } from "react"
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { useRouter, usePathname } from "next/navigation"
import { useUsernames } from "@/hooks/useUsernames"
import {
    ListPageShell,
    ListPageHeader,
    StateCard,
    OutcomePolicyCard,
    type OutcomePolicyCardData,
} from "@/components/list"

interface OutcomePoliciesClientViewProps {
    initialPolicies: OutcomePolicyCardData[]
    nextCursor: string | null
    nextHistory: string
    prevCursor: string | null
    prevHistory: string
    hasPrev: boolean
    hasNext: boolean
    currentPage: number
    totalPages?: number
    totalCount?: number
    hasError?: boolean
}

export default function OutcomePoliciesClientView({
    initialPolicies,
    nextCursor,
    nextHistory,
    prevCursor,
    prevHistory,
    hasPrev,
    hasNext,
    currentPage,
    totalPages,
    totalCount = 0,
    hasError = false,
}: OutcomePoliciesClientViewProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { t, tCount } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)

    const allOwnerAuids = useMemo(() => {
        return Array.from(new Set(initialPolicies.flatMap((policy) => (policy.owners || []).flat())))
    }, [initialPolicies])
    const { usernames } = useUsernames(allOwnerAuids)

    const handleNext = () => {
        if (!hasNext || !nextCursor) return
        setIsLoading(true)
        router.push(`${pathname}?cursor=${nextCursor}&h=${nextHistory}`)
    }

    const handlePrev = () => {
        if (!hasPrev) return
        setIsLoading(true)
        if (!prevCursor) {
            router.push(pathname)
        } else {
            const histParam = prevHistory ? `&h=${prevHistory}` : ""
            router.push(`${pathname}?cursor=${prevCursor}${histParam}`)
        }
    }

    useEffect(() => {
        setIsLoading(false)
    }, [initialPolicies])

    return (
        <ListPageShell activeTab="none" isLoading={isLoading}>
            <ListPageHeader
                titleIcon={<ScrollText className="w-8 h-8 text-indigo-600" />}
                title={t("common.outcomePolicies")}
                countLabel={tCount("common.outcomePoliciesCount", totalCount)}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {hasError && (
                    <StateCard
                        variant="error"
                        title={t("outcomePolicies.errorTitle")}
                        description={t("outcomePolicies.errorDescription")}
                    />
                )}

                {!hasError && initialPolicies.length === 0 && (
                    <StateCard
                        variant="empty"
                        icon={ScrollText}
                        title={t("outcomePolicies.emptyTitle")}
                        description={t("outcomePolicies.emptyDescription")}
                    />
                )}

                {!hasError &&
                    initialPolicies.map((policy) => (
                        <OutcomePolicyCard
                            key={policy.id}
                            policy={policy}
                            usernames={usernames}
                            density="compact"
                        />
                    ))}
            </div>

            {(hasPrev || hasNext) && (
                <div className="flex items-center justify-center gap-3 shrink-0 pt-2 pb-2">
                    <button
                        onClick={handlePrev}
                        disabled={!hasPrev || isLoading}
                        aria-label={t("common.previous")}
                        className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <span className="flex h-10 px-3 items-center justify-center text-sm font-semibold text-slate-600">
                        {totalPages ? t("common.pageOf", { current: currentPage, total: totalPages }) : currentPage}
                    </span>

                    <button
                        onClick={handleNext}
                        disabled={!hasNext || isLoading}
                        aria-label={t("common.next")}
                        className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            )}
        </ListPageShell>
    )
}
