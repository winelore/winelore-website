import { Pressable, StyleSheet, Text, View } from "react-native"
import { palette } from "../theme"

export interface SegmentedProps<T extends string> {
    options: ReadonlyArray<{ value: T; label: string }>
    value: T
    onChange: (value: T) => void
    accessibilityLabel?: string
}

/**
 * A segmented control. iOS and Android use the system's own
 * (`Segmented.ios.tsx`, `Segmented.android.tsx`); this is the drawn fallback
 * for anything else, styled as the web's phone sheet draws its iOS imitation.
 */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel }: SegmentedProps<T>) {
    return (
        <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.track}>
            {options.map((option) => {
                const selected = option.value === value
                return (
                    <Pressable
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        onPress={() => onChange(option.value)}
                        style={[styles.segment, selected && styles.segmentSelected]}
                    >
                        <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
                            {option.label}
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
