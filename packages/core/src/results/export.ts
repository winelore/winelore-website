import type { PropertyMeta } from "../propertyMap"
import type {
    CommissionSummaryRow,
    CompetitionAwardRow,
    CompetitionCommentRow,
    CompetitionExportContext,
} from "./types"

/**
 * The results page's downloads: the spreadsheet's sheets and the CSV, as
 * plain rows of cells. Writing the file is left to each app — the web hands
 * it to the browser, the phone to the share sheet — so both files hold
 * exactly the same cells.
 */

export interface ResultsSheet {
    name: string
    rows: string[][]
}

function escapeCsvCell(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

function propertyLabel(code: string, propertyMap: Record<string, PropertyMeta>): string {
    return propertyMap[code]?.name ?? code
}

function overviewSheet(context: CompetitionExportContext): string[][] {
    const outcomeLabel = (code: string) => context.outcomePropertyNames[code] ?? code

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
        ...context.outcomePropertyCodes.map(outcomeLabel),
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

function commissionSummarySheet(rows: CommissionSummaryRow[]): string[][] {
    return [
        ["Commission Name", "Status", "Candidates Count", "Replicas Count", "Awards Granted"],
        ...rows.map((row) => [
            row.commissionName,
            row.status,
            String(row.candidateCount),
            String(row.replicaCount),
            String(row.awardsCount),
        ]),
    ]
}

function expertScoreSheet(context: CompetitionExportContext): string[][] {
    const scoreCodes = Array.from(new Set(context.expertScoreRows.flatMap((row) => Object.keys(row.scores)))).sort()

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
        ...scoreCodes.map((code) => propertyLabel(code, context.propertyMap)),
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

function commentSheet(rows: CompetitionCommentRow[]): string[][] {
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

function awardSheet(rows: CompetitionAwardRow[]): string[][] {
    return [
        ["Commission", "Code", "Beverage", "Producer", "Award Name", "Award Code"],
        ...rows.map((row) => [row.commissionName, row.code, row.beverage, row.producer, row.awardName, row.awardCode]),
    ]
}

/**
 * The spreadsheet, sheet by sheet: the overview and the commissions always,
 * then expert scores, comments and awards when there are any.
 */
export function competitionResultSheets(context: CompetitionExportContext): ResultsSheet[] {
    const sheets: ResultsSheet[] = [
        { name: "Overview", rows: overviewSheet(context) },
        { name: "Commissions Breakdown", rows: commissionSummarySheet(context.commissionSummaryRows) },
    ]
    if (context.expertScoreRows.length > 0) sheets.push({ name: "Expert Scores", rows: expertScoreSheet(context) })
    if (context.commentRows.length > 0) sheets.push({ name: "Comments", rows: commentSheet(context.commentRows) })
    if (context.awardRows.length > 0) sheets.push({ name: "Awards", rows: awardSheet(context.awardRows) })
    return sheets
}

/** The CSV download: the overview sheet. */
export function buildCompetitionResultsCsv(context: CompetitionExportContext): string {
    return overviewSheet(context)
        .map((row) => row.map(escapeCsvCell).join(","))
        .join("\n")
}

/** A name safe to save a file under. */
export function sanitizeFilename(name: string): string {
    return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80) || "results"
}

/** The download's file name: the commission's, or the competition's when showing all. */
export function competitionResultsFilename(scopeName: string, extension: "xlsx" | "csv"): string {
    return `${sanitizeFilename(scopeName)}-results.${extension}`
}
