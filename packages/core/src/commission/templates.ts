/**
 * Evaluation templates on a commission — one per beverage type — and the
 * catalog they are chosen from, as the web's templates block and the app's
 * show them.
 */

type Translate = (key: any, params?: Record<string, string | number>) => string

export interface TemplateBeverageType {
    id: string
    code: string
    name: string
}

export interface TemplateLink {
    id: string
    beverageType: TemplateBeverageType
    templateEdition: any
}

export interface TemplatePropertyView {
    key: string
    name: string
    description?: string
    type: string
    isRequired: boolean
    isResult: boolean
    minLimit?: number
    maxLimit?: number
    allowedValues?: (string | number)[]
    defaultValue?: unknown
}

export interface TemplateCategoryView {
    id: string
    name: string
    properties: TemplatePropertyView[]
}

/**
 * A category list in one shape. Commission editions come straight from
 * GraphQL (per-type aliased fields, `__typename`); catalog editions are
 * already flattened. Both are accepted.
 */
export function normalizeTemplateCategories(categories: any[] | null | undefined): TemplateCategoryView[] {
    return (categories || []).map((category: any) => ({
        id: category.id,
        name: category.name,
        properties: (category.properties || []).map((property: any) => {
            const rawType = property.type ?? (property.__typename ? property.__typename.replace("Property", "") : "")
            return {
                key: property.id || property.code,
                name: property.name,
                description: property.description || undefined,
                type: rawType === "DiscreteNumbers" ? "Discrete" : rawType,
                isRequired: !!property.isRequired,
                isResult: !!property.isResult,
                minLimit: property.minLimit ?? property.intMinLimit ?? property.doubleMinLimit ?? undefined,
                maxLimit: property.maxLimit ?? property.intMaxLimit ?? property.doubleMaxLimit ?? undefined,
                allowedValues: property.allowedValues ?? property.discreteAllowedValues ?? property.enumAllowedValues ?? undefined,
                defaultValue:
                    property.defaultValue ??
                    property.intDefaultValue ??
                    property.doubleDefaultValue ??
                    property.discreteDefaultValue ??
                    property.enumDefaultValue ??
                    property.boolDefaultValue ??
                    undefined,
            }
        }),
    }))
}

export function countTemplateProperties(categories: TemplateCategoryView[]): number {
    return categories.reduce((sum, category) => sum + category.properties.length, 0)
}

const PROPERTY_TYPE_KEYS: Record<string, string> = {
    Int: "templateCreator.typeInt",
    Double: "templateCreator.typeDouble",
    Discrete: "templateCreator.typeDiscrete",
    Enum: "templateCreator.typeEnum",
    Boolean: "templateCreator.typeBoolean",
    Smart: "templateCreator.typeSmart",
}

/** A property type's name in the reader's language. */
export function templatePropertyTypeLabel(type: string, t: Translate): string {
    const key = PROPERTY_TYPE_KEYS[type]
    return key ? t(key) : type
}

/** A property's range, options and default, each as a short phrase. */
export function templatePropertyConstraints(property: TemplatePropertyView, t: Translate): string[] {
    const constraints: string[] = []
    if (property.minLimit !== undefined || property.maxLimit !== undefined) {
        constraints.push(t("commission.propertyRange", { min: property.minLimit ?? "−∞", max: property.maxLimit ?? "∞" }))
    }
    if (property.allowedValues && property.allowedValues.length > 0) {
        constraints.push(t("commission.propertyOptions", { values: property.allowedValues.join(", ") }))
    }
    if (property.defaultValue !== undefined && property.defaultValue !== null) {
        const value =
            typeof property.defaultValue === "boolean" ? t(property.defaultValue ? "common.yes" : "common.no") : String(property.defaultValue)
        constraints.push(t("commission.propertyDefault", { value }))
    }
    return constraints
}

/** Owner auids arrive as int arrays; the first element names the user. */
export function templateOwnerAuids(owners: number[][] | null | undefined): number[] {
    return (owners || []).filter((owner) => owner?.[0] != null).map((owner) => owner[0])
}

export function formatTemplateOwners(owners: number[][] | null | undefined, names: Record<string, string>): string {
    return templateOwnerAuids(owners)
        .map((auid) => names[String(auid)] || String(auid))
        .join(", ")
}

// --- Coverage ---------------------------------------------------------------

export interface TemplateCoverage {
    /** The commission's beverage types, by name. */
    types: TemplateBeverageType[]
    assignedByType: Map<string, TemplateLink>
    assignedCount: number
    fullyConfigured: boolean
}

/** Which of the commission's beverage types have a template. */
export function templateCoverage(types: TemplateBeverageType[], links: TemplateLink[]): TemplateCoverage {
    const assignedByType = new Map<string, TemplateLink>()
    links.forEach((link) => {
        if (link.beverageType?.id) assignedByType.set(link.beverageType.id, link)
    })
    const sorted = [...types].sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code))
    const assignedCount = sorted.filter((type) => assignedByType.get(type.id)?.templateEdition).length
    return { types: sorted, assignedByType, assignedCount, fullyConfigured: sorted.length > 0 && assignedCount === sorted.length }
}

// --- Catalog ----------------------------------------------------------------

export const GET_TEMPLATE_CATALOG = `
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
                    beverageType { id code name }
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
`

export interface CatalogTemplate {
    id: string
    name: string
    owners: number[][]
    beverageType: string
    beverageTypeId: string
    status: string
    createdAt: string
    totalEditions: number
    latestEdition: {
        id: string
        version: number
        status: string
        categories: Array<{
            id: string
            name: string
            properties: Array<{
                id: string
                code: string
                name: string
                description?: string
                type: string
                isRequired: boolean
                isResult: boolean
                minLimit?: number
                maxLimit?: number
                allowedValues?: (string | number)[]
                defaultValue?: unknown
            }>
        }>
    }
}

/** An edition as GET_TEMPLATE_CATALOG returns it, its properties flattened out of their per-type aliases. */
export function toCatalogEdition(item: any): CatalogTemplate["latestEdition"] {
    return {
        id: item.id,
        version: item.version,
        status: item.status,
        categories: (item.categories || []).map((category: any) => ({
            id: category.id,
            name: category.name,
            properties: (category.properties || []).map((property: any) => {
                const typeName = property.__typename ? property.__typename.replace("Property", "") : "Boolean"
                return {
                    id: property.id,
                    code: property.code,
                    name: property.name,
                    description: property.description,
                    type: typeName === "DiscreteNumbers" ? "Discrete" : typeName,
                    isRequired: property.isRequired,
                    isResult: property.isResult ?? false,
                    minLimit: property.intMinLimit ?? property.doubleMinLimit ?? undefined,
                    maxLimit: property.intMaxLimit ?? property.doubleMaxLimit ?? undefined,
                    allowedValues: property.discreteAllowedValues ?? property.enumAllowedValues ?? undefined,
                    defaultValue:
                        property.intDefaultValue ??
                        property.doubleDefaultValue ??
                        property.discreteDefaultValue ??
                        property.enumDefaultValue ??
                        property.boolDefaultValue ??
                        undefined,
                }
            }),
        })),
    }
}

/**
 * The catalog from GET_TEMPLATE_CATALOG's editions: one entry per template,
 * its latest edition flattened, with how many editions it has. With an
 * owner, only that owner's templates.
 */
export function toTemplateCatalog(items: any[] | null | undefined, ownerAuid?: number): CatalogTemplate[] {
    const latest = new Map<string, any>()
    const editionCounts = new Map<string, number>()

    for (const item of items || []) {
        if (!item.template) continue
        const templateId = item.template.id
        editionCounts.set(templateId, (editionCounts.get(templateId) || 0) + 1)
        const existing = latest.get(templateId)
        if (!existing || item.version > existing.version) latest.set(templateId, item)
    }

    const catalog: CatalogTemplate[] = Array.from(latest.values()).map((item: any) => ({
        id: item.template.id,
        name: item.template.name,
        owners: (item.template.owners as number[][] | null) ?? [],
        beverageType: item.template.beverageType?.name ?? item.template.beverageType?.code ?? "",
        beverageTypeId: item.template.beverageType?.id ?? "",
        status: item.template.status,
        createdAt: item.template.createdAt,
        totalEditions: editionCounts.get(item.template.id) || 1,
        latestEdition: toCatalogEdition(item),
    }))

    return ownerAuid === undefined
        ? catalog
        : catalog.filter((template) => template.owners?.some((owner) => owner.includes(ownerAuid)))
}

/** Filter chips: the commission's beverage types first, then the rest of the catalog's. */
export function catalogTypeChips(catalog: CatalogTemplate[] | null, commissionTypeIds: Set<string>): Array<{ id: string; name: string }> {
    const map = new Map<string, string>()
    catalog?.forEach((template) => {
        if (template.beverageTypeId) map.set(template.beverageTypeId, template.beverageType)
    })
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => {
        const aIn = commissionTypeIds.has(a.id)
        const bIn = commissionTypeIds.has(b.id)
        if (aIn !== bIn) return aIn ? -1 : 1
        return a.name.localeCompare(b.name)
    })
}

/**
 * Catalog templates for a type ("all" for any) and a search over name, type
 * and owners — the commission's own types first.
 */
export function filterCatalog(
    catalog: CatalogTemplate[] | null,
    typeFilter: string,
    query: string,
    commissionTypeIds: Set<string>,
    ownerName: (auid: number) => string,
): CatalogTemplate[] {
    const q = query.trim().toLowerCase()
    return (catalog || [])
        .filter((template) => template.latestEdition)
        .filter((template) => typeFilter === "all" || template.beverageTypeId === typeFilter)
        .filter(
            (template) =>
                !q ||
                template.name.toLowerCase().includes(q) ||
                template.beverageType.toLowerCase().includes(q) ||
                template.owners.some((owner) => (owner?.[0] != null ? ownerName(owner[0]) : "").toLowerCase().includes(q)),
        )
        .sort((a, b) => {
            const aIn = commissionTypeIds.has(a.beverageTypeId)
            const bIn = commissionTypeIds.has(b.beverageTypeId)
            if (aIn !== bIn) return aIn ? -1 : 1
            return a.name.localeCompare(b.name)
        })
}
