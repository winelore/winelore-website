import en from "./locales/en"
import uk from "./locales/uk"
import type { Locale } from "./types"

export const messages: Record<Locale, typeof en> = {
  en,
  uk,
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

export function getDateLocale(locale: Locale): string {
  return locale === "uk" ? "uk-UA" : "en-GB"
}

export function formatDateTime(dateStr: string | null, locale: Locale): string {
  if (!dateStr) return translate(locale, "common.na")
  const date = new Date(dateStr)
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
