import { Pressable, StyleSheet, Text, View } from "react-native"
import { LOCALES, LOCALE_LABELS, type Locale } from "@winelore/core/i18n"
import { palette } from "../theme"

export interface LanguagePickerProps {
    locale: Locale
    onChange: (locale: Locale) => void
    accessibilityLabel?: string
}

/**
 * The language control. iOS and Android use the system's own segmented
 * control (`LanguagePicker.ios.tsx`, `LanguagePicker.android.tsx`); this is
 * the drawn fallback for anything else, styled as the web's phone sheet draws
 * its iOS imitation.
 */
export function LanguagePicker({ locale, onChange, accessibilityLabel }: LanguagePickerProps) {
    return (
        <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.track}>
            {LOCALES.map((option) => {
                const selected = option === locale
                return (
                    <Pressable
                        key={option}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        onPress={() => onChange(option)}
                        style={[styles.segment, selected && styles.segmentSelected]}
                    >
                        <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
                            {LOCALE_LABELS[option]}
                        </Text>
                    </Pressable>
                )
            })}
        </View>
    )
}

const styles = StyleSheet.create({
    track: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 12, backgroundColor: "rgba(226, 232, 240, 0.7)" },
    segment: { flex: 1, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 9 },
    segmentSelected: { backgroundColor: palette.surface },
    label: { fontSize: 14, fontWeight: "500", color: palette.textMuted },
    labelSelected: { fontWeight: "600", color: palette.text },
})
