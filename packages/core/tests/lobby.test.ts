/**
 * The lobby decides who can mark themselves ready and who can start a tasting.
 * A judge who cannot signal readiness holds up an entire panel, so the rules
 * are pinned here rather than left to each client.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import { resolveLobbyState, type LobbyReplica } from "../src/commission"

const replica = (over: Partial<LobbyReplica> = {}): LobbyReplica => ({
    id: "rep-1",
    status: "PLANNED",
    members: [
        { id: "m-1", auid: [7], role: "HEAD", isReady: false },
        { id: "m-2", auid: [8], role: "MEMBER", isReady: false },
    ],
    ...over,
})

test("a member is identified along with the row needed to mark them ready", () => {
    const state = resolveLobbyState(replica(), "8", 5)
    assert.equal(state.isMember, true)
    assert.equal(state.myMemberId, "m-2")
    assert.equal(state.isHead, false)
    assert.equal(state.amIReady, false)
})

test("a nested auid still identifies the member", () => {
    // The backend nests this shape. A plain `includes` leaves a genuine member
    // unable to mark themselves ready, which stalls the whole panel.
    const nested = replica({ members: [{ id: "m-1", auid: [[8]], role: "MEMBER" }] })
    const state = resolveLobbyState(nested, "8", 5)
    assert.equal(state.isMember, true)
    assert.equal(state.myMemberId, "m-1")
})

test("readiness is counted across the replica", () => {
    const partly = replica({
        members: [
            { id: "m-1", auid: [7], role: "HEAD", isReady: true },
            { id: "m-2", auid: [8], role: "MEMBER", isReady: false },
        ],
    })
    const state = resolveLobbyState(partly, "7", 5)
    assert.equal(state.amIReady, true)
    assert.equal(state.notReadyCount, 1)
    assert.equal(state.isEveryoneReady, false)
})

test("everyone ready requires at least one member", () => {
    const empty = replica({ members: [] })
    assert.equal(resolveLobbyState(empty, "7", 5).isEveryoneReady, false, "an empty replica is not a ready one")
})

test("only the chair may start, and only with members and candidates", () => {
    const ready = replica({
        members: [{ id: "m-1", auid: [7], role: "HEAD", isReady: true }],
    })

    assert.equal(resolveLobbyState(ready, "7", 5).canStart, true)
    assert.equal(resolveLobbyState(ready, "8", 5).canStart, false, "not a member")
    assert.equal(resolveLobbyState(ready, "8", 5).blockedReason, "notHead")
    assert.equal(resolveLobbyState(ready, "7", 0).blockedReason, "noCandidates")
    assert.equal(
        resolveLobbyState(replica({ members: [] }), "7", 5).blockedReason,
        "notHead",
        "with no members there is no chair either",
    )
})

test("a started session is past readiness", () => {
    for (const status of ["STARTED", "IN_PROGRESS", "COMPLETED"]) {
        const state = resolveLobbyState(replica({ status }), "7", 5)
        assert.equal(state.isRunning, true, status)
        assert.equal(state.isPreStart, false, status)
        assert.equal(state.canStart, false, status)
        assert.equal(state.blockedReason, "alreadyStarted", status)
    }
})

test("planned and approved replicas are still pre-start", () => {
    for (const status of ["PLANNED", "APPROVED", "DRAFT"]) {
        assert.equal(resolveLobbyState(replica({ status }), "7", 5).isPreStart, true, status)
    }
})

test("a non-member and a signed-out user get a safe, inert state", () => {
    for (const auid of ["99", null, undefined]) {
        const state = resolveLobbyState(replica(), auid, 5)
        assert.equal(state.isMember, false)
        assert.equal(state.myMemberId, null)
        assert.equal(state.amIReady, false)
        assert.equal(state.canStart, false)
    }
})

test("a missing replica does not throw", () => {
    const state = resolveLobbyState(null, "7", 5)
    assert.equal(state.isMember, false)
    assert.equal(state.isPreStart, false)
    assert.equal(state.canStart, false)
})
