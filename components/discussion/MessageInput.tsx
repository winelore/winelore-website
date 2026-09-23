"use client"

import React, { useState, useRef, useEffect } from "react"
import { Send, X, CornerDownRight, Quote } from "lucide-react"
import { type DiscussionMessage } from "@/app/commission/discussionActions"
import { useTranslation } from "@/lib/i18n/context"

interface MessageInputProps {
    replyTo: DiscussionMessage | null
    replyQuote?: { text?: string; startIndex?: number | null; endIndex?: number | null } | null
    replyToAuthorName?: string | null
    onCancelReply: () => void
    onSend: (text: string) => Promise<boolean | void> | void
    isSending?: boolean
    disabled?: boolean
}

export function MessageInput({
                                 replyTo,
                                 replyQuote,
                                 replyToAuthorName,
                                 onCancelReply,
                                 onSend,
                                 isSending = false,
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

    // Immediate zero-lag submit handler (Telegram style)
    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const trimmed = text.trim()
        if (!trimmed || disabled) return

        // 1. Immediately clear input text and reset height (Zero optimistic lag)
        setText("")
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
            textareaRef.current.focus()
        }
        // 2. Immediately clear reply state
        onCancelReply()
        // 3. Fire send asynchronously without blocking button or UI
        onSend(trimmed)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    // Display partial quote snippet if available, otherwise full message text
    const quoteSnippet = replyQuote?.text || replyTo?.text || ""
    const isPartial = Boolean(replyQuote?.text && replyQuote.text !== replyTo?.text)

    return (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
            {/* Telegram-Style Reply Banner */}
            {replyTo && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 p-2.5 transition-all animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                        <div className="w-1 h-8 bg-indigo-600 dark:bg-indigo-400 rounded-full shrink-0" />
                        <div className="overflow-hidden min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                <CornerDownRight className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                  {t("discussion.replyingTo") || "Replying to"} {replyToAuthorName || t("discussion.user") || "User"}
                                </span>
                                {isPartial && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-sm text-[9px] font-medium bg-indigo-200/60 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 shrink-0">
                                        <Quote className="w-2.5 h-2.5" />
                                        <span>Quote</span>
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5 italic">
                                &ldquo;{quoteSnippet}&rdquo;
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancelReply}
                        className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                        title={t("common.cancel") || "Cancel"}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="flex items-end gap-2 w-full">
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={t("discussion.inputPlaceholder") || "Type your comment or note..."}
                    rows={1}
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 transition-all leading-normal"
                />
                {/* Send Button: strictly flexbox-centered circular button with pr-0.5 for optical balance */}
                <button
                    type="submit"
                    disabled={!text.trim() || disabled}
                    className="w-10 h-10 shrink-0 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center pr-0.5 shadow-md shadow-indigo-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title={t("discussion.send") || "Send"}
                    aria-label={t("discussion.send") || "Send"}
                >
                    <Send className="w-[18px] h-[18px] shrink-0" />
                </button>
            </form>
        </div>
    )
}