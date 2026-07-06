import { normalizeAuids } from "./auidUtils"
import { hasEvaluationTotalScore } from "@/lib/evaluationTotals"
import { hasStoredScoreValue } from "@/lib/formatPropertyScore"

import type { PropertyMeta } from "./propertyMap";

export interface ExpertBeverageSummaryEntry {
    order: number
    code: string
    beverageName: string
    totalScores: Array<{ code: string; name: string; value: string }>
    producerAuids: string[]
    evaluation: {
        scores: Array<{ code: string; value: string }>
        comments: Array<{
            id: string
            text?: string
            voiceUrl?: string | null
            propertyId?: string | null
        }>
    }
    beverageType?: string
    wineType?: string
    vintage?: string
    volume?: string
    origin?: { latitude: number; longitude: number } | null
}

/** @deprecated Use ExpertBeverageSummaryEntry */
export type ExpertBeverageRankEntry = ExpertBeverageSummaryEntry

export interface MyTastingSummaryData {
    entries: ExpertBeverageSummaryEntry[]
    propertyMap: Record<string, PropertyMeta>
    propertyCommentsEnabled: boolean
    voiceCommentsEnabled: boolean
    commissionName?: string
}

export interface ReplicaCandidateWithBeverage {
    id: string
    candidate?: {
        id: string
        anonymizedCode?: string | null
        beverageType?: {
            id?: string | null
            code?: string | null
            name?: string | null
        } | null
        sample?: {
            id?: string | null
            volumeMl?: number | null
            batch?: {
                id?: string | null
                attributes?: string | null
                beverage?: {
                    id?: string | null
                    name?: string | null
                    producers?: Array<{ auid?: unknown }> | null
                    attributes?: string | null
                    origin?: {
                        latitude: number
                        longitude: number
                    } | null
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

function normalizeEvaluation(
    evaluation: MyEvaluation,
    propertyMap: Record<string, PropertyMeta>,
): ExpertBeverageSummaryEntry["evaluation"] {
    return {
        scores: (evaluation.scores || [])
            .filter((s) => hasStoredScoreValue(s.value, propertyMap[s.code]?.kind))
            .map((s) => ({ code: s.code, value: s.value == null ? "" : String(s.value) })),
        comments: (evaluation.comments || []).map((c) => ({
            id: c.id,
            text: c.text ?? undefined,
            voiceUrl: c.voiceUrl,
            propertyId: c.propertyId,
        })),
    }
}

function evaluationHasDisplayData(
    evaluation: MyEvaluation,
    propertyMap: Record<string, PropertyMeta>,
): boolean {
    const normalized = normalizeEvaluation(evaluation, propertyMap)
    return normalized.scores.length > 0 || normalized.comments.length > 0
}

export function buildExpertBeverageSummary(
    replicaCandidates: ReplicaCandidateWithBeverage[],
    myEvaluationsByReplicaCandidateId: Map<string, MyEvaluation | null>,
    unknownBeverageLabel: string,
    propertyMap: Record<string, PropertyMeta>,
): ExpertBeverageSummaryEntry[] {
    const entries: ExpertBeverageSummaryEntry[] = []

    replicaCandidates.forEach((rc, index) => {
        const evaluation = myEvaluationsByReplicaCandidateId.get(rc.id)
        if (!evaluation?.isComplete) return

        const normalizedScores = (evaluation.scores || [])
            .filter((s) => hasStoredScoreValue(s.value, propertyMap[s.code]?.kind))
            .map((s) => ({ code: s.code, value: s.value == null ? "" : String(s.value) }))

        if (!evaluationHasDisplayData(evaluation, propertyMap) && !hasEvaluationTotalScore({ scores: normalizedScores }, propertyMap)) {
            return
        }

        const totalScores = normalizedScores
            .filter((s) => propertyMap[s.code]?.isResult === true)
            .map((s) => ({
                code: s.code,
                name: propertyMap[s.code]?.name ?? s.code,
                value: s.value,
            }))

        // Extract vintage from batch attributes
        let vintageVal = undefined;
        const batchAttrs = rc.candidate?.sample?.batch?.attributes;
        if (batchAttrs) {
            try {
                const parsed = JSON.parse(batchAttrs);
                if (parsed && parsed.vintage) {
                    vintageVal = String(parsed.vintage);
                }
            } catch (e) {
                console.error("Failed to parse batch attributes in expertRanking:", e);
            }
        }

        // Extract color/wineType from beverage attributes
        let wineTypeVal = undefined;
        const bevAttrs = rc.candidate?.sample?.batch?.beverage?.attributes;
        if (bevAttrs) {
            try {
                const parsed = JSON.parse(bevAttrs);
                if (parsed && parsed.color) {
                    wineTypeVal = parsed.color;
                }
            } catch (e) {
                console.error("Failed to parse beverage attributes in expertRanking:", e);
            }
        }

        entries.push({
            order: index + 1,
            code: rc.candidate?.anonymizedCode || "N/A",
            beverageName:
                rc.candidate?.sample?.batch?.beverage?.name || unknownBeverageLabel,
            totalScores,
            producerAuids: getBeverageProducerAuids(rc.candidate),
            evaluation: normalizeEvaluation(evaluation, propertyMap),
            beverageType: rc.candidate?.beverageType?.code || undefined,
            wineType: wineTypeVal,
            vintage: vintageVal,
            volume: rc.candidate?.sample?.volumeMl ? `${rc.candidate.sample.volumeMl} ml` : undefined,
            origin: rc.candidate?.sample?.batch?.beverage?.origin || undefined,
        })
    })

    return entries
}

/** @deprecated Use buildExpertBeverageSummary */
export const buildExpertBeverageRanking = buildExpertBeverageSummary
