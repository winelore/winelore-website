import { useEffect, useState } from "react"
import { lookupBackendText, type Locale } from "@winelore/core/i18n"
import { getWebOrigin } from "../navigation/destinations"
import { useTranslation } from "./LocaleProvider"

/** Translations already fetched, for this run of the app. */
const cache = new Map<string, Promise<string>>()

/**
 * A backend text — a property name, stored in English — in the reader's
 * language: from the shared static table when it has it, otherwise from the
 * website's machine translation, which is what the web's `TranslatedText`
 * does. Failing that, the text as it is.
 */
export function translateBackendText(text: string, locale: Locale): Promise<string> {
    const trimmed = text.trim()
    if (!trimmed) return Promise.resolve(text)
    const known = lookupBackendText(trimmed, locale)
    if (known) return Promise.resolve(known)

    const key = `${locale}:${trimmed}`
    let pending = cache.get(key)
    if (!pending) {
        pending = (async () => {
            try {
                const response = await fetch(`${getWebOrigin()}/api/translate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: trimmed, targetLocale: locale }),
                })
                if (!response.ok) throw new Error(String(response.status))
                const data = (await response.json()) as { translatedText?: unknown }
                const translated = typeof data.translatedText === "string" ? data.translatedText.trim() : ""
                // The translation service sometimes answers with its own error text.
                if (!translated || translated.toUpperCase().includes("IS AN INVALID SOURCE LANGUAGE")) return trimmed
                return translated
            } catch {
                // Not cached, so a later screen can try again.
                cache.delete(key)
                return trimmed
            }
        })()
        cache.set(key, pending)
    }
    return pending
}

/** `translateBackendText` as a hook: the text at once, its translation when it arrives. */
export function useBackendText(text: string | null | undefined): string {
    const { locale } = useTranslation()
    const value = text ?? ""
    const [translated, setTranslated] = useState(() => lookupBackendText(value, locale) ?? value)

    useEffect(() => {
        setTranslated(lookupBackendText(value, locale) ?? value)
        if (!value.trim()) return
        let active = true
        translateBackendText(value, locale).then((result) => {
            if (active) setTranslated(result)
        })
        return () => {
            active = false
        }
    }, [value, locale])

    return translated
}
