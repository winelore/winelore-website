"use client"

import React, { useState } from "react"
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
    AlertCircle
} from "lucide-react"
import {
    addCommissionPanelAction,
    renameCommissionPanelAction,
    removeCommissionPanelAction,
    removeCommissionCandidateAction
} from "../../actions"
import { CandidateWizardModal } from "./CandidateWizardModal"
import { EditCandidateCodeModal } from "./EditCandidateCodeModal"
import { useTranslation } from "@/lib/i18n/context"

export interface CandidateSample {
    id: string
    volumeMl?: number | null
    batch?: {
        id: string
        lotNumber?: string | null
        volumeMl?: number | null
        beverage?: {
            id: string
            name: string
        } | null
    } | null
}

export interface Candidate {
    id: string
    panelId?: string | null
    anonymizedCode?: string | null
    sample?: CandidateSample | null
}

export interface CommissionPanel {
    id: string
    name: string
    candidates?: Candidate[] | null
}

interface PanelsSectionProps {
    commissionId: string
    panels: CommissionPanel[]
    candidates: Candidate[]
    isCompetitionHolder: boolean
    isDraft?: boolean
    isPreStart?: boolean
    onRefresh: () => void
}

export function PanelsSection({
    commissionId,
    panels,
    candidates,
    isCompetitionHolder,
    isDraft = false,
    onRefresh,
}: PanelsSectionProps) {
    const { t } = useTranslation()
    // Add Panel Inline
    const [isAddingPanel, setIsAddingPanel] = useState(false)
    const [newPanelName, setNewPanelName] = useState("")
    const [isCreatingPanel, setIsCreatingPanel] = useState(false)

    // Edit Panel Name
    const [editingPanelId, setEditingPanelId] = useState<string | null>(null)
    const [editPanelName, setEditPanelName] = useState("")
    const [isSavingPanel, setIsSavingPanel] = useState(false)

    // Delete Panel
    const [deletingPanelId, setDeletingPanelId] = useState<string | null>(null)

    // Delete Candidate
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
                alert(res.error || "Не вдалося створити панель")
            }
        } catch (err: any) {
            alert(err.message || "Помилка при створенні панелі")
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
                alert(res.error || "Не вдалося перейменувати панель")
            }
        } catch (err: any) {
            alert(err.message || "Помилка при перейменуванні")
        } finally {
            setIsSavingPanel(false)
        }
    }

    const handleDeletePanel = async (panelId: string) => {
        if (!confirm(t("panels.confirmDeletePanel"))) return
        setDeletingPanelId(panelId)
        try {
            const res = await removeCommissionPanelAction(commissionId, panelId)
            if (res.success) {
                onRefresh()
            } else {
                alert(res.error || "Не вдалося видалити панель")
            }
        } catch (err: any) {
            alert(err.message || "Помилка при видаленні панелі")
        } finally {
            setDeletingPanelId(null)
        }
    }

    const handleDeleteCandidate = async (candidateId: string) => {
        if (!confirm(t("panels.confirmDeleteCandidate"))) return
        setDeletingCandidateId(candidateId)
        try {
            const res = await removeCommissionCandidateAction(candidateId)
            if (res.success) {
                onRefresh()
            } else {
                alert(res.error || "Не вдалося видалити кандидата")
            }
        } catch (err: any) {
            alert(err.message || "Помилка при видаленні зразка")
        } finally {
            setDeletingCandidateId(null)
        }
    }

    return (
        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/50 shadow-xs">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold tracking-tight text-slate-800">
                            {t("panels.title")}
                        </h3>
                        <p className="text-xs text-slate-400">
                            {t("panels.subtitle")}
                        </p>
                    </div>
                </div>

                {isCompetitionHolder && isDraft && !isAddingPanel && (
                    <button
                        type="button"
                        onClick={() => setIsAddingPanel(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t("panels.addPanel")}</span>
                    </button>
                )}
            </div>

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
                            className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
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
                <div className="py-10 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/40 text-slate-400 gap-2">
                    <Layers className="w-8 h-8 text-slate-300" />
                    <span className="text-xs font-bold text-slate-700">{t("panels.noPanelsYet")}</span>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                        {t("panels.createPanelDesc")}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {panels.map((panel) => {
                        // Gather candidates belonging to this panel
                        const panelCandidates =
                            panel.candidates && panel.candidates.length > 0
                                ? panel.candidates
                                : candidates.filter((c) => c.panelId === panel.id)

                        const isRenamingThis = editingPanelId === panel.id

                        return (
                            <div
                                key={panel.id}
                                className="border border-slate-150 rounded-2xl bg-slate-50/30 overflow-hidden transition-all"
                            >
                                {/* Panel Card Header */}
                                <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3">
                                    {isRenamingThis ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="text"
                                                value={editPanelName}
                                                onChange={(e) => setEditPanelName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleRenamePanel(panel.id)
                                                    if (e.key === "Escape") setEditingPanelId(null)
                                                }}
                                                className="flex-1 px-3 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRenamePanel(panel.id)}
                                                disabled={isSavingPanel}
                                                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs cursor-pointer"
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
                                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs cursor-pointer"
                                                title={t("competition.cancel")}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <h4 className="text-sm font-extrabold text-slate-800 truncate">
                                                {panel.name}
                                            </h4>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                                                {t("panels.samplesCount", { count: panelCandidates.length })}
                                            </span>
                                            {isCompetitionHolder && isDraft && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingPanelId(panel.id)
                                                        setEditPanelName(panel.name)
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                    title={t("panels.renamePanel")}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 shrink-0">
                                        {isCompetitionHolder && isDraft && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setWizardState({
                                                            isOpen: true,
                                                            panelId: panel.id,
                                                            panelName: panel.name,
                                                        })
                                                    }
                                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>{t("panels.addSample")}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeletePanel(panel.id)}
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
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Candidates in Panel */}
                                <div className="p-4 flex flex-col gap-2">
                                    {panelCandidates.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-3 text-center italic">
                                            {t("panels.noCandidatesInPanel")}
                                        </p>
                                    ) : (
                                        panelCandidates.map((cand, idx) => {
                                            const bevName = cand.sample?.batch?.beverage?.name || t("commission.results.candidate")
                                            const lotNo = cand.sample?.batch?.lotNumber
                                            const vol = cand.sample?.volumeMl

                                            return (
                                                <div
                                                    key={cand.id}
                                                    className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-2xs hover:border-indigo-100 transition-all gap-3"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span className="w-5 text-center text-xs font-bold text-slate-300">
                                                            {idx + 1}
                                                        </span>
                                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/50">
                                                            <Wine className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="text-xs font-bold text-slate-800 truncate">
                                                                    {bevName}
                                                                </p>
                                                                {cand.anonymizedCode && (
                                                                    <span
                                                                        onClick={() => {
                                                                            if (isCompetitionHolder && isDraft) {
                                                                                setEditCodeState({
                                                                                    isOpen: true,
                                                                                    candidateId: cand.id,
                                                                                    currentCode: cand.anonymizedCode,
                                                                                    label: bevName,
                                                                                })
                                                                            }
                                                                        }}
                                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 ${
                                                                            isCompetitionHolder && isDraft
                                                                                ? "cursor-pointer hover:bg-amber-100"
                                                                                : ""
                                                                        }`}
                                                                        title={t("panels.editCode")}
                                                                    >
                                                                        <Tag className="w-3 h-3 text-amber-600" />
                                                                        <span>{cand.anonymizedCode}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                                                {lotNo && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Boxes className="w-3 h-3 text-slate-400" />
                                                                        <span>{t("panels.lotNo", { lot: lotNo })}</span>
                                                                    </span>
                                                                )}
                                                                {vol && (
                                                                    <span className="flex items-center gap-1">
                                                                        <FlaskConical className="w-3 h-3 text-slate-400" />
                                                                        <span>{vol} ml</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isCompetitionHolder && isDraft && (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setEditCodeState({
                                                                        isOpen: true,
                                                                        candidateId: cand.id,
                                                                        currentCode: cand.anonymizedCode,
                                                                        label: bevName,
                                                                    })
                                                                }
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                                title={t("panels.editCode")}
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteCandidate(cand.id)}
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
        </div>
    )
}
