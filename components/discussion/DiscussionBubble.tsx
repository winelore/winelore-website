"use client"

import React from "react"
import { Crown, Reply, CornerDownRight } from "lucide-react"
import { type DiscussionMessage } from "@/app/commission/discussionActions"
import { useTranslation } from "@/lib/i18n/context"

interface DiscussionBubbleProps {
    message: DiscussionMessage
    isMe: boolean
    authorName: string
    authorRole?: string | null
    replyToMessage?: DiscussionMessage | null
    replyToAuthorName?: string | null
    onReply: (message: DiscussionMessage) => void
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

    return (
        <div className={`group flex flex-col w-full shrink-0 ${isMe ? "items-end" : "items-start"}`}>
            {/* Author name & Role Badges */}
            <div className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
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

            <div className={`relative flex items-end gap-1 max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {/* Main Message Bubble */}
                <div
                    className={`rounded-2xl px-4 py-2.5 shadow-xs text-sm transition-all ${
                        isMe
                            ? "bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-2xl rounded-br-xs"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl rounded-bl-xs"
                    }`}
                >
                    {/* Quoted Message Preview inside bubble */}
                    {replyToMessage && (
                        <div
                            className={`mb-1 pl-2 py-0.5 text-xs border-l-2 rounded-r ${
                                isMe
                                    ? "border-white/90 bg-black/10 dark:bg-white/10 text-white/95"
                                    : "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-slate-600 dark:text-slate-300"
                            }`}
                        >
                            <div className="flex items-center gap-1 font-semibold text-[10px]">
                                <CornerDownRight className="w-3 h-3 opacity-80 shrink-0" />
                                <span className="truncate">{replyToAuthorName || t("discussion.unknownUser") || "User"}</span>
                            </div>
                            <p className="line-clamp-1 text-[11px] opacity-90 break-words mt-0.5">
                                {replyToMessage.text}
                            </p>
                        </div>
                    )}

                    {/* Message Text and Timestamp */}
                    <div className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5">
                        <p className="flex-1 min-w-[50px] whitespace-pre-wrap break-words leading-snug">
                            {message.text}
                        </p>
                        <span className={`text-[10px] select-none ml-auto shrink-0 leading-tight self-end ${
                            isMe ? "text-indigo-200" : "text-slate-400"
                        }`}>
                            {formattedTime}
                        </span>
                    </div>
                </div>

                {/* Quick Reply Button (Revealed on hover) */}
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