"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import { ScrollText, Calendar, ChevronLeft, ChevronRight, Loader2, Plus, Pencil } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"
import { getDateLocale } from "@/lib/i18n"
import { AppHeader } from "@/components/AppHeader"
import OutcomePolicyCreatorModal from "./OutcomePolicyCreatorModal"

// ====================================================================
// INTERFACES
// ====================================================================
interface OutcomePolicy {
    id: string
    name: string
    createdAt: string
    latestEdition?: {
        id: string
        version: number
        status: string
        scriptCode?: string
        calculationScope?: string
        createdAt?: string
    }
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

function OutcomePolicyRow({ policy, onEdit }: { policy: OutcomePolicy; onEdit: (id: string) => void }) {
    const { t, locale } = useTranslation()

    const formattedDate = new Intl.DateTimeFormat(getDateLocale(locale), {
        month: "short", day: "numeric", year: "numeric"
    }).format(new Date(policy.createdAt))

    return (
        <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-xl shadow-slate-200/45 transition-all hover:shadow-2xl hover:shadow-slate-350/50">
            <div
                onClick={() => onEdit(policy.id)}
                className="p-6 flex items-center justify-between gap-4 cursor-pointer select-none"
            >
                <div className="flex items-center gap-4 min-w-0">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                        <ScrollText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight truncate">
                            {policy.name}
                        </h3>
                        <span className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {t("myOutcomePolicies.createdAt")}: {formattedDate}
                            {policy.latestEdition && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                                    policy.latestEdition.status === "ACTIVE"
                                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                        : "bg-slate-100 text-slate-500"
                                }`}>
                                    v{policy.latestEdition.version} · {policy.latestEdition.status}
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(policy.id) }}
                    className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-150 text-slate-500 hover:text-indigo-600 rounded-xl transition-all cursor-pointer shrink-0"
                    title={t("myOutcomePolicies.edit")}
                >
                    <Pencil className="w-4 h-4 transition-transform hover:scale-105" />
                </button>
            </div>
        </div>
    )
}

export default function MyOutcomePoliciesClientView({ initialData, nextCursor, nextHistory, prevCursor, prevHistory, hasPrev, hasNext, currentPage, totalCount = 0 }: MyOutcomePoliciesProps) {
    const [currentAuid, setCurrentAuid] = useState<number>(0)
    const { t, tCount } = useTranslation()
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null)

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) {
            const parsed = parseInt(cookieAuid, 10)
            if (!isNaN(parsed)) setCurrentAuid(parsed)
        }
    }, [])

    const handleOpenCreateModal = () => {
        setEditingPolicyId(null)
        setIsModalOpen(true)
    }

    const handleOpenEditModal = (id: string) => {
        setEditingPolicyId(id)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingPolicyId(null)
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

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-3xl">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                )}

                <div className="w-full max-w-7xl flex flex-col gap-8">

                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                                <ScrollText className="w-8 h-8 text-indigo-600" />
                                {t("myOutcomePolicies.title")}
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                {t("myOutcomePolicies.subtitle")}
                            </p>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                                {tCount("common.outcomePoliciesCount", totalCount)}
                            </span>
                            <button
                                onClick={handleOpenCreateModal}
                                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-3 text-sm font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer transform active:scale-95 shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                                <span>{t("myOutcomePolicies.createButton")}</span>
                            </button>
                        </div>
                    </div>

                    {/* Policy list */}
                    <div className="flex flex-col gap-4">
                        {initialData.outcomePolicies.map((policy) => (
                            <OutcomePolicyRow key={policy.id} policy={policy} onEdit={handleOpenEditModal} />
                        ))}

                        {initialData.outcomePolicies.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 rounded-[32px] bg-white text-center text-slate-500 gap-3 shadow-sm">
                                <ScrollText className="w-12 h-12 text-slate-300" />
                                <span className="text-base font-bold text-slate-700">{t("myOutcomePolicies.emptyTitle")}</span>
                                <p className="text-sm text-slate-400 max-w-sm">{t("myOutcomePolicies.emptyDescription")}</p>
                            </div>
                        )}
                    </div>

                    {(hasPrev || hasNext) && (
                        <div className="flex items-center justify-center gap-3 shrink-0 pt-2 pb-2">
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
                </div>
            </main>

            {isModalOpen && (
                <OutcomePolicyCreatorModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    currentAuid={currentAuid}
                    initialPolicyId={editingPolicyId}
                />
            )}
        </div>
    )
}