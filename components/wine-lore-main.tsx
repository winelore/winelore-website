"use client"

import { User, CircleUser, LogOut, Wine, Trophy, ListTodo, ExternalLink } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted/50">
          <span className="font-medium text-card-foreground">{username}</span>
          <BadgeCheck className="h-5 w-5 text-blue-500" />
          <AvatarPlaceholder className="h-9 w-9" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] rounded-[32px] p-0 shadow-lg border-border bg-popover">
        {/* Group 1: Profile and Log Out */}
        <div className="flex gap-3 px-4 pb-3 pt-4">
          <a
            href="#"
            className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[24px] bg-transparent py-3.5 text-[15px] font-medium text-foreground transition-colors hover:bg-[#EBEBEB]"
          >
            <CircleUser className="h-6 w-6 stroke-[1.5]" />
            <span>Profile</span>
          </a>
          <a
            href="#"
            className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[24px] bg-transparent py-3.5 text-[15px] font-medium text-red-500 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-6 w-6 stroke-[1.5] text-red-500" />
            <span>Log Out</span>
          </a>
        </div>

        <div className="px-6">
          <div className="h-[1px] w-full bg-border/60" />
        </div>

        {/* Group 2: Navigation Links */}
        <div className="px-2 py-2">
          <a
            href="#"
            className="flex items-center gap-4 rounded-2xl px-4 py-3.5 text-[17px] text-foreground transition-colors hover:bg-muted/50"
          >
            <Wine className="h-6 w-6 stroke-[1.5] text-foreground" />
            <span>My Beverages</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-4 rounded-2xl px-4 py-3.5 text-[17px] text-foreground transition-colors hover:bg-muted/50"
          >
            <Trophy className="h-6 w-6 stroke-[1.5] text-foreground" />
            <span>My Competitions</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-4 rounded-2xl px-4 py-3.5 text-[17px] text-foreground transition-colors hover:bg-muted/50"
          >
            <ListTodo className="h-6 w-6 stroke-[1.5] text-foreground" />
            <span>My Assessments</span>
          </a>
        </div>

        <div className="px-6">
          <div className="h-[1px] w-full bg-border/60" />
        </div>

        {/* Group 3: AXUS ID Profile */}
        <div className="px-2 pb-4 pt-2">
          <a
            href="#"
            className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[17px] text-foreground transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                <AxusLogo className="h-8 w-auto object-contain max-w-none" />
              </div>
              <span>AXUS ID Profile</span>
            </div>
            <ExternalLink className="h-6 w-6 stroke-[1.5] text-foreground" />
          </a>
        </div>
      </PopoverContent>
    </Popover>
  )
}
