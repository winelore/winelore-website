import {
    createScriptList,
    type ScriptCandidateAdapter,
    type ScriptEvaluationAdapter,
    type ScriptReplicaAdapter,
} from "./scriptAdapters"
import type { OutcomePolicyEditionData } from "./outcomePropertyMap"

const SCRIPT_TIMEOUT_MS = 2000

function deepCopy(value: unknown): unknown {
    if (value instanceof Map) {
        return Object.fromEntries(
            Array.from(value.entries()).map(([k, v]) => [k, deepCopy(v)]),
        )
    }
    if (Array.isArray(value)) {
        return value.map((item) => deepCopy(item))
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, deepCopy(v)]),
        )
    }
    return value
}

function evaluateRawScript(
    scriptCode: string,
    replicas: ScriptReplicaAdapter[],
    candidates: ScriptCandidateAdapter[],
    evaluations: ScriptEvaluationAdapter[],
): Record<string, unknown> {
    const replicasList = createScriptList(replicas)
    const candidatesList = createScriptList(candidates)
    const evaluationsList = createScriptList(evaluations)

    let timedOut = false
    const timer = setTimeout(() => {
        timedOut = true
    }, SCRIPT_TIMEOUT_MS)

    try {
        const fn = new Function(
            "replicas",
            "candidates",
            "evaluations",
            `"use strict"; return (${scriptCode});`,
        )
        const result = fn(replicasList, candidatesList, evaluationsList)
        if (timedOut) {
            throw new Error(`Outcome policy script timed out after ${SCRIPT_TIMEOUT_MS}ms`)
        }
        if (result == null) return {}
        if (typeof result === "object" && !Array.isArray(result)) {
            return deepCopy(result) as Record<string, unknown>
        }
        return {}
    } finally {
        clearTimeout(timer)
    }
}

function extractBeverageScores(raw: Record<string, unknown>, beverageId: string): Record<string, unknown> {
    const beverageValue = raw[beverageId]
    if (beverageValue && typeof beverageValue === "object" && !Array.isArray(beverageValue)) {
        return beverageValue as Record<string, unknown>
    }
    return {}
}

function normalizePerBeverageResult(
    raw: Record<string, unknown>,
    beverageId: string,
): Record<string, unknown> {
    if (Object.keys(raw).length === 0) return {}
    const allValuesAreMaps = Object.values(raw).every(
        (v) => v !== null && typeof v === "object" && !Array.isArray(v),
    )
    if (allValuesAreMaps) {
        const nested = raw[beverageId]
        if (nested && typeof nested === "object" && !Array.isArray(nested)) {
            return nested as Record<string, unknown>
        }
        return {}
    }
    return raw
}

export interface EvaluateOutcomePolicyInput {
    policyEdition: OutcomePolicyEditionData
    scriptReplicas: ScriptReplicaAdapter[]
    scriptCandidates: ScriptCandidateAdapter[]
    scriptEvaluations: ScriptEvaluationAdapter[]
    beverageIds: string[]
}

/**
 * Execute outcome policy script client-side, mirroring ReplicaOutcomeCalculationService.
 * Caller must supply single-replica script context when matching backend behavior.
 */
export function evaluateOutcomePolicy(input: EvaluateOutcomePolicyInput): Map<string, Record<string, unknown>> {
    const {
        policyEdition,
        scriptReplicas,
        scriptCandidates,
        scriptEvaluations,
        beverageIds,
    } = input

    const result = new Map<string, Record<string, unknown>>()

    try {
        if (policyEdition.calculationScope === "REPLICA_WIDE") {
            const raw = evaluateRawScript(
                policyEdition.scriptCode,
                scriptReplicas,
                scriptCandidates,
                scriptEvaluations,
            )
            for (const beverageId of beverageIds) {
                result.set(beverageId, extractBeverageScores(raw, beverageId))
            }
        } else {
            for (const beverageId of beverageIds) {
                const filteredCandidates = scriptCandidates.filter(
                    (c) => c.getBeverageId() === beverageId,
                )
                const filteredCandidateIds = new Set(filteredCandidates.map((c) => c.getId()))
                const filteredEvaluations = scriptEvaluations.filter((e) =>
                    filteredCandidateIds.has(e.getCandidateId()),
                )
                const raw = evaluateRawScript(
                    policyEdition.scriptCode,
                    scriptReplicas,
                    filteredCandidates,
                    filteredEvaluations,
                )
                result.set(beverageId, normalizePerBeverageResult(raw, beverageId))
            }
        }
    } catch (err) {
        console.error("[outcomePolicy] Script execution failed:", err)
    }

    return result
}
