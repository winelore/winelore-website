import { normalizeAuids } from "./auidUtils"
import { parseEvaluationTotal } from "@/lib/evaluationTotals"

import type { PropertyMeta } from "./propertyMap";

export interface ExpertBeverageSummaryEntry {
    order: number
    code: string
    beverageName: string
    totalScore: number | null
    producerAuids: string[]
    evaluation: {
        scores: Array<{ code: string; value: string }>
        comments: Array<{
            id: string
            text?: string | null
            voiceUrl?: string | null
            propertyId?: string | null
        }>
    }
}

/** @deprecated Use ExpertBeverageSummaryEntry */
export type ExpertBeverageRankEntry = ExpertBeverageSummaryEntry

export interface MyTastingSummaryData {
    entries: ExpertBeverageSummaryEntry[]
    propertyMap: Record<string, PropertyMeta>
    propertyCommentsEnabled: boolean
    voiceCommentsEnabled: boolean
}

export interface ReplicaCandidateWithBeverage {
    id: string
    candidate?: {
        id: string
        anonymizedCode?: string | null
        sample?: {
            batch?: {
                beverage?: {
                    name?: string | null
                    producers?: Array<{ auid?: unknown }> | null
                } | null
            } | null
        } | null
    } | null
}

interface MyEvaluation {
    isComplete?: boolean
    scores?: Array<{ code: string; value: string | null }>
    comments?: Array<{
        id: string
        text?: string | null
        voiceUrl?: string | null
        propertyId?: string | null
    }>
}

function getBeverageProducerAuids(candidate: ReplicaCandidateWithBeverage["candidate"]): string[] {
    const producers = candidate?.sample?.batch?.beverage?.producers
    if (!Array.isArray(producers)) return []

    const auids = new Set<string>()
    producers.forEach((producer) => {
        normalizeAuids(producer.auid).forEach((id) => auids.add(id))
    })
    return Array.from(auids)
}

function normalizeEvaluation(evaluation: MyEvaluation): ExpertBeverageSummaryEntry["evaluation"] {
    return {
        scores: (evaluation.scores || [])
            .filter((s) => s.value != null && String(s.value).trim() !== "")
            .map((s) => ({ code: s.code, value: String(s.value) })),
        comments: (evaluation.comments || []).map((c) => ({
            id: c.id,
            text: c.text,
            voiceUrl: c.voiceUrl,
            propertyId: c.propertyId,
        })),
    }
}

function evaluationHasDisplayData(evaluation: MyEvaluation): boolean {
    const normalized = normalizeEvaluation(evaluation)
    return normalized.scores.length > 0 || normalized.comments.length > 0
}

export function buildExpertBeverageSummary(
    replicaCandidates: ReplicaCandidateWithBeverage[],
    myEvaluationsByReplicaCandidateId: Map<string, MyEvaluation | null>,
    unknownBeverageLabel: string,
): ExpertBeverageSummaryEntry[] {
    const entries: ExpertBeverageSummaryEntry[] = []

    replicaCandidates.forEach((rc, index) => {
        const evaluation = myEvaluationsByReplicaCandidateId.get(rc.id)
        if (!evaluation?.isComplete) return
        if (!evaluationHasDisplayData(evaluation) && parseEvaluationTotal(evaluation.scores) === null) {
            return
        }

        entries.push({
            order: index + 1,
            code: rc.candidate?.anonymizedCode || "N/A",
            beverageName:
                rc.candidate?.sample?.batch?.beverage?.name || unknownBeverageLabel,
            totalScore: parseEvaluationTotal(evaluation.scores),
            producerAuids: getBeverageProducerAuids(rc.candidate),
            evaluation: normalizeEvaluation(evaluation),
        })
    })

    return entries
}

/** @deprecated Use buildExpertBeverageSummary */
export const buildExpertBeverageRanking = buildExpertBeverageSummary
