import { Host, SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from "@expo/ui/jetpack-compose"
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers"
import { palette } from "../theme"
import type { SegmentedProps } from "./Segmented"

/**
 * A Material 3 single-choice segmented button row, in the brand's indigo
 * where Material would use its dynamic primary.
 */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
    return (
        <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
            <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
                {options.map((option) => (
                    <SegmentedButton
                        key={option.value}
                        selected={option.value === value}
                        onClick={() => onChange(option.value)}
                        modifiers={[weight(1)]}
                        colors={{
                            activeContainerColor: palette.accentBorder,
                            activeContentColor: palette.accent,
                            activeBorderColor: palette.border,
                            inactiveContainerColor: palette.surface,
                            inactiveContentColor: palette.textMuted,
                            inactiveBorderColor: palette.border,
                        }}
                    >
                        <SegmentedButton.Label>
                            <Text>{option.label}</Text>
                        </SegmentedButton.Label>
                    </SegmentedButton>
                ))}
            </SingleChoiceSegmentedButtonRow>
        </Host>
    )
}
