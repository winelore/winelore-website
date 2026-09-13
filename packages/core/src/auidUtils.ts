export function normalizeAuids(raw: unknown): string[] {
    if (raw == null) return []
    const list = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
    return list.map((id) => String(id))
}

export function evaluationMatchesMember(
    evaluation: { evaluatorAuid?: unknown },
    memberAuids: unknown,
): boolean {
    const evalAuids = normalizeAuids(evaluation.evaluatorAuid)
    const memberIds = normalizeAuids(memberAuids)
    return evalAuids.some((id) => memberIds.includes(id))
}

export function findEvaluationForMember<T extends { evaluatorAuid?: unknown }>(
    evaluations: T[],
    memberAuids: unknown,
): T | undefined {
    return evaluations.find((ev) => evaluationMatchesMember(ev, memberAuids))
}

export function memberMatchesActor(memberAuids: unknown, actorAuid: string): boolean {
    return normalizeAuids(memberAuids).includes(String(actorAuid))
}
