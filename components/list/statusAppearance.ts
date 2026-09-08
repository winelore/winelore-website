import type { LucideIcon } from "lucide-react"
import { AlertCircle, Calendar, CheckCircle, PlayCircle, Tag } from "lucide-react"

export type StatusColorScheme = "emerald" | "rose" | "amber" | "slate"

/** Text tone per scheme — the status reads as a line of card copy, not a chip. */
export const STATUS_TEXT_CLASSES: Record<StatusColorScheme, string> = {
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    amber: "text-amber-600",
    slate: "text-slate-500",
}

export interface StatusAppearance {
    colorScheme: StatusColorScheme
    icon: LucideIcon
}

/**
 * Single source of truth for how an entity status is coloured and iconed.
 * The dashboard used to paint the same commission statuses with a different
 * palette than /myCommissions did.
 */
export function commissionStatusAppearance(status: string): StatusAppearance {
    if (status === "STARTED") return { colorScheme: "emerald", icon: PlayCircle }
    if (status === "COMPLETED") return { colorScheme: "slate", icon: CheckCircle }
    if (status === "CANCELLED") return { colorScheme: "rose", icon: AlertCircle }
    return { colorScheme: "amber", icon: Calendar }
}

export function competitionStatusAppearance(status: string): StatusAppearance {
    if (status === "STARTED") return { colorScheme: "emerald", icon: PlayCircle }
    if (status === "COMPLETED") return { colorScheme: "slate", icon: CheckCircle }
    if (status === "CANCELLED") return { colorScheme: "rose", icon: AlertCircle }
    return { colorScheme: "amber", icon: Calendar }
}

export function beverageStatusAppearance(status: string): StatusAppearance {
    if (status === "APPROVED" || status === "PUBLISHED") return { colorScheme: "emerald", icon: CheckCircle }
    if (status === "SUSPENDED") return { colorScheme: "rose", icon: AlertCircle }
    return { colorScheme: "amber", icon: Tag }
}
