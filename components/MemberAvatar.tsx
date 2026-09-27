"use client"

import React from "react"
import { Crown } from "lucide-react"
import { memberInitials } from "@winelore/core/commission"
import { AxusAvatar } from "@/components/AxusAvatar"

export function getAvatarGradient(auid: number | string): string {
    const gradients = [
        "from-pink-500 via-rose-500 to-red-500",
        "from-indigo-500 via-purple-500 to-pink-500",
        "from-blue-500 via-teal-500 to-emerald-500",
        "from-amber-400 via-orange-500 to-red-500",
        "from-violet-600 via-purple-600 to-indigo-600",
        "from-cyan-500 via-blue-500 to-indigo-500",
        "from-emerald-400 via-teal-500 to-cyan-500",
        "from-fuchsia-500 via-purple-600 to-pink-600",
    ]
    const num = typeof auid === "number" ? auid : parseInt(String(auid), 10) || 0
    const idx = Math.abs(num) % gradients.length
    return gradients[idx]
}

export interface MemberAvatarProps {
    auid?: (number | string)[] | number | string | null
    role?: string | null
    username?: string
    imageUrl?: string | null
    className?: string
    showCrown?: boolean
}

export function MemberAvatar({
    auid,
    role,
    username,
    imageUrl,
    className = "h-10 w-10 shrink-0",
    showCrown = true,
}: MemberAvatarProps) {
    const rawAuid = Array.isArray(auid) ? auid[0] : auid
    const numAuid = typeof rawAuid === "number" ? rawAuid : parseInt(String(rawAuid || 0), 10) || 0
    const gradient = getAvatarGradient(numAuid)
    const initials = memberInitials(username, numAuid)
    const isHead = role === "HEAD"

    return (
        <div className={`relative shrink-0 ${className}`}>
            <AxusAvatar
                imageUrl={imageUrl}
                alt={username || `Member ${numAuid}`}
                className="h-full w-full rounded-full object-cover shadow-sm border border-white/10"
                fallback={
                    <div className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white font-bold text-[10px] sm:text-[11px] shadow-sm border border-white/10 select-none`}>
                        <span>{initials}</span>
                    </div>
                }
            />
            {showCrown && isHead && (
                <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-background shadow-xs">
                    <Crown className="w-2.5 h-2.5 text-white" />
                </div>
            )}
        </div>
    )
}
