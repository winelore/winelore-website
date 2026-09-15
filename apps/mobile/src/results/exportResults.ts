import { File, Paths } from "expo-file-system"
import * as Print from "expo-print"
import * as Sharing from "expo-sharing"
import * as XLSX from "xlsx"
import {
    buildCompetitionResultsCsv,
    competitionResultSheets,
    competitionResultsFilename,
    type CompetitionExportContext,
} from "@winelore/core/results"

export type ExportFormat = "xlsx" | "csv"

const TYPES = {
    xlsx: {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        UTI: "org.openxmlformats.spreadsheetml.sheet",
    },
    csv: { mimeType: "text/csv", UTI: "public.comma-separated-values-text" },
} as const

/**
 * The web's download, as a phone offers one: the same file — core's sheets,
 * written by the same SheetJS — handed to the share sheet, from which it can
 * be saved to Files, mailed or opened in Numbers or Excel.
 */
export async function shareResults(context: CompetitionExportContext, scopeName: string, format: ExportFormat) {
    const file = new File(Paths.cache, competitionResultsFilename(scopeName, format))
    if (file.exists) file.delete()
    file.create()

    if (format === "csv") {
        // With a byte-order mark, as the web's, so Excel reads it as UTF-8.
        file.write(`﻿${buildCompetitionResultsCsv(context)}`)
    } else {
        const workbook = XLSX.utils.book_new()
        for (const sheet of competitionResultSheets(context)) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name)
        }
        file.write(XLSX.write(workbook, { type: "base64", bookType: "xlsx" }), { encoding: "base64" })
    }

    await Sharing.shareAsync(file.uri, { ...TYPES[format], dialogTitle: file.name })
}

/** The system print sheet, for a page the caller has laid out. */
export async function printResults(html: string) {
    await Print.printAsync({ html })
}
