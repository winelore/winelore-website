"use client"

import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"
import { TranslatedText, useBackendTranslation } from "@/lib/i18n/TranslatedText"
import { submitEvaluationAction, getVoiceUploadUrlAction } from "../../../../../actions"
import { writeCachedWaitEvaluation } from "../../../../../waitEvaluationCache"
import { Slider } from "@/components/ui/slider"
import { Mic, Square, Trash2 } from "lucide-react"

interface EvaluationProperty {
    __typename: "BooleanProperty" | "IntProperty" | "DoubleProperty" | "EnumProperty" | "DiscreteNumbersProperty" | "SmartProperty"
    id: string
    code: string
    name: string
    description?: string | null
    isRequired: boolean
    isResult?: boolean | null
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

const BOOLEAN_OPERATORS = new Set([
    "GREATER_THAN",
    "GREATER_THAN_OR_EQUAL",
    "GREATER_OR_EQUAL",
    "LESS_THAN",
    "LESS_THAN_OR_EQUAL",
    "LESS_OR_EQUAL",
    "EQUAL",
    "EQUALS",
    "NOT_EQUAL",
    "AND",
    "OR",
])

import { evaluateAST } from "@/lib/evaluationExpression"
function EnumOption({ value, formatEnumLabel }: { value: string, formatEnumLabel: (label: string) => string }) {
    const translatedLabel = formatEnumLabel(value)
    const backendTranslated = useBackendTranslation(translatedLabel)
    return <option value={value}>{backendTranslated}</option>
}

const DISCRETE_BUBBLE_MAX_OPTIONS = 20
const DISCRETE_BUBBLE_MAX_ROWS = 2
const EMPTY_DISCRETE_VALUES: number[] = []

function DiscreteNumbersInput({
                                  allowedValues,
                                  currentValue,
                                  onChange,
                                  selectPlaceholder,
                              }: {
    allowedValues: number[]
    currentValue: number | undefined
    onChange: (val: number | undefined) => void
    selectPlaceholder: string
}) {
    const containerRef = useRef<HTMLDivElement>(null)
    const measureRef = useRef<HTMLDivElement>(null)

    const sortedValues = useMemo(
        () => [...allowedValues].sort((a, b) => a - b),
        [allowedValues]
    )

    const [useBubbles, setUseBubbles] = useState(() =>
        sortedValues.length > 0 && sortedValues.length <= DISCRETE_BUBBLE_MAX_OPTIONS
    )

    useLayoutEffect(() => {
        const container = containerRef.current
        const measure = measureRef.current
        if (!container || !measure || allowedValues.length === 0) {
            setUseBubbles(false)
            return
        }
        if (allowedValues.length > DISCRETE_BUBBLE_MAX_OPTIONS) {
            setUseBubbles(false)
            return
        }

        const checkFit = () => {
            const width = container.offsetWidth
            if (width === 0) return

            measure.style.width = `${width}px`
            const firstButton = measure.querySelector("button")
            const rowHeight = firstButton?.offsetHeight ?? 36
            const maxHeight = rowHeight * DISCRETE_BUBBLE_MAX_ROWS + 8
            setUseBubbles(measure.scrollHeight <= maxHeight)
        }

        checkFit()
        const observer = new ResizeObserver(checkFit)
        observer.observe(container)
        return () => observer.disconnect()
    }, [allowedValues])

    const bubbleButtonClass = (selected: boolean) =>
        `min-w-[2.25rem] h-9 px-2.5 rounded-full text-xs font-bold border transition-colors ${
            selected
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
        }`

    return (
        <div ref={containerRef} className="relative w-full">
            <div
                ref={measureRef}
                aria-hidden
                className="pointer-events-none invisible absolute inset-x-0 top-0 flex flex-wrap gap-2"
            >
                {sortedValues.map((opt) => (
                    <button key={opt} type="button" tabIndex={-1} className={bubbleButtonClass(false)}>
                        {opt}
                    </button>
                ))}
            </div>
            {useBubbles ? (
                <div className="flex flex-wrap gap-2 justify-end">
                    {sortedValues.map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onChange(opt)}
                            className={bubbleButtonClass(currentValue === opt)}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            ) : (
                <select
                    value={currentValue ?? ""}
                    onChange={(e) => {
                        const val = e.target.value
                        onChange(val === "" ? undefined : Number(val))
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                    <option value="">{selectPlaceholder}</option>
                    {sortedValues.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            )}
        </div>
    )
}

function VoiceCommentButton({
    isRecording,
    recordingTime,
    previewUrl,
    disabled,
    onStart,
    onStop,
    onDiscard,
}: {
    isRecording: boolean
    recordingTime: number
    previewUrl?: string
    disabled: boolean
    onStart: () => void
    onStop: () => void
    onDiscard: () => void
}) {
    const { t } = useTranslation()
    const secs = recordingTime % 60
    const mins = Math.floor(recordingTime / 60)
    const timeStr = `${mins}:${String(secs).padStart(2, "0")}`

    if (isRecording) {
        return (
            <button
                type="button"
                onClick={onStop}
                title={t("evaluation.voiceStop")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shrink-0"
            >
                <span className="w-2 h-2 rounded-sm bg-white animate-pulse" />
                <span className="font-mono">{timeStr}</span>
                <Square className="w-3 h-3" />
            </button>
        )
    }

    if (previewUrl) {
        return (
            <button
                type="button"
                onClick={onDiscard}
                title={t("evaluation.voiceDiscard")}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-rose-100 hover:text-rose-600 transition-colors shrink-0 group"
            >
                <Mic className="w-3.5 h-3.5" />
                <Trash2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
        )
    }

    return (
        <button
            type="button"
            onClick={onStart}
            disabled={disabled}
            title={t("evaluation.voiceRecord")}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
        >
            <Mic className="w-4 h-4" />
        </button>
    )
}

export default function EvaluationForm({
    categories,
    candidateId,
    commissionId,
    replicaId,
    propertyCommentsEnabled,
    voiceCommentsEnabled,
}: {
    categories: EvaluationCategory[]
    candidateId: string
    commissionId: string
    replicaId: string
    propertyCommentsEnabled: boolean
    voiceCommentsEnabled: boolean
}) {
    const router = useRouter()
    const {t, formatEnumLabel} = useTranslation()
    const [values, setValues] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = {}
        categories.forEach(category => {
            category.properties.forEach(prop => {
                switch (prop.__typename) {
                    case "BooleanProperty":
                        if (prop.boolDefaultValue !== null && prop.boolDefaultValue !== undefined) {
                            initial[prop.code] = prop.boolDefaultValue
                        }
                        break
                    case "IntProperty": {
                        const hasRange = prop.intMinLimit !== null && prop.intMinLimit !== undefined
                            && prop.intMaxLimit !== null && prop.intMaxLimit !== undefined
                        const seeded = prop.intDefaultValue ?? (hasRange ? prop.intMinLimit : undefined)
                        if (seeded !== null && seeded !== undefined) initial[prop.code] = seeded
                        break
                    }
                    case "DoubleProperty": {
                        const hasRange = prop.doubleMinLimit !== null && prop.doubleMinLimit !== undefined
                            && prop.doubleMaxLimit !== null && prop.doubleMaxLimit !== undefined
                        const seeded = prop.doubleDefaultValue ?? (hasRange ? prop.doubleMinLimit : undefined)
                        if (seeded !== null && seeded !== undefined) initial[prop.code] = seeded
                        break
                    }
                    case "EnumProperty":
                        if (prop.enumDefaultValue !== null && prop.enumDefaultValue !== undefined) {
                            initial[prop.code] = prop.enumDefaultValue
                        }
                        break
                    case "DiscreteNumbersProperty":
                        if (prop.discreteDefaultValue !== null && prop.discreteDefaultValue !== undefined) {
                            initial[prop.code] = prop.discreteDefaultValue
                        }
                        break
                }
            })
        })
        return initial
    })
    const [commentValues, setCommentValues] = useState<Record<string, string>>({})
    const [generalComment, setGeneralComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Voice recording state — key is propId or "general"
    const [voiceBlobs, setVoiceBlobs] = useState<Record<string, Blob>>({})
    const [voicePreviewUrls, setVoicePreviewUrls] = useState<Record<string, string>>({})
    const [activeRecordingKey, setActiveRecordingKey] = useState<string | null>(null)
    const [recordingTime, setRecordingTime] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            streamRef.current?.getTracks().forEach(t => t.stop())
            Object.values(voicePreviewUrls).forEach(u => URL.revokeObjectURL(u))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const startRecording = async (key: string) => {
        if (activeRecordingKey) stopRecording()
        audioChunksRef.current = []
        try {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true})
            streamRef.current = stream
            const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
            const mr = new MediaRecorder(stream, {mimeType})
            mediaRecorderRef.current = mr
            mr.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data)
            }
            mr.onstop = () => {
                const blob = new Blob(audioChunksRef.current, {type: mimeType})
                const url = URL.createObjectURL(blob)
                setVoiceBlobs(prev => ({...prev, [key]: blob}))
                setVoicePreviewUrls(prev => {
                    if (prev[key]) URL.revokeObjectURL(prev[key])
                    return {...prev, [key]: url}
                })
                stream.getTracks().forEach(t => t.stop())
                streamRef.current = null
            }
            const start = Date.now()
            mr.start(200)
            setActiveRecordingKey(key)
            setRecordingTime(0)
            timerRef.current = setInterval(() => {
                setRecordingTime(Math.round((Date.now() - start) / 1000))
            }, 1000)
        } catch {
            alert(t("evaluation.voiceMicError"))
        }
    }

    const stopRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null
        }
        if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop()
        setActiveRecordingKey(null)
        setRecordingTime(0)
    }

    const discardVoice = (key: string) => {
        if (activeRecordingKey === key) stopRecording()
        setVoiceBlobs(prev => {
            const n = {...prev};
            delete n[key];
            return n
        })
        setVoicePreviewUrls(prev => {
            if (prev[key]) URL.revokeObjectURL(prev[key])
            const n = {...prev};
            delete n[key];
            return n
        })
    }

    const uploadVoice = async (blob: Blob, key: string): Promise<string | undefined> => {
        try {
            const ext = blob.type.includes("mp4") ? "mp4" : "webm"
            const fileName = `evaluation_voice_${key}_${Date.now()}.${ext}`
            const result = await getVoiceUploadUrlAction(fileName, blob.type)
            if (!result) return undefined
            const resp = await fetch(result.uploadUrl, {
                method: "PUT",
                headers: {"Content-Type": blob.type},
                body: blob,
            })
            return resp.ok ? result.fileUrl : undefined
        } catch {
            return undefined
        }
    }

    const handleValueChange = (code: string, val: any) => {
        setValues(prev => ({...prev, [code]: val}))
    }

    const handleCommentChange = (propId: string, text: string) => {
        setCommentValues(prev => ({...prev, [propId]: text}))
    }

    const computedSmartValues = useMemo(() => {
        const smartProps: EvaluationProperty[] = []
        categories.forEach(category => {
            category.properties.forEach(prop => {
                if (prop.__typename === "SmartProperty" && prop.expression) {
                    smartProps.push(prop)
                }
            })
        })

        const smartMap: Record<string, number> = {}

        // Resolve iteratively so a smart property can depend on another smart property.
        // Each pass feeds already-computed smart values back into the lookup; we stop once
        // no new value is produced (at most one pass per smart property).
        for (let pass = 0; pass <= smartProps.length; pass++) {
            let changed = false
            for (const prop of smartProps) {
                if (smartMap[prop.code] !== undefined) continue
                const result = evaluateAST(prop.expression, {...values, ...smartMap})
                if (result !== null) {
                    smartMap[prop.code] = result
                    changed = true
                }
            }
            if (!changed) break
        }

        return smartMap
    }, [categories, values])

    const smartPropertyCodes = useMemo(() => {
        const codes = new Set<string>()
        categories.forEach(category => {
            category.properties.forEach(prop => {
                if (prop.__typename === "SmartProperty") {
                    codes.add(prop.code)
                }
            })
        })
        return codes
    }, [categories])

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
            const scores = Object.entries(values)
                .filter(([code, val]) => val !== undefined && val !== null && !smartPropertyCodes.has(code))
                .map(([code, val]) => ({
                    code,
                    value: String(val)
                }))

            // Collect per-property comments when enabled
            let perPropertyComments: Array<{
                propertyId: string;
                text?: string;
                voiceUrl?: string;
                sortOrder: number
            }> = []
            if (propertyCommentsEnabled) {
                const propKeys = new Set([
                    ...Object.keys(commentValues).filter(k => commentValues[k].trim().length > 0),
                    ...(voiceCommentsEnabled
                        ? Object.keys(voiceBlobs).filter(k => k !== "general")
                        : []),
                ])

                let sortIndex = 0
                perPropertyComments = await Promise.all(
                    [...propKeys].map(async (propId) => {
                        const text = commentValues[propId]?.trim() || undefined
                        const blob = voiceCommentsEnabled ? voiceBlobs[propId] : undefined
                        const voiceUrl = blob ? await uploadVoice(blob, propId) : undefined
                        return {propertyId: propId, text, voiceUrl, sortOrder: sortIndex++}
                    })
                )
            }

            const generalBlob = voiceCommentsEnabled ? voiceBlobs["general"] : undefined
            const generalVoiceUrl = generalBlob ? await uploadVoice(generalBlob, "general") : undefined
            const hasGeneral = generalComment.trim() || generalVoiceUrl
            const comments = hasGeneral
                ? [...perPropertyComments, {
                    text: generalComment.trim() || undefined,
                    voiceUrl: generalVoiceUrl,
                    sortOrder: perPropertyComments.length
                }]
                : perPropertyComments

            const submitted = await submitEvaluationAction(candidateId, scores, comments)

            writeCachedWaitEvaluation(commissionId, replicaId, {
                candidateId,
                isComplete: submitted?.isComplete ?? true,
                scores: submitted?.scores ?? scores,
                comments: comments.map((comment, index) => ({
                    id: `local-${index}`,
                    propertyId: "propertyId" in comment && comment.propertyId != null
                        ? String(comment.propertyId)
                        : null,
                    text: comment.text,
                    voiceUrl: comment.voiceUrl,
                })),
            })

            setSuccess(true)

            setTimeout(() => {
                window.location.href = `/commission/${commissionId}/replica/${replicaId}/wait`
            }, 1000)
        } catch {
            setError(t("evaluation.submitError"))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (categories.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-3xl text-center text-slate-500 font-medium gap-2">
                <span className="text-lg font-bold text-slate-700">⚠️ {t("evaluation.noTemplate")}</span>
                <p className="text-sm text-slate-400 max-w-md">{t("evaluation.noTemplateDesc")}</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4 items-start w-full">
                {categories.map((category, index) => {
                    const isLastCategory = index === categories.length - 1
                    const orderedProperties = [
                        ...category.properties.filter((prop) => prop.isResult !== true),
                        ...category.properties.filter((prop) => prop.isResult === true),
                    ]

                    return (
                        // Змінено p-6 на p-4 для зменшення загальної висоти
                        <div key={category.id}
                             className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30 w-full flex flex-col h-full">
                            {/* Зменшено відступи під заголовком: mb-3 замість mb-4 */}
                            <h2 className="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">
                                <TranslatedText text={category.name}/>
                            </h2>

                            {/* Зменшено відступ між полями (повзунками): gap-3 замість gap-5 */}
                            <div className="flex flex-col gap-3 flex-1">
                                {orderedProperties.map((prop, propIndex) => {
                                    const currentValue = values[prop.code]
                                    const isSmart = prop.__typename === "SmartProperty"
                                    const isResult = prop.isResult === true

                                    // ВИДАЛЕНО: логіку обчислення startsResultSection та блок "Результати"

                                    return (
                                        <React.Fragment key={prop.id}>
                                            {/* Зменшено padding блоку: p-2.5 замість p-3 */}
                                            <div
                                                className={`flex flex-col gap-2.5 p-2.5 rounded-xl border shadow-xs ${isResult ? "border-indigo-200 bg-indigo-50/80 shadow-indigo-100/60 ring-1 ring-indigo-100" : "border-slate-100 bg-white"}`}>
                                                <div
                                                    className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-base font-bold text-slate-800">
                                                                <TranslatedText
                                                                    text={prop.name}
                                                                    prefix={prop.__typename === "IntProperty" || prop.__typename === "DoubleProperty" ? t("evaluation.scoreLabelPrefix") : ""}
                                                                    suffix={t("evaluation.scoreLabelSuffix")}
                                                                />
                                                            </h4>
                                                            {prop.isRequired && !isSmart &&
                                                                <span className="text-rose-500 text-xs">*</span>}
                                                        </div>
                                                        {prop.description && (
                                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                                                                <TranslatedText text={prop.description}/>
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="w-full md:w-64 flex justify-end">
                                                        {prop.__typename === "BooleanProperty" && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleValueChange(prop.code, true)}
                                                                    className={`px-4 py-1 rounded-lg text-xs font-bold border transition-colors ${currentValue === true ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                                                                >
                                                                    {t("common.yes")}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleValueChange(prop.code, false)}
                                                                    className={`px-4 py-1 rounded-lg text-xs font-bold border transition-colors ${currentValue === false ? "bg-rose-600 border-rose-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                                                                >
                                                                    {t("common.no")}
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
                                                                            className="w-full px-3 py-1 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-colors"
                                                                            placeholder={t("evaluation.enterValue")}
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
                                                            const showSliderTicks = stepCount > 0 && stepCount <= 100

                                                            return (
                                                                <div className="w-full flex flex-col">
                                                                    <div className="flex items-center gap-3 w-full">
                                                                        <div
                                                                            className={`flex-1 relative flex flex-col ${showSliderTicks ? "pb-5" : "py-1"}`}>
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
                                                                            className={`w-14 px-1 py-0.5 text-center border rounded-lg text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors ${isOutOfRange ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-800"}`}
                                                                            placeholder={t("evaluation.val")}
                                                                        />
                                                                    </div>
                                                                    {(!showSliderTicks || isOutOfRange) && (
                                                                        <div
                                                                            className="flex justify-between text-[9px] text-slate-400 px-0.5 mt-0.5">
                                                                            {!showSliderTicks &&
                                                                                <span>{t("evaluation.min", {value: min})}</span>}
                                                                            {isOutOfRange && <span
                                                                                className="text-rose-500 font-medium animate-pulse mx-auto">{t("evaluation.outOfRange")}</span>}
                                                                            {!showSliderTicks &&
                                                                                <span>{t("evaluation.max", {value: max})}</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })()}

                                                        {prop.__typename === "EnumProperty" && (
                                                            <select
                                                                value={currentValue ?? ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value
                                                                    handleValueChange(prop.code, val === "" ? undefined : val)
                                                                }}
                                                                className="w-full px-3 py-1 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                                                            >
                                                                <option value="">{t("evaluation.selectOption")}</option>
                                                                {prop.enumAllowedValues?.map((opt) => (
                                                                    <EnumOption key={opt} value={opt}
                                                                                formatEnumLabel={formatEnumLabel}/>
                                                                ))}
                                                            </select>
                                                        )}

                                                        {prop.__typename === "DiscreteNumbersProperty" && (
                                                            <DiscreteNumbersInput
                                                                allowedValues={prop.discreteAllowedValues ?? EMPTY_DISCRETE_VALUES}
                                                                currentValue={currentValue}
                                                                onChange={(val) => handleValueChange(prop.code, val)}
                                                                selectPlaceholder={t("evaluation.selectOption")}
                                                            />
                                                        )}

                                                        {prop.__typename === "SmartProperty" && (() => {
                                                            const raw = computedSmartValues[prop.code]
                                                            const isBooleanResult = BOOLEAN_OPERATORS.has(prop.expression?.type)
                                                            return (
                                                                <div
                                                                    className={`px-4 py-1 rounded-lg text-[13px] font-bold w-full text-center ${isResult ? "border border-indigo-200 bg-white text-indigo-800 shadow-sm" : "border border-indigo-100 bg-indigo-50/50 text-indigo-700"}`}>
                                                                    {raw === undefined
                                                                        ? t("evaluation.waitingDependencies")
                                                                        : isBooleanResult
                                                                            ? (raw !== 0 ? t("common.yes") : t("common.no"))
                                                                            : raw.toFixed(2)}
                                                                </div>
                                                            )
                                                        })()}
                                                    </div>
                                                </div>
                                                {!isSmart && propertyCommentsEnabled && (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-end gap-2">
                                                    <textarea
                                                        rows={1}
                                                        value={commentValues[prop.id] ?? ""}
                                                        onChange={(e) => handleCommentChange(prop.id, e.target.value)}
                                                        placeholder={t("evaluation.addComment")}
                                                        className="flex-1 px-3 py-1 border border-slate-100 rounded-lg text-[11px] text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 bg-slate-50/60 resize-none transition-colors"
                                                    />
                                                            {voiceCommentsEnabled && (
                                                                <VoiceCommentButton
                                                                    isRecording={activeRecordingKey === prop.id}
                                                                    recordingTime={recordingTime}
                                                                    previewUrl={voicePreviewUrls[prop.id]}
                                                                    disabled={activeRecordingKey !== null && activeRecordingKey !== prop.id}
                                                                    onStart={() => startRecording(prop.id)}
                                                                    onStop={stopRecording}
                                                                    onDiscard={() => discardVoice(prop.id)}
                                                                />
                                                            )}
                                                        </div>
                                                        {voiceCommentsEnabled && voicePreviewUrls[prop.id] && (
                                                            <div
                                                                className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5">
                                                                <audio src={voicePreviewUrls[prop.id]} controls
                                                                       className="h-6 flex-1 min-w-0"/>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </React.Fragment>
                                    )
                                })}
                            </div>

                            {/* Блок з кнопкою та коментарем для останньої категорії */}
                            {isLastCategory && (
                                <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <h2 className="text-[13px] font-bold text-slate-700">
                                            {t("evaluation.generalCommentLabel")}
                                        </h2>
                                        <div className="flex items-end gap-2">
                                        <textarea
                                            rows={2}
                                            value={generalComment}
                                            onChange={(e) => setGeneralComment(e.target.value)}
                                            placeholder={t("evaluation.generalCommentPlaceholder")}
                                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white resize-none transition-colors"
                                        />
                                            {voiceCommentsEnabled && (
                                                <VoiceCommentButton
                                                    isRecording={activeRecordingKey === "general"}
                                                    recordingTime={recordingTime}
                                                    previewUrl={voicePreviewUrls["general"]}
                                                    disabled={activeRecordingKey !== null && activeRecordingKey !== "general"}
                                                    onStart={() => startRecording("general")}
                                                    onStop={stopRecording}
                                                    onDiscard={() => discardVoice("general")}
                                                />
                                            )}
                                        </div>
                                        {voiceCommentsEnabled && voicePreviewUrls["general"] && (
                                            <div
                                                className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-2 py-0.5 mt-1">
                                                <audio src={voicePreviewUrls["general"]} controls
                                                       className="h-7 flex-1 min-w-0"/>
                                            </div>
                                        )}
                                    </div>

                                    {isFormValid ? (
                                        <button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={isSubmitting}
                                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-colors shadow-md shadow-indigo-600/10 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting && <div
                                                className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
                                            <span>{t("evaluation.submit")}</span>
                                        </button>
                                    ) : (
                                        <div
                                            className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold uppercase tracking-wider text-xs rounded-xl text-center cursor-default select-none border border-slate-200">
                                            {t("evaluation.fillRequired")}
                                        </div>
                                    )}

                                    {error && (
                                        <div
                                            className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[11px] font-semibold text-center">
                                            {error}
                                        </div>
                                    )}
                                    {success && (
                                        <div
                                            className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-[11px] font-semibold text-center animate-pulse">
                                            {t("evaluation.submitSuccess")}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}