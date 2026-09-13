import { useState } from "react"
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { CompetitionOverviewRow } from "@winelore/core/results"
import { useCommissionResults } from "../../src/results/useCommissionResults"
import { useTranslation } from "../../src/i18n/LocaleProvider"
import { elevation, palette, radius, spacing, type } from "../../src/theme"

/**
 * Final standings, ranked by the leading outcome.
 *
 * Deliberately not the desktop table. That view is a wide grid with a column
 * per outcome property, filters and an expert drill-down; on a phone it becomes
 * a ranked list where each row opens its own detail. The rows themselves are
 * built by the same code in core, so the numbers match exactly.
 */
export default function ResultsRoute() {
    const { commissionId } = useLocalSearchParams<{ commissionId: string }>()
    const { t } = useTranslation()
    const { state } = useCommissionResults(commissionId)
    const [selected, setSelected] = useState<CompetitionOverviewRow | null>(null)

    if (state.status === "loading") {
        return (
            <View style={styles.centered}>
                <ActivityIndicator />
            </View>
        )
    }

    if (state.status !== "ready") {
        return (
            <View style={styles.centered}>
                <Text style={styles.error}>
                    {t("commission.panelSummaryLoadError")}
                </Text>
            </View>
        )
    }

    const { view } = state
    const rankBy = view.outcomeProperties[0]

    return (
        <>
            <Stack.Screen options={{ title: t("commission.results.resultsTitle") }} />
            <FlatList
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                data={view.rows}
                keyExtractor={(row) => row.candidateId}
                ListEmptyComponent={
                    <Text style={styles.empty}>{t("common.na")}</Text>
                }
                renderItem={({ item, index }) => (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => setSelected(item)}
                        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    >
                        <Text style={styles.rank}>{index + 1}</Text>
                        <View style={styles.rowMain}>
                            <Text style={styles.beverage} numberOfLines={1}>
                                {item.beverage}
                            </Text>
                            <Text style={styles.code}>
                                {item.code}
                                {item.vintage && item.vintage !== "-" ? ` · ${item.vintage}` : ""}
                            </Text>
                            {item.awards !== "-" ? (
                                <Text style={styles.awards} numberOfLines={1}>
                                    {item.awards}
                                </Text>
                            ) : null}
                        </View>
                        {rankBy ? (
                            <Text style={styles.score}>{item.outcomes[rankBy.code] ?? "—"}</Text>
                        ) : null}
                    </Pressable>
                )}
            />

            <DetailSheet
                row={selected}
                outcomeProperties={view.outcomeProperties}
                onClose={() => setSelected(null)}
            />
        </>
    )
}

/** Every outcome property for one candidate — the table's other columns. */
function DetailSheet({
    row,
    outcomeProperties,
    onClose,
}: {
    row: CompetitionOverviewRow | null
    outcomeProperties: Array<{ code: string; name: string }>
    onClose: () => void
}) {
    const insets = useSafeAreaInsets()
    const { t } = useTranslation()

    return (
        <Modal
            visible={row !== null}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
                <Text style={styles.sheetTitle}>{row?.beverage}</Text>
                <Text style={styles.sheetCode}>{row?.code}</Text>

                {outcomeProperties.map((property) => (
                    <View key={property.code} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{property.name}</Text>
                        <Text style={styles.detailValue}>
                            {row?.outcomes[property.code] ?? "—"}
                        </Text>
                    </View>
                ))}

                {row?.awards && row.awards !== "-" ? (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t("commission.results.awards")}</Text>
                        <Text style={styles.detailValue}>{row.awards}</Text>
                    </View>
                ) : null}

                <Pressable
                    accessibilityRole="button"
                    onPress={onClose}
                    style={({ pressed }) => [styles.close, pressed && styles.rowPressed]}
                >
                    <Text style={styles.closeLabel}>{t("common.close")}</Text>
                </Pressable>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
        backgroundColor: palette.background,
    },
    error: { ...type.body, color: palette.danger, textAlign: "center" },
    empty: { ...type.body, color: palette.textMuted, textAlign: "center", padding: spacing.xl },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: palette.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
        ...elevation(1),
    },
    rowPressed: { opacity: 0.7 },
    rank: { ...type.title, color: palette.textFaint, minWidth: 26 },
    rowMain: { flex: 1, gap: 2 },
    beverage: { ...type.body, fontWeight: "600", color: palette.text },
    code: { ...type.caption, color: palette.textFaint },
    awards: { ...type.caption, color: palette.accentText, fontWeight: "600" },
    score: { ...type.largeTitle, fontSize: 22, color: palette.accentText },
    sheet: { flex: 1, padding: spacing.lg, gap: spacing.sm, backgroundColor: palette.background },
    sheetTitle: { ...type.largeTitle, color: palette.text },
    sheetCode: { ...type.body, color: palette.textFaint, marginBottom: spacing.sm },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: palette.border,
    },
    detailLabel: { ...type.body, color: palette.textMuted, flex: 1 },
    detailValue: { ...type.body, fontWeight: "700", color: palette.text },
    close: {
        marginTop: spacing.lg,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        backgroundColor: palette.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
    },
    closeLabel: { ...type.body, fontWeight: "600", color: palette.text },
})
