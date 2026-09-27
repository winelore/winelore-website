"use server"

import { cookies } from "next/headers"
import { fetchGraphQLRaw } from "@/lib/apiClient"
import {
    GET_COMMISSION_RESULTS,
    GET_BEVERAGE_AWARDS,
    cachedFetch,
    loadCompetitionResults,
    type CompetitionExportContext,
} from "@winelore/core/results"
import {
    getCommissionTemplatesWithResultMarkers,
    getEvaluationsForCandidateAction,
} from "@/app/commission/actions"
import type { Locale } from "@winelore/core/i18n"

// Server-side memory caches (15 second TTL) to ensure 0-CPU background polling
const evaluations = cachedFetch((candidateId) => getEvaluationsForCandidateAction(candidateId), 15000)
const beverageAwards = cachedFetch(async (beverageId) => {
    const res = await fetchGraphQLRaw<any, { beverageId: string }>(GET_BEVERAGE_AWARDS, { beverageId })
    return res?.beverageAwards || []
}, 15000)

/**
 * Every visible commission's results. The rows are built by core, from the
 * same fetches the app makes; this supplies them with caches in front.
 */
export async function getCompetitionExportDataAction(
    commissions: { id: string; name: string; status: string }[],
    competitionName: string,
    _locale: Locale = "en"
): Promise<CompetitionExportContext> {
    const cookieStore = await cookies()
    const auid = cookieStore.get("auid")?.value ?? null

    return loadCompetitionResults(
        {
            commission: async (id) =>
                (await fetchGraphQLRaw<any, { id: string }>(GET_COMMISSION_RESULTS, { id }))?.commission,
            templates: getCommissionTemplatesWithResultMarkers,
            evaluations,
            beverageAwards,
        },
        commissions,
        competitionName,
        auid,
        (context, error) => console.error(`[exportAction] Failed to load ${context}`, error),
    )
}
