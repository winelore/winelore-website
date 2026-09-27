import { useState } from "react"
import { Pressable, Text } from "react-native"
import { DatePickerDialog, Host, TimePickerDialog } from "@expo/ui/jetpack-compose"
import { useTranslation } from "../i18n/LocaleProvider"
import { palette } from "../theme"
import { dateFieldStyles as styles, type DateTimeFieldProps } from "./DateTimeField"

/**
 * The value as a field; tapping it opens Material's date dialog and then its
 * time dialog, which is how Android sets a date and a time together.
 */
export function DateTimeField({ value, onChange, accessibilityLabel }: DateTimeFieldProps) {
    const { formatDateTime, t } = useTranslation()
    const [step, setStep] = useState<"closed" | "date" | "time">("closed")
    const [day, setDay] = useState<Date>(value)

    return (
        <>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                onPress={() => setStep("date")}
                style={styles.field}
            >
                <Text style={styles.label}>{formatDateTime(value.toISOString())}</Text>
            </Pressable>
            {step !== "closed" ? (
                <Host style={{ position: "absolute", width: 0, height: 0 }}>
                    {step === "date" ? (
                        <DatePickerDialog
                            initialDate={value.toISOString()}
                            color={palette.accent}
                            confirmButtonLabel={t("common.save")}
                            dismissButtonLabel={t("competition.cancel")}
                            onDateSelected={(selected) => {
                                // Material reports the day as UTC midnight.
                                const next = new Date(value)
                                next.setFullYear(selected.getUTCFullYear(), selected.getUTCMonth(), selected.getUTCDate())
                                setDay(next)
                                setStep("time")
                            }}
                            onDismissRequest={() => setStep("closed")}
                        />
                    ) : (
                        <TimePickerDialog
                            initialDate={day.toISOString()}
                            color={palette.accent}
                            confirmButtonLabel={t("common.save")}
                            dismissButtonLabel={t("competition.cancel")}
                            onDateSelected={(selected) => {
                                const next = new Date(day)
                                next.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
                                onChange(next)
                                setStep("closed")
                            }}
                            onDismissRequest={() => setStep("closed")}
                        />
                    )}
                </Host>
            ) : null}
        </>
    )
}
