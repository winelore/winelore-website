import type { LucideIcon } from "lucide-react"
import { AlertCircle, Calendar, CheckCircle, PlayCircle, Tag } from "lucide-react"
import type { StatusColorScheme } from "./StatusBadge"

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
