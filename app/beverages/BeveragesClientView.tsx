"use client"

import React, { useState, useEffect, useMemo } from "react"
import {Wine, User, Layers, ChevronLeft, ChevronRight, Loader2, AlertCircle} from "lucide-react"
import { AppHeader, type AppTabId } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { TranslatedText } from "@/lib/i18n/TranslatedText"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useUsernames } from "@/hooks/useUsernames"



interface DashboardProps {
    initialBeverages?: any[]
    beverageTypesMap?: Record<string, string>
    nextCursor?: string | null
    currentPage?: number
    totalPages?: number
}

function AvatarPlaceholder({ className }: { className?: string }) {
    return (
        <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 ${className}`}>
            <User className="h-1/2 w-1/2 text-indigo-300" />
        </div>
    )
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
        <Link
            href={`/beverage/${bev.id}`}
            className="group bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 flex items-center gap-4"
        >
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
        </Link>
    )
}

export default function BeveragesClientView({
                                              initialBeverages,
                                              beverageTypesMap,
                                              nextCursor,
                                              currentPage = 1,
                                              totalPages = 0
                                          }: DashboardProps) {
    const activeTab = "beverages"
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    const changeBeveragePage = (newPage: number) => {
        setIsLoading(true)
        router.push(`${pathname}?page=${newPage}`)
    }

    const handleNext = () => {
        if (currentPage >= totalPages || !nextCursor) return
        setIsLoading(true)
        router.push(`${pathname}?cursor=${nextCursor}&page=${currentPage + 1}`)
    }

    const beveragesToDisplay = initialBeverages || []

    const hasNextBeveragePage = currentPage < totalPages
    const hasPrevBeveragePage = currentPage > 1
    const totalBeveragesPages = totalPages

    const getBeveragePageNumbers = () => {
        const pages = [];
        if (totalBeveragesPages <= 5) {
            for (let i = 1; i <= totalBeveragesPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalBeveragesPages);
            } else if (currentPage >= totalBeveragesPages - 2) {
                pages.push(1, '...', totalBeveragesPages - 3, totalBeveragesPages - 2, totalBeveragesPages - 1, totalBeveragesPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalBeveragesPages);
            }
        }
        return pages;
    };

    useEffect(() => {
        setIsLoading(false)
    }, [initialBeverages])

    return (
        <div className="flex h-screen flex-col bg-background">
            <AppHeader activeTab={activeTab} />

            <main className="flex-1 overflow-auto p-6 flex flex-col relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-3xl">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                )}



                <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                        {beveragesToDisplay?.map((bev) => (
                            <BeverageCard
                                key={bev.id}
                                bev={bev}
                                typeMap={beverageTypesMap}
                            />
                        ))}
                        {initialBeverages === undefined && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-red-50 border border-red-100 rounded-[32px] shadow-xl shadow-red-200/50">
                                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                                <h3 className="text-lg font-bold text-red-800">Помилка завантаження</h3>
                                <p className="text-sm text-red-600 mt-1 max-w-md">Не вдалося завантажити список напоїв. Спробуйте оновити сторінку.</p>
                            </div>
                        )}
                        {initialBeverages !== undefined && initialBeverages.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-200/50">
                                <Wine className="w-12 h-12 text-slate-300 mb-4" />
                                <h3 className="text-lg font-bold text-slate-700">Немає напоїв</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-md">Тут ще немає жодного напою.</p>
                            </div>
                        )}
                    </div>

                    {totalBeveragesPages > 1 && (
                        <div className="mt-2 flex items-center justify-center gap-3">
                            <button
                                onClick={() => changeBeveragePage(currentPage - 1)}
                                disabled={!hasPrevBeveragePage || isLoading}
                                className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            {getBeveragePageNumbers().map((p, i) => (
                                p === '...' ? (
                                    <span key={i} className="flex items-center justify-center w-8 h-10 text-slate-400">...</span>
                                ) : (
                                    <button
                                        key={i}
                                        onClick={() => changeBeveragePage(p as number)}
                                        disabled={isLoading || p === currentPage}
                                        className={`flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold transition-all duration-300 shadow-xl ${
                                            p === currentPage
                                                ? "bg-indigo-600 text-white shadow-indigo-200/50 pointer-events-none"
                                                : "bg-white border border-slate-100 text-slate-600 shadow-slate-200/50 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            ))}

                            <button
                                onClick={handleNext}
                                disabled={!hasNextBeveragePage || isLoading}
                                className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </>
            </main>
        </div>
    )
}
