"use client"

import React from "react"
import Link from "next/link"

type Variant = "primary" | "secondary" | "ghost" | "success"
type Size = "sm" | "md" | "lg"

const VARIANTS: Record<Variant, string> = {
    primary: "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700",
    secondary: "border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    success: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700",
}

/** Minimum comfortable touch targets — `sm` is only used inside dense card headers. */
const SIZES: Record<Size, string> = {
    sm: "h-8 gap-1.5 px-3 text-xs",
    md: "h-10 gap-2 px-4 text-sm",
    lg: "h-11 gap-2 px-5 text-sm",
}

const BASE =
    "inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-xl font-semibold transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:pointer-events-none disabled:opacity-50"

function Spinner() {
    return <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
}

/**
 * One button. Between them the two detail pages had a dozen bespoke button
 * class strings — three different radii, two different gradients and a few that
 * forgot `cursor-pointer` or the disabled state entirely.
 */
export function ActionButton({
    variant = "primary",
    size = "md",
    loading = false,
    icon: Icon,
    href,
    className = "",
    children,
    ...props
}: {
    variant?: Variant
    size?: Size
    loading?: boolean
    icon?: React.ComponentType<{ className?: string }>
    href?: string
    className?: string
    children?: React.ReactNode
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
    const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`
    const inner = (
        <>
            {loading ? <Spinner /> : Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
            {children}
        </>
    )

    if (href) {
        return (
            <Link href={href} className={classes}>
                {inner}
            </Link>
        )
    }

    return (
        <button className={classes} disabled={loading || props.disabled} aria-busy={loading || undefined} {...props}>
            {inner}
        </button>
    )
}
