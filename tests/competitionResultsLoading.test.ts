import assert from "node:assert/strict"
import { test, type TestContext } from "node:test"
import { createElement, act } from "react"
import { create, type ReactTestRenderer } from "react-test-renderer"
import { useCompetitionResultsData } from "../hooks/useCompetitionResultsData"
import { toCompetitionPage } from "../packages/core/src/competition/page"
import type { CompetitionExportContext } from "../packages/core/src/results"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const competition = toCompetitionPage({ id: "cup", name: "Cup", status: "STARTED" }, [
    { id: "commission", name: "Commission", status: "STARTED" },
])
const context: CompetitionExportContext = {
    competitionName: "Cup", overviewRows: [], commissionSummaryRows: [],
    expertScoreRows: [], commentRows: [], awardRows: [], outcomePropertyCodes: [],
    outcomePropertyNames: {}, propertyMap: {},
}

function deferred() {
    let resolve!: (value: CompetitionExportContext) => void
    let reject!: (error: Error) => void
    const promise = new Promise<CompetitionExportContext>((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
}

async function mount(t: TestContext) {
    const requests: ReturnType<typeof deferred>[] = []
    const errors: unknown[] = []
    const fetchResults = () => {
        const request = deferred()
        requests.push(request)
        return request.promise
    }
    let current!: ReturnType<typeof useCompetitionResultsData>
    function Harness({ data = competition, locale = "en" }: {
        data?: typeof competition
        locale?: "en" | "uk"
    }) {
        // This callback also changes identity on every render.
        current = useCompetitionResultsData(data, locale, fetchResults, (error) => errors.push(error))
        return null
    }
    let renderer!: ReactTestRenderer
    await act(async () => { renderer = create(createElement(Harness)) })
    t.after(async () => { await act(async () => { renderer.unmount() }) })
    return {
        requests, errors,
        get current() { return current },
        update: async (data = competition, locale: "en" | "uk" = "en") => {
            await act(async () => { renderer.update(createElement(Harness, { data, locale })) })
        },
    }
}

test("equivalent server props do not reload results or reset the loading state", async (t) => {
    const view = await mount(t)
    assert.equal(view.current.isLoadingData, true)
    await act(async () => { view.requests[0].resolve(context) })
    const refreshedAt = view.current.lastRefreshedAt
    for (let i = 0; i < 3; i++) {
        await view.update(structuredClone(competition))
        assert.equal(view.current.isLoadingData, false)
        assert.equal(view.current.allResultsContext, context)
    }
    assert.equal(view.requests.length, 1)
    assert.equal(view.current.lastRefreshedAt, refreshedAt)
})

test("initial load and consecutive live updates share one in-flight request", async (t) => {
    const view = await mount(t)
    await act(async () => { void view.current.refresh(); void view.current.refresh() })
    assert.equal(view.requests.length, 1)
    await act(async () => { view.requests[0].resolve(context) })
    await act(async () => { void view.current.refresh(); void view.current.refresh() })
    assert.equal(view.requests.length, 2)
    assert.equal(view.current.isLoadingData, false)
    assert.equal(view.current.allResultsContext, context)
    const updated = { ...context, competitionName: "Updated Cup" }
    await act(async () => { view.requests[1].resolve(updated) })
    assert.equal(view.current.allResultsContext, updated)
})

test("metadata and locale changes refresh in place, and failed polls retain results", async (t) => {
    t.mock.method(console, "error", () => {})
    const view = await mount(t)
    await act(async () => { view.requests[0].resolve(context) })
    const completed = structuredClone(competition)
    completed.commissions[0].status = "COMPLETED"
    await view.update(completed, "uk")
    assert.equal(view.requests.length, 2)
    assert.equal(view.current.isLoadingData, false)
    assert.equal(view.current.allResultsContext, context)
    await act(async () => { view.requests[1].resolve(context) })
    await act(async () => { void view.current.refresh() })
    await act(async () => { view.requests[2].reject(new Error("Offline")) })
    assert.equal(view.current.allResultsContext, context)
    assert.equal(view.current.isLoadingData, false)
    assert.deepEqual(view.errors, [])
    await act(async () => { void view.current.refresh() })
    assert.equal(view.requests.length, 4, "the request guard is released after failure")
    await act(async () => { view.requests[3].resolve(context) })
})

test("a late response from the previous competition cannot finish the current load", async (t) => {
    const view = await mount(t)
    await view.update({ ...competition, id: "other-cup", name: "Other Cup" })
    assert.equal(view.requests.length, 2)
    await act(async () => { view.requests[0].resolve(context) })
    assert.equal(view.current.allResultsContext, null)
    assert.equal(view.current.isLoadingData, true)
    const otherContext = { ...context, competitionName: "Other Cup" }
    await act(async () => { view.requests[1].resolve(otherContext) })
    assert.equal(view.current.allResultsContext, otherContext)
    assert.equal(view.current.isLoadingData, false)
})

test("changing visible commission IDs clears the previous scope", async (t) => {
    const view = await mount(t)
    await act(async () => { view.requests[0].resolve(context) })
    await view.update({ ...competition, commissions: [] })
    assert.equal(view.current.allResultsContext, null)
    assert.equal(view.current.isLoadingData, true)
    await act(async () => { view.requests[1].resolve(context) })
    assert.equal(view.current.isLoadingData, false)
})
