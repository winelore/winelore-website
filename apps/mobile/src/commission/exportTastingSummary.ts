import {
    commentHasVisibleContent,
    formatPropertyScoreValue,
    splitDisplayedScores,
    type GeographicInfo,
} from "@winelore/core"
import {
    tastingSummaryCsv,
    tastingSummaryFilename,
    tastingSummaryOriginLookup,
    tastingSummaryOriginText,
    tastingSummaryOrigins,
    tastingSummarySheets,
    type MyTastingSummaryData,
    type TastingSummaryExportOptions,
} from "@winelore/core/commission"
import { lookUp } from "../geocoding/useBeverageOrigins"
import { shareSheets, type ExportFormat } from "../results/exportResults"

type Translate = (key: any, params?: Record<string, string | number>) => string

/**
 * The web's download of a tasting summary: core's sheets, with each origin
 * looked up first — through the app's paced queue, since Nominatim allows a
 * phone one request a second — and the file handed to the share sheet.
 */
export async function shareTastingSummary(
    data: MyTastingSummaryData,
    format: ExportFormat,
    options: Omit<TastingSummaryExportOptions, "origin">,
    onProgress: (done: number, total: number) => void,
) {
    const points = tastingSummaryOrigins(data.entries)
    let done = 0
    onProgress(done, points.length)
    const found = await Promise.all(
        points.map(async (point) => {
            const info = await lookUp(point)
            onProgress(++done, points.length)
            return [point, info] as [typeof point, GeographicInfo | null]
        }),
    )
    const lookUpFound = tastingSummaryOriginLookup(found)
    const sheets = tastingSummarySheets(data, { ...options, origin: (origin) => tastingSummaryOriginText(origin, lookUpFound) })
    await shareSheets(tastingSummaryFilename(data.commissionName, format), format, format === "csv" ? tastingSummaryCsv(sheets) : sheets)
}

const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/**
 * What the web prints: the title and description, then every sample with
 * its assessment in full — the web's print style opens every card.
 */
export function buildTastingSummaryPrintPage(
    data: MyTastingSummaryData,
    { t, producerName }: { t: Translate; producerName: (auids: string[]) => string },
): string {
    const labels = { yesLabel: t("common.yes"), noLabel: t("common.no") }
    const flags = { propertyCommentsEnabled: data.propertyCommentsEnabled, voiceCommentsEnabled: data.voiceCommentsEnabled }
    const value = (code: string, raw: string) => escape(formatPropertyScoreValue(raw, data.propertyMap[code], labels))
    const name = (code: string) => escape(data.propertyMap[code]?.name ?? code)
    const chips = (scores: Array<{ code: string; value: string }>, result: boolean) =>
        scores.map((score) => `<span class="chip${result ? " result" : ""}"><b>${value(score.code, score.value)}</b> ${name(score.code)}</span>`).join("")

    const cards = data.entries
        .map((entry) => {
            const { regular, result } = splitDisplayedScores(entry.evaluation.scores, data.propertyMap)
            const comments = entry.evaluation.comments.filter((comment) => commentHasVisibleContent(comment, flags))
            const headline = entry.totalScores
                .map((score) => `<div class="total"><span>${escape(score.name)}</span><b>${value(score.code, score.value)}</b></div>`)
                .join("")
            return `<section class="card">
                <div class="head">
                    <div class="who">
                        <h2><span class="order">${entry.order}</span>${escape(entry.beverageName)}</h2>
                        <p>${escape(t("commission.results.producer"))}: ${escape(producerName(entry.producerAuids))}</p>
                        <p class="code">${escape(t("commission.results.candidateCode"))}: ${escape(entry.code)}</p>
                    </div>
                    <div class="totals">${headline}</div>
                </div>
                ${
                    regular.length || result.length || comments.length
                        ? `<div class="body">
                    ${regular.length ? `<p class="kicker">${escape(t("evaluation.submittedScores"))}</p><div class="chips">${chips(regular, false)}</div>` : ""}
                    ${result.length ? `<p class="kicker accent">${escape(t("evaluation.resultsSection"))}</p><div class="chips">${chips(result, true)}</div>` : ""}
                    ${
                        comments.length
                            ? `<p class="kicker">${escape(t("commission.comments"))}</p>${comments
                                  .map((comment) => {
                                      const label = comment.propertyId
                                          ? (data.propertyMap[comment.propertyId]?.name ?? comment.propertyId)
                                          : t("evaluation.generalCommentLabel")
                                      return `<p class="comment"><b>${escape(label)}:</b> ${escape(comment.text ?? "")}${
                                          !comment.text && comment.voiceUrl ? "🎙" : ""
                                      }</p>`
                                  })
                                  .join("")}`
                            : ""
                    }
                </div>`
                        : ""
                }
            </section>`
        })
        .join("")

    return `<!doctype html><html><head><meta charset="utf-8"><style>
        body { font-family: -apple-system, Roboto, sans-serif; color: #1d293d; margin: 24px; }
        header { text-align: center; margin-bottom: 24px; }
        h1 { font-size: 26px; margin: 0 0 6px; }
        header p { color: #62748e; margin: 0; }
        .card { border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 14px; overflow: hidden; break-inside: avoid; }
        .head { display: flex; justify-content: space-between; gap: 12px; padding: 12px 16px; background: #f8fafc; }
        h2 { font-size: 16px; margin: 0 0 4px; }
        .order { display: inline-block; width: 22px; height: 22px; line-height: 22px; margin-right: 8px; border-radius: 11px; text-align: center; font-size: 11px; background: #e0e7ff; color: #432dd7; }
        .who p { margin: 2px 0 0 30px; font-size: 11px; color: #45556c; }
        .who .code { font-family: Menlo, monospace; color: #90a1b9; }
        .total { text-align: right; } .total span { display: block; font-size: 8px; font-weight: 700; text-transform: uppercase; color: #90a1b9; }
        .total b { font-size: 20px; color: #432dd7; }
        .body { padding: 10px 16px; border-top: 1px solid #f1f5f9; }
        .kicker { margin: 8px 0 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; color: #90a1b9; } .kicker.accent { color: #4f39f6; }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { border: 1px solid #e2e8f0; border-radius: 6px; padding: 2px 8px; font-size: 10px; color: #62748e; } .chip b { color: #1d293d; }
        .chip.result { background: #4f39f6; border-color: #a3b3ff; color: #e0e7ff; } .chip.result b { color: #fff; }
        .comment { margin: 3px 0; font-size: 11px; color: #45556c; } .comment b { color: #62748e; }
        .empty { text-align: center; color: #62748e; padding: 32px; }
    </style></head><body>
        <header><h1>${escape(t("commission.myRankingTitle"))}</h1><p>${escape(t("commission.myRankingDesc"))}</p></header>
        ${cards || `<p class="empty">${escape(t("commission.myRankingEmpty"))}</p>`}
    </body></html>`
}
