/**
 * The comments a judge leaves on a scorecard, shared by the web form and the
 * app's scorecard.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    GENERAL_COMMENT_KEY,
    buildCommentsPayload,
    cachedComments,
    commentDraftHasContent,
    voiceUploadFileName,
} from "../src/evaluation"

const BOTH = { propertyCommentsEnabled: true, voiceCommentsEnabled: true }
const uploads = () => {
    const sent: string[] = []
    return {
        sent,
        upload: async (voice: string, key: string) => {
            sent.push(`${key}:${voice}`)
            return `https://cdn/${voice}`
        },
    }
}

test("per-property comments come in scorecard order, the general one last", async () => {
    const { sent, upload } = uploads()
    const comments = await buildCommentsPayload<string>(
        {
            p2: { text: "  tight finish  " },
            p1: { voice: "rec-1" },
            [GENERAL_COMMENT_KEY]: { text: "good overall" },
        },
        { flags: BOTH, propertyOrder: ["p1", "p2", "p3"], upload },
    )

    assert.deepEqual(comments, [
        { propertyId: "p1", text: undefined, voiceUrl: "https://cdn/rec-1", sortOrder: 0 },
        { propertyId: "p2", text: "tight finish", voiceUrl: undefined, sortOrder: 1 },
        { text: "good overall", voiceUrl: undefined, sortOrder: 2 },
    ])
    assert.deepEqual(sent, ["p1:rec-1"])
})

test("an empty draft is not a comment", async () => {
    const comments = await buildCommentsPayload<string>(
        {
            p1: { text: "   " },
            p2: { text: "", voice: null },
            p3: undefined,
            [GENERAL_COMMENT_KEY]: { text: "  " },
        },
        { flags: BOTH, upload: async () => "never" },
    )
    assert.deepEqual(comments, [])

    assert.equal(commentDraftHasContent({ text: " x " }, BOTH), true)
    assert.equal(commentDraftHasContent({ text: "  " }, BOTH), false)
    assert.equal(commentDraftHasContent(undefined, BOTH), false)
})

test("what the commission switches off is not sent", async () => {
    const drafts = {
        p1: { text: "colour note", voice: "rec-1" },
        [GENERAL_COMMENT_KEY]: { text: "overall", voice: "rec-2" },
    }

    // Per-property comments off: only the general one survives, and its voice
    // note with it — the general comment is never gated by that switch.
    const noProperties = await buildCommentsPayload<string>(drafts, {
        flags: { propertyCommentsEnabled: false, voiceCommentsEnabled: true },
        upload: async (voice) => `https://cdn/${voice}`,
    })
    assert.deepEqual(noProperties, [{ text: "overall", voiceUrl: "https://cdn/rec-2", sortOrder: 0 }])

    // Voice off: the text stays, nothing is uploaded.
    const { sent, upload } = uploads()
    const noVoice = await buildCommentsPayload<string>(drafts, {
        flags: { propertyCommentsEnabled: true, voiceCommentsEnabled: false },
        upload,
    })
    assert.deepEqual(noVoice, [
        { propertyId: "p1", text: "colour note", voiceUrl: undefined, sortOrder: 0 },
        { text: "overall", voiceUrl: undefined, sortOrder: 1 },
    ])
    assert.deepEqual(sent, [])

    // A property holding only a voice note is dropped entirely when voice is off.
    const voiceOnly = await buildCommentsPayload<string>(
        { p1: { voice: "rec-1" } },
        { flags: { propertyCommentsEnabled: true, voiceCommentsEnabled: false }, upload },
    )
    assert.deepEqual(voiceOnly, [])
})

test("a failed upload costs the note, never the scorecard", async () => {
    const comments = await buildCommentsPayload<string>(
        {
            p1: { text: "still sent", voice: "rec-1" },
            p2: { voice: "rec-2" },
            [GENERAL_COMMENT_KEY]: { voice: "rec-3" },
        },
        {
            flags: BOTH,
            propertyOrder: ["p1", "p2"],
            upload: async (_voice, key) => {
                if (key === "p1") throw new Error("upload is down")
                return key === "p2" ? undefined : "https://cdn/rec-3"
            },
        },
    )

    // p1 keeps its text; p2 had only a note that never landed, so it carries
    // nothing — but it is still sent, because the judge did leave a comment there.
    assert.deepEqual(comments, [
        { propertyId: "p1", text: "still sent", voiceUrl: undefined, sortOrder: 0 },
        { propertyId: "p2", text: undefined, voiceUrl: undefined, sortOrder: 1 },
        { text: undefined, voiceUrl: "https://cdn/rec-3", sortOrder: 2 },
    ])
})

test("a property the scorecard does not list still comes through, after the ones it does", async () => {
    const comments = await buildCommentsPayload<string>(
        { unknown: { text: "b" }, p1: { text: "a" } },
        { flags: BOTH, propertyOrder: ["p1"], upload: async () => undefined },
    )
    assert.deepEqual(comments.map((comment) => comment.propertyId), ["p1", "unknown"])
})

test("a recording's file name matches its container", () => {
    assert.equal(voiceUploadFileName("p1", "audio/mp4", 1700), "evaluation_voice_p1_1700.mp4")
    assert.equal(voiceUploadFileName("general", "audio/aac", 1700), "evaluation_voice_general_1700.mp4")
    assert.equal(voiceUploadFileName("p1", "audio/webm;codecs=opus", 1700), "evaluation_voice_p1_1700.webm")
})

test("what the waiting room shows back before the server answers", () => {
    assert.deepEqual(
        cachedComments([
            { propertyId: "p1", text: "a", sortOrder: 0 },
            { text: "b", voiceUrl: "u", sortOrder: 1 },
        ]),
        [
            { id: "local-0", propertyId: "p1", text: "a", voiceUrl: undefined },
            { id: "local-1", propertyId: null, text: "b", voiceUrl: "u" },
        ],
    )
})
