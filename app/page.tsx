"use client"

import { useState, useRef, useEffect } from "react"
import { FileText, Trophy, Wine, BadgeCheck, User } from "lucide-react"

const tabs = [
  { id: "feed", label: "Feed", icon: FileText },
  { id: "competitions", label: "Competitions", icon: Trophy },
  { id: "wines", label: "Wines", icon: Wine },
]

function GooeyNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: string
  setActiveTab: (tab: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const activeButton = container.querySelector(
      `[data-tab-id="${activeTab}"]`
    ) as HTMLElement
    if (!activeButton) return

    const containerRect = container.getBoundingClientRect()
    const buttonRect = activeButton.getBoundingClientRect()

    setIndicatorStyle({
      left: buttonRect.left - containerRect.left,
      width: buttonRect.width,
    })
  }, [activeTab])

  return (
    <nav className="relative flex items-center rounded-full border border-border bg-muted/50 p-1">
      {/* SVG Filter for Gooey Effect */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Gooey Background Layer */}
      <div
        ref={containerRef}
        className="absolute inset-1 overflow-hidden rounded-full"
        style={{ filter: "url(#gooey)" }}
      >
        {/* Moving Indicator Blob */}
        <div
          className="absolute top-0 h-full rounded-full bg-card shadow-sm transition-all duration-500 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
        {/* Static blobs at each tab position for gooey connection */}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            data-tab-id={tab.id}
            className={`inline-flex items-center gap-2 px-4 py-2 ${
              activeTab === tab.id ? "opacity-0" : "opacity-0"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{tab.label}</span>
          </div>
        ))}
      </div>

      {/* Text Layer (stays sharp, above the gooey filter) */}
      <div className="relative z-10 flex items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              <Icon
                className={`h-4 w-4 transition-colors duration-300 ${
                  isActive ? "text-blue-500" : ""
                }`}
              />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

const competitions = [
  {
    id: 1,
    title: "Mega Competition 2026",
    status: "In Progress",
    timeRemaining: "3h 27m",
    description: "This is an example competition for WineLore mega system demonstrating all abilities.",
    category: "Mega Competition",
    creator: "likespro",
  },
  {
    id: 2,
    title: "Summer Wine Tasting",
    status: "Upcoming",
    timeRemaining: "Starts in 2d",
    description: "Join us for an exciting summer wine tasting event featuring selections from top vineyards.",
    category: "Seasonal Event",
    creator: "winelover42",
  },
  {
    id: 3,
    title: "Bordeaux Championship",
    status: "Finished",
    timeRemaining: "Ended",
    description: "The annual Bordeaux championship showcasing the finest French wines from the region.",
    category: "Regional",
    creator: "sommeliermax",
  },
  {
    id: 4,
    title: "Blind Tasting Challenge",
    status: "In Progress",
    timeRemaining: "1d 5h",
    description: "Test your palate in this exciting blind tasting competition with mystery wines.",
    category: "Challenge",
    creator: "tastemaster",
  },
  {
    id: 5,
    title: "New World Wines 2026",
    status: "Upcoming",
    timeRemaining: "Starts in 5d",
    description: "Explore exceptional wines from emerging regions in Australia, Chile, and South Africa.",
    category: "Discovery",
    creator: "globalwines",
  },
  {
    id: 6,
    title: "Vintage Collectors Cup",
    status: "Finished",
    timeRemaining: "Ended",
    description: "A prestigious competition for rare and vintage wine collectors and enthusiasts.",
    category: "Premium",
    creator: "vintagevault",
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
    case "In Progress":
      return "text-emerald-500"
    case "Upcoming":
      return "text-blue-500"
    case "Finished":
      return "text-muted-foreground"
    default:
      return "text-muted-foreground"
  }
}

function CompetitionCard({
  title,
  status,
  timeRemaining,
  description,
  category,
  creator,
}: {
  title: string
  status: string
  timeRemaining: string
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
            <span className={`font-medium ${getStatusColor(status)}`}>{status}</span>
            <span className="text-muted-foreground"> | {timeRemaining}</span>
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

          {/* Navigation Tabs with Gooey Effect */}
          <GooeyNav activeTab={activeTab} setActiveTab={setActiveTab} />

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
              timeRemaining={competition.timeRemaining}
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
