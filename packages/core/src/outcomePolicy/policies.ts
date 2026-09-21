/**
 * Outcome policies as their owner manages them — the web's My Outcome
 * Policies and its editor, and the app's screens of the same paths: the
 * list, one policy with its latest edition, and creating and saving one.
 *
 * Saving never edits a script in place: it adds the next edition and
 * activates it, so a commission that ran on an earlier edition keeps it.
 */

/** Sends one GraphQL document; each app has its own transport. */
export type PolicySend = (query: string, variables: Record<string, unknown>, headers?: Record<string, string>) => Promise<any>

export const DEFAULT_OUTCOME_POLICY_SCRIPT = "// outcome policy script\n"

export const GET_OUTCOME_POLICIES = `
    query GetOutcomePolicies($limit: Int, $cursor: ID, $filter: OutcomePolicyFilterInput) {
        outcomePolicies(limit: $limit, cursor: $cursor, filter: $filter) {
            items { id name owners createdAt }
        }
    }
`

const EDITION_FIELDS = "id policyId version scriptCode status calculationScope createdAt"

export const GET_OUTCOME_POLICY_EDITIONS = `
    query GetOutcomePolicyEditions($limit: Int) {
        outcomePolicyEditions(limit: $limit) { items { ${EDITION_FIELDS} } }
    }
`

export const GET_OUTCOME_POLICY_COUNT = `
    query GetOutcomePolicyCount($owner: [Int!]) {
        outcomePolicyCount(owner: $owner)
    }
`

export const GET_OUTCOME_POLICY_NAMES = `
    query GetOutcomePolicyNames($limit: Int, $filter: OutcomePolicyFilterInput) {
        outcomePolicies(limit: $limit, filter: $filter) { items { name } }
    }
`

export const GET_OUTCOME_POLICY = `
    query GetOutcomePolicyDetail($id: ID!) {
        outcomePolicy(id: $id) { id name createdAt }
    }
`

export const GET_OUTCOME_POLICY_EDITIONS_BY_POLICY_ID = `
    query GetOutcomePolicyEditionsByPolicy($policyId: ID!, $limit: Int) {
        outcomePolicyEditionsByPolicyId(policyId: $policyId, limit: $limit) { items { ${EDITION_FIELDS} } }
    }
`

export const CREATE_OUTCOME_POLICY_MUTATION = `
    mutation CreateOutcomePolicy($input: CreateOutcomePolicyInput!) {
        createOutcomePolicy(input: $input) { id name }
    }
`

export const CREATE_OUTCOME_POLICY_EDITION_MUTATION = `
    mutation CreateOutcomePolicyEdition($input: CreateOutcomePolicyEditionInput!) {
        createOutcomePolicyEdition(input: $input) { id policyId version }
    }
`

export const ACTIVATE_OUTCOME_POLICY_EDITION_MUTATION = `
    mutation ActivateOutcomePolicyEdition($id: ID!) {
        activateOutcomePolicyEdition(id: $id) { id status }
    }
`

export interface OutcomePolicyEdition {
    id: string
    policyId?: string
    version: number
    scriptCode?: string
    status: string
    calculationScope?: string
    createdAt?: string
}

export interface OutcomePolicySummary {
    id: string
    name: string
    owners?: number[][]
    createdAt: string
    latestEdition?: OutcomePolicyEdition
}

/** Of a policy's editions, the one with the highest version. */
export function latestPolicyEdition<T extends { version: number }>(editions: T[] | null | undefined): T | null {
    return (editions || []).reduce<T | null>((latest, edition) => (!latest || edition.version > latest.version ? edition : latest), null)
}

/**
 * Policies with their latest editions. The backend cannot fetch a page of
 * policies with their editions, so editions come as one list and are
 * matched up here.
 */
export function withLatestEditions(policies: any[] | null | undefined, editions: any[] | null | undefined): OutcomePolicySummary[] {
    const latest = new Map<string, any>()
    for (const edition of editions || []) {
        if (!edition.policyId) continue
        const existing = latest.get(edition.policyId)
        if (!existing || edition.version > existing.version) latest.set(edition.policyId, edition)
    }
    return (policies || []).map((policy) => {
        const edition = latest.get(policy.id)
        return {
            ...policy,
            latestEdition: edition
                ? {
                      id: edition.id,
                      version: edition.version,
                      status: edition.status,
                      scriptCode: edition.scriptCode,
                      calculationScope: edition.calculationScope,
                      createdAt: edition.createdAt,
                  }
                : undefined,
        }
    })
}

/** A page of the policies an owner has — after `cursor`, the last id of the page before — and how many there are. */
export async function loadOutcomePolicies(
    send: PolicySend,
    owner: number,
    limit: number,
    cursor?: string,
): Promise<{ policies: OutcomePolicySummary[]; totalCount: number }> {
    const [policies, editions, count] = await Promise.all([
        send(GET_OUTCOME_POLICIES, { limit, cursor: cursor || undefined, filter: { owners: [[owner]] } }),
        send(GET_OUTCOME_POLICY_EDITIONS, { limit: 500 }),
        send(GET_OUTCOME_POLICY_COUNT, { owner: [owner] }),
    ])
    return {
        policies: withLatestEditions(policies?.outcomePolicies?.items, editions?.outcomePolicyEditions?.items),
        totalCount: count?.outcomePolicyCount || 0,
    }
}

/** The names an owner has used, to catch a duplicate before the backend does. */
export async function loadOutcomePolicyNames(send: PolicySend, owner: number): Promise<string[]> {
    const data = await send(GET_OUTCOME_POLICY_NAMES, { limit: 500, filter: { owners: [[owner]] } })
    return (data?.outcomePolicies?.items || []).map((item: { name: string }) => item.name)
}

/** One policy and its latest edition; null when there is no such policy. */
export async function loadOutcomePolicy(
    send: PolicySend,
    id: string,
): Promise<{ policy: { id: string; name: string; createdAt: string }; edition: OutcomePolicyEdition | null } | null> {
    const [policy, editions] = await Promise.all([
        send(GET_OUTCOME_POLICY, { id }),
        send(GET_OUTCOME_POLICY_EDITIONS_BY_POLICY_ID, { policyId: id, limit: 100 }),
    ])
    if (!policy?.outcomePolicy) return null
    return { policy: policy.outcomePolicy, edition: latestPolicyEdition(editions?.outcomePolicyEditionsByPolicyId?.items) }
}

/** The backend refuses a duplicate name only with a generic error, so it is caught first. */
export function isDuplicatePolicyName(name: string, existingNames: string[]): boolean {
    const trimmed = name.trim().toLowerCase()
    return trimmed.length > 0 && existingNames.some((existing) => existing.trim().toLowerCase() === trimmed)
}

/**
 * The trace id in a backend error ("INTERNAL_ERROR for <traceId>"), which is
 * all it says about why — something concrete for a user to report.
 */
export function policyErrorTraceId(message: string | null | undefined): string | null {
    const match = message?.match(/for\s+([a-zA-Z0-9-]{6,})\s*$/)
    return match ? match[1] : null
}

const actor = (auid: number) => ({ "X-ACTOR": String(auid) })

/** A new policy owned by `auid`, with its script as edition 1, activated. */
export async function createOutcomePolicy(
    send: PolicySend,
    name: string,
    scriptCode: string,
    auid: number,
): Promise<{ policyId: string; editionId: string }> {
    const headers = actor(auid)
    const policy = await send(CREATE_OUTCOME_POLICY_MUTATION, { input: { name, owners: [[auid]] } }, headers)
    const policyId: string | undefined = policy?.createOutcomePolicy?.id
    if (!policyId) throw new Error("The outcome policy was not created")
    const edition = await send(
        CREATE_OUTCOME_POLICY_EDITION_MUTATION,
        { input: { policyId, version: 1, scriptCode, calculationScope: "REPLICA_WIDE" } },
        headers,
    )
    const editionId: string | undefined = edition?.createOutcomePolicyEdition?.id
    if (!editionId) throw new Error("The outcome policy's script was not saved")
    await send(ACTIVATE_OUTCOME_POLICY_EDITION_MUTATION, { id: editionId }, headers)
    return { policyId, editionId }
}

/**
 * A new script for a policy: the next edition after its latest, in the same
 * calculation scope, activated.
 */
export async function saveOutcomePolicyScript(
    send: PolicySend,
    policyId: string,
    scriptCode: string,
    auid: number,
): Promise<{ editionId: string; version: number }> {
    const headers = actor(auid)
    const editions = await send(GET_OUTCOME_POLICY_EDITIONS_BY_POLICY_ID, { policyId, limit: 100 })
    const latest = latestPolicyEdition<OutcomePolicyEdition>(editions?.outcomePolicyEditionsByPolicyId?.items)
    const version = (latest?.version || 1) + 1
    const edition = await send(
        CREATE_OUTCOME_POLICY_EDITION_MUTATION,
        { input: { policyId, version, scriptCode, calculationScope: latest?.calculationScope || "REPLICA_WIDE" } },
        headers,
    )
    const editionId: string | undefined = edition?.createOutcomePolicyEdition?.id
    if (!editionId) throw new Error("The outcome policy's script was not saved")
    await send(ACTIVATE_OUTCOME_POLICY_EDITION_MUTATION, { id: editionId }, headers)
    return { editionId, version }
}
