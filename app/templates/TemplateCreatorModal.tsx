"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, AlertCircle, X, Star, GripVertical } from "lucide-react"
import { createGlobalTemplateAction, updateGlobalTemplateAction, getBeverageTypesAction, getTemplateByIdAction } from "./actions"

interface TemplateCreatorModalProps {
    isOpen: boolean
    onClose: () => void
    currentAuid: number
    initialTemplateId?: string | null
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
    allowedValuesStr: string
    expressionStr: string
}

interface CategoryState {
    id: string
    name: string
    properties: PropertyState[]
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
    Int: "Ціле число",
    Double: "Дробове число",
    Discrete: "Вибір із чисел",
    Enum: "Вибір із варіантів",
    Boolean: "Так / Ні",
    Smart: "Розрахункове (Формула)",
}

function transliterate(str: string): string {
    const map: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z',
        'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
        'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ь': '', 'ю': 'yu', 'я': 'ya',
        'ы': 'y', 'э': 'e', 'ё': 'yo', 'ъ': ''
    }
    return str.toLowerCase().split('').map(char => map[char] || char).join('')
}

function parseExpression(input: string): any {
    const tokens: { type: string; value: string }[] = []
    let i = 0

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

export default function TemplateCreatorModal({
    isOpen,
    onClose,
    currentAuid,
    initialTemplateId = null
}: TemplateCreatorModalProps) {
    const router = useRouter()

    const [templateName, setTemplateName] = useState("")
    const [categories, setCategories] = useState<CategoryState[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [beverageTypes, setBeverageTypes] = useState<{ id: string; code: string; name: string }[]>([])
    const [selectedBeverageTypeId, setSelectedBeverageTypeId] = useState<string>("")

    const [errorPropIds, setErrorPropIds] = useState<Set<string>>(new Set())
    const [errorCatIds, setErrorCatIds] = useState<Set<string>>(new Set())

    const dragCatIdx = useRef<number | null>(null)
    const dragPropKey = useRef<{ catId: string; propIdx: number } | null>(null)
    const [dragOverCatIdx, setDragOverCatIdx] = useState<number | null>(null)
    const [dragOverPropKey, setDragOverPropKey] = useState<{ catId: string; propIdx: number } | null>(null)

    const [draggableCatId, setDraggableCatId] = useState<string | null>(null)
    const [draggablePropId, setDraggablePropId] = useState<string | null>(null)

    const prevCodeRef = useRef<Map<string, string>>(new Map())

    useEffect(() => {
        if (isOpen) {
            setErrorMsg(null)
            setErrorPropIds(new Set())
            setErrorCatIds(new Set())

            getBeverageTypesAction().then((types) => {
                setBeverageTypes(types)
                
                if (initialTemplateId) {
                    getTemplateByIdAction(initialTemplateId).then((data) => {
                        if (data) {
                            setTemplateName(data.name)
                            
                            const matchedType = types.find(t => t.id === (data as any).beverageTypeId)
                                ?? types.find(t => t.name === data.beverageType || t.code === data.beverageType)
                            if (matchedType) {
                                setSelectedBeverageTypeId(matchedType.id)
                            } else if (types.length > 0) {
                                setSelectedBeverageTypeId(types[0].id)
                            }

                            const edition = data.latestEdition
                            if (edition && edition.categories) {
                                const mappedCategories: CategoryState[] = edition.categories.map((cat: any, cIdx: number) => ({
                                    id: cat.id || `cat_loaded_${cIdx}_${Date.now()}`,
                                    name: cat.name,
                                    properties: cat.properties.map((p: any, pIdx: number) => ({
                                        id: p.id || `prop_loaded_${cIdx}_${pIdx}_${Date.now()}`,
                                        name: p.name,
                                        code: p.code,
                                        type: p.type as any,
                                        description: p.description || "",
                                        isRequired: p.isRequired ?? true,
                                        // isResult, minLimit, maxLimit, allowedValues — нормалізовані в actions.ts
                                        isResult: !!(p.isResult ?? false),
                                        defaultValue: p.defaultValue !== undefined && p.defaultValue !== null ? String(p.defaultValue) : "",
                                        minLimit: p.minLimit !== undefined && p.minLimit !== null ? Number(p.minLimit) : undefined,
                                        maxLimit: p.maxLimit !== undefined && p.maxLimit !== null ? Number(p.maxLimit) : undefined,
                                        allowedValuesStr: Array.isArray(p.allowedValues) ? p.allowedValues.join(", ") : "",
                                        expressionStr: p.expressionRaw || ""
                                    }))
                                }))
                                setCategories(mappedCategories)
                            }
                        }
                    }).catch(err => {
                        setErrorMsg("Не вдалося завантажити дані темплейту для редагування.")
                    })
                } else {
                    setTemplateName("")
                    if (types.length > 0) setSelectedBeverageTypeId(types[0].id)
                    
                    const initialCatId = `cat_${Date.now()}`
                    const initialPropId = `prop_${Date.now()}`
                    
                    setCategories([
                        { 
                            id: initialCatId, 
                            name: "", 
                            properties: [
                                {
                                    id: initialPropId,
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
                            ] 
                        }
                    ])
                }
            })
        }
    }, [isOpen, initialTemplateId])

    const duplicateCodes = computeDuplicateCodes(categories)

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

                    if (fields.name !== undefined) {
                        updated.code = transliterate(fields.name)
                            .replace(/[^a-z0-9_]/g, "_")
                            .replace(/_+/g, "_")
                            .replace(/^_+|_+$/g, "")
                    }

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

    const handleCodeFocus = (propId: string, currentCode: string) => {
        prevCodeRef.current.set(propId, currentCode)
    }

    const handleCodeCommit = (propId: string, newCode: string) => {
        const oldCode = prevCodeRef.current.get(propId)
        if (!oldCode || oldCode === newCode || !oldCode.trim() || !newCode.trim()) return

        setCategories(prev => prev.map(cat => ({
            ...cat,
            properties: cat.properties.map(p => {
                if (p.type !== "Smart" || !p.expressionStr) return p
                const regex = new RegExp(`\\b${oldCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")
                return { ...p, expressionStr: p.expressionStr.replace(regex, newCode) }
            })
        })))
        prevCodeRef.current.delete(propId)
    }

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
                            propInput.expressionRaw = p.expressionStr
                        } catch (parseErr: any) {
                            newErrorPropIds.add(p.id)
                            throw new Error(`Помилка у формулі оцінки "${p.name}": ${parseErr.message}`)
                        }
                    }

                    propertiesInput.push(propInput)
                }

                formattedCategories.push({ name: cat.name, properties: propertiesInput })
            }

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
            if (initialTemplateId) {
                await updateGlobalTemplateAction(
                    initialTemplateId,
                    templateName,
                    formattedCategories,
                    selectedBeverageTypeId
                )
            } else {
                await createGlobalTemplateAction(
                    templateName,
                    formattedCategories,
                    currentAuid,
                    selectedBeverageTypeId
                )
            }
            onClose()
            router.refresh()
        } catch (saveErr: any) {
            setErrorMsg(saveErr.message || "Помилка при збереженні темплейту на сервері.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleCatDragStart = (idx: number) => { dragCatIdx.current = idx }
    const handleCatDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverCatIdx(idx) }
    const handleCatDrop = (targetIdx: number) => {
        const sourceIdx = dragCatIdx.current
        if (sourceIdx === null || sourceIdx === targetIdx) { dragCatIdx.current = null; setDragOverCatIdx(null); return }
        setCategories(prev => {
            const arr = [...prev]
            const [moved] = arr.splice(sourceIdx, 1)
            arr.splice(targetIdx, 0, moved)
            return arr
        })
        dragCatIdx.current = null; setDragOverCatIdx(null)
    }
    const handleCatDragEnd = () => { dragCatIdx.current = null; setDragOverCatIdx(null); setDraggableCatId(null) }

    const handlePropDragStart = (catId: string, propIdx: number) => { dragPropKey.current = { catId, propIdx } }
    const handlePropDragOver = (e: React.DragEvent, catId: string, propIdx: number) => { e.preventDefault(); setDragOverPropKey({ catId, propIdx }) }
    const handlePropDrop = (targetCatId: string, targetPropIdx: number) => {
        const source = dragPropKey.current
        if (!source) return
        if (source.catId === targetCatId && source.propIdx === targetPropIdx) { dragPropKey.current = null; setDragOverPropKey(null); return }
        setCategories(prev => {
            const arr = prev.map(c => ({ ...c, properties: [...c.properties] }))
            const srcCat = arr.find(c => c.id === source.catId)
            const tgtCat = arr.find(c => c.id === targetCatId)
            if (!srcCat || !tgtCat) return prev
            const [moved] = srcCat.properties.splice(source.propIdx, 1)
            tgtCat.properties.splice(targetPropIdx, 0, moved)
            return arr
        })
        dragPropKey.current = null; setDragOverPropKey(null)
    }
    const handlePropDragEnd = () => { dragPropKey.current = null; setDragOverPropKey(null); setDraggablePropId(null) }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white shadow-sm">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                        {initialTemplateId ? "Редагування темплейту оцінювання" : "Створення темплейту оцінювання"}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Налаштуйте категорії та показники для шаблону оцінювання.
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

            {errorMsg && (
                <div className="mx-8 mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700 text-sm font-medium animate-in fade-in-50 duration-200">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>{errorMsg}</div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
                <div className="flex gap-3 flex-wrap">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-64">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            Назва темплейту
                            {!!initialTemplateId && (
                                <span className="text-[10px] font-medium text-slate-400 normal-case tracking-normal">
                                    (лише для читання)
                                </span>
                            )}
                        </label>
                        <input
                            type="text"
                            disabled={!!initialTemplateId}
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Наприклад: Червоні вина дегустація..."
                            className={`px-4 py-2.5 border rounded-2xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                                initialTemplateId
                                    ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed select-none"
                                    : "border-slate-200 bg-slate-50/30 text-slate-800"
                            }`}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            Тип напою
                            {!!initialTemplateId && (
                                <span className="text-[10px] font-medium text-slate-400 normal-case tracking-normal">
                                    (лише для читання)
                                </span>
                            )}
                        </label>
                        <select
                            disabled={!!initialTemplateId}
                            value={selectedBeverageTypeId}
                            onChange={(e) => setSelectedBeverageTypeId(e.target.value)}
                            className={`px-4 py-2.5 border rounded-2xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                                initialTemplateId
                                    ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : "border-slate-200 bg-slate-50/30 text-slate-800 cursor-pointer"
                            }`}
                        >
                            {beverageTypes.length === 0 && <option value="">Завантаження...</option>}
                            {beverageTypes.map((bt) => (
                                <option key={bt.id} value={bt.id}>{bt.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

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
                            draggable={draggableCatId === cat.id}
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
                                    onMouseDown={() => setDraggableCatId(cat.id)}
                                    onMouseUp={() => setDraggableCatId(null)}
                                    onMouseLeave={() => setDraggableCatId(null)}
                                    className="mt-2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors shrink-0 p-1"
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
                                    return (
                                        <div
                                            key={p.id}
                                            draggable={draggablePropId === p.id}
                                            onDragStart={() => handlePropDragStart(cat.id, propIdx)}
                                            onDragOver={(e) => handlePropDragOver(e, cat.id, propIdx)}
                                            onDrop={() => handlePropDrop(cat.id, propIdx)}
                                            onDragEnd={handlePropDragEnd}
                                            className={`flex flex-wrap items-center gap-2 p-3 rounded-2xl transition-all ${
                                                dragOverPropKey?.catId === cat.id && dragOverPropKey?.propIdx === propIdx
                                                    ? "bg-indigo-50 ring-2 ring-indigo-200"
                                                    : "bg-white hover:bg-slate-50"
                                            }`}
                                        >
                                            <div
                                                onMouseDown={() => setDraggablePropId(p.id)}
                                                onMouseUp={() => setDraggablePropId(null)}
                                                onMouseLeave={() => setDraggablePropId(null)}
                                                className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors shrink-0 p-1"
                                            >
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="text"
                                                value={p.name}
                                                onChange={(e) => handlePropertyChange(cat.id, p.id, { name: e.target.value })}
                                                placeholder="Назва показника..."
                                                className={`flex-1 min-w-[160px] px-3 py-1.5 border rounded-lg text-sm font-medium ${
                                                    errorPropIds.has(p.id) ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"
                                                }`}
                                            />
                                            <input
                                                type="text"
                                                value={p.code}
                                                onFocus={() => handleCodeFocus(p.id, p.code)}
                                                onBlur={(e) => handleCodeCommit(p.id, e.target.value)}
                                                onChange={(e) => handlePropertyChange(cat.id, p.id, { code: e.target.value })}
                                                placeholder="код"
                                                className={`w-40 shrink-0 px-3 py-1.5 border rounded-lg text-sm font-mono ${
                                                    isCodeDuplicate ? "border-rose-500 bg-rose-50" : "border-slate-200"
                                                }`}
                                            />
                                            <select
                                                value={p.type}
                                                onChange={(e) => handlePropertyChange(cat.id, p.id, { type: e.target.value as any })}
                                                className="shrink-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold bg-white cursor-pointer"
                                            >
                                                <option value="Int">Ціле число</option>
                                                <option value="Double">Дробове число</option>
                                                <option value="Discrete">Вибір із чисел</option>
                                                <option value="Enum">Вибір із варіантів</option>
                                                <option value="Boolean">Так / Ні</option>
                                                <option value="Smart">Розрахункове (Формула)</option>
                                            </select>

                                            {(p.type === "Int" || p.type === "Double") && (
                                                <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 px-2 py-1 border border-slate-200 rounded-lg">
                                                    <span className="text-xs font-medium text-slate-400">від</span>
                                                    <input
                                                        type="number"
                                                        value={p.minLimit ?? ""}
                                                        onChange={(e) => handlePropertyChange(cat.id, p.id, { minLimit: e.target.value === "" ? undefined : Number(e.target.value) })}
                                                        placeholder="0"
                                                        className="w-14 px-1.5 py-0.5 border border-slate-200 rounded-md bg-white text-sm text-center font-medium focus:outline-hidden focus:border-indigo-500"
                                                    />
                                                    <span className="text-xs font-medium text-slate-400">до</span>
                                                    <input
                                                        type="number"
                                                        value={p.maxLimit ?? ""}
                                                        onChange={(e) => handlePropertyChange(cat.id, p.id, { maxLimit: e.target.value === "" ? undefined : Number(e.target.value) })}
                                                        placeholder="100"
                                                        className="w-14 px-1.5 py-0.5 border border-slate-200 rounded-md bg-white text-sm text-center font-medium focus:outline-hidden focus:border-indigo-500"
                                                    />
                                                </div>
                                            )}

                                            {p.type === "Discrete" && (
                                                <input
                                                    type="text"
                                                    value={p.allowedValuesStr}
                                                    onChange={(e) => handlePropertyChange(cat.id, p.id, { allowedValuesStr: e.target.value })}
                                                    placeholder="Варіанти через кому: 1, 2, 3, 5..."
                                                    title="Дозволені числові значення через кому"
                                                    className={`flex-1 min-w-[150px] px-3 py-1.5 border rounded-lg text-sm font-mono bg-white ${
                                                        errorPropIds.has(p.id) ? "border-rose-300 bg-rose-50" : "border-slate-200"
                                                    }`}
                                                />
                                            )}

                                            {p.type === "Enum" && (
                                                <input
                                                    type="text"
                                                    value={p.allowedValuesStr}
                                                    onChange={(e) => handlePropertyChange(cat.id, p.id, { allowedValuesStr: e.target.value })}
                                                    placeholder="Варіанти через кому: ЧЕРВОНЕ, БІЛЕ..."
                                                    title="Дозволені текстові значення через кому"
                                                    className={`flex-1 min-w-[150px] px-3 py-1.5 border rounded-lg text-sm font-mono bg-white ${
                                                        errorPropIds.has(p.id) ? "border-rose-300 bg-rose-50" : "border-slate-200"
                                                    }`}
                                                />
                                            )}

                                            {p.type === "Smart" && (
                                                <input
                                                    type="text"
                                                    value={p.expressionStr}
                                                    onChange={(e) => handlePropertyChange(cat.id, p.id, { expressionStr: e.target.value })}
                                                    placeholder="Формула: code_a + code_b * 0.5"
                                                    title="Формула розрахункового показника"
                                                    className={`flex-1 min-w-[180px] px-3 py-1.5 border rounded-lg text-sm font-mono bg-white ${
                                                        errorPropIds.has(p.id) ? "border-rose-300 bg-rose-50" : "border-slate-200"
                                                    }`}
                                                />
                                            )}

                                            <div className="ml-auto flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePropertyChange(cat.id, p.id, { isResult: !p.isResult })}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        p.isResult ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400 hover:text-slate-600"
                                                    }`}
                                                    title="Позначити як результуючий показник"
                                                >
                                                    <Star className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveProperty(cat.id, p.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="shrink-0 p-8 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                    Скасувати
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-colors disabled:opacity-50"
                >
                    {isSaving ? "Збереження..." : "Зберегти зміни"}
                </button>
            </div>
        </div>
    )
}