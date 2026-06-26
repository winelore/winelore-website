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
  prefix?: string
  suffix?: string
}

export function TranslatedText({ text, className, as: Component = "span", prefix = "", suffix = "" }: TranslatedTextProps) {
  const translated = useBackendTranslation(text)
  if (!text) return null
  
  // Прибираємо "(бал)" завжди, якщо це українська або угорська локаль або якщо є префікс
  let finalText = translated
  
  const removePostfixes = (str: string) => {
    let s = str
    if (s.includes("(бал)")) s = s.replace("(бал)", "")
    if (s.includes("(pont)")) s = s.replace("(pont)", "")
    return s.trim()
  }

  finalText = removePostfixes(finalText)

  if (prefix) {
    // Якщо перекладений текст вже починається з префікса (без врахування регістру),
    // то ми не додаємо префікс ще раз і використовуємо оригінальний регістр перекладу
    const trimmedPrefix = prefix.trim().toLowerCase()
    if (finalText.toLowerCase().startsWith(trimmedPrefix)) {
      // Якщо текст починається з префікса, переконуємось, що перша літера велика
      const result = finalText.charAt(0).toUpperCase() + finalText.slice(1)
      return <Component className={className}>{result}{suffix}</Component>
    }
    finalText = finalText.toLowerCase()
  }

  // Якщо є префікс "оцінка ", робимо узгодження для "смак" -> "смаку"
  if (prefix.toLowerCase().includes("оцінка") && finalText.toLowerCase() === "смак") {
    finalText = "смаку"
  }
  
  const combined = `${prefix}${finalText}`
  const result = combined.charAt(0).toUpperCase() + combined.slice(1)
  
  return <Component className={className}>{result}{suffix}</Component>
}
