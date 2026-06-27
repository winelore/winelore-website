export const TOTAL_SCORE_CODE = "taste_score"
export const CALCULATED_TOTAL_SCORE_CODE = "total_score"

export function parseEvaluationTotal(
    scores: Array<{ code: string; value: string }> | undefined | null,
): number | null {
    if (!scores?.length) return null
    const calculated = scores.find((s) => s.code === CALCULATED_TOTAL_SCORE_CODE)
    if (calculated?.value != null && !isNaN(parseFloat(calculated.value))) {
        return parseFloat(calculated.value)
    }
    const taste = scores.find((s) => s.code === TOTAL_SCORE_CODE)
    if (taste?.value != null && !isNaN(parseFloat(taste.value))) {
        return parseFloat(taste.value)
    }
    return null
}

export function hasEvaluationTotalScore(ev: {
    scores?: Array<{ code: string; value: string }>
}): boolean {
    return parseEvaluationTotal(ev.scores) !== null
}
