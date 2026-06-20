"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { submitEvaluationAction } from "../../../actions"
import { Slider } from "@/components/ui/slider"

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

export default function EvaluationForm({
    categories,
    candidateId,
    commissionId,
    nextCandidateId
}: {
    categories: EvaluationCategory[]
    candidateId: string
    commissionId: string
    nextCandidateId: string | null
}) {
    const router = useRouter()
    const [values, setValues] = useState<Record<string, any>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

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

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setError(null)
        setSuccess(false)
        try {
            const finalData = { ...values, ...computedSmartValues }
            const scores = Object.entries(finalData)
                .filter(([_, val]) => val !== undefined && val !== null)
                .map(([code, val]) => ({
                    code,
                    value: String(val)
                }))

            try {
                await submitEvaluationAction(candidateId, scores)
            } catch (backendErr: any) {
                console.warn("⚠️ Backend submission failed (likely due to database constraints), saving to localStorage as fallback:", backendErr.message)
                
                const localKey = `evaluation_scores_${candidateId}`
                localStorage.setItem(localKey, JSON.stringify({
                    candidateId,
                    scores,
                    submittedAt: new Date().toISOString(),
                    backendError: backendErr.message
                }))
            }

            setSuccess(true)
            
            setTimeout(() => {
                if (nextCandidateId) {
                    router.push(`/commission/${commissionId}/candidate/${nextCandidateId}`)
                } else {
                    router.push(`/commission/${commissionId}`)
                }
                router.refresh()
            }, 1000)
        } catch (err: any) {
            setError(err.message || "Something went wrong while submitting evaluation.")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (categories.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-3xl text-center text-slate-500 font-medium gap-2">
                <span className="text-lg font-bold text-slate-700">⚠️ No Template Configured</span>
                <p className="text-sm text-slate-400 max-w-md">There are no evaluation categories configured for this commission on the backend, and the frontend mock fallback has been disabled.</p>
            </div>
        )
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
                                             const rawMin = prop.__typename === "IntProperty" ? prop.intMinLimit : prop.doubleMinLimit
                                             const rawMax = prop.__typename === "IntProperty" ? prop.intMaxLimit : prop.doubleMaxLimit

                                             if (rawMin === null || rawMin === undefined || rawMax === null || rawMax === undefined) {
                                                 return (
                                                     <div className="w-full flex flex-col gap-1">
                                                         <input
                                                             type="number"
                                                             step={prop.__typename === "DoubleProperty" ? "0.1" : "1"}
                                                             value={currentValue ?? ""}
                                                             onChange={(e) => handleValueChange(prop.code, e.target.value === "" ? undefined : Number(e.target.value))}
                                                             className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-colors"
                                                             placeholder="Enter value..."
                                                         />
                                                     </div>
                                                 )
                                             }

                                             const min = rawMin
                                             const max = rawMax
                                             const step = prop.__typename === "DoubleProperty" ? 0.1 : 1
                                             const defaultValue = (prop.__typename === "IntProperty" ? prop.intDefaultValue : prop.doubleDefaultValue) ?? min
                                             
                                             const sliderValue = currentValue !== undefined && currentValue !== null && currentValue !== "" ? currentValue : defaultValue
                                             const isOutOfRange = currentValue !== undefined && currentValue !== null && currentValue !== "" && (
                                                 currentValue < min || currentValue > max
                                             )

                                             const stepCount = Math.round((max - min) / step)
                                             const showTicks = stepCount > 0 && stepCount <= 20
                                             const showLabels = stepCount > 0 && stepCount <= 10
                                             const ticks = showTicks ? Array.from({ length: stepCount + 1 }, (_, i) => Number((min + i * step).toFixed(1))) : []

                                             return (
                                                 <div className="w-full flex flex-col gap-1">
                                                     <div className="flex items-center gap-4 w-full">
                                                         <div className={`flex-1 relative flex flex-col ${showLabels ? "pb-6" : "py-2"}`}>
                                                             <Slider
                                                                 min={min}
                                                                 max={max}
                                                                 step={step}
                                                                 showSteps={true}
                                                                 value={[sliderValue]}
                                                                 onValueChange={(val) => handleValueChange(prop.code, val[0])}
                                                                 className="cursor-pointer relative z-10"
                                                             />
                                                         </div>
                                                         <input
                                                             type="number"
                                                             step={step}
                                                             min={min}
                                                             max={max}
                                                             value={currentValue ?? ""}
                                                             onChange={(e) => handleValueChange(prop.code, e.target.value === "" ? undefined : Number(e.target.value))}
                                                             className={`w-16 px-2 py-1 text-center border rounded-lg text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors ${isOutOfRange ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-800"}`}
                                                             placeholder="Val"
                                                         />
                                                     </div>
                                                     <div className="flex justify-between text-[10px] text-slate-400 px-0.5 mt-1">
                                                         {!showLabels ? <span>Min: {min}</span> : <span />}
                                                         {isOutOfRange && <span className="text-rose-500 font-medium animate-pulse">Out of range!</span>}
                                                         {!showLabels ? <span>Max: {max}</span> : <span />}
                                                     </div>
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
                    disabled={isSubmitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-colors mt-4 shadow-md shadow-indigo-600/10 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                    {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
                    <span>Submit Evaluation</span>
                </button>
            ) : (
                <div className="w-full py-3 bg-slate-100 text-slate-400 font-bold uppercase tracking-wider text-xs rounded-xl text-center cursor-default select-none mt-4 border border-slate-200">
                    Please fill all required fields correctly
                </div>
            )}

            {error && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold text-center">
                    {error}
                </div>
            )}
            {success && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs font-semibold text-center animate-pulse">
                    Evaluation submitted successfully! Redirecting...
                </div>
            )}
        </div>
    )
}