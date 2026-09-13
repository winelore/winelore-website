import { useCallback, useEffect, useState } from "react"
import {
    GET_DASHBOARD_COMMISSIONS,
    selectActiveCommissions,
    type ActiveCommission,
} from "@winelore/core/dashboard"
import { fetchGraphQLRaw } from "../api/client"
import { getStoredSession } from "../auth/session"

const PAGE_SIZE = 100

type State =
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; commissions: ActiveCommission[] }

/**
 * The signed-in judge's active commissions.
 *
 * The backend has no "commissions I am on" query, so the web page pages through
 * all of them and filters client-side; this does the same, and shares the
 * filter itself with the web through `selectActiveCommissions`.
 */
export function useDashboard() {
    const [state, setState] = useState<State>({ status: "loading" })

    const load = useCallback(async () => {
        try {
            const session = await getStoredSession()
            if (!session?.auid) {
                setState({ status: "ready", commissions: [] })
                return
            }

            const all: unknown[] = []
            let offset = 0
            // Paged rather than one large request: the list grows with every
            // competition the instance has ever run.
            for (;;) {
                const response = await fetchGraphQLRaw<any>(GET_DASHBOARD_COMMISSIONS, {
                    limit: PAGE_SIZE,
                    offset,
                })
                const items = response?.commissions?.items ?? []
                all.push(...items)
                if (items.length < PAGE_SIZE) break
                offset += PAGE_SIZE
            }

            setState({
                status: "ready",
                commissions: selectActiveCommissions(all as never, session.auid),
            })
        } catch {
            setState({ status: "error" })
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    return { state, reload: load }
}
