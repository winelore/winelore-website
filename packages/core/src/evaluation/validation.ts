import { allProperties, hasValue } from "./properties"
import type { EvaluationCategory, EvaluationProperty, EvaluationValues } from "./types"

/** Whether a numeric value sits inside the property's declared limits. */
export function isWithinLimits(property: EvaluationProperty, value: unknown): boolean {
    if (typeof value !== "number") return true

    if (property.__typename === "IntProperty") {
        if (property.intMinLimit != null && value < property.intMinLimit) return false
        if (property.intMaxLimit != null && value > property.intMaxLimit) return false
    }
    if (property.__typename === "DoubleProperty") {
        if (property.doubleMinLimit != null && value < property.doubleMinLimit) return false
        if (property.doubleMaxLimit != null && value > property.doubleMaxLimit) return false
    }
    return true
}

function isNumericProperty(property: EvaluationProperty): boolean {
    return (
        property.__typename === "IntProperty" ||
        property.__typename === "DoubleProperty" ||
        property.__typename === "DiscreteNumbersProperty"
    )
}

/**
 * Whether the form may be submitted: every required property answered, every
 * numeric value within limits, and no unparseable numeric input outstanding.
 *
 * SmartProperties are skipped — they are computed, not entered.
 */
export function isEvaluationSubmittable(
    categories: EvaluationCategory[],
    values: EvaluationValues,
    hasNumericError: boolean,
): boolean {
    if (hasNumericError) return false

    for (const property of allProperties(categories)) {
        if (property.__typename === "SmartProperty") continue

        const value = values[property.code]
        if (property.isRequired && !hasValue(value)) return false
        if (hasValue(value) && !isWithinLimits(property, value)) return false
    }
    return true
}

/**
 * Whether every numeric property has a usable score.
 *
 * Stricter than submittability: it requires numeric answers even where the
 * template does not mark them required, which is what gates the AI tasting
 * draft — a partial scorecard produces a misleading summary.
 *
 * With no numeric properties at all, this falls back to submittability.
 */
export function isScoringComplete(
    categories: EvaluationCategory[],
    values: EvaluationValues,
    hasNumericError: boolean,
): boolean {
    if (hasNumericError) return false

    let numericCount = 0

    for (const property of allProperties(categories)) {
        if (property.__typename === "SmartProperty") continue

        const value = values[property.code]

        if (isNumericProperty(property)) {
            numericCount++
            if (typeof value !== "number" || Number.isNaN(value)) return false
            if (!isWithinLimits(property, value)) return false
        } else if (property.isRequired && !hasValue(value)) {
            return false
        }
    }

    return numericCount > 0
        ? true
        : isEvaluationSubmittable(categories, values, hasNumericError)
}
