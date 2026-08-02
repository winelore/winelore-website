"use client"

import React, { useState, useEffect, useMemo } from "react"
import { FileText, Trophy, Wine, User, Layers, ChevronLeft, ChevronRight, Loader2, Tag, AlertCircle, CheckCircle, MapPin, Plus, X } from "lucide-react"
import { AppHeader, type AppTabId } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { TranslatedText } from "@/lib/i18n/TranslatedText"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useUsernames } from "@/hooks/useUsernames"
import Cookies from "js-cookie"
import { createQuickCompetitionAction } from "./competition/actions"
import { getCompetitionSeriesListAction } from "./competition/create/actions"



type CompetitionSeriesStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED" | "APPROVED" | "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "SUSPENDED"

interface CompetitionSeries {
  id: string
  name: string
  status: CompetitionSeriesStatus
}

interface Competition {
  id: string
  name: string
  status: string
  description?: string
  holder: number[]
  plannedStartAt: string | null
  plannedEndAt?: string | null
  startedAt: string | null
  endedAt: string | null
  series: CompetitionSeries
}

interface DashboardProps {
    initialCompetitions: Competition[]
    initialBeverages?: any[]
    beverageTypesMap?: Record<string, string>
    nextCursor: string | null
    currentPage: number
    totalPages?: number
    totalCompetitionsCount?: number
    totalBeveragesCount?: number
    // Legacy props to keep local dev server working before full merge
    nextHistory?: string
    prevCursor?: string | null
    prevHistory?: string
    hasPrev?: boolean
    hasNext?: boolean

}

function AvatarPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 ${className}`}>
      <User className="h-1/2 w-1/2 text-indigo-300" />
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case "IN_PROGRESS":
    case "STARTED":
      return "text-emerald-500"
    case "READY":
    case "PLANNED":
    case "APPROVED":
      return "text-blue-500"
    case "FINISHED":
    case "COMPLETED":
      return "text-muted-foreground"
    default:
      return "text-muted-foreground"
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "IN_PROGRESS":
    case "STARTED":
      return "In Progress"
    case "READY":
    case "PLANNED":
    case "APPROVED":
      return "Ready"
    case "FINISHED":
    case "COMPLETED":
      return "Finished"
    default:
      return status
        .toLowerCase()
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
  }
}

function formatTimeRemaining(plannedStartAt: string | null, plannedEndAt: string | null, status: string, t: any) {
  if (status === "FINISHED" || status === "COMPLETED") return t("time.ended")
  if (!plannedStartAt) return ""

  const now = new Date()
  const startDate = new Date(plannedStartAt)
  const endDate = plannedEndAt ? new Date(plannedEndAt) : null

  if (status === "READY" || status === "PLANNED" || status === "APPROVED") {
    const diff = startDate.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return t("time.startsInDays", { days })
    if (hours > 0) return t("time.startsInHours", { hours })
    return t("time.startingSoon")
  }

  if ((status === "IN_PROGRESS" || status === "STARTED") && endDate) {
    const diff = endDate.getTime() - now.getTime()
    if (diff < 0) return ""
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (days > 0) return t("time.duration", { days, hours })
    if (hours > 0) return t("time.durationHoursMinutes", { hours, minutes })
    return t("time.durationMinutes", { minutes })
  }

  return ""
}

function CompetitionCard({ competition, usernames }: { competition: Competition; usernames: Record<string, string> }) {
    const [isMounted, setIsMounted] = useState(false)
    const { t, formatStatus } = useTranslation()

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const timeRemaining = formatTimeRemaining(
        competition.plannedStartAt,
        competition.plannedEndAt ?? null,
        competition.status,
        t
    )

    return (
        <Link
            href={`/competition/${competition.id}`}
            className="group bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 flex flex-col min-h-[140px]"
        >
            <div className="flex items-start gap-3">
                <AvatarPlaceholder className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-card-foreground truncate">
                        {competition.name}
                    </h3>
                    <p className="text-sm">
                        <span className={`font-medium ${getStatusColor(competition.status)}`}>
                            {formatStatus(competition.status)}
                        </span>
                        {/* Render time remaining only after client mount */}
                        {isMounted && timeRemaining && <span className="text-muted-foreground"> | {timeRemaining}</span>}
                    </p>
                </div>
            </div>
            {competition.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    <TranslatedText text={competition.description} />
                </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    <span>{competition.series.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>{t("dashboard.holderId", { ids: competition.holder.map(id => usernames[id] || String(id)).join(", ") })}</span>
                </div>
            </div>
        </Link>
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

export default function WineLoreDashboard({
                                              initialCompetitions,
                                              initialBeverages,
                                              beverageTypesMap,
                                              nextCursor,
                                              nextHistory,
                                              prevCursor,
                                              prevHistory,
                                              hasPrev,
                                              hasNext,
                                              currentPage,
                                              totalPages = 1, // default for local
                                              totalCompetitionsCount = 0,
                                              totalBeveragesCount = 0
                                          }: DashboardProps) {
  const searchParams = useSearchParams()
  const rawTab = searchParams.get("tab")
  const initialTab = (rawTab === "wines" ? "beverages" : rawTab) as AppTabId || "competitions"
  const [activeTab, setActiveTab] = useState<AppTabId>(initialTab)
  const router = useRouter()
  const pathname = usePathname()
  const { t, tCount } = useTranslation()

  useEffect(() => {
    let tabParam = searchParams.get("tab") as string
    if (tabParam === "wines") tabParam = "beverages"
    if (tabParam && ["competitions", "beverages", "feed"].includes(tabParam)) {
      setActiveTab(tabParam as AppTabId)
    }
  }, [searchParams])
  const [isLoading, setIsLoading] = useState(false)
  const [currentBeveragePage, setCurrentBeveragePage] = useState(1)
  const beveragesPerPage = 16
  const [isCreatingCompetition, setIsCreatingCompetition] = useState(false)
  const [newCompName, setNewCompName] = useState("")
  const [userSeriesList, setUserSeriesList] = useState<{ id: string; name: string }[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("")
  const [isSubmittingComp, setIsSubmittingComp] = useState(false)

  const openCreateModal = async () => {
      setNewCompName("")
      setIsCreatingCompetition(true)
      const cookieAuid = Cookies.get("auid")
      const auid = cookieAuid ? parseInt(cookieAuid, 10) : null

      try {
          const items = await getCompetitionSeriesListAction()
          if (Array.isArray(items)) {
              const mySeries = auid
                  ? items.filter((s: any) => s.owners && s.owners.flat().includes(Number(auid)))
                  : items
              setUserSeriesList(mySeries)
              if (mySeries.length > 0) {
                  setSelectedSeriesId(mySeries[0].id)
              } else {
                  setSelectedSeriesId("")
              }
          }
      } catch (err) {
          console.error("Failed to load user series list:", err)
      }
  }

  const handleCreateCompetition = async () => {
      setIsSubmittingComp(true)
      try {
          const cookieAuid = Cookies.get("auid")
          const auid = cookieAuid ? parseInt(cookieAuid, 10) : null
          const res = await createQuickCompetitionAction(newCompName, auid, selectedSeriesId || null)
          if (res.success && res.competitionId) {
              setIsCreatingCompetition(false)
              router.push(`/competition/${res.competitionId}`)
          } else {
              alert(res.error || "Failed to create competition")
          }
      } catch (err: any) {
          alert(err.message || "An error occurred")
      } finally {
          setIsSubmittingComp(false)
      }
  }

  const changeBeveragePage = (newPage: number) => {
      setIsLoading(true)
      setTimeout(() => {
          setCurrentBeveragePage(newPage)
          setIsLoading(false)
      }, 100)
  }

  // Fetch usernames for all competition holders on the dashboard
  const allHolderAuids = useMemo(() => {
    return Array.from(new Set(initialCompetitions.flatMap(c => c.holder || [])))
  }, [initialCompetitions])
  const { usernames } = useUsernames(allHolderAuids)

  const beveragesToDisplay = useMemo(() => {
      if (!initialBeverages) return []
      const startIndex = (currentBeveragePage - 1) * beveragesPerPage
      return initialBeverages.slice(startIndex, startIndex + beveragesPerPage)
  }, [initialBeverages, currentBeveragePage])

  const hasNextBeveragePage = initialBeverages && currentBeveragePage * beveragesPerPage < initialBeverages.length
  const hasPrevBeveragePage = currentBeveragePage > 1
  const totalBeveragesPages = initialBeverages ? Math.ceil(initialBeverages.length / beveragesPerPage) : 0

  const getBeveragePageNumbers = () => {
      const pages = [];
      if (totalBeveragesPages <= 5) {
          for (let i = 1; i <= totalBeveragesPages; i++) pages.push(i);
      } else {
          if (currentBeveragePage <= 3) {
              pages.push(1, 2, 3, 4, '...', totalBeveragesPages);
          } else if (currentBeveragePage >= totalBeveragesPages - 2) {
              pages.push(1, '...', totalBeveragesPages - 3, totalBeveragesPages - 2, totalBeveragesPages - 1, totalBeveragesPages);
          } else {
              pages.push(1, '...', currentBeveragePage - 1, currentBeveragePage, currentBeveragePage + 1, '...', totalBeveragesPages);
          }
      }
      return pages;
  };

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    const handleNext = () => {
        if (currentPage >= totalPages || !nextCursor) return
        setIsLoading(true)
        router.push(`${pathname}?cursor=${nextCursor}&page=${currentPage + 1}`)
    }

    const handleJumpToPage = (pageNumber: number) => {
        setIsLoading(true)
        router.push(`${pathname}?page=${pageNumber}`)
    }

    useEffect(() => {
        setIsLoading(false)
    }, [initialCompetitions])

  return (
    <div className="flex h-screen flex-col bg-background">
        <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 overflow-auto p-6 flex flex-col relative">
            {isLoading && (
                <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-3xl">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            )}

            {activeTab === "competitions" && (
                <>
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{t("common.competitions")}</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                                {totalCompetitionsCount !== undefined && tCount("common.competitionsCount", totalCompetitionsCount)}
                            </span>
                            <button
                                onClick={openCreateModal}
                                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-3 text-sm font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer transform active:scale-95 shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create Competition</span>
                            </button>
                        </div>
                    </div>

                    {isCreatingCompetition && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in"
                            onClick={() => setIsCreatingCompetition(false)}
                        >
                            <div
                                className="w-full max-w-md bg-white border border-slate-100 rounded-[28px] p-6 md:p-7 shadow-2xl shadow-slate-900/20 flex flex-col gap-5"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                            <Trophy className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Create Competition</h3>
                                            <p className="text-[11px] text-slate-400 font-medium">Quick setup</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingCompetition(false)}
                                        className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                                    >
                                        <X className="w-4.5 h-4.5" />
                                    </button>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Competition Name
                                        </label>
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="e.g. Summer Tasting 2026"
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all bg-slate-50/50"
                                            value={newCompName}
                                            onChange={e => setNewCompName(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === "Enter") handleCreateCompetition()
                                                if (e.key === "Escape") setIsCreatingCompetition(false)
                                            }}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Competition Series
                                        </label>
                                        <select
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all bg-slate-50/50 cursor-pointer"
                                            value={selectedSeriesId}
                                            onChange={e => setSelectedSeriesId(e.target.value)}
                                        >
                                            {userSeriesList.length > 0 ? (
                                                userSeriesList.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))
                                            ) : (
                                                <option value="">— Auto-assign Series —</option>
                                            )}
                                        </select>
                                    </div>

                                    <p className="text-[11px] text-slate-400 font-medium">
                                        You can edit dates, commissions, and settings later inline.
                                    </p>
                                </div>

                                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingCompetition(false)}
                                        disabled={isSubmittingComp}
                                        className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreateCompetition}
                                        disabled={isSubmittingComp}
                                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-75 cursor-pointer"
                                    >
                                        {isSubmittingComp ? (
                                            <>
                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                <span>Creating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4" />
                                                <span>Create Competition</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                        {initialCompetitions.map((competition) => (
                            <CompetitionCard
                                key={competition.id}
                                competition={competition}
                                usernames={usernames}
                            />
                        ))}
                    </div>

                    {(totalPages > 1) ? (
                        <div className="mt-1 flex items-center justify-center gap-3">
                            <button
                                onClick={() => handleJumpToPage(currentPage - 1)}
                                disabled={currentPage <= 1 || isLoading}
                                className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            {getPageNumbers().map((p, i) => (
                                p === '...' ? (
                                    <span key={i} className="flex items-center justify-center w-8 h-10 text-slate-400">...</span>
                                ) : (
                                    <button
                                        key={i}
                                        onClick={() => handleJumpToPage(p as number)}
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
                                disabled={currentPage >= totalPages || isLoading}
                                className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    ) : null}
                </>
            )}

            {activeTab === "beverages" && (
                <>
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{t("common.beverages")}</h2>
                        </div>
                        {totalBeveragesCount !== undefined && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                                {tCount("common.beveragesCount", totalBeveragesCount)}
                            </span>
                        )}
                    </div>
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
                                onClick={() => changeBeveragePage(currentBeveragePage - 1)}
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
                                        disabled={isLoading || p === currentBeveragePage}
                                        className={`flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold transition-all duration-300 shadow-xl ${
                                            p === currentBeveragePage
                                                ? "bg-indigo-600 text-white shadow-indigo-200/50 pointer-events-none"
                                                : "bg-white border border-slate-100 text-slate-600 shadow-slate-200/50 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            ))}

                            <button
                                onClick={() => changeBeveragePage(currentBeveragePage + 1)}
                                disabled={!hasNextBeveragePage || isLoading}
                                className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </>
            )}
      </main>
    </div>
  )
}
