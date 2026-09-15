import { competitionResultSheets, type CompetitionExportContext } from "@winelore/core/results"

/**
 * Row shapes and the sheets' cells live in @winelore/core/results so the
 * mobile app exports the same file. Re-exported to keep existing imports
 * working.
 */
export type {
    CompetitionOverviewRow,
    CommissionSummaryRow,
    CompetitionExpertScoreRow,
    CompetitionCommentRow,
    CompetitionAwardRow,
    CompetitionExportContext,
} from "@winelore/core/results"
export { buildCompetitionResultsCsv } from "@winelore/core/results"

export async function downloadCompetitionResultsXlsx(
    context: CompetitionExportContext,
    filename: string,
): Promise<void> {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()
    for (const sheet of competitionResultSheets(context)) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name)
    }
    XLSX.writeFile(wb, filename)
}
