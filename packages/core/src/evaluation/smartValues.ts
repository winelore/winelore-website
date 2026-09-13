import { evaluateAST } from "../evaluationExpression"
import { allProperties } from "./properties"
import type { EvaluationCategory, EvaluationValues, SmartValues } from "./types"

/**
 * Resolve every SmartProperty formula against the judge's current values.
 *
 * Formulas may reference other SmartProperties, so this runs in passes, feeding
 * each pass's results back into the lookup, and stops as soon as a pass produces
 * nothing new. The pass cap also breaks circular references, which would
 * otherwise never settle.
 *
 * A formula that cannot be resolved yet — because an input is unanswered — is
 * simply absent from the result rather than present as null or NaN.
 */
export function computeSmartValues(
    categories: EvaluationCategory[],
    values: EvaluationValues,
): SmartValues {
    const smartProperties = allProperties(categories).filter(
        (property) => property.__typename === "SmartProperty" && property.expression,
    )

    const resolved: SmartValues = {}

    for (let pass = 0; pass <= smartProperties.length; pass++) {
        let changed = false
        for (const property of smartProperties) {
            if (resolved[property.code] !== undefined) continue
            const result = evaluateAST(property.expression, { ...values, ...resolved })
            if (result !== null) {
                resolved[property.code] = result
                changed = true
            }
        }
        if (!changed) break
    }

    return resolved
}
