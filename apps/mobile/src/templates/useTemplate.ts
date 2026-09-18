import { useCallback, useEffect, useRef, useState } from "react"
import { loadTemplateDetail, type TemplateDetail } from "@winelore/core/commission"
import { fetchGraphQLRaw } from "../api/client"
import { getStoredSession } from "../auth/session"

export type TemplateState =
    | { status: "loading" }
    | { status: "notFound" }
    | { status: "error" }
    | { status: "ready"; template: TemplateDetail; auid: string | null }

/**
 * One template and its editions, as the web's /templates/[id] loads it —
 * core's `loadTemplateDetail`, the call the web's action makes. A reload
 * that fails keeps what is on screen.
 */
export function useTemplate(id: string) {
    const [state, setState] = useState<TemplateState>({ status: "loading" })
    const stateRef = useRef(state)
    stateRef.current = state

    const load = useCallback(async () => {
        try {
            const [template, session] = await Promise.all([
                loadTemplateDetail((query, variables) => fetchGraphQLRaw<any>(query, variables), id),
                getStoredSession(),
            ])
            setState(template ? { status: "ready", template, auid: session?.auid ?? null } : { status: "notFound" })
        } catch {
            if (stateRef.current.status !== "ready") setState({ status: "error" })
        }
    }, [id])

    useEffect(() => {
        setState({ status: "loading" })
        load()
    }, [load])

    return { state, reload: load }
}
