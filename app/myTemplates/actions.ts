"use server"

import { sdk, fetchGraphQLRaw } from '../../lib/apiClient';
import { revalidatePath } from 'next/cache';

// Was pointed at a stale Railway host over plain HTTP as its ultimate
// fallback; now shares the same endpoint resolution (and transport) as
// every other caller — see lib/graphqlEndpoint.ts.
async function rawGraphQL(query: string, variables?: Record<string, any>) {
    return fetchGraphQLRaw<any, Record<string, any> | undefined>(query, variables);
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
                        status
                    }
                }
            }
        `;
        const data = await rawGraphQL(query);
        const items = data?.beverageTypes?.items || [];
        return items.filter((item: any) => !item.status || item.status === 'PUBLISHED');
    } catch (err: any) {
        console.error("❌ Failed to fetch beverage types:", err.message);
        return [];
    }
}

export async function getEvaluationTemplatesAction(ownerAuid?: number) {
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
                evaluationTemplateCount
            }
        `;
        // Note: neither field accepts an owner/filter argument on this backend, so
        // ownership is applied below once the (unfiltered) result comes back.
        const variables: any = { limit: 100 };
        const data = await rawGraphQL(query, variables);
        const items = data?.evaluationTemplateEditions?.items || [];

        const latestTemplatesMap = new Map<string, any>();
        const editionCountsMap = new Map<string, number>();

        for (const item of items) {
            if (!item.template) continue;
            const templateId = item.template.id;
            editionCountsMap.set(templateId, (editionCountsMap.get(templateId) || 0) + 1);

            const existing = latestTemplatesMap.get(templateId);
            if (!existing || item.version > existing.version) {
                latestTemplatesMap.set(templateId, item);
            }
        }

        let templatesList = Array.from(latestTemplatesMap.values()).map((item: any) => ({
            id: item.template.id,
            name: item.template.name,
            owners: (item.template.owners as number[][] | null) ?? [],
            beverageType: item.template.beverageType?.name ?? item.template.beverageType?.code ?? "",
            beverageTypeId: item.template.beverageType?.id ?? "",
            status: item.template.status,
            createdAt: item.template.createdAt,
            totalEditions: editionCountsMap.get(item.template.id) || 1,
            latestEdition: {
                id: item.id,
                version: item.version,
                status: item.status,
                categories: (item.categories || []).map((cat: any) => ({
                    id: cat.id,
                    name: cat.name,
                    properties: (cat.properties || []).map((prop: any) => {
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

        if (ownerAuid !== undefined) {
            templatesList = templatesList.filter((t) =>
                t.owners?.some((ownerArr: number[]) => ownerArr.includes(ownerAuid))
            );
        }
        }

        return {
            templates: templatesList,
            totalCount: templatesList.length
        };
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

        revalidatePath('/myTemplates');

        return { success: true, templateId, editionId };
    } catch (err: any) {
        console.error("❌ Failed to create template on backend:", err.message);
        throw err;
    }
}

export async function getEvaluationTemplateDetailAction(templateId: string) {
    try {
        const query = `
            query GetEvaluationTemplateDetail($templateId: ID!) {
                evaluationTemplate(id: $templateId) {
                    id
                    name
                    status
                    createdAt
                    owners
                    beverageType {
                        id
                        code
                        name
                    }
                }
                evaluationTemplateEditionsByTemplate(templateId: $templateId, limit: 100) {
                    items {
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

        let templateData: any = null;
        let editionsItems: any[] = [];

        try {
            const data = await rawGraphQL(query, { templateId });
            templateData = data?.evaluationTemplate;
            editionsItems = data?.evaluationTemplateEditionsByTemplate?.items || [];
        } catch (err: any) {
            console.warn("⚠️ evaluationTemplateEditionsByTemplate failed, falling back to full editions scan:", err.message);
        }

        // Fallback: if editions empty or query failed, fetch evaluationTemplateEditions
        if (!editionsItems || editionsItems.length === 0) {
            const fallbackQuery = `
                query GetAllEditionsForTemplate($limit: Int) {
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
            const data = await rawGraphQL(fallbackQuery, { limit: 100 });
            const allItems = data?.evaluationTemplateEditions?.items || [];

            const matchedEditions = allItems.filter((item: any) => item.template?.id === templateId);
            editionsItems = matchedEditions;

            if (!templateData && matchedEditions.length > 0) {
                const firstTpl = matchedEditions[0].template;
                templateData = {
                    id: firstTpl.id,
                    name: firstTpl.name,
                    status: firstTpl.status,
                    createdAt: firstTpl.createdAt,
                    owners: firstTpl.owners,
                    beverageType: firstTpl.beverageType,
                };
            }
        }

        if (!templateData) {
            // Fallback 2: try getEvaluationTemplatesAction
            const res = await getEvaluationTemplatesAction();
            const found = res.templates.find((t) => t.id === templateId);
            if (found) {
                return found;
            }
            throw new Error(`Template with ID ${templateId} not found`);
        }

        // Sort editions by version descending (v3, v2, v1)
        editionsItems.sort((a: any, b: any) => b.version - a.version);

        const editionsFormatted = editionsItems.map((item: any) => ({
            id: item.id,
            version: item.version,
            status: item.status,
            categories: (item.categories || []).map((cat: any) => ({
                id: cat.id,
                name: cat.name,
                properties: (cat.properties || []).map((prop: any) => {
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
        }));

        return {
            id: templateData.id,
            name: templateData.name,
            owners: (templateData.owners as number[][] | null) ?? [],
            beverageType: templateData.beverageType?.name ?? templateData.beverageType?.code ?? (typeof templateData.beverageType === 'string' ? templateData.beverageType : ""),
            beverageTypeId: templateData.beverageType?.id ?? "",
            status: templateData.status,
            createdAt: templateData.createdAt,
            editions: editionsFormatted,
            latestEdition: editionsFormatted[0] || null,
        };
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
    beverageTypeId?: string,
    ownerAuid: number = 1
) {
    try {
        console.log(`🔄 Updating global template "${templateId}"...`);
        const actorHeaders = { 'X-ACTOR': String(ownerAuid) };

        // Note: beverageTypeId is intentionally not sent — there's no mutation
        // to change it after creation, and the editor keeps that field locked
        // for existing templates for the same reason.
        await sdk.ChangeEvaluationTemplateName({ id: templateId, newName: templateName }, { headers: actorHeaders });

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

        revalidatePath('/myTemplates');

        return { success: true, templateId, editionId };
    } catch (err: any) {
        console.error("❌ Failed to update template on backend:", err.message);
        throw err;
    }
}