import { useCallback, useEffect, useState } from "react"
import { GET_COMMISSION_TEMPLATES_DEEP_QUERY } from "@winelore/core"
import {
    emptyTastingSummary,
    loadMyTastingSummary,
    type MyTastingSummaryData,
    type TastingSummarySource,
} from "@winelore/core/commission"
import { fetchGraphQLRaw, sdk } from "../api/client"
import { getStoredSession } from "../auth/session"

/** The web reads a judge's evaluations as the judge; so does the app. */
function sourceFor(auid: string | null): TastingSummarySource {
    const options = auid ? { headers: { "x-actor": auid } } : undefined
    return {
        replica: async (replicaId) => (await sdk.GetReplicaCandidates({ replicaId })).commissionReplica,
        commission: async (id) => (await sdk.GetCommission({ id })).commission,
        templates: (commissionId) => fetchGraphQLRaw<any>(GET_COMMISSION_TEMPLATES_DEEP_QUERY, { id: commissionId }),
        myEvaluation: async (replicaCandidateId) =>
            (await sdk.GetMyEvaluationForCandidate({ replicaCandidateId }, options)).evaluationByReplicaCandidateAndEvaluator,
        evaluations: async (replicaCandidateId) =>
            (await sdk.GetEvaluationsForCandidate({ replicaCandidateId, limit: 50 }, options)).evaluationsByReplicaCandidate?.items ?? [],
    }
}

/**
 * A judge's summary of a replica, as the web's summary page loads it —
 * core's `loadMyTastingSummary`, the call the web's action makes. Null while
 * loading. It is loaded once, as on the web: a finished session does not
 * change; a failure shows as no evaluations, which is what the web shows too.
 */
export function useTastingSummary(replicaId: string) {
    const [data, setData] = useState<MyTastingSummaryData | null>(null)

    const load = useCallback(async () => {
        try {
            const session = await getStoredSession()
            const auid = session?.auid ?? null
            setData(await loadMyTastingSummary(sourceFor(auid), replicaId, auid))
        } catch {
            setData((current) => current ?? emptyTastingSummary())
        }
    }, [replicaId])

    useEffect(() => {
        setData(null)
        load()
    }, [load])

    return { data, reload: load }
}
