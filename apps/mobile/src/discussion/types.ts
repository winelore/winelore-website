export interface DiscussionMessage {
    id: string
    replicaCandidateId: string
    authorAuid: number[]
    text: string
    createdAt: string
    replyToMessageId?: string | null
    quoteStartIndex?: number | null
    quoteEndIndex?: number | null
}

export interface SendDiscussionMessageInput {
    replicaCandidateId: string
    text: string
    replyToMessageId?: string | null
    quoteStartIndex?: number | null
    quoteEndIndex?: number | null
}

export interface DiscussionQuote {
    text?: string
    startIndex?: number | null
    endIndex?: number | null
}

export interface DiscussionMember {
    id?: string
    auid?: number[] | number
    auids?: string[] | number[]
    role: "HEAD" | "EXPERT" | string
}