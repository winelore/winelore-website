/**
 * The home dashboard's other panels — competitions, beverages, templates — and
 * the live timing on commission cards. Web and native render these from the
 * same helpers, so a regression here shows up on both at once.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    beverageColorFromAttributes,
    beverageProducerLabels,
    beverageTypeCode,
    buildBeverageTypeCodeMap,
    commissionTimingTicks,
    dashboardUsernameAuids,
    formatCommissionTiming,
    isTemplateOwnedBy,
    selectLatestTemplateEditions,
    toDashboardCompetition,
    type RawTemplateEdition,
} from "../src/dashboard"
import { translate } from "../src/i18n"

const t = (key: any, params?: Record<string, string | number>) => translate("en", key, params)

test("a competition's nested holders are flattened", () => {
    const result = toDashboardCompetition(
        {
            id: "c1",
            name: "Open",
            status: "PLANNED",
            holders: [[7], [9]],
            plannedDates: { start: "2026-10-01T00:00:00Z", end: null },
            series: { id: "s1", name: "Autumn" },
        },
        7,
    )
    assert.deepEqual(result.holder, [7, 9])
    assert.equal(result.plannedStartAt, "2026-10-01T00:00:00Z")
    assert.equal(result.plannedEndAt, null)
    assert.equal(result.series.name, "Autumn")
})

test("a competition with no holders is attributed to the viewer", () => {
    // It came back from a holders-filtered query, so the viewer is one.
    const result = toDashboardCompetition({ id: "c1", name: "Open", status: "PLANNED", holders: null }, "7")
    assert.deepEqual(result.holder, [7])
})

test("beverage colour is read from every attribute shape the backend has sent", () => {
    assert.equal(beverageColorFromAttributes({ color: "RED" }), "RED")
    assert.equal(beverageColorFromAttributes('{"color":"WHITE"}'), "WHITE")
    assert.equal(beverageColorFromAttributes("{color=ROSE, sugar=DRY}"), "ROSE")
    assert.equal(beverageColorFromAttributes("{color='ORANGE'}"), "ORANGE")
    assert.equal(beverageColorFromAttributes('{"sugar":"DRY"}'), undefined)
    assert.equal(beverageColorFromAttributes(null), undefined)
})

test("a registered beverage type wins over the attribute colour", () => {
    const map = buildBeverageTypeCodeMap([
        { id: "t1", code: "SPARKLING", status: "PUBLISHED" },
        { id: "t2", code: "DRAFTED", status: "DRAFT" },
    ])
    assert.deepEqual(map, { t1: "SPARKLING" })
    assert.equal(beverageTypeCode({ typeId: "t1", type: "RED" }, map), "SPARKLING")
    // An unpublished or unknown type falls back to the colour.
    assert.equal(beverageTypeCode({ typeId: "t2", type: "RED" }, map), "RED")
    assert.equal(beverageTypeCode({ typeId: null, type: null }, map), null)
})

test("producer labels prefer names, dedupe, and fall back to ids", () => {
    const labels = beverageProducerLabels(
        [{ auid: [7, 9] }, { auid: [7] }, { producerId: "abcdef1234567890" }],
        { "7": "Anna" },
    )
    assert.deepEqual(labels, ["Anna", "@9", "Producer abcdef12"])
})

test("usernames are requested for holders and producers, once each", () => {
    const ids = dashboardUsernameAuids(
        [{ holder: [7, 9] }, { holder: [7] }],
        [{ producers: [{ auid: [9, 11] }, { producerId: "x" }] }],
    )
    assert.deepEqual(ids.sort(), ["11", "7", "9"])
})

test("each template appears once, at its latest edition", () => {
    const edition = (id: string, templateId: string, version: number): RawTemplateEdition => ({
        id,
        version,
        template: { id: templateId, name: `T ${templateId}`, owners: [[7]], beverageType: { code: "RED", name: "Red wine" } },
    })
    const result = selectLatestTemplateEditions([
        edition("e1", "a", 1),
        edition("e3", "a", 3),
        edition("e2", "a", 2),
        edition("e4", "b", 1),
        { id: "orphan", version: 9, template: null },
    ])
    assert.equal(result.length, 2)
    const a = result.find((template) => template.id === "a")!
    assert.equal(a.latestEdition.version, 3)
    assert.equal(a.latestEdition.id, "e3")
    // The web renders the type's display name, not its code.
    assert.equal(a.beverageType, "Red wine")
})

test("template ownership matches nested and string auids", () => {
    assert.equal(isTemplateOwnedBy({ owners: [[7, 8]] }, 7), true)
    // Native keeps the auid as a string; the web as a number. Both must match.
    assert.equal(isTemplateOwnedBy({ owners: [[7, 8]] }, "8"), true)
    assert.equal(isTemplateOwnedBy({ owners: [[7]] }, 9), false)
    assert.equal(isTemplateOwnedBy({ owners: null }, 7), false)
})

test("a running commission counts seconds for its first hour", () => {
    const startedAt = "2026-09-14T10:00:00Z"
    const now = Date.parse("2026-09-14T10:12:05Z")
    assert.equal(formatCommissionTiming({ status: "STARTED", startedAt }, t, now), "12m 5s")
    assert.equal(commissionTimingTicks("STARTED"), true)
})

test("after an hour the seconds drop off", () => {
    const now = Date.parse("2026-09-14T12:30:00Z")
    assert.equal(formatCommissionTiming({ status: "STARTED", startedAt: "2026-09-14T10:00:00Z" }, t, now), "2h 30m")
})

test("a finished commission reports how long it lasted", () => {
    const timing = formatCommissionTiming(
        { status: "COMPLETED", startedAt: "2026-09-12T09:00:00Z", endedAt: "2026-09-13T11:00:00Z" },
        t,
    )
    assert.equal(timing, "Lasted 1d 2h")
    assert.equal(commissionTimingTicks("COMPLETED"), false)
})

test("a commission that has not run has no timing", () => {
    assert.equal(formatCommissionTiming({ status: "PLANNED" }, t), "")
    assert.equal(formatCommissionTiming({ status: "STARTED", startedAt: null }, t), "")
})
