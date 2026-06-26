import { messages } from "./index"
import type { Locale } from "./types"

const memoryCache = new Map<string, string>()

const CACHE_PREFIX = "winelore-translate:"

function getCacheKey(text: string, targetLocale: Locale): string {
  return `${targetLocale}:${text}`
}

function readFromStorage(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(CACHE_PREFIX + key)
  } catch {
    return null
  }
}

function writeToStorage(key: string, value: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CACHE_PREFIX + key, value)
  } catch {
    // Ignore quota errors
  }
}

export async function translateBackendText(
  text: string,
  targetLocale: Locale
): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return text

  // 1. Check local dictionary first (static translations)
  const dictionary = (messages[targetLocale] as any)?.backend || {}
  
  // Try exact match
  if (dictionary[trimmed]) {
    return dictionary[trimmed]
  }
  
  // Try case-insensitive match
  const lowerTrimmed = trimmed.toLowerCase()
  const foundKey = Object.keys(dictionary).find(k => k.toLowerCase() === lowerTrimmed)
  if (foundKey) {
    return dictionary[foundKey]
  }

  const cacheKey = getCacheKey(trimmed, targetLocale)
  let cached = memoryCache.get(cacheKey) ?? readFromStorage(cacheKey)

  // If cached value is the error message, clear it
  if (cached && cached.toUpperCase().includes("IS AN INVALID SOURCE LANGUAGE")) {
    memoryCache.delete(cacheKey)
    if (typeof window !== "undefined") {
      localStorage.removeItem(CACHE_PREFIX + cacheKey)
    }
    cached = null
  }

  if (cached) {
    memoryCache.set(cacheKey, cached)
    return cached
  }

  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, targetLocale }),
    })

    if (!response.ok) {
      return trimmed
    }

    const data = await response.json()
    let translated = typeof data.translatedText === "string" ? data.translatedText : trimmed

    // Check if API returned an error message
    if (translated.toUpperCase().includes("IS AN INVALID SOURCE LANGUAGE")) {
      return trimmed
    }

    memoryCache.set(cacheKey, translated)
    writeToStorage(cacheKey, translated)
    return translated
  } catch {
    return trimmed
  }
}

export async function translateBackendTexts(
  texts: string[],
  targetLocale: Locale
): Promise<Record<string, string>> {
  const uniqueTexts = [...new Set(texts.map((text) => text.trim()).filter(Boolean))]
  const results: Record<string, string> = {}

  await Promise.all(
    uniqueTexts.map(async (text) => {
      results[text] = await translateBackendText(text, targetLocale)
    })
  )

  return results
}
