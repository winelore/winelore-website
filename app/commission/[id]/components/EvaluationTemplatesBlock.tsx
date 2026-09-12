"use client"

import React, { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
    FileText, Plus, X, Search, ChevronDown, Loader2, AlertTriangle, CheckCircle, ExternalLink, Lock, Check, Settings, Trash2, User,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
import { removeCommissionTemplateAction, setCommissionTemplateAction } from "../../actions"
import { getEvaluationTemplatesAction } from "@/app/myTemplates/actions"
import { getPropertyTypeLabel } from "@/app/myTemplates/TemplateCreatorModal"

export interface BeverageType {
    id: string;
    code: string;
    name: string;
}

export interface TemplateEditionLink {
    id: string;
    beverageType: BeverageType;
    templateEdition: any;
}

type CatalogTemplate = Awaited<ReturnType<typeof getEvaluationTemplatesAction>>["templates"][number]

interface PropertyView {
    key: string;
    name: string;
    description?: string;
    type: string;
    isRequired: boolean;
    isResult: boolean;
    minLimit?: number;
    maxLimit?: number;
    allowedValues?: (string | number)[];
    defaultValue?: unknown;
}

interface CategoryView {
    id: string;
    name: string;
    properties: PropertyView[];
}

const ITEMS_PER_PAGE = 50

// Commission template editions come straight from GraphQL (aliased per-type fields, __typename),
// while catalog editions are already flattened by getEvaluationTemplatesAction — accept both.
function normalizeCategories(categories: any[] | null | undefined): CategoryView[] {
    return (categories || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        properties: (cat.properties || []).map((prop: any) => {
            const rawType = prop.type ?? (prop.__typename ? prop.__typename.replace("Property", "") : "")
            return {
                key: prop.id || prop.code,
                name: prop.name,
                description: prop.description || undefined,
                type: rawType === "DiscreteNumbers" ? "Discrete" : rawType,
                isRequired: !!prop.isRequired,
                isResult: !!prop.isResult,
                minLimit: prop.minLimit ?? prop.intMinLimit ?? prop.doubleMinLimit ?? undefined,
                maxLimit: prop.maxLimit ?? prop.intMaxLimit ?? prop.doubleMaxLimit ?? undefined,
                allowedValues: prop.allowedValues ?? prop.discreteAllowedValues ?? prop.enumAllowedValues ?? undefined,
                defaultValue: prop.defaultValue ?? prop.intDefaultValue ?? prop.doubleDefaultValue ?? prop.discreteDefaultValue ?? prop.enumDefaultValue ?? prop.boolDefaultValue ?? undefined,
            }
        }),
    }))
}

function countProperties(categories: CategoryView[]): number {
    return categories.reduce((sum, cat) => sum + cat.properties.length, 0)
}

function TemplateStructure({ categories }: { categories: CategoryView[] }) {
    const { t, tCount } = useTranslation()

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((cat) => (
                <div key={cat.id} className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-xs flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <h5 className="text-xs font-bold text-slate-800 truncate">{cat.name}</h5>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                            {tCount("commission.propertiesCount", cat.properties.length)}
                        </span>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                        {cat.properties.map((prop) => {
                            const constraints: string[] = []
                            if (prop.minLimit !== undefined || prop.maxLimit !== undefined) {
                                constraints.push(t("commission.propertyRange", { min: prop.minLimit ?? "−∞", max: prop.maxLimit ?? "∞" }))
                            }
                            if (prop.allowedValues && prop.allowedValues.length > 0) {
                                constraints.push(t("commission.propertyOptions", { values: prop.allowedValues.join(", ") }))
                            }
                            if (prop.defaultValue !== undefined && prop.defaultValue !== null) {
                                const value = typeof prop.defaultValue === "boolean"
                                    ? t(prop.defaultValue ? "common.yes" : "common.no")
                                    : String(prop.defaultValue)
                                constraints.push(t("commission.propertyDefault", { value }))
                            }

                            return (
                                <li key={prop.key} className="flex flex-col rounded-xl bg-slate-50/60 border border-slate-100/80 px-2.5 py-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1 min-w-0 text-[11px] font-bold text-slate-700">
                                            <span className="truncate" title={prop.description || prop.name}>{prop.name}</span>
                                            {prop.isRequired && <span className="text-rose-500" title={t("common.required")}>*</span>}
                                            {prop.isResult && (
                                                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] rounded uppercase font-bold tracking-wider shrink-0">
                                                    {t("commission.resultBadge")}
                                                </span>
                                            )}
                                        </span>
                                        <span className="bg-white text-slate-500 rounded-md px-1.5 py-0.5 text-[9px] font-semibold border border-slate-200/60 shrink-0">
                                            {getPropertyTypeLabel(prop.type, t)}
                                        </span>
                                    </div>
                                    {constraints.length > 0 && (
                                        <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5" title={constraints.join(" · ")}>
                                            {constraints.join(" · ")}
                                        </span>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ))}
        </div>
    )
}

function editionStatusClass(status?: string): string {
    if (status === "ACTIVE") return "text-emerald-600"
    if (status === "DRAFT") return "text-amber-600"
    return "text-slate-500"
}

export function EvaluationTemplatesBlock({
    commissionId,
    templateEditions,
    beverageTypesInCommission,
    isCompetitionHolder,
    canEdit,
    onRefresh,
}: {
    commissionId: string,
    templateEditions: TemplateEditionLink[],
    beverageTypesInCommission: BeverageType[],
    isCompetitionHolder: boolean,
    canEdit: boolean,
    onRefresh: () => void | Promise<void>,
}) {
    const { t, tCount, formatStatus } = useTranslation()
    const canManage = isCompetitionHolder && canEdit

    const [expandedTypeIds, setExpandedTypeIds] = useState<Set<string>>(new Set())

    const [isCatalogOpen, setIsCatalogOpen] = useState(false)
    const [targetType, setTargetType] = useState<BeverageType | null>(null)
    const [catalog, setCatalog] = useState<CatalogTemplate[] | null>(null)
    const [catalogStatus, setCatalogStatus] = useState<"idle" | "loading" | "error" | "ready">("idle")
    const [searchQuery, setSearchQuery] = useState("")
    const [typeFilter, setTypeFilter] = useState<string>("all")
    const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)
    const [assigningEditionId, setAssigningEditionId] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const [typePendingRemoval, setTypePendingRemoval] = useState<BeverageType | null>(null)
    const [removingTypeId, setRemovingTypeId] = useState<string | null>(null)

    // Owners are AUIDs (each an int array); the first element identifies the user.
    const ownerAuids = useMemo(() => {
        const ids: number[] = []
        const collect = (owners?: number[][] | null) => owners?.forEach((owner) => owner?.[0] != null && ids.push(owner[0]))
        templateEditions.forEach((link) => collect(link.templateEdition?.template?.owners))
        catalog?.forEach((tpl) => collect(tpl.owners))
        return ids
    }, [templateEditions, catalog])
    const { usernames } = useUsernames(ownerAuids)
    const formatOwners = (owners?: number[][] | null) =>
        (owners || []).filter((owner) => owner?.[0] != null).map((owner) => usernames[owner[0]] || String(owner[0])).join(", ")

    const assignedByType = useMemo(() => {
        const map = new Map<string, TemplateEditionLink>()
        templateEditions.forEach((link) => {
            if (link.beverageType?.id) map.set(link.beverageType.id, link)
        })
        return map
    }, [templateEditions])

    const sortedTypes = useMemo(
        () => [...beverageTypesInCommission].sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code)),
        [beverageTypesInCommission]
    )
    const assignedCount = sortedTypes.filter((type) => assignedByType.get(type.id)?.templateEdition).length
    const isFullyConfigured = sortedTypes.length > 0 && assignedCount === sortedTypes.length

    const toggleExpanded = (typeId: string) => {
        setExpandedTypeIds((prev) => {
            const next = new Set(prev)
            if (next.has(typeId)) next.delete(typeId)
            else next.add(typeId)
            return next
        })
    }

    const loadCatalog = async () => {
        setCatalogStatus("loading")
        try {
            const data = await getEvaluationTemplatesAction()
            setCatalog(data.templates)
            setCatalogStatus("ready")
        } catch (e) {
            console.error("Failed to load templates catalog", e)
            setCatalogStatus("error")
        }
    }

    const openCatalog = (bevType?: BeverageType) => {
        setTargetType(bevType || null)
        setTypeFilter(bevType?.id ?? "all")
        setSearchQuery("")
        setCurrentPage(1)
        setPreviewTemplateId(null)
        setIsCatalogOpen(true)
        if (catalogStatus !== "ready" && catalogStatus !== "loading") loadCatalog()
    }

    const handleAssignTemplate = async (templateEditionId: string, templateBevTypeId: string) => {
        setAssigningEditionId(templateEditionId)
        try {
            const res = await setCommissionTemplateAction(commissionId, templateBevTypeId, templateEditionId)
            if (!res.success) {
                console.error("Failed to assign template:", res.error)
                toast.error(t("commission.templateAssignError"))
                return
            }
            try {
                await onRefresh()
            } catch (e) {
                console.error("Failed to refresh commission after assigning template", e)
            }
            toast.success(t("commission.templateAssigned"))
            setIsCatalogOpen(false)
        } catch (e) {
            console.error("Failed to assign template:", e)
            toast.error(t("commission.templateAssignError"))
        } finally {
            setAssigningEditionId(null)
        }
    }

    const handleRemoveTemplate = async (bevType: BeverageType) => {
        setTypePendingRemoval(null)
        setRemovingTypeId(bevType.id)
        try {
            const res = await removeCommissionTemplateAction(commissionId, bevType.id)
            if (!res.success) {
                console.error("Failed to remove template:", res.error)
                toast.error(t("commission.templateRemoveError"))
                return
            }
            try {
                await onRefresh()
            } catch (e) {
                console.error("Failed to refresh commission after removing template", e)
            }
            toast.success(t("commission.templateRemoved"))
        } catch (e) {
            console.error("Failed to remove template:", e)
            toast.error(t("commission.templateRemoveError"))
        } finally {
            setRemovingTypeId(null)
        }
    }

    const commissionTypeIds = useMemo(() => new Set(sortedTypes.map((type) => type.id)), [sortedTypes])

    // Filter chips: types present in this commission first, then the rest of the catalog.
    const catalogTypes = useMemo(() => {
        const map = new Map<string, string>()
        catalog?.forEach((tpl) => {
            if (tpl.beverageTypeId) map.set(tpl.beverageTypeId, tpl.beverageType)
        })
        return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => {
            const aIn = commissionTypeIds.has(a.id), bIn = commissionTypeIds.has(b.id)
            if (aIn !== bIn) return aIn ? -1 : 1
            return a.name.localeCompare(b.name)
        })
    }, [catalog, commissionTypeIds])

    const filteredCatalog = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        return (catalog || [])
            .filter((tpl) => tpl.latestEdition)
            .filter((tpl) => typeFilter === "all" || tpl.beverageTypeId === typeFilter)
            .filter((tpl) => !query
                || tpl.name.toLowerCase().includes(query)
                || tpl.beverageType.toLowerCase().includes(query)
                || tpl.owners.some((owner) => (usernames[owner?.[0]] || String(owner?.[0] ?? "")).toLowerCase().includes(query)))
            .sort((a, b) => {
                const aIn = commissionTypeIds.has(a.beverageTypeId), bIn = commissionTypeIds.has(b.beverageTypeId)
                if (aIn !== bIn) return aIn ? -1 : 1
                return a.name.localeCompare(b.name)
            })
    }, [catalog, typeFilter, searchQuery, commissionTypeIds, usernames])

    const totalPages = Math.ceil(filteredCatalog.length / ITEMS_PER_PAGE)
    const paginatedCatalog = filteredCatalog.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    return (
        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50 shadow-xs">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold tracking-tight text-slate-800">
                                {t("commission.evaluationTemplates")}
                            </h3>
                            {sortedTypes.length > 0 && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    isFullyConfigured
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        : "bg-amber-50 text-amber-700 border-amber-100"
                                }`}>
                                    {isFullyConfigured ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                    {t("commission.templatesCoverage", { assigned: assignedCount, total: sortedTypes.length })}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                            {t("commission.evaluationTemplatesSubtitle")}
                        </p>
                    </div>
                </div>

                {canManage && sortedTypes.length > 0 && (
                    <button
                        type="button"
                        onClick={() => openCatalog()}
                        aria-label={t("commission.assignTemplate")}
                        title={t("commission.assignTemplate")}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">{t("commission.assignTemplate")}</span>
                    </button>
                )}
            </div>

            {isCompetitionHolder && !canEdit && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-medium text-slate-500">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>{t("commission.templatesLocked")}</span>
                </div>
            )}

            {sortedTypes.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 px-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl gap-2">
                    <FileText className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">{t("commission.noBeverageTypesTitle")}</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                        {canManage ? t("commission.noBeverageTypesDesc") : t("commission.noBeverageTypesDescReadOnly")}
                    </p>
                    {canManage && (
                        <button
                            type="button"
                            onClick={() => openCatalog()}
                            className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            {t("commission.assignTemplate")}
                        </button>
                    )}
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {sortedTypes.map((bevType) => {
                        const te = assignedByType.get(bevType.id)?.templateEdition
                        const typeLabel = bevType.name || bevType.code

                        if (!te) {
                            return (
                                <li key={bevType.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-4">
                                    <span className="self-start sm:self-center sm:min-w-[96px] text-center text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white border border-amber-100 text-slate-600 uppercase tracking-wider shrink-0">
                                        {typeLabel}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 flex-1">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        {t("commission.noTemplateForType")}
                                    </span>
                                    {canManage && (
                                        <button
                                            type="button"
                                            onClick={() => openCatalog(bevType)}
                                            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {t("commission.assignTemplate")}
                                        </button>
                                    )}
                                </li>
                            )
                        }

                        const categories = normalizeCategories(te.categories)
                        const isExpanded = expandedTypeIds.has(bevType.id)
                        const templateName = te.template?.name || t("commission.standardTemplate")
                        const owners = formatOwners(te.template?.owners)
                        const isRemoving = removingTypeId === bevType.id

                        return (
                            <li key={bevType.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                                    <span className="self-start sm:self-center sm:min-w-[96px] text-center text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 uppercase tracking-wider shrink-0">
                                        {typeLabel}
                                    </span>

                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                        {te.template?.id ? (
                                            <Link
                                                href={`/templates/${te.template.id}?version=${te.version}`}
                                                target="_blank"
                                                className="group/link flex items-center gap-1.5 w-fit max-w-full"
                                                title={t("commission.openTemplateInNewTab")}
                                            >
                                                <span className="text-sm font-extrabold text-slate-800 group-hover/link:text-indigo-600 transition-colors truncate">
                                                    {templateName}
                                                </span>
                                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-indigo-500 transition-colors shrink-0" />
                                            </Link>
                                        ) : (
                                            <span className="text-sm font-extrabold text-slate-800 truncate">{templateName}</span>
                                        )}
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-500">
                                            <span className="bg-white border border-slate-200 shadow-xs px-1.5 py-0.5 rounded-md">v{te.version}</span>
                                            {te.status && (
                                                <>
                                                    <span className="text-slate-300">•</span>
                                                    <span className={`uppercase ${editionStatusClass(te.status)}`}>{formatStatus(te.status)}</span>
                                                </>
                                            )}
                                            <span className="text-slate-300">•</span>
                                            <span>{tCount("commission.categoriesCount", categories.length)}</span>
                                            <span className="text-slate-300">•</span>
                                            <span>{tCount("commission.propertiesCount", countProperties(categories))}</span>
                                        </div>
                                        {owners && (
                                            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400 min-w-0" title={t("commission.templateOwners")}>
                                                <User className="w-3 h-3 shrink-0" />
                                                <span className="truncate">{owners}</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {categories.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => toggleExpanded(bevType.id)}
                                                aria-expanded={isExpanded}
                                                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                            >
                                                {t("commission.showStructure")}
                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                            </button>
                                        )}
                                        {canManage && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => openCatalog(bevType)}
                                                    disabled={isRemoving}
                                                    className="px-3 py-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                                >
                                                    {t("commission.changeTemplate")}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTypePendingRemoval(bevType)}
                                                    disabled={isRemoving}
                                                    aria-label={t("commission.removeTemplate")}
                                                    title={t("commission.removeTemplate")}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                                >
                                                    {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-white/60 p-4 max-h-[420px] overflow-y-auto">
                                        <TemplateStructure categories={categories} />
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}

            <Dialog
                open={isCatalogOpen}
                onOpenChange={(open) => {
                    if (!open && assigningEditionId) return
                    setIsCatalogOpen(open)
                }}
            >
                <DialogContent
                    showCloseButton={false}
                    onOpenAutoFocus={(e) => {
                        e.preventDefault()
                        searchInputRef.current?.focus()
                    }}
                    className="flex flex-col gap-0 p-0 sm:max-w-3xl h-[85vh] max-h-[760px] overflow-hidden rounded-[32px] bg-white border-slate-100 shadow-2xl"
                >
                    <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
                        <div className="min-w-0">
                            <DialogTitle className="text-lg font-extrabold text-slate-800">{t("commission.templateCatalog")}</DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 mt-1">
                                {targetType
                                    ? t("commission.selectingTemplateFor", { type: targetType.name || targetType.code })
                                    : t("commission.selectFromCatalog")}
                            </DialogDescription>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCatalogOpen(false)}
                            disabled={!!assigningEditionId}
                            aria-label={t("common.close")}
                            className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:bg-white transition-colors">
                            <Search className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={t("commission.searchTemplates")}
                                className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setCurrentPage(1)
                                }}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery("")
                                        setCurrentPage(1)
                                        searchInputRef.current?.focus()
                                    }}
                                    aria-label={t("common.close")}
                                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {!targetType && catalogTypes.length > 1 && (
                            <div className="flex flex-wrap gap-1.5">
                                {[{ id: "all", name: t("commission.allBeverageTypes") }, ...catalogTypes].map((type) => {
                                    const isActive = typeFilter === type.id
                                    const needsTemplate = commissionTypeIds.has(type.id) && !assignedByType.get(type.id)?.templateEdition
                                    return (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => {
                                                setTypeFilter(type.id)
                                                setCurrentPage(1)
                                            }}
                                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                                                isActive
                                                    ? "bg-indigo-600 text-white border-indigo-600"
                                                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                                            }`}
                                        >
                                            {type.name}
                                            {needsTemplate && <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-amber-300" : "bg-amber-500"}`} />}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/30">
                        {catalogStatus === "loading" || catalogStatus === "idle" ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-3 text-indigo-500">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <span className="text-sm font-bold">{t("commission.loadingCatalog")}</span>
                            </div>
                        ) : catalogStatus === "error" ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500">
                                <AlertTriangle className="w-8 h-8 text-rose-400" />
                                <span className="text-sm font-bold">{t("commission.catalogLoadError")}</span>
                                <button
                                    type="button"
                                    onClick={loadCatalog}
                                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors cursor-pointer"
                                >
                                    {t("errors.retry")}
                                </button>
                            </div>
                        ) : paginatedCatalog.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
                                <FileText className="w-10 h-10 opacity-50" />
                                <span className="text-sm font-bold">{t("commission.noTemplatesFound")}</span>
                                <Link
                                    href="/myTemplates"
                                    target="_blank"
                                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {t("myTemplates.createNew")}
                                    <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {paginatedCatalog.map((template) => {
                                    const ed = template.latestEdition
                                    const categories = normalizeCategories(ed.categories)
                                    const isPreviewOpen = previewTemplateId === template.id
                                    const assigned = assignedByType.get(template.beverageTypeId)?.templateEdition
                                    const isCurrent = assigned?.id === ed.id
                                    const isSameTemplate = !!assigned && assigned.template?.id === template.id
                                    const replacesName = assigned && !isSameTemplate ? (assigned.template?.name || t("commission.standardTemplate")) : null
                                    const isAssigningThis = assigningEditionId === ed.id
                                    const owners = formatOwners(template.owners)

                                    return (
                                        <li
                                            key={template.id}
                                            className={`border rounded-2xl bg-white shadow-sm transition-colors overflow-hidden ${
                                                isCurrent ? "border-emerald-200" : "border-slate-200 hover:border-indigo-300"
                                            }`}
                                        >
                                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <span className="inline-block mb-1.5 text-[9px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-widest border border-slate-200">
                                                        {template.beverageType}
                                                    </span>
                                                    <h4 className="text-sm font-bold text-slate-800 truncate">{template.name}</h4>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] font-semibold text-slate-500">
                                                        <span className="bg-slate-50 border px-1.5 py-0.5 rounded-md">v{ed.version}</span>
                                                        <span>•</span>
                                                        <span>{tCount("commission.categoriesCount", categories.length)}</span>
                                                        <span>•</span>
                                                        <span>{tCount("commission.propertiesCount", countProperties(categories))}</span>
                                                    </div>
                                                    {owners && (
                                                        <p className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-slate-400 min-w-0" title={t("commission.templateOwners")}>
                                                            <User className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">{owners}</span>
                                                        </p>
                                                    )}
                                                    {replacesName && (
                                                        <p className="mt-1.5 text-[10px] font-semibold text-amber-600 truncate">
                                                            {t("commission.replacesTemplate", { name: replacesName })}
                                                        </p>
                                                    )}
                                                    {isSameTemplate && !isCurrent && (
                                                        <p className="mt-1.5 text-[10px] font-semibold text-slate-500">
                                                            {t("commission.usingVersion", { version: assigned.version })}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {categories.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewTemplateId(isPreviewOpen ? null : template.id)}
                                                            aria-expanded={isPreviewOpen}
                                                            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                                                        >
                                                            {t("common.preview")}
                                                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isPreviewOpen ? "rotate-180" : ""}`} />
                                                        </button>
                                                    )}
                                                    {isCurrent ? (
                                                        <span className="flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                            <Check className="w-3.5 h-3.5" />
                                                            {t("commission.currentTemplate")}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAssignTemplate(ed.id, template.beverageTypeId)}
                                                            disabled={!!assigningEditionId}
                                                            className="min-w-[72px] flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                        >
                                                            {isAssigningThis ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : isSameTemplate ? (
                                                                t("commission.updateToVersion", { version: ed.version })
                                                            ) : (
                                                                t("commission.applyTemplate")
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {isPreviewOpen && (
                                                <div className="px-4 sm:px-6 pb-5 pt-4 border-t border-slate-100 bg-slate-50/40 max-h-[350px] overflow-y-auto">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                        <Settings className="w-4 h-4 text-indigo-500" />
                                                        {t("commission.templatePreview")}
                                                    </h4>
                                                    <TemplateStructure categories={categories} />
                                                </div>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>

                    {catalogStatus === "ready" && totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                {t("common.pageOf", { current: currentPage, total: totalPages })} <span className="text-slate-300 mx-1">|</span> {t("common.itemsTotal", { count: filteredCatalog.length })}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                >
                                    {t("common.previous")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                >
                                    {t("common.next")}
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={typePendingRemoval !== null} onOpenChange={(open) => !open && setTypePendingRemoval(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t("commission.removeTemplateTitle", { type: typePendingRemoval?.name || typePendingRemoval?.code || "" })}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("commission.removeTemplateDesc", {
                                name: (typePendingRemoval && assignedByType.get(typePendingRemoval.id)?.templateEdition?.template?.name) || t("commission.standardTemplate"),
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => typePendingRemoval && handleRemoveTemplate(typePendingRemoval)}
                            className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
                        >
                            {t("commission.removeTemplate")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
