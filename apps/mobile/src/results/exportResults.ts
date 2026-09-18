import { File, Paths } from "expo-file-system"
import * as Print from "expo-print"
import * as Sharing from "expo-sharing"
import * as XLSX from "xlsx"
import {
    buildCompetitionResultsCsv,
    competitionResultSheets,
    competitionResultsFilename,
    type CompetitionExportContext,
    type ResultsSheet,
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
    await shareSheets(
        competitionResultsFilename(scopeName, format),
        format,
        format === "csv" ? buildCompetitionResultsCsv(context) : competitionResultSheets(context),
    )
}

/** A download for the share sheet: a CSV's text, or a workbook's sheets. */
export async function shareSheets(filename: string, format: ExportFormat, content: string | ResultsSheet[]) {
    const file = new File(Paths.cache, filename)
    if (file.exists) file.delete()
    file.create()

    if (typeof content === "string") {
        // With a byte-order mark, as the web's, so Excel reads it as UTF-8.
        file.write(`\uFEFF${content}`)
    } else {
        const workbook = XLSX.utils.book_new()
        for (const sheet of content) {
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
