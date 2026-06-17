"use client"

import React, { useState, useEffect } from "react"
import { FileText, Trophy, Wine, User, Layers } from "lucide-react"
import { ProfileMenu } from "@/components/wine-lore-main"
import Link from "next/link"

const tabs = [
  { id: "feed", label: "Feed", icon: FileText },
  { id: "competitions", label: "Competitions", icon: Trophy },
  { id: "wines", label: "Wines", icon: Wine },
]

type CompetitionSeriesStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED" | "APPROVED" | "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "SUSPENDED"

interface CompetitionSeries {
  id: string
  name: string
  status: CompetitionSeriesStatus
}

interface Competition {
  id: string
  name: string
  status: string
  description?: string
  holder: number[]
  plannedStartAt: string | null
  plannedEndAt?: string | null
  startedAt: string | null
  endedAt: string | null
  series: CompetitionSeries
}

function AvatarPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/40 dark:border-zinc-700/40 ${className}`}>
      <User className="h-1/2 w-1/2 text-zinc-400 dark:text-zinc-500" />
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case "IN_PROGRESS":
    case "STARTED":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/30 dark:border-emerald-500/10"
    case "READY":
    case "PLANNED":
    case "APPROVED":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200/30 dark:border-blue-500/10"
    default:
      return "bg-zinc-50 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-700/10"
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "IN_PROGRESS":
    case "STARTED":
      return "In Progress"
    case "READY":
    case "PLANNED":
    case "APPROVED":
      return "Ready"
    case "FINISHED":
    case "COMPLETED":
      return "Completed"
    default:
      return status
        .toLowerCase()
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
  }
}

function formatTimeRemaining(plannedStartAt: string | null, plannedEndAt: string | null, status: string) {
  if (status === "FINISHED" || status === "COMPLETED") return "Ended"
  if (!plannedStartAt) return ""

  const now = new Date()
  const startDate = new Date(plannedStartAt)
  const endDate = plannedEndAt ? new Date(plannedEndAt) : null

  if (status === "READY" || status === "PLANNED" || status === "APPROVED") {
    const diff = startDate.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `Starts in ${days}d`
    if (hours > 0) return `Starts in ${hours}h`
    return "Starting soon"
  }

  if ((status === "IN_PROGRESS" || status === "STARTED") && endDate) {
    const diff = endDate.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (days > 0) return `Ends in ${days}d ${hours}h`
    if (hours > 0) return `Ends in ${hours}h`
    return `Ends in ${minutes}m`
  }

  return ""
}

function CompetitionCard({ competition }: { competition: Competition }) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const timeRemaining = formatTimeRemaining(
        competition.plannedStartAt,
        competition.plannedEndAt ?? null,
        competition.status
    )

    const statusBadgeStyle = getStatusColor(competition.status)

    return (
        <Link 
            href={`/competition/${competition.id}`}
            className="group block rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none transition-all duration-300 hover:shadow-[0_4px_16px_rgba(139,21,56,0.06)] hover:border-brand-burgundy/30 dark:hover:border-rose-500/25 active:scale-[0.985]"
        >
            <div className="flex items-start gap-3.5">
                <AvatarPlaceholder className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeStyle}`}>
                            {formatStatus(competition.status)}
                        </span>
                        {isMounted && timeRemaining && (
                            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                                {timeRemaining}
                            </span>
                        )}
                    </div>
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mt-2 truncate group-hover:text-brand-burgundy dark:group-hover:text-rose-400 transition-colors">
                        {competition.name}
                    </h3>
                </div>
            </div>
            
            {competition.description && (
                <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {competition.description}
                </p>
            )}

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 stroke-[1.8] text-zinc-400 dark:text-zinc-500" />
                    <span className="font-semibold truncate max-w-[140px]" title={competition.series.name}>
                        {competition.series.name}
                    </span>
                </div>
                <span className="text-zinc-200 dark:text-zinc-850">•</span>
                <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 stroke-[1.8] text-zinc-400 dark:text-zinc-500" />
                    <span className="font-semibold">Holder: {competition.holder.join(", ")}</span>
                </div>
            </div>
        </Link>
    )
}

export default function WineLoreDashboard({ initialCompetitions }: { initialCompetitions: Competition[] }) {
  const [activeTab, setActiveTab] = useState("competitions")

  return (
    <div className="flex h-screen flex-col bg-zinc-50/60 dark:bg-zinc-950">
        {/* Sticky Translucent Header */}
        <header className="sticky top-0 z-50 flex shrink-0 items-center border-b border-zinc-200/50 dark:border-zinc-800/40 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md px-6 py-3.5">
            {/* Logo */}
            <div className="flex-1 flex items-center justify-start">
                <h1 className="text-xl font-extrabold text-brand-burgundy dark:text-rose-500 tracking-tight">
                    WineLore
                </h1>
            </div>

            {/* iOS Segmented Navigation Control */}
            <div className="flex-none">
                <nav className="flex items-center rounded-full bg-zinc-150/70 dark:bg-zinc-800/50 p-0.5 border border-zinc-200/20 dark:border-zinc-700/20">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${isActive
                                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                                }`}
                            >
                                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-brand-burgundy dark:text-rose-400" : ""}`} />
                                <span>{tab.label}</span>
                            </button>
                        )
                    })}
                </nav>
            </div>

            {/* User Profile */}
            <div className="flex-1 flex justify-end">
                <ProfileMenu username="likespro" />
            </div>
        </header>

      {/* Main Container */}
      <main className="flex-1 overflow-auto p-6 md:p-8 flex justify-center">
        <div className="w-full max-w-7xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-zinc-200/40 dark:border-zinc-800/30 pb-4">
                <div>
                    <h2 className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">
                        Wine Competitions
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Explore, track, and score active wine tasting events
                    </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                    {initialCompetitions.length} Available
                </span>
            </div>
            
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {initialCompetitions.map((competition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
        </div>
      </main>
    </div>
  )
}
