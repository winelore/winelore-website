import { commentHasVisibleContent } from "../../EvaluationCommentsDisplay"
import type { PropertyMeta } from "../../propertyMap"
import {
    formatOutcomeValue,
    type OutcomePropertyMeta,
} from "@/lib/outcomePolicy/outcomePropertyMap"

const TOTAL_SCORE_CODE = "taste_score"
const CALCULATED_TOTAL_SCORE_CODE = "total_score"

function shouldExcludeFromCategoryColumns(
    code: string,
    propertyMap: Record<string, PropertyMeta>,
): boolean {
    if (code === TOTAL_SCORE_CODE || code === CALCULATED_TOTAL_SCORE_CODE) return true
    return propertyMap[code]?.isResult === true
}

function extractTotalScore(scores: Array<{ code: string; value: string }>): string {
    const calculated = scores.find((s) => s.code === CALCULATED_TOTAL_SCORE_CODE)
    if (calculated && hasScoreValue(calculated.value)) return calculated.value

    const taste = scores.find((s) => s.code === TOTAL_SCORE_CODE)
    if (taste && hasScoreValue(taste.value)) return taste.value

    return "-"
}

function escapeCsvCell(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

export interface ExportRow {
    code: string
    beverage: string
    producer: string
    overallAverage: string
    overallOutcomes: Record<string, string>
    rank: string
    awards: string
    replicaTotals: Record<string, string>
    replicaOutcomes: Record<string, Record<string, string>>
}

export interface ExpertScoreExportRow {
    code: string
    beverage: string
    producer: string
    replicaName: string
    replicaType: string
    evaluator: string
    totalScore: string
    scores: Record<string, string>
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
}

export interface DetailedExportContext {
    replicaLabels: { id: string; label: string }[]
    overviewRows: ExportRow[]
    expertScoreRows: ExpertScoreExportRow[]
    commentRows: CommentExportRow[]
}

export interface BuildDetailedExportOptions {
    propertyMap: Record<string, PropertyMeta>
    propertyCommentsEnabled: boolean
    voiceCommentsEnabled: boolean
    generalCommentLabel: string
    usesOutcomePolicy?: boolean
    outcomePropertyMap?: Record<string, OutcomePropertyMeta>
}

export interface ExpertScoreExportOptions {
    outcomeScores?: Record<string, unknown>
    outcomePropertyMap?: Record<string, OutcomePropertyMeta>
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
    outcomePropertyMap?: Record<string, OutcomePropertyMeta>,
): string[] {
    const codes = new Set<string>()
    rows.forEach((row) => {
        Object.keys(row.scores).forEach((code) => {
            if (!shouldExcludeFromCategoryColumns(code, propertyMap)) codes.add(code)
        })
    })
    if (outcomePropertyMap) {
        Object.keys(outcomePropertyMap).forEach((code) => codes.add(code))
    }
    return Array.from(codes).sort()
}

function buildOverviewSheetData(
    replicaLabels: { id: string; label: string }[],
    rows: ExportRow[],
    outcomePropertyCodes?: string[],
    outcomePropertyNames?: Record<string, string>,
): string[][] {
    const useOutcomes = outcomePropertyCodes && outcomePropertyCodes.length > 0
    const getOutcomeLabel = (code: string) => outcomePropertyNames?.[code] ?? code

    const headers = [
        "Code",
        "Beverage",
        "Producer",
        ...(useOutcomes
            ? outcomePropertyCodes!.map((code) => `${getOutcomeLabel(code)} (overall)`)
            : ["Overall Average"]),
        "Rank",
        "Awards",
        ...(useOutcomes
            ? replicaLabels.flatMap((r) =>
                  outcomePropertyCodes!.map((code) => `${r.label}: ${getOutcomeLabel(code)}`),
              )
            : replicaLabels.map((r) => r.label)),
    ]

    return [
        headers,
        ...rows.map((row) => [
            row.code,
            row.beverage,
            row.producer,
            ...(useOutcomes
                ? outcomePropertyCodes!.map((code) => row.overallOutcomes[code] ?? "-")
                : [row.overallAverage]),
            row.rank,
            row.awards,
            ...(useOutcomes
                ? replicaLabels.flatMap((r) =>
                      outcomePropertyCodes!.map(
                          (code) => row.replicaOutcomes[r.id]?.[code] ?? "-",
                      ),
                  )
                : replicaLabels.map((r) => row.replicaTotals[r.id] ?? "-")),
        ]),
    ]
}

function buildExpertScoreSheetData(
    rows: ExpertScoreExportRow[],
    propertyMap: Record<string, PropertyMeta>,
    scoreCodes: string[],
    outcomePropertyMap?: Record<string, OutcomePropertyMeta>,
    usesOutcomePolicy?: boolean,
): string[][] {
    const getLabel = (code: string) =>
        outcomePropertyMap?.[code]?.name ?? getPropertyLabel(code, propertyMap)

    const headers = [
        "Code",
        "Beverage",
        "Producer",
        "Replica",
        "Replica Type",
        "Evaluator",
        ...(usesOutcomePolicy ? [] : ["Total Score"]),
        ...scoreCodes.map((code) => getLabel(code)),
    ]

    return [
        headers,
        ...rows.map((row) => [
            row.code,
            row.beverage,
            row.producer,
            row.replicaName,
            row.replicaType,
            row.evaluator,
            ...(usesOutcomePolicy ? [] : [row.totalScore]),
            ...scoreCodes.map((code) => row.scores[code] ?? ""),
        ]),
    ]
}

function buildCommentSheetData(rows: CommentExportRow[]): string[][] {
    const headers = ["Code", "Beverage", "Producer", "Replica", "Evaluator", "Property", "Comment Text", "Voice URL"]

    return [
        headers,
        ...rows.map((row) => [
            row.code,
            row.beverage,
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
    outcomeOptions?: ExpertScoreExportOptions,
): ExpertScoreExportRow {
    const scoreMap: Record<string, string> = {}
    scores
        .filter((s) => hasScoreValue(s.value) && !shouldExcludeFromCategoryColumns(s.code, propertyMap))
        .forEach((s) => {
            scoreMap[s.code] = s.value
        })

    if (outcomeOptions?.outcomeScores && outcomeOptions.outcomePropertyMap) {
        for (const [outcomeCode] of Object.entries(outcomeOptions.outcomePropertyMap)) {
            const value = outcomeOptions.outcomeScores[outcomeCode]
            if (value !== null && value !== undefined) {
                scoreMap[outcomeCode] = formatOutcomeValue(value)
            }
        }
    }

    const totalScore = extractTotalScore(scores)

    return {
        code,
        beverage,
        producer,
        replicaName,
        replicaType,
        evaluator,
        totalScore,
        scores: scoreMap,
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
        }))
}

export function buildResultsCsv(
    commissionName: string,
    replicaLabels: { id: string; label: string }[],
    rows: ExportRow[],
    outcomePropertyCodes?: string[],
    outcomePropertyNames?: Record<string, string>,
): string {
    const lines = buildOverviewSheetData(
        replicaLabels,
        rows,
        outcomePropertyCodes,
        outcomePropertyNames,
    ).map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))

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
    options?: {
        outcomePropertyMap?: Record<string, OutcomePropertyMeta>
        usesOutcomePolicy?: boolean
        outcomePropertyCodes?: string[]
    },
): Promise<void> {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()
    const outcomePropertyMap = options?.outcomePropertyMap
    const outcomePropertyCodes = options?.outcomePropertyCodes
    const outcomePropertyNames = outcomePropertyMap
        ? Object.fromEntries(
              Object.entries(outcomePropertyMap).map(([code, meta]) => [code, meta.name]),
          )
        : undefined

    XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(
            buildOverviewSheetData(
                context.replicaLabels,
                context.overviewRows,
                outcomePropertyCodes,
                outcomePropertyNames,
            ),
        ),
        "Overview",
    )

    const scoreCodes = collectScoreCodes(
        context.expertScoreRows,
        propertyMap,
        outcomePropertyMap,
    )
    XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(
            buildExpertScoreSheetData(
                context.expertScoreRows,
                propertyMap,
                scoreCodes,
                outcomePropertyMap,
                options?.usesOutcomePolicy,
            ),
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
