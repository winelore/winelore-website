"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/i18n/context"
import {
    Layers, ArrowLeft, Calendar, Settings, CheckCircle2,
    Pencil, AlertCircle, ChevronDown, ChevronUp, Tag, Hash
} from "lucide-react"
import Link from "next/link"
import { getPropertyTypeLabel } from "../../myTemplates/TemplateCreatorModal"
import TemplateCreatorModal from "../../myTemplates/TemplateCreatorModal"

interface Property {
    id: string
    code: string
    name: string
    description?: string
    type: string
    isRequired: boolean
    isResult?: boolean
    minLimit?: number
    maxLimit?: number
    allowedValues?: number[] | string[]
    defaultValue?: any
}

interface Category {
    id: string
    name: string
    properties: Property[]
}

interface TemplateEdition {
    id: string
    version: number
    status: string
    categories: Category[]
}

interface Template {
    id: string
    name: string
    beverageType: string
    beverageTypeId?: string
    status: string
    createdAt: string
    owners: number[][]
    editions?: TemplateEdition[]
    latestEdition?: TemplateEdition | null
}

interface Props {
    template: Template | null
    currentAuid: number
    hasError?: boolean
    initialVersion?: number
}

export default function TemplateDetailClientView({ template, currentAuid, hasError = false, initialVersion }: Props) {
    const { t } = useTranslation()
    const [selectedEdition, setSelectedEdition] = useState<TemplateEdition | null>(
        template?.editions?.find((edition) => edition.version === initialVersion) ?? template?.latestEdition ?? null
    )
    const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    const isOwner = template?.owners?.some((ownerArr) => ownerArr.includes(currentAuid)) ?? false

    const toggleCategory = (id: string) => {
        setExpandedCategoryId(prev => prev === id ? null : id)
    }

    if (hasError) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="bg-white border border-red-100 rounded-3xl p-10 max-w-md w-full shadow-xl text-center">
                    <div className="p-4 bg-red-50 rounded-2xl inline-flex mb-5">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">{t("myTemplates.errorTitle")}</h2>
                    <p className="text-slate-500 text-sm mb-6">{t("myTemplates.errorDescription")}</p>
                    <Link
                        href="/myTemplates"
                        className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("myTemplates.title")}
                    </Link>
                </div>
            </div>
        )
    }

    if (!template) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="bg-white border border-slate-100 rounded-3xl p-10 max-w-md w-full shadow-xl text-center">
                    <div className="p-4 bg-slate-50 rounded-2xl inline-flex mb-5">
                        <Layers className="w-8 h-8 text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">{t("myTemplates.notFound")}</h2>
                    <Link
                        href="/myTemplates"
                        className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("myTemplates.title")}
                    </Link>
                </div>
            </div>
        )
    }

    const editions = template.editions ?? (template.latestEdition ? [template.latestEdition] : [])

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                    <Link
                        href="/myTemplates"
                        className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("myTemplates.title")}
                    </Link>
                    {isOwner && (
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm transition-all cursor-pointer border border-indigo-100"
                        >
                            <Pencil className="w-4 h-4" />
                            {t("myTemplates.editTemplate")}
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

                {/* Template info card */}
                <div className="bg-white border border-slate-100 rounded-[28px] shadow-xl shadow-slate-200/45 p-7">
                    <div className="flex items-start gap-5">
                        <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                            <Layers className="w-7 h-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{template.name}</h1>
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-semibold text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {t("myTemplates.createdAt")}: {new Date(template.createdAt).toLocaleDateString("en-CA")}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5" />
                                    {t("myTemplates.type")}: <span className="text-slate-700 uppercase font-bold ml-1">{template.beverageType}</span>
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-emerald-700 font-bold uppercase">{t("myTemplates.active")}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edition selector (if multiple) */}
                {editions.length > 1 && (
                    <div className="bg-white border border-slate-100 rounded-[28px] shadow-xl shadow-slate-200/45 p-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Hash className="w-4 h-4 text-indigo-500" />
                            {t("myTemplates.editionHistory")}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {editions.map((edition) => {
                                const isActive = selectedEdition?.id === edition.id
                                return (
                                    <button
                                        key={edition.id}
                                        onClick={() => setSelectedEdition(edition)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                            isActive
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                                        }`}
                                    >
                                        v{edition.version}
                                        {edition.status === "ACTIVE" && (
                                            <span className="ml-1.5 text-emerald-400">●</span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Structure */}
                {selectedEdition ? (
                    <div className="bg-white border border-slate-100 rounded-[28px] shadow-xl shadow-slate-200/45 p-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-1.5">
                            <Settings className="w-4 h-4 text-indigo-500" />
                            {t("myTemplates.evaluationStructure")}
                            <span className="ml-auto text-indigo-600 font-extrabold">
                                {selectedEdition.categories.length} {t("myTemplates.categories").toLowerCase()}
                            </span>
                        </h3>

                        <div className="flex flex-col gap-3">
                            {selectedEdition.categories.map((cat) => {
                                const isExpanded = expandedCategoryId === cat.id
                                return (
                                    <div
                                        key={cat.id}
                                        className="border border-slate-100 rounded-2xl overflow-hidden"
                                    >
                                        {/* Category header */}
                                        <button
                                            onClick={() => toggleCategory(cat.id)}
                                            className="w-full flex items-center justify-between px-5 py-4 bg-slate-50/60 hover:bg-indigo-50/40 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                                                    <Settings className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-800">{cat.name}</span>
                                                <span className="text-xs text-slate-400 font-semibold">
                                                    {cat.properties.length} {t("myTemplates.totalScores").toLowerCase()}
                                                </span>
                                            </div>
                                            {isExpanded
                                                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                                : <ChevronDown className="w-4 h-4 text-slate-400" />
                                            }
                                        </button>

                                        {/* Properties */}
                                        {isExpanded && (
                                            <div className="divide-y divide-slate-50">
                                                {cat.properties.map((prop) => (
                                                    <div
                                                        key={prop.id}
                                                        className="px-5 py-3.5 flex justify-between items-center hover:bg-slate-50/50 transition-colors"
                                                    >
                                                        <div className="flex flex-col min-w-0 flex-1 pr-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-slate-700">{prop.name}</span>
                                                                {prop.isRequired && (
                                                                    <span className="text-rose-500 font-bold text-xs" title={t("common.required")}>*</span>
                                                                )}
                                                                {prop.isResult && (
                                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                                                                        Result
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {prop.description && (
                                                                <span className="text-[11px] text-slate-400 font-medium mt-0.5">{prop.description}</span>
                                                            )}
                                                            <div className="flex flex-wrap gap-2 mt-1.5">
                                                                {prop.minLimit !== undefined && (
                                                                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 border border-slate-200/60 rounded-md px-1.5 py-0.5">
                                                                        min: {prop.minLimit}
                                                                    </span>
                                                                )}
                                                                {prop.maxLimit !== undefined && (
                                                                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 border border-slate-200/60 rounded-md px-1.5 py-0.5">
                                                                        max: {prop.maxLimit}
                                                                    </span>
                                                                )}
                                                                {prop.allowedValues && prop.allowedValues.length > 0 && (
                                                                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 border border-slate-200/60 rounded-md px-1.5 py-0.5">
                                                                        [{prop.allowedValues.join(", ")}]
                                                                    </span>
                                                                )}
                                                                {prop.defaultValue !== undefined && prop.defaultValue !== null && (
                                                                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 border border-slate-200/60 rounded-md px-1.5 py-0.5">
                                                                        default: {String(prop.defaultValue)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1 text-[11px] font-bold border border-slate-200/60 shrink-0">
                                                            {getPropertyTypeLabel(prop.type, t)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-100 rounded-[28px] shadow-xl shadow-slate-200/45 p-10 text-center text-slate-400">
                        <Layers className="w-8 h-8 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">{t("myTemplates.notFound")}</p>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <TemplateCreatorModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    currentAuid={currentAuid}
                    initialTemplateId={template.id}
                />
            )}
        </div>
    )
}
