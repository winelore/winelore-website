import type { EvaluationCategory } from "@winelore/core/evaluation"

/**
 * A realistic tasting sheet for the preview route.
 *
 * Sample data, not a real competition template — it exists so the scorecard can
 * be run and felt on a device without AXUS ID credentials or a live commission.
 * It deliberately covers every property type and includes a nested formula, so
 * the real evaluator in @winelore/core is genuinely exercised rather than
 * mocked.
 */

/** Formula AST nodes, in the shape the backend sends. */
const variable = (code: string) => ({ __typename: "VariableExpression", type: "VARIABLE", code })
const add = (left: unknown, right: unknown) => ({
    __typename: "BinaryExpression",
    type: "ADD",
    left,
    right,
})

/** visualTotal = clarity + colourIntensity */
const visualTotal = add(variable("clarity"), variable("colourIntensity"))

/** noseTotal = noseIntensity + noseQuality */
const noseTotal = add(variable("noseIntensity"), variable("noseQuality"))

/** palateTotal = attack + balance + length */
const palateTotal = add(add(variable("attack"), variable("balance")), variable("length"))

export const sampleCategories: EvaluationCategory[] = [
    {
        id: "visual",
        name: "Visual",
        properties: [
            {
                __typename: "IntProperty",
                id: "clarity",
                code: "clarity",
                name: "Clarity",
                description: "Brilliance and absence of haze",
                isRequired: true,
                intMinLimit: 0,
                intMaxLimit: 5,
            },
            {
                __typename: "DiscreteNumbersProperty",
                id: "colourIntensity",
                code: "colourIntensity",
                name: "Colour intensity",
                isRequired: true,
                discreteAllowedValues: [1, 2, 3, 4, 5],
            },
            {
                __typename: "SmartProperty",
                id: "visualTotal",
                code: "visualTotal",
                name: "Visual subtotal",
                isRequired: false,
                expression: visualTotal,
            },
        ],
    },
    {
        id: "nose",
        name: "Nose",
        properties: [
            {
                __typename: "IntProperty",
                id: "noseIntensity",
                code: "noseIntensity",
                name: "Intensity",
                isRequired: true,
                intMinLimit: 0,
                intMaxLimit: 8,
            },
            {
                __typename: "IntProperty",
                id: "noseQuality",
                code: "noseQuality",
                name: "Quality",
                isRequired: true,
                intMinLimit: 0,
                intMaxLimit: 8,
            },
            {
                __typename: "BooleanProperty",
                id: "faulty",
                code: "faulty",
                name: "Fault detected",
                description: "Cork taint, oxidation, volatile acidity",
                isRequired: false,
                boolDefaultValue: false,
            },
            {
                __typename: "SmartProperty",
                id: "noseTotal",
                code: "noseTotal",
                name: "Nose subtotal",
                isRequired: false,
                expression: noseTotal,
            },
        ],
    },
    {
        id: "palate",
        name: "Palate",
        properties: [
            {
                __typename: "DoubleProperty",
                id: "attack",
                code: "attack",
                name: "Attack",
                isRequired: true,
                doubleMinLimit: 0,
                doubleMaxLimit: 6,
            },
            {
                __typename: "DoubleProperty",
                id: "balance",
                code: "balance",
                name: "Balance",
                isRequired: true,
                doubleMinLimit: 0,
                doubleMaxLimit: 8,
            },
            {
                __typename: "DoubleProperty",
                id: "length",
                code: "length",
                name: "Length",
                isRequired: true,
                doubleMinLimit: 0,
                doubleMaxLimit: 8,
            },
            {
                __typename: "EnumProperty",
                id: "harmony",
                code: "harmony",
                name: "Harmony",
                isRequired: true,
                enumAllowedValues: ["POOR", "FAIR", "GOOD", "EXCELLENT"],
            },
            {
                __typename: "SmartProperty",
                id: "palateTotal",
                code: "palateTotal",
                name: "Palate subtotal",
                isRequired: false,
                expression: palateTotal,
            },
        ],
    },
    {
        id: "overall",
        name: "Overall",
        properties: [
            {
                // Depends on three other formulas, so it only resolves once they
                // do — the multi-pass behaviour in computeSmartValues.
                __typename: "SmartProperty",
                id: "total",
                code: "total",
                name: "Total score",
                isRequired: false,
                isResult: true,
                expression: add(add(variable("visualTotal"), variable("noseTotal")), variable("palateTotal")),
            },
        ],
    },
]

export const sampleAttributes = [
    { label: "vintage", value: "2019" },
    { label: "region", value: "Zakarpattia" },
    { label: "abv", value: "13.5%" },
]
