/**
 * The dashboard decides which commissions a judge can see and get into. A miss
 * here means someone cannot reach a session they are booked on.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import { selectActiveCommissions, type DashboardCommission } from "../src/dashboard"

const commission = (over: Partial<DashboardCommission> = {}): DashboardCommission => ({
    id: "comm-1",
    name: "Reds 2026",
    status: "IN_PROGRESS",
    competition: { id: "compt-1", name: "Winelore Open" },
    replicas: [{ id: "rep-1", status: "IN_PROGRESS", members: [{ auid: [7], role: "MEMBER" }] }],
    ...over,
})

test("a member sees their commission and the replica they judge", () => {
    const [result] = selectActiveCommissions([commission()], "7")
    assert.equal(result.id, "comm-1")
    assert.equal(result.replicaId, "rep-1")
    // Source fields are carried through: the web's commission card renders them.
    assert.equal(result.name, "Reds 2026")
    assert.equal(result.status, "IN_PROGRESS")
    assert.equal(result.competition?.name, "Winelore Open")
    assert.equal(result.isHead, false)
})

test("a nested auid still matches", () => {
    // The backend nests this shape; a plain `includes` misses it and hides the
    // commission from someone who is genuinely on it.
    const nested = commission({
        replicas: [{ id: "rep-1", members: [{ auid: [[7]] as never, role: "MEMBER" }] }],
    })
    assert.equal(selectActiveCommissions([nested], "7").length, 1)
})

test("the chair is identified", () => {
    const chaired = commission({
        replicas: [{ id: "rep-1", members: [{ auid: [7], role: "HEAD" }] }],
    })
    assert.equal(selectActiveCommissions([chaired], "7")[0].isHead, true)
})

test("a non-member sees nothing", () => {
    assert.deepEqual(selectActiveCommissions([commission()], "99"), [])
})

test("a signed-out user sees nothing", () => {
    assert.deepEqual(selectActiveCommissions([commission()], null), [])
})

test("only actionable statuses appear", () => {
    for (const status of ["PLANNED", "APPROVED", "STARTED", "IN_PROGRESS"]) {
        assert.equal(
            selectActiveCommissions([commission({ status })], "7").length,
            1,
            `${status} should appear`,
        )
    }
    for (const status of ["COMPLETED", "DRAFT", "CANCELLED"]) {
        assert.equal(
            selectActiveCommissions([commission({ status })], "7").length,
            0,
            `${status} should not`,
        )
    }
})

test("the user's own replica is chosen, not merely the first", () => {
    const twoReplicas = commission({
        replicas: [
            { id: "rep-other", members: [{ auid: [99] }] },
            { id: "rep-mine", members: [{ auid: [7] }] },
        ],
    })
    assert.equal(selectActiveCommissions([twoReplicas], "7")[0].replicaId, "rep-mine")
})

test("the limit is honoured", () => {
    const many = Array.from({ length: 12 }, (_, i) => commission({ id: `comm-${i}` }))
    assert.equal(selectActiveCommissions(many, "7").length, 8)
    assert.equal(selectActiveCommissions(many, "7", 3).length, 3)
})

test("missing or malformed data does not throw", () => {
    assert.deepEqual(selectActiveCommissions(null, "7"), [])
    assert.deepEqual(selectActiveCommissions([], "7"), [])
    assert.deepEqual(
        selectActiveCommissions([commission({ replicas: null })], "7"),
        [],
    )
    assert.doesNotThrow(() =>
        selectActiveCommissions([commission({ replicas: [{ members: null }] })], "7"),
    )
})

test("every source field survives selection", () => {
    // The web commission card renders competition, startedAt and endedAt; a
    // narrowed shape would blank them with no type error, since the dashboard
    // holds these as `any`.
    const full = commission({ startedAt: "2026-04-01T09:00:00Z", endedAt: null })
    const [result] = selectActiveCommissions([full], "7")
    assert.equal(result.startedAt, "2026-04-01T09:00:00Z")
    assert.equal(result.endedAt, null)
    assert.equal(result.competition?.id, "compt-1")
})
