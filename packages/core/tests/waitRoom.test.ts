/**
 * The waiting room between candidates, shared by the web's wait page and the
 * app's wait screen.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    AdvancePanelError,
    advancePanel,
    advancePanelErrorKey,
    buildWaitRoom,
    getCompetitionFeatureFlags,
    loadWaitRoom,
    nextCandidateAfter,
    normalizeWaitEvaluation,
    type WaitRoomCommission,
} from "../src/commission"
import { resolveWaitDestination } from "../src/evaluation"

const HEAD = { id: "m0", auid: [[1]], role: "HEAD" }
const ANN = { id: "m1", auid: [2], role: "EXPERT" }
const BOB = { id: "m2", auid: [3], role: "TRAINEE_EXPERT" }

function commissionWith(overrides: {
    candidates?: Array<{ id: string; status?: string; code?: string }>
    currentCandidateId?: string | null
    panelStatus?: string
    replicaStatus?: string
    members?: unknown[]
} = {}): WaitRoomCommission {
    const candidates = overrides.candidates ?? [
        { id: "c1", status: "PENDING", code: "A-01" },
        { id: "c2", status: "PENDING" },
    ]
    return {
        name: "Autumn",
        propertyCommentsEnabled: true,
        replicas: [
            {
                id: "r1",
                status: overrides.replicaStatus ?? "IN_PROGRESS",
                currentPanelId: "rp1",
                members: (overrides.members ?? [HEAD, ANN, BOB]) as any,
                replicaPanels: [
                    {
                        id: "rp1",
                        status: overrides.panelStatus ?? "IN_PROGRESS",
                        currentCandidateId:
                            overrides.currentCandidateId === undefined ? "c1" : overrides.currentCandidateId,
                        panel: { id: "p1", name: "Reds" },
                        replicaCandidates: candidates.map((candidate) => ({
                            id: candidate.id,
                            status: candidate.status,
                            candidate: {
                                id: candidate.id,
                                anonymizedCode: candidate.code ?? null,
                                sample: { batch: { beverage: { name: "Merlot" } } },
                            },
                        })),
                    },
                ],
            },
        ],
    }
}

const PROPERTY_MAP = {
    total: { name: "Total", isResult: true, kind: "numeric" as const },
    colour: { name: "Colour", isResult: false, kind: "numeric" as const },
}

test("the room a judge and the chair both read", () => {
    const room = buildWaitRoom({
        commission: commissionWith(),
        replicaId: "r1",
        evaluations: [
            { id: "e1", evaluatorAuid: [2], isComplete: true, status: "CONFIRMED", scores: [{ code: "total", value: "80" }] },
            { id: "e0", evaluatorAuid: [1], isComplete: true, status: "CONFIRMED", scores: [{ code: "total", value: "81" }] },
        ],
        propertyMap: PROPERTY_MAP,
        myEvaluation: null,
        actorAuid: "1",
    })

    // The chair is listed first, and recognised as the actor.
    assert.deepEqual(room.members.map((member) => member.role), ["HEAD", "EXPERT", "TRAINEE_EXPERT"])
    assert.equal(room.isHead, true)
    assert.equal(room.myRole, "HEAD")
    assert.equal(room.myEvaluation?.id, "e0")
    assert.equal(room.hasCompletedCurrentCandidate, true)

    assert.equal(room.currentCandidateCode, "A-01")
    assert.equal(room.currentCandidateBeverageName, "Merlot")
    assert.equal(room.currentPanelName, "Reds")
    assert.deepEqual([room.totalCandidates, room.candidatesLeft, room.candidatesLeftAfterCurrent], [2, 2, 1])

    // Bob never submitted, so the chair may not move the panel on.
    assert.equal(room.progress.map((row) => row.isCompleted).join(","), "true,true,false")
    assert.equal(room.canAdvance, false)
})

test("the chair may advance only once every member is in — not merely every evaluation", () => {
    const evaluations = [
        { id: "e0", evaluatorAuid: [1], isComplete: true },
        { id: "e1", evaluatorAuid: [2], isComplete: true },
    ]
    const build = (members: unknown[]) =>
        buildWaitRoom({
            commission: commissionWith({ members }),
            replicaId: "r1",
            evaluations,
            propertyMap: PROPERTY_MAP,
            myEvaluation: null,
            actorAuid: "1",
        })

    // An absent judge leaves no evaluation at all; counting submissions alone
    // would let the panel move on without them.
    assert.equal(build([HEAD, ANN, BOB]).canAdvance, false)
    assert.equal(build([HEAD, ANN]).canAdvance, true)
    // Once everyone has scored it the current candidate is no longer left,
    // though the panel still counts it until the chair moves on.
    assert.deepEqual([build([HEAD, ANN, BOB]).candidatesLeft, build([HEAD, ANN]).candidatesLeft], [2, 1])
    assert.equal(build([HEAD, ANN]).isLastCandidateInPanel, false)
    // A draft that was never confirmed is not complete either.
    const drafted = buildWaitRoom({
        commission: commissionWith({ members: [HEAD, ANN] }),
        replicaId: "r1",
        evaluations: [evaluations[0], { id: "e1", evaluatorAuid: [2], isComplete: false, status: "DRAFT" }],
        propertyMap: PROPERTY_MAP,
        myEvaluation: null,
        actorAuid: "1",
    })
    assert.equal(drafted.canAdvance, false)
    // No members at all is not "everyone is in".
    assert.equal(build([]).canAdvance, false)
})

test("a judge with an outlying score is flagged to the chair", () => {
    const room = buildWaitRoom({
        commission: commissionWith(),
        replicaId: "r1",
        evaluations: [
            // The average is 87.67, and the threshold is 5 points.
            { evaluatorAuid: [1], isComplete: true, scores: [{ code: "total", value: "90" }] },
            { evaluatorAuid: [2], isComplete: true, scores: [{ code: "total", value: "91" }] },
            { evaluatorAuid: [3], isComplete: true, scores: [{ code: "total", value: "82" }] },
        ],
        propertyMap: PROPERTY_MAP,
        myEvaluation: null,
        actorAuid: "1",
    })
    assert.equal(room.progress.find((row) => row.member.auids.includes("3"))?.outlier?.isOutlier, true)
    assert.equal(room.progress.find((row) => row.member.auids.includes("2"))?.outlier?.isOutlier, false)
})

test("a candidate with no code falls back to its place, then to its id", () => {
    const numbered = buildWaitRoom({
        commission: commissionWith({ candidates: [{ id: "c1" }, { id: "c2" }], currentCandidateId: "c2" }),
        replicaId: "r1",
        evaluations: [],
        propertyMap: {},
        myEvaluation: null,
        actorAuid: null,
    })
    assert.equal(numbered.currentCandidateCode, "#2")

    // A blank code is as good as none.
    const blank = buildWaitRoom({
        commission: commissionWith({ candidates: [{ id: "c1", code: "   " }] }),
        replicaId: "r1",
        evaluations: [],
        propertyMap: {},
        myEvaluation: null,
        actorAuid: null,
    })
    assert.equal(blank.currentCandidateCode, "#1")
})

test("an unknown replica, and a commission that is gone, leave an empty room", () => {
    const missing = buildWaitRoom({
        commission: commissionWith(),
        replicaId: "nope",
        evaluations: [],
        propertyMap: {},
        myEvaluation: null,
        actorAuid: "1",
    })
    assert.deepEqual([missing.members.length, missing.canAdvance], [0, false])
    // The commission's flags survive: the screen still knows what is allowed.
    assert.equal(missing.flags.propertyCommentsEnabled, true)

    const none = buildWaitRoom({
        commission: null,
        replicaId: "r1",
        evaluations: [],
        propertyMap: {},
        myEvaluation: null,
        actorAuid: "1",
    })
    assert.equal(none.currentCandidateId, null)
})

test("flags are off unless the commission says otherwise", () => {
    assert.deepEqual(getCompetitionFeatureFlags(null), {
        wineJumperMiniGameEnabled: false,
        voiceCommentsEnabled: false,
        propertyCommentsEnabled: false,
    })
    assert.equal(getCompetitionFeatureFlags({ voiceCommentsEnabled: true }).voiceCommentsEnabled, true)
})

test("an evaluation is blanked, not nulled, on its way to a card", () => {
    const normalized = normalizeWaitEvaluation({
        scores: [{ code: "total", value: null }, { code: "colour", value: "4" }],
        comments: [{ id: "k1", text: null, voiceUrl: "u" }],
    })
    assert.deepEqual(normalized.scores, [{ code: "total", value: "" }, { code: "colour", value: "4" }])
    assert.deepEqual(normalized.comments, [{ id: "k1", text: undefined, voiceUrl: "u", propertyId: undefined }])
    assert.deepEqual([normalized.id, normalized.status, normalized.isComplete], [null, null, false])
})

// --- Where a waiting judge goes ----------------------------------------------

test("a waiting judge stays put until the session moves", () => {
    const base = {
        replicaStatus: "IN_PROGRESS",
        isPanelFinished: false,
        currentCandidateId: "c1",
        hasCompletedCurrentCandidate: true,
        waitingOnCandidateId: "c1",
    }
    assert.deepEqual(resolveWaitDestination(base), { kind: "wait" })

    // The chair advanced.
    assert.deepEqual(resolveWaitDestination({ ...base, currentCandidateId: "c2", hasCompletedCurrentCandidate: false }), {
        kind: "candidate",
        candidateId: "c2",
    })
    // Scored the new one already, but it is still a move: follow it.
    assert.deepEqual(resolveWaitDestination({ ...base, currentCandidateId: "c2" }), {
        kind: "candidate",
        candidateId: "c2",
    })

    assert.deepEqual(resolveWaitDestination({ ...base, isPanelFinished: true }), { kind: "panelSummary" })
    assert.deepEqual(resolveWaitDestination({ ...base, replicaStatus: "COMPLETED" }), { kind: "results" })
    assert.deepEqual(resolveWaitDestination({ ...base, currentCandidateId: null }), { kind: "wait" })
})

test("a submit the server has not caught up with does not bounce the judge back", () => {
    const state = {
        replicaStatus: "IN_PROGRESS",
        isPanelFinished: false,
        currentCandidateId: "c1",
        hasCompletedCurrentCandidate: false,
        waitingOnCandidateId: null,
    }
    // Without the record, a judge who has just submitted is sent straight back.
    assert.deepEqual(resolveWaitDestination(state), { kind: "candidate", candidateId: "c1" })
    assert.deepEqual(
        resolveWaitDestination({ ...state, recentSubmission: { candidateId: "c1", isComplete: true } }),
        { kind: "wait" },
    )
    // An incomplete submission is not a submission.
    assert.deepEqual(
        resolveWaitDestination({ ...state, recentSubmission: { candidateId: "c1", isComplete: false } }),
        { kind: "candidate", candidateId: "c1" },
    )
})

// --- The chair advancing ------------------------------------------------------

test("a sequential panel steps one place; a chaotic one takes any pending candidate", () => {
    const candidates = [
        { id: "c1", status: "EVALUATED" },
        { id: "c2", status: "EVALUATED" },
        { id: "c3", status: "PENDING" },
    ]
    assert.equal(nextCandidateAfter({ id: "p", replicaCandidates: candidates }, "c1"), "c2")
    assert.equal(
        nextCandidateAfter({ id: "p", chaoticCurrentCandidateChangesEnabled: true, replicaCandidates: candidates }, "c1"),
        "c3",
    )
    // The last candidate has no successor: the panel finishes instead.
    assert.equal(nextCandidateAfter({ id: "p", replicaCandidates: candidates }, "c3"), null)
})

test("advancing marks the candidate, then points the panel at the next one", async () => {
    const calls: string[] = []
    const ops = {
        markEvaluated: async (id: string) => void calls.push(`mark:${id}`),
        panels: async () => [
            { id: "rp1", replicaCandidates: [{ id: "c1" }, { id: "c2" }] },
        ],
        setCurrentCandidate: async (replicaId: string, panelId: string, candidateId: string) =>
            void calls.push(`point:${replicaId}/${panelId}/${candidateId}`),
        completePanel: async (replicaId: string, panelId: string) => void calls.push(`complete:${replicaId}/${panelId}`),
    }
    assert.deepEqual(await advancePanel(ops, "r1", "c1"), { nextCandidateId: "c2" })
    assert.deepEqual(calls, ["mark:c1", "point:r1/rp1/c2"])

    // On the last candidate the pointer is left alone — a sequential panel
    // rejects a null current candidate — and the panel is completed instead.
    calls.length = 0
    assert.deepEqual(await advancePanel(ops, "r1", "c2"), { nextCandidateId: null })
    assert.deepEqual(calls, ["mark:c2", "complete:r1/rp1"])
})

test("a refused advance comes back as a message key, not a GraphQL string", async () => {
    const failing = (message: string) => ({
        markEvaluated: async () => {
            throw new Error(message)
        },
        panels: async () => [],
        setCurrentCandidate: async () => {},
        completePanel: async () => {},
    })

    await assert.rejects(advancePanel(failing("Not all replica members have confirmed evaluations"), "r1", "c1"), (error: unknown) => {
        assert.ok(error instanceof AdvancePanelError)
        assert.equal(error.key, "commission.partialEvaluationRequiredError")
        return true
    })
    await assert.rejects(advancePanel(failing("CandidateNotNextInSequence"), "r1", "c1"), (error: unknown) => {
        assert.equal((error as AdvancePanelError).key, "commission.sequentialOrderError")
        return true
    })
    // A candidate whose panel cannot be found is a generic failure, not a crash.
    await assert.rejects(
        advancePanel(
            { ...failing("x"), markEvaluated: async () => {}, panels: async () => [] },
            "r1",
            "c1",
        ),
        (error: unknown) => {
            assert.equal((error as AdvancePanelError).key, "commission.markEvaluatedErrorGeneric")
            return true
        },
    )

    assert.equal(advancePanelErrorKey(""), "commission.markEvaluatedErrorGeneric")
    // A key that has already been through here maps to itself: the web's
    // server action can only carry a message string back to the browser.
    assert.equal(advancePanelErrorKey("commission.sequentialOrderError"), "commission.sequentialOrderError")
})

// --- Loading ------------------------------------------------------------------

test("one poll: the per-candidate fetches run together, and none may lose it", async () => {
    const asked: string[] = []
    const room = await loadWaitRoom(
        {
            commission: async (id) => {
                asked.push(`commission:${id}`)
                return commissionWith()
            },
            templates: async () => {
                asked.push("templates")
                throw new Error("template query is down")
            },
            evaluations: async (candidateId) => {
                asked.push(`evaluations:${candidateId}`)
                return [{ id: "e1", evaluatorAuid: [2], isComplete: true }]
            },
            myEvaluation: async () => {
                asked.push("mine")
                return null
            },
        },
        "com1",
        "r1",
        "2",
    )

    // A failed template query still leaves the chair a members list and a
    // working Next button, which matters more mid-tasting than a breakdown.
    assert.deepEqual(room.propertyMap, {})
    assert.equal(room.members.length, 3)
    assert.equal(room.myEvaluation?.id, "e1")
    assert.deepEqual(asked, ["commission:com1", "evaluations:c1", "templates", "mine"])
})

test("with no candidate in play, nothing per-candidate is fetched", async () => {
    let fetched = 0
    const room = await loadWaitRoom(
        {
            commission: async () => commissionWith({ currentCandidateId: null }),
            templates: async () => {
                fetched += 1
                return null
            },
            evaluations: async () => {
                fetched += 1
                return []
            },
            myEvaluation: async () => {
                fetched += 1
                return null
            },
        },
        "com1",
        "r1",
        "1",
    )
    assert.equal(fetched, 0)
    assert.equal(room.currentCandidateId, null)
    assert.equal(room.canAdvance, false)
    // The room is still the chair's: they see who is in the panel.
    assert.equal(room.isHead, true)
})
