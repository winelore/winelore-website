"use client"

import { useState } from "react"
import { FileText, Trophy, Wine, User, Layers } from "lucide-react"
import { ProfileMenu } from "@/components/profile-menu"

const tabs = [
  { id: "feed", label: "Feed", icon: FileText },
  { id: "competitions", label: "Competitions", icon: Trophy },
  { id: "wines", label: "Wines", icon: Wine },
]

type CompetitionSeriesStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"

interface CompetitionSeries {
  id: string
  name: string
  owner: number[]
  status: CompetitionSeriesStatus
}

interface Competition {
  id: string
  name: string
  status: string
  description: string
  holder: number[]
  plannedStartAt: string | null
  plannedEndAt?: string | null
  startedAt: string | null
  endedAt: string | null
  series: CompetitionSeries
}

const MOCK_COMPETITIONS: Competition[] = [
  {
    id: "1",
    name: "Mega Competition 2026",
    status: "IN_PROGRESS",
    description: "This is a high-stakes wine tasting competition showcasing the best sommeliers from around the world.",
    holder: [101, 102],
    plannedStartAt: "2026-03-18T12:00:00Z",
    plannedEndAt: "2026-03-18T20:00:00Z",
    startedAt: "2026-03-18T12:05:00Z",
    endedAt: null,
    series: {
      id: "s1",
      name: "Mega Series",
      owner: [201],
      status: "ACTIVE",
    },
  },
  {
    id: "2",
    name: "Summer Wine Tasting",
    status: "READY",
    description: "Join us for an exciting summer wine tasting event featuring selections from top vineyards.",
    holder: [103],
    plannedStartAt: "2026-03-20T14:00:00Z",
    plannedEndAt: "2026-03-20T20:00:00Z",
    startedAt: null,
    endedAt: null,
    series: {
      id: "s2",
      name: "Seasonal Event",
      owner: [202, 203],
      status: "ACTIVE",
    },
  },
  {
    id: "3",
    name: "Bordeaux Championship",
    status: "FINISHED",
    description: "The annual Bordeaux championship showcasing the finest French wines from the region.",
    holder: [104, 105, 106],
    plannedStartAt: "2026-03-01T09:00:00Z",
    plannedEndAt: "2026-03-01T17:00:00Z",
    startedAt: "2026-03-01T09:10:00Z",
    endedAt: "2026-03-01T16:45:00Z",
    series: {
      id: "s3",
      name: "Regional",
      owner: [204],
      status: "ACTIVE",
    },
  },
  {
    id: "4",
    name: "Blind Tasting Challenge",
    status: "IN_PROGRESS",
    description: "Test your palate in this exciting blind tasting competition with mystery wines from unknown origins.",
    holder: [107],
    plannedStartAt: "2026-03-17T12:00:00Z",
    plannedEndAt: "2026-03-18T18:00:00Z",
    startedAt: "2026-03-17T12:00:00Z",
    endedAt: null,
    series: {
      id: "s4",
      name: "Challenge",
      owner: [205, 206],
      status: "ACTIVE",
    },
  },
  {
    id: "5",
    name: "New World Wines 2026",
    status: "READY",
    description: "Explore exceptional wines from emerging regions in Australia, Chile, and South Africa.",
    holder: [108, 109],
    plannedStartAt: "2026-03-23T10:00:00Z",
    plannedEndAt: "2026-03-23T19:00:00Z",
    startedAt: null,
    endedAt: null,
    series: {
      id: "s5",
      name: "Discovery",
      owner: [207],
      status: "ACTIVE",
    },
  },
  {
    id: "6",
    name: "Vintage Collectors Cup",
    status: "FINISHED",
    description: "A prestigious competition for rare and vintage wine collectors and enthusiasts.",
    holder: [110],
    plannedStartAt: "2026-02-20T11:00:00Z",
    plannedEndAt: "2026-02-20T18:00:00Z",
    startedAt: "2026-02-20T11:15:00Z",
    endedAt: "2026-02-20T17:30:00Z",
    series: {
      id: "s6",
      name: "Premium",
      owner: [208, 209],
      status: "ARCHIVED",
    },
  },
]

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
      return "text-emerald-500"
    case "READY":
      return "text-blue-500"
    case "FINISHED":
      return "text-muted-foreground"
    default:
      return "text-muted-foreground"
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return "In Progress"
    case "READY":
      return "Ready"
    case "FINISHED":
      return "Finished"
    default:
      return status
  }
}

function formatTimeRemaining(plannedStartAt: string | null, plannedEndAt: string | null, status: string) {
  if (status === "FINISHED") return "Ended"
  if (!plannedStartAt) return ""
  
  const now = new Date()
  const startDate = new Date(plannedStartAt)
  const endDate = plannedEndAt ? new Date(plannedEndAt) : null
  
  if (status === "READY") {
    const diff = startDate.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `Starts in ${days}d`
    if (hours > 0) return `Starts in ${hours}h`
    return "Starting soon"
  }
  
  if (status === "IN_PROGRESS" && endDate) {
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
  const timeRemaining = formatTimeRemaining(
    competition.plannedStartAt,
    competition.plannedEndAt ?? null,
    competition.status
  )

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <AvatarPlaceholder className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-card-foreground">{competition.name}</h3>
          <p className="text-sm">
            <span className={`font-medium ${getStatusColor(competition.status)}`}>
              {formatStatus(competition.status)}
            </span>
            {timeRemaining && <span className="text-muted-foreground"> | {timeRemaining}</span>}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">
        {competition.description}
      </p>
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
    </div>
  )
}

export default function WineLoreDashboard() {
  const [activeTab, setActiveTab] = useState("competitions")

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
        {/* Logo */}
        <h1 className="text-2xl font-bold text-card-foreground">WineLore</h1>

        {/* Navigation Tabs */}
        <nav className="flex items-center rounded-full border border-border bg-muted/50 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-blue-500" : ""}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        {/* User Profile */}
        <ProfileMenu username="likespro" />
      </header>

      {/* Competition Cards Grid */}
      <main className="flex-1 overflow-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MOCK_COMPETITIONS.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} />
          ))}
        </div>
      </main>
    </div>
  )
}
