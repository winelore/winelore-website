import { print } from "graphql"
import { EXPRESSION_FRAGMENT, EXPRESSION_SELECTION } from "../commissionTemplatesQuery"
import {
    ActivateEvaluationTemplateEditionDocument,
    ChangeEvaluationTemplateNameDocument,
    CreateEvaluationTemplateDocument,
    CreateEvaluationTemplateEditionDocument,
} from "../gql/graphql"
import { loadTemplateDetail } from "./templateDetail"

/**
 * The template editor — the web's dialog on My Templates and a template's
 * page, and the app's sheet: categories of properties, each with its type,
 * range, options or formula; the checks before saving; and saving, which
 * adds and activates the next edition.
 */

type Translate = (key: any, params?: Record<string, string | number>) => string

/** Sends one GraphQL document, failing on any error; each app has its own transport. */
export type TemplateSend = (query: string, variables: Record<string, unknown>, headers?: Record<string, string>) => Promise<any>

export type EditorPropertyType = "Boolean" | "Int" | "Double" | "Discrete" | "Enum" | "Smart"

export const EDITOR_PROPERTY_TYPES: EditorPropertyType[] = ["Int", "Double", "Discrete", "Enum", "Boolean", "Smart"]

export interface EditorProperty {
    id: string
    name: string
    code: string
    type: EditorPropertyType
    description: string
    isRequired: boolean
    isResult: boolean
    defaultValue: string
    minLimit?: number
    maxLimit?: number
    /** Discrete or enum options, comma-separated as typed. */
    allowedValuesStr: string
    /** A Smart property's formula, as typed. */
    expressionStr: string
}

export interface EditorCategory {
    id: string
    name: string
    properties: EditorProperty[]
}

const CYRILLIC: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye", ж: "zh", з: "z", и: "y", і: "i", ї: "yi", й: "y", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "", ю: "yu", я: "ya", ы: "y",
    э: "e", ё: "yo", ъ: "",
}

/** A property's code from its name: Ukrainian transliterated, then lowercase letters, digits and underscores. */
export function propertyCodeFromName(name: string): string {
    return name
        .toLowerCase()
        .split("")
        .map((char) => CYRILLIC[char] ?? char)
        .join("")
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
}

let counter = 0
/** An id for an item made in the editor; saved templates' own ids are kept. */
export function editorId(prefix: "cat" | "prop"): string {
    counter += 1
    return `${prefix}_${Date.now()}_${counter}`
}

export function blankProperty(): EditorProperty {
    return {
        id: editorId("prop"),
        name: "",
        code: "",
        type: "Int",
        description: "",
        isRequired: true,
        isResult: false,
        defaultValue: "",
        allowedValuesStr: "",
        expressionStr: "",
    }
}

export function blankCategory(withProperty = false): EditorCategory {
    return { id: editorId("cat"), name: "", properties: withProperty ? [blankProperty()] : [] }
}

/**
 * A change to a property, with the editor's rules: a new name renames the
 * code; a new type clears what belonged to the old one; a Smart property is
 * always required.
 */
export function changeProperty(property: EditorProperty, fields: Partial<EditorProperty>): EditorProperty {
    const updated = { ...property, ...fields }
    if (fields.name !== undefined) updated.code = propertyCodeFromName(fields.name)
    if (fields.type !== undefined) {
        updated.defaultValue = ""
        updated.allowedValuesStr = ""
        updated.expressionStr = ""
        if (fields.type !== "Int" && fields.type !== "Double") {
            updated.minLimit = undefined
            updated.maxLimit = undefined
        }
        if (fields.type === "Smart") updated.isRequired = true
    }
    return updated
}

/** A code renamed in every formula that uses it, so a rename does not break them. */
export function renameFormulaVariable(categories: EditorCategory[], oldCode: string, newCode: string): EditorCategory[] {
    if (!oldCode.trim() || !newCode.trim() || oldCode === newCode) return categories
    const pattern = new RegExp(`\\b${oldCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")
    return categories.map((category) => ({
        ...category,
        properties: category.properties.map((property) =>
            property.type === "Smart" && property.expressionStr ? { ...property, expressionStr: property.expressionStr.replace(pattern, newCode) } : property,
        ),
    }))
}

/** Codes used by more than one property. */
export function duplicatePropertyCodes(categories: EditorCategory[]): Set<string> {
    const seen = new Map<string, number>()
    for (const category of categories) {
        for (const property of category.properties) {
            const code = property.code.trim()
            if (code) seen.set(code, (seen.get(code) || 0) + 1)
        }
    }
    return new Set(Array.from(seen).filter(([, count]) => count > 1).map(([code]) => code))
}

/** An item moved from one place in a list to another. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
    const next = [...list]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
}

// --- Formulas ---------------------------------------------------------------

export type FormulaNode =
    | { type: "CONSTANT"; constantValue: string }
    | { type: "VARIABLE"; variableCode: string }
    | { type: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE"; left: FormulaNode; right: FormulaNode }

/**
 * A formula — numbers, property codes, + − × ÷ and brackets — as the tree
 * the backend stores. Throws on anything else.
 */
export function parseFormula(input: string): FormulaNode {
    const tokens: Array<{ type: string; value: string }> = []
    const text = input.replace(/\s+/g, "")
    let i = 0
    while (i < text.length) {
        const char = text[i]
        if (/[0-9.]/.test(char)) {
            let value = ""
            while (i < text.length && /[0-9.]/.test(text[i])) value += text[i++]
            tokens.push({ type: "NUMBER", value })
        } else if (/[a-zA-Z_]/.test(char)) {
            let value = ""
            while (i < text.length && /[a-zA-Z0-9_]/.test(text[i])) value += text[i++]
            tokens.push({ type: "IDENTIFIER", value })
        } else if ("+-*/()".includes(char)) {
            tokens.push({ type: char, value: char })
            i++
        } else {
            throw new Error(`Invalid character in expression: "${char}"`)
        }
    }

    let index = 0
    const peek = () => tokens[index] ?? null
    const next = () => tokens[index++]

    function expression(): FormulaNode {
        let left = term()
        while (peek() && (peek()!.type === "+" || peek()!.type === "-")) {
            const operator = next()
            left = { type: operator.type === "+" ? "ADD" : "SUBTRACT", left, right: term() }
        }
        return left
    }
    function term(): FormulaNode {
        let left = factor()
        while (peek() && (peek()!.type === "*" || peek()!.type === "/")) {
            const operator = next()
            left = { type: operator.type === "*" ? "MULTIPLY" : "DIVIDE", left, right: factor() }
        }
        return left
    }
    function factor(): FormulaNode {
        const token = next()
        if (!token) throw new Error("Unexpected end of expression")
        if (token.type === "NUMBER") return { type: "CONSTANT", constantValue: token.value }
        if (token.type === "IDENTIFIER") return { type: "VARIABLE", variableCode: token.value }
        if (token.type === "(") {
            const inner = expression()
            const closing = next()
            if (!closing || closing.type !== ")") throw new Error("Expected closing parenthesis ')'")
            return inner
        }
        throw new Error(`Unexpected token "${token.value}"`)
    }

    const tree = expression()
    if (index < tokens.length) {
        throw new Error(`Unexpected trailing characters: "${tokens.slice(index).map((token) => token.value).join("")}"`)
    }
    return tree
}

/** A stored expression tree back as the text the editor shows. */
export function formulaToString(node: any): string {
    if (!node) return ""
    const type = node.type || node.__typename
    if (type === "VariableExpression" || type === "VARIABLE") return node.code || node.variableCode || ""
    if (type === "ConstantExpression" || type === "CONSTANT") return String(node.value ?? node.constantValue ?? "")
    const left = formulaToString(node.left)
    const right = formulaToString(node.right)
    const operator = { ADD: "+", SUBTRACT: "-", MULTIPLY: "*", DIVIDE: "/" }[type as string] ?? "+"
    return left && right ? `(${left} ${operator} ${right})` : left || right || ""
}

function formulaVariables(node: FormulaNode | undefined, into: string[] = []): string[] {
    if (!node) return into
    if (node.type === "VARIABLE") into.push(node.variableCode)
    if ("left" in node) {
        formulaVariables(node.left, into)
        formulaVariables(node.right, into)
    }
    return into
}

// --- Checking and saving ---------------------------------------------------

export type TemplateEditorCheck =
    | { ok: true; categories: Array<{ name: string; properties: Record<string, unknown>[] }> }
    | { ok: false; message: string; propertyIds: Set<string>; categoryIds: Set<string> }

/**
 * The editor's checks, in the web's order, and the categories as the
 * backend takes them. Stops at the first problem, naming it and marking the
 * category or properties at fault. A formula may only use codes of
 * properties before it.
 */
export function checkTemplate(name: string, categories: EditorCategory[], t: Translate): TemplateEditorCheck {
    const fail = (message: string, propertyIds: string[] = [], categoryIds: string[] = []): TemplateEditorCheck => ({
        ok: false,
        message,
        propertyIds: new Set(propertyIds),
        categoryIds: new Set(categoryIds),
    })
    if (!name.trim()) return fail(t("templateCreator.nameRequiredError"))
    if (categories.length === 0) return fail(t("templateCreator.categoryCountError"))

    const codes = new Set<string>()
    const formatted: Array<{ name: string; properties: Record<string, unknown>[] }> = []
    for (const category of categories) {
        if (!category.name.trim()) return fail(t("templateCreator.categoryNameRequiredError"), [], [category.id])
        if (category.properties.length === 0) return fail(t("templateCreator.categoryNoPropertiesError", { name: category.name }), [], [category.id])

        const properties: Record<string, unknown>[] = []
        for (const property of category.properties) {
            if (!property.name.trim()) return fail(t("templateCreator.propertyNameRequiredError", { category: category.name }), [property.id])
            if (!property.code.trim()) return fail(t("templateCreator.propertyCodeRequiredError", { name: property.name }), [property.id])
            if (codes.has(property.code)) {
                const clashing = categories.flatMap((other) => other.properties).filter((other) => other.code === property.code).map((other) => other.id)
                return fail(t("templateCreator.duplicateCodeError", { code: property.code }), clashing)
            }
            codes.add(property.code)

            const input: Record<string, unknown> = {
                type: property.type,
                code: property.code,
                name: property.name,
                description: property.description || null,
                isRequired: property.type === "Smart" ? true : property.isRequired,
                isResult: property.isResult,
                defaultValue: property.defaultValue || null,
            }

            if (property.type === "Int" || property.type === "Double") {
                if (property.minLimit === undefined || property.maxLimit === undefined) {
                    return fail(t("templateCreator.limitsRequiredError", { name: property.name }), [property.id])
                }
                if (Number(property.minLimit) >= Number(property.maxLimit)) return fail(t("templateCreator.minMaxInvalidError", { name: property.name }), [property.id])
                input.minLimit = Number(property.minLimit)
                input.maxLimit = Number(property.maxLimit)
            }

            if (property.type === "Discrete") {
                if (!property.allowedValuesStr.trim()) return fail(t("templateCreator.discreteValuesRequiredError", { name: property.name }), [property.id])
                const values = property.allowedValuesStr
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .map(Number)
                if (values.some(Number.isNaN)) return fail(t("templateCreator.discreteValuesInvalidError", { name: property.name }), [property.id])
                input.allowedValues = values.map(String)
            }

            if (property.type === "Enum") {
                if (!property.allowedValuesStr.trim()) return fail(t("templateCreator.enumValuesRequiredError", { name: property.name }), [property.id])
                input.allowedValues = property.allowedValuesStr
                    .split(",")
                    .map((value) => value.trim().toUpperCase())
                    .filter(Boolean)
            }

            if (property.type === "Smart") {
                if (!property.expressionStr.trim()) return fail(t("templateCreator.formulaEmptyError", { name: property.name }), [property.id])
                try {
                    const tree = parseFormula(property.expressionStr)
                    const unknown = formulaVariables(tree).find((code) => !codes.has(code))
                    if (unknown) throw new Error(t("templateCreator.formulaUnknownVarError", { variable: unknown }))
                    input.expression = tree
                } catch (error) {
                    return fail(t("templateCreator.formulaError", { name: property.name, error: error instanceof Error ? error.message : String(error) }), [property.id])
                }
            }

            properties.push(input)
        }
        formatted.push({ name: category.name, properties })
    }

    if (!formatted.some((category) => category.properties.some((property) => property.isResult === true))) {
        return fail(t("templateCreator.resultRequiredError"))
    }
    return { ok: true, categories: formatted }
}

const PROPERTY_SELECTION = [
    "__typename id code name description isRequired isResult",
    "... on IntProperty { intMinLimit: minLimit intMaxLimit: maxLimit intDefaultValue: defaultValue }",
    "... on DoubleProperty { doubleMinLimit: minLimit doubleMaxLimit: maxLimit doubleDefaultValue: defaultValue }",
    "... on DiscreteNumbersProperty { discreteAllowedValues: allowedValues discreteDefaultValue: defaultValue }",
    "... on EnumProperty { enumAllowedValues: allowedValues enumDefaultValue: defaultValue }",
    "... on BooleanProperty { boolDefaultValue: defaultValue }",
    `... on SmartProperty { expression { ${EXPRESSION_SELECTION} } }`,
].join(" ")

/**
 * One edition with its formulas — which the template page's queries leave
 * out, and without which an edited Smart property would lose its formula.
 * Compact, sent as it is.
 */
export const GET_TEMPLATE_EDITION_FOR_EDITOR = [
    "query GetTemplateEditionForEditor($id: ID!) {",
    `evaluationTemplateEdition(id: $id) { id version categories { id name properties { ${PROPERTY_SELECTION} } } }`,
    "}",
    EXPRESSION_FRAGMENT,
].join(" ")

/** A saved edition's categories, as the editor holds them. */
export function editorCategoriesFrom(categories: any[] | null | undefined): EditorCategory[] {
    return (categories || []).map((category: any) => ({
        id: category.id || editorId("cat"),
        name: category.name,
        properties: (category.properties || []).map((property: any) => {
            const typeName = property.type ?? (property.__typename ? property.__typename.replace("Property", "") : "Boolean")
            const type = (typeName === "DiscreteNumbers" ? "Discrete" : typeName) as EditorPropertyType
            const minLimit = property.minLimit ?? property.intMinLimit ?? property.doubleMinLimit
            const maxLimit = property.maxLimit ?? property.intMaxLimit ?? property.doubleMaxLimit
            const allowed = property.allowedValues ?? property.discreteAllowedValues ?? property.enumAllowedValues
            const defaultValue =
                property.defaultValue ??
                property.intDefaultValue ??
                property.doubleDefaultValue ??
                property.discreteDefaultValue ??
                property.enumDefaultValue ??
                property.boolDefaultValue
            return {
                id: property.id || editorId("prop"),
                name: property.name,
                code: property.code,
                type,
                description: property.description || "",
                isRequired: property.isRequired ?? true,
                isResult: !!property.isResult,
                defaultValue: defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : "",
                minLimit: minLimit !== undefined && minLimit !== null ? Number(minLimit) : undefined,
                maxLimit: maxLimit !== undefined && maxLimit !== null ? Number(maxLimit) : undefined,
                allowedValuesStr: Array.isArray(allowed) ? allowed.join(", ") : "",
                expressionStr: property.expressionRaw || (property.expression ? formulaToString(property.expression) : ""),
            }
        }),
    }))
}

export interface TemplateForEditor {
    id: string
    name: string
    beverageTypeId: string
    beverageType: string
    owners: number[][]
    version: number
    categories: EditorCategory[]
}

/** A template to edit: its name and type, and its latest edition's categories with their formulas. */
export async function loadTemplateForEditor(send: TemplateSend, templateId: string): Promise<TemplateForEditor | null> {
    const detail = await loadTemplateDetail(send, templateId)
    if (!detail) return null
    const latest = detail.latestEdition
    let categories: any[] = latest?.categories ?? []
    if (latest?.id) {
        const full = await send(GET_TEMPLATE_EDITION_FOR_EDITOR, { id: latest.id }).catch(() => null)
        if (full?.evaluationTemplateEdition?.categories) categories = full.evaluationTemplateEdition.categories
    }
    return {
        id: detail.id,
        name: detail.name,
        beverageTypeId: detail.beverageTypeId,
        beverageType: detail.beverageType,
        owners: detail.owners,
        version: latest?.version ?? 1,
        categories: editorCategoriesFrom(categories),
    }
}

const actor = (auid: number) => ({ "X-ACTOR": String(auid) })

/** A new template owned by `auid`, its categories as edition 1, activated. */
export async function createEvaluationTemplate(
    send: TemplateSend,
    name: string,
    categories: Array<{ name: string; properties: Record<string, unknown>[] }>,
    auid: number,
    beverageTypeId: string,
): Promise<{ templateId: string; editionId: string }> {
    const headers = actor(auid)
    const template = await send(print(CreateEvaluationTemplateDocument), { input: { name, beverageTypeId, owners: [[auid]] } }, headers)
    const templateId: string | undefined = template?.createEvaluationTemplate?.id
    if (!templateId) throw new Error("The template was not created")
    const edition = await send(print(CreateEvaluationTemplateEditionDocument), { input: { templateId, version: 1, categories } }, headers)
    const editionId: string | undefined = edition?.createEvaluationTemplateEdition?.id
    if (!editionId) throw new Error("The template's edition was not created")
    await send(print(ActivateEvaluationTemplateEditionDocument), { id: editionId }, headers)
    return { templateId, editionId }
}

/**
 * A template's new name and categories: the name changed in place, the
 * categories as the edition after its latest, activated. Its beverage type
 * cannot change; there is no mutation for it.
 */
export async function saveEvaluationTemplate(
    send: TemplateSend,
    templateId: string,
    name: string,
    categories: Array<{ name: string; properties: Record<string, unknown>[] }>,
    auid: number,
): Promise<{ editionId: string; version: number }> {
    const headers = actor(auid)
    await send(print(ChangeEvaluationTemplateNameDocument), { id: templateId, newName: name }, headers)
    const current = await loadTemplateDetail(send, templateId)
    const version = (current?.latestEdition?.version || 1) + 1
    const edition = await send(print(CreateEvaluationTemplateEditionDocument), { input: { templateId, version, categories } }, headers)
    const editionId: string | undefined = edition?.createEvaluationTemplateEdition?.id
    if (!editionId) throw new Error("The template's edition was not created")
    await send(print(ActivateEvaluationTemplateEditionDocument), { id: editionId }, headers)
    return { editionId, version }
}
