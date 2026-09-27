/**
 * The commission page, shared by the web and the app: its data, which
 * replica a user sees, what they may do, and the start sequence.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    NO_CANDIDATES_TO_START,
    commissionBeverageTypes,
    commissionPageView,
    currentCandidateCode,
    defaultCommissionReplica,
    formatCommissionTiming,
    memberInitials,
    replicasForSelector,
    sortMembersByRole,
    startCommissionReplica,
    toCommissionPage,
} from "../src/commission"

const wine = { id: "bt-wine", code: "WINE", name: "Wine" }
const spirit = { id: "bt-spirit", code: "SPIRIT", name: "Spirit" }

function rawCommission(over: Record<string, unknown> = {}) {
    return {
        id: "comm",
        name: "Reds",
        status: "DRAFT",
        plannedDates: { start: "2026-09-20T10:00:00Z", end: null },
        competition: { id: "comp", name: "Spring Cup", holders: [[1]] },
        panels: [
            {
                id: "p1",
                name: "Panel 1",
                candidates: [
                    { id: "c2", anonymizedCode: "B", beverageType: wine, sample: { batch: { beverage: { producers: [{ auid: [42] }] } } } },
                    { id: "c1", anonymizedCode: "A", beverageType: spirit },
                ],
            },
        ],
        replicas: [
            {
                id: "trainee",
                name: "Trainees",
                type: "TRAINEE",
                status: "DRAFT",
                members: [
                    { id: "m3", auid: [[9]], role: "TRAINEE_EXPERT", isReady: false },
                ],
                replicaPanels: [],
            },
            {
                id: "std",
                name: null,
                type: "STANDARD",
                status: "STARTED",
                currentPanelId: "rp1",
                members: [
                    { id: "m2", auid: [[7]], role: "EXPERT", isReady: true },
                    { id: "m1", auid: [[8]], role: "HEAD", isReady: false },
                ],
                replicaPanels: [
                    {
                        id: "rp1",
                        status: "STARTED",
                        currentCandidateId: "rc1",
                        chaoticCurrentCandidateChangesEnabled: true,
                        panel: { id: "p1", name: "Panel 1" },
                        replicaCandidates: [
                            { id: "rc1", status: "PENDING", candidate: { id: "c1", anonymizedCode: "A" } },
                            { id: "rc2", status: "PENDING", candidate: { id: "c2", anonymizedCode: "  " } },
                        ],
                    },
                ],
            },
        ],
        ...over,
    }
}

const page = () => toCommissionPage(rawCommission(), [{ id: "l1", beverageType: wine, templateEdition: { id: "te" } }])

test("the page flattens auids and holders, and names an unnamed replica", () => {
    const data = page()
    assert.deepEqual(data.competition.holders, [1])
    assert.deepEqual(data.replicas[1].members.map((m) => m.auid), [[7], [8]])
    assert.equal(data.replicas[1].name, "STANDARD Replica")
    assert.equal(data.candidateCount, 2)
    assert.equal(data.replicas[1].currentCandidateId, "rc1")
})

test("replica candidates follow the panels' order", () => {
    assert.deepEqual(page().replicas[1].replicaCandidates.map((c) => c.candidate?.id), ["c2", "c1"])
})

test("the page opens on the user's replica, else the standard one", () => {
    const { replicas } = page()
    assert.equal(defaultCommissionReplica(replicas, "9")?.id, "trainee")
    assert.equal(defaultCommissionReplica(replicas, "99")?.id, "std")
    assert.equal(defaultCommissionReplica(replicas, null)?.id, "std")
})

test("the selector lists fewest members first; members list the chair first", () => {
    assert.deepEqual(replicasForSelector(page().replicas).map((r) => r.id), ["trainee", "std"])
    assert.deepEqual(sortMembersByRole(page().replicas[1].members).map((m) => m.role), ["HEAD", "EXPERT"])
})

test("beverage types come from templates and candidates, once each", () => {
    assert.deepEqual(commissionBeverageTypes(page()).map((t) => t.code).sort(), ["SPIRIT", "WINE"])
})

test("a holder's view of a draft", () => {
    const view = commissionPageView(page(), null, "1")
    assert.equal(view.isHolder, true)
    assert.equal(view.isDraft, true)
    assert.equal(view.role, null)
    assert.equal(view.replica?.id, "std")
    assert.equal(view.readyCount, 1)
    assert.equal(view.showResultsBanner, true)
    assert.equal(view.activePanel?.id, "rp1")
})

test("a chair's view names their role and member id", () => {
    const view = commissionPageView(page(), "std", "8")
    assert.equal(view.role, "HEAD")
    assert.equal(view.memberId, "m1")
    assert.equal(view.isReplicaMember, true)
    assert.equal(view.isHolder, false)
    assert.equal(view.showResultsBanner, false)
})

test("a judge whose replica finished gets the results banner and their summary", () => {
    const data = toCommissionPage(
        rawCommission({
            replicas: [{ id: "done", name: "R", type: "STANDARD", status: "COMPLETED", members: [{ id: "m", auid: [[7]], role: "EXPERT", isReady: true }], replicaPanels: [] }],
        }),
        [],
    )
    const view = commissionPageView(data, null, "7")
    assert.equal(view.showResultsBanner, true)
    assert.equal(view.summaryReplica?.id, "done")
})

test("the current candidate is named by its code, else its place", () => {
    const replica = page().replicas[1]
    assert.equal(currentCandidateCode({ ...replica, currentCandidateId: "rc1" }, "N/A"), "A")
    assert.equal(currentCandidateCode({ ...replica, currentCandidateId: "rc2" }, "N/A"), "#1")
    assert.equal(currentCandidateCode({ ...replica, currentCandidateId: "nope" }, "N/A"), "N/A")
})

test("initials come from the name, else the end of the id", () => {
    assert.equal(memberInitials("@likespro", 1), "LI")
    assert.equal(memberInitials("Anna", 1), "AN")
    assert.equal(memberInitials(undefined, 1234), "34")
    assert.equal(memberInitials(undefined, 0), "?")
})

test("the timer: a clock while running, a duration once done, a countdown before", () => {
    const t = (key: string, params?: Record<string, string | number>) => `${key}:${JSON.stringify(params ?? {})}`
    const start = "2026-09-15T10:00:00Z"
    const at = (iso: string) => new Date(iso).getTime()
    assert.equal(formatCommissionTiming({ status: "STARTED", startedAt: start, endedAt: null, plannedStartAt: null }, t, at("2026-09-15T10:05:07Z")), "05:07")
    assert.equal(formatCommissionTiming({ status: "STARTED", startedAt: start, endedAt: null, plannedStartAt: null }, t, at("2026-09-15T11:05:07Z")), "01:05:07")
    assert.equal(
        formatCommissionTiming({ status: "COMPLETED", startedAt: start, endedAt: "2026-09-15T10:45:00Z", plannedStartAt: null }, t),
        'time.durationMinutes:{"minutes":45}',
    )
    assert.equal(
        formatCommissionTiming({ status: "PLANNED", startedAt: null, endedAt: null, plannedStartAt: "2026-09-17T12:00:00Z" }, t, at("2026-09-15T10:00:00Z")),
        'time.inDaysHours:{"days":2,"hours":2}',
    )
    assert.equal(formatCommissionTiming({ status: "PLANNED", startedAt: null, endedAt: null, plannedStartAt: start }, t, at("2026-09-16T00:00:00Z")), 'time.startingSoon:{}')
    assert.equal(formatCommissionTiming({ status: "DRAFT", startedAt: null, endedAt: null, plannedStartAt: null }, t), "")
})

// --- Starting ---------------------------------------------------------------

function fakeBackend(hierarchy: any) {
    const sent: string[] = []
    const send = async (query: string, variables?: Record<string, unknown>): Promise<any> => {
        const name = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? "?"
        sent.push(name)
        if (name === "GetReplicaHierarchy") return { commissionReplica: hierarchy }
        if (name === "GetCommissionCandidates") return { commission: null }
        if (name === "DevGetEvaluationTemplateEditions")
            return { evaluationTemplateEditions: { items: [{ id: "te1", status: "PUBLISHED", categories: [{}, {}], template: { beverageType: { id: "bt-wine" } } }] } }
        if (name === "GetReplicaCandidates")
            return { commissionReplica: { replicaPanels: [{ id: "rp1", replicaCandidates: [{ id: "rc0", status: "EVALUATED" }, { id: "rc1", status: "PENDING" }] }] } }
        if (name === "InitializeCommissionReplicaPanel") {
            assert.deepEqual(variables, { id: "rep", panelId: "rp1", currentCandidateId: "rc1" })
        }
        return { ok: true }
    }
    return { send, sent }
}

test("starting a draft moves every level forward, binds templates, then sets the first pending candidate", async () => {
    const { send, sent } = fakeBackend({
        id: "rep",
        status: "DRAFT",
        commission: {
            id: "comm",
            status: "DRAFT",
            panels: [{ id: "p1", candidates: [{ id: "c1", beverageType: { id: "bt-wine" } }] }],
            templateEditions: [],
            competition: { id: "comp", status: "DRAFT", series: { id: "s", status: "DRAFT" } },
        },
    })
    await startCommissionReplica(send, "rep", "comm")
    assert.deepEqual(sent, [
        "GetReplicaHierarchy",
        "DevSubmitCompetitionSeriesForReview",
        "DevApproveCompetitionSeries",
        "DevSubmitCompetitionForReview",
        "DevApproveCompetition",
        "DevPlanCompetition",
        "DevStartCompetition",
        "DevGetEvaluationTemplateEditions",
        "DevSetCommissionTemplateEdition",
        "DevSubmitCommissionForReview",
        "DevApproveCommission",
        "DevPlanCommission",
        "DevStartCommission",
        "DevPlanCommissionReplica",
        "StartCommissionReplica",
        "GetReplicaCandidates",
        "InitializeCommissionReplicaPanel",
    ])
})

test("starting when everything above is running only starts the replica", async () => {
    const { send, sent } = fakeBackend({
        id: "rep",
        status: "PLANNED",
        commission: {
            id: "comm",
            status: "STARTED",
            panels: [{ id: "p1", candidates: [{ id: "c1" }] }],
            competition: { id: "comp", status: "STARTED", series: { id: "s", status: "APPROVED" } },
        },
    })
    await startCommissionReplica(send, "rep")
    assert.deepEqual(sent, ["GetReplicaHierarchy", "StartCommissionReplica", "GetReplicaCandidates", "InitializeCommissionReplicaPanel"])
})

test("nothing to taste refuses to start", async () => {
    const { send, sent } = fakeBackend({ id: "rep", status: "DRAFT", commission: { id: "comm", status: "DRAFT", panels: [] } })
    await assert.rejects(startCommissionReplica(send, "rep", "comm"), new RegExp(NO_CANDIDATES_TO_START))
    assert.ok(!sent.includes("StartCommissionReplica"))
})

test("a failed start of the commission or replica is reported, lifecycle nudges are not", async () => {
    const { send: base } = fakeBackend({
        id: "rep",
        status: "PLANNED",
        commission: {
            id: "comm",
            status: "APPROVED",
            panels: [{ id: "p1", candidates: [{ id: "c1" }] }],
            competition: { id: "comp", status: "STARTED", series: null },
        },
    })
    const failing = async (query: string, variables?: Record<string, unknown>) => {
        if (query.includes("planCommission(")) throw new Error("already planned")
        if (query.includes("startCommission(")) throw new Error("cannot start")
        return base(query, variables)
    }
    await assert.rejects(startCommissionReplica(failing, "rep"), /cannot start/)
})
