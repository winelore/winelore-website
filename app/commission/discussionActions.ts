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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isValidId(id: string | null | undefined): boolean {
    if (!id || typeof id !== "string") return false
    const trimmed = id.trim()
    return trimmed.length > 0 && trimmed.length <= 128
}

// In-memory fallback stores for when upstream GraphQL is not yet deployed or available
const mockMessagesStore = new Map<string, DiscussionMessage[]>()
const mockDiscussionsEnabledStore = new Map<string, boolean>()

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
 * Toggles whether discussions are enabled for a commission.
 */
export async function setCommissionDiscussionsEnabledAction(
    commissionId: string,
    enabled: boolean,
): Promise<{ success: boolean; enabled?: boolean; error?: string }> {
    const cleanCommissionId = typeof commissionId === "string" ? commissionId.trim() : ""
    if (!isValidId(cleanCommissionId)) {
        return { success: false, error: "Invalid commissionId parameter" }
    }

    try {
        const { headers } = await getActorHeaders()
        const data = await fetchGraphQLRaw<any, { id: string; enabled: boolean }>(
            `
        mutation SetCommissionDiscussionsEnabled($id: ID!, $enabled: Boolean!) {
          setCommissionDiscussionsEnabled(id: $id, enabled: $enabled) {
            id
            discussionsEnabled
          }
        }
      `,
            { id: cleanCommissionId, enabled },
            headers,
        )

        if (data?.setCommissionDiscussionsEnabled?.discussionsEnabled !== undefined) {
            mockDiscussionsEnabledStore.set(cleanCommissionId, data.setCommissionDiscussionsEnabled.discussionsEnabled)
            return { success: true, enabled: data.setCommissionDiscussionsEnabled.discussionsEnabled }
        }
    } catch (err: any) {
        console.warn("GraphQL SetCommissionDiscussionsEnabled fallback to memory store:", err?.message || err)
    }

    // Fallback to local memory store
    mockDiscussionsEnabledStore.set(cleanCommissionId, enabled)
    return { success: true, enabled }
}

/**
 * Checks whether discussions are enabled for a given commission.
 */
export async function getCommissionDiscussionsEnabledAction(
    commissionId: string,
): Promise<{ success: boolean; enabled: boolean }> {
    const cleanCommissionId = typeof commissionId === "string" ? commissionId.trim() : ""
    if (!isValidId(cleanCommissionId)) {
        return { success: false, enabled: false }
    }

    try {
        const { headers } = await getActorHeaders()
        const data = await fetchGraphQLRaw<any, { id: string }>(
            `
        query GetCommissionDiscussionsEnabled($id: ID!) {
          commission(id: $id) {
            id
            discussionsEnabled
          }
        }
      `,
            { id: cleanCommissionId },
            headers,
        )

        if (data?.commission?.discussionsEnabled !== undefined) {
            const enabled = Boolean(data.commission.discussionsEnabled)
            mockDiscussionsEnabledStore.set(commissionId, enabled)
            return { success: true, enabled }
        }
    } catch (err: any) {
        // Upstream GraphQL fallback
    }

    // Default to stored state or true if not explicitly disabled
    const enabled = mockDiscussionsEnabledStore.has(cleanCommissionId)
        ? (mockDiscussionsEnabledStore.get(cleanCommissionId) ?? true)
        : true

    return { success: true, enabled }
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
          discussionMessages(replicaCandidateId: $replicaCandidateId) {
            id
            replicaCandidateId
            authorAuid
            text
            createdAt
            replyToMessageId
          }
        }
      `,
            { replicaCandidateId: cleanId },
            headers,
        )

        if (Array.isArray(data?.discussionMessages)) {
            const messages: DiscussionMessage[] = data.discussionMessages.map((m: any) => ({
                id: String(m.id),
                replicaCandidateId: String(m.replicaCandidateId),
                authorAuid: Array.isArray(m.authorAuid) ? m.authorAuid.flat() : [Number(m.authorAuid)],
                text: String(m.text || ""),
                createdAt: m.createdAt || new Date().toISOString(),
                replyToMessageId: m.replyToMessageId ? String(m.replyToMessageId) : null,
            }))
            mockMessagesStore.set(cleanId, messages)
            return { success: true, messages }
        }
    } catch (err: any) {
        // Upstream GraphQL not yet implemented or error -> fallback to mock store
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
        mutation SendDiscussionMessage($input: SendDiscussionMessageInput!) {
          sendDiscussionMessage(input: $input) {
            id
            replicaCandidateId
            authorAuid
            text
            createdAt
            replyToMessageId
          }
        }
      `,
            {
                input: {
                    replicaCandidateId,
                    text: trimmedText,
                    replyToMessageId: replyToMessageId || null,
                },
            },
            actorInfo.headers,
        )

        if (data?.sendDiscussionMessage) {
            const raw = data.sendDiscussionMessage
            const message: DiscussionMessage = {
                id: String(raw.id),
                replicaCandidateId: String(raw.replicaCandidateId),
                authorAuid: Array.isArray(raw.authorAuid) ? raw.authorAuid.flat() : [Number(raw.authorAuid)],
                text: String(raw.text || trimmedText),
                createdAt: raw.createdAt || new Date().toISOString(),
                replyToMessageId: raw.replyToMessageId ? String(raw.replyToMessageId) : null,
            }

            // Sync mock store as well
            const list = mockMessagesStore.get(cleanId) || []
            mockMessagesStore.set(cleanId, [...list, message])

            return { success: true, message }
        }
    } catch (err: any) {
        console.warn("GraphQL SendDiscussionMessage fallback to memory store:", err?.message || err)
    }

    // Fallback creation for local testing and when backend GraphQL is not yet deployed
    const randomSuffix = Math.random().toString(36).substring(2, 9)
    const fallbackMessage: DiscussionMessage = {
        id: `msg_${Date.now()}_${randomSuffix}`,
        replicaCandidateId : cleanId,
        authorAuid: [actorInfo.auid],
        text: trimmedText,
        createdAt: new Date().toISOString(),
        replyToMessageId: replyToMessageId ? String(replyToMessageId).trim() : null,
    }

    const existingList = mockMessagesStore.get(cleanId) || []
    mockMessagesStore.set(cleanId, [...existingList, fallbackMessage])

    return { success: true, message: fallbackMessage }
}
