import { Host, Picker, Text } from "@expo/ui/swift-ui"
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers"
import { LOCALES, LOCALE_LABELS, type Locale } from "@winelore/core/i18n"
import type { LanguagePickerProps } from "./LanguagePicker"

/**
 * A SwiftUI segmented `Picker` — a real UISegmentedControl, Liquid Glass on
 * iOS 26 — where the web's phone sheet draws an imitation of one.
 */
export function LanguagePicker({ locale, onChange }: LanguagePickerProps) {
    return (
        <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
            <Picker
                selection={locale}
                onSelectionChange={(selection) => onChange(selection as Locale)}
                modifiers={[pickerStyle("segmented")]}
            >
                {LOCALES.map((option) => (
                    <Text key={option} modifiers={[tag(option)]}>
                        {LOCALE_LABELS[option]}
                    </Text>
                ))}
            </Picker>
        </Host>
    )
}
