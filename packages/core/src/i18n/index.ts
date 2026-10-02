import en from "./locales/en"
import uk from "./locales/uk"
import hu from "./locales/hu"
import sk from "./locales/sk"
import type { TranslationKey } from "./locales/en"
import { LOCALES, SLOVAKIA_LOCALES, type Locale } from "./types"

// Locale, LOCALES, LOCALE_LABELS, DEFAULT_LOCALE and LOCALE_COOKIE are part of
// this module's public surface; consumers should not reach into ./types.
export * from "./types"

export const messages: Record<Locale, TranslationKey> = {
  en,
  uk,
  hu,
  sk,
}

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
    ? {
      [K in keyof T & string]: T[K] extends object
          ? NestedKeyOf<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>
          : Prefix extends ""
              ? K
              : `${Prefix}.${K}`
    }[keyof T & string]
    : never

export type MessageKey = NestedKeyOf<typeof en>

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === "string" ? current : undefined
}

export function translate(
    locale: Locale,
    key: MessageKey,
    params?: Record<string, string | number>
): string {
  const template = getNestedValue(messages[locale] as Record<string, unknown>, key)
      ?? getNestedValue(messages.en as Record<string, unknown>, key)
      ?? key

  if (!params) return template

  return Object.entries(params).reduce(
      (result, [paramKey, paramValue]) =>
          result.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, "g"), String(paramValue)),
      template
  )
}

// Slavic locales (uk) need 3 plural forms: one (1, 21, 31...), few (2-4, 22-24...),
// many (0, 5-20, 25-30...). English/Hungarian only ever resolve to "" or "_plural".
function resolvePluralSuffix(locale: Locale, count: number): "" | "_few" | "_plural" {
  if (locale === "sk") {
    if (count === 1) return ""
    if (count >= 2 && count <= 4) return "_few"
    return "_plural"
  }
  if (locale !== "uk") {
    return count === 1 ? "" : "_plural"
  }
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return ""
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "_few"
  return "_plural"
}

export function translateWithCount(
    locale: Locale,
    key: MessageKey,
    count: number,
    params?: Record<string, string | number>
): string {
  const suffix = resolvePluralSuffix(locale, count)
  const candidateKey = `${key}${suffix}` as MessageKey
  const hasCandidate = getNestedValue(messages[locale] as Record<string, unknown>, candidateKey) !== undefined
  // Fall back through _plural, then the bare key, if a form isn't defined for this locale.
  const resolvedKey = hasCandidate
      ? candidateKey
      : suffix === "_few" && getNestedValue(messages[locale] as Record<string, unknown>, `${key}_plural` as MessageKey) !== undefined
          ? (`${key}_plural` as MessageKey)
          : key
  return translate(locale, resolvedKey, { count, ...params })
}

export function getDateLocale(locale: Locale): string {
  // 💡 ОНОВЛЕНО: додано повернення угорської локалі для Intl.DateTimeFormat
  if (locale === "uk") return "uk-UA"
  if (locale === "hu") return "hu-HU"
  if (locale === "sk") return "sk-SK"
  return "en-GB"
}

export function formatDateTime(dateStr: string | null, locale: Locale): string {
  if (!dateStr) return translate(locale, "common.na")
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return translate(locale, "common.na")
  if (isNaN(date.getTime())) return translate(locale, "common.na")
  return new Intl.DateTimeFormat(getDateLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatShortDateTime(dateStr: string | null, locale: Locale): string {
  if (!dateStr) return translate(locale, "common.na")
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat(getDateLocale(locale), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatStatus(status: string, locale: Locale): string {
  const statusKey = `status.${status}` as MessageKey
  const translated = getNestedValue(messages[locale] as Record<string, unknown>, statusKey)
  if (translated) return translated

  return status
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
}

export function formatBeverageType(type: string, locale: Locale): string {
  const key = `beverageType.${type}` as MessageKey
  const translated = getNestedValue(messages[locale] as Record<string, unknown>, key)
  return translated ?? type
}

export function formatReplicaType(type: string, locale: Locale): string {
  const key = `replicaType.${type}` as MessageKey
  const translated = getNestedValue(messages[locale] as Record<string, unknown>, key)
  return translated ?? type
}

export function formatEnumLabel(label: string, locale: Locale): string {
  const statusTranslated = getNestedValue(messages[locale] as Record<string, unknown>, `status.${label}`)
  if (statusTranslated) return statusTranslated

  const typeTranslated = getNestedValue(messages[locale] as Record<string, unknown>, `beverageType.${label}`)
  if (typeTranslated) return typeTranslated

  return label
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
}
/**
 * A text the backend stores in English — a property name, say — in the
 * locale's own words, when the static `backend` table has it (exactly, else
 * ignoring case). Null means the table does not, and the caller may ask the
 * web's machine translation instead.
 */
export function lookupBackendText(text: string, locale: Locale): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const dictionary = ((messages[locale] as Record<string, unknown>).backend ?? {}) as Record<string, string>
  if (dictionary[trimmed]) return dictionary[trimmed]
  const lower = trimmed.toLowerCase()
  const key = Object.keys(dictionary).find((candidate) => candidate.toLowerCase() === lower)
  return key ? dictionary[key] : null
}

/**
 * Detects whether the user is probably in Hungary.
 * Checked via country hint, Budapest timezone, or HU locale signals.
 */
export function isProbablyInHungary(countryHint?: string | null): boolean {
  if (countryHint) {
    const hint = countryHint.toUpperCase()
    if (hint === "HU") return true
    if (hint === "SK") return false
  }

  if (typeof window === "undefined") return false

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.toLowerCase()
    if (tz === "europe/budapest") return true

    if (typeof navigator !== "undefined") {
      const languages = (navigator.languages && navigator.languages.length > 0)
        ? navigator.languages
        : [navigator.language].filter(Boolean)

      const hasHuRegion = languages.some((l) => /[-_]HU\b/i.test(l))
      const hasSkSignal = languages.some((l) => /^sk\b/i.test(l) || /[-_]SK\b/i.test(l))

      if (hasHuRegion && !hasSkSignal && tz !== "europe/bratislava") {
        return true
      }
    }
  } catch {
    // fallback
  }

  return false
}

/**
 * Detects whether the user is probably in Slovakia (and NOT in Hungary).
 * When true, Slovenčina and Magyar should be swapped so Slovenčina is higher.
 */
export function isProbablyInSlovakia(countryHint?: string | null): boolean {
  if (countryHint) {
    const hint = countryHint.toUpperCase()
    if (hint === "SK") return true
    if (hint === "HU") return false
  }

  if (isProbablyInHungary(countryHint)) return false

  if (typeof window === "undefined") return false

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.toLowerCase()
    if (tz === "europe/bratislava") return true

    if (typeof navigator !== "undefined") {
      const languages = (navigator.languages && navigator.languages.length > 0)
        ? navigator.languages
        : [navigator.language].filter(Boolean)

      const hasSlovakiaSignal = languages.some((l) => {
        const lower = l.toLowerCase()
        return lower === "sk" || lower.startsWith("sk-") || lower.startsWith("sk_") || lower.endsWith("-sk") || lower.endsWith("_sk") || /[-_]sk\b/i.test(lower)
      })

      if (hasSlovakiaSignal) return true
    }
  } catch {
    // fallback
  }

  return false
}

/**
 * Returns the ordered list of locales.
 * If in Slovakia (and not in Hungary), Slovenčina and Magyar are swapped so that Slovenčina is higher.
 */
export function getOrderedLocales(inSlovakia: boolean = false): Locale[] {
  return inSlovakia ? SLOVAKIA_LOCALES : LOCALES
}

