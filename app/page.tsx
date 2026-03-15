"use client"

import { useState } from "react"
import { FileText, Trophy, Wine, BadgeCheck, User } from "lucide-react"

const tabs = [
  { id: "feed", label: "Feed", icon: FileText },
  { id: "competitions", label: "Competitions", icon: Trophy },
  { id: "wines", label: "Wines", icon: Wine },
]

const competitions = [
  {
    id: 1,
    title: "Mega Competition 2026",
    status: "In Progress",
    timeLeft: "3h 27m",
    description: "This is an example competition for WineLore mega system demonstrating all abilities.",
    category: "Mega Competition",
    creator: "likespro",
  },
  {
    id: 2,
    title: "Mega Competition 2026",
    status: "In Progress",
    timeLeft: "3h 27m",
    description: "This is an example competition for WineLore mega system demonstrating all abilities.",
    category: "Mega Competition",
    creator: "likespro",
  },
  {
    id: 3,
    title: "Mega Competition 2026",
    status: "In Progress",
    timeLeft: "3h 27m",
    description: "This is an example competition for WineLore mega system demonstrating all abilities.",
    category: "Mega Competition",
    creator: "likespro",
  },
  {
    id: 4,
    title: "Mega Competition 2026",
    status: "In Progress",
    timeLeft: "3h 27m",
    description: "This is an example competition for WineLore mega system demonstrating all abilities.",
    category: "Mega Competition",
    creator: "likespro",
  },
]

function AvatarPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 ${className}`}>
      <User className="h-1/2 w-1/2 text-indigo-300" />
    </div>
  )
}

function CompetitionCard({
  title,
  status,
  timeLeft,
  description,
  category,
  creator,
}: {
  title: string
  status: string
  timeLeft: string
  description: string
  category: string
  creator: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <AvatarPlaceholder className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
          <p className="text-sm">
            <span className="font-medium text-emerald-500">{status}</span>
            <span className="text-muted-foreground"> | {timeLeft}</span>
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>{category}</span>
        <span className="mx-1">|</span>
        <span>by</span>
        <User className="h-4 w-4" />
        <span>{creator}</span>
      </div>
    </div>
  )
}

export default function WineLoreDashboard() {
  const [activeTab, setActiveTab] = useState("competitions")

  return (
    <div className="min-h-screen bg-muted/50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl rounded-2xl bg-card p-6 shadow-lg md:p-8">
        {/* Header */}
        <header className="flex flex-col items-center justify-between gap-4 sm:flex-row">
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
        <main className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((competition) => (
            <CompetitionCard
              key={competition.id}
              title={competition.title}
              status={competition.status}
              timeLeft={competition.timeLeft}
              description={competition.description}
              category={competition.category}
              creator={competition.creator}
            />
          ))}
        </main>
      </div>
    </div>
  )
}
