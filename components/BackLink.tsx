"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface BackLinkProps {
    href: string
    label: string
    className?: string
}

/**
 * The single "go back one level" control. Every detail page used to hand-roll
 * this pill (or, in a couple of places, a bare indigo text link), so they drifted
 * apart in padding, colour and icon size.
 */
export function BackLink({ href, label, className = "" }: BackLinkProps) {
    return (
        <Link
            href={href}
            className={`inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 ${className}`}
        >
            <ArrowLeft className="h-4 w-4" />
            {label}
        </Link>
    )
}
