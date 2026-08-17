"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { AlertCircle, X } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import {
    createOutcomePolicyAction,
    updateOutcomePolicyScriptAction,
    getOutcomePolicyByIdAction,
    getOutcomePolicyNamesAction,
} from "./actions"

interface OutcomePolicyCreatorModalProps {
    isOpen: boolean
    onClose: () => void
    currentAuid: number
    initialPolicyId?: string | null
}

const DEFAULT_SCRIPT = "// outcome policy script\n"

// Backend errors currently arrive as plain strings like "INTERNAL_ERROR for
// <traceId>". We can't reliably tell *why* it failed (the backend doesn't
// distinguish e.g. a name conflict from any other 500), but we can at least
// pull out the trace id so the user has something concrete to report.
function extractTraceId(message: string | undefined | null): string | null {
    if (!message) return null
    const match = message.match(/for\s+([a-zA-Z0-9-]{6,})\s*$/)
    return match ? match[1] : null
}

export default function OutcomePolicyCreatorModal({
                                                      isOpen,
                                                      onClose,
                                                      currentAuid,
                                                      initialPolicyId = null
                                                  }: OutcomePolicyCreatorModalProps) {
    const router = useRouter()
    const { t } = useTranslation()

    const [policyName, setPolicyName] = useState("")
    const [scriptCode, setScriptCode] = useState(DEFAULT_SCRIPT)
    const [editionId, setEditionId] = useState<string | null>(null)
    const [existingNames, setExistingNames] = useState<string[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            setErrorMsg(null)

            if (initialPolicyId) {
                setIsLoading(true)
                getOutcomePolicyByIdAction(initialPolicyId).then(({ policy, edition }) => {
                    setPolicyName(policy.name)
                    setEditionId(edition?.id ?? null)
                    setScriptCode(edition?.scriptCode ?? DEFAULT_SCRIPT)
                }).catch(() => {
                    setErrorMsg(t("outcomePolicyModal.loadError"))
                }).finally(() => {
                    setIsLoading(false)
                })
            } else {
                setPolicyName("")
                setEditionId(null)
                setScriptCode(DEFAULT_SCRIPT)
                // Pull existing names so we can catch a duplicate before hitting
                // the backend at all — the backend currently returns a generic
                // INTERNAL_ERROR for this case, which is useless to show as-is.
                getOutcomePolicyNamesAction(currentAuid).then(setExistingNames)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialPolicyId, currentAuid])

    const trimmedName = policyName.trim()
    const isDuplicateName = useMemo(
        () =>
            !initialPolicyId &&
            trimmedName.length > 0 &&
            existingNames.some((n) => n.trim().toLowerCase() === trimmedName.toLowerCase()),
        [initialPolicyId, trimmedName, existingNames]
    )

    const handleSave = async () => {
        setErrorMsg(null)

        if (!initialPolicyId && !trimmedName) {
            setErrorMsg(t("outcomePolicyModal.nameRequiredError"))
            return
        }

        if (isDuplicateName) {
            setErrorMsg(t("outcomePolicyModal.nameDuplicateError"))
            return
        }

        setIsSaving(true)
        try {
            if (initialPolicyId) {
                if (!editionId) throw new Error(t("outcomePolicyModal.editionNotFoundError"))
                await updateOutcomePolicyScriptAction(editionId, scriptCode)
            } else {
                await createOutcomePolicyAction(trimmedName, scriptCode, currentAuid)
            }
            onClose()
            router.refresh()
        } catch (saveErr: any) {
            const traceId = extractTraceId(saveErr?.message)
            setErrorMsg(
                traceId
                    ? t("outcomePolicyModal.saveErrorWithId", { id: traceId })
                    : (saveErr?.message || t("outcomePolicyModal.saveError"))
            )
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white shadow-sm">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                        {initialPolicyId ? t("outcomePolicyModal.editTitle") : t("outcomePolicyModal.createTitle")}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {t("outcomePolicyModal.subtitle")}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title={t("outcomePolicyModal.close")}
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

            <div className="flex-1 overflow-hidden px-8 py-6 flex flex-col gap-4 min-h-0">
                <div className="flex flex-col gap-1.5 max-w-lg shrink-0">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        {t("outcomePolicyModal.nameLabel")}
                        {!!initialPolicyId && (
                            <span className="text-[10px] font-medium text-slate-400 normal-case tracking-normal">
                                {t("outcomePolicyModal.readOnlyLabel")}
                            </span>
                        )}
                    </label>
                    <input
                        type="text"
                        disabled={!!initialPolicyId}
                        value={policyName}
                        onChange={(e) => setPolicyName(e.target.value)}
                        placeholder={t("outcomePolicyModal.namePlaceholder")}
                        className={`px-4 py-2.5 border rounded-2xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                            initialPolicyId
                                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed select-none"
                                : isDuplicateName
                                    ? "border-rose-400 bg-rose-50 text-rose-700"
                                    : "border-slate-200 bg-slate-50/30 text-slate-800"
                        }`}
                    />
                    {isDuplicateName && (
                        <span className="text-[11px] text-rose-500 font-medium">
                            {t("outcomePolicyModal.nameDuplicateError")}
                        </span>
                    )}
                </div>

                <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        {t("outcomePolicyModal.scriptLabel")}
                    </label>
                    <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center text-sm text-slate-400 font-semibold">
                                {t("outcomePolicyModal.loading")}
                            </div>
                        ) : (
                            <CodeMirror
                                value={scriptCode}
                                onChange={setScriptCode}
                                extensions={[javascript()]}
                                height="100%"
                                className="h-full text-sm"
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="shrink-0 p-8 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                    {t("outcomePolicyModal.cancel")}
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || isLoading || isDuplicateName}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-colors disabled:opacity-50"
                >
                    {isSaving ? t("outcomePolicyModal.saving") : t("outcomePolicyModal.save")}
                </button>
            </div>
        </div>
    )
}