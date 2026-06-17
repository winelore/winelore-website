"use client"

import React, { useState, useMemo } from "react"

interface EvaluationProperty {
    id: string
    name: string
    type: "BOOLEAN" | "INT" | "DOUBLE" | "ENUM" | "DISCRETE_NUMBERS" | "SMART"
    options?: string[]
    astExpression?: any
}

interface EvaluationCategory {
    id: string
    name: string
    properties: EvaluationProperty[]
}

function evaluateAST(ast: any, currentValues: Record<string, number | boolean>): number | null {
    if (!ast) return null

    if (ast.type === "PROPERTY_REFERENCE") {
        const val = currentValues[ast.propertyId]
        return val !== undefined ? Number(val) : null
    }

    if (ast.type === "LITERAL") {
        return Number(ast.value)
    }

    if (ast.type === "BINARY_OPERATION") {
        const left = evaluateAST(ast.left, currentValues)
        const right = evaluateAST(ast.right, currentValues)

        if (left === null || right === null) return null

        switch (ast.operator) {
            case "ADD": return left + right
            case "SUBTRACT": return left - right
            case "MULTIPLY": return left * right
            case "DIVIDE": return right !== 0 ? left / right : 0
            default: return null
        }
    }

    return null
}

export default function EvaluationForm({ categories, candidateId }: { categories: EvaluationCategory[], candidateId: string }) {
    const [values, setValues] = useState<Record<string, any>>({})

    const handleValueChange = (propertyId: string, val: any) => {
        setValues(prev => ({ ...prev, [propertyId]: val }))
    }

    const computedSmartValues = useMemo(() => {
        const smartMap: Record<string, number> = {}

        categories.forEach(category => {
            category.properties.forEach(prop => {
                if (prop.type === "SMART" && prop.astExpression) {
                    const result = evaluateAST(prop.astExpression, values)
                    if (result !== null) {
                        smartMap[prop.id] = result
                    }
                }
            })
        })

        return smartMap
    }, [categories, values])

    return (
        <div className="flex flex-col gap-8">
            {categories.map((category) => (
                <div key={category.id} className="border border-slate-100 rounded-2xl p-6 bg-slate-50/30">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                        {category.name}
                    </h2>

                    <div className="flex flex-col gap-5">
                        {category.properties.map((prop) => {
                            const currentValue = values[prop.id]

                            return (
                                <div key={prop.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-800">{prop.name}</h4>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider mt-1 inline-block">
                                            {prop.type}
                                        </span>
                                    </div>

                                    <div className="w-full md:w-64 flex justify-end">
                                        {prop.type === "BOOLEAN" && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleValueChange(prop.id, true)}
                                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${currentValue === true ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    onClick={() => handleValueChange(prop.id, false)}
                                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${currentValue === false ? "bg-rose-600 border-rose-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        )}

                                        {(prop.type === "INT" || prop.type === "DOUBLE") && (
                                            <input
                                                type="number"
                                                step={prop.type === "DOUBLE" ? "0.1" : "1"}
                                                value={currentValue ?? ""}
                                                onChange={(e) => handleValueChange(prop.id, e.target.value === "" ? undefined : Number(e.target.value))}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                placeholder="Enter value..."
                                            />
                                        )}

                                        {(prop.type === "ENUM" || prop.type === "DISCRETE_NUMBERS") && (
                                            <select
                                                value={currentValue ?? ""}
                                                onChange={(e) => handleValueChange(prop.id, e.target.value)}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                                            >
                                                <option value="">Select option...</option>
                                                {prop.options?.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        )}

                                        {prop.type === "SMART" && (
                                            <div className="px-4 py-1.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-sm font-bold text-indigo-700 w-full text-center">
                                                {computedSmartValues[prop.id] !== undefined
                                                    ? computedSmartValues[prop.id].toFixed(2)
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

            <button
                disabled
                className="w-full py-3 bg-slate-200 text-slate-400 font-bold uppercase tracking-wider text-xs rounded-xl cursor-not-allowed mt-4"
            >
                Submit Evaluation (Locked)
            </button>
        </div>
    )
}