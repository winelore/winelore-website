"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import Link from "next/link"
import { ScrollText, Calendar, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"
import { getDateLocale } from "@/lib/i18n"
import { AppHeader } from "@/components/AppHeader"

// ====================================================================
// INTERFACES
// ====================================================================
interface OutcomePolicy {
    id: string
    name: string
    createdAt: string
}

interface InitialData {
    outcomePolicies: OutcomePolicy[]
}

interface MyOutcomePoliciesProps {
    initialData: InitialData
    nextCursor: string | null
    nextHistory: string
    prevCursor: string | null
    prevHistory: string
    hasPrev: boolean
    hasNext: boolean
    currentPage: number
    totalCount?: number
}

function OutcomePolicyCard({ policy }: { policy: OutcomePolicy }) {
    const { locale } = useTranslation()

    const formattedDate = new Intl.DateTimeFormat(getDateLocale(locale), {
        month: "short", day: "numeric", year: "numeric"
    }).format(new Date(policy.createdAt))

    return (
        <Link
            href={`/outcome-policy/${policy.id}`}
            className="group bg-white border border-slate-100 rounded-[32px] p-7 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 flex flex-col min-h-[140px]"
        >
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <ScrollText className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                        {policy.name}
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] text-slate-500 font-semibold">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {formattedDate}
                </span>
            </div>
        </Link>
    )
}

export default function MyOutcomePoliciesClientView({ initialData, nextCursor, nextHistory, prevCursor, prevHistory, hasPrev, hasNext, currentPage, totalCount = 0 }: MyOutcomePoliciesProps) {
    const [currentAuid, setCurrentAuid] = useState<number | null>(null)
    const { t, tCount } = useTranslation()
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) setCurrentAuid(parseInt(cookieAuid, 10))
    }, [])

    const handleCreatePolicy = () => {
        router.push("/outcome-policy/new")
    }

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
            const histParam = prevHistory ? `&h=${prevHistory}` : ''
            router.push(`${pathname}?cursor=${prevCursor}${histParam}`)
        }
    }

    useEffect(() => {
        setIsLoading(false)
    }, [initialData])

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="none" />

            <main className="flex-1 overflow-auto p-6 flex flex-col relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-3xl">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                )}

                <div className="flex items-center justify-between mb-4 shrink-0">
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{t("myOutcomePolicies.title")}</h2>
                        <p className="text-sm text-slate-500 mt-1">{t("myOutcomePolicies.subtitle")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                            {tCount("common.outcomePoliciesCount", totalCount)}
                        </span>
                        <button
                            onClick={handleCreatePolicy}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:scale-105 hover:bg-indigo-700"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            {t("myOutcomePolicies.createButton")}
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                    {initialData.outcomePolicies.map((policy) => (
                        <OutcomePolicyCard key={policy.id} policy={policy} />
                    ))}

                    {initialData.outcomePolicies.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-200/50">
                            <ScrollText className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">{t("myOutcomePolicies.emptyTitle")}</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-md">{t("myOutcomePolicies.emptyDescription")}</p>
                        </div>
                    )}
                </div>

                {(hasPrev || hasNext) && (
                    <div className="mt-2 flex items-center justify-center gap-3 shrink-0 pt-2 pb-2">
                        <button
                            onClick={handlePrev}
                            disabled={!hasPrev || isLoading}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        <span className="flex h-10 w-10 items-center justify-center text-sm font-semibold text-slate-600">
                            {currentPage}
                        </span>

                        <button
                            onClick={handleNext}
                            disabled={!hasNext || isLoading}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}