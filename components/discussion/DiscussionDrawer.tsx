"use client"

import React, { useState, useEffect, useRef } from "react"
import { MessageSquare, X, Wine, ChevronDown } from "lucide-react"
import { useDiscussion } from "@/hooks/useDiscussion"
import { DiscussionThread } from "./DiscussionThread"
import { MessageInput } from "./MessageInput"
import { useTranslation } from "@/lib/i18n/context"
import Cookies from "js-cookie"

export interface DiscussionDrawerProps {
    replicaCandidateId: string
    candidateCode: string
    beverageName?: string | null
    commissionName: string
    members?: any[]
    discussionsEnabled?: boolean
}

export function DiscussionDrawer({
                                     replicaCandidateId,
                                     candidateCode,
                                     beverageName,
                                     commissionName,
                                     members = [],
                                     discussionsEnabled = true,
                                 }: DiscussionDrawerProps) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [currentAuid, setCurrentAuid] = useState<number | null>(null)
    // Tracks how many messages were seen the last time the drawer was opened.
    const lastSeenCountRef = useRef<number>(0)

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) {
            setCurrentAuid(parseInt(cookieAuid, 10))
        }
    }, [])

    // Hook handles short-polling every 3s and optimistic messaging
    const {
        messages,
        isLoading,
        isSending,
        replyToMessage,
        setReplyToMessage,
        clearReply,
        sendMessage,
    } = useDiscussion({
        replicaCandidateId,
        currentAuid,
        enabled: discussionsEnabled,
        pollIntervalMs: 3000,
    })

    // While the widget is open, keep lastSeenCountRef in sync with messages.length.
    // This prevents your own sent messages (optimistic update) and any messages
    // arriving while you're actively reading from showing as unread.
    useEffect(() => {
        if (isOpen) {
            lastSeenCountRef.current = messages.length
        }
    }, [isOpen, messages.length])

    // Unread count: messages that arrived since the widget was last opened
    const unreadCount = Math.max(0, messages.length - lastSeenCountRef.current)

    // If discussions are disabled by organizer, completely hide UI per specification
    if (!discussionsEnabled) {
        return null
    }

    // Find author name for quoted reply banner
    const replyAuthorName = replyToMessage
        ? (() => {
            const id = replyToMessage.authorAuid[0]
            return id ? `@expert_${id}` : t("discussion.user") || "User"
        })()
        : null

    const handleToggle = () => {
        if (!isOpen) {
            lastSeenCountRef.current = messages.length
        }
        setIsOpen((prev) => !prev)
    }

    return (
        <>
            {/* Floating Action Button (FAB) at bottom-right */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    type="button"
                    onClick={handleToggle}
                    className="relative group flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-600/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                    aria-label={isOpen ? (t("common.close") || "Close discussion") : (t("discussion.openChat") || "Open Discussion")}
                >
                    <div className="relative w-6 h-6 flex items-center justify-center">
                        <ChevronDown
                            className={`w-6 h-6 absolute transition-all duration-200 ease-in-out ${
                                isOpen
                                    ? "rotate-0 opacity-100 scale-100"
                                    : "-rotate-90 opacity-0 scale-50 pointer-events-none"
                            }`}
                        />
                        <MessageSquare
                            className={`w-6 h-6 absolute transition-all duration-200 ease-in-out ${
                                isOpen
                                    ? "rotate-90 opacity-0 scale-50 pointer-events-none"
                                    : "rotate-0 opacity-100 scale-100 group-hover:scale-110"
                            }`}
                        />
                    </div>

                    {/* Unread badge — only shown when chat is closed and new messages arrived */}
                    {!isOpen && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white font-bold text-[10px] border-2 border-white dark:border-slate-900 shadow-xs animate-in zoom-in-75">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Floating Chat Widget Popup */}
            {isOpen && (
                <div className="fixed z-50 bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] h-[550px] max-h-[calc(100vh-7.5rem)] origin-bottom-right animate-in zoom-in-95 fade-in duration-200">
                    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800">
                        {/* Header Area */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 select-none">
                            <div className="flex items-center gap-2 min-w-0">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
                                    {t("discussion.title") || "Discussion"}
                                </h3>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 shrink-0">
                                    {candidateCode}
                                </span>
                                {beverageName && (
                                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-300/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50 truncate max-w-[130px] shrink-0">
                                        <Wine className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                                        <span className="truncate">{beverageName}</span>
                                    </span>
                                )}
                            </div>

                            {/* Top-right Close Button */}
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer ml-2"
                                title={t("common.close") || "Close"}
                                aria-label={t("common.close") || "Close"}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Message Thread (Body) */}
                        <DiscussionThread
                            messages={messages}
                            currentAuid={currentAuid}
                            members={members}
                            isLoading={isLoading}
                            onReply={(msg) => setReplyToMessage(msg)}
                        />
                        {/* Input Area (Footer) */}
                        <MessageInput
                            replyTo={replyToMessage}
                            replyToAuthorName={replyAuthorName}
                            onCancelReply={clearReply}
                            onSend={sendMessage}
                            isSending={isSending}
                        />
                    </div>
                </div>
            )}
        </>
    )
}