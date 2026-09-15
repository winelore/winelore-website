"use server"

import { sdk, fetchGraphQLRaw } from '../../lib/apiClient';
import { revalidatePath } from 'next/cache';
import { GET_TEMPLATE_CATALOG, loadTemplateDetail, toTemplateCatalog } from '@winelore/core/commission';

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
        // Neither field accepts an owner/filter argument on this backend, so
        // ownership is applied by core once the (unfiltered) result comes back.
        const data = await rawGraphQL(GET_TEMPLATE_CATALOG, { limit: 100 });
        const templates = toTemplateCatalog(data?.evaluationTemplateEditions?.items, ownerAuid);
        return { templates, totalCount: templates.length };
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