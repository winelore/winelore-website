import { useEffect } from "react"
import { useRouter } from "expo-router"
import { isReplicaCandidateFinished } from "@winelore/core/evaluation"
import { sdk } from "../api/client"

const POLL_INTERVAL_MS = 3000

/**
 * Watches for the chair moving the panel on, and navigates when they do.
 *
 * The inverse of usePanelSequencing: that one decides when to leave a
 * scorecard, this one decides when a waiting judge gets a new one. A candidate
 * is offered only while it is unfinished — a judge who has already scored the
 * panel's current candidate keeps waiting rather than reopening it.
 */
export function useWaitForNextCandidate({
    commissionId,
    replicaId,
}: {
    commissionId: string | undefined
    replicaId: string | undefined
}) {
    const router = useRouter()

    useEffect(() => {
        if (!commissionId || !replicaId) return

        let active = true
        let inFlight = false

        const check = async () => {
            if (!active || inFlight) return
            inFlight = true
            try {
                const { commission } = await sdk.GetCommission({ id: commissionId })
                if (!active) return

                const replica = commission?.replicas?.find((r) => r.id === replicaId)
                if (replica?.status === "COMPLETED") {
                    active = false
                    router.replace(`/results/${commissionId}`)
                    return
                }

                const panel = replica?.replicaPanels?.find(
                    (p) => p.id === replica?.currentPanelId || p.currentCandidateId,
                )
                const currentCandidateId = panel?.currentCandidateId
                if (!currentCandidateId) return

                const candidate = panel?.replicaCandidates?.find(
                    (c) => c.id === currentCandidateId,
                )
                if (isReplicaCandidateFinished(candidate?.status)) return

                active = false
                router.replace(`/evaluation/${currentCandidateId}`)
            } catch {
                // A failed poll is not a signal — try again on the next tick.
            } finally {
                inFlight = false
            }
        }

        check()
        const timer = setInterval(check, POLL_INTERVAL_MS)
        return () => {
            active = false
            clearInterval(timer)
        }
    }, [commissionId, replicaId, router])
}
