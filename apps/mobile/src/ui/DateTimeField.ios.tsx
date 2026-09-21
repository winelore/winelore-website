import { DatePicker, Host } from "@expo/ui/swift-ui"
import { datePickerStyle, labelsHidden, tint } from "@expo/ui/swift-ui/modifiers"
import { palette } from "../theme"
import type { DateTimeFieldProps } from "./DateTimeField"

/**
 * SwiftUI's compact `DatePicker`: the date and time as two tappable capsules,
 * each opening the system's calendar or time wheel in a popover — the
 * platform's own form of the web's `datetime-local` input.
 */
export function DateTimeField({ value, onChange }: DateTimeFieldProps) {
    return (
        <Host matchContents>
            <DatePicker
                selection={value}
                onDateChange={onChange}
                displayedComponents={["date", "hourAndMinute"]}
                modifiers={[datePickerStyle("compact"), labelsHidden(), tint(palette.accent)]}
            />
        </Host>
    )
}
