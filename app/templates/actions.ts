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

export async function getEvaluationTemplatesAction(ownerAuid?: number, limit: number = 100, cursor?: string, offset?: number) {
    try {
        const query = `
            query GetEvaluationTemplates($limit: Int, $cursor: ID, $offset: Int, $filter: EvaluationTemplateFilterInput, $owner: [Int!]) {
                evaluationTemplates(limit: $limit, cursor: $cursor, offset: $offset, filter: $filter) {
                    items {
                        id
                        name
                        owners
                        status
                        createdAt
                        beverageType {
                            id
                            code
                            name
                        }
                        editions(limit: 1) {
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
                                    ... on SmartProperty {
                                        expression {
                                            __typename
                                            type
                                            ... on ConstantExpression { value }
                                            ... on VariableExpression { code }
                                            ... on BinaryExpression {
                                                left {
                                                    __typename
                                                    type
                                                    ... on ConstantExpression { value }
                                                    ... on VariableExpression { code }
                                                }
                                                right {
                                                    __typename
                                                    type
                                                    ... on ConstantExpression { value }
                                                    ... on VariableExpression { code }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                evaluationTemplateCount(owner: $owner)
            }
        `;
        const variables: any = { limit };
        if (ownerAuid) {
            variables.filter = { owners: [[ownerAuid]] };
            variables.owner = [ownerAuid];
        }
        if (cursor) {
            variables.cursor = cursor;
        } else if (offset !== undefined) {
            variables.offset = offset;
        }

        const data = await rawGraphQL(query, variables);
        const items = data?.evaluationTemplates?.items || [];

        const templates = items.map((template: any) => {
            const latestEdition = template.editions && template.editions.length > 0 ? template.editions[0] : null;
            return {
                id: template.id,
                name: template.name,
                owners: (template.owners as number[][] | null) ?? [],
                beverageType: template.beverageType?.name ?? template.beverageType?.code ?? "",
                beverageTypeId: template.beverageType?.id ?? "",
                status: template.status,
                createdAt: template.createdAt,
                latestEdition: latestEdition ? {
                    id: latestEdition.id,
                    version: latestEdition.version,
                    status: latestEdition.status,
                    categories: latestEdition.categories.map((cat: any) => ({
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
                                expression: prop.expression ?? undefined,
                            };
                        })
                    }))
                } : null
            };
        });

        return {
            templates,
            rawItems: items,
            totalCount: data?.evaluationTemplateCount || 0
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

        revalidatePath('/templates');

        return { success: true, templateId, editionId };
    } catch (err: any) {
        console.error("❌ Failed to create template on backend:", err.message);
        throw err;
    }
}

export async function getTemplateByIdAction(id: string) {
    try {
        const query = `
            query GetTemplateById($id: ID!) {
                evaluationTemplate(id: $id) {
                    id
                    name
                    owners
                    status
                    createdAt
                    beverageType {
                        id
                        code
                        name
                    }
                    editions(limit: 1) {
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
                                ... on SmartProperty {
                                    expression {
                                        __typename
                                        type
                                        ... on ConstantExpression { value }
                                        ... on VariableExpression { code }
                                        ... on BinaryExpression {
                                            left {
                                                __typename
                                                type
                                                ... on ConstantExpression { value }
                                                ... on VariableExpression { code }
                                            }
                                            right {
                                                __typename
                                                type
                                                ... on ConstantExpression { value }
                                                ... on VariableExpression { code }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const data = await rawGraphQL(query, { id });
        const template = data?.evaluationTemplate;

        if (!template) {
            throw new Error(`Template with ID ${id} not found`);
        }

        const latestEdition = template.editions && template.editions.length > 0 ? template.editions[0] : null;

        return {
            id: template.id,
            name: template.name,
            owners: (template.owners as number[][] | null) ?? [],
            beverageType: template.beverageType?.name ?? template.beverageType?.code ?? "",
            beverageTypeId: template.beverageType?.id ?? "",
            status: template.status,
            createdAt: template.createdAt,
            latestEdition: latestEdition ? {
                id: latestEdition.id,
                version: latestEdition.version,
                status: latestEdition.status,
                categories: latestEdition.categories.map((cat: any) => ({
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
                            expression: prop.expression ?? undefined,
                        };
                    })
                }))
            } : null
        };
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