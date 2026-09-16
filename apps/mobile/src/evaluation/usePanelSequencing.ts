import { useEffect, useRef, useState } from "react"
import { useRouter } from "expo-router"
import {
    resolveEvaluationDestination,
    type EvaluationDestination,
} from "@winelore/core/evaluation"
import { sdk } from "../api/client"

/** How often to ask the server where the panel is. Matches the web. */
const POLL_INTERVAL_MS = 3000

/**
 * A submission this client just made.
 *
 * The web keeps this in sessionStorage because a redirect crosses a page load.
 * Native navigation does not, so a module-level record is enough — and it is
 * deliberately not persisted: it exists only to cover the seconds between a
 * successful submit and the server reflecting it.
 */
let lastSubmission: { candidateId: string; isComplete?: boolean } | null = null

export function recordSubmission(candidateId: string) {
    lastSubmission = { candidateId, isComplete: true }
}

export function clearRecordedSubmission() {
    lastSubmission = null
}

/** The waiting room reads the same record, for the same few seconds. */
export function recentSubmission() {
    return lastSubmission
}

/**
 * Keeps a judge's screen on the candidate the panel is actually scoring.
 *
 * The chair advances the panel and every judge has to follow, so this polls
 * and navigates. The decision itself lives in @winelore/core/evaluation and is
 * shared with the web, so both clients read the same server state the same way.
 *
 * Polling pauses while a submit is in flight: acting on state fetched
 * mid-submit would route on a stale answer.
 */
export function usePanelSequencing({
    commissionId,
    replicaId,
    candidateId,
    enabled = true,
}: {
    commissionId: string | undefined
    replicaId: string | undefined
    candidateId: string
    enabled?: boolean
}) {
    const router = useRouter()
    const [isLeaving, setIsLeaving] = useState(false)
    // Read inside the interval without restarting it on every change.
    const leavingRef = useRef(false)

    useEffect(() => {
        if (!enabled || !commissionId || !replicaId) return

        let active = true
        let inFlight = false

        const navigate = (destination: EvaluationDestination) => {
            leavingRef.current = true
            setIsLeaving(true)
            switch (destination.kind) {
                case "results":
                    router.replace(`/results/${commissionId}`)
                    return
                case "panelSummary":
                    router.replace(`/panel-summary/${commissionId}/${replicaId}`)
                    return
                case "candidate":
                    router.replace(`/evaluation/${destination.candidateId}`)
                    return
                case "wait":
                    router.replace(`/wait/${commissionId}/${replicaId}`)
                    return
            }
        }

        const check = async () => {
            if (!active || leavingRef.current || inFlight) return
            inFlight = true
            try {
                const { commission } = await sdk.GetCommission({ id: commissionId })
                if (!active || leavingRef.current) return

                const replica = commission?.replicas?.find((r) => r.id === replicaId)
                const panel = replica?.replicaPanels?.find((p) =>
                    p.replicaCandidates?.some((c) => c.id === candidateId),
                )
                const currentCandidateId = panel?.currentCandidateId ?? null
                const activeCandidate = panel?.replicaCandidates?.find(
                    (c) => c.id === currentCandidateId,
                )

                navigateIfNeeded(
                    resolveEvaluationDestination({
                        viewingCandidateId: candidateId,
                        replicaStatus: replica?.status ?? null,
                        isPanelFinished: panel?.status === "COMPLETED",
                        currentCandidateId,
                        // The candidate's own status is the panel-wide signal
                        // available here; a per-judge check needs the
                        // evaluation query and is not worth a poll.
                        hasCompletedCurrentCandidate:
                            activeCandidate?.status === "EVALUATED" ||
                            activeCandidate?.status === "DISQUALIFIED",
                        recentSubmission: lastSubmission,
                    }),
                )
            } catch {
                // A failed poll is not a routing signal — try again next tick.
            } finally {
                inFlight = false
            }
        }

        const navigateIfNeeded = (destination: EvaluationDestination) => {
            if (destination.kind !== "stay") navigate(destination)
        }

        check()
        const timer = setInterval(check, POLL_INTERVAL_MS)
        return () => {
            active = false
            clearInterval(timer)
        }
    }, [commissionId, replicaId, candidateId, enabled, router])

    return { isLeaving }
}
