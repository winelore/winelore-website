"use client"

import type { ReactNode } from "react"
import Link from "next/link"

interface EntityCardLinkProps {
    href: string
    /** "compact" (p-6) for simpler global-list cards, "comfortable" (p-7) for richer personal-list cards. */
    padding?: "compact" | "comfortable"
    layout?: "row" | "column"
    className?: string
    children: ReactNode
}

export function EntityCardLink({ href, padding = "comfortable", layout = "column", className = "", children }: EntityCardLinkProps) {
    const paddingClass = padding === "compact" ? "p-6" : "p-7"
    const layoutClass = layout === "row" ? "flex items-center gap-4" : "flex flex-col min-h-[140px]"

    return (
        <Link
            href={href}
            className={`group bg-white border border-slate-100 rounded-[32px] ${paddingClass} shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 ${layoutClass} ${className}`}
        >
            {children}
        </Link>
    )
}
