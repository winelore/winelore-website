import { StyleSheet, Text, View } from "react-native"
import type { TechnicalSpec } from "@winelore/core/beverage"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius } from "../theme"
import { EmptyCard, SectionTitle } from "./parts"

/** "Technical Specs": the beverage's attributes as a two-column table. */
export function SpecsTab({ specs }: { specs: TechnicalSpec[] }) {
    const { t } = useTranslation()
    return (
        <View style={styles.tab}>
            <SectionTitle title={t("beverage.specs.title")} subtitle={t("beverage.specs.subtitle")} />
            {specs.length > 0 ? (
                <View style={styles.table}>
                    <View style={[styles.row, styles.headRow]}>
                        <Text style={[styles.cell, styles.headCell]}>{t("beverage.specs.key")}</Text>
                        <Text style={[styles.cell, styles.headCell]}>{t("beverage.specs.value")}</Text>
                    </View>
                    {specs.map((spec, index) => (
                        <View key={`${spec.key}-${index}`} style={[styles.row, index > 0 && styles.divided]}>
                            <Text style={[styles.cell, styles.key]}>{spec.key}</Text>
                            <Text style={[styles.cell, styles.value]} selectable>
                                {spec.value}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : (
                <EmptyCard icon="series" title={t("beverage.specs.emptyTitle")} description={t("beverage.specs.emptyDesc")} />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    tab: { gap: 16 },
    table: {
        overflow: "hidden",
        borderRadius: radius.hero,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        ...continuous,
    },
    row: { flexDirection: "row" },
    headRow: { borderBottomWidth: 1, borderBottomColor: palette.borderSoft, backgroundColor: "rgba(248, 250, 252, 0.5)" },
    divided: { borderTopWidth: 1, borderTopColor: palette.borderSoft },
    cell: { flex: 1, paddingHorizontal: 20, paddingVertical: 16, fontSize: 12 },
    headCell: { fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    key: { fontWeight: "700", textTransform: "capitalize", color: palette.textMuted },
    value: { fontWeight: "600", color: palette.heading },
})
