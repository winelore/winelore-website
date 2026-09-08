"use client"

import React, { useState } from "react"
import { Calendar, Check, Pencil, X } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { SectionCard, FieldLabel } from "./SectionCard"
import { fromLocalDatetimeInputToIso, toLocalDatetimeInput } from "@/lib/dateFormat"

export interface TimelineLabels {
    title: string
    plannedStart: string
    plannedEnd: string
    actualStart: string
    actualEnd: string
    notStartedYet: string
    notEndedYet: string
}

function Marker({ tone }: { tone: "planned" | "plannedSoft" | "started" | "ended" | "idle" }) {
    const colour = {
        planned: "bg-indigo-500",
        plannedSoft: "bg-indigo-300",
        started: "bg-emerald-500",
        ended: "bg-rose-500",
        idle: "bg-slate-200",
    }[tone]
    return <span aria-hidden className={`absolute -left-[22.5px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${colour}`} />
}

/**
 * Planned / actual schedule, with inline editing of the planned window.
 *
 * The competition and commission pages carried byte-for-byte copies of this
 * block, including a hardcoded English "Save" on the confirm button.
 */
export function ScheduleTimeline({
    labels,
    plannedStartAt,
    plannedEndAt,
    startedAt,
    endedAt,
    canEdit = false,
    onSave,
    calendarUrl,
}: {
    labels: TimelineLabels
    plannedStartAt: string | null
    plannedEndAt: string | null
    startedAt: string | null
    endedAt: string | null
    canEdit?: boolean
    onSave?: (startIso: string | null, endIso: string | null) => Promise<boolean>
    calendarUrl?: string | null
}) {
    const { t, formatDateTime } = useTranslation()
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [draft, setDraft] = useState({ start: "", end: "" })

    const open = () => {
        setDraft({ start: toLocalDatetimeInput(plannedStartAt), end: toLocalDatetimeInput(plannedEndAt) })
        setIsEditing(true)
    }

    const save = async () => {
        if (!onSave) return
        setIsSaving(true)
        try {
            const ok = await onSave(fromLocalDatetimeInputToIso(draft.start), fromLocalDatetimeInputToIso(draft.end))
            if (ok) setIsEditing(false)
        } finally {
            setIsSaving(false)
        }
    }

    const inputClass =
        "rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none transition-colors focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"

    return (
        <SectionCard
            title={labels.title}
            icon={Calendar}
            actions={
                canEdit && onSave ? (
                    isEditing ? (
                        <>
                            <button
                                type="button"
                                onClick={save}
                                disabled={isSaving}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <Check className="h-3.5 w-3.5" />
                                )}
                                <span>{t("common.save")}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                disabled={isSaving}
                                title={t("common.cancel")}
                                aria-label={t("common.cancel")}
                                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={open}
                            title={t("common.editPlannedDates")}
                            aria-label={t("common.editPlannedDates")}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                    )
                ) : null
            }
        >
            <div className="relative ml-2.5 flex flex-col gap-4 border-l border-slate-200 pl-4">
                <div className="relative">
                    <Marker tone="planned" />
                    <FieldLabel>{labels.plannedStart}</FieldLabel>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        {isEditing ? (
                            <input
                                type="datetime-local"
                                aria-label={labels.plannedStart}
                                className={inputClass}
                                value={draft.start}
                                onChange={e => setDraft(d => ({ ...d, start: e.target.value }))}
                                onKeyDown={e => {
                                    if (e.key === "Enter") save()
                                    if (e.key === "Escape") setIsEditing(false)
                                }}
                            />
                        ) : (
                            <p className="text-xs font-semibold text-slate-800">{formatDateTime(plannedStartAt)}</p>
                        )}
                        {!isEditing && calendarUrl && (
                            <a
                                href={calendarUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50/60 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                            >
                                {t("common.addToCalendar")}
                            </a>
                        )}
                    </div>
                </div>

                {(plannedEndAt || isEditing) && (
                    <div className="relative">
                        <Marker tone="plannedSoft" />
                        <FieldLabel>{labels.plannedEnd}</FieldLabel>
                        <div className="mt-1">
                            {isEditing ? (
                                <input
                                    type="datetime-local"
                                    aria-label={labels.plannedEnd}
                                    className={inputClass}
                                    value={draft.end}
                                    onChange={e => setDraft(d => ({ ...d, end: e.target.value }))}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") save()
                                        if (e.key === "Escape") setIsEditing(false)
                                    }}
                                />
                            ) : (
                                <p className="text-xs font-semibold text-slate-800">{formatDateTime(plannedEndAt)}</p>
                            )}
                        </div>
                    </div>
                )}

                <div className="relative">
                    <Marker tone={startedAt ? "started" : "idle"} />
                    <FieldLabel>{labels.actualStart}</FieldLabel>
                    <p className={`mt-1 text-xs font-semibold ${startedAt ? "text-slate-800" : "text-slate-400"}`}>
                        {startedAt ? formatDateTime(startedAt) : labels.notStartedYet}
                    </p>
                </div>

                <div className="relative">
                    <Marker tone={endedAt ? "ended" : "idle"} />
                    <FieldLabel>{labels.actualEnd}</FieldLabel>
                    <p className={`mt-1 text-xs font-semibold ${endedAt ? "text-slate-800" : "text-slate-400"}`}>
                        {endedAt ? formatDateTime(endedAt) : labels.notEndedYet}
                    </p>
                </div>
            </div>
        </SectionCard>
    )
}
