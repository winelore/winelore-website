"use client"

import { useState, useEffect } from "react"
import { FileText, Trophy, Wine, User, Layers } from "lucide-react"
import { ProfileMenu } from "./components/profile-menu"

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
  const [competitions, setCompetitions] = useState<Competition[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("competitions")

  useEffect(() => {
    let mounted = true
    setFetchError(null)
    fetch("/api/competitions")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch competitions: ${res.status}`)
        return res.json()
      })
      .then((data: Competition[]) => {
        if (!mounted) return
        setCompetitions(data)
      })
      .catch((err) => {
        if (!mounted) return
        setFetchError(err?.message ?? "Unknown error")
        setCompetitions([])
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-card-foreground tracking-tight">WineLore</h1>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center rounded-full border border-border bg-muted/50 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive
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
          {fetchError ? (
            <div className="text-sm text-muted-foreground">Error: {fetchError}</div>
          ) : competitions === null ? (
            <div className="text-sm text-muted-foreground">Loading competitions…</div>
          ) : competitions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No competitions found.</div>
          ) : (
            competitions.map((competition) => (
              <CompetitionCard key={competition.id} competition={competition} />
            ))
          )}
        </div>
      </main>
    </div>
  )
}