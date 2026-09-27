"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import Cookies from "js-cookie"
import {
  translate,
  translateWithCount,
  formatStatus,
  formatBeverageType,
  formatReplicaType,
  formatEnumLabel,
  formatDateTime,
  formatShortDateTime,
  type MessageKey,
} from '@winelore/core/i18n'
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, type Locale } from '@winelore/core/i18n/types'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  tCount: (key: MessageKey, count: number, params?: Record<string, string | number>) => string
  formatStatus: (status: string) => string
  formatBeverageType: (type: string) => string
  formatReplicaType: (type: string) => string
  formatEnumLabel: (label: string) => string
  formatDateTime: (dateStr: string | null) => string
  formatShortDateTime: (dateStr: string | null) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE
  const cookie = Cookies.get(LOCALE_COOKIE)

  if (cookie && (LOCALES as string[]).includes(cookie)) return cookie as Locale

  const browserLang = navigator.language.toLowerCase()
  const language = browserLang.split("-")[0]
  if ((LOCALES as string[]).includes(language)) return language as Locale

  return DEFAULT_LOCALE
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setLocaleState(readInitialLocale())
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    document.documentElement.lang = locale
  }, [locale, isHydrated])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    Cookies.set(LOCALE_COOKIE, nextLocale, { expires: 365, sameSite: "lax" })
  }, [])

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (key, params) => translate(locale, key, params),
    tCount: (key, count, params) => translateWithCount(locale, key, count, params),
    formatStatus: (status) => formatStatus(status, locale),
    formatBeverageType: (type) => formatBeverageType(type, locale),
    formatReplicaType: (type) => formatReplicaType(type, locale),
    formatEnumLabel: (label) => formatEnumLabel(label, locale),
    formatDateTime: (dateStr) => formatDateTime(dateStr, locale),
    formatShortDateTime: (dateStr) => formatShortDateTime(dateStr, locale),
  }), [locale, setLocale])

  return (
      <LocaleContext.Provider value={value}>
        {children}
      </LocaleContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error("useTranslation must be used within LocaleProvider")
  }
  return context
}