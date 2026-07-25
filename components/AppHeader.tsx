"use client"

import type { LucideIcon } from "lucide-react"
import { FileText, Trophy, Wine, Home } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ProfileMenu } from "@/components/wine-lore-main"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useTranslation } from "@/lib/i18n/context"

import { useEffect, useState } from "react"
import Cookies from "js-cookie"
import { getUsernamesAction } from "@/app/userActions"

export type AppTabId = "home" | "competitions" | "wines" | "beverages" | "none"

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
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const storedAuid = Cookies.get("auid")
    const storedUsername = Cookies.get("username")
    const storedDisplayName = Cookies.get("displayName")
    
    if (storedAuid) {
      if (storedDisplayName) {
        setCurrentUser(storedDisplayName)
      } else {
        setCurrentUser(storedUsername ? `@${storedUsername}` : storedAuid)
        
        getUsernamesAction([storedAuid])
          .then((res) => {
            if (res[storedAuid]) {
              setCurrentUser(res[storedAuid])
              Cookies.set("displayName", res[storedAuid], { path: "/", secure: false, sameSite: "lax" })
            }
          })
          .catch((err) => {
            console.error("Failed to fetch display name in header:", err)
          })
      }
    }
  }, [])

  const tabs: { id: AppTabId; label: string; icon: LucideIcon; href: string }[] = [
    { id: "home", label: t("common.home"), icon: Home, href: "/" },
    { id: "competitions", label: t("common.competitions"), icon: Trophy, href: "/competitions" },
    {
      id: wineTab ? "wines" : "beverages",
      label: wineTab ? t("common.wines") : t("common.beverages"),
      icon: Wine,
      href: "/beverages"
    },
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
            const isActive = activeTab === tab.id || (activeTab === "wines" && tab.id === "beverages") || (activeTab === "beverages" && tab.id === "wines")
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (onTabChange) {
                    onTabChange(tab.id)
                  } else {
                    router.push(tab.href)
                  }
                }}
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
        {!mounted ? (
          <div className="h-9 w-24 rounded-lg bg-slate-100 animate-pulse" />
        ) : currentUser ? (
          <ProfileMenu username={currentUser} />
        ) : (
          <a
            href="/auth/login"
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 shadow-sm"
          >
            <span>{t("common.signIn")}</span>
          </a>
        )}
      </div>
    </header>
  )
}
