import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "expo-router"
import { GET_COMMISSION_TEMPLATES_DEEP_QUERY } from "@winelore/core"
import {
    AdvancePanelError,
    advancePanel,
    emptyWaitRoom,
    loadWaitRoom,
    type WaitRoomSource,
    type WaitRoomState,
} from "@winelore/core/commission"
import { resolveWaitDestination } from "@winelore/core/evaluation"
import { fetchGraphQLRaw, sdk } from "../api/client"
import { getStoredSession } from "../auth/session"
import { recentSubmission } from "../evaluation/usePanelSequencing"

/** Matches the web's wait page. */
const POLL_INTERVAL_MS = 3000

/** Evaluations are read as the acting judge, exactly as the web reads them. */
function sourceFor(auid: string | null): WaitRoomSource {
    const options = auid ? { headers: { "x-actor": auid } } : undefined
    return {
        commission: async (id) => (await sdk.GetCommission({ id })).commission,
        templates: (commissionId) =>
            fetchGraphQLRaw<any>(GET_COMMISSION_TEMPLATES_DEEP_QUERY, { id: commissionId }),
        evaluations: async (replicaCandidateId) =>
            (await sdk.GetEvaluationsForCandidate({ replicaCandidateId, limit: 50 }, options))
                .evaluationsByReplicaCandidate?.items ?? [],
        myEvaluation: async (replicaCandidateId) =>
            (await sdk.GetMyEvaluationForCandidate({ replicaCandidateId }, options))
                .evaluationByReplicaCandidateAndEvaluator,
    }
}

export interface WaitRoomHandle {
    room: WaitRoomState
    /** No poll has come back yet, so nothing on screen is real. */
    isLoading: boolean
    isAdvancing: boolean
    /** The chair moving the panel on. Rejects with a message key. */
    advance: () => Promise<void>
    confirm: (evaluationId: string) => Promise<void>
}

/**
 * The waiting room: polls the session and navigates when it moves.
 *
 * Where a waiting judge belongs is `resolveWaitDestination` in core, shared
 * with the web, so the chair advancing sends both clients to the same place.
 * Polling stops the moment a destination is taken — a second navigation from a
 * poll already in flight would push a duplicate screen.
 */
export function useWaitRoom(commissionId: string, replicaId: string): WaitRoomHandle {
    const router = useRouter()
    const [room, setRoom] = useState<WaitRoomState>(() => emptyWaitRoom())
    const [isLoading, setIsLoading] = useState(true)
    const [isAdvancing, setIsAdvancing] = useState(false)
    const auid = useRef<string | null>(null)
    const leaving = useRef(false)
    // The candidate this screen has been waiting on, so the chair advancing is
    // detectable across polls.
    const waitingOn = useRef<string | null>(null)

    const poll = useCallback(async () => {
        if (leaving.current) return
        try {
            if (auid.current === null) auid.current = (await getStoredSession())?.auid ?? null
            const next = await loadWaitRoom(sourceFor(auid.current), commissionId, replicaId, auid.current)
            if (leaving.current) return

            setRoom(next)
            setIsLoading(false)

            const destination = resolveWaitDestination({
                replicaStatus: next.replicaStatus,
                isPanelFinished: next.isPanelFinished,
                currentCandidateId: next.currentCandidateId,
                hasCompletedCurrentCandidate: next.hasCompletedCurrentCandidate,
                waitingOnCandidateId: waitingOn.current,
                recentSubmission: recentSubmission(),
            })

            switch (destination.kind) {
                case "results":
                    leaving.current = true
                    router.replace(`/results/${commissionId}`)
                    return
                case "panelSummary":
                    leaving.current = true
                    router.replace(`/panel-summary/${commissionId}/${replicaId}`)
                    return
                case "candidate":
                    leaving.current = true
                    router.replace(`/evaluation/${destination.candidateId}`)
                    return
                case "wait":
                    break
            }

            waitingOn.current = next.currentCandidateId
        } catch {
            // A failed poll is not a signal — try again on the next tick.
        }
    }, [commissionId, replicaId, router])

    useEffect(() => {
        // Cleared here, not only on mount: the flag is also set when a
        // destination is taken, and a re-run must not inherit a dead poll.
        leaving.current = false
        poll()
        const timer = setInterval(poll, POLL_INTERVAL_MS)
        return () => {
            leaving.current = true
            clearInterval(timer)
        }
    }, [poll])

    const advance = useCallback(async () => {
        const candidateId = room.currentCandidateId
        if (!candidateId || isAdvancing) return
        setIsAdvancing(true)
        const headers = auid.current ? { headers: { "x-actor": auid.current } } : undefined
        try {
            const { nextCandidateId } = await advancePanel(
                {
                    markEvaluated: async (id) => {
                        await sdk.MarkCommissionReplicaCandidateAsEvaluated({ id }, headers)
                    },
                    panels: async (id) =>
                        (await sdk.GetReplicaCandidates({ replicaId: id })).commissionReplica
                            ?.replicaPanels ?? [],
                    setCurrentCandidate: async (id, panelId, currentCandidateId) => {
                        await sdk.DevSetCommissionReplicaPanelCurrentCandidate(
                            { id, panelId, currentCandidateId },
                            headers,
                        )
                    },
                    completePanel: async (id, panelId) => {
                        await sdk.DevCompleteCommissionReplicaPanel({ id, panelId }, headers)
                    },
                },
                replicaId,
                candidateId,
            )
            if (!nextCandidateId) {
                leaving.current = true
                router.replace(`/panel-summary/${commissionId}/${replicaId}`)
                return
            }
            // The next poll picks the new candidate up, as on the web.
            await poll()
        } catch (error) {
            setIsAdvancing(false)
            throw error instanceof AdvancePanelError
                ? error
                : new AdvancePanelError("commission.markEvaluatedErrorGeneric", error)
        }
        setIsAdvancing(false)
    }, [room.currentCandidateId, isAdvancing, replicaId, commissionId, router, poll])

    /**
     * The chair confirming a judge's draft. The poll brings the confirmed
     * evaluation back; this only keeps the button from flashing back in
     * between.
     */
    const confirm = useCallback(
        async (evaluationId: string) => {
            const headers = auid.current ? { headers: { "x-actor": auid.current } } : undefined
            await sdk.ConfirmEvaluation({ id: evaluationId }, headers)
            setRoom((previous) => ({
                ...previous,
                progress: previous.progress.map((row) =>
                    row.evaluation?.id === evaluationId
                        ? {
                              ...row,
                              isCompleted: true,
                              evaluation: { ...row.evaluation, status: "CONFIRMED", isComplete: true },
                          }
                        : row,
                ),
                myEvaluation:
                    previous.myEvaluation?.id === evaluationId
                        ? { ...previous.myEvaluation, status: "CONFIRMED", isComplete: true }
                        : previous.myEvaluation,
            }))
        },
        [],
    )

    return { room, isLoading, isAdvancing, advance, confirm }
}
