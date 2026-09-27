import { calculateDeltaOutliers, type DeltaOutlierInfo } from "../deltaOutliers"
import { parseEvaluationTotal } from "../evaluationTotals"
import type {
    CompetitionCommentRow,
    CompetitionExpertScoreRow,
    CompetitionExportContext,
    CompetitionOverviewRow,
} from "./types"

/**
 * What the results page does with the rows once they are loaded — narrowing
 * to one commission, searching, the expert breakdown under a candidate —
 * shared by the web page and the app's screen.
 */

export const RESULTS_TABS = ["overview", "commissions", "expertScores", "comments", "awards"] as const
export type ResultsTab = (typeof RESULTS_TABS)[number]

/** The filter's "every commission" choice. */
export const ALL_COMMISSIONS = "ALL"

/** How often the page refreshes while the competition has not completed. */
export const RESULTS_REFRESH_MS = 3000

/** The rows of one commission only, or all of them for `ALL_COMMISSIONS`. */
export function scopeResultsContext(
    context: CompetitionExportContext | null,
    commissionId: string,
): CompetitionExportContext | null {
    if (!context || commissionId === ALL_COMMISSIONS) return context

    const belongs = (row: { commissionId: string }) => row.commissionId === commissionId
    const overviewRows = context.overviewRows.filter(belongs)

    return {
        ...context,
        overviewRows,
        commissionSummaryRows: context.commissionSummaryRows.filter(belongs),
        expertScoreRows: context.expertScoreRows.filter(belongs),
        commentRows: context.commentRows.filter(belongs),
        awardRows: context.awardRows.filter(belongs),
        outcomePropertyCodes: context.outcomePropertyCodes.filter((code) =>
            overviewRows.some((row) => Object.prototype.hasOwnProperty.call(row.outcomes, code)),
        ),
    }
}

/** Producers and evaluators whose names the page looks up. */
export function resultPersonAuids(context: CompetitionExportContext | null): string[] {
    if (!context) return []
    const auids = new Set<string>()
    context.overviewRows.forEach((row) => {
        if (row.producer && !isNaN(Number(row.producer))) auids.add(row.producer)
    })
    context.expertScoreRows.forEach((row) => {
        if (row.evaluator && !isNaN(Number(row.evaluator))) auids.add(row.evaluator)
    })
    return Array.from(auids)
}

/** A producer or evaluator as shown: their name once looked up, else the id. */
export function resultPersonName(auid: string, names: Record<string, string>, unknownLabel: string): string {
    if (!auid || auid === "-") return unknownLabel
    return names[auid] || auid
}

/** Candidates matching the search: by code, beverage, commission or producer. */
export function searchOverviewRows(
    rows: CompetitionOverviewRow[],
    query: string,
    personName: (auid: string) => string,
): CompetitionOverviewRow[] {
    const q = query.toLowerCase().trim()
    if (!q) return rows
    return rows.filter(
        (row) =>
            row.code.toLowerCase().includes(q) ||
            row.beverage.toLowerCase().includes(q) ||
            row.commissionName.toLowerCase().includes(q) ||
            personName(row.producer).toLowerCase().includes(q),
    )
}

/** Each tab's count. The search narrows the overview only, as it does on the page. */
export function resultsTabCounts(
    context: CompetitionExportContext | null,
    searchedOverviewCount: number,
): Record<ResultsTab, number> {
    return {
        overview: context ? searchedOverviewCount : 0,
        commissions: context?.commissionSummaryRows.length ?? 0,
        expertScores: context?.expertScoreRows.length ?? 0,
        comments: context?.commentRows.length ?? 0,
        awards: context?.awardRows.length ?? 0,
    }
}

/** A candidate's type, vintage and volume, the line under its name. */
export function overviewRowDetails(row: CompetitionOverviewRow): string {
    return [row.wineType, row.vintage, row.volume].filter((part) => part && part !== "-").join(" • ")
}

/** A unique key for an overview row; a code can repeat across commissions. */
export function overviewRowKey(row: CompetitionOverviewRow, index: number): string {
    return `${row.commissionId}-${row.candidateId}-${index}`
}

// --- Expert breakdown -------------------------------------------------------

export interface BreakdownEvaluation {
    scores: Array<{ code: string; value: string }>
    comments: Array<{ id: string; text: string; voiceUrl: string | null; propertyId: string | null }>
}

export interface ExpertBreakdownCard {
    scoreRow: CompetitionExpertScoreRow
    /** The evaluation as the card displays it: its scores, and its comments. */
    evaluation: BreakdownEvaluation
    /** Whether this judge's total sits out of delta with the rest of their replica. */
    outlier: DeltaOutlierInfo | undefined
    /** The result scores, which the card shows as its headline. */
    resultScores: Array<{ code: string; value: string }>
}

function toEvaluation(scoreRow: CompetitionExpertScoreRow, comments: CompetitionCommentRow[]): BreakdownEvaluation {
    return {
        scores: Object.entries(scoreRow.scores).map(([code, value]) => ({ code, value })),
        comments: comments
            .filter((comment) => comment.evaluationId === scoreRow.evaluationId)
            .map((comment) => ({
                id: comment.commentId,
                text: comment.commentText,
                voiceUrl: comment.voiceUrl || null,
                propertyId: comment.property === "General" ? null : comment.property,
            })),
    }
}

/**
 * Out-of-delta judges, measured within each replica — a trainee replica is
 * not held to the standard one's average.
 */
function outliersByReplica(
    scoreRows: CompetitionExpertScoreRow[],
    propertyMap: CompetitionExportContext["propertyMap"],
): Map<CompetitionExpertScoreRow, DeltaOutlierInfo> {
    const result = new Map<CompetitionExpertScoreRow, DeltaOutlierInfo>()
    const byReplica = new Map<string, CompetitionExpertScoreRow[]>()
    scoreRows.forEach((row) => {
        const rows = byReplica.get(row.replicaId) || []
        rows.push(row)
        byReplica.set(row.replicaId, rows)
    })
    byReplica.forEach((rows) => {
        calculateDeltaOutliers(rows, (row) =>
            parseEvaluationTotal(
                Object.entries(row.scores).map(([code, value]) => ({ code, value })),
                propertyMap,
            ),
        ).forEach((info, row) => result.set(row, info))
    })
    return result
}

/** The judges' cards under one candidate, when its row is opened. */
export function expertBreakdown(
    context: CompetitionExportContext,
    row: CompetitionOverviewRow,
): ExpertBreakdownCard[] {
    const matches = (item: { commissionId: string; code: string }) =>
        item.commissionId === row.commissionId && item.code === row.code
    const scoreRows = context.expertScoreRows.filter(matches)
    const comments = context.commentRows.filter(matches)
    const outliers = outliersByReplica(scoreRows, context.propertyMap)

    return scoreRows.map((scoreRow) => {
        const evaluation = toEvaluation(scoreRow, comments)
        return {
            scoreRow,
            evaluation,
            outlier: outliers.get(scoreRow),
            resultScores: evaluation.scores.filter((score) => context.propertyMap[score.code]?.isResult),
        }
    })
}
