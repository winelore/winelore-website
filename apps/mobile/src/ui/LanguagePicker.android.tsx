import { Host, SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from "@expo/ui/jetpack-compose"
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers"
import { LOCALES, LOCALE_LABELS } from "@winelore/core/i18n"
import { palette } from "../theme"
import type { LanguagePickerProps } from "./LanguagePicker"

/**
 * A Material 3 single-choice segmented button row, in the brand's indigo
 * where Material would use its dynamic primary.
 */
export function LanguagePicker({ locale, onChange }: LanguagePickerProps) {
    return (
        <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
            <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
                {LOCALES.map((option) => (
                    <SegmentedButton
                        key={option}
                        selected={option === locale}
                        onClick={() => onChange(option)}
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
                            <Text>{LOCALE_LABELS[option]}</Text>
                        </SegmentedButton.Label>
                    </SegmentedButton>
                ))}
            </SingleChoiceSegmentedButtonRow>
        </Host>
    )
}
