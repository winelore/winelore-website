"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/AppHeader"
import { ArrowLeft, Calendar, Layers, CheckCircle2, Pencil, Settings, UserCheck, Sliders, ShieldCheck, Tag, Info, Check, ChevronRight } from "lucide-react"
import Cookies from "js-cookie"
import TemplateCreatorModal, { PROPERTY_TYPE_LABELS } from "../TemplateCreatorModal"

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
    allowedValues?: any[]
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

interface TemplateDetail {
    id: string
    name: string
    beverageType: string
    beverageTypeId?: string
    status: string
    createdAt: string
    owners: number[][]
    editions: TemplateEdition[]
    latestEdition?: TemplateEdition
}

function formatDate(dateStr?: string) {
    if (!dateStr) return "Н/Д"
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "Н/Д"
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}.${month}.${year}`
}

export default function TemplateDetailClientView({ initialTemplate }: { initialTemplate: TemplateDetail }) {
    const [template, setTemplate] = useState<TemplateDetail>(initialTemplate)
    const [selectedVersion, setSelectedVersion] = useState<number>(
        initialTemplate.latestEdition?.version || (initialTemplate.editions && initialTemplate.editions.length > 0 ? initialTemplate.editions[0].version : 1)
    )
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentAuid, setCurrentAuid] = useState<number>(0)

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) {
            const parsed = parseInt(cookieAuid, 10)
            if (!isNaN(parsed)) setCurrentAuid(parsed)
        }
    }, [])

    useEffect(() => {
        setTemplate(initialTemplate)
        if (initialTemplate.latestEdition) {
            setSelectedVersion(initialTemplate.latestEdition.version)
        } else if (initialTemplate.editions && initialTemplate.editions.length > 0) {
            setSelectedVersion(initialTemplate.editions[0].version)
        }
    }, [initialTemplate])

    // Find currently selected edition or fallback to first
    const activeEdition = template.editions?.find(e => e.version === selectedVersion) 
        || template.latestEdition 
        || (template.editions && template.editions[0])

    const isOwned = currentAuid > 0 && template.owners && template.owners.some(ownerGroup =>
        Array.isArray(ownerGroup)
            ? ownerGroup.includes(currentAuid)
            : (ownerGroup as any) === currentAuid
    )

    const totalCategories = activeEdition?.categories.length || 0
    const totalProperties = activeEdition?.categories.reduce((acc, cat) => acc + (cat.properties?.length || 0), 0) || 0

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="competitions" />

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-6xl flex flex-col gap-6">
                    
                    {/* Back Link */}
                    <div>
                        <Link 
                            href="/templates" 
                            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 bg-white border border-slate-200/80 hover:border-indigo-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Назад до всіх темплейтів</span>
                        </Link>
                    </div>

                    {/* Template Header Card */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl shrink-0 shadow-md shadow-indigo-500/20 mt-1">
                                    <Layers className="w-7 h-7" />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="text-xs font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200/80 rounded-lg px-2.5 py-1">
                                            {template.beverageType || "WINE"}
                                        </span>
                                        {isOwned && (
                                            <span className="text-xs font-extrabold bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg px-2.5 py-1 flex items-center gap-1">
                                                <UserCheck className="w-3.5 h-3.5" />
                                                Ваш шаблон
                                            </span>
                                        )}
                                        <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1 uppercase tracking-wider flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {template.status || "ACTIVE"}
                                        </span>
                                    </div>

                                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mt-3">
                                        {template.name}
                                    </h1>

                                    <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-slate-500 flex-wrap">
                                        <span className="flex items-center gap-1.5" suppressHydrationWarning>
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            Створено: {formatDate(template.createdAt)}
                                        </span>
                                        <span className="text-slate-300">|</span>
                                        <span>Всього версій: <span className="text-indigo-600 font-bold">{template.editions?.length || 1}</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            {isOwned && (
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 text-sm font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer transform active:scale-95 shrink-0 self-start"
                                >
                                    <Pencil className="w-4 h-4" />
                                    <span>Редагувати темплейт</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Editions Version Switcher & Details */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
                        
                        {/* Section Header & Version Tabs */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Sliders className="w-5 h-5 text-indigo-600" />
                                    Версії темплейту (Editions)
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Виберіть версію для перегляду її категорій та критеріїв оцінювання.
                                </p>
                            </div>

                            {/* Version selector buttons */}
                            <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-1.5 rounded-2xl border border-slate-200/70">
                                {template.editions && template.editions.length > 0 ? (
                                    template.editions.map((ed) => {
                                        const isSelected = ed.version === selectedVersion
                                        const isLatest = template.latestEdition?.version === ed.version

                                        return (
                                            <button
                                                key={ed.id}
                                                onClick={() => setSelectedVersion(ed.version)}
                                                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                                                    isSelected
                                                        ? "bg-indigo-600 text-white shadow-xs"
                                                        : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                                                }`}
                                            >
                                                <span>v{ed.version}</span>
                                                {isLatest && (
                                                    <span className={`px-1.5 py-0.2 text-[9px] rounded-md uppercase font-black tracking-wider ${
                                                        isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                                                    }`}>
                                                        Остання
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })
                                ) : (
                                    <span className="text-xs text-slate-500 px-3 py-1 font-semibold">
                                        Версія 1 (Остання)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Summary bar for selected edition */}
                        <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Версія:</span>
                                <span className="text-sm font-extrabold text-slate-800 bg-white border border-slate-200/60 rounded-md px-2 py-0.5">
                                    v{activeEdition?.version || 1}
                                </span>
                                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5 uppercase tracking-wider">
                                    {activeEdition?.status || "ACTIVE"}
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <span>Категорій: <span className="text-indigo-600 font-black">{totalCategories}</span></span>
                                <span className="text-slate-300">|</span>
                                <span>Показників оцінки: <span className="text-indigo-600 font-black">{totalProperties}</span></span>
                            </div>
                        </div>

                        {/* Categories & Properties Grid */}
                        {activeEdition && activeEdition.categories && activeEdition.categories.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-2">
                                {activeEdition.categories.map((cat) => (
                                    <div 
                                        key={cat.id} 
                                        className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col gap-4"
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                                                {cat.name}
                                            </h3>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {cat.properties?.length || 0} оцінок
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-2.5">
                                            {cat.properties && cat.properties.map((prop) => (
                                                <div 
                                                    key={prop.id} 
                                                    className="flex flex-col bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs transition-colors gap-1.5"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-extrabold text-slate-800">{prop.name}</span>
                                                            {prop.isRequired && (
                                                                <span className="text-rose-500 font-bold" title="Обов'язкове">*</span>
                                                            )}
                                                            {prop.isResult && (
                                                                <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200/60 rounded px-1.5 py-0.2" title="Маркер підсумкового балу">
                                                                    Результат
                                                                </span>
                                                            )}
                                                        </div>

                                                        <span className="bg-white text-slate-600 rounded-md px-2 py-0.5 text-[10px] font-bold border border-slate-200/60 shrink-0">
                                                            {PROPERTY_TYPE_LABELS[prop.type] || prop.type}
                                                        </span>
                                                    </div>

                                                    {prop.description && (
                                                        <p className="text-[11px] text-slate-500 font-medium">
                                                            {prop.description}
                                                        </p>
                                                    )}

                                                    {/* Additional property constraints info */}
                                                    {(prop.minLimit !== undefined || prop.maxLimit !== undefined || (prop.allowedValues && prop.allowedValues.length > 0)) && (
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100 flex-wrap">
                                                            {prop.minLimit !== undefined && prop.maxLimit !== undefined && (
                                                                <span>Діапазон: <strong className="text-slate-600">{prop.minLimit} - {prop.maxLimit}</strong></span>
                                                            )}
                                                            {prop.allowedValues && prop.allowedValues.length > 0 && (
                                                                <span>Допустимі значення: <strong className="text-slate-600">{prop.allowedValues.join(", ")}</strong></span>
                                                            )}
                                                            {prop.defaultValue !== undefined && (
                                                                <span>За замовчуванням: <strong className="text-slate-600">{String(prop.defaultValue)}</strong></span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
                                <span>Категорії або показники оцінювання для цієї версії відсутні.</span>
                            </div>
                        )}

                    </div>

                </div>
            </main>

            {isModalOpen && (
                <TemplateCreatorModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    currentAuid={currentAuid}
                    initialTemplateId={template.id}
                />
            )}
        </div>
    )
}
