import { normalizeAuids } from "../auidUtils"
import {
    toCompetitionPage,
    type CompetitionPageData,
    type RawCompetitionPageCommission,
    type RawCompetitionPageCompetition,
} from "../competition/page"
import { buildPropertyMapFromCommissionTemplates } from "../propertyMap"
import type { PropertyMeta } from "../propertyMap"
import { buildTemplateEditionById } from "../templateEditionMap"
import { canViewCommissionResults } from "./access"
import { buildCommissionResultRows, type BeverageAward } from "./buildRows"
import type {
    CommissionSummaryRow,
    CompetitionAwardRow,
    CompetitionCommentRow,
    CompetitionExpertScoreRow,
    CompetitionExportContext,
    CompetitionOverviewRow,
} from "./types"

/**
 * A competition's results page, as the web's /competition/[id]/results and
 * the app's results screen both load it: first which commissions this user
 * may see, then every one of those commissions' rows.
 */

// --- Who sees what ----------------------------------------------------------

/**
 * The page's query: the competition, and each commission with its replicas'
 * status and members — which is all the access rule needs, so one request
 * settles it rather than one per commission.
 */
export const GET_COMPETITION_RESULTS_SCOPE = `
  query GetCompetitionResultsScope($id: ID!) {
      competition(id: $id) {
          id
          name
          status
          startedAt
          plannedDates { start end }
          endedAt
          holders
          series { id name status }
      }
      commissionsByCompetition(competitionId: $id, limit: 50) {
          items {
              id
              name
              status
              plannedDates { start end }
              startedAt
              endedAt
              wineJumperMiniGameEnabled
              voiceCommentsEnabled
              propertyCommentsEnabled
              beverageOriginDuringEvaluationEnabled
              replicas {
                  status
                  members { auid }
              }
          }
      }
  }
`

/** Where a commission's results live: the web redirects /commission/[id]/results there. */
export const GET_COMMISSION_COMPETITION = `
  query GetCommissionCompetition($id: ID!) {
    commission(id: $id) {
      id
      competition { id }
    }
  }
`

type ScopeCommission = RawCompetitionPageCommission & {
    replicas?: Array<{ status?: string | null; members?: Array<{ auid?: unknown }> | null }> | null
}

export interface CompetitionResultsScopeResponse {
    competition?: RawCompetitionPageCompetition | null
    commissionsByCompetition?: { items?: ScopeCommission[] | null } | null
}

export type CompetitionResultsScope =
    | { status: "unavailable" }
    | { status: "forbidden" }
    | {
          status: "ready"
          /** The competition, with only the commissions this user may see. */
          competition: CompetitionPageData
          /** The commission asked for, when it is one of those; otherwise all of them. */
          commissionId: string | null
      }

/**
 * Which of a competition's commissions a user may see results for.
 *
 * A holder sees every commission. Anyone else sees the commissions where
 * they judged a replica that has finished, and nothing at all when there is
 * none — the same rule `canViewCommissionResults` applies to one commission.
 */
export function resolveCompetitionResultsScope(
    response: CompetitionResultsScopeResponse | null | undefined,
    auid: string | null | undefined,
    requestedCommissionId?: string | null,
): CompetitionResultsScope {
    const competition = response?.competition
    if (!competition) return { status: "unavailable" }

    let commissions = response?.commissionsByCompetition?.items ?? []
    const isHolder = auid ? normalizeAuids(competition.holders).includes(String(auid)) : false

    if (!isHolder) {
        if (!auid) return { status: "forbidden" }
        commissions = commissions.filter((commission) =>
            canViewCommissionResults({ replicas: commission.replicas }, String(auid)),
        )
        if (commissions.length === 0) return { status: "forbidden" }
    }

    const page = toCompetitionPage(competition, commissions)
    const commissionId = commissions.some((commission) => commission.id === requestedCommissionId)
        ? (requestedCommissionId as string)
        : null
    return { status: "ready", competition: page, commissionId }
}

// --- The rows ---------------------------------------------------------------

/**
 * The fetches the rows are built from. Each app supplies its own — the web
 * from a server action with caches in front, the phone straight from the API
 * — and core does the rest.
 */
export interface CompetitionResultsSource {
    /** GET_COMMISSION_RESULTS's `commission`; null or a throw drops the commission. */
    commission(commissionId: string): Promise<any>
    /** The commission's templates, for property names and result markers. */
    templates(commissionId: string): Promise<any>
    /** A replica candidate's evaluations; an empty list when they cannot be fetched. */
    evaluations(replicaCandidateId: string): Promise<any[]>
    /** A beverage's awards; an empty list when they cannot be fetched. */
    beverageAwards(beverageId: string): Promise<BeverageAward[]>
}

export type ResultsLoadError = (context: string, error: unknown) => void

/**
 * Every visible commission's result rows, merged into one context.
 *
 * A commission that fails to load, or that the user may not see, is left out
 * rather than failing the page; missing templates only cost the property
 * names. Commissions load side by side and are merged in order.
 */
export async function loadCompetitionResults(
    source: CompetitionResultsSource,
    commissions: Array<{ id: string; name: string; status: string }>,
    competitionName: string,
    auid: string | null | undefined,
    onError?: ResultsLoadError,
): Promise<CompetitionExportContext> {
    const loaded = await Promise.all(
        commissions.map(async (commission) => {
            try {
                return await loadCommission(source, commission, auid ?? null, onError)
            } catch (error) {
                onError?.(`commission ${commission.id}`, error)
                return null
            }
        }),
    )

    const overviewRows: CompetitionOverviewRow[] = []
    const commissionSummaryRows: CommissionSummaryRow[] = []
    const expertScoreRows: CompetitionExpertScoreRow[] = []
    const commentRows: CompetitionCommentRow[] = []
    const awardRows: CompetitionAwardRow[] = []
    const propertyMap: Record<string, PropertyMeta> = {}
    const outcomePropertyCodes = new Set<string>()
    const outcomePropertyNames: Record<string, string> = {}

    for (const commission of loaded) {
        if (!commission) continue
        const { rows } = commission
        Object.assign(propertyMap, commission.propertyMap)
        rows.outcomeProperties.forEach((property) => {
            outcomePropertyCodes.add(property.code)
            outcomePropertyNames[property.code] = property.name
        })
        overviewRows.push(...rows.overviewRows)
        expertScoreRows.push(...rows.expertScoreRows)
        commentRows.push(...rows.commentRows)
        awardRows.push(...rows.awardRows)
        commissionSummaryRows.push(rows.summaryRow)
    }

    const codes = Array.from(outcomePropertyCodes)
    return {
        competitionName,
        overviewRows: rankOverviewRows(overviewRows, codes),
        commissionSummaryRows,
        expertScoreRows,
        commentRows,
        awardRows,
        outcomePropertyCodes: codes,
        outcomePropertyNames,
        propertyMap,
    }
}

/**
 * Candidates best first, so the "#" beside each is its place: by the first
 * outcome the policy produces, then the next on a tie. A candidate without a
 * number yet (no policy, or still being tasted) follows the ranked ones, and
 * otherwise the commissions' own order is kept.
 */
export function rankOverviewRows(
    rows: CompetitionOverviewRow[],
    outcomeCodes: string[],
): CompetitionOverviewRow[] {
    const numeric = (row: CompetitionOverviewRow, code: string) => {
        const value = Number.parseFloat(row.outcomes[code] ?? "")
        return Number.isFinite(value) ? value : null
    }
    return rows
        .map((row, order) => ({ row, order }))
        .sort((a, b) => {
            for (const code of outcomeCodes) {
                const left = numeric(a.row, code)
                const right = numeric(b.row, code)
                if (left === right) continue
                if (left === null) return 1
                if (right === null) return -1
                return right - left
            }
            return a.order - b.order
        })
        .map(({ row }) => row)
}

async function loadCommission(
    source: CompetitionResultsSource,
    commission: { id: string; name: string; status: string },
    auid: string | null,
    onError?: ResultsLoadError,
) {
    const commissionData = await source.commission(commission.id)
    if (!commissionData) return null
    if (!canViewCommissionResults(commissionData, auid)) return null

    let propertyMap: Record<string, PropertyMeta> = {}
    let templateEditionById: Record<string, any> = {}
    try {
        const templates = await source.templates(commission.id)
        propertyMap = buildPropertyMapFromCommissionTemplates(templates)
        templateEditionById = buildTemplateEditionById(templates)
    } catch (error) {
        onError?.(`templates for commission ${commission.id}`, error)
    }

    // Flatten panels into candidates, and attach each replica candidate's
    // evaluations: the I/O the row builder does not do itself.
    const candidates = (commissionData.panels ?? []).flatMap((panel: any) =>
        (panel.candidates ?? []).map((candidate: any) => ({ ...candidate, panelId: panel.id })),
    )
    const replicas = commissionData.replicas ?? []
    await Promise.all(
        replicas.map(async (replica: any) => {
            const replicaCandidates = (replica.replicaPanels ?? []).flatMap((panel: any) =>
                (panel.replicaCandidates ?? []).map((candidate: any) => ({ ...candidate, panelId: panel.panel?.id })),
            )
            await Promise.all(
                replicaCandidates.map(async (candidate: any) => {
                    candidate.evaluations = await source.evaluations(candidate.id).catch(() => [])
                }),
            )
            replica.replicaCandidates = replicaCandidates
        }),
    )
    const data = { ...commissionData, candidates, replicas }

    const beverageIds = Array.from(
        new Set(candidates.map((candidate: any) => candidate.sample?.batch?.beverage?.id).filter(Boolean)),
    ) as string[]
    const awardsByBeverageId: Record<string, BeverageAward[]> = {}
    await Promise.all(
        beverageIds.map(async (beverageId) => {
            awardsByBeverageId[beverageId] = await source.beverageAwards(beverageId).catch(() => [])
        }),
    )

    const rows = buildCommissionResultRows({
        commission,
        commissionData: data,
        templateEditionById,
        templatePropertyMap: propertyMap,
        awardsByBeverageId,
    })
    return { rows, propertyMap }
}

// --- Caching ----------------------------------------------------------------

/**
 * A fetch whose results are reused for a while, keyed by its argument.
 *
 * The page refreshes every few seconds while a competition runs, and each
 * refresh would otherwise re-fetch every evaluation of every candidate; the
 * web keeps the same short-lived caches in front of its server action.
 */
export function cachedFetch<T>(fetch: (key: string) => Promise<T>, ttlMs: number): ((key: string) => Promise<T>) & { clear: (key?: string) => void } {
    const cache = new Map<string, { value: T; expiresAt: number }>()
    const cached = async (key: string) => {
        const hit = cache.get(key)
        if (hit && hit.expiresAt > Date.now()) return hit.value
        const value = await fetch(key)
        cache.set(key, { value, expiresAt: Date.now() + ttlMs })
        return value
    }
    cached.clear = (key?: string) => {
        if (key === undefined) cache.clear()
        else cache.delete(key)
    }
    return cached
}
