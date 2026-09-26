"use client"

import React, { useState, useRef, useEffect } from "react"
import { Crown, Reply, CornerDownRight, Quote } from "lucide-react"
import { type DiscussionMessage } from "@/app/commission/discussionActions"
import { useTranslation } from "@/lib/i18n/context"

interface DiscussionBubbleProps {
    message: DiscussionMessage
    isMe: boolean
    authorName: string
    authorRole?: string | null
    replyToMessage?: DiscussionMessage | null
    replyToAuthorName?: string | null
    onReply: (
        message: DiscussionMessage,
        quote?: { text?: string; startIndex?: number | null; endIndex?: number | null } | null,
    ) => void
}

function formatTime(isoString: string): string {
    try {
        const date = new Date(isoString)
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch {
        return ""
    }
}

export function DiscussionBubble({
                                     message,
                                     isMe,
                                     authorName,
                                     authorRole,
                                     replyToMessage,
                                     replyToAuthorName,
                                     onReply,
                                 }: DiscussionBubbleProps) {
    const { t } = useTranslation()
    const isHead = authorRole === "HEAD"
    const formattedTime = formatTime(message.createdAt)
    const bubbleRef = useRef<HTMLDivElement>(null)
    const textRef = useRef<HTMLParagraphElement>(null)

    // State for floating Telegram-style partial quote popup
    const [selectedQuote, setSelectedQuote] = useState<{
        text: string
        startIndex: number
        endIndex: number
        x: number
        y: number
    } | null>(null)
    // Listen for text selection within this bubble
    const handleMouseUp = () => {
        const selection = window.getSelection()
        if (!selection || selection.isCollapsed || !textRef.current) {
            setSelectedQuote(null)
            return
        }
        const selectedText = selection.toString().trim()
        if (!selectedText) {
            setSelectedQuote(null)
            return
        }
        // Verify the selection is actually inside this message bubble's text
        if (textRef.current.contains(selection.anchorNode) && textRef.current.contains(selection.focusNode)) {
            const fullText = message.text
            const startIndex = fullText.indexOf(selectedText)
            if (startIndex !== -1) {
                const endIndex = startIndex + selectedText.length
                const range = selection.getRangeAt(0)
                const rect = range.getBoundingClientRect()
                const bubbleRect = bubbleRef.current?.getBoundingClientRect() || { top: 0, left: 0 }
                setSelectedQuote({
                    text: selectedText,
                    startIndex,
                    endIndex,
                    x: rect.left + rect.width / 2 - bubbleRect.left,
                    y: rect.top - bubbleRect.top - 8,
                })
                return
            }
        }
        setSelectedQuote(null)
    }
    // Dismiss quote tooltip on click outside or document selection changes
    useEffect(() => {
        const handleDocMouseDown = (e: MouseEvent) => {
            if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
                setSelectedQuote(null)
            }
        }
        document.addEventListener("mousedown", handleDocMouseDown)
        return () => {
            document.removeEventListener("mousedown", handleDocMouseDown)
        }
    }, [])
    const handleApplyQuote = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        if (!selectedQuote) return
        onReply(message, {
            text: selectedQuote.text,
            startIndex: selectedQuote.startIndex,
            endIndex: selectedQuote.endIndex,
        })
        setSelectedQuote(null)
        window.getSelection()?.removeAllRanges()
    }
    // Click-to-scroll to referenced quoted message with highlight flash
    const handleQuoteClick = () => {
        if (!message.replyToMessageId) return
        const targetId = `msg-${message.replyToMessageId}`
        const targetEl = document.getElementById(targetId)
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "center" })
            targetEl.classList.add(
                "ring-2",
                "ring-indigo-500",
                "bg-indigo-50/70",
                "dark:bg-indigo-950/70",
                "rounded-2xl",
                "transition-all",
                "duration-300",
            )
            setTimeout(() => {
                targetEl.classList.remove(
                    "ring-2",
                    "ring-indigo-500",
                    "bg-indigo-50/70",
                    "dark:bg-indigo-950/70",
                )
            }, 1800)
        }
    }
    // Resolve quoted text snippet: partial substring if indices exist, otherwise full text
    const quotedSnippet = (() => {
        if (!replyToMessage) return null
        if (
            typeof message.quoteStartIndex === "number" &&
            typeof message.quoteEndIndex === "number" &&
            message.quoteStartIndex >= 0 &&
            message.quoteEndIndex <= replyToMessage.text.length &&
            message.quoteStartIndex < message.quoteEndIndex
        ) {
            return replyToMessage.text.substring(message.quoteStartIndex, message.quoteEndIndex)
        }
        return replyToMessage.text
    })()

    return (
        <div
            id={`msg-${message.id}`}
            ref={bubbleRef}
            className={`group relative flex flex-col w-full shrink-0 p-1 transition-all duration-300 ${
                isMe ? "items-end" : "items-start"
            }`}
        >
            {/* Floating "Quote" action tooltip when substring is selected */}
            {selectedQuote && (
                <div
                    style={{
                        position: "absolute",
                        left: `${selectedQuote.x}px`,
                        top: `${selectedQuote.y}px`,
                        transform: "translate(-50%, -100%)",
                        zIndex: 30,
                    }}
                    className="animate-in fade-in zoom-in-90 duration-150"
                >
                    <button
                        type="button"
                        onClick={handleApplyQuote}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    >
                        <Quote className="w-3.5 h-3.5 fill-current" />
                        <span>{t("discussion.quote") || "Quote"}</span>
                    </button>
                </div>
            )}
            {/* Author name & Role Badges */}
            <div
                className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] ${
                    isMe ? "flex-row-reverse" : "flex-row"
                }`}
            >
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {isMe ? t("discussion.you") || "You" : authorName}
                </span>

                {isHead ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60 shadow-2xs">
                        <Crown className="w-2.5 h-2.5 text-amber-500 fill-amber-400 shrink-0" />
                        <span>{t("commission.roleHead") || "Head"}</span>
                    </span>
                ) : authorRole === "EXPERT" ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-400">
                        {t("commission.roleExpert") || "Expert"}
                    </span>
                ) : null}
            </div>

            <div
                className={`relative flex items-end gap-1 max-w-[85%] ${
                    isMe ? "flex-row-reverse" : "flex-row"
                }`}
            >
                {/* Main Message Bubble */}
                <div
                    onMouseUp={handleMouseUp}
                    className={`rounded-2xl px-4 py-2.5 shadow-xs text-sm transition-all select-text ${
                        isMe
                            ? "bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-2xl rounded-br-xs"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl rounded-bl-xs"
                    }`}
                >
                    {/* Quoted Message Preview (Click-to-Scroll) */}
                    {replyToMessage && quotedSnippet && (
                        <div
                            onClick={handleQuoteClick}
                            role="button"
                            tabIndex={0}
                            title="Click to jump to quoted message"
                            className={`mb-1 pl-2.5 py-1 text-xs border-l-2 rounded-r transition-all cursor-pointer hover:opacity-85 active:scale-[0.99] select-none ${
                                isMe
                                    ? "border-white/90 bg-black/15 dark:bg-white/10 text-white/95"
                                    : "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 text-slate-600 dark:text-slate-300"
                            }`}
                        >
                            <div className="flex items-center gap-1 font-semibold text-[10px]">
                                <CornerDownRight className="w-3 h-3 opacity-80 shrink-0" />
                                <span className="truncate">
                                    {replyToAuthorName || t("discussion.unknownUser") || "User"}
                                </span>
                            </div>
                            <p className="line-clamp-2 text-[11px] opacity-90 break-words mt-0.5 italic">
                                &ldquo;{quotedSnippet}&rdquo;
                            </p>
                        </div>
                    )}

                    {/* Message Text and Timestamp */}
                    <div className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5">
                        <p
                            ref={textRef}
                            className="flex-1 min-w-[50px] whitespace-pre-wrap break-words leading-snug cursor-text"
                        >
                            {message.text}
                        </p>
                        <span
                            className={`text-[10px] select-none ml-auto shrink-0 leading-tight self-end ${
                                isMe ? "text-indigo-200" : "text-slate-400"
                            }`}
                        >
                            {formattedTime}
                        </span>
                    </div>
                </div>

                {/* Quick Reply Button (Full Message Reply) */}
                <button
                    type="button"
                    onClick={() => onReply(message)}
                    title={t("discussion.reply") || "Reply"}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                >
                    <Reply className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}