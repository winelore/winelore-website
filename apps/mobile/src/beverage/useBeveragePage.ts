import { useCallback, useEffect, useSyncExternalStore } from "react"
import { loadBeveragePage, type BeveragePageData, type RawBeverage } from "@winelore/core/beverage"
import { fetchGraphQLRaw } from "../api/client"
import { getStoredSession } from "../auth/session"

export type BeveragePageState =
    | { status: "loading" }
    | { status: "notFound" }
    | { status: "error" }
    | { status: "ready"; page: BeveragePageData; auid: string | null }

const LOADING: BeveragePageState = { status: "loading" }

/**
 * Loaded beverage pages by id, outside any one screen.
 *
 * The edit and samples sheets are screens of their own, above the page, and
 * read the beverage from here rather than fetching it again; an edit made in
 * a sheet is written back here, so the page behind it is already up to date
 * when the sheet goes — which is what the web does by patching its state
 * from each mutation's response.
 */
const pages = new Map<string, BeveragePageState>()
const listeners = new Map<string, Set<() => void>>()
const loads = new Map<string, Promise<void>>()

function set(id: string, state: BeveragePageState) {
    pages.set(id, state)
    listeners.get(id)?.forEach((listener) => listener())
}

function subscribe(id: string, listener: () => void) {
    let set = listeners.get(id)
    if (!set) listeners.set(id, (set = new Set()))
    set.add(listener)
    return () => {
        set.delete(listener)
    }
}

/**
 * Fetch the page. A reload that fails keeps what is on screen; only a first
 * load shows the error. Concurrent calls share one request.
 */
export function loadBeverage(id: string): Promise<void> {
    let pending = loads.get(id)
    if (pending) return pending
    pending = (async () => {
        try {
            const [page, session] = await Promise.all([
                loadBeveragePage((query, variables) => fetchGraphQLRaw(query, variables), id),
                getStoredSession(),
            ])
            set(id, page ? { status: "ready", page, auid: session?.auid ?? null } : { status: "notFound" })
        } catch {
            if (pages.get(id)?.status !== "ready") set(id, { status: "error" })
        } finally {
            loads.delete(id)
        }
    })()
    loads.set(id, pending)
    return pending
}

/** Apply a mutation's result to the loaded beverage. */
export function patchBeverage(id: string, patch: Partial<RawBeverage>) {
    const state = pages.get(id)
    if (state?.status !== "ready") return
    set(id, { ...state, page: { ...state.page, beverage: { ...state.page.beverage, ...patch } } })
}

/** The page as last loaded, without fetching. */
export function useBeverageSnapshot(id: string): BeveragePageState {
    return useSyncExternalStore(
        useCallback((listener: () => void) => subscribe(id, listener), [id]),
        () => pages.get(id) ?? LOADING,
    )
}

/**
 * For the sheets above the page: what the page already loaded, fetched only
 * if it has not been — as when a link opens a sheet directly.
 */
export function useLoadedBeverage(id: string): BeveragePageState {
    const state = useBeverageSnapshot(id)
    useEffect(() => {
        if (!pages.has(id)) loadBeverage(id)
    }, [id])
    return state
}

/** The page, fetched fresh each time the screen opens. */
export function useBeveragePage(id: string) {
    const state = useBeverageSnapshot(id)
    const reload = useCallback(() => loadBeverage(id), [id])
    useEffect(() => {
        reload()
    }, [reload])
    return { state, reload }
}
