"use client"

import type { ReactNode } from "react"
import { useMobileNavTitle } from "@/lib/mobileNav"

interface ListPageHeaderProps {
    title: string
    subtitle?: string
    countLabel?: string
    actions?: ReactNode
    titleIcon?: ReactNode
}

export function ListPageHeader({ title, subtitle, countLabel, actions, titleIcon }: ListPageHeaderProps) {
    // On phones this is the iOS large title; once it scrolls away the same
    // title moves into the nav bar.
    const titleRef = useMobileNavTitle<HTMLHeadingElement>(title)

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 shrink-0">
            <div className="min-w-0">
                <h2 ref={titleRef} className="text-[32px] leading-tight sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    {/* iOS large titles carry no glyph; keep the icon from sm up. */}
                    {titleIcon && <span className="hidden sm:inline-flex">{titleIcon}</span>}
                    {title}
                </h2>
                {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            </div>
            {(countLabel || actions) && (
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:justify-end">
                    {countLabel && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100 shrink-0">
                            {countLabel}
                        </span>
                    )}
                    {actions}
                </div>
            )}
        </div>
    )
}
