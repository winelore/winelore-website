import { useState } from "react"
import { DropdownMenu, DropdownMenuItem, Host, Text, TextButton } from "@expo/ui/jetpack-compose"
import { palette } from "../theme"
import type { MenuPickerProps } from "./MenuPicker"

/** A Material 3 dropdown menu, opened from a text button showing the current value. */
export function MenuPicker<T extends string>({ options, value, onChange }: MenuPickerProps<T>) {
    const [open, setOpen] = useState(false)
    const current = options.find((option) => option.value === value)
    return (
        <Host matchContents>
            <DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)} color={palette.surface}>
                <DropdownMenu.Trigger>
                    <TextButton onClick={() => setOpen(true)}>
                        <Text color={palette.accent}>{`${current?.label ?? ""} ▾`}</Text>
                    </TextButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Items>
                    {options.map((option) => (
                        <DropdownMenuItem
                            key={option.value}
                            onClick={() => {
                                setOpen(false)
                                onChange(option.value)
                            }}
                        >
                            <DropdownMenuItem.Text>
                                <Text>{option.value === value ? `✓ ${option.label}` : option.label}</Text>
                            </DropdownMenuItem.Text>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenu.Items>
            </DropdownMenu>
        </Host>
    )
}
