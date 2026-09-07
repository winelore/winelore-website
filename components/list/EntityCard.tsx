"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { EntityCardLink } from "./EntityCardLink"
import { STATUS_TEXT_CLASSES, type StatusColorScheme } from "./statusAppearance"

export type EntityCardDensity = "compact" | "comfortable" | "dashboard"

export interface EntityCardMeta {
    icon: LucideIcon
    /** Short label rendered before the value, e.g. "Holder". Optional. */
    label?: string
    value: string
}

export interface EntityCardStatus {
    label: string
    colorScheme: StatusColorScheme
    icon: LucideIcon
    /** Live detail that belongs with the status — time remaining, elapsed, planned date. */
    trailing?: string
}

interface EntityCardProps {
    href: string
    /** Entity glyph shown in the tile: Trophy for competitions, Wine for beverages. */
    icon: LucideIcon
    /** Micro label above the title — the competition series, the beverage type. */
    kicker?: string | null
    title: string
    description?: ReactNode
    meta?: EntityCardMeta[]
    status?: EntityCardStatus
    density?: EntityCardDensity
}

const TILE = {
    compact: "h-12 w-12",
    comfortable: "h-12 w-12",
    dashboard: "h-10 w-10",
} as const

const GLYPH = {
    compact: "h-6 w-6",
    comfortable: "h-6 w-6",
    dashboard: "h-5 w-5",
} as const

const TITLE = {
    compact: "text-lg",
    comfortable: "text-lg",
    dashboard: "text-sm",
} as const

const BODY = {
    compact: "text-sm",
    comfortable: "text-sm",
    dashboard: "text-xs",
} as const

/**
 * The one card every entity list renders: competitions, beverages, on the
 * global lists, the personal lists and the home dashboard. Keeping the
 * skeleton here is what stops the same entity from looking like three
 * different products depending on which page you landed on.
 */
export function EntityCard({
    href,
    icon: Icon,
    kicker,
    title,
    description,
    meta = [],
    status,
    density = "comfortable",
}: EntityCardProps) {
    return (
        <EntityCardLink href={href} padding={density}>
            <div className="flex items-center gap-3">
                <div
                    className={`flex ${TILE[density]} shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white`}
                >
                    <Icon className={GLYPH[density]} />
                </div>
                <div className="min-w-0 flex-1">
                    {(status || kicker) && (
                        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-bold uppercase tracking-widest">
                            {status && (
                                <span className={`inline-flex shrink-0 items-center gap-1 ${STATUS_TEXT_CLASSES[status.colorScheme]}`}>
                                    <status.icon className="h-3 w-3" />
                                    {status.label}
                                </span>
                            )}
                            {status?.trailing && (
                                <>
                                    <span className="shrink-0 text-slate-200">&middot;</span>
                                    <span className="min-w-0 truncate font-semibold normal-case tracking-normal text-slate-400">
                                        {status.trailing}
                                    </span>
                                </>
                            )}
                            {(status || kicker) && kicker && <span className="shrink-0 text-slate-200">&middot;</span>}
                            {kicker && <span className="truncate text-slate-400">{kicker}</span>}
                        </div>
                    )}
                    <h3
                        className={`${TITLE[density]} mt-0.5 truncate font-bold text-slate-800 transition-colors group-hover:text-indigo-600`}
                    >
                        {title}
                    </h3>
                </div>
            </div>

            {description && (
                <p className={`${BODY[density]} mt-3 leading-relaxed text-slate-500 line-clamp-2`}>
                    {description}
                </p>
            )}

            {meta.length > 0 && (
                <div className="mt-auto flex flex-col gap-1.5 pt-3.5 text-xs text-slate-400">
                    {meta.map(({ icon: MetaIcon, label, value }, index) => (
                        <div key={index} className="flex min-w-0 items-start gap-1.5">
                            <MetaIcon className="mt-px h-3.5 w-3.5 shrink-0 text-indigo-300" />
                            {label && <span className="shrink-0 font-medium text-slate-500">{label}</span>}
                            <span className="min-w-0 line-clamp-2">{value}</span>
                        </div>
                    ))}
                </div>
            )}
        </EntityCardLink>
    )
}
