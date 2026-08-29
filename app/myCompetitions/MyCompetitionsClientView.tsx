"use client"

import { useState, useEffect } from "react"
import Cookies from "js-cookie"
import { toast } from "sonner"
import { Trophy, Timer, Calendar, CheckCircle, PlayCircle, AlertCircle, Plus, X } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"
import { getDateLocale } from "@/lib/i18n"
import { createQuickCompetitionAction } from "../competition/actions"
import { getCompetitionSeriesListAction } from "../competition/create/actions"
import { ListPageShell, ListPageHeader, Pagination, StateCard, StatusBadge, EntityCardLink, type StatusColorScheme } from "@/components/list"

// ====================================================================
// INTERFACES
// ====================================================================
type CompetitionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PLANNED" | "STARTED" | "COMPLETED" | "CANCELLED"

interface Series {
    id: string
    name: string
}

interface Competition {
    id: string
    name: string
    status: CompetitionStatus
    startedAt: string | null
    endedAt: string | null
    plannedDates: {
        start: string | null
        end: string | null
    } | null
    series: Series
    holders: number[][]
}

interface InitialData {
    competitions: Competition[]
}

interface MyCompetitionsProps {
    initialData: InitialData
    currentPage: number
    totalPages?: number
    totalCount?: number
    hasError?: boolean
}

function competitionStatusAppearance(status: CompetitionStatus): { colorScheme: StatusColorScheme; icon: typeof Calendar } {
    if (status === "STARTED") return { colorScheme: "emerald", icon: PlayCircle }
    if (status === "COMPLETED") return { colorScheme: "slate", icon: CheckCircle }
    if (status === "CANCELLED") return { colorScheme: "rose", icon: AlertCircle }
    return { colorScheme: "amber", icon: Calendar }
}

function CompetitionCard({ comp }: { comp: Competition }) {
    const [timeStr, setTimeStr] = useState<string>("")
    const { t, formatStatus, locale } = useTranslation()
    const { colorScheme, icon } = competitionStatusAppearance(comp.status)

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const updateTime = () => {
            if (comp.status === "STARTED" && comp.startedAt) {
                const start = new Date(comp.startedAt).getTime()
                const now = new Date().getTime()
                const diff = Math.max(0, now - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                setTimeStr(t("time.durationHoursMinutes", { hours, minutes }))

            } else if (comp.status === "COMPLETED" && comp.startedAt && comp.endedAt) {
                const start = new Date(comp.startedAt).getTime()
                const end = new Date(comp.endedAt).getTime()
                const diff = Math.max(0, end - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                setTimeStr(t("time.lasted", { time: t("time.durationHoursMinutes", { hours, minutes }) }))

            } else if (comp.status === "PLANNED" && comp.plannedDates?.start) {
                const date = new Date(comp.plannedDates.start)
                const formattedDate = new Intl.DateTimeFormat(getDateLocale(locale), {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }).format(date)
                setTimeStr(t("time.planned", { date: formattedDate }))
            } else {
                setTimeStr("")
            }
        }

        updateTime()
        if (comp.status === "STARTED") {
            intervalId = setInterval(updateTime, 60000)
        }
        return () => clearInterval(intervalId)
    }, [comp.status, comp.startedAt, comp.endedAt, comp.plannedDates, t, locale])

    return (
        <EntityCardLink href={`/competition/${comp.id}`}>
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Trophy className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 truncate block">
                        {comp.series?.name || t("common.independent")}
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                        {comp.name}
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4">
                <StatusBadge
                    colorScheme={colorScheme}
                    icon={icon}
                    label={formatStatus(comp.status)}
                    trailing={timeStr || undefined}
                    trailingIcon={comp.status === "PLANNED" ? Calendar : Timer}
                />
            </div>
        </EntityCardLink>
    )
}

export default function MyCompetitionsClientView({ initialData, currentPage, totalPages = 1, totalCount = 0, hasError = false }: MyCompetitionsProps) {
    const { t, tCount } = useTranslation()
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(false)
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
                toast.error(res.error || t("myCompetitions.createError"))
            }
        } catch (err: any) {
            toast.error(err.message || t("myCompetitions.genericError"))
        } finally {
            setIsSubmittingComp(false)
        }
    }

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
                title={t("myCompetitions.title")}
                subtitle={t("myCompetitions.subtitle")}
                countLabel={tCount("common.competitionsCount", totalCount)}
                actions={
                    <button
                        onClick={openCreateModal}
                        className="min-w-0 flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-3 text-sm font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer transform active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t("myCompetitions.createButton")}</span>
                    </button>
                }
            />

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
                                    <h3 className="text-base font-extrabold text-slate-800 tracking-tight">{t("myCompetitions.createModalTitle")}</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">{t("myCompetitions.createModalSubtitle")}</p>
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
                                    {t("myCompetitions.nameLabel")}
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder={t("myCompetitions.namePlaceholder")}
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
                                    {t("myCompetitions.seriesLabel")}
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
                                        <option value="">{t("myCompetitions.autoAssignSeries")}</option>
                                    )}
                                </select>
                            </div>

                            <p className="text-[11px] text-slate-400 font-medium">
                                {t("myCompetitions.createHint")}
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-1">
                            <button
                                type="button"
                                onClick={() => setIsCreatingCompetition(false)}
                                disabled={isSubmittingComp}
                                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {t("competition.cancel")}
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
                                        <span>{t("myCompetitions.creating")}</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        <span>{t("myCompetitions.createButton")}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {hasError && (
                    <StateCard variant="error" title={t("myCompetitions.errorTitle")} description={t("myCompetitions.errorDescription")} />
                )}

                {!hasError && initialData.competitions.map((comp) => (
                    <CompetitionCard key={comp.id} comp={comp} />
                ))}

                {!hasError && initialData.competitions.length === 0 && (
                    <StateCard variant="empty" icon={Trophy} title={t("myCompetitions.emptyTitle")} description={t("myCompetitions.emptyDescription")} />
                )}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} isLoading={isLoading} onPageChange={handleJumpToPage} />
        </ListPageShell>
    )
}
