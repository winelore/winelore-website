"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CompetitionPageData } from "@winelore/core/competition"
import type { CompetitionExportContext } from "@winelore/core/results"
import type { Locale } from "@winelore/core/i18n"

type ResultsLoader = (
    commissions: { id: string; name: string; status: string }[],
    competitionName: string,
    locale: Locale,
) => Promise<CompetitionExportContext>

export function useCompetitionResultsData(
    competition: Pick<CompetitionPageData, "id" | "name" | "commissions">,
    locale: Locale,
    fetchResults: ResultsLoader,
    onLoadError: (error: unknown) => void,
) {
    const commissions = competition.commissions.map(({ id, name, status }) => ({ id, name, status }))
    const scopeKey = JSON.stringify([competition.id, commissions.map(({ id }) => id)])
    // Server renders can supply new arrays with identical values. Only a real
    // change to the request should restart loading, including after filtering.
    const requestKey = JSON.stringify({ scopeKey, commissions, name: competition.name, locale })
    const request = useMemo(() => JSON.parse(requestKey) as {
        scopeKey: string
        commissions: Parameters<ResultsLoader>[0]
        name: string
        locale: Locale
    }, [requestKey])

    const [state, setState] = useState<{
        scopeKey: string
        context: CompetitionExportContext | null
        lastRefreshedAt: Date | null
        loading: boolean
    }>({ scopeKey, context: null, lastRefreshedAt: null, loading: true })
    const fetchRef = useRef(fetchResults)
    fetchRef.current = fetchResults
    const errorRef = useRef(onLoadError)
    errorRef.current = onLoadError
    const refreshRef = useRef<(() => Promise<void>) | null>(null)

    useEffect(() => {
        let active = true
        let inFlight: Promise<void> | null = null
        setState((previous) => previous.scopeKey === request.scopeKey ? previous : {
            scopeKey: request.scopeKey, context: null, lastRefreshedAt: null, loading: true,
        })

        const load = (background = false): Promise<void> => {
            if (background && typeof document !== "undefined" && document.hidden) return Promise.resolve()
            // Initial loading, SSE, and polling share the same request guard.
            if (inFlight) return inFlight
            inFlight = Promise.resolve().then(async () => {
                try {
                    const context = await fetchRef.current(request.commissions, request.name, request.locale)
                    if (active) setState({
                        scopeKey: request.scopeKey, context, lastRefreshedAt: new Date(), loading: false,
                    })
                } catch (error) {
                    if (!active) return
                    console.error("[results] Failed to load competition results:", error)
                    if (!background) errorRef.current(error)
                } finally {
                    if (active) setState((previous) => previous.loading ? { ...previous, loading: false } : previous)
                    inFlight = null
                }
            })
            return inFlight
        }

        refreshRef.current = () => load(true)
        void load()
        return () => {
            // A late response from an old competition or locale must not
            // overwrite the current results or toggle its loading state.
            active = false
            refreshRef.current = null
        }
    }, [request])

    const refresh = useCallback(() => refreshRef.current?.() ?? Promise.resolve(), [])
    const current = state.scopeKey === scopeKey
    return {
        allResultsContext: current ? state.context : null,
        lastRefreshedAt: current ? state.lastRefreshedAt : null,
        isLoadingData: current ? state.loading : true,
        refresh,
    }
}
