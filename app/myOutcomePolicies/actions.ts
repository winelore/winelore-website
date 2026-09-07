"use server"

import { sdk, fetchGraphQLRaw } from '../../lib/apiClient';
import { revalidatePath } from 'next/cache';

async function rawGraphQL(query: string, variables?: Record<string, any>, headers?: Record<string, string>) {
    return fetchGraphQLRaw<any, Record<string, any> | undefined>(query, variables, headers);
}

export async function activateOutcomePolicyEditionAction(editionId: string, ownerAuid: number = 1) {
    const mutation = `
        mutation ActivateOutcomePolicyEdition($id: ID!) {
            activateOutcomePolicyEdition(id: $id) {
                id
                status
            }
        }
    `;
    const actorHeaders = { 'X-ACTOR': String(ownerAuid) };
    return rawGraphQL(mutation, { id: editionId }, actorHeaders);
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
        const editionsQuery = `
            query GetOutcomePolicyEditions($limit: Int) {
                outcomePolicyEditions(limit: $limit) {
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
        const countQuery = `
            query GetOutcomePolicyCount($owner: [Int!]) {
                outcomePolicyCount(owner: $owner)
            }
        `;

        const [policiesData, editionsData, countData] = await Promise.all([
            rawGraphQL(policiesQuery, {
                limit,
                cursor: cursor || undefined,
                filter: { owners: [[ownerAuid]] },
            }),
            rawGraphQL(editionsQuery, { limit: 500 }),
            rawGraphQL(countQuery, { owner: [ownerAuid] }),
        ]);

        const rawPolicies: any[] = policiesData?.outcomePolicies?.items || [];
        const editionItems: any[] = editionsData?.outcomePolicyEditions?.items || [];

        const latestEditionMap = new Map<string, any>();
        for (const edition of editionItems) {
            if (!edition.policyId) continue;
            const existing = latestEditionMap.get(edition.policyId);
            if (!existing || edition.version > existing.version) {
                latestEditionMap.set(edition.policyId, edition);
            }
        }

        const policies = rawPolicies.map((policy) => {
            const latestEdition = latestEditionMap.get(policy.id);
            return {
                ...policy,
                latestEdition: latestEdition
                    ? {
                        id: latestEdition.id,
                        version: latestEdition.version,
                        status: latestEdition.status,
                        scriptCode: latestEdition.scriptCode,
                        calculationScope: latestEdition.calculationScope,
                        createdAt: latestEdition.createdAt,
                    }
                    : undefined,
            };
        });

        return {
            policies,
            totalCount: countData?.outcomePolicyCount || 0,
        };
    } catch (err: any) {
        console.error("❌ Failed to fetch outcome policies from backend:", err.message);
        throw err;
    }
}

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
        console.log(`  Created outcome policy edition: ${editionId} (v1)`);

        await activateOutcomePolicyEditionAction(editionId, ownerAuid);
        console.log(`  Activated outcome policy edition: ${editionId}`);

        revalidatePath('/myOutcomePolicies');

        return { success: true, policyId, editionId };
    } catch (err: any) {
        console.error("❌ [OutcomePolicy:create] Failed to create outcome policy on backend", {
            actor: ownerAuid,
            attemptedName: name,
            error: err?.message,
            timestamp: new Date().toISOString(),
        });
        throw err;
    }
}

export async function updateOutcomePolicyAction(
    policyId: string,
    scriptCode: string,
    ownerAuid: number = 1
) {
    try {
        console.log(`🔄 Updating outcome policy "${policyId}"...`);
        const actorHeaders = { 'X-ACTOR': String(ownerAuid) };

        const { edition } = await getOutcomePolicyByIdAction(policyId);
        const nextVersion = (edition?.version || 1) + 1;

        const editionRes = await sdk.CreateOutcomePolicyEdition({
            input: {
                policyId,
                version: nextVersion,
                scriptCode,
                calculationScope: edition?.calculationScope || "REPLICA_WIDE"
            }
        }, { headers: actorHeaders });
        const editionId = editionRes.createOutcomePolicyEdition.id;
        console.log(`  Created new outcome policy edition: ${editionId} (v${nextVersion})`);

        await activateOutcomePolicyEditionAction(editionId, ownerAuid);
        console.log(`  Activated new outcome policy edition: ${editionId}`);

        revalidatePath('/myOutcomePolicies');

        return { success: true, policyId, editionId };
    } catch (err: any) {
        console.error("❌ [OutcomePolicy:update] Failed to update outcome policy on backend", {
            actor: ownerAuid,
            policyId,
            error: err?.message,
            timestamp: new Date().toISOString(),
        });
        throw err;
    }
}

export async function updateOutcomePolicyScriptAction(
    editionIdOrPolicyId: string,
    scriptCode: string,
    ownerAuid: number = 1
) {
    try {
        return await updateOutcomePolicyAction(editionIdOrPolicyId, scriptCode, ownerAuid);
    } catch {
        const actorHeaders = { 'X-ACTOR': String(ownerAuid) };
        const res = await sdk.UpdateOutcomePolicyEditionScript({
            id: editionIdOrPolicyId,
            scriptCode
        }, { headers: actorHeaders });

        revalidatePath('/myOutcomePolicies');

        return { success: true, edition: res.updateOutcomePolicyEditionScript };
    }
}