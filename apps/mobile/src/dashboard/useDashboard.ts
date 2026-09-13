import { useCallback, useEffect, useState } from "react"
import {
    GET_DASHBOARD_COMMISSIONS,
    selectCommissionsForUser,
    ACTIVE_COMMISSION_STATUSES,
    type ActiveCommission,
    type SelectCommissionsOptions,
} from "@winelore/core/dashboard"
import { fetchGraphQLRaw } from "../api/client"
import { getStoredSession } from "../auth/session"

const PAGE_SIZE = 100

type State =
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; commissions: ActiveCommission[] }

/**
 * The commissions the signed-in user is a member of.
 *
 * The backend has no "commissions I am on" query, so the web pages through all
 * of them and filters client-side; this does the same, and shares the filter
 * with the web through `selectCommissionsForUser`.
 *
 * Pass no options for the full history, as the my-commissions list wants;
 * `dashboardOptions` narrows it to live work for the home screen.
 */
export function useCommissions(options: SelectCommissionsOptions = {}) {
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
                commissions: selectCommissionsForUser(all as never, session.auid, options),
            })
        } catch {
            setState({ status: "error" })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options.limit, options.statuses])

    useEffect(() => {
        load()
    }, [load])

    return { state, reload: load }
}

/** What the home screen shows: live work only, capped to a summary panel. */
export const dashboardOptions: SelectCommissionsOptions = {
    statuses: ACTIVE_COMMISSION_STATUSES,
    limit: 8,
}
