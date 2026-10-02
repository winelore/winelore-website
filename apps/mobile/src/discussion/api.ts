import { fetchGraphQLRaw, mutateGraphQLRaw } from "../api/client"
import type { DiscussionMember, DiscussionMessage, SendDiscussionMessageInput } from "./types"

const GET_DISCUSSION_MESSAGES_QUERY = `
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
`

const GET_REPLICA_MEMBERS_QUERY = `
  query GetReplicaMembersByCandidate($id: ID!) {
    commissionReplicaCandidate(id: $id) {
      replicaPanel {
        replica {
          members {
            id
            auid
            role
            isReady
          }
        }
      }
    }
  }
`

const POST_DISCUSSION_MESSAGE_MUTATION = `
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
`

interface RawDiscussionItem {
    id: string | number
    replicaCandidateId: string | number
    authorAuid: number | number[]
    text?: string | null
    replyToId?: string | number | null
    quoteStartIndex?: number | null
    quoteEndIndex?: number | null
    createdAt?: string | null
}

function normalizeMessage(item: RawDiscussionItem): DiscussionMessage {
    return {
        id: String(item.id),
        replicaCandidateId: String(item.replicaCandidateId),
        authorAuid: Array.isArray(item.authorAuid)
            ? item.authorAuid.map(Number)
            : [Number(item.authorAuid)],
        text: String(item.text ?? ""),
        createdAt: item.createdAt || new Date().toISOString(),
        replyToMessageId: item.replyToId ? String(item.replyToId) : null,
        quoteStartIndex: item.quoteStartIndex != null ? Number(item.quoteStartIndex) : null,
        quoteEndIndex: item.quoteEndIndex != null ? Number(item.quoteEndIndex) : null,
    }
}

export async function fetchDiscussionMessages(
    replicaCandidateId: string,
    currentAuid?: number | null,
): Promise<DiscussionMessage[]> {
    const headers: Record<string, string> = {}
    if (currentAuid) {
        headers["X-ACTOR"] = String(currentAuid)
        headers["actor"] = String(currentAuid)
    }

    const data = await fetchGraphQLRaw<{
        discussionMessagesByReplicaCandidate?: {
            items?: RawDiscussionItem[]
        }
    }>(GET_DISCUSSION_MESSAGES_QUERY, { replicaCandidateId }, headers)

    const rawItems = data?.discussionMessagesByReplicaCandidate?.items
    if (!Array.isArray(rawItems)) return []

    return rawItems.map(normalizeMessage)
}

/** Fetches commission replica members to automatically discover the Head of Commission and Experts */
export async function fetchReplicaMembersByCandidate(
    replicaCandidateId: string,
): Promise<DiscussionMember[]> {
    try {
        const data = await fetchGraphQLRaw<{
            commissionReplicaCandidate?: {
                replicaPanel?: {
                    replica?: {
                        members?: Array<{
                            id?: string
                            auid?: number | number[]
                            role: string
                        }>
                    }
                }
            }
        }>(GET_REPLICA_MEMBERS_QUERY, { id: replicaCandidateId })

        const rawMembers = data?.commissionReplicaCandidate?.replicaPanel?.replica?.members
        if (!Array.isArray(rawMembers)) return []

        return rawMembers.map((m) => ({
            id: m.id,
            auid: Array.isArray(m.auid) ? m.auid.map(Number) : [Number(m.auid)],
            role: m.role,
        }))
    } catch {
        return []
    }
}

export async function sendDiscussionMessage(
    input: SendDiscussionMessageInput,
    currentAuid?: number | null,
): Promise<DiscussionMessage> {
    const headers: Record<string, string> = {}
    if (currentAuid) {
        headers["X-ACTOR"] = String(currentAuid)
        headers["actor"] = String(currentAuid)
    }

    const data = await mutateGraphQLRaw<{
        postDiscussionMessage?: RawDiscussionItem
    }>(
        POST_DISCUSSION_MESSAGE_MUTATION,
        {
            input: {
                replicaCandidateId: input.replicaCandidateId,
                text: input.text.trim(),
                replyToId: input.replyToMessageId ?? null,
                quoteStartIndex: input.quoteStartIndex ?? null,
                quoteEndIndex: input.quoteEndIndex ?? null,
            },
        },
        headers,
    )

    if (!data?.postDiscussionMessage) {
        throw new Error("Failed to post discussion message")
    }

    return normalizeMessage(data.postDiscussionMessage)
}