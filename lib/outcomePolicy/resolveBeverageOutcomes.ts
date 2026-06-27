import type { TemplateEdition } from "@/lib/evaluationScores"
import { buildReplicaScriptContext, type CommissionForScriptContext } from "./buildScriptContext"
import { evaluateOutcomePolicy } from "./evaluateOutcomePolicy"
import {
    buildOutcomePropertyValues,
    type OutcomeOutputProperty,
    type OutcomePolicyEditionData,
    type OutcomePropertyNameLookup,
    type OutcomeValueDisplay,
    resolveOutputProperties,
} from "./outcomePropertyMap"

export interface ReplicaBeverageOutcomeDisplay {
    scores: Record<string, unknown>
    values: Record<string, OutcomeValueDisplay>
    isPreview: boolean
}

export type ReplicaBeverageOutcomesMap = Map<string, Map<string, ReplicaBeverageOutcomeDisplay>>

export interface ResolveReplicaBeverageOutcomesInput {
    commission: CommissionForScriptContext
    policyEdition: OutcomePolicyEditionData | null | undefined
    templateEditionById: Record<string, TemplateEdition>
    templatePropertyMap?: OutcomePropertyNameLookup
    isReplicaBeverageIncomplete: (replicaId: string, beverageId: string) => boolean
}

export interface ResolvedReplicaOutcomes {
    replicaOutcomes: ReplicaBeverageOutcomesMap
    outputProperties: OutcomeOutputProperty[]
}

/**
 * Resolve per-replica, per-beverage outcome scores by running the policy script
 * against current evaluation data (never backend-stored replica outcomes).
 */
export function resolveReplicaBeverageOutcomes(
    input: ResolveReplicaBeverageOutcomesInput,
): ResolvedReplicaOutcomes {
    const { commission, policyEdition, templateEditionById, templatePropertyMap, isReplicaBeverageIncomplete } =
        input
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
        const replicaContext = buildReplicaScriptContext(replica, commission, templateEditionById)
        const computedScores = evaluateOutcomePolicy({
            policyEdition,
            scriptReplicas: replicaContext.scriptReplicas,
            scriptCandidates: replicaContext.scriptCandidates,
            scriptEvaluations: replicaContext.scriptEvaluations,
            beverageIds: replicaContext.beverageIds,
        })

        for (const beverageId of allBeverageIds) {
            replicaRaw.set(beverageId, computedScores.get(beverageId) ?? {})
        }

        rawScoreMaps.set(replica.id, replicaRaw)
    }

    const outputProperties = resolveOutputProperties(
        policyEdition,
        rawScoreMaps,
        templatePropertyMap,
    )

    for (const replica of commission.replicas) {
        const replicaMap = new Map<string, ReplicaBeverageOutcomeDisplay>()
        const replicaRaw = rawScoreMaps.get(replica.id)

        for (const beverageId of allBeverageIds) {
            const scores = replicaRaw?.get(beverageId) ?? {}
            const values = buildOutcomePropertyValues(scores, outputProperties)
            const isPreview = isReplicaBeverageIncomplete(replica.id, beverageId)

            replicaMap.set(beverageId, {
                scores,
                values,
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

export type OverallOutcomeByProperty = Record<string, OverallOutcomeDisplay>

/**
 * Average each outcome property across non-TRAINEE replicas for a beverage.
 */
export function aggregateOverallFromReplicas(
    replicaOutcomes: ReplicaBeverageOutcomesMap,
    beverageId: string,
    replicas: Array<{ id: string; type: string }>,
    outputProperties: OutcomeOutputProperty[],
): OverallOutcomeByProperty {
    const result: OverallOutcomeByProperty = {}
    const nonTraineeReplicas = replicas.filter((r) => r.type !== "TRAINEE")

    for (const prop of outputProperties) {
        const numericScores: number[] = []
        let isPreview = false

        nonTraineeReplicas.forEach((replica) => {
            const display = replicaOutcomes.get(replica.id)?.get(beverageId)
            if (!display) return

            const value = display.values[prop.code]
            if (value?.numeric !== null && value?.numeric !== undefined) {
                numericScores.push(value.numeric)
            }
            if (display.isPreview) isPreview = true
        })

        if (numericScores.length === 0) {
            result[prop.code] = { average: "-", numeric: null, isPreview: isPreview }
        } else {
            const avg = numericScores.reduce((a, b) => a + b, 0) / numericScores.length
            result[prop.code] = {
                average: avg.toFixed(2),
                numeric: avg,
                isPreview,
            }
        }
    }

    return result
}

export function getReplicaBeverageOutcome(
    replicaOutcomes: ReplicaBeverageOutcomesMap,
    replicaId: string,
    beverageId: string,
): ReplicaBeverageOutcomeDisplay | undefined {
    return replicaOutcomes.get(replicaId)?.get(beverageId)
}

export function commissionUsesOutcomePolicy(
    commission: { outcomePolicyEdition?: OutcomePolicyEditionData | null },
): boolean {
    return Boolean(commission.outcomePolicyEdition)
}
