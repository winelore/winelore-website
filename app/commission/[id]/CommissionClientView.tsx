"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { toast } from "sonner"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import {
    Trophy, Wine, Layers, PlayCircle, CheckCircle, AlertCircle, Users, Check,
    Sliders, Send, ArrowRight,
} from "lucide-react"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
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
} from "../actions"
import { AddMemberModal } from "./components/AddMemberModal"
import { PanelsSection, type CommissionPanel, type Candidate } from "./components/PanelsSection"
import { EvaluationTemplatesBlock, type BeverageType, type TemplateEditionLink } from "./components/EvaluationTemplatesBlock"
import { ReplicaSelector } from "./components/ReplicaSelector"
import { PanelMembers } from "./components/PanelMembers"
import {
    ActionButton,
    ActionRow,
    DetailPageHeader,
    MetaTile,
    ScheduleTimeline,
    SectionCard,
    SettingsGroup,
    StatusPill,
    StatusStepper,
    useScrolledPast,
    type ToggleSpec,
} from "@/components/detail"

/** Google Calendar "add event" link for the commission's planned window. */
function getGoogleCalendarUrl(name: string, plannedStartAt: string, plannedEndAt: string | null): string {
    const start = new Date(plannedStartAt)
    const end = plannedEndAt ? new Date(plannedEndAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const formatToGCal = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "")

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(name)}&dates=${formatToGCal(start)}/${formatToGCal(end)}`
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

/** Banner above the fold — "the thing you came back for is ready". */
function CalloutBanner({
    tone,
    icon: Icon,
    title,
    description,
    action,
}: {
    tone: "indigo" | "emerald"
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
    action: React.ReactNode
}) {
    const styles = tone === "emerald"
        ? { wrap: "border-emerald-200 bg-emerald-50", icon: "text-emerald-600", title: "text-emerald-900", desc: "text-emerald-700" }
        : { wrap: "border-indigo-200 bg-indigo-50", icon: "text-indigo-600", title: "text-indigo-900", desc: "text-indigo-700" }

    return (
        <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 ${styles.wrap}`}>
            <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 shrink-0 ${styles.icon}`} />
                <div className="min-w-0">
                    <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>
                    <p className={`mt-0.5 text-xs ${styles.desc}`}>{description}</p>
                </div>
            </div>
            <div className="shrink-0">{action}</div>
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
    const { t, tCount } = useTranslation()
    const router = useRouter()
    const [localData, setLocalData] = useState<InitialData>(propInitialData)
    const [localReplicas, setLocalReplicas] = useState<Replica[]>(propInitialData.replicas || [])
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
    const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
    const [timeDisplay, setTimeDisplay] = useState<string>("")
    const [currentAuid, setCurrentAuid] = useState<number | null>(serverAuid || null)
    const [hasRedirected, setHasRedirected] = useState(false)

    // Scoped pending flags. The page used to share one `isMutating` across every
    // control, so flipping a setting disabled the start button and vice versa.
    const [isSavingName, setIsSavingName] = useState(false)
    const [isSubmittingReview, setIsSubmittingReview] = useState(false)
    const [isStarting, setIsStarting] = useState(false)
    const [isTogglingReady, setIsTogglingReady] = useState(false)

    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
    const [memberPendingRemoval, setMemberPendingRemoval] = useState<string | null>(null)
    const initialData = localData

    // The header CTA only appears once the actions card has scrolled away.
    const [actionsRef, actionsScrolledPast] = useScrolledPast<HTMLDivElement>()

    const beverageTypesInCommission = useMemo(() => {
        const typesMap = new Map<string, BeverageType>()

        // Types from templates that are already assigned, so they still show up
        // before any beverage has been added.
        if (initialData.templateEditions) {
            initialData.templateEditions.forEach(te => {
                if (te.beverageType) typesMap.set(te.beverageType.id, te.beverageType)
            })
        }

        // Plus the types of the beverages actually in the commission.
        localData.replicas.forEach(r => {
            r.replicaCandidates.forEach(rc => {
                if (rc.candidate?.beverageType) {
                    typesMap.set(rc.candidate.beverageType.id, rc.candidate.beverageType)
                }
            })
        })
        return Array.from(typesMap.values())
    }, [localData.replicas, initialData.templateEditions])

    const refreshCommissionData = useCallback(async () => {
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
    }, [localData.id])

    // Detect user's active replica
    const activeReplica = localReplicas.find(r =>
        r.members.some(m => currentAuid !== null && m.auid.includes(currentAuid))
    ) || localReplicas.find(r => r.type === "STANDARD") || localReplicas[0] || null

    const [selectedReplicaId, setSelectedReplicaId] = useState<string | null>(activeReplica?.id || null)

    const selectedReplica = localReplicas.find(r => r.id === selectedReplicaId) || activeReplica
    const localMembers = selectedReplica ? selectedReplica.members : []

    const handleRemoveMember = async (memberId: string) => {
        if (!selectedReplica) return
        setMemberPendingRemoval(null)
        setRemovingMemberId(memberId)
        try {
            const res = await removeCommissionReplicaMemberAction(selectedReplica.id, memberId)
            if (res.success) {
                await refreshCommissionData()
            } else {
                toast.error(res.error || t("commission.removeMemberError"))
            }
        } catch (err: any) {
            toast.error(err.message || t("commission.removeMemberErrorGeneric"))
        } finally {
            setRemovingMemberId(null)
        }
    }

    const handleSaveName = async (nextName: string) => {
        const trimmed = nextName.trim()
        if (!trimmed) {
            toast.error(t("common.errorNameEmpty"))
            throw new Error("empty name")
        }
        setIsSavingName(true)
        try {
            const res = await renameCommissionAction(initialData.id, trimmed)
            if (res.success) {
                setLocalData(prev => ({ ...prev, name: trimmed }))
                router.refresh()
            } else {
                toast.error(res.error || t("common.errorSaveFailed"))
                throw new Error(res.error || "save failed")
            }
        } finally {
            setIsSavingName(false)
        }
    }

    const handleSaveDates = async (startIso: string | null, endIso: string | null) => {
        try {
            const res = await updateCommissionDatesAction(initialData.id, startIso, endIso)
            if (res.success) {
                router.refresh()
                return true
            }
            toast.error(res.error || t("common.errorSaveFailed"))
            return false
        } catch (err: any) {
            toast.error(err?.message || t("common.errorGeneric"))
            return false
        }
    }

    const handleAddReplica = async (name: string | undefined, type: "STANDARD" | "TRAINEE") => {
        try {
            const res = await createCommissionReplicaAction({ commissionId: initialData.id, name, type })
            if (res.success) {
                router.refresh()
                return true
            }
            toast.error(res.error || t("common.errorGeneric"))
            return false
        } catch (err: any) {
            toast.error(err?.message || t("common.errorGeneric"))
            return false
        }
    }

    const handleRenameReplica = async (replicaId: string, name: string | undefined) => {
        try {
            const res = await renameCommissionReplicaAction(replicaId, name)
            if (res.success) {
                router.refresh()
                return true
            }
            toast.error(res.error || t("common.errorSaveFailed"))
            return false
        } catch (err: any) {
            toast.error(err?.message || t("common.errorGeneric"))
            return false
        }
    }

    /**
     * Commission-level switches all follow the same shape: call the action, keep
     * the new value on success, leave the old one in place (and explain) on
     * failure so `SettingToggle` rolls its optimistic state back.
     */
    const makeCommissionToggle = (
        action: (id: string, next: boolean) => Promise<{ success: boolean; error?: string }>,
        field: keyof InitialData,
    ) => async (next: boolean) => {
        try {
            const res = await action(localData.id, next)
            if (res.success) {
                setLocalData(prev => ({ ...prev, [field]: next }))
            } else {
                toast.error(res.error || t("common.errorSaveFailed"))
            }
        } catch (err: any) {
            toast.error(err?.message || t("common.errorGeneric"))
        }
    }

    const handleToggleChaoticCandidateChanges = async (next: boolean) => {
        if (!selectedReplica) return
        const activePanel = selectedReplica.replicaPanels.find(panel => panel.id === selectedReplica.currentPanelId)
        if (!activePanel) return
        try {
            const res = await setCommissionReplicaPanelChaoticCurrentCandidateChangesEnabledAction(selectedReplica.id, activePanel.id, next)
            if (res.success) {
                setLocalReplicas(prev => prev.map(r => r.id === selectedReplica.id ? {
                    ...r,
                    replicaPanels: r.replicaPanels.map(panel => panel.id === activePanel.id ? { ...panel, chaoticCurrentCandidateChangesEnabled: next } : panel),
                } : r))
            } else {
                toast.error(res.error || t("common.errorSaveFailed"))
            }
        } catch (err: any) {
            toast.error(err?.message || t("common.errorGeneric"))
        }
    }

    const handleToggleChaoticPanelChanges = async (next: boolean) => {
        if (!selectedReplica) return
        try {
            const res = await setCommissionReplicaChaoticCurrentPanelChangesEnabledAction(selectedReplica.id, next)
            if (res.success) {
                setLocalReplicas(prev => prev.map(r => r.id === selectedReplica.id ? { ...r, chaoticCurrentPanelChangesEnabled: next } : r))
            } else {
                toast.error(res.error || t("common.errorSaveFailed"))
            }
        } catch (err: any) {
            toast.error(err?.message || t("common.errorGeneric"))
        }
    }

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
                const diff = Math.max(0, Date.now() - new Date(initialData.startedAt).getTime())
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                setTimeDisplay(hours > 0
                    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
            } else if (initialData.status === "COMPLETED" && initialData.startedAt && initialData.endedAt) {
                const diff = Math.max(0, new Date(initialData.endedAt).getTime() - new Date(initialData.startedAt).getTime())
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                setTimeDisplay(hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes }))
            } else if (initialData.status === "PLANNED" && initialData.plannedStartAt) {
                const diff = new Date(initialData.plannedStartAt).getTime() - Date.now()

                if (diff <= 0) {
                    setTimeDisplay(t("time.startingSoon"))
                } else {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                    setTimeDisplay(days > 0
                        ? t("time.inDaysHours", { days, hours })
                        : t("time.inHoursMinutes", { hours, minutes }))
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
    }, [initialData.status, initialData.startedAt, initialData.plannedStartAt, initialData.endedAt, t])

    useEffect(() => {
        let isMounted = true
        let isFetching = false

        const pollInterval = setInterval(async () => {
            // Skip the round trip while the tab is in the background.
            if (!isMounted || isFetching || document.visibilityState !== "visible") return
            isFetching = true
            try {
                const updated = await getCommissionDataAction(localData.id)
                if (isMounted && updated) {
                    setLocalData(updated)
                    if (updated.replicas) {
                        setLocalReplicas(updated.replicas)
                    }
                }
            } catch (err) {
                console.error("Failed to poll commission data:", err)
            } finally {
                isFetching = false
            }
        }, 3000)

        return () => {
            isMounted = false
            clearInterval(pollInterval)
        }
    }, [localData.id])

    const handleToggleReady = async (shouldBeReady: boolean) => {
        if (!selectedReplica || !currentMemberId || isTogglingReady) return
        setIsTogglingReady(true)

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
            toast.error(t("common.errorGeneric"))
        } finally {
            setIsTogglingReady(false)
        }
    }

    const candidateCount = (localData.candidates?.length ?? localData.candidateCount ?? 0)
    const hasCandidates = candidateCount > 0
    const hasMembers = localMembers.length > 0
    const isEveryoneReady = hasMembers && localMembers.every(m => m.isReady)
    const myStatus = localMembers.find(m => currentAuid !== null && m.auid.includes(currentAuid))
    const amIReady = myStatus?.isReady || false
    const isPreStart = selectedReplica?.status !== "STARTED" && selectedReplica?.status !== "COMPLETED"
    const nonReadyCount = localMembers.filter(m => !m.isReady).length

    const currentCommissionStatus = localData.status || initialData.status
    const competitionResultsHref = `/competition/${localData.competition.id}/results?commission=${localData.id}`
    const replicaStatus = selectedReplica?.status || "DRAFT"
    const isReplicaDraft = replicaStatus === "DRAFT"
    const isCommissionDraft = currentCommissionStatus === "DRAFT"
    const selectedReplicaName = selectedReplica?.name || t("common.standard")
    const isCommissionCompleted = currentCommissionStatus === "COMPLETED"
    const isCompetitionHolder = currentAuid !== null && (localData.competition?.holders || initialData.competition?.holders || []).includes(currentAuid)
    const completedUserReplica = localReplicas.find(
        (replica) =>
            replica.status === "COMPLETED" &&
            replica.members.some(
                (member) => currentAuid !== null && member.auid.includes(currentAuid),
            ),
    ) ?? null
    const showResultsBanner = isCompetitionHolder || completedUserReplica !== null
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

    const handleStartCommission = async () => {
        if (!selectedReplica || isStarting) return
        if (!hasCandidates) {
            toast.error(t("commission.startTastingNoSamplesError"))
            return
        }
        if (!hasMembers) {
            toast.error(t("commission.startTastingNoExpertsError"))
            return
        }
        setIsStarting(true)
        try {
            await startCommissionAction(selectedReplica.id, localData.id)
            router.push(`/commission/${localData.id}/replica/${selectedReplica.id}/evaluation`)
            router.refresh()
        } catch (err: any) {
            console.error("Failed to start replica tasting session:", err)
            if (err.message === "NO_CANDIDATES_TO_START") {
                toast.error(t("commission.startTastingNoSamplesError"))
            } else {
                toast.error(t("commission.startTastingErrorGeneric"))
            }
        } finally {
            setIsStarting(false)
        }
    }

    const handleSubmitForReview = async () => {
        if (isSubmittingReview || !isCommissionDraft) return
        setIsSubmittingReview(true)
        try {
            await submitCommissionForReviewAction(localData.id)
            await refreshCommissionData()
            router.refresh()
        } catch (err: any) {
            console.error("Failed to submit commission for review:", err)
            toast.error(err.message || t("commission.submitReviewError"))
        } finally {
            setIsSubmittingReview(false)
        }
    }

    const steps = useMemo(() => [
        { id: "readying", label: t("commission.stepReadying"), description: t("commission.stepReadyingDesc") },
        { id: "tasting", label: t("commission.stepTasting"), description: t("commission.stepTastingDesc") },
        { id: "completed", label: t("commission.stepCompleted"), description: t("commission.stepCompletedDesc") },
    ], [t])

    const currentStepIdx = replicaStatus === "COMPLETED" ? 2 : replicaStatus === "STARTED" ? 1 : 0

    const activePanel = selectedReplica?.replicaPanels.find(panel => panel.id === selectedReplica.currentPanelId)

    const commissionToggles: ToggleSpec[] = [
        {
            id: "partial",
            label: t("commission.partialCandidateEvaluationSetting"),
            description: t("commission.partialCandidateEvaluationSettingDesc"),
            checked: Boolean(localData.partialCandidateEvaluationEnabled),
            onToggle: makeCommissionToggle(setCommissionPartialCandidateEvaluationEnabledAction, "partialCandidateEvaluationEnabled"),
        },
        {
            id: "wineJumper",
            label: t("commission.wineJumperSetting"),
            description: t("commission.wineJumperSettingDesc"),
            checked: Boolean(localData.wineJumperMiniGameEnabled),
            onToggle: makeCommissionToggle(setCommissionWineJumperMiniGameEnabledAction, "wineJumperMiniGameEnabled"),
        },
        {
            id: "voiceComments",
            label: t("commission.voiceCommentsSetting"),
            description: t("commission.voiceCommentsSettingDesc"),
            checked: Boolean(localData.voiceCommentsEnabled),
            onToggle: makeCommissionToggle(setCommissionVoiceCommentsEnabledAction, "voiceCommentsEnabled"),
        },
        {
            id: "propertyComments",
            label: t("commission.propertyCommentsSetting"),
            description: t("commission.propertyCommentsSettingDesc"),
            checked: Boolean(localData.propertyCommentsEnabled),
            onToggle: makeCommissionToggle(setCommissionPropertyCommentsEnabledAction, "propertyCommentsEnabled"),
        },
        {
            id: "beverageOrigin",
            label: t("commission.beverageOriginSetting"),
            description: t("commission.beverageOriginSettingDesc"),
            checked: Boolean(localData.beverageOriginDuringEvaluationEnabled),
            onToggle: makeCommissionToggle(setCommissionBeverageOriginDuringEvaluationEnabledAction, "beverageOriginDuringEvaluationEnabled"),
        },
    ]

    const replicaToggles: ToggleSpec[] = selectedReplica ? [
        {
            id: "chaoticCandidate",
            label: t("commission.chaoticCandidateChangesTitle"),
            description: t("commission.chaoticCandidateChangesDesc"),
            checked: Boolean(activePanel?.chaoticCurrentCandidateChangesEnabled),
            disabled: !selectedReplica.currentPanelId,
            onToggle: handleToggleChaoticCandidateChanges,
        },
        {
            id: "chaoticPanel",
            label: t("commission.chaoticPanelChangesTitle"),
            description: t("commission.chaoticPanelChangesDesc"),
            checked: Boolean(selectedReplica.chaoticCurrentPanelChangesEnabled),
            onToggle: handleToggleChaoticPanelChanges,
        },
    ] : []

    /** The one action most likely wanted next, kept in reach in the sticky header. */
    const primaryAction = (() => {
        if (replicaStatus === "STARTED" && currentUserRole && selectedReplica) {
            return (
                <ActionButton
                    icon={PlayCircle}
                    onClick={() => router.push(`/commission/${localData.id}/replica/${selectedReplica.id}/evaluation`)}
                >
                    <span className="hidden sm:inline">{t("commission.enterTastingSession")}</span>
                    <span className="sm:hidden">{t("commission.enterTastingSessionShort")}</span>
                </ActionButton>
            )
        }
        if (currentUserRole === "HEAD" && isPreStart) {
            return (
                <ActionButton
                    icon={PlayCircle}
                    loading={isStarting}
                    disabled={!isEveryoneReady || !hasCandidates}
                    onClick={handleStartCommission}
                    title={
                        !hasCandidates ? t("commission.addSamplesBeforeStart")
                            : !hasMembers ? t("commission.addExpertsBeforeStart")
                                : !isEveryoneReady ? tCount("commission.waitingMembers", nonReadyCount)
                                    : undefined
                    }
                >
                    <span className="hidden sm:inline">{t("commission.startTasting")}</span>
                    <span className="sm:hidden">{t("commission.startTastingShort")}</span>
                </ActionButton>
            )
        }
        if (isPreStart && currentUserRole) {
            return (
                <ActionButton
                    variant={amIReady ? "success" : "primary"}
                    icon={amIReady ? CheckCircle : PlayCircle}
                    loading={isTogglingReady}
                    onClick={() => handleToggleReady(!amIReady)}
                >
                    {amIReady ? t("commission.ready") : t("commission.markReady")}
                </ActionButton>
            )
        }
        if (isCompetitionHolder && isCommissionDraft) {
            return (
                <ActionButton icon={Send} loading={isSubmittingReview} onClick={handleSubmitForReview}>
                    <span className="hidden sm:inline">{t("commission.submitReviewButton")}</span>
                    <span className="sm:hidden">{t("competition.submitReviewShort")}</span>
                </ActionButton>
            )
        }
        return null
    })()

    const canManageReplicas = isCompetitionHolder && isCommissionDraft
    const canEditPanel = isCompetitionHolder && isCommissionDraft && isReplicaDraft

    return (
        <div className="flex h-screen flex-col bg-slate-50">
            <AppHeader activeTab="competitions" />

            <main className="flex-1 overflow-auto">
                <DetailPageHeader
                    backHref={initialData.competition?.id ? `/competition/${initialData.competition.id}` : "/myCommissions"}
                    backLabel={initialData.competition?.id ? t("commission.backToCompetition") : t("commission.backToCompetitions")}
                    eyebrow={t("commission.session")}
                    name={initialData.name}
                    status={currentCommissionStatus}
                    timeDisplay={timeDisplay}
                    canEditName={isCompetitionHolder && isCommissionDraft}
                    onSaveName={handleSaveName}
                    isSavingName={isSavingName}
                    actions={
                        <>
                            {actionsScrolledPast && primaryAction}
                            <ActionButton
                                variant={actionsScrolledPast && primaryAction ? "secondary" : "primary"}
                                icon={Trophy}
                                href={competitionResultsHref}
                            >
                                <span className="hidden md:inline">{t("commission.viewResults")}</span>
                                <span className="md:hidden">{t("competition.resultsShort")}</span>
                            </ActionButton>
                        </>
                    }
                />

                <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:gap-6 md:px-8 md:py-8">
                    {showMyTastingSummary && (
                        <CalloutBanner
                            tone="indigo"
                            icon={Wine}
                            title={t("commission.myRankingTitle")}
                            description={t("commission.myRankingDesc")}
                            action={
                                <ActionButton
                                    icon={Wine}
                                    className="w-full sm:w-auto"
                                    onClick={() => router.push(`/commission/${localData.id}/replica/${summaryReplica!.id}/summary`)}
                                >
                                    {t("commission.viewMyTastingSummary")}
                                </ActionButton>
                            }
                        />
                    )}

                    {showResultsBanner && (
                        <CalloutBanner
                            tone={isCommissionCompleted ? "emerald" : "indigo"}
                            icon={isCommissionCompleted ? CheckCircle : Trophy}
                            title={isCommissionCompleted ? t("commission.sessionCompleted") : t("commission.resultsBannerTitle")}
                            description={isCommissionCompleted ? t("commission.allCandidatesEvaluatedDesc") : t("commission.resultsBannerDesc")}
                            action={
                                <ActionButton
                                    variant={isCommissionCompleted ? "success" : "primary"}
                                    icon={Trophy}
                                    className="w-full sm:w-auto"
                                    onClick={() => router.push(competitionResultsHref)}
                                >
                                    {t("commission.continueToResults")}
                                </ActionButton>
                            }
                        />
                    )}

                    {(localReplicas.length > 0 || isCompetitionHolder) && (
                        <ReplicaSelector
                            replicas={localReplicas}
                            selectedReplicaId={selectedReplica?.id || null}
                            onSelect={(id) => {
                                setSelectedReplicaId(id)
                                setHasRedirected(false)
                            }}
                            currentAuid={currentAuid}
                            canManage={canManageReplicas}
                            onAdd={handleAddReplica}
                            onRename={handleRenameReplica}
                        />
                    )}

                    <SectionCard padding="tight">
                        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
                            <Layers className="h-4 w-4 shrink-0 text-indigo-500" />
                            <span className="text-xs font-semibold text-slate-700">{selectedReplicaName}</span>
                            <StatusPill status={replicaStatus} size="sm" />
                        </div>
                        <StatusStepper steps={steps} currentStepIdx={currentStepIdx} />
                    </SectionCard>

                    <div className="grid gap-5 md:gap-6 lg:grid-cols-5">
                        {/* Main column — running the session. */}
                        <div className="flex min-w-0 flex-col gap-5 md:gap-6 lg:col-span-3">
                            <div ref={actionsRef}>
                            <SectionCard title={t("commission.actionsControls")}>
                                <div className="flex flex-col gap-3">
                                    {isCompetitionHolder && isCommissionDraft && (
                                        <ActionRow
                                            title={t("commission.submitReviewTitle")}
                                            description={t("commission.submitReviewDescription")}
                                            action={
                                                <ActionButton icon={Send} loading={isSubmittingReview} onClick={handleSubmitForReview}>
                                                    {t("commission.submitReviewButton")}
                                                </ActionButton>
                                            }
                                        />
                                    )}

                                    {isPreStart && currentUserRole && (
                                        <ActionRow
                                            tone="muted"
                                            title={t("commission.yourReadiness")}
                                            description={t("commission.readinessDescription")}
                                            action={
                                                <ActionButton
                                                    variant={amIReady ? "success" : "primary"}
                                                    icon={amIReady ? CheckCircle : PlayCircle}
                                                    loading={isTogglingReady}
                                                    onClick={() => handleToggleReady(!amIReady)}
                                                >
                                                    {amIReady ? t("commission.ready") : t("commission.markReady")}
                                                </ActionButton>
                                            }
                                        />
                                    )}

                                    {currentUserRole === "HEAD" && isPreStart && (
                                        <ActionRow
                                            title={t("commission.headTools", { name: selectedReplicaName })}
                                            description={t("commission.startTastingDescription")}
                                            action={
                                                <ActionButton
                                                    size="lg"
                                                    icon={PlayCircle}
                                                    loading={isStarting}
                                                    disabled={!isEveryoneReady || !hasCandidates}
                                                    onClick={handleStartCommission}
                                                >
                                                    {t("commission.startTasting")}
                                                </ActionButton>
                                            }
                                        >
                                            {!hasCandidates && (
                                                <p className="flex items-center gap-1.5 rounded-xl border border-amber-200/60 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                    {t("commission.addSamplesBeforeStart")}
                                                </p>
                                            )}
                                            {hasCandidates && !hasMembers && (
                                                <p className="flex items-center gap-1.5 rounded-xl border border-amber-200/60 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                    {t("commission.addExpertsBeforeStart")}
                                                </p>
                                            )}
                                            {hasCandidates && hasMembers && !isEveryoneReady && (
                                                <p className="text-xs font-medium text-slate-500">
                                                    {tCount("commission.waitingMembers", nonReadyCount)}
                                                </p>
                                            )}
                                            {hasCandidates && isEveryoneReady && (
                                                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                                    <Check className="h-4 w-4 shrink-0" />
                                                    {t("commission.everyoneReady")}
                                                </p>
                                            )}
                                        </ActionRow>
                                    )}

                                    {replicaStatus === "STARTED" && currentUserRole && selectedReplica && (
                                        <ActionRow
                                            title={t("commission.tastingActive")}
                                            description={t("commission.tastingActiveDesc")}
                                            action={
                                                <ActionButton
                                                    icon={ArrowRight}
                                                    onClick={() => router.push(`/commission/${localData.id}/replica/${selectedReplica.id}/evaluation`)}
                                                >
                                                    {t("commission.enterTastingSession")}
                                                </ActionButton>
                                            }
                                        >
                                            {selectedReplica.currentCandidateId && (() => {
                                                const candIndex = selectedReplica.replicaCandidates.findIndex(rc => rc.id === selectedReplica.currentCandidateId)
                                                const rawCode = selectedReplica.replicaCandidates[candIndex]?.candidate?.anonymizedCode
                                                const code = (rawCode && rawCode.trim()) ? rawCode.trim() : (candIndex >= 0 ? `#${candIndex + 1}` : t("common.na"))
                                                return (
                                                    <p className="text-xs font-medium text-slate-500">
                                                        {t("commission.currentCandidate", { code })}
                                                    </p>
                                                )
                                            })()}
                                        </ActionRow>
                                    )}

                                    {replicaStatus === "COMPLETED" && (
                                        <ActionRow
                                            tone="success"
                                            title={t("commission.sessionCompleted")}
                                            description={t("commission.sessionCompletedDesc")}
                                            action={
                                                (isCompetitionHolder || isUserReplicaMember) ? (
                                                    <ActionButton variant="success" icon={Trophy} href={competitionResultsHref}>
                                                        {t("commission.viewResults")}
                                                    </ActionButton>
                                                ) : undefined
                                            }
                                        />
                                    )}

                                    {isPreStart && currentUserRole && currentUserRole !== "HEAD" && (
                                        <ActionRow
                                            tone="muted"
                                            title={t("commission.waitingStart")}
                                            description={t("commission.waitingStartDesc")}
                                        />
                                    )}

                                    {!currentUserRole && !isCompetitionHolder && (
                                        <ActionRow
                                            tone="muted"
                                            title={t("commission.notAMemberTitle")}
                                            description={t("commission.notAMemberDescription")}
                                        />
                                    )}
                                </div>
                            </SectionCard>
                            </div>

                            <PanelMembers
                                replicaName={selectedReplicaName}
                                members={localMembers}
                                usernames={usernames}
                                currentAuid={currentAuid}
                                canAddMember={canEditPanel && Boolean(selectedReplica)}
                                onAddMember={() => setIsAddMemberOpen(true)}
                                canRemoveMember={canEditPanel}
                                onRemoveMember={(id) => setMemberPendingRemoval(id)}
                                removingMemberId={removingMemberId}
                            />

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

                        {/* Sidebar — setup and reference. */}
                        <aside className="flex min-w-0 flex-col gap-5 md:gap-6 lg:col-span-2">
                            <SectionCard title={t("common.overview")} icon={Wine}>
                                <div className="flex flex-col gap-3">
                                    <MetaTile
                                        icon={Trophy}
                                        iconClassName="text-amber-500"
                                        label={t("commission.competition")}
                                        value={initialData.competition.name}
                                    />
                                    <MetaTile
                                        icon={Users}
                                        label={t("commission.holders")}
                                        value={creatorNames}
                                        title={creatorNames}
                                    />
                                    <MetaTile
                                        icon={Layers}
                                        label={t("commission.replicaLabel")}
                                        value={tCount(
                                            "commission.replicaBeverages",
                                            selectedReplica?.candidateCount || localData.candidateCount || localData.candidates?.length || 0
                                        )}
                                    />
                                </div>
                            </SectionCard>

                            <EvaluationTemplatesBlock
                                commissionId={initialData.id}
                                templateEditions={initialData.templateEditions || []}
                                beverageTypesInCommission={beverageTypesInCommission}
                                isCompetitionHolder={isCompetitionHolder}
                                canEdit={initialData.status === "DRAFT" || initialData.status === "PLANNED"}
                                onRefresh={refreshCommissionData}
                            />

                            {isCompetitionHolder && (
                                <SettingsGroup
                                    title={t("commission.evaluationSettings")}
                                    subtitle={t("commission.evaluationSettingsSubtitle")}
                                    icon={Sliders}
                                    toggles={commissionToggles}
                                />
                            )}

                            {isCompetitionHolder && selectedReplica && (
                                <SettingsGroup
                                    title={t("commission.replicaSettings", { name: selectedReplica.name })}
                                    icon={Layers}
                                    toggles={replicaToggles}
                                />
                            )}

                            <ScheduleTimeline
                                labels={{
                                    title: t("commission.timelineDetails"),
                                    plannedStart: t("commission.plannedStart"),
                                    plannedEnd: t("commission.plannedEnd"),
                                    actualStart: t("commission.actualStart"),
                                    actualEnd: t("commission.actualEnd"),
                                    notStartedYet: t("commission.notStartedYet"),
                                    notEndedYet: t("commission.notCompletedYet"),
                                }}
                                plannedStartAt={initialData.plannedStartAt}
                                plannedEndAt={initialData.plannedEndAt}
                                startedAt={initialData.startedAt}
                                endedAt={initialData.endedAt}
                                canEdit={isCompetitionHolder && isCommissionDraft && !initialData.startedAt}
                                onSave={handleSaveDates}
                                calendarUrl={
                                    replicaStatus === "PLANNED" && initialData.plannedStartAt
                                        ? getGoogleCalendarUrl(initialData.name, initialData.plannedStartAt, initialData.plannedEndAt)
                                        : null
                                }
                            />
                        </aside>
                    </div>
                </div>
            </main>

            <AddMemberModal
                isOpen={isAddMemberOpen}
                onClose={() => setIsAddMemberOpen(false)}
                replicaId={selectedReplica?.id || ""}
                replicaName={selectedReplicaName}
                onMemberAdded={refreshCommissionData}
            />

            <AlertDialog open={memberPendingRemoval !== null} onOpenChange={(open) => !open && setMemberPendingRemoval(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("commission.deleteExpert")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("commission.confirmDeleteExpert")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => memberPendingRemoval && handleRemoveMember(memberPendingRemoval)}
                            className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
                        >
                            {t("commission.deleteExpert")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
