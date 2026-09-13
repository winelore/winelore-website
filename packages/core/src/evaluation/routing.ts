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
