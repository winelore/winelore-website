import { StyleSheet, Text, View } from "react-native"
import {
    templatePropertyConstraints,
    templatePropertyTypeLabel,
    type TemplateCategoryView,
} from "@winelore/core/commission"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius } from "../theme"

/**
 * A template's categories and their properties — each property's name,
 * whether it is required or a result, its type and its range or options.
 */
export function TemplateStructure({ categories }: { categories: TemplateCategoryView[] }) {
    const { t, tCount } = useTranslation()
    return (
        <View style={styles.list}>
            {categories.map((category) => (
                <View key={category.id} style={styles.category}>
                    <View style={styles.categoryHead}>
                        <Text style={styles.categoryName} numberOfLines={1}>
                            {category.name}
                        </Text>
                        <Text style={styles.categoryCount}>{tCount("commission.propertiesCount", category.properties.length)}</Text>
                    </View>
                    {category.properties.map((property) => {
                        const constraints = templatePropertyConstraints(property, t)
                        return (
                            <View key={property.key} style={styles.property}>
                                <View style={styles.propertyHead}>
                                    <View style={styles.propertyName}>
                                        <Text style={styles.propertyLabel} numberOfLines={1}>
                                            {property.name}
                                        </Text>
                                        {property.isRequired ? <Text style={styles.required}>*</Text> : null}
                                        {property.isResult ? (
                                            <View style={styles.result}>
                                                <Text style={styles.resultLabel}>{t("commission.resultBadge")}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <View style={styles.type}>
                                        <Text style={styles.typeLabel}>{templatePropertyTypeLabel(property.type, t)}</Text>
                                    </View>
                                </View>
                                {constraints.length > 0 ? (
                                    <Text style={styles.constraints} numberOfLines={2}>
                                        {constraints.join(" · ")}
                                    </Text>
                                ) : null}
                            </View>
                        )
                    })}
                </View>
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    list: { gap: 12 },
    category: {
        gap: 8,
        padding: 14,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        ...continuous,
    },
    categoryHead: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: palette.borderSoft,
    },
    categoryName: { flex: 1, fontSize: 12, fontWeight: "700", color: palette.heading },
    categoryCount: { fontSize: 10, fontWeight: "600", color: palette.textFaint },
    property: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: "rgba(241, 245, 249, 0.8)",
        backgroundColor: "rgba(248, 250, 252, 0.6)",
    },
    propertyHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    propertyName: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 4 },
    propertyLabel: { flexShrink: 1, fontSize: 11, fontWeight: "700", color: palette.textStrong },
    required: { fontSize: 11, fontWeight: "700", color: palette.danger },
    result: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, backgroundColor: palette.accentBorder },
    resultLabel: { fontSize: 8, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.accent },
    type: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: "rgba(226, 232, 240, 0.6)", backgroundColor: palette.surface },
    typeLabel: { fontSize: 9, fontWeight: "600", color: palette.textMuted },
    constraints: { marginTop: 2, fontSize: 10, fontWeight: "500", color: palette.textFaint },
})
