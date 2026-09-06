'use server';

import { cookies } from 'next/headers';
import { sdk, fetchGraphQLRaw } from '@/lib/apiClient';
import { getBeverageTypesAction } from '@/app/myTemplates/actions';

async function getActorHeaders(): Promise<Record<string, string>> {
    const cookieStore = await cookies();
    const auid = cookieStore.get('auid')?.value;
    if (!auid) {
        throw new Error('Unauthorized: Please sign in');
    }
    return { actor: auid, 'x-actor': auid };
}

const isUuid = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

export interface BeverageCharacteristic {
    id: string;
    code: string;
    name: string;
    typeName: string;
    isRequired: boolean;
    allowedValues?: string[];
    minLimit?: number;
    maxLimit?: number;
}

function parsePropertySchemas(raw: string) {
    if (!raw) return { BEVERAGE: [], BATCH: [], SAMPLE: [] };
    const result: { BEVERAGE: any[]; BATCH: any[]; SAMPLE: any[] } = { BEVERAGE: [], BATCH: [], SAMPLE: [] };

    const beverageMatch = raw.match(/BEVERAGE=\[([\s\S]*?)\](?:, BATCH=|\})/);
    if (beverageMatch && beverageMatch[1]) {
        result.BEVERAGE = parsePropertyList(beverageMatch[1]);
    }

    const batchMatch = raw.match(/BATCH=\[([\s\S]*?)\](?:, SAMPLE=|\})/);
    if (batchMatch && batchMatch[1]) {
        result.BATCH = parsePropertyList(batchMatch[1]);
    }

    const sampleMatch = raw.match(/SAMPLE=\[([\s\S]*?)\](?:\})/);
    if (sampleMatch && sampleMatch[1]) {
        result.SAMPLE = parsePropertyList(sampleMatch[1]);
    }

    return result;
}

function parsePropertyList(str: string) {
    if (!str.trim()) return [];
    const items: any[] = [];
    const itemRegex = /(\w+PropertyResponse)\((.*?)\)(?=, \w+PropertyResponse|\s*$)/g;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(str)) !== null) {
        const typeName = match[1];
        const fieldsStr = match[2];
        const prop: Record<string, any> = { typeName };
        const fieldRegex = /(\w+)=((?:\[.*?\]|[^,]+))/g;
        let fieldMatch: RegExpExecArray | null;
        while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
            const key = fieldMatch[1];
            let val: any = fieldMatch[2].trim();
            if (val === 'null') {
                val = null;
            } else if (val.startsWith('[') && val.endsWith(']')) {
                val = val.slice(1, -1).split(',').map((s: string) => s.trim()).filter(Boolean);
            }
            prop[key] = val;
        }
        items.push(prop);
    }
    return items;
}

export async function getBeverageTypeCharacteristicsAction(typeId: string): Promise<BeverageCharacteristic[]> {
    if (!typeId) return [];
    try {
        const headers = await getActorHeaders();
        const query = `
          query GetEditions($typeId: ID!) {
            beverageTypeEditionsByType(typeId: $typeId) {
              id
              version
              status
              propertySchemas
            }
          }
        `;
        const res = await fetchGraphQLRaw<any, any>(query, { typeId }, headers);
        const editions = res?.beverageTypeEditionsByType || [];
        const activeEdition = editions.find((e: any) => e.status === 'ACTIVE') || editions[0];
        if (!activeEdition || !activeEdition.propertySchemas) return [];

        const parsed = parsePropertySchemas(activeEdition.propertySchemas);
        return (parsed.BEVERAGE || []).map((prop: any) => ({
            id: prop.id || prop.code,
            code: prop.code,
            name: prop.name || prop.code,
            typeName: prop.typeName || '',
            isRequired: prop.isRequired === 'true' || prop.isRequired === true,
            allowedValues: Array.isArray(prop.allowedValues) ? prop.allowedValues : undefined,
            minLimit: prop.minLimit != null ? Number(prop.minLimit) : undefined,
            maxLimit: prop.maxLimit != null ? Number(prop.maxLimit) : undefined,
        }));
    } catch (err) {
        console.error('Failed to fetch beverage type characteristics:', err);
        return [];
    }
}

export async function createBeverageAction(params: {
    name: string;
    typeId: string;
    role?: 'MAKER' | 'BOTTLER';
    color?: string;
    style?: string;
    attributes?: Record<string, any>;
    origin?: { latitude: number; longitude: number } | null;
}) {
    const trimmedName = params.name.trim();
    if (!trimmedName) {
        throw new Error('Beverage name is required');
    }
    if (!params.typeId) {
        throw new Error('Beverage type is required');
    }

    const headers = await getActorHeaders();
    const rawActor = headers.actor;
    const isActorUuid = isUuid(rawActor);
    const actorAuid = !isActorUuid ? parseInt(rawActor, 10) : null;

    const producerRole: 'MAKER' | 'BOTTLER' = params.role === 'BOTTLER' ? 'BOTTLER' : 'MAKER';

    const attributes: Record<string, any> = { ...(params.attributes || {}) };
    if (params.color && params.color.trim()) {
        attributes.color = params.color.trim().toUpperCase();
    }
    if (params.style && params.style.trim()) {
        attributes.style = params.style.trim().toUpperCase();
    }

    const producerInput = isActorUuid
        ? { producerId: rawActor, role: producerRole }
        : { auid: actorAuid !== null && !isNaN(actorAuid) ? [actorAuid] : undefined, role: producerRole };

    const input: any = {
        name: trimmedName,
        typeId: params.typeId,
        producers: [producerInput],
    };

    if (Object.keys(attributes).length > 0) {
        input.attributes = attributes;
    }

    if (params.origin && typeof params.origin.latitude === 'number' && typeof params.origin.longitude === 'number') {
        input.origin = {
            latitude: params.origin.latitude,
            longitude: params.origin.longitude,
        };
    }

    try {
        let res;
        try {
            res = await sdk.DevCreateBeverage({ input }, { headers });
        } catch (firstErr: any) {
            const errMsg = (firstErr?.message || '').toLowerCase();
            if (errMsg.includes('unknown:') && input.attributes) {
                if (errMsg.includes('color')) delete input.attributes.color;
                if (errMsg.includes('style')) delete input.attributes.style;
                if (Object.keys(input.attributes).length === 0) delete input.attributes;
                res = await sdk.DevCreateBeverage({ input }, { headers });
            } else {
                throw firstErr;
            }
        }

        const beverageId = res?.createBeverage?.id;
        if (!beverageId) {
            throw new Error('Failed to create beverage');
        }
        return { success: true, beverageId };
    } catch (err: any) {
        console.error('Server Action Error (createBeverageAction):', err);
        return { success: false, error: err.message || 'Failed to create beverage' };
    }
}

export async function createBeverageTypeAction(params: {
    name: string;
    code: string;
}) {
    const trimmedName = params.name.trim();
    const trimmedCode = params.code.trim().toUpperCase();

    if (!trimmedName) throw new Error('Beverage type name is required');
    if (!trimmedCode) throw new Error('Beverage type code is required');

    const headers = await getActorHeaders();

    try {
        // 1. Create Beverage Type
        const res = await sdk.DevCreateBeverageType({ input: { name: trimmedName, code: trimmedCode } }, { headers });
        const typeId = res?.createBeverageType?.id;
        if (!typeId) {
            throw new Error('Failed to create beverage type');
        }

        // 2. Create Edition (version 1)
        const createEditionQuery = `
          mutation CreateBeverageTypeEdition($input: CreateBeverageTypeEditionInput!) {
            createBeverageTypeEdition(input: $input) { id }
          }
        `;
        const editionRes = await fetchGraphQLRaw<any, any>(createEditionQuery, { input: { typeId, version: 1 } }, headers);
        const editionId = editionRes?.createBeverageTypeEdition?.id;

        if (editionId) {
            // 3. Activate Edition
            const activateEditionQuery = `
              mutation ActivateBeverageTypeEdition($id: ID!) {
                activateBeverageTypeEdition(id: $id) { id }
              }
            `;
            await fetchGraphQLRaw(activateEditionQuery, { id: editionId }, headers);
        }

        // 4. Submit for review
        const submitQuery = `
          mutation SubmitBeverageTypeForReview($id: ID!) {
            submitBeverageTypeForReview(id: $id) { id }
          }
        `;
        await fetchGraphQLRaw(submitQuery, { id: typeId }, headers);

        // 5. Approve
        const approveQuery = `
          mutation ApproveBeverageType($id: ID!) {
            approveBeverageType(id: $id) { id }
          }
        `;
        await fetchGraphQLRaw(approveQuery, { id: typeId }, headers);

        // 6. Publish
        await sdk.DevPublishBeverageType({ id: typeId }, { headers });

        return { success: true, id: typeId };
    } catch (err: any) {
        console.error('Server Action Error (createBeverageTypeAction):', err);
        return { success: false, error: err.message || 'Failed to create beverage type' };
    }
}

export { getBeverageTypesAction };
