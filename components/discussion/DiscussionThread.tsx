"use client"

import React, { useEffect, useRef, useMemo } from "react"
import { MessageSquareDashed, Loader2 } from "lucide-react"
import { type DiscussionMessage } from "@/app/commission/discussionActions"
import { DiscussionBubble } from "./DiscussionBubble"
import { useUsernames } from "@/hooks/useUsernames"
import { useTranslation } from "@/lib/i18n/context"

interface MemberInfo {
    id?: string
    auid: number[] | number
    role: string
}

interface DiscussionThreadProps {
    messages: DiscussionMessage[]
    currentAuid: number | null
    members?: MemberInfo[]
    isLoading: boolean
    onReply: (message: DiscussionMessage) => void
}

export function DiscussionThread({
                                     messages,
                                     currentAuid,
                                     members = [],
                                     isLoading,
                                     onReply,
                                 }: DiscussionThreadProps) {
    const { t } = useTranslation()
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const shouldAutoScrollRef = useRef<boolean>(true)

    // Collect all author auids to batch fetch usernames
    const allAuids = useMemo(() => {
        const set = new Set<number>()
        messages.forEach((m) => {
            if (Array.isArray(m.authorAuid)) {
                m.authorAuid.forEach((id) => set.add(id))
            }
        })
        return Array.from(set)
    }, [messages])

    const { usernames } = useUsernames(allAuids)

    // Quick message lookup by ID for reply quotes
    const messagesById = useMemo(() => {
        const map = new Map<string, DiscussionMessage>()
        messages.forEach((m) => map.set(m.id, m))
        return map
    }, [messages])

    // Helper to find member role
    const getMemberRole = (authorAuid: number[]): string | null => {
        if (!members || members.length === 0) return null
        const primaryId = authorAuid[0]
        if (primaryId === undefined) return null

        const found = members.find((mem) => {
            if (Array.isArray(mem.auid)) {
                return mem.auid.includes(primaryId)
            }
            return mem.auid === primaryId
        })
        return found ? found.role : null
    }

    // Helper to format author username
    const getAuthorName = (authorAuid: number[]): string => {
        const primaryId = authorAuid[0]
        if (!primaryId) return t("discussion.user") || "User"
        return usernames[primaryId] || usernames[String(primaryId)] || `@expert_${primaryId}`
    }

    // Handle user scroll detection: only auto-scroll if already near bottom
    const handleScroll = () => {
        const container = scrollContainerRef.current
        if (!container) return
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120
        shouldAutoScrollRef.current = isNearBottom
    }

    // Auto-scroll to bottom on new messages if near bottom
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return
        if (shouldAutoScrollRef.current) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: messages.length <= 1 ? "auto" : "smooth",
            })
        }
    }, [messages])

    if (isLoading && messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                <span className="text-xs font-medium">{t("discussion.loadingMessages") || "Loading conversation..."}</span>
            </div>
        )
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mb-3 shadow-inner">
                    <MessageSquareDashed className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {t("discussion.noMessagesTitle") || "No messages yet"}
                </h4>
                <p className="text-xs text-slate-400 max-w-[240px] mt-1">
                    {t("discussion.noMessagesDesc") || "Start the discussion for this wine candidate with other commission experts."}
                </p>
            </div>
        )
    }

    return (
        <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        >
            {messages.map((message) => {
                const isMe = currentAuid !== null && message.authorAuid.includes(currentAuid)
                const authorName = getAuthorName(message.authorAuid)
                const authorRole = getMemberRole(message.authorAuid)

                let replyToMsg: DiscussionMessage | null = null
                let replyToAuthorName: string | null = null

                if (message.replyToMessageId) {
                    replyToMsg = messagesById.get(message.replyToMessageId) || null
                    if (replyToMsg) {
                        replyToAuthorName = getAuthorName(replyToMsg.authorAuid)
                    }
                }

                return (
                    <DiscussionBubble
                        key={message.id}
                        message={message}
                        isMe={isMe}
                        authorName={authorName}
                        authorRole={authorRole}
                        replyToMessage={replyToMsg}
                        replyToAuthorName={replyToAuthorName}
                        onReply={onReply}
                    />
                )
            })}
        </div>
    )
}
