"use client"

import React, { useEffect, useRef, useMemo } from "react"
import { MessageSquareDashed, Loader2 } from "lucide-react"
import { type DiscussionMessage } from "@/app/commission/discussionActions"
import { DiscussionBubble } from "./DiscussionBubble"
import { useUsernames } from "@/hooks/useUsernames"
import { useTranslation } from "@/lib/i18n/context"

interface MemberInfo {
    id?: string
    auid?: number[] | number
    auids?: string[] | number[]
    role: string
}

interface DiscussionThreadProps {
    messages: DiscussionMessage[]
    currentAuid: number | null
    members?: MemberInfo[]
    isLoading: boolean
    onReply: (
        message: DiscussionMessage,
        quote?: { text?: string; startIndex?: number | null; endIndex?: number | null } | null,
    ) => void
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
    // Smart scroll management refs
    const isInitialLoadRef = useRef<boolean>(true)
    const prevMessagesCountRef = useRef<number>(0)
    const isNearBottomRef = useRef<boolean>(true)

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

        const found = members.find((mem: any) => {
            if (Array.isArray(mem.auids)) {
                return mem.auids.map(Number).includes(primaryId)
            }
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

    // Handle user scroll detection: strictly update whether user is positioned at the bottom
    const handleScroll = () => {
        const container = scrollContainerRef.current
        if (!container) return
        // User is considered "at bottom" if within 40px of bottom
        const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
        isNearBottomRef.current = distanceToBottom <= 40
    }

    // Smart auto-scroll logic
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return
        const currentCount = messages.length
        const prevCount = prevMessagesCountRef.current
        // 1. Initial load: auto-scroll to bottom once messages first appear
        if (isInitialLoadRef.current && currentCount > 0) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: "auto",
            })
            isInitialLoadRef.current = false
            prevMessagesCountRef.current = currentCount
            isNearBottomRef.current = true
            return
        }
        // 2. New message(s) arrived
        if (currentCount > prevCount) {
            // Only scroll down if the user was already near the bottom (prevents scroll hijacking while reading)
            if (isNearBottomRef.current) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: "smooth",
                })
            }
            prevMessagesCountRef.current = currentCount
            return
        }
        // 3. Periodic polling refresh without message additions: DO NOT scroll
        prevMessagesCountRef.current = currentCount
    }, [messages])

    if (isLoading && messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mb-2" />
                <span className="text-xs font-medium">
                    {t("discussion.loadingMessages") || "Loading conversation..."}
                </span>
            </div>
        )
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 select-none">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mb-2.5 shadow-xs">
                    <MessageSquareDashed className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {t("discussion.noMessagesTitle") || "No messages yet"}
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[220px] mt-1 leading-normal">
                    {t("discussion.noMessagesDesc") || "Start the discussion for this wine candidate with other commission experts."}
                </p>
            </div>
        )
    }

    return (
        <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scroll-smooth"
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