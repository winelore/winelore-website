import type { EvaluationCategory } from "./types"

/** One beverage-type-to-template link on a commission. */
export interface CommissionTemplateLink {
    id?: string
    beverageType?: { id?: string; code?: string | null; name?: string } | null
    templateEdition?: {
        id?: string
        categories?: Array<{
            id?: string
            name?: string
            properties?: Array<{ id?: string; code?: string; name?: string }>
        }> | null
    } | null
}

/**
 * Whether a template edition is complete enough to score against.
 *
 * A commission in setup can carry a half-built template — categories with no
 * properties, or properties missing a code. Rendering one gives a judge a
 * scorecard they cannot submit, so incomplete editions are treated as absent.
 */
export function isUsableTemplateEdition(link: CommissionTemplateLink): boolean {
    const categories = link.templateEdition?.categories
    if (!categories?.length) return false

    return categories.every(
        (category) =>
            Boolean(category.properties?.length) &&
            category.properties!.every((property) => property.id && property.code && property.name),
    )
}

/**
 * Pick the template edition a commission evaluates against.
 *
 * Wine is preferred where a commission carries several beverage types,
 * matching the web app; otherwise the first usable edition wins. Returns null
 * when none is usable, which the UI shows as "no template configured" rather
 * than an empty scorecard.
 */
export function selectEvaluationTemplateEdition(
    links: CommissionTemplateLink[] | null | undefined,
): CommissionTemplateLink["templateEdition"] | null {
    const usable = (links ?? []).filter(isUsableTemplateEdition)
    if (usable.length === 0) return null

    const wine = usable.find((link) => link.beverageType?.code === "WINE")
    return (wine ?? usable[0]).templateEdition ?? null
}

/** The categories to render, or an empty list when no template is usable. */
export function selectEvaluationCategories(
    links: CommissionTemplateLink[] | null | undefined,
): EvaluationCategory[] {
    return (selectEvaluationTemplateEdition(links)?.categories ?? []) as EvaluationCategory[]
}
