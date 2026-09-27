import { useCallback, useEffect, useRef, useState } from "react"
import { useFocusEffect } from "expo-router"
import { GET_COMMISSION_TEMPLATES_DEEP_QUERY } from "@winelore/core"
import { loadCommissionPage, type CommissionPageData } from "@winelore/core/commission"
import { fetchGraphQLRaw, sdk } from "../api/client"
import { getStoredSession } from "../auth/session"

/** The web page polls every three seconds, whatever the status: readiness is other people. */
const POLL_MS = 3000

export type CommissionPageState =
    | { status: "loading" }
    | { status: "notFound" }
    | { status: "error" }
    | { status: "ready"; page: CommissionPageData; auid: string | null }

/**
 * One commission, as the web's /commission/[id] loads it — core's
 * `loadCommissionPage`, the call the web's action makes — polled every three
 * seconds while the screen is in front. A poll that fails keeps what is on
 * screen; only a failed first load shows the error.
 */
export function useCommissionPage(id: string) {
    const [state, setState] = useState<CommissionPageState>({ status: "loading" })
    const stateRef = useRef(state)
    stateRef.current = state

    const load = useCallback(async () => {
        try {
            const [page, session] = await Promise.all([
                loadCommissionPage(
                    async (commissionId) => (await sdk.GetCommission({ id: commissionId })).commission,
                    (commissionId) => fetchGraphQLRaw<any>(GET_COMMISSION_TEMPLATES_DEEP_QUERY, { id: commissionId }),
                    id,
                ),
                getStoredSession(),
            ])
            setState(page ? { status: "ready", page, auid: session?.auid ?? null } : { status: "notFound" })
        } catch {
            if (stateRef.current.status !== "ready") setState({ status: "error" })
        }
    }, [id])

    useEffect(() => {
        setState({ status: "loading" })
        load()
    }, [load])

    useFocusEffect(
        useCallback(() => {
            let busy = false
            const timer = setInterval(async () => {
                if (busy) return
                busy = true
                await load()
                busy = false
            }, POLL_MS)
            return () => clearInterval(timer)
        }, [load]),
    )

    /** Show a change at once, as the web patches its state, before the next poll confirms it. */
    const patch = useCallback((update: (page: CommissionPageData) => CommissionPageData) => {
        setState((current) => (current.status === "ready" ? { ...current, page: update(current.page) } : current))
    }, [])

    return { state, reload: load, patch }
}
