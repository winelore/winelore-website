import { NextResponse } from "next/server"
import type { Locale } from "@/lib/i18n/types"

const serverCache = new Map<string, string>()

async function fetchTranslation(text: string, targetLocale: Locale): Promise<string> {
  const langpair = targetLocale === "uk" ? "en|uk" : "uk|en"

  const url = new URL("https://api.mymemory.translated.net/get")
  url.searchParams.set("q", text)
  url.searchParams.set("langpair", langpair)

  const response = await fetch(url.toString(), {
    next: { revalidate: 86400 },
  })

  if (!response.ok) {
    throw new Error("Translation request failed")
  }

  const data = await response.json()
  const translated = data?.responseData?.translatedText

  // Check if API returned an error message in translatedText
  // MyMemory sometimes returns error messages as translatedText
  if (typeof translated === "string" && translated.toUpperCase().includes("IS AN INVALID SOURCE LANGUAGE")) {
    console.error("MyMemory API error:", translated)
    return text
  }

  if (typeof translated !== "string" || !translated.trim()) {
    return text
  }

  return translated
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const text = typeof body.text === "string" ? body.text.trim() : ""
    const targetLocale = body.targetLocale === "uk" ? "uk" : "en"

    if (!text) {
      return NextResponse.json({ translatedText: "" })
    }

    const cacheKey = `${targetLocale}:${text}`
    const cached = serverCache.get(cacheKey)
    if (cached) {
      // If cached value is the error message, clear it and re-fetch
      if (cached.toUpperCase().includes("IS AN INVALID SOURCE LANGUAGE")) {
        serverCache.delete(cacheKey)
      } else {
        return NextResponse.json({ translatedText: cached })
      }
    }

    let translated = await fetchTranslation(text, targetLocale as Locale)

    serverCache.set(cacheKey, translated)
    return NextResponse.json({ translatedText: translated })
  } catch {
    return NextResponse.json({ translatedText: "" }, { status: 500 })
  }
}
