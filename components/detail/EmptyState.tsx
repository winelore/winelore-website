"use client"

import React from "react"

/**
 * Consistent "there is nothing here yet" block. The pages previously fell back
 * to a bare centred sentence in `text-slate-400`, which read as a rendering
 * glitch rather than a state — and never told you what to do about it.
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className = "",
}: {
    icon?: React.ComponentType<{ className?: string }>
    title: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center ${className}`}
        >
            {Icon && (
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-300 shadow-xs">
                    <Icon className="h-5 w-5" />
                </div>
            )}
            <p className="text-sm font-semibold text-slate-600">{title}</p>
            {description && <p className="max-w-sm text-xs leading-relaxed text-slate-400">{description}</p>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    )
}
