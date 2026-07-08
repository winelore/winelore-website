import type { GetCommissionTemplatesDeepResult } from "./commissionTemplatesQuery"
import type { TemplateEdition } from "./evaluationScores"

export function buildTemplateEditionById(
    templateResult: GetCommissionTemplatesDeepResult | null | undefined,
): Record<string, TemplateEdition> {
    const map: Record<string, TemplateEdition> = {}
    const links = templateResult?.commission?.templateEditions ?? []
    for (const link of links) {
        const edition = link.templateEdition
        if (edition?.id) {
            map[edition.id] = edition as TemplateEdition
        }
    }
    return map
}
