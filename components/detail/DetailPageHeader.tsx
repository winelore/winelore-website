"use client"

import React, { useEffect, useRef, useState } from "react"
import { ArrowLeft, Check, Pencil, Timer, X } from "lucide-react"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n/context"
import { StatusPill } from "./StatusPill"

/**
 * Sticky identity bar for a detail page: where am I, what state is it in, and
 * what is the one thing I am most likely to do here.
 *
 * Previously the name, status and primary action lived in a card partway down
 * the right-hand column, so on a long page you lost both the title and the
 * "Start" button as soon as you scrolled to the thing you came to look at.
 */
export function DetailPageHeader({
    backHref,
    backLabel,
    eyebrow,
    name,
    status,
    timeDisplay,
    canEditName = false,
    onSaveName,
    isSavingName = false,
    actions,
    children,
}: {
    backHref: string
    backLabel: string
    eyebrow: React.ReactNode
    name: string
    status: string
    timeDisplay?: string
    canEditName?: boolean
    onSaveName?: (next: string) => Promise<void> | void
    isSavingName?: boolean
    actions?: React.ReactNode
    children?: React.ReactNode
}) {
    const { t } = useTranslation()
    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState(name)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing) inputRef.current?.select()
    }, [isEditing])

    const open = () => {
        setDraft(name)
        setIsEditing(true)
    }

    const save = async () => {
        if (!onSaveName) return
        try {
            await onSaveName(draft)
            setIsEditing(false)
        } catch {
            // The handler surfaces its own toast; keep the field open so the
            // rejected value is still there to correct.
        }
    }

    return (
        <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 md:px-8">
                {/* Wraps to a second line on narrow screens rather than squeezing
                    the title down to an ellipsis. */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Link
                        href={backHref}
                        title={backLabel}
                        aria-label={backLabel}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>

                    <div className="flex min-w-0 flex-1 basis-56 flex-col">
                        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {eyebrow}
                        </span>

                        {isEditing ? (
                            <div className="mt-0.5 flex items-center gap-1.5">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    autoFocus
                                    aria-label={t("common.name")}
                                    className="min-w-0 flex-1 rounded-lg border border-indigo-400 bg-white px-2 py-1 text-lg font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 md:text-xl"
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") save()
                                        if (e.key === "Escape") setIsEditing(false)
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={isSavingName}
                                    title={t("common.save")}
                                    aria-label={t("common.save")}
                                    className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {isSavingName ? (
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    disabled={isSavingName}
                                    title={t("common.cancel")}
                                    aria-label={t("common.cancel")}
                                    className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex min-w-0 items-center gap-2">
                                <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 md:text-xl">
                                    {name}
                                </h1>
                                {canEditName && onSaveName && (
                                    <button
                                        type="button"
                                        onClick={open}
                                        title={t("common.rename")}
                                        aria-label={t("common.rename")}
                                        className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <StatusPill status={status} />
                        {timeDisplay && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-slate-500">
                                <Timer className="h-3.5 w-3.5 text-indigo-500" />
                                {timeDisplay}
                            </span>
                        )}
                    </div>

                    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
                </div>

                {children}
            </div>
        </div>
    )
}
