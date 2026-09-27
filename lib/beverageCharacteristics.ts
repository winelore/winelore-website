import { fetchGraphQLRaw } from '@/lib/apiClient';
import { loadCharacteristics, type BeverageCharacteristic, type CharacteristicScope } from '@winelore/core/beverage';

// Parsing a type's schemas is core's, which the app's create forms use too.
export type { BeverageCharacteristic };

export async function fetchBeverageTypeCharacteristics(
    typeId: string,
    scope: CharacteristicScope = 'BEVERAGE',
    headers?: Record<string, string>
): Promise<BeverageCharacteristic[]> {
    try {
        return await loadCharacteristics((query, variables) => fetchGraphQLRaw<any, any>(query, variables, headers), typeId, scope);
    } catch (err) {
        console.error(`Failed to fetch ${scope} characteristics for type ${typeId}:`, err);
        return [];
    }
}
