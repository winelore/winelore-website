/**
 * The evaluation scorecard decides what a judge may submit and what each score
 * is worth. A divergence between platforms here is a credibility incident, so
 * the rules are pinned rather than left to whichever UI calls them.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    buildInitialValues,
    buildPropertyByCode,
    buildScoresPayload,
    computeSmartValues,
    countRatedProperties,
    getSmartPropertyCodes,
    isAlreadySubmittedError,
    isBooleanSmartProperty,
    isEvaluationSubmittable,
    isScoringComplete,
    orderPropertiesForDisplay,
    parseAttributes,
    selectVisibleAttributes,
    type EvaluationCategory,
    type EvaluationProperty,
} from "../src/evaluation"

const prop = (over: Partial<EvaluationProperty> & Pick<EvaluationProperty, "__typename" | "code">) =>
    ({ id: over.code, name: over.code, isRequired: false, ...over }) as EvaluationProperty

const category = (id: string, properties: EvaluationProperty[]): EvaluationCategory =>
    ({ id, name: id, properties })

// A variable reference in the formula AST the backend sends.
const variable = (code: string) => ({ __typename: "VariableExpression", type: "VARIABLE", code })
const binary = (type: string, left: unknown, right: unknown) =>
    ({ __typename: "BinaryExpression", type, left, right })

test("buildInitialValues takes declared defaults and omits properties without one", () => {
    const categories = [
        category("aroma", [
            prop({ __typename: "IntProperty", code: "clarity", intDefaultValue: 3 }),
            prop({ __typename: "DoubleProperty", code: "intensity", doubleDefaultValue: 2.5 }),
            prop({ __typename: "BooleanProperty", code: "faulty", boolDefaultValue: false }),
            prop({ __typename: "EnumProperty", code: "colour", enumDefaultValue: "RUBY" }),
            prop({ __typename: "DiscreteNumbersProperty", code: "balance", discreteDefaultValue: 4 }),
            prop({ __typename: "IntProperty", code: "finish" }), // no default
        ]),
    ]

    const initial = buildInitialValues(categories)

    assert.deepEqual(initial, {
        clarity: 3,
        intensity: 2.5,
        faulty: false,
        colour: "RUBY",
        balance: 4,
    })
    // "Unanswered" must stay distinguishable from "answered with nothing".
    assert.equal("finish" in initial, false)
})

test("buildInitialValues keeps a false default rather than dropping it", () => {
    const categories = [category("c", [
        prop({ __typename: "BooleanProperty", code: "faulty", boolDefaultValue: false }),
    ])]
    assert.equal(buildInitialValues(categories).faulty, false)
})

test("computeSmartValues resolves formulas that depend on other formulas", () => {
    const categories = [
        category("scores", [
            prop({ __typename: "IntProperty", code: "a" }),
            prop({ __typename: "IntProperty", code: "b" }),
            // total depends on subtotal, which is declared after it.
            prop({ __typename: "SmartProperty", code: "total", expression: binary("ADD", variable("subtotal"), variable("b")) }),
            prop({ __typename: "SmartProperty", code: "subtotal", expression: variable("a") }),
        ]),
    ]

    const smart = computeSmartValues(categories, { a: 4, b: 6 })

    assert.equal(smart.subtotal, 4)
    assert.equal(smart.total, 10, "a formula must see another formula's result")
})

test("computeSmartValues omits formulas whose inputs are unanswered", () => {
    const categories = [category("scores", [
        prop({ __typename: "IntProperty", code: "a" }),
        prop({ __typename: "SmartProperty", code: "total", expression: binary("ADD", variable("a"), variable("missing")) }),
    ])]

    const smart = computeSmartValues(categories, { a: 4 })
    assert.equal("total" in smart, false, "absent, not null or NaN")
})

test("computeSmartValues terminates on a circular formula", () => {
    const categories = [category("scores", [
        prop({ __typename: "SmartProperty", code: "x", expression: variable("y") }),
        prop({ __typename: "SmartProperty", code: "y", expression: variable("x") }),
    ])]
    assert.doesNotThrow(() => computeSmartValues(categories, {}))
})

test("isBooleanSmartProperty follows a variable reference to its target type", () => {
    const categories = [category("c", [
        prop({ __typename: "BooleanProperty", code: "faulty" }),
        prop({ __typename: "IntProperty", code: "clarity" }),
    ])]
    const byCode = buildPropertyByCode(categories)

    const pointsAtBool = prop({ __typename: "SmartProperty", code: "s1", expression: variable("faulty") })
    const pointsAtInt = prop({ __typename: "SmartProperty", code: "s2", expression: variable("clarity") })
    const comparison = prop({ __typename: "SmartProperty", code: "s3", expression: binary("GREATER_THAN", variable("clarity"), 3) })
    const sum = prop({ __typename: "SmartProperty", code: "s4", expression: binary("ADD", variable("clarity"), 1) })

    assert.equal(isBooleanSmartProperty(pointsAtBool, byCode), true)
    assert.equal(isBooleanSmartProperty(pointsAtInt, byCode), false)
    assert.equal(isBooleanSmartProperty(comparison, byCode), true)
    assert.equal(isBooleanSmartProperty(sum, byCode), false)
})

test("isEvaluationSubmittable requires every required property", () => {
    const categories = [category("c", [
        prop({ __typename: "IntProperty", code: "clarity", isRequired: true }),
        prop({ __typename: "IntProperty", code: "finish" }),
    ])]

    assert.equal(isEvaluationSubmittable(categories, {}, false), false)
    assert.equal(isEvaluationSubmittable(categories, { clarity: 3 }, false), true)
})

test("isEvaluationSubmittable enforces declared limits", () => {
    const categories = [category("c", [
        prop({ __typename: "IntProperty", code: "clarity", intMinLimit: 1, intMaxLimit: 5 }),
        prop({ __typename: "DoubleProperty", code: "intensity", doubleMinLimit: 0, doubleMaxLimit: 10 }),
    ])]

    assert.equal(isEvaluationSubmittable(categories, { clarity: 3 }, false), true)
    assert.equal(isEvaluationSubmittable(categories, { clarity: 6 }, false), false, "above max")
    assert.equal(isEvaluationSubmittable(categories, { clarity: 0 }, false), false, "below min")
    assert.equal(isEvaluationSubmittable(categories, { intensity: 10.5 }, false), false)
})

test("isEvaluationSubmittable blocks while a numeric field is unparseable", () => {
    const categories = [category("c", [prop({ __typename: "IntProperty", code: "clarity" })])]
    assert.equal(isEvaluationSubmittable(categories, { clarity: 3 }, true), false)
})

test("isEvaluationSubmittable ignores SmartProperties even when required", () => {
    const categories = [category("c", [
        prop({ __typename: "SmartProperty", code: "total", isRequired: true, expression: variable("a") }),
    ])]
    assert.equal(isEvaluationSubmittable(categories, {}, false), true)
})

test("isScoringComplete is stricter than submittable for optional numerics", () => {
    const categories = [category("c", [
        prop({ __typename: "IntProperty", code: "clarity", isRequired: true }),
        prop({ __typename: "IntProperty", code: "finish" }), // optional, still needed to score
    ])]
    const values = { clarity: 3 }

    assert.equal(isEvaluationSubmittable(categories, values, false), true)
    assert.equal(isScoringComplete(categories, values, false), false, "AI draft needs a full scorecard")
    assert.equal(isScoringComplete(categories, { clarity: 3, finish: 2 }, false), true)
})

test("isScoringComplete falls back to submittability with no numeric properties", () => {
    const categories = [category("c", [
        prop({ __typename: "EnumProperty", code: "colour", isRequired: true }),
    ])]
    assert.equal(isScoringComplete(categories, {}, false), false)
    assert.equal(isScoringComplete(categories, { colour: "RUBY" }, false), true)
})

test("buildScoresPayload excludes computed properties", () => {
    const categories = [category("c", [
        prop({ __typename: "IntProperty", code: "clarity" }),
        prop({ __typename: "SmartProperty", code: "total", expression: variable("clarity") }),
    ])]

    const payload = buildScoresPayload(
        { clarity: 4, total: 4 },
        buildPropertyByCode(categories),
        getSmartPropertyCodes(categories),
    )

    assert.deepEqual(payload, [{ code: "clarity", value: "4" }])
})

test("buildScoresPayload fixes doubles to two decimals", () => {
    const categories = [category("c", [
        prop({ __typename: "DoubleProperty", code: "intensity" }),
        prop({ __typename: "IntProperty", code: "clarity" }),
    ])]
    const byCode = buildPropertyByCode(categories)
    const smart = getSmartPropertyCodes(categories)

    assert.deepEqual(
        buildScoresPayload({ intensity: 7.456 }, byCode, smart),
        [{ code: "intensity", value: "7.46" }],
    )
    // Integers must not gain decimals.
    assert.deepEqual(
        buildScoresPayload({ clarity: 4 }, byCode, smart),
        [{ code: "clarity", value: "4" }],
    )
})

test("buildScoresPayload keeps false but drops null and undefined", () => {
    const categories = [category("c", [
        prop({ __typename: "BooleanProperty", code: "faulty" }),
        prop({ __typename: "IntProperty", code: "clarity" }),
        prop({ __typename: "IntProperty", code: "finish" }),
    ])]

    const payload = buildScoresPayload(
        { faulty: false, clarity: null, finish: undefined },
        buildPropertyByCode(categories),
        getSmartPropertyCodes(categories),
    )

    assert.deepEqual(payload, [{ code: "faulty", value: "false" }])
})

test("countRatedProperties counts answered non-computed properties", () => {
    const categories = [category("c", [
        prop({ __typename: "IntProperty", code: "clarity" }),
        prop({ __typename: "BooleanProperty", code: "faulty" }),
        prop({ __typename: "IntProperty", code: "finish" }),
        prop({ __typename: "SmartProperty", code: "total", expression: variable("clarity") }),
    ])]

    // `false` and `0` are answers; "" is not.
    assert.equal(countRatedProperties(categories, { clarity: 0, faulty: false, finish: "" }), 2)
})

test("orderPropertiesForDisplay sorts result properties last", () => {
    const c = category("c", [
        prop({ __typename: "SmartProperty", code: "total", isResult: true }),
        prop({ __typename: "IntProperty", code: "clarity" }),
        prop({ __typename: "IntProperty", code: "finish" }),
    ])
    assert.deepEqual(orderPropertiesForDisplay(c).map((p) => p.code), ["clarity", "finish", "total"])
})

test("parseAttributes handles JSON, Kotlin maps and objects", () => {
    assert.deepEqual(parseAttributes('{"vintage":"2019","abv":13.5}'), { vintage: "2019", abv: "13.5" })
    assert.deepEqual(parseAttributes("{vintage=2019, region=Zakarpattia}"), { vintage: "2019", region: "Zakarpattia" })
    assert.deepEqual(parseAttributes({ vintage: 2019, missing: null }), { vintage: "2019" })
})

test("parseAttributes returns empty rather than throwing on junk", () => {
    for (const junk of ["", "   ", "not json", "{", undefined, null, 42]) {
        assert.doesNotThrow(() => parseAttributes(junk))
        assert.deepEqual(parseAttributes(junk), {})
    }
})

test("parseAttributes keeps values containing '=' intact", () => {
    assert.deepEqual(parseAttributes("{note=pH=3.4}"), { note: "pH=3.4" })
})

test("selectVisibleAttributes matches keys case-insensitively and drops empties", () => {
    const raw = '{"Vintage":"2019","Region":"","ABV":"13.5"}'

    assert.deepEqual(selectVisibleAttributes(raw, ["vintage", "abv"]), [
        { label: "vintage", value: "2019" },
        { label: "abv", value: "13.5" },
    ])
    assert.deepEqual(selectVisibleAttributes(raw, ["region"]), [], "empty values are not shown")
    assert.deepEqual(selectVisibleAttributes(raw, []), [])
    assert.deepEqual(selectVisibleAttributes(null, ["vintage"]), [])
})

test("isAlreadySubmittedError recognises a recorded evaluation", () => {
    assert.equal(isAlreadySubmittedError("Evaluation already submitted"), true)
    assert.equal(isAlreadySubmittedError("EVALUATION_ALREADY_EXISTS"), true)
    assert.equal(isAlreadySubmittedError("REPLICA_NOT_STARTED"), true)
    assert.equal(isAlreadySubmittedError("Network request failed"), false)
    assert.equal(isAlreadySubmittedError(null), false)
})
