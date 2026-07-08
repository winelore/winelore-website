import { normalizeAuids } from "@/app/commission/auidUtils"
import {
    computeEvaluationFullScores,
    type RawEvaluation,
    type TemplateEdition,
} from "@/lib/evaluationScores"
import {
    adaptCandidate,
    adaptEvaluation,
    adaptReplica,
    type ScriptCandidateAdapter,
    type ScriptEvaluationAdapter,
    type ScriptReplicaAdapter,
} from "./scriptAdapters"

export interface CommissionForScriptContext {
    candidates: Array<{
        id: string
        anonymizedCode?: string | null
        sample?: { id?: string; batch?: { beverage?: { id?: string } } } | null
    }>
    replicas: Array<{
        id: string
        name?: string | null
        type: string
        status?: string
        outcomes?: Array<{ beverageId: string; scores: string }> | null
        replicaCandidates?: Array<{
            id: string
            candidate: { id: string }
            evaluations?: Array<{
                id?: string
                evaluatorAuid?: unknown
                templateEdition?: { id?: string } | null
                scores?: Array<{ code: string; value: string | null }> | null
            }> | null
        }> | null
    }>
}

export type CommissionReplicaForScript = CommissionForScriptContext["replicas"][number]

export interface ScriptContextInput {
    commission: CommissionForScriptContext
    templateEditionById: Record<string, TemplateEdition>
}

export interface BuiltScriptContext {
    scriptReplicas: ScriptReplicaAdapter[]
    scriptCandidates: ScriptCandidateAdapter[]
    scriptEvaluations: ScriptEvaluationAdapter[]
    beverageIds: string[]
    candidateIdToBeverageId: Map<string, string>
}

function buildScriptCandidates(commission: CommissionForScriptContext): {
    scriptCandidates: ScriptCandidateAdapter[]
    candidateIdToBeverageId: Map<string, string>
    beverageIds: string[]
} {
    const candidateIdToBeverageId = new Map<string, string>()
    const scriptCandidates: ScriptCandidateAdapter[] = []

    for (const candidate of commission.candidates) {
        const beverageId = candidate.sample?.batch?.beverage?.id
        const sampleId = candidate.sample?.id
        if (!beverageId || !sampleId) continue

        candidateIdToBeverageId.set(candidate.id, beverageId)
        scriptCandidates.push(
            adaptCandidate({
                id: candidate.id,
                sampleId,
                beverageId,
                anonymizedCode: candidate.anonymizedCode,
            }),
        )
    }

    const beverageIds = Array.from(new Set(scriptCandidates.map((c) => c.getBeverageId())))

    return { scriptCandidates, candidateIdToBeverageId, beverageIds }
}

function buildScriptEvaluationsForReplica(
    replica: CommissionReplicaForScript,
    templateEditionById: Record<string, TemplateEdition>,
): ScriptEvaluationAdapter[] {
    const scriptEvaluations: ScriptEvaluationAdapter[] = []

    for (const rc of replica.replicaCandidates ?? []) {
        const candidateId = rc.candidate.id
        for (const ev of rc.evaluations ?? []) {
            const templateEditionId = ev.templateEdition?.id
            const templateEdition = templateEditionId
                ? templateEditionById[templateEditionId]
                : undefined

            let scoresMap: Record<string, unknown> = {}
            if (templateEdition) {
                scoresMap = computeEvaluationFullScores(ev as RawEvaluation, templateEdition)
            } else {
                ev.scores?.forEach((s) => {
                    if (s.value != null && String(s.value).trim() !== "") {
                        const num = Number(s.value)
                        scoresMap[s.code] = Number.isNaN(num) ? s.value : num
                    }
                })
            }

            const evaluatorAuids = normalizeAuids(ev.evaluatorAuid)
            scriptEvaluations.push(
                adaptEvaluation({
                    id: ev.id ?? `${rc.id}-${evaluatorAuids.join("-")}`,
                    replicaId: replica.id,
                    replicaCandidateId: rc.id,
                    candidateId,
                    evaluatorAuid: evaluatorAuids.join(","),
                    scores: scoresMap,
                }),
            )
        }
    }

    return scriptEvaluations
}

/**
 * Build script context for a single replica (mirrors ReplicaOutcomeCalculationService).
 */
export function buildReplicaScriptContext(
    replica: CommissionReplicaForScript,
    commission: CommissionForScriptContext,
    templateEditionById: Record<string, TemplateEdition>,
): BuiltScriptContext {
    const { scriptCandidates, candidateIdToBeverageId, beverageIds } = buildScriptCandidates(commission)

    return {
        scriptReplicas: [adaptReplica({ id: replica.id, name: replica.name, type: replica.type })],
        scriptCandidates,
        scriptEvaluations: buildScriptEvaluationsForReplica(replica, templateEditionById),
        beverageIds,
        candidateIdToBeverageId,
    }
}

/** @deprecated Use buildReplicaScriptContext per replica. Kept for tests if needed. */
export function buildScriptContext(input: ScriptContextInput): BuiltScriptContext {
    const { commission, templateEditionById } = input
    const { scriptCandidates, candidateIdToBeverageId, beverageIds } = buildScriptCandidates(commission)

    const scriptReplicas = commission.replicas.map((r) =>
        adaptReplica({ id: r.id, name: r.name, type: r.type }),
    )

    const scriptEvaluations: ScriptEvaluationAdapter[] = []
    for (const replica of commission.replicas) {
        scriptEvaluations.push(...buildScriptEvaluationsForReplica(replica, templateEditionById))
    }

    return {
        scriptReplicas,
        scriptCandidates,
        scriptEvaluations,
        beverageIds,
        candidateIdToBeverageId,
    }
}
