export type Locale = "en" | "uk" | "hu" | "sk"

export const LOCALES: Locale[] = ["en", "uk", "hu", "sk"]

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  uk: "Українська",
  hu: "Magyar",
  sk: "Slovenčina",
}

export const DEFAULT_LOCALE: Locale = "uk"

export const LOCALE_COOKIE = "winelore-locale"