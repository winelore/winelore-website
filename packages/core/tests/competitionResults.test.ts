/**
 * The competition results page, shared by the web and the app: who sees
 * which commissions, how the rows load, and what the page and its downloads
 * do with them.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    ALL_COMMISSIONS,
    buildCompetitionResultsCsv,
    cachedFetch,
    competitionResultSheets,
    competitionResultsFilename,
    expertBreakdown,
    loadCompetitionResults,
    overviewRowDetails,
    resolveCompetitionResultsScope,
    resultPersonAuids,
    resultPersonName,
    resultsTabCounts,
    scopeResultsContext,
    searchOverviewRows,
    type CompetitionExportContext,
    type CompetitionOverviewRow,
    type CompetitionResultsSource,
} from "../src/results"
import {
    commentHasVisibleContent,
    hasFullAssessmentDetails,
    splitDisplayedScores,
} from "../src/evaluationDisplay"
import { lookupBackendText } from "../src/i18n"

// --- Scope ------------------------------------------------------------------

const competition = {
    id: "comp-1",
    name: "Spring Cup",
    status: "STARTED",
    holders: [[1]],
    series: { id: "s", name: "Series", status: "ACTIVE" },
}

const commissionWith = (id: string, replicas: unknown[]) => ({ id, name: id, status: "STARTED", replicas })
const judged = (status: string, auid: number) => ({ status, members: [{ auid: [auid] }] })

const scopeResponse = {
    competition,
    commissionsByCompetition: {
        items: [
            commissionWith("a", [judged("COMPLETED", 7)]),
            commissionWith("b", [judged("IN_PROGRESS", 7)]),
            commissionWith("c", [judged("COMPLETED", 8)]),
        ],
    },
}

test("a holder sees every commission's results", () => {
    const scope = resolveCompetitionResultsScope(scopeResponse, "1")
    assert.equal(scope.status, "ready")
    if (scope.status !== "ready") return
    assert.deepEqual(scope.competition.commissions.map((c) => c.id), ["a", "b", "c"])
    assert.equal(scope.commissionId, null)
})

test("a judge sees only commissions whose replica they finished", () => {
    const scope = resolveCompetitionResultsScope(scopeResponse, "7")
    assert.equal(scope.status, "ready")
    if (scope.status !== "ready") return
    assert.deepEqual(scope.competition.commissions.map((c) => c.id), ["a"])
})

test("someone who judged nothing finished, or is signed out, is refused", () => {
    assert.equal(resolveCompetitionResultsScope(scopeResponse, "99").status, "forbidden")
    assert.equal(resolveCompetitionResultsScope(scopeResponse, null).status, "forbidden")
})

test("a missing competition is unavailable, not forbidden", () => {
    assert.equal(resolveCompetitionResultsScope({ competition: null }, "1").status, "unavailable")
    assert.equal(resolveCompetitionResultsScope(null, "1").status, "unavailable")
})

test("the commission asked for is kept only when the user may see it", () => {
    const pick = (auid: string, requested: string) => {
        const scope = resolveCompetitionResultsScope(scopeResponse, auid, requested)
        return scope.status === "ready" ? scope.commissionId : scope.status
    }
    assert.equal(pick("1", "c"), "c")
    assert.equal(pick("7", "a"), "a")
    assert.equal(pick("7", "c"), null, "a judge cannot pick another commission")
    assert.equal(pick("1", "nope"), null)
})

// --- Loading ----------------------------------------------------------------

function commissionResults(id: string, code: string) {
    return {
        id,
        name: id,
        competition: { holders: [[1]] },
        outcomePolicyEdition: null,
        panels: [
            {
                id: `${id}-panel`,
                candidates: [
                    {
                        id: `${id}-cand`,
                        anonymizedCode: code,
                        sample: { batch: { beverage: { id: `${id}-bev`, name: `Wine ${code}`, producers: [{ auid: 42 }] } } },
                    },
                ],
            },
        ],
        replicas: [
            {
                id: `${id}-rep`,
                name: "Standard",
                type: "STANDARD",
                status: "COMPLETED",
                members: [{ auid: [7] }],
                replicaPanels: [{ panel: { id: `${id}-panel` }, replicaCandidates: [{ id: `${id}-rc`, candidate: { id: `${id}-cand` } }] }],
            },
        ],
    }
}

function source(over: Partial<CompetitionResultsSource> = {}): CompetitionResultsSource {
    return {
        commission: async (id) => commissionResults(id, id.toUpperCase()),
        templates: async () => null,
        evaluations: async (rc) => [
            { id: `${rc}-ev`, isComplete: true, evaluatorAuid: 7, scores: [{ code: "total", value: "90" }], comments: [] },
        ],
        beverageAwards: async () => [],
        ...over,
    }
}

const commissions = [
    { id: "a", name: "a", status: "STARTED" },
    { id: "b", name: "b", status: "STARTED" },
]

test("rows from every commission are merged in the commissions' order", async () => {
    const context = await loadCompetitionResults(source(), commissions, "Spring Cup", "1")
    assert.deepEqual(context.overviewRows.map((row) => row.code), ["A", "B"])
    assert.deepEqual(context.commissionSummaryRows.map((row) => row.commissionId), ["a", "b"])
    assert.equal(context.expertScoreRows.length, 2)
    assert.equal(context.competitionName, "Spring Cup")
})

test("a commission that fails to load is left out, not the page", async () => {
    const errors: string[] = []
    const context = await loadCompetitionResults(
        source({
            commission: async (id) => {
                if (id === "a") throw new Error("boom")
                return commissionResults(id, "B")
            },
        }),
        commissions,
        "Spring Cup",
        "1",
        (where) => errors.push(where),
    )
    assert.deepEqual(context.overviewRows.map((row) => row.code), ["B"])
    assert.deepEqual(errors, ["commission a"])
})

test("failed evaluations and awards read as none; failed templates only cost names", async () => {
    const context = await loadCompetitionResults(
        source({
            evaluations: async () => {
                throw new Error("no")
            },
            beverageAwards: async () => {
                throw new Error("no")
            },
            templates: async () => {
                throw new Error("no")
            },
        }),
        commissions.slice(0, 1),
        "Spring Cup",
        "1",
    )
    assert.equal(context.overviewRows.length, 1)
    assert.equal(context.expertScoreRows.length, 0)
    assert.equal(context.awardRows.length, 0)
})

test("a commission the user may not see is skipped even if asked for", async () => {
    const context = await loadCompetitionResults(source(), commissions, "Spring Cup", "99")
    assert.equal(context.overviewRows.length, 0)
})

test("cachedFetch reuses a value until it expires, and does not cache failures", async () => {
    let calls = 0
    const fetch = cachedFetch(async (key) => {
        calls += 1
        if (key === "bad") throw new Error("no")
        return `${key}-${calls}`
    }, 60_000)
    assert.equal(await fetch("x"), "x-1")
    assert.equal(await fetch("x"), "x-1")
    await assert.rejects(fetch("bad"))
    await assert.rejects(fetch("bad"))
    assert.equal(calls, 3)
})

// --- The page ---------------------------------------------------------------

function row(over: Partial<CompetitionOverviewRow>): CompetitionOverviewRow {
    return {
        commissionId: "a",
        commissionName: "Reds",
        candidateId: "cand",
        code: "0417",
        beverage: "Riesling",
        producer: "42",
        outcomes: {},
        awards: "-",
        wineType: "WHITE",
        vintage: "2019",
        volume: "-",
        ...over,
    }
}

function context(): CompetitionExportContext {
    const score = (evaluationId: string, replicaId: string, total: string, evaluator = "7") => ({
        commissionId: "a",
        commissionName: "Reds",
        replicaId,
        evaluationId,
        code: "0417",
        beverage: "Riesling",
        producer: "42",
        replicaName: replicaId,
        replicaType: "STANDARD",
        evaluator,
        scores: { total, aroma: "4" },
    })
    return {
        competitionName: "Spring Cup",
        overviewRows: [
            row({ outcomes: { total: "88" } }),
            row({ commissionId: "b", commissionName: "Whites", candidateId: "c2", code: "0999", beverage: "Tokaji", producer: "-", outcomes: { sweet: "3" } }),
        ],
        commissionSummaryRows: [
            { commissionId: "a", commissionName: "Reds", status: "STARTED", candidateCount: 1, replicaCount: 1, awardsCount: 0 },
            { commissionId: "b", commissionName: "Whites", status: "STARTED", candidateCount: 1, replicaCount: 1, awardsCount: 0 },
        ],
        expertScoreRows: [
            score("e1", "r1", "90"),
            score("e2", "r1", "90", "8"),
            score("e3", "r1", "60", "9"),
            score("e4", "r2", "70", "10"),
        ],
        commentRows: [
            {
                commissionId: "a",
                commissionName: "Reds",
                replicaId: "r1",
                evaluationId: "e1",
                commentId: "k1",
                code: "0417",
                beverage: "Riesling",
                producer: "42",
                replicaName: "r1",
                evaluator: "7",
                property: "General",
                commentText: "Bright, \"crisp\"",
                voiceUrl: "",
            },
        ],
        awardRows: [],
        outcomePropertyCodes: ["total", "sweet"],
        outcomePropertyNames: { total: "Total", sweet: "Sweetness" },
        propertyMap: {
            total: { name: "Total", isResult: true, kind: "numeric" },
            aroma: { name: "Aroma", isResult: false, kind: "numeric" },
        },
    }
}

test("narrowing to one commission keeps its rows and only its outcome columns", () => {
    const all = context()
    assert.equal(scopeResultsContext(all, ALL_COMMISSIONS), all)
    const reds = scopeResultsContext(all, "a")!
    assert.deepEqual(reds.overviewRows.map((r) => r.code), ["0417"])
    assert.deepEqual(reds.commissionSummaryRows.map((r) => r.commissionId), ["a"])
    assert.deepEqual(reds.outcomePropertyCodes, ["total"])
    assert.equal(scopeResultsContext(null, "a"), null)
})

test("search matches code, beverage, commission and producer name", () => {
    const rows = context().overviewRows
    const name = (auid: string) => resultPersonName(auid, { "42": "Château Test" }, "Unknown")
    assert.deepEqual(searchOverviewRows(rows, "  ", name).length, 2)
    assert.deepEqual(searchOverviewRows(rows, "0999", name).map((r) => r.code), ["0999"])
    assert.deepEqual(searchOverviewRows(rows, "whites", name).map((r) => r.code), ["0999"])
    assert.deepEqual(searchOverviewRows(rows, "château", name).map((r) => r.code), ["0417"])
    assert.deepEqual(searchOverviewRows(rows, "unknown", name).map((r) => r.code), ["0999"])
})

test("tab counts: the search narrows the overview only", () => {
    assert.deepEqual(resultsTabCounts(context(), 1), { overview: 1, commissions: 2, expertScores: 4, comments: 1, awards: 0 })
    assert.deepEqual(resultsTabCounts(null, 5), { overview: 0, commissions: 0, expertScores: 0, comments: 0, awards: 0 })
})

test("people looked up are numeric producers and evaluators, once each", () => {
    assert.deepEqual(resultPersonAuids(context()).sort(), ["10", "42", "7", "8", "9"])
    assert.deepEqual(resultPersonAuids(null), [])
})

test("the line under a candidate skips empty parts", () => {
    assert.equal(overviewRowDetails(row({})), "WHITE • 2019")
})

test("the breakdown flags an out-of-delta judge within their own replica", () => {
    const cards = expertBreakdown(context(), context().overviewRows[0])
    assert.equal(cards.length, 4)
    const flagged = cards.filter((card) => card.outlier?.isOutlier).map((card) => card.scoreRow.evaluationId)
    // r1 averages 80, and every one of its totals is more than 5 away from that.
    assert.deepEqual(flagged, ["e1", "e2", "e3"])
    // Alone in its replica, r2's judge is its own average.
    assert.equal(cards[3].outlier?.isOutlier, false)
    assert.deepEqual(cards[0].resultScores, [{ code: "total", value: "90" }])
    assert.deepEqual(cards[0].evaluation.comments, [{ id: "k1", text: 'Bright, "crisp"', voiceUrl: null, propertyId: null }])
})

// --- Downloads --------------------------------------------------------------

test("the spreadsheet always has the overview and commissions, and others when non-empty", () => {
    const names = competitionResultSheets(context()).map((sheet) => sheet.name)
    assert.deepEqual(names, ["Overview", "Commissions Breakdown", "Expert Scores", "Comments"])
    const overview = competitionResultSheets(context())[0].rows
    assert.deepEqual(overview[0].slice(-3), ["Total", "Sweetness", "Awards"])
    assert.deepEqual(overview[2].slice(-3), ["-", "3", "-"])
})

test("the CSV quotes cells with commas and quotes", () => {
    const csv = buildCompetitionResultsCsv({ ...context(), overviewRows: [row({ beverage: 'Big, "Bold"' })] })
    assert.ok(csv.split("\n")[1].includes('"Big, ""Bold"""'))
})

test("file names are safe and say which results they hold", () => {
    assert.equal(competitionResultsFilename("Spring Cup: Reds/2026", "xlsx"), "Spring-Cup-Reds2026-results.xlsx")
    assert.equal(competitionResultsFilename("№", "csv"), "results-results.csv")
})

// --- Evaluation cards -------------------------------------------------------

test("a comment shows only what the commission allows", () => {
    const flags = { propertyCommentsEnabled: false, voiceCommentsEnabled: false }
    assert.equal(commentHasVisibleContent({ text: "Nice" }, flags), true)
    assert.equal(commentHasVisibleContent({ text: "Nice", propertyId: "aroma" }, flags), false)
    assert.equal(commentHasVisibleContent({ voiceUrl: "https://x" }, flags), false)
    assert.equal(commentHasVisibleContent({ voiceUrl: "https://x" }, { ...flags, voiceCommentsEnabled: true }), true)
})

test("scores split into submitted and results, dropping empty ones", () => {
    const map = context().propertyMap
    const { regular, result } = splitDisplayedScores(
        [
            { code: "aroma", value: "4" },
            { code: "total", value: "90" },
            { code: "aroma", value: " " },
        ],
        map,
    )
    assert.deepEqual(regular, [{ code: "aroma", value: "4" }])
    assert.deepEqual(result, [{ code: "total", value: "90" }])
    const flags = { propertyCommentsEnabled: true, voiceCommentsEnabled: true }
    assert.equal(hasFullAssessmentDetails({ scores: result }, map, flags), false)
    assert.equal(hasFullAssessmentDetails({ scores: regular }, map, flags), true)
})

test("backend texts come from the static table, ignoring case", () => {
    assert.equal(lookupBackendText("Aroma", "uk"), "Аромат")
    assert.equal(lookupBackendText("  aroma ", "uk"), "Аромат")
    assert.equal(lookupBackendText("Not a known property", "uk"), null)
    assert.equal(lookupBackendText("", "uk"), null)
})
