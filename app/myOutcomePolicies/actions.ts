"use server"

import { sdk } from '../../lib/apiClient';
import { revalidatePath } from 'next/cache';

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://switchback.proxy.rlwy.net:43233/graphql';

async function rawGraphQL(query: string, variables?: Record<string, any>) {
    const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: 0 },
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message || 'GraphQL error');
    return json.data;
}

export async function getOutcomePoliciesAction(ownerAuid: number, limit: number = 16, cursor?: string) {
    try {
        const policiesQuery = `
            query GetOutcomePolicies($limit: Int, $cursor: ID, $filter: OutcomePolicyFilterInput) {
                outcomePolicies(limit: $limit, cursor: $cursor, filter: $filter) {
                    items {
                        id
                        name
                        owners
                        createdAt
                    }
                }
            }
        `;
        const countQuery = `
            query GetOutcomePolicyCount($owner: [Int!]) {
                outcomePolicyCount(owner: $owner)
            }
        `;

        const [policiesData, countData] = await Promise.all([
            rawGraphQL(policiesQuery, {
                limit,
                cursor: cursor || undefined,
                filter: { owners: [[ownerAuid]] },
            }),
            rawGraphQL(countQuery, { owner: [ownerAuid] }),
        ]);

        return {
            policies: policiesData?.outcomePolicies?.items || [],
            totalCount: countData?.outcomePolicyCount || 0,
        };
    } catch (err: any) {
        console.error("❌ Failed to fetch outcome policies from backend:", err.message);
        throw err;
    }
}

// Lightweight, names-only fetch used purely for client-side duplicate-name
// validation before we attempt a create — avoids surfacing a raw backend
// 500 when the real problem is just "name already taken".
export async function getOutcomePolicyNamesAction(ownerAuid: number): Promise<string[]> {
    try {
        const query = `
            query GetOutcomePolicyNames($limit: Int, $filter: OutcomePolicyFilterInput) {
                outcomePolicies(limit: $limit, filter: $filter) {
                    items {
                        name
                    }
                }
            }
        `;
        const data = await rawGraphQL(query, {
            limit: 500,
            filter: { owners: [[ownerAuid]] },
        });
        return (data?.outcomePolicies?.items || []).map((item: any) => item.name as string);
    } catch (err: any) {
        console.error("❌ [OutcomePolicy:names] Failed to fetch outcome policy names for duplicate check:", err.message);
        // Non-fatal — if this fails we just skip the client-side pre-check
        // and fall back to whatever the backend returns on create.
        return [];
    }
}

export async function getOutcomePolicyByIdAction(id: string) {
    try {
        const policyQuery = `
            query GetOutcomePolicyDetail($id: ID!) {
                outcomePolicy(id: $id) {
                    id
                    name
                    createdAt
                }
            }
        `;
        const editionsQuery = `
            query GetOutcomePolicyEditionsByPolicy($policyId: ID!, $limit: Int) {
                outcomePolicyEditionsByPolicyId(policyId: $policyId, limit: $limit) {
                    items {
                        id
                        policyId
                        version
                        scriptCode
                        status
                        calculationScope
                        createdAt
                    }
                }
            }
        `;

        const [policyData, editionsData] = await Promise.all([
            rawGraphQL(policyQuery, { id }),
            rawGraphQL(editionsQuery, { policyId: id, limit: 100 }),
        ]);

        const policy = policyData?.outcomePolicy;
        if (!policy) {
            throw new Error(`Outcome policy with ID ${id} not found`);
        }

        const items = editionsData?.outcomePolicyEditionsByPolicyId?.items ?? [];
        const edition = items.length
            ? items.reduce((latest: any, curr: any) => (curr.version > latest.version ? curr : latest))
            : null;

        return { policy, edition };
    } catch (err: any) {
        console.error(`❌ Failed to fetch outcome policy by id (${id}):`, err.message);
        throw err;
    }
}

export async function createOutcomePolicyAction(
    name: string,
    scriptCode: string,
    ownerAuid: number = 1
) {
    try {
        console.log(`🚀 Creating outcome policy "${name}"...`);
        const actorHeaders = { 'X-ACTOR': String(ownerAuid) };

        const policyRes = await sdk.CreateOutcomePolicy({
            input: {
                name,
                owners: [[ownerAuid]]
            }
        }, { headers: actorHeaders });
        const policyId = policyRes.createOutcomePolicy.id;
        console.log(`  Created outcome policy: ${policyId}`);

        const editionRes = await sdk.CreateOutcomePolicyEdition({
            input: {
                policyId,
                version: 1,
                scriptCode,
                calculationScope: "REPLICA_WIDE"
            }
        }, { headers: actorHeaders });
        const editionId = editionRes.createOutcomePolicyEdition.id;
        console.log(`  Created outcome policy edition: ${editionId}`);

        revalidatePath('/myOutcomePolicies');

        return { success: true, policyId, editionId };
    } catch (err: any) {
        // Structured, greppable log line: the trace id embedded in err.message
        // (e.g. "INTERNAL_ERROR for <traceId>") can be cross-referenced against
        // backend logs for this exact failure.
        console.error("❌ [OutcomePolicy:create] Failed to create outcome policy on backend", {
            actor: ownerAuid,
            attemptedName: name,
            error: err?.message,
            timestamp: new Date().toISOString(),
        });
        throw err;
    }
}

export async function updateOutcomePolicyScriptAction(
    editionId: string,
    scriptCode: string,
    ownerAuid: number = 1
) {
    try {
        console.log(`🔄 Updating outcome policy edition "${editionId}"...`);
        const actorHeaders = { 'X-ACTOR': String(ownerAuid) };

        const res = await sdk.UpdateOutcomePolicyEditionScript({
            id: editionId,
            scriptCode
        }, { headers: actorHeaders });

        revalidatePath('/myOutcomePolicies');

        return { success: true, edition: res.updateOutcomePolicyEditionScript };
    } catch (err: any) {
        console.error("❌ [OutcomePolicy:update] Failed to update outcome policy script on backend", {
            actor: ownerAuid,
            editionId,
            error: err?.message,
            timestamp: new Date().toISOString(),
        });
        throw err;
    }
}