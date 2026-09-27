/** Shape of an evaluation template as the backend returns it. */

export type EvaluationPropertyTypename =
    | "BooleanProperty"
    | "IntProperty"
    | "DoubleProperty"
    | "EnumProperty"
    | "DiscreteNumbersProperty"
    | "SmartProperty"

export interface EvaluationProperty {
    __typename: EvaluationPropertyTypename
    id: string
    code: string
    name: string
    description?: string | null
    isRequired: boolean
    /** Marks the property that carries the candidate's final score. */
    isResult?: boolean | null
    boolDefaultValue?: boolean | null
    intMinLimit?: number | null
    intMaxLimit?: number | null
    intDefaultValue?: number | null
    doubleMinLimit?: number | null
    doubleMaxLimit?: number | null
    doubleDefaultValue?: number | null
    enumAllowedValues?: string[] | null
    enumDefaultValue?: string | null
    discreteAllowedValues?: number[] | null
    discreteDefaultValue?: number | null
    /** Formula AST for SmartProperty; see `evaluateAST`. */
    expression?: any | null
}

export interface EvaluationCategory {
    id: string
    name: string
    properties: EvaluationProperty[]
}

/** Judge-entered values, keyed by property code. */
export type EvaluationValues = Record<string, unknown>

/** Computed SmartProperty values, keyed by property code. */
export type SmartValues = Record<string, number>

/** One score as the submit mutation expects it. */
export interface EvaluationScoreInput {
    code: string
    value: string
}
