import { normalizeAuids } from "../auidUtils"

/**
 * The waiting room before a tasting starts.
 *
 * Judges mark themselves ready; the chair starts the session once everyone is.
 * The rules for who may do what, and when, are here so a judge on a phone and a
 * judge on the web see the same state of the same room.
 */

export interface LobbyMember {
    id: string
    auid?: unknown
    role?: string | null
    isReady?: boolean | null
}

export interface LobbyReplica {
    id: string
    name?: string | null
    status?: string | null
    members?: LobbyMember[] | null
}

export interface LobbyState {
    /** This user's membership row, needed to mark them ready. */
    myMemberId: string | null
    isMember: boolean
    isHead: boolean
    amIReady: boolean
    /** Members yet to mark themselves ready. */
    notReadyCount: number
    isEveryoneReady: boolean
    /** The session has not begun, so readiness still matters. */
    isPreStart: boolean
    /** The session is running and this user should be routed into it. */
    isRunning: boolean
    /** Whether this user may start the session now. */
    canStart: boolean
    /** Why `canStart` is false, for the UI to explain rather than just disable. */
    blockedReason: "notHead" | "noMembers" | "noCandidates" | "alreadyStarted" | null
}

/** Statuses meaning the replica has begun and readiness no longer applies. */
const STARTED_STATUSES = ["STARTED", "IN_PROGRESS", "COMPLETED"]

/**
 * Work out what this user sees and may do in a replica's lobby.
 *
 * Membership matches through `normalizeAuids`: the backend returns `auid` as an
 * array and sometimes nests it, and a plain `includes` would leave a genuine
 * member unable to mark themselves ready.
 */
export function resolveLobbyState(
    replica: LobbyReplica | null | undefined,
    auid: string | null | undefined,
    candidateCount: number,
): LobbyState {
    const members = replica?.members ?? []
    const me = auid
        ? members.find((member) => normalizeAuids(member.auid).includes(auid))
        : undefined

    const notReady = members.filter((member) => !member.isReady)
    const isRunning = STARTED_STATUSES.includes(replica?.status ?? "")
    const isPreStart = Boolean(replica) && !isRunning
    const isHead = me?.role === "HEAD"

    let blockedReason: LobbyState["blockedReason"] = null
    if (!isPreStart) blockedReason = "alreadyStarted"
    else if (!isHead) blockedReason = "notHead"
    else if (members.length === 0) blockedReason = "noMembers"
    else if (candidateCount === 0) blockedReason = "noCandidates"

    return {
        myMemberId: me?.id ?? null,
        isMember: Boolean(me),
        isHead,
        amIReady: Boolean(me?.isReady),
        notReadyCount: notReady.length,
        // An empty replica is not a ready one.
        isEveryoneReady: members.length > 0 && notReady.length === 0,
        isPreStart,
        isRunning,
        canStart: blockedReason === null,
        blockedReason,
    }
}
