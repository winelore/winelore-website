import { useEffect, useRef } from "react"
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "../i18n/LocaleProvider"
import { palette, radius, spacing, type } from "../theme"

export function AISuggestionsSkeleton() {
    const { t } = useTranslation()
    const opacity = useRef(new Animated.Value(1)).current

    useEffect(() => {
        const half = (toValue: number) =>
            Animated.timing(opacity, {
                toValue,
                duration: 900,
                easing: Easing.bezier(0.4, 0, 0.6, 1),
                useNativeDriver: true,
            })
        const loop = Animated.loop(Animated.sequence([half(0.35), half(1)]))
        loop.start()
        return () => loop.stop()
    }, [opacity])

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <Text style={styles.sparkle}>✨</Text>
                    <Text style={styles.headerText}>
                        {t("evaluation.aiSuggestionsGenerating")}
                    </Text>
                </View>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {[0, 1, 2].map((idx) => (
                    <Animated.View key={idx} style={[styles.skeletonChip, { opacity }]}>
                        <View style={styles.skeletonBadge} />
                        <View style={styles.skeletonLineLong} />
                        <View style={styles.skeletonLineShort} />
                    </Animated.View>
                ))}
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
        fontWeight: "600",
        color: palette.accent,
    },
    scrollContent: {
        gap: spacing.xs,
        paddingVertical: 2,
    },
    skeletonChip: {
        width: 210,
        height: 84,
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        gap: 8,
        justifyContent: "center",
    },
    skeletonBadge: {
        width: 70,
        height: 14,
        borderRadius: radius.pill,
        backgroundColor: palette.borderSoft,
    },
    skeletonLineLong: {
        width: "90%",
        height: 11,
        borderRadius: 4,
        backgroundColor: palette.borderSoft,
    },
    skeletonLineShort: {
        width: "60%",
        height: 11,
        borderRadius: 4,
        backgroundColor: palette.borderSoft,
    },
})