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
