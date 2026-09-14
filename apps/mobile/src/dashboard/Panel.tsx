import { useEffect, useRef, type ReactNode } from "react"
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "../i18n/LocaleProvider"
import { cardShadow, continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { cardSurface } from "../ui/EntityCard"
import type { Panel } from "./useHome"

interface DashboardPanelProps<T> {
    icon: IconName
    title: string
    /** Where "View all" goes. */
    onViewAll: () => void
    panel: Panel<T>
    emptyIcon: IconName
    emptyLabel: string
    onRetry: () => void
    renderItem: (item: T, index: number) => ReactNode
    /** How the skeleton is drawn while loading. */
    skeleton?: "card" | "row"
}

/**
 * One block of the dashboard — the web's section title, cards, empty state —
 * laid out as the web lays it out on a phone: no white panel around the
 * cards (they already are cards), and "View all" moved up beside the title,
 * where iOS puts "See All".
 */
export function DashboardPanel<T>({
    icon,
    title,
    onViewAll,
    panel,
    emptyIcon,
    emptyLabel,
    onRetry,
    renderItem,
    skeleton = "card",
}: DashboardPanelProps<T>) {
    const { t } = useTranslation()

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Icon name={icon} size={20} color={palette.accent} />
                </View>
                <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
                    {title}
                </Text>
                <Pressable
                    accessibilityRole="link"
                    onPress={onViewAll}
                    hitSlop={10}
                    style={({ pressed }) => [styles.viewAll, pressed && styles.viewAllPressed]}
                >
                    <Text style={styles.viewAllLabel}>{t("dashboard.viewAll")}</Text>
                    <Icon name="chevron" size={13} color={palette.accentText} weight="bold" />
                </Pressable>
            </View>

            {panel.status === "loading" ? (
                <View style={styles.list}>
                    <Skeleton variant={skeleton} />
                    <Skeleton variant={skeleton} />
                </View>
            ) : panel.status === "error" ? (
                <View style={styles.state}>
                    <Icon name="alert" size={40} color={palette.textSubtle} />
                    <Text style={styles.stateLabel}>{t("errors.serverTitle")}</Text>
                    <Pressable
                        accessibilityRole="button"
                        onPress={onRetry}
                        style={({ pressed }) => [styles.retry, pressed && styles.viewAllPressed]}
                    >
                        <Icon name="retry" size={14} color={palette.accentText} weight="semibold" />
                        <Text style={styles.retryLabel}>{t("errors.retry")}</Text>
                    </Pressable>
                </View>
            ) : panel.items.length === 0 ? (
                <View style={styles.state}>
                    <Icon name={emptyIcon} size={40} color={palette.textSubtle} />
                    <Text style={styles.stateLabel}>{emptyLabel}</Text>
                </View>
            ) : (
                <View style={styles.list}>{panel.items.map(renderItem)}</View>
            )}
        </View>
    )
}

/** A card-shaped placeholder that pulses like the web's `animate-pulse`. */
function Skeleton({ variant }: { variant: "card" | "row" }) {
    const opacity = useRef(new Animated.Value(1)).current

    useEffect(() => {
        // animate-pulse: 2s, opacity 1 → 0.5 → 1, cubic-bezier(0.4, 0, 0.6, 1).
        const half = (toValue: number) =>
            Animated.timing(opacity, {
                toValue,
                duration: 1000,
                easing: Easing.bezier(0.4, 0, 0.6, 1),
                useNativeDriver: true,
            })
        const loop = Animated.loop(Animated.sequence([half(0.5), half(1)]))
        loop.start()
        return () => loop.stop()
    }, [opacity])

    return (
        <Animated.View style={[styles.skeletonCard, { opacity }]}>
            <View style={styles.skeletonHead}>
                <View style={[styles.skeletonBlock, variant === "row" ? styles.skeletonTileLarge : styles.skeletonTile]} />
                <View style={styles.skeletonLines}>
                    <View style={[styles.skeletonBlock, styles.skeletonKicker]} />
                    <View style={[styles.skeletonBlock, styles.skeletonTitle]} />
                </View>
            </View>
            {variant === "card" ? <View style={[styles.skeletonBlock, styles.skeletonMeta]} /> : null}
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    section: { gap: 12 },
    header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
    headerIcon: {
        padding: 8,
        borderRadius: radius.md,
        backgroundColor: palette.accentBorder,
        ...continuous,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        lineHeight: 26,
        fontWeight: "700",
        color: palette.heading,
        letterSpacing: Platform.OS === "ios" ? 0.2 : 0,
    },
    viewAll: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 4, paddingLeft: 8 },
    viewAllPressed: { opacity: 0.5 },
    viewAllLabel: { fontSize: 15, fontWeight: "600", color: palette.accentText },
    list: { gap: 12 },
    state: {
        backgroundColor: palette.surface,
        borderRadius: radius.panel,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        minHeight: 160,
        padding: 32,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        ...cardShadow,
        ...continuous,
    },
    stateLabel: { fontSize: 14, fontWeight: "500", color: palette.textMuted, textAlign: "center" },
    retry: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: palette.background,
    },
    retryLabel: { fontSize: 14, fontWeight: "700", color: palette.accentText },
    skeletonCard: cardSurface,
    skeletonHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    skeletonBlock: { backgroundColor: palette.borderSoft, borderRadius: 6 },
    skeletonTile: { width: 40, height: 40, borderRadius: radius.tile },
    skeletonTileLarge: { width: 48, height: 48, borderRadius: radius.tile },
    skeletonLines: { flex: 1, gap: 6 },
    skeletonKicker: { width: "35%", height: 10 },
    skeletonTitle: { width: "70%", height: 14 },
    skeletonMeta: { width: "55%", height: 10, marginTop: 16 },
})
