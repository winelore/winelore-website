import { commentHasVisibleContent } from "../../../../EvaluationCommentsDisplay"
import type { PropertyMeta } from "../../../../propertyMap"
import { formatPropertyScoreValue, type BooleanScoreLabels, hasStoredScoreValue } from "@/lib/formatPropertyScore"
import { getGeographicInfo } from "@/lib/geocoding"
import type { ExpertBeverageSummaryEntry, MyTastingSummaryData } from "../../../../expertRanking"

function escapeCsvCell(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

export interface ExpertOverviewRow {
    order: string
    code: string
    beverage: string
    beverageType: string
    wineType: string
    vintage: string
    volume: string
    origin: string
    producer: string
    outcomes: Record<string, string>
}

export interface ExpertDetailScoreRow {
    order: string
    code: string
    beverage: string
    beverageType: string
    wineType: string
    vintage: string
    volume: string
    origin: string
    producer: string
    scores: Record<string, string>
}

export interface ExpertCommentRow {
    order: string
    code: string
    beverage: string
    beverageType: string
    wineType: string
    vintage: string
    volume: string
    origin: string
    producer: string
    property: string
    commentText: string
    voiceUrl: string
}

export interface ExpertExportContext {
    overviewRows: ExpertOverviewRow[]
    detailRows: ExpertDetailScoreRow[]
    commentRows: ExpertCommentRow[]
}

function getPropertyLabel(code: string, propertyMap: Record<string, PropertyMeta>): string {
    return propertyMap[code]?.name ?? code
}

function buildExpertOverviewSheetData(
    rows: ExpertOverviewRow[],
    propertyMap: Record<string, PropertyMeta>,
    resultCodes: string[]
): string[][] {
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
        ...resultCodes.map((code) => getPropertyLabel(code, propertyMap)),
    ]

    return [
        headers,
        ...rows.map((row) => [
            row.order,
            row.code,
            row.beverage,
            row.beverageType,
            row.wineType,
            row.vintage,
            row.volume,
            row.origin,
            row.producer,
            ...resultCodes.map((code) => row.outcomes[code] ?? "-"),
        ]),
    ]
}

function buildExpertDetailSheetData(
    rows: ExpertDetailScoreRow[],
    propertyMap: Record<string, PropertyMeta>,
    allPropertyCodes: string[]
): string[][] {
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
        ...allPropertyCodes.map((code) => getPropertyLabel(code, propertyMap)),
    ]

    return [
        headers,
        ...rows.map((row) => [
            row.order,
            row.code,
            row.beverage,
            row.beverageType,
            row.wineType,
            row.vintage,
            row.volume,
            row.origin,
            row.producer,
            ...allPropertyCodes.map((code) => row.scores[code] ?? ""),
        ]),
    ]
}

function buildExpertCommentSheetData(rows: ExpertCommentRow[]): string[][] {
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
        "Property",
        "Comment Text",
        "Voice URL"
    ]

    return [
        headers,
        ...rows.map((row) => [
            row.order,
            row.code,
            row.beverage,
            row.beverageType,
            row.wineType,
            row.vintage,
            row.volume,
            row.origin,
            row.producer,
            row.property,
            row.commentText,
            row.voiceUrl,
        ]),
    ]
}

export function buildExpertOverviewCsv(
    rows: ExpertOverviewRow[],
    propertyMap: Record<string, PropertyMeta>,
    resultCodes: string[]
): string {
    const lines = buildExpertOverviewSheetData(rows, propertyMap, resultCodes).map((row) =>
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

export async function downloadExpertResultsXlsx(
    context: ExpertExportContext,
    propertyMap: Record<string, PropertyMeta>,
    resultCodes: string[],
    allPropertyCodes: string[],
    filename: string,
): Promise<void> {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(buildExpertOverviewSheetData(context.overviewRows, propertyMap, resultCodes)),
        "Overview",
    )

    XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(
            buildExpertDetailSheetData(context.detailRows, propertyMap, allPropertyCodes),
        ),
        "Detailed Scores",
    )

    XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(buildExpertCommentSheetData(context.commentRows)),
        "Comments",
    )

    XLSX.writeFile(wb, filename)
}

export function sanitizeFilename(name: string): string {
    return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80) || "results"
}

export async function handleExpertExport({
    data,
    commissionName,
    format,
    resolveProducerName,
    generalCommentLabel,
    booleanLabels,
    formatBeverageType,
    setExportProgress,
}: {
    data: MyTastingSummaryData
    commissionName: string
    format: "csv" | "xlsx"
    resolveProducerName: (auids: string[]) => string
    generalCommentLabel: string
    booleanLabels: BooleanScoreLabels
    formatBeverageType: (type: string) => string
    setExportProgress: (progress: string) => void
}) {
    const entries = data.entries
    const propertyMap = data.propertyMap

    // Find all unique coordinates in entries
    const uniqueCoords = new Map<string, { lat: number; lon: number }>()
    entries.forEach((entry) => {
        const origin = entry.origin
        if (origin && typeof origin.latitude === "number" && typeof origin.longitude === "number") {
            const key = `${origin.latitude},${origin.longitude}`
            uniqueCoords.set(key, { lat: origin.latitude, lon: origin.longitude })
        }
    })

    const geocodeResults = new Map<string, string[]>()
    const coordsList = Array.from(uniqueCoords.entries())

    for (let i = 0; i < coordsList.length; i++) {
        const [key, coords] = coordsList[i]
        setExportProgress(`Geocoding (${i + 1}/${coordsList.length})`)

        try {
            const info = await getGeographicInfo(coords.lat, coords.lon)
            if (info) {
                const parts = [
                    info.country,
                    info.districtDetail,
                    info.regionDetail,
                    info.cityDetail
                ].filter(Boolean) as string[]
                geocodeResults.set(key, parts)
            }
        } catch (err) {
            console.error(`Failed to geocode coordinate ${key}:`, err)
        }

        if (i < coordsList.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }
    }

    setExportProgress("Generating file...")

    const getOriginText = (originObj: { latitude: number; longitude: number } | null | undefined): string => {
        if (!originObj || typeof originObj.latitude !== "number" || typeof originObj.longitude !== "number") {
            return "-"
        }
        const key = `${originObj.latitude},${originObj.longitude}`
        const parts = geocodeResults.get(key)
        if (parts && parts.length > 0) {
            const uniqueParts: string[] = []
            parts.forEach((p) => {
                if (!uniqueParts.includes(p)) uniqueParts.push(p)
            })
            return uniqueParts.join(", ")
        }
        return `${originObj.latitude}, ${originObj.longitude}`
    }

    const resultCodes = Object.keys(propertyMap)
        .filter((code) => propertyMap[code]?.isResult === true)
        .sort()

    const allPropertyCodes = Object.keys(propertyMap).sort()

    const overviewRows: ExpertOverviewRow[] = entries.map((entry) => {
        const outcomes: Record<string, string> = {}
        resultCodes.forEach((code) => {
            const tsVal = entry.totalScores.find((ts) => ts.code === code)?.value
            const evalVal = entry.evaluation.scores.find((s) => s.code === code)?.value
            const finalVal = tsVal !== undefined && tsVal !== "" ? tsVal : (evalVal !== undefined ? evalVal : "")

            outcomes[code] = hasStoredScoreValue(finalVal, propertyMap[code]?.kind)
                ? formatPropertyScoreValue(finalVal, propertyMap[code], booleanLabels)
                : "-"
        })

        return {
            order: String(entry.order),
            code: entry.code,
            beverage: entry.beverageName,
            beverageType: entry.beverageType ? formatBeverageType(entry.beverageType) : "-",
            wineType: entry.wineType ? formatBeverageType(entry.wineType) : "-",
            vintage: entry.vintage || "-",
            volume: entry.volume || "-",
            origin: getOriginText(entry.origin),
            producer: resolveProducerName(entry.producerAuids),
            outcomes,
        }
    })

    const detailRows: ExpertDetailScoreRow[] = entries.map((entry) => {
        const scores: Record<string, string> = {}
        allPropertyCodes.forEach((code) => {
            const val = entry.evaluation.scores.find((s) => s.code === code)?.value
            scores[code] = hasStoredScoreValue(val, propertyMap[code]?.kind)
                ? formatPropertyScoreValue(val!, propertyMap[code], booleanLabels)
                : ""
        })

        return {
            order: String(entry.order),
            code: entry.code,
            beverage: entry.beverageName,
            beverageType: entry.beverageType ? formatBeverageType(entry.beverageType) : "-",
            wineType: entry.wineType ? formatBeverageType(entry.wineType) : "-",
            vintage: entry.vintage || "-",
            volume: entry.volume || "-",
            origin: getOriginText(entry.origin),
            producer: resolveProducerName(entry.producerAuids),
            scores,
        }
    })

    const commentRows: ExpertCommentRow[] = []
    const commentFlags = {
        propertyCommentsEnabled: data.propertyCommentsEnabled,
        voiceCommentsEnabled: data.voiceCommentsEnabled,
    }

    entries.forEach((entry) => {
        const visibleComments = entry.evaluation.comments.filter((c) =>
            commentHasVisibleContent(c, commentFlags),
        )

        visibleComments.forEach((comment) => {
            const propName = comment.propertyId
                ? (propertyMap[comment.propertyId]?.name ?? comment.propertyId)
                : generalCommentLabel

            commentRows.push({
                order: String(entry.order),
                code: entry.code,
                beverage: entry.beverageName,
                beverageType: entry.beverageType ? formatBeverageType(entry.beverageType) : "-",
                wineType: entry.wineType ? formatBeverageType(entry.wineType) : "-",
                vintage: entry.vintage || "-",
                volume: entry.volume || "-",
                origin: getOriginText(entry.origin),
                producer: resolveProducerName(entry.producerAuids),
                property: propName,
                commentText: comment.text?.trim() ?? "",
                voiceUrl: data.voiceCommentsEnabled && comment.voiceUrl ? comment.voiceUrl : "",
            })
        })
    })

    const context: ExpertExportContext = { overviewRows, detailRows, commentRows }
    const filenameBase = sanitizeFilename(commissionName || "expert-tasting")

    if (format === "csv") {
        const csv = buildExpertOverviewCsv(context.overviewRows, propertyMap, resultCodes)
        downloadCsv(csv, `${filenameBase}-results.csv`)
    } else {
        await downloadExpertResultsXlsx(
            context,
            propertyMap,
            resultCodes,
            allPropertyCodes,
            `${filenameBase}-results.xlsx`,
        )
    }
}
