/**
 * Panel sequencing decides where a judge's screen goes while a tasting is
 * running. Getting it wrong either strands a judge on a dead scorecard or
 * bounces them off one they are still filling in, so every branch is pinned.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    isReplicaCandidateFinished,
    resolveEvaluationDestination,
    resolveEvaluationEntry,
    resolvePanelSummaryDestination,
    type EvaluationRoutingState,
} from "../src/evaluation"

const base: EvaluationRoutingState = {
    viewingCandidateId: "cand-1",
    replicaStatus: "IN_PROGRESS",
    isPanelFinished: false,
    currentCandidateId: "cand-1",
    hasCompletedCurrentCandidate: false,
    recentSubmission: null,
}

test("a finished replica sends everyone to the shared results", () => {
    assert.deepEqual(
        resolveEvaluationDestination({ ...base, replicaStatus: "COMPLETED" }),
        { kind: "results" },
    )
})

test("the replica ending outranks everything else", () => {
    // Even mid-scorecard with the panel still moving.
    assert.deepEqual(
        resolveEvaluationDestination({
            ...base,
            replicaStatus: "COMPLETED",
            isPanelFinished: true,
            currentCandidateId: "cand-9",
        }),
        { kind: "results" },
    )
})

test("a finished panel goes to its summary", () => {
    assert.deepEqual(
        resolveEvaluationDestination({ ...base, isPanelFinished: true }),
        { kind: "panelSummary" },
    )
})

test("a judge stays put while their candidate is live and unsubmitted", () => {
    assert.deepEqual(resolveEvaluationDestination(base), { kind: "stay" })
})

test("submitting moves the judge to the waiting room", () => {
    assert.deepEqual(
        resolveEvaluationDestination({ ...base, hasCompletedCurrentCandidate: true }),
        { kind: "wait" },
    )
})

test("the panel advancing pulls the judge to the new candidate", () => {
    assert.deepEqual(
        resolveEvaluationDestination({ ...base, currentCandidateId: "cand-2" }),
        { kind: "candidate", candidateId: "cand-2" },
    )
})

test("a judge already done with the new candidate waits instead of reopening it", () => {
    assert.deepEqual(
        resolveEvaluationDestination({
            ...base,
            currentCandidateId: "cand-2",
            hasCompletedCurrentCandidate: true,
        }),
        { kind: "wait" },
    )
})

test("no active candidate means wait", () => {
    assert.deepEqual(
        resolveEvaluationDestination({ ...base, currentCandidateId: null }),
        { kind: "wait" },
    )
})

test("a just-submitted evaluation counts before the server catches up", () => {
    // The submit succeeded but server state still reports it outstanding.
    // Without the local record the judge is thrown back onto a finished card.
    assert.deepEqual(
        resolveEvaluationDestination({
            ...base,
            hasCompletedCurrentCandidate: false,
            recentSubmission: { candidateId: "cand-1", isComplete: true },
        }),
        { kind: "wait" },
    )
})

test("a local record for a different candidate does not count", () => {
    assert.deepEqual(
        resolveEvaluationDestination({
            ...base,
            recentSubmission: { candidateId: "cand-99", isComplete: true },
        }),
        { kind: "stay" },
    )
})

test("a local record explicitly marked incomplete does not count", () => {
    assert.deepEqual(
        resolveEvaluationDestination({
            ...base,
            recentSubmission: { candidateId: "cand-1", isComplete: false },
        }),
        { kind: "stay" },
    )
})

test("a local record with isComplete absent counts as submitted", () => {
    // The web writes the cache without the flag on the already-submitted path.
    assert.deepEqual(
        resolveEvaluationDestination({
            ...base,
            recentSubmission: { candidateId: "cand-1" },
        }),
        { kind: "wait" },
    )
})

test("isReplicaCandidateFinished covers both terminal statuses", () => {
    assert.equal(isReplicaCandidateFinished("EVALUATED"), true)
    assert.equal(isReplicaCandidateFinished("DISQUALIFIED"), true)
    assert.equal(isReplicaCandidateFinished("PENDING"), false)
    assert.equal(isReplicaCandidateFinished(null), false)
    assert.equal(isReplicaCandidateFinished(undefined), false)
})

// --- entry guards ---------------------------------------------------------

const entryBase = {
    ...base,
    panelStatus: "IN_PROGRESS",
    replicaCurrentPanelId: "panel-1",
    replicaPanelId: "panel-1",
    candidateStatus: "PENDING",
}

test("opening a live, unsubmitted scorecard stays", () => {
    assert.deepEqual(resolveEvaluationEntry(entryBase), { kind: "stay" })
})

test("opening a candidate whose panel is not the replica's current one waits", () => {
    assert.deepEqual(
        resolveEvaluationEntry({ ...entryBase, replicaCurrentPanelId: "panel-2" }),
        { kind: "wait" },
    )
})

test("opening an already-evaluated candidate waits", () => {
    assert.deepEqual(
        resolveEvaluationEntry({ ...entryBase, candidateStatus: "EVALUATED" }),
        { kind: "wait" },
    )
})

test("a disqualified candidate is equally not scorable", () => {
    assert.deepEqual(
        resolveEvaluationEntry({ ...entryBase, candidateStatus: "DISQUALIFIED" }),
        { kind: "wait" },
    )
})

test("entry redirects to the active candidate only when it is unsubmitted", () => {
    const movedOn = { ...entryBase, currentCandidateId: "cand-2" }

    assert.deepEqual(
        resolveEvaluationEntry({ ...movedOn, activeCandidateIsComplete: false }),
        { kind: "candidate", candidateId: "cand-2" },
    )
    assert.deepEqual(
        resolveEvaluationEntry({ ...movedOn, activeCandidateIsComplete: true }),
        { kind: "wait" },
    )
    // Not looked up: wait rather than guess.
    assert.deepEqual(resolveEvaluationEntry(movedOn), { kind: "wait" })
})

test("entry honours the session-ending conditions first", () => {
    assert.deepEqual(
        resolveEvaluationEntry({ ...entryBase, replicaStatus: "COMPLETED" }),
        { kind: "results" },
    )
    assert.deepEqual(
        resolveEvaluationEntry({ ...entryBase, panelStatus: "COMPLETED" }),
        { kind: "panelSummary" },
    )
})

// --- panel summary --------------------------------------------------------

const summaryBase = {
    replicaStatus: "IN_PROGRESS",
    currentPanelId: "panel-1",
    isPanelFinished: true,
    currentCandidateId: null,
    shownPanelId: null as string | null,
}

test("a finished panel shows its summary and reports which panel", () => {
    assert.deepEqual(resolvePanelSummaryDestination(summaryBase), {
        kind: "stay",
        panelId: "panel-1",
    })
})

test("opening a summary for a panel that is still scoring goes back to it", () => {
    assert.deepEqual(
        resolvePanelSummaryDestination({
            ...summaryBase,
            isPanelFinished: false,
            currentCandidateId: "cand-3",
        }),
        { kind: "candidate", candidateId: "cand-3" },
    )
    // Scoring resumed but between candidates.
    assert.deepEqual(
        resolvePanelSummaryDestination({ ...summaryBase, isPanelFinished: false }),
        { kind: "wait" },
    )
})

test("a summary does not silently become another panel's summary", () => {
    // Pinned to panel-1; the chair has moved the replica to panel-2.
    assert.deepEqual(
        resolvePanelSummaryDestination({
            ...summaryBase,
            shownPanelId: "panel-1",
            currentPanelId: "panel-2",
            currentCandidateId: "cand-7",
        }),
        { kind: "candidate", candidateId: "cand-7" },
    )
})

test("a pinned summary stays while its own panel is still the current one", () => {
    assert.deepEqual(
        resolvePanelSummaryDestination({ ...summaryBase, shownPanelId: "panel-1" }),
        { kind: "stay", panelId: "panel-1" },
    )
})

test("the replica ending outranks the summary", () => {
    assert.deepEqual(
        resolvePanelSummaryDestination({
            ...summaryBase,
            shownPanelId: "panel-1",
            replicaStatus: "COMPLETED",
        }),
        { kind: "results" },
    )
})

test("no running panel sends the judge back to the commission", () => {
    assert.deepEqual(
        resolvePanelSummaryDestination({ ...summaryBase, currentPanelId: null }),
        { kind: "commission" },
    )
})
