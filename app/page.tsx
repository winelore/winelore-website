"use client"

import { useState } from "react"
import { FileText, Trophy, Wine, BadgeCheck, User } from "lucide-react"

const tabs = [
  { id: "feed", label: "Feed", icon: FileText },
  { id: "competitions", label: "Competitions", icon: Trophy },
  { id: "wines", label: "Wines", icon: Wine },
]

type CompetitionSeriesStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"

interface CompetitionSeries {
  id: string
  name: string
  status: CompetitionSeriesStatus
}

interface Competition {
  id: string
  series: CompetitionSeries
  status: string
  name: string
  plannedStartAt: string | null
  plannedEndAt: string | null
}

const MOCK_COMPETITIONS: Competition[] = [
  {
    id: "comp-1",
    name: "Mega Competition 2026",
    status: "IN_PROGRESS",
    plannedStartAt: "2026-03-15T10:00:00Z",
    plannedEndAt: "2026-03-15T18:00:00Z",
    series: {
      id: "series-1",
      name: "Mega Competition",
      status: "ACTIVE",
    },
  },
  {
    id: "comp-2",
    name: "Summer Wine Tasting",
    status: "READY",
    plannedStartAt: "2026-03-20T14:00:00Z",
    plannedEndAt: "2026-03-20T20:00:00Z",
    series: {
      id: "series-2",
      name: "Seasonal Event",
      status: "ACTIVE",
    },
  },
  {
    id: "comp-3",
    name: "Bordeaux Championship",
    status: "FINISHED",
    plannedStartAt: "2026-03-01T09:00:00Z",
    plannedEndAt: "2026-03-01T17:00:00Z",
    series: {
      id: "series-3",
      name: "Regional",
      status: "ACTIVE",
    },
  },
  {
    id: "comp-4",
    name: "Blind Tasting Challenge",
    status: "IN_PROGRESS",
    plannedStartAt: "2026-03-17T12:00:00Z",
    plannedEndAt: "2026-03-18T18:00:00Z",
    series: {
      id: "series-4",
      name: "Challenge",
      status: "ACTIVE",
    },
  },
  {
    id: "comp-5",
    name: "New World Wines 2026",
    status: "READY",
    plannedStartAt: "2026-03-23T10:00:00Z",
    plannedEndAt: "2026-03-23T19:00:00Z",
    series: {
      id: "series-5",
      name: "Discovery",
      status: "ACTIVE",
    },
  },
  {
    id: "comp-6",
    name: "Vintage Collectors Cup",
    status: "FINISHED",
    plannedStartAt: "2026-02-20T11:00:00Z",
    plannedEndAt: "2026-02-20T18:00:00Z",
    series: {
      id: "series-6",
      name: "Premium",
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
    competition.plannedEndAt,
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
      <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>{competition.series.name}</span>
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
        <div className="flex items-center gap-2">
          <span className="font-medium text-card-foreground">likespro</span>
          <BadgeCheck className="h-5 w-5 text-blue-500" />
          <AvatarPlaceholder className="h-9 w-9" />
        </div>
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
