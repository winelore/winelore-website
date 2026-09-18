import { parseEvaluationTotal } from "./evaluationTotals"

export interface DeltaOutlierInfo {
    isOutlier: boolean
    preAvg: number | null
    diff: number | null
    signedDiff: number | null
    totalScore: number | null
    threshold: number
}

/**
 * Default OUTSIDER_THRESHOLD = 5 points
 */
export const DEFAULT_DELTA_THRESHOLD = 5

/**
 * Formats signed numeric difference with an explicit '+' sign for positive values.
 * Examples: +5.2, -5.2
 */
export function formatSignedDiff(
    signedDiff: number | null | undefined,
    precision: number = 1,
): string {
    if (signedDiff == null || isNaN(signedDiff)) return ""
    const formatted = signedDiff.toFixed(precision)
    return signedDiff > 0 ? `+${formatted}` : formatted
}

/**
 * Calculates preliminary average and flags scores that fall outside delta threshold (5 points).
 * Mirrors the outcome policy calculation:
 * - preSum = sum of all valid numeric scores
 * - preAvg = preSum / count
 * - isOutlier = Math.abs(score - preAvg) > threshold
 */
export function calculateDeltaOutliers<T>(
    items: T[],
    getScore: (item: T) => number | null,
    threshold: number = DEFAULT_DELTA_THRESHOLD,
): Map<T, DeltaOutlierInfo> {
    const result = new Map<T, DeltaOutlierInfo>()

    const validScores: number[] = []
    items.forEach((item) => {
        const s = getScore(item)
        if (s !== null && s !== undefined && !isNaN(s)) {
            validScores.push(s)
        }
    })

    if (validScores.length === 0) {
        items.forEach((item) => {
            result.set(item, {
                isOutlier: false,
                preAvg: null,
                diff: null,
                signedDiff: null,
                totalScore: getScore(item),
                threshold,
            })
        })
        return result
    }

    const preSum = validScores.reduce((acc, val) => acc + val, 0)
    const preAvg = preSum / validScores.length

    items.forEach((item) => {
        const score = getScore(item)
        if (score === null || score === undefined || isNaN(score)) {
            result.set(item, {
                isOutlier: false,
                preAvg,
                diff: null,
                signedDiff: null,
                totalScore: null,
                threshold,
            })
        } else {
            const diff = Math.abs(score - preAvg)
            const signedDiff = score - preAvg
            const isOutlier = diff > threshold
            result.set(item, {
                isOutlier,
                preAvg,
                diff,
                signedDiff,
                totalScore: score,
                threshold,
            })
        }
    })

    return result
}

/**
 * Helper specifically for objects containing raw `scores` arrays and `propertyMap`
 */
export function annotateEvaluationsWithDelta<T extends { scores?: Array<{ code: string; value: string }> | null }>(
    evaluations: T[],
    propertyMap: Record<string, { isResult: boolean }> | undefined | null,
    threshold: number = DEFAULT_DELTA_THRESHOLD,
): Map<T, DeltaOutlierInfo> {
    return calculateDeltaOutliers(
        evaluations,
        (ev) => parseEvaluationTotal(ev.scores, propertyMap),
        threshold,
    )
}
