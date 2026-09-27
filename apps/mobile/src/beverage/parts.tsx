import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import type { BeverageTab } from "@winelore/core/beverage"
import { continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"

// --- Tab strip --------------------------------------------------------------

export interface TabOption {
    id: BeverageTab
    label: string
    icon: IconName
    count?: number
}

/**
 * The web's sub-navigation: uppercase tabs over a rule, the current one
 * underlined in indigo, each with its count. It scrolls sideways when the
 * labels do not fit, as the web's does.
 */
export function TabStrip({
    tabs,
    current,
    onChange,
}: {
    tabs: TabOption[]
    current: BeverageTab
    onChange: (tab: BeverageTab) => void
}) {
    return (
        <View style={styles.strip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist">
                {tabs.map((tab) => {
                    const active = tab.id === current
                    return (
                        <Pressable
                            key={tab.id}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: active }}
                            onPress={() => {
                                if (active) return
                                Haptics.selectionAsync()
                                onChange(tab.id)
                            }}
                            style={[styles.tab, active && styles.tabActive]}
                        >
                            <Icon name={tab.icon} size={16} color={active ? palette.accent : palette.textFaint} />
                            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                            {tab.count !== undefined ? (
                                <View style={[styles.count, active && styles.countActive]}>
                                    <Text style={[styles.countLabel, active && styles.countLabelActive]}>{tab.count}</Text>
                                </View>
                            ) : null}
                        </Pressable>
                    )
                })}
            </ScrollView>
        </View>
    )
}

// --- Section parts ----------------------------------------------------------

/** A tab's heading: text-lg title over a small grey line. */
export function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <View style={styles.sectionTitle}>
            <Text style={styles.title} accessibilityRole="header">
                {title}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
    )
}

/** The web's empty tab: a large muted glyph in a tile, a title, a line, and maybe an action. */
export function EmptyCard({
    icon,
    title,
    description,
    children,
}: {
    icon: IconName
    title: string
    description: string
    children?: React.ReactNode
}) {
    return (
        <View style={styles.empty}>
            <View style={styles.emptyTile}>
                <Icon name={icon} size={48} color={palette.textFaint} />
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptyDescription}>{description}</Text>
            {children}
        </View>
    )
}

/** The web's indigo `bg-indigo-600 rounded-xl text-xs font-bold` button. */
export function PrimaryButton({
    label,
    icon,
    onPress,
    large,
}: {
    label: string
    icon: IconName
    onPress: () => void
    large?: boolean
}) {
    return (
        // PressableSurface styles its inner view; the wrapper decides where it sits.
        <View style={large ? styles.primaryLargeSlot : styles.primarySlot}>
            <PressableSurface onPress={onPress} style={[styles.primary, large && styles.primaryLarge]}>
                <Icon name={icon} size={16} color={palette.onAccent} weight="semibold" />
                <Text style={styles.primaryLabel}>{label}</Text>
            </PressableSurface>
        </View>
    )
}

/** A sheet opened before the beverage has loaded — straight from a link, say. */
export function SheetLoading() {
    return (
        <View style={styles.sheetLoading}>
            <ActivityIndicator color={palette.accent} />
        </View>
    )
}

/** The colour of an allocation bar, as the web's: indigo, amber past 80%, rose past full. */
export const allocationColor = { normal: palette.accent, high: "#fe9a00", over: "#ff2056" } as const

const styles = StyleSheet.create({
    sheetLoading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.surface },
    strip: { borderBottomWidth: 1, borderBottomColor: palette.border },
    tab: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
        marginBottom: -1,
    },
    tabActive: { borderBottomColor: palette.accent },
    tabLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    tabLabelActive: { fontWeight: "800", color: palette.accent },
    count: { marginLeft: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: palette.borderSoft },
    countActive: { backgroundColor: palette.accent },
    countLabel: { fontSize: 10, fontWeight: "700", color: palette.textMuted },
    countLabelActive: { color: palette.onAccent },
    sectionTitle: { gap: 4 },
    title: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: palette.heading },
    subtitle: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: palette.textFaint },
    empty: {
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 48,
        borderRadius: radius.panel,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        ...continuous,
    },
    emptyTile: {
        padding: 20,
        marginBottom: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
        ...continuous,
    },
    emptyTitle: { marginBottom: 8, fontSize: 18, fontWeight: "700", color: palette.heading, textAlign: "center" },
    emptyDescription: { maxWidth: 384, fontSize: 12, lineHeight: 19, color: palette.textMuted, textAlign: "center" },
    primary: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        boxShadow: "0 4px 6px -1px rgba(79, 57, 246, 0.2), 0 2px 4px -2px rgba(79, 57, 246, 0.2)",
        ...continuous,
    },
    primarySlot: { alignSelf: "flex-start" },
    primaryLargeSlot: { alignSelf: "center", marginTop: 24 },
    primaryLarge: { paddingHorizontal: 20, paddingVertical: 12 },
    primaryLabel: { fontSize: 12, fontWeight: "700", color: palette.onAccent },
})
