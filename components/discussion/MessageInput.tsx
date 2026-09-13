"use client"

import React, { useState, useRef, useEffect } from "react"
import { Send, X, CornerDownRight, Loader2 } from "lucide-react"
import { type DiscussionMessage } from "@/app/commission/discussionActions"
import { useTranslation } from "@/lib/i18n/context"

interface MessageInputProps {
    replyTo: DiscussionMessage | null
    replyToAuthorName?: string | null
    onCancelReply: () => void
    onSend: (text: string) => Promise<boolean | void> | void
    isSending: boolean
    disabled?: boolean
}

export function MessageInput({
                                 replyTo,
                                 replyToAuthorName,
                                 onCancelReply,
                                 onSend,
                                 isSending,
                                 disabled = false,
                             }: MessageInputProps) {
    const { t } = useTranslation()
    const [text, setText] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Focus textarea when user clicks reply
    useEffect(() => {
        if (replyTo && textareaRef.current) {
            textareaRef.current.focus()
        }
    }, [replyTo])

    // Auto-resize textarea height
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        textarea.style.height = "auto"
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }, [text])

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const trimmed = text.trim()
        if (!trimmed || isSending || disabled) return

        const success = await onSend(trimmed)
        if (success !== false) {
            setText("")
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto"
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    return (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
            {/* Telegram-Style Reply Banner */}
            {replyTo && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 p-2.5 transition-all animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-start gap-2.5 overflow-hidden">
                        <div className="w-1 self-stretch bg-indigo-600 dark:bg-indigo-400 rounded-full shrink-0" />
                        <div className="overflow-hidden">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                <CornerDownRight className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                  {t("discussion.replyingTo") || "Replying to"} {replyToAuthorName || t("discussion.user") || "User"}
                </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                                {replyTo.text}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancelReply}
                        className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors shrink-0"
                        title={t("common.cancel") || "Cancel"}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSending}
            placeholder={t("discussion.inputPlaceholder") || "Type your comment or note..."}
            rows={1}
            className="flex-1 max-h-[120px] resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 transition-all"
        />

                <button
                    type="submit"
                    disabled={!text.trim() || isSending || disabled}
                    className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title={t("discussion.send") || "Send"}
                >
                    {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4 translate-x-px" />
                    )}
                </button>
            </form>
        </div>
    )
}
