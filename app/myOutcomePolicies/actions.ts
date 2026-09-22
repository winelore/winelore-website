"use server"

import { sdk, fetchGraphQLRaw } from '../../lib/apiClient';
import { revalidatePath } from 'next/cache';
import {
    ACTIVATE_OUTCOME_POLICY_EDITION_MUTATION,
    createOutcomePolicy,
    loadOutcomePolicies,
    loadOutcomePolicy,
    loadOutcomePolicyNames,
    saveOutcomePolicyScript,
} from '@winelore/core';

async function rawGraphQL(query: string, variables?: Record<string, any>, headers?: Record<string, string>) {
    return fetchGraphQLRaw<any, Record<string, any> | undefined>(query, variables, headers);
}

export async function activateOutcomePolicyEditionAction(editionId: string, ownerAuid: number = 1) {
    return rawGraphQL(ACTIVATE_OUTCOME_POLICY_EDITION_MUTATION, { id: editionId }, { 'X-ACTOR': String(ownerAuid) });
}

// Shaped and sequenced by core, which the app's outcome policy screens call too.

export async function getOutcomePoliciesAction(ownerAuid?: number, limit: number = 16, cursor?: string) {
    try {
        return await loadOutcomePolicies(rawGraphQL, ownerAuid, limit, cursor);
    } catch (err: any) {
        console.error("❌ Failed to fetch outcome policies from backend:", err.message);
        throw err;
    }
}

export async function getOutcomePolicyNamesAction(ownerAuid: number): Promise<string[]> {
    try {
        return await loadOutcomePolicyNames(rawGraphQL, ownerAuid);
    } catch (err: any) {
        console.error("❌ [OutcomePolicy:names] Failed to fetch outcome policy names for duplicate check:", err.message);
        return [];
    }
}

export async function getOutcomePolicyByIdAction(id: string) {
    try {
        const found = await loadOutcomePolicy(rawGraphQL, id);
        if (!found) {
            throw new Error(`Outcome policy with ID ${id} not found`);
        }
        return found;
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
        const { policyId, editionId } = await createOutcomePolicy(rawGraphQL, name, scriptCode, ownerAuid);
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
        const { editionId } = await saveOutcomePolicyScript(rawGraphQL, policyId, scriptCode, ownerAuid);
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