"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import Link from "next/link"
import { FileText, Trophy, Wine, Timer, Calendar, CheckCircle, PlayCircle, AlertCircle } from "lucide-react"
import { ProfileMenu } from "@/components/wine-lore-main"

const tabs = [
    { id: "feed", label: "Feed", icon: FileText },
    { id: "competitions", label: "Competitions", icon: Trophy },
    { id: "beverages", label: "Beverages", icon: Wine },
]

const formatEnumStatus = (status: string | undefined): string => {
    if (!status) return ""
    return status
        .toLowerCase()
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}

// ====================================================================
// INTERFACES
// ====================================================================
type CompetitionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PLANNED" | "STARTED" | "COMPLETED" | "CANCELLED"

interface Series {
    id: string
    name: string
}

interface Competition {
    id: string
    name: string
    status: CompetitionStatus
    startedAt: string | null
    endedAt: string | null
    plannedDates: {
        start: string | null
        end: string | null
    } | null
    series: Series
    holders: number[][]
}

interface InitialData {
    competitions: Competition[]
}

function CompetitionCard({ comp }: { comp: Competition }) {
    const [timeStr, setTimeStr] = useState<string>("")

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const updateTime = () => {
            if (comp.status === "STARTED" && comp.startedAt) {
                const start = new Date(comp.startedAt).getTime()
                const now = new Date().getTime()
                const diff = Math.max(0, now - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                setTimeStr(`${hours}h ${minutes}m`)

            } else if (comp.status === "COMPLETED" && comp.startedAt && comp.endedAt) {
                const start = new Date(comp.startedAt).getTime()
                const end = new Date(comp.endedAt).getTime()
                const diff = Math.max(0, end - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                setTimeStr(`Lasted ${hours}h ${minutes}m`)

            } else if (comp.status === "PLANNED" && comp.plannedDates?.start) {
                const date = new Date(comp.plannedDates.start)
                const formattedDate = new Intl.DateTimeFormat('en-GB', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }).format(date)
                setTimeStr(`Planned: ${formattedDate}`)
            } else {
                setTimeStr("")
            }
        }

        updateTime()
        if (comp.status === "STARTED") {
            intervalId = setInterval(updateTime, 60000)
        }
        return () => clearInterval(intervalId)
    }, [comp.status, comp.startedAt, comp.endedAt, comp.plannedDates])

    return (
        <Link
            href={`/competition/${comp.id}`}
            className="group bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 flex flex-col justify-center min-h-[140px]"
        >
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Trophy className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 truncate block">
                        {comp.series?.name || "Independent"}
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                        {comp.name}
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    comp.status === "STARTED" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        comp.status === "COMPLETED" ? "bg-slate-100 text-slate-500 border border-slate-200" :
                            comp.status === "CANCELLED" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                "bg-amber-50 text-amber-600 border border-amber-100"
                }`}>
                    {comp.status === "STARTED" ? <PlayCircle className="w-3 h-3" /> :
                        comp.status === "COMPLETED" ? <CheckCircle className="w-3 h-3" /> :
                            comp.status === "CANCELLED" ? <AlertCircle className="w-3 h-3" /> :
                                <Calendar className="w-3 h-3" />}
                    {formatEnumStatus(comp.status)}
                </span>

                {timeStr && (
                    <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 truncate max-w-[50%]">
                        {comp.status === "PLANNED" ? <Calendar className="w-3.5 h-3.5 shrink-0" /> : <Timer className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{timeStr}</span>
                    </span>
                )}
            </div>
        </Link>
    )
}

export default function MyCompetitionsClientView({ initialData }: { initialData: InitialData }) {
    const [activeTab, setActiveTab] = useState("competitions")
    const [currentAuid, setCurrentAuid] = useState<number>(1) // Замокано для тестування

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) setCurrentAuid(parseInt(cookieAuid, 10))
    }, [])

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <header className="flex shrink-0 items-center border-b border-slate-100 bg-white px-6 py-4">
                <div className="flex-1 flex items-center justify-start">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">WineLore</h1>
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
                                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive ? "bg-white text-slate-800 shadow-sm border border-slate-100/50" : "text-slate-500 hover:text-slate-800"}`}
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

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-7xl flex flex-col gap-8">

                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">My Competitions</h2>
                            <p className="text-sm text-slate-500 mt-1">Manage and monitor the competitions you organize.</p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                            {initialData.competitions.length} Competitions
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {initialData.competitions.map((comp) => (
                            <CompetitionCard key={comp.id} comp={comp} />
                        ))}

                        {initialData.competitions.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-200/50">
                                <Trophy className="w-12 h-12 text-slate-300 mb-4" />
                                <h3 className="text-lg font-bold text-slate-700">No competitions found</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-md">You are not listed as a holder for any competitions yet.</p>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    )
}