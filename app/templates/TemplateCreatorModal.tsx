"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, AlertCircle, Info, X, Star, GripVertical } from "lucide-react"
import { createGlobalTemplateAction, getBeverageTypesAction } from "./actions"

interface TemplateCreatorModalProps {
    isOpen: boolean
    onClose: () => void
    currentAuid: number
}

interface PropertyState {
    id: string
    name: string
    code: string
    type: "Boolean" | "Int" | "Double" | "Discrete" | "Enum" | "Smart"
    description: string
    isRequired: boolean
    isResult: boolean
    defaultValue: string
    minLimit?: number
    maxLimit?: number
    allowedValuesStr: string // comma-separated
    expressionStr: string    // text formula like 'aroma * 0.4'
}

interface CategoryState {
    id: string
    name: string
    properties: PropertyState[]
}

// ─── Custom AST parser for math expressions ───────────────────────────────────
function parseExpression(input: string): any {
    const tokens: { type: string; value: string }[] = []
    let i = 0

    // Normalize and clean up
    input = input.replace(/\s+/g, "")

    while (i < input.length) {
        const char = input[i]
        if (/[0-9.]/.test(char)) {
            let numStr = ""
            while (i < input.length && /[0-9.]/.test(input[i])) {
                numStr += input[i]
                i++
            }
            tokens.push({ type: "NUMBER", value: numStr })
        } else if (/[a-zA-Z_]/.test(char)) {
            let idStr = ""
            while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
                idStr += input[i]
                i++
            }
            tokens.push({ type: "IDENTIFIER", value: idStr })
        } else if ("+-*/()".includes(char)) {
            tokens.push({ type: char, value: char })
            i++
        } else {
            throw new Error(`Invalid character in expression: "${char}"`)
        }
    }

    let tokenIdx = 0
    function peek() { return tokens[tokenIdx] || null }
    function next() { return tokens[tokenIdx++] }

    function parseExpr(): any {
        let left = parseTerm()
        let current = peek()
        while (current && (current.type === "+" || current.type === "-")) {
            const opToken = next()
            const right = parseTerm()
            left = { type: opToken.type === "+" ? "ADD" : "SUBTRACT", left, right }
            current = peek()
        }
        return left
    }

    function parseTerm(): any {
        let left = parseFactor()
        let current = peek()
        while (current && (current.type === "*" || current.type === "/")) {
            const opToken = next()
            const right = parseFactor()
            left = { type: opToken.type === "*" ? "MULTIPLY" : "DIVIDE", left, right }
            current = peek()
        }
        return left
    }

    function parseFactor(): any {
        const token = next()
        if (!token) throw new Error("Unexpected end of expression")
        if (token.type === "NUMBER") return { type: "CONSTANT", constantValue: token.value }
        if (token.type === "IDENTIFIER") return { type: "VARIABLE", variableCode: token.value }
        if (token.type === "(") {
            const expr = parseExpr()
            const closing = next()
            if (!closing || closing.type !== ")") throw new Error("Expected closing parenthesis ')'")
            return expr
        }
        throw new Error(`Unexpected token "${token.value}"`)
    }

    const ast = parseExpr()
    if (tokenIdx < tokens.length) {
        throw new Error(
            `Unexpected trailing characters: "${tokens.slice(tokenIdx).map(t => t.value).join("")}"`
        )
    }
    return ast
}

// ─── Compute duplicate codes across all categories ────────────────────────────
function computeDuplicateCodes(categories: CategoryState[]): Set<string> {
    const seen = new Map<string, number>()
    for (const cat of categories) {
        for (const p of cat.properties) {
            const c = p.code.trim()
            if (c) seen.set(c, (seen.get(c) || 0) + 1)
        }
    }
    const dups = new Set<string>()
    seen.forEach((count, code) => { if (count > 1) dups.add(code) })
    return dups
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TemplateCreatorModal({
    isOpen,
    onClose,
    currentAuid
}: TemplateCreatorModalProps) {
    const router = useRouter()

    const [templateName, setTemplateName] = useState("")
    const [categories, setCategories] = useState<CategoryState[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [beverageTypes, setBeverageTypes] = useState<{ id: string; code: string; name: string }[]>([])
    const [selectedBeverageTypeId, setSelectedBeverageTypeId] = useState<string>("")

    // Error-field highlighting
    const [errorPropIds, setErrorPropIds] = useState<Set<string>>(new Set())
    const [errorCatIds, setErrorCatIds] = useState<Set<string>>(new Set())

    // Drag-and-drop
    const dragCatIdx = useRef<number | null>(null)
    const dragPropKey = useRef<{ catId: string; propIdx: number } | null>(null)
    const [dragOverCatIdx, setDragOverCatIdx] = useState<number | null>(null)
    const [dragOverPropKey, setDragOverPropKey] = useState<{ catId: string; propIdx: number } | null>(null)

    // Code-rename tracking (to update Smart formulas)
    const prevCodeRef = useRef<Map<string, string>>(new Map()) // propId -> code at focus time

    // Load beverage types and reset state on open
    useEffect(() => {
        if (isOpen) {
            setTemplateName("")
            setCategories([])
            setErrorMsg(null)
            setErrorPropIds(new Set())
            setErrorCatIds(new Set())
            getBeverageTypesAction().then((types) => {
                setBeverageTypes(types)
                if (types.length > 0) setSelectedBeverageTypeId(types[0].id)
            })
        }
    }, [isOpen])

    // Duplicate codes (derived)
    const duplicateCodes = computeDuplicateCodes(categories)

    // All variable codes available for Smart property formulas
    const allVariableCodes = categories.flatMap(cat =>
        cat.properties
            .filter(p => p.type !== "Smart" && p.code.trim().length > 0)
            .map(p => p.code.trim())
    )

    // Whether any criteria exist
    const hasAnyCriteria = categories.some(c => c.properties.length > 0)

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleAddCategory = () => {
        const id = `cat_${Date.now()}`
        setCategories(prev => [...prev, { id, name: "", properties: [] }])
    }

    const handleRemoveCategory = (catId: string) => {
        setCategories(prev => prev.filter(c => c.id !== catId))
    }

    const handleCategoryNameChange = (catId: string, name: string) => {
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, name } : c))
    }

    const handleAddProperty = (catId: string) => {
        const id = `prop_${Date.now()}`
        const newProp: PropertyState = {
            id,
            name: "",
            code: "",
            type: "Int",
            description: "",
            isRequired: true,
            isResult: false,
            defaultValue: "",
            allowedValuesStr: "",
            expressionStr: "",
            minLimit: undefined,
            maxLimit: undefined,
        }
        setCategories(prev =>
            prev.map(c => c.id === catId ? { ...c, properties: [...c.properties, newProp] } : c)
        )
    }

    const handleRemoveProperty = (catId: string, propId: string) => {
        setCategories(prev =>
            prev.map(c => c.id === catId
                ? { ...c, properties: c.properties.filter(p => p.id !== propId) }
                : c
            )
        )
    }

    const handlePropertyChange = (catId: string, propId: string, fields: Partial<PropertyState>) => {
        setCategories(prev => prev.map(c => {
            if (c.id !== catId) return c
            return {
                ...c,
                properties: c.properties.map(p => {
                    if (p.id !== propId) return p
                    const updated = { ...p, ...fields }

                    // Auto-generate code from name if name changed
                    if (fields.name !== undefined) {
                        updated.code = fields.name
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, "_")
                            .replace(/_+/g, "_")
                            .replace(/^_+|_+$/g, "")
                    }

                    // When type changes — clear type-specific fields only
                    if (fields.type !== undefined) {
                        updated.defaultValue = ""
                        updated.allowedValuesStr = ""
                        updated.expressionStr = ""
                        if (fields.type !== "Int" && fields.type !== "Double") {
                            updated.minLimit = undefined
                            updated.maxLimit = undefined
                        }
                        if (fields.type === "Smart") {
                            updated.isRequired = true
                        }
                    }
                    return updated
                })
            }
        }))
    }

    // ── Handle code rename (update Smart formulas) ────────────────────────────
    const handleCodeFocus = (propId: string, currentCode: string) => {
        prevCodeRef.current.set(propId, currentCode)
    }

    const handleCodeCommit = (propId: string, newCode: string) => {
        const oldCode = prevCodeRef.current.get(propId)
        if (!oldCode || oldCode === newCode || !oldCode.trim() || !newCode.trim()) return

        // Replace all occurrences of oldCode in Smart formulas
        setCategories(prev => prev.map(cat => ({
            ...cat,
            properties: cat.properties.map(p => {
                if (p.type !== "Smart" || !p.expressionStr) return p
                // Word-boundary replace
                const regex = new RegExp(`\\b${oldCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")
                return { ...p, expressionStr: p.expressionStr.replace(regex, newCode) }
            })
        })))
        prevCodeRef.current.delete(propId)
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setErrorMsg(null)
        setErrorPropIds(new Set())
        setErrorCatIds(new Set())

        if (!templateName.trim()) {
            setErrorMsg("Будь ласка, введіть назву темплейту оцінювання.")
            return
        }
        if (categories.length === 0) {
            setErrorMsg("Темплейт повинен мати хоча б одну категорію.")
            return
        }

        const codesSet = new Set<string>()
        const formattedCategories: { name: string; properties: any[] }[] = []
        const newErrorPropIds = new Set<string>()
        const newErrorCatIds = new Set<string>()

        try {
            for (const cat of categories) {
                if (!cat.name.trim()) {
                    newErrorCatIds.add(cat.id)
                    throw new Error("Введіть назву категорії.")
                }
                if (cat.properties.length === 0) {
                    newErrorCatIds.add(cat.id)
                    throw new Error(`Категорія "${cat.name}" не містить жодної оцінки.`)
                }

                const propertiesInput: any[] = []

                for (const p of cat.properties) {
                    if (!p.name.trim()) {
                        newErrorPropIds.add(p.id)
                        throw new Error(`Введіть назву оцінки в категорії "${cat.name}".`)
                    }
                    if (!p.code.trim()) {
                        newErrorPropIds.add(p.id)
                        throw new Error(`Введіть унікальний код для оцінки "${p.name}".`)
                    }
                    if (codesSet.has(p.code)) {
                        newErrorPropIds.add(p.id)
                        // find sibling with same code too
                        for (const cat2 of categories) {
                            for (const p2 of cat2.properties) {
                                if (p2.code === p.code && p2.id !== p.id) newErrorPropIds.add(p2.id)
                            }
                        }
                        throw new Error(
                            `Дубльований код оцінки: "${p.code}". Коди мають бути унікальними в межах всього темплейту.`
                        )
                    }
                    codesSet.add(p.code)

                    const propInput: any = {
                        type: p.type,
                        code: p.code,
                        name: p.name,
                        description: p.description || null,
                        isRequired: p.type === "Smart" ? true : p.isRequired,
                        isResult: p.isResult,
                        defaultValue: p.defaultValue || null
                    }

                    if (p.type === "Int" || p.type === "Double") {
                        if (p.minLimit === undefined || p.maxLimit === undefined) {
                            newErrorPropIds.add(p.id)
                            throw new Error(`Вкажіть мінімальний та максимальний ліміт для оцінки "${p.name}".`)
                        }
                        if (Number(p.minLimit) >= Number(p.maxLimit)) {
                            newErrorPropIds.add(p.id)
                            throw new Error(`Мінімальний ліміт має бути меншим за максимальний для оцінки "${p.name}".`)
                        }
                        propInput.minLimit = Number(p.minLimit)
                        propInput.maxLimit = Number(p.maxLimit)
                    }

                    if (p.type === "Discrete") {
                        if (!p.allowedValuesStr.trim()) {
                            newErrorPropIds.add(p.id)
                            throw new Error(`Вкажіть дозволені числові значення через кому для оцінки "${p.name}".`)
                        }
                        const allowedList = p.allowedValuesStr
                            .split(",")
                            .map(v => v.trim())
                            .filter(Boolean)
                            .map(Number)
                        if (allowedList.some(isNaN)) {
                            newErrorPropIds.add(p.id)
                            throw new Error(`Всі дозволені значення для оцінки "${p.name}" мають бути цілими числами.`)
                        }
                        propInput.allowedValues = allowedList.map(String)
                    }

                    if (p.type === "Enum") {
                        if (!p.allowedValuesStr.trim()) {
                            newErrorPropIds.add(p.id)
                            throw new Error(`Вкажіть дозволені текстові значення (enum) через кому для оцінки "${p.name}".`)
                        }
                        propInput.allowedValues = p.allowedValuesStr
                            .split(",")
                            .map(v => v.trim().toUpperCase())
                            .filter(Boolean)
                    }

                    if (p.type === "Smart") {
                        if (!p.expressionStr.trim()) {
                            newErrorPropIds.add(p.id)
                            throw new Error(`Формула для розумної оцінки "${p.name}" не може бути порожньою.`)
                        }
                        try {
                            const ast = parseExpression(p.expressionStr)
                            const checkVariables = (node: any) => {
                                if (!node) return
                                if (node.type === "VARIABLE") {
                                    if (!codesSet.has(node.variableCode)) {
                                        throw new Error(
                                            `Використано невідому змінну "${node.variableCode}" у формулі. ` +
                                            `Переконайтеся, що ця оцінка оголошена вище у формі.`
                                        )
                                    }
                                }
                                checkVariables(node.left)
                                checkVariables(node.right)
                            }
                            checkVariables(ast)
                            propInput.expression = ast
                        } catch (parseErr: any) {
                            newErrorPropIds.add(p.id)
                            throw new Error(`Помилка у формулі оцінки "${p.name}": ${parseErr.message}`)
                        }
                    }

                    propertiesInput.push(propInput)
                }

                formattedCategories.push({ name: cat.name, properties: propertiesInput })
            }

            // ── isResult validation ────────────────────────────────────────────
            const hasResult = formattedCategories.some(cat =>
                cat.properties.some((p: any) => p.isResult === true)
            )
            if (!hasResult) {
                throw new Error(
                    'Хоча б один показник у темплейті повинен бути позначений як "Результуючий показник" (⭐).'
                )
            }
        } catch (validationErr: any) {
            setErrorPropIds(newErrorPropIds)
            setErrorCatIds(newErrorCatIds)
            setErrorMsg(validationErr.message)
            return
        }

        setIsSaving(true)
        try {
            await createGlobalTemplateAction(
                templateName,
                formattedCategories,
                currentAuid,
                selectedBeverageTypeId
            )
            onClose()
            router.refresh()
        } catch (saveErr: any) {
            setErrorMsg(saveErr.message || "Помилка при створенні темплейту на сервері.")
        } finally {
            setIsSaving(false)
        }
    }

    // ── Drag-and-drop: Categories ──────────────────────────────────────────────
    const handleCatDragStart = (idx: number) => {
        dragCatIdx.current = idx
    }
    const handleCatDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault()
        setDragOverCatIdx(idx)
    }
    const handleCatDrop = (targetIdx: number) => {
        const sourceIdx = dragCatIdx.current
        if (sourceIdx === null || sourceIdx === targetIdx) {
            dragCatIdx.current = null
            setDragOverCatIdx(null)
            return
        }
        setCategories(prev => {
            const arr = [...prev]
            const [moved] = arr.splice(sourceIdx, 1)
            arr.splice(targetIdx, 0, moved)
            return arr
        })
        dragCatIdx.current = null
        setDragOverCatIdx(null)
    }
    const handleCatDragEnd = () => {
        dragCatIdx.current = null
        setDragOverCatIdx(null)
    }

    // ── Drag-and-drop: Properties ──────────────────────────────────────────────
    const handlePropDragStart = (catId: string, propIdx: number) => {
        dragPropKey.current = { catId, propIdx }
    }
    const handlePropDragOver = (e: React.DragEvent, catId: string, propIdx: number) => {
        e.preventDefault()
        setDragOverPropKey({ catId, propIdx })
    }
    const handlePropDrop = (targetCatId: string, targetPropIdx: number) => {
        const source = dragPropKey.current
        if (!source) return
        if (source.catId === targetCatId && source.propIdx === targetPropIdx) {
            dragPropKey.current = null
            setDragOverPropKey(null)
            return
        }
        setCategories(prev => {
            const arr = prev.map(c => ({ ...c, properties: [...c.properties] }))
            const srcCat = arr.find(c => c.id === source.catId)
            const tgtCat = arr.find(c => c.id === targetCatId)
            if (!srcCat || !tgtCat) return prev
            const [moved] = srcCat.properties.splice(source.propIdx, 1)
            tgtCat.properties.splice(targetPropIdx, 0, moved)
            return arr
        })
        dragPropKey.current = null
        setDragOverPropKey(null)
    }
    const handlePropDragEnd = () => {
        dragPropKey.current = null
        setDragOverPropKey(null)
    }

    // ── Don't render when closed ───────────────────────────────────────────────
    if (!isOpen) return null

    // ── Full-screen UI ─────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">

            {/* ── Top bar ── */}
            <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white shadow-sm">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                        Створення темплейту оцінювання
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Налаштуйте категорії та показники для нового шаблону оцінювання.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Закрити"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">

                {/* Template name + beverage type */}
                <div className="flex gap-3 flex-wrap">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-64">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Назва темплейту
                        </label>
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Наприклад: Червоні вина дегустація..."
                            className="px-4 py-2.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/30 transition-all"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Тип напою
                        </label>
                        <select
                            value={selectedBeverageTypeId}
                            onChange={(e) => setSelectedBeverageTypeId(e.target.value)}
                            className="px-4 py-2.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/30 transition-all cursor-pointer"
                        >
                            {beverageTypes.length === 0 && <option value="">Завантаження...</option>}
                            {beverageTypes.map((bt) => (
                                <option key={bt.id} value={bt.id}>{bt.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Categories ── */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                            Категорії оцінювання
                        </h2>
                        <button
                            type="button"
                            onClick={handleAddCategory}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-colors border border-indigo-100/50 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" /> Додати категорію
                        </button>
                    </div>

                    {categories.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-200 rounded-[28px] bg-slate-50/30 text-center gap-2">
                            <p className="text-slate-400 text-sm font-semibold">Ще немає жодної категорії</p>
                            <p className="text-slate-300 text-xs">Натисніть «Додати категорію», щоб розпочати</p>
                        </div>
                    )}

                    {categories.map((cat, catIdx) => (
                        <div
                            key={cat.id}
                            draggable
                            onDragStart={() => handleCatDragStart(catIdx)}
                            onDragOver={(e) => handleCatDragOver(e, catIdx)}
                            onDrop={() => handleCatDrop(catIdx)}
                            onDragEnd={handleCatDragEnd}
                            className={`border rounded-[24px] p-5 flex flex-col gap-4 relative transition-all ${
                                dragOverCatIdx === catIdx && dragCatIdx.current !== catIdx
                                    ? "border-indigo-300 bg-indigo-50/40 ring-2 ring-indigo-200/50 scale-[1.01]"
                                    : errorCatIds.has(cat.id)
                                        ? "border-rose-300 bg-rose-50/20 ring-1 ring-rose-200"
                                        : "border-slate-100 bg-slate-50/40 hover:bg-slate-50/70"
                            }`}
                        >
                            {/* Drag handle + remove */}
                            <div className="absolute top-4 right-4 flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleRemoveCategory(cat.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Видалити категорію"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-start gap-2 max-w-[85%]">
                                <div
                                    className="mt-2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors shrink-0"
                                    title="Перетягнути категорію"
                                >
                                    <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col gap-1 flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Категорія #{catIdx + 1}
                                    </label>
                                    <input
                                        type="text"
                                        value={cat.name}
                                        onChange={(e) => handleCategoryNameChange(cat.id, e.target.value)}
                                        placeholder="Назва категорії, наприклад: Зовнішній вигляд..."
                                        className={`px-0 py-1 bg-transparent border-b hover:border-slate-200 focus:border-indigo-500 focus:outline-hidden text-lg font-bold text-slate-800 transition-colors ${
                                            errorCatIds.has(cat.id) ? "border-rose-400" : "border-transparent"
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Properties list */}
                            <div className="flex flex-col gap-3.5 mt-2">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        Показники оцінки
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleAddProperty(cat.id)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-lg text-[10px] font-extrabold text-slate-600 transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3 h-3" /> Додати показник
                                    </button>
                                </div>

                                {cat.properties.map((p, propIdx) => {
                                    const isCodeDuplicate = p.code.trim() && duplicateCodes.has(p.code.trim())
                                    const isErrorProp = errorPropIds.has(p.id)
                                    const isDragOverThis = dragOverPropKey?.catId === cat.id && dragOverPropKey?.propIdx === propIdx
                                    const isDragSource = dragPropKey.current?.catId === cat.id && dragPropKey.current?.propIdx === propIdx

                                    return (
                                        <div
                                            key={p.id}
                                            draggable
                                            onDragStart={() => handlePropDragStart(cat.id, propIdx)}
                                            onDragOver={(e) => handlePropDragOver(e, cat.id, propIdx)}
                                            onDrop={() => handlePropDrop(cat.id, propIdx)}
                                            onDragEnd={handlePropDragEnd}
                                            className={`bg-white border rounded-2xl p-4 shadow-xs relative flex flex-col gap-4 transition-all ${
                                                isDragOverThis && !isDragSource
                                                    ? "border-indigo-300 ring-2 ring-indigo-200/50 scale-[1.01]"
                                                    : isErrorProp
                                                        ? "border-rose-300 ring-1 ring-rose-200"
                                                        : isCodeDuplicate
                                                            ? "border-amber-300 ring-1 ring-amber-200"
                                                            : p.isResult
                                                                ? "border-amber-200 ring-1 ring-amber-100/80"
                                                                : "border-slate-100"
                                            }`}
                                        >
                                            {/* Result badge */}
                                            {p.isResult && (
                                                <div className="absolute top-3 left-12 flex items-center gap-1 bg-amber-50 text-amber-600 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-200">
                                                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                                    Результуючий
                                                </div>
                                            )}

                                            {/* Drag handle */}
                                            <div
                                                className="absolute top-3.5 left-3 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors"
                                                title="Перетягнути показник"
                                            >
                                                <GripVertical className="w-3.5 h-3.5" />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveProperty(cat.id, p.id)}
                                                className="absolute top-3 right-3 p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                                                title="Видалити показник"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Row 1: Name · Code · Type */}
                                            <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${p.isResult ? "mt-5" : "mt-1"}`}>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                        Назва оцінки
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={p.name}
                                                        onChange={(e) => handlePropertyChange(cat.id, p.id, { name: e.target.value })}
                                                        placeholder="Наприклад: Аромат..."
                                                        className={`px-3 py-1.5 border rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50/20 transition-colors ${
                                                            isErrorProp && !p.name.trim() ? "border-rose-400" : "border-slate-150"
                                                        }`}
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                        Код змінної (унікальний)
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={p.code}
                                                        onFocus={() => handleCodeFocus(p.id, p.code)}
                                                        onChange={(e) => {
                                                            // Only allow code-safe characters
                                                            const raw = e.target.value.replace(/[^a-zA-Z0-9_]/g, "_")
                                                            handlePropertyChange(cat.id, p.id, { code: raw, name: p.name }) // keep name
                                                            setCategories(prev => prev.map(c =>
                                                                c.id !== cat.id ? c : {
                                                                    ...c,
                                                                    properties: c.properties.map(pp =>
                                                                        pp.id !== p.id ? pp : { ...pp, code: raw }
                                                                    )
                                                                }
                                                            ))
                                                        }}
                                                        onBlur={(e) => handleCodeCommit(p.id, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                (e.target as HTMLInputElement).blur()
                                                            }
                                                        }}
                                                        placeholder="aroma_score"
                                                        className={`px-3 py-1.5 border rounded-xl text-xs font-mono font-semibold text-slate-700 bg-slate-50/30 focus:outline-hidden focus:ring-1 transition-colors ${
                                                            isCodeDuplicate
                                                                ? "border-amber-400 ring-1 ring-amber-300 bg-amber-50/30"
                                                                : isErrorProp && !p.code.trim()
                                                                    ? "border-rose-400"
                                                                    : "border-slate-150"
                                                        }`}
                                                    />
                                                    {isCodeDuplicate && (
                                                        <span className="text-[9px] text-amber-600 font-semibold flex items-center gap-1">
                                                            <AlertCircle className="w-2.5 h-2.5" />
                                                            Код вже використовується
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                        Тип показника
                                                    </span>
                                                    <select
                                                        value={p.type}
                                                        onChange={(e) => handlePropertyChange(cat.id, p.id, { type: e.target.value as any })}
                                                        className="px-3 py-1.5 border border-slate-150 rounded-xl text-xs font-semibold text-slate-800 bg-white"
                                                    >
                                                        <option value="Boolean">Boolean (Yes/No)</option>
                                                        <option value="Int">Int (Ціле число)</option>
                                                        <option value="Double">Double (Дробове число)</option>
                                                        <option value="Discrete">Discrete (Набір чисел)</option>
                                                        <option value="Enum">Enum (Текстовий список)</option>
                                                        <option value="Smart">Smart (Авто-обчислення)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Row 2: Description · Required · isResult */}
                                            <div className="flex items-end gap-4 flex-wrap">
                                                <div className="flex flex-col gap-1 flex-1 min-w-48">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                        Опис (підказка)
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={p.description}
                                                        onChange={(e) => handlePropertyChange(cat.id, p.id, { description: e.target.value })}
                                                        placeholder="Опис показника для дегустатора..."
                                                        className="px-3 py-1.5 border border-slate-150 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/20"
                                                    />
                                                </div>

                                                {p.type !== "Smart" && (
                                                    <div className="flex items-center gap-2 pb-1 shrink-0">
                                                        <input
                                                            type="checkbox"
                                                            id={`req_${p.id}`}
                                                            checked={p.isRequired}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, { isRequired: e.target.checked })}
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                        />
                                                        <label htmlFor={`req_${p.id}`} className="text-xs font-bold text-slate-600 cursor-pointer whitespace-nowrap">
                                                            Обов&apos;язковий
                                                        </label>
                                                    </div>
                                                )}

                                                {/* isResult toggle */}
                                                <div className="flex items-center gap-2 pb-1 shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        id={`result_${p.id}`}
                                                        checked={p.isResult}
                                                        onChange={(e) => handlePropertyChange(cat.id, p.id, { isResult: e.target.checked })}
                                                        className="rounded border-amber-300 focus:ring-amber-400 h-4 w-4 accent-amber-500"
                                                    />
                                                    <label
                                                        htmlFor={`result_${p.id}`}
                                                        className={`text-xs font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap transition-colors ${
                                                            p.isResult ? "text-amber-600" : "text-slate-500"
                                                        }`}
                                                    >
                                                        <Star className={`w-3 h-3 transition-all ${p.isResult ? "fill-amber-400 text-amber-400" : "text-slate-400"}`} />
                                                        Результуючий
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Row 3: Type-specific config */}
                                            {(p.type === "Int" || p.type === "Double") && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-50">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Мінімум</span>
                                                        <input
                                                            type="number"
                                                            step={p.type === "Double" ? "0.1" : "1"}
                                                            value={p.minLimit ?? ""}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, {
                                                                minLimit: e.target.value !== "" ? Number(e.target.value) : undefined
                                                            })}
                                                            placeholder={p.type === "Double" ? "0.0" : "0"}
                                                            className={`px-3 py-1.5 border rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/10 transition-colors ${
                                                                isErrorProp && p.minLimit === undefined ? "border-rose-400" : "border-slate-150"
                                                            }`}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Максимум</span>
                                                        <input
                                                            type="number"
                                                            step={p.type === "Double" ? "0.1" : "1"}
                                                            value={p.maxLimit ?? ""}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, {
                                                                maxLimit: e.target.value !== "" ? Number(e.target.value) : undefined
                                                            })}
                                                            placeholder={p.type === "Double" ? "10.0" : "10"}
                                                            className={`px-3 py-1.5 border rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/10 transition-colors ${
                                                                isErrorProp && p.maxLimit === undefined ? "border-rose-400" : "border-slate-150"
                                                            }`}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Стандартне значення</span>
                                                        <input
                                                            type="text"
                                                            value={p.defaultValue}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, { defaultValue: e.target.value })}
                                                            placeholder={p.type === "Double" ? "5.0" : "5"}
                                                            className="px-3 py-1.5 border border-slate-150 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/10"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {(p.type === "Discrete" || p.type === "Enum") && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                            {p.type === "Discrete" ? "Дозволені числа (через кому)" : "Дозволені варіанти (через кому)"}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={p.allowedValuesStr}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, { allowedValuesStr: e.target.value })}
                                                            placeholder={p.type === "Discrete" ? "1, 2, 3, 5" : "DRY, MEDIUM_DRY, SWEET"}
                                                            className={`px-3 py-1.5 border rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/10 transition-colors ${
                                                                isErrorProp && !p.allowedValuesStr.trim() ? "border-rose-400" : "border-slate-150"
                                                            }`}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Стандартне значення</span>
                                                        <input
                                                            type="text"
                                                            value={p.defaultValue}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, { defaultValue: e.target.value })}
                                                            placeholder={p.type === "Discrete" ? "1" : "DRY"}
                                                            className="px-3 py-1.5 border border-slate-150 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/10"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {p.type === "Smart" && (
                                                <div className="flex flex-col gap-2 pt-2 border-t border-slate-50">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">
                                                            Математична формула авто-обчислення
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={p.expressionStr}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, { expressionStr: e.target.value })}
                                                            placeholder="aroma_score * 0.4 + taste_score * 0.6"
                                                            className={`px-3 py-1.5 border rounded-xl text-xs font-mono font-bold text-slate-800 bg-indigo-50/10 focus:ring-1 focus:ring-indigo-500 transition-colors ${
                                                                isErrorProp && !p.expressionStr.trim() ? "border-rose-400" : "border-slate-150"
                                                            }`}
                                                        />
                                                    </div>

                                                    {/* Available variable codes helper */}
                                                    <div className="bg-indigo-50/30 border border-indigo-100/40 rounded-xl p-3 flex flex-col gap-1">
                                                        <span className="text-[9.5px] font-bold text-indigo-600 flex items-center gap-1">
                                                            <Info className="w-3.5 h-3.5" /> Доступні змінні для формули:
                                                        </span>
                                                        {allVariableCodes.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                                {allVariableCodes.map(code => (
                                                                    <button
                                                                        key={code}
                                                                        type="button"
                                                                        onClick={() => handlePropertyChange(cat.id, p.id, {
                                                                            expressionStr: p.expressionStr
                                                                                ? p.expressionStr + " + " + code
                                                                                : code
                                                                        })}
                                                                        className="px-2 py-0.5 bg-indigo-100/60 hover:bg-indigo-200/70 text-indigo-700 text-[9px] font-mono font-bold rounded-md border border-indigo-200/50 transition-colors cursor-pointer"
                                                                    >
                                                                        {code}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 italic mt-0.5">
                                                                Спочатку створіть звичайні показники (Int, Double тощо) вище, щоб використовувати їх коди тут.
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}

                                {cat.properties.length === 0 && (
                                    <div className="text-slate-400 text-xs italic py-4 text-center border border-dashed border-slate-200 rounded-2xl bg-white/60">
                                        У цій категорії ще немає жодного показника. Натисніть кнопку «Додати показник».
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="shrink-0 border-t border-slate-100 bg-white px-8 py-4 shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
                {/* Error / warning in footer */}
                {errorMsg && (
                    <div className="mb-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 flex items-start gap-2 text-rose-600 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>{errorMsg}</p>
                    </div>
                )}

                {/* Duplicate codes warning (live) */}
                {duplicateCodes.size > 0 && !errorMsg && (
                    <div className="mb-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-start gap-2 text-amber-700 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                        <p>
                            Дублюючі коди: {Array.from(duplicateCodes).map(c => `"${c}"`).join(", ")} — коди мають бути унікальними.
                        </p>
                    </div>
                )}

                <div className="flex gap-2 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                        Скасувати
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !hasAnyCriteria || duplicateCodes.size > 0}
                        title={!hasAnyCriteria ? "Додайте хоча б один показник оцінки" : undefined}
                        className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/15 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                        {isSaving ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <span>Створити темплейт</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
