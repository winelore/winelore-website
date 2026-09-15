/**
 * A commission's panels and templates, shared by the web and the app.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    addCommissionCandidate,
    catalogTypeChips,
    describeCandidate,
    filterCatalog,
    loadBeveragePage,
    moveCandidate,
    normalizeTemplateCategories,
    panelEntries,
    panelsProgress,
    searchPanelEntries,
    templateCoverage,
    templatePropertyConstraints,
    toTemplateCatalog,
    type PanelCandidate,
} from "../src/commission"

const wine = { id: "bt-wine", code: "WINE", name: "Wine" }

const candidate = (id: string, over: Partial<PanelCandidate> = {}): PanelCandidate => ({
    id,
    anonymizedCode: null,
    beverageType: wine,
    sample: {
        id: `s-${id}`,
        volumeMl: 750,
        batch: {
            id: `b-${id}`,
            lotNumber: `LOT-${id}`,
            attributes: "{vintage=2019}",
            beverage: { id: `bev-${id}`, name: `Riesling ${id}`, producers: [{ auid: [[42]] as never }] },
        },
    },
    ...over,
})

const format = (code: string) => (code === "WINE" ? "Вино" : code)

test("a candidate is blind unless the reader holds the competition or it has ended", () => {
    const blind = describeCandidate(candidate("1", { anonymizedCode: " A1 " }), { showRealBeverage: false, formatBeverageType: format })
    assert.equal(blind.beverageName, null)
    assert.equal(blind.producerName, null)
    assert.equal(blind.code, "A1")
    assert.equal(blind.vintage, "2019", "Kotlin map attributes are read")
    assert.equal(blind.lotNo, "LOT-1")
    assert.equal(blind.typeLabel, "Вино")
    const open = describeCandidate(candidate("1"), { showRealBeverage: true, names: { "42": "Château" }, formatBeverageType: format })
    assert.equal(open.beverageName, "Riesling 1")
    assert.equal(open.producerName, "Château")
})

test("an untranslated beverage type shows its own name", () => {
    const d = describeCandidate(candidate("1", { beverageType: { id: "x", code: "MEAD", name: "Mead" } }), {
        showRealBeverage: false,
        formatBeverageType: format,
    })
    assert.equal(d.typeLabel, "Mead")
})

const panels = [
    { id: "p1", name: "Whites", candidates: [candidate("1"), candidate("2"), candidate("3")] },
    { id: "p2", name: "Reds", candidates: [candidate("4", { anonymizedCode: "R-9" })] },
]

test("a pending reorder shows at once", () => {
    const entries = panelEntries(panels, { panelId: "p1", ids: ["3", "1", "2"] })
    assert.deepEqual(entries[0].items.map((c) => c.id), ["3", "1", "2"])
    assert.deepEqual(entries[1].items.map((c) => c.id), ["4"])
})

test("search keeps a matching panel whole, else only matching samples", () => {
    const describe = (c: PanelCandidate) => describeCandidate(c, { showRealBeverage: false, formatBeverageType: format })
    const entries = panelEntries(panels)
    assert.deepEqual(searchPanelEntries(entries, "whites", describe).map((e) => e.items.length), [3])
    assert.deepEqual(searchPanelEntries(entries, "r-9", describe).map((e) => e.panel.id), ["p2"])
    assert.deepEqual(searchPanelEntries(entries, "lot-2", describe)[0].items.map((c) => c.id), ["2"])
    assert.equal(searchPanelEntries(entries, "nothing", describe).length, 0)
    assert.equal(searchPanelEntries(entries, "  ", describe).length, 2)
})

test("moving a candidate returns the new order, or null when nothing moves", () => {
    const items = panels[0].candidates!
    assert.deepEqual(moveCandidate(items, 0, 2), ["2", "3", "1"])
    assert.deepEqual(moveCandidate(items, 2, 1), ["1", "3", "2"])
    assert.equal(moveCandidate(items, 1, 1), null)
    assert.equal(moveCandidate(items, 0, -1), null)
    assert.equal(moveCandidate(items, 2, 3), null)
})

test("progress: the current sample, what is done, per panel and overall", () => {
    const progress = panelsProgress({
        name: "Standard",
        status: "STARTED",
        currentPanelId: "rp1",
        replicaPanels: [
            {
                id: "rp1",
                currentCandidateId: "rc2",
                panel: { id: "p1" },
                replicaCandidates: [
                    { id: "rc1", status: "EVALUATED", candidate: { id: "1" } },
                    { id: "rc2", status: "PENDING", candidate: { id: "2" } },
                    { id: "rc3", status: "DISQUALIFIED", candidate: { id: "3" } },
                ],
            },
            { id: "rp2", panel: { id: "p2" }, replicaCandidates: [{ id: "rc4", status: "POSTPONED", candidate: { id: "4" } }] },
        ],
    })
    assert.equal(progress.show, true)
    assert.equal(progress.live, true)
    assert.equal(progress.finished, 2)
    assert.equal(progress.total, 4)
    const first = progress.byPanel.get("p1")!
    assert.equal(first.isCurrent, true)
    assert.deepEqual(Object.fromEntries(first.stateByCandidateId), { "1": "EVALUATED", "2": "CURRENT", "3": "DISQUALIFIED" })
    assert.equal(progress.byPanel.get("p2")!.isCurrent, false)
})

test("no progress before the replica starts", () => {
    assert.equal(panelsProgress({ name: "R", status: "PLANNED", replicaPanels: [] }).show, false)
    assert.equal(panelsProgress(null).total, 0)
})

// --- Adding a candidate -----------------------------------------------------

test("adding a sample to a draft binds a template for a new beverage type", async () => {
    const sent: string[] = []
    const send = async (query: string, variables?: Record<string, unknown>): Promise<any> => {
        const name = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? "?"
        sent.push(name)
        if (name === "AddCommissionCandidate") {
            assert.deepEqual(variables, { input: { panelId: "p1", sampleId: "s1", anonymizedCode: "A7" } })
            return { addCommissionCandidate: { id: "c1", panel: { id: "p1" }, sample: { batch: { beverage: { id: "bev" } } } } }
        }
        if (name === "CheckCommissionTemplates") return { commission: { status: "DRAFT", templateEditions: [{ beverageType: { id: "bt-other" } }] } }
        if (name === "GetBeverageType") return { beverage: { type: { id: "bt-wine" } } }
        if (name === "DevGetEvaluationTemplateEditions")
            return {
                evaluationTemplateEditions: {
                    items: [
                        { id: "any", status: "PUBLISHED", categories: [{}], template: { beverageType: { id: "bt-other" } } },
                        { id: "wine", status: "PUBLISHED", categories: [{}], template: { beverageType: { id: "bt-wine" } } },
                    ],
                },
            }
        if (name === "DevSetCommissionTemplateEdition") {
            assert.deepEqual(variables, { id: "comm", beverageTypeId: "bt-wine", templateEditionId: "wine" })
        }
        return {}
    }
    const added = await addCommissionCandidate(send, { commissionId: "comm", panelId: "p1", sampleId: "s1", anonymizedCode: " A7 " })
    assert.deepEqual(added, { id: "c1", panelId: "p1" })
    assert.ok(sent.includes("DevSetCommissionTemplateEdition"))
})

test("a failed template bind does not undo the add", async () => {
    const send = async (query: string): Promise<any> => {
        if (query.includes("AddCommissionCandidate(")) return { addCommissionCandidate: { id: "c1", panel: { id: "p1" }, sample: { batch: { beverage: { id: "b" } } } } }
        throw new Error("down")
    }
    const warnings: string[] = []
    const added = await addCommissionCandidate(send, { commissionId: "c", panelId: "p1", sampleId: "s1" }, (context) => warnings.push(context))
    assert.equal(added.id, "c1")
    assert.equal(warnings.length, 1)
})

test("a beverage search pages on while it fills pages; a listing uses the total", async () => {
    const search = await loadBeveragePage(async () => ({ search: { items: [{ id: "1", name: "A" }, { id: "2", name: "B" }] } }), "ries", 1, 2)
    assert.deepEqual([search.hasMore, search.totalPages], [true, 2])
    const listing = await loadBeveragePage(async () => ({ beverages: { items: [{ id: "1", name: "A" }] }, beverageCount: 5 }), "", 2, 2)
    assert.deepEqual([listing.hasMore, listing.totalPages], [true, 3])
})

// --- Templates --------------------------------------------------------------

const catalogItems = [
    { id: "e1", version: 1, status: "ACTIVE", template: { id: "t1", name: "Wine OIV", owners: [[1]], beverageType: wine }, categories: [] },
    {
        id: "e2",
        version: 2,
        status: "ACTIVE",
        template: { id: "t1", name: "Wine OIV", owners: [[1]], beverageType: wine },
        categories: [
            {
                id: "cat",
                name: "Aroma",
                properties: [{ __typename: "IntProperty", id: "p", code: "a", name: "Intensity", isRequired: true, intMinLimit: 0, intMaxLimit: 10 }],
            },
        ],
    },
    { id: "e3", version: 1, status: "ACTIVE", template: { id: "t2", name: "Beer", owners: [[7]], beverageType: { id: "bt-beer", code: "BEER", name: "Beer" } }, categories: [] },
]

test("the catalog keeps each template's latest edition, flattened", () => {
    const catalog = toTemplateCatalog(catalogItems)
    const oiv = catalog.find((template) => template.id === "t1")!
    assert.equal(oiv.latestEdition.id, "e2")
    assert.equal(oiv.totalEditions, 2)
    assert.deepEqual(oiv.latestEdition.categories[0].properties[0], {
        id: "p",
        code: "a",
        name: "Intensity",
        description: undefined,
        type: "Int",
        isRequired: true,
        isResult: false,
        minLimit: 0,
        maxLimit: 10,
        allowedValues: undefined,
        defaultValue: undefined,
    })
    assert.deepEqual(toTemplateCatalog(catalogItems, 7).map((template) => template.id), ["t2"])
})

test("the commission's types lead the type chips and the filtered catalog", () => {
    const catalog = toTemplateCatalog(catalogItems)
    const ids = new Set(["bt-beer"])
    assert.deepEqual(catalogTypeChips(catalog, ids).map((chip) => chip.id), ["bt-beer", "bt-wine"])
    assert.deepEqual(filterCatalog(catalog, "all", "", ids, String).map((template) => template.id), ["t2", "t1"])
    assert.deepEqual(filterCatalog(catalog, "bt-wine", "", ids, String).map((template) => template.id), ["t1"])
    assert.deepEqual(filterCatalog(catalog, "all", "anna", ids, (auid) => (auid === 7 ? "Anna" : "Bob")).map((t) => t.id), ["t2"])
})

test("coverage counts the types that have a template", () => {
    const beer = { id: "bt-beer", code: "BEER", name: "Beer" }
    const coverage = templateCoverage([wine, beer], [{ id: "l", beverageType: wine, templateEdition: { id: "e" } }])
    assert.deepEqual(coverage.types.map((type) => type.code), ["BEER", "WINE"])
    assert.equal(coverage.assignedCount, 1)
    assert.equal(coverage.fullyConfigured, false)
    assert.equal(templateCoverage([], []).fullyConfigured, false)
})

test("a commission edition's categories read like the catalog's", () => {
    const [category] = normalizeTemplateCategories([
        { id: "c", name: "Taste", properties: [{ __typename: "DiscreteNumbersProperty", id: "p", name: "Body", discreteAllowedValues: [1, 3, 5], discreteDefaultValue: 3 }] },
    ])
    assert.equal(category.properties[0].type, "Discrete")
    const t = (key: string, params?: Record<string, string | number>) => `${key}:${JSON.stringify(params ?? {})}`
    assert.deepEqual(templatePropertyConstraints(category.properties[0], t), [
        'commission.propertyOptions:{"values":"1, 3, 5"}',
        'commission.propertyDefault:{"value":"3"}',
    ])
})
