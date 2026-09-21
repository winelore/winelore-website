/**
 * Outcome policies as their owner manages them, shared by the web and the app.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    ACTIVATE_OUTCOME_POLICY_EDITION_MUTATION,
    CREATE_OUTCOME_POLICY_EDITION_MUTATION,
    CREATE_OUTCOME_POLICY_MUTATION,
    GET_OUTCOME_POLICIES,
    GET_OUTCOME_POLICY_COUNT,
    GET_OUTCOME_POLICY_EDITIONS,
    GET_OUTCOME_POLICY_EDITIONS_BY_POLICY_ID,
    createOutcomePolicy,
    isDuplicatePolicyName,
    latestPolicyEdition,
    loadOutcomePolicies,
    loadOutcomePolicy,
    policyErrorTraceId,
    saveOutcomePolicyScript,
    type PolicySend,
} from "../src"

type Call = { query: string; variables: Record<string, unknown>; headers?: Record<string, string> }

function recorder(answer: (query: string, variables: Record<string, unknown>) => unknown) {
    const calls: Call[] = []
    const send: PolicySend = async (query, variables, headers) => {
        calls.push({ query, variables, headers })
        return answer(query, variables)
    }
    return { calls, send }
}

test("a policy's latest edition is its highest version", () => {
    assert.equal(latestPolicyEdition([{ version: 2 }, { version: 5 }, { version: 3 }])?.version, 5)
    assert.equal(latestPolicyEdition([]), null)
    assert.equal(latestPolicyEdition(null), null)
})

test("a page of an owner's policies comes with each one's latest edition and the owner's count", async () => {
    const { calls, send } = recorder((query) => {
        if (query === GET_OUTCOME_POLICIES) {
            return { outcomePolicies: { items: [{ id: "p1", name: "Medals", createdAt: "2026-01-01" }, { id: "p2", name: "Plain", createdAt: "2026-02-01" }] } }
        }
        if (query === GET_OUTCOME_POLICY_EDITIONS) {
            return {
                outcomePolicyEditions: {
                    items: [
                        { id: "e1", policyId: "p1", version: 1, status: "ARCHIVED", scriptCode: "a" },
                        { id: "e3", policyId: "p1", version: 3, status: "ACTIVE", scriptCode: "c" },
                        { id: "e2", policyId: "p1", version: 2, status: "ARCHIVED", scriptCode: "b" },
                        { id: "x", policyId: null, version: 9 },
                    ],
                },
            }
        }
        if (query === GET_OUTCOME_POLICY_COUNT) return { outcomePolicyCount: 17 }
    })

    const { policies, totalCount } = await loadOutcomePolicies(send, 42, 16, "p0")
    assert.equal(totalCount, 17)
    assert.deepEqual(
        policies.map((policy) => [policy.id, policy.latestEdition?.version ?? null, policy.latestEdition?.scriptCode ?? null]),
        [
            ["p1", 3, "c"],
            ["p2", null, null],
        ],
    )
    assert.deepEqual(calls[0].variables, { limit: 16, cursor: "p0", filter: { owners: [[42]] } })
    assert.deepEqual(calls[2].variables, { owner: [42] })
})

test("a policy that does not exist is null", async () => {
    const { send } = recorder((query) => (query === GET_OUTCOME_POLICY_EDITIONS_BY_POLICY_ID ? { outcomePolicyEditionsByPolicyId: { items: [] } } : { outcomePolicy: null }))
    assert.equal(await loadOutcomePolicy(send, "missing"), null)
})

test("creating a policy makes it the owner's, with its script as edition 1, activated", async () => {
    const { calls, send } = recorder((query) => {
        if (query === CREATE_OUTCOME_POLICY_MUTATION) return { createOutcomePolicy: { id: "p9", name: "New" } }
        if (query === CREATE_OUTCOME_POLICY_EDITION_MUTATION) return { createOutcomePolicyEdition: { id: "e9", policyId: "p9", version: 1 } }
        return { activateOutcomePolicyEdition: { id: "e9", status: "ACTIVE" } }
    })

    assert.deepEqual(await createOutcomePolicy(send, "New", "return 1", 42), { policyId: "p9", editionId: "e9" })
    assert.deepEqual(
        calls.map((call) => call.query),
        [CREATE_OUTCOME_POLICY_MUTATION, CREATE_OUTCOME_POLICY_EDITION_MUTATION, ACTIVATE_OUTCOME_POLICY_EDITION_MUTATION],
    )
    assert.deepEqual(calls[0].variables, { input: { name: "New", owners: [[42]] } })
    assert.deepEqual(calls[1].variables, { input: { policyId: "p9", version: 1, scriptCode: "return 1", calculationScope: "REPLICA_WIDE" } })
    assert.ok(calls.every((call) => call.headers?.["X-ACTOR"] === "42"))
})

test("a create the backend did not make stops before its edition", async () => {
    const { calls, send } = recorder(() => ({ createOutcomePolicy: null }))
    await assert.rejects(createOutcomePolicy(send, "New", "", 42))
    assert.equal(calls.length, 1)
})

test("saving a script adds the next edition in the same scope and activates it", async () => {
    const { calls, send } = recorder((query) => {
        if (query === GET_OUTCOME_POLICY_EDITIONS_BY_POLICY_ID) {
            return {
                outcomePolicyEditionsByPolicyId: {
                    items: [
                        { id: "e1", version: 1, status: "ARCHIVED", calculationScope: "COMMISSION_WIDE" },
                        { id: "e4", version: 4, status: "ACTIVE", calculationScope: "COMMISSION_WIDE" },
                    ],
                },
            }
        }
        if (query === CREATE_OUTCOME_POLICY_EDITION_MUTATION) return { createOutcomePolicyEdition: { id: "e5", version: 5 } }
        return { activateOutcomePolicyEdition: { id: "e5", status: "ACTIVE" } }
    })

    assert.deepEqual(await saveOutcomePolicyScript(send, "p1", "return 2", 7), { editionId: "e5", version: 5 })
    assert.deepEqual(calls[1].variables, { input: { policyId: "p1", version: 5, scriptCode: "return 2", calculationScope: "COMMISSION_WIDE" } })
    assert.deepEqual(calls[2].variables, { id: "e5" })
    assert.equal(calls[2].headers?.["X-ACTOR"], "7")
})

test("a duplicate name is caught whatever its case and spacing", () => {
    assert.equal(isDuplicatePolicyName("  medals ", ["Medals", "Plain"]), true)
    assert.equal(isDuplicatePolicyName("Gold", ["Medals"]), false)
    assert.equal(isDuplicatePolicyName("   ", ["   "]), false)
})

test("a backend error's trace id is found at its end", () => {
    assert.equal(policyErrorTraceId("INTERNAL_ERROR for 3f9a-bc12-77"), "3f9a-bc12-77")
    assert.equal(policyErrorTraceId("Network request failed"), null)
    assert.equal(policyErrorTraceId(undefined), null)
})
