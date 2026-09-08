"use client"

import React from "react"

type Tone = "primary" | "muted" | "success" | "warning"

const TONES: Record<Tone, string> = {
    primary: "border-indigo-100 bg-indigo-50/40",
    muted: "border-slate-200/70 bg-slate-50/70",
    success: "border-emerald-500/20 bg-emerald-500/[0.07]",
    warning: "border-amber-500/25 bg-amber-500/[0.07]",
}

/**
 * "Here is a thing you can do, here is why, here is the button." Used for every
 * call to action on the detail pages so they line up instead of each inventing
 * its own padding and wrap behaviour.
 */
export function ActionRow({
    title,
    description,
    tone = "primary",
    action,
    children,
}: {
    title: React.ReactNode
    description?: React.ReactNode
    tone?: Tone
    action?: React.ReactNode
    children?: React.ReactNode
}) {
    return (
        <div className={`flex flex-col gap-3 rounded-2xl border p-4 ${TONES[tone]}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
                    {description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            {children}
        </div>
    )
}
