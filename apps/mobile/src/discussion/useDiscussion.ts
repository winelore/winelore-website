import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, type AppStateStatus } from "react-native"
import * as Haptics from "expo-haptics"
import { useAuth } from "../auth/AuthProvider"
import { fetchDiscussionMessages, fetchReplicaMembersByCandidate, sendDiscussionMessage } from "./api"
import type { DiscussionMember, DiscussionMessage, DiscussionQuote } from "./types"

export interface UseDiscussionOptions {
    replicaCandidateId: string | null | undefined
    currentAuid?: number | null
    initialMembers?: DiscussionMember[]
    enabled?: boolean
    pollIntervalMs?: number
}

export interface UseDiscussionReturn {
    messages: DiscussionMessage[]
    members: DiscussionMember[]
    currentAuid: number | null
    isLoading: boolean
    isSending: boolean
    error: string | null
    replyToMessage: DiscussionMessage | null
    replyQuote: DiscussionQuote | null
    setReplyToMessage: (message: DiscussionMessage | null, quote?: DiscussionQuote | null) => void
    clearReply: () => void
    sendMessage: (text: string) => Promise<boolean>
    refresh: () => Promise<void>
}

export function useDiscussion({
                                  replicaCandidateId,
                                  currentAuid: propCurrentAuid,
                                  initialMembers,
                                  enabled = true,
                                  pollIntervalMs = 3000,
                              }: UseDiscussionOptions): UseDiscussionReturn {
    const { session } = useAuth()
    const resolvedAuid = propCurrentAuid ?? (session?.auid ? Number(session.auid) : 0)

    const [messages, setMessages] = useState<DiscussionMessage[]>([])
    const [members, setMembers] = useState<DiscussionMember[]>(initialMembers ?? [])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isSending, setIsSending] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [replyToMessage, setReplyToMessageState] = useState<DiscussionMessage | null>(null)
    const [replyQuote, setReplyQuote] = useState<DiscussionQuote | null>(null)

    const pendingOptimisticIdsRef = useRef<Set<string>>(new Set())
    const isMountedRef = useRef<boolean>(true)
    const cleanCandidateId = (replicaCandidateId || "").trim()

    // 1. Fetch only messages — stable callback with no circular dependencies
    const fetchMessages = useCallback(
        async (showLoading = false) => {
            if (!cleanCandidateId || !enabled) return

            if (showLoading) setIsLoading(true)
            try {
                const fetchedMessages = await fetchDiscussionMessages(cleanCandidateId, resolvedAuid)
                if (!isMountedRef.current) return

                setMessages((prev) => {
                    const pending = prev.filter((m) => pendingOptimisticIdsRef.current.has(m.id))
                    const combined = [...pending, ...fetchedMessages]
                    const seen = new Set<string>()
                    const deduped: DiscussionMessage[] = []

                    for (const m of combined) {
                        if (!seen.has(m.id)) {
                            seen.add(m.id)
                            deduped.push(m)
                        }
                    }

                    return deduped.sort(
                        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    )
                })
                setError(null)
            } catch (err) {
                if (!isMountedRef.current) return
                setError(err instanceof Error ? err.message : "Failed to load messages")
            } finally {
                if (isMountedRef.current && showLoading) {
                    setIsLoading(false)
                }
            }
        },
        [cleanCandidateId, enabled, resolvedAuid],
    )

    // 2. Fetch member roles once per candidateId — decoupled from message polling
    useEffect(() => {
        if (!cleanCandidateId || !enabled) return
        let active = true

        if (initialMembers && initialMembers.length > 0) {
            setMembers(initialMembers)
            return
        }

        fetchReplicaMembersByCandidate(cleanCandidateId).then((fetched) => {
            if (active && fetched.length > 0) {
                setMembers(fetched)
            }
        })

        return () => {
            active = false
        }
    }, [cleanCandidateId, enabled]) // Stable primitives only

    // 3. Reset state & initial fetch when candidate changes
    useEffect(() => {
        isMountedRef.current = true
        setMessages([])
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

    // 4. Battery-optimized AppState polling
    useEffect(() => {
        if (!cleanCandidateId || !enabled) return

        let timerId: ReturnType<typeof setInterval> | null = null

        const startPolling = () => {
            if (timerId) return
            timerId = setInterval(() => {
                if (AppState.currentState === "active") {
                    fetchMessages(false)
                }
            }, pollIntervalMs)
        }

        const stopPolling = () => {
            if (timerId) {
                clearInterval(timerId)
                timerId = null
            }
        }

        const handleAppStateChange = (nextState: AppStateStatus) => {
            if (nextState === "active") {
                fetchMessages(false)
                startPolling()
            } else {
                stopPolling()
            }
        }

        startPolling()
        const subscription = AppState.addEventListener("change", handleAppStateChange)

        return () => {
            stopPolling()
            subscription.remove()
        }
    }, [cleanCandidateId, enabled, pollIntervalMs, fetchMessages])

    const setReplyToMessage = useCallback(
        (message: DiscussionMessage | null, quote?: DiscussionQuote | null) => {
            setReplyToMessageState(message)
            setReplyQuote(quote ?? null)
        },
        [],
    )

    const clearReply = useCallback(() => {
        setReplyToMessageState(null)
        setReplyQuote(null)
    }, [])

    const sendMessage = useCallback(
        async (text: string): Promise<boolean> => {
            const trimmed = text.trim()
            if (!trimmed || !cleanCandidateId) return false

            const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            const replyId = replyToMessage?.id ?? null
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

            pendingOptimisticIdsRef.current.add(tempId)
            setMessages((prev) => [optimisticMessage, ...prev])
            clearReply()
            setIsSending(true)

            sendDiscussionMessage(
                {
                    replicaCandidateId: cleanCandidateId,
                    text: trimmed,
                    replyToMessageId: replyId,
                    quoteStartIndex: quoteStart,
                    quoteEndIndex: quoteEnd,
                },
                resolvedAuid,
            )
                .then((serverMessage) => {
                    if (!isMountedRef.current) return
                    pendingOptimisticIdsRef.current.delete(tempId)
                    setMessages((prev) =>
                        prev.map((msg) => (msg.id === tempId ? serverMessage : msg)),
                    )
                })
                .catch((err) => {
                    if (!isMountedRef.current) return
                    pendingOptimisticIdsRef.current.delete(tempId)
                    setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                    setError(err instanceof Error ? err.message : "Failed to send message")
                })
                .finally(() => {
                    if (isMountedRef.current) {
                        setIsSending(false)
                    }
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
        members,
        currentAuid: resolvedAuid,
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