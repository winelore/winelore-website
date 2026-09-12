"use client"

import React, { useMemo, useState } from "react"
import { toast } from "sonner"
import {
    Layers,
    Plus,
    Pencil,
    Trash2,
    Wine,
    Tag,
    Boxes,
    FlaskConical,
    Check,
    X,
    Loader2,
    GripVertical,
    User,
    ChevronDown,
    Search,
    Ban,
    Clock,
} from "lucide-react"
import {
    addCommissionPanelAction,
    renameCommissionPanelAction,
    removeCommissionPanelAction,
    removeCommissionCandidateAction,
    reorderCommissionCandidatesAction
} from "../../actions"
import { isReplicaCandidateFinished } from "../../replicaUtils"
import { CandidateWizardModal } from "./CandidateWizardModal"
import { EditCandidateCodeModal } from "./EditCandidateCodeModal"
import { useTranslation } from "@/lib/i18n/context"
import type { MessageKey } from "@/lib/i18n"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface CandidateSample {
    id: string
    volumeMl?: number | null
    batch?: {
        id: string
        lotNumber?: string | null
        volumeMl?: number | null
        attributes?: any
        beverage?: {
            id: string
            name: string
            status?: string
            attributes?: any
            producers?: { auid?: number[] | number | null; producerId?: string | null }[] | null
        } | null
    } | null
}

export interface Candidate {
    id: string
    panelId?: string | null
    anonymizedCode?: string | null
    beverageType?: { id: string; code: string; name: string } | null
    sample?: CandidateSample | null
}

export interface CommissionPanel {
    id: string
    name: string
    candidates?: Candidate[] | null
}

/** The replica whose tasting progress is overlaid on the panels once it has started. */
export interface PanelsProgressReplica {
    name: string
    status: string
    currentPanelId?: string | null
    replicaPanels: {
        id: string
        currentCandidateId?: string | null
        panel?: { id: string } | null
        replicaCandidates?: { id: string; status: string; candidate?: { id: string } | null }[] | null
    }[]
}

type SampleState = "CURRENT" | "EVALUATED" | "DISQUALIFIED" | "POSTPONED" | "PENDING"

interface PanelProgress {
    isCurrent: boolean
    finished: number
    total: number
    stateByCandidateId: Map<string, SampleState>
}

// Below this many samples the whole list fits on screen, so a search box is just noise.
const SEARCH_THRESHOLD = 6

interface PanelsSectionProps {
    commissionId: string
    panels: CommissionPanel[]
    candidates: Candidate[]
    isCompetitionHolder: boolean
    isDraft?: boolean
    isPreStart?: boolean
    isEnded?: boolean
    usernames?: Record<string, string>
    progressReplica?: PanelsProgressReplica | null
    onRefresh: () => void | Promise<void>
}

function getVintage(attributes: unknown): string | null {
    let attrs = attributes
    if (typeof attrs === "string") {
        try {
            attrs = JSON.parse(attrs)
        } catch {
            return null
        }
    }
    const vintage = attrs && typeof attrs === "object" ? (attrs as { vintage?: unknown }).vintage : null
    return vintage ? String(vintage) : null
}

function getProducerNames(candidate: Candidate, usernames?: Record<string, string>): string | null {
    const producers = candidate.sample?.batch?.beverage?.producers
    if (!producers?.length || !usernames) return null
    const names = producers
        .flatMap((p) => (p.auid ? (Array.isArray(p.auid) ? p.auid : [p.auid]) : []))
        .filter(Boolean)
        .map((id) => usernames[id] || String(id))
    return names.length > 0 ? names.join(", ") : null
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
}

/** Insertion index (0..rows.length) for a pointer at `clientY` inside a panel's sample list. */
function getInsertIndex(container: HTMLElement, clientY: number): number {
    const rows = Array.from(container.querySelectorAll<HTMLElement>("[data-sample-row]"))
    const idx = rows.findIndex((row) => {
        const rect = row.getBoundingClientRect()
        return clientY < rect.top + rect.height / 2
    })
    return idx === -1 ? rows.length : idx
}

const SAMPLE_STATE_STYLES: Record<Exclude<SampleState, "PENDING">, { tile: string; badge: string; labelKey: MessageKey }> = {
    CURRENT: {
        tile: "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/25",
        badge: "bg-indigo-50 text-indigo-600 border-indigo-100",
        labelKey: "panels.tastingNow",
    },
    EVALUATED: {
        tile: "bg-emerald-50 border-emerald-100 text-emerald-600",
        badge: "bg-emerald-50 text-emerald-600 border-emerald-100",
        labelKey: "panels.sampleEvaluated",
    },
    DISQUALIFIED: {
        tile: "bg-rose-50 border-rose-100 text-rose-600",
        badge: "bg-rose-50 text-rose-600 border-rose-100",
        labelKey: "panels.sampleDisqualified",
    },
    POSTPONED: {
        tile: "bg-amber-50 border-amber-100 text-amber-600",
        badge: "bg-amber-50 text-amber-600 border-amber-100",
        labelKey: "panels.samplePostponed",
    },
}

export function PanelsSection({
    commissionId,
    panels,
    candidates,
    isCompetitionHolder,
    isDraft = false,
    isEnded = false,
    usernames,
    progressReplica,
    onRefresh,
}: PanelsSectionProps) {
    const { t, tCount, formatBeverageType } = useTranslation()
    const canManage = isCompetitionHolder && isDraft
    const canShowRealBeverage = isCompetitionHolder || isEnded

    // Add Panel Inline
    const [isAddingPanel, setIsAddingPanel] = useState(false)
    const [newPanelName, setNewPanelName] = useState("")
    const [isCreatingPanel, setIsCreatingPanel] = useState(false)

    // Edit Panel Name
    const [editingPanelId, setEditingPanelId] = useState<string | null>(null)
    const [editPanelName, setEditPanelName] = useState("")
    const [isSavingPanel, setIsSavingPanel] = useState(false)

    // Deletion: the target outlives the open flag so the dialog text doesn't flip while it animates out
    const [deleteTarget, setDeleteTarget] = useState<{ type: "panel" | "candidate"; id: string; label: string } | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [deletingPanelId, setDeletingPanelId] = useState<string | null>(null)
    const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null)

    // Wizard Modal State
    const [wizardState, setWizardState] = useState<{
        isOpen: boolean
        panelId: string
        panelName: string
    }>({
        isOpen: false,
        panelId: "",
        panelName: "",
    })

    // Edit Code Modal State
    const [editCodeState, setEditCodeState] = useState<{
        isOpen: boolean
        candidateId: string
        currentCode?: string | null
        label?: string
    }>({
        isOpen: false,
        candidateId: "",
        currentCode: null,
        label: "",
    })

    const [collapsedPanelIds, setCollapsedPanelIds] = useState<Set<string>>(() => new Set())
    const [query, setQuery] = useState("")

    // Reordering: `pendingOrder` shows the new order immediately while the server catches up
    const [draggedItem, setDraggedItem] = useState<{ panelId: string; candidateId: string } | null>(null)
    const [dropTarget, setDropTarget] = useState<{ panelId: string; index: number } | null>(null)
    const [pendingOrder, setPendingOrder] = useState<{ panelId: string; ids: string[] } | null>(null)
    const [isReordering, setIsReordering] = useState(false)

    const normalizedQuery = query.trim().toLowerCase()
    const canReorder = canManage && !normalizedQuery && !isReordering

    const getPanelCandidates = (panel: CommissionPanel): Candidate[] => {
        const list = panel.candidates && panel.candidates.length > 0
            ? panel.candidates
            : candidates.filter((c) => c.panelId === panel.id)
        if (pendingOrder?.panelId !== panel.id) return list
        const position = new Map(pendingOrder.ids.map((id, i) => [id, i]))
        return [...list].sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0))
    }

    const getBeverageTypeLabel = (candidate: Candidate): string | null => {
        const type = candidate.beverageType
        if (!type) return null
        const translated = formatBeverageType(type.code)
        return translated !== type.code ? translated : type.name
    }

    const describeCandidate = (candidate: Candidate) => {
        const beverageName = candidate.sample?.batch?.beverage?.name
        return {
            beverageName: canShowRealBeverage && beverageName ? beverageName : null,
            producerName: canShowRealBeverage ? getProducerNames(candidate, usernames) : null,
            code: candidate.anonymizedCode?.trim() || null,
            lotNo: candidate.sample?.batch?.lotNumber || null,
            vintage: getVintage(candidate.sample?.batch?.attributes),
            volume: candidate.sample?.volumeMl || null,
            typeLabel: getBeverageTypeLabel(candidate),
        }
    }

    const matchesQuery = (candidate: Candidate) => {
        const d = describeCandidate(candidate)
        return [d.code, d.beverageName, d.producerName, d.lotNo, d.vintage, d.typeLabel]
            .some((value) => value?.toLowerCase().includes(normalizedQuery))
    }

    const panelEntries = panels.map((panel) => ({ panel, items: getPanelCandidates(panel) }))
    const totalSamples = panelEntries.reduce((sum, entry) => sum + entry.items.length, 0)
    // Tasting-order position within the panel, stable while search hides some rows
    const positionById = new Map(panelEntries.flatMap(({ items }) => items.map((c, i) => [c.id, i] as const)))
    const visibleEntries = normalizedQuery
        ? panelEntries
            .map(({ panel, items }) => ({
                panel,
                // A panel whose name matches keeps all its samples; otherwise only the matching ones
                items: panel.name.toLowerCase().includes(normalizedQuery) ? items : items.filter(matchesQuery),
            }))
            .filter((entry) => entry.items.length > 0)
        : panelEntries

    const showProgress = progressReplica?.status === "STARTED" || progressReplica?.status === "COMPLETED"
    const isLive = progressReplica?.status === "STARTED"

    const progressByPanelId = useMemo(() => {
        const map = new Map<string, PanelProgress>()
        if (!progressReplica || !showProgress) return map
        for (const replicaPanel of progressReplica.replicaPanels) {
            const panelId = replicaPanel.panel?.id
            if (!panelId) continue
            const replicaCandidates = replicaPanel.replicaCandidates || []
            const stateByCandidateId = new Map<string, SampleState>()
            let finished = 0
            for (const rc of replicaCandidates) {
                const isFinished = isReplicaCandidateFinished(rc.status)
                if (isFinished) finished++
                if (!rc.candidate?.id) continue
                const isCurrent = isLive && !isFinished && rc.id === replicaPanel.currentCandidateId
                stateByCandidateId.set(rc.candidate.id, isCurrent ? "CURRENT" : (rc.status as SampleState))
            }
            map.set(panelId, {
                isCurrent: isLive && replicaPanel.id === progressReplica.currentPanelId,
                finished,
                total: replicaCandidates.length,
                stateByCandidateId,
            })
        }
        return map
    }, [progressReplica, showProgress, isLive])

    const overallProgress = Array.from(progressByPanelId.values()).reduce(
        (acc, p) => ({ finished: acc.finished + p.finished, total: acc.total + p.total }),
        { finished: 0, total: 0 },
    )

    const togglePanelCollapsed = (panelId: string) => {
        setCollapsedPanelIds((prev) => {
            const next = new Set(prev)
            if (next.has(panelId)) next.delete(panelId)
            else next.add(panelId)
            return next
        })
    }

    const reorderPanel = async (panelId: string, items: Candidate[], from: number, to: number) => {
        if (from === to || to < 0 || to >= items.length) return
        const candidateIds = moveItem(items, from, to).map((c) => c.id)
        setPendingOrder({ panelId, ids: candidateIds })
        setIsReordering(true)
        try {
            const res = await reorderCommissionCandidatesAction(commissionId, panelId, candidateIds)
            if (res.success) {
                await onRefresh()
            } else {
                toast.error(res.error || t("panels.reorderError"))
            }
        } catch (err: any) {
            toast.error(err.message || t("panels.reorderErrorGeneric"))
        } finally {
            setPendingOrder(null)
            setIsReordering(false)
        }
    }

    const handleCreatePanel = async () => {
        if (!newPanelName.trim()) return
        setIsCreatingPanel(true)
        try {
            const res = await addCommissionPanelAction(commissionId, newPanelName.trim())
            if (res.success) {
                setNewPanelName("")
                setIsAddingPanel(false)
                onRefresh()
            } else {
                toast.error(res.error || t("panels.createPanelError"))
            }
        } catch (err: any) {
            toast.error(err.message || t("panels.createPanelErrorGeneric"))
        } finally {
            setIsCreatingPanel(false)
        }
    }

    const handleRenamePanel = async (panelId: string) => {
        if (!editPanelName.trim()) return
        setIsSavingPanel(true)
        try {
            const res = await renameCommissionPanelAction(commissionId, panelId, editPanelName.trim())
            if (res.success) {
                setEditingPanelId(null)
                onRefresh()
            } else {
                toast.error(res.error || t("panels.renamePanelError"))
            }
        } catch (err: any) {
            toast.error(err.message || t("panels.renamePanelErrorGeneric"))
        } finally {
            setIsSavingPanel(false)
        }
    }

    const requestDelete = (type: "panel" | "candidate", id: string, label: string) => {
        setDeleteTarget({ type, id, label })
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        const { type, id } = deleteTarget
        setIsDeleteDialogOpen(false)
        if (type === "panel") {
            setDeletingPanelId(id)
            try {
                const res = await removeCommissionPanelAction(commissionId, id)
                if (res.success) {
                    onRefresh()
                } else {
                    toast.error(res.error || t("panels.deletePanelError"))
                }
            } catch (err: any) {
                toast.error(err.message || t("panels.deletePanelErrorGeneric"))
            } finally {
                setDeletingPanelId(null)
            }
        } else {
            setDeletingCandidateId(id)
            try {
                const res = await removeCommissionCandidateAction(id)
                if (res.success) {
                    onRefresh()
                } else {
                    toast.error(res.error || t("panels.deleteCandidateError"))
                }
            } catch (err: any) {
                toast.error(err.message || t("panels.deleteCandidateErrorGeneric"))
            } finally {
                setDeletingCandidateId(null)
            }
        }
    }

    const openEditCode = (candidate: Candidate, label: string) => {
        setEditCodeState({
            isOpen: true,
            candidateId: candidate.id,
            currentCode: candidate.anonymizedCode,
            label,
        })
    }

    const openWizard = (panel: CommissionPanel) => {
        setWizardState({ isOpen: true, panelId: panel.id, panelName: panel.name })
    }

    return (
        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/50 shadow-xs">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-bold tracking-tight text-slate-800">
                            {t("panels.title")}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">
                            {panels.length > 0
                                ? `${tCount("panels.panelsCount", panels.length)} · ${tCount("panels.samplesCount", totalSamples)}`
                                : t("panels.subtitle")}
                        </p>
                    </div>
                </div>

                {canManage && !isAddingPanel && panels.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setIsAddingPanel(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t("panels.addPanel")}</span>
                    </button>
                )}
            </div>

            {/* Tasting progress of the selected replica */}
            {showProgress && progressReplica && overallProgress.total > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex items-center gap-2 font-bold text-slate-700 min-w-0">
                            {isLive ? (
                                <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                            ) : (
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                            <span className="truncate">{t("panels.tastingProgress", { name: progressReplica.name })}</span>
                        </span>
                        <span className="font-semibold text-slate-500 tabular-nums shrink-0">
                            {t("panels.doneOfTotal", { done: overallProgress.finished, total: overallProgress.total })}
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                            style={{ width: `${(overallProgress.finished / overallProgress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Search */}
            {totalSamples >= SEARCH_THRESHOLD && (
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") setQuery("")
                        }}
                        placeholder={canShowRealBeverage ? t("panels.searchPlaceholder") : t("panels.searchPlaceholderBlind")}
                        aria-label={canShowRealBeverage ? t("panels.searchPlaceholder") : t("panels.searchPlaceholderBlind")}
                        className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors [&::-webkit-search-cancel-button]:hidden"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                            title={t("panels.clearSearch")}
                            aria-label={t("panels.clearSearch")}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}

            {/* Inline Add Panel Input */}
            {isAddingPanel && (
                <div className="p-4 bg-slate-50 border border-indigo-100 rounded-2xl flex flex-col gap-3 animate-fade-in">
                    <span className="text-xs font-bold text-slate-800">{t("panels.newPanelTitle")}</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder={t("panels.panelNamePlaceholder")}
                            value={newPanelName}
                            onChange={(e) => setNewPanelName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreatePanel()
                                if (e.key === "Escape") setIsAddingPanel(false)
                            }}
                            className="flex-1 min-w-0 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={handleCreatePanel}
                            disabled={isCreatingPanel || !newPanelName.trim()}
                            className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                            title={t("common.save")}
                        >
                            {isCreatingPanel ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAddingPanel(false)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs transition-colors cursor-pointer shrink-0"
                            title={t("competition.cancel")}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Panels List */}
            {panels.length === 0 ? (
                !isAddingPanel && (
                    <div className="py-10 px-4 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/40 gap-2">
                        <Layers className="w-8 h-8 text-slate-300" />
                        <span className="text-xs font-bold text-slate-700">{t("panels.noPanelsYet")}</span>
                        <p className="text-[11px] text-slate-400 max-w-xs">
                            {t("panels.createPanelDesc")}
                        </p>
                        {canManage && (
                            <button
                                type="button"
                                onClick={() => setIsAddingPanel(true)}
                                className="mt-2 flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{t("panels.addPanel")}</span>
                            </button>
                        )}
                    </div>
                )
            ) : visibleEntries.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                    {t("panels.noSearchResults", { query: query.trim() })}
                </p>
            ) : (
                <div className="flex flex-col gap-3">
                    {visibleEntries.map(({ panel, items }) => {
                        const panelNumber = panels.findIndex((p) => p.id === panel.id) + 1
                        const isRenamingThis = editingPanelId === panel.id
                        // Search results are always shown expanded
                        const isCollapsed = !normalizedQuery && collapsedPanelIds.has(panel.id)
                        const progress = progressByPanelId.get(panel.id)
                        const isThisPanelSaving = isReordering && pendingOrder?.panelId === panel.id
                        const draggedIdx = draggedItem?.panelId === panel.id
                            ? items.findIndex((c) => c.id === draggedItem.candidateId)
                            : -1
                        // Only draw the drop line where dropping would actually move something
                        const insertIdx = dropTarget?.panelId === panel.id
                            && draggedIdx !== -1
                            && dropTarget.index !== draggedIdx
                            && dropTarget.index !== draggedIdx + 1
                            ? dropTarget.index
                            : -1

                        return (
                            <div
                                key={panel.id}
                                className={`border rounded-2xl overflow-hidden transition-colors ${
                                    progress?.isCurrent
                                        ? "border-indigo-200 ring-4 ring-indigo-500/5"
                                        : "border-slate-200/70"
                                }`}
                            >
                                {/* Panel Card Header */}
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-white">
                                    {isRenamingThis ? (
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <input
                                                type="text"
                                                value={editPanelName}
                                                onChange={(e) => setEditPanelName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleRenamePanel(panel.id)
                                                    if (e.key === "Escape") setEditingPanelId(null)
                                                }}
                                                className="flex-1 min-w-0 px-3 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRenamePanel(panel.id)}
                                                disabled={isSavingPanel}
                                                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs cursor-pointer shrink-0"
                                                title={t("common.save")}
                                            >
                                                {isSavingPanel ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Check className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingPanelId(null)}
                                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs cursor-pointer shrink-0"
                                                title={t("competition.cancel")}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => togglePanelCollapsed(panel.id)}
                                                aria-expanded={!isCollapsed}
                                                title={isCollapsed ? t("panels.expandPanel") : t("panels.collapsePanel")}
                                                className="flex items-center gap-2.5 min-w-0 flex-1 text-left rounded-xl py-0.5 cursor-pointer group"
                                            >
                                                <ChevronDown
                                                    className={`w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                                                        isCollapsed ? "-rotate-90" : ""
                                                    }`}
                                                />
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100/60 text-[11px] font-extrabold text-indigo-600 tabular-nums">
                                                    {panelNumber}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-extrabold text-slate-800 truncate">
                                                        {panel.name}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                                                        <span>{tCount("panels.samplesCount", items.length)}</span>
                                                        {progress && progress.total > 0 && (
                                                            <>
                                                                <span className="text-slate-300">·</span>
                                                                <span className={`tabular-nums ${progress.finished === progress.total ? "text-emerald-600" : ""}`}>
                                                                    {t("panels.doneOfTotal", { done: progress.finished, total: progress.total })}
                                                                </span>
                                                            </>
                                                        )}
                                                    </span>
                                                </span>
                                                {progress?.isCurrent && (
                                                    <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                        {t("panels.tastingNow")}
                                                    </span>
                                                )}
                                            </button>

                                            {isThisPanelSaving && (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500 shrink-0" />
                                            )}

                                            {canManage && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => openWizard(panel)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                                                        title={t("panels.addSample")}
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">{t("panels.addSample")}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingPanelId(panel.id)
                                                            setEditPanelName(panel.name)
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                                                        title={t("panels.renamePanel")}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => requestDelete("panel", panel.id, panel.name)}
                                                        disabled={deletingPanelId === panel.id}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                                        title={t("panels.deletePanel")}
                                                    >
                                                        {deletingPanelId === panel.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {progress && progress.total > 0 && (
                                    <div className="h-0.5 bg-slate-100">
                                        <div
                                            className="h-full bg-emerald-500 transition-[width] duration-500"
                                            style={{ width: `${(progress.finished / progress.total) * 100}%` }}
                                        />
                                    </div>
                                )}

                                {!isCollapsed && (
                                    <div
                                        onDragOver={(e) => {
                                            if (!draggedItem || draggedItem.panelId !== panel.id) return
                                            e.preventDefault()
                                            e.dataTransfer.dropEffect = "move"
                                            const index = getInsertIndex(e.currentTarget, e.clientY)
                                            if (dropTarget?.panelId !== panel.id || dropTarget.index !== index) {
                                                setDropTarget({ panelId: panel.id, index })
                                            }
                                        }}
                                        onDragLeave={(e) => {
                                            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                                                setDropTarget(null)
                                            }
                                        }}
                                        onDrop={(e) => {
                                            if (!draggedItem || draggedItem.panelId !== panel.id || draggedIdx === -1) return
                                            e.preventDefault()
                                            const index = getInsertIndex(e.currentTarget, e.clientY)
                                            setDropTarget(null)
                                            setDraggedItem(null)
                                            reorderPanel(panel.id, items, draggedIdx, index > draggedIdx ? index - 1 : index)
                                        }}
                                        className="border-t border-slate-100 bg-slate-50/50 p-3 flex flex-col gap-2"
                                    >
                                        {items.length === 0 ? (
                                            canManage ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openWizard(panel)}
                                                    className="flex items-center justify-center gap-1.5 py-4 rounded-xl border border-dashed border-slate-200 text-xs font-bold text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors cursor-pointer"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    {t("panels.addFirstSample")}
                                                </button>
                                            ) : (
                                                <p className="text-xs text-slate-400 py-3 text-center italic">
                                                    {t("panels.noCandidatesInPanel")}
                                                </p>
                                            )
                                        ) : (
                                            items.map((cand, idx) => {
                                                const d = describeCandidate(cand)
                                                const position = positionById.get(cand.id) ?? idx
                                                const label = d.beverageName || d.code || t("panels.sampleNumber", { number: position + 1 })
                                                const state = progress?.stateByCandidateId.get(cand.id) ?? "PENDING"
                                                const stateStyle = state !== "PENDING" ? SAMPLE_STATE_STYLES[state] : null
                                                const isDragged = draggedItem?.candidateId === cand.id

                                                return (
                                                    <div
                                                        key={cand.id}
                                                        data-sample-row
                                                        draggable={canReorder}
                                                        onDragStart={(e) => {
                                                            if (!canReorder) return
                                                            setDraggedItem({ panelId: panel.id, candidateId: cand.id })
                                                            e.dataTransfer.effectAllowed = "move"
                                                            e.dataTransfer.setData("text/plain", cand.id)
                                                        }}
                                                        onDragEnd={() => {
                                                            setDraggedItem(null)
                                                            setDropTarget(null)
                                                        }}
                                                        className={`group relative flex items-center gap-2.5 rounded-xl border bg-white p-2.5 transition-all ${
                                                            isDragged
                                                                ? "opacity-40 border-dashed border-indigo-300"
                                                                : state === "CURRENT"
                                                                    ? "border-indigo-200 shadow-sm shadow-indigo-500/10"
                                                                    : "border-slate-100 hover:border-slate-200 hover:shadow-sm"
                                                        }`}
                                                    >
                                                        {insertIdx === idx && (
                                                            <div className="pointer-events-none absolute -top-[5px] inset-x-1 h-0.5 rounded-full bg-indigo-500" />
                                                        )}
                                                        {insertIdx === items.length && idx === items.length - 1 && (
                                                            <div className="pointer-events-none absolute -bottom-[5px] inset-x-1 h-0.5 rounded-full bg-indigo-500" />
                                                        )}

                                                        {canManage && (
                                                            <button
                                                                type="button"
                                                                data-reorder-handle={cand.id}
                                                                // Only unavailable while searching; a save in flight just ignores keys, since disabling would drop focus
                                                                disabled={!!normalizedQuery}
                                                                onKeyDown={(e) => {
                                                                    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return
                                                                    e.preventDefault()
                                                                    if (!canReorder) return
                                                                    reorderPanel(panel.id, items, idx, e.key === "ArrowUp" ? idx - 1 : idx + 1)
                                                                    // Moving the row can drop focus; put it back on the same handle
                                                                    requestAnimationFrame(() => {
                                                                        document.querySelector<HTMLElement>(`[data-reorder-handle="${cand.id}"]`)?.focus()
                                                                    })
                                                                }}
                                                                className="-ml-1 p-1 rounded-md text-slate-300 hover:text-slate-500 focus-visible:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/40 outline-none cursor-grab active:cursor-grabbing disabled:cursor-default disabled:opacity-40 shrink-0"
                                                                title={t("panels.reorderHint")}
                                                                aria-label={t("panels.reorderHint")}
                                                            >
                                                                <GripVertical className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        <span
                                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[11px] font-extrabold tabular-nums ${
                                                                stateStyle ? stateStyle.tile : "bg-slate-50 border-slate-100 text-slate-500"
                                                            }`}
                                                            title={stateStyle ? t(stateStyle.labelKey) : undefined}
                                                        >
                                                            {state === "EVALUATED" ? (
                                                                <Check className="w-4 h-4" />
                                                            ) : state === "DISQUALIFIED" ? (
                                                                <Ban className="w-3.5 h-3.5" />
                                                            ) : state === "POSTPONED" ? (
                                                                <Clock className="w-3.5 h-3.5" />
                                                            ) : (
                                                                position + 1
                                                            )}
                                                        </span>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                {d.beverageName ? (
                                                                    <p className="text-xs font-bold text-slate-800 truncate">
                                                                        {d.beverageName}
                                                                    </p>
                                                                ) : (
                                                                    <p className={`text-xs font-bold text-slate-800 truncate ${d.code ? "font-mono tracking-wide" : ""}`}>
                                                                        {label}
                                                                    </p>
                                                                )}
                                                                {d.beverageName && (d.code || canManage) && (
                                                                    canManage ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openEditCode(cand, label)}
                                                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border shrink-0 cursor-pointer transition-colors ${
                                                                                d.code
                                                                                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                                                                    : "bg-white text-slate-400 border-dashed border-slate-300 hover:text-indigo-600 hover:border-indigo-300"
                                                                            }`}
                                                                            title={t("panels.editCode")}
                                                                        >
                                                                            {d.code ? (
                                                                                <>
                                                                                    <Tag className="w-3 h-3 text-amber-600" />
                                                                                    <span>{d.code}</span>
                                                                                </>
                                                                            ) : (
                                                                                <span className="font-sans">{t("panels.addCode")}</span>
                                                                            )}
                                                                        </button>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                                                            <Tag className="w-3 h-3 text-amber-600" />
                                                                            <span>{d.code}</span>
                                                                        </span>
                                                                    )
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                                                                {!d.beverageName && (
                                                                    <span className="font-medium">{t("panels.blindSample")}</span>
                                                                )}
                                                                {d.typeLabel && (
                                                                    <span className="flex items-center gap-1 font-medium text-slate-500">
                                                                        <Wine className="w-3 h-3 text-slate-400" />
                                                                        <span>{d.typeLabel}</span>
                                                                    </span>
                                                                )}
                                                                {d.producerName && (
                                                                    <span className="flex items-center gap-1 font-medium text-slate-500 min-w-0">
                                                                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                                                                        <span className="truncate">{d.producerName}</span>
                                                                    </span>
                                                                )}
                                                                {d.lotNo && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Boxes className="w-3 h-3 text-slate-400" />
                                                                        <span>{t("panels.lotNo", { lot: d.lotNo })}</span>
                                                                    </span>
                                                                )}
                                                                {d.vintage && (
                                                                    <span className="text-[9px] text-indigo-500 bg-indigo-50/60 font-semibold px-1 rounded-sm">
                                                                        {d.vintage}
                                                                    </span>
                                                                )}
                                                                {d.volume && (
                                                                    <span className="flex items-center gap-1">
                                                                        <FlaskConical className="w-3 h-3 text-slate-400" />
                                                                        <span>{d.volume} ml</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {stateStyle && (
                                                            <span className={`hidden sm:inline-flex items-center gap-1.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${stateStyle.badge}`}>
                                                                {state === "CURRENT" && (
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                                )}
                                                                {t(stateStyle.labelKey)}
                                                            </span>
                                                        )}

                                                        {canManage && (
                                                            <div className="flex items-center gap-0.5 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEditCode(cand, label)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                                    title={t("panels.editCode")}
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => requestDelete("candidate", cand.id, d.code ? `${label} · ${d.code}` : label)}
                                                                    disabled={deletingCandidateId === cand.id}
                                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                                    title={t("panels.deleteSample")}
                                                                >
                                                                    {deletingCandidateId === cand.id ? (
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Candidate Wizard Modal */}
            <CandidateWizardModal
                isOpen={wizardState.isOpen}
                onClose={() => setWizardState((prev) => ({ ...prev, isOpen: false }))}
                commissionId={commissionId}
                panelId={wizardState.panelId}
                panelName={wizardState.panelName}
                onCandidateAdded={onRefresh}
            />

            {/* Edit Candidate Code Modal */}
            <EditCandidateCodeModal
                isOpen={editCodeState.isOpen}
                onClose={() => setEditCodeState((prev) => ({ ...prev, isOpen: false }))}
                candidateId={editCodeState.candidateId}
                currentCode={editCodeState.currentCode}
                candidateLabel={editCodeState.label}
                onCodeUpdated={onRefresh}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {deleteTarget?.type === "panel" ? t("panels.deletePanel") : t("panels.deleteSample")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget?.label && (
                                <span className="block font-semibold text-slate-700 mb-1">{deleteTarget.label}</span>
                            )}
                            {deleteTarget?.type === "panel" ? t("panels.confirmDeletePanel") : t("panels.confirmDeleteCandidate")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("competition.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
                        >
                            {deleteTarget?.type === "panel" ? t("panels.deletePanel") : t("panels.deleteSample")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
