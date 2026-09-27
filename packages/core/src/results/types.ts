/**
 * Row shapes for competition results.
 *
 * These describe what a results table or export contains, independent of how it
 * is rendered — a web table, a spreadsheet, or a phone list all build from the
 * same rows, so the shapes live here rather than beside any one renderer.
 */
import type { PropertyMeta } from "../propertyMap"

export interface CompetitionOverviewRow {
    commissionId: string
    commissionName: string
    candidateId: string
    code: string
    beverage: string
    producer: string
    outcomes: Record<string, string>
    awards: string
    beverageType?: string
    wineType?: string
    vintage?: string
    volume?: string
    origin?: string
}

export interface CommissionSummaryRow {
    commissionId: string
    commissionName: string
    status: string
    candidateCount: number
    replicaCount: number
    awardsCount: number
}

export interface CompetitionExpertScoreRow {
    commissionId: string
    commissionName: string
    replicaId: string
    evaluationId: string
    code: string
    beverage: string
    producer: string
    replicaName: string
    replicaType: string
    evaluator: string
    scores: Record<string, string>
    beverageType?: string
    wineType?: string
    vintage?: string
    volume?: string
    origin?: string
}

export interface CompetitionCommentRow {
    commissionId: string
    commissionName: string
    replicaId: string
    evaluationId: string
    commentId: string
    code: string
    beverage: string
    producer: string
    replicaName: string
    evaluator: string
    property: string
    commentText: string
    voiceUrl: string
    beverageType?: string
    wineType?: string
    vintage?: string
    volume?: string
    origin?: string
}

export interface CompetitionAwardRow {
    commissionId: string
    commissionName: string
    code: string
    beverage: string
    producer: string
    awardName: string
    awardCode: string
}

export interface CompetitionExportContext {
    competitionName: string
    overviewRows: CompetitionOverviewRow[]
    commissionSummaryRows: CommissionSummaryRow[]
    expertScoreRows: CompetitionExpertScoreRow[]
    commentRows: CompetitionCommentRow[]
    awardRows: CompetitionAwardRow[]
    outcomePropertyCodes: string[]
    outcomePropertyNames: Record<string, string>
    propertyMap: Record<string, PropertyMeta>
}
