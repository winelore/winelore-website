"use client"

import React from "react"
import { useTranslation } from "@/lib/i18n/context"

type Tone = "live" | "done" | "pending" | "neutral"

const TONES: Record<Tone, string> = {
    live: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
    done: "border-slate-200 bg-slate-100 text-slate-600",
    pending: "border-amber-500/25 bg-amber-500/10 text-amber-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
}

export function toneForStatus(status?: string | null): Tone {
    if (status === "STARTED") return "live"
    if (status === "COMPLETED") return "done"
    if (status === "CANCELLED") return "neutral"
    return "pending"
}

/**
 * The status badge shown next to a competition / commission / replica name.
 * Previously copied inline in four places with slightly different colours and a
 * hand-rolled ping dot each time.
 */
export function StatusPill({
    status,
    size = "md",
    className = "",
}: {
    status: string
    size?: "sm" | "md"
    className?: string
}) {
    const { formatStatus } = useTranslation()
    const tone = toneForStatus(status)
    const sizing = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"

    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold ${TONES[tone]} ${sizing} ${className}`}
        >
            {tone === "live" && (
                <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
            )}
            {formatStatus(status)}
        </span>
    )
}
