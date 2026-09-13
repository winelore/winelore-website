import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { palette, radius, spacing, type } from "../theme"

interface SubmitBarProps {
    rated: number
    total: number
    canSubmit: boolean
    isSubmitting: boolean
    error: string | null
    progressLabel: string
    submitLabel: string
    blockedLabel: string
    onSubmit: () => void
}

/**
 * The action bar pinned to the bottom of the scorecard.
 *
 * On iOS 26 this is real Liquid Glass over the scrolling form — the system
 * material, with its lensing and adaptive tint, rather than the CSS
 * `backdrop-filter` blur the web app settles for. Below iOS 26
 * `isLiquidGlassAvailable()` is false and it falls back to an opaque surface,
 * because a transparent bar with no material behind it would be unreadable.
 */
export function SubmitBar({
    rated,
    total,
    canSubmit,
    isSubmitting,
    error,
    progressLabel,
    submitLabel,
    blockedLabel,
    onSubmit,
}: SubmitBarProps) {
    const insets = useSafeAreaInsets()
    const glass = isLiquidGlassAvailable()
    const Container = glass ? GlassView : View

    const complete = total > 0 && rated === total

    return (
        <Container
            // GlassView ignores backgroundColor; the fallback needs one.
            style={[styles.bar, !glass && styles.barFallback, { paddingBottom: insets.bottom + spacing.sm }]}
            {...(glass ? { glassEffectStyle: "regular" as const } : {})}
        >
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.content}>
                {total > 0 ? (
                    <View style={styles.progress}>
                        <Text style={styles.progressLabel}>{progressLabel}</Text>
                        <View style={styles.track}>
                            <View
                                style={[
                                    styles.fill,
                                    complete && styles.fillComplete,
                                    { width: `${Math.round((rated / total) * 100)}%` },
                                ]}
                            />
                        </View>
                    </View>
                ) : null}

                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canSubmit || isSubmitting }}
                    disabled={!canSubmit || isSubmitting}
                    onPress={onSubmit}
                    style={({ pressed }) => [
                        styles.button,
                        (!canSubmit || isSubmitting) && styles.buttonDisabled,
                        pressed && styles.buttonPressed,
                    ]}
                >
                    {isSubmitting ? <ActivityIndicator color={palette.onAccent} /> : null}
                    <Text style={[styles.buttonLabel, !canSubmit && styles.buttonLabelDisabled]}>
                        {canSubmit ? submitLabel : blockedLabel}
                    </Text>
                </Pressable>
            </View>
        </Container>
    )
}

const styles = StyleSheet.create({
    bar: {
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.md,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: palette.border,
    },
    barFallback: {
        backgroundColor: Platform.select({ ios: "rgba(255,255,255,0.96)", default: palette.surface }),
    },
    content: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    progress: { width: 96, gap: 5 },
    progressLabel: { ...type.caption, fontWeight: "600", color: palette.textMuted },
    track: { height: 5, borderRadius: radius.pill, backgroundColor: palette.border, overflow: "hidden" },
    fill: { height: "100%", borderRadius: radius.pill, backgroundColor: palette.accent },
    fillComplete: { backgroundColor: palette.positive },
    button: {
        flex: 1,
        height: 50,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
    },
    buttonDisabled: { backgroundColor: palette.border },
    buttonPressed: { opacity: 0.85 },
    buttonLabel: { ...type.body, fontWeight: "700", color: palette.onAccent },
    buttonLabelDisabled: { color: palette.textFaint },
    error: {
        ...type.caption,
        color: palette.danger,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: spacing.xs,
    },
})
