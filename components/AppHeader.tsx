"use client"

import type { LucideIcon } from "lucide-react"
import { FileText, Trophy, Wine } from "lucide-react"
import Link from "next/link"
import { ProfileMenu } from "@/components/wine-lore-main"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useTranslation } from "@/lib/i18n/context"

export type AppTabId = "feed" | "competitions" | "wines" | "beverages"

interface AppHeaderProps {
  activeTab: AppTabId
  onTabChange?: (tab: AppTabId) => void
  username?: string
  wineTab?: boolean
}

export function AppHeader({
  activeTab,
  onTabChange,
  username = "likespro",
  wineTab = false,
}: AppHeaderProps) {
  const { t } = useTranslation()

  const tabs: { id: AppTabId; label: string; icon: LucideIcon }[] = [
    //{ id: "feed", label: t("common.feed"), icon: FileText },
    /*{ id: "competitions", label: t("common.competitions"), icon: Trophy },*/
    /*{
      id: wineTab ? "wines" : "beverages",
      label: wineTab ? t("common.wines") : t("common.beverages"),
      icon: Wine,
    },*/
  ]

  return (
    <header className="flex shrink-0 items-center border-b border-slate-100 bg-white px-6 py-4">
      <div className="flex flex-1 items-center justify-start">
        <Link href="/" className="text-2xl font-bold tracking-tight text-slate-800 transition-colors hover:text-slate-600">
          WineLore
        </Link>
      </div>

      <div className="flex-none">
        <nav className="flex items-center rounded-full border border-slate-100 bg-slate-50/50 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border border-slate-100/50 bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : ""}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <LanguageSwitcher />
        <ProfileMenu username={username} />
      </div>
    </header>
  )
}
