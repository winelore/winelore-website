"use client"

import React, { useState, useMemo } from "react"

interface EvaluationProperty {
    __typename: "BooleanProperty" | "IntProperty" | "DoubleProperty" | "EnumProperty" | "DiscreteNumbersProperty" | "SmartProperty"
    id: string
    code: string
    name: string
    description?: string | null
    isRequired: boolean
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
    expression?: any | null
}

interface EvaluationCategory {
    id: string
    name: string
    properties: EvaluationProperty[]
}

function evaluateAST(ast: any, currentValues: Record<string, number | boolean>): number | null {
    if (!ast) return null

    const { type, __typename } = ast

    if (__typename === "VariableExpression" || type === "VARIABLE") {
        const val = currentValues[ast.code]
        return val !== undefined ? Number(val) : null
    }

    if (__typename === "ConstantExpression" || type === "CONSTANT") {
        return Number(ast.value)
    }

    if (__typename === "BinaryExpression" || ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"].includes(type)) {
        const left = evaluateAST(ast.left, currentValues)
        const right = evaluateAST(ast.right, currentValues)

        if (left === null || right === null) return null

        const operator = ast.type
        switch (operator) {
            case "ADD": return left + right
            case "SUBTRACT": return left - right
            case "MULTIPLY": return left * right
            case "DIVIDE": return right !== 0 ? left / right : 0
            default: return null
        }
    }

    return null
}

function formatEnumLabel(label: string): string {
    if (!label) return ""
    return label
        .toLowerCase()
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}

export default function EvaluationForm({ categories, candidateId }: { categories: EvaluationCategory[], candidateId: string }) {
    // Map of property code -> value
    const [values, setValues] = useState<Record<string, any>>({})

    const handleValueChange = (code: string, val: any) => {
        setValues(prev => ({ ...prev, [code]: val }))
    }

    const computedSmartValues = useMemo(() => {
        const smartMap: Record<string, number> = {}

        categories.forEach(category => {
            category.properties.forEach(prop => {
                if (prop.__typename === "SmartProperty" && prop.expression) {
                    const result = evaluateAST(prop.expression, values)
                    if (result !== null) {
                        smartMap[prop.code] = result
                    }
                }
            })
        })

        return smartMap
    }, [categories, values])

    const isFormValid = useMemo(() => {
        for (const category of categories) {
            for (const prop of category.properties) {
                const val = values[prop.code]

                if (prop.__typename === "SmartProperty") continue

                if (prop.isRequired) {
                    if (val === undefined || val === null || val === "") {
                        return false
                    }
                }

                if (val !== undefined && val !== null && val !== "") {
                    if (prop.__typename === "IntProperty") {
                        if (prop.intMinLimit !== null && prop.intMinLimit !== undefined && val < prop.intMinLimit) return false
                        if (prop.intMaxLimit !== null && prop.intMaxLimit !== undefined && val > prop.intMaxLimit) return false
                    }
                    if (prop.__typename === "DoubleProperty") {
                        if (prop.doubleMinLimit !== null && prop.doubleMinLimit !== undefined && val < prop.doubleMinLimit) return false
                        if (prop.doubleMaxLimit !== null && prop.doubleMaxLimit !== undefined && val > prop.doubleMaxLimit) return false
                    }
                }
            }
        }
        return true
    }, [categories, values])

    const handleSubmit = () => {
        const finalData = { ...values, ...computedSmartValues }
        console.log("Submitting values for candidate", candidateId, finalData)
        alert(`Submitted for ${candidateId}: ${JSON.stringify(finalData, null, 2)}`)
    }

    return (
        <div className="flex flex-col gap-8">
            {categories.map((category) => (
                <div key={category.id} className="border border-slate-100 rounded-2xl p-6 bg-slate-50/30">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                        {category.name}
                    </h2>

                    <div className="flex flex-col gap-5">
                        {category.properties.map((prop) => {
                            const currentValue = values[prop.code]
                            const isSmart = prop.__typename === "SmartProperty"

                            return (
                                <div key={prop.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-semibold text-slate-800">{prop.name}</h4>
                                            {prop.isRequired && !isSmart && <span className="text-rose-500 text-xs">*</span>}
                                        </div>
                                        {prop.description && <p className="text-xs text-slate-400 mt-0.5">{prop.description}</p>}
                                    </div>

                                    <div className="w-full md:w-64 flex justify-end">
                                        {prop.__typename === "BooleanProperty" && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleValueChange(prop.code, true)}
                                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${currentValue === true ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    onClick={() => handleValueChange(prop.code, false)}
                                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${currentValue === false ? "bg-rose-600 border-rose-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        )}

                                        {(prop.__typename === "IntProperty" || prop.__typename === "DoubleProperty") && (() => {
                                            const min = prop.__typename === "IntProperty" ? prop.intMinLimit : prop.doubleMinLimit
                                            const max = prop.__typename === "IntProperty" ? prop.intMaxLimit : prop.doubleMaxLimit
                                            const isOutOfRange = currentValue !== undefined && currentValue !== null && currentValue !== "" && (
                                                (min !== null && min !== undefined && currentValue < min) ||
                                                (max !== null && max !== undefined && currentValue > max)
                                            )

                                            return (
                                                <div className="w-full flex flex-col gap-1">
                                                    <input
                                                        type="number"
                                                        step={prop.__typename === "DoubleProperty" ? "0.1" : "1"}
                                                        min={min ?? undefined}
                                                        max={max ?? undefined}
                                                        value={currentValue ?? ""}
                                                        onChange={(e) => handleValueChange(prop.code, e.target.value === "" ? undefined : Number(e.target.value))}
                                                        className={`w-full px-3 py-1.5 border rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors ${isOutOfRange ? "border-rose-500 bg-rose-50" : "border-slate-200 bg-white"}`}
                                                        placeholder="Enter value..."
                                                    />
                                                    {(min !== undefined || max !== undefined) && (
                                                        <span className={`text-[10px] text-right ${isOutOfRange ? "text-rose-500 font-medium" : "text-slate-400"}`}>
                                                            Range: {min ?? "-∞"} - {max ?? "+∞"}
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })()}

                                        {(prop.__typename === "EnumProperty" || prop.__typename === "DiscreteNumbersProperty") && (
                                            <select
                                                value={currentValue ?? ""}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    handleValueChange(prop.code, prop.__typename === "DiscreteNumbersProperty" ? (val === "" ? undefined : Number(val)) : val)
                                                }}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                                            >
                                                <option value="">Select option...</option>
                                                {prop.__typename === "EnumProperty" 
                                                    ? prop.enumAllowedValues?.map((opt) => (
                                                        <option key={opt} value={opt}>{formatEnumLabel(opt)}</option>
                                                    ))
                                                    : prop.discreteAllowedValues?.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))
                                                }
                                            </select>
                                        )}

                                        {prop.__typename === "SmartProperty" && (
                                            <div className="px-4 py-1.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-sm font-bold text-indigo-700 w-full text-center">
                                                {computedSmartValues[prop.code] !== undefined
                                                    ? computedSmartValues[prop.code].toFixed(2)
                                                    : "Waiting for dependencies..."}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}

            {isFormValid ? (
                <button
                    onClick={handleSubmit}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-colors mt-4 shadow-md shadow-indigo-600/10"
                >
                    Submit Evaluation
                </button>
            ) : (
                <div className="w-full py-3 bg-slate-100 text-slate-400 font-bold uppercase tracking-wider text-xs rounded-xl text-center cursor-default select-none mt-4 border border-slate-200">
                    Please fill all required fields correctly
                </div>
            )}
        </div>
    )
}