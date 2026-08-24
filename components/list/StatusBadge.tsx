"use client"

import type { LucideIcon } from "lucide-react"

export type StatusColorScheme = "emerald" | "rose" | "amber" | "slate"

const COLOR_CLASSES: Record<StatusColorScheme, string> = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    slate: "bg-slate-100 text-slate-500 border-slate-200",
}

interface StatusBadgeProps {
    colorScheme: StatusColorScheme
    icon: LucideIcon
    label: string
    trailing?: string
    trailingIcon?: LucideIcon
}

export function StatusBadge({ colorScheme, icon: Icon, label, trailing, trailingIcon: TrailingIcon }: StatusBadgeProps) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${COLOR_CLASSES[colorScheme]}`}>
            <Icon className="w-3 h-3" />
            {label}
            {trailing && (
                <>
                    <span className="text-slate-300 opacity-50 px-0.5">|</span>
                    <span className="flex items-center gap-1 normal-case tracking-normal font-semibold">
                        {TrailingIcon && <TrailingIcon className="w-3 h-3" />}
                        {trailing}
                    </span>
                </>
            )}
        </span>
    )
}
