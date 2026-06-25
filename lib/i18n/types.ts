export type Locale = "en" | "uk"

export const LOCALES: Locale[] = ["en", "uk"]

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  uk: "Українська",
}

export const DEFAULT_LOCALE: Locale = "uk"

export const LOCALE_COOKIE = "winelore-locale"
