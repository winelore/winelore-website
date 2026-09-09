'use server';

import { cookies } from 'next/headers';
import { sdk, fetchGraphQLRaw } from '@/lib/apiClient';
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
    return { actor: auid, 'x-actor': auid };
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

        const existingSamples = res?.samples?.items || [];
        const samplesCount = existingSamples.length;
        const usedVolumeMl = existingSamples.reduce((sum: number, s: any) => sum + (Number(s.volumeMl) || 0), 0);
        const remainingVolumeMl = typeof batch.volumeMl === 'number'
            ? Math.max(0, batch.volumeMl - usedVolumeMl)
            : null;

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

    const formattedAttributes: Record<string, any> = {};
    if (params.attributes && typeof params.attributes === 'object') {
        for (const [key, val] of Object.entries(params.attributes)) {
            if (val === undefined || val === null || val === '') continue;
            if (typeof val === 'number') {
                formattedAttributes[key] = val;
            } else if (typeof val === 'string') {
                if (/^-?\d+$/.test(val.trim())) {
                    formattedAttributes[key] = parseInt(val.trim(), 10);
                } else if (/^-?\d+\.\d+$/.test(val.trim())) {
                    formattedAttributes[key] = parseFloat(val.trim());
                } else if (val.toLowerCase() === 'true') {
                    formattedAttributes[key] = true;
                } else if (val.toLowerCase() === 'false') {
                    formattedAttributes[key] = false;
                } else {
                    formattedAttributes[key] = val.trim();
                }
            } else {
                formattedAttributes[key] = val;
            }
        }
    }

    let parsedVolumeMl: number | undefined = undefined;
    if (params.volumeMl !== undefined && params.volumeMl !== null && params.volumeMl !== '') {
        const num = parseInt(String(params.volumeMl), 10);
        if (!isNaN(num) && num > 0) {
            parsedVolumeMl = num;
        }
    }

    // Verify against remaining batch volume if specified
    if (parsedVolumeMl !== undefined) {
        try {
            const checkQuery = `
              query CheckBatchVolumeLimit($id: ID!) {
                batch(id: $id) {
                  volumeMl
                }
                samples(batchId: $id) {
                  items {
                    volumeMl
                  }
                }
              }
            `;
            const checkData = await fetchGraphQLRaw<any, any>(checkQuery, { id: params.batchId }, headers);
            const batchVolume = checkData?.batch?.volumeMl;
            if (typeof batchVolume === 'number' && batchVolume > 0) {
                const existing = checkData?.samples?.items || [];
                const currentUsed = existing.reduce((sum: number, s: any) => sum + (Number(s.volumeMl) || 0), 0);
                if (currentUsed + parsedVolumeMl > batchVolume) {
                    const remaining = Math.max(0, batchVolume - currentUsed);
                    return {
                        success: false,
                        error: `Об'єм зразка (${parsedVolumeMl.toLocaleString()} мл) перевищує доступний залишок у партії (${remaining.toLocaleString()} мл із загальних ${batchVolume.toLocaleString()} мл).`
                    };
                }
            }
        } catch (volErr) {
            console.warn('Batch volume verification check failed:', volErr);
        }
    }

    const input: any = {
        batchId: params.batchId,
        volumeMl: parsedVolumeMl,
        attributes: Object.keys(formattedAttributes).length > 0 ? formattedAttributes : undefined,
    };

    try {
        const res = await sdk.DevCreateSample({ input }, { headers });
        const sampleId = res?.createSample?.id;
        if (!sampleId) {
            throw new Error('Failed to create sample');
        }
        return { success: true, sampleId };
    } catch (err: any) {
        console.error('Server Action Error (createSampleAction):', err);
        return { success: false, error: err.message || 'Failed to create sample' };
    }
}
