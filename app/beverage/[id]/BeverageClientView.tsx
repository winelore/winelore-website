"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
    Trophy, Wine, Tag, AlertCircle, CheckCircle, MapPin, Calendar, Award, ArrowLeft, Clock,
    Users, Percent, Droplet, Layers, HelpCircle, Barcode, Send, Pencil, FlaskConical, Plus, ExternalLink
} from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { useMobileNavTitle } from "@/lib/mobileNav"
import { AppHeader } from "@/components/AppHeader"
import { submitBeverageForReviewAction } from "../actions"
import { BackLink } from "@/components/BackLink"
import { EditBeverageModal } from "./EditBeverageModal"
import { SamplesListModal, type ModalBatchData } from "./SamplesListModal"
import {
    batchFigures,
    beverageStatusTone,
    beverageTabs,
    defaultBeverageTab,
    groupAwardsByCompetition,
    isBeverageProducer,
    isBeverageTab,
    producerName,
    producerRoleKey,
    technicalSpecs as readTechnicalSpecs,
    type BeverageAward,
    type BeverageBatch,
    type BeverageTab,
} from "@winelore/core/beverage"

type BeverageStatus = "APPROVED" | "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "SUBMITTED" | "SUSPENDED"
type BeverageType = "FORTIFIED" | "RED" | "ROSE" | "SPARKLING" | "WHITE"

interface ProducerDetails {
    id: string
    producerId?: string | null
    auid?: number[] | null
    role: string // Can be MAKER, OWNER, DISTRIBUTOR, BOTTLER, etc.
    displayName?: string | null
    username?: string | null
}

interface Beverage {
    id: string
    name: string
    status: BeverageStatus
    type: BeverageType
    typeId: string
    schemaEditionIds: string[]
    attributes: any
    producers: ProducerDetails[]
    originParts?: string[]
    createdBy?: number[] | null
    createdByUser?: {
        auid: string
        displayName?: string | null
        username?: string | null
    } | null
    createdAt: string
    origin?: {
        latitude?: number | null
        longitude?: number | null
    } | null
    colorType?: string | null
    beverageTypeName?: string | null
}

type AwardType = BeverageAward
type BatchType = BeverageBatch

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

    const roleKey = producerRoleKey(producer.role)
    const displayRole: string = roleKey ? t(roleKey) : producer.role
    const renderName = () => producerName(producer, t("common.unknownUser"))

    return (
        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-300 hover:-translate-y-0.5 ${getRoleColors(producer.role)}`}>
            <span className="font-bold text-slate-900">{renderName()}</span>
            <span className="opacity-30 text-current font-normal">•</span>
            <span className="uppercase tracking-wider text-[8px] font-extrabold">{displayRole}</span>
        </div>
    )
}

export default function BeverageClientView({ initialData, currentAuid, isNotFound, isError }: Props) {
    const [currentTab, setCurrentTab] = useState<BeverageTab>(() => {
        if (typeof window !== "undefined") {
            const tabParam = new URLSearchParams(window.location.search).get("tab")
            if (isBeverageTab(tabParam)) return tabParam
        }
        return defaultBeverageTab(readTechnicalSpecs(initialData?.beverage?.attributes).length)
    })

    useEffect(() => {
        if (typeof window !== "undefined") {
            const tabParam = new URLSearchParams(window.location.search).get("tab")
            if (isBeverageTab(tabParam)) setCurrentTab(tabParam)
        }
    }, [])
    const [beverageStatus, setBeverageStatus] = useState<BeverageStatus | null>(initialData?.beverage?.status || null)
    const [isSubmittingForReview, setIsSubmittingForReview] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedBatchForSamples, setSelectedBatchForSamples] = useState<ModalBatchData | null>(null)
    const [beverageEdits, setBeverageEdits] = useState<{
        name?: string
        origin?: Beverage["origin"]
        producers?: ProducerDetails[]
    }>({})
    const { formatStatus, formatBeverageType, formatDateTime, t } = useTranslation()

    const navTitleRef = useMobileNavTitle<HTMLHeadingElement>(beverageEdits.name ?? initialData?.beverage?.name)

    if (isNotFound) {
        return (
            <div className="app-screen bg-slate-50/50">
                <AppHeader activeTab="beverages" />
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] p-12 text-center shadow-sm sm:shadow-xl shadow-slate-200/50 max-w-md w-full">
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
            <div className="app-screen bg-slate-50/50">
                <AppHeader activeTab="beverages" />
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] p-12 text-center shadow-sm sm:shadow-xl shadow-slate-200/50 max-w-md w-full">
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

    const { awards, batches = [] } = initialData
    const beverage = {
        ...initialData.beverage,
        status: beverageStatus || initialData.beverage.status,
        ...beverageEdits,
    }
    const isProducer = isBeverageProducer(beverage.producers, currentAuid)

    const handleSubmitForReview = async () => {
        if (isSubmittingForReview || beverage.status !== "DRAFT" || !isProducer) return
        setIsSubmittingForReview(true)
        try {
            const updated = await submitBeverageForReviewAction(beverage.id)
            setBeverageStatus(updated?.status || "IN_REVIEW")
            toast.success(t("beverage.submitReviewSuccess", { defaultValue: "Напій успішно відправлено на перевірку!" }))
        } catch (err: any) {
            console.error("Failed to submit beverage for review:", err)
            toast.error(err.message || t("beverage.submitReviewError"))
        } finally {
            setIsSubmittingForReview(false)
        }
    }

    const getStatusConfig = (status: string) => {
        switch (beverageStatusTone(status)) {
            case "approved":
                return {
                    icon: <CheckCircle className="w-3.5 h-3.5" />,
                    className: "bg-emerald-50 text-emerald-600 border-emerald-100"
                }
            case "suspended":
                return {
                    icon: <AlertCircle className="w-3.5 h-3.5" />,
                    className: "bg-rose-50 text-rose-600 border-rose-100"
                }
            case "pending":
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

    const awardsByCompetition = groupAwardsByCompetition(awards)

    // Technical specs from attributes (excluding color)
    const technicalSpecs = readTechnicalSpecs(beverage.attributes)

    // Dynamic Tab Navigation Configuration
    const tabDetails: Record<BeverageTab, { label: string; icon: any; count?: number }> = {
        specs: { label: t("beverage.tabs.specs"), icon: HelpCircle },
        batches: { label: t("beverage.tabs.batches"), icon: Barcode, count: batches.length },
        awards: { label: t("beverage.tabs.awards"), icon: Trophy, count: awards.length },
    }
    const tabOptions = beverageTabs(technicalSpecs.length).map((id) => ({ id, ...tabDetails[id] }))

    return (
        <div className="app-screen bg-slate-50/50">
            <AppHeader activeTab="beverages" />

            <main className="app-main px-4 pt-1 pb-6 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-6xl space-y-6">

                    {/* Back Button */}
                    <BackLink href="/myBeverages" label={t("beverage.backToMyBeverages")} />

                    {/* Main Premium Card Header (Includes Overview Meta now) */}
                    <div className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 md:p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden group/header">
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
                                            <h1 ref={navTitleRef} className="text-2xl md:text-3xl font-extrabold text-slate-800 mt-3 mb-2 tracking-tight group-hover/header:text-indigo-950 transition-colors flex items-center justify-center md:justify-start gap-2">
                                                {beverage.name}
                                                {isProducer && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditModalOpen(true)}
                                                        title={t("beverage.edit.button")}
                                                        className="shrink-0 p-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-150 text-slate-400 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </h1>
                                        </div>

                                        <div className="flex items-center gap-2 self-center md:self-start flex-wrap justify-center md:justify-end">
                                            {beverage.status === "DRAFT" && isProducer && (
                                                <button
                                                    type="button"
                                                    onClick={handleSubmitForReview}
                                                    disabled={isSubmittingForReview}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-indigo-600/15 cursor-pointer"
                                                >
                                                    {isSubmittingForReview ? (
                                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                    ) : (
                                                        <Send className="h-3.5 w-3.5" />
                                                    )}
                                                    {t("beverage.submitReviewButton")}
                                                </button>
                                            )}
                                            <span className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest shrink-0 border shadow-sm ${statusConfig.className}`}>
                                                {statusConfig.icon}
                                                {formatStatus(beverage.status)}
                                            </span>
                                        </div>
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
                                    {beverageEdits.origin !== undefined ? (
                                        // Origin was just edited — originParts was geocoded from the old
                                        // coordinates server-side, so show the raw numbers instead of a
                                        // now-possibly-stale place name until the page next reloads.
                                        beverage.origin?.latitude != null && beverage.origin?.longitude != null ? (
                                            <span className="text-sm font-bold text-slate-700 tabular-nums">
                                                {beverage.origin.latitude.toFixed(4)}, {beverage.origin.longitude.toFixed(4)}
                                            </span>
                                        ) : (
                                            <div className="text-sm font-medium text-slate-400">{t("common.na")}</div>
                                        )
                                    ) : beverage.originParts && beverage.originParts.length > 0 ? (
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

                                {/* Created date & Provenance */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{t("beverage.created")}</span>
                                    </div>
                                    <p suppressHydrationWarning className="text-sm font-bold text-slate-700">
                                        {formatDateTime(beverage.createdAt)}
                                    </p>
                                    {beverage.createdByUser && (
                                        <p className="text-[11px] font-semibold text-slate-500">
                                            {t("beverage.enteredBy")}:{" "}
                                            <span className="font-bold text-slate-700">
                                                {beverage.createdByUser.displayName || (beverage.createdByUser.username ? `@${beverage.createdByUser.username}` : `AUID ${beverage.createdByUser.auid}`)}
                                            </span>
                                        </p>
                                    )}
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
                    <div className="pt-2 animate-fade-in transition-all duration-300">
                        {currentTab === "batches" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">{t("beverage.batches.title")}</h2>
                                        <p className="text-xs font-semibold text-slate-400 mt-1">{t("beverage.batches.subtitle")}</p>
                                    </div>
                                    {initialData?.beverage?.id && (
                                        <Link
                                            href={`/batch/create?beverageId=${initialData.beverage.id}`}
                                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>{t("batch.createButton", { defaultValue: "Створити партію" })}</span>
                                        </Link>
                                    )}
                                </div>

                                {batches.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {batches.map((batch) => {
                                            const figures = batchFigures(batch)
                                            const displayVintage = figures.vintage
                                            const batchSamples = batch.samples || []

                                            return (
                                                <div
                                                    key={batch.id}
                                                    className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-md hover:shadow-lg hover:border-indigo-100 transition-all duration-300 group/batch relative overflow-hidden flex flex-col justify-between"
                                                >
                                                    {/* Side border decoration */}
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 opacity-60 group-hover/batch:opacity-100 transition-opacity" />

                                                    <div>
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

                                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                                            <div className="bg-slate-50/50 border border-slate-100/50 rounded-xl p-3 text-center">
                                                                <Percent className="w-4 h-4 mx-auto text-indigo-600/80 mb-1" />
                                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">{t("beverage.batches.abv")}</span>
                                                                <span className="text-xs font-bold text-slate-700 mt-0.5 block">
                                                                    {figures.abv ?? t("common.na")}
                                                                </span>
                                                            </div>
                                                            
                                                            <div className="bg-slate-50/50 border border-slate-100/50 rounded-xl p-3 text-center">
                                                                <Droplet className="w-4 h-4 mx-auto text-indigo-600/80 mb-1" />
                                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">{t("beverage.batches.volume")}</span>
                                                                <span className="text-xs font-bold text-slate-700 mt-0.5 block truncate">
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

                                                    {/* Samples Section */}
                                                    {(() => {
                                                        const groupedSamples = figures.sampleGroups
                                                        const totalSamplesVol = figures.sampleVolume
                                                        const batchVol = figures.batchVolume

                                                        return (
                                                            <div className="mt-2 pt-3 border-t border-slate-100 bg-slate-50/50 -mx-5 -mb-5 p-4 rounded-b-[24px]">
                                                                <div className="flex items-center justify-between mb-2.5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
                                                                        <span className="text-xs font-bold text-slate-700">
                                                                            {t("sample.samplesTitle", { defaultValue: "Зразки (Samples)" })}
                                                                        </span>
                                                                        <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                                                                            {batchSamples.length}
                                                                        </span>
                                                                    </div>
                                                                    {initialData?.beverage?.id && (
                                                                        <Link
                                                                            href={`/sample/create?batchId=${batch.id}&beverageId=${initialData.beverage.id}`}
                                                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                                                                        >
                                                                            <Plus className="w-3 h-3" />
                                                                            <span>{t("sample.addSampleButton", { defaultValue: "Додати зразок" })}</span>
                                                                        </Link>
                                                                    )}
                                                                </div>

                                                                {batchSamples.length > 0 ? (
                                                                    <div className="space-y-2.5">
                                                                        {/* Aggregated volume badges & open modal button */}
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            {groupedSamples.map((group, gIdx) => (
                                                                                <span
                                                                                    key={gIdx}
                                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-xs"
                                                                                >
                                                                                    <Droplet className="w-3 h-3 text-indigo-500" />
                                                                                    <span>
                                                                                        {group.count} × {group.volumeMl ? `${group.volumeMl.toLocaleString()} ${t("common.milliliters")}` : t("common.standard", { defaultValue: "Стандарт" })}
                                                                                    </span>
                                                                                </span>
                                                                            ))}

                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSelectedBatchForSamples(batch as any)}
                                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700 transition-colors cursor-pointer"
                                                                            >
                                                                                <span>{t("sample.viewAllSamples", { defaultValue: "Всі зразки" })} ({batchSamples.length})</span>
                                                                                <ExternalLink className="w-3 h-3" />
                                                                            </button>
                                                                        </div>

                                                                        {/* Volume utilization progress bar if batch has volumeMl */}
                                                                        {batchVol !== null && (
                                                                            <div className="rounded-xl border border-slate-100 bg-white/70 p-2.5">
                                                                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                                                                    <span>
                                                                                        {t("sample.allocatedVolume", {
                                                                                            used: totalSamplesVol.toLocaleString(),
                                                                                            total: batchVol.toLocaleString(),
                                                                                            defaultValue: `Виділено ${totalSamplesVol.toLocaleString()} мл з ${batchVol.toLocaleString()} мл`,
                                                                                        })}
                                                                                    </span>
                                                                                    <span className={totalSamplesVol > batchVol ? "text-rose-600 font-bold" : "text-indigo-600 font-bold"}>
                                                                                        {Math.min(100, Math.round((totalSamplesVol / batchVol) * 100))}%
                                                                                    </span>
                                                                                </div>
                                                                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                                                    <div
                                                                                        className={`h-full transition-all duration-300 ${
                                                                                            totalSamplesVol > batchVol
                                                                                                ? "bg-rose-500"
                                                                                                : totalSamplesVol / batchVol > 0.8
                                                                                                ? "bg-amber-500"
                                                                                                : "bg-indigo-600"
                                                                                        }`}
                                                                                        style={{ width: `${Math.min(100, (totalSamplesVol / batchVol) * 100)}%` }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-[11px] text-slate-400 italic">
                                                                        {t("sample.emptySamplesDesc", { defaultValue: "Немає зареєстрованих зразків" })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )
                                                    })()}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] p-16 text-center shadow-md flex flex-col items-center justify-center">
                                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-[24px] mb-4 text-slate-400">
                                            <Barcode className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-2">{t("beverage.batches.emptyTitle")}</h3>
                                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
                                            {t("beverage.batches.emptyDesc")}
                                        </p>
                                        {initialData?.beverage?.id && (
                                            <Link
                                                href={`/batch/create?beverageId=${initialData.beverage.id}`}
                                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span>{t("batch.createFirstBatchButton", { defaultValue: "Створити першу партію" })}</span>
                                            </Link>
                                        )}
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
                                        {awardsByCompetition.map((group, idx: number) => (
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
                                    <div className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] p-16 text-center shadow-md flex flex-col items-center justify-center">
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
                                    <div className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] p-16 text-center shadow-md flex flex-col items-center justify-center">
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

            <EditBeverageModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                beverage={beverage}
                onUpdated={(patch) => setBeverageEdits((prev) => ({ ...prev, ...patch }))}
            />

            <SamplesListModal
                isOpen={!!selectedBatchForSamples}
                onClose={() => setSelectedBatchForSamples(null)}
                batch={selectedBatchForSamples}
                beverageId={beverage.id}
                beverageName={beverage.name}
            />
        </div>
    )
}
