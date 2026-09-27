import { formatPropertyScoreValue, type PropertyMeta } from "@winelore/core"
import {
    expertBreakdown,
    overviewRowDetails,
    overviewRowKey,
    type CompetitionExportContext,
    type CompetitionOverviewRow,
    type ResultsTab,
} from "@winelore/core/results"

type Translate = (key: any, params?: Record<string, string | number>) => string

export interface PrintPageInput {
    title: string
    context: CompetitionExportContext
    /** The overview after the search, as on screen. */
    overviewRows: CompetitionOverviewRow[]
    tab: ResultsTab
    /** Overview rows opened on screen; they print with their expert breakdown. */
    expanded: Set<string>
    personName: (auid: string) => string
    formatStatus: (status: string) => string
    formatReplicaType: (type: string) => string
    t: Translate
}

const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function table(headers: string[], rows: string[][], empty: string): string {
    const head = `<tr>${headers.map((header) => `<th>${escape(header)}</th>`).join("")}</tr>`
    const body = rows.length
        ? rows.map((row) => `<tr>${row.join("")}</tr>`).join("")
        : `<tr><td class="empty" colspan="${headers.length}">${escape(empty)}</td></tr>`
    return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`
}

const cell = (value: string, className = "") => `<td class="${className}">${escape(value)}</td>`

/**
 * What the web prints — the page's title, its figures and the open tab's
 * table, with opened candidates' expert breakdowns in full — laid out for
 * the system print sheet, which is how a phone prints.
 */
export function buildPrintPage(input: PrintPageInput): string {
    const { context, t, personName } = input
    const figures = [
        [t("competition.totalCommissions"), context.commissionSummaryRows.length],
        [t("competition.totalCandidates"), context.overviewRows.length],
        [t("competition.totalEvaluations"), context.expertScoreRows.length],
        [t("competition.totalAwards"), context.awardRows.length],
    ]
        .map(([label, value]) => `<div class="figure"><span>${escape(String(label))}</span><b>${value}</b></div>`)
        .join("")

    return `<!doctype html><html><head><meta charset="utf-8"><style>
        body { font-family: -apple-system, Roboto, sans-serif; color: #1d293d; margin: 24px; }
        h1 { font-size: 22px; margin: 0 0 16px; }
        .figures { display: flex; gap: 12px; margin-bottom: 20px; }
        .figure { flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; }
        .figure span { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #90a1b9; }
        .figure b { font-size: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th { text-align: left; font-size: 8px; text-transform: uppercase; color: #62748e; background: #f8fafc; }
        th, td { padding: 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .strong { font-weight: 800; } .accent { color: #4f39f6; font-weight: 700; } .muted { color: #90a1b9; }
        .empty { text-align: center; color: #90a1b9; padding: 24px; }
        .breakdown { background: #f8fafc; padding: 10px 12px; }
        .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; margin-bottom: 6px; background: #fff; }
        .card.outlier { border: 2px solid #ffd230; background: #fffbeb; }
    </style></head><body>
        <h1>${escape(input.title)}</h1>
        <div class="figures">${figures}</div>
        ${tabTable(input)}
    </body></html>`

    function tabTable({ tab }: PrintPageInput): string {
        switch (tab) {
            case "commissions":
                return table(
                    [
                        t("commission.results.commissionNameColumn"),
                        t("commission.results.statusColumn"),
                        t("commission.results.candidatesCountColumn"),
                        t("commission.results.replicasCountColumn"),
                        t("commission.results.awardsGrantedColumn"),
                    ],
                    context.commissionSummaryRows.map((row) => [
                        cell(row.commissionName, "strong"),
                        cell(input.formatStatus(row.status)),
                        cell(String(row.candidateCount)),
                        cell(String(row.replicaCount)),
                        cell(String(row.awardsCount)),
                    ]),
                    "",
                )
            case "expertScores":
                return table(
                    [
                        t("commission.results.commissionColumn"),
                        t("commission.results.candidateCode"),
                        t("commission.results.codeBeverage"),
                        t("commission.results.replicaColumn"),
                        t("commission.results.evaluatorColumn"),
                        t("commission.results.scoresOverviewColumn"),
                    ],
                    context.expertScoreRows.map((row) => [
                        cell(row.commissionName, "accent"),
                        cell(row.code, "strong"),
                        cell(row.beverage),
                        cell(row.replicaName),
                        cell(personName(row.evaluator)),
                        cell(Object.entries(row.scores).map(([code, value]) => `${code}: ${value}`).join(", ")),
                    ]),
                    t("commission.results.noExpertScores"),
                )
            case "comments":
                return table(
                    [
                        t("commission.results.commissionColumn"),
                        t("commission.results.candidateCode"),
                        t("commission.results.codeBeverage"),
                        t("commission.results.evaluatorColumn"),
                        t("commission.results.propertyColumn"),
                        t("commission.results.commentTextColumn"),
                    ],
                    context.commentRows.map((row) => [
                        cell(row.commissionName, "accent"),
                        cell(row.code, "strong"),
                        cell(row.beverage),
                        cell(personName(row.evaluator)),
                        cell(row.property),
                        cell(row.commentText || (row.voiceUrl ? "🎙" : "-")),
                    ]),
                    t("commission.results.noComments"),
                )
            case "awards":
                return table(
                    [
                        t("commission.results.commissionColumn"),
                        t("commission.results.candidateCode"),
                        t("commission.results.codeBeverage"),
                        t("commission.results.producer"),
                        t("commission.results.awardNameColumn"),
                    ],
                    context.awardRows.map((row) => [
                        cell(row.commissionName, "accent"),
                        cell(row.code, "strong"),
                        cell(row.beverage),
                        cell(personName(row.producer)),
                        cell(row.awardName, "strong"),
                    ]),
                    t("commission.results.noAwardsRegistered"),
                )
            default:
                return overviewTable()
        }
    }

    function overviewTable(): string {
        const outcomes = context.outcomePropertyCodes
        const headers = [
            t("commission.results.rank"),
            t("commission.results.commissionColumn"),
            t("commission.results.candidateCode"),
            t("commission.results.codeBeverage"),
            t("commission.results.typeColumn"),
            t("commission.results.producer"),
            ...outcomes.map((code) => context.outcomePropertyNames[code] ?? code),
            t("commission.results.awards"),
        ]
        const rows = input.overviewRows.map((row, index) => {
            const cells = [
                cell(`#${index + 1}`, "muted"),
                cell(row.commissionName, "accent"),
                cell(row.code, "strong"),
                `<td><b>${escape(row.beverage)}</b><br><span class="muted">${escape(overviewRowDetails(row))}</span></td>`,
                cell(row.beverageType ?? "-"),
                cell(personName(row.producer)),
                ...outcomes.map((code) => cell(row.outcomes[code] ?? "-", "strong")),
                cell(row.awards),
            ].join("")
            const opened = input.expanded.has(overviewRowKey(row, index))
            return [opened ? `${cells}</tr><tr><td colspan="${headers.length}" class="breakdown">${breakdown(row)}</td>` : cells]
        })
        return table(headers, rows, t("commission.results.noMatchingCandidates"))
    }

    function breakdown(row: CompetitionOverviewRow): string {
        const cards = expertBreakdown(context, row)
        if (cards.length === 0) return escape(t("commission.results.noEvaluationsYet"))
        const labels = { yesLabel: t("common.yes"), noLabel: t("common.no") }
        const score = (code: string, value: string) =>
            `${escape(context.propertyMap[code]?.name ?? code)}: <b>${escape(
                formatPropertyScoreValue(value, context.propertyMap[code] as PropertyMeta | undefined, labels),
            )}</b>`
        return cards
            .map(({ scoreRow, evaluation, outlier }) => {
                const comments = evaluation.comments
                    .map((comment) => {
                        const label = comment.propertyId
                            ? (context.propertyMap[comment.propertyId]?.name ?? comment.propertyId)
                            : t("evaluation.generalCommentLabel")
                        return `<div><span class="accent">${escape(label)}:</span> ${escape(comment.text)}</div>`
                    })
                    .join("")
                return `<div class="card${outlier?.isOutlier ? " outlier" : ""}">
                    <b>${escape(scoreRow.replicaName)}</b> · ${escape(input.formatReplicaType(scoreRow.replicaType))}
                    ${outlier?.isOutlier ? ` · ⚠ ${escape(t("commission.results.outOfDelta"))}` : ""}
                    — ${escape(personName(scoreRow.evaluator))}
                    <div>${evaluation.scores.map((item) => score(item.code, item.value)).join(" · ")}</div>
                    ${comments}
                </div>`
            })
            .join("")
    }
}
