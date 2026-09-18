"use client"

import React, { useState, useEffect, useRef } from "react"
import { MessageSquare, X, Wine } from "lucide-react"
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
    members?: Array<{ id?: string; auid: number[] | number; role: string }>
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

    // While the drawer is open, keep lastSeenCountRef in sync with messages.length.
    // This prevents your own sent messages (optimistic update) and any messages
    // arriving while you're actively reading from showing as unread.
    useEffect(() => {
        if (isOpen) {
            lastSeenCountRef.current = messages.length
        }
    }, [isOpen, messages.length])

    // Unread count: messages that arrived since the drawer was last opened
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

    return (
        <>
            {/* Floating Action Button (FAB) at bottom-right */}
            <div className="fixed bottom-6 right-6 z-40">
                <button
                    type="button"
                    onClick={() => {
                        lastSeenCountRef.current = messages.length
                        setIsOpen(true)
                    }}
                    className="relative group flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-600/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                    aria-label={t("discussion.openChat") || "Open Discussion"}
                >
                    <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />

                    {/* Unread badge — only shown when new messages arrived since last open */}
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white font-bold text-[10px] border-2 border-white shadow-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
                    )}
                </button>
            </div>

            {/* Slide-out Drawer (Desktop) / Bottom Sheet (Mobile) */}
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Drawer / Sheet Container */}
                    <div
                        className="fixed z-50 flex flex-col bg-white dark:bg-slate-900 shadow-2xl transition-all
              /* Desktop: Right Slide-out Drawer */
              sm:inset-y-0 sm:right-0 sm:w-[420px] sm:max-w-full sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:animate-in sm:slide-in-from-right
              /* Mobile: Bottom Sheet */
              inset-x-0 bottom-0 max-h-[85vh] h-[600px] rounded-t-3xl border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom"
                    >
                        {/* Mobile Sheet Drag Handle Bar */}
                        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
                            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">
                                        {t("discussion.title") || "Discussion"}
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {candidateCode}
                  </span>
                                    {beverageName && (
                                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-300/60 truncate max-w-[140px]">
                      <Wine className="w-3 h-3 text-amber-700 shrink-0" />
                      <span className="truncate">{beverageName}</span>
                    </span>
                                    )}
                                </div>
                                <span className="text-[11px] text-slate-400 truncate mt-0.5">
                  {commissionName}
                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title={t("common.close") || "Close"}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages Thread */}
                        <DiscussionThread
                            messages={messages}
                            currentAuid={currentAuid}
                            members={members}
                            isLoading={isLoading}
                            onReply={(msg) => setReplyToMessage(msg)}
                        />

                        {/* Input Footer */}
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
