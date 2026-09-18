import { LOCALES, LOCALE_LABELS, type Locale } from "@winelore/core/i18n"
import { Segmented } from "./Segmented"

export interface LanguagePickerProps {
    locale: Locale
    onChange: (locale: Locale) => void
    accessibilityLabel?: string
}

const OPTIONS = LOCALES.map((locale) => ({ value: locale, label: LOCALE_LABELS[locale] }))

/** The language control: the system's segmented control, one segment per locale. */
export function LanguagePicker({ locale, onChange, accessibilityLabel }: LanguagePickerProps) {
    return <Segmented options={OPTIONS} value={locale} onChange={onChange} accessibilityLabel={accessibilityLabel} />
}
