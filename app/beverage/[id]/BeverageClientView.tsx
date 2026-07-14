"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Trophy, Wine, Tag, AlertCircle, CheckCircle, MapPin, Calendar, Award, ArrowLeft, Clock } from "lucide-react"
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

interface Props {
    initialData?: InitialData | null;
    currentAuid: number;
    isNotFound?: boolean;
    isError?: boolean;
}

function AwardCard({ award }: { award: AwardType }) {
    const { formatDateTime, t } = useTranslation()
    const awardedOnStr = t("beverage.awardedOn") as string | undefined;

    return (
        <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-slate-300/50 hover:border-indigo-100 group">
            <div className="flex items-start gap-4">
                {award.award.badgeUrl ? (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-100 shadow-md group-hover:scale-105 group-hover:shadow-lg transition-all duration-300">
                        <img src={award.award.badgeUrl} alt={award.award.name} className="h-12 w-12 object-contain" />
                    </div>
                ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 text-white border-2 border-amber-200 shadow-md group-hover:scale-105 group-hover:shadow-lg transition-all duration-300">
                        <Award className="h-8 w-8" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                        {award.award.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mt-1">
                        {award.award.code}
                    </p>

                    {award.award.description && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2 font-medium">
                            {award.award.description}
                        </p>
                    )}

                    {award.commission && (
                        <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 transition-colors group-hover:bg-indigo-50/50 group-hover:border-indigo-100">
                            <Link
                                href={`/competition/${award.commission.competition.id}`}
                                className="block text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:underline truncate"
                            >
                                {award.commission.competition.name}
                            </Link>
                            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                                {award.commission.competition.series.name}
                            </div>
                            <Link
                                href={`/commission/${award.commissionId}`}
                                className="block text-xs text-slate-600 hover:text-indigo-600 hover:underline truncate mt-1"
                            >
                                <span className="font-semibold text-slate-400">{t("beverage.commission") as string}:</span> <span className="font-medium">{award.commission.name}</span>
                            </Link>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5" />
                        <span suppressHydrationWarning>
                            {awardedOnStr?.replace('{{date}}', formatDateTime(award.assignedAt)) || formatDateTime(award.assignedAt)}
                        </span>
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
        DISTRIBUTOR: "bg-emerald-50 text-emerald-700 border-emerald-200"
    }

    const roleKey = producer.role as "MAKER" | "OWNER" | "DISTRIBUTOR"

    // Виправлення TS2322: змінна повинна бути типу string
    let displayRole: string = producer.role;
    if (roleKey === "MAKER") {
        displayRole = (t("roles.maker") as string) || "Maker";
    }
    else if (roleKey === "OWNER") {
        displayRole = (t("roles.owner") as string) || "Owner";
    }
    else if (roleKey === "DISTRIBUTOR") {
        displayRole = (t("roles.distributor") as string) || "Distributor";
    }

    const renderName = () => {
        if (producer.displayName) return producer.displayName;
        if (producer.username) return `@${producer.username}`;
        return (t("common.unknownUser") as string) || "Unknown User";
    }

    return (
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all hover:shadow-sm hover:-translate-y-0.5 ${roleColors[roleKey] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
            <span className="font-bold text-slate-900">{renderName()}</span>
            <span className="opacity-40 text-current">•</span>
            <span className="uppercase tracking-wide text-[10px] font-extrabold">{displayRole}</span>
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
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center shadow-xl shadow-slate-200/50 max-w-md w-full">
                        <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 mb-6">
                            <Wine className="w-10 h-10" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">{t("beverage.notFoundTitle")}</h1>
                        <p className="text-slate-500 mb-8">{t("beverage.notFoundDesc")}</p>
                        <Link
                            href="/myBeverages"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-200"
                        >
                            <ArrowLeft className="w-4 h-4" />
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
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center shadow-xl shadow-slate-200/50 max-w-md w-full">
                        <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 mb-6">
                            <AlertCircle className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
                            {t("beverage.errorLoading")}
                        </h2>
                        <p className="text-slate-500 mb-8">
                            {t("beverage.tryAgain")}
                        </p>
                        <Link
                            href="/myBeverages"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-200"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t("beverage.backToMyBeverages")}
                        </Link>
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
                    icon: <CheckCircle className="w-3.5 h-3.5" />,
                    className: "bg-emerald-50 text-emerald-600 border-emerald-100"
                }
            case "SUSPENDED":
                return {
                    icon: <AlertCircle className="w-3.5 h-3.5" />,
                    className: "bg-rose-50 text-rose-600 border-rose-100"
                }
            case "DRAFT":
            case "IN_REVIEW":
            case "SUBMITTED":
                return {
                    icon: <Clock className="w-3.5 h-3.5" />,
                    className: "bg-amber-50 text-amber-600 border-amber-100"
                }
            default:
                return {
                    icon: <Tag className="w-3.5 h-3.5" />,
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
                awards: []
            }
        }
        acc[key].awards.push(award)
        return acc
    }, {} as Record<string, { competition: any, awards: AwardType[] }>)

    const awardPluralStr = t("beverage.awardPlural") as string | undefined;
    const awardsCountText = awards.length === 1
        ? t("beverage.awardSingle")
        : awardPluralStr?.replace("{{count}}", String(awards.length)) || `${awards.length} Awards`;

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-6xl space-y-8">

                    <Link
                        href="/myBeverages"
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:shadow-md w-fit"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("beverage.backToMyBeverages")}
                    </Link>

                    <div className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-10 shadow-xl shadow-slate-200/50 group/main hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-200/50 transition-all duration-300">
                        <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">

                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px] bg-indigo-50 text-indigo-600 border-2 border-indigo-100 group-hover/main:bg-indigo-600 group-hover/main:text-white group-hover/main:border-indigo-600 transition-all duration-300 shadow-sm group-hover/main:shadow-lg group-hover/main:shadow-indigo-200/50">
                                <Wine className="h-12 w-12" />
                            </div>

                            <div className="flex-1 min-w-0 w-full">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div>
                                        <span className="text-[11px] font-extrabold tracking-widest uppercase text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full">
                                            {formatBeverageType(beverage.type)}
                                        </span>
                                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mt-4 mb-2 tracking-tight group-hover/main:text-indigo-900 transition-colors">
                                            {beverage.name}
                                        </h1>
                                    </div>

                                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-extrabold uppercase tracking-widest shrink-0 border shadow-sm ${statusConfig.className}`}>
                                        {statusConfig.icon}
                                        {formatStatus(beverage.status)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">

                                    {beverage.originParts && beverage.originParts.length > 0 && (
                                        <div className="flex items-center gap-4 p-5 bg-white rounded-[24px] border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/40 transition-all duration-300 group/card cursor-default">
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover/card:bg-indigo-600 group-hover/card:text-white group-hover/card:border-indigo-600 transition-all duration-300 shadow-sm">
                                                <MapPin className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{t("beverage.origin")}</p>
                                                <p className="text-sm font-bold text-slate-700 mt-0.5 group-hover/card:text-indigo-700 transition-colors">
                                                    {beverage.originParts.join(", ")}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 p-5 bg-white rounded-[24px] border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/40 transition-all duration-300 group/card cursor-default">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover/card:bg-indigo-600 group-hover/card:text-white group-hover/card:border-indigo-600 transition-all duration-300 shadow-sm">
                                            <Wine className="h-7 w-7" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{t("beverage.producers")}</p>
                                            <p className="text-sm font-bold text-slate-700 mt-0.5 group-hover/card:text-indigo-700 transition-colors">
                                                {beverage.producers.length} {beverage.producers.length === 1 ? t("commission.results.producer") : t("beverage.producers")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 p-5 bg-white rounded-[24px] border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/40 transition-all duration-300 group/card cursor-default">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover/card:bg-indigo-600 group-hover/card:text-white group-hover/card:border-indigo-600 transition-all duration-300 shadow-sm">
                                            <Calendar className="h-7 w-7" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{t("beverage.created")}</p>
                                            <p suppressHydrationWarning className="text-sm font-bold text-slate-700 mt-0.5 group-hover/card:text-indigo-700 transition-colors">
                                                {formatDateTime(beverage.createdAt)}
                                            </p>
                                        </div>
                                    </div>

                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Awards section */}
                    <div className="pt-4">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                                    <Trophy className="w-8 h-8 text-amber-500" />
                                    {t("beverage.competitionResults")}
                                </h2>
                                <p className="text-sm font-medium text-slate-500 mt-2">{t("beverage.awardsSubtitle")}</p>
                            </div>
                            <span className="text-sm font-bold px-4 py-2 rounded-2xl bg-white shadow-sm text-indigo-600 border border-slate-100">
                                {awardsCountText}
                            </span>
                        </div>

                        {awards.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {Object.values(awardsByCompetition).map((group, idx: number) => (
                                    <div
                                        key={idx}
                                        className="border border-slate-100 rounded-[32px] p-6 md:p-8 bg-gradient-to-b from-white to-slate-50/50 shadow-xl shadow-slate-200/40"
                                    >
                                        {group.competition && (
                                            <div className="mb-6 pb-6 border-b border-slate-100/80">
                                                <div className="flex items-start gap-4">
                                                    <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100/50">
                                                        <Trophy className="w-6 h-6 text-indigo-600" />
                                                    </div>
                                                    <div className="flex-1 mt-0.5">
                                                        {/* Виправлено ключ на commission.competition */}
                                                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-500 mb-1">
                                                            {group.competition.series?.name || t("commission.competition")}
                                                        </p>
                                                        <h3 className="text-xl font-extrabold text-slate-800 leading-tight">
                                                            {group.competition.name}
                                                        </h3>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-4">
                                            {group.awards.map((award: AwardType) => (
                                                <AwardCard key={award.id} award={award} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-100 rounded-[32px] p-16 text-center shadow-xl shadow-slate-200/50 flex flex-col items-center">
                                <div className="bg-slate-50 border border-slate-100 p-6 rounded-[32px] mb-6">
                                    <Trophy className="w-16 h-16 text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-extrabold text-slate-800 mb-3">{t("beverage.noAwardsTitle")}</h3>
                                <p className="text-base text-slate-500 max-w-md mx-auto">
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