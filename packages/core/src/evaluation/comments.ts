import type { CompetitionFeatureFlags } from "../evaluationDisplay"

/**
 * The comments a judge leaves on a scorecard: one per property, plus a general
 * one on the evaluation as a whole, each able to carry text, a voice note, or
 * both.
 *
 * What counts as a comment worth sending, and the order they arrive in, is here
 * so the web form and the app's scorecard submit identical payloads. Recording
 * itself is each platform's own — a browser's MediaRecorder and the phone's
 * microphone have nothing in common — but everything around it is shared.
 */

/** The key a general comment is drafted under, alongside property ids. */
export const GENERAL_COMMENT_KEY = "general"

/** A comment being written, before any recording has been uploaded. */
export interface CommentDraft<Voice> {
    text?: string | null
    /** A recording held locally; the caller uploads it and returns its URL. */
    voice?: Voice | null
}

/** A comment as the submit mutation takes it. */
export interface EvaluationCommentInput {
    propertyId?: string
    text?: string
    voiceUrl?: string
    sortOrder: number
}

/**
 * Whether a draft has anything in it worth sending, given what the commission
 * allows. A voice note under a commission with voice comments off is not a
 * comment at all, so a property holding only one is skipped.
 */
export function commentDraftHasContent<Voice>(
    draft: CommentDraft<Voice> | undefined,
    flags: Pick<CompetitionFeatureFlags, "voiceCommentsEnabled">,
): boolean {
    if (!draft) return false
    if (draft.text?.trim()) return true
    return flags.voiceCommentsEnabled && Boolean(draft.voice)
}

/**
 * Turn the judge's drafts into the comments the submit mutation expects,
 * uploading each recording on the way.
 *
 * Per-property comments come first in the order their properties appear on the
 * scorecard, and the general comment last, so a reader sees them in the order
 * they were written. Per-property comments are dropped entirely when the
 * commission has them switched off; the general one is always allowed.
 *
 * An upload that fails yields no URL rather than failing the submit: a judge
 * losing a voice note is bad, a judge losing a whole scorecard to a flaky
 * upload is worse.
 */
export async function buildCommentsPayload<Voice>(
    drafts: Record<string, CommentDraft<Voice> | undefined>,
    options: {
        flags: CompetitionFeatureFlags
        /** Property ids in scorecard order; anything else is appended after. */
        propertyOrder?: string[]
        upload: (voice: Voice, key: string) => Promise<string | undefined>
    },
): Promise<EvaluationCommentInput[]> {
    const { flags, upload } = options

    const keys = Object.keys(drafts).filter((key) => key !== GENERAL_COMMENT_KEY)
    const order = options.propertyOrder ?? []
    const position = (key: string) => {
        const index = order.indexOf(key)
        return index === -1 ? order.length : index
    }
    const propertyKeys = flags.propertyCommentsEnabled
        ? keys
              .filter((key) => commentDraftHasContent(drafts[key], flags))
              .sort((a, b) => position(a) - position(b))
        : []

    const comments: EvaluationCommentInput[] = []
    for (const key of propertyKeys) {
        const draft = drafts[key]!
        comments.push({
            propertyId: key,
            text: draft.text?.trim() || undefined,
            voiceUrl: await voiceUrlFor(draft, key, flags, upload),
            sortOrder: comments.length,
        })
    }

    const general = drafts[GENERAL_COMMENT_KEY]
    if (general) {
        const voiceUrl = await voiceUrlFor(general, GENERAL_COMMENT_KEY, flags, upload)
        const text = general.text?.trim() || undefined
        if (text || voiceUrl) comments.push({ text, voiceUrl, sortOrder: comments.length })
    }

    return comments
}

async function voiceUrlFor<Voice>(
    draft: CommentDraft<Voice>,
    key: string,
    flags: CompetitionFeatureFlags,
    upload: (voice: Voice, key: string) => Promise<string | undefined>,
): Promise<string | undefined> {
    if (!flags.voiceCommentsEnabled || !draft.voice) return undefined
    try {
        return (await upload(draft.voice, key)) || undefined
    } catch {
        return undefined
    }
}

/**
 * The name a recording is uploaded under.
 *
 * The extension has to match the container, because players pick a decoder
 * from it: iOS records AAC in an MP4 container, and browsers usually produce
 * WebM.
 */
export function voiceUploadFileName(key: string, contentType: string, now: number = Date.now()): string {
    const type = contentType.toLowerCase()
    const isMp4 = type.includes("mp4") || type.includes("aac") || type.includes("m4a")
    return `evaluation_voice_${key}_${now}.${isMp4 ? "mp4" : "webm"}`
}

/** The comments as they are cached locally for the waiting room to show back. */
export function cachedComments(comments: EvaluationCommentInput[]) {
    return comments.map((comment, index) => ({
        id: `local-${index}`,
        propertyId: comment.propertyId ?? null,
        text: comment.text,
        voiceUrl: comment.voiceUrl,
    }))
}
