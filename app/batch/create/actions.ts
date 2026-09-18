'use server';

import { cookies } from 'next/headers';
import { fetchGraphQLRaw, mutateGraphQLRaw } from '@/lib/apiClient';
import { createBatch, loadBeverageChoices } from '@winelore/core/beverage';
import {
    fetchBeverageTypeCharacteristics,
    type BeverageCharacteristic,
} from '@/lib/beverageCharacteristics';

async function getActorHeaders(): Promise<Record<string, string>> {
    const cookieStore = await cookies();
    const auid = cookieStore.get('auid')?.value;
    if (!auid) {
        throw new Error('Unauthorized: Please sign in');
    }
    return { 'X-ACTOR': auid };
}

export interface BeverageSimpleInfo {
    id: string;
    name: string;
    typeId: string;
    typeName?: string;
    status?: string;
    isOwn?: boolean;
}

export async function getMyBeveragesAction(): Promise<BeverageSimpleInfo[]> {
    try {
        const headers = await getActorHeaders();
        // The user's own beverages, or the catalogue when they have none — core's rule, as in
        // the app. This used to read the actor from a key the headers do not have, so it never
        // found the user's own and always offered the whole catalogue.
        return await loadBeverageChoices(
            (query, variables) => fetchGraphQLRaw<any, any>(query, variables, headers),
            parseInt(headers['X-ACTOR'], 10),
        );
    } catch (err) {
        console.error('Failed to fetch beverages for user:', err);
        return [];
    }
}

export async function getBeverageForBatchAction(beverageId: string): Promise<{
    success: boolean;
    beverage?: BeverageSimpleInfo;
    characteristics?: BeverageCharacteristic[];
    error?: string;
}> {
    if (!beverageId) {
        return { success: false, error: 'Beverage ID is required' };
    }
    try {
        const headers = await getActorHeaders();
        const bevQuery = `
          query GetBeverageDetail($id: ID!) {
            beverage(id: $id) {
              id
              name
              typeId
              status
            }
          }
        `;
        const res = await fetchGraphQLRaw<any, any>(bevQuery, { id: beverageId }, headers);
        const beverage = res?.beverage;
        if (!beverage) {
            return { success: false, error: 'Beverage not found' };
        }

        // Fetch type name
        let typeName = '';
        if (beverage.typeId) {
            try {
                const typeQuery = `
                  query GetBeverageTypeName($id: ID!) {
                    beverageType(id: $id) {
                      name
                    }
                  }
                `;
                const typeRes = await fetchGraphQLRaw<any, any>(typeQuery, { id: beverage.typeId }, headers);
                typeName = typeRes?.beverageType?.name || '';
            } catch (typeErr) {
                console.warn('Failed to fetch type name for beverage:', typeErr);
            }
        }

        const characteristics = await fetchBeverageTypeCharacteristics(beverage.typeId, 'BATCH', headers);

        return {
            success: true,
            beverage: {
                id: beverage.id,
                name: beverage.name,
                typeId: beverage.typeId,
                typeName,
                status: beverage.status,
            },
            characteristics,
        };
    } catch (err: any) {
        console.error('Failed to get beverage for batch action:', err);
        return { success: false, error: err.message || 'Failed to fetch beverage' };
    }
}

export async function getBatchCharacteristicsAction(typeId: string): Promise<BeverageCharacteristic[]> {
    if (!typeId) return [];
    try {
        const headers = await getActorHeaders();
        return await fetchBeverageTypeCharacteristics(typeId, 'BATCH', headers);
    } catch (err) {
        console.error('Failed to get batch characteristics action:', err);
        return [];
    }
}

export async function createBatchAction(params: {
    beverageId: string;
    lotNumber?: string | null;
    volumeMl?: number | string | null;
    attributes?: Record<string, any>;
}) {
    if (!params.beverageId) {
        throw new Error('Beverage is required');
    }

    const headers = await getActorHeaders();
    try {
        // The attributes' formatting and the input are core's, as in the app.
        const batchId = await createBatch((query, variables) => mutateGraphQLRaw(query, variables, headers), params);
        return { success: true, batchId };
    } catch (err: any) {
        console.error('Server Action Error (createBatchAction):', err);
        return { success: false, error: err.message || 'Failed to create batch' };
    }
}
