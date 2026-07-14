"use client"

import React, { useState } from "react"
import Link from "next/link"
import { FileText, Trophy, Wine, Tag, AlertCircle, CheckCircle, MapPin, Calendar, Award, ArrowLeft, Clock } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { AppHeader, type AppTabId } from "@/components/AppHeader"

type BeverageStatus = "APPROVED" | "DRAFT" | "PUBLISHED" | "SUBMITTED" | "SUSPENDED"
type BeverageType = "FORTIFIED" | "RED" | "ROSE" | "SPARKLING" | "WHITE"

interface ProducerDetails {
    id: string
    auid: number[]
    role: "DISTRIBUTOR" | "MAKER" | "OWNER"
    displayName?: string
    username?: string
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

interface AwardType {
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
    awards: AwardType[]
}

// ВИПРАВЛЕНО TS2322: initialData опціональний і може бути null
interface Props {
    initialData?: InitialData | null;
    currentAuid: number;
    isNotFound?: boolean;
    isError?: boolean;
}

function AwardCard({ award }: { award: AwardType }) {
    const { formatDateTime, t } = useTranslation()

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
                                {t("beverage.commission")}: {award.commission.name}
                            </Link>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{t("beverage.awardedOn").replace('{{date}}', formatDateTime(award.assignedAt))}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ProducerBadge({ producer }: { producer: ProducerDetails }) {
    const { t } = useTranslation()

    const roleColors = {
        MAKER: "bg-blue-50 text-blue-700 border-blue-200",
        OWNER: "bg-purple-50 text-purple-700 border-purple-200",
        DISTRIBUTOR: "bg-green-50 text-green-700 border-green-200"
    }

    const roleKey = producer.role as "MAKER" | "OWNER" | "DISTRIBUTOR"

    let displayRole = producer.role;
    if (roleKey === "MAKER") { // @ts-ignore
        displayRole = t("roles.maker") || "Maker";
    }
    else if (roleKey === "OWNER") { // @ts-ignore
        displayRole = t("roles.owner") || "Owner";
    }
    else if (roleKey === "DISTRIBUTOR") { // @ts-ignore
        displayRole = t("roles.distributor") || "Distributor";
    }

    // ВИРІШЕНО: Відображаємо displayName або username замість AUID
    const renderName = () => {
        if (producer.displayName) return producer.displayName;
        if (producer.username) return `@${producer.username}`;
        return t("common.unknownUser") || "Unknown User";
    }

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${roleColors[roleKey] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
            <span className="font-medium text-slate-900">{renderName()}</span>
            <span>•</span>
            <span>{displayRole}</span>
        </div>
    )
}

export default function BeverageClientView({ initialData, isNotFound, isError }: Props) {
    const [activeTab, setActiveTab] = useState<AppTabId>("beverages")
    const { formatStatus, formatBeverageType, formatDateTime, t } = useTranslation()

    if (isNotFound) {
        return (
            <div className="flex h-screen flex-col bg-slate-50/50">
                <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Wine className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-slate-800">{t("beverage.notFoundTitle")}</h1>
                        <p className="text-slate-600 mt-2">{t("beverage.notFoundDesc")}</p>
                        <Link
                            href="/myBeverages"
                            className="inline-block mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            {t("beverage.backToMyBeverages")}
                        </Link>
                    </div>
                </main>
            </div>
        )
    }

    if (isError || !initialData) {
        return (
            <div className="flex h-screen flex-col bg-slate-50/50">
                <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-rose-300 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold tracking-tight text-slate-800 mb-2">
                            {t("beverage.errorLoading")}
                        </h2>
                        <p className="text-slate-500">
                            {t("beverage.tryAgain")}
                        </p>
                    </div>
                </main>
            </div>
        )
    }

    const { beverage, awards } = initialData

    const getStatusConfig = (status: string) => {
        switch (status.toUpperCase()) {
            case "APPROVED":
            case "PUBLISHED":
                return {
                    icon: <CheckCircle className="w-4 h-4" />,
                    className: "bg-emerald-50 text-emerald-600 border-emerald-100"
                }
            case "SUSPENDED":
                return {
                    icon: <AlertCircle className="w-4 h-4" />,
                    className: "bg-rose-50 text-rose-600 border-rose-100"
                }
            case "DRAFT":
            case "IN_REVIEW":
                return {
                    icon: <Clock className="w-4 h-4" />,
                    className: "bg-amber-50 text-amber-600 border-amber-100"
                }
            default:
                return {
                    icon: <Tag className="w-4 h-4" />,
                    className: "bg-slate-50 text-slate-600 border-slate-100"
                }
        }
    }

    const statusConfig = getStatusConfig(beverage.status)

    const awardsByCompetition = awards.reduce((acc, award) => {
        const key = award.commission?.competition.id || 'unknown'
        if (!acc[key]) {
            acc[key] = {
                competition: award.commission?.competition,
                commission: award.commission,
                awards: []
            }
        }
        acc[key].awards.push(award)
        return acc
    }, {} as Record<string, any>)

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex-1 overflow-auto p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Back button */}
                    <Link
                        href="/myBeverages"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("beverage.backToMyBeverages")}
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

                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 border ${statusConfig.className}`}>
                                        {statusConfig.icon}
                                        {formatStatus(beverage.status)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                    {/* Origin Block */}
                                    {beverage.originParts && beverage.originParts.length > 0 && (
                                        <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <MapPin className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("beverage.origin")}</p>
                                                <p className="text-sm font-semibold text-slate-700 mt-1">
                                                    {beverage.originParts.join(", ")}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Producers Block */}
                                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <Wine className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("beverage.producers")}</p>
                                            <p className="text-sm font-semibold text-slate-700 mt-1">
                                                {beverage.producers.length} {beverage.producers.length === 1 ? t("common.producer") : t("common.producers")}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Created At Block */}
                                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <Calendar className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("beverage.created")}</p>
                                            <p suppressHydrationWarning className="text-sm font-semibold text-slate-700 mt-1">
                                                {formatDateTime(beverage.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {beverage.producers.length > 0 && (
                                    <div className="mt-6 border-t border-slate-100 pt-6">
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
                                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t("beverage.competitionResults")}</h2>
                                <p className="text-sm text-slate-500 mt-1">{t("beverage.awardsSubtitle")}</p>
                            </div>
                            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                                {awards.length === 1 ? t("beverage.awardSingle") : t("beverage.awardPlural")?.replace("{{count}}", String(awards.length))}
                            </span>
                        </div>

                        {awards.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.values(awardsByCompetition).map((group: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="border border-slate-100 rounded-3xl p-6 bg-gradient-to-br from-slate-50 to-white hover:shadow-lg transition-shadow"
                                    >
                                        {group.competition && (
                                            <div className="mb-4 pb-4 border-b border-slate-100">
                                                <div className="flex items-start gap-3">
                                                    <Trophy className="w-5 h-5 text-indigo-500 shrink-0 mt-1" />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                            {group.competition.series?.name || t("beverage.competition")}
                                                        </p>
                                                        <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                                                            {group.competition.name}
                                                        </h3>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-3">
                                            {group.awards.map((award: AwardType) => (
                                                <AwardCard key={award.id} award={award} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center shadow-xl shadow-slate-200/50">
                                <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-700">{t("beverage.noAwardsTitle")}</h3>
                                <p className="text-sm text-slate-500 mt-2">
                                    {t("beverage.noAwardsDesc")}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}