"use client"

import type { ElementType } from "react"
import { useEffect, useState } from "react"
import { translateBackendText } from "./backend-translate"
import { useTranslation } from "./context"

export function useBackendTranslation(text: string | null | undefined): string {
  const { locale } = useTranslation()
  const [translated, setTranslated] = useState(text ?? "")

  useEffect(() => {
    const value = text ?? ""
    setTranslated(value)

    if (!value.trim()) return

    let cancelled = false

    translateBackendText(value, locale).then((result) => {
      if (!cancelled) {
        setTranslated(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [text, locale])

  return translated
}

interface TranslatedTextProps {
  text: string | null | undefined
  className?: string
  as?: ElementType
}

export function TranslatedText({ text, className, as: Component = "span" }: TranslatedTextProps) {
  const translated = useBackendTranslation(text)
  if (!text) return null
  return <Component className={className}>{translated}</Component>
}
