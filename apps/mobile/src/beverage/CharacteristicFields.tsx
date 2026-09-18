import { Pressable, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { ABV_PRESETS, characteristicInputKind, vintagePresets, type BeverageCharacteristic } from "@winelore/core/beverage"
import { useTranslation } from "../i18n/LocaleProvider"
import { palette, radius } from "../theme"
import { FormInput } from "../ui/Form"

/**
 * The characteristics a beverage type asks of a beverage, batch or sample,
 * each as the web's create forms ask for it: a choice of its options as
 * chips, a number, or text. On a batch a vintage offers the last five years
 * and a strength the common percentages, as the web's batch form does.
 */
export function CharacteristicFields({
    characteristics,
    values,
    onChange,
    presets,
    disabled,
}: {
    characteristics: BeverageCharacteristic[]
    values: Record<string, string>
    onChange: (values: Record<string, string>) => void
    /** The batch form's vintage and strength presets. */
    presets?: boolean
    disabled?: boolean
}) {
    const { t, formatBeverageType } = useTranslation()
    const set = (code: string, value: string) => {
        const next = { ...values }
        if (value.trim() === "") delete next[code]
        else next[code] = value
        onChange(next)
    }
    const label = (value: string) => {
        const formatted = formatBeverageType(value)
        return formatted && formatted !== value ? formatted : value
    }

    return (
        <View style={styles.list}>
            {characteristics.map((characteristic) => {
                const kind = characteristicInputKind(characteristic)
                const value = values[characteristic.code] ?? ""
                const range =
                    characteristic.minLimit !== undefined && characteristic.maxLimit !== undefined
                        ? `${characteristic.minLimit} – ${characteristic.maxLimit}`
                        : null
                const chips =
                    kind === "choice"
                        ? (characteristic.allowedValues ?? []).map((option) => ({ value: option, label: label(option) }))
                        : presets && characteristic.code === "vintage"
                          ? vintagePresets(new Date()).map((year) => ({ value: String(year), label: String(year) }))
                          : presets && (kind === "decimal" || characteristic.code === "alcoholByVolume")
                            ? ABV_PRESETS.map((percent) => ({ value: percent, label: `${percent}%` }))
                            : []

                return (
                    <View key={characteristic.code} style={styles.field}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>
                                {characteristic.name || characteristic.code}
                                {characteristic.isRequired ? <Text style={styles.required}> *</Text> : null}
                            </Text>
                            {range ? <Text style={styles.range}>{range}</Text> : null}
                        </View>
                        {kind !== "choice" ? (
                            <FormInput
                                value={value}
                                onChangeText={(text) => set(characteristic.code, text)}
                                keyboardType={kind === "integer" ? "number-pad" : kind === "decimal" ? "decimal-pad" : "default"}
                                placeholder={characteristic.code === "vintage" ? String(new Date().getFullYear()) : characteristic.name || characteristic.code}
                                editable={!disabled}
                            />
                        ) : null}
                        {chips.length > 0 ? (
                            <View style={styles.chips}>
                                {chips.map((chip) => {
                                    const selected = String(value) === chip.value
                                    return (
                                        <Pressable
                                            key={chip.value}
                                            accessibilityRole="button"
                                            accessibilityState={{ selected }}
                                            disabled={disabled}
                                            onPress={() => {
                                                Haptics.selectionAsync()
                                                // A choice taps off again, as on the web.
                                                set(characteristic.code, selected && kind === "choice" ? "" : chip.value)
                                            }}
                                            style={[styles.chip, selected && (kind === "choice" ? styles.chipChosen : styles.chipPreset)]}
                                        >
                                            <Text style={[styles.chipLabel, selected && (kind === "choice" ? styles.chipLabelChosen : styles.chipLabelPreset)]}>
                                                {chip.label}
                                            </Text>
                                        </Pressable>
                                    )
                                })}
                                {kind === "choice" && value ? (
                                    <Pressable accessibilityRole="button" onPress={() => set(characteristic.code, "")} hitSlop={6} style={styles.clear}>
                                        <Text style={styles.clearLabel}>{t("competition.createPresetClear")}</Text>
                                    </Pressable>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                )
            })}
        </View>
    )
}

const styles = StyleSheet.create({
    list: { gap: 20 },
    field: { gap: 8 },
    labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    label: { flexShrink: 1, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textMuted },
    required: { color: "#ff2056" },
    range: { fontSize: 11, fontWeight: "600", color: palette.textFaint },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
    chipChosen: { borderColor: palette.accent, backgroundColor: palette.accent },
    chipPreset: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    chipLabel: { fontSize: 12, fontWeight: "700", color: "#45556c" },
    chipLabelChosen: { color: palette.onAccent },
    chipLabelPreset: { color: palette.accent },
    clear: { paddingHorizontal: 8, paddingVertical: 8 },
    clearLabel: { fontSize: 12, fontWeight: "700", color: palette.textFaint },
})
