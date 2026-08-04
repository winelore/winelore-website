"use client"

import React, { useState, useEffect } from "react"
import { X, Tag, Check, AlertCircle, Loader2 } from "lucide-react"
import { changeCommissionCandidateCodeAction } from "../../actions"

interface EditCandidateCodeModalProps {
    isOpen: boolean
    onClose: () => void
    candidateId: string
    currentCode?: string | null
    candidateLabel?: string
    onCodeUpdated: () => void
}

export function EditCandidateCodeModal({
    isOpen,
    onClose,
    candidateId,
    currentCode,
    candidateLabel,
    onCodeUpdated,
}: EditCandidateCodeModalProps) {
    const [code, setCode] = useState(currentCode || "")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            setCode(currentCode || "")
            setError(null)
        }
    }, [isOpen, currentCode])

    if (!isOpen) return null

    const handleSave = async () => {
        setIsSubmitting(true)
        setError(null)
        try {
            const res = await changeCommissionCandidateCodeAction(candidateId, code.trim())
            if (res.success) {
                onCodeUpdated()
                onClose()
            } else {
                setError(res.error || "Не вдалося оновити код кандидата")
            }
        } catch (err: any) {
            setError(err.message || "Помилка збереження")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-2xl animate-scale-up">
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/60">
                            <Tag className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">
                                Змінити анонімізований код
                            </h3>
                            {candidateLabel && (
                                <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                                    {candidateLabel}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Анонімізований код
                        </label>
                        <input
                            type="text"
                            placeholder="Наприклад: W-101, B-05..."
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSave()
                                if (e.key === "Escape") onClose()
                            }}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{error}</span>
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        Скасувати
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Зберегти</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
