"use client"

import React from "react"
import { useTranslation } from "@/lib/i18n/context"
import { beverageStatusAppearance, type StatusAppearance, type StatusColorScheme } from "./statusAppearance"

const BADGE_COLOR_CLASSES: Record<StatusColorScheme, { badge: string; text: string }> = {
    emerald: {
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
        text: "text-emerald-600",
    },
    rose: {
        badge: "bg-rose-50 text-rose-700 border-rose-200/70",
        text: "text-rose-600",
    },
    amber: {
        badge: "bg-amber-50 text-amber-700 border-amber-200/70",
        text: "text-amber-600",
    },
    slate: {
        badge: "bg-slate-100 text-slate-700 border-slate-200/70",
        text: "text-slate-500",
    },
}

export interface StatusBadgeProps {
    status?: string | null
    variant?: "pill" | "text"
    isSelected?: boolean
    appearanceFn?: (status: string) => StatusAppearance
    className?: string
}

export function StatusBadge({
    status,
    variant = "pill",
    isSelected = false,
    appearanceFn = beverageStatusAppearance,
    className = "",
}: StatusBadgeProps) {
    const { formatStatus } = useTranslation()

    if (!status) return null

    const appearance = appearanceFn(status)
    const Icon = appearance.icon
    const label = formatStatus(status)

    if (isSelected) {
        return (
            <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-md border border-white/30 bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${className}`}
            >
                <Icon className="h-2.5 w-2.5 shrink-0" />
                <span>{label}</span>
            </span>
        )
    }

    if (variant === "text") {
        return (
            <span
                className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${BADGE_COLOR_CLASSES[appearance.colorScheme].text} ${className}`}
            >
                <Icon className="h-3 w-3 shrink-0" />
                <span>{label}</span>
            </span>
        )
    }

    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${BADGE_COLOR_CLASSES[appearance.colorScheme].badge} ${className}`}
        >
            <Icon className="h-2.5 w-2.5 shrink-0" />
            <span>{label}</span>
        </span>
    )
}
