'use server';

import { cookies } from 'next/headers';
import { sdk, fetchGraphQLRaw, mutateGraphQLRaw } from '@/lib/apiClient';
import { getBeverageTypesAction } from '@/app/myTemplates/actions';
import { createBeverage } from '@winelore/core/beverage';
import { fetchBeverageTypeCharacteristics, type BeverageCharacteristic } from '@/lib/beverageCharacteristics';

async function getActorHeaders(): Promise<Record<string, string>> {
    const cookieStore = await cookies();
    const auid = cookieStore.get('auid')?.value;
    if (!auid) {
        throw new Error('Unauthorized: Please sign in');
    }
    return { 'X-ACTOR': auid };
}

export type { BeverageCharacteristic };

export async function getBeverageTypeCharacteristicsAction(typeId: string): Promise<BeverageCharacteristic[]> {
    if (!typeId) return [];
    try {
        return await fetchBeverageTypeCharacteristics(typeId, 'BEVERAGE', await getActorHeaders());
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
    if (!params.name.trim()) {
        throw new Error('Beverage name is required');
    }
    if (!params.typeId) {
        throw new Error('Beverage type is required');
    }

    const headers = await getActorHeaders();
    const attributes: Record<string, any> = { ...(params.attributes || {}) };
    if (params.color && params.color.trim()) {
        attributes.color = params.color.trim().toUpperCase();
    }
    if (params.style && params.style.trim()) {
        attributes.style = params.style.trim().toUpperCase();
    }

    try {
        // The input and the retry without refused attributes are core's, as in the app.
        // The actor is the X-ACTOR header; this used to read a key the headers do not
        // have, and so sent the new beverage's producer without an auid.
        const beverageId = await createBeverage(
            (query, variables) => mutateGraphQLRaw(query, variables, headers),
            { name: params.name, typeId: params.typeId, role: params.role === 'BOTTLER' ? 'BOTTLER' : 'MAKER', attributes, origin: params.origin },
            headers['X-ACTOR'],
        );
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
