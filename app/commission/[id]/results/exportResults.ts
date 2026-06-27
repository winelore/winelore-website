import { commentHasVisibleContent } from "../../EvaluationCommentsDisplay"
import type { PropertyMeta } from "../../propertyMap"

function shouldIncludeInExpertExport(
    code: string,
    propertyMap: Record<string, PropertyMeta>,
): boolean {
    return propertyMap[code]?.isResult === true
}

function escapeCsvCell(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

export interface ExportRow {
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

export interface ExpertScoreExportRow {
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

export interface CommentExportRow {
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

export interface DetailedExportContext {
    overviewRows: ExportRow[]
    expertScoreRows: ExpertScoreExportRow[]
    commentRows: CommentExportRow[]
}

export interface ExportLayoutOptions {
    sortMode: "score" | "order"
    outcomePropertyCodes: string[]
    outcomePropertyNames: Record<string, string>
    orderByCandidateId: Map<string, number>
}

export interface BuildDetailedExportOptions {
    propertyMap: Record<string, PropertyMeta>
    propertyCommentsEnabled: boolean
    voiceCommentsEnabled: boolean
    generalCommentLabel: string
}

function getPropertyLabel(code: string, propertyMap: Record<string, PropertyMeta>): string {
    return propertyMap[code]?.name ?? code
}

function hasScoreValue(value: string | null | undefined): boolean {
    return value != null && String(value).trim() !== ""
}

export function collectScoreCodes(
    rows: ExpertScoreExportRow[],
    propertyMap: Record<string, PropertyMeta>,
): string[] {
    const codes = new Set<string>()
    rows.forEach((row) => {
        Object.keys(row.scores).forEach((code) => {
            if (shouldIncludeInExpertExport(code, propertyMap)) codes.add(code)
        })
    })
    return Array.from(codes).sort()
}

function buildOverviewSheetData(rows: ExportRow[], layout: ExportLayoutOptions): string[][] {
    const getOutcomeLabel = (code: string) => layout.outcomePropertyNames[code] ?? code

    const headers = [
        "Order",
        "Code",
        "Beverage",
        "Beverage Type",
        "Wine Type",
        "Vintage",
        "Volume (ml)",
        "Origin",
        "Producer",
        ...layout.outcomePropertyCodes.map((code) => getOutcomeLabel(code)),
        "Awards",
    ]

    return [
        headers,
        ...rows.map((row) => [
            layout.orderByCandidateId.get(row.candidateId) != null
                ? String(layout.orderByCandidateId.get(row.candidateId))
                : "-",
            row.code,
            row.beverage,
            row.beverageType ?? "-",
            row.wineType ?? "-",
            row.vintage ?? "-",
            row.volume ?? "-",
            row.origin ?? "-",
            row.producer,
            ...layout.outcomePropertyCodes.map((code) => row.outcomes[code] ?? "-"),
            row.awards,
        ]),
    ]
}

function buildExpertScoreSheetData(
    rows: ExpertScoreExportRow[],
    propertyMap: Record<string, PropertyMeta>,
    scoreCodes: string[],
): string[][] {
    const headers = [
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
        ...scoreCodes.map((code) => getPropertyLabel(code, propertyMap)),
    ]

    return [
        headers,
        ...rows.map((row) => [
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

function buildCommentSheetData(rows: CommentExportRow[]): string[][] {
    const headers = [
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
        "Voice URL"
    ]

    return [
        headers,
        ...rows.map((row) => [
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

export function buildExpertScoreExportRows(
    code: string,
    beverage: string,
    producer: string,
    replicaName: string,
    replicaType: string,
    evaluator: string,
    scores: Array<{ code: string; value: string }>,
    propertyMap: Record<string, PropertyMeta>,
    beverageType?: string,
    wineType?: string,
    vintage?: string,
    volume?: string,
    origin?: string,
): ExpertScoreExportRow {
    const scoreMap: Record<string, string> = {}
    scores
        .filter((s) => hasScoreValue(s.value) && shouldIncludeInExpertExport(s.code, propertyMap))
        .forEach((s) => {
            scoreMap[s.code] = s.value
        })

    return {
        code,
        beverage,
        producer,
        replicaName,
        replicaType,
        evaluator,
        scores: scoreMap,
        beverageType,
        wineType,
        vintage,
        volume,
        origin,
    }
}

export function buildCommentExportRows(
    code: string,
    beverage: string,
    producer: string,
    replicaName: string,
    evaluator: string,
    comments: Array<{ id: string; text?: string; voiceUrl?: string | null; propertyId?: string | null }>,
    propertyMap: Record<string, PropertyMeta>,
    options: BuildDetailedExportOptions,
    beverageType?: string,
    wineType?: string,
    vintage?: string,
    volume?: string,
    origin?: string,
): CommentExportRow[] {
    const flags = {
        propertyCommentsEnabled: options.propertyCommentsEnabled,
        voiceCommentsEnabled: options.voiceCommentsEnabled,
    }

    return comments
        .filter((c) => commentHasVisibleContent(c, flags))
        .map((comment) => ({
            code,
            beverage,
            producer,
            replicaName,
            evaluator,
            property: comment.propertyId
                ? getPropertyLabel(comment.propertyId, propertyMap)
                : options.generalCommentLabel,
            commentText: comment.text?.trim() ?? "",
            voiceUrl: options.voiceCommentsEnabled && comment.voiceUrl ? comment.voiceUrl : "",
            beverageType,
            wineType,
            vintage,
            volume,
            origin,
        }))
}

export function buildResultsCsv(rows: ExportRow[], layout: ExportLayoutOptions): string {
    const lines = buildOverviewSheetData(rows, layout).map((row) =>
        row.map((cell) => escapeCsvCell(cell)).join(","),
    )

    return lines.join("\n")
}

export function downloadCsv(content: string, filename: string): void {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}

export async function downloadResultsXlsx(
    context: DetailedExportContext,
    propertyMap: Record<string, PropertyMeta>,
    filename: string,
    layout: ExportLayoutOptions,
): Promise<void> {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(buildOverviewSheetData(context.overviewRows, layout)),
        "Overview",
    )

    const scoreCodes = collectScoreCodes(context.expertScoreRows, propertyMap)
    XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(
            buildExpertScoreSheetData(context.expertScoreRows, propertyMap, scoreCodes),
        ),
        "Expert Scores",
    )

    XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(buildCommentSheetData(context.commentRows)),
        "Comments",
    )

    XLSX.writeFile(wb, filename)
}

export function sanitizeFilename(name: string): string {
    return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80) || "results"
}
