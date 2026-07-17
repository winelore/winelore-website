"use server"

import { sdk } from '../../lib/apiClient';
import { revalidatePath } from 'next/cache';

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://switchback.proxy.rlwy.net:43233/graphql';

async function rawGraphQL(query: string, variables?: Record<string, any>) {
    const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: 0 },
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message || 'GraphQL error');
    return json.data;
}

export async function getBeverageTypesAction(): Promise<{ id: string; code: string; name: string }[]> {
    try {
        const query = `
            query GetBeverageTypes {
                beverageTypes {
                    items {
                        id
                        code
                        name
                    }
                }
            }
        `;
        const data = await rawGraphQL(query);
        return data?.beverageTypes?.items || [];
    } catch (err: any) {
        console.error("❌ Failed to fetch beverage types:", err.message);
        return [];
    }
}

export async function getEvaluationTemplatesAction() {
    try {
        const query = `
            query GetEvaluationTemplateEditions($limit: Int) {
                evaluationTemplateEditions(limit: $limit) {
                    items {
                        id
                        version
                        status
                        template {
                            id
                            name
                            owners
                            beverageType {
                                id
                                code
                                name
                            }
                            status
                            createdAt
                        }
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
                                ... on IntProperty {
                                    intMinLimit: minLimit
                                    intMaxLimit: maxLimit
                                    intDefaultValue: defaultValue
                                }
                                ... on DoubleProperty {
                                    doubleMinLimit: minLimit
                                    doubleMaxLimit: maxLimit
                                    doubleDefaultValue: defaultValue
                                }
                                ... on DiscreteNumbersProperty {
                                    discreteAllowedValues: allowedValues
                                    discreteDefaultValue: defaultValue
                                }
                                ... on EnumProperty {
                                    enumAllowedValues: allowedValues
                                    enumDefaultValue: defaultValue
                                }
                                ... on BooleanProperty {
                                    boolDefaultValue: defaultValue
                                }
                            }
                        }
                    }
                }
            }
        `;
        const data = await rawGraphQL(query, { limit: 100 });
        const items = data?.evaluationTemplateEditions?.items || [];

        const latestTemplatesMap = new Map<string, any>();

        for (const item of items) {
            if (!item.template) continue;
            const templateId = item.template.id;
            const existing = latestTemplatesMap.get(templateId);

            if (!existing || item.version > existing.version) {
                latestTemplatesMap.set(templateId, item);
            }
        }

        return Array.from(latestTemplatesMap.values()).map((item: any) => ({
            id: item.template.id,
            name: item.template.name,
            owners: (item.template.owners as number[][] | null) ?? [],
            beverageType: item.template.beverageType?.name ?? item.template.beverageType?.code ?? "",
            beverageTypeId: item.template.beverageType?.id ?? "",
            status: item.template.status,
            createdAt: item.template.createdAt,
            latestEdition: {
                id: item.id,
                version: item.version,
                status: item.status,
                categories: item.categories.map((cat: any) => ({
                    id: cat.id,
                    name: cat.name,
                    properties: cat.properties.map((prop: any) => {
                        const typeName = prop.__typename ? prop.__typename.replace("Property", "") : "Boolean";
                        return {
                            id: prop.id,
                            code: prop.code,
                            name: prop.name,
                            description: prop.description,
                            type: typeName === "DiscreteNumbers" ? "Discrete" : typeName,
                            isRequired: prop.isRequired,
                            isResult: prop.isResult ?? false,
                            minLimit: prop.intMinLimit ?? prop.doubleMinLimit ?? undefined,
                            maxLimit: prop.intMaxLimit ?? prop.doubleMaxLimit ?? undefined,
                            allowedValues: prop.discreteAllowedValues ?? prop.enumAllowedValues ?? undefined,
                            defaultValue: prop.intDefaultValue ?? prop.doubleDefaultValue ?? prop.discreteDefaultValue ?? prop.enumDefaultValue ?? prop.boolDefaultValue ?? undefined,
                        };
                    })
                }))
            }
        }));
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
        console.log(`🚀 Creating global template "${templateName}"...`);
        
        const actorHeaders = { 'X-ACTOR': String(ownerAuid) };
        const templateRes = await sdk.CreateEvaluationTemplate({
            input: {
                name: templateName,
                beverageTypeId,
                owners: [[ownerAuid]]
            }
        }, { headers: actorHeaders });
        const templateId = templateRes.createEvaluationTemplate.id;
        console.log(`  Created template: ${templateId}`);

        const editionRes = await sdk.CreateEvaluationTemplateEdition({
            input: {
                templateId,
                version: 1,
                categories
            }
        }, { headers: actorHeaders });
        const editionId = editionRes.createEvaluationTemplateEdition.id;
        console.log(`  Created template edition: ${editionId}`);

        await sdk.ActivateEvaluationTemplateEdition({ id: editionId }, { headers: actorHeaders });
        console.log(`  Activated template edition: ${editionId}`);

        revalidatePath('/templates');

        return { success: true, templateId, editionId };
    } catch (err: any) {
        console.error("❌ Failed to create template on backend:", err.message);
        throw err;
    }
}

export async function getTemplateByIdAction(id: string) {
    try {
        const allTemplates = await getEvaluationTemplatesAction();
        const template = allTemplates.find((t) => t.id === id);
        
        if (!template) {
            throw new Error(`Template with ID ${id} not found`);
        }
        return template;
    } catch (err: any) {
        console.error(`❌ Failed to fetch template by id (${id}):`, err.message);
        throw err;
    }
}

export async function updateGlobalTemplateAction(
    templateId: string,
    templateName: string,
    categories: any[],
    beverageTypeId?: string,
    ownerAuid: number = 1
) {
    try {
        console.log(`🔄 Updating global template "${templateId}"...`);
        const actorHeaders = { 'X-ACTOR': String(ownerAuid) };

        if (sdk.UpdateEvaluationTemplate) {
            await sdk.UpdateEvaluationTemplate({
                id: templateId,
                input: {
                    name: templateName,
                    ...(beverageTypeId && { beverageTypeId })
                }
            }, { headers: actorHeaders });
        }

        const currentTemplate = await getTemplateByIdAction(templateId);
        const nextVersion = (currentTemplate?.latestEdition?.version || 1) + 1;

        const editionRes = await sdk.CreateEvaluationTemplateEdition({
            input: {
                templateId,
                version: nextVersion,
                categories
            }
        }, { headers: actorHeaders });
        
        const editionId = editionRes.createEvaluationTemplateEdition.id;
        console.log(`  Created new template edition: ${editionId} (v${nextVersion})`);

        await sdk.ActivateEvaluationTemplateEdition({ id: editionId }, { headers: actorHeaders });
        console.log(`  Activated new template edition: ${editionId}`);

        revalidatePath('/templates');

        return { success: true, templateId, editionId };
    } catch (err: any) {
        console.error("❌ Failed to update template on backend:", err.message);
        throw err;
    }
}