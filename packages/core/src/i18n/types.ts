export type Locale = "en" | "uk" | "hu" | "sk"

export const LOCALES: Locale[] = ["en", "uk", "hu", "sk"]

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  uk: "Українська",
  hu: "Magyar",
  sk: "Slovenčina",
}

export const DEFAULT_LOCALE: Locale = "en"

export const LOCALE_COOKIE = "winelore-locale"
export const COUNTRY_COOKIE = "winelore-country"

/** Locales ordered with Slovenčina before Magyar for users in Slovakia. */
export const SLOVAKIA_LOCALES: Locale[] = ["en", "uk", "sk", "hu"]