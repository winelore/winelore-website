"use client"

import { LocaleProvider } from "@/lib/i18n/context"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      {children}
      <Toaster position="top-right" richColors />
    </LocaleProvider>
  )
}
