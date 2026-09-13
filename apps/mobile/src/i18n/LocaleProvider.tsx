import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import * as SecureStore from "expo-secure-store"
import {
    DEFAULT_LOCALE,
    LOCALES,
    formatBeverageType,
    formatDateTime,
    formatEnumLabel,
    formatReplicaType,
    formatShortDateTime,
    formatStatus,
    translate,
    translateWithCount,
    type Locale,
    type MessageKey,
} from "@winelore/core/i18n"

const STORAGE_KEY = "winelore_locale"

/**
 * The device's preferred language, if the app has a translation for it.
 *
 * Read through Intl rather than expo-localization: Hermes ships Intl, so this
 * needs no extra native module — and every native module added here is another
 * pod and another rebuild.
 */
function detectDeviceLocale(): Locale {
    try {
        const tag = new Intl.DateTimeFormat().resolvedOptions().locale ?? ""
        const language = tag.toLowerCase().split("-")[0]
        return (LOCALES as string[]).includes(language) ? (language as Locale) : DEFAULT_LOCALE
    } catch {
        return DEFAULT_LOCALE
    }
}

interface LocaleContextValue {
    locale: Locale
    setLocale: (locale: Locale) => void
    /** True until the stored preference has been read. */
    isLoading: boolean
    t: (key: MessageKey, params?: Record<string, string | number>) => string
    tCount: (key: MessageKey, count: number, params?: Record<string, string | number>) => string
    formatEnumLabel: (label: string) => string
    formatStatus: (status: string) => string
    formatBeverageType: (type: string) => string
    formatReplicaType: (type: string) => string
    formatDateTime: (value: string | null) => string
    formatShortDateTime: (value: string | null) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let active = true
        SecureStore.getItemAsync(STORAGE_KEY)
            .then((stored) => {
                if (!active) return
                const valid = stored && (LOCALES as string[]).includes(stored)
                setLocaleState(valid ? (stored as Locale) : detectDeviceLocale())
            })
            .catch(() => {
                if (active) setLocaleState(detectDeviceLocale())
            })
            .finally(() => {
                if (active) setIsLoading(false)
            })
        return () => {
            active = false
        }
    }, [])

    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next)
        // Persisting is best-effort; a failure must not undo the change the
        // judge just made on screen.
        SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {})
    }, [])

    const value = useMemo<LocaleContextValue>(
        () => ({
            locale,
            setLocale,
            isLoading,
            t: (key, params) => translate(locale, key, params),
            tCount: (key, count, params) => translateWithCount(locale, key, count, params),
            formatEnumLabel: (label) => formatEnumLabel(label, locale),
            formatStatus: (status) => formatStatus(status, locale),
            formatBeverageType: (type) => formatBeverageType(type, locale),
            formatReplicaType: (type) => formatReplicaType(type, locale),
            formatDateTime: (value) => formatDateTime(value, locale),
            formatShortDateTime: (value) => formatShortDateTime(value, locale),
        }),
        [locale, setLocale, isLoading],
    )

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useTranslation(): LocaleContextValue {
    const context = useContext(LocaleContext)
    if (!context) throw new Error("useTranslation must be used inside <LocaleProvider>")
    return context
}
