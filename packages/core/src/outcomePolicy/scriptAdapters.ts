/**
 * GraalVM-compatible adapters for outcome policy scripts executed in the browser.
 * Backend policies call .size(), .get(i), .getId(), .getScores().get(code), etc.
 */

export interface ScriptListAdapter<T> {
    size: () => number
    get: (index: number) => T
}

export interface ScriptMapAdapter {
    get: (key: string) => unknown
}

export interface ScriptReplicaAdapter {
    getId: () => string
    getName: () => string | null
    getType: () => string
}

export interface ScriptCandidateAdapter {
    getId: () => string
    getSampleId: () => string
    getBeverageId: () => string
    getAnonymizedCode: () => string | null
}

export interface ScriptEvaluationAdapter {
    getId: () => string
    getReplicaId: () => string
    getReplicaCandidateId: () => string
    getCandidateId: () => string
    getEvaluatorAuid: () => string
    getScores: () => ScriptMapAdapter
}

export function createScriptList<T>(items: T[]): ScriptListAdapter<T> {
    return {
        size: () => items.length,
        get: (index: number) => items[index],
    }
}

export function createScriptMap(map: Record<string, unknown>): ScriptMapAdapter {
    return {
        get: (key: string) => map[key],
    }
}

export function adaptReplica(replica: {
    id: string
    name?: string | null
    type: string
}): ScriptReplicaAdapter {
    return {
        getId: () => replica.id,
        getName: () => replica.name ?? null,
        getType: () => replica.type,
    }
}

export function adaptCandidate(candidate: {
    id: string
    sampleId: string
    beverageId: string
    anonymizedCode?: string | null
}): ScriptCandidateAdapter {
    return {
        getId: () => candidate.id,
        getSampleId: () => candidate.sampleId,
        getBeverageId: () => candidate.beverageId,
        getAnonymizedCode: () => candidate.anonymizedCode ?? null,
    }
}

export function adaptEvaluation(evaluation: {
    id: string
    replicaId: string
    replicaCandidateId: string
    candidateId: string
    evaluatorAuid: string
    scores: Record<string, unknown>
}): ScriptEvaluationAdapter {
    return {
        getId: () => evaluation.id,
        getReplicaId: () => evaluation.replicaId,
        getReplicaCandidateId: () => evaluation.replicaCandidateId,
        getCandidateId: () => evaluation.candidateId,
        getEvaluatorAuid: () => evaluation.evaluatorAuid,
        getScores: () => createScriptMap(evaluation.scores),
    }
}
