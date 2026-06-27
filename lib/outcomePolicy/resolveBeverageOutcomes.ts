import type { TemplateEdition } from "@/lib/evaluationScores"
import { buildReplicaScriptContext, type CommissionForScriptContext } from "./buildScriptContext"
import { evaluateOutcomePolicy } from "./evaluateOutcomePolicy"
import {
    type OutcomeOutputProperty,
    type OutcomePolicyEditionData,
    parseStoredOutcomeScores,
    resolveOutputProperties,
    selectPrimaryOutcomeScore,
} from "./outcomePropertyMap"

export interface ReplicaBeverageOutcomeDisplay {
    scores: Record<string, unknown>
    average: string
    numeric: number | null
    isPreview: boolean
}

export type ReplicaBeverageOutcomesMap = Map<string, Map<string, ReplicaBeverageOutcomeDisplay>>

export interface ResolveReplicaBeverageOutcomesInput {
    commission: CommissionForScriptContext
    policyEdition: OutcomePolicyEditionData | null | undefined
    templateEditionById: Record<string, TemplateEdition>
    isReplicaBeverageIncomplete: (replicaId: string, beverageId: string) => boolean
}

export interface ResolvedReplicaOutcomes {
    replicaOutcomes: ReplicaBeverageOutcomesMap
    outputProperties: OutcomeOutputProperty[]
}

function isReplicaCompleted(status: string | undefined): boolean {
    return status === "COMPLETED"
}

function parseStoredOutcomesByBeverage(
    outcomes: Array<{ beverageId: string; scores: string }> | null | undefined,
): Map<string, Record<string, unknown>> {
    const map = new Map<string, Record<string, unknown>>()
    if (!outcomes?.length) return map
    for (const outcome of outcomes) {
        map.set(outcome.beverageId, parseStoredOutcomeScores(outcome.scores))
    }
    return map
}

/**
 * Resolve per-replica, per-beverage outcome scores: stored when replica COMPLETED, else client JS preview.
 */
export function resolveReplicaBeverageOutcomes(
    input: ResolveReplicaBeverageOutcomesInput,
): ResolvedReplicaOutcomes {
    const { commission, policyEdition, templateEditionById, isReplicaBeverageIncomplete } = input
    const replicaOutcomes: ReplicaBeverageOutcomesMap = new Map()
    const rawScoreMaps = new Map<string, Map<string, Record<string, unknown>>>()

    if (!policyEdition) {
        return { replicaOutcomes, outputProperties: [] }
    }

    const allBeverageIds = Array.from(
        new Set(
            commission.candidates
                .map((c) => c.sample?.batch?.beverage?.id)
                .filter(Boolean) as string[],
        ),
    )

    for (const replica of commission.replicas) {
        const replicaRaw = new Map<string, Record<string, unknown>>()
        const storedByBeverage = parseStoredOutcomesByBeverage(replica.outcomes)
        const useStored = isReplicaCompleted(replica.status)

        let previewScores = new Map<string, Record<string, unknown>>()
        if (!useStored) {
            const replicaContext = buildReplicaScriptContext(replica, commission, templateEditionById)
            previewScores = evaluateOutcomePolicy({
                policyEdition,
                scriptReplicas: replicaContext.scriptReplicas,
                scriptCandidates: replicaContext.scriptCandidates,
                scriptEvaluations: replicaContext.scriptEvaluations,
                beverageIds: replicaContext.beverageIds,
            })
        }

        for (const beverageId of allBeverageIds) {
            const scores = useStored
                ? storedByBeverage.get(beverageId) ?? {}
                : previewScores.get(beverageId) ?? {}
            replicaRaw.set(beverageId, scores)
        }

        rawScoreMaps.set(replica.id, replicaRaw)
    }

    const outputProperties = resolveOutputProperties(policyEdition, rawScoreMaps)

    for (const replica of commission.replicas) {
        const replicaMap = new Map<string, ReplicaBeverageOutcomeDisplay>()
        const replicaRaw = rawScoreMaps.get(replica.id)
        const useStored = isReplicaCompleted(replica.status)

        for (const beverageId of allBeverageIds) {
            const scores = replicaRaw?.get(beverageId) ?? {}
            const { display, numeric } = selectPrimaryOutcomeScore(scores, outputProperties)
            const isPreview = useStored
                ? false
                : isReplicaBeverageIncomplete(replica.id, beverageId)

            replicaMap.set(beverageId, {
                scores,
                average: display,
                numeric,
                isPreview,
            })
        }

        replicaOutcomes.set(replica.id, replicaMap)
    }

    return { replicaOutcomes, outputProperties }
}

export interface OverallOutcomeDisplay {
    average: string
    numeric: number | null
    isPreview: boolean
}

/**
 * Average primary outcome scores across non-TRAINEE replicas for a beverage.
 */
export function aggregateOverallFromReplicas(
    replicaOutcomes: ReplicaBeverageOutcomesMap,
    beverageId: string,
    replicas: Array<{ id: string; type: string }>,
    outputProperties: OutcomeOutputProperty[],
): OverallOutcomeDisplay {
    const scores: number[] = []
    let isPreview = false

    replicas
        .filter((r) => r.type !== "TRAINEE")
        .forEach((replica) => {
            const display = replicaOutcomes.get(replica.id)?.get(beverageId)
            if (!display) return

            const primary =
                display.numeric !== null
                    ? display.numeric
                    : selectPrimaryOutcomeScore(display.scores, outputProperties).numeric

            if (primary !== null) scores.push(primary)
            if (display.isPreview) isPreview = true
        })

    if (scores.length === 0) {
        return { average: "-", numeric: null, isPreview: false }
    }

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    return {
        average: avg.toFixed(2),
        numeric: avg,
        isPreview,
    }
}

export function getReplicaBeverageOutcome(
    replicaOutcomes: ReplicaBeverageOutcomesMap,
    replicaId: string,
    beverageId: string,
): ReplicaBeverageOutcomeDisplay | undefined {
    return replicaOutcomes.get(replicaId)?.get(beverageId)
}

export function commissionUsesOutcomePolicy(
    commission: { policyEdition?: OutcomePolicyEditionData | null },
): boolean {
    return Boolean(commission.policyEdition)
}
