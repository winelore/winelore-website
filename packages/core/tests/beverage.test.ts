/**
 * The beverage page: loading, attributes, tabs, producers, batch figures and
 * award grouping. The web page and the Expo screen both render from these.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    GET_AWARD_COMMISSION,
    GET_BATCH_SAMPLES,
    GET_BEVERAGE_BATCHES,
    GET_BEVERAGE_PAGE,
    GET_BEVERAGE_PAGE_AWARDS,
    GET_BEVERAGE_TYPE_NAME,
    batchFigures,
    beverageColor,
    beverageStatusTone,
    beverageTabs,
    defaultBeverageTab,
    filterSamples,
    groupAwardsByCompetition,
    isBeverageProducer,
    loadBeveragePage,
    parseAttributes,
    producerName,
    producerRoleKey,
    technicalSpecs,
    type BeverageAward,
    type BeveragePageQuery,
} from "../src/beverage"

test("attributes read the same from an object, JSON and a Kotlin map string", () => {
    const expected = { color: "RED", vintage: "2021" }
    assert.deepEqual(parseAttributes({ color: "RED", vintage: 2021, empty: null }), expected)
    assert.deepEqual(parseAttributes('{"color":"RED","vintage":2021}'), expected)
    assert.deepEqual(parseAttributes("{color=RED, vintage=2021}"), expected)
    assert.deepEqual(parseAttributes("{}"), {})
    assert.deepEqual(parseAttributes("not a map"), {})
    assert.deepEqual(parseAttributes(null), {})
})

test("the colour comes out of attributes, or is null", () => {
    assert.equal(beverageColor({ color: "WHITE" }), "WHITE")
    assert.equal(beverageColor("{color=ROSE, sugar=dry}"), "ROSE")
    assert.equal(beverageColor({ sugar: "dry" }), null)
})

test("technical specs leave out the colour and space camel-case keys", () => {
    assert.deepEqual(technicalSpecs({ color: "RED", residualSugar: "2", grape: "Merlot" }), [
        { key: "residual Sugar", value: "2" },
        { key: "grape", value: "Merlot" },
    ])
    assert.deepEqual(technicalSpecs({ color: "RED" }), [])
})

test("specs lead the tabs when there are any and trail them otherwise", () => {
    assert.deepEqual(beverageTabs(2), ["specs", "batches", "awards"])
    assert.deepEqual(beverageTabs(0), ["batches", "awards", "specs"])
    assert.equal(defaultBeverageTab(2), "specs")
    assert.equal(defaultBeverageTab(0), "batches")
})

test("a producer is matched by auid or by producer id", () => {
    const producers = [
        { id: "p1", auid: [7], role: "MAKER" },
        { id: "p2", producerId: "42", role: "OWNER" },
    ]
    assert.equal(isBeverageProducer(producers, 7), true)
    assert.equal(isBeverageProducer(producers, "7"), true)
    assert.equal(isBeverageProducer(producers, 42), true)
    assert.equal(isBeverageProducer(producers, 8), false)
    assert.equal(isBeverageProducer(producers, null), false)
    assert.equal(isBeverageProducer(null, 7), false)
})

test("a producer badge falls back from name to username to id", () => {
    assert.equal(producerName({ displayName: "Olena", username: "olena", auid: [7] }, "?"), "Olena")
    assert.equal(producerName({ username: "olena", auid: [7] }, "?"), "@olena")
    assert.equal(producerName({ auid: [7] }, "?"), "@user-7")
    assert.equal(producerName({ producerId: "1234567890ab" }, "?"), "Winery 12345678")
    assert.equal(producerName({}, "Unknown User"), "Unknown User")
    assert.equal(producerRoleKey("maker"), "roles.maker")
    assert.equal(producerRoleKey("SOMMELIER"), null)
})

test("statuses take the web's colours", () => {
    assert.equal(beverageStatusTone("PUBLISHED"), "approved")
    assert.equal(beverageStatusTone("SUSPENDED"), "suspended")
    assert.equal(beverageStatusTone("DRAFT"), "pending")
    assert.equal(beverageStatusTone("ARCHIVED"), "neutral")
})

test("batch figures group samples by volume and measure the allocation", () => {
    const figures = batchFigures({
        attributes: { vintage: "2019", alcoholByVolume: "13.46" },
        volumeMl: 3000,
        samples: [
            { id: "s1", volumeMl: 750 },
            { id: "s2", volumeMl: 750 },
            { id: "s3", volumeMl: 1500 },
            { id: "s4", volumeMl: null },
        ],
    })
    assert.equal(figures.vintage, "2019")
    assert.equal(figures.abv, "13.5%")
    assert.deepEqual(figures.sampleGroups, [
        { count: 1, volumeMl: 1500 },
        { count: 2, volumeMl: 750 },
        { count: 1, volumeMl: null },
    ])
    assert.equal(figures.sampleVolume, 3000)
    assert.equal(figures.allocatedPercent, 100)
    assert.equal(figures.allocationTone, "high")

    const over = batchFigures({ attributes: { abv: "12" }, volumeMl: 500, samples: [{ id: "s", volumeMl: 750 }] })
    assert.equal(over.abv, "12%")
    assert.equal(over.allocatedPercent, 100)
    assert.equal(over.allocatedFraction, 1)
    assert.equal(over.allocationTone, "over")

    const open = batchFigures({ attributes: null, volumeMl: null, samples: [] })
    assert.equal(open.vintage, null)
    assert.equal(open.abv, null)
    assert.equal(open.allocatedPercent, null)
    assert.equal(open.allocationTone, null)
})

test("samples are searched by code, id and volume", () => {
    const samples = [
        { id: "aaaa-111111", volumeMl: 750 },
        { id: "bbbb-222222", volumeMl: 1500 },
    ]
    assert.deepEqual(filterSamples(samples, "  "), samples)
    assert.deepEqual(filterSamples(samples, "222"), [samples[1]])
    assert.deepEqual(filterSamples(samples, "AAAA"), [samples[0]])
    assert.deepEqual(filterSamples(samples, "750"), [samples[0]])
})

const award = (id: string, competitionId?: string): BeverageAward => ({
    id,
    commissionId: `m-${competitionId ?? "none"}`,
    candidateId: "c",
    assignedAt: "2026-01-01T00:00:00Z",
    award: { id: `a-${id}`, code: "GOLD", name: "Gold" },
    commission: competitionId
        ? { id: `m-${competitionId}`, name: "Panel", competition: { id: competitionId, name: competitionId, status: "COMPLETED" } }
        : null,
})

test("awards gather under their competition, in the order first seen", () => {
    const groups = groupAwardsByCompetition([award("1", "B"), award("2", "A"), award("3", "B"), award("4")])
    assert.deepEqual(
        groups.map((group) => [group.competition?.id, group.awards.map((a) => a.id)]),
        [
            ["B", ["1", "3"]],
            ["A", ["2"]],
            [undefined, ["4"]],
        ],
    )
})

test("the page loads the beverage, then its awards, batches and type name", async () => {
    const calls: string[] = []
    const query: BeveragePageQuery = async <T>(document: string, variables: Record<string, unknown>) => {
        const reply = (data: unknown) => data as T
        switch (document) {
            case GET_BEVERAGE_PAGE:
                calls.push("beverage")
                return reply({ beverage: { id: variables.id, name: "Saperavi", status: "DRAFT", typeId: "t1", createdAt: "" } })
            case GET_BEVERAGE_PAGE_AWARDS:
                return reply({ beverageAwards: [award("1", "X"), award("2", "X")].map((a) => ({ ...a, commission: undefined })) })
            case GET_AWARD_COMMISSION:
                calls.push(`commission ${variables.id}`)
                return reply({ commission: { id: variables.id, name: "Panel", competition: { id: "X", name: "X", status: "STARTED" } } })
            case GET_BEVERAGE_BATCHES:
                return reply({ batches: { items: [{ id: "b1" }, { id: "b2" }] } })
            case GET_BATCH_SAMPLES:
                if (variables.batchId === "b2") throw new Error("samples down")
                return reply({ samples: { items: [{ id: "s1", volumeMl: 750 }] } })
            case GET_BEVERAGE_TYPE_NAME:
                throw new Error("types down")
        }
        throw new Error("unexpected query")
    }
    const errors: string[] = []
    const page = await loadBeveragePage(query, "bev-1", (context) => errors.push(context))

    assert.ok(page)
    assert.equal(page.beverage.name, "Saperavi")
    assert.equal(page.typeName, "")
    // Two awards from one commission read it once.
    assert.deepEqual(calls, ["beverage", "commission m-X"])
    assert.equal(page.awards.length, 2)
    assert.equal(page.awards[1].commission?.competition.id, "X")
    assert.deepEqual(
        page.batches.map((batch) => [batch.id, batch.samples.length]),
        [
            ["b1", 1],
            ["b2", 0],
        ],
    )
    assert.deepEqual(errors.sort(), ["beverage type name", "samples for batch b2"])
})

test("a missing beverage is null, and a failed one throws", async () => {
    assert.equal(await loadBeveragePage(async <T>() => ({ beverage: null }) as T, "x"), null)
    await assert.rejects(
        loadBeveragePage(async () => {
            throw new Error("down")
        }, "x"),
        /down/,
    )
})
