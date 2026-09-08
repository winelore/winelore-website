"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertCircle, ChevronRight, ExternalLink, FileText, Loader2, Plus, Search, Settings, X } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { getEvaluationTemplatesAction } from "@/app/myTemplates/actions"
import { setCommissionTemplateAction } from "../../actions"
import { ActionButton, EmptyState, SectionCard } from "@/components/detail"

export interface BeverageType {
    id: string
    code: string
    name: string
}

export interface TemplateEditionLink {
    id: string
    beverageType: BeverageType
    templateEdition: any
}

const ITEMS_PER_PAGE = 50

/**
 * Which evaluation template each beverage type in this commission is scored
 * against, plus the catalog modal for (re)assigning them.
 */
export function EvaluationTemplatesBlock({
    commissionId,
    templateEditions,
    beverageTypesInCommission,
    isCompetitionHolder,
    canEdit,
    onRefresh,
}: {
    commissionId: string
    templateEditions: TemplateEditionLink[]
    beverageTypesInCommission: BeverageType[]
    isCompetitionHolder: boolean
    canEdit: boolean
    onRefresh: () => void
}) {
    const { t, tCount, formatStatus } = useTranslation()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedBeverageType, setSelectedBeverageType] = useState<BeverageType | null>(null)

    const [catalogTemplates, setCatalogTemplates] = useState<any[]>([])
    const [isCatalogLoading, setIsCatalogLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [assigningId, setAssigningId] = useState<string | null>(null)
    const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, selectedBeverageType])

    // Close the catalog on Escape, like every other dialog in the app.
    useEffect(() => {
        if (!isModalOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsModalOpen(false)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [isModalOpen])

    const handleOpenCatalog = async (bevType?: BeverageType) => {
        setSelectedBeverageType(bevType || null)
        setSearchQuery("")
        setCurrentPage(1)
        setIsModalOpen(true)
        setIsCatalogLoading(true)
        try {
            const data = await getEvaluationTemplatesAction()
            const filtered = bevType
                ? data.templates.filter((tpl: any) => tpl.beverageTypeId === bevType.id)
                : data.templates
            setCatalogTemplates(filtered)
        } catch (e) {
            console.error("Failed to load templates catalog", e)
            toast.error(t("common.errorGeneric"))
        } finally {
            setIsCatalogLoading(false)
        }
    }

    const handleAssignTemplate = async (templateEditionId: string, templateBevTypeId: string) => {
        setAssigningId(templateEditionId)
        try {
            const res = await setCommissionTemplateAction(commissionId, templateBevTypeId, templateEditionId)
            if (res.success) {
                setIsModalOpen(false)
                onRefresh()
            } else {
                toast.error(res.error || t("commission.templateAssignError"))
            }
        } catch (e) {
            toast.error(t("commission.templateAssignError"))
        } finally {
            setAssigningId(null)
        }
    }

    const filteredCatalog = catalogTemplates.filter(tpl => tpl.name.toLowerCase().includes(searchQuery.toLowerCase()))
    const totalPages = Math.ceil(filteredCatalog.length / ITEMS_PER_PAGE)
    const paginatedCatalog = filteredCatalog.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    const canAssign = isCompetitionHolder && canEdit

    return (
        <SectionCard
            icon={FileText}
            title={t("commission.evaluationTemplates")}
            subtitle={t("commission.evaluationTemplatesSubtitle")}
            actions={
                canAssign ? (
                    <ActionButton size="sm" icon={Plus} onClick={() => handleOpenCatalog()}>
                        {t("commission.assignTemplate")}
                    </ActionButton>
                ) : null
            }
        >
            {beverageTypesInCommission.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title={t("commission.noTemplatesTitle")}
                    description={canAssign ? t("commission.noTemplatesDescription") : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {beverageTypesInCommission.map((bevType) => {
                        const assignedLink = templateEditions.find(te => te.beverageType?.id === bevType.id)
                        const te = assignedLink?.templateEdition
                        const isAssigned = Boolean(assignedLink)

                        return (
                            <div
                                key={bevType.id}
                                className={`flex flex-col rounded-2xl border p-4 transition-colors ${
                                    isAssigned ? "border-slate-200/70 bg-slate-50/60" : "border-dashed border-rose-200 bg-rose-50/30"
                                }`}
                            >
                                <div className="mb-3 flex items-start justify-between gap-2">
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
                                        {bevType.name || bevType.code}
                                    </span>
                                    {canAssign && (
                                        <button
                                            type="button"
                                            onClick={() => handleOpenCatalog(bevType)}
                                            className="shrink-0 cursor-pointer rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-100"
                                        >
                                            {isAssigned ? t("commission.changeTemplate") : t("commission.assignTemplate")}
                                        </button>
                                    )}
                                </div>

                                {isAssigned && te ? (
                                    <div className="flex flex-col gap-2">
                                        <Link
                                            href={`/myTemplates?templateId=${te.template?.id}-${te.version}`}
                                            target="_blank"
                                            className="group/link flex w-fit items-center gap-1.5 outline-none"
                                            title={t("commission.openTemplateInNewTab")}
                                        >
                                            <span className="text-sm font-semibold text-slate-800 transition-colors group-hover/link:text-indigo-600">
                                                {te.template?.name || t("commission.standardTemplate")}
                                            </span>
                                            <ExternalLink className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover/link:text-indigo-500" />
                                        </Link>

                                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                                            <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 tabular-nums">
                                                v{te.version}
                                            </span>
                                            <span className="text-slate-300">•</span>
                                            <span className="uppercase text-emerald-600">{te.status ? formatStatus(te.status) : ""}</span>
                                            <span className="text-slate-300">•</span>
                                            <span>{tCount("commission.categoriesCount", te.categories?.length || 0)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 py-2 text-rose-500">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span className="text-xs font-semibold">{t("commission.noTemplateForType")}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t("commission.templateCatalog")}
                    onClick={e => {
                        if (e.target === e.currentTarget) setIsModalOpen(false)
                    }}
                >
                    <div className="relative flex max-h-[85vh] w-full max-w-3xl animate-scale-up flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-slate-900">{t("commission.templateCatalog")}</h2>
                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                    {selectedBeverageType
                                        ? t("commission.selectingTemplateFor", { type: selectedBeverageType.name })
                                        : t("commission.selectFromCatalog")}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                title={t("common.close")}
                                aria-label={t("common.close")}
                                className="shrink-0 cursor-pointer rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="border-b border-slate-100 p-4">
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 transition-colors focus-within:border-indigo-400 focus-within:bg-white">
                                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                                <input
                                    type="text"
                                    autoFocus
                                    aria-label={t("commission.searchTemplates")}
                                    placeholder={t("commission.searchTemplates")}
                                    className="w-full border-none bg-transparent text-sm text-slate-700 outline-none"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50/40 p-4 sm:p-5">
                            {isCatalogLoading ? (
                                <div className="flex h-40 flex-col items-center justify-center gap-3 text-indigo-500">
                                    <Loader2 className="h-7 w-7 animate-spin" />
                                    <span className="text-sm font-semibold">{t("commission.loadingCatalog")}</span>
                                </div>
                            ) : paginatedCatalog.length === 0 ? (
                                <EmptyState icon={FileText} title={t("commission.noTemplatesFound")} />
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {paginatedCatalog.map(template => {
                                        const ed = template.latestEdition
                                        const isExpanded = expandedTemplateId === template.id

                                        return (
                                            <div
                                                key={template.id}
                                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-indigo-300"
                                            >
                                                <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                                                    <div className="min-w-0">
                                                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">
                                                            {template.beverageType}
                                                        </span>
                                                        <h4 className="mt-1.5 text-sm font-semibold text-slate-900">{template.name}</h4>
                                                        <div className="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-500">
                                                            <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 tabular-nums">
                                                                v{ed.version}
                                                            </span>
                                                            <span className="text-slate-300">•</span>
                                                            <span>{tCount("commission.categoriesCount", ed.categories?.length || 0)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <ActionButton
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setExpandedTemplateId(isExpanded ? null : template.id)}
                                                            aria-expanded={isExpanded}
                                                        >
                                                            {t("common.preview")}
                                                            <ChevronRight
                                                                className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                                            />
                                                        </ActionButton>
                                                        <ActionButton
                                                            size="sm"
                                                            loading={assigningId === ed.id}
                                                            disabled={assigningId !== null}
                                                            onClick={() => handleAssignTemplate(ed.id, template.beverageTypeId)}
                                                        >
                                                            {t("commission.applyTemplate")}
                                                        </ActionButton>
                                                    </div>
                                                </div>

                                                {isExpanded && ed.categories && (
                                                    <div className="max-h-[350px] overflow-y-auto border-t border-slate-100 bg-slate-50/30 px-5 pb-5 pt-4">
                                                        <h5 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                                            <Settings className="h-3.5 w-3.5 text-indigo-500" />
                                                            {t("commission.templatePreview")}
                                                        </h5>

                                                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                                            {ed.categories.map((cat: any) => (
                                                                <div
                                                                    key={cat.id}
                                                                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4"
                                                                >
                                                                    <h6 className="border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
                                                                        {cat.name}
                                                                    </h6>
                                                                    <div className="flex flex-col gap-2">
                                                                        {cat.properties?.map((prop: any) => (
                                                                            <div
                                                                                key={prop.id || prop.code}
                                                                                className="flex flex-col rounded-xl border border-slate-100 bg-slate-50/40 px-3 py-2 text-xs"
                                                                            >
                                                                                <div className="flex items-start justify-between gap-2">
                                                                                    <span className="flex min-w-0 flex-1 flex-col">
                                                                                        <span className="flex items-center gap-1.5 truncate font-semibold text-slate-700">
                                                                                            {prop.name}
                                                                                            {prop.isRequired && (
                                                                                                <span className="font-bold text-rose-500" title={t("common.required")}>
                                                                                                    *
                                                                                                </span>
                                                                                            )}
                                                                                            {prop.isResult && (
                                                                                                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-indigo-600">
                                                                                                    {t("commission.resultBadge")}
                                                                                                </span>
                                                                                            )}
                                                                                        </span>
                                                                                        {prop.description && (
                                                                                            <span className="mt-0.5 truncate text-[10px] text-slate-400">
                                                                                                {prop.description}
                                                                                            </span>
                                                                                        )}
                                                                                    </span>
                                                                                    <span className="shrink-0 rounded-md border border-slate-200/60 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                                                                                        {prop.__typename ? prop.__typename.replace("Property", "") : prop.type}
                                                                                    </span>
                                                                                </div>

                                                                                <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-medium text-slate-500">
                                                                                    {(prop.minLimit !== undefined || prop.maxLimit !== undefined) && (
                                                                                        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">
                                                                                            {t("commission.previewRange", {
                                                                                                min: prop.minLimit ?? "-∞",
                                                                                                max: prop.maxLimit ?? "∞",
                                                                                            })}
                                                                                        </span>
                                                                                    )}
                                                                                    {prop.allowedValues && prop.allowedValues.length > 0 && (
                                                                                        <span
                                                                                            className="max-w-[150px] truncate rounded border border-slate-200 bg-white px-1.5 py-0.5"
                                                                                            title={prop.allowedValues.join(", ")}
                                                                                        >
                                                                                            {t("commission.previewOptions", { values: prop.allowedValues.join(", ") })}
                                                                                        </span>
                                                                                    )}
                                                                                    {prop.defaultValue !== undefined && prop.defaultValue !== null && (
                                                                                        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">
                                                                                            {t("commission.previewDefault", { value: String(prop.defaultValue) })}
                                                                                        </span>
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
                                </div>
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    {t("common.pageOf", { current: currentPage, total: totalPages })}
                                    <span className="mx-1 text-slate-300">|</span>
                                    {t("common.itemsTotal", { count: filteredCatalog.length })}
                                </span>
                                <div className="flex items-center gap-2">
                                    <ActionButton
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        {t("common.previous")}
                                    </ActionButton>
                                    <ActionButton
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        {t("common.next")}
                                    </ActionButton>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </SectionCard>
    )
}
