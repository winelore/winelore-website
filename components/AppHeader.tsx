"use client"

import type { LucideIcon } from "lucide-react"
import { Trophy, Wine, Home, Map } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ProfileMenu } from "@/components/wine-lore-main"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { MobileNavBar } from "@/components/mobile/MobileNavBar"
import { MobileTabBar } from "@/components/mobile/MobileTabBar"
import { NAV_TAB } from "@/components/PageTransition"
import { useTranslation } from "@/lib/i18n/context"

import { useCurrentUser } from "@/hooks/useCurrentUser"

export type AppTabId = "home" | "competitions" | "beverages" | "map" | "none"

interface AppHeaderProps {
  activeTab: AppTabId
  onTabChange?: (tab: AppTabId) => void
  /**
   * Phones only: show the bottom tab bar. Turn off for focused task screens
   * (scoring a wine, filling a create form) — like a pushed iOS screen that
   * hides the tab bar, it keeps the whole viewport for the task at hand.
   */
  showMobileTabBar?: boolean
}

export function AppHeader({
  activeTab,
  onTabChange,
  showMobileTabBar = true,
}: AppHeaderProps) {
  const { t } = useTranslation()
  const router = useRouter()
  // undefined until hydration has read the auth cookies; null when signed out.
  const currentUser = useCurrentUser()
  const mounted = currentUser !== undefined

  const tabs: { id: AppTabId; label: string; icon: LucideIcon; href: string }[] = [
    { id: "home", label: t("common.home"), icon: Home, href: "/" },
    { id: "competitions", label: t("common.competitions"), icon: Trophy, href: "/competitions" },
    { id: "beverages", label: t("common.beverages"), icon: Wine, href: "/beverages" },
    { id: "map", label: t("common.map"), icon: Map, href: "/map" },
  ]

  return (
    <>
    <MobileNavBar />
    {showMobileTabBar && (
      <MobileTabBar tabs={tabs} activeTab={activeTab} username={currentUser} />
    )}
    <header data-app-header className="hidden md:flex shrink-0 items-center border-b border-slate-100 bg-white px-3 py-3 sm:px-6 sm:py-4">
      <div className="flex flex-1 items-center justify-start min-w-0">
        <Link href="/" className="text-lg sm:text-2xl font-bold tracking-tight text-slate-800 transition-colors hover:text-slate-600 truncate">
          WineLore
        </Link>
      </div>

      <div className="flex-none">
        <nav className="flex items-center rounded-full border border-slate-100 bg-slate-50/50 p-0.5 sm:p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                aria-label={tab.label}
                onClick={() => {
                  if (onTabChange) {
                    onTabChange(tab.id)
                  } else {
                    router.push(tab.href, { transitionTypes: [NAV_TAB] })
                  }
                }}
                className={`flex items-center gap-1 sm:gap-2 rounded-full px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                     ? "border border-slate-100/50 bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : ""}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-3">
        <LanguageSwitcher />
        {!mounted ? (
          <div className="h-9 w-24 rounded-lg bg-slate-100 animate-pulse" />
        ) : currentUser ? (
          <ProfileMenu username={currentUser} />
        ) : (
          <a
            href="/auth/login"
            className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-indigo-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-indigo-500 shadow-sm"
          >
            <span>{t("common.signIn")}</span>
          </a>
        )}
      </div>
    </header>
    </>
  )
}
