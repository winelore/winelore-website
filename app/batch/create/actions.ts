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
        const auid = headers.actor;
        const auidNum = parseInt(auid, 10);

        let query = `
          query GetMyBeveragesList($filter: BeverageFilterInput, $limit: Int!) {
            beverages(filter: $filter, limit: $limit) {
              items {
                id
                name
                typeId
                status
              }
            }
          }
        `;

        let items: any[] = [];
        let isOwn = true;

        if (!isNaN(auidNum)) {
            try {
                const res = await fetchGraphQLRaw<any, any>(
                    query,
                    { filter: { producers: [[auidNum]] }, limit: 100 },
                    headers
                );
                items = res?.beverages?.items || [];
            } catch (filterErr) {
                console.warn('Filter by producer failed, falling back to all beverages:', filterErr);
            }
        }

        // If user has no beverages yet, fallback to all available beverages so they can test
        if (items.length === 0) {
            isOwn = false;
            const fallbackQuery = `
              query GetAllBeverages($limit: Int!) {
                beverages(limit: $limit) {
                  items {
                    id
                    name
                    typeId
                    status
                  }
                }
              }
            `;
            try {
                const res = await fetchGraphQLRaw<any, any>(fallbackQuery, { limit: 100 }, headers);
                items = res?.beverages?.items || [];
            } catch (fallbackErr) {
                console.warn('Fallback query failed:', fallbackErr);
            }
        }

        return items.map((b: any) => ({
            id: b.id,
            name: b.name,
            typeId: b.typeId,
            status: b.status,
            isOwn,
        }));
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

    const formattedAttributes: Record<string, any> = {};
    if (params.attributes && typeof params.attributes === 'object') {
        for (const [key, val] of Object.entries(params.attributes)) {
            if (val === undefined || val === null || val === '') continue;
            // Handle known numeric types like vintage, alcoholByVolume
            if (key === 'vintage') {
                const parsedInt = parseInt(String(val), 10);
                if (!isNaN(parsedInt)) {
                    formattedAttributes[key] = parsedInt;
                }
            } else if (key === 'alcoholByVolume' || key === 'abv' || key === 'alcohol') {
                let parsedFloat = parseFloat(String(val));
                if (!isNaN(parsedFloat)) {
                    if (Number.isInteger(parsedFloat)) {
                        parsedFloat = parsedFloat + 0.00001;
                    }
                    formattedAttributes[key] = parsedFloat;
                }
            } else if (typeof val === 'number') {
                formattedAttributes[key] = val;
            } else if (typeof val === 'string') {
                // Try number if matches
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

    const trimmedLotNumber = params.lotNumber ? params.lotNumber.trim() : undefined;

    const input: any = {
        beverageId: params.beverageId,
        lotNumber: trimmedLotNumber || undefined,
        volumeMl: parsedVolumeMl,
        attributes: Object.keys(formattedAttributes).length > 0 ? formattedAttributes : undefined,
    };

    try {
        const res = await sdk.DevCreateBatch({ input }, { headers });
        const batchId = res?.createBatch?.id;
        if (!batchId) {
            throw new Error('Failed to create batch');
        }
        return { success: true, batchId };
    } catch (err: any) {
        console.error('Server Action Error (createBatchAction):', err);
        return { success: false, error: err.message || 'Failed to create batch' };
    }
}
