/**
 * How an entity status reads on a card: a tone and a glyph.
 *
 * Deliberately abstract — each platform maps the tone to its own colours and
 * the glyph to its own icon set (lucide on the web, SF Symbols and Material
 * Symbols natively). What must not differ between them is *which* statuses
 * read as live, finished, cancelled or pending, so that decision lives here.
 */
export type StatusTone = "emerald" | "rose" | "amber" | "slate"

export type StatusGlyph = "play" | "check" | "alert" | "calendar" | "tag"

export interface StatusLook {
    tone: StatusTone
    glyph: StatusGlyph
}

export function commissionStatusLook(status: string): StatusLook {
    if (status === "STARTED") return { tone: "emerald", glyph: "play" }
    if (status === "COMPLETED") return { tone: "slate", glyph: "check" }
    if (status === "CANCELLED") return { tone: "rose", glyph: "alert" }
    return { tone: "amber", glyph: "calendar" }
}

export function competitionStatusLook(status: string): StatusLook {
    if (status === "STARTED") return { tone: "emerald", glyph: "play" }
    if (status === "COMPLETED") return { tone: "slate", glyph: "check" }
    if (status === "CANCELLED") return { tone: "rose", glyph: "alert" }
    return { tone: "amber", glyph: "calendar" }
}

export function beverageStatusLook(status: string): StatusLook {
    if (status === "APPROVED" || status === "PUBLISHED") return { tone: "emerald", glyph: "check" }
    if (status === "SUSPENDED") return { tone: "rose", glyph: "alert" }
    return { tone: "amber", glyph: "tag" }
}

export function templateStatusLook(status?: string | null): StatusLook {
    if (status === "ACTIVE" || status === "PUBLISHED") return { tone: "emerald", glyph: "check" }
    if (status === "ARCHIVED") return { tone: "slate", glyph: "tag" }
    if (status === "DRAFT") return { tone: "amber", glyph: "calendar" }
    return { tone: "emerald", glyph: "check" }
}

export function outcomePolicyStatusLook(status?: string | null): StatusLook {
    if (status === "ACTIVE" || status === "PUBLISHED") return { tone: "emerald", glyph: "check" }
    if (status === "ARCHIVED") return { tone: "slate", glyph: "tag" }
    if (status === "DRAFT") return { tone: "amber", glyph: "calendar" }
    return { tone: "emerald", glyph: "check" }
}


