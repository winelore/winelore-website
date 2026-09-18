/**
 * The template editor's rules, shared by the web's dialog and the app's sheet.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    blankProperty,
    changeProperty,
    checkTemplate,
    duplicatePropertyCodes,
    editorCategoriesFrom,
    formulaToString,
    moveItem,
    parseFormula,
    propertyCodeFromName,
    renameFormulaVariable,
    type EditorCategory,
    type EditorProperty,
} from "../src/commission"

const t = (key: string, params?: Record<string, string | number>) => `${key}${params ? JSON.stringify(params) : ""}`

const property = (over: Partial<EditorProperty>): EditorProperty => ({ ...blankProperty(), ...over })

test("a code from a name, Ukrainian transliterated", () => {
    assert.equal(propertyCodeFromName("Колір вина"), "kolir_vyna")
    assert.equal(propertyCodeFromName("  Total  Score!! "), "total_score")
})

test("changing a property: a name renames the code, a type clears what belonged to the old one", () => {
    const base = property({ name: "Colour", code: "colour", type: "Int", minLimit: 0, maxLimit: 10, defaultValue: "5" })
    assert.equal(changeProperty(base, { name: "Clarity" }).code, "clarity")
    const smart = changeProperty({ ...base, isRequired: false }, { type: "Smart" })
    assert.deepEqual([smart.minLimit, smart.maxLimit, smart.defaultValue, smart.isRequired], [undefined, undefined, "", true])
    assert.equal(changeProperty(base, { type: "Double" }).minLimit, 0)
})

test("formulas parse with precedence and brackets, and print back", () => {
    const tree = parseFormula("a + b * 0.5")
    assert.deepEqual(tree, {
        type: "ADD",
        left: { type: "VARIABLE", variableCode: "a" },
        right: { type: "MULTIPLY", left: { type: "VARIABLE", variableCode: "b" }, right: { type: "CONSTANT", constantValue: "0.5" } },
    })
    assert.equal(formulaToString(parseFormula("(a+b)/2")), "((a + b) / 2)")
    // The stored tree reads back too.
    assert.equal(formulaToString({ __typename: "BinaryExpression", type: "SUBTRACT", left: { type: "VARIABLE", code: "x" }, right: { type: "CONSTANT", value: 1 } }), "(x - 1)")
    assert.throws(() => parseFormula("a + $"), /Invalid character/)
    assert.throws(() => parseFormula("(a + b"), /closing parenthesis/)
    // Spaces are dropped first, as on the web, so "a b" is the code "ab"; a stray bracket trails.
    assert.throws(() => parseFormula("a + b)"), /trailing/)
})

test("a renamed code follows into the formulas that use it", () => {
    const categories: EditorCategory[] = [{ id: "c", name: "C", properties: [property({ code: "aroma" }), property({ type: "Smart", expressionStr: "aroma + aromatic" })] }]
    assert.equal(renameFormulaVariable(categories, "aroma", "nose")[0].properties[1].expressionStr, "nose + aromatic")
    assert.deepEqual(duplicatePropertyCodes([{ id: "c", name: "C", properties: [property({ code: "a" }), property({ code: "a" }), property({ code: "b" })] }]), new Set(["a"]))
    assert.deepEqual(moveItem([1, 2, 3], 2, 0), [3, 1, 2])
    assert.deepEqual(moveItem([1, 2, 3], 0, 5), [1, 2, 3])
})

test("the checks before saving, in order, marking what is at fault", () => {
    const ok: EditorCategory[] = [
        {
            id: "c1",
            name: "Look",
            properties: [
                property({ id: "p1", name: "Colour", code: "colour", type: "Int", minLimit: 0, maxLimit: 10 }),
                property({ id: "p2", name: "Style", code: "style", type: "Enum", allowedValuesStr: "dry, sweet" }),
                property({ id: "p3", name: "Total", code: "total", type: "Smart", expressionStr: "colour * 2", isResult: true }),
            ],
        },
    ]
    const passed = checkTemplate("Classic", ok, t)
    assert.equal(passed.ok, true)
    if (passed.ok) {
        const [colour, style, total] = passed.categories[0].properties
        assert.deepEqual([colour.minLimit, colour.maxLimit], [0, 10])
        assert.deepEqual(style.allowedValues, ["DRY", "SWEET"])
        assert.deepEqual(total.expression, { type: "MULTIPLY", left: { type: "VARIABLE", variableCode: "colour" }, right: { type: "CONSTANT", constantValue: "2" } })
    }

    const failing = (categories: EditorCategory[], name = "Classic") => {
        const result = checkTemplate(name, categories, t)
        assert.equal(result.ok, false)
        return result as Extract<typeof result, { ok: false }>
    }
    assert.equal(failing(ok, " ").message, "templateCreator.nameRequiredError")
    assert.deepEqual([...failing([{ ...ok[0], name: "" }]).categoryIds], ["c1"])
    const inverted = failing([{ ...ok[0], properties: [{ ...ok[0].properties[0], minLimit: 10, maxLimit: 1 }, ...ok[0].properties.slice(1)] }])
    assert.deepEqual([inverted.message.split("{")[0], [...inverted.propertyIds]], ["templateCreator.minMaxInvalidError", ["p1"]])
    // A formula may only use codes declared before it.
    const early = failing([{ ...ok[0], properties: [ok[0].properties[2], ...ok[0].properties.slice(0, 2)] }])
    assert.match(early.message, /templateCreator\.formulaError.*formulaUnknownVarError/)
    const clash = failing([{ ...ok[0], properties: [...ok[0].properties, property({ id: "p4", name: "Colour 2", code: "colour", type: "Boolean" })] }])
    assert.deepEqual([...clash.propertyIds].sort(), ["p1", "p4"])
    assert.equal(failing([{ ...ok[0], properties: ok[0].properties.map((item) => ({ ...item, isResult: false })) }]).message, "templateCreator.resultRequiredError")
})

test("a saved edition loads into the editor with its formulas", () => {
    const [category] = editorCategoriesFrom([
        {
            id: "c",
            name: "Look",
            properties: [
                { __typename: "IntProperty", id: "p", code: "colour", name: "Colour", isRequired: true, isResult: false, intMinLimit: 0, intMaxLimit: 10, intDefaultValue: 5 },
                { __typename: "DiscreteNumbersProperty", id: "d", code: "score", name: "Score", discreteAllowedValues: [1, 2, 3] },
                { __typename: "SmartProperty", id: "s", code: "total", name: "Total", isResult: true, expression: { type: "ADD", left: { type: "VARIABLE", code: "colour" }, right: { type: "CONSTANT", value: 1 } } },
            ],
        },
    ])
    assert.deepEqual(
        category.properties.map((item) => [item.type, item.minLimit, item.maxLimit, item.defaultValue, item.allowedValuesStr, item.expressionStr]),
        [
            ["Int", 0, 10, "5", "", ""],
            ["Discrete", undefined, undefined, "", "1, 2, 3", ""],
            ["Smart", undefined, undefined, "", "", "(colour + 1)"],
        ],
    )
})
