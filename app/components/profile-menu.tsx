"use client"

import { User, LogOut, Wine, Trophy, Target, ExternalLink } from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import { BadgeCheck } from "lucide-react"

// Аватарка залишається з градієнтом, як у макеті
function AvatarPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 ${className}`}>
      <User className="h-1/2 w-1/2 text-indigo-300" />
    </div>
  )
}

// !!! ВРУЧНУ ОНОВЛЕНА ФУНКЦІЯ: ТЕПЕР ВИКОРИСТОВУЄ ТВІЙ PNG ЛОГОТИП !!!
function AxusLogo({ className }: { className?: string }) {
  return (
    <img
      src="/axus-logo.png" 
      alt="AXUS ID Profile Logo"
      // ЗАМІНИВ className={className} на конкретний розмір h-7 w-7:
      className="h-7 w-7 object-contain" 
    />
  )
}

interface ProfileMenuProps {
  username: string
}

export function ProfileMenu({ username }: ProfileMenuProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted/50">
          <span className="font-medium text-card-foreground">{username}</span>
          <BadgeCheck className="h-5 w-5 text-blue-500" />
          <AvatarPlaceholder className="h-9 w-9" />
        </button>
      </Popover.Trigger>
      <Popover.Content align="end" className="w-56 p-0 bg-white border border-border rounded-lg shadow-xl z-50">
     
        {/* Group 1: Profile and Log Out (синій фон профілю, червоний виходу) */}
        <div className="flex border-b border-border">
          <a
            href="#"
            className="flex flex-1 flex-col items-center gap-1 rounded-tl-md bg-indigo-50 px-4 py-3 text-sm font-medium text-card-foreground transition-colors hover:bg-indigo-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card-foreground text-card">
              <User className="h-4 w-4" />
            </div>
            <span>Profile</span>
          </a>
          <a
            href="#"
            className="flex flex-1 flex-col items-center gap-1 rounded-tr-md px-4 py-3 text-sm font-medium text-card-foreground transition-colors hover:bg-red-50"
          >
            <div className="flex h-8 w-8 items-center justify-center">
              <LogOut className="h-5 w-5 text-red-500" />
            </div>
            <span className="text-red-500">Log Out</span>
          </a>
        </div>

        {/* Group 2: Navigation Links (список іконок) */}
        <div className="border-b border-border py-1">
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-card-foreground transition-colors hover:bg-indigo-50"
          >
            <Wine className="h-4 w-4 text-muted-foreground" />
            <span>My Beverages</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-card-foreground transition-colors hover:bg-indigo-50"
          >
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span>My Competitions</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-card-foreground transition-colors hover:bg-indigo-50"
          >
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>My Assessments</span>
          </a>
        </div>

        {/* Group 3: AXUS ID Profile (з іконкою зовнішнього посилання та PNG лого) */}
        <div className="py-1">
          <a
            href="#"
            className="flex items-center justify-between px-4 py-2.5 text-sm text-card-foreground transition-colors hover:bg-indigo-50"
          >
            <div className="flex items-center gap-3">
              <AxusLogo className="h-4 w-4" />
              <span>AXUS ID Profile</span>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </Popover.Content>
    </Popover.Root>
  )
}