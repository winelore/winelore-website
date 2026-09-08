"use client"

import React from "react"
import { Crown, GraduationCap } from "lucide-react"

const GRADIENTS = [
    "from-pink-500 via-rose-500 to-red-500",
    "from-indigo-500 via-purple-500 to-pink-500",
    "from-blue-500 via-teal-500 to-emerald-500",
    "from-amber-400 via-orange-500 to-red-500",
    "from-violet-600 via-purple-600 to-indigo-600",
    "from-cyan-500 via-blue-500 to-indigo-500",
    "from-emerald-400 via-teal-500 to-cyan-500",
    "from-fuchsia-500 via-purple-600 to-pink-600",
]

export function getAvatarGradient(auid: number): string {
    return GRADIENTS[Math.abs(auid) % GRADIENTS.length]
}

function initialsFor(auid: number, username?: string): string {
    if (username) {
        const base = username.startsWith("@") ? username.slice(1) : username
        return base.slice(0, 2).toUpperCase()
    }
    return auid ? `${auid}`.slice(-2) : "?"
}

/**
 * Gradient identity avatar. The competition page (`HolderAvatar`) and the
 * commission page (`MemberAvatar`) each carried their own copy of the gradient
 * table and initials logic; the only real difference was the role badge, which
 * is now a prop.
 */
export function UserAvatar({
    auid,
    username,
    role,
    className = "h-8 w-8",
}: {
    auid: number
    username?: string
    role?: string
    className?: string
}) {
    return (
        <div
            className={`relative flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br text-[11px] font-bold text-white shadow-sm ${getAvatarGradient(auid)} ${className}`}
            title={username || String(auid)}
        >
            <span aria-hidden>{initialsFor(auid, username)}</span>
            <span className="sr-only">{username || String(auid)}</span>
            {role === "HEAD" && (
                <span className="absolute -right-1 -top-1 rounded-full border border-white bg-amber-500 p-0.5 shadow-sm">
                    <Crown className="h-2.5 w-2.5 text-white" />
                </span>
            )}
            {role === "TRAINEE_EXPERT" && (
                <span className="absolute -right-1 -top-1 rounded-full border border-white bg-emerald-500 p-0.5 shadow-sm">
                    <GraduationCap className="h-2.5 w-2.5 text-white" />
                </span>
            )}
        </div>
    )
}
