import { useMemo } from "react"
import { getOrderedLocales, isProbablyInSlovakia, LOCALE_LABELS, type Locale } from "@winelore/core/i18n"
import { Segmented } from "./Segmented"

export interface LanguagePickerProps {
    locale: Locale
    onChange: (locale: Locale) => void
    accessibilityLabel?: string
}

/** The language control: the system's segmented control, one segment per locale. */
export function LanguagePicker({ locale, onChange, accessibilityLabel }: LanguagePickerProps) {
    const options = useMemo(() => {
        const ordered = getOrderedLocales(isProbablyInSlovakia())
        return ordered.map((item) => ({ value: item, label: LOCALE_LABELS[item] }))
    }, [])

    return <Segmented options={options} value={locale} onChange={onChange} accessibilityLabel={accessibilityLabel} />
}

