import { evaluateAST } from "./evaluationExpression"

export interface TemplateProperty {
    __typename?: string
    code: string
    expression?: unknown | null
}

export interface TemplateCategory {
    properties?: TemplateProperty[] | null
}

export interface TemplateEdition {
    id: string
    categories?: TemplateCategory[] | null
}

export interface RawEvaluationScore {
    code: string
    value: string | null
}

export interface RawEvaluation {
    scores?: RawEvaluationScore[] | null
}

function parseRawScoreValue(value: string | null | undefined): number | boolean | null {
    if (value == null || String(value).trim() === "") return null
    const trimmed = String(value).trim()
    if (trimmed === "true") return true
    if (trimmed === "false") return false
    const num = Number(trimmed)
    return Number.isNaN(num) ? trimmed : num
}

function getAllProperties(templateEdition: TemplateEdition): TemplateProperty[] {
    const props: TemplateProperty[] = []
    templateEdition.categories?.forEach((cat) => {
        cat.properties?.forEach((prop) => props.push(prop))
    })
    return props
}

/**
 * Expands raw evaluation scores with SmartProperty values, mirroring backend Evaluation.computeFullScores.
 */
export function computeEvaluationFullScores(
    evaluation: RawEvaluation,
    templateEdition: TemplateEdition,
): Record<string, unknown> {
    const properties = getAllProperties(templateEdition)
    const rawScores: Record<string, unknown> = {}

    evaluation.scores?.forEach((s) => {
        const parsed = parseRawScoreValue(s.value)
        if (parsed !== null) rawScores[s.code] = parsed
    })

    const fullScores: Record<string, unknown> = {}
    const variables: Record<string, number | boolean> = {}

    for (const prop of properties) {
        if (prop.__typename !== "SmartProperty") {
            const val = rawScores[prop.code]
            fullScores[prop.code] = val ?? null
            if (val !== null && val !== undefined) {
                if (typeof val === "number" || typeof val === "boolean") {
                    variables[prop.code] = val
                } else {
                    const num = Number(val)
                    if (!Number.isNaN(num)) variables[prop.code] = num
                }
            }
        }
    }

    const smartProps = properties.filter((p) => p.__typename === "SmartProperty" && p.expression)
    const smartMap: Record<string, number> = {}

    for (let pass = 0; pass <= smartProps.length; pass++) {
        let changed = false
        for (const prop of smartProps) {
            if (smartMap[prop.code] !== undefined) continue
            const merged: Record<string, number | boolean> = { ...variables, ...smartMap }
            const result = evaluateAST(prop.expression, merged)
            if (result !== null) {
                smartMap[prop.code] = result
                fullScores[prop.code] = result
                changed = true
            }
        }
        if (!changed) break
    }

    for (const prop of smartProps) {
        if (fullScores[prop.code] === undefined) {
            fullScores[prop.code] = smartMap[prop.code] ?? null
        }
    }

    return fullScores
}
