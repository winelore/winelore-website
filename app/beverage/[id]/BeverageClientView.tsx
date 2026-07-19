"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
    Trophy, Wine, Tag, AlertCircle, CheckCircle, MapPin, Calendar, Award, ArrowLeft, Clock,
    Users, Percent, Droplet, Layers, HelpCircle, Barcode
} from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { AppHeader } from "@/components/AppHeader"

type BeverageStatus = "APPROVED" | "DRAFT" | "PUBLISHED" | "SUBMITTED" | "SUSPENDED"
type BeverageType = "FORTIFIED" | "RED" | "ROSE" | "SPARKLING" | "WHITE"

interface ProducerDetails {
    id: string
    auid: number[]
    role: string // Can be MAKER, OWNER, DISTRIBUTOR, BOTTLER, etc.
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
    origin?: {
        latitude?: number | null
        longitude?: number | null
    } | null
    colorType?: string | null
    beverageTypeName?: string | null
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

interface BatchType {
    id: string
    volumeMl?: number | null
    lotNumber?: string | null
    attributes?: string | null
    createdAt?: string | null
}

interface InitialData {
    beverage: Beverage
    awards: AwardType[]
    batches: BatchType[]
}

interface Props {
    initialData?: InitialData | null;
    currentAuid: number;
    isNotFound?: boolean;
    isError?: boolean;
}

function parseAttributes(attrStr: string | null | undefined): Record<string, string> {
    if (!attrStr) return {}
    const trimmed = attrStr.trim()
    if (!trimmed) return {}

    // First try standard JSON.parse
    try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === "object") {
            const result: Record<string, string> = {}
            Object.entries(parsed).forEach(([k, v]) => {
                if (v !== null && v !== undefined) {
                    result[k] = String(v)
                }
            })
            return result
        }
    } catch {
        // Fall back to Kotlin Map toString parser
    }

    // Parse Kotlin Map toString representation: {key1=val1, key2=val2}
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const content = trimmed.slice(1, -1).trim()
        if (!content) return {}
        
        const result: Record<string, string> = {}
        const parts = content.split(/,\s*/)
        parts.forEach(part => {
            const eqIdx = part.indexOf('=')
            if (eqIdx !== -1) {
                const key = part.substring(0, eqIdx).trim().replace(/^["']|["']$/g, "")
                const val = part.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
                if (key) {
                    result[key] = val
                }
            }
        })
        return result
    }

    return {}
}

const getColorDotClass = (type: string) => {
    switch (type.toUpperCase()) {
        case "RED":
            return "bg-red-600 border border-red-700"
        case "ROSE":
            return "bg-pink-400 border border-pink-500"
        case "WHITE":
            return "bg-amber-100 border border-amber-300"
        case "SPARKLING":
            return "bg-yellow-300 border border-yellow-400 animate-pulse"
        case "FORTIFIED":
            return "bg-amber-800 border border-amber-900"
        default:
            return "bg-indigo-500 border border-indigo-600"
    }
}

function AwardCard({ award }: { award: AwardType }) {
    const { formatDateTime, t } = useTranslation()
    const awardedOnStr = t("beverage.awardedOn") as string | undefined

    return (
        <div className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100 hover:scale-[1.01] group relative overflow-hidden">
            {/* Side decorative indigo bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-l-[20px]" />
            
            <div className="flex items-start gap-4 pl-1">
                {award.award.badgeUrl ? (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <img src={award.award.badgeUrl} alt={award.award.name} className="h-10 w-10 object-contain" />
                    </div>
                ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white border border-indigo-200 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <Award className="h-7 w-7" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <h3 className="text-md font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {award.award.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider w-fit">
                            {award.award.code}
                        </span>
                    </div>

                    {award.award.description && (
                        <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
                            {award.award.description}
                        </p>
                    )}

                    <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-slate-400">
                        {award.commission && (
                            <div className="flex items-center gap-1.5 text-indigo-600">
                                <Layers className="w-3.5 h-3.5" />
                                <span>{t("beverage.commission")}: <span className="font-bold">{award.commission.name}</span></span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span suppressHydrationWarning>
                                {awardedOnStr?.replace('{{date}}', formatDateTime(award.assignedAt)) || formatDateTime(award.assignedAt)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ProducerBadge({ producer }: { producer: ProducerDetails }) {
    const { t } = useTranslation()

    const getRoleColors = (role: string) => {
        switch (role.toUpperCase()) {
            case "MAKER":
                return "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/70"
            case "OWNER":
                return "bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100/70"
            case "DISTRIBUTOR":
                return "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/70"
            case "BOTTLER":
                return "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100/70"
            default:
                return "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
        }
    }

    let displayRole: string = producer.role
    const roleUpper = producer.role.toUpperCase()
    if (roleUpper === "MAKER") {
        displayRole = (t("roles.maker") as string) || "Maker"
    } else if (roleUpper === "OWNER") {
        displayRole = (t("roles.owner") as string) || "Owner"
    } else if (roleUpper === "DISTRIBUTOR") {
        displayRole = (t("roles.distributor") as string) || "Distributor"
    } else if (roleUpper === "BOTTLER") {
        displayRole = "Bottler"
    }

    const renderName = () => {
        if (producer.displayName) return producer.displayName
        if (producer.username) return `@${producer.username}`
        return (t("common.unknownUser") as string) || "Unknown User"
    }

    return (
        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-300 hover:-translate-y-0.5 ${getRoleColors(producer.role)}`}>
            <span className="font-bold text-slate-900">{renderName()}</span>
            <span className="opacity-30 text-current font-normal">•</span>
            <span className="uppercase tracking-wider text-[8px] font-extrabold">{displayRole}</span>
        </div>
    )
}

export default function BeverageClientView({ initialData, isNotFound, isError }: Props) {
    const [currentTab, setCurrentTab] = useState<"batches" | "awards" | "specs">(() => {
        if (initialData?.beverage?.attributes) {
            const parsed = parseAttributes(initialData.beverage.attributes)
            const specCount = Object.keys(parsed).filter(k => k !== "color").length
            if (specCount > 0) return "specs"
        }
        return "batches"
    })
    const { formatStatus, formatBeverageType, formatDateTime, t } = useTranslation()

    if (isNotFound) {
        return (
            <div className="flex h-screen flex-col bg-slate-50/50">
                <AppHeader activeTab="beverages" />
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center shadow-xl shadow-slate-200/50 max-w-md w-full">
                        <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 mb-6">
                            <Wine className="w-10 h-10" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">{t("beverage.notFoundTitle")}</h1>
                        <p className="text-slate-500 mb-8">{t("beverage.notFoundDesc")}</p>
                        <Link
                            href="/myBeverages"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-600/20"
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
                <AppHeader activeTab="beverages" />
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
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-600/20"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t("beverage.backToMyBeverages")}
                        </Link>
                    </div>
                </main>
            </div>
        )
    }

    const { beverage, awards, batches = [] } = initialData

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

    // Parse technical specs from attributes (excluding color)
    let technicalSpecs: { key: string; value: string }[] = []
    const parsedBeverageAttrs = parseAttributes(beverage.attributes)
    Object.entries(parsedBeverageAttrs).forEach(([key, val]) => {
        if (key !== "color" && val !== undefined && val !== null) {
            technicalSpecs.push({
                key: key.replace(/([A-Z])/g, " $1").trim(),
                value: String(val)
            })
        }
    })

    // Dynamic Tab Navigation Configuration
    const tabOptions: { id: "batches" | "awards" | "specs"; label: string; icon: any; count?: number }[] = []
    if (technicalSpecs.length > 0) {
        tabOptions.push({ id: "specs", label: t("beverage.tabs.specs"), icon: HelpCircle })
    }
    tabOptions.push({ id: "batches", label: t("beverage.tabs.batches"), icon: Barcode, count: batches.length })
    tabOptions.push({ id: "awards", label: t("beverage.tabs.awards"), icon: Trophy, count: awards.length })
    if (technicalSpecs.length === 0) {
        tabOptions.push({ id: "specs", label: t("beverage.tabs.specs"), icon: HelpCircle })
    }

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="beverages" />

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-6xl space-y-6">

                    {/* Back Button */}
                    <Link
                        href="/myBeverages"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("beverage.backToMyBeverages")}
                    </Link>

                    {/* Main Premium Card Header (Includes Overview Meta now) */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden group/header">
                        {/* Decorative background shape */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-50/30 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />

                        <div className="relative z-10 space-y-6">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                                {/* Stylish Icon block with indigo gradient */}
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border border-indigo-500 shadow-md">
                                    <Wine className="h-10 w-10 text-indigo-50" />
                                </div>

                                <div className="flex-1 min-w-0 w-full text-center md:text-left">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                                                {/* Always show beverage type */}
                                                <span className="text-[10px] font-extrabold tracking-widest uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                                                    {beverage.beverageTypeName || "Beverage"}
                                                </span>

                                                {/* Only show color badge if there is a color */}
                                                {beverage.colorType && (
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest uppercase text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${getColorDotClass(beverage.colorType)}`} />
                                                        {formatBeverageType(beverage.colorType)}
                                                    </span>
                                                )}

                                                <span className="text-[10px] font-extrabold tracking-wider text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full uppercase">
                                                    ID: {beverage.id.slice(-6)}
                                                </span>
                                            </div>
                                            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 mt-3 mb-2 tracking-tight group-hover/header:text-indigo-950 transition-colors">
                                                {beverage.name}
                                            </h1>
                                        </div>

                                        <span className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest shrink-0 border shadow-sm self-center md:self-start ${statusConfig.className}`}>
                                            {statusConfig.icon}
                                            {formatStatus(beverage.status)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-[1px] w-full bg-slate-100" />

                            {/* Header Metadata Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                                {/* Origin info */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{t("beverage.origin")}</span>
                                    </div>
                                    {beverage.originParts && beverage.originParts.length > 0 ? (
                                        <span className="text-sm font-bold text-slate-700">
                                            {beverage.originParts.join(", ")}
                                        </span>
                                    ) : (
                                        <div className="text-sm font-medium text-slate-400">{t("common.na")}</div>
                                    )}
                                </div>

                                {/* Producers info */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{t("beverage.producers")}</span>
                                    </div>
                                    {beverage.producers.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {beverage.producers.map((p) => (
                                                <ProducerBadge key={p.id} producer={p} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm font-medium text-slate-400">{t("common.na")}</div>
                                    )}
                                </div>

                                {/* Created date */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{t("beverage.created")}</span>
                                    </div>
                                    <p suppressHydrationWarning className="text-sm font-bold text-slate-700">
                                        {formatDateTime(beverage.createdAt)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sub Navigation Tabs */}
                    <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar scroll-smooth">
                        {tabOptions.map((tab) => {
                            const Icon = tab.icon
                            const isActive = currentTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setCurrentTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                                        isActive
                                            ? "border-indigo-600 text-indigo-600 font-extrabold"
                                            : "border-transparent text-slate-400 hover:text-slate-700"
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full ${
                                            isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Tab Panels */}
                    <div className="pt-2 animate-fadeIn transition-all duration-300">
                        {currentTab === "batches" && (
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">{t("beverage.batches.title")}</h2>
                                    <p className="text-xs font-semibold text-slate-400 mt-1">{t("beverage.batches.subtitle")}</p>
                                </div>

                                {batches.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {batches.map((batch) => {
                                            // Parse vintage and ABV from attributes
                                            const parsedBatchAttrs = parseAttributes(batch.attributes)
                                            const displayVintage = parsedBatchAttrs.vintage || null
                                            const displayAbv = parsedBatchAttrs.alcoholByVolume || parsedBatchAttrs.abv || parsedBatchAttrs.alcohol || null

                                            return (
                                                <div
                                                    key={batch.id}
                                                    className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-md hover:shadow-lg hover:border-indigo-100 transition-all duration-300 group/batch relative overflow-hidden"
                                                >
                                                    {/* Side border decoration */}
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 opacity-60 group-hover/batch:opacity-100 transition-opacity" />

                                                    <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4 text-indigo-600" />
                                                            <span className="text-md font-bold text-slate-800">
                                                                {displayVintage ? `${t("beverage.batches.vintage")} ${displayVintage}` : t("beverage.batches.noVintage")}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                                                            ID: {batch.id.slice(-6).toUpperCase()}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="bg-slate-50/50 border border-slate-100/50 rounded-xl p-3 text-center">
                                                            <Percent className="w-4 h-4 mx-auto text-indigo-600/80 mb-1" />
                                                            <span className="text-[9px] uppercase font-bold text-slate-400 block">{t("beverage.batches.abv")}</span>
                                                            <span className="text-xs font-bold text-slate-700 mt-0.5 block">
                                                                {displayAbv ? `${displayAbv}%` : t("common.na")}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="bg-slate-50/50 border border-slate-100/50 rounded-xl p-3 text-center">
                                                            <Droplet className="w-4 h-4 mx-auto text-indigo-600/80 mb-1" />
                                                            <span className="text-[9px] uppercase font-bold text-slate-400 block">{t("beverage.batches.volume")}</span>
                                                            <span className="text-xs font-bold text-slate-700 mt-0.5 block">
                                                                {batch.volumeMl !== undefined && batch.volumeMl !== null
                                                                    ? `${batch.volumeMl} ml`
                                                                    : t("common.na")}
                                                            </span>
                                                        </div>

                                                        <div className="bg-slate-50/50 border border-slate-100/50 rounded-xl p-3 text-center">
                                                            <Barcode className="w-4 h-4 mx-auto text-indigo-600/80 mb-1" />
                                                            <span className="text-[9px] uppercase font-bold text-slate-400 block">{t("beverage.batches.lotNumber")}</span>
                                                            <span className="text-xs font-bold text-slate-700 mt-0.5 block truncate" title={batch.lotNumber || ""}>
                                                                {batch.lotNumber || t("common.na")}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-white border border-slate-100 rounded-[32px] p-16 text-center shadow-md flex flex-col items-center justify-center">
                                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-[24px] mb-4 text-slate-400">
                                            <Barcode className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-2">{t("beverage.batches.emptyTitle")}</h3>
                                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                            {t("beverage.batches.emptyDesc")}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentTab === "awards" && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">{t("beverage.competitionResults")}</h2>
                                    <p className="text-xs font-semibold text-slate-400 mt-1">{t("beverage.awardsSubtitle")}</p>
                                </div>

                                {awards.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-6">
                                        {Object.values(awardsByCompetition).map((group, idx: number) => (
                                            <div
                                                key={idx}
                                                className="border border-slate-100 rounded-[28px] p-6 bg-white shadow-md hover:shadow-lg transition-shadow duration-300"
                                            >
                                                {group.competition && (
                                                    <div className="mb-5 pb-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-indigo-600">
                                                                <Trophy className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                                                                    {group.competition.series?.name || t("commission.competition")}
                                                                </span>
                                                                <h3 className="text-md font-bold text-slate-800 leading-tight mt-0.5">
                                                                    {group.competition.name}
                                                                </h3>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-extrabold px-3 py-1 bg-slate-50 border border-slate-100 text-slate-500 rounded-lg uppercase tracking-wide">
                                                            {group.competition.status}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {group.awards.map((award: AwardType) => (
                                                        <AwardCard key={award.id} award={award} />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white border border-slate-100 rounded-[32px] p-16 text-center shadow-md flex flex-col items-center justify-center">
                                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-[24px] mb-4 text-slate-300">
                                            <Trophy className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-2">{t("beverage.noAwardsTitle")}</h3>
                                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                            {t("beverage.noAwardsDesc")}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentTab === "specs" && (
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">{t("beverage.specs.title")}</h2>
                                    <p className="text-xs font-semibold text-slate-400 mt-1">{t("beverage.specs.subtitle")}</p>
                                </div>

                                {technicalSpecs.length > 0 ? (
                                    <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-md">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                                    <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                                                        {t("beverage.specs.key")}
                                                    </th>
                                                    <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                                                        {t("beverage.specs.value")}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {technicalSpecs.map((spec, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-500 capitalize">
                                                            {spec.key}
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                                                            {spec.value}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-slate-100 rounded-[32px] p-16 text-center shadow-md flex flex-col items-center justify-center">
                                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-[24px] mb-4 text-slate-400">
                                            <Layers className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-2">{t("beverage.specs.emptyTitle")}</h3>
                                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                            {t("beverage.specs.emptyDesc")}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}