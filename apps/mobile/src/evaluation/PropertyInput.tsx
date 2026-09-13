import { useMemo } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import * as Haptics from "expo-haptics"
import {
    isBooleanSmartProperty,
    type EvaluationProperty,
} from "@winelore/core/evaluation"
import type { NumericInputErrorReason } from "@winelore/core"
import { palette, radius, spacing, type } from "../theme"

interface PropertyInputProps {
    property: EvaluationProperty
    value: unknown
    smartValue: number | undefined
    draft: string | undefined
    error: NumericInputErrorReason | null | undefined
    propertyByCode: Map<string, EvaluationProperty>
    onChange: (value: unknown) => void
    onDraftChange: (raw: string, isDouble: boolean) => void
    onDraftCommit: () => void
    errorLabel: (reason: NumericInputErrorReason) => string
    yesLabel: string
    noLabel: string
    placeholder: string
}

/**
 * A single scorecard row.
 *
 * Every control gives selection feedback through the Taptic Engine, which is
 * the main thing a judge feels that the web app cannot do: iOS Safari exposes
 * no vibration API at all.
 */
export function PropertyInput(props: PropertyInputProps) {
    const { property } = props

    if (property.__typename === "SmartProperty") {
        return <SmartValue {...props} />
    }

    return (
        <View style={styles.row}>
            <View style={styles.labelColumn}>
                <Text style={styles.name}>
                    {property.name}
                    {property.isRequired ? <Text style={styles.required}> *</Text> : null}
                </Text>
                {property.description ? (
                    <Text style={styles.description}>{property.description}</Text>
                ) : null}
            </View>
            <View style={styles.controlColumn}>
                <Control {...props} />
                {props.error ? (
                    <Text style={styles.error}>{props.errorLabel(props.error)}</Text>
                ) : null}
            </View>
        </View>
    )
}

function Control(props: PropertyInputProps) {
    switch (props.property.__typename) {
        case "BooleanProperty":
            return <BooleanControl {...props} />
        case "DiscreteNumbersProperty":
            return <DiscreteControl {...props} />
        case "EnumProperty":
            return <EnumControl {...props} />
        case "IntProperty":
        case "DoubleProperty":
            return <NumericControl {...props} />
        default:
            return null
    }
}

function BooleanControl({ value, onChange, yesLabel, noLabel }: PropertyInputProps) {
    const choose = async (next: boolean) => {
        await Haptics.selectionAsync()
        onChange(next)
    }
    return (
        <View style={styles.segmented}>
            <Segment label={yesLabel} selected={value === true} tone="positive" onPress={() => choose(true)} />
            <Segment label={noLabel} selected={value === false} tone="negative" onPress={() => choose(false)} />
        </View>
    )
}

/**
 * Discrete scores render as tappable chips rather than a picker — a judge
 * scoring dozens of samples taps a target directly instead of scrolling a
 * wheel. Above a dozen options that stops fitting, so it falls back to chips
 * that wrap.
 */
function DiscreteControl({ property, value, onChange }: PropertyInputProps) {
    const options = useMemo(
        () => [...(property.discreteAllowedValues ?? [])].sort((a, b) => a - b),
        [property.discreteAllowedValues],
    )

    return (
        <View style={styles.chips}>
            {options.map((option) => (
                <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: value === option }}
                    onPress={async () => {
                        await Haptics.selectionAsync()
                        onChange(option)
                    }}
                    style={({ pressed }) => [
                        styles.chip,
                        value === option && styles.chipSelected,
                        pressed && styles.pressed,
                    ]}
                >
                    <Text style={[styles.chipLabel, value === option && styles.chipLabelSelected]}>
                        {option}
                    </Text>
                </Pressable>
            ))}
        </View>
    )
}

function EnumControl({ property, value, onChange }: PropertyInputProps) {
    const options = property.enumAllowedValues ?? []
    return (
        <View style={styles.chips}>
            {options.map((option) => (
                <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: value === option }}
                    onPress={async () => {
                        await Haptics.selectionAsync()
                        onChange(option)
                    }}
                    style={({ pressed }) => [
                        styles.chip,
                        styles.enumChip,
                        value === option && styles.chipSelected,
                        pressed && styles.pressed,
                    ]}
                >
                    <Text style={[styles.chipLabel, value === option && styles.chipLabelSelected]}>
                        {option}
                    </Text>
                </Pressable>
            ))}
        </View>
    )
}

function NumericControl({
    property,
    value,
    draft,
    error,
    onDraftChange,
    onDraftCommit,
    placeholder,
}: PropertyInputProps) {
    const isDouble = property.__typename === "DoubleProperty"
    const min = isDouble ? property.doubleMinLimit : property.intMinLimit
    const max = isDouble ? property.doubleMaxLimit : property.intMaxLimit

    return (
        <View style={styles.numericWrapper}>
            <TextInput
                value={draft ?? (value === undefined || value === null ? "" : String(value))}
                onChangeText={(raw) => onDraftChange(raw, isDouble)}
                onBlur={onDraftCommit}
                // `decimal-pad` omits the minus sign, which scores never use,
                // and gives a larger target than the full numeric keyboard.
                keyboardType={isDouble ? "decimal-pad" : "number-pad"}
                returnKeyType="done"
                placeholder={placeholder}
                placeholderTextColor={palette.textFaint}
                style={[styles.numericInput, error && styles.numericInputError]}
                accessibilityLabel={property.name}
            />
            {min != null && max != null ? (
                <Text style={styles.limits}>
                    {min}–{max}
                </Text>
            ) : null}
        </View>
    )
}

/** A computed property: shown, never edited. */
function SmartValue({ property, smartValue, propertyByCode, yesLabel, noLabel }: PropertyInputProps) {
    const isBoolean = isBooleanSmartProperty(property, propertyByCode)
    const display =
        smartValue === undefined
            ? "—"
            : isBoolean
              ? smartValue
                  ? yesLabel
                  : noLabel
              : formatSmart(smartValue)

    return (
        <View style={[styles.row, property.isResult ? styles.resultRow : null]}>
            <View style={styles.labelColumn}>
                <Text style={[styles.name, property.isResult ? styles.resultName : null]}>
                    {property.name}
                </Text>
                {property.description ? (
                    <Text style={styles.description}>{property.description}</Text>
                ) : null}
            </View>
            <Text style={[styles.smartValue, property.isResult ? styles.resultValue : null]}>
                {display}
            </Text>
        </View>
    )
}

/** Trim trailing zeros so a whole score reads "18", not "18.00". */
function formatSmart(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "")
}

function Segment({
    label,
    selected,
    tone,
    onPress,
}: {
    label: string
    selected: boolean
    tone: "positive" | "negative"
    onPress: () => void
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={onPress}
            style={({ pressed }) => [
                styles.segment,
                selected && (tone === "positive" ? styles.segmentYes : styles.segmentNo),
                pressed && styles.pressed,
            ]}
        >
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{label}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        backgroundColor: palette.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
    },
    resultRow: { backgroundColor: palette.accentSoft, borderColor: palette.accentBorder },
    labelColumn: { flex: 1, gap: 2 },
    controlColumn: { alignItems: "flex-end", gap: 4 },
    name: { ...type.body, fontWeight: "600", color: palette.text },
    resultName: { color: palette.accentText },
    required: { color: palette.danger },
    description: { ...type.caption, color: palette.textFaint },
    error: { ...type.caption, color: palette.danger },
    segmented: { flexDirection: "row", gap: spacing.xs },
    segment: {
        minWidth: 62,
        paddingVertical: 9,
        paddingHorizontal: spacing.md,
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        alignItems: "center",
    },
    segmentYes: { backgroundColor: palette.positive, borderColor: palette.positive },
    segmentNo: { backgroundColor: palette.danger, borderColor: palette.danger },
    segmentLabel: { ...type.body, fontWeight: "600", color: palette.textMuted },
    segmentLabelSelected: { color: palette.onAccent },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, justifyContent: "flex-end" },
    chip: {
        minWidth: 44,
        height: 40,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    enumChip: { minWidth: 0, paddingHorizontal: spacing.md },
    chipSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    chipLabel: { ...type.body, fontWeight: "600", color: palette.textMuted },
    chipLabelSelected: { color: palette.onAccent },
    pressed: { opacity: 0.65 },
    numericWrapper: { alignItems: "flex-end", gap: 2 },
    numericInput: {
        minWidth: 88,
        height: 44,
        paddingHorizontal: spacing.md,
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        textAlign: "right",
        ...type.body,
        color: palette.text,
    },
    numericInputError: { borderColor: palette.danger, color: palette.danger },
    limits: { ...type.caption, color: palette.textFaint },
    smartValue: { ...type.title, color: palette.textMuted },
    resultValue: { color: palette.accentText },
})
