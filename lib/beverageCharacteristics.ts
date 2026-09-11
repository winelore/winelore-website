import { fetchGraphQLRaw } from '@/lib/apiClient';

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

export interface ParsedPropertySchemas {
    BEVERAGE: any[];
    BATCH: any[];
    SAMPLE: any[];
}

export function parsePropertySchemas(raw: string): ParsedPropertySchemas {
    if (!raw) return { BEVERAGE: [], BATCH: [], SAMPLE: [] };
    const result: ParsedPropertySchemas = { BEVERAGE: [], BATCH: [], SAMPLE: [] };

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

export function parsePropertyList(str: string) {
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

export async function fetchBeverageTypeCharacteristics(
    typeId: string,
    scope: 'BEVERAGE' | 'BATCH' | 'SAMPLE' = 'BEVERAGE',
    headers?: Record<string, string>
): Promise<BeverageCharacteristic[]> {
    if (!typeId) return [];
    try {
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
        const list = parsed[scope] || [];
        return list.map((prop: any) => ({
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
        console.error(`Failed to fetch ${scope} characteristics for type ${typeId}:`, err);
        return [];
    }
}
