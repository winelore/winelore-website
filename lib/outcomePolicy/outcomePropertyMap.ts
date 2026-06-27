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

export interface OutcomeValueDisplay {
    display: string
    numeric: number | null
}

/** Format every policy output property from a score map. */
export function buildOutcomePropertyValues(
    scores: Record<string, unknown>,
    outputProperties: OutcomeOutputProperty[],
): Record<string, OutcomeValueDisplay> {
    const values: Record<string, OutcomeValueDisplay> = {}
    for (const prop of outputProperties) {
        const raw = scores[prop.code]
        const numeric = parseNumericOutcomeValue(raw)
        values[prop.code] = {
            display: numeric !== null ? numeric.toFixed(2) : formatOutcomeValue(raw),
            numeric,
        }
    }
    return values
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

    return codes.map((code) => {
        const policyMeta = policyEdition?.outputProperties?.find((p) => p.code === code)
        return {
            code,
            name: policyMeta?.name || code,
            isResult: policyMeta?.isResult === true,
        }
    })
}
