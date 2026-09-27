import { findEvaluationForMember, memberMatchesActor, normalizeAuids } from "../auidUtils"
import type { GetCommissionTemplatesDeepResult } from "../commissionTemplatesQuery"
import { annotateEvaluationsWithDelta, type DeltaOutlierInfo } from "../deltaOutliers"
import { isReplicaCandidateFinished } from "../evaluation/routing"
import type { CompetitionFeatureFlags } from "../evaluationDisplay"
import { buildPropertyMapFromCommissionTemplates, type PropertyMeta } from "../propertyMap"

/**
 * The room between candidates — the web's
 * /commission/[id]/replica/[replicaId]/wait and the app's screen of the same
 * path.
 *
 * Two very different screens are built from one state. A judge sees that their
 * scorecard is in and how much of the panel is left; the chair sees every
 * member's progress and decides when the panel moves on. Both poll the same
 * server state, so the decision of who has finished — and whether the chair may
 * advance — lives here rather than in either client.
 */

// --- Data -------------------------------------------------------------------

export interface WaitMember {
    id?: string | null
    auid?: unknown
    role?: string | null
}

/** A member with their auids flattened, ready to display and match against. */
export interface WaitRoomMember {
    id: string | null
    auids: string[]
    role: string
    isHead: boolean
    isTrainee: boolean
}

/** An evaluation as the backend returns it, nullable fields and all. */
export interface WaitEvaluation {
    id?: string | null
    evaluatorAuid?: unknown
    isComplete?: boolean | null
    status?: string | null
    scores?: Array<{ code: string; value?: string | null }> | null
    comments?: Array<{
        id: string
        text?: string | null
        voiceUrl?: string | null
        propertyId?: string | null
    }> | null
}

/**
 * The same evaluation ready to display: no nulls where a card expects a value.
 *
 * A score with no value formats as "-" either way, so blanking it here loses
 * nothing and spares both platforms' cards a nullable type.
 */
export interface WaitRoomEvaluation {
    id: string | null
    status: string | null
    isComplete: boolean
    evaluatorAuid: unknown
    scores: Array<{ code: string; value: string }>
    comments: Array<{
        id: string
        text?: string
        voiceUrl?: string | null
        propertyId?: string | null
    }>
}

export function normalizeWaitEvaluation(evaluation: WaitEvaluation): WaitRoomEvaluation {
    return {
        id: evaluation.id ?? null,
        status: evaluation.status ?? null,
        isComplete: evaluation.isComplete === true,
        evaluatorAuid: evaluation.evaluatorAuid,
        scores: (evaluation.scores || []).map((score) => ({
            code: score.code,
            value: score.value ?? "",
        })),
        comments: (evaluation.comments || []).map((comment) => ({
            id: comment.id,
            text: comment.text ?? undefined,
            voiceUrl: comment.voiceUrl,
            propertyId: comment.propertyId,
        })),
    }
}

/** One row of the chair's dashboard: a member and how far they have got. */
export interface WaitRoomProgress {
    member: WaitRoomMember
    evaluation: WaitRoomEvaluation | null
    isCompleted: boolean
    /** Their score sits further from the panel's average than the delta allows. */
    outlier: DeltaOutlierInfo | null
}

export interface WaitRoomCandidate {
    id?: string | null
    status?: string | null
    candidate?: {
        id?: string | null
        anonymizedCode?: string | null
        sample?: { batch?: { beverage?: { name?: string | null } | null } | null } | null
    } | null
}

export interface WaitRoomPanel {
    id?: string | null
    status?: string | null
    currentCandidateId?: string | null
    panel?: { id?: string | null; name?: string | null } | null
    replicaCandidates?: WaitRoomCandidate[] | null
}

export interface WaitRoomReplica {
    id?: string | null
    status?: string | null
    currentPanelId?: string | null
    members?: WaitMember[] | null
    replicaPanels?: WaitRoomPanel[] | null
}

export interface WaitRoomCommission {
    name?: string | null
    wineJumperMiniGameEnabled?: boolean | null
    voiceCommentsEnabled?: boolean | null
    propertyCommentsEnabled?: boolean | null
    replicas?: WaitRoomReplica[] | null
}

/** What a commission allows during a tasting. Absent means off, never on. */
export function getCompetitionFeatureFlags(
    commission: {
        wineJumperMiniGameEnabled?: boolean | null
        voiceCommentsEnabled?: boolean | null
        propertyCommentsEnabled?: boolean | null
    } | null | undefined,
): CompetitionFeatureFlags & { wineJumperMiniGameEnabled: boolean } {
    return {
        wineJumperMiniGameEnabled: commission?.wineJumperMiniGameEnabled ?? false,
        voiceCommentsEnabled: commission?.voiceCommentsEnabled ?? false,
        propertyCommentsEnabled: commission?.propertyCommentsEnabled ?? false,
    }
}

export interface WaitRoomState {
    /** Every member of this replica, chair first. */
    members: WaitRoomMember[]
    /** The chair's dashboard rows, heads before experts. */
    progress: WaitRoomProgress[]
    myRole: string
    isHead: boolean

    currentCandidateId: string | null
    currentCandidateCode: string | null
    currentCandidateBeverageName: string | null
    currentPanelName: string
    currentPanelId: string | null
    currentReplicaPanelId: string | null

    totalCandidates: number
    currentCandidateIndex: number
    /**
     * Candidates in this panel still to be scored: the current one counts
     * until every member has scored it, though the chair has not moved on.
     */
    candidatesLeft: number
    candidatesLeftAfterCurrent: number
    isLastCandidateInPanel: boolean

    evaluations: WaitRoomEvaluation[]
    propertyMap: Record<string, PropertyMeta>
    myEvaluation: WaitRoomEvaluation | null
    hasCompletedCurrentCandidate: boolean

    replicaStatus: string | null
    isPanelFinished: boolean
    allCandidatesEvaluated: boolean
    /** Everyone is in, so the chair may move the panel on. */
    canAdvance: boolean

    flags: CompetitionFeatureFlags & { wineJumperMiniGameEnabled: boolean }
}

export function emptyWaitRoom(): WaitRoomState {
    return {
        members: [],
        progress: [],
        myRole: "EXPERT",
        isHead: false,
        currentCandidateId: null,
        currentCandidateCode: null,
        currentCandidateBeverageName: null,
        currentPanelName: "",
        currentPanelId: null,
        currentReplicaPanelId: null,
        totalCandidates: 0,
        currentCandidateIndex: -1,
        candidatesLeft: 0,
        candidatesLeftAfterCurrent: 0,
        isLastCandidateInPanel: false,
        evaluations: [],
        propertyMap: {},
        myEvaluation: null,
        hasCompletedCurrentCandidate: false,
        replicaStatus: null,
        isPanelFinished: false,
        allCandidatesEvaluated: false,
        canAdvance: false,
        flags: getCompetitionFeatureFlags(null),
    }
}

function toMember(member: WaitMember): WaitRoomMember {
    const role = member.role || "EXPERT"
    return {
        id: member.id ?? null,
        auids: normalizeAuids(member.auid),
        role,
        isHead: role === "HEAD",
        isTrainee: role === "TRAINEE_EXPERT",
    }
}

/**
 * Build both views of the room from one poll's worth of server state.
 *
 * The chair may only advance once every member's evaluation is complete —
 * `canAdvance` is that check, and it is deliberately every member rather than
 * every evaluation on record: an absent judge leaves no evaluation at all, and
 * counting only what was submitted would let the panel move on without them.
 */
export function buildWaitRoom(input: {
    commission: WaitRoomCommission | null | undefined
    replicaId: string
    evaluations: WaitEvaluation[]
    propertyMap: Record<string, PropertyMeta>
    myEvaluation: WaitEvaluation | null | undefined
    actorAuid: string | null | undefined
}): WaitRoomState {
    const empty = emptyWaitRoom()
    const commission = input.commission
    if (!commission) return empty

    const flags = getCompetitionFeatureFlags(commission)
    const replica = (commission.replicas || []).find((candidate) => candidate.id === input.replicaId)
    if (!replica) return { ...empty, flags }

    const members = (replica.members || []).map(toMember)
    const replicaPanels = replica.replicaPanels || []
    const currentPanel = replicaPanels.find((panel) => panel.id === replica.currentPanelId) || null
    const panelCandidates = currentPanel?.replicaCandidates || []

    const currentCandidateId = currentPanel?.currentCandidateId || null
    const currentCandidate = panelCandidates.find((entry) => entry.id === currentCandidateId) || null
    const currentCandidateIndex = currentCandidateId
        ? panelCandidates.findIndex((entry) => entry.id === currentCandidateId)
        : -1

    const totalCandidates = panelCandidates.length
    const evaluatedCount = panelCandidates.filter((entry) => isReplicaCandidateFinished(entry.status)).length
    const unfinishedCount = totalCandidates - evaluatedCount
    const candidatesLeftAfterCurrent =
        currentCandidateIndex >= 0 ? totalCandidates - currentCandidateIndex - 1 : unfinishedCount

    // A blank code is as good as none: fall back to the tasting position, then
    // to a short id, so the chair always has something to read out.
    const rawCode = currentCandidate?.candidate?.anonymizedCode?.trim()
    const currentCandidateCode =
        rawCode ||
        (currentCandidateIndex >= 0
            ? `#${currentCandidateIndex + 1}`
            : currentCandidateId
              ? `#${currentCandidateId.slice(0, 8)}`
              : null)

    const evaluations = (input.evaluations || []).map(normalizeWaitEvaluation)
    const outliers = annotateEvaluationsWithDelta(evaluations, input.propertyMap)
    const ordered = [...members].sort((a, b) => Number(b.isHead) - Number(a.isHead))
    const progress: WaitRoomProgress[] = ordered.map((member) => {
        const evaluation = findEvaluationForMember(evaluations, member.auids) ?? null
        return {
            member,
            evaluation,
            isCompleted: evaluation?.isComplete === true,
            outlier: (evaluation && outliers.get(evaluation)) || null,
        }
    })

    const canAdvance = Boolean(currentCandidateId) && members.length > 0 && progress.every((row) => row.isCompleted)
    // The current candidate stays unfinished on the server until the chair
    // advances, but once everyone has scored it it is no longer "left".
    const currentIsScored = canAdvance && currentCandidate !== null && !isReplicaCandidateFinished(currentCandidate.status)
    const candidatesLeft = unfinishedCount - (currentIsScored ? 1 : 0)

    const me = input.actorAuid
        ? members.find((member) => memberMatchesActor(member.auids, input.actorAuid!))
        : undefined

    let myEvaluation = input.myEvaluation ? normalizeWaitEvaluation(input.myEvaluation) : null
    if (!myEvaluation && me) myEvaluation = findEvaluationForMember(evaluations, me.auids) ?? null
    if (!myEvaluation && input.actorAuid) {
        myEvaluation = findEvaluationForMember(evaluations, input.actorAuid) ?? null
    }

    return {
        members: ordered,
        progress,
        myRole: me?.role || "EXPERT",
        isHead: me?.isHead ?? false,
        currentCandidateId,
        currentCandidateCode,
        currentCandidateBeverageName: currentCandidate?.candidate?.sample?.batch?.beverage?.name || null,
        currentPanelName: currentPanel?.panel?.name || "",
        currentPanelId: currentPanel?.panel?.id || null,
        currentReplicaPanelId: currentPanel?.id || null,
        totalCandidates,
        currentCandidateIndex,
        candidatesLeft,
        candidatesLeftAfterCurrent,
        isLastCandidateInPanel: Boolean(currentCandidateId) && unfinishedCount === 1,
        evaluations,
        propertyMap: input.propertyMap,
        myEvaluation,
        hasCompletedCurrentCandidate: myEvaluation?.isComplete === true,
        replicaStatus: replica.status || null,
        isPanelFinished: currentPanel?.status === "COMPLETED",
        allCandidatesEvaluated:
            replicaPanels.length > 0 && replicaPanels.every((panel) => panel.status === "COMPLETED"),
        canAdvance,
        flags,
    }
}

// --- Loading ----------------------------------------------------------------

/** The fetches the room makes; each app sends them its own way. */
export interface WaitRoomSource {
    commission: (commissionId: string) => Promise<WaitRoomCommission | null | undefined>
    templates: (commissionId: string) => Promise<GetCommissionTemplatesDeepResult | null | undefined>
    /** Every evaluation of a replica candidate. */
    evaluations: (replicaCandidateId: string) => Promise<WaitEvaluation[]>
    /** The signed-in judge's own evaluation of a replica candidate. */
    myEvaluation: (replicaCandidateId: string) => Promise<WaitEvaluation | null | undefined>
}

/**
 * One poll of the room.
 *
 * The three per-candidate fetches run together and none of them is allowed to
 * lose the poll: a template query that fails still leaves the chair with a
 * members list and a working Next button, which matters more mid-tasting than
 * a complete score breakdown.
 */
export async function loadWaitRoom(
    source: WaitRoomSource,
    commissionId: string,
    replicaId: string,
    actorAuid: string | null | undefined,
): Promise<WaitRoomState> {
    const commission = await source.commission(commissionId)
    if (!commission) return emptyWaitRoom()

    const replica = (commission.replicas || []).find((entry) => entry.id === replicaId)
    const currentPanel = (replica?.replicaPanels || []).find((panel) => panel.id === replica?.currentPanelId)
    const currentCandidateId = currentPanel?.currentCandidateId || null

    let evaluations: WaitEvaluation[] = []
    let propertyMap: Record<string, PropertyMeta> = {}
    let myEvaluation: WaitEvaluation | null = null

    if (currentCandidateId) {
        const [loadedEvaluations, templates, loadedMine] = await Promise.all([
            source.evaluations(currentCandidateId).catch(() => [] as WaitEvaluation[]),
            source.templates(commissionId).catch(() => null),
            source.myEvaluation(currentCandidateId).catch(() => null),
        ])
        evaluations = loadedEvaluations || []
        propertyMap = buildPropertyMapFromCommissionTemplates(templates)
        myEvaluation = loadedMine ?? null
    }

    return buildWaitRoom({ commission, replicaId, evaluations, propertyMap, myEvaluation, actorAuid })
}

// --- The chair advancing the panel -------------------------------------------

/** Why the backend refused to move the panel on, as a message key. */
export function advancePanelErrorKey(
    message: string | null | undefined,
):
    | "commission.partialEvaluationRequiredError"
    | "commission.sequentialOrderError"
    | "commission.markEvaluatedErrorGeneric" {
    const text = String(message || "")
    // A key that has already been through here — the web's server action can
    // only carry a message string back to the browser — maps to itself.
    if (text === "commission.partialEvaluationRequiredError") return text
    if (text === "commission.sequentialOrderError") return text
    if (
        text.includes("replica members") ||
        text.includes("confirmed evaluations") ||
        text.includes("PARTIAL_EVALUATION")
    ) {
        return "commission.partialEvaluationRequiredError"
    }
    if (
        text.includes("CandidateNotNextInSequence") ||
        text.includes("not next in sequence") ||
        text.includes("transition strictly to the next candidate")
    ) {
        return "commission.sequentialOrderError"
    }
    return "commission.markEvaluatedErrorGeneric"
}

export interface AdvancePanelCandidate {
    id: string
    status?: string | null
}

export interface AdvancePanelPanel {
    id: string
    chaoticCurrentCandidateChangesEnabled?: boolean | null
    replicaCandidates: AdvancePanelCandidate[]
}

/**
 * Which candidate the panel moves to after this one.
 *
 * Sequential panels must step exactly one place, so the next candidate is the
 * one that follows in the list even if it has somehow been scored already.
 * Chaotic panels may pick any candidate still pending. Null means this was the
 * last one and the panel is finished.
 */
export function nextCandidateAfter(
    panel: AdvancePanelPanel,
    candidateId: string,
): string | null {
    const index = panel.replicaCandidates.findIndex((candidate) => candidate.id === candidateId)
    const next = panel.chaoticCurrentCandidateChangesEnabled
        ? panel.replicaCandidates.find((candidate) => candidate.status === "PENDING")
        : panel.replicaCandidates[index + 1]
    return next?.id ?? null
}

export function panelForCandidate(
    panels: AdvancePanelPanel[] | null | undefined,
    candidateId: string,
): AdvancePanelPanel | null {
    return (
        (panels || []).find((panel) =>
            panel.replicaCandidates.some((candidate) => candidate.id === candidateId),
        ) ?? null
    )
}

/** An advance that failed, carrying the message key to show the chair. */
export class AdvancePanelError extends Error {
    constructor(public readonly key: ReturnType<typeof advancePanelErrorKey>, cause?: unknown) {
        super(key)
        this.name = "AdvancePanelError"
        this.cause = cause
    }
}

/** The mutations advancing a panel needs; each app sends them its own way. */
export interface AdvancePanelOps {
    markEvaluated: (candidateId: string) => Promise<void>
    /** This replica's panels, for finding the candidate's own and what follows. */
    panels: (replicaId: string) => Promise<AdvancePanelPanel[]>
    setCurrentCandidate: (replicaId: string, panelId: string, candidateId: string) => Promise<void>
    completePanel: (replicaId: string, panelId: string) => Promise<void>
}

/**
 * The chair moving the panel on: mark this candidate evaluated, then either
 * point the panel at the next one or complete it.
 *
 * Marking and pointing are two mutations because the backend keeps the
 * candidate's status and the panel's pointer apart. On the last candidate the
 * pointer is deliberately left where it is: sequential panels reject a null
 * current candidate, so the panel is completed around it instead.
 */
export async function advancePanel(
    ops: AdvancePanelOps,
    replicaId: string,
    candidateId: string,
): Promise<{ nextCandidateId: string | null }> {
    try {
        await ops.markEvaluated(candidateId)

        const panel = panelForCandidate(await ops.panels(replicaId), candidateId)
        if (!panel) throw new Error("Replica panel not found for candidate")

        const nextCandidateId = nextCandidateAfter(panel, candidateId)
        if (nextCandidateId) {
            await ops.setCurrentCandidate(replicaId, panel.id, nextCandidateId)
        } else {
            await ops.completePanel(replicaId, panel.id)
        }
        return { nextCandidateId }
    } catch (err) {
        throw new AdvancePanelError(
            advancePanelErrorKey(err instanceof Error ? err.message : String(err)),
            err,
        )
    }
}
