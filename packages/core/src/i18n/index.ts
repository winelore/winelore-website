import en from "./locales/en"
import uk from "./locales/uk"
import hu from "./locales/hu" // 💡 ДОДАНО: імпорт угорської локалі
import type { TranslationKey } from "./locales/en"
import type { Locale } from "./types"

export const messages: Record<Locale, TranslationKey> = {
  en,
  uk,
  hu, // 💡 ДОДАНО: реєстрація в об'єкті повідомлень
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