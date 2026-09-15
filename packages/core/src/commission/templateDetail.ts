import { GET_TEMPLATE_CATALOG, toCatalogEdition, toTemplateCatalog, type CatalogTemplate } from "./templates"

/**
 * A template's own page — the web's /templates/[id] and the app's screen of
 * the same path: the template, every edition of it, and the one shown.
 */

const PROPERTY_FIELDS = `
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
`

export const GET_TEMPLATE_DETAIL = `
    query GetEvaluationTemplateDetail($templateId: ID!) {
        evaluationTemplate(id: $templateId) {
            id
            name
            status
            createdAt
            owners
            beverageType { id code name }
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
                        ${PROPERTY_FIELDS}
                    }
                }
            }
        }
    }
`

export type TemplateEditionDetail = CatalogTemplate["latestEdition"]

export interface TemplateDetail {
    id: string
    name: string
    owners: number[][]
    /** The beverage type's name, or its code. */
    beverageType: string
    beverageTypeId: string
    status: string
    createdAt: string
    /** Newest first. Missing when the template was found only through the catalog. */
    editions?: TemplateEditionDetail[]
    latestEdition: TemplateEditionDetail | null
}

/**
 * A template and its editions. Some backends lack the by-template editions
 * query or return nothing from it; the catalog of every edition stands in
 * then, and last the catalog's own entry for the template. Null when no
 * route finds it.
 */
export async function loadTemplateDetail(
    send: (query: string, variables: Record<string, unknown>) => Promise<any>,
    templateId: string,
    onFallback?: (error: unknown) => void,
): Promise<TemplateDetail | null> {
    let template: any = null
    let items: any[] = []
    try {
        const data = await send(GET_TEMPLATE_DETAIL, { templateId })
        template = data?.evaluationTemplate ?? null
        items = data?.evaluationTemplateEditionsByTemplate?.items || []
    } catch (error) {
        onFallback?.(error)
    }

    let catalogItems: any[] | null = null
    const catalog = async () => (catalogItems ??= (await send(GET_TEMPLATE_CATALOG, { limit: 100 }))?.evaluationTemplateEditions?.items || [])

    if (items.length === 0) {
        items = (await catalog()).filter((item: any) => item.template?.id === templateId)
        if (!template && items.length > 0) template = items[0].template
    }

    if (!template) {
        return (toTemplateCatalog(await catalog()).find((entry) => entry.id === templateId) as TemplateDetail | undefined) ?? null
    }

    const editions = [...items].sort((a, b) => b.version - a.version).map(toCatalogEdition)
    return {
        id: template.id,
        name: template.name,
        owners: (template.owners as number[][] | null) ?? [],
        beverageType: template.beverageType?.name ?? template.beverageType?.code ?? (typeof template.beverageType === "string" ? template.beverageType : ""),
        beverageTypeId: template.beverageType?.id ?? "",
        status: template.status,
        createdAt: template.createdAt,
        editions,
        latestEdition: editions[0] || null,
    }
}

/** A template's editions, newest first. */
export function templateEditions(template: Pick<TemplateDetail, "editions" | "latestEdition">): TemplateEditionDetail[] {
    return template.editions ?? (template.latestEdition ? [template.latestEdition] : [])
}

/** The edition a link asks for by version, else the latest. */
export function templateEditionAt(
    template: Pick<TemplateDetail, "editions" | "latestEdition">,
    version: number | undefined,
): TemplateEditionDetail | null {
    return templateEditions(template).find((edition) => edition.version === version) ?? template.latestEdition ?? null
}

/** Whether a user owns a template, and so may edit it. */
export function isTemplateOwner(owners: number[][] | null | undefined, auid: number | string | null | undefined): boolean {
    if (auid == null || auid === "") return false
    const id = Number(auid)
    return (owners || []).some((owner) => owner?.includes(id))
}
