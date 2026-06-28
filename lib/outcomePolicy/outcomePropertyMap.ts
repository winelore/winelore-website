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

export type OutcomePropertyNameLookup = Record<
    string,
    { name: string; isResult?: boolean; kind?: "boolean" | "numeric" | "enum" | "discrete" | "text" | "smart" }
>

function humanizeOutcomeCode(code: string): string {
    return code
        .replace(/[_-]+/g, " ")
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}

export function resolveOutcomePropertyName(
    code: string,
    policyName?: string | null,
    templatePropertyMap?: OutcomePropertyNameLookup,
): string {
    if (policyName && policyName.trim() !== "" && policyName !== code) {
        return policyName
    }
    const templateName = templatePropertyMap?.[code]?.name
    if (templateName && templateName.trim() !== "") {
        return templateName
    }
    return humanizeOutcomeCode(code)
}

export function buildOutcomePropertyMap(
    policyEdition: OutcomePolicyEditionData | null | undefined,
    outputProperties?: OutcomeOutputProperty[],
    templatePropertyMap?: OutcomePropertyNameLookup,
): Record<string, OutcomePropertyMeta> {
    const map: Record<string, OutcomePropertyMeta> = {}
    const props =
        outputProperties ??
        policyEdition?.outputProperties?.filter((p) => p.code) ??
        []

    for (const prop of props) {
        if (!prop.code) continue
        const templateMeta = templatePropertyMap?.[prop.code]
        map[prop.code] = {
            name: resolveOutcomePropertyName(prop.code, prop.name, templatePropertyMap),
            isResult: prop.isResult === true || templateMeta?.isResult === true,
        }
    }
    return map
}

import { parseStoredBoolean } from "@/lib/formatPropertyScore"

function parseBooleanOutcomeValue(value: unknown): boolean | null {
    if (typeof value === "boolean") return value
    if (value === null || value === undefined) return null
    return parseStoredBoolean(String(value))
}

export function parseNumericOutcomeValue(value: unknown): number | null {
    if (value === null || value === undefined) return null
    if (parseBooleanOutcomeValue(value) !== null) return null
    if (typeof value === "number" && !Number.isNaN(value)) return value
    const num = Number(value)
    return Number.isNaN(num) ? null : num
}

export function formatOutcomeValue(value: unknown): string {
    const boolVal = parseBooleanOutcomeValue(value)
    if (boolVal !== null) return boolVal ? "Yes" : "No"
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
    templatePropertyMap?: OutcomePropertyNameLookup,
): Record<string, OutcomeValueDisplay> {
    const values: Record<string, OutcomeValueDisplay> = {}
    for (const prop of outputProperties) {
        const raw = scores[prop.code]
        const isBooleanKind = templatePropertyMap?.[prop.code]?.kind === "boolean"
        let boolVal = parseBooleanOutcomeValue(raw)

        if (boolVal === null && isBooleanKind && typeof raw === "number" && (raw === 0 || raw === 1)) {
            boolVal = raw === 1
        }

        if (boolVal !== null) {
            values[prop.code] = {
                display: boolVal ? "Yes" : "No",
                numeric: null,
            }
            continue
        }

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
    templatePropertyMap?: OutcomePropertyNameLookup,
): OutcomeOutputProperty[] {
    const fromPolicy = (policyEdition?.outputProperties ?? []).filter((p) => p.code)
    if (fromPolicy.length > 0) {
        return fromPolicy.map((p) => ({
            code: p.code,
            name: resolveOutcomePropertyName(p.code, p.name, templatePropertyMap),
            isResult: p.isResult === true,
        }))
    }

    const codes = collectScoreKeysFromMaps(rawScoreMaps)
    if (codes.length === 0) return []

    const inferred = codes.map((code) => {
        const policyMeta = policyEdition?.outputProperties?.find((p) => p.code === code)
        return {
            code,
            name: resolveOutcomePropertyName(code, policyMeta?.name, templatePropertyMap),
            isResult: policyMeta?.isResult === true,
        }
    })

    return inferred
}
