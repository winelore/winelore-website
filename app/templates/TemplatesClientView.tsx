"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/AppHeader"
import { Plus, Calendar, Search, Layers, CheckCircle2, Pencil, ArrowRight, UserCheck, Sparkles } from "lucide-react"
import Cookies from "js-cookie"
import TemplateCreatorModal, { PROPERTY_TYPE_LABELS } from "./TemplateCreatorModal"

interface Property {
    id: string
    code: string
    name: string
    description?: string
    type: string
    isRequired: boolean
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
    status: string
    createdAt: string
    owners: number[][]
    totalEditions?: number
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

export default function TemplatesClientView({ initialTemplates, totalCount }: { initialTemplates: Template[]; totalCount?: number }) {
    const router = useRouter()
    const [templates, setTemplates] = useState<Template[]>(initialTemplates)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
    const [currentAuid, setCurrentAuid] = useState<number>(0)
    const [activeTab, setActiveTab] = useState<"all" | "my">("all")
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) {
            const parsed = parseInt(cookieAuid, 10)
            if (!isNaN(parsed)) setCurrentAuid(parsed)
        }
    }, [])

    useEffect(() => {
        setTemplates(initialTemplates)
    }, [initialTemplates])

    const handleOpenCreateModal = () => {
        setEditingTemplateId(null)
        setIsModalOpen(true)
    }

    const handleOpenEditModal = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setEditingTemplateId(id)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingTemplateId(null)
    }

    const isUserOwner = (t: Template) => {
        if (!t.owners || currentAuid <= 0) return false
        return t.owners.some(ownerGroup =>
            Array.isArray(ownerGroup)
                ? ownerGroup.includes(currentAuid)
                : (ownerGroup as any) === currentAuid
        )
    }

    const myTemplates = currentAuid > 0
        ? templates.filter(isUserOwner)
        : []

    const displayedTemplates = (activeTab === "my" ? myTemplates : templates).filter(t => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        return t.name.toLowerCase().includes(query) || t.beverageType.toLowerCase().includes(query)
    })

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="competitions" />

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-7xl flex flex-col gap-8">

                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/20">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                    Темплейти оцінювання
                                </h2>
                            </div>
                            <p className="text-sm text-slate-500 mt-1.5 ml-1">
                                Каталог шаблонів оцінювання для змагань з винами та іншими напоями.
                            </p>
                        </div>
                        <button
                            onClick={handleOpenCreateModal}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-3 text-sm font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer transform active:scale-95 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Створити новий шаблон</span>
                        </button>
                    </div>

                    {/* Controls Row: Tabs & Search */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                        {/* Tabs */}
                        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab("all")}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    activeTab === "all"
                                        ? "bg-white text-indigo-600 shadow-xs"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <span>Усі шаблони</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    activeTab === "all" ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-600"
                                }`}>
                                    {templates.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab("my")}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    activeTab === "my"
                                        ? "bg-white text-indigo-600 shadow-xs"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Мої шаблони</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    activeTab === "my" ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-600"
                                }`}>
                                    {myTemplates.length}
                                </span>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Пошук за назвою або типом напою..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Template Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {displayedTemplates.map((template) => {
                            const edition = template.latestEdition
                            const propertiesCount = edition?.categories.reduce((acc, cat) => acc + cat.properties.length, 0) || 0
                            const isOwned = isUserOwner(template)

                            return (
                                <div
                                    key={template.id}
                                    onClick={() => router.push(`/templates/${template.id}`)}
                                    className="group relative bg-white border border-slate-200/80 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
                                >
                                    <div>
                                        {/* Card Header Badges */}
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <span className="text-[11px] font-extrabold tracking-wider uppercase bg-slate-100 text-slate-700 border border-slate-200/60 rounded-lg px-2.5 py-1">
                                                {template.beverageType || "WINE"}
                                            </span>

                                            <div className="flex items-center gap-1.5">
                                                {isOwned && (
                                                    <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md px-2 py-0.5 flex items-center gap-1">
                                                        <UserCheck className="w-3 h-3" />
                                                        Ваш
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    v{edition?.version || 1}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-lg font-extrabold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                                            {template.name}
                                        </h3>

                                        {/* Created At */}
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 font-medium">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            <span suppressHydrationWarning>Створено: {formatDate(template.createdAt)}</span>
                                        </div>

                                        {/* Structure summary */}
                                        <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50/70 border border-slate-100 rounded-2xl text-xs">
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Категорій</span>
                                                <span className="text-sm font-black text-slate-700">{edition?.categories.length || 0}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Показників</span>
                                                <span className="text-sm font-black text-indigo-600">{propertiesCount}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="flex items-center justify-between gap-3 pt-5 mt-4 border-t border-slate-100">
                                        {isOwned ? (
                                            <button
                                                onClick={(e) => handleOpenEditModal(e, template.id)}
                                                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                                                title="Редагувати темплейт"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                <span>Редагувати</span>
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400 font-medium">
                                                {template.totalEditions ? `${template.totalEditions} версія(-ї)` : "1 версія"}
                                            </span>
                                        )}

                                        <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                                            <span>Деталі темплейту</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {displayedTemplates.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 rounded-[32px] bg-white text-center text-slate-500 gap-3 shadow-sm my-4">
                            <Sparkles className="w-12 h-12 text-slate-300 animate-pulse" />
                            <span className="text-base font-bold text-slate-700">Темплейти не знайдені</span>
                            <p className="text-sm text-slate-400 max-w-sm">
                                {activeTab === "my"
                                    ? "У вас ще немає створених шаблонів оцінювання. Натисніть кнопку вище, щоб створити свій перший шаблон."
                                    : "За вашим запитом не знайдено жодного шаблону оцінювання."}
                            </p>
                        </div>
                    )}

                </div>
            </main>

            {isModalOpen && (
                <TemplateCreatorModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    currentAuid={currentAuid}
                    initialTemplateId={editingTemplateId}
                />
            )}
        </div>
    )
}