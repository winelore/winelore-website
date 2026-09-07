"use client"

import { User, CircleUser, LogOut, Wine, Trophy, ListTodo, ExternalLink, Activity, ScrollText } from "lucide-react"
import { usePathname } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTranslation } from "@/lib/i18n/context"
import { BadgeCheck } from "lucide-react"

// These five are the only routes in the menu with no dedicated tab in
// AppHeader, so this menu is the one place that can show which of them is
// current.
function isMenuLinkActive(pathname: string | null, href: string): boolean {
  return pathname === href || (pathname?.startsWith(`${href}/`) ?? false)
}

function menuLinkClass(active: boolean): string {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
    active ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-700 hover:bg-slate-100/70"
  }`
}

function menuIconClass(active: boolean): string {
  return `h-5 w-5 stroke-[1.5] ${active ? "text-indigo-600" : "text-slate-500"}`
}

function AvatarPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 ${className}`}>
      <User className="h-1/2 w-1/2 text-indigo-300" />
    </div>
  )
}

function AxusLogo({ className }: { className?: string }) {
  return (
    <img
      src="/axus-logo.png"
      alt="AXUS"
      className={className}
    />
  )
}

interface ProfileMenuProps {
  username: string
}

const AXUS_ACCOUNT_URL = `${process.env.NEXT_PUBLIC_AXUS_ID_ISSUER || "https://axusid-website.vercel.app"}/account`

export function ProfileMenu({ username }: ProfileMenuProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-slate-100/70">
          <span className="font-medium text-slate-800">{username}</span>
          <BadgeCheck className="h-5 w-5 text-blue-500" />
          <AvatarPlaceholder className="h-9 w-9" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[260px] rounded-[24px] p-0 shadow-lg border-slate-100 bg-white/80 backdrop-blur-md">
        {/* Group 1: Profile and Log Out */}
        <div className="flex gap-3 px-2 pb-2 pt-3">
          <a
            href={AXUS_ACCOUNT_URL}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-[16px] bg-transparent py-2.5 text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <CircleUser className="h-5 w-5 stroke-[1.5]" />
            <span>{t("common.profile")}</span>
          </a>
          <a
            href="/auth/logout"
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-[16px] bg-transparent py-2.5 text-[14px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            <LogOut className="h-5 w-5 stroke-[1.5] text-rose-600" />
            <span>{t("common.logOut")}</span>
          </a>
        </div>

        <div className="px-5">
          <div className="h-[1px] w-full bg-slate-100" />
        </div>

        {/* Group 2: Navigation Links (personal scopes) */}
        <div className="px-2 py-1.5">
          <a href="/myCommissions" className={menuLinkClass(isMenuLinkActive(pathname, "/myCommissions"))}>
            <Activity className={menuIconClass(isMenuLinkActive(pathname, "/myCommissions"))} />
            <span>{t("common.myCommissions")}</span>
          </a>
          <a href="/myCompetitions" className={menuLinkClass(isMenuLinkActive(pathname, "/myCompetitions"))}>
            <Trophy className={menuIconClass(isMenuLinkActive(pathname, "/myCompetitions"))} />
            <span>{t("common.myCompetitions")}</span>
          </a>
          <a href="/myBeverages" className={menuLinkClass(isMenuLinkActive(pathname, "/myBeverages"))}>
            <Wine className={menuIconClass(isMenuLinkActive(pathname, "/myBeverages"))} />
            <span>{t("common.myBeverages")}</span>
          </a>
          <a href="/myTemplates" className={menuLinkClass(isMenuLinkActive(pathname, "/myTemplates"))}>
            <ListTodo className={menuIconClass(isMenuLinkActive(pathname, "/myTemplates"))} />
            <span>{t("common.myTemplates")}</span>
          </a>
          <a href="/myOutcomePolicies" className={menuLinkClass(isMenuLinkActive(pathname, "/myOutcomePolicies"))}>
            <ScrollText className={menuIconClass(isMenuLinkActive(pathname, "/myOutcomePolicies"))} />
            <span>{t("common.myOutcomePolicies")}</span>
          </a>
        </div>

        <div className="px-5">
          <div className="h-[1px] w-full bg-slate-100" />
        </div>

        {/* Group 3: AXUS ID Profile */}
        <div className="px-2 pb-3 pt-1.5">
          <a
            href={AXUS_ACCOUNT_URL}
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] text-slate-700 transition-colors hover:bg-slate-100/70"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                <AxusLogo className="h-6 w-auto object-contain max-w-none" />
              </div>
              <span>{t("common.axusIdProfile")}</span>
            </div>
            <ExternalLink className="h-5 w-5 stroke-[1.5] text-slate-500" />
          </a>
        </div>
      </PopoverContent>
    </Popover>
  )
}
