"use client"

import React, { useId, useState } from "react"
import { Loader2 } from "lucide-react"

/**
 * One on/off setting row.
 *
 * The commission page had seven near-identical copies of this markup, each wired
 * to the page-wide `isMutating` flag — so flipping any one switch froze every
 * control on the page until the round trip came back. This keeps its own pending
 * state, shows the new value optimistically while the request is in flight, and
 * rolls back if `onToggle` rejects.
 *
 * The whole row is the switch, which both gives a comfortable tap target on
 * touch screens and lets the label act as the accessible name.
 */
export function SettingToggle({
    label,
    description,
    checked,
    disabled = false,
    onToggle,
}: {
    label: React.ReactNode
    description?: React.ReactNode
    checked: boolean
    disabled?: boolean
    onToggle: (next: boolean) => Promise<void> | void
}) {
    const labelId = useId()
    const [pending, setPending] = useState(false)
    const [optimistic, setOptimistic] = useState<boolean | null>(null)

    const shown = optimistic ?? checked

    const handleClick = async () => {
        if (pending || disabled) return
        const next = !shown
        setOptimistic(next)
        setPending(true)
        try {
            await onToggle(next)
        } finally {
            setOptimistic(null)
            setPending(false)
        }
    }

    return (
        <button
            type="button"
            role="switch"
            aria-checked={shown}
            aria-labelledby={labelId}
            aria-busy={pending || undefined}
            disabled={disabled}
            onClick={handleClick}
            className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-slate-200/70"
        >
            <span className="flex min-w-0 flex-col">
                <span id={labelId} className="text-xs font-semibold text-slate-800">
                    {label}
                </span>
                {description && <span className="mt-0.5 text-[11px] leading-snug text-slate-500">{description}</span>}
            </span>

            <span
                aria-hidden
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ${
                    shown ? "bg-indigo-600" : "bg-slate-300"
                }`}
            >
                <span
                    className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        shown ? "translate-x-5" : "translate-x-0"
                    }`}
                >
                    {pending && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                </span>
            </span>
        </button>
    )
}
