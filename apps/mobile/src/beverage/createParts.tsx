import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"

/**
 * What a create form was opened for — the beverage a batch belongs to, the
 * batch a sample comes from — shown as the web shows it, with its action to
 * choose another.
 */
export function LockedChoice({
    icon,
    title,
    detail,
    actionLabel,
    onAction,
}: {
    icon: IconName
    /** Null while it loads. */
    title: string | null
    detail?: string | null
    actionLabel?: string
    onAction?: () => void
}) {
    return (
        <View style={styles.locked}>
            <View style={styles.tile}>
                <Icon name={icon} size={20} color={palette.accent} />
            </View>
            <View style={styles.text}>
                {title === null ? (
                    <ActivityIndicator size="small" color={palette.accent} style={styles.spinner} />
                ) : (
                    <>
                        <Text style={styles.title} numberOfLines={2}>
                            {title}
                        </Text>
                        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
                    </>
                )}
            </View>
            {actionLabel && onAction ? (
                <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
                    <Text style={styles.action}>{actionLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    )
}

/** The web's preset chips — volumes — outlined, indigo when chosen. */
export const chipStyles = StyleSheet.create({
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
    chipSelected: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    chipDisabled: { opacity: 0.4 },
    label: { fontSize: 12, fontWeight: "700", color: "#45556c" },
    labelSelected: { color: palette.accent },
})

const styles = StyleSheet.create({
    locked: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: "rgba(238, 242, 255, 0.4)",
        ...continuous,
    },
    tile: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.surface,
    },
    text: { flex: 1, minWidth: 0 },
    spinner: { alignSelf: "flex-start" },
    title: { fontSize: 14, fontWeight: "700", color: palette.heading },
    detail: { marginTop: 2, fontSize: 12, fontWeight: "500", color: palette.accent },
    action: { fontSize: 12, fontWeight: "700", color: palette.textMuted },
})
