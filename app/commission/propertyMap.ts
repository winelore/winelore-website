import type { GetCommissionTemplatesDeepResult } from "@/lib/commissionTemplatesQuery";

export type PropertyValueKind = "boolean" | "numeric" | "enum" | "discrete" | "text" | "smart";

export type PropertyMeta = {
    name: string;
    isResult: boolean;
    kind: PropertyValueKind;
};

function kindFromTypename(typename: string | undefined): PropertyValueKind {
    switch (typename) {
        case "BooleanProperty":
            return "boolean";
        case "IntProperty":
        case "DoubleProperty":
            return "numeric";
        case "DiscreteNumbersProperty":
            return "discrete";
        case "EnumProperty":
            return "enum";
        case "SmartProperty":
            return "smart";
        default:
            return "text";
    }
}

export function buildPropertyMapFromCommissionTemplates(
    templateResult: GetCommissionTemplatesDeepResult | null | undefined,
): Record<string, PropertyMeta> {
    const propertyMap: Record<string, PropertyMeta> = {};
    const commissionWithTemplates = templateResult?.commission;
    if (!commissionWithTemplates?.templateEditions?.length) {
        return propertyMap;
    }

    const link =
        commissionWithTemplates.templateEditions.find((l) => l.beverageType === "WINE") ||
        commissionWithTemplates.templateEditions[0];
    const templateEdition = link?.templateEdition;
    if (!templateEdition?.categories) {
        return propertyMap;
    }

    for (const cat of templateEdition.categories) {
        if (!cat.properties) continue;
        for (const prop of cat.properties) {
            const meta: PropertyMeta = {
                name: prop.name,
                isResult: (prop as { isResult?: boolean }).isResult === true,
                kind: kindFromTypename((prop as { __typename?: string }).__typename),
            };
            propertyMap[prop.code] = meta;
            if (prop.id) propertyMap[String(prop.id)] = meta;
        }
    }

    return propertyMap;
}
