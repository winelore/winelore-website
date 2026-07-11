"use client"

import React, { useState } from "react"
import Link from "next/link"
import { FileText, Trophy, Wine, Tag, AlertCircle, CheckCircle, MapPin, Calendar, Award, ArrowLeft } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { AppHeader, type AppTabId } from "@/components/AppHeader"

type BeverageStatus = "APPROVED" | "DRAFT" | "PUBLISHED" | "SUBMITTED" | "SUSPENDED"
type BeverageType = "FORTIFIED" | "RED" | "ROSE" | "SPARKLING" | "WHITE"

interface ProducerDetails {
    id: string
    auid: number[]
    role: "DISTRIBUTOR" | "MAKER" | "OWNER"
}

interface Beverage {
    id: string
    name: string
    status: BeverageStatus
    type: BeverageType
    typeId: string
    schemaEditionIds: string[]
    attributes: string
    producers: ProducerDetails[]
    originParts?: string[]
    createdAt: string
}

interface Award {
    id: string
    commissionId: string
    candidateId: string
    assignedAt: string
    award: {
        id: string
        code: string
        name: string
        description?: string
        badgeUrl?: string
    }
    commission?: {
        id: string
        name: string
        competition: {
            id: string
            name: string
            status: string
            plannedDates?: {
                start: string
                end: string
            }
            startedAt?: string
            endedAt?: string
            series: {
                id: string
                name: string
            }
        }
    } | null
}

interface InitialData {
    beverage: Beverage
    awards: Award[]
}

const tabs = (t: any) => [
    { id: "feed", label: t("common.feed"), icon: FileText },
    { id: "competitions", label: t("common.competitions"), icon: Trophy },
    { id: "beverages", label: t("common.beverage"), icon: Wine },
]

function AwardCard({ award }: { award: Award }) {
    const { formatDateTime } = useTranslation()

    return (
        <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-slate-300/50 hover:border-indigo-100">
            <div className="flex items-start gap-4">
                {award.award.badgeUrl ? (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 border-2 border-amber-200 shadow-lg">
                        <img src={award.award.badgeUrl} alt={award.award.name} className="h-12 w-12 object-contain" />
                    </div>
                ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 text-white border-2 border-amber-200 shadow-lg">
                        <Award className="h-8 w-8" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-800 truncate">
                        {award.award.name}
                    </h3>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                        {award.award.code}
                    </p>

                    {award.award.description && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                            {award.award.description}
                        </p>
                    )}

                    {award.commission && (
                        <div className="mt-4 space-y-2">
                            <Link
                                href={`/competition/${award.commission.competition.id}`}
                                className="block text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                            >
                                {award.commission.competition.name}
                            </Link>
                            <div className="text-xs text-slate-500">
                                {award.commission.competition.series.name}
                            </div>
                            <Link
                                href={`/commission/${award.commissionId}`}
                                className="block text-xs text-slate-600 hover:text-indigo-600 hover:underline"
                            >
                                Commission: {award.commission.name}
                            </Link>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Awarded: {formatDateTime(award.assignedAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ProducerBadge({ producer }: { producer: ProducerDetails }) {
    const roleColors = {
        MAKER: "bg-blue-50 text-blue-700 border-blue-200",
        OWNER: "bg-purple-50 text-purple-700 border-purple-200",
        DISTRIBUTOR: "bg-green-50 text-green-700 border-green-200"
    }

    const roleLabels = {
        MAKER: "Maker",
        OWNER: "Owner",
        DISTRIBUTOR: "Distributor"
    }

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${roleColors[producer.role]}`}>
            <span className="font-mono">AUID: {producer.auid.join(", ")}</span>
            <span>•</span>
            <span>{roleLabels[producer.role]}</span>
        </div>
    )
}

export default function BeverageClientView({ initialData, currentAuid }: { initialData: InitialData; currentAuid: number }) {
    const [activeTab, setActiveTab] = useState<AppTabId>("beverages")
    const { formatStatus, formatBeverageType, formatDateTime, t } = useTranslation()
    const { beverage, awards } = initialData

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex-1 overflow-auto p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Back button */}
                    <Link
                        href="/myBeverages"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to beverages
                    </Link>

                    {/* Beverage details card */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50">
                        <div className="flex items-start gap-6">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-2 border-indigo-200 shadow-lg">
                                <Wine className="h-10 w-10" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <span className="text-xs font-bold tracking-widest uppercase text-slate-400">
                                            {formatBeverageType(beverage.type)}
                                        </span>
                                        <h1 className="text-3xl font-extrabold text-slate-800 mt-1">
                                            {beverage.name}
                                        </h1>
                                    </div>

                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ${
                                        beverage.status === "APPROVED" || beverage.status === "PUBLISHED"
                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                            : beverage.status === "SUSPENDED"
                                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                                : "bg-amber-50 text-amber-600 border border-amber-200"
                                    }`}>
                                        {beverage.status === "APPROVED" || beverage.status === "PUBLISHED" ? <CheckCircle className="w-3.5 h-3.5" /> :
                                            beverage.status === "SUSPENDED" ? <AlertCircle className="w-3.5 h-3.5" /> :
                                                <Tag className="w-3.5 h-3.5" />}
                                        {formatStatus(beverage.status)}
                                    </span>
                                </div>

                                {beverage.originParts && beverage.originParts.length > 0 && (
                                    <div className="flex items-center gap-2 mt-4 text-sm">
                                        <MapPin className="w-4 h-4 text-indigo-500" />
                                        <span className="font-semibold text-slate-700">Origin:</span>
                                        <span className="text-slate-600">{beverage.originParts.join(", ")}</span>
                                    </div>
                                )}

                                <div className="mt-4 space-y-2">
                                    <div className="text-xs text-slate-500">
                                        <span className="font-semibold">ID:</span> {beverage.id}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        <span className="font-semibold">Created:</span> {formatDateTime(beverage.createdAt)}
                                    </div>
                                </div>

                                {beverage.producers.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-sm font-bold text-slate-700 mb-3">Producers</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {beverage.producers.map((producer) => (
                                                <ProducerBadge key={producer.id} producer={producer} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Awards section */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Competition Results</h2>
                                <p className="text-sm text-slate-500 mt-1">Awards and recognitions</p>
                            </div>
                            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                                {awards.length} {awards.length === 1 ? "Award" : "Awards"}
                            </span>
                        </div>

                        {awards.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {awards.map((award) => (
                                    <AwardCard key={award.id} award={award} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center shadow-xl shadow-slate-200/50">
                                <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-700">No awards yet</h3>
                                <p className="text-sm text-slate-500 mt-2">
                                    This beverage hasn't received any competition awards yet.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}