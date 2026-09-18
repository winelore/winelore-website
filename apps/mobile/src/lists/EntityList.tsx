import { useState, type ReactElement } from "react"
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native"
import { Stack } from "expo-router"
import { useTranslation } from "../i18n/LocaleProvider"
import { brandGradient, cardShadow, continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { SkeletonCard } from "../ui/Skeleton"
import type { ListController } from "./usePagedList"

interface ListAction {
    label: string
    onPress: () => void
}

interface EntityListProps<T> {
    /** The large title, as the web's `ListPageHeader` title. */
    title: string
    subtitle?: string
    /** "16 Competitions" — shown once the list has loaded. */
    countLabel?: (total: number) => string
    /** The web's gradient create button beside the count. */
    action?: ListAction
    list: ListController<T>
    keyExtractor: (item: T) => string
    renderItem: (item: T) => ReactElement
    empty: { icon: IconName; title: string; description: string }
    error: { title: string; description: string }
}

/**
 * A list screen as the web's list pages draw it on a phone: the title, an
 * optional subtitle, the count chip and create button, then one column of
 * cards — with the web's `StateCard` when there is nothing to show or the
 * load failed.
 *
 * The web's numbered pagination becomes scrolling: the next page loads as the
 * end comes into view, and pulling down reloads from the start.
 */
export function EntityList<T>({
    title,
    subtitle,
    countLabel,
    action,
    list,
    keyExtractor,
    renderItem,
    empty,
    error,
}: EntityListProps<T>) {
    const { t } = useTranslation()
    const [refreshing, setRefreshing] = useState(false)
    const ready = list.status === "ready"

    const pullToRefresh = async () => {
        setRefreshing(true)
        await list.refresh()
        setRefreshing(false)
    }
    const showChip = ready && countLabel !== undefined

    const header =
        subtitle || showChip || action ? (
            <View style={styles.header}>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                {showChip || action ? (
                    <View style={styles.headerRow}>
                        {showChip && countLabel ? (
                            <View style={styles.chip}>
                                <Text style={styles.chipLabel}>{countLabel(list.total)}</Text>
                            </View>
                        ) : null}
                        {action ? (
                            // Sized by the wrapper: PressableSurface styles its
                            // inner view, which cannot stretch its pressable.
                            <View style={styles.actionSlot}>
                                <PressableSurface onPress={action.onPress} style={styles.action}>
                                    <Icon name="plus" size={16} color={palette.onAccent} weight="bold" />
                                    <Text style={styles.actionLabel} numberOfLines={1}>
                                        {action.label}
                                    </Text>
                                </PressableSurface>
                            </View>
                        ) : null}
                    </View>
                ) : null}
            </View>
        ) : null

    const footer = list.loadingMore ? (
        <ActivityIndicator color={palette.accent} style={styles.footer} />
    ) : list.loadMoreFailed ? (
        <Pressable
            accessibilityRole="button"
            onPress={list.loadMore}
            style={({ pressed }) => [styles.footerRetry, pressed && styles.pressed]}
        >
            <Icon name="retry" size={14} color={palette.accentText} weight="semibold" />
            <Text style={styles.footerRetryLabel}>{t("errors.retry")}</Text>
        </Pressable>
    ) : null

    return (
        <>
            <Stack.Screen options={{ title }} />
            <FlatList
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                data={ready ? list.items : []}
                keyExtractor={keyExtractor}
                renderItem={({ item }) => renderItem(item)}
                ListHeaderComponent={header}
                ListFooterComponent={footer}
                ListEmptyComponent={
                    list.status === "loading" ? (
                        <View style={styles.skeletons}>
                            <SkeletonCard variant="list" />
                            <SkeletonCard variant="list" />
                            <SkeletonCard variant="list" />
                        </View>
                    ) : list.status === "error" ? (
                        <StateCard
                            variant="error"
                            icon="alert"
                            title={error.title}
                            description={error.description}
                            onRetry={list.refresh}
                        />
                    ) : (
                        <StateCard variant="empty" {...empty} />
                    )
                }
                // A failed page waits for "Try again" rather than retrying on
                // every scroll to the end.
                onEndReached={list.loadMoreFailed ? undefined : list.loadMore}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={pullToRefresh}
                        tintColor={palette.accent}
                        colors={[palette.accent]}
                    />
                }
            />
        </>
    )
}

/**
 * The web's `StateCard`: an empty list reads as a white card with a faint
 * glyph, a failed load as a rose one. The failed one also offers a retry,
 * where the web asks the reader to refresh the page.
 */
function StateCard({
    variant,
    icon,
    title,
    description,
    onRetry,
}: {
    variant: "empty" | "error"
    icon: IconName
    title: string
    description: string
    onRetry?: () => void
}) {
    const { t } = useTranslation()
    const isError = variant === "error"
    return (
        <View style={[styles.state, isError && styles.stateError]}>
            <Icon name={icon} size={48} color={isError ? palette.dangerMuted : palette.textGhost} />
            <Text style={[styles.stateTitle, isError && styles.stateTitleError]}>{title}</Text>
            <Text style={[styles.stateBody, isError && styles.stateBodyError]}>{description}</Text>
            {onRetry ? (
                <Pressable
                    accessibilityRole="button"
                    onPress={onRetry}
                    style={({ pressed }) => [styles.stateRetry, pressed && styles.pressed]}
                >
                    <Icon name="retry" size={14} color={palette.danger} weight="semibold" />
                    <Text style={styles.stateRetryLabel}>{t("errors.retry")}</Text>
                </Pressable>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 16 },
    pressed: { opacity: 0.6 },
    header: { gap: 12 },
    subtitle: { fontSize: 14, lineHeight: 20, color: palette.textMuted },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    // The web's count pill: text-xs font-semibold, slate-50 on slate-100.
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    chipLabel: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: palette.textMuted },
    // The web's create button: fills the row on a phone, rounded-2xl, gradient.
    actionSlot: { flex: 1, minWidth: 0 },
    action: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: radius.tile,
        experimental_backgroundImage: brandGradient,
        boxShadow: "0 4px 6px -1px rgba(97, 95, 255, 0.1), 0 2px 4px -2px rgba(97, 95, 255, 0.1)",
        ...continuous,
    },
    actionLabel: { fontSize: 14, fontWeight: "700", color: palette.onAccent, flexShrink: 1 },
    skeletons: { gap: 16 },
    footer: { paddingVertical: 16 },
    footerRetry: {
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: palette.surface,
    },
    footerRetryLabel: { fontSize: 14, fontWeight: "700", color: palette.accentText },
    state: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 56,
        paddingHorizontal: 16,
        borderRadius: radius.panel,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        ...cardShadow,
        ...continuous,
    },
    stateError: { backgroundColor: palette.dangerSoft, borderColor: palette.dangerBorder },
    stateTitle: { marginTop: 16, fontSize: 18, lineHeight: 24, fontWeight: "700", color: palette.textStrong, textAlign: "center" },
    stateTitleError: { color: palette.dangerStrong },
    stateBody: { marginTop: 4, fontSize: 14, lineHeight: 20, color: palette.textMuted, textAlign: "center", maxWidth: 448 },
    stateBodyError: { color: palette.danger },
    stateRetry: {
        marginTop: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: palette.surface,
    },
    stateRetryLabel: { fontSize: 14, fontWeight: "700", color: palette.danger },
})
