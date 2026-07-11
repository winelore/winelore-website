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
                            }
                        }
                    }
                }
            }
        `;
        const data = await rawGraphQL(query, { limit: 50 });
        const items = data?.evaluationTemplateEditions?.items || [];

        // Map editions to templates
        return items.map((item: any) => ({
            id: item.template.id,
            name: item.template.name,
            beverageType: item.template.beverageType?.name ?? item.template.beverageType?.code ?? "",
            status: item.template.status,
            createdAt: item.template.createdAt,
            latestEdition: {
                id: item.id,
                version: item.version,
                status: item.status,
                categories: item.categories.map((cat: any) => ({
                    id: cat.id,
                    name: cat.name,
                    properties: cat.properties.map((prop: any) => ({
                        id: prop.id,
                        code: prop.code,
                        name: prop.name,
                        description: prop.description,
                        type: prop.__typename ? prop.__typename.replace("Property", "") : "Boolean",
                        isRequired: prop.isRequired
                    }))
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
        
        // 1. Create evaluation template
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

        // 2. Create template edition
        const editionRes = await sdk.CreateEvaluationTemplateEdition({
            input: {
                templateId,
                version: 1,
                categories
            }
        }, { headers: actorHeaders });
        const editionId = editionRes.createEvaluationTemplateEdition.id;
        console.log(`  Created template edition: ${editionId}`);

        // 3. Activate the edition
        await sdk.ActivateEvaluationTemplateEdition({ id: editionId }, { headers: actorHeaders });
        console.log(`  Activated template edition: ${editionId}`);

        revalidatePath('/templates');

        return { success: true, templateId, editionId };
    } catch (err: any) {
        console.error("❌ Failed to create template on backend:", err.message);
        throw err;
    }
}
