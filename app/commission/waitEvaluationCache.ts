export function waitEvaluationCacheKey(commissionId: string, replicaId: string) {
    return `commissionWaitEval:${commissionId}:${replicaId}`
}

export type CachedWaitEvaluation = {
    candidateId: string
    isComplete?: boolean
    scores?: Array<{ code: string; value: string | null }>
    comments?: Array<{ id: string; propertyId?: string | null; text?: string; voiceUrl?: string | null }>
}

export function readCachedWaitEvaluation(commissionId: string, replicaId: string): CachedWaitEvaluation | null {
    if (typeof window === "undefined") return null
    try {
        const raw = sessionStorage.getItem(waitEvaluationCacheKey(commissionId, replicaId))
        if (!raw) return null
        return JSON.parse(raw) as CachedWaitEvaluation
    } catch {
        return null
    }
}

export function writeCachedWaitEvaluation(
    commissionId: string,
    replicaId: string,
    evaluation: CachedWaitEvaluation,
) {
    if (typeof window === "undefined") return
    sessionStorage.setItem(waitEvaluationCacheKey(commissionId, replicaId), JSON.stringify(evaluation))
}

export function clearCachedWaitEvaluation(commissionId: string, replicaId: string) {
    if (typeof window === "undefined") return
    sessionStorage.removeItem(waitEvaluationCacheKey(commissionId, replicaId))
}
