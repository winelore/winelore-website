"use client"

import React, {useState, useEffect, useRef, useMemo, useCallback} from "react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    FileText, Trophy, Wine, User, Layers, PlayCircle, Crown, GraduationCap, CheckCircle, AlertCircle, Users, Timer, Check, Calendar, Pencil, Plus, X,
    Save, Search, ChevronRight, Sliders, Trash2, ArrowLeft, Loader2, UserPlus, Settings, ExternalLink, Send, ClipboardCheck, ArrowRight
} from "lucide-react"
import { AppHeader, type AppTabId } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
import {
    markMemberReadyAction,
    markMemberNotReadyAction,
    submitCommissionForReviewAction,
    startCommissionAction,
    getCommissionDataAction,
    renameCommissionAction,
    updateCommissionDatesAction,
    createCommissionReplicaAction,
    renameCommissionReplicaAction,
    removeCommissionReplicaMemberAction,
    setCommissionPartialCandidateEvaluationEnabledAction,
    setCommissionWineJumperMiniGameEnabledAction,
    setCommissionVoiceCommentsEnabledAction,
    setCommissionPropertyCommentsEnabledAction,
    setCommissionBeverageOriginDuringEvaluationEnabledAction,
    setCommissionReplicaPanelChaoticCurrentCandidateChangesEnabledAction,
    setCommissionReplicaChaoticCurrentPanelChangesEnabledAction,
    setCommissionTemplateAction,
} from "../actions"
import { getEvaluationTemplatesAction } from "@/app/templates/actions"
import { isReplicaCandidateFinished } from "../replicaUtils"
import { AddMemberModal } from "./components/AddMemberModal"
import { PanelsSection, type CommissionPanel, type Candidate } from "./components/PanelsSection"

const tabs = (t: any) => [
    { id: "feed", label: t("common.feed"), icon: FileText },
    { id: "competitions", label: t("common.competitions"), icon: Trophy },
    { id: "beverages", label: t("common.beverages"), icon: Wine },
]

const formatEnumStatus = (status: string | undefined): string => {
    if (!status) return ""
    return status
        .toLowerCase()
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}

function getGoogleCalendarUrl(name: string, plannedStartAt: string, plannedEndAt: string | null): string {
    const start = new Date(plannedStartAt)
    const end = plannedEndAt ? new Date(plannedEndAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

    const formatToGCal = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, "")
    }

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(name)}&dates=${formatToGCal(start)}/${formatToGCal(end)}`
}

function getAvatarGradient(auid: number): string {
    const gradients = [
        "from-pink-500 via-rose-500 to-red-500",
        "from-indigo-500 via-purple-500 to-pink-500",
        "from-blue-500 via-teal-500 to-emerald-500",
        "from-amber-400 via-orange-500 to-red-500",
        "from-violet-600 via-purple-600 to-indigo-600",
        "from-cyan-500 via-blue-500 to-indigo-500",
        "from-emerald-400 via-teal-500 to-cyan-500",
        "from-fuchsia-500 via-purple-600 to-pink-600",
    ]
    const idx = Math.abs(auid) % gradients.length
    return gradients[idx]
}

function MemberAvatar({ auid, role, username, className }: { auid: number[]; role: string; username?: string; className?: string }) {
    const primaryAuid = auid[0] || 0
    const gradient = getAvatarGradient(primaryAuid)
    const initials = username ? (username.startsWith("@") ? username.slice(1, 3) : username.slice(0, 2)).toUpperCase() : (primaryAuid ? `${primaryAuid}`.slice(-2) : "?")

    return (
        <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white font-bold text-[11px] shadow-sm shrink-0 border border-white/10 ${className}`}>
            <span>{initials}</span>
            {role === "HEAD" && (
                <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-background shadow-xs">
                    <Crown className="w-2.5 h-2.5 text-white" />
                </div>
            )}
        </div>
    )
}

function StatusSteps({ status }: { status: string }) {
    const { t } = useTranslation()
    const steps = [
        { id: "readying", label: t("commission.stepReadying"), description: t("commission.stepReadyingDesc") },
        { id: "tasting", label: t("commission.stepTasting"), description: t("commission.stepTastingDesc") },
        { id: "completed", label: t("commission.stepCompleted"), description: t("commission.stepCompletedDesc") }
    ]

    let currentStepIdx = 0
    if (status === "STARTED") {
        currentStepIdx = 1
    } else if (status === "COMPLETED") {
        currentStepIdx = 2
    }

    return (
        <div className="w-full bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {steps.map((step, idx) => {
                    const isCompleted = idx < currentStepIdx
                    const isActive = idx === currentStepIdx

                    return (
                        <React.Fragment key={step.id}>
                            <div className="flex items-center gap-3 flex-1">
                                <div className={`flex items-center justify-center w-7 h-7 rounded-full border text-xs font-semibold transition-all duration-350 shrink-0 ${
                                    isCompleted
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                        : isActive
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-500/10"
                                            : "bg-slate-50 border-slate-200 text-slate-400"
                                }`}>
                                    {isCompleted ? (
                                        <CheckCircle className="w-4 h-4" />
                                    ) : (
                                        <span>{idx + 1}</span>
                                    )}
                                </div>
                                <div>
                                    <h4 className={`text-xs font-bold ${isActive ? "text-slate-900" : "text-slate-500"}`}>{step.label}</h4>
                                    <p className="text-[10px] text-slate-400 hidden xl:block">{step.description}</p>
                                </div>
                            </div>
                        </React.Fragment>
                    )
                })}
            </div>
        </div>
    )
}

interface BeverageType {
    id: string;
    code: string;
    name: string;
}

interface TemplateEditionLink {
    id: string;
    beverageType: BeverageType;
    templateEdition: any;
}

interface Member {
    id: string;
    auid: number[];
    role: "HEAD" | "EXPERT" | "TRAINEE_EXPERT";
    isReady: boolean;
}

interface Replica {
    id: string;
    name: string;
    type: "STANDARD" | "TRAINEE";
    status: string;
    currentPanelId?: string | null;
    chaoticCurrentPanelChangesEnabled?: boolean;
    replicaPanels: {
        id: string;
        status: string;
        currentCandidateId?: string | null;
        chaoticCurrentCandidateChangesEnabled: boolean;
        panel?: { id: string; name: string };
    }[];
    members: Member[];
    candidateCount: number;
    replicaCandidates: {
        id: string;
        status: string;
        candidate?: {
            id: string;
            anonymizedCode: string | null;
            beverageType?: BeverageType;
        } | null;
    }[];
    currentCandidateId?: string | null;
}

interface InitialData {
    id: string;
    name: string;
    status: string;
    plannedStartAt: string | null;
    plannedEndAt: string | null;
    startedAt: string | null;
    endedAt: string | null;
    candidateCount: number;
    partialCandidateEvaluationEnabled?: boolean;
    wineJumperMiniGameEnabled?: boolean;
    voiceCommentsEnabled?: boolean;
    propertyCommentsEnabled?: boolean;
    beverageOriginDuringEvaluationEnabled?: boolean;
    competition: {
        id: string;
        name: string;
        holders: number[];
        evaluationTemplateEdition?: any;
    };
    templateEditions?: TemplateEditionLink[];
    replicas: Replica[];
    members: Member[];
    panels?: CommissionPanel[];
    candidates?: Candidate[];
}

function EvaluationTemplatesBlock({
                                      commissionId,
                                      templateEditions,
                                      beverageTypesInCommission,
                                      isCompetitionHolder,
                                      canEdit,
                                      onRefresh
                                  }: {
    commissionId: string,
    templateEditions: TemplateEditionLink[],
    beverageTypesInCommission: BeverageType[],
    isCompetitionHolder: boolean,
    canEdit: boolean,
    onRefresh: () => void
}) {
    const { t } = useTranslation()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedBeverageType, setSelectedBeverageType] = useState<BeverageType | null>(null)

    const [catalogTemplates, setCatalogTemplates] = useState<any[]>([])
    const [isCatalogLoading, setIsCatalogLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [isAssigning, setIsAssigning] = useState(false)
    const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)

    const ITEMS_PER_PAGE = 50;
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedBeverageType]);

    const handleOpenCatalog = async (bevType?: BeverageType) => {
        setSelectedBeverageType(bevType || null)
        setSearchQuery("")
        setCurrentPage(1)
        setIsModalOpen(true)
        setIsCatalogLoading(true)
        try {
            const data = await getEvaluationTemplatesAction()
            const filtered = bevType
                ? data.templates.filter((t: any) => t.beverageTypeId === bevType.id)
                : data.templates;
            setCatalogTemplates(filtered)
        } catch (e) {
            console.error("Failed to load templates catalog", e)
        } finally {
            setIsCatalogLoading(false)
        }
    }

    const handleAssignTemplate = async (templateEditionId: string, templateBevTypeId: string) => {
        setIsAssigning(true)
        try {
            const res = await setCommissionTemplateAction(commissionId, templateBevTypeId, templateEditionId)
            if (res.success) {
                setIsModalOpen(false)
                onRefresh()
            } else {
                alert(t("commission.templateAssignError" as any) || res.error)
            }
        } catch (e) {
            alert(t("commission.templateAssignError" as any))
        } finally {
            setIsAssigning(false)
        }
    }

    const filteredCatalog = catalogTemplates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    const totalPages = Math.ceil(filteredCatalog.length / ITEMS_PER_PAGE);
    const paginatedCatalog = filteredCatalog.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50 shadow-xs">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold tracking-tight text-slate-800">
                            {t("commission.evaluationTemplates" as any) || "Evaluation Templates"}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">
                            {t("commission.evaluationTemplatesSubtitle" as any) || "One template per beverage type"}
                        </p>
                    </div>
                </div>

                {isCompetitionHolder && canEdit && (
                    <button
                        onClick={() => handleOpenCatalog()}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t("commission.assignTemplate" as any) || "Assign Template"}</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {beverageTypesInCommission.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-8 text-slate-400 text-sm bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl gap-3">
                        <FileText className="w-8 h-8 opacity-50" />
                        <p className="font-medium text-slate-500">Немає налаштованих шаблонів або доданих напоїв.</p>
                        <p className="text-xs">Натисніть кнопку вище, щоб обрати перший шаблон з каталогу.</p>
                    </div>
                ) : (
                    beverageTypesInCommission.map((bevType) => {
                        const assignedLink = templateEditions.find(te => te.beverageType?.id === bevType.id);
                        const isAssigned = !!assignedLink;
                        const te = assignedLink?.templateEdition;

                        return (
                            <div key={bevType.id} className={`flex flex-col border rounded-2xl p-4 transition-all duration-300 ${isAssigned ? 'bg-slate-50/50 border-slate-200' : 'bg-rose-50/30 border-rose-200 border-dashed'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                                        {bevType.name || bevType.code}
                                    </span>
                                    {isCompetitionHolder && canEdit && (
                                        <button
                                            onClick={() => handleOpenCatalog(bevType)}
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                        >
                                            {isAssigned ? (t("commission.changeTemplate" as any) || "Change") : (t("commission.assignTemplate" as any) || "Assign Template")}
                                        </button>
                                    )}
                                </div>

                                {isAssigned && te ? (
                                    <div className="flex flex-col gap-2">
                                        <Link
                                            href={`/templates?templateId=${te.template?.id}-${te.version}`}
                                            target="_blank"
                                            className="group/link flex items-center gap-1.5 w-fit outline-none"
                                            title="Open template details in new tab"
                                        >
                                            <span className="text-sm font-extrabold text-slate-800 group-hover/link:text-indigo-600 transition-colors">
                                                {te.template?.name || "Standard Template"}
                                            </span>
                                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-indigo-500 opacity-0 group-hover/link:opacity-100 transition-all -translate-x-1 group-hover/link:translate-x-0" />
                                        </Link>

                                        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                                            <span className="bg-white border border-slate-200 shadow-sm px-1.5 py-0.5 rounded-md">v{te.version}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="uppercase text-emerald-600">{formatEnumStatus(te.status)}</span>
                                            <span className="text-slate-300">•</span>
                                            <span>{te.categories?.length || 0} Categories</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1 items-center justify-center py-2 text-rose-500">
                                        <AlertCircle className="w-5 h-5 mb-1 opacity-75" />
                                        <span className="text-xs font-bold">{t("commission.noTemplateForType" as any) || "No template assigned"}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Modal Catalog */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-800">{t("commission.templateCatalog" as any) || "Template Catalog"}</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {selectedBeverageType
                                        ? <>Selecting template for <strong className="text-indigo-600">{selectedBeverageType.name}</strong></>
                                        : "Select a template from the catalog"
                                    }
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl flex-1 border border-slate-200 focus-within:border-indigo-400 focus-within:bg-white transition-colors">
                                <Search className="w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={t("commission.searchTemplates" as any) || "Search templates..."}
                                    className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                            {isCatalogLoading ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-3 text-indigo-500">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <span className="text-sm font-bold">Loading catalog...</span>
                                </div>
                            ) : paginatedCatalog.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                    <FileText className="w-10 h-10 mb-2 opacity-50" />
                                    <span className="text-sm font-bold">{t("commission.noTemplatesFound" as any) || "No templates found"}</span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {paginatedCatalog.map(template => {
                                        const ed = template.latestEdition;
                                        const isExpanded = expandedTemplateId === template.id;

                                        return (
                                            <div key={template.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-indigo-300 transition-all overflow-hidden">
                                                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-widest border border-slate-200">
                                                                {template.beverageType}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-sm font-bold text-slate-800">{template.name}</h4>
                                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold text-slate-500">
                                                            <span className="bg-slate-50 border px-1.5 py-0.5 rounded-md">v{ed.version}</span>
                                                            <span>•</span>
                                                            <span>{ed.categories?.length || 0} Categories</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => setExpandedTemplateId(isExpanded ? null : template.id)}
                                                            className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                                                        >
                                                            Preview <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleAssignTemplate(ed.id, template.beverageTypeId)}
                                                            disabled={isAssigning}
                                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                                                        >
                                                            {isAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (t("commission.applyTemplate" as any) || "Apply")}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* ДИЗАЙН ПРЕВ'Ю ЯК НА СТОРІНЦІ /TEMPLATES + ПАРАМЕТРИ */}
                                                {isExpanded && ed.categories && (
                                                    <div className="px-6 pb-6 pt-4 border-t border-slate-50 bg-slate-50/15 max-h-[350px] overflow-y-auto">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                                            <Settings className="w-4 h-4 text-indigo-500" />
                                                            {t("commission.templatePreview" as any) || "Structure Preview"}
                                                        </h4>

                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                            {ed.categories.map((cat: any) => (
                                                                <div
                                                                    key={cat.id}
                                                                    className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-3.5"
                                                                >
                                                                    <h5 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                                                                        {cat.name}
                                                                    </h5>
                                                                    <div className="flex flex-col gap-2">
                                                                        {cat.properties?.map((prop: any) => (
                                                                            <div
                                                                                key={prop.id || prop.code}
                                                                                className="flex flex-col bg-slate-50/30 hover:bg-slate-50/70 border border-slate-100/80 rounded-xl px-3 py-2 text-xs transition-colors"
                                                                            >
                                                                                <div className="flex justify-between items-start">
                                                                                    <div className="flex flex-col min-w-0 flex-1 pr-3">
                                                                                        <span className="font-bold text-slate-700 truncate flex items-center gap-1.5">
                                                                                            {prop.name}
                                                                                            {prop.isRequired && <span className="text-rose-500 font-bold" title="Required">*</span>}
                                                                                            {prop.isResult && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] rounded uppercase font-bold tracking-wider">Result</span>}
                                                                                        </span>
                                                                                        {prop.description && (
                                                                                            <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{prop.description}</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                                        <span className="bg-slate-100 text-slate-600 rounded-md px-2 py-0.5 text-[10px] font-semibold border border-slate-200/60 uppercase">
                                                                                            {prop.__typename ? prop.__typename.replace("Property", "") : prop.type}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex flex-wrap gap-2 mt-2 text-[9px] text-slate-500 font-medium">
                                                                                    {(prop.minLimit !== undefined || prop.maxLimit !== undefined) && (
                                                                                        <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                                                                            Range: {prop.minLimit ?? '-∞'} ... {prop.maxLimit ?? '∞'}
                                                                                        </span>
                                                                                    )}
                                                                                    {prop.allowedValues && prop.allowedValues.length > 0 && (
                                                                                        <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[150px]" title={prop.allowedValues.join(', ')}>
                                                                                            Options: {prop.allowedValues.join(', ')}
                                                                                        </span>
                                                                                    )}
                                                                                    {prop.defaultValue !== undefined && prop.defaultValue !== null && (
                                                                                        <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                                                                            Default: {String(prop.defaultValue)}
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
                            <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    Page {currentPage} of {totalPages} <span className="text-slate-300 mx-1">|</span> {filteredCatalog.length} total
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function CommissionClientView({
                                                 initialData: propInitialData,
                                                 serverAuid
                                             }: {
    initialData: InitialData;
    serverAuid?: number | null;
}) {
    const { t, tCount, formatStatus, formatReplicaType, formatDateTime, formatShortDateTime } = useTranslation()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<AppTabId>("competitions")
    const [localData, setLocalData] = useState<InitialData>(propInitialData)
    const [localReplicas, setLocalReplicas] = useState<Replica[]>(propInitialData.replicas || [])
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
    const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
    const [isMutating, setIsMutating] = useState(false)
    const [timeDisplay, setTimeDisplay] = useState<string>("")
    const [currentAuid, setCurrentAuid] = useState<number | null>(serverAuid || null)
    const [hasRedirected, setHasRedirected] = useState(false)
    const [isEditingName, setIsEditingName] = useState(false)
    const [editNameData, setEditNameData] = useState("")
    const [isEditingDates, setIsEditingDates] = useState(false)
    const [editDatesData, setEditDatesData] = useState({
        plannedStartAt: "",
        plannedEndAt: "",
    })
    const [isAddingReplica, setIsAddingReplica] = useState(false)
    const [newReplicaName, setNewReplicaName] = useState("")
    const [newReplicaType, setNewReplicaType] = useState<"STANDARD" | "TRAINEE">("STANDARD")
    const [isEditingReplica, setIsEditingReplica] = useState(false)
    const [editReplicaName, setEditReplicaName] = useState("")
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
    const initialData = localData

    const beverageTypesInCommission = useMemo(() => {
        const typesMap = new Map<string, BeverageType>()

        // 1. Беремо типи з уже призначених шаблонів (щоб вони відображалися навіть якщо немає напоїв)
        if (initialData.templateEditions) {
            initialData.templateEditions.forEach(te => {
                if (te.beverageType) typesMap.set(te.beverageType.id, te.beverageType)
            })
        }

        // 2. Беремо типи з доданих напоїв (якщо вони є)
        localData.replicas.forEach(r => {
            r.replicaCandidates.forEach(rc => {
                if (rc.candidate?.beverageType) {
                    typesMap.set(rc.candidate.beverageType.id, rc.candidate.beverageType)
                }
            })
        })
        return Array.from(typesMap.values())
    }, [localData.replicas, initialData.templateEditions])

    const refreshCommissionData = async () => {
        try {
            const updated = await getCommissionDataAction(localData.id)
            if (updated) {
                setLocalData(updated)
                if (updated.replicas) {
                    setLocalReplicas(updated.replicas)
                }
            }
        } catch (err) {
            console.error("Failed to refresh commission data:", err)
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        if (!selectedReplica || isMutating) return
        if (!confirm("Ви дійсно бажаєте видалити цього експерта з комісії?")) return
        setRemovingMemberId(memberId)
        try {
            const res = await removeCommissionReplicaMemberAction(selectedReplica.id, memberId)
            if (res.success) {
                await refreshCommissionData()
            } else {
                alert(res.error || "Не вдалося видалити учасника")
            }
        } catch (err: any) {
            alert(err.message || "Помилка при видаленні учасника")
        } finally {
            setRemovingMemberId(null)
        }
    }

    const openEditName = () => {
        setEditNameData(initialData.name)
        setIsEditingName(true)
    }

    const openEditDates = () => {
        setEditDatesData({
            plannedStartAt: initialData.plannedStartAt ? initialData.plannedStartAt.substring(0, 16) : "",
            plannedEndAt: initialData.plannedEndAt ? initialData.plannedEndAt.substring(0, 16) : ""
        })
        setIsEditingDates(true)
    }

    const openAddReplica = () => {
        setNewReplicaName("")
        setNewReplicaType("STANDARD")
        setIsAddingReplica(true)
    }

    const openEditReplica = (e: React.MouseEvent, replica: Replica) => {
        e.stopPropagation();
        setEditReplicaName(replica.name || "");
        setIsEditingReplica(true);
    }

    const handleSaveReplica = async () => {
        if (!selectedReplicaId) return;
        setIsMutating(true)
        try {
            const res = await renameCommissionReplicaAction(
                selectedReplicaId,
                editReplicaName.trim() || undefined
            )
            if (res.success) {
                setIsEditingReplica(false)
                router.refresh()
            } else {
                alert(res.error || "Failed to rename replica")
            }
        } catch (err: any) {
            alert(err.message || "An error occurred")
        } finally {
            setIsMutating(false)
        }
    }

    const handleSaveName = async () => {
        if (!editNameData.trim()) {
            alert("Name cannot be empty")
            return
        }
        setIsMutating(true)
        try {
            const res = await renameCommissionAction(initialData.id, editNameData.trim())
            if (res.success) {
                setIsEditingName(false)
                router.refresh()
            } else {
                alert(res.error || "Failed to save name")
            }
        } catch (err: any) {
            alert(err.message || "An error occurred")
        } finally {
            setIsMutating(false)
        }
    }

    const handleSaveDates = async () => {
        setIsMutating(true)
        try {
            const res = await updateCommissionDatesAction(
                initialData.id,
                editDatesData.plannedStartAt || null,
                editDatesData.plannedEndAt || null,
            )
            if (res.success) {
                setIsEditingDates(false)
                router.refresh()
            } else {
                alert(res.error || "Failed to save dates")
            }
        } catch (err: any) {
            alert(err.message || "An error occurred")
        } finally {
            setIsMutating(false)
        }
    }

    const handleAddReplica = async () => {
        setIsMutating(true)
        try {
            const res = await createCommissionReplicaAction({
                commissionId: initialData.id,
                name: newReplicaName.trim() || undefined,
                type: newReplicaType,
            })
            if (res.success) {
                setIsAddingReplica(false)
                router.refresh()
            } else {
                alert(res.error || "Failed to add replica")
            }
        } catch (err: any) {
            alert(err.message || "An error occurred")
        } finally {
            setIsMutating(false)
        }
    }

    const refreshData = useCallback(async () => {
        const updated = await getCommissionDataAction(localData.id)
        if (updated) {
            setLocalData(updated)
            if (updated.replicas) setLocalReplicas(updated.replicas)
        }
    }, [localData.id])

    const handleTogglePartialEvaluation = async () => {
        if (isMutating) return;
        const nextState = !localData.partialCandidateEvaluationEnabled;
        setIsMutating(true);
        try {
            const res = await setCommissionPartialCandidateEvaluationEnabledAction(localData.id, nextState);
            if (res.success) {
                setLocalData(prev => ({ ...prev, partialCandidateEvaluationEnabled: nextState }));
            } else {
                alert(res.error || t("commission.addMemberError"));
            }
        } catch (err: any) {
            alert(err?.message || t("commission.addMemberError"));
        } finally {
            setIsMutating(false);
        }
    };

    const handleToggleWineJumper = async () => {
        if (isMutating) return;
        const nextState = !localData.wineJumperMiniGameEnabled;
        setIsMutating(true);
        try {
            const res = await setCommissionWineJumperMiniGameEnabledAction(localData.id, nextState);
            if (res.success) {
                setLocalData(prev => ({ ...prev, wineJumperMiniGameEnabled: nextState }));
            } else {
                alert(res.error || t("commission.addMemberError"));
            }
        } catch (err: any) {
            alert(err?.message || t("commission.addMemberError"));
        } finally {
            setIsMutating(false);
        }
    };

    const handleToggleVoiceComments = async () => {
        if (isMutating) return;
        const nextState = !localData.voiceCommentsEnabled;
        setIsMutating(true);
        try {
            const res = await setCommissionVoiceCommentsEnabledAction(localData.id, nextState);
            if (res.success) {
                setLocalData(prev => ({ ...prev, voiceCommentsEnabled: nextState }));
            } else {
                alert(res.error || t("commission.addMemberError"));
            }
        } catch (err: any) {
            alert(err?.message || t("commission.addMemberError"));
        } finally {
            setIsMutating(false);
        }
    };

    const handleTogglePropertyComments = async () => {
        if (isMutating) return;
        const nextState = !localData.propertyCommentsEnabled;
        setIsMutating(true);
        try {
            const res = await setCommissionPropertyCommentsEnabledAction(localData.id, nextState);
            if (res.success) {
                setLocalData(prev => ({ ...prev, propertyCommentsEnabled: nextState }));
            } else {
                alert(res.error || t("commission.addMemberError"));
            }
        } catch (err: any) {
            alert(err?.message || t("commission.addMemberError"));
        } finally {
            setIsMutating(false);
        }
    };

    const handleToggleBeverageOrigin = async () => {
        if (isMutating) return;
        const nextState = !localData.beverageOriginDuringEvaluationEnabled;
        setIsMutating(true);
        try {
            const res = await setCommissionBeverageOriginDuringEvaluationEnabledAction(localData.id, nextState);
            if (res.success) {
                setLocalData(prev => ({ ...prev, beverageOriginDuringEvaluationEnabled: nextState }));
            } else {
                alert(res.error || t("commission.addMemberError"));
            }
        } catch (err: any) {
            alert(err?.message || t("commission.addMemberError"));
        } finally {
            setIsMutating(false);
        }
    };

    const handleToggleChaoticCandidateChanges = async () => {
        if (!selectedReplica || isMutating) return;
        const activePanel = selectedReplica.replicaPanels.find(panel => panel.id === selectedReplica.currentPanelId);
        if (!activePanel) return;
        const nextState = !activePanel.chaoticCurrentCandidateChangesEnabled;
        setIsMutating(true);
        try {
            const res = await setCommissionReplicaPanelChaoticCurrentCandidateChangesEnabledAction(selectedReplica.id, activePanel.id, nextState);
            if (res.success) {
                setLocalReplicas(prev => prev.map(r => r.id === selectedReplica.id ? {
                    ...r,
                    replicaPanels: r.replicaPanels.map(panel => panel.id === activePanel.id ? { ...panel, chaoticCurrentCandidateChangesEnabled: nextState } : panel),
                } : r));
            } else {
                alert(res.error || t("commission.addMemberError"));
            }
        } catch (err: any) {
            alert(err?.message || t("commission.addMemberError"));
        } finally {
            setIsMutating(false);
        }
    };

    const handleToggleChaoticPanelChanges = async () => {
        if (!selectedReplica || isMutating) return;
        const nextState = !selectedReplica.chaoticCurrentPanelChangesEnabled;
        setIsMutating(true);
        try {
            const res = await setCommissionReplicaChaoticCurrentPanelChangesEnabledAction(selectedReplica.id, nextState);
            if (res.success) setLocalReplicas(prev => prev.map(r => r.id === selectedReplica.id ? { ...r, chaoticCurrentPanelChangesEnabled: nextState } : r));
        } finally {
            setIsMutating(false);
        }
    };

    // Detect user's active replica
    const activeReplica = localReplicas.find(r =>
        r.members.some(m => currentAuid !== null && m.auid.includes(currentAuid))
    ) || localReplicas.find(r => r.type === "STANDARD") || localReplicas[0] || null

    const [selectedReplicaId, setSelectedReplicaId] = useState<string | null>(activeReplica?.id || null)

    const selectedReplica = localReplicas.find(r => r.id === selectedReplicaId) || activeReplica
    const localMembers = selectedReplica ? selectedReplica.members : []

    // Fetch usernames for panel members, competition creators/holders, and beverage producers
    const allMemberAuids = useMemo(() => {
        const memberIds = localMembers.flatMap(m => m.auid);
        const holderIds = initialData.competition.holders || [];
        const producerIds: number[] = [];
        (localData.panels || []).forEach(p => {
            (p.candidates || []).forEach(c => {
                const producers = c.sample?.batch?.beverage?.producers;
                if (producers) {
                    producers.forEach(prod => {
                        if (Array.isArray(prod.auid)) {
                            prod.auid.forEach(id => producerIds.push(id));
                        } else if (prod.auid) {
                            producerIds.push(prod.auid);
                        }
                    });
                }
            });
        });
        return Array.from(new Set([...memberIds, ...holderIds, ...producerIds]));
    }, [localMembers, initialData.competition.holders, localData.panels])
    const { usernames } = useUsernames(allMemberAuids)

    const prevReplicaStatusRef = useRef(selectedReplica?.status)

    useEffect(() => {
        setLocalData(propInitialData)
        if (propInitialData.replicas) {
            setLocalReplicas(propInitialData.replicas)
            const active = propInitialData.replicas.find(r =>
                r.members.some(m => currentAuid !== null && m.auid.includes(currentAuid))
            ) || propInitialData.replicas.find(r => r.type === "STANDARD") || propInitialData.replicas[0] || null
            if (active && !selectedReplicaId) {
                setSelectedReplicaId(active.id)
            }
        }
    }, [propInitialData, currentAuid, selectedReplicaId])

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) {
            setCurrentAuid(parseInt(cookieAuid, 10))
        }
    }, [])

    useEffect(() => {
        const me = localMembers.find(m => currentAuid !== null && m.auid.includes(currentAuid))
        if (me) {
            setCurrentUserRole(me.role)
            setCurrentMemberId(me.id)
        } else {
            setCurrentUserRole(null)
            setCurrentMemberId(null)
        }
    }, [localMembers, currentAuid])

    const creatorNames = initialData.competition.holders.length > 0
        ? initialData.competition.holders.map(id => usernames[id] || String(id)).join(", ")
        : t("common.unknownCreator")

    useEffect(() => {
        const prevStatus = prevReplicaStatusRef.current
        const currentStatus = selectedReplica?.status

        if (prevStatus !== "STARTED" && currentStatus === "STARTED" && !hasRedirected && selectedReplica) {
            setHasRedirected(true)
            router.push(`/commission/${localData.id}/replica/${selectedReplica.id}/evaluation`)
        }

        prevReplicaStatusRef.current = currentStatus
    }, [selectedReplica?.status, localData.id, hasRedirected, router, selectedReplica])

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const updateTime = () => {
            if (initialData.status === "STARTED" && initialData.startedAt) {
                const start = new Date(initialData.startedAt).getTime()
                const now = new Date().getTime()
                const diff = Math.max(0, now - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                const formattedTime = hours > 0
                    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

                setTimeDisplay(formattedTime)
            } else if (initialData.status === "COMPLETED" && initialData.startedAt && initialData.endedAt) {
                const start = new Date(initialData.startedAt).getTime()
                const end = new Date(initialData.endedAt).getTime()
                const diff = Math.max(0, end - start)

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                setTimeDisplay(hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes }))
            } else if (initialData.status === "PLANNED" && initialData.plannedStartAt) {
                const start = new Date(initialData.plannedStartAt).getTime()
                const now = new Date().getTime()
                const diff = start - now

                if (diff <= 0) {
                    setTimeDisplay(t("time.startingSoon"))
                } else {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                    if (days > 0) {
                        setTimeDisplay(t("time.inDaysHours", { days, hours }))
                    } else {
                        setTimeDisplay(t("time.inHoursMinutes", { hours, minutes }))
                    }
                }
            } else {
                setTimeDisplay("")
            }
        }

        updateTime()
        if (initialData.status === "STARTED") {
            intervalId = setInterval(updateTime, 1000)
        }

        return () => clearInterval(intervalId)
    }, [initialData.status, initialData.startedAt, initialData.plannedStartAt, initialData.endedAt])

    useEffect(() => {
        const pollInterval = setInterval(async () => {
            try {
                const updated = await getCommissionDataAction(localData.id)
                if (updated) {
                    setLocalData(updated)
                    if (updated.replicas) {
                        setLocalReplicas(updated.replicas)
                    }
                }
            } catch (err) {
                console.error("Failed to poll commission data:", err)
            }
        }, 3000)

        return () => clearInterval(pollInterval)
    }, [localData.id])

    const handleToggleReady = async (shouldBeReady: boolean) => {
        if (!selectedReplica || !currentMemberId || isMutating) return
        setIsMutating(true)

        try {
            let updatedMembers;
            if (shouldBeReady) {
                const response = await markMemberReadyAction(selectedReplica.id, currentMemberId)
                updatedMembers = response.markCommissionReplicaMemberReady?.members
            } else {
                const response = await markMemberNotReadyAction(selectedReplica.id, currentMemberId)
                updatedMembers = response.markCommissionReplicaMemberNotReady?.members
            }

            if (updatedMembers) {
                setLocalReplicas(prev =>
                    prev.map(r => {
                        if (r.id === selectedReplica.id) {
                            return {
                                ...r,
                                members: r.members.map(m => {
                                    const match = updatedMembers.find((u: any) => u.id === m.id)
                                    return match ? { ...m, isReady: match.isReady } : m
                                })
                            }
                        }
                        return r
                    })
                )
            }
        } catch (err) {
            console.error("Failed to update readiness status:", err)
        } finally {
            setIsMutating(false)
        }
    }

    const candidateCount = (localData.candidates?.length ?? localData.candidateCount ?? 0)
    const hasCandidates = candidateCount > 0
    const hasMembers = localMembers.length > 0
    const isEveryoneReady = hasMembers && localMembers.every(m => m.isReady)
    const myStatus = localMembers.find(m => currentAuid !== null && m.auid.includes(currentAuid))
    const amIReady = myStatus?.isReady || false
    const handleStartCommission = async () => {
        if (!selectedReplica || isMutating) return
        if (!hasCandidates) {
            alert("Неможливо розпочати дегустацію: додайте щонайменше 1 зразок (кандидата) до комісії.")
            return
        }
        if (!hasMembers) {
            alert("Неможливо розпочати дегустацію: додайте щонайменше 1 експерта до комісії.")
            return
        }
        setIsMutating(true)
        try {
            await startCommissionAction(selectedReplica.id, localData.id)
            router.push(`/commission/${localData.id}/replica/${selectedReplica.id}/evaluation`)
            router.refresh()
        } catch (err: any) {
            console.error("Failed to start replica tasting session:", err)
            alert(err.message || "Помилка при запуску дегустації")
        } finally {
            setIsMutating(false)
        }
    }

    const handleSubmitForReview = async () => {
        if (isMutating || !isCommissionDraft) return
        setIsMutating(true)
        try {
            await submitCommissionForReviewAction(localData.id)
            await refreshCommissionData()
            router.refresh()
        } catch (err: any) {
            console.error("Failed to submit commission for review:", err)
            alert(err.message || t("commission.submitReviewError"))
        } finally {
            setIsMutating(false)
        }
    }

    const sortedMembers = [...localMembers].sort((a, b) => {
        const roleOrder = { HEAD: 1, EXPERT: 2, TRAINEE_EXPERT: 3 }
        return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99)
    })

    const currentCommissionStatus = localData.status || initialData.status
    const replicaStatus = selectedReplica?.status || "DRAFT"
    const isReplicaDraft = replicaStatus === "DRAFT"
    const isCommissionDraft = currentCommissionStatus === "DRAFT"
    const selectedReplicaName = selectedReplica?.name || t("common.standard")
    const isCommissionCompleted = currentCommissionStatus === "COMPLETED"
    const isCompetitionHolder = currentAuid !== null && (localData.competition?.holders || initialData.competition?.holders || []).includes(currentAuid)
    const isUserReplicaMember = selectedReplica?.members.some(
        (m) => currentAuid !== null && m.auid.includes(currentAuid),
    ) ?? false
    const myReplica = localReplicas.find((r) =>
        r.members.some((m) => currentAuid !== null && m.auid.includes(currentAuid)),
    ) ?? null
    const selectedReplicaReadyForSummary =
        isUserReplicaMember &&
        selectedReplica &&
        replicaStatus === "COMPLETED"
    const myReplicaReadyForSummary = myReplica?.status === "COMPLETED"
    const summaryReplica = selectedReplicaReadyForSummary
        ? selectedReplica
        : myReplicaReadyForSummary
            ? myReplica
            : null
    const showMyTastingSummary = summaryReplica != null
    const templatesReady = beverageTypesInCommission.length > 0 && beverageTypesInCommission.every(
        beverageType => initialData.templateEditions?.some(link => link.beverageType?.id === beverageType.id),
    )
    const panelsReady = (localData.panels?.length || 0) > 0
    const setupChecks = [
        { id: "commission-samples", label: t("commission.setupCheckPanels"), complete: panelsReady },
        { id: "commission-samples", label: t("commission.setupCheckSamples"), complete: hasCandidates },
        { id: "commission-experts", label: t("commission.setupCheckExperts"), complete: hasMembers },
        { id: "commission-templates", label: t("commission.setupCheckTemplates"), complete: templatesReady },
    ]
    const completedSetupChecks = setupChecks.filter(check => check.complete).length
    const setupProgress = Math.round((completedSetupChecks / setupChecks.length) * 100)

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="competitions" />

            <main className="flex-1 overflow-auto px-4 pb-10 pt-4 md:px-8 md:pb-14 md:pt-6 flex flex-col items-center">
                <div className="w-full max-w-7xl mb-3 flex justify-start">
                    <Link
                        href={initialData.competition?.id ? `/competition/${initialData.competition.id}` : "/myCommissions"}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {initialData.competition?.id ? t("commission.backToCompetition") : t("commission.backToCompetitions")}
                    </Link>
                </div>

                <section id="commission-overview" className="w-full max-w-7xl scroll-mt-24 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                    <div className="relative px-5 py-6 md:px-8 md:py-7">
                        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-100/50 blur-3xl pointer-events-none" />
                        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 items-start gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm">
                                    <Wine className="h-7 w-7" />
                                </div>
                                <div className="min-w-0">
                                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{t("commission.session")}</span>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                            replicaStatus === "STARTED"
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : replicaStatus === "COMPLETED"
                                                    ? "border-slate-200 bg-slate-100 text-slate-600"
                                                    : "border-amber-200 bg-amber-50 text-amber-700"
                                        }`}>
                                            {replicaStatus === "STARTED" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                            {formatStatus(replicaStatus)}
                                        </span>
                                        {timeDisplay && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                                <Timer className="h-3.5 w-3.5 text-indigo-500" />
                                                {timeDisplay}
                                            </span>
                                        )}
                                    </div>
                                    {isEditingName ? (
                                        <div className="flex w-full max-w-xl items-center gap-2">
                                            <input
                                                type="text"
                                                autoFocus
                                                className="min-w-[180px] flex-1 rounded-xl border border-indigo-300 bg-white px-3 py-1.5 text-xl font-extrabold text-slate-900 outline-none ring-indigo-500/20 focus:border-indigo-600 focus:ring-2"
                                                value={editNameData}
                                                onChange={event => setEditNameData(event.target.value)}
                                                onKeyDown={event => {
                                                    if (event.key === "Enter") handleSaveName()
                                                    if (event.key === "Escape") setIsEditingName(false)
                                                }}
                                            />
                                            <button type="button" onClick={handleSaveName} disabled={isMutating} aria-label={t("common.save")} className="rounded-xl bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:opacity-50">
                                                {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            </button>
                                            <button type="button" onClick={() => setIsEditingName(false)} aria-label={t("competition.cancel")} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex min-w-0 items-center gap-2">
                                            <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">{initialData.name}</h1>
                                            {isCompetitionHolder && isCommissionDraft && (
                                                <button type="button" onClick={openEditName} className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600" title={t("commission.editName")}>
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <p className="mt-1 text-sm font-medium text-slate-500">{initialData.competition.name} · {selectedReplicaName}</p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">{tCount("commission.replicaBeverages", candidateCount)}</span>
                                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">{t("commission.expertCount", { ready: localMembers.filter(member => member.isReady).length, total: localMembers.length })}</span>
                                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">{t("commission.panelCount", { count: localData.panels?.length || 0 })}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex w-full flex-col gap-2 lg:w-[360px] lg:shrink-0">
                                {replicaStatus === "STARTED" && currentUserRole ? (
                                    <button onClick={() => router.push(`/commission/${localData.id}/replica/${selectedReplica!.id}/evaluation`)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95">
                                        <PlayCircle className="h-5 w-5" />
                                        {t("commission.enterTastingSession")}
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                ) : replicaStatus === "COMPLETED" && isCompetitionHolder ? (
                                    <button onClick={() => router.push(`/commission/${localData.id}/results`)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 active:scale-95">
                                        <Trophy className="h-5 w-5" />
                                        {t("commission.viewResults")}
                                    </button>
                                ) : replicaStatus === "COMPLETED" && summaryReplica ? (
                                    <button onClick={() => router.push(`/commission/${localData.id}/replica/${summaryReplica.id}/summary`)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 active:scale-95">
                                        <Wine className="h-5 w-5" />
                                        {t("commission.viewMyTastingSummary")}
                                    </button>
                                ) : replicaStatus === "COMPLETED" ? (
                                    <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700">
                                        <CheckCircle className="h-5 w-5" />
                                        {t("commission.sessionCompleted")}
                                    </div>
                                ) : currentUserRole && !amIReady ? (
                                    <button onClick={() => handleToggleReady(true)} disabled={isMutating} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50">
                                        {isMutating ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                                        {t("commission.markReady")}
                                    </button>
                                ) : currentUserRole === "HEAD" ? (
                                    <button onClick={handleStartCommission} disabled={!isEveryoneReady || !hasCandidates || isMutating} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
                                        {isMutating ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
                                        {t("commission.startTasting")}
                                    </button>
                                ) : currentUserRole ? (
                                    <button onClick={() => handleToggleReady(false)} disabled={isMutating} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50">
                                        <CheckCircle className="h-5 w-5" />
                                        {t("commission.ready")}
                                    </button>
                                ) : isCompetitionHolder && isCommissionDraft ? (
                                    <button onClick={handleSubmitForReview} disabled={isMutating} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50">
                                        {isMutating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                        {t("commission.submitReviewButton")}
                                    </button>
                                ) : null}
                                {showMyTastingSummary && !(replicaStatus === "COMPLETED" && !isCompetitionHolder) && (
                                    <button onClick={() => router.push(`/commission/${localData.id}/replica/${summaryReplica!.id}/summary`)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-50">
                                        <Wine className="h-4 w-4" />
                                        {t("commission.viewMyTastingSummary")}
                                    </button>
                                )}
                                {isCompetitionHolder && replicaStatus !== "COMPLETED" && (
                                    <button onClick={() => router.push(`/commission/${localData.id}/results`)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                                        <Trophy className="h-4 w-4" />
                                        {t("commission.resultsNav")}
                                    </button>
                                )}
                                {isCompetitionHolder && isCommissionDraft && Boolean(currentUserRole) && (
                                    <button onClick={handleSubmitForReview} disabled={isMutating} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50">
                                        <Send className="h-4 w-4" />
                                        {t("commission.submitReviewButton")}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 border-t border-slate-100 bg-slate-50/70 sm:grid-cols-3">
                        <div className="flex items-center gap-3 px-5 py-3.5 md:px-8">
                            <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
                            <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t("commission.competition")}</p><p className="truncate text-xs font-bold text-slate-700">{initialData.competition.name}</p></div>
                        </div>
                        <div className="flex items-center gap-3 border-t border-slate-200 px-5 py-3.5 sm:border-l sm:border-t-0 md:px-8">
                            <User className="h-4 w-4 shrink-0 text-indigo-500" />
                            <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t("commission.holders")}</p><p className="truncate text-xs font-bold text-slate-700">{creatorNames}</p></div>
                        </div>
                        <div className="flex items-center gap-3 border-t border-slate-200 px-5 py-3.5 sm:border-l sm:border-t-0 md:px-8">
                            <Calendar className="h-4 w-4 shrink-0 text-indigo-500" />
                            <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t("commission.plannedStart")}</p><p className="truncate text-xs font-bold text-slate-700">{formatShortDateTime(initialData.plannedStartAt)}</p></div>
                        </div>
                    </div>
                </section>

                <nav aria-label={t("commission.pageSections")} className="sticky top-0 z-30 my-5 flex w-full max-w-7xl gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-md">
                    {[
                        { id: "commission-overview", label: t("commission.navOverview") },
                        { id: "commission-experts", label: t("commission.navExperts") },
                        { id: "commission-samples", label: t("commission.navSamples") },
                        { id: "commission-templates", label: t("commission.navTemplates") },
                        ...(isCompetitionHolder ? [{ id: "commission-settings", label: t("commission.navSettings") }] : []),
                        { id: "commission-timeline", label: t("commission.navTimeline") },
                    ].map(item => (
                        <button key={item.id} type="button" onClick={() => scrollToSection(item.id)} className="shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 items-start gap-6">

                    {/* Primary workspace: the people and samples involved in this tasting. */}
                    <div id="commission-workspace" className="w-full scroll-mt-24 lg:col-span-7 flex flex-col gap-5">
                        <div className="order-[-2] flex items-center gap-3 px-1">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
                                <Wine className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-extrabold text-slate-800">{t("commission.workspaceTitle")}</h2>
                                <p className="text-[11px] text-slate-500">{t("commission.workspaceDesc")}</p>
                            </div>
                        </div>

                        {/* Replica Selector Tabs */}
                        {(localReplicas.length > 0 || isCompetitionHolder) && (
                            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Layers className="w-4 h-4 text-indigo-500" />
                                        {t("commission.tastingReplicas")}
                                    </h3>
                                    {isCompetitionHolder && !isAddingReplica && isCommissionDraft && (
                                        <button
                                            onClick={openAddReplica}
                                            disabled={isMutating}
                                            className="flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>{t("commission.addReplica")}</span>
                                        </button>
                                    )}
                                </div>

                                {isAddingReplica && (
                                    <div className="mb-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-800">{t("commission.addTastingReplica")}</span>
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingReplica(false)}
                                                className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("commission.replicaNameOptional")}</label>
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="e.g. Replica B"
                                                className="w-full text-xs font-semibold text-slate-700 outline-none border-b border-slate-300 focus:border-indigo-500 py-1 bg-transparent"
                                                value={newReplicaName}
                                                onChange={e => setNewReplicaName(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("commission.replicaType")}</label>
                                            <div className="flex gap-2">
                                                {(["STANDARD", "TRAINEE"] as const).map(type => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => setNewReplicaType(type)}
                                                        className={`flex-1 rounded-xl px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                                            newReplicaType === type
                                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                                                        }`}
                                                    >
                                                        {type === "STANDARD" ? t("commission.typeStandard") : t("commission.typeTrainee")}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-1">
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingReplica(false)}
                                                disabled={isMutating}
                                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                                            >
                                                {t("competition.cancel")}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleAddReplica}
                                                disabled={isMutating}
                                                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1 disabled:opacity-75 cursor-pointer"
                                            >
                                                {isMutating ? (
                                                    <>
                                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                                        <span>{t("competition.adding")}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>{t("commission.addReplica")}</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {localReplicas.length === 0 && !isAddingReplica && (
                                    <p className="text-xs text-slate-400 text-center py-3">
                                        {t("commission.noReplicasYet")}
                                    </p>
                                )}

                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {[...localReplicas].sort((a, b) => (a.members?.length || 0) - (b.members?.length || 0)).map((r) => {
                                        const isSelected = r.id === selectedReplicaId
                                        const isUserReplica = r.members.some(m => currentAuid !== null && m.auid.includes(currentAuid))
                                        
                                        if (isEditingReplica && isSelected) {
                                            return (
                                                <div
                                                    key={r.id}
                                                    className="flex items-center justify-between rounded-2xl px-3 py-2 text-xs font-bold border border-indigo-300 bg-white shadow-sm w-full gap-2"
                                                >
                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            placeholder="Replica Name"
                                                            className="text-xs font-semibold text-slate-900 bg-slate-50 border border-indigo-300 focus:border-indigo-600 rounded-lg px-2.5 py-1 outline-none flex-1 min-w-0"
                                                            value={editReplicaName}
                                                            onChange={e => setEditReplicaName(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === "Enter") handleSaveReplica()
                                                                if (e.key === "Escape") setIsEditingReplica(false)
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveReplica}
                                                            disabled={isMutating}
                                                            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                                            title="Save"
                                                        >
                                                            {isMutating ? (
                                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                            ) : (
                                                                <Check className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsEditingReplica(false)}
                                                            disabled={isMutating}
                                                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                                            title="Cancel"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        return (
                                            <button
                                                key={r.id}
                                                onClick={() => {
                                                    setSelectedReplicaId(r.id)
                                                    setHasRedirected(false)
                                                }}
                                                className={`flex min-w-[220px] flex-1 items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all border text-left cursor-pointer ${
                                                    isSelected
                                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                                        : "bg-slate-50 hover:bg-slate-100 border-slate-200/60 text-slate-600 hover:text-slate-800"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{r.name}</span>
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase ${
                                                        isSelected
                                                            ? "bg-indigo-700/60 border-indigo-500 text-indigo-100"
                                                            : "bg-slate-150 border-slate-200 text-slate-500"
                                                    }`}>
                                                        {formatReplicaType(r.type)}
                                                    </span>
                                                    {isCompetitionHolder && isSelected && isCommissionDraft && r.status === "DRAFT" && (
                                                        <div
                                                            onClick={(e) => openEditReplica(e, r)}
                                                            className="p-1 rounded cursor-pointer transition-colors ml-1 hover:bg-white/20 text-white/70 hover:text-white"
                                                            title="Rename Replica"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isUserReplica && (
                                                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                                                            isSelected ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
                                                        }`}>
                                                            {t("commission.myTasting")}
                                                        </span>
                                                    )}
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                                                        r.status === "STARTED"
                                                            ? (isSelected ? "bg-emerald-400 text-indigo-950 font-extrabold" : "bg-emerald-500/10 text-emerald-600")
                                                            : r.status === "COMPLETED"
                                                                ? (isSelected ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-500")
                                                                : (isSelected ? "bg-amber-400 text-indigo-950" : "bg-amber-500/10 text-amber-600")
                                                    }`}>
                                                        {formatStatus(r.status)}
                                                    </span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <StatusSteps status={replicaStatus} />

                        <div id="commission-experts" className="scroll-mt-24 bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-indigo-500" />
                                        {t("commission.tastingPanel", { name: selectedReplicaName })}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {t("commission.tastingPanelSubtitle")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isCompetitionHolder && isCommissionDraft && isReplicaDraft && selectedReplica && (
                                        <button
                                            type="button"
                                            onClick={() => setIsAddMemberOpen(true)}
                                            className="flex items-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            <span>{t("commission.addExpert")}</span>
                                        </button>
                                    )}
                                    <span className="inline-flex items-center justify-center shrink-0 whitespace-nowrap text-xs font-semibold px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100 tabular-nums">
                                        {t("commission.readyCount", {
                                            ready: localMembers.filter(m => m.isReady).length,
                                            total: localMembers.length
                                        })}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {sortedMembers.map((p) => {
                                    const isMe = currentAuid !== null && p.auid.includes(currentAuid)
                                    return (
                                        <div key={p.id} className={`relative rounded-xl border p-4 shadow-sm flex items-center gap-3 transition-all duration-300 hover:shadow-md w-full ${
                                            isMe
                                                ? "border-indigo-200 bg-indigo-50/30 shadow-indigo-100/30 shadow-md"
                                                : "border-slate-100 bg-slate-50/30 hover:border-slate-200/50 hover:bg-slate-50/50"
                                        }`}>
                                            <MemberAvatar auid={p.auid} role={p.role} username={usernames[p.auid[0]]} className="h-10 w-10 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                                                        <span>{p.auid.map(id => usernames[id] || String(id)).join(", ")}</span>
                                                        {isMe && (
                                                            <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-xs uppercase tracking-wider">
                                                                {t("common.you")}
                                                            </span>
                                                        )}
                                                    </p>
                                                    {isCompetitionHolder && isCommissionDraft && isReplicaDraft && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMember(p.id)}
                                                            disabled={removingMemberId === p.id}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                                            title={t("commission.deleteExpert")}
                                                        >
                                                            {removingMemberId === p.id ? (
                                                                <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                                                            ) : (
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center">
                                                        {p.role === "HEAD" && (
                                                            <span className="bg-amber-500/10 text-amber-600 border border-amber-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                                <Crown className="w-3 h-3"/> {t("commission.roleHead")}
                                                            </span>
                                                        )}
                                                        {p.role === "TRAINEE_EXPERT" && (
                                                            <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                                <GraduationCap className="w-3 h-3"/> {t("commission.roleTrainee")}
                                                            </span>
                                                        )}
                                                        {p.role === "EXPERT" && (
                                                            <span className="bg-indigo-50/70 text-indigo-600 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                                {t("commission.roleExpert")}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                                        p.isReady ? "text-emerald-500" : "text-slate-400"
                                                    }`}>
                                                        {p.isReady ? (
                                                            <>
                                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                                <span>{t("commission.statusReady")}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-slate-300 animate-spin" style={{ animationDuration: '3s' }} />
                                                                <span>{t("commission.statusWaiting")}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {localMembers.length === 0 && (
                                    <p className="text-sm text-slate-400 text-center py-4">{t("commission.noMembers")}</p>
                                )}
                            </div>
                        </div>

                        {/* Panels and Wine Candidates Section */}
                        <div id="commission-samples" className="scroll-mt-24">
                            <PanelsSection
                                commissionId={localData.id}
                                panels={localData.panels || []}
                                candidates={localData.candidates || []}
                                isCompetitionHolder={isCompetitionHolder}
                                isDraft={isCommissionDraft}
                                isEnded={isCommissionCompleted}
                                usernames={usernames}
                                onRefresh={refreshCommissionData}
                            />
                        </div>
                    </div>

                    {/* Supporting details: important actions first, then reference and configuration. */}
                    <div className="w-full lg:col-span-5 flex flex-col gap-5">
                        <div className="order-[-2] flex items-center gap-3 px-1">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-600 border border-slate-200 shadow-sm">
                                <Settings className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-extrabold text-slate-800">{t("commission.detailsTitle")}</h2>
                                <p className="text-[11px] text-slate-500">{t("commission.detailsDesc")}</p>
                            </div>
                        </div>
                        <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${setupProgress === 100 ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
                                        <ClipboardCheck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-extrabold text-slate-800">{t("commission.setupReadiness")}</h3>
                                        <p className="mt-0.5 text-[11px] text-slate-500">{t("commission.setupReadinessDesc")}</p>
                                    </div>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${setupProgress === 100 ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}>
                                    {completedSetupChecks}/{setupChecks.length}
                                </span>
                            </div>
                            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full rounded-full transition-all duration-500 ${setupProgress === 100 ? "bg-emerald-500" : "bg-indigo-600"}`} style={{ width: `${setupProgress}%` }} />
                            </div>
                            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {setupChecks.map(check => (
                                    <button key={`${check.id}-${check.label}`} type="button" onClick={() => scrollToSection(check.id)} className="group flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/50">
                                        <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                            {check.complete ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" /> : <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />}
                                            {check.label}
                                        </span>
                                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Commission Settings Card */}
                        {isCompetitionHolder && (
                            <div id="commission-settings" className="scroll-mt-24 bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 flex flex-col gap-4">
                                <h3 className="text-sm font-bold tracking-tight text-slate-800 flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-indigo-500" />
                                    <span>{t("commission.evaluationSettings")}</span>
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Partial Candidate Evaluation */}
                                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex flex-col pr-4">
                                            <span className="text-xs font-bold text-slate-800">{t("commission.partialCandidateEvaluationSetting")}</span>
                                            <span className="text-[11px] text-slate-400 mt-0.5">{t("commission.partialCandidateEvaluationSettingDesc")}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleTogglePartialEvaluation}
                                            disabled={isMutating}
                                            role="switch"
                                            aria-checked={Boolean(localData.partialCandidateEvaluationEnabled)}
                                            aria-label={t("commission.partialCandidateEvaluationSetting")}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                                localData.partialCandidateEvaluationEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                                            }`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                localData.partialCandidateEvaluationEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* Wine Jumper Mini Game */}
                                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex flex-col pr-4">
                                            <span className="text-xs font-bold text-slate-800">{t("commission.wineJumperSetting")}</span>
                                            <span className="text-[11px] text-slate-400 mt-0.5">{t("commission.wineJumperSettingDesc")}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleToggleWineJumper}
                                            disabled={isMutating}
                                            role="switch"
                                            aria-checked={Boolean(localData.wineJumperMiniGameEnabled)}
                                            aria-label={t("commission.wineJumperSetting")}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                                localData.wineJumperMiniGameEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                                            }`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                localData.wineJumperMiniGameEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* Voice Comments */}
                                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex flex-col pr-4">
                                            <span className="text-xs font-bold text-slate-800">{t("commission.voiceCommentsSetting")}</span>
                                            <span className="text-[11px] text-slate-400 mt-0.5">{t("commission.voiceCommentsSettingDesc")}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleToggleVoiceComments}
                                            disabled={isMutating}
                                            role="switch"
                                            aria-checked={Boolean(localData.voiceCommentsEnabled)}
                                            aria-label={t("commission.voiceCommentsSetting")}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                                localData.voiceCommentsEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                                            }`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                localData.voiceCommentsEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* Property Text Comments */}
                                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex flex-col pr-4">
                                            <span className="text-xs font-bold text-slate-800">{t("commission.propertyCommentsSetting")}</span>
                                            <span className="text-[11px] text-slate-400 mt-0.5">{t("commission.propertyCommentsSettingDesc")}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleTogglePropertyComments}
                                            disabled={isMutating}
                                            role="switch"
                                            aria-checked={Boolean(localData.propertyCommentsEnabled)}
                                            aria-label={t("commission.propertyCommentsSetting")}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                                localData.propertyCommentsEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                                            }`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                localData.propertyCommentsEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* Beverage Origin Display */}
                                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex flex-col pr-4">
                                            <span className="text-xs font-bold text-slate-800">{t("commission.beverageOriginSetting")}</span>
                                            <span className="text-[11px] text-slate-400 mt-0.5">{t("commission.beverageOriginSettingDesc")}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleToggleBeverageOrigin}
                                            disabled={isMutating}
                                            role="switch"
                                            aria-checked={Boolean(localData.beverageOriginDuringEvaluationEnabled)}
                                            aria-label={t("commission.beverageOriginSetting")}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                                localData.beverageOriginDuringEvaluationEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                                            }`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                localData.beverageOriginDuringEvaluationEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Replica Settings Card */}
                        {isCompetitionHolder && selectedReplica && (
                            <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 flex flex-col gap-4">
                                <h3 className="text-sm font-bold tracking-tight text-slate-800 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-indigo-500" />
                                    <span>{t("commission.replicaSettings", { name: selectedReplica.name })}</span>
                                </h3>

                                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <div className="flex flex-col pr-4">
                                        <span className="text-xs font-bold text-slate-800">{t("commission.chaoticCandidateChangesTitle")}</span>
                                        <span className="text-[11px] text-slate-400 mt-0.5">{t("commission.chaoticCandidateChangesDesc")}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleToggleChaoticCandidateChanges}
                                        disabled={isMutating || !selectedReplica.currentPanelId}
                                        role="switch"
                                        aria-checked={Boolean(selectedReplica.replicaPanels.find(panel => panel.id === selectedReplica.currentPanelId)?.chaoticCurrentCandidateChangesEnabled)}
                                        aria-label={t("commission.chaoticCandidateChangesTitle")}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                            selectedReplica.replicaPanels.find(panel => panel.id === selectedReplica.currentPanelId)?.chaoticCurrentCandidateChangesEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                                        }`}
                                    >
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                            selectedReplica.replicaPanels.find(panel => panel.id === selectedReplica.currentPanelId)?.chaoticCurrentCandidateChangesEnabled ? 'translate-x-5' : 'translate-x-0'
                                        }`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <div className="flex flex-col pr-4">
                                        <span className="text-xs font-bold text-slate-800">{t("commission.chaoticPanelChangesTitle")}</span>
                                        <span className="text-[11px] text-slate-400 mt-0.5">{t("commission.chaoticPanelChangesDesc")}</span>
                                    </div>
                                    <button type="button" onClick={handleToggleChaoticPanelChanges} disabled={isMutating}
                                        role="switch" aria-checked={Boolean(selectedReplica.chaoticCurrentPanelChangesEnabled)} aria-label={t("commission.chaoticPanelChangesTitle")}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${selectedReplica.chaoticCurrentPanelChangesEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition ${selectedReplica.chaoticCurrentPanelChangesEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Evaluation Template Details */}
                        <div id="commission-templates" className="scroll-mt-24">
                            <EvaluationTemplatesBlock
                                commissionId={initialData.id}
                                templateEditions={initialData.templateEditions || []}
                                beverageTypesInCommission={beverageTypesInCommission}
                                isCompetitionHolder={isCompetitionHolder}
                                canEdit={initialData.status === "DRAFT" || initialData.status === "PLANNED"}
                                onRefresh={refreshData}
                            />
                        </div>

                        {/* Timeline and Dates */}
                        <div id="commission-timeline" className="scroll-mt-24 bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 animate-fade-in-slide">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold tracking-tight text-slate-800 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-500" />
                                    {t("commission.timelineDetails")}
                                </h3>
                                {isCompetitionHolder && isCommissionDraft && !initialData.startedAt && (
                                    isEditingDates ? (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={handleSaveDates}
                                                disabled={isMutating}
                                                className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                title="Save dates"
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
                                                onClick={() => setIsEditingDates(false)}
                                                disabled={isMutating}
                                                className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                                title="Cancel"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={openEditDates}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all shrink-0 cursor-pointer active:scale-95"
                                            title="Edit planned dates"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    )
                                )}
                            </div>

                            <div className="flex flex-col gap-4 relative pl-4 border-l border-slate-100 ml-2.5">
                                {/* Planned Start */}
                                <div className="relative">
                                    <div className="absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{t("commission.plannedStart")}</span>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                        {isEditingDates ? (
                                            <input
                                                type="datetime-local"
                                                className="text-xs font-semibold text-slate-800 bg-slate-50 border border-indigo-300 focus:border-indigo-600 rounded-lg px-2.5 py-1 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                                value={editDatesData.plannedStartAt}
                                                onChange={e => setEditDatesData({ ...editDatesData, plannedStartAt: e.target.value })}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") handleSaveDates()
                                                    if (e.key === "Escape") setIsEditingDates(false)
                                                }}
                                            />
                                        ) : (
                                            <p className="text-xs font-semibold text-slate-800">
                                                {formatDateTime(initialData.plannedStartAt)}
                                            </p>
                                        )}
                                        {!isEditingDates && selectedReplica?.status === "PLANNED" && initialData.plannedStartAt && (
                                            <a
                                                href={getGoogleCalendarUrl(initialData.name, initialData.plannedStartAt, initialData.plannedEndAt)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/40 rounded-md px-1.5 py-0.5 transition-colors"
                                            >
                                                {t("common.addToCalendar")}
                                            </a>
                                        )}
                                    </div>
                                </div>
                                {/* Planned End */}
                                {(initialData.plannedEndAt || isEditingDates) && (
                                    <div className="relative">
                                        <div className="absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white" />
                                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{t("commission.plannedEnd")}</span>
                                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                            {isEditingDates ? (
                                                <input
                                                    type="datetime-local"
                                                    className="text-xs font-semibold text-slate-800 bg-slate-50 border border-indigo-300 focus:border-indigo-600 rounded-lg px-2.5 py-1 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                                    value={editDatesData.plannedEndAt}
                                                    onChange={e => setEditDatesData({ ...editDatesData, plannedEndAt: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") handleSaveDates()
                                                        if (e.key === "Escape") setIsEditingDates(false)
                                                    }}
                                                />
                                            ) : (
                                                <p className="text-xs font-semibold text-slate-800">
                                                    {formatDateTime(initialData.plannedEndAt)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {/* Actual Start */}
                                <div className="relative">
                                    <div className={`absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                                        initialData.startedAt ? 'bg-emerald-500' : 'bg-slate-200'
                                    }`} />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{t("commission.actualStart")}</span>
                                    <p className={`text-xs font-semibold mt-0.5 ${initialData.startedAt ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {initialData.startedAt ? formatDateTime(initialData.startedAt) : t("commission.notStartedYet")}
                                    </p>
                                </div>
                                {/* Actual End */}
                                <div className="relative">
                                    <div className={`absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                                        initialData.endedAt ? 'bg-rose-500' : 'bg-slate-200'
                                    }`} />
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{t("commission.actualEnd")}</span>
                                    <p className={`text-xs font-semibold mt-0.5 ${initialData.endedAt ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {initialData.endedAt ? formatDateTime(initialData.endedAt) : t("commission.notCompletedYet")}
                                    </p>
                                </div>
                            </div>
                        </div>


                        <style>{`
                            @keyframes fadeInSlide {
                                from {
                                    opacity: 0;
                                    transform: translateY(4px)                                 }
                                to {
                                    opacity: 1;
                                    transform: translateY(0);
                                }
                            }
                            .animate-fade-in-slide {
                                animation: fadeInSlide 0.25s ease-out forwards;
                            }
                        `}</style>
                    </div>

                </div>
            </main>

            {/* Add Member Modal */}
            <AddMemberModal
                isOpen={isAddMemberOpen}
                onClose={() => setIsAddMemberOpen(false)}
                replicaId={selectedReplica?.id || ""}
                replicaName={selectedReplicaName}
                onMemberAdded={refreshCommissionData}
            />
        </div>
    )
}
