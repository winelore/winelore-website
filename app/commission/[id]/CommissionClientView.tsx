"use client"

import React, {useState, useEffect, useRef, useMemo, useCallback} from "react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import {
    FileText, Trophy, Wine, User, Layers, PlayCircle, Crown, GraduationCap,
    CheckCircle, AlertCircle, Users, Timer, Check, Calendar, Pencil, Plus, X, Save,
    Loader2, Search, Filter, ChevronRight
} from "lucide-react"
import { AppHeader, type AppTabId } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
import {
    markMemberReadyAction,
    markMemberNotReadyAction,
    startCommissionAction,
    getCommissionDataAction,
    renameCommissionAction,
    updateCommissionDatesAction,
    createCommissionReplicaAction,
    renameCommissionReplicaAction,
    setCommissionTemplateAction
} from "../actions"
import { isReplicaCandidateFinished } from "../replicaUtils"
import { getEvaluationTemplatesAction } from "@/app/templates/actions"

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
        <div className="w-full bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {steps.map((step, idx) => {
                    const isCompleted = idx < currentStepIdx
                    const isActive = idx === currentStepIdx

                    return (
                        <React.Fragment key={step.id}>
                            <div className="flex items-center gap-3 flex-1">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold transition-all duration-350 shrink-0 ${
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
                                    <p className="text-[10px] text-slate-400">{step.description}</p>
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
    competition: {
        id: string;
        name: string;
        holders: number[];
        evaluationTemplateEdition?: any;
    };
    templateEditions?: TemplateEditionLink[];
    replicas: Replica[];
    members: Member[];
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

    const handleOpenCatalog = async (bevType?: BeverageType) => {
        setSelectedBeverageType(bevType || null)
        setSearchQuery("")
        setIsModalOpen(true)
        setIsCatalogLoading(true)
        try {
            const data = await getEvaluationTemplatesAction()
            // Якщо натиснули на конкретну картку - фільтруємо по ній, якщо на загальну кнопку - показуємо ВСІ
            const filtered = bevType
                ? data.templates.filter((t: any) =>
                    t.beverageTypeId === bevType.id ||
                    t.beverageType?.id === bevType.id ||
                    t.beverageType === bevType.id
                )
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

                {/* НОВА ЗАГАЛЬНА КНОПКА "+ ASSIGN TEMPLATE" */}
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
                                        <span className="text-sm font-extrabold text-slate-800">{te.template?.name || "Standard Template"}</span>
                                        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                                            <span className="bg-white border px-1.5 rounded-sm">v{te.version}</span>
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
                            ) : filteredCatalog.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                    <FileText className="w-10 h-10 mb-2 opacity-50" />
                                    <span className="text-sm font-bold">{t("commission.noTemplatesFound" as any) || "No templates found"}</span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {filteredCatalog.map(template => {
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
                                                            onClick={() => {
                                                                const targetBevId = template.beverageTypeId || template.beverageType?.id || selectedBeverageType?.id;

                                                                if (!targetBevId) {
                                                                    alert("Помилка: Неможливо визначити тип напою для цього шаблону.");
                                                                    return;
                                                                }

                                                                handleAssignTemplate(ed.id, targetBevId);
                                                            }}
                                                            disabled={isAssigning}
                                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                                                        >
                                                            {isAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (t("commission.applyTemplate" as any) || "Apply")}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Preview (Expanded View) */}
                                                {isExpanded && ed.categories && (
                                                    <div className="p-4 bg-slate-50 border-t border-slate-100 max-h-[250px] overflow-y-auto text-xs">
                                                        <p className="font-bold text-slate-400 mb-3 uppercase tracking-wider text-[9px]">{t("commission.templatePreview" as any) || "Structure Preview"}</p>
                                                        <div className="flex flex-col gap-3">
                                                            {ed.categories.map((cat: any) => (
                                                                <div key={cat.id} className="bg-white border border-slate-200 rounded-xl p-3">
                                                                    <p className="font-bold text-slate-700 mb-2 border-b pb-1">{cat.name}</p>
                                                                    <div className="flex flex-col gap-1.5">
                                                                        {cat.properties?.map((prop: any) => (
                                                                            <div key={prop.id || prop.code} className="flex justify-between items-center bg-slate-50 rounded-lg px-2.5 py-1.5">
                                                                                <span className="font-medium text-slate-600 truncate mr-2">{prop.name}</span>
                                                                                <span className="text-[9px] font-bold text-slate-400 bg-white border px-1.5 rounded uppercase">{prop.type}</span>
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

    // Detect user's active replica
    const activeReplica = localReplicas.find(r =>
        r.members.some(m => currentAuid !== null && m.auid.includes(currentAuid))
    ) || localReplicas.find(r => r.type === "STANDARD") || localReplicas[0] || null

    const [selectedReplicaId, setSelectedReplicaId] = useState<string | null>(activeReplica?.id || null)

    const selectedReplica = localReplicas.find(r => r.id === selectedReplicaId) || activeReplica
    const localMembers = selectedReplica ? selectedReplica.members : []

    // Fetch usernames for panel members and competition creators/holders
    const allMemberAuids = useMemo(() => {
        const memberIds = localMembers.flatMap(m => m.auid);
        const holderIds = initialData.competition.holders || [];
        return Array.from(new Set([...memberIds, ...holderIds]));
    }, [localMembers, initialData.competition.holders])
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

    const isHolder = currentAuid !== null && initialData.competition.holders.includes(currentAuid)

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

    const handleStartCommission = async () => {
        if (!selectedReplica || isMutating) return
        setIsMutating(true)
        try {
            await startCommissionAction(selectedReplica.id)
            router.push(`/commission/${initialData.id}/replica/${selectedReplica.id}/evaluation`)
            router.refresh()
        } catch (err) {
            console.error("Failed to start replica tasting session:", err)
        } finally {
            setIsMutating(false)
        }
    }

    const isEveryoneReady = localMembers.every(m => m.isReady)
    const myStatus = localMembers.find(m => currentAuid !== null && m.auid.includes(currentAuid))
    const amIReady = myStatus?.isReady || false
    const isPreStart = selectedReplica?.status !== "STARTED" && selectedReplica?.status !== "COMPLETED"
    const nonReadyCount = localMembers.filter(m => !m.isReady).length

    const sortedMembers = [...localMembers].sort((a, b) => {
        const roleOrder = { HEAD: 1, EXPERT: 2, TRAINEE_EXPERT: 3 }
        return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99)
    })

    const replicaStatus = selectedReplica?.status || "DRAFT"
    const selectedReplicaName = selectedReplica?.name || t("common.standard")
    const isCommissionCompleted = initialData.status === "COMPLETED"
    const isCompetitionHolder = currentAuid !== null && initialData.competition.holders.includes(currentAuid)
    const showResultsBanner = isCompetitionHolder
    const isUserReplicaMember = selectedReplica?.members.some(
        (m) => currentAuid !== null && m.auid.includes(currentAuid),
    ) ?? false
    const myReplica = localReplicas.find((r) =>
        r.members.some((m) => currentAuid !== null && m.auid.includes(currentAuid)),
    ) ?? null
    const allCandidatesEvaluated =
        (selectedReplica?.replicaCandidates?.length ?? 0) > 0 &&
        selectedReplica!.replicaCandidates.every((rc) => isReplicaCandidateFinished(rc.status))
    const selectedReplicaReadyForSummary =
        isUserReplicaMember &&
        selectedReplica &&
        (replicaStatus === "COMPLETED" || allCandidatesEvaluated)
    const myReplicaReadyForSummary =
        myReplica?.status === "COMPLETED" ||
        ((myReplica?.replicaCandidates?.length ?? 0) > 0 &&
            myReplica!.replicaCandidates.every((rc) => isReplicaCandidateFinished(rc.status)))
    const summaryReplica = selectedReplicaReadyForSummary
        ? selectedReplica
        : myReplicaReadyForSummary
            ? myReplica
            : null
    const showMyTastingSummary = summaryReplica != null

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="competitions" />

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                {showMyTastingSummary && (
                    <div className="w-full max-w-7xl mb-6 flex items-center justify-between gap-4 rounded-2xl px-6 py-4 shadow-sm border bg-indigo-50 border-indigo-200">
                        <div className="flex items-center gap-3">
                            <Wine className="w-5 h-5 text-indigo-600 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-indigo-900">
                                    {t("commission.myRankingTitle")}
                                </p>
                                <p className="text-xs mt-0.5 text-indigo-600">
                                    {t("commission.myRankingDesc")}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push(`/commission/${localData.id}/replica/${summaryReplica!.id}/summary`)}
                            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                            <Wine className="w-4 h-4" />
                            {t("commission.viewMyTastingSummary")}
                        </button>
                    </div>
                )}
                {showResultsBanner && (
                    <div className={`w-full max-w-7xl mb-6 flex items-center justify-between gap-4 rounded-2xl px-6 py-4 shadow-sm border ${
                        isCommissionCompleted
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-indigo-50 border-indigo-200"
                    }`}>
                        <div className="flex items-center gap-3">
                            {isCommissionCompleted ? (
                                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                            ) : (
                                <Trophy className="w-5 h-5 text-indigo-600 shrink-0" />
                            )}
                            <div>
                                <p className={`text-sm font-bold ${isCommissionCompleted ? "text-emerald-800" : "text-indigo-900"}`}>
                                    {isCommissionCompleted
                                        ? t("commission.sessionCompleted")
                                        : t("commission.resultsBannerTitle")}
                                </p>
                                <p className={`text-xs mt-0.5 ${isCommissionCompleted ? "text-emerald-600" : "text-indigo-600"}`}>
                                    {isCommissionCompleted
                                        ? t("commission.allCandidatesEvaluatedDesc")
                                        : t("commission.resultsBannerDesc")}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push(`/commission/${localData.id}/results`)}
                            className={`shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer ${
                                isCommissionCompleted
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "bg-indigo-600 hover:bg-indigo-700"
                            }`}
                        >
                            <Trophy className="w-4 h-4" />
                            {t("commission.continueToResults")}
                        </button>
                    </div>
                )}
                <div className="w-full max-w-7xl flex flex-col lg:flex-row items-start gap-8">

                    {/* Left Column: Replicas, Stepper and Tasting Panel */}
                    <div className="w-full lg:w-[45%] flex flex-col gap-6">

                        {/* Replica Selector Tabs */}
                        {(localReplicas.length > 0 || isCompetitionHolder) && (
                            <div className="bg-white border border-slate-100 rounded-[32px] p-5 shadow-xl shadow-slate-200/50">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Layers className="w-4 h-4 text-indigo-500" />
                                        {t("commission.tastingReplicas")}
                                    </h3>
                                    {isCompetitionHolder && !isAddingReplica && (
                                        <button
                                            onClick={openAddReplica}
                                            disabled={isMutating}
                                            className="flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add Replica</span>
                                        </button>
                                    )}
                                </div>

                                {isAddingReplica && (
                                    <div className="mb-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-800">Add Tasting Replica</span>
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingReplica(false)}
                                                className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Name (optional)</label>
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
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</label>
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
                                                        {type}
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
                                                Cancel
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
                                                        <span>Adding...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>Add Replica</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {localReplicas.length === 0 && !isAddingReplica && (
                                    <p className="text-xs text-slate-400 text-center py-3">
                                        No replicas yet. Add one to get started.
                                    </p>
                                )}

                                <div className="flex flex-col gap-2">
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
                                                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition-all border text-left cursor-pointer w-full ${
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
                                                    {isCompetitionHolder && isSelected && (
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

                        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50">
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
                                <span className="inline-flex items-center justify-center shrink-0 whitespace-nowrap text-xs font-semibold px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100 tabular-nums">
                                    {t("commission.readyCount", {
                                        ready: localMembers.filter(m => m.isReady).length,
                                        total: localMembers.length
                                    })}
                                </span>
                            </div>

                            <div className="flex flex-col gap-3">
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
                    </div>

                    {/* Right Column: Actions & Session Details */}
                    <div className="w-full lg:w-[55%] flex flex-col gap-6">
                        <div className="relative overflow-hidden bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50">
                            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-indigo-50/20 blur-3xl pointer-events-none" />

                            <div className="flex items-start gap-4 mb-6">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                                    <Wine className="h-8 w-8" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-xs font-bold tracking-widest uppercase text-slate-400">
                                        {t("commission.session")}
                                    </span>
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
                                                title="Save"
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
                                                title="Cancel"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight truncate">
                                                {initialData.name}
                                            </h2>
                                            {isCompetitionHolder && (
                                                <button
                                                    onClick={openEditName}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all shrink-0 cursor-pointer active:scale-95"
                                                    title="Edit commission name"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-sm mt-1.5 flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            replicaStatus === "STARTED"
                                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                                : replicaStatus === "COMPLETED"
                                                    ? "bg-slate-100 text-slate-500 border border-slate-200"
                                                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                        }`}>
                                            {replicaStatus === "STARTED" && (
                                                <span className="relative flex h-2 w-2 mr-1">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                            )}
                                            {formatStatus(replicaStatus)}
                                        </span>
                                        {timeDisplay && (
                                            <>
                                                <span className="text-slate-300">|</span>
                                                <span className="text-slate-500 font-semibold flex items-center gap-1 text-xs">
                                                    <Timer className="w-3.5 h-3.5 text-indigo-500" />
                                                    {timeDisplay}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                                <div className="flex items-start gap-3 bg-slate-50/60 border border-slate-100 rounded-2xl p-4 hover:border-indigo-100 transition-colors">
                                    <Trophy className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                            {t("commission.competition")}
                                        </h4>
                                        <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                                            {initialData.competition.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-slate-50/60 border border-slate-100 rounded-2xl p-4 hover:border-indigo-100 transition-colors">
                                    <User className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                            {t("commission.holders")}
                                        </h4>
                                        <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate" title={creatorNames}>
                                            {creatorNames}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4 mt-4">
                                <Layers className="h-5 w-5 text-indigo-500 shrink-0" />
                                <span className="text-sm text-slate-500 font-medium">
                                    {tCount("commission.replicaBeverages", selectedReplica?.candidateCount || 0)}
                                </span>
                            </div>
                        </div>

                        {/* Evaluation Template Details */}
                        <EvaluationTemplatesBlock
                            commissionId={initialData.id}
                            templateEditions={initialData.templateEditions || []}
                            beverageTypesInCommission={beverageTypesInCommission}
                            isCompetitionHolder={isCompetitionHolder}
                            canEdit={initialData.status === "DRAFT" || initialData.status === "PLANNED"}
                            onRefresh={refreshData}
                        />

                        {/* Timeline and Dates */}
                        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 animate-fade-in-slide">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold tracking-tight text-slate-800 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-500" />
                                    {t("commission.timelineDetails")}
                                </h3>
                                {isCompetitionHolder && (
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

                        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                                {t("commission.actionsControls")}
                            </h3>

                            <div className="flex flex-col gap-6">
                                {isPreStart && currentUserRole && (
                                    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/60 border border-slate-100 flex-wrap sm:flex-nowrap">
                                        <div className="max-w-full sm:max-w-[65%]">
                                            <h4 className="text-sm font-bold text-slate-800">
                                                {t("commission.yourReadiness")}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {t("commission.readinessDescription")}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleToggleReady(!amIReady)}
                                            disabled={isMutating}
                                            className={`group flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-xs cursor-pointer shrink-0 ${
                                                amIReady
                                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/15"
                                            }`}
                                        >
                                            {isMutating ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                            ) : amIReady ? (
                                                <>
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span>{t("commission.ready")}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <PlayCircle className="h-4 w-4" />
                                                    <span>{t("commission.markReady")}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {currentUserRole === "HEAD" && (
                                    <div className="border-t border-slate-100 pt-6">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                                            {t("commission.headTools", { name: selectedReplicaName })}
                                        </h4>

                                        {isPreStart && (
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <button
                                                        onClick={handleStartCommission}
                                                        disabled={!isEveryoneReady || isMutating}
                                                        className={`group flex items-center gap-2.5 rounded-xl px-8 py-3 text-sm font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${
                                                            isEveryoneReady
                                                                ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25"
                                                                : "bg-slate-100 text-slate-400 border border-slate-200"
                                                        }`}
                                                    >
                                                        {isMutating ? (
                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                                        ) : (
                                                            <PlayCircle className="h-5 w-5" />
                                                        )}
                                                        <span>{t("commission.startTasting")}</span>
                                                    </button>

                                                    {!isEveryoneReady && (
                                                        <span className="text-xs text-slate-500 font-medium animate-fade-in-slide">
                                                            {tCount("commission.waitingMembers", nonReadyCount)}
                                                        </span>
                                                    )}
                                                    {isEveryoneReady && (
                                                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 animate-pulse">
                                                            <Check className="w-4 h-4 shrink-0" />
                                                            {t("commission.everyoneReady")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                )}

                                {replicaStatus === "COMPLETED" && (
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-emerald-800">
                                                {t("commission.sessionCompleted")}
                                            </h4>
                                            <p className="text-xs text-emerald-600/90 mt-1">
                                                {t("commission.sessionCompletedDesc")}
                                            </p>
                                            {isCompetitionHolder && (
                                                <button
                                                    onClick={() => router.push(`/commission/${localData.id}/results`)}
                                                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                                                >
                                                    <Trophy className="w-3.5 h-3.5" />
                                                    {t("commission.viewResults")}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {replicaStatus === "STARTED" && currentUserRole && (
                                    <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/50 flex flex-col gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="relative flex h-3 w-3 mt-1.5 shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-indigo-800">
                                                    {t("commission.tastingActive")}
                                                </h4>
                                                <p className="text-xs text-slate-600 mt-1">
                                                    {t("commission.tastingActiveDesc")}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedReplica?.currentCandidateId && (() => {
                                            const currentCandidateObj = selectedReplica.replicaCandidates.find(rc => rc.id === selectedReplica.currentCandidateId);
                                            const code = currentCandidateObj?.candidate?.anonymizedCode;
                                            return (
                                                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                                                    <span>{t("commission.currentCandidate", { code: code || t("common.na") })}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono font-normal">({selectedReplica.currentCandidateId})</span>
                                                </p>
                                            );
                                        })()}
                                        <button
                                            onClick={() => router.push(`/commission/${localData.id}/replica/${selectedReplica.id}/evaluation`)}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
                                        >
                                            {t("commission.enterTastingSession")} →
                                        </button>
                                    </div>
                                )}

                                {isPreStart && currentUserRole !== "HEAD" && (
                                    <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 flex items-start gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse mt-1.5 shrink-0" />
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">
                                                {t("commission.waitingStart")}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {t("commission.waitingStartDesc")}
                                            </p>
                                        </div>
                                    </div>
                                )}
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
        </div>
    )
}