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
    <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 ${className}`}>
      <User className="h-1/2 w-1/2 text-indigo-300" />
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case "IN_PROGRESS":
    case "STARTED":
      return "text-emerald-500"
    case "READY":
    case "PLANNED":
    case "APPROVED":
      return "text-blue-500"
    case "FINISHED":
    case "COMPLETED":
      return "text-muted-foreground"
    default:
      return "text-muted-foreground"
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
      return "Finished"
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
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
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

    return (
        <Link 
            href={`/competition/${competition.id}`}
            className="group bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 flex flex-col min-h-[140px]"
        >
            <div className="flex items-start gap-3">
                <AvatarPlaceholder className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-card-foreground truncate">{competition.name}</h3>
                    <p className="text-sm">
                        <span className={`font-medium ${getStatusColor(competition.status)}`}>
                            {formatStatus(competition.status)}
                        </span>
                        {/* Render time remaining only after client mount */}
                        {isMounted && timeRemaining && <span className="text-muted-foreground"> | {timeRemaining}</span>}
                    </p>
                </div>
            </div>
            {competition.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    {competition.description}
                </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    <span>{competition.series.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>Holder ID: {competition.holder.join(", ")}</span>
                </div>
            </div>
        </Link>
    )
}

export default function WineLoreDashboard({ initialCompetitions }: { initialCompetitions: Competition[] }) {
  const [activeTab, setActiveTab] = useState("competitions")

  return (
    <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <header className="flex shrink-0 items-center border-b border-slate-100 bg-white px-6 py-4">
            <div className="flex-1 flex items-center justify-start">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                    WineLore
                </h1>
            </div>

            <div className="flex-none">
                <nav className="flex items-center rounded-full border border-slate-100 bg-slate-50/50 p-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-100/50"
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

            <div className="flex-1 flex justify-end">
                <ProfileMenu username="likespro" />
            </div>
        </header>

      {/* Competition Cards Grid */}
      <main className="flex-1 overflow-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {initialCompetitions.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} />
          ))}
        </div>
      </main>
    </div>
  )
}
