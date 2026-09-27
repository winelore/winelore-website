import type { ReactNode } from "react"
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native"
import { continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "./Icon"

/**
 * The pieces of the web's create forms, drawn once: a numbered section
 * header, a labelled field, the text input's look, and the inline error.
 */

/** "1 Basics", with the section's icon tile, an optional badge and hint — the web's `SectionHeader`. */
export function FormSection({ step, title, icon, hint, badge }: { step?: number; title: string; icon: IconName; hint?: string; badge?: string }) {
    return (
        <View style={[styles.section, !hint && styles.sectionCentered]}>
            <View style={styles.sectionTile}>
                <Icon name={icon} size={17} color={palette.accent} />
            </View>
            <View style={styles.sectionText}>
                <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>
                        {step !== undefined ? <Text style={styles.sectionStep}>{step} </Text> : null}
                        {title}
                    </Text>
                    {badge ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeLabel}>{badge}</Text>
                        </View>
                    ) : null}
                </View>
                {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
            </View>
        </View>
    )
}

/** A field with its uppercase label, and a hint or an error beneath. */
export function FormField({ label, hint, error, children }: { label: string; hint?: string | null; error?: string | null; children: ReactNode }) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            {children}
            {error ? <FieldError message={error} /> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
    )
}

export function FieldError({ message }: { message: string }) {
    return (
        <View style={styles.error}>
            <Icon name="alert" size={13} color={palette.danger} />
            <Text style={styles.errorText}>{message}</Text>
        </View>
    )
}

/** The web's input: slate-50 on slate-200, rose when it is the one at fault. */
export function FormInput({ invalid, style, ...props }: TextInputProps & { invalid?: boolean }) {
    return (
        <TextInput
            placeholderTextColor={palette.textGhost}
            {...props}
            style={[styles.input, invalid && styles.inputInvalid, props.editable === false && styles.inputDisabled, style]}
        />
    )
}

/** A failure across the whole form, as the web's action bar shows it. */
export function FormError({ message }: { message: string }) {
    return (
        <View style={styles.banner}>
            <Icon name="alert" size={16} color={palette.danger} />
            <Text style={styles.bannerText}>{message}</Text>
        </View>
    )
}

export const formStyles = StyleSheet.create({
    /** The web's form card: white, rounded-[28px], sections split by a rule. */
    card: {
        borderRadius: radius.hero,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        overflow: "hidden",
        ...continuous,
    },
    cardSection: { padding: 20, gap: 20 },
    rule: { height: 1, backgroundColor: palette.borderSoft },
})

const styles = StyleSheet.create({
    section: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    sectionCentered: { alignItems: "center" },
    sectionTile: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
        ...continuous,
    },
    sectionText: { flex: 1, minWidth: 0 },
    sectionTitleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    sectionTitle: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2, color: palette.heading },
    sectionStep: { color: palette.textGhost },
    sectionHint: { marginTop: 2, fontSize: 12, fontWeight: "500", color: palette.textFaint },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.borderSoft, backgroundColor: palette.background },
    badgeLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textFaint },
    field: { gap: 8 },
    label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textMuted },
    hint: { fontSize: 12, fontWeight: "500", color: palette.textFaint },
    error: { flexDirection: "row", alignItems: "center", gap: 6 },
    errorText: { flexShrink: 1, fontSize: 12, fontWeight: "600", color: palette.danger },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: "rgba(248, 250, 252, 0.5)",
        fontSize: 15,
        fontWeight: "600",
        color: palette.heading,
        ...continuous,
    },
    inputInvalid: { borderColor: "#ffa1ad" },
    inputDisabled: { opacity: 0.6 },
    banner: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        padding: 14,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.dangerBorder,
        backgroundColor: palette.dangerSoft,
        ...continuous,
    },
    bannerText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#c70036" },
})
