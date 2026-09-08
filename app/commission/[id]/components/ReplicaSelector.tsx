"use client"

import React, { useState } from "react"
import { Check, Layers, Pencil, Plus, Users, X } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { ActionButton, EmptyState, SectionCard, StatusPill } from "@/components/detail"

interface ReplicaLike {
    id: string
    name: string
    type: "STANDARD" | "TRAINEE"
    status: string
    members: { id: string; auid: number[]; isReady: boolean }[]
}

/**
 * Picks which tasting replica the rest of the page is about.
 *
 * The old version rendered each replica as a solid indigo block when selected,
 * which made the selected row the loudest thing on the page even though it is
 * navigation, not an action. It also hid the one number people actually scan
 * for — how many of that replica's members are ready.
 */
export function ReplicaSelector({
    replicas,
    selectedReplicaId,
    onSelect,
    currentAuid,
    canManage,
    onAdd,
    onRename,
}: {
    replicas: ReplicaLike[]
    selectedReplicaId: string | null
    onSelect: (id: string) => void
    currentAuid: number | null
    canManage: boolean
    onAdd: (name: string | undefined, type: "STANDARD" | "TRAINEE") => Promise<boolean>
    onRename: (id: string, name: string | undefined) => Promise<boolean>
}) {
    const { t, formatReplicaType } = useTranslation()
    const [isAdding, setIsAdding] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [newName, setNewName] = useState("")
    const [newType, setNewType] = useState<"STANDARD" | "TRAINEE">("STANDARD")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")

    const openAdd = () => {
        setNewName("")
        setNewType("STANDARD")
        setIsAdding(true)
    }

    const submitAdd = async () => {
        setIsSubmitting(true)
        try {
            if (await onAdd(newName.trim() || undefined, newType)) setIsAdding(false)
        } finally {
            setIsSubmitting(false)
        }
    }

    const submitRename = async (id: string) => {
        setIsSubmitting(true)
        try {
            if (await onRename(id, editName.trim() || undefined)) setEditingId(null)
        } finally {
            setIsSubmitting(false)
        }
    }

    const sorted = [...replicas].sort((a, b) => (a.members?.length || 0) - (b.members?.length || 0))

    return (
        <SectionCard
            icon={Layers}
            title={t("commission.tastingReplicas")}
            actions={
                canManage && !isAdding ? (
                    <ActionButton size="sm" variant="secondary" icon={Plus} onClick={openAdd}>
                        {t("commission.addReplica")}
                    </ActionButton>
                ) : null
            }
        >
            {isAdding && (
                <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">{t("commission.addTastingReplica")}</span>
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            title={t("common.close")}
                            aria-label={t("common.close")}
                            className="cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            {t("commission.replicaNameOptional")}
                        </span>
                        <input
                            type="text"
                            autoFocus
                            placeholder={t("commission.replicaNamePlaceholder")}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter") submitAdd()
                                if (e.key === "Escape") setIsAdding(false)
                            }}
                        />
                    </label>

                    <fieldset className="flex flex-col gap-1.5">
                        <legend className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            {t("commission.replicaType")}
                        </legend>
                        <div className="mt-1 flex gap-2">
                            {(["STANDARD", "TRAINEE"] as const).map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    aria-pressed={newType === type}
                                    onClick={() => setNewType(type)}
                                    className={`h-9 flex-1 cursor-pointer rounded-xl border px-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                                        newType === type
                                            ? "border-indigo-600 bg-indigo-600 text-white"
                                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                                    }`}
                                >
                                    {type === "STANDARD" ? t("commission.typeStandard") : t("commission.typeTrainee")}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div className="flex justify-end gap-2">
                        <ActionButton size="sm" variant="secondary" onClick={() => setIsAdding(false)} disabled={isSubmitting}>
                            {t("common.cancel")}
                        </ActionButton>
                        <ActionButton size="sm" icon={Plus} loading={isSubmitting} onClick={submitAdd}>
                            {isSubmitting ? t("competition.adding") : t("commission.addReplica")}
                        </ActionButton>
                    </div>
                </div>
            )}

            {sorted.length === 0 && !isAdding ? (
                <EmptyState
                    icon={Layers}
                    title={t("commission.noReplicasYet")}
                    action={
                        canManage ? (
                            <ActionButton size="sm" icon={Plus} onClick={openAdd}>
                                {t("commission.addReplica")}
                            </ActionButton>
                        ) : undefined
                    }
                />
            ) : (
                <div className="flex flex-col gap-2" role="group" aria-label={t("commission.tastingReplicas")}>
                    {sorted.map(r => {
                        const isSelected = r.id === selectedReplicaId
                        const isMine = r.members.some(m => currentAuid !== null && m.auid.includes(currentAuid))
                        const readyCount = r.members.filter(m => m.isReady).length

                        if (editingId === r.id) {
                            return (
                                <div
                                    key={r.id}
                                    className="flex w-full items-center gap-2 rounded-2xl border border-indigo-300 bg-white px-3 py-2"
                                >
                                    <input
                                        type="text"
                                        autoFocus
                                        aria-label={t("commission.renameReplica")}
                                        placeholder={t("commission.replicaNamePlaceholder")}
                                        className="min-w-0 flex-1 rounded-lg border border-indigo-300 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-900 outline-none focus:border-indigo-600"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === "Enter") submitRename(r.id)
                                            if (e.key === "Escape") setEditingId(null)
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => submitRename(r.id)}
                                        disabled={isSubmitting}
                                        title={t("common.save")}
                                        aria-label={t("common.save")}
                                        className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        ) : (
                                            <Check className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        title={t("common.cancel")}
                                        aria-label={t("common.cancel")}
                                        className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )
                        }

                        return (
                            <div
                                key={r.id}
                                className={`group relative flex items-center gap-2 rounded-2xl border transition-colors ${
                                    isSelected
                                        ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200"
                                        : "border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50"
                                }`}
                            >
                                <button
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => onSelect(r.id)}
                                    className="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 rounded-2xl px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                                        <span className={`truncate text-sm font-semibold ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                                            {r.name}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                            {formatReplicaType(r.type)}
                                        </span>
                                        {isMine && (
                                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                                                {t("commission.myTasting")}
                                            </span>
                                        )}
                                    </span>

                                    <span className="flex shrink-0 items-center gap-2">
                                        <span
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums text-slate-500"
                                            title={t("commission.readyCount", { ready: readyCount, total: r.members.length })}
                                        >
                                            <Users className="h-3.5 w-3.5" />
                                            {readyCount}/{r.members.length}
                                        </span>
                                        <StatusPill status={r.status} size="sm" />
                                    </span>
                                </button>

                                {canManage && r.status === "DRAFT" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditName(r.name || "")
                                            setEditingId(r.id)
                                        }}
                                        title={t("commission.renameReplica")}
                                        aria-label={t("commission.renameReplica")}
                                        className="mr-2 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-indigo-600"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </SectionCard>
    )
}
