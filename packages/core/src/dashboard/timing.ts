type Translate = (key: any, params?: Record<string, string | number>) => string

export interface CommissionTimingInput {
    status?: string | null
    startedAt?: string | null
    endedAt?: string | null
}

/**
 * The live detail next to a commission's status: how long a running session
 * has been going (to the second for its first hour, when a judge is watching
 * it), or how long a finished one lasted. Empty for anything else.
 *
 * Relative to `now`, so callers re-run it on a timer while
 * `commissionTimingTicks` says the value is moving.
 */
export function formatCommissionTiming(
    { status, startedAt, endedAt }: CommissionTimingInput,
    t: Translate,
    now: number = Date.now(),
): string {
    const duration = (diffMs: number) => {
        const diff = Math.max(0, diffMs)
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        if (days > 0) return t("time.duration", { days, hours })
        if (hours > 0) return t("time.durationHoursMinutes", { hours, minutes })
        return t("time.durationMinutes", { minutes })
    }

    if (status === "STARTED" && startedAt) {
        const diff = Math.max(0, now - new Date(startedAt).getTime())
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        return diff < 1000 * 60 * 60 ? `${duration(diff)} ${seconds}s` : duration(diff)
    }
    if (status === "COMPLETED" && startedAt && endedAt) {
        const diff = new Date(endedAt).getTime() - new Date(startedAt).getTime()
        return t("time.lasted", { time: duration(diff) })
    }
    return ""
}

/** Whether `formatCommissionTiming` changes second to second for this status. */
export function commissionTimingTicks(status?: string | null): boolean {
    return status === "STARTED"
}
