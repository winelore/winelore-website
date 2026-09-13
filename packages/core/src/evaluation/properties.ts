import type {
    EvaluationCategory,
    EvaluationProperty,
    EvaluationValues,
} from "./types"

/** Every property across all categories, in order. */
export function allProperties(categories: EvaluationCategory[]): EvaluationProperty[] {
    return categories.flatMap((category) => category.properties)
}

/** Property lookup by code, for resolving formula variables. */
export function buildPropertyByCode(
    categories: EvaluationCategory[],
): Map<string, EvaluationProperty> {
    const map = new Map<string, EvaluationProperty>()
    for (const property of allProperties(categories)) map.set(property.code, property)
    return map
}

/** Codes of every SmartProperty — these are computed, never submitted. */
export function getSmartPropertyCodes(categories: EvaluationCategory[]): Set<string> {
    return new Set(
        allProperties(categories)
            .filter((property) => property.__typename === "SmartProperty")
            .map((property) => property.code),
    )
}

/** Operators whose result is a boolean rather than a number. */
const BOOLEAN_OPERATORS = new Set([
    "GREATER_THAN",
    "GREATER_THAN_OR_EQUAL",
    "GREATER_OR_EQUAL",
    "LESS_THAN",
    "LESS_THAN_OR_EQUAL",
    "LESS_OR_EQUAL",
    "EQUAL",
    "EQUALS",
    "NOT_EQUAL",
    "AND",
    "OR",
])

/**
 * Whether a SmartProperty evaluates to a boolean, so the UI renders it as
 * yes/no rather than a number.
 *
 * A formula that is just a variable reference takes the type of whatever it
 * points at.
 */
export function isBooleanSmartProperty(
    property: EvaluationProperty,
    propertyByCode: Map<string, EvaluationProperty>,
): boolean {
    const expression = property.expression
    if (!expression) return false
    if (BOOLEAN_OPERATORS.has(expression.type)) return true

    const isVariable =
        expression.__typename === "VariableExpression" || expression.type === "VARIABLE"
    if (isVariable && expression.code) {
        return propertyByCode.get(expression.code)?.__typename === "BooleanProperty"
    }
    return false
}

/**
 * The form's starting values, taken from each property's declared default.
 *
 * Properties without a default are left absent rather than set to null, so
 * "not yet answered" stays distinguishable from "answered with nothing".
 */
export function buildInitialValues(categories: EvaluationCategory[]): EvaluationValues {
    const initial: EvaluationValues = {}
    for (const property of allProperties(categories)) {
        const fallback = defaultValueFor(property)
        if (fallback !== undefined) initial[property.code] = fallback
    }
    return initial
}

function defaultValueFor(property: EvaluationProperty): unknown {
    switch (property.__typename) {
        case "BooleanProperty":
            return property.boolDefaultValue ?? undefined
        case "IntProperty":
            return property.intDefaultValue ?? undefined
        case "DoubleProperty":
            return property.doubleDefaultValue ?? undefined
        case "EnumProperty":
            return property.enumDefaultValue ?? undefined
        case "DiscreteNumbersProperty":
            return property.discreteDefaultValue ?? undefined
        default:
            return undefined
    }
}

/** Properties a judge actually rates — everything except computed ones. */
export function getRatableProperties(categories: EvaluationCategory[]): EvaluationProperty[] {
    return allProperties(categories).filter(
        (property) => property.__typename !== "SmartProperty",
    )
}

/** Whether a value counts as answered. `false` and `0` do; empty string does not. */
export function hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && value !== ""
}

/** How many ratable properties have been answered — drives the progress readout. */
export function countRatedProperties(
    categories: EvaluationCategory[],
    values: EvaluationValues,
): number {
    return getRatableProperties(categories).filter((property) => hasValue(values[property.code]))
        .length
}

/** Result properties sort last within their category. */
export function orderPropertiesForDisplay(
    category: EvaluationCategory,
): EvaluationProperty[] {
    return [
        ...category.properties.filter((property) => property.isResult !== true),
        ...category.properties.filter((property) => property.isResult === true),
    ]
}
