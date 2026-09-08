"use client"

import type { ReactNode } from "react"
import Link from "next/link"

interface EntityCardLinkProps {
    href: string
    /**
     * "compact" (p-6) for simpler global-list cards, "comfortable" (p-7) for
     * richer personal-list cards, "dashboard" (p-4, smaller radius, no hover
     * scale) for the tighter bento cards on the home dashboard.
     */
    padding?: "compact" | "comfortable" | "dashboard"
    layout?: "row" | "column"
    className?: string
    children: ReactNode
}

export function EntityCardLink({ href, padding = "comfortable", layout = "column", className = "", children }: EntityCardLinkProps) {
    // Only the roomier list cards get a height floor; on the dashboard the
    // bento is already tight, and a floor there just opens a gap under a card
    // that carries nothing but a title and one meta line.
    const columnClass = padding === "dashboard" ? "flex flex-col" : "flex flex-col min-h-[140px]"
    const layoutClass = layout === "row" ? "flex items-center gap-4" : columnClass

    if (padding === "dashboard") {
        return (
            <Link
                href={href}
                className={`group bg-white border border-slate-100 rounded-[24px] p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100 ${layoutClass} ${className}`}
            >
                {children}
            </Link>
        )
    }

    const paddingClass = padding === "compact" ? "p-6" : "p-7"

    return (
        <Link
            href={href}
            className={`group bg-white border border-slate-100 rounded-[32px] ${paddingClass} shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 ${layoutClass} ${className}`}
        >
            {children}
        </Link>
    )
}
