import { useCallback, useEffect, useRef, useState } from "react"
import { useFocusEffect } from "expo-router"
import { GET_COMMISSION_TEMPLATES_DEEP_QUERY } from "@winelore/core"
import type { CompetitionPageData } from "@winelore/core/competition"
import {
    GET_BEVERAGE_AWARDS,
    GET_COMMISSION_COMPETITION,
    GET_COMMISSION_RESULTS,
    GET_COMPETITION_RESULTS_SCOPE,
    cachedFetch,
    loadCompetitionResults,
    resolveCompetitionResultsScope,
    type CompetitionExportContext,
    type CompetitionResultsScopeResponse,
    type CompetitionResultsSource,
} from "@winelore/core/results"
import { fetchGraphQLRaw, sdk } from "../api/client"
import { getStoredSession } from "../auth/session"
import { useEvaluationLiveUpdates } from "../events"

export type ResultsScopeState =
    | { status: "loading" }
    /** The competition could not be loaded: the web's "Error Loading Results". */
    | { status: "unavailable" }
    | { status: "forbidden" }
    | { status: "ready"; competition: CompetitionPageData; commissionId: string | null; auid: string | null }

/**
 * Which commissions' results this user may see — the web page's server-side
 * check, run by the same core function. A null `competitionId` — a
 * commission whose competition was not found — is unavailable.
 */
export function useResultsScope(competitionId: string | null, requestedCommissionId: string | null) {
    const [state, setState] = useState<ResultsScopeState>({ status: "loading" })

    const load = useCallback(async () => {
        if (!competitionId) {
            setState({ status: "unavailable" })
            return
        }
        try {
            const [response, session] = await Promise.all([
                fetchGraphQLRaw<CompetitionResultsScopeResponse>(GET_COMPETITION_RESULTS_SCOPE, { id: competitionId }),
                getStoredSession(),
            ])
            const auid = session?.auid ?? null
            const scope = resolveCompetitionResultsScope(response, auid, requestedCommissionId)
            setState(scope.status === "ready" ? { ...scope, auid } : scope)
        } catch {
            setState({ status: "unavailable" })
        }
    }, [competitionId, requestedCommissionId])

    useEffect(() => {
        setState({ status: "loading" })
        load()
    }, [load])

    return { state, reload: load }
}

/**
 * The competition a commission belongs to, for the commission's results —
 * which the web shows by redirecting to its competition's, narrowed to it.
 */
export function useCommissionCompetition(commissionId: string) {
    const [state, setState] = useState<{ status: "loading" } | { status: "missing" } | { status: "found"; id: string }>({
        status: "loading",
    })
    useEffect(() => {
        let active = true
        setState({ status: "loading" })
        fetchGraphQLRaw<{ commission?: { competition?: { id?: string } | null } | null }>(GET_COMMISSION_COMPETITION, {
            id: commissionId,
        })
            .then((response) => {
                const id = response?.commission?.competition?.id
                if (active) setState(id ? { status: "found", id } : { status: "missing" })
            })
            .catch(() => active && setState({ status: "missing" }))
        return () => {
            active = false
        }
    }, [commissionId])
    return state
}

// The page refreshes every few seconds while a competition runs; these keep
// each refresh from re-fetching everything, with the web's lifetimes.
const templates = cachedFetch(
    (commissionId) => fetchGraphQLRaw<any>(GET_COMMISSION_TEMPLATES_DEEP_QUERY, { id: commissionId }),
    5 * 60 * 1000,
)
const evaluations = cachedFetch(async (key) => {
    const [auid, replicaCandidateId] = key.split("|")
    // The web sends its reads of evaluations as the signed-in user, too.
    const result = await sdk.GetEvaluationsForCandidate(
        { replicaCandidateId, limit: 50 },
        auid ? { headers: { "x-actor": auid } } : undefined,
    )
    return (result?.evaluationsByReplicaCandidate?.items ?? []) as any[]
}, 3_000)
const beverageAwards = cachedFetch(async (beverageId) => {
    const result = await fetchGraphQLRaw<any>(GET_BEVERAGE_AWARDS, { beverageId })
    return result?.beverageAwards ?? []
}, 3_000)

function sourceFor(auid: string | null): CompetitionResultsSource {
    return {
        commission: async (id) => (await fetchGraphQLRaw<any>(GET_COMMISSION_RESULTS, { id }))?.commission,
        templates,
        evaluations: (replicaCandidateId) => evaluations(`${auid ?? ""}|${replicaCandidateId}`),
        beverageAwards,
    }
}

/**
 * Every visible commission's rows, built by core from the same fetches the
 * web's server action makes. While the competition has not completed they
 * refresh on live SSE events with a 3s fallback poll, as the web
 * page does — here only while the screen is in front. A refresh that fails
 * keeps what is shown.
 */
export function useResultsData(competition: CompetitionPageData, auid: string | null) {
    const [context, setContext] = useState<CompetitionExportContext | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)
    const busy = useRef(false)

    const load = useCallback(async () => {
        if (busy.current) return
        busy.current = true
        try {
            const loaded = await loadCompetitionResults(
                sourceFor(auid),
                competition.commissions,
                competition.name,
                auid,
            )
            setContext(loaded)
            setLastRefreshedAt(new Date())
        } catch {
            // Kept as it was; the first load's failure shows as no results.
        } finally {
            busy.current = false
            setLoading(false)
        }
    }, [competition, auid])

    useEffect(() => {
        setLoading(true)
        load()
    }, [load])

    const completed = competition.status === "COMPLETED"
    const [isFocused, setIsFocused] = useState(true)

    useFocusEffect(
        useCallback(() => {
            setIsFocused(true)
            return () => setIsFocused(false)
        }, []),
    )

    // A live event invalidates the short-lived evaluation/award caches first,
    // like the web's fresh server-action refetch — otherwise an SSE-triggered
    // reload inside the 3s TTL would just re-read stale cache entries.
    const handleLiveUpdate = useCallback(() => {
        evaluations.clear()
        beverageAwards.clear()
        load()
    }, [load])

    // No commissionId/replicaId scope: results aggregate every visible
    // commission, so any evaluation, outcome, replica, or commission event is
    // relevant — matching isEvaluationRelevantEvent's accept-all empty context.
    useEvaluationLiveUpdates({
        enabled: !completed && isFocused,
        onUpdate: handleLiveUpdate,
        fallbackIntervalMs: 3_000,
    })

    return { context, loading, lastRefreshedAt, reload: load }
}
