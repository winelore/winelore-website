/**
 * Human-readable "time remaining" for a competition, shared by the dashboard
 * and the /competitions list (they used to carry byte-identical copies that
 * were free to drift apart).
 */
export function formatTimeRemaining(
    plannedStartAt: string | null,
    plannedEndAt: string | null,
    status: string,
    t: (key: any, params?: Record<string, string | number>) => string,
): string {
    if (status === "FINISHED" || status === "COMPLETED") return t("time.ended")
    if (!plannedStartAt) return ""

    const now = new Date()
    const startDate = new Date(plannedStartAt)
    const endDate = plannedEndAt ? new Date(plannedEndAt) : null

    if (status === "READY" || status === "PLANNED" || status === "APPROVED") {
        const diff = startDate.getTime() - now.getTime()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        if (days > 0) return t("time.startsInDays", { days })
        if (hours > 0) return t("time.startsInHours", { hours })
        return t("time.startingSoon")
    }

    if ((status === "IN_PROGRESS" || status === "STARTED") && endDate) {
        const diff = endDate.getTime() - now.getTime()
        if (diff < 0) return ""
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        if (days > 0) return t("time.duration", { days, hours })
        if (hours > 0) return t("time.durationHoursMinutes", { hours, minutes })
        return t("time.durationMinutes", { minutes })
    }

    return ""
}

/** Accent colour for a competition status label. */
export function competitionStatusTextColor(status: string): string {
    switch (status) {
        case "IN_PROGRESS":
        case "STARTED":
            return "text-emerald-500"
        case "READY":
        case "PLANNED":
        case "APPROVED":
            return "text-blue-500"
        default:
            return "text-slate-500"
    }
}

export interface CompetitionTimingInput {
    status: string
    plannedStartAt?: string | null
    plannedEndAt?: string | null
    startedAt?: string | null
    endedAt?: string | null
}

/**
 * One timing line for a competition card, whichever list it is rendered in.
 * Prefers real timestamps (running for X / lasted X) and falls back to the
 * planned window (starts in X / ends in X) when the competition has not run.
 * Relative to `now`, so callers must only render it after mount.
 */
export function formatCompetitionTiming(
    { status, plannedStartAt, plannedEndAt, startedAt, endedAt }: CompetitionTimingInput,
    t: (key: any, params?: Record<string, string | number>) => string,
): string {
    // Days first for long spans — "22d 23h" fits a card line where "551h 33m"
    // does not, and reads better besides.
    const duration = (diffMs: number) => {
        const diff = Math.max(0, diffMs)
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        if (days > 0) return t("time.duration", { days, hours })
        if (hours > 0) return t("time.durationHoursMinutes", { hours, minutes })
        return t("time.durationMinutes", { minutes })
    }

    if ((status === "COMPLETED" || status === "FINISHED") && startedAt && endedAt) {
        return t("time.lasted", { time: duration(new Date(endedAt).getTime() - new Date(startedAt).getTime()) })
    }

    if (status === "STARTED" || status === "IN_PROGRESS") {
        // A planned end still ahead of us is the more useful number; otherwise
        // fall back to how long the competition has been running.
        const remaining = formatTimeRemaining(plannedStartAt ?? null, plannedEndAt ?? null, status, t)
        if (remaining) return remaining
        if (startedAt) return duration(Date.now() - new Date(startedAt).getTime())
        return ""
    }

    return formatTimeRemaining(plannedStartAt ?? null, plannedEndAt ?? null, status, t)
}
