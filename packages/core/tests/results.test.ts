/**
 * Result rows decide who wins a competition. They are built once, in core, so
 * the web table, the spreadsheet export and the mobile list cannot disagree —
 * these tests pin the rules that make that worth doing.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    buildCommissionResultRows,
    canViewCommissionResults,
    isReplicaBeverageIncomplete,
} from "../src/results"
import { isReplicaCandidateFinished } from "../src/evaluation"

const commission = { id: "comm-1", name: "Reds 2026", status: "COMPLETED" }

/** Minimal fetched shape: one candidate, one replica, one complete evaluation. */
function commissionData(over: Record<string, unknown> = {}) {
    return {
        outcomePolicyEdition: null,
        candidates: [
            {
                id: "cand-1",
                anonymizedCode: "0417",
                beverageType: { code: "WINE" },
                sample: {
                    volumeMl: 750,
                    batch: {
                        attributes: '{"vintage":"2019"}',
                        beverage: {
                            id: "bev-1",
                            name: "Riesling Reserve",
                            attributes: '{"color":"WHITE"}',
                            producers: [{ auid: 42 }],
                        },
                    },
                },
            },
        ],
        replicas: [
            {
                id: "rep-1",
                name: "Standard",
                type: "STANDARD",
                members: [{ auid: [7] }],
                replicaCandidates: [
                    {
                        candidate: { id: "cand-1" },
                        status: "EVALUATED",
                        evaluations: [
                            {
                                id: "ev-1",
                                isComplete: true,
                                evaluatorAuid: 7,
                                scores: [{ code: "clarity", value: 4 }],
                                comments: [{ id: "c-1", text: "Bright", propertyId: null }],
                            },
                        ],
                    },
                ],
            },
        ],
        ...over,
    }
}

const build = (over: Record<string, unknown> = {}, awards = {}) =>
    buildCommissionResultRows({
        commission,
        commissionData: commissionData(over),
        templateEditionById: {},
        awardsByBeverageId: awards,
    })

test("an overview row carries the candidate's identity and attributes", () => {
    const { overviewRows } = build()
    assert.equal(overviewRows.length, 1)
    const row = overviewRows[0]
    assert.equal(row.code, "0417")
    assert.equal(row.beverage, "Riesling Reserve")
    assert.equal(row.vintage, "2019")
    assert.equal(row.wineType, "WHITE")
    assert.equal(row.volume, "750 ml")
    assert.equal(row.producer, "42")
})

test("attributes in Kotlin map form are read, not thrown on", () => {
    // The backend emits this for fields never serialised as JSON. A bare
    // JSON.parse throws and takes the whole commission's results with it.
    const data = commissionData()
    data.candidates[0].sample.batch.attributes = "{vintage=2019, lot=A}" as never
    data.candidates[0].sample.batch.beverage.attributes = "{color=WHITE}" as never

    const rows = buildCommissionResultRows({
        commission,
        commissionData: data,
        templateEditionById: {},
        awardsByBeverageId: {},
    })
    assert.equal(rows.overviewRows[0].vintage, "2019")
    assert.equal(rows.overviewRows[0].wineType, "WHITE")
})

test("missing attributes degrade to a dash rather than failing", () => {
    const rows = build({
        candidates: [{ id: "c", anonymizedCode: null, sample: null }],
    })
    assert.equal(rows.overviewRows[0].code, "N/A")
    assert.equal(rows.overviewRows[0].beverage, "Unknown Beverage")
    assert.equal(rows.overviewRows[0].vintage, "-")
    assert.equal(rows.overviewRows[0].volume, "-")
})

test("a complete evaluation produces an expert score row and its comments", () => {
    const { expertScoreRows, commentRows } = build()
    assert.equal(expertScoreRows.length, 1)
    assert.deepEqual(expertScoreRows[0].scores, { clarity: "4" })
    assert.equal(expertScoreRows[0].evaluator, "7")
    assert.equal(commentRows.length, 1)
    assert.equal(commentRows[0].commentText, "Bright")
    // A comment with no property is general, not blank.
    assert.equal(commentRows[0].property, "General")
})

test("draft evaluations never become results", () => {
    const data = commissionData()
    data.replicas[0].replicaCandidates[0].evaluations[0].isComplete = false

    const rows = buildCommissionResultRows({
        commission,
        commissionData: data,
        templateEditionById: {},
        awardsByBeverageId: {},
    })
    assert.equal(rows.expertScoreRows.length, 0, "a judge's unfinished work is not a score")
    assert.equal(rows.commentRows.length, 0)
    assert.equal(rows.overviewRows.length, 1, "the candidate still appears")
})

test("comments with neither text nor audio are dropped", () => {
    const data = commissionData()
    data.replicas[0].replicaCandidates[0].evaluations[0].comments = [
        { id: "c-1", text: "", voiceUrl: null },
        { id: "c-2", voiceUrl: "https://example.test/a.m4a" },
    ] as never

    const rows = buildCommissionResultRows({
        commission,
        commissionData: data,
        templateEditionById: {},
        awardsByBeverageId: {},
    })
    assert.equal(rows.commentRows.length, 1)
    assert.equal(rows.commentRows[0].voiceUrl, "https://example.test/a.m4a")
})

test("awards from another commission are excluded", () => {
    const rows = build({}, {
        "bev-1": [
            { commissionId: "comm-1", award: { name: "Gold", code: "G" } },
            { commissionId: "comm-2", award: { name: "Silver", code: "S" } },
            { commissionId: null, award: { name: "Grand", code: "GR" } },
        ],
    })
    // This commission's award plus the unscoped one; never another's.
    assert.deepEqual(rows.awardRows.map((a) => a.awardName), ["Gold", "Grand"])
    assert.equal(rows.overviewRows[0].awards, "Gold; Grand")
    assert.equal(rows.summaryRow.awardsCount, 2)
})

test("no awards reads as a dash, not an empty string", () => {
    assert.equal(build().overviewRows[0].awards, "-")
})

test("the summary row counts what the commission contains", () => {
    const { summaryRow } = build()
    assert.equal(summaryRow.candidateCount, 1)
    assert.equal(summaryRow.replicaCount, 1)
    assert.equal(summaryRow.status, "COMPLETED")
})

// --- access ---------------------------------------------------------------

test("a competition holder may view results", () => {
    assert.equal(
        canViewCommissionResults({ competition: { holders: [[7]] }, replicas: [] }, "7"),
        true,
    )
})

test("a judge may view results only once their replica has finished", () => {
    const judged = (status: string) => ({
        competition: { holders: [] },
        replicas: [{ status, members: [{ auid: [7] }] }],
    })
    assert.equal(canViewCommissionResults(judged("COMPLETED"), "7"), true)
    assert.equal(
        canViewCommissionResults(judged("IN_PROGRESS"), "7"),
        false,
        "mid-session this would expose other judges' scores",
    )
})

test("an unrelated user and a signed-out user may not view results", () => {
    const data = {
        competition: { holders: [[7]] },
        replicas: [{ status: "COMPLETED", members: [{ auid: [7] }] }],
    }
    assert.equal(canViewCommissionResults(data, "99"), false)
    assert.equal(canViewCommissionResults(data, null), false)
})

// --- completeness ---------------------------------------------------------

test("a beverage is incomplete while an expected evaluation is missing", () => {
    const data = {
        candidates: [{ id: "cand-1", sample: { batch: { beverage: { id: "bev-1" } } } }],
        replicas: [
            {
                id: "rep-1",
                members: [{ auid: [7] }, { auid: [8] }],
                replicaCandidates: [
                    {
                        candidate: { id: "cand-1" },
                        status: "PENDING",
                        evaluations: [{ isComplete: true }],
                    },
                ],
            },
        ],
    }
    // Two members expected, one submitted.
    assert.equal(
        isReplicaBeverageIncomplete(data, "rep-1", "bev-1", isReplicaCandidateFinished),
        true,
    )
})

test("a finished candidate is settled whatever its evaluation count", () => {
    const data = {
        candidates: [{ id: "cand-1", sample: { batch: { beverage: { id: "bev-1" } } } }],
        replicas: [
            {
                id: "rep-1",
                members: [{ auid: [7] }, { auid: [8] }],
                replicaCandidates: [
                    { candidate: { id: "cand-1" }, status: "EVALUATED", evaluations: [] },
                ],
            },
        ],
    }
    assert.equal(
        isReplicaBeverageIncomplete(data, "rep-1", "bev-1", isReplicaCandidateFinished),
        false,
    )
})

test("an unknown replica is not reported incomplete", () => {
    assert.equal(
        isReplicaBeverageIncomplete({ candidates: [], replicas: [] }, "nope", "bev-1", isReplicaCandidateFinished),
        false,
    )
})
