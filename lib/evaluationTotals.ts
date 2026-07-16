export function parseEvaluationTotal(
    scores: Array<{ code: string; value: string }> | undefined | null,
    propertyMap: Record<string, { isResult: boolean }> | undefined | null,
): number | null {
    if (!scores?.length || !propertyMap) return null
    const resultScores = scores.filter((s) => propertyMap[s.code]?.isResult)
    if (resultScores.length === 0) return null

    // Prefer a property code that contains 'total', otherwise use the last result score (usually the overall total)
    const resultScore = resultScores.find((s) => s.code.toLowerCase().includes('total')) || resultScores[resultScores.length - 1]
    if (resultScore?.value != null && !isNaN(parseFloat(resultScore.value))) {
        return parseFloat(resultScore.value)
    }
    return null
}

export function parseEvaluationTotals(
    scores: Array<{ code: string; value: string }> | undefined | null,
    propertyMap: Record<string, { isResult: boolean }> | undefined | null,
): Array<{ code: string; value: number }> {
    if (!scores?.length || !propertyMap) return []
    return scores
        .filter((s) => propertyMap[s.code]?.isResult)
        .map((s) => ({
            code: s.code,
            value: parseFloat(s.value),
        }))
        .filter((s) => !isNaN(s.value))
}

export function hasEvaluationTotalScore(
    ev: { scores?: Array<{ code: string; value: string }> | null } | undefined | null,
    propertyMap: Record<string, { isResult: boolean }> | undefined | null,
): boolean {
    if (!ev?.scores?.length || !propertyMap) return false
    return ev.scores.some((s) => propertyMap[s.code]?.isResult && s.value != null && !isNaN(parseFloat(s.value)))
}
