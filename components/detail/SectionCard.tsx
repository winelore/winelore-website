"use client"

import React, { useState } from "react"
import { ChevronDown } from "lucide-react"

/**
 * The card shell every block on the competition / commission detail pages sits in.
 *
 * Both pages used to repeat `bg-white border border-slate-100 rounded-[32px] p-6
 * shadow-xl shadow-slate-200/50` by hand — about fifteen times between them, with
 * the padding and radius drifting per copy. Stacking that many heavy shadows also
 * made the page read as noise, so the shared shell uses one flat, quiet elevation.
 */
export function SectionCard({
    title,
    subtitle,
    icon: Icon,
    actions,
    collapsible = false,
    defaultOpen = true,
    padding = "normal",
    className = "",
    bodyClassName = "",
    children,
}: {
    title?: React.ReactNode
    subtitle?: React.ReactNode
    icon?: React.ComponentType<{ className?: string }>
    actions?: React.ReactNode
    collapsible?: boolean
    defaultOpen?: boolean
    padding?: "normal" | "tight" | "none"
    className?: string
    bodyClassName?: string
    children?: React.ReactNode
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const hasHeader = Boolean(title || actions)

    const pad = padding === "none" ? "" : padding === "tight" ? "p-4 sm:p-5" : "p-5 sm:p-6"

    const heading = (
        <div className="flex min-w-0 items-center gap-3">
            {Icon && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                    <Icon className="h-[18px] w-[18px]" />
                </div>
            )}
            <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
                {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
            </div>
        </div>
    )

    return (
        <section
            className={`rounded-3xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/[0.03] ${className}`}
        >
            {hasHeader && (
                <div
                    className={`flex flex-wrap items-center justify-between gap-3 ${pad || "p-5 sm:p-6"} ${
                        isOpen && children ? "pb-4" : ""
                    }`}
                >
                    {collapsible ? (
                        <button
                            type="button"
                            onClick={() => setIsOpen(o => !o)}
                            aria-expanded={isOpen}
                            className="group -m-1 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl p-1 text-left transition-colors hover:bg-slate-50"
                        >
                            {heading}
                            <ChevronDown
                                className={`ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                                    isOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>
                    ) : (
                        heading
                    )}
                    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
                </div>
            )}

            {children && (!collapsible || isOpen) && (
                <div className={`${hasHeader ? `${pad} pt-0` : pad} ${bodyClassName}`}>{children}</div>
            )}
        </section>
    )
}

/**
 * Small label above a value — the `text-[10px] uppercase tracking-wider text-slate-400`
 * eyebrow that both pages use for field captions.
 */
export function FieldLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 ${className}`}>
            {children}
        </span>
    )
}

/** A labelled read-only fact, e.g. "Competition — Ambassador Selection 2026". */
export function MetaTile({
    icon: Icon,
    label,
    value,
    iconClassName = "text-indigo-500",
    title,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: React.ReactNode
    value: React.ReactNode
    iconClassName?: string
    title?: string
}) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3.5">
            <Icon className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${iconClassName}`} />
            <div className="min-w-0 flex-1">
                <FieldLabel>{label}</FieldLabel>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-800" title={title}>
                    {value}
                </p>
            </div>
        </div>
    )
}
