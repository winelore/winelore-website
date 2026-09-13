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

/**
 * The commissions a judge should see on their dashboard: ones they are a member
 * of, still in a state they can act on.
 *
 * Membership is matched through `normalizeAuids`, which flattens nested arrays.
 * The backend returns `auid` as an array and sometimes nests it, so a plain
 * `includes` misses those members and silently hides the commission from
 * someone who is in fact on it.
 */
export function selectActiveCommissions(
    commissions: DashboardCommission[] | null | undefined,
    auid: string | null | undefined,
    limit = 8,
): ActiveCommission[] {
    if (!auid) return []

    const active: ActiveCommission[] = []

    for (const commission of commissions ?? []) {
        if (!ACTIVE_COMMISSION_STATUSES.includes(commission.status as never)) continue

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

        if (active.length >= limit) break
    }

    return active
}
