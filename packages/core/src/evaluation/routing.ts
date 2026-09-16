/**
 * Where a judge should be during a live tasting.
 *
 * A panel moves through candidates together: the chair advances the active
 * candidate, and every judge's screen has to follow. The rules below decide
 * that, and they are shared so a judge on a phone and a judge on the web are
 * never sent to different places by the same server state.
 */

/** Statuses meaning this candidate is done and cannot be scored again. */
export function isReplicaCandidateFinished(status: string | null | undefined): boolean {
    return status === "EVALUATED" || status === "DISQUALIFIED"
}

export type EvaluationDestination =
    /** Stay on the current scorecard. */
    | { kind: "stay" }
    /** The whole replica finished — everyone goes to the shared results. */
    | { kind: "results" }
    /** This panel finished — go to its summary. */
    | { kind: "panelSummary" }
    /** The panel moved on; score this candidate instead. */
    | { kind: "candidate"; candidateId: string }
    /** Nothing to score right now — wait for the chair. */
    | { kind: "wait" }

export interface EvaluationRoutingState {
    /** The candidate whose scorecard is currently open. */
    viewingCandidateId: string
    /** Replica status from the server; "COMPLETED" ends the session. */
    replicaStatus: string | null | undefined
    isPanelFinished: boolean
    /** The candidate the panel is on, or null between candidates. */
    currentCandidateId: string | null | undefined
    /** Whether this judge has already submitted for `currentCandidateId`. */
    hasCompletedCurrentCandidate: boolean
    /**
     * A submission this client just made, if any.
     *
     * The server can still report the evaluation as outstanding for a moment
     * after a successful submit. Without this the judge is bounced straight
     * back onto a scorecard they have just completed.
     */
    recentSubmission?: { candidateId: string; isComplete?: boolean } | null
}

/**
 * Decide where a judge with an open scorecard belongs, given fresh server
 * state. Order matters: session-ending conditions outrank candidate movement,
 * which outranks this judge's own progress.
 */
export function resolveEvaluationDestination(
    state: EvaluationRoutingState,
): EvaluationDestination {
    if (state.replicaStatus === "COMPLETED") return { kind: "results" }
    if (state.isPanelFinished) return { kind: "panelSummary" }

    const { currentCandidateId, viewingCandidateId } = state
    if (!currentCandidateId) return { kind: "wait" }

    // A submission that has not yet surfaced in server state still counts.
    const submittedCurrent =
        state.hasCompletedCurrentCandidate ||
        (state.recentSubmission?.candidateId === currentCandidateId &&
            state.recentSubmission?.isComplete !== false)

    if (currentCandidateId !== viewingCandidateId) {
        // The panel advanced. Follow it, unless this judge is already done
        // there — then wait rather than reopening a finished scorecard.
        return submittedCurrent
            ? { kind: "wait" }
            : { kind: "candidate", candidateId: currentCandidateId }
    }

    // Still on this candidate: only leave once this judge has submitted.
    return submittedCurrent ? { kind: "wait" } : { kind: "stay" }
}

/**
 * The same decision at the moment a scorecard is opened, where more is known:
 * the panel's own status and whether this candidate is already finished.
 *
 * `activeCandidateIsComplete` answers "has this judge already submitted for the
 * panel's active candidate" and is only consulted when the panel has moved on;
 * pass undefined when it has not been looked up.
 */
export function resolveEvaluationEntry(
    state: EvaluationRoutingState & {
        panelStatus: string | null | undefined
        /** The panel the replica is currently running. */
        replicaCurrentPanelId: string | null | undefined
        /** The panel this candidate belongs to. */
        replicaPanelId: string
        candidateStatus: string | null | undefined
        activeCandidateIsComplete?: boolean
    },
): EvaluationDestination {
    if (state.replicaStatus === "COMPLETED") return { kind: "results" }
    if (state.panelStatus === "COMPLETED") return { kind: "panelSummary" }

    const isThisCandidateLive =
        state.replicaCurrentPanelId === state.replicaPanelId &&
        state.panelStatus === "IN_PROGRESS" &&
        state.currentCandidateId === state.viewingCandidateId &&
        !isReplicaCandidateFinished(state.candidateStatus)

    if (isThisCandidateLive) {
        return state.hasCompletedCurrentCandidate ? { kind: "wait" } : { kind: "stay" }
    }

    const movedOn =
        state.currentCandidateId &&
        state.currentCandidateId !== state.viewingCandidateId &&
        state.panelStatus === "IN_PROGRESS"

    if (movedOn && state.activeCandidateIsComplete === false) {
        return { kind: "candidate", candidateId: state.currentCandidateId! }
    }

    return { kind: "wait" }
}

export interface WaitRoutingState {
    replicaStatus: string | null | undefined
    isPanelFinished: boolean
    currentCandidateId: string | null | undefined
    /** Whether this judge has already submitted for `currentCandidateId`. */
    hasCompletedCurrentCandidate: boolean
    /**
     * The candidate this screen has been waiting on, or null on the first poll.
     *
     * Kept across polls so the chair advancing is detectable: the id changing
     * is what sends a waiting judge to the next scorecard.
     */
    waitingOnCandidateId: string | null
    recentSubmission?: { candidateId: string; isComplete?: boolean } | null
}

/**
 * Where a judge sitting in the waiting room belongs.
 *
 * Unlike an open scorecard there is nothing to stay on, so the question is
 * only whether the session has moved: ended, finished this panel, or offered a
 * candidate this judge has not scored. A judge who has scored the current
 * candidate waits on, however long the rest of the panel takes.
 */
export function resolveWaitDestination(state: WaitRoutingState): EvaluationDestination {
    if (state.replicaStatus === "COMPLETED") return { kind: "results" }
    if (state.isPanelFinished) return { kind: "panelSummary" }

    const { currentCandidateId } = state
    if (!currentCandidateId) return { kind: "wait" }

    const submittedCurrent =
        state.hasCompletedCurrentCandidate ||
        (state.recentSubmission?.candidateId === currentCandidateId &&
            state.recentSubmission?.isComplete !== false)

    if (!submittedCurrent) return { kind: "candidate", candidateId: currentCandidateId }

    // Scored it already — but if the chair has moved on since, the new
    // candidate is someone else's to offer and this judge follows.
    if (state.waitingOnCandidateId && state.waitingOnCandidateId !== currentCandidateId) {
        return { kind: "candidate", candidateId: currentCandidateId }
    }

    return { kind: "wait" }
}

export type PanelSummaryDestination =
    /** Stay on the summary. */
    | { kind: "stay"; panelId: string }
    /** The replica finished — go to the shared results. */
    | { kind: "results" }
    /** No panel is running; there is nothing to summarise. */
    | { kind: "commission" }
    /** Scoring resumed — go back to the active candidate. */
    | { kind: "candidate"; candidateId: string }
    /** Scoring resumed but no candidate is active yet. */
    | { kind: "wait" }

export interface PanelSummaryState {
    replicaStatus: string | null | undefined
    /** The panel the replica is running right now. */
    currentPanelId: string | null | undefined
    isPanelFinished: boolean
    currentCandidateId: string | null | undefined
    /**
     * The panel this summary was opened for, or null on the first poll.
     *
     * A summary is about one specific panel. Once shown it must not silently
     * become a different panel's summary when the chair advances — it navigates
     * instead. Callers keep this across polls and take it from a "stay".
     */
    shownPanelId: string | null
}

/**
 * Where a judge looking at a panel summary belongs.
 *
 * The summary is only valid while its own panel is finished and still current.
 * Anything else means scoring has resumed or the session has ended, and the
 * judge should not be left reading a stale summary.
 */
export function resolvePanelSummaryDestination(
    state: PanelSummaryState,
): PanelSummaryDestination {
    if (state.replicaStatus === "COMPLETED") return { kind: "results" }
    if (!state.currentPanelId) return { kind: "commission" }

    const isStillThisPanel =
        state.shownPanelId === null || state.shownPanelId === state.currentPanelId

    if (isStillThisPanel && state.isPanelFinished) {
        return { kind: "stay", panelId: state.currentPanelId }
    }

    // Either the chair moved to another panel, or this one is scoring again.
    return state.currentCandidateId
        ? { kind: "candidate", candidateId: state.currentCandidateId }
        : { kind: "wait" }
}
