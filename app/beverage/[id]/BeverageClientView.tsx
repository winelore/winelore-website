"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Trophy, Wine, Tag, AlertCircle, CheckCircle, MapPin, Calendar, Award, ArrowLeft, Clock,
    Users, Percent, Droplet, Layers, HelpCircle, Barcode, Send, Pencil, FlaskConical, Plus, ExternalLink,
    Check, X, Loader2, Trash2, UserPlus
} from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { useMobileNavTitle } from "@/lib/mobileNav"
import { AppHeader } from "@/components/AppHeader"
import {
    submitBeverageForReviewAction,
    changeBeverageNameAction,
    changeBeverageOriginAction,
    registerBeverageProducerAction,
    unregisterBeverageProducerAction,
} from "../actions"
import { searchUserByUsernameAction } from "@/app/commission/actions"
import { useAvatars } from "@/hooks/useAvatars"
import { AxusAvatar } from "@/components/AxusAvatar"
import { holderInitials } from "@winelore/core/competition"
import { BackLink } from "@/components/BackLink"
import { BatchCard } from "./BatchCard"
import { SamplesListModal, type ModalBatchData } from "./SamplesListModal"
import {
    beverageStatusTone,
    beverageTabs,
    defaultBeverageTab,
    groupAwardsByCompetition,
    isBeverageProducer,
    isBeverageTab,
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

function getAvatarGradient(auid: number): string {
    const gradients = [
        "from-pink-500 via-rose-500 to-red-500",
        "from-indigo-500 via-purple-500 to-pink-500",
        "from-blue-500 via-teal-500 to-emerald-500",
        "from-amber-400 via-orange-500 to-red-500",
        "from-violet-600 via-purple-600 to-indigo-600",
        "from-cyan-500 via-blue-500 to-indigo-500",
    ]
    return gradients[Math.abs(auid) % gradients.length]
}

function producerLabel(p: ProducerDetails): string {
    if (p.displayName) return p.displayName
    if (p.username) return `@${p.username}`
    if (p.producerId) return `ID ${p.producerId}`
    if (p.auid && p.auid.length > 0) return `AUID ${p.auid[0]}`
    return "Producer"
}

export default function BeverageClientView({ initialData, currentAuid, isNotFound, isError }: Props) {
    const [currentTab, setCurrentTab] = useState<BeverageTab>(() =>
        defaultBeverageTab(readTechnicalSpecs(initialData?.beverage?.attributes).length)
    )

    useEffect(() => {
        if (typeof window !== "undefined") {
            const tabParam = new URLSearchParams(window.location.search).get("tab")
            if (isBeverageTab(tabParam)) setCurrentTab(tabParam)
        }
    }, [])
    const [beverageStatus, setBeverageStatus] = useState<BeverageStatus | null>(initialData?.beverage?.status || null)
    const [isSubmittingForReview, setIsSubmittingForReview] = useState(false)
    const [isMutating, setIsMutating] = useState(false)
    const [isEditingName, setIsEditingName] = useState(false)
    const [editNameData, setEditNameData] = useState("")
    const [isEditingOrigin, setIsEditingOrigin] = useState(false)
    const [editOriginData, setEditOriginData] = useState({ latitude: "", longitude: "" })
    const [isAddingProducer, setIsAddingProducer] = useState(false)
    const [producerUsernameInput, setProducerUsernameInput] = useState("")
    const [isSearchingProducer, setIsSearchingProducer] = useState(false)
    const [producerSearchError, setProducerSearchError] = useState<string | null>(null)
    const [foundProducer, setFoundProducer] = useState<{ auid: number; username: string; displayName: string } | null>(null)
    const [selectedProducerRole, setSelectedProducerRole] = useState<"MAKER" | "BOTTLER">("MAKER")
    const [isAddingProducerMutating, setIsAddingProducerMutating] = useState(false)
    const [removingProducerId, setRemovingProducerId] = useState<string | null>(null)
    const [selectedBatchForSamples, setSelectedBatchForSamples] = useState<ModalBatchData | null>(null)
    const [beverageEdits, setBeverageEdits] = useState<{
        name?: string
        origin?: Beverage["origin"]
        producers?: ProducerDetails[]
    }>({})
    const { formatStatus, formatBeverageType, formatDateTime, t } = useTranslation()

    const producerAuids = useMemo(() => {
        const producers = beverageEdits.producers ?? initialData?.beverage?.producers ?? [];
        const ids: number[] = [];
        for (const p of producers) {
            if (p.auid) ids.push(...p.auid);
        }
        if (foundProducer) ids.push(foundProducer.auid);
        return ids;
    }, [beverageEdits.producers, initialData?.beverage?.producers, foundProducer])
    const { avatars } = useAvatars(producerAuids)

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
    const router = useRouter()

    const openEditName = () => {
        setEditNameData(beverage.name)
        setIsEditingName(true)
    }

    const openEditOrigin = () => {
        setEditOriginData({
            latitude: beverage.origin?.latitude != null ? String(beverage.origin.latitude) : "",
            longitude: beverage.origin?.longitude != null ? String(beverage.origin.longitude) : "",
        })
        setIsEditingOrigin(true)
    }

    const handleSaveName = async () => {
        if (!editNameData.trim()) {
            toast.error(t("beverage.edit.nameRequired"))
            return
        }
        setIsMutating(true)
        try {
            const updated = await changeBeverageNameAction(beverage.id, editNameData.trim())
            setBeverageEdits((prev) => ({ ...prev, name: updated.name }))
            setIsEditingName(false)
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || t("beverage.edit.saveError"))
        } finally {
            setIsMutating(false)
        }
    }

    const handleSaveOrigin = async () => {
        const latRaw = editOriginData.latitude.trim()
        const lngRaw = editOriginData.longitude.trim()
        if ((latRaw && !lngRaw) || (!latRaw && lngRaw)) {
            toast.error(t("beverage.edit.saveError"))
            return
        }
        const lat = latRaw ? Number(latRaw) : null
        const lng = lngRaw ? Number(lngRaw) : null
        if ((latRaw && (lat === null || Number.isNaN(lat))) || (lngRaw && (lng === null || Number.isNaN(lng)))) {
            toast.error(t("beverage.edit.saveError"))
            return
        }
        setIsMutating(true)
        try {
            const origin = lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null
            const updated = await changeBeverageOriginAction(beverage.id, origin)
            setBeverageEdits((prev) => ({ ...prev, origin: updated.origin }))
            setIsEditingOrigin(false)
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || t("beverage.edit.saveError"))
        } finally {
            setIsMutating(false)
        }
    }

    useEffect(() => {
        const trimmed = producerUsernameInput.trim().replace(/^@/, "")
        if (!trimmed || !isAddingProducer) {
            if (!trimmed) {
                setFoundProducer(null)
                setProducerSearchError(null)
            }
            return
        }
        const timer = setTimeout(async () => {
            setIsSearchingProducer(true)
            setProducerSearchError(null)
            setFoundProducer(null)
            try {
                const res = await searchUserByUsernameAction(trimmed)
                if (res.success && res.user) {
                    setFoundProducer(res.user)
                } else {
                    setProducerSearchError(res.error || t("beverage.edit.userNotFound"))
                }
            } catch (err: any) {
                setProducerSearchError(err.message || t("beverage.edit.searchError"))
            } finally {
                setIsSearchingProducer(false)
            }
        }, 400)
        return () => clearTimeout(timer)
    }, [producerUsernameInput, isAddingProducer, t])

    const openAddProducer = () => {
        setProducerUsernameInput("")
        setFoundProducer(null)
        setProducerSearchError(null)
        setIsAddingProducer(true)
    }

    const handleAddProducer = async () => {
        if (!foundProducer || isAddingProducerMutating) return
        setIsAddingProducerMutating(true)
        try {
            const updated = await registerBeverageProducerAction(beverage.id, foundProducer.auid, selectedProducerRole)
            const enrichedProducers = (updated.producers as unknown as ProducerDetails[]).map((p) =>
                (p.producerId === String(foundProducer.auid) || (p.auid && p.auid[0] === foundProducer.auid))
                    ? { ...p, displayName: foundProducer.displayName, username: foundProducer.username }
                    : p
            )
            setBeverageEdits((prev) => ({ ...prev, producers: enrichedProducers }))
            setProducerUsernameInput("")
            setFoundProducer(null)
            setIsAddingProducer(false)
            router.refresh()
            toast.success(t("beverage.edit.saveSuccess"))
        } catch (err: any) {
            toast.error(err.message || t("beverage.edit.addProducerError"))
        } finally {
            setIsAddingProducerMutating(false)
        }
    }

    const handleRemoveProducer = async (producerDetailsId: string) => {
        if (removingProducerId) return
        setRemovingProducerId(producerDetailsId)
        try {
            const updated = await unregisterBeverageProducerAction(beverage.id, producerDetailsId)
            setBeverageEdits((prev) => ({ ...prev, producers: updated.producers as unknown as ProducerDetails[] }))
            router.refresh()
            toast.success(t("beverage.edit.saveSuccess"))
        } catch (err: any) {
            toast.error(err.message || t("beverage.edit.removeProducerError"))
        } finally {
            setRemovingProducerId(null)
        }
    }

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
                                                {isEditingName ? (
                                                    <div className="flex items-center gap-2 mt-1 w-full">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            className="text-xl md:text-2xl font-extrabold text-slate-900 bg-white border border-indigo-400 focus:border-indigo-600 rounded-xl px-3 py-1 outline-none shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all min-w-[180px] flex-1 max-w-lg"
                                                            value={editNameData}
                                                            onChange={e => setEditNameData(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === "Enter") handleSaveName()
                                                                if (e.key === "Escape") setIsEditingName(false)
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveName}
                                                            disabled={isMutating}
                                                            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                                                            title={t("common.save")}
                                                        >
                                                            {isMutating ? (
                                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                            ) : (
                                                                <Check className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsEditingName(false)}
                                                            disabled={isMutating}
                                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors shrink-0 cursor-pointer"
                                                            title={t("competition.cancel")}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {beverage.name}
                                                        {isProducer && (
                                                            <button
                                                                type="button"
                                                                onClick={openEditName}
                                                                title={t("beverage.edit.button")}
                                                                className="shrink-0 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer active:scale-95"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </>
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
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                            <span>{t("beverage.origin")}</span>
                                        </div>
                                        {isProducer && (
                                            isEditingOrigin ? (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveOrigin}
                                                        disabled={isMutating}
                                                        className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                        title={t("common.saveDates")}
                                                    >
                                                        {isMutating ? (
                                                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                        ) : (
                                                            <Check className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>Save</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditingOrigin(false)}
                                                        disabled={isMutating}
                                                        className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                                        title={t("competition.cancel")}
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={openEditOrigin}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all shrink-0 cursor-pointer active:scale-95"
                                                    title={t("common.editPlannedDates")}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )
                                        )}
                                    </div>
                                    {isEditingOrigin ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("beverage.edit.latitudeLabel")}</span>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    className="text-xs font-semibold text-slate-800 bg-slate-50 border border-indigo-300 focus:border-indigo-600 rounded-lg px-2.5 py-1 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                                    value={editOriginData.latitude}
                                                    onChange={e => setEditOriginData({ ...editOriginData, latitude: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") handleSaveOrigin()
                                                        if (e.key === "Escape") setIsEditingOrigin(false)
                                                    }}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("beverage.edit.longitudeLabel")}</span>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    className="text-xs font-semibold text-slate-800 bg-slate-50 border border-indigo-300 focus:border-indigo-600 rounded-lg px-2.5 py-1 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                                    value={editOriginData.longitude}
                                                    onChange={e => setEditOriginData({ ...editOriginData, longitude: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") handleSaveOrigin()
                                                        if (e.key === "Escape") setIsEditingOrigin(false)
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ) : beverageEdits.origin !== undefined ? (
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
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                                            <span>{t("beverage.producers")}</span>
                                        </div>
                                        {isProducer && !isAddingProducer && (
                                            <button
                                                onClick={openAddProducer}
                                                disabled={isAddingProducerMutating || removingProducerId !== null}
                                                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>{t("beverage.edit.addProducer")}</span>
                                            </button>
                                        )}
                                    </div>
                                    {beverage.producers.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                            {beverage.producers.map((p) => (
                                                <div
                                                    key={p.id}
                                                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100"
                                                >
                                                    <AxusAvatar
                                                        imageUrl={p.auid?.[0] != null ? avatars[p.auid[0]] : null}
                                                        alt={producerLabel(p)}
                                                        className="h-8 w-8 rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
                                                        fallback={
                                                            <div
                                                                className={`flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br ${getAvatarGradient((p.auid?.[0] ?? (p.producerId ? parseInt(p.producerId, 10) : 0)) || 0)} text-white font-bold text-[10px] shrink-0 border-2 border-white shadow-sm`}
                                                            >
                                                                {holderInitials(producerLabel(p), (p.auid?.[0] ?? (p.producerId ? parseInt(p.producerId, 10) : 0)) || 0)}
                                                            </div>
                                                        }
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-slate-800 truncate">{producerLabel(p)}</p>
                                                        <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">{p.role}</p>
                                                    </div>
                                                    {isProducer && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveProducer(p.id)}
                                                            disabled={removingProducerId === p.id}
                                                            aria-label={t("beverage.edit.removeProducer")}
                                                            title={t("beverage.edit.removeProducer")}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                                                        >
                                                            {removingProducerId === p.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        !isAddingProducer && <div className="text-sm font-medium text-slate-400">{t("common.na")}</div>
                                    )}

                                    {isProducer && isAddingProducer && (
                                        <div className="mb-1 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-800">{t("beverage.edit.producersTitle")}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddingProducer(false)}
                                                    className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">@</span>
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder={t("beverage.edit.usernameLabel")}
                                                    value={producerUsernameInput}
                                                    onChange={(e) => {
                                                        setProducerUsernameInput(e.target.value)
                                                        if (foundProducer) setFoundProducer(null)
                                                        if (producerSearchError) setProducerSearchError(null)
                                                    }}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter" && foundProducer) handleAddProducer()
                                                        if (e.key === "Escape") setIsAddingProducer(false)
                                                    }}
                                                    className="w-full pl-8 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                                />
                                                {isSearchingProducer && (
                                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-600 flex items-center">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    </span>
                                                )}
                                            </div>
                                            {producerSearchError && (
                                                <p className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                    <span>{producerSearchError}</span>
                                                </p>
                                            )}
                                            {foundProducer && (
                                                <div className="flex items-center gap-3 animate-fade-in">
                                                    <AxusAvatar
                                                        imageUrl={avatars[foundProducer.auid]}
                                                        alt={foundProducer.displayName}
                                                        className="h-9 w-9 rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
                                                        fallback={
                                                            <div
                                                                className={`flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br ${getAvatarGradient(foundProducer.auid)} text-white font-bold text-xs shrink-0 border-2 border-white shadow-sm`}
                                                            >
                                                                {holderInitials(foundProducer.displayName || foundProducer.username, foundProducer.auid)}
                                                            </div>
                                                        }
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-slate-800 truncate">{foundProducer.displayName}</p>
                                                        <p className="text-[10px] text-indigo-600 font-semibold">@{foundProducer.username}</p>
                                                    </div>
                                                    <select
                                                        value={selectedProducerRole}
                                                        onChange={(e) => setSelectedProducerRole(e.target.value as "MAKER" | "BOTTLER")}
                                                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none cursor-pointer shrink-0"
                                                    >
                                                        <option value="MAKER">{t("roles.maker")}</option>
                                                        <option value="BOTTLER">{t("roles.bottler")}</option>
                                                    </select>
                                                </div>
                                            )}
                                            <div className="flex justify-end gap-2 mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddingProducer(false)}
                                                    disabled={isAddingProducerMutating}
                                                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                                                >
                                                    {t("competition.cancel")}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleAddProducer}
                                                    disabled={!foundProducer || isAddingProducerMutating}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1 disabled:opacity-75 cursor-pointer"
                                                >
                                                    {isAddingProducerMutating ? (
                                                        <>
                                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                            <span>{t("beverage.edit.saving")}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserPlus className="w-3.5 h-3.5" />
                                                            <span>{t("beverage.edit.addProducer")}</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
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
                                        {batches.map((batch) => <BatchCard key={batch.id} batch={batch} beverageId={initialData?.beverage?.id as string} t={t} canEdit={isProducer} setSelectedBatchForSamples={setSelectedBatchForSamples} />)}
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
