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
    }).catch(() => {
      if (!cancelled) {
        setTranslated(value)
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
  
  // Прибираємо "(бал)" / "(pont)" / Slovak "(bod|body|bodov)" — backend score-unit suffixes
  let finalText = translated
  
  const removePostfixes = (str: string) => {
    let s = str
    if (s.includes("(бал)")) s = s.replace("(бал)", "")
    if (s.includes("(pont)")) s = s.replace("(pont)", "")
    if (s.includes("(bodov)")) s = s.replace("(bodov)", "")
    if (s.includes("(body)")) s = s.replace("(body)", "")
    if (s.includes("(bodu)")) s = s.replace("(bodu)", "")
    if (s.includes("(bod)")) s = s.replace("(bod)", "")
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
