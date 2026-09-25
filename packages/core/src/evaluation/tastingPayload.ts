import type { EvaluationCategory, EvaluationValues, SmartValues } from "./types"
import type { Locale } from "../i18n/types"

export interface TastingPropertyScore {
    name: string
    score: number
    maxScore: number
}

export interface TastingCategoryScore {
    name: string
    score: number
    maxScore: number
    properties?: TastingPropertyScore[]
}

export interface TastingPayload {
    locale: Locale
    beverageType?: string | null
    candidateCode?: string | null
    templateName?: string | null
    totalScore?: number | null
    maxTotalScore?: number | null
    categories: TastingCategoryScore[]
    attributes?: Record<string, string | number | boolean | null> | null
}

export interface BuildTastingPayloadOptions {
    categories: EvaluationCategory[]
    values: EvaluationValues
    smartValues: SmartValues
    locale: Locale
    beverageType?: string | null
    candidateCode?: string | null
    templateName?: string | null
    visibleAttributes?: Array<{ label: string; value: string }>
}

/**
 * Builds the structured payload for AI tasting comment generation.
 * Shared across web and mobile to guarantee identical model prompt construction.
 */
export function buildTastingPayload(options: BuildTastingPayloadOptions): TastingPayload {
    const {
        categories,
        values,
        smartValues,
        locale,
        beverageType,
        candidateCode,
        templateName,
        visibleAttributes,
    } = options

    const categoryScores: TastingCategoryScore[] = categories.map((cat) => {
        let catScore = 0
        let catMax = 0
        const propScores: TastingPropertyScore[] = []

        cat.properties.forEach((prop) => {
            if (prop.__typename === "SmartProperty") {
                const smartVal = smartValues[prop.code]
                if (typeof smartVal === "number" && !isNaN(smartVal)) {
                    propScores.push({ name: prop.name, score: smartVal, maxScore: 100 })
                }
                return
            }

            let maxVal = 0
            if (prop.__typename === "IntProperty" && prop.intMaxLimit != null) {
                maxVal = prop.intMaxLimit
            } else if (prop.__typename === "DoubleProperty" && prop.doubleMaxLimit != null) {
                maxVal = prop.doubleMaxLimit
            } else if (
                prop.__typename === "DiscreteNumbersProperty" &&
                prop.discreteAllowedValues?.length
            ) {
                maxVal = Math.max(...prop.discreteAllowedValues)
            }

            const rawVal = values[prop.code]
            const numVal = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal))
            if (!isNaN(numVal)) {
                catScore += numVal
                catMax += maxVal
                propScores.push({
                    name: prop.name,
                    score: numVal,
                    maxScore: maxVal || numVal,
                })
            }
        })

        return {
            name: cat.name,
            score: catScore,
            maxScore: catMax,
            properties: propScores,
        }
    })

    let totalScore: number | null = null
    categories.forEach((cat) => {
        cat.properties.forEach((p) => {
            if (p.isResult) {
                const val = smartValues[p.code] ?? values[p.code]
                if (val != null && !isNaN(Number(val))) {
                    totalScore = Number(val)
                }
            }
        })
    })

    const attributesMap: Record<string, string> = {}
    if (visibleAttributes && visibleAttributes.length > 0) {
        visibleAttributes.forEach((attr) => {
            attributesMap[attr.label] = attr.value
        })
    }

    return {
        locale: locale || "en",
        beverageType: beverageType || "Wine",
        candidateCode: candidateCode || undefined,
        templateName: templateName || undefined,
        totalScore,
        maxTotalScore: 100,
        categories: categoryScores,
        attributes: attributesMap,
    }
}
