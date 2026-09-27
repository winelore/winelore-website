import { useCallback, useEffect, useRef, useState } from "react"
import { useFocusEffect } from "expo-router"
import {
    GET_COMPETITION_PAGE_WITH_MEMBERS,
    toCompetitionPage,
    type CompetitionPageData,
    type RawCompetitionPageCommission,
    type RawCompetitionPageCompetition,
} from "@winelore/core/competition"
import { selectCommissionsForUser, type DashboardCommission } from "@winelore/core/dashboard"
import { fetchGraphQLRaw } from "../api/client"
import { getStoredSession } from "../auth/session"

/** The web page polls every three seconds until the competition is over. */
const POLL_MS = 3000

export type CompetitionPageState =
    | { status: "loading" }
    | { status: "notFound" }
    | { status: "error" }
    | {
          status: "ready"
          page: CompetitionPageData
          /** Commission id -> the replica this user judges, where they are on it. */
          replicaIds: Record<string, string>
          auid: string | null
      }

interface Response {
    competition?: RawCompetitionPageCompetition | null
    commissionsByCompetition?: { items?: Array<RawCompetitionPageCommission & DashboardCommission> } | null
}

/**
 * One competition, as the web's /competition/[id] loads it, kept fresh the
 * way the web keeps it: polled every few seconds until it has completed, so
 * a holder starting it on another device shows up here.
 *
 * Polling runs only while the screen is in front. A poll that fails keeps
 * what is on screen; only a failed first load shows the error.
 */
export function useCompetitionPage(id: string) {
    const [state, setState] = useState<CompetitionPageState>({ status: "loading" })
    const stateRef = useRef(state)
    stateRef.current = state

    const load = useCallback(async () => {
        try {
            const [response, session] = await Promise.all([
                fetchGraphQLRaw<Response>(GET_COMPETITION_PAGE_WITH_MEMBERS, { id }),
                getStoredSession(),
            ])
            if (!response?.competition) {
                setState({ status: "notFound" })
                return
            }
            const commissions = response.commissionsByCompetition?.items ?? []
            const auid = session?.auid ?? null
            // Shared with the home screen: the replica a member judges, matched
            // through nested auids.
            const replicaIds: Record<string, string> = {}
            for (const commission of selectCommissionsForUser(commissions, auid)) {
                if (commission.replicaId) replicaIds[commission.id] = commission.replicaId
            }
            setState({ status: "ready", page: toCompetitionPage(response.competition, commissions), replicaIds, auid })
        } catch {
            if (stateRef.current.status !== "ready") setState({ status: "error" })
        }
    }, [id])

    useEffect(() => {
        setState({ status: "loading" })
        load()
    }, [load])

    const completed = state.status === "ready" && state.page.status === "COMPLETED"
    useFocusEffect(
        useCallback(() => {
            if (completed) return
            let busy = false
            const timer = setInterval(async () => {
                if (busy) return
                busy = true
                await load()
                busy = false
            }, POLL_MS)
            return () => clearInterval(timer)
        }, [completed, load]),
    )

    return { state, reload: load }
}
