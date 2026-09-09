"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/i18n/context"
import { Plus, Calendar, Settings, Layers, CheckCircle2, Pencil, ChevronDown, ChevronUp } from "lucide-react"
import Cookies from "js-cookie"
import Link from "next/link"
import TemplateCreatorModal, { getPropertyTypeLabel } from "./TemplateCreatorModal"
import { useSearchParams } from "next/navigation"
import { ListPageShell, ListPageHeader, StateCard } from "@/components/list"

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
    latestEdition?: TemplateEdition
}

export default function MyTemplatesClientView({ initialTemplates, totalCount, hasError = false }: { initialTemplates: Template[], totalCount?: number, hasError?: boolean }) {
    const [templates, setTemplates] = useState<Template[]>(initialTemplates)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null) // WIN-65: зберігаємо ID шаблону, який редагуємо
    const { t, tCount } = useTranslation()
    const searchParams = useSearchParams()
    const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
    const [currentAuid, setCurrentAuid] = useState<number>(0)

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) {
            const parsed = parseInt(cookieAuid, 10)
            if (!isNaN(parsed)) setCurrentAuid(parsed)
        }
    }, [])

    useEffect(() => {
        const templateIdParam = searchParams.get("templateId")
        if (templateIdParam) {
            setExpandedTemplateId(templateIdParam)
        } else {
            setExpandedTemplateId(null)
        }
    }, [searchParams])

    // Refresh template list when initialTemplates prop changes
    useEffect(() => {
        setTemplates(initialTemplates)
    }, [initialTemplates])

    const toggleExpandTemplate = (id: string) => {
        setExpandedTemplateId(prev => prev === id ? null : id)
    }

    const handleOpenCreateModal = () => {
        setEditingTemplateId(null)
        setIsModalOpen(true)
    }

    const handleOpenEditModal = (e: React.MouseEvent, id: string) => {
        e.stopPropagation() // Щоб не тригерилося розгортання рядка
        setEditingTemplateId(id)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingTemplateId(null)
    }

    // Ownership filtering already happened server-side (getEvaluationTemplatesAction),
    // so `templates` only ever contains the current user's own templates.
    const myTemplates = templates

    return (
        <ListPageShell activeTab="none">
            <ListPageHeader
                titleIcon={<Layers className="w-8 h-8 text-indigo-600" />}
                title={t("myTemplates.title")}
                subtitle={t("myTemplates.subtitle")}
                countLabel={tCount("common.templatesCount", totalCount ?? myTemplates.length)}
                actions={
                    <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-3 text-sm font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer transform active:scale-95 shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t("myTemplates.createNew")}</span>
                    </button>
                }
            />

            {/* Template list */}
            <div className="flex flex-col gap-4">
                {hasError && (
                    <StateCard variant="error" title={t("myTemplates.errorTitle")} description={t("myTemplates.errorDescription")} />
                )}

                {!hasError && myTemplates.map((template, idx) => {
                    const edition = template.latestEdition
                    const uniqueKey = `${template.id}-${edition?.version || 0}`
                    const isExpanded = expandedTemplateId === uniqueKey
                    const propertiesCount = edition?.categories.reduce((acc, cat) => acc + cat.properties.length, 0) || 0

                    return (
                        <div
                            key={uniqueKey}
                            className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-xl shadow-slate-200/45 transition-all hover:shadow-2xl hover:shadow-slate-350/50"
                        >
                            {/* Main Row */}
                            <div
                                onClick={() => toggleExpandTemplate(uniqueKey)}
                                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0 mt-1">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Link
                                                href={`/myTemplates/${template.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-lg font-bold text-slate-800 tracking-tight hover:text-indigo-600 transition-colors truncate"
                                            >
                                                {template.name}
                                            </Link>
                                        </div>

                                        <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-slate-500 flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {t("myTemplates.createdAt")}: {new Date(template.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="text-slate-300">|</span>
                                            <span>{t("myTemplates.type")}: <span className="text-slate-700 uppercase font-bold">{template.beverageType}</span></span>
                                            <span className="text-slate-300">|</span>
                                            <span>{t("myTemplates.categories")}: <span className="text-indigo-600 font-bold">{edition?.categories.length || 0}</span></span>
                                            <span className="text-slate-300">|</span>
                                            <span>{t("myTemplates.totalScores")}: <span className="text-indigo-600 font-bold">{propertiesCount}</span></span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 self-end md:self-auto shrink-0">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t("myTemplates.versionStatus")}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-xs font-extrabold text-slate-700 bg-slate-100 border border-slate-200/50 rounded-md px-1.5 py-0.5">
                                                v{edition?.version || 1}
                                            </span>
                                            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {t("myTemplates.active")}
                                            </span>
                                        </div>
                                    </div>

                                    {/* WIN-65: Кнопка швидкого редагування шаблону */}
                                    <button
                                        onClick={(e) => handleOpenEditModal(e, template.id)}
                                        className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-150 text-slate-500 hover:text-indigo-600 rounded-xl transition-all cursor-pointer group shadow-xs"
                                        title={t("myTemplates.editTemplate")}
                                    >
                                        <Pencil className="w-4 h-4 transition-transform group-hover:scale-105" />
                                    </button>

                                    <div className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Structure */}
                            {isExpanded && edition && (
                                <div className="px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/15">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                        <Settings className="w-4 h-4 text-indigo-500" />
                                        {t("myTemplates.evaluationStructure")}
                                    </h4>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {edition.categories.map((cat) => (
                                            <div
                                                key={cat.id}
                                                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-3.5"
                                            >
                                                <h5 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                                                    {cat.name}
                                                </h5>
                                                <div className="flex flex-col gap-2">
                                                    {cat.properties.map((prop) => (
                                                        <div
                                                            key={prop.id}
                                                            className="flex justify-between items-center bg-slate-50/30 hover:bg-slate-50/70 border border-slate-100/80 rounded-xl px-3 py-2 text-xs transition-colors"
                                                        >
                                                            <div className="flex flex-col min-w-0 flex-1 pr-3">
                                                                <span className="font-bold text-slate-700 truncate">{prop.name}</span>
                                                                {prop.description && (
                                                                    <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{prop.description}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <span className="bg-slate-100 text-slate-600 rounded-md px-2 py-0.5 text-[10px] font-semibold border border-slate-200/60">
                                                                    {getPropertyTypeLabel(prop.type, t)}
                                                                </span>
                                                                {prop.isRequired && (
                                                                    <span className="text-rose-500 font-bold" title={t("common.required")}>*</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}

                {!hasError && myTemplates.length === 0 && (
                    <StateCard variant="empty" icon={Layers} title={t("myTemplates.notFound")} description={t("myTemplates.createFirst")} />
                )}
            </div>

            {isModalOpen && (
                <TemplateCreatorModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    currentAuid={currentAuid}
                    initialTemplateId={editingTemplateId} // WIN-65: Передаємо ID для редагування (або null для створення)
                />
            )}
        </ListPageShell>
    )
}
