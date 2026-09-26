"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import Cookies from "js-cookie"
import {
    getDiscussionMessagesAction,
    sendDiscussionMessageAction,
    type DiscussionMessage,
} from "@/app/commission/discussionActions"

export interface UseDiscussionOptions {
    replicaCandidateId: string | null | undefined
    currentAuid?: number | null
    enabled?: boolean
    pollIntervalMs?: number
}

export interface UseDiscussionReturn {
    messages: DiscussionMessage[]
    isLoading: boolean
    isSending: boolean
    error: string | null
    replyToMessage: DiscussionMessage | null
    replyQuote: { text?: string; startIndex?: number | null; endIndex?: number | null } | null
    setReplyToMessage: (message: DiscussionMessage | null, quote?: { text?: string; startIndex?: number | null; endIndex?: number | null } | null) => void
    clearReply: () => void
    sendMessage: (text: string) => Promise<boolean>
    refresh: () => Promise<void>
}

export function useDiscussion({
                                  replicaCandidateId,
                                  currentAuid: propCurrentAuid,
                                  enabled = true,
                                  pollIntervalMs = 3000,
                              }: UseDiscussionOptions): UseDiscussionReturn {
    const [messages, setMessages] = useState<DiscussionMessage[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isSending, setIsSending] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [replyToMessage, setReplyToMessageState] = useState<DiscussionMessage | null>(null)
    const [replyQuote, setReplyQuote] = useState<{ text?: string; startIndex?: number | null; endIndex?: number | null } | null>(null)

    // Track pending optimistic messages so polling doesn't overwrite them in flight
    const pendingOptimisticIdsRef = useRef<Set<string>>(new Set())
    const isMountedRef = useRef<boolean>(true)

    // Resolve current auid from props or cookies
    const resolvedAuid = propCurrentAuid ?? (() => {
        const cookieVal = typeof window !== "undefined" ? Cookies.get("auid") : null
        return cookieVal ? parseInt(cookieVal, 10) : 0
    })()

    // Clean candidate id
    const cleanCandidateId = (replicaCandidateId || "").trim()

    // Fetch messages from server action
    const fetchMessages = useCallback(
        async (showLoading = false) => {
            if (!cleanCandidateId || !enabled) return

            if (showLoading) setIsLoading(true)
            try {
                const res = await getDiscussionMessagesAction(cleanCandidateId)
                if (!isMountedRef.current) return

                if (res.success && Array.isArray(res.messages)) {
                    setMessages((prev) => {
                        // Retain any pending optimistic messages that haven't been settled yet
                        const pending = prev.filter((m) => pendingOptimisticIdsRef.current.has(m.id))
                        return [...res.messages, ...pending]
                    })
                    setError(null)
                } else if (res.error) {
                    setError(res.error)
                }
            } catch (err: any) {
                if (!isMountedRef.current) return
                console.error("Failed to fetch discussion messages:", err)
                setError(err?.message || "Failed to load messages")
            } finally {
                if (isMountedRef.current && showLoading) {
                    setIsLoading(false)
                }
            }
        },
        [cleanCandidateId, enabled],
    )

    // Reset state and run initial fetch on candidate change
    useEffect(() => {
        isMountedRef.current = true
        setMessages([])
        setReplyToMessage(null)
        setReplyToMessageState(null)
        setReplyQuote(null)
        setError(null)
        pendingOptimisticIdsRef.current.clear()

        if (cleanCandidateId && enabled) {
            fetchMessages(true)
        } else {
            setIsLoading(false)
        }

        return () => {
            isMountedRef.current = false
        }
    }, [cleanCandidateId, enabled, fetchMessages])

    // Polling loop with visibility change detection
    useEffect(() => {
        if (!cleanCandidateId || !enabled) return

        let intervalId: ReturnType<typeof setInterval> | null = null

        const startPolling = () => {
            if (intervalId) return
            intervalId = setInterval(() => {
                if (typeof document !== "undefined" && document.visibilityState === "hidden") {
                    return // Pause polling while tab/document is hidden to save resources
                }
                fetchMessages(false)
            }, pollIntervalMs)
        }

        const stopPolling = () => {
            if (intervalId) {
                clearInterval(intervalId)
                intervalId = null
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                // Immediately fetch fresh messages when user switches back to tab
                fetchMessages(false)
                startPolling()
            } else {
                stopPolling()
            }
        }

        startPolling()
        document.addEventListener("visibilitychange", handleVisibilityChange)

        return () => {
            stopPolling()
            document.removeEventListener("visibilitychange", handleVisibilityChange)
        }
    }, [cleanCandidateId, enabled, pollIntervalMs, fetchMessages])

    const setReplyToMessage = useCallback((message: DiscussionMessage | null, quote?: { text?: string; startIndex?: number | null; endIndex?: number | null } | null) => {
        setReplyToMessageState(message)
        setReplyQuote(quote || null)
    }, [])

    const clearReply = useCallback(() => {
        setReplyToMessage(null)
        setReplyToMessageState(null)
        setReplyQuote(null)
    }, [])

    // Send message with instant optimistic UI update and background sync (fire-and-forget style)
    const sendMessage = useCallback(
        async (text: string): Promise<boolean> => {
            const trimmed = text.trim()
            if (!trimmed || !cleanCandidateId) return false

            const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
            const replyId = replyToMessage ? replyToMessage.id : null
            const quoteStart = replyQuote?.startIndex ?? null
            const quoteEnd = replyQuote?.endIndex ?? null

            const optimisticMessage: DiscussionMessage = {
                id: tempId,
                replicaCandidateId: cleanCandidateId,
                authorAuid: [resolvedAuid || 0],
                text: trimmed,
                createdAt: new Date().toISOString(),
                replyToMessageId: replyId,
                quoteStartIndex: quoteStart,
                quoteEndIndex: quoteEnd,
            }

            // Immediately and synchronously update messages array (zero UI lag)
            pendingOptimisticIdsRef.current.add(tempId)
            setMessages((prev) => [...prev, optimisticMessage])
            clearReply()
            // Fire-and-forget server action in background without blocking button or UI
            sendDiscussionMessageAction({
                replicaCandidateId: cleanCandidateId,
                text: trimmed,
                replyToMessageId: replyId,
                quoteStartIndex: quoteStart,
                quoteEndIndex: quoteEnd,
            })
                .then((res) => {
                    if (!isMountedRef.current) return
                    pendingOptimisticIdsRef.current.delete(tempId)

                    if (res.success && res.message) {
                        const serverMessage = res.message
                        // Swap temporary message with persisted server message
                        setMessages((prev) =>
                            prev.map((msg) => (msg.id === tempId ? serverMessage : msg)),
                        )
                    } else {
                        // Rollback optimistic update on error
                        setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
                        const errorMsg = res.error || "Failed to send message"
                        toast.error(errorMsg)
                    }
                })
                .catch((err: any) => {
                    if (!isMountedRef.current) return
                    pendingOptimisticIdsRef.current.delete(tempId)
                    // Rollback optimistic update on exception
                    setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
                    const errorMsg = err?.message || "An unexpected error occurred while sending message"
                    toast.error(errorMsg)
                })
            return true
        },
        [cleanCandidateId, replyToMessage, replyQuote, resolvedAuid, clearReply],
    )

    const refresh = useCallback(async () => {
        await fetchMessages(false)
    }, [fetchMessages])

    return {
        messages,
        isLoading,
        isSending,
        error,
        replyToMessage,
        replyQuote,
        setReplyToMessage,
        clearReply,
        sendMessage,
        refresh,
    }
}