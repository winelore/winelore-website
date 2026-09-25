import type { BooleanScoreLabels, GeographicInfo } from '@winelore/core';
import {
    tastingSummaryCsv,
    tastingSummaryFilename,
    tastingSummaryOriginLookup,
    tastingSummaryOriginText,
    tastingSummaryOrigins,
    tastingSummarySheets,
    type MyTastingSummaryData,
} from '@winelore/core/commission';
import { getGeographicInfo } from "@/lib/geocoding"

function downloadCsv(content: string, filename: string): void {
    const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * The summary's download. The cells are core's, which the app's share sheet
 * writes too; what is left here is looking up the origins — one a second, as
 * Nominatim asks — and handing the file to the browser.
 */
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
    const points = tastingSummaryOrigins(data.entries)
    const found: Array<[(typeof points)[number], GeographicInfo | null]> = []

    for (let i = 0; i < points.length; i++) {
        const point = points[i]
        setExportProgress(`Geocoding (${i + 1}/${points.length})`)
        try {
            found.push([point, await getGeographicInfo(point.latitude, point.longitude)])
        } catch (err) {
            console.error(`Failed to geocode coordinate ${point.latitude},${point.longitude}:`, err)
        }
        if (i < points.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }
    }

    setExportProgress("Generating file...")

    const lookUp = tastingSummaryOriginLookup(found)
    const sheets = tastingSummarySheets(data, {
        producerName: resolveProducerName,
        generalCommentLabel,
        booleanLabels,
        formatBeverageType,
        origin: (origin) => tastingSummaryOriginText(origin, lookUp),
    })

    if (format === "csv") {
        downloadCsv(tastingSummaryCsv(sheets), tastingSummaryFilename(commissionName, "csv"))
    } else {
        const XLSX = await import("xlsx")
        const wb = XLSX.utils.book_new()
        for (const sheet of sheets) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name)
        }
        XLSX.writeFile(wb, tastingSummaryFilename(commissionName, "xlsx"))
    }
}
