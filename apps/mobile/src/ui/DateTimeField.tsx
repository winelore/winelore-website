import { Pressable, StyleSheet, Text } from "react-native"
import { useTranslation } from "../i18n/LocaleProvider"
import { palette, radius } from "../theme"

export interface DateTimeFieldProps {
    value: Date
    onChange: (value: Date) => void
    accessibilityLabel?: string
}

/**
 * A date-and-time field — the web's `datetime-local` input. iOS and Android
 * use the system pickers (`DateTimeField.ios.tsx`, `DateTimeField.android.tsx`);
 * this read-only fallback only shows the value.
 */
export function DateTimeField({ value, accessibilityLabel }: DateTimeFieldProps) {
    const { formatDateTime } = useTranslation()
    return (
        <Pressable accessibilityLabel={accessibilityLabel} style={styles.field}>
            <Text style={styles.label}>{formatDateTime(value.toISOString())}</Text>
        </Pressable>
    )
}

export const dateFieldStyles = StyleSheet.create({
    // The web's editing input: slate-50 on an indigo-300 outline, rounded-lg.
    field: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: "#a3b3ff",
        backgroundColor: palette.background,
    },
    label: { fontSize: 13, fontWeight: "600", color: palette.heading },
})

const styles = dateFieldStyles
