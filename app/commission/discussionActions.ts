"use server"

import { cookies } from "next/headers"
import { fetchGraphQLRaw } from "../../lib/apiClient"

export interface DiscussionMessage {
    id: string
    replicaCandidateId: string
    authorAuid: number[]
    text: string
    createdAt: string
    replyToMessageId?: string | null
}

export interface SendDiscussionMessageInput {
    replicaCandidateId: string
    text: string
    replyToMessageId?: string | null
}

export interface DiscussionResponse<T = unknown> {
    success: boolean
    data?: T
    messages?: DiscussionMessage[]
    message?: DiscussionMessage
    enabled?: boolean
    error?: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isValidId(id: string | null | undefined): boolean {
    if (!id || typeof id !== "string") return false
    const trimmed = id.trim()
    return trimmed.length > 0 && trimmed.length <= 128
}

export type DiscussionPolicy = "ALWAYS" | "AFTER_EVALUATION" | "DISABLED"
// In-memory fallback stores for when upstream GraphQL is not yet deployed or available
const mockMessagesStore = new Map<string, DiscussionMessage[]>()

async function getActorHeaders(): Promise<{ headers: Record<string, string>; auid: number }> {
    const cookieStore = await cookies()
    const auidStr = cookieStore.get("auid")?.value
    if (!auidStr) {
        throw new Error("Unauthorized: Please sign in")
    }
    const cleanAuid = auidStr.trim()
    const auidNum = parseInt(cleanAuid, 10) || 0
    const token = cookieStore.get("axus_access_token")?.value
    const headers: Record<string, string> = {
        "X-ACTOR": cleanAuid,
        actor: cleanAuid,
        "x-actor": cleanAuid,
    }
    if (token) {
        headers["Authorization"] = `Bearer ${token}`
    }
    return {
        headers,
        auid: auidNum,
    }
}

/**
 * Fetches discussion messages for a specific ReplicaCandidate.
 * Ordered chronologically by createdAt ascending.
 */
export async function getDiscussionMessagesAction(
    replicaCandidateId: string,
): Promise<{ success: boolean; messages: DiscussionMessage[]; error?: string }> {
    const cleanId = typeof replicaCandidateId === "string" ? replicaCandidateId.trim() : ""
    if (!isValidId(cleanId)) {
        return { success: false, messages: [], error: "Invalid replicaCandidateId" }
    }

    try {
        const { headers } = await getActorHeaders()
        const data = await fetchGraphQLRaw<any, { replicaCandidateId: string }>(
            `
        query GetDiscussionMessages($replicaCandidateId: ID!) {
          discussionMessagesByReplicaCandidate(replicaCandidateId: $replicaCandidateId) {
            items {
              id
              replicaCandidateId
              authorAuid
              text
              replyToId
              quoteStartIndex
              quoteEndIndex
              createdAt
              editedAt
            }
          }
        }
      `,
            { replicaCandidateId: cleanId },
            headers,
        )

        const rawItems = data?.discussionMessagesByReplicaCandidate?.items
        if (Array.isArray(rawItems)) {
            const messages: DiscussionMessage[] = rawItems.map((m: any) => ({
                id: String(m.id),
                replicaCandidateId: String(m.replicaCandidateId),
                authorAuid: Array.isArray(m.authorAuid) ? m.authorAuid.flat() : [Number(m.authorAuid)],
                text: String(m.text || ""),
                createdAt: m.createdAt || new Date().toISOString(),
                replyToMessageId: m.replyToId ? String(m.replyToId) : null,
            }))
            mockMessagesStore.set(cleanId, messages)
            return { success: true, messages }
        }
    } catch (err: any) {
        // Upstream GraphQL error -> fallback to mock store
    }

    const messages = mockMessagesStore.get(cleanId) || []
    return { success: true, messages: [...messages] }
}

/**
 * Sends a discussion message scoped to a specific ReplicaCandidate.
 */
export async function sendDiscussionMessageAction(
    input: SendDiscussionMessageInput,
): Promise<{ success: boolean; message?: DiscussionMessage; error?: string }> {
    const { replicaCandidateId, text, replyToMessageId } = input
    const cleanId = typeof replicaCandidateId === "string" ? replicaCandidateId.trim() : ""

    if (!isValidId(replicaCandidateId)) {
        return { success: false, error: "Invalid replicaCandidateId" }
    }

    const trimmedText = (text || "").trim()
    if (!trimmedText) {
        return { success: false, error: "Message text cannot be empty" }
    }

    let actorInfo: { headers: Record<string, string>; auid: number }
    try {
        actorInfo = await getActorHeaders()
    } catch (authErr: any) {
        return { success: false, error: authErr?.message || "Unauthorized" }
    }

    try {
        const data = await fetchGraphQLRaw<any, { input: any }>(
            `
        mutation PostDiscussionMessage($input: PostDiscussionMessageInput!) {
          postDiscussionMessage(input: $input) {
            id
            replicaCandidateId
            authorAuid
            text
            replyToId
            quoteStartIndex
            quoteEndIndex
            createdAt
            editedAt
          }
        }
      `,
            {
                input: {
                    replicaCandidateId: cleanId,
                    text: trimmedText,
                    replyToId: replyToMessageId || null,
                },
            },
            actorInfo.headers,
        )

        if (data?.postDiscussionMessage) {
            const raw = data.postDiscussionMessage
            const message: DiscussionMessage = {
                id: String(raw.id),
                replicaCandidateId: String(raw.replicaCandidateId),
                authorAuid: Array.isArray(raw.authorAuid) ? raw.authorAuid.flat() : [Number(raw.authorAuid)],
                text: String(raw.text || trimmedText),
                createdAt: raw.createdAt || new Date().toISOString(),
                replyToMessageId: raw.replyToId ? String(raw.replyToId) : null,
            }

            // Sync mock store as well
            const list = mockMessagesStore.get(cleanId) || []
            mockMessagesStore.set(cleanId, [...list, message])

            return { success: true, message }
        }
    } catch (err: any) {
        console.warn("GraphQL PostDiscussionMessage fallback to memory store:", err?.message || err)
    }

    // Fallback creation for local testing and when backend GraphQL is not yet deployed
    const randomSuffix = Math.random().toString(36).substring(2, 9)
    const fallbackMessage: DiscussionMessage = {
        id: `msg_${Date.now()}_${randomSuffix}`,
        replicaCandidateId: cleanId,
        authorAuid: [actorInfo.auid],
        text: trimmedText,
        createdAt: new Date().toISOString(),
        replyToMessageId: replyToMessageId ? String(replyToMessageId).trim() : null,
    }

    const existingList = mockMessagesStore.get(cleanId) || []
    mockMessagesStore.set(cleanId, [...existingList, fallbackMessage])

    return { success: true, message: fallbackMessage }
}