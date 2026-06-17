"use client"

import { User, CircleUser, LogOut, Wine, Trophy, ListTodo, ExternalLink } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { BadgeCheck } from "lucide-react"

function AvatarPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/40 dark:border-zinc-700/40 ${className}`}>
      <User className="h-1/2 w-1/2 text-zinc-400 dark:text-zinc-500" />
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
        <button className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer active:scale-98">
          <span className="font-medium text-foreground text-sm pl-1">{username}</span>
          <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />
          <AvatarPlaceholder className="h-8 w-8" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[240px] rounded-2xl p-0.5 shadow-lg border border-zinc-200/60 dark:border-zinc-850 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md">
        {/* Group 1: Profile and Log Out */}
        <div className="flex gap-2 p-1.5">
          <a
            href="#"
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-transparent py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-150 dark:hover:bg-zinc-800"
          >
            <CircleUser className="h-4 w-4 stroke-[1.8] text-zinc-500 dark:text-zinc-400" />
            <span>Profile</span>
          </a>
          <a
            href="#"
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-transparent py-2 text-xs font-semibold text-red-500 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <LogOut className="h-4 w-4 stroke-[1.8] text-red-500 dark:text-red-400" />
            <span>Log Out</span>
          </a>
        </div>

        <div className="h-[1px] w-full bg-zinc-100 dark:bg-zinc-800/60" />

        {/* Group 2: Navigation Links */}
        <div className="p-1">
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-850"
          >
            <Wine className="h-4 w-4 stroke-[1.8] text-zinc-500 dark:text-zinc-400" />
            <span className="font-medium">My Beverages</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-850"
          >
            <Trophy className="h-4 w-4 stroke-[1.8] text-zinc-500 dark:text-zinc-400" />
            <span className="font-medium">My Competitions</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-850"
          >
            <ListTodo className="h-4 w-4 stroke-[1.8] text-zinc-500 dark:text-zinc-400" />
            <span className="font-medium">My Assessments</span>
          </a>
        </div>

        <div className="h-[1px] w-full bg-zinc-100 dark:bg-zinc-800/60" />

        {/* Group 3: AXUS ID Profile */}
        <div className="p-1">
          <a
            href="#"
            className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-850"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                <AxusLogo className="h-5 w-auto object-contain max-w-none" />
              </div>
              <span className="font-medium">AXUS ID Profile</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 stroke-[1.8] text-zinc-400 dark:text-zinc-550" />
          </a>
        </div>
      </PopoverContent>
    </Popover>
  )
}
