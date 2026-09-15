"use server"

import { fetchGraphQLRaw, mutateGraphQLRaw } from '../../lib/apiClient';
import { revalidatePath } from 'next/cache';
import {
    GET_TEMPLATE_CATALOG,
    createEvaluationTemplate,
    loadTemplateDetail,
    loadTemplateForEditor,
    saveEvaluationTemplate,
    toTemplateCatalog,
} from '@winelore/core/commission';

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
