import { useCallback, useEffect, useRef, useState } from "react"
import { LIST_PAGE_SIZE } from "@winelore/core/dashboard"

/** One page as the backend returns it: some items, and how many there are in all. */
export interface Page<T> {
    items: T[]
    total: number
}

/** What a list screen renders, whichever way its items were fetched. */
export interface ListState<T> {
    status: "loading" | "error" | "ready"
    items: T[]
    /** How many there are in all — the web's count label. */
    total: number
    hasMore: boolean
    loadingMore: boolean
    /** The last page failed; the items so far stay on screen. */
    loadMoreFailed: boolean
}

export interface ListController<T> extends ListState<T> {
    refresh: () => Promise<void>
    loadMore: () => void
}

const INITIAL: ListState<never> = {
    status: "loading",
    items: [],
    total: 0,
    hasMore: false,
    loadingMore: false,
    loadMoreFailed: false,
}

/**
 * A list fetched a page at a time as it scrolls — the phone's form of the
 * web's numbered pagination. Pages are the web's size, so both walk the same
 * offsets through the same query.
 *
 * Offsets shift when something is added upstream while scrolling, so a page
 * can repeat an item from the one before; those are dropped by id. A refresh
 * keeps the current items on screen until the first page replaces them.
 */
export function usePagedList<T extends { id: string }>(
    fetchPage: (offset: number, limit: number) => Promise<Page<T>>,
): ListController<T> {
    const [state, setState] = useState<ListState<T>>(INITIAL)
    // Mirrors `state` synchronously, for the guards below.
    const stateRef = useRef<ListState<T>>(INITIAL)
    const commit = useCallback((next: ListState<T>) => {
        stateRef.current = next
        setState(next)
    }, [])
    // The latest fetcher, so callers may pass an inline function without the
    // list reloading on every render.
    const fetcher = useRef(fetchPage)
    fetcher.current = fetchPage
    // Bumped by a refresh, so a page still in flight from before it is dropped.
    const generation = useRef(0)

    const refresh = useCallback(async () => {
        const current = ++generation.current
        // Retrying a failed load shows the skeletons again, not the error.
        if (stateRef.current.status === "error") commit(INITIAL)
        try {
            const page = await fetcher.current(0, LIST_PAGE_SIZE)
            if (current !== generation.current) return
            commit({
                status: "ready",
                items: page.items,
                total: page.total,
                hasMore: page.items.length === LIST_PAGE_SIZE && page.items.length < page.total,
                loadingMore: false,
                loadMoreFailed: false,
            })
        } catch {
            if (current !== generation.current) return
            const previous = stateRef.current
            // Keep what was on screen if a pull-to-refresh fails.
            commit(previous.status === "ready" ? { ...previous, loadingMore: false } : { ...INITIAL, status: "error" })
        }
    }, [commit])

    const loadMore = useCallback(() => {
        const previous = stateRef.current
        if (previous.status !== "ready" || !previous.hasMore || previous.loadingMore) return
        const current = generation.current
        commit({ ...previous, loadingMore: true, loadMoreFailed: false })

        fetcher.current(previous.items.length, LIST_PAGE_SIZE).then(
            (page) => {
                if (current !== generation.current) return
                const items = stateRef.current.items
                const seen = new Set(items.map((item) => item.id))
                const merged = [...items, ...page.items.filter((item) => !seen.has(item.id))]
                commit({
                    status: "ready",
                    items: merged,
                    total: page.total,
                    hasMore: page.items.length === LIST_PAGE_SIZE && merged.length < page.total,
                    loadingMore: false,
                    loadMoreFailed: false,
                })
            },
            () => {
                if (current !== generation.current) return
                commit({ ...stateRef.current, loadingMore: false, loadMoreFailed: true })
            },
        )
    }, [commit])

    useEffect(() => {
        refresh()
    }, [refresh])

    return { ...state, refresh, loadMore }
}
