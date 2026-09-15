'use server';

import { cookies } from 'next/headers';
import { fetchGraphQLRaw, mutateGraphQLRaw } from '@/lib/apiClient';
import { SampleExceedsBatchError, batchAllocation, createSample } from '@winelore/core/beverage';
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

export interface BatchSimpleInfo {
    id: string;
    lotNumber?: string | null;
    volumeMl?: number | null;
    attributes?: any;
    createdAt?: string;
    beverage?: {
        id: string;
        name: string;
        typeId: string;
        typeName?: string;
        status?: string;
    };
}

export async function getBatchesForBeverageAction(beverageId: string): Promise<BatchSimpleInfo[]> {
    if (!beverageId) return [];
    try {
        const headers = await getActorHeaders();
        const query = `
          query GetBatchesForSample($beverageId: ID!) {
            batches(beverageId: $beverageId, limit: 100) {
              items {
                id
                lotNumber
                volumeMl
                attributes
                createdAt
              }
            }
          }
        `;
        const res = await fetchGraphQLRaw<any, any>(query, { beverageId }, headers);
        return res?.batches?.items || [];
    } catch (err) {
        console.error('Failed to get batches for beverage:', err);
        return [];
    }
}

export async function getBatchDetailsAction(batchId: string): Promise<{
    success: boolean;
    batch?: BatchSimpleInfo;
    characteristics?: BeverageCharacteristic[];
    usedVolumeMl?: number;
    remainingVolumeMl?: number | null;
    samplesCount?: number;
    error?: string;
}> {
    if (!batchId) {
        return { success: false, error: 'Batch ID is required' };
    }
    try {
        const headers = await getActorHeaders();
        const query = `
          query GetBatchDetailAndSamples($id: ID!) {
            batch(id: $id) {
              id
              lotNumber
              volumeMl
              attributes
              createdAt
              beverage {
                id
                name
                typeId
                status
              }
            }
            samples(batchId: $id) {
              items {
                id
                volumeMl
              }
            }
          }
        `;
        const res = await fetchGraphQLRaw<any, any>(query, { id: batchId }, headers);
        const batch = res?.batch;
        if (!batch) {
            return { success: false, error: 'Batch not found' };
        }

        const { usedVolumeMl, remainingVolumeMl, samplesCount } = batchAllocation(batch.volumeMl, res?.samples?.items);

        let typeName = '';
        if (batch.beverage?.typeId) {
            try {
                const typeQuery = `
                  query GetBeverageTypeName($id: ID!) {
                    beverageType(id: $id) {
                      name
                    }
                  }
                `;
                const typeRes = await fetchGraphQLRaw<any, any>(typeQuery, { id: batch.beverage.typeId }, headers);
                typeName = typeRes?.beverageType?.name || '';
            } catch (typeErr) {
                console.warn('Failed to fetch type name for beverage in batch:', typeErr);
            }
        }

        const characteristics = batch.beverage?.typeId
            ? await fetchBeverageTypeCharacteristics(batch.beverage.typeId, 'SAMPLE', headers)
            : [];

        return {
            success: true,
            batch: {
                ...batch,
                beverage: {
                    ...batch.beverage,
                    typeName,
                },
            },
            characteristics,
            usedVolumeMl,
            remainingVolumeMl,
            samplesCount,
        };
    } catch (err: any) {
        console.error('Failed to get batch details action:', err);
        return { success: false, error: err.message || 'Failed to fetch batch details' };
    }
}

export async function getSampleCharacteristicsAction(typeId: string): Promise<BeverageCharacteristic[]> {
    if (!typeId) return [];
    try {
        const headers = await getActorHeaders();
        return await fetchBeverageTypeCharacteristics(typeId, 'SAMPLE', headers);
    } catch (err) {
        console.error('Failed to get sample characteristics action:', err);
        return [];
    }
}

export async function createSampleAction(params: {
    batchId: string;
    volumeMl?: number | string | null;
    attributes?: Record<string, any>;
}) {
    if (!params.batchId) {
        throw new Error('Batch is required');
    }

    const headers = await getActorHeaders();
    try {
        // The volume check against the batch, the formatting and the input are core's, as in the app.
        const sampleId = await createSample((query, variables) => mutateGraphQLRaw(query, variables, headers), params);
        return { success: true, sampleId };
    } catch (err: any) {
        if (err instanceof SampleExceedsBatchError) {
            return {
                success: false,
                error: `Об'єм зразка (${err.volumeMl.toLocaleString()} мл) перевищує доступний залишок у партії (${err.remainingMl.toLocaleString()} мл із загальних ${err.batchVolumeMl.toLocaleString()} мл).`
            };
        }
        console.error('Server Action Error (createSampleAction):', err);
        return { success: false, error: err.message || 'Failed to create sample' };
    }
}
