import { useState } from "react"
import { Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { palette, radius } from "../theme"
import { Icon } from "./Icon"

export interface MenuPickerProps<T extends string> {
    options: ReadonlyArray<{ value: T; label: string }>
    value: T
    onChange: (value: T) => void
    accessibilityLabel?: string
}

/**
 * A choice from a list, shown as its current value — the web's `<select>`.
 * iOS and Android use the system's own menu (`MenuPicker.ios.tsx`,
 * `MenuPicker.android.tsx`); this is the drawn fallback for anything else.
 */
export function MenuPicker<T extends string>({ options, value, onChange, accessibilityLabel }: MenuPickerProps<T>) {
    const [open, setOpen] = useState(false)
    const current = options.find((option) => option.value === value)
    return (
        <>
            <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => setOpen(true)} style={styles.trigger}>
                <Text style={styles.label} numberOfLines={1}>
                    {current?.label}
                </Text>
                <Icon name="chevronDown" size={12} color={palette.textFaint} />
            </Pressable>
            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                    <View style={styles.menu}>
                        {options.map((option) => (
                            <Pressable
                                key={option.value}
                                accessibilityRole="menuitem"
                                accessibilityState={{ selected: option.value === value }}
                                onPress={() => {
                                    setOpen(false)
                                    onChange(option.value)
                                }}
                                style={styles.item}
                            >
                                <Text style={styles.itemLabel}>{option.label}</Text>
                                {option.value === value ? <Icon name="done" size={14} color={palette.accent} /> : null}
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </>
    )
}

const styles = StyleSheet.create({
    trigger: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
    label: { flexShrink: 1, fontSize: 12, fontWeight: "700", color: palette.textStrong },
    backdrop: { flex: 1, justifyContent: "center", padding: 32, backgroundColor: "rgba(15, 23, 43, 0.3)" },
    menu: { borderRadius: radius.md, backgroundColor: palette.surface, paddingVertical: 6 },
    item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    itemLabel: { flex: 1, fontSize: 14, color: palette.text },
})
