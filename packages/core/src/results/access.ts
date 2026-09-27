import { normalizeAuids } from "../auidUtils"

/**
 * Whether a user may see a commission's results.
 *
 * Two ways in: holding the competition, or having judged a replica that has
 * finished. A judge cannot see results for a replica still in progress — that
 * would expose other judges' scores mid-session.
 */
export function canViewCommissionResults(
    commission: {
        competition?: { holders?: unknown } | null
        replicas?: Array<{ status?: string | null; members?: Array<{ auid?: unknown }> | null }> | null
    },
    auid: string | null | undefined,
): boolean {
    if (!auid) return false

    if (normalizeAuids(commission.competition?.holders).includes(auid)) return true

    return Boolean(
        commission.replicas?.some(
            (replica) =>
                replica.status === "COMPLETED" &&
                replica.members?.some((member) => normalizeAuids(member.auid).includes(auid)),
        ),
    )
}

/**
 * Whether a replica's scoring for a beverage is still outstanding.
 *
 * Outcomes computed while evaluations are missing are provisional, so the UI
 * marks them rather than presenting a partial average as final. A candidate
 * that is finished counts as settled whatever its evaluation count.
 */
export function isReplicaBeverageIncomplete(
    commission: {
        candidates?: Array<{ id: string; sample?: { batch?: { beverage?: { id?: string } } } }> | null
        replicas?: Array<{
            id: string
            members?: unknown[] | null
            replicaCandidates?: Array<{
                candidate?: { id?: string } | null
                status?: string | null
                evaluations?: Array<{ isComplete?: boolean }> | null
            }> | null
        }> | null
    },
    replicaId: string,
    beverageId: string,
    isFinished: (status: string | null | undefined) => boolean,
): boolean {
    const candidateIds = (commission.candidates ?? [])
        .filter((candidate) => candidate.sample?.batch?.beverage?.id === beverageId)
        .map((candidate) => candidate.id)

    const replica = commission.replicas?.find((item) => item.id === replicaId)
    if (!replica) return false

    const expectedEvaluators = replica.members?.length ?? 0

    for (const candidateId of candidateIds) {
        const replicaCandidate = replica.replicaCandidates?.find(
            (item) => item.candidate?.id === candidateId,
        )
        if (!replicaCandidate) {
            if (expectedEvaluators > 0) return true
            continue
        }
        if (isFinished(replicaCandidate.status)) continue

        const completed = (replicaCandidate.evaluations ?? []).filter((e) => e.isComplete).length
        if (expectedEvaluators > 0 && completed < expectedEvaluators) return true
    }

    return false
}
