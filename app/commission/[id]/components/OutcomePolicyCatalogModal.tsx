"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
    Search,
    X,
    Loader2,
    Sliders,
    ChevronRight,
    Copy,
    Check,
    CheckCircle2,
    Layers,
    FileCode,
    Sparkles,
    Tag,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n/context"
import {
    getOutcomePolicyCatalogAction,
    setCommissionOutcomePolicyAction,
    type OutcomePolicyEditionDetail,
} from "../../actions"

interface TemplateEditionLink {
    id: string
    beverageType: {
        id: string
        code: string
        name: string
    }
    templateEdition: any
}

interface OutcomePolicyCatalogModalProps {
    isOpen: boolean
    onClose: () => void
    commissionId: string
    currentOutcomePolicyEditionId?: string | null
    templateEditions: TemplateEditionLink[]
    targetTemplateEditionId?: string | null
    onSuccess: () => void
}

export function OutcomePolicyCatalogModal({
    isOpen,
    onClose,
    commissionId,
    currentOutcomePolicyEditionId,
    templateEditions,
    targetTemplateEditionId,
    onSuccess,
}: OutcomePolicyCatalogModalProps) {
    const { t, formatStatus } = useTranslation()

    const [catalog, setCatalog] = useState<OutcomePolicyEditionDetail[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterTemplateMode, setFilterTemplateMode] = useState<"all" | "commission">("commission")
    const [selectedScope, setSelectedScope] = useState<"ALL" | "REPLICA" | "COMMISSION">("ALL")
    const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null)
    const [isAssigningId, setIsAssigningId] = useState<string | null>(null)
    const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)

    const ITEMS_PER_PAGE = 20

    // Extract all assigned template edition IDs in this commission
    const commissionTemplateEditionIds = useMemo(() => {
        return new Set(
            templateEditions
                .map((te) => te.templateEdition?.id)
                .filter(Boolean) as string[],
        )
    }, [templateEditions])

    // Load catalog when opened
    useEffect(() => {
        if (!isOpen) return

        setIsLoading(true)
        setSearchQuery("")
        setCurrentPage(1)
        setExpandedPolicyId(targetTemplateEditionId || null)

        getOutcomePolicyCatalogAction()
            .then((res) => {
                if (res.success) {
                    setCatalog(res.editions)
                } else {
                    toast.error(res.error || t("commission.outcomePolicyAssignError"))
                }
            })
            .catch(() => {
                toast.error(t("commission.outcomePolicyAssignError"))
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [isOpen, targetTemplateEditionId, t])

    // Reset pagination on search or filter change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, filterTemplateMode, selectedScope])

    // Copy script code helper
    const handleCopyScript = (scriptCode: string, id: string) => {
        navigator.clipboard.writeText(scriptCode)
        setCopiedScriptId(id)
        toast.success(t("commission.scriptCodeCopied"))
        setTimeout(() => setCopiedScriptId(null), 2000)
    }

    // Filter policies
    const filteredCatalog = useMemo(() => {
        return catalog.filter((ed) => {
            // Search query filter
            const query = searchQuery.trim().toLowerCase()
            if (query) {
                const matchesName = ed.policyName?.toLowerCase().includes(query)
                const matchesTemplate = ed.inputTemplateEdition?.template?.name
                    ?.toLowerCase()
                    .includes(query)
                const matchesProperties = ed.outputProperties?.some(
                    (p) =>
                        p.code.toLowerCase().includes(query) ||
                        p.name.toLowerCase().includes(query),
                )
                if (!matchesName && !matchesTemplate && !matchesProperties) {
                    return false
                }
            }

            // Scope filter
            if (selectedScope !== "ALL" && ed.calculationScope !== selectedScope) {
                return false
            }

            // Template filter
            if (filterTemplateMode === "commission" && commissionTemplateEditionIds.size > 0) {
                const edTemplateId = ed.inputTemplateEdition?.id
                // Allow universal policies or policies that match one of the commission's templates
                if (edTemplateId && !commissionTemplateEditionIds.has(edTemplateId)) {
                    return false
                }
            }

            return true
        })
    }, [catalog, searchQuery, selectedScope, filterTemplateMode, commissionTemplateEditionIds])

    const totalPages = Math.ceil(filteredCatalog.length / ITEMS_PER_PAGE) || 1
    const paginatedCatalog = filteredCatalog.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    )

    // Assign action
    const handleAssign = async (editionId: string) => {
        setIsAssigningId(editionId)
        try {
            const res = await setCommissionOutcomePolicyAction(commissionId, editionId)
            if (res.success) {
                toast.success(t("commission.outcomePolicyAssigned"))
                onSuccess()
                onClose()
            } else {
                toast.error(res.error || t("commission.outcomePolicyAssignError"))
            }
        } catch {
            toast.error(t("commission.outcomePolicyAssignError"))
        } finally {
            setIsAssigningId(null)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden bg-white rounded-[32px] border border-slate-100 shadow-2xl animate-scale-up flex flex-col">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-indigo-600" />
                            {t("commission.outcomePolicyCatalog")}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {t("commission.outcomePolicySubtitle")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters and Search Bar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white">
                    {/* Search Input */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl flex-1 border border-slate-200 focus-within:border-indigo-400 focus-within:bg-white transition-colors">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder={t("commission.searchOutcomePolicies")}
                            className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2 shrink-0">
                        {commissionTemplateEditionIds.size > 0 && (
                            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                                <button
                                    type="button"
                                    onClick={() => setFilterTemplateMode("commission")}
                                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                        filterTemplateMode === "commission"
                                            ? "bg-white text-indigo-600 shadow-xs font-bold"
                                            : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    {t("commission.commissionTemplatesOnly")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterTemplateMode("all")}
                                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                        filterTemplateMode === "all"
                                            ? "bg-white text-indigo-600 shadow-xs font-bold"
                                            : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    {t("commission.allTemplatesFilter")}
                                </button>
                            </div>
                        )}

                        {/* Scope Filter Dropdown/Buttons */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setSelectedScope("ALL")}
                                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                                    selectedScope === "ALL"
                                        ? "bg-white text-indigo-600 shadow-xs font-bold"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Всі
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedScope("REPLICA")}
                                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                                    selectedScope === "REPLICA"
                                        ? "bg-white text-indigo-600 shadow-xs font-bold"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                {t("commission.scopeReplica")}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedScope("COMMISSION")}
                                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                                    selectedScope === "COMMISSION"
                                        ? "bg-white text-indigo-600 shadow-xs font-bold"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                {t("commission.scopeCommission")}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Catalog List */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-indigo-500">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-sm font-bold">{t("commission.loadingOutcomePolicies")}</span>
                        </div>
                    ) : paginatedCatalog.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                            <Sliders className="w-10 h-10 opacity-40" />
                            <span className="text-sm font-bold">{t("commission.noOutcomePoliciesFound")}</span>
                            {filterTemplateMode === "commission" && (
                                <button
                                    type="button"
                                    onClick={() => setFilterTemplateMode("all")}
                                    className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer mt-1"
                                >
                                    Показати всі політики результатів
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {paginatedCatalog.map((edition) => {
                                const isExpanded = expandedPolicyId === edition.id
                                const isCurrentlyAssigned = currentOutcomePolicyEditionId === edition.id
                                const isAssigning = isAssigningId === edition.id
                                const template = edition.inputTemplateEdition?.template
                                const matchesCommissionTemplate =
                                    edition.inputTemplateEdition?.id &&
                                    commissionTemplateEditionIds.has(edition.inputTemplateEdition.id)

                                return (
                                    <div
                                        key={edition.id}
                                        className={`border rounded-2xl bg-white shadow-sm transition-all overflow-hidden ${
                                            isCurrentlyAssigned
                                                ? "border-indigo-400 ring-2 ring-indigo-500/15"
                                                : "border-slate-200 hover:border-indigo-300"
                                        }`}
                                    >
                                        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                {/* Badges */}
                                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                                    {/* Calculation Scope */}
                                                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase tracking-widest border border-indigo-100">
                                                        {edition.calculationScope === "REPLICA"
                                                            ? t("commission.scopeReplica")
                                                            : t("commission.scopeCommission")}
                                                    </span>

                                                    {/* Template info */}
                                                    {template ? (
                                                        <span
                                                            className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 border ${
                                                                matchesCommissionTemplate
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                                            }`}
                                                        >
                                                            {matchesCommissionTemplate && (
                                                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                                            )}
                                                            {template.beverageType?.name || template.beverageType?.code
                                                                ? `${template.beverageType.name || template.beverageType.code}: `
                                                                : ""}
                                                            {template.name} v{edition.inputTemplateEdition?.version}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                                            {t("commission.universalTemplate")}
                                                        </span>
                                                    )}

                                                    {/* Version & Status */}
                                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">
                                                        v{edition.version}
                                                    </span>
                                                    {edition.status && (
                                                        <span
                                                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                                edition.status === "ACTIVE"
                                                                    ? "bg-emerald-100 text-emerald-800"
                                                                    : "bg-amber-100 text-amber-800"
                                                            }`}
                                                        >
                                                            {formatStatus(edition.status)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Title */}
                                                <h4 className="text-sm font-bold text-slate-800 truncate">
                                                    {edition.policyName}
                                                </h4>

                                                {/* Properties preview preview pills */}
                                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                    <span className="text-[10px] font-semibold text-slate-400">
                                                        {edition.outputProperties.length}{" "}
                                                        {t("commission.outputPropertiesLabel").toLowerCase()}:
                                                    </span>
                                                    {edition.outputProperties.slice(0, 4).map((prop) => (
                                                        <span
                                                            key={prop.id || prop.code}
                                                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                                                                prop.isResult
                                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                                            }`}
                                                        >
                                                            {prop.name || prop.code}
                                                        </span>
                                                    ))}
                                                    {edition.outputProperties.length > 4 && (
                                                        <span className="text-[9px] text-slate-400 font-medium">
                                                            +{edition.outputProperties.length - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex items-center gap-3 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedPolicyId(isExpanded ? null : edition.id)
                                                    }
                                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                                                >
                                                    {t("commission.outcomePolicyPreview")}{" "}
                                                    <ChevronRight
                                                        className={`w-3.5 h-3.5 transition-transform ${
                                                            isExpanded ? "rotate-90" : ""
                                                        }`}
                                                    />
                                                </button>

                                                {isCurrentlyAssigned ? (
                                                    <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold shadow-xs">
                                                        <Check className="w-3.5 h-3.5" />
                                                        {t("commission.templateSelected")}
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAssign(edition.id)}
                                                        disabled={isAssigning}
                                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                                    >
                                                        {isAssigning ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            t("commission.applyOutcomePolicy")
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Preview Drawer */}
                                        {isExpanded && (
                                            <div className="px-6 pb-6 pt-4 border-t border-slate-100 bg-slate-50/30 flex flex-col gap-5">
                                                {/* Output Properties Section */}
                                                <div>
                                                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                                                        {t("commission.outputPropertiesLabel")} (
                                                        {edition.outputProperties.length})
                                                    </h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {edition.outputProperties.map((prop) => (
                                                            <div
                                                                key={prop.id || prop.code}
                                                                className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex flex-col gap-1"
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-xs font-bold text-slate-800 truncate">
                                                                        {prop.name}
                                                                    </span>
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        {prop.isResult && (
                                                                            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] rounded font-extrabold uppercase">
                                                                                {t("commission.outcomePolicyResultBadge")}
                                                                            </span>
                                                                        )}
                                                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] rounded font-mono font-medium border border-slate-200">
                                                                            {prop.code}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {prop.description && (
                                                                    <p className="text-[10px] text-slate-400 line-clamp-2">
                                                                        {prop.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Script Code Section */}
                                                {edition.scriptCode && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                                                                {t("commission.scriptCodeLabel")}
                                                            </h5>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleCopyScript(edition.scriptCode, edition.id)
                                                                }
                                                                className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                {copiedScriptId === edition.id ? (
                                                                    <>
                                                                        <Check className="w-3 h-3 text-emerald-600" />
                                                                        <span className="text-emerald-600">
                                                                            {t("commission.scriptCodeCopied")}
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy className="w-3 h-3" />
                                                                        <span>{t("commission.copyScriptCode")}</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                        <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[220px] shadow-inner">
                                                            <code>{edition.scriptCode}</code>
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer with Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <span className="text-xs text-slate-500 font-medium">
                            Сторінка {currentPage} з {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                            >
                                Попередня
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                            >
                                Наступна
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
