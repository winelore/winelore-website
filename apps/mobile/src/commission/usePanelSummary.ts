import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "expo-router"
import {
    isReplicaCandidateFinished,
    resolvePanelSummaryDestination,
} from "@winelore/core/evaluation"
import { normalizeAuids } from "@winelore/core"
import { sdk } from "../api/client"
import { getStoredSession } from "../auth/session"

const POLL_INTERVAL_MS = 3000

export interface PanelSummaryView {
    panelId: string
    panelName: string
    /** Candidates in this panel, with whether each is finished. */
    candidates: Array<{ id: string; code: string; isFinished: boolean }>
    /** The next panel to run, when one remains. */
    nextPanelId: string | null
    nextPanelFirstCandidateId: string | null
    /** Whether the signed-in user chairs this replica and may advance it. */
    isHead: boolean
}

type State =
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; view: PanelSummaryView }

/**
 * Drives the panel summary: polls, navigates when the session moves on, and
 * exposes the chair's controls.
 *
 * Where to go is `resolvePanelSummaryDestination` in core, shared with the web,
 * including the rule that a summary must not silently become a different
 * panel's summary when the chair advances.
 */
export function usePanelSummary(commissionId: string, replicaId: string) {
    const router = useRouter()
    const [state, setState] = useState<State>({ status: "loading" })
    const [isAdvancing, setIsAdvancing] = useState(false)
    // The panel this summary was opened for; set on the first successful poll.
    const shownPanelId = useRef<string | null>(null)
    const leaving = useRef(false)

    const load = useCallback(async () => {
        if (leaving.current) return
        try {
            const [{ commission }, session] = await Promise.all([
                sdk.GetCommission({ id: commissionId }),
                getStoredSession(),
            ])
            if (leaving.current) return

            const replica = commission?.replicas?.find((r) => r.id === replicaId)
            const panel = replica?.replicaPanels?.find(
                (p) => p.panel.id === replica?.currentPanelId,
            )

            const destination = resolvePanelSummaryDestination({
                replicaStatus: replica?.status ?? null,
                currentPanelId: replica?.currentPanelId ?? null,
                isPanelFinished: panel?.status === "COMPLETED",
                currentCandidateId: panel?.currentCandidateId ?? null,
                shownPanelId: shownPanelId.current,
            })

            if (destination.kind !== "stay") {
                leaving.current = true
                switch (destination.kind) {
                    case "results":
                        router.replace(`/results/${commissionId}`)
                        return
                    case "commission":
                        router.replace("/")
                        return
                    case "candidate":
                        router.replace(`/evaluation/${destination.candidateId}`)
                        return
                    case "wait":
                        router.replace(`/wait/${commissionId}/${replicaId}`)
                        return
                }
            }

            shownPanelId.current = destination.panelId

            // Panels run in declaration order; the next one is whatever follows
            // this panel in the replica's list.
            const panels = replica?.replicaPanels ?? []
            const index = panels.findIndex((p) => p.panel.id === destination.panelId)
            const next = index >= 0 ? panels[index + 1] : undefined
            const nextFirstCandidate = next?.replicaCandidates?.[0]

            const auid = session?.auid
            const isHead = Boolean(
                auid &&
                    replica?.members?.some(
                        (m) => m.role === "HEAD" && normalizeAuids(m.auid).includes(auid),
                    ),
            )

            setState({
                status: "ready",
                view: {
                    panelId: destination.panelId,
                    panelName: panel?.panel.name ?? "",
                    candidates: (panel?.replicaCandidates ?? []).map((c) => ({
                        id: c.id,
                        code: c.candidate?.anonymizedCode?.trim() || c.id.slice(0, 8),
                        isFinished: isReplicaCandidateFinished(c.status),
                    })),
                    nextPanelId: next?.panel.id ?? null,
                    nextPanelFirstCandidateId: nextFirstCandidate?.id ?? null,
                    isHead,
                },
            })
        } catch {
            setState((previous) =>
                previous.status === "ready" ? previous : { status: "error" },
            )
        }
    }, [commissionId, replicaId, router])

    useEffect(() => {
        load()
        const timer = setInterval(load, POLL_INTERVAL_MS)
        return () => clearInterval(timer)
    }, [load])

    return { state, isAdvancing, setIsAdvancing, markLeaving: () => (leaving.current = true) }
}
