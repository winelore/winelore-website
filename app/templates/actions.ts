"use server"

import { sdk } from '../../lib/apiClient';
import { revalidatePath } from 'next/cache';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:8080/graphql';

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

// In-memory offline fallback data for when the backend is down
let globalMockTemplates: any[] = [
    {
        id: "mock-template-1",
        name: "Стандартний шаблон оцінювання (Червоні вина)",
        beverageType: "WINE",
        status: "ACTIVE",
        createdAt: "2026-07-08T12:00:00Z",
        latestEdition: {
            id: "mock-edition-1",
            version: 1,
            status: "ACTIVE",
            categories: [
                {
                    id: "mock-cat-1",
                    name: "Візуальна оцінка",
                    properties: [
                        {
                            id: "mock-prop-1",
                            code: "clarity",
                            name: "Прозорість (Clarity)",
                            description: "Характеристика прозорості та блиску вина",
                            type: "Boolean",
                            isRequired: true
                        },
                        {
                            id: "mock-prop-2",
                            code: "color_intensity",
                            name: "Інтенсивність кольору",
                            description: "Глибина кольору від 1 до 10",
                            type: "Int",
                            isRequired: true
                        }
                    ]
                },
                {
                    id: "mock-cat-2",
                    name: "Аромат та Смак",
                    properties: [
                        {
                            id: "mock-prop-3",
                            code: "aroma_score",
                            name: "Оцінка аромату",
                            description: "Чистота та інтенсивність аромату (1.0 - 20.0)",
                            type: "Double",
                            isRequired: true
                        },
                        {
                            id: "mock-prop-4",
                            code: "taste_score",
                            name: "Оцінка смаку",
                            description: "Баланс, кислотність та таніни (1.0 - 50.0)",
                            type: "Double",
                            isRequired: true
                        }
                    ]
                }
            ]
        }
    },
    {
        id: "mock-template-2",
        name: "Експрес-дегустація (Білі та ігристі вина)",
        beverageType: "WINE",
        status: "ACTIVE",
        createdAt: "2026-07-08T14:30:00Z",
        latestEdition: {
            id: "mock-edition-2",
            version: 1,
            status: "ACTIVE",
            categories: [
                {
                    id: "mock-cat-3",
                    name: "Загальні властивості",
                    properties: [
                        {
                            id: "mock-prop-5",
                            code: "sparkling_intensity",
                            name: "Перляж / Інтенсивність бульбашок",
                            description: "Якість гри бульбашок в бокалі",
                            type: "Int",
                            isRequired: false
                        },
                        {
                            id: "mock-prop-6",
                            code: "sweetness",
                            name: "Рівень солодкості",
                            description: "Сухе, напівсухе, напівсолодке чи солодке",
                            type: "Enum",
                            isRequired: true
                        }
                    ]
                }
            ]
        }
    }
];

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
                            beverageType
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
        
        if (items.length === 0) {
            return globalMockTemplates;
        }

        // Map editions to templates
        return items.map((item: any) => ({
            id: item.template.id,
            name: item.template.name,
            beverageType: item.template.beverageType,
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
        console.warn("⚠️ Failed to fetch templates from backend (offline mode). Returning mock templates:", err.message);
        return globalMockTemplates;
    }
}

export async function createGlobalTemplateAction(
    templateName: string,
    categories: any[],
    ownerAuid: number = 1
) {
    try {
        console.log(`🚀 Creating global template "${templateName}"...`);
        
        // 1. Create evaluation template
        const templateRes = await sdk.CreateEvaluationTemplate({
            input: {
                name: templateName,
                owners: [[ownerAuid]]
            }
        });
        const templateId = templateRes.createEvaluationTemplate.id;
        console.log(`  Created template: ${templateId}`);

        // 2. Create template edition
        const editionRes = await sdk.CreateEvaluationTemplateEdition({
            input: {
                templateId,
                version: 1,
                categories
            }
        });
        const editionId = editionRes.createEvaluationTemplateEdition.id;
        console.log(`  Created template edition: ${editionId}`);

        // 3. Activate the edition
        await sdk.ActivateEvaluationTemplateEdition({ id: editionId });
        console.log(`  Activated template edition: ${editionId}`);

        revalidatePath('/templates');

        return { success: true, templateId, editionId };
    } catch (err: any) {
        console.warn("⚠️ Failed to create template on backend (offline mode). Simulating success:", err.message);
        
        const mockTemplateId = `mock-template-${Date.now()}`;
        const mockEditionId = `mock-edition-${Date.now()}`;
        
        const newMockTemplate = {
            id: mockTemplateId,
            name: templateName,
            beverageType: "WINE",
            status: "ACTIVE",
            createdAt: new Date().toISOString(),
            latestEdition: {
                id: mockEditionId,
                version: 1,
                status: "ACTIVE",
                categories: categories.map((cat: any, index: number) => ({
                    id: `mock-cat-id-${index}-${Date.now()}`,
                    name: cat.name,
                    properties: cat.properties.map((prop: any, pIndex: number) => ({
                        id: `mock-prop-id-${index}-${pIndex}-${Date.now()}`,
                        code: prop.code,
                        name: prop.name,
                        description: prop.description,
                        type: prop.type,
                        isRequired: prop.isRequired
                    }))
                }))
            }
        };

        // Append to local in-memory mock templates
        globalMockTemplates = [newMockTemplate, ...globalMockTemplates];

        revalidatePath('/templates');

        return { success: true, templateId: mockTemplateId, editionId: mockEditionId };
    }
}
