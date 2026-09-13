import { useCallback, useEffect, useState } from "react"
import {
    GET_BEVERAGE_AWARDS,
    GET_COMMISSION_RESULTS,
    buildCommissionResultRows,
    canViewCommissionResults,
    type CompetitionOverviewRow,
} from "@winelore/core/results"
import {
    GET_COMMISSION_TEMPLATES_DEEP_QUERY,
    buildPropertyMapFromCommissionTemplates,
    buildTemplateEditionById,
} from "@winelore/core"
import { fetchGraphQLRaw, sdk } from "../api/client"
import { getStoredSession } from "../auth/session"

export interface CommissionResultsView {
    commissionName: string
    rows: CompetitionOverviewRow[]
    /** Outcome columns the policy produced; the first is used for ranking. */
    outcomeProperties: Array<{ code: string; name: string }>
}

export type ResultsState =
    | { status: "loading" }
    | { status: "forbidden" }
    | { status: "error" }
    | { status: "ready"; view: CommissionResultsView }

/**
 * Loads a commission's results.
 *
 * Every fetch here mirrors what the web's server action does, and the rows are
 * then built by the same `buildCommissionResultRows` in core. The numbers
 * cannot differ between a phone and the web results page because there is only
 * one implementation of them.
 */
export function useCommissionResults(commissionId: string) {
    const [state, setState] = useState<ResultsState>({ status: "loading" })

    const load = useCallback(async () => {
        try {
            const [response, session] = await Promise.all([
                fetchGraphQLRaw<any>(GET_COMMISSION_RESULTS, { id: commissionId }),
                getStoredSession(),
            ])
            const commissionData = response?.commission
            if (!commissionData) {
                setState({ status: "error" })
                return
            }

            if (!canViewCommissionResults(commissionData, session?.auid ?? null)) {
                setState({ status: "forbidden" })
                return
            }

            const templates = await fetchGraphQLRaw<any>(GET_COMMISSION_TEMPLATES_DEEP_QUERY, {
                id: commissionId,
            })

            // Flatten panels into candidates and attach evaluations — the I/O
            // the row builder deliberately does not perform itself.
            const candidates = (commissionData.panels ?? []).flatMap((panel: any) =>
                (panel.candidates ?? []).map((c: any) => ({ ...c, panelId: panel.id })),
            )
            const replicas = commissionData.replicas ?? []
            for (const replica of replicas) {
                const replicaCandidates = (replica.replicaPanels ?? []).flatMap((p: any) =>
                    (p.replicaCandidates ?? []).map((rc: any) => ({ ...rc, panelId: p.panel?.id })),
                )
                await Promise.all(
                    replicaCandidates.map(async (rc: any) => {
                        try {
                            const result = await sdk.GetEvaluationsForCandidate({
                                replicaCandidateId: rc.id,
                            })
                            rc.evaluations = result?.evaluationsByReplicaCandidate?.items ?? []
                        } catch {
                            rc.evaluations = []
                        }
                    }),
                )
                replica.replicaCandidates = replicaCandidates
            }
            commissionData.candidates = candidates
            commissionData.replicas = replicas

            const beverageIds = Array.from(
                new Set(
                    candidates.map((c: any) => c.sample?.batch?.beverage?.id).filter(Boolean),
                ),
            ) as string[]
            const awardsByBeverageId: Record<string, any[]> = {}
            await Promise.all(
                beverageIds.map(async (beverageId) => {
                    try {
                        const res = await fetchGraphQLRaw<any>(GET_BEVERAGE_AWARDS, { beverageId })
                        awardsByBeverageId[beverageId] = res?.beverageAwards ?? []
                    } catch {
                        awardsByBeverageId[beverageId] = []
                    }
                }),
            )

            const rows = buildCommissionResultRows({
                commission: {
                    id: commissionId,
                    name: commissionData.name ?? "",
                    status: commissionData.status ?? "",
                },
                commissionData,
                templateEditionById: buildTemplateEditionById(templates),
                templatePropertyMap: buildPropertyMapFromCommissionTemplates(templates),
                awardsByBeverageId,
            })

            setState({
                status: "ready",
                view: {
                    commissionName: commissionData.name ?? "",
                    rows: rankRows(rows.overviewRows, rows.outcomeProperties[0]?.code),
                    outcomeProperties: rows.outcomeProperties,
                },
            })
        } catch {
            setState({ status: "error" })
        }
    }, [commissionId])

    useEffect(() => {
        load()
    }, [load])

    return { state, reload: load }
}

/**
 * Order by the leading outcome, best first.
 *
 * Unscored candidates sort last rather than as zero — a beverage with no
 * result is not a beverage that scored nothing.
 */
function rankRows(
    rows: CompetitionOverviewRow[],
    rankBy: string | undefined,
): CompetitionOverviewRow[] {
    if (!rankBy) return rows
    const score = (row: CompetitionOverviewRow) => {
        const value = Number(row.outcomes[rankBy])
        return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY
    }
    return [...rows].sort((a, b) => score(b) - score(a))
}
