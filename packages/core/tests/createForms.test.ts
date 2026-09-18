/**
 * The create forms — competition, beverage, batch, sample — shared by the
 * web's actions and the app's sheets.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    SampleExceedsBatchError,
    batchAllocation,
    beverageCreateErrorKey,
    beverageCreateInput,
    beverageTypeOptions,
    characteristicInputKind,
    characteristicsOf,
    createBeverage,
    createSample,
    formatCreateAttributes,
    isInvalidVolume,
    parsePropertySchemas,
    parseVolumeMl,
    volumePresetLabel,
    withoutUnknownAttributes,
} from "../src/beverage"
import {
    GET_COMPETITION_SERIES_LIST,
    applySchedulePreset,
    competitionCreateErrorKey,
    createCompetition,
    isScheduleInverted,
    ownedSeries,
    scheduleDuration,
} from "../src/competition"
import { nominatimSearchUrl, parseNominatimSearch, roundCoordinate } from "../src"

const t = (key: string, params?: Record<string, string | number>) => `${key}${params ? JSON.stringify(params) : ""}`

// --- Competition --------------------------------------------------------------

test("a competition is filed under the holder's own series, never someone else's", async () => {
    const calls: Array<{ query: string; variables: any }> = []
    const send = async (query: string, variables: any) => {
        calls.push({ query, variables })
        if (query === GET_COMPETITION_SERIES_LIST) {
            return { competitionSeriesList: { items: [{ id: "theirs", name: "A", owners: [[9]] }, { id: "mine", name: "B", owners: [[7]] }] } }
        }
        if (query.includes("createCompetition(")) return { createCompetition: { id: "c1" } }
        return { updateCompetitionDates: { id: "c1" } }
    }
    const start = new Date("2026-10-01T09:00:00Z")
    const id = await createCompetition(send, { name: "  Summer   Tasting ", seriesId: "", plannedStart: start, plannedEnd: null, holder: 7 })
    assert.equal(id, "c1")
    const created = calls.find((call) => call.query.includes("createCompetition("))!
    assert.deepEqual(created.variables.input, { name: "Summer Tasting", seriesId: "mine", holders: [[7]] })
    const dates = calls.find((call) => call.query.includes("updateCompetitionDates"))!
    assert.deepEqual(dates.variables.input, { start: "2026-10-01T09:00:00.000Z", end: null })
})

test("a holder with no series gets a General Series of their own", async () => {
    const calls: string[] = []
    const send = async (query: string) => {
        calls.push(query)
        if (query === GET_COMPETITION_SERIES_LIST) return { competitionSeriesList: { items: [] } }
        if (query.includes("createCompetitionSeries")) return { createCompetitionSeries: { id: "s1", name: "General Series" } }
        return { createCompetition: { id: "c2" } }
    }
    assert.equal(await createCompetition(send, { name: "X", seriesId: "", plannedStart: null, plannedEnd: null, holder: 3 }), "c2")
    // No dates, no dates mutation.
    assert.equal(calls.filter((query) => query.includes("updateCompetitionDates")).length, 0)
    assert.ok(calls.some((query) => query.includes("createCompetitionSeries")))
})

test("the series a user owns", () => {
    assert.deepEqual(ownedSeries([{ id: "a", name: "A", owners: [[1]] }, { id: "b", name: "B", owners: [[2], [1]] }, { id: "c", name: "C" }], 1), [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
    ])
})

test("schedule presets, inversion and duration", () => {
    const now = new Date(2026, 8, 15, 14, 37)
    const today = applySchedulePreset("today", now, null)
    assert.deepEqual([today.start.getHours(), today.start.getMinutes()], [15, 0])
    assert.equal(today.end.getTime() - today.start.getTime(), 8 * 3_600_000)
    const nextWeek = applySchedulePreset("nextWeek", now, new Date(2026, 11, 1))
    assert.deepEqual([nextWeek.start.getDate(), nextWeek.start.getHours()], [22, 9])
    // An end that already comes after the new start is kept.
    assert.equal(nextWeek.end.getMonth(), 11)
    assert.equal(isScheduleInverted(new Date(2), new Date(1)), true)
    assert.equal(isScheduleInverted(null, new Date(1)), false)
    assert.equal(scheduleDuration(new Date(0), new Date(26 * 3_600_000), t), 'time.duration{"days":1,"hours":2}')
    assert.equal(scheduleDuration(new Date(0), new Date(45 * 60_000), t), 'time.durationMinutes{"minutes":45}')
})

test("a failed competition create as a sentence", () => {
    assert.equal(competitionCreateErrorKey("Failed to fetch"), "competition.createErrorNetwork")
    assert.equal(competitionCreateErrorKey("Failed to convert argument value seriesId"), "competition.createErrorSeries")
    assert.equal(competitionCreateErrorKey("name must not be empty"), "competition.createErrorName")
    assert.equal(competitionCreateErrorKey("Unauthorized"), "competition.createErrorAuth")
    assert.equal(competitionCreateErrorKey(""), "competition.createErrorGeneric")
})

// --- Beverage ---------------------------------------------------------------

const SCHEMAS =
    "{BEVERAGE=[EnumPropertyResponse(id=p1, code=color, name=Colour, isRequired=true, allowedValues=[RED, WHITE, ROSE])], " +
    "BATCH=[IntPropertyResponse(id=p2, code=vintage, name=Vintage, isRequired=false, minLimit=1800, maxLimit=2100), DoublePropertyResponse(id=p3, code=alcoholByVolume, name=ABV, isRequired=false, minLimit=null, maxLimit=null)], " +
    "SAMPLE=[]}"

test("a type's schemas, from the backend's Kotlin toString()", () => {
    const parsed = parsePropertySchemas(SCHEMAS)
    assert.equal(parsed.BEVERAGE.length, 1)
    assert.equal(parsed.BATCH.length, 2)
    assert.deepEqual(parsed.SAMPLE, [])
    const [colour] = characteristicsOf([{ status: "DRAFT", propertySchemas: null }, { status: "ACTIVE", propertySchemas: SCHEMAS }], "BEVERAGE")
    assert.deepEqual(colour, {
        id: "p1",
        code: "color",
        name: "Colour",
        typeName: "EnumPropertyResponse",
        isRequired: true,
        allowedValues: ["RED", "WHITE", "ROSE"],
        minLimit: undefined,
        maxLimit: undefined,
    })
    const [vintage, abv] = characteristicsOf([{ status: "ACTIVE", propertySchemas: SCHEMAS }], "BATCH")
    assert.deepEqual([vintage.minLimit, vintage.maxLimit, abv.minLimit], [1800, 2100, undefined])
    assert.deepEqual([colour, vintage, abv].map(characteristicInputKind), ["choice", "integer", "decimal"])
})

test("beverage types are the published ones, wine first", () => {
    assert.deepEqual(
        beverageTypeOptions([
            { id: "1", code: "BEER", name: "Beer" },
            { id: "2", code: "CIDER", name: "Cider", status: "DRAFT" },
            { id: "3", code: "WINE", name: "Wine", status: "PUBLISHED" },
            { id: "4", code: "MEAD", name: "Mead" },
        ]).map((type) => type.code),
        ["WINE", "BEER", "MEAD"],
    )
})

test("a new beverage has the signed-in user as its producer", () => {
    const input = beverageCreateInput({ name: " Riesling ", typeId: "t", role: "BOTTLER", attributes: { color: "WHITE" }, origin: { latitude: 48.6, longitude: 22.3 } }, "42")
    assert.deepEqual(input, {
        name: "Riesling",
        typeId: "t",
        producers: [{ auid: [42], role: "BOTTLER" }],
        attributes: { color: "WHITE" },
        origin: { latitude: 48.6, longitude: 22.3 },
    })
    assert.deepEqual(beverageCreateInput({ name: "X", typeId: "t", role: "MAKER" }, "0b4b6f1e-6a3c-4c1f-9e27-8a1d2c3b4f5a").producers, [
        { producerId: "0b4b6f1e-6a3c-4c1f-9e27-8a1d2c3b4f5a", role: "MAKER" },
    ])
})

test("an attribute the backend refuses as unknown is dropped for one more try", async () => {
    assert.deepEqual(withoutUnknownAttributes({ attributes: { color: "RED" } }, "Unknown: color"), {})
    assert.equal(withoutUnknownAttributes({ attributes: { color: "RED" } }, "Something else"), null)

    const inputs: any[] = []
    const send = async (_query: string, variables: any) => {
        inputs.push(variables.input)
        if (inputs.length === 1) throw new Error("Unknown: color")
        return { createBeverage: { id: "b1" } }
    }
    assert.equal(await createBeverage(send, { name: "X", typeId: "t", role: "MAKER", attributes: { color: "RED", sweetness: "DRY" } }, "7"), "b1")
    assert.deepEqual(inputs[1].attributes, { sweetness: "DRY" })
    assert.equal(beverageCreateErrorKey("Invalid values: color"), "beverage.createErrorColor")
})

// --- Batch and sample ---------------------------------------------------------

test("attributes as the backend stores them", () => {
    assert.deepEqual(formatCreateAttributes({ vintage: "2019", alcoholByVolume: "13", sweet: "true", note: " dry ", empty: "" }, "batch"), {
        vintage: 2019,
        alcoholByVolume: 13.00001,
        sweet: true,
        note: "dry",
    })
    assert.deepEqual(formatCreateAttributes({ count: "12", ratio: "0.5" }, "sample"), { count: 12, ratio: 0.5 })
    assert.equal(parseVolumeMl("750"), 750)
    assert.equal(parseVolumeMl("-3"), undefined)
    assert.equal(isInvalidVolume("0"), true)
    assert.equal(isInvalidVolume(""), false)
    assert.equal(volumePresetLabel(1500, "en"), "1,500 ml")
    assert.equal(volumePresetLabel(500_000, "en"), "500 L")
})

test("a sample past what its batch has left is refused before it is sent", async () => {
    assert.deepEqual(batchAllocation(1000, [{ volumeMl: 750 }, { volumeMl: 100 }]), { usedVolumeMl: 850, remainingVolumeMl: 150, samplesCount: 2 })
    assert.deepEqual(batchAllocation(null, []), { usedVolumeMl: 0, remainingVolumeMl: null, samplesCount: 0 })

    const sent: string[] = []
    const send = async (query: string) => {
        sent.push(query)
        return query.includes("GetBatchDetailAndSamples") ? { batch: { volumeMl: 1000 }, samples: { items: [{ volumeMl: 900 }] } } : { createSample: { id: "s1" } }
    }
    await assert.rejects(createSample(send, { batchId: "b", volumeMl: "750" }), (error: unknown) => {
        assert.ok(error instanceof SampleExceedsBatchError)
        assert.deepEqual([error.volumeMl, error.remainingMl, error.batchVolumeMl], [750, 100, 1000])
        return true
    })
    assert.equal(sent.length, 1)
    assert.equal(await createSample(send, { batchId: "b", volumeMl: "100" }), "s1")
})

test("the origin picker's search and rounding", () => {
    assert.equal(nominatimSearchUrl("Tokaj, HU"), "https://nominatim.openstreetmap.org/search?format=json&q=Tokaj%2C%20HU&limit=1")
    assert.deepEqual(parseNominatimSearch([{ lat: "48.1234567", lon: "21.4", display_name: "Tokaj" }]), { latitude: 48.123457, longitude: 21.4, name: "Tokaj" })
    assert.equal(parseNominatimSearch([]), null)
    assert.equal(roundCoordinate(1.23456789), 1.234568)
})
