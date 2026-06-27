export type OutcomePropertyMeta = { name: string; isResult: boolean }

export interface OutcomeOutputProperty {
    __typename?: string
    code: string
    name: string
    isResult?: boolean | null
}

export interface OutcomePolicyEditionData {
    id: string
    scriptCode: string
    calculationScope: "PER_BEVERAGE" | "REPLICA_WIDE"
    outputProperties?: OutcomeOutputProperty[]
}

export function buildOutcomePropertyMap(
    policyEdition: OutcomePolicyEditionData | null | undefined,
    outputProperties?: OutcomeOutputProperty[],
): Record<string, OutcomePropertyMeta> {
    const map: Record<string, OutcomePropertyMeta> = {}
    const props =
        outputProperties ??
        policyEdition?.outputProperties?.filter((p) => p.code) ??
        []

    for (const prop of props) {
        if (!prop.code) continue
        map[prop.code] = {
            name: prop.name || prop.code,
            isResult: prop.isResult === true,
        }
    }
    return map
}

export function parseNumericOutcomeValue(value: unknown): number | null {
    if (value === null || value === undefined) return null
    if (typeof value === "number" && !Number.isNaN(value)) return value
    const num = Number(value)
    return Number.isNaN(num) ? null : num
}

export function formatOutcomeValue(value: unknown): string {
    const num = parseNumericOutcomeValue(value)
    if (num !== null) return num.toFixed(2)
    if (value === null || value === undefined) return "-"
    return String(value)
}

/**
 * Pick the primary display score using only policy output property definitions.
 */
export function selectPrimaryOutcomeScore(
    scores: Record<string, unknown>,
    outputProperties: OutcomeOutputProperty[],
): { display: string; numeric: number | null } {
    if (outputProperties.length === 0) {
        return { display: "-", numeric: null }
    }

    for (const prop of outputProperties) {
        if (prop.isResult) {
            const num = parseNumericOutcomeValue(scores[prop.code])
            if (num !== null) return { display: num.toFixed(2), numeric: num }
        }
    }
    for (const prop of outputProperties) {
        const num = parseNumericOutcomeValue(scores[prop.code])
        if (num !== null) return { display: num.toFixed(2), numeric: num }
    }
    return { display: "-", numeric: null }
}

export function parseStoredOutcomeScores(scoresJson: string): Record<string, unknown> {
    try {
        const parsed = JSON.parse(scoresJson)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>
        }
    } catch {
        // ignore invalid JSON
    }
    return {}
}

function collectScoreKeysFromMaps(
    scoreMaps: Map<string, Map<string, Record<string, unknown>>>,
): string[] {
    const codes = new Set<string>()
    for (const replicaMap of scoreMaps.values()) {
        for (const scores of replicaMap.values()) {
            Object.keys(scores).forEach((code) => codes.add(code))
        }
    }
    return Array.from(codes).sort()
}

/**
 * Resolve output property metadata from the policy edition, or infer codes from computed outcome scores.
 */
export function resolveOutputProperties(
    policyEdition: OutcomePolicyEditionData | null | undefined,
    rawScoreMaps: Map<string, Map<string, Record<string, unknown>>>,
): OutcomeOutputProperty[] {
    const fromPolicy = (policyEdition?.outputProperties ?? []).filter(
        (p) => p.code && p.name,
    )
    if (fromPolicy.length > 0) return fromPolicy

    const codes = collectScoreKeysFromMaps(rawScoreMaps)
    if (codes.length === 0) return []

    const resultMarked = codes.filter((code) =>
        (policyEdition?.outputProperties ?? []).some((p) => p.code === code && p.isResult),
    )

    return codes.map((code) => {
        const policyMeta = policyEdition?.outputProperties?.find((p) => p.code === code)
        const isResult =
            policyMeta?.isResult === true ||
            (resultMarked.length === 0 && codes.length === 1 && code === codes[0]) ||
            (resultMarked.length === 1 && code === resultMarked[0])

        return {
            code,
            name: policyMeta?.name || code,
            isResult,
        }
    })
}
