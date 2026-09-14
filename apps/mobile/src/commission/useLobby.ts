import { useCallback, useEffect, useState } from "react"
import { useRouter } from "expo-router"
import { resolveLobbyState, type LobbyState } from "@winelore/core/commission"
import { sdk } from "../api/client"
import { getStoredSession } from "../auth/session"

const POLL_INTERVAL_MS = 3000

export interface LobbyView {
    commissionName: string
    competitionName: string
    replicaId: string
    replicaName: string
    members: Array<{ id: string; label: string; isReady: boolean; isHead: boolean }>
    candidateCount: number
    lobby: LobbyState
}

type State = { status: "loading" } | { status: "error" } | { status: "ready"; view: LobbyView }

/**
 * The lobby for the replica this user judges.
 *
 * Polls, because readiness is other people changing state: a judge watches the
 * room fill up. Once the chair starts, everyone is routed into the session from
 * here rather than having to notice and tap.
 */
export function useLobby(commissionId: string, replicaId: string) {
    const router = useRouter()
    const [state, setState] = useState<State>({ status: "loading" })
    const [isMutating, setIsMutating] = useState(false)

    const load = useCallback(async () => {
        try {
            const [{ commission }, session] = await Promise.all([
                sdk.GetCommission({ id: commissionId }),
                getStoredSession(),
            ])
            const replica = commission?.replicas?.find((r) => r.id === replicaId)
            if (!commission || !replica) {
                setState({ status: "error" })
                return
            }

            const candidateCount = (commission.panels ?? []).reduce(
                (total, panel) => total + (panel.candidates?.length ?? 0),
                0,
            )
            const lobby = resolveLobbyState(replica as never, session?.auid ?? null, candidateCount)

            // A finished replica has results, not a lobby.
            if (replica.status === "COMPLETED") {
                router.replace(`/results/${commissionId}`)
                return
            }

            // The chair has started: everyone goes in. Sequencing takes over
            // from the waiting room and finds the right candidate.
            if (lobby.isRunning) {
                router.replace(`/wait/${commissionId}/${replicaId}`)
                return
            }

            setState({
                status: "ready",
                view: {
                    commissionName: commission.name ?? "",
                    competitionName: commission.competition?.name ?? "",
                    replicaId,
                    replicaName: replica.name ?? "",
                    members: (replica.members ?? []).map((member) => ({
                        id: member.id,
                        // AXUS ids until display names are resolved here; the
                        // web shows the same until its username lookup returns.
                        label: String(member.auid),
                        isReady: Boolean(member.isReady),
                        isHead: member.role === "HEAD",
                    })),
                    candidateCount,
                    lobby,
                },
            })
        } catch {
            setState({ status: "error" })
        }
    }, [commissionId, replicaId, router])

    useEffect(() => {
        load()
        const timer = setInterval(load, POLL_INTERVAL_MS)
        return () => clearInterval(timer)
    }, [load])

    const setReady = useCallback(
        async (ready: boolean) => {
            if (state.status !== "ready" || isMutating) return
            const memberId = state.view.lobby.myMemberId
            if (!memberId) return

            setIsMutating(true)
            try {
                if (ready) {
                    await sdk.MarkReplicaMemberReady({ replicaId, memberId })
                } else {
                    await sdk.MarkReplicaMemberNotReady({ replicaId, memberId })
                }
                await load()
            } finally {
                setIsMutating(false)
            }
        },
        [state, isMutating, replicaId, load],
    )

    const start = useCallback(async () => {
        if (state.status !== "ready" || isMutating || !state.view.lobby.canStart) return
        setIsMutating(true)
        try {
            await sdk.StartCommissionReplica({ id: replicaId })
            router.replace(`/wait/${commissionId}/${replicaId}`)
        } catch {
            // Stay in the lobby so the chair can retry; the poll will route
            // everyone on if the mutation actually landed.
            setIsMutating(false)
        }
    }, [state, isMutating, replicaId, commissionId, router])

    return { state, isMutating, setReady, start }
}
