"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, HelpCircle, AlertCircle, Info } from "lucide-react"
import { createCustomTemplateAction } from "../actions"

interface TemplateCreatorModalProps {
    isOpen: boolean
    onClose: () => void
    commissionId: string
    currentAuid: number
}

interface PropertyState {
    id: string
    name: string
    code: string
    type: "Boolean" | "Int" | "Double" | "Discrete" | "Enum" | "Smart"
    description: string
    isRequired: boolean
    defaultValue: string
    minLimit?: number
    maxLimit?: number
    allowedValuesStr: string // comma-separated
    expressionStr: string // text formula like 'aroma * 0.4'
}

interface CategoryState {
    id: string
    name: string
    properties: PropertyState[]
}

// Custom AST parser for math expressions
function parseExpression(input: string): any {
    const tokens: { type: string; value: string }[] = [];
    let i = 0;
    
    // Normalize and clean up
    input = input.replace(/\s+/g, "");
    
    while (i < input.length) {
        const char = input[i];
        if (/[0-9.]/.test(char)) {
            let numStr = "";
            while (i < input.length && /[0-9.]/.test(input[i])) {
                numStr += input[i];
                i++;
            }
            tokens.push({ type: "NUMBER", value: numStr });
        } else if (/[a-zA-Z_]/.test(char)) {
            let idStr = "";
            while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
                idStr += input[i];
                i++;
            }
            tokens.push({ type: "IDENTIFIER", value: idStr });
        } else if ("+-*/()".includes(char)) {
            tokens.push({ type: char, value: char });
            i++;
        } else {
            throw new Error(`Invalid character in expression: "${char}"`);
        }
    }

    let tokenIdx = 0;
    function peek() {
        return tokens[tokenIdx] || null;
    }
    function next() {
        return tokens[tokenIdx++];
    }

    function parseExpr(): any {
        let left = parseTerm();
        let current = peek();
        while (current && (current.type === "+" || current.type === "-")) {
            const opToken = next();
            const right = parseTerm();
            left = {
                type: opToken.type === "+" ? "ADD" : "SUBTRACT",
                left,
                right
            };
            current = peek();
        }
        return left;
    }

    function parseTerm(): any {
        let left = parseFactor();
        let current = peek();
        while (current && (current.type === "*" || current.type === "/")) {
            const opToken = next();
            const right = parseFactor();
            left = {
                type: opToken.type === "*" ? "MULTIPLY" : "DIVIDE",
                left,
                right
            };
            current = peek();
        }
        return left;
    }

    function parseFactor(): any {
        const token = next();
        if (!token) throw new Error("Unexpected end of expression");
        if (token.type === "NUMBER") {
            return {
                type: "CONSTANT",
                constantValue: token.value
            };
        }
        if (token.type === "IDENTIFIER") {
            return {
                type: "VARIABLE",
                variableCode: token.value
            };
        }
        if (token.type === "(") {
            const expr = parseExpr();
            const closing = next();
            if (!closing || closing.type !== ")") {
                throw new Error("Expected closing parenthesis ')'");
            }
            return expr;
        }
        throw new Error(`Unexpected token "${token.value}"`);
    }

    const ast = parseExpr();
    if (tokenIdx < tokens.length) {
        throw new Error(`Unexpected trailing characters: "${tokens.slice(tokenIdx).map(t => t.value).join("")}"`);
    }
    return ast;
}

export default function TemplateCreatorModal({
    isOpen,
    onClose,
    commissionId,
    currentAuid
}: TemplateCreatorModalProps) {
    const router = useRouter()
    const [templateName, setTemplateName] = useState("")
    const [categories, setCategories] = useState<CategoryState[]>([
        {
            id: "cat_1",
            name: "Visual Assessment",
            properties: [
                {
                    id: "prop_1",
                    name: "Clarity",
                    code: "clarity",
                    type: "Boolean",
                    description: "Clarity characteristics",
                    isRequired: true,
                    defaultValue: "true",
                    allowedValuesStr: "",
                    expressionStr: ""
                }
            ]
        }
    ])
    const [isSaving, setIsSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Clear state on open
    useEffect(() => {
        if (isOpen) {
            setTemplateName(`Wine Template ${new Date().toLocaleDateString()}`)
            setErrorMsg(null)
        }
    }, [isOpen])

    // Get all available variable codes from non-smart properties for easy copy-pasting
    const allVariableCodes = categories.flatMap(cat => 
        cat.properties
            .filter(p => p.type !== "Smart" && p.code.trim().length > 0)
            .map(p => p.code.trim())
    )

    const handleAddCategory = () => {
        const id = `cat_${Date.now()}`
        setCategories(prev => [...prev, { id, name: "New Category", properties: [] }])
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
            name: "New Assessment Property",
            code: `property_${Date.now()}`,
            type: "Int",
            description: "",
            isRequired: true,
            defaultValue: "5",
            allowedValuesStr: "",
            expressionStr: "",
            minLimit: 1,
            maxLimit: 10
        }
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, properties: [...c.properties, newProp] } : c))
    }

    const handleRemoveProperty = (catId: string, propId: string) => {
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, properties: c.properties.filter(p => p.id !== propId) } : c))
    }

    const handlePropertyChange = (catId: string, propId: string, fields: Partial<PropertyState>) => {
        setCategories(prev => prev.map(c => {
            if (c.id === catId) {
                return {
                    ...c,
                    properties: c.properties.map(p => {
                        if (p.id === propId) {
                            const updated = { ...p, ...fields }
                            
                            // Auto-generate code from name if name changed
                            if (fields.name !== undefined) {
                                updated.code = fields.name
                                    .toLowerCase()
                                    .replace(/[^a-z0-9_]/g, "_")
                                    .replace(/_+/g, "_")
                                    .replace(/^_+|_+$/g, "")
                            }

                            // Provide sensible defaults when type changes
                            if (fields.type !== undefined) {
                                if (fields.type === "Boolean") {
                                    updated.defaultValue = "true"
                                } else if (fields.type === "Int") {
                                    updated.defaultValue = "5"
                                    updated.minLimit = 1
                                    updated.maxLimit = 10
                                } else if (fields.type === "Double") {
                                    updated.defaultValue = "5.0"
                                    updated.minLimit = 1.0
                                    updated.maxLimit = 10.0
                                } else if (fields.type === "Discrete") {
                                    updated.defaultValue = "1"
                                    updated.allowedValuesStr = "1, 2, 3, 5"
                                } else if (fields.type === "Enum") {
                                    updated.defaultValue = "DRY"
                                    updated.allowedValuesStr = "DRY, MEDIUM_DRY, SWEET"
                                } else if (fields.type === "Smart") {
                                    updated.defaultValue = ""
                                    updated.isRequired = true
                                }
                            }
                            return updated
                        }
                        return p
                    })
                }
            }
            return c
        }))
    }

    const handleSave = async () => {
        setErrorMsg(null)
        
        if (!templateName.trim()) {
            setErrorMsg("Будь ласка, введіть назву темплейту оцінювання.")
            return
        }

        if (categories.length === 0) {
            setErrorMsg("Темплейт повинен мати хоча б одну категорію.")
            return
        }

        // Validate codes & compile properties
        const codesSet = new Set<string>()
        const formattedCategories = []

        try {
            for (const cat of categories) {
                if (!cat.name.trim()) {
                    throw new Error(`Введіть назву категорії.`)
                }

                if (cat.properties.length === 0) {
                    throw new Error(`Категорія "${cat.name}" не містить жодної оцінки.`)
                }

                const propertiesInput = []

                for (const p of cat.properties) {
                    if (!p.name.trim()) {
                        throw new Error(`Введіть назву оцінки в категорії "${cat.name}".`)
                    }
                    if (!p.code.trim()) {
                        throw new Error(`Введіть унікальний код для оцінки "${p.name}".`)
                    }
                    if (codesSet.has(p.code)) {
                        throw new Error(`Дубльований код оцінки: "${p.code}". Коди мають бути унікальними в межах всього темплейту.`)
                    }
                    codesSet.add(p.code)

                    const propInput: any = {
                        type: p.type,
                        code: p.code,
                        name: p.name,
                        description: p.description || null,
                        isRequired: p.type === "Smart" ? true : p.isRequired,
                        defaultValue: p.defaultValue || null
                    }

                    // Type specific validation/parsing
                    if (p.type === "Int" || p.type === "Double") {
                        if (p.minLimit === undefined || p.maxLimit === undefined) {
                            throw new Error(`Вкажіть мінімальний та максимальний ліміт для оцінки "${p.name}".`)
                        }
                        if (Number(p.minLimit) >= Number(p.maxLimit)) {
                            throw new Error(`Мінімальний ліміт має бути меншим за максимальний для оцінки "${p.name}".`)
                        }
                        propInput.minLimit = Number(p.minLimit)
                        propInput.maxLimit = Number(p.maxLimit)
                    }

                    if (p.type === "Discrete") {
                        if (!p.allowedValuesStr.trim()) {
                            throw new Error(`Вкажіть дозволені числові значення через кому для оцінки "${p.name}".`)
                        }
                        const allowedList = p.allowedValuesStr.split(",")
                            .map(v => v.trim())
                            .filter(Boolean)
                            .map(Number)
                        
                        if (allowedList.some(isNaN)) {
                            throw new Error(`Всі дозволені значення для оцінки "${p.name}" мають бути цілими числами.`)
                        }
                        propInput.allowedValues = allowedList.map(String)
                    }

                    if (p.type === "Enum") {
                        if (!p.allowedValuesStr.trim()) {
                            throw new Error(`Вкажіть дозволені текстові значення (enum) через кому для оцінки "${p.name}".`)
                        }
                        const allowedList = p.allowedValuesStr.split(",")
                            .map(v => v.trim().toUpperCase())
                            .filter(Boolean)
                        
                        propInput.allowedValues = allowedList
                    }

                    if (p.type === "Smart") {
                        if (!p.expressionStr.trim()) {
                            throw new Error(`Формула для розумної оцінки "${p.name}" не може бути порожньою.`)
                        }
                        try {
                            const ast = parseExpression(p.expressionStr)
                            
                            // Check that variables used in AST are defined
                            const checkVariables = (node: any) => {
                                if (!node) return
                                if (node.type === "VARIABLE") {
                                    if (!codesSet.has(node.variableCode)) {
                                        throw new Error(`Використано невідому змінну "${node.variableCode}" у формулі. Переконайтеся, що ця оцінка оголошена вище у формі.`)
                                    }
                                }
                                checkVariables(node.left)
                                checkVariables(node.right)
                            }
                            checkVariables(ast)

                            propInput.expression = ast
                        } catch (parseErr: any) {
                            throw new Error(`Помилка у формулі оцінки "${p.name}": ${parseErr.message}`)
                        }
                    }

                    propertiesInput.push(propInput)
                }

                formattedCategories.push({
                    name: cat.name,
                    properties: propertiesInput
                })
            }
        } catch (validationErr: any) {
            setErrorMsg(validationErr.message)
            return
        }

        setIsSaving(true)
        try {
            await createCustomTemplateAction(commissionId, templateName, formattedCategories, currentAuid)
            onClose()
            router.refresh()
        } catch (saveErr: any) {
            setErrorMsg(saveErr.message || "Помилка при створенні темплейту на сервері.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-[32px] overflow-hidden bg-white border border-slate-100 shadow-2xl">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="text-2xl font-extrabold text-slate-800 tracking-tight">
                        Створення темплейту оцінювання
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-sm">
                        Налаштуйте категорії та властивості для дегустаційної форми цієї комісії.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto my-4 pr-1 flex flex-col gap-6">
                    {errorMsg && (
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3 text-rose-600 text-xs font-semibold">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>{errorMsg}</p>
                        </div>
                    )}

                    {/* Template name input */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Назва темплейту
                        </label>
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Введіть назву, наприклад: Червоні вина дегустація..."
                            className="px-4 py-2.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/30 transition-all"
                        />
                    </div>

                    {/* Categories section */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                                Категорії оцінювання
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddCategory}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-colors border border-indigo-100/50 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" /> Додати категорію
                            </button>
                        </div>

                        {categories.map((cat, catIdx) => (
                            <div key={cat.id} className="border border-slate-100 rounded-[24px] p-5 bg-slate-50/40 hover:bg-slate-50/70 transition-colors flex flex-col gap-4 relative">
                                <button
                                    type="button"
                                    onClick={() => handleRemoveCategory(cat.id)}
                                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Видалити категорію"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                <div className="flex flex-col gap-1 max-w-[80%]">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Категорія #{catIdx + 1}
                                    </label>
                                    <input
                                        type="text"
                                        value={cat.name}
                                        onChange={(e) => handleCategoryNameChange(cat.id, e.target.value)}
                                        placeholder="Назва категорії..."
                                        className="px-0 py-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-hidden text-lg font-bold text-slate-800 transition-colors"
                                    />
                                </div>

                                {/* Properties list inside category */}
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

                                    {cat.properties.map((p, propIdx) => (
                                        <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs relative flex flex-col gap-4">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveProperty(cat.id, p.id)}
                                                className="absolute top-3 right-3 p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                                                title="Видалити показник"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Row 1: Name, Code, Type */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Назва оцінки</span>
                                                    <input
                                                        type="text"
                                                        value={p.name}
                                                        onChange={(e) => handlePropertyChange(cat.id, p.id, { name: e.target.value })}
                                                        placeholder="Наприклад: Aroma Score..."
                                                        className="px-3 py-1.5 border border-slate-150 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50/20"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Код змінної (унікальний)</span>
                                                    <input
                                                        type="text"
                                                        value={p.code}
                                                        onChange={(e) => handlePropertyChange(cat.id, p.id, { code: e.target.value })}
                                                        placeholder="aroma_score..."
                                                        className="px-3 py-1.5 border border-slate-150 rounded-xl text-xs font-mono font-semibold text-slate-700 bg-slate-50/30"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Тип показника</span>
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

                                            {/* Row 2: Description & Required */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                                                <div className="flex flex-col gap-1 md:col-span-3">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Опис (підказка)</span>
                                                    <input
                                                        type="text"
                                                        value={p.description}
                                                        onChange={(e) => handlePropertyChange(cat.id, p.id, { description: e.target.value })}
                                                        placeholder="Опис показника для дегустатора..."
                                                        className="px-3 py-1.5 border border-slate-150 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/20"
                                                    />
                                                </div>

                                                {p.type !== "Smart" && (
                                                    <div className="flex items-center gap-2 mt-4 pl-1">
                                                        <input
                                                            type="checkbox"
                                                            id={`req_${p.id}`}
                                                            checked={p.isRequired}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, { isRequired: e.target.checked })}
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5"
                                                        />
                                                        <label htmlFor={`req_${p.id}`} className="text-xs font-bold text-slate-600 cursor-pointer">
                                                            Обов'язковий
                                                        </label>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Row 3: Type specific configs */}
                                            {(p.type === "Int" || p.type === "Double") && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-50">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Мінімум</span>
                                                        <input
                                                            type="number"
                                                            step={p.type === "Double" ? "0.1" : "1"}
                                                            value={p.minLimit ?? ""}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, { minLimit: e.target.value !== "" ? Number(e.target.value) : undefined })}
                                                            className="px-3 py-1.5 border border-slate-150 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/10"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Максимум</span>
                                                        <input
                                                            type="number"
                                                            step={p.type === "Double" ? "0.1" : "1"}
                                                            value={p.maxLimit ?? ""}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, { maxLimit: e.target.value !== "" ? Number(e.target.value) : undefined })}
                                                            className="px-3 py-1.5 border border-slate-150 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/10"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Стандартне значення</span>
                                                        <input
                                                            type="text"
                                                            value={p.defaultValue}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, { defaultValue: e.target.value })}
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
                                                            placeholder={p.type === "Discrete" ? "1, 2, 3, 5" : "DRY, SWEET"}
                                                            className="px-3 py-1.5 border border-slate-150 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/10"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Стандартне значення</span>
                                                        <input
                                                            type="text"
                                                            value={p.defaultValue}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, { defaultValue: e.target.value })}
                                                            className="px-3 py-1.5 border border-slate-150 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/10"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {p.type === "Smart" && (
                                                <div className="flex flex-col gap-2 pt-2 border-t border-slate-50">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                                                            Математична формула авто-обчислення
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={p.expressionStr}
                                                            onChange={(e) => handlePropertyChange(cat.id, p.id, { expressionStr: e.target.value })}
                                                            placeholder="наприклад: aroma_score * 0.4 + taste_score * 0.6"
                                                            className="px-3 py-1.5 border border-slate-150 rounded-xl text-xs font-mono font-bold text-slate-800 bg-indigo-50/10 focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                    </div>

                                                    {/* Helper list of available codes */}
                                                    <div className="bg-indigo-50/30 border border-indigo-150/40 rounded-xl p-3 flex flex-col gap-1">
                                                        <span className="text-[9.5px] font-bold text-indigo-600 flex items-center gap-1">
                                                            <Info className="w-3.5 h-3.5" /> Доступні змінні для формули:
                                                        </span>
                                                        {allVariableCodes.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                                {allVariableCodes.map(code => (
                                                                    <button
                                                                        key={code}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const currentFormula = p.expressionStr ? p.expressionStr + " " : ""
                                                                            handlePropertyChange(cat.id, p.id, { expressionStr: currentFormula + code })
                                                                        }}
                                                                        className="bg-white hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold transition-all cursor-pointer shadow-xs"
                                                                        title="Натисніть для вставки у формулу"
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
                                    ))}

                                    {cat.properties.length === 0 && (
                                        <div className="text-slate-400 text-xs italic py-4 text-center border border-dashed border-slate-200 rounded-2xl bg-white/60">
                                            У цій категорії ще немає жодного показника. Натисніть кнопку "Додати показник".
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="shrink-0 border-t border-slate-100 pt-4 flex gap-2 justify-end">
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
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/15 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                        {isSaving ? (
                            <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        ) : (
                            <span>Створити та застосувати</span>
                        )}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
