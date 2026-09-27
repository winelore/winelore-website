import { Host, Picker, Text } from "@expo/ui/swift-ui"
import { font, pickerStyle, tag, tint } from "@expo/ui/swift-ui/modifiers"
import { palette } from "../theme"
import type { MenuPickerProps } from "./MenuPicker"

/**
 * A SwiftUI menu `Picker`: the current value as a button that opens the
 * system menu, with a check beside the chosen one.
 */
export function MenuPicker<T extends string>({ options, value, onChange }: MenuPickerProps<T>) {
    return (
        <Host matchContents>
            <Picker
                selection={value}
                onSelectionChange={(selection) => onChange(selection as T)}
                modifiers={[pickerStyle("menu"), tint(palette.accent), font({ size: 13, weight: "semibold" })]}
            >
                {options.map((option) => (
                    <Text key={option.value} modifiers={[tag(option.value)]}>
                        {option.label}
                    </Text>
                ))}
            </Picker>
        </Host>
    )
}
