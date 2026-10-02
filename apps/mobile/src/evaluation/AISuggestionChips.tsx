import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius, spacing, type } from "../theme"

interface AISuggestionChipsProps {
    suggestions: string[]
    selectedIndex: number | null
    onSelect: (index: number) => void
}

export function AISuggestionChips({
                                      suggestions,
                                      selectedIndex,
                                      onSelect,
                                  }: AISuggestionChipsProps) {
    const { t } = useTranslation()

    if (suggestions.length === 0) return null

    const getBadgeLabel = (index: number) => {
        if (index === 0) return t("evaluation.aiFocusStructure")
        if (index === 1) return t("evaluation.aiFocusBalance")
        return t("evaluation.aiFocusHighlights")
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <Text style={styles.sparkle}>✨</Text>
                    <Text style={styles.headerText}>
                        {t("evaluation.aiSuggestionsTitle")}
                    </Text>
                </View>
                <Text style={styles.hintText}>
                    {t("evaluation.aiClickToApply")}
                </Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {suggestions.map((optionText, idx) => {
                    const isSelected = selectedIndex === idx
                    return (
                        <Pressable
                            key={idx}
                            accessibilityRole="button"
                            accessibilityLabel={`${getBadgeLabel(idx)}: ${optionText}`}
                            accessibilityState={{ selected: isSelected }}
                            onPress={() => onSelect(idx)}
                            style={({ pressed }) => [
                                styles.chip,
                                isSelected ? styles.chipSelected : styles.chipUnselected,
                                pressed && styles.chipPressed,
                            ]}
                        >
                            <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                                <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
                                    {getBadgeLabel(idx)}
                                </Text>
                            </View>
                            <Text
                                numberOfLines={3}
                                style={[styles.optionText, isSelected && styles.optionTextSelected]}
                            >
                                {optionText}
                            </Text>
                        </Pressable>
                    )
                })}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.xs,
        marginVertical: 4,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    sparkle: {
        fontSize: 13,
    },
    headerText: {
        ...type.caption,
        fontWeight: "700",
        color: palette.heading,
    },
    hintText: {
        ...type.caption,
        fontSize: 11,
        color: palette.textFaint,
    },
    scrollContent: {
        gap: spacing.xs,
        paddingVertical: 2,
    },
    chip: {
        width: 220,
        minHeight: 88,
        padding: spacing.sm,
        borderRadius: radius.md,
        justifyContent: "flex-start",
        gap: 6,
        ...continuous,
    },
    chipUnselected: {
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
    },
    chipSelected: {
        backgroundColor: palette.accentSoft,
        borderWidth: 1.5,
        borderColor: palette.accent,
    },
    chipPressed: {
        opacity: 0.8,
    },
    badge: {
        alignSelf: "flex-start",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: palette.background,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
    },
    badgeSelected: {
        backgroundColor: palette.surface,
        borderColor: palette.accentBorder,
    },
    badgeText: {
        ...type.caption,
        fontSize: 10,
        fontWeight: "700",
        color: palette.textMuted,
        textTransform: "uppercase",
    },
    badgeTextSelected: {
        color: palette.accent,
    },
    optionText: {
        ...type.caption,
        fontSize: 12,
        lineHeight: 16,
        color: palette.textStrong,
    },
    optionTextSelected: {
        fontWeight: "600",
        color: palette.text,
    },
})