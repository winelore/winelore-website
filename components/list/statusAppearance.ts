import type { LucideIcon } from "lucide-react"
import { AlertCircle, Calendar, CheckCircle, PlayCircle, Tag } from "lucide-react"
import {
    beverageStatusLook,
    commissionStatusLook,
    competitionStatusLook,
    templateStatusLook,
    outcomePolicyStatusLook,
    type StatusGlyph,
    type StatusLook,
    type StatusTone,
} from "@winelore/core/dashboard"

export type StatusColorScheme = StatusTone

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

const GLYPH_ICONS: Record<StatusGlyph, LucideIcon> = {
    play: PlayCircle,
    check: CheckCircle,
    alert: AlertCircle,
    calendar: Calendar,
    tag: Tag,
}

const toAppearance = ({ tone, glyph }: StatusLook): StatusAppearance => ({
    colorScheme: tone,
    icon: GLYPH_ICONS[glyph],
})

/**
 * Single source of truth for how an entity status is coloured and iconed.
 * The dashboard used to paint the same commission statuses with a different
 * palette than /myCommissions did; which status gets which tone now lives in
 * @winelore/core so the native app agrees too.
 */
export function commissionStatusAppearance(status: string): StatusAppearance {
    return toAppearance(commissionStatusLook(status))
}

export function competitionStatusAppearance(status: string): StatusAppearance {
    return toAppearance(competitionStatusLook(status))
}

export function beverageStatusAppearance(status: string): StatusAppearance {
    return toAppearance(beverageStatusLook(status))
}

export function templateStatusAppearance(status?: string | null): StatusAppearance {
    return toAppearance(templateStatusLook(status))
}

export function outcomePolicyStatusAppearance(status?: string | null): StatusAppearance {
    return toAppearance(outcomePolicyStatusLook(status))
}


