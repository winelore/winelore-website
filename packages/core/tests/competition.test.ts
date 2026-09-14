/**
 * The competition page: its data shape, timing lines, steps and editing
 * inputs. The web page and the Expo screen both render from these.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    competitionStepIndex,
    createCommissionInput,
    defaultCommissionName,
    formatCompetitionPageTiming,
    formatCompetitionSessionTiming,
    googleCalendarUrl,
    holderAvatarIndex,
    holderInitials,
    isCompetitionHolder,
    quickCommission,
    toCompetitionPage,
} from "../src/competition"
import { translate } from "../src/i18n"

const t = (key: any, params?: Record<string, string | number>) => translate("en", key, params)

const raw = {
    id: "c1",
    name: "Autumn Open",
    status: "PLANNED",
    startedAt: null,
    endedAt: null,
    plannedDates: { start: "2026-10-01T09:00:00Z", end: null },
    holders: [[7], [9]],
    series: { id: "s1", name: "Autumn", status: "ACTIVE" },
}

test("the page flattens holders and planned dates", () => {
    const page = toCompetitionPage(raw, [
        { id: "m1", name: "Commission 1", status: "PLANNED", plannedDates: { start: "2026-10-01T10:00:00Z" } },
    ])
    assert.deepEqual(page.holders, [7, 9])
    assert.equal(page.plannedStartAt, "2026-10-01T09:00:00Z")
    assert.equal(page.plannedEndAt, null)
    assert.equal(page.commissions[0].plannedStartAt, "2026-10-01T10:00:00Z")
    // Unset toggles read as off rather than undefined.
    assert.equal(page.commissions[0].propertyCommentsEnabled, false)
})

test("holders match by value, whether the auid comes as a number or a string", () => {
    assert.equal(isCompetitionHolder([7, 9], "9"), true)
    assert.equal(isCompetitionHolder([7, 9], 9), true)
    assert.equal(isCompetitionHolder([7, 9], 8), false)
    assert.equal(isCompetitionHolder([7, 9], null), false)
})

test("a running competition shows a stopwatch", () => {
    const startedAt = "2026-09-14T10:00:00Z"
    const at = (ms: number) => new Date(startedAt).getTime() + ms
    const input = { status: "STARTED", startedAt, endedAt: null, plannedStartAt: null }
    assert.equal(formatCompetitionPageTiming(input, t, "en", at(125_000)), "2m 5s")
    assert.equal(formatCompetitionPageTiming(input, t, "en", at(3_725_000)), "1h 2m 5s")
})

test("a running session reads in words, with seconds", () => {
    const startedAt = "2026-09-14T10:00:00Z"
    const input = { status: "STARTED", startedAt, endedAt: null, plannedStartAt: null }
    const now = new Date(startedAt).getTime() + 3_725_000
    assert.equal(
        formatCompetitionSessionTiming(input, t, "en", now),
        `${t("time.durationHoursMinutes", { hours: 1, minutes: 2 })} 5s`,
    )
})

test("a finished competition says how long it lasted, in total hours", () => {
    const input = {
        status: "COMPLETED",
        startedAt: "2026-09-10T10:00:00Z",
        endedAt: "2026-09-11T12:30:00Z",
        plannedStartAt: null,
    }
    const expected = t("time.lasted", { time: t("time.durationHoursMinutes", { hours: 26, minutes: 30 }) })
    assert.equal(formatCompetitionPageTiming(input, t, "en"), expected)
    assert.equal(formatCompetitionSessionTiming(input, t, "en"), expected)
})

test("a planned competition says when, and anything else says nothing", () => {
    const planned = { status: "PLANNED", startedAt: null, endedAt: null, plannedStartAt: "2026-10-01T09:00:00Z" }
    assert.match(formatCompetitionPageTiming(planned, t, "en"), /Oct/)
    assert.equal(formatCompetitionPageTiming({ ...planned, status: "DRAFT" }, t, "en"), "")
})

test("the steps follow the status", () => {
    assert.equal(competitionStepIndex("DRAFT"), 0)
    assert.equal(competitionStepIndex("PLANNED"), 0)
    assert.equal(competitionStepIndex("STARTED"), 1)
    assert.equal(competitionStepIndex("COMPLETED"), 2)
})

test("the calendar link carries the window, two hours when no end is planned", () => {
    const url = googleCalendarUrl("Autumn Open", "Details", "2026-10-01T09:00:00Z", null)
    assert.match(url, /text=Autumn%20Open/)
    assert.match(url, /dates=20261001T090000Z\/20261001T110000Z/)
})

test("holder avatars are stable per person, with initials from the name", () => {
    assert.equal(holderAvatarIndex(9), holderAvatarIndex(17))
    assert.equal(holderInitials("like pro", 7), "LI")
    assert.equal(holderInitials("@alice", 7), "AL")
    assert.equal(holderInitials(undefined, 1234), "34")
})

test("a quick commission takes the next name and the competition's window", () => {
    const page = toCompetitionPage(raw, [{ id: "m1", name: "Commission 1", status: "PLANNED" }])
    const draft = quickCommission(page, "  ")
    assert.equal(draft.name, defaultCommissionName(1))
    assert.equal(draft.name, "Commission 2")
    assert.equal(draft.propertyCommentsEnabled, true)

    const input = createCommissionInput(draft)
    assert.deepEqual(input.plannedDates, { start: "2026-10-01T09:00:00.000Z", end: null })
    assert.equal(createCommissionInput({ competitionId: "c1", name: "X" }).plannedDates, null)
})
