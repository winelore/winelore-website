import { normalizeAuids } from "../auidUtils"
import { resolveLobbyState, type LobbyState } from "./lobby"

type Translate = (key: any, params?: Record<string, string | number>) => string

/**
 * The commission page, shared by the web's /commission/[id] and the app's
 * commission screen: its data, which replica a user sees first, what they
 * may do there, and the small pieces both render.
 */

// --- Data -------------------------------------------------------------------

export type CommissionMemberRole = "HEAD" | "EXPERT" | "TRAINEE_EXPERT"

export interface CommissionMember {
    id: string
    /** Flattened; the backend nests auids in arrays. */
    auid: number[]
    role: CommissionMemberRole
    isReady: boolean
}

export interface CommissionBeverageType {
    id: string
    code: string
    name: string
}

export interface CommissionReplicaCandidate {
    id: string
    status: string
    replicaPanelId?: string
    panelId?: string
    candidate: {
        id: string
        anonymizedCode: string | null
        beverageType: CommissionBeverageType | null
        panelId?: string
    } | null
}

export interface CommissionReplicaPanel {
    id: string
    status: string
    currentCandidateId?: string | null
    chaoticCurrentCandidateChangesEnabled: boolean
    panel?: { id: string; name: string }
    panelId?: string
    replicaCandidates?: Array<{ id: string; status: string; candidate?: { id: string } | null }>
}

export interface CommissionReplica {
    id: string
    name: string
    type: "STANDARD" | "TRAINEE"
    status: string
    currentPanelId: string | null
    currentCandidateId: string | null
    chaoticCurrentPanelChangesEnabled?: boolean
    members: CommissionMember[]
    replicaPanels: CommissionReplicaPanel[]
    candidateCount: number
    replicaCandidates: CommissionReplicaCandidate[]
}

export interface CommissionTemplateLink {
    id: string
    beverageType: CommissionBeverageType
    templateEdition: any
}

export interface CommissionPageData {
    id: string
    name: string
    status: string
    plannedStartAt: string | null
    plannedEndAt: string | null
    startedAt: string | null
    endedAt: string | null
    partialCandidateEvaluationEnabled: boolean
    wineJumperMiniGameEnabled: boolean
    voiceCommentsEnabled: boolean
    propertyCommentsEnabled: boolean
    beverageOriginDuringEvaluationEnabled: boolean
    discussionPolicy: "ALWAYS" | "AFTER_EVALUATION" | "DISABLED"
    evaluationVisibleAttributes: { beverage: string[]; batch: string[]; sample: string[] }
    competition: {
        id: string
        name: string
        holders: number[]
        wineJumperMiniGameEnabled: boolean
        voiceCommentsEnabled: boolean
        propertyCommentsEnabled: boolean
        beverageOriginDuringEvaluationEnabled: boolean
        evaluationTemplateEdition: any
    }
    templateEditions: CommissionTemplateLink[]
    candidateCount: number
    /** Panels with their candidates, as the backend returns them. */
    panels: any[]
    replicas: CommissionReplica[]
    /** The default replica's members. */
    members: CommissionMember[]
}

/**
 * Whether a template edition is complete enough to score with: categories,
 * each with properties that have an id, code and name.
 */
function isUsableEdition(edition: any): boolean {
    return Boolean(
        edition?.categories?.length &&
            edition.categories.every(
                (category: any) =>
                    category.properties?.length &&
                    category.properties.every((property: any) => property.id && property.code && property.name),
            ),
    )
}

/**
 * The page's data from the commission query (GetCommission) and its template
 * links. Replica candidates are put in the order the panels list them.
 */
export function toCommissionPage(commission: any, templateLinks: any[] | null | undefined): CommissionPageData {
    const templateEditions: CommissionTemplateLink[] = (templateLinks ?? []).map((link: any) => ({
        id: link.id,
        beverageType: link.beverageType,
        templateEdition: link.templateEdition,
    }))

    // One edition kept for older screens that read a single template.
    const usable = templateEditions.filter((link) => isUsableEdition(link.templateEdition))
    const defaultLink = usable.find((link) => link.beverageType?.code === "WINE") || usable[0]

    const candidatesOrder: string[] = (commission.panels || []).flatMap((panel: any) =>
        (panel.candidates || []).map((candidate: any) => candidate.id),
    )

    const replicas: CommissionReplica[] = (commission.replicas || []).map((replica: any) => ({
        id: replica.id,
        name: replica.name || `${replica.type} Replica`,
        type: replica.type,
        status: replica.status,
        currentPanelId: replica.currentPanelId || null,
        currentCandidateId:
            replica.replicaPanels?.find((panel: any) => panel.id === replica.currentPanelId)?.currentCandidateId || null,
        chaoticCurrentPanelChangesEnabled: replica.chaoticCurrentPanelChangesEnabled,
        members: (replica.members || []).map((member: any) => ({
            id: member.id,
            auid: member.auid ? normalizeAuids(member.auid).map(Number) : [],
            role: member.role,
            isReady: member.isReady,
        })),
        replicaPanels: (replica.replicaPanels || []).map((panel: any) => ({ ...panel, panelId: panel.panel?.id })),
        candidateCount: (replica.replicaPanels || []).reduce(
            (count: number, panel: any) => count + (panel.replicaCandidates?.length || 0),
            0,
        ),
        replicaCandidates: (replica.replicaPanels || [])
            .flatMap((panel: any) =>
                (panel.replicaCandidates || []).map((candidate: any) => ({
                    id: candidate.id,
                    status: candidate.status,
                    replicaPanelId: panel.id,
                    panelId: panel.panel?.id,
                    candidate: candidate.candidate
                        ? {
                              id: candidate.candidate.id,
                              anonymizedCode: candidate.candidate.anonymizedCode || null,
                              beverageType: candidate.candidate.beverageType || null,
                              panelId: panel.panel?.id,
                          }
                        : null,
                })),
            )
            .sort((a: CommissionReplicaCandidate, b: CommissionReplicaCandidate) => {
                const indexA = a.candidate ? candidatesOrder.indexOf(a.candidate.id) : -1
                const indexB = b.candidate ? candidatesOrder.indexOf(b.candidate.id) : -1
                return indexA - indexB
            }),
    }))

    const defaultReplica = replicas.find((replica) => replica.type === "STANDARD") || replicas[0] || null

    return {
        id: commission.id,
        name: commission.name,
        status: commission.status,
        plannedStartAt: commission.plannedDates?.start || null,
        plannedEndAt: commission.plannedDates?.end || null,
        startedAt: commission.startedAt || null,
        endedAt: commission.endedAt || null,
        partialCandidateEvaluationEnabled: commission.partialCandidateEvaluationEnabled ?? false,
        wineJumperMiniGameEnabled: commission.wineJumperMiniGameEnabled ?? false,
        voiceCommentsEnabled: commission.voiceCommentsEnabled ?? false,
        propertyCommentsEnabled: commission.propertyCommentsEnabled ?? false,
        beverageOriginDuringEvaluationEnabled: commission.beverageOriginDuringEvaluationEnabled ?? false,
        discussionPolicy: (commission.discussionPolicy ?? "ALWAYS") as "ALWAYS" | "AFTER_EVALUATION" | "DISABLED",
        evaluationVisibleAttributes: commission.evaluationVisibleAttributes || { beverage: [], batch: [], sample: [] },
        competition: {
            id: commission.competition.id,
            name: commission.competition.name,
            holders: normalizeAuids(commission.competition.holders).map(Number),
            wineJumperMiniGameEnabled: commission.wineJumperMiniGameEnabled ?? false,
            voiceCommentsEnabled: commission.voiceCommentsEnabled ?? false,
            propertyCommentsEnabled: commission.propertyCommentsEnabled ?? false,
            beverageOriginDuringEvaluationEnabled: commission.beverageOriginDuringEvaluationEnabled ?? false,
            evaluationTemplateEdition: defaultLink?.templateEdition || null,
        },
        templateEditions,
        candidateCount: candidatesOrder.length,
        panels: commission.panels || [],
        replicas,
        members: defaultReplica ? defaultReplica.members : [],
    }
}

export type CommissionPageQuery = <T>(query: string, variables: Record<string, unknown>) => Promise<T>

/**
 * Load the page: the commission, then its templates. Templates that fail to
 * load leave the page without them rather than failing it; a missing
 * commission is null.
 */
export async function loadCommissionPage(
    fetchCommission: (id: string) => Promise<any>,
    fetchTemplates: (id: string) => Promise<any>,
    id: string,
    onError?: (context: string, error: unknown) => void,
): Promise<CommissionPageData | null> {
    const commission = await fetchCommission(id)
    if (!commission) return null
    let links: any[] = []
    try {
        links = (await fetchTemplates(id))?.commission?.templateEditions ?? []
    } catch (error) {
        onError?.("templates", error)
    }
    return toCommissionPage(commission, links)
}

// --- Who sees what ----------------------------------------------------------

const isUser = (auids: number[], auid: string | null | undefined) =>
    auid !== null && auid !== undefined && auid !== "" && auids.some((id) => String(id) === String(auid))

/** Whether this member is the signed-in user. */
export function isMemberUser(member: { auid: number[] }, auid: string | null | undefined): boolean {
    return isUser(member.auid, auid)
}

/** The replica the page opens on: the user's own, else the standard one, else the first. */
export function defaultCommissionReplica(
    replicas: CommissionReplica[],
    auid: string | null | undefined,
): CommissionReplica | null {
    return (
        replicas.find((replica) => replica.members.some((member) => isMemberUser(member, auid))) ||
        replicas.find((replica) => replica.type === "STANDARD") ||
        replicas[0] ||
        null
    )
}

/** Replicas in the selector's order: fewest members first, as the web lists them. */
export function replicasForSelector(replicas: CommissionReplica[]): CommissionReplica[] {
    return [...replicas].sort((a, b) => (a.members?.length || 0) - (b.members?.length || 0))
}

const ROLE_ORDER: Record<CommissionMemberRole, number> = { HEAD: 1, EXPERT: 2, TRAINEE_EXPERT: 3 }

/** The chair first, then experts, then trainees. */
export function sortMembersByRole(members: CommissionMember[]): CommissionMember[] {
    return [...members].sort((a, b) => (ROLE_ORDER[a.role] || 99) - (ROLE_ORDER[b.role] || 99))
}

/** Beverage types in play: those with a template, and those of the candidates added so far. */
export function commissionBeverageTypes(page: CommissionPageData): CommissionBeverageType[] {
    const types = new Map<string, CommissionBeverageType>()
    page.templateEditions.forEach((link) => {
        if (link.beverageType) types.set(link.beverageType.id, link.beverageType)
    })
    // Before the start replicas have no candidates yet, so the panels' count too.
    page.panels.forEach((panel: any) =>
        (panel.candidates || []).forEach((candidate: any) => {
            if (candidate.beverageType) types.set(candidate.beverageType.id, candidate.beverageType)
        }),
    )
    page.replicas.forEach((replica) =>
        replica.replicaCandidates.forEach((candidate) => {
            if (candidate.candidate?.beverageType) types.set(candidate.candidate.beverageType.id, candidate.candidate.beverageType)
        }),
    )
    return Array.from(types.values())
}

/** Everyone the page names: the replica's members, the holders and the beverages' producers. */
export function commissionPeopleAuids(page: CommissionPageData, members: CommissionMember[]): number[] {
    const producers: number[] = []
    page.panels.forEach((panel: any) =>
        (panel.candidates || []).forEach((candidate: any) =>
            (candidate.sample?.batch?.beverage?.producers || []).forEach((producer: any) =>
                normalizeAuids(producer.auid).forEach((id) => producers.push(Number(id))),
            ),
        ),
    )
    return Array.from(new Set([...members.flatMap((member) => member.auid), ...page.competition.holders, ...producers]))
}

export interface CommissionPageView {
    replica: CommissionReplica | null
    members: CommissionMember[]
    isHolder: boolean
    /** The commission is a draft: holders may still change everything. */
    isDraft: boolean
    isCompleted: boolean
    /** The selected replica's status, "DRAFT" when there is none. */
    replicaStatus: string
    isReplicaDraft: boolean
    /** The user's role and member id on the selected replica, if they sit on it. */
    role: CommissionMemberRole | null
    memberId: string | null
    isReplicaMember: boolean
    lobby: LobbyState
    candidateCount: number
    hasCandidates: boolean
    hasMembers: boolean
    readyCount: number
    /** Holders, and judges of a finished replica, get the banner to the results. */
    showResultsBanner: boolean
    /** The replica whose tasting summary the user can open, once theirs has finished. */
    summaryReplica: CommissionReplica | null
    /** The replica panel the chaotic-candidate setting applies to. */
    activePanel: CommissionReplicaPanel | null
}

/** What the page shows and allows, for one user looking at one replica. */
export function commissionPageView(
    page: CommissionPageData,
    selectedReplicaId: string | null,
    auid: string | null | undefined,
): CommissionPageView {
    const replica =
        page.replicas.find((candidate) => candidate.id === selectedReplicaId) || defaultCommissionReplica(page.replicas, auid)
    const members = replica ? replica.members : []
    const me = members.find((member) => isMemberUser(member, auid)) ?? null
    // Every candidate on the commission's panels.
    const candidateCount = page.candidateCount
    const replicaStatus = replica?.status || "DRAFT"
    const isHolder = isUser(page.competition.holders, auid)
    const isMine = (candidate: CommissionReplica) => candidate.members.some((member) => isMemberUser(member, auid))
    const myReplica = page.replicas.find(isMine) ?? null
    const completedMine = page.replicas.find((candidate) => candidate.status === "COMPLETED" && isMine(candidate)) ?? null
    const isReplicaMember = me !== null
    const summaryReplica =
        isReplicaMember && replica && replicaStatus === "COMPLETED"
            ? replica
            : myReplica?.status === "COMPLETED"
              ? myReplica
              : null

    return {
        replica,
        members,
        isHolder,
        isDraft: page.status === "DRAFT",
        isCompleted: page.status === "COMPLETED",
        replicaStatus,
        isReplicaDraft: replicaStatus === "DRAFT",
        role: me?.role ?? null,
        memberId: me?.id ?? null,
        isReplicaMember,
        lobby: resolveLobbyState(replica ? { ...replica, members } : null, auid ? String(auid) : null, candidateCount),
        candidateCount,
        hasCandidates: candidateCount > 0,
        hasMembers: members.length > 0,
        readyCount: members.filter((member) => member.isReady).length,
        showResultsBanner: isHolder || completedMine !== null,
        summaryReplica,
        activePanel: replica
            ? replica.replicaPanels.find((panel) => panel.id === replica.currentPanelId) || replica.replicaPanels[0] || null
            : null,
    }
}

/** The candidate being tasted, by its code, or its place when it has none. */
export function currentCandidateCode(replica: CommissionReplica, fallback: string): string {
    const index = replica.replicaCandidates.findIndex((candidate) => candidate.id === replica.currentCandidateId)
    const code = replica.replicaCandidates[index]?.candidate?.anonymizedCode?.trim()
    return code || (index >= 0 ? `#${index + 1}` : fallback)
}

/** Holders' names for the page, or the fallback when there are none. */
export function commissionHolderNames(holders: number[], names: Record<string, string>, unknown: string): string {
    return holders.length > 0 ? holders.map((id) => names[String(id)] || String(id)).join(", ") : unknown
}

/** A member's initials in their avatar: from their name, else the end of their id. */
export function memberInitials(username: string | undefined, auid: number | undefined): string {
    if (username) return (username.startsWith("@") ? username.slice(1, 3) : username.slice(0, 2)).toUpperCase()
    return auid ? String(auid).slice(-2) : "?"
}

// --- Timing -----------------------------------------------------------------

const HOUR = 1000 * 60 * 60
const MINUTE = 1000 * 60
const pad = (value: number) => value.toString().padStart(2, "0")

/**
 * The timer beside the session's status: a clock while it runs, how long it
 * took once over, and how long until it starts before then.
 */
export function formatCommissionTiming(
    page: { status: string; startedAt: string | null; endedAt: string | null; plannedStartAt: string | null },
    t: Translate,
    now: number = Date.now(),
): string {
    if (page.status === "STARTED" && page.startedAt) {
        const diff = Math.max(0, now - new Date(page.startedAt).getTime())
        const hours = Math.floor(diff / HOUR)
        const minutes = Math.floor((diff % HOUR) / MINUTE)
        const seconds = Math.floor((diff % MINUTE) / 1000)
        return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
    }
    if (page.status === "COMPLETED" && page.startedAt && page.endedAt) {
        const diff = Math.max(0, new Date(page.endedAt).getTime() - new Date(page.startedAt).getTime())
        const hours = Math.floor(diff / HOUR)
        const minutes = Math.floor((diff % HOUR) / MINUTE)
        return hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes })
    }
    if (page.status === "PLANNED" && page.plannedStartAt) {
        const diff = new Date(page.plannedStartAt).getTime() - now
        if (diff <= 0) return t("time.startingSoon")
        const days = Math.floor(diff / (HOUR * 24))
        const hours = Math.floor((diff % (HOUR * 24)) / HOUR)
        const minutes = Math.floor((diff % HOUR) / MINUTE)
        return days > 0 ? t("time.inDaysHours", { days, hours }) : t("time.inHoursMinutes", { hours, minutes })
    }
    return ""
}

/** Readying, tasting, completed: which step a replica is on. */
export function commissionStepIndex(status: string): 0 | 1 | 2 {
    if (status === "STARTED") return 1
    if (status === "COMPLETED") return 2
    return 0
}

// --- Settings ---------------------------------------------------------------

export type CommissionSetting =
    | "partialCandidateEvaluationEnabled"
    | "wineJumperMiniGameEnabled"
    | "voiceCommentsEnabled"
    | "propertyCommentsEnabled"
    | "beverageOriginDuringEvaluationEnabled"

/** The holder's evaluation settings, in the web's order, with the mutation each sends. */
export const COMMISSION_SETTINGS: ReadonlyArray<{
    key: CommissionSetting
    labelKey: string
    descriptionKey: string
    mutation: string
}> = [
    {
        key: "partialCandidateEvaluationEnabled",
        labelKey: "commission.partialCandidateEvaluationSetting",
        descriptionKey: "commission.partialCandidateEvaluationSettingDesc",
        mutation: `mutation SetCommissionPartialCandidateEvaluationEnabled($id: ID!, $enabled: Boolean!) {
            setCommissionPartialCandidateEvaluationEnabled(id: $id, enabled: $enabled) { id partialCandidateEvaluationEnabled }
        }`,
    },
    {
        key: "wineJumperMiniGameEnabled",
        labelKey: "commission.wineJumperSetting",
        descriptionKey: "commission.wineJumperSettingDesc",
        mutation: `mutation SetCommissionWineJumperMiniGameEnabled($id: ID!, $enabled: Boolean!) {
            setCommissionWineJumperMiniGameEnabled(id: $id, enabled: $enabled) { id wineJumperMiniGameEnabled }
        }`,
    },
    {
        key: "voiceCommentsEnabled",
        labelKey: "commission.voiceCommentsSetting",
        descriptionKey: "commission.voiceCommentsSettingDesc",
        mutation: `mutation SetCommissionVoiceCommentsEnabled($id: ID!, $enabled: Boolean!) {
            setCommissionVoiceCommentsEnabled(id: $id, enabled: $enabled) { id voiceCommentsEnabled }
        }`,
    },
    {
        key: "propertyCommentsEnabled",
        labelKey: "commission.propertyCommentsSetting",
        descriptionKey: "commission.propertyCommentsSettingDesc",
        mutation: `mutation SetCommissionPropertyCommentsEnabled($id: ID!, $enabled: Boolean!) {
            setCommissionPropertyCommentsEnabled(id: $id, enabled: $enabled) { id propertyCommentsEnabled }
        }`,
    },
    {
        key: "beverageOriginDuringEvaluationEnabled",
        labelKey: "commission.beverageOriginSetting",
        descriptionKey: "commission.beverageOriginSettingDesc",
        mutation: `mutation SetCommissionBeverageOriginDuringEvaluationEnabled($id: ID!, $enabled: Boolean!) {
            setCommissionBeverageOriginDuringEvaluationEnabled(id: $id, enabled: $enabled) { id beverageOriginDuringEvaluationEnabled }
        }`,
    },
]
