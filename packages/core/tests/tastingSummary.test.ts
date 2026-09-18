/**
 * A judge's tasting summary and a template's own page, shared by the web and
 * the app.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    GET_TEMPLATE_CATALOG,
    catalogTemplateCounts,
    GET_TEMPLATE_DETAIL,
    isTemplateOwner,
    loadMyTastingSummary,
    loadTemplateDetail,
    replicaCandidatesInTastingOrder,
    tastingSummaryCsv,
    tastingSummaryFilename,
    tastingSummaryOriginLookup,
    tastingSummaryOriginText,
    tastingSummaryOrigins,
    tastingSummarySheets,
    templateEditionAt,
    toTemplateCatalog,
    type SummaryEvaluation,
    type TastingSummarySource,
} from "../src/commission"

const replicaCandidate = (id: string, candidateId: string, over: Record<string, unknown> = {}) => ({
    id,
    status: "EVALUATED",
    candidate: {
        id: candidateId,
        anonymizedCode: ` ${candidateId.toUpperCase()} `,
        beverageType: { id: "bt-wine", code: "WINE", name: "Wine" },
        sample: {
            id: `s-${candidateId}`,
            volumeMl: 750,
            batch: {
                id: `b-${candidateId}`,
                attributes: "{vintage=2019}",
                beverage: {
                    id: `bev-${candidateId}`,
                    name: `Riesling ${candidateId}`,
                    attributes: '{"color":"WHITE"}',
                    producers: [{ auid: [[42]] }],
                    origin: { latitude: 48.6, longitude: 22.3 },
                },
            },
        },
        ...over,
    },
})

// The commission's panels list c2 before c1; the replica returns them the other way.
const replica = {
    commission: { id: "commission-1", panels: [{ candidates: [{ id: "c2" }, { id: "c1" }] }] },
    replicaPanels: [{ id: "rp-1", panel: { id: "p-1" }, replicaCandidates: [replicaCandidate("rc1", "c1"), replicaCandidate("rc2", "c2")] }],
}

const templates = {
    commission: {
        templateEditions: [
            {
                beverageType: { code: "WINE" },
                templateEdition: {
                    categories: [
                        {
                            properties: [
                                { __typename: "IntProperty", id: "prop-colour", code: "colour", name: "Colour", isResult: false },
                                { __typename: "SmartProperty", id: "prop-total", code: "total", name: "Total", isResult: true },
                            ],
                        },
                    ],
                },
            },
        ],
    },
} as never

const evaluation = (auid: number, total: string, over: Partial<SummaryEvaluation> = {}): SummaryEvaluation => ({
    isComplete: true,
    evaluatorAuid: [[auid]],
    scores: [
        { code: "colour", value: "4" },
        { code: "total", value: total },
    ],
    comments: [],
    ...over,
})

function source(over: Partial<TastingSummarySource> = {}): TastingSummarySource & { calls: string[] } {
    const calls: string[] = []
    return {
        calls,
        replica: async () => replica,
        commission: async () => {
            calls.push("commission")
            return { name: "Final Round", propertyCommentsEnabled: true, voiceCommentsEnabled: false }
        },
        templates: async () => templates,
        myEvaluation: async (id) => (id === "rc1" ? evaluation(7, "91") : null),
        evaluations: async (id) => (id === "rc2" ? [evaluation(8, "70"), evaluation(7, "88")] : []),
        ...over,
    }
}

test("candidates are put in the order the commission's panels list them", () => {
    const ordered = replicaCandidatesInTastingOrder(replica)
    assert.deepEqual(
        ordered.map((entry) => entry.id),
        ["rc2", "rc1"],
    )
    assert.equal(ordered[0].replicaPanelId, "rp-1")
    assert.equal(ordered[0].candidate?.panelId, "p-1")
})

test("a summary holds the judge's own completed evaluations, in tasting order", async () => {
    const summary = await loadMyTastingSummary(source(), "replica-1", "7")

    assert.deepEqual(
        summary.entries.map((entry) => [entry.order, entry.code, entry.totalScores[0].value]),
        // rc2's own lookup came back empty; the judge's evaluation is found in its list.
        [
            [1, "C2", "88"],
            [2, "C1", "91"],
        ],
    )
    const [first] = summary.entries
    assert.equal(first.totalScores[0].name, "Total")
    assert.deepEqual(first.producerAuids, ["42"])
    // Batch attributes in the backend's Kotlin map form are read too.
    assert.equal(first.vintage, "2019")
    assert.equal(first.wineType, "WHITE")
    assert.equal(first.volume, "750 ml")
    assert.equal(summary.commissionName, "Final Round")
    assert.equal(summary.propertyCommentsEnabled, true)
})

test("an evaluation the judge has not completed stays out of the summary", async () => {
    const summary = await loadMyTastingSummary(
        source({ myEvaluation: async () => evaluation(7, "90", { isComplete: false }), evaluations: async () => [] }),
        "replica-1",
        "7",
    )
    assert.equal(summary.entries.length, 0)
})

test("without a signed-in judge only the direct lookup counts", async () => {
    const summary = await loadMyTastingSummary(source(), "replica-1", null)
    assert.deepEqual(
        summary.entries.map((entry) => entry.code),
        ["C1"],
    )
})

test("a commission the caller already has is not fetched again", async () => {
    const src = source()
    const summary = await loadMyTastingSummary(src, "replica-1", "7", { commission: { name: "Known", voiceCommentsEnabled: true } })
    assert.deepEqual(src.calls, [])
    assert.equal(summary.commissionName, "Known")
    assert.equal(summary.voiceCommentsEnabled, true)
})

test("a replica with no commission is an empty summary", async () => {
    const summary = await loadMyTastingSummary(source({ replica: async () => null }), "replica-1", "7")
    assert.deepEqual(summary.entries, [])
})

test("the download's sheets and file name", async () => {
    const summary = await loadMyTastingSummary(
        source({
            myEvaluation: async (id) =>
                evaluation(7, id === "rc1" ? "91" : "88", {
                    comments: [
                        { id: "g", text: "Lovely", propertyId: null, voiceUrl: "https://voice" },
                        { id: "p", text: "Pale", propertyId: "prop-colour" },
                        { id: "v", text: "", propertyId: null, voiceUrl: "https://voice-only" },
                    ],
                }),
        }),
        "replica-1",
        "7",
    )
    const points = tastingSummaryOrigins(summary.entries)
    assert.equal(points.length, 1)
    const lookUp = tastingSummaryOriginLookup([[points[0], { country: "Ukraine", regionDetail: "Zakarpattia", districtDetail: "Ukraine" }]])

    const sheets = tastingSummarySheets(summary, {
        producerName: (auids) => auids.map((id) => `@${id}`).join(", "),
        generalCommentLabel: "General",
        booleanLabels: { yesLabel: "Yes", noLabel: "No" },
        formatBeverageType: (type) => type.toLowerCase(),
        origin: (origin) => tastingSummaryOriginText(origin, lookUp),
    })

    assert.deepEqual(
        sheets.map((sheet) => sheet.name),
        ["Overview", "Detailed Scores", "Comments"],
    )
    const [overview, detail, comments] = sheets
    // One column per property, though the map holds each under its code and its id.
    assert.deepEqual(overview.rows[0].slice(-2), ["Producer", "Total"])
    assert.deepEqual(overview.rows[1], ["1", "C2", "Riesling c2", "wine", "white", "2019", "750 ml", "Ukraine, Zakarpattia", "@42", "88.00"])
    assert.deepEqual(detail.rows[0].slice(-3), ["Producer", "Colour", "Total"])
    // Property comments are allowed here; voice is not, so a voice-only comment is dropped and no URL written.
    assert.deepEqual(
        comments.rows.slice(1, 3).map((row) => row.slice(-3)),
        [
            ["General", "Lovely", ""],
            ["Colour", "Pale", ""],
        ],
    )
    assert.equal(comments.rows.length, 5)

    assert.equal(tastingSummaryCsv(sheets).split("\n")[1], "1,C2,Riesling c2,wine,white,2019,750 ml,\"Ukraine, Zakarpattia\",@42,88.00")
    assert.equal(tastingSummaryFilename("Final Round №2", "xlsx"), "Final-Round-2-results.xlsx")
    assert.equal(tastingSummaryFilename(undefined, "csv"), "expert-tasting-results.csv")
})

test("an origin nobody could place is written as its coordinates", () => {
    assert.equal(tastingSummaryOriginText({ latitude: 1, longitude: 2 }, () => null), "1, 2")
    assert.equal(tastingSummaryOriginText(null, () => null), "-")
})

// --- Template page ------------------------------------------------------------

const edition = (id: string, version: number, status = "ARCHIVED") => ({
    id,
    version,
    status,
    categories: [
        {
            id: `cat-${id}`,
            name: "Appearance",
            properties: [{ __typename: "DiscreteNumbersProperty", id: "p", code: "c", name: "Clarity", isRequired: true, discreteAllowedValues: [1, 2, 3] }],
        },
    ],
})

const templateRecord = { id: "t-1", name: "Still wine", status: "PUBLISHED", createdAt: "2026-01-02T00:00:00Z", owners: [[42]], beverageType: { id: "bt", code: "WINE", name: "Wine" } }

test("a template's editions come newest first, flattened", async () => {
    const detail = await loadTemplateDetail(async (query) => {
        assert.equal(query, GET_TEMPLATE_DETAIL)
        return {
            evaluationTemplate: templateRecord,
            evaluationTemplateEditionsByTemplate: { items: [edition("e1", 1), edition("e3", 3, "ACTIVE"), edition("e2", 2)] },
        }
    }, "t-1")

    assert.ok(detail)
    assert.deepEqual(
        detail.editions?.map((item) => item.version),
        [3, 2, 1],
    )
    assert.equal(detail.latestEdition?.id, "e3")
    assert.equal(detail.beverageType, "Wine")
    assert.deepEqual(detail.latestEdition?.categories[0].properties[0], {
        id: "p",
        code: "c",
        name: "Clarity",
        description: undefined,
        type: "Discrete",
        isRequired: true,
        isResult: false,
        minLimit: undefined,
        maxLimit: undefined,
        allowedValues: [1, 2, 3],
        defaultValue: undefined,
    })
    assert.equal(templateEditionAt(detail, 2)?.id, "e2")
    assert.equal(templateEditionAt(detail, 9)?.id, "e3")
    assert.equal(templateEditionAt(detail, undefined)?.id, "e3")
})

test("without the by-template query, the catalog of every edition stands in", async () => {
    const queries: string[] = []
    let fallbackError: unknown = null
    const detail = await loadTemplateDetail(
        async (query) => {
            queries.push(query)
            if (query === GET_TEMPLATE_DETAIL) throw new Error("Unknown field")
            return {
                evaluationTemplateEditions: {
                    items: [
                        { ...edition("e1", 1), template: templateRecord },
                        { ...edition("e2", 2), template: templateRecord },
                        { ...edition("x", 1), template: { ...templateRecord, id: "other" } },
                    ],
                },
            }
        },
        "t-1",
        (error) => (fallbackError = error),
    )
    assert.deepEqual(queries, [GET_TEMPLATE_DETAIL, GET_TEMPLATE_CATALOG])
    assert.ok(fallbackError instanceof Error)
    assert.deepEqual(
        detail?.editions?.map((item) => item.id),
        ["e2", "e1"],
    )
    assert.equal(detail?.name, "Still wine")
})

test("a template no route finds is null", async () => {
    const detail = await loadTemplateDetail(
        async (query) => (query === GET_TEMPLATE_DETAIL ? { evaluationTemplate: null } : { evaluationTemplateEditions: { items: [] } }),
        "t-1",
    )
    assert.equal(detail, null)
})

test("only an owner may edit a template", () => {
    assert.equal(isTemplateOwner([[42], [7]], "7"), true)
    assert.equal(isTemplateOwner([[42]], 7), false)
    assert.equal(isTemplateOwner([[42]], null), false)
    assert.equal(isTemplateOwner(null, "42"), false)
})

test("My Templates lists the owner's templates, counting the latest edition", () => {
    const catalog = toTemplateCatalog(
        [
            { ...edition("e1", 1), template: templateRecord },
            { ...edition("e2", 2), template: templateRecord, categories: [...edition("e2", 2).categories, ...edition("e2b", 2).categories] },
            { ...edition("x", 1), template: { ...templateRecord, id: "other", owners: [[7]] } },
        ],
        42,
    )
    assert.deepEqual(
        catalog.map((template) => [template.id, template.latestEdition.version, template.totalEditions]),
        [["t-1", 2, 2]],
    )
    assert.deepEqual(catalogTemplateCounts(catalog[0]), { categories: 2, properties: 2 })
    assert.deepEqual(catalogTemplateCounts(null), { categories: 0, properties: 0 })
})
