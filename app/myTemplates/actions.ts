"use server"

import { fetchGraphQLRaw, mutateGraphQLRaw } from '../../lib/apiClient';
import { revalidatePath, unstable_cache } from 'next/cache';
import {
    createEvaluationTemplate,
    loadTemplateDetail,
    loadTemplateForEditor,
    saveEvaluationTemplate,
    toCatalogEdition,
} from '@winelore/core/commission';

// An edition's fields as core's toCatalogEdition reads them.
const TEMPLATE_EDITION_FIELDS = `
    id
    version
    status
    categories {
        id
        name
        properties {
            __typename
            id
            code
            name
            description
            isRequired
            isResult
            ... on IntProperty { intMinLimit: minLimit intMaxLimit: maxLimit intDefaultValue: defaultValue }
            ... on DoubleProperty { doubleMinLimit: minLimit doubleMaxLimit: maxLimit doubleDefaultValue: defaultValue }
            ... on DiscreteNumbersProperty { discreteAllowedValues: allowedValues discreteDefaultValue: defaultValue }
            ... on EnumProperty { enumAllowedValues: allowedValues enumDefaultValue: defaultValue }
            ... on BooleanProperty { boolDefaultValue: defaultValue }
        }
    }
`;

// Was pointed at a stale Railway host over plain HTTP as its ultimate
// fallback; now shares the same endpoint resolution (and transport) as
// every other caller — see lib/graphqlEndpoint.ts.
async function rawGraphQL(query: string, variables?: Record<string, any>) {
    return fetchGraphQLRaw<any, Record<string, any> | undefined>(query, variables);
}

/** Reads as usual; a mutation fails on any error, with the backend's message. */
async function strictSend(query: string, variables: Record<string, unknown>, headers?: Record<string, string>) {
    return query.trimStart().startsWith('mutation')
        ? mutateGraphQLRaw<any>(query, variables, headers)
        : fetchGraphQLRaw<any, Record<string, unknown>>(query, variables, headers);
}

// Public reference data shared across list pages. Failed requests are not cached.
const loadBeverageTypes = unstable_cache(async () => {
    const data = await rawGraphQL(`query GetBeverageTypes {
        beverageTypes { items { id code name status } }
    }`);
    if (!data?.beverageTypes) throw new Error('Missing beverage type catalog');
    return data.beverageTypes.items.filter((item: any) => !item.status || item.status === 'PUBLISHED');
}, ['published-beverage-types-v1'], { revalidate: 60 });

export async function getBeverageTypesAction(): Promise<{ id: string; code: string; name: string }[]> {
    try {
        return await loadBeverageTypes();
    } catch (err) {
        console.error('Failed to fetch beverage types:', err);
        return [];
    }
}

export async function getEvaluationTemplatesAction(ownerAuid?: number, limit: number = 100, offset: number = 0, summaryOnly: boolean = false) {
    try {
        // A page of templates, filtered and counted by the backend; the
        // owner check below stays in case a backend ignores the filter.
        const query = `
            query GetEvaluationTemplates($limit: Int, $offset: Int${ownerAuid !== undefined ? ", $owner: [Int!], $filter: EvaluationTemplateFilterInput" : ""}) {
                evaluationTemplates(limit: $limit, offset: $offset${ownerAuid !== undefined ? ", filter: $filter" : ""}) {
                    items {
                        id
                        name
                        owners
                        beverageType { id code name }
                        status
                        createdAt
                        editions(limit: 1) {
                            ${summaryOnly ? "id version status" : TEMPLATE_EDITION_FIELDS}
                        }
                    }
                }
                evaluationTemplateCount${ownerAuid !== undefined ? "(owner: $owner)" : ""}
            }
        `;

        const variables: Record<string, unknown> = { limit, offset };
        if (ownerAuid !== undefined) {
            variables.owner = [ownerAuid];
            variables.filter = { owners: [[ownerAuid]] };
        }

        const data = await rawGraphQL(query, variables);
        let templates = (data?.evaluationTemplates?.items || []).map((template: any) => {
            const latestEdition = template.editions?.[0];
            return {
                id: template.id,
                name: template.name,
                owners: (template.owners as number[][] | null) ?? [],
                beverageType: template.beverageType?.name ?? template.beverageType?.code ?? "",
                beverageTypeId: template.beverageType?.id ?? "",
                status: template.status,
                createdAt: template.createdAt,
                // Only the latest edition is fetched; the list does not show the count.
                totalEditions: 1,
                latestEdition: latestEdition ? toCatalogEdition(latestEdition) : null,
            };
        });
        if (ownerAuid !== undefined) {
            templates = templates.filter((t: any) => t.owners?.some((owner: number[]) => owner.includes(ownerAuid)));
        }

        return { templates, totalCount: data?.evaluationTemplateCount || 0 };
    } catch (err: any) {
        console.error("❌ Failed to fetch templates from backend:", err.message);
        throw err;
    }
}

export async function createGlobalTemplateAction(
    templateName: string,
    categories: any[],
    ownerAuid: number = 1,
    beverageTypeId: string
) {
    try {
        // The sequence is core's, which the app's template editor runs too.
        const { templateId, editionId } = await createEvaluationTemplate(strictSend, templateName, categories, ownerAuid, beverageTypeId);
        revalidatePath('/myTemplates');
        return { success: true, templateId, editionId };
    } catch (err: any) {
        console.error("❌ Failed to create template on backend:", err.message);
        throw err;
    }
}

/** A template as the editor opens it: its latest edition with its formulas, which the detail leaves out. */
export async function getTemplateForEditorAction(templateId: string) {
    return loadTemplateForEditor(strictSend, templateId);
}

export async function getEvaluationTemplateDetailAction(templateId: string) {
    try {
        // Shaped by core, which the app's template page loads through too.
        const template = await loadTemplateDetail(rawGraphQL, templateId, (err: any) =>
            console.warn("⚠️ evaluationTemplateEditionsByTemplate failed, falling back to full editions scan:", err?.message),
        );
        if (!template) throw new Error(`Template with ID ${templateId} not found`);
        return template;
    } catch (err: any) {
        console.error(`❌ Failed to fetch template detail by id (${templateId}):`, err.message);
        throw err;
    }
}

export async function getTemplateByIdAction(id: string) {
    return getEvaluationTemplateDetailAction(id);
}

export async function updateGlobalTemplateAction(
    templateId: string,
    templateName: string,
    categories: any[],
    _beverageTypeId?: string,
    ownerAuid: number = 1
) {
    try {
        // The name in place, then the next edition, activated — core's, as in the app. The
        // beverage type is not sent: there is no mutation to change it after creation.
        const { editionId } = await saveEvaluationTemplate(strictSend, templateId, templateName, categories, ownerAuid);
        revalidatePath('/myTemplates');
        return { success: true, templateId, editionId };
    } catch (err: any) {
        console.error("❌ Failed to update template on backend:", err.message);
        throw err;
    }
}
