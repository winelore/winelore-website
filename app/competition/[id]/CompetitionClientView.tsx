"use client"

import React, { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Trophy, Wine, Timer, Layers, PlayCircle, X, Plus, Send, Users, ChevronRight } from "lucide-react"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
import { getDateLocale } from "@/lib/i18n"
import {
    startCompetitionAction,
    submitCompetitionForReviewAction,
    getCompetitionDataAction,
    updateCompetitionDatesAction,
    updateCompetitionNameAction,
    createCommission
} from "../actions"
import {
    ActionButton,
    ActionRow,
    DetailPageHeader,
    EmptyState,
    MetaTile,
    ScheduleTimeline,
    SectionCard,
    StatusPill,
    StatusStepper,
    UserAvatar,
    useScrolledPast,
} from "@/components/detail"

function getGoogleCalendarUrl(name: string, details: string, plannedStartAt: string, plannedEndAt: string | null): string {
    const start = new Date(plannedStartAt)
    const end = plannedEndAt ? new Date(plannedEndAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

    const formatCalDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    }

    const dates = `${formatCalDate(start)}/${formatCalDate(end)}`
    const text = encodeURIComponent(name)
    const encodedDetails = encodeURIComponent(details)

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${encodedDetails}`
}

function CommissionRow({ comm }: { comm: Commission }) {
    const [timeStr, setTimeStr] = useState<string>("")
    const { t, locale } = useTranslation()

    useEffect(() => {
        let intervalId: NodeJS.Timeout

        const updateTime = () => {
            if (comm.status === "STARTED" && comm.startedAt) {
                const diff = Math.max(0, Date.now() - new Date(comm.startedAt).getTime())
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                const time = hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes })
                setTimeStr(`${time} ${t("time.durationSeconds", { seconds })}`)
            } else if (comm.status === "COMPLETED" && comm.startedAt && comm.endedAt) {
                const diff = Math.max(0, new Date(comm.endedAt).getTime() - new Date(comm.startedAt).getTime())
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                const time = hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes })
                setTimeStr(t("time.lasted", { time }))
            } else if (comm.status === "PLANNED" && comm.plannedStartAt) {
                const formattedDate = new Intl.DateTimeFormat(getDateLocale(locale), {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }).format(new Date(comm.plannedStartAt))
                setTimeStr(t("time.plannedFor", { date: formattedDate }))
            } else {
                setTimeStr("")
            }
        }

        updateTime()
        if (comm.status === "STARTED") intervalId = setInterval(updateTime, 1000)
        return () => clearInterval(intervalId)
    }, [comm.status, comm.startedAt, comm.endedAt, comm.plannedStartAt, t, locale])

    return (
        <Link
            href={`/commission/${comm.id}`}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3.5 transition-all hover:border-indigo-200 hover:bg-indigo-50/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:gap-4 sm:p-4"
        >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <Wine className="h-5 w-5" />
            </span>

            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-slate-900">{comm.name}</span>
                {timeStr && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                        <Timer className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{timeStr}</span>
                    </span>
                )}
            </span>

            <StatusPill status={comm.status || ""} size="sm" />
            <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500 sm:block" />
        </Link>
    )
}

// ====================================================================
// INTERFACES
// ====================================================================
type CompetitionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PLANNED" | "STARTED" | "COMPLETED" | "CANCELLED"

interface Series {
    id: string
    name: string
    status: string
}

interface Commission {
    id: string;
    competitionId?: string;
    name: string;
    status?: string;
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    plannedStartDate?: string;
    plannedEndDate?: string;
    wineJumperMiniGameEnabled?: boolean;
    voiceCommentsEnabled?: boolean;
    propertyCommentsEnabled?: boolean;
    beverageOriginDuringEvaluationEnabled?: boolean;
}

interface InitialData {
    id: string
    name: string
    status: CompetitionStatus
    startedAt: string | null
    plannedStartAt: string | null
    plannedEndAt: string | null
    endedAt: string | null
    series: Series
    holders: number[]
    commissions: Commission[]
}

export default function CompetitionClientView({
                                                  initialData: propInitialData,
                                                  serverAuid,
                                                  children
                                              }: {
    initialData: InitialData;
    serverAuid?: number | null;
    children?: React.ReactNode;
}) {
    const { t, locale } = useTranslation()
    const router = useRouter()
    const [localData, setLocalData] = useState<InitialData>(propInitialData)
    const [timeDisplay, setTimeDisplay] = useState<string>("")
    const [currentAuid, setCurrentAuid] = useState<number | null>(serverAuid || null)

    // One flag per action rather than a single page-wide `isMutating`, so saving
    // the name no longer freezes "Start competition" and vice versa.
    const [isSavingName, setIsSavingName] = useState(false)
    const [isRunningLifecycle, setIsRunningLifecycle] = useState(false)
    const [isAddingCommission, setIsAddingCommission] = useState(false)
    const [isSubmittingCommission, setIsSubmittingCommission] = useState(false)
    const [newCommissionName, setNewCommissionName] = useState("")

    const initialData = localData

    // The header CTA only appears once its own card has scrolled away.
    const [actionsRef, actionsScrolledPast] = useScrolledPast<HTMLDivElement>()

    const handleSaveName = async (nextName: string) => {
        const trimmed = nextName.trim()
        if (!trimmed) {
            toast.error(t("common.errorNameEmpty"))
            throw new Error("empty name")
        }
        setIsSavingName(true)
        try {
            const res = await updateCompetitionNameAction(initialData.id, trimmed)
            if (res.success) {
                setLocalData(prev => ({ ...prev, name: trimmed }))
                router.refresh()
            } else {
                toast.error(res.error || t("common.errorSaveFailed"))
                throw new Error(res.error || "save failed")
            }
        } finally {
            setIsSavingName(false)
        }
    }

    const handleSaveDates = async (startIso: string | null, endIso: string | null) => {
        try {
            const res = await updateCompetitionDatesAction(initialData.id, startIso, endIso)
            if (res.success) {
                router.refresh()
                return true
            }
            toast.error(res.error || t("common.errorSaveFailed"))
            return false
        } catch (err: any) {
            toast.error(err?.message || t("common.errorGeneric"))
            return false
        }
    }

    const openAddCommission = () => {
        setNewCommissionName(t("competition.commissionNameDefault", { number: initialData.commissions.length + 1 }))
        setIsAddingCommission(true)
    }

    const handleAddCommission = async () => {
        const finalName = newCommissionName.trim() || t("competition.commissionNameDefault", { number: initialData.commissions.length + 1 })
        setIsSubmittingCommission(true)
        try {
            const res = await createCommission({
                competitionId: initialData.id,
                name: finalName,
                plannedStartDate: initialData.plannedStartAt || undefined,
                plannedEndDate: initialData.plannedEndAt || undefined,
                wineJumperMiniGameEnabled: false,
                voiceCommentsEnabled: false,
                propertyCommentsEnabled: true,
                beverageOriginDuringEvaluationEnabled: false,
            })

            if (res.success) {
                setIsAddingCommission(false)
                router.refresh()
            } else {
                toast.error(res.error || t("common.errorGeneric"))
            }
        } catch (err: any) {
            toast.error(err.message || t("common.errorGeneric"))
        } finally {
            setIsSubmittingCommission(false)
        }
    }

    // Fetch usernames for competition holders
    const allHolderAuids = useMemo(() => initialData.holders || [], [initialData.holders])
    const { usernames } = useUsernames(allHolderAuids)

    useEffect(() => {
        setLocalData(propInitialData)
    }, [propInitialData])

    useEffect(() => {
        if (localData.status === "COMPLETED") return

        let isMounted = true
        let isFetching = false

        const pollInterval = setInterval(async () => {
            // Don't keep hammering the server for a tab nobody is looking at.
            if (!isMounted || isFetching || document.visibilityState !== "visible") return
            isFetching = true
            try {
                const updated = await getCompetitionDataAction(localData.id)
                if (isMounted && updated) {
                    setLocalData(updated)
                }
            } catch (err) {
                console.error("Failed to poll competition data:", err)
            } finally {
                isFetching = false
            }
        }, 3000)

        return () => {
            isMounted = false
            clearInterval(pollInterval)
        }
    }, [localData.id, localData.status])

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) {
            setCurrentAuid(parseInt(cookieAuid, 10))
        }
    }, [])

    const handleStartCompetition = async () => {
        if (isRunningLifecycle) return
        setIsRunningLifecycle(true)
        try {
            await startCompetitionAction(initialData.id)
            router.refresh()
        } catch (err: any) {
            console.error("Failed to start competition:", err)
            toast.error(err?.message || t("common.errorGeneric"))
        } finally {
            setIsRunningLifecycle(false)
        }
    }

    const handleSubmitForReview = async () => {
        if (isRunningLifecycle) return
        setIsRunningLifecycle(true)
        try {
            await submitCompetitionForReviewAction(initialData.id)
            const updated = await getCompetitionDataAction(initialData.id)
            if (updated) setLocalData(updated)
            router.refresh()
        } catch (err: any) {
            console.error("Failed to submit competition for review:", err)
            toast.error(err.message || t("competition.submitReviewError"))
        } finally {
            setIsRunningLifecycle(false)
        }
    }

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const updateTime = () => {
            if (initialData.status === "STARTED" && initialData.startedAt) {
                const diff = Math.max(0, Date.now() - new Date(initialData.startedAt).getTime())
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                setTimeDisplay(hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`)
            } else if (initialData.status === "COMPLETED" && initialData.startedAt && initialData.endedAt) {
                const diff = Math.max(0, new Date(initialData.endedAt).getTime() - new Date(initialData.startedAt).getTime())
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                const time = hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes })
                setTimeDisplay(t("time.lasted", { time }))
            } else if (initialData.status === "PLANNED" && initialData.plannedStartAt) {
                const formattedDate = new Intl.DateTimeFormat(getDateLocale(locale), {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }).format(new Date(initialData.plannedStartAt))
                setTimeDisplay(t("time.plannedFor", { date: formattedDate }))
            } else {
                setTimeDisplay("")
            }
        }

        updateTime()
        if (initialData.status === "STARTED") intervalId = setInterval(updateTime, 1000)
        return () => clearInterval(intervalId)
    }, [initialData.status, initialData.startedAt, initialData.plannedStartAt, initialData.endedAt, t, locale])

    const isHolder = currentAuid !== null && initialData.holders.includes(currentAuid)

    const steps = useMemo(() => [
        { id: "planned", label: t("competition.stepPlanned"), description: t("competition.stepPlannedDesc") },
        { id: "started", label: t("competition.stepStarted"), description: t("competition.stepStartedDesc") },
        { id: "completed", label: t("competition.stepCompleted"), description: t("competition.stepCompletedDesc") }
    ], [t])

    const currentStepIdx = initialData.status === "COMPLETED" ? 2 : initialData.status === "STARTED" ? 1 : 0

    const calendarUrl = initialData.status === "PLANNED" && initialData.plannedStartAt
        ? getGoogleCalendarUrl(
            initialData.name,
            t("competition.calendarDetails", { name: initialData.name }),
            initialData.plannedStartAt,
            initialData.plannedEndAt
        )
        : null

    /**
     * The single action the holder is most likely to want next, promoted into the
     * sticky header so it stays reachable from anywhere on the page.
     */
    const primaryAction = useMemo(() => {
        if (!isHolder) return null
        if (initialData.status === "DRAFT") {
            return (
                <ActionButton icon={Send} loading={isRunningLifecycle} onClick={handleSubmitForReview}>
                    <span className="hidden sm:inline">{t("competition.submitReviewButton")}</span>
                    <span className="sm:hidden">{t("competition.submitReviewShort")}</span>
                </ActionButton>
            )
        }
        if (initialData.status === "PLANNED") {
            return (
                <ActionButton icon={PlayCircle} loading={isRunningLifecycle} onClick={handleStartCompetition}>
                    <span className="hidden sm:inline">{t("competition.startButton")}</span>
                    <span className="sm:hidden">{t("competition.startShort")}</span>
                </ActionButton>
            )
        }
        return null
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHolder, initialData.status, isRunningLifecycle, t])

    return (
        <div className="flex h-screen flex-col bg-slate-50">
            <AppHeader activeTab="competitions" />

            <main className="flex-1 overflow-auto">
                <DetailPageHeader
                    backHref="/myCompetitions"
                    backLabel={t("commission.backToCompetitions")}
                    eyebrow={t("competition.panel")}
                    name={initialData.name}
                    status={initialData.status}
                    timeDisplay={timeDisplay}
                    canEditName={isHolder}
                    onSaveName={handleSaveName}
                    isSavingName={isSavingName}
                    actions={
                        <>
                            {actionsScrolledPast && primaryAction}
                            <ActionButton
                                variant={actionsScrolledPast && primaryAction ? "secondary" : "primary"}
                                icon={Trophy}
                                href={`/competition/${initialData.id}/results`}
                            >
                                <span className="hidden sm:inline">{t("competition.resultsButton")}</span>
                                <span className="sm:hidden">{t("competition.resultsShort")}</span>
                            </ActionButton>
                        </>
                    }
                />

                <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:gap-6 md:px-8 md:py-8">
                    <SectionCard padding="tight">
                        <StatusStepper steps={steps} currentStepIdx={currentStepIdx} />
                    </SectionCard>

                    <div className="grid gap-5 md:gap-6 lg:grid-cols-5">
                        {/* Main column — the work you came here to do. */}
                        <div className="flex min-w-0 flex-col gap-5 md:gap-6 lg:col-span-3">
                            {((initialData.status === "DRAFT" && isHolder) || initialData.status === "PLANNED") && (
                                <div ref={actionsRef}>
                                    <SectionCard title={t("competition.actionsControls")}>
                                        {initialData.status === "DRAFT" ? (
                                            <ActionRow
                                                title={t("competition.submitReviewTitle")}
                                                description={t("competition.submitReviewDescription")}
                                                action={
                                                    <ActionButton icon={Send} loading={isRunningLifecycle} onClick={handleSubmitForReview}>
                                                        {t("competition.submitReviewButton")}
                                                    </ActionButton>
                                                }
                                            />
                                        ) : isHolder ? (
                                            <ActionRow
                                                title={t("competition.startTitle")}
                                                description={t("competition.startDescription")}
                                                action={
                                                    <ActionButton icon={PlayCircle} loading={isRunningLifecycle} onClick={handleStartCompetition}>
                                                        {t("competition.startButton")}
                                                    </ActionButton>
                                                }
                                            />
                                        ) : (
                                            <ActionRow
                                                tone="muted"
                                                title={t("competition.plannedTitle")}
                                                description={t("competition.plannedDescription")}
                                            />
                                        )}
                                    </SectionCard>
                                </div>
                            )}

                            <SectionCard
                                icon={Wine}
                                title={t("competition.commissions")}
                                subtitle={t("competition.commissionsSubtitle")}
                                actions={
                                    <>
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-500">
                                            {initialData.commissions.length}
                                        </span>
                                        {isHolder && !isAddingCommission && (
                                            <ActionButton size="sm" icon={Plus} onClick={openAddCommission}>
                                                {t("competition.addCommission")}
                                            </ActionButton>
                                        )}
                                    </>
                                }
                            >
                                {isAddingCommission && (
                                    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-800">{t("competition.addCommissionTitle")}</span>
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingCommission(false)}
                                                title={t("common.close")}
                                                aria-label={t("common.close")}
                                                className="cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                {t("competition.commissionName")}
                                            </span>
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder={t("competition.commissionNamePlaceholder", { number: initialData.commissions.length + 1 })}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                                value={newCommissionName}
                                                onChange={e => setNewCommissionName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") handleAddCommission()
                                                    if (e.key === "Escape") setIsAddingCommission(false)
                                                }}
                                            />
                                        </label>
                                        <div className="flex justify-end gap-2">
                                            <ActionButton
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => setIsAddingCommission(false)}
                                                disabled={isSubmittingCommission}
                                            >
                                                {t("common.cancel")}
                                            </ActionButton>
                                            <ActionButton size="sm" icon={Plus} loading={isSubmittingCommission} onClick={handleAddCommission}>
                                                {isSubmittingCommission ? t("competition.adding") : t("competition.addCommission")}
                                            </ActionButton>
                                        </div>
                                    </div>
                                )}

                                {initialData.commissions.length > 0 ? (
                                    <div className="flex flex-col gap-2.5">
                                        {initialData.commissions.map((comm) => (
                                            <CommissionRow key={comm.id} comm={comm} />
                                        ))}
                                    </div>
                                ) : (
                                    !isAddingCommission && (
                                        <EmptyState
                                            icon={Wine}
                                            title={t("competition.noCommissions")}
                                            description={t("competition.noCommissionsDescription")}
                                            action={
                                                isHolder ? (
                                                    <ActionButton size="sm" icon={Plus} onClick={openAddCommission}>
                                                        {t("competition.addCommission")}
                                                    </ActionButton>
                                                ) : undefined
                                            }
                                        />
                                    )
                                )}
                            </SectionCard>
                        </div>

                        {/* Sidebar — reference information you glance at. */}
                        <aside className="flex min-w-0 flex-col gap-5 md:gap-6 lg:col-span-2">
                            <SectionCard title={t("common.overview")} icon={Layers}>
                                <div className="flex flex-col gap-3">
                                    <MetaTile icon={Layers} label={t("competition.series")} value={initialData.series.name} />

                                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3.5">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-[18px] w-[18px] shrink-0 text-indigo-500" />
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                {t("competition.holders")}
                                            </span>
                                        </div>
                                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                                            {initialData.holders.length > 0 ? (
                                                initialData.holders.map((holderAuid) => (
                                                    <span
                                                        key={holderAuid}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-2.5"
                                                    >
                                                        <UserAvatar auid={holderAuid} username={usernames[holderAuid]} className="h-6 w-6" />
                                                        <span className="text-xs font-semibold text-slate-700">
                                                            {usernames[holderAuid] || String(holderAuid)}
                                                        </span>
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-400">{t("competition.noHolders")}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </SectionCard>

                            <ScheduleTimeline
                                labels={{
                                    title: t("competition.timelineDetails"),
                                    plannedStart: t("competition.plannedStart"),
                                    plannedEnd: t("competition.plannedEnd"),
                                    actualStart: t("competition.actualStart"),
                                    actualEnd: t("competition.actualEnd"),
                                    notStartedYet: t("competition.notStartedYet"),
                                    notEndedYet: t("competition.notEndedYet"),
                                }}
                                plannedStartAt={initialData.plannedStartAt}
                                plannedEndAt={initialData.plannedEndAt}
                                startedAt={initialData.startedAt}
                                endedAt={initialData.endedAt}
                                canEdit={isHolder}
                                onSave={handleSaveDates}
                                calendarUrl={calendarUrl}
                            />
                        </aside>
                    </div>

                    {children}
                </div>
            </main>
        </div>
    )
}
