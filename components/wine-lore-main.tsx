"use client"

import { User, CircleUser, LogOut, Wine, Trophy, ListTodo, ExternalLink } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTranslation } from "@/lib/i18n/context"
import { BadgeCheck } from "lucide-react"

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

export function ProfileMenu({ username }: ProfileMenuProps) {
  const { t } = useTranslation()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted/50">
          <span className="font-medium text-card-foreground">{username}</span>
          <BadgeCheck className="h-5 w-5 text-blue-500" />
          <AvatarPlaceholder className="h-9 w-9" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[260px] rounded-[24px] p-0 shadow-lg border-border bg-popover/80 backdrop-blur-md">
        {/* Group 1: Profile and Log Out */}
        <div className="flex gap-3 px-2 pb-2 pt-3">
          <a
            href="#"
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-[16px] bg-transparent py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-[#EBEBEB]"
          >
            <CircleUser className="h-5 w-5 stroke-[1.5]" />
            <span>{t("common.profile")}</span>
          </a>
          <a
            href="#"
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-[16px] bg-transparent py-2.5 text-[14px] font-medium text-red-500 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-5 w-5 stroke-[1.5] text-red-500" />
            <span>{t("common.logOut")}</span>
          </a>
        </div>

        <div className="px-5">
          <div className="h-[1px] w-full bg-border/60" />
        </div>

        {/* Group 2: Navigation Links */}
        <div className="px-2 py-1.5">
          <a
            href="/myBeverages"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-foreground transition-colors hover:bg-muted/50"
          >
            <Wine className="h-5 w-5 stroke-[1.5] text-foreground" />
            <span>{t("common.myBeverages")}</span>
          </a>
          <a
            href="/myCompetitions"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-foreground transition-colors hover:bg-muted/50"
          >
            <Trophy className="h-5 w-5 stroke-[1.5] text-foreground" />
            <span>{t("common.myCompetitions")}</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-foreground transition-colors hover:bg-muted/50"
          >
            <ListTodo className="h-5 w-5 stroke-[1.5] text-foreground" />
            <span>{t("common.myAssessments")}</span>
          </a>
        </div>

        <div className="px-5">
          <div className="h-[1px] w-full bg-border/60" />
        </div>

        {/* Group 3: AXUS ID Profile */}
        <div className="px-2 pb-3 pt-1.5">
          <a
            href="#"
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] text-foreground transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                <AxusLogo className="h-6 w-auto object-contain max-w-none" />
              </div>
              <span>{t("common.axusIdProfile")}</span>
            </div>
            <ExternalLink className="h-5 w-5 stroke-[1.5] text-foreground" />
          </a>
        </div>
      </PopoverContent>
    </Popover>
  )
}
