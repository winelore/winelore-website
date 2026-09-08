import type { PropertyMeta } from "@/app/commission/propertyMap"
import { downloadCsv, sanitizeFilename } from "@/app/commission/[id]/results/exportResults"

function escapeCsvCell(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

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

function getPropertyLabel(code: string, propertyMap: Record<string, PropertyMeta>): string {
    return propertyMap[code]?.name ?? code
}

function buildCompetitionOverviewSheetData(context: CompetitionExportContext): string[][] {
    const getOutcomeLabel = (code: string) => context.outcomePropertyNames[code] ?? code

    const headers = [
        "Commission",
        "Code",
        "Beverage",
        "Beverage Type",
        "Wine Type",
        "Vintage",
        "Volume (ml)",
        "Origin",
        "Producer",
        ...context.outcomePropertyCodes.map((code) => getOutcomeLabel(code)),
        "Awards",
    ]

    return [
        headers,
        ...context.overviewRows.map((row) => [
            row.commissionName,
            row.code,
            row.beverage,
            row.beverageType ?? "-",
            row.wineType ?? "-",
            row.vintage ?? "-",
            row.volume ?? "-",
            row.origin ?? "-",
            row.producer,
            ...context.outcomePropertyCodes.map((code) => row.outcomes[code] ?? "-"),
            row.awards,
        ]),
    ]
}

function buildCommissionSummarySheetData(rows: CommissionSummaryRow[]): string[][] {
    const headers = [
        "Commission Name",
        "Status",
        "Candidates Count",
        "Replicas Count",
        "Awards Granted",
    ]

    return [
        headers,
        ...rows.map((row) => [
            row.commissionName,
            row.status,
            String(row.candidateCount),
            String(row.replicaCount),
            String(row.awardsCount),
        ]),
    ]
}

function buildCompetitionExpertScoreSheetData(context: CompetitionExportContext): string[][] {
    const scoreCodes = Array.from(
        new Set(
            context.expertScoreRows.flatMap((row) => Object.keys(row.scores)),
        ),
    ).sort()

    const headers = [
        "Commission",
        "Code",
        "Beverage",
        "Beverage Type",
        "Wine Type",
        "Vintage",
        "Volume (ml)",
        "Origin",
        "Producer",
        "Replica",
        "Replica Type",
        "Evaluator",
        ...scoreCodes.map((code) => getPropertyLabel(code, context.propertyMap)),
    ]

    return [
        headers,
        ...context.expertScoreRows.map((row) => [
            row.commissionName,
            row.code,
            row.beverage,
            row.beverageType ?? "-",
            row.wineType ?? "-",
            row.vintage ?? "-",
            row.volume ?? "-",
            row.origin ?? "-",
            row.producer,
            row.replicaName,
            row.replicaType,
            row.evaluator,
            ...scoreCodes.map((code) => row.scores[code] ?? ""),
        ]),
    ]
}

function buildCompetitionCommentSheetData(rows: CompetitionCommentRow[]): string[][] {
    const headers = [
        "Commission",
        "Code",
        "Beverage",
        "Beverage Type",
        "Wine Type",
        "Vintage",
        "Volume (ml)",
        "Origin",
        "Producer",
        "Replica",
        "Evaluator",
        "Property",
        "Comment Text",
        "Voice URL",
    ]

    return [
        headers,
        ...rows.map((row) => [
            row.commissionName,
            row.code,
            row.beverage,
            row.beverageType ?? "-",
            row.wineType ?? "-",
            row.vintage ?? "-",
            row.volume ?? "-",
            row.origin ?? "-",
            row.producer,
            row.replicaName,
            row.evaluator,
            row.property,
            row.commentText,
            row.voiceUrl,
        ]),
    ]
}

function buildCompetitionAwardSheetData(rows: CompetitionAwardRow[]): string[][] {
    const headers = [
        "Commission",
        "Code",
        "Beverage",
        "Producer",
        "Award Name",
        "Award Code",
    ]

    return [
        headers,
        ...rows.map((row) => [
            row.commissionName,
            row.code,
            row.beverage,
            row.producer,
            row.awardName,
            row.awardCode,
        ]),
    ]
}

export function buildCompetitionResultsCsv(context: CompetitionExportContext): string {
    const lines = buildCompetitionOverviewSheetData(context).map((row) =>
        row.map((cell) => escapeCsvCell(cell)).join(","),
    )
    return lines.join("\n")
}

export async function downloadCompetitionResultsXlsx(
    context: CompetitionExportContext,
    filename: string,
): Promise<void> {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()

    // 1. Competition Overview
    XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(buildCompetitionOverviewSheetData(context)),
        "Overview",
    )

    // 2. Commissions Summary
    XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(buildCommissionSummarySheetData(context.commissionSummaryRows)),
        "Commissions Breakdown",
    )

    // 3. Expert Scores
    if (context.expertScoreRows.length > 0) {
        XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.aoa_to_sheet(buildCompetitionExpertScoreSheetData(context)),
            "Expert Scores",
        )
    }

    // 4. Comments
    if (context.commentRows.length > 0) {
        XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.aoa_to_sheet(buildCompetitionCommentSheetData(context.commentRows)),
            "Comments",
        )
    }

    // 5. Awards
    if (context.awardRows.length > 0) {
        XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.aoa_to_sheet(buildCompetitionAwardSheetData(context.awardRows)),
            "Awards",
        )
    }

    XLSX.writeFile(wb, filename)
}
