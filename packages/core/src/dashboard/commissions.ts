import { normalizeAuids } from "../auidUtils"

/** Commission statuses a judge can still act on. */
export const ACTIVE_COMMISSION_STATUSES = [
    "PLANNED",
    "APPROVED",
    "STARTED",
    "IN_PROGRESS",
] as const

export interface DashboardCommission {
    id: string
    name?: string | null
    status?: string | null
    startedAt?: string | null
    endedAt?: string | null
    competition?: { id?: string | null; name?: string | null } | null
    replicas?: Array<{
        id?: string | null
        status?: string | null
        members?: Array<{ auid?: unknown; role?: string | null }> | null
    }> | null
}

/**
 * The commission as fetched, plus what the dashboard derived about this user.
 *
 * The source fields are carried through untouched: consumers render commission
 * cards from them (name, status, competition, dates), so narrowing the shape
 * here would quietly blank those out.
 */
export type ActiveCommission = DashboardCommission & {
    /** The replica this user judges, so a client can route straight into it. */
    replicaId: string | null
    /** Whether this user chairs that replica. */
    isHead: boolean
}

export interface SelectCommissionsOptions {
    /** Keep only these statuses. Omit to keep every status. */
    statuses?: readonly string[]
    /** Stop after this many. Omit for all of them. */
    limit?: number
}

/**
 * The commissions a user is a member of.
 *
 * Membership is matched through `normalizeAuids`, which flattens nested arrays.
 * The backend returns `auid` as an array and sometimes nests it, so a plain
 * `includes` misses those members and silently hides a commission from someone
 * who is in fact on it.
 */
export function selectCommissionsForUser(
    commissions: DashboardCommission[] | null | undefined,
    auid: string | null | undefined,
    options: SelectCommissionsOptions = {},
): ActiveCommission[] {
    if (!auid) return []

    const { statuses, limit } = options
    const active: ActiveCommission[] = []

    for (const commission of commissions ?? []) {
        if (statuses && !statuses.includes(commission.status as string)) continue

        const replica = commission.replicas?.find((r) =>
            r.members?.some((m) => normalizeAuids(m.auid).includes(auid)),
        )
        if (!replica) continue

        active.push({
            ...commission,
            replicaId: replica.id ?? null,
            isHead: Boolean(
                replica.members?.some(
                    (m) => m.role === "HEAD" && normalizeAuids(m.auid).includes(auid),
                ),
            ),
        })

        if (limit !== undefined && active.length >= limit) break
    }

    return active
}

/**
 * The subset for a dashboard: member commissions still in a state the user can
 * act on, capped at what fits a summary panel.
 */
export function selectActiveCommissions(
    commissions: DashboardCommission[] | null | undefined,
    auid: string | null | undefined,
    limit = 8,
): ActiveCommission[] {
    return selectCommissionsForUser(commissions, auid, {
        statuses: ACTIVE_COMMISSION_STATUSES,
        limit,
    })
}
