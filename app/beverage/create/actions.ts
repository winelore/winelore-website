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

export async function createBeverageAction(params: {
    name: string;
    typeId: string;
    role?: 'MAKER' | 'BOTTLER';
    color?: string;
    style?: string;
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
    const actorAuid = parseInt(headers.actor, 10);
    const producerRole: 'MAKER' | 'BOTTLER' = params.role === 'BOTTLER' ? 'BOTTLER' : 'MAKER';

    const attributes: Record<string, any> = {};
    if (params.color && params.color.trim()) {
        attributes.color = params.color.trim().toUpperCase();
    }
    if (params.style && params.style.trim()) {
        attributes.style = params.style.trim().toUpperCase();
    }

    const input: any = {
        name: trimmedName,
        typeId: params.typeId,
        producers: [{ auid: [actorAuid], role: producerRole }],
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
