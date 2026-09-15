import { print } from "graphql"
import {
    ADD_COMMISSION_REPLICA_MEMBER,
    COMMISSION_SETTINGS,
    CREATE_COMMISSION_REPLICA,
    REMOVE_COMMISSION_REPLICA_MEMBER,
    RENAME_COMMISSION,
    RENAME_COMMISSION_REPLICA,
    SET_REPLICA_CHAOTIC_PANEL_CHANGES,
    SET_REPLICA_PANEL_CHAOTIC_CANDIDATE_CHANGES,
    UPDATE_COMMISSION_DATES,
    commissionDatesInput,
    createReplicaInput,
    startCommissionReplica,
    type CommissionSetting,
} from "@winelore/core/commission"
import {
    DevSubmitCommissionForReviewDocument,
    MarkReplicaMemberNotReadyDocument,
    MarkReplicaMemberReadyDocument,
} from "@winelore/core/gql/sdk"
import { fetchGraphQLRaw, mutateGraphQLRaw } from "../api/client"

/**
 * Mutations the generated SDK does not carry — the web app sends these as raw
 * strings from its server actions, and native needs the same ones to let a
 * chair drive a session.
 */

const SET_CURRENT_PANEL = `
    mutation SetCommissionReplicaCurrentPanel($id: ID!, $currentPanelId: ID) {
        setCommissionReplicaCurrentPanel(id: $id, currentPanelId: $currentPanelId) { id currentPanelId }
    }
`

const SET_PANEL_CURRENT_CANDIDATE = `
    mutation SetCommissionReplicaPanelCurrentCandidate($id: ID!, $panelId: ID!, $currentCandidateId: ID) {
        setCommissionReplicaPanelCurrentCandidate(id: $id, panelId: $panelId, currentCandidateId: $currentCandidateId) {
            id
            currentPanelId
        }
    }
`

const COMPLETE_REPLICA = `
    mutation CompleteCommissionReplica($id: ID!) {
        completeCommissionReplica(id: $id) { id status }
    }
`

/**
 * Move the replica to the next panel and open its first candidate.
 *
 * Two mutations, in this order: the panel must be current before a candidate
 * within it can be made current.
 */
export async function startNextPanel(
    replicaId: string,
    nextPanelId: string,
    firstCandidateId: string,
): Promise<void> {
    await mutateGraphQLRaw(SET_CURRENT_PANEL, { id: replicaId, currentPanelId: nextPanelId })
    await mutateGraphQLRaw(SET_PANEL_CURRENT_CANDIDATE, {
        id: replicaId,
        panelId: nextPanelId,
        currentCandidateId: firstCandidateId,
    })
}

/** End the replica; every participant is then routed to the shared results. */
export async function completeReplica(replicaId: string): Promise<void> {
    await mutateGraphQLRaw(COMPLETE_REPLICA, { id: replicaId })
}

// --- The commission page ----------------------------------------------------

/** The web's actions send these with the signed-in user as the actor; so does the app. */
const actor = (auid: string) => ({ actor: auid, "x-actor": auid })

export async function renameCommission(id: string, name: string, auid: string): Promise<void> {
    await mutateGraphQLRaw(RENAME_COMMISSION, { id, name }, actor(auid))
}

export async function updateCommissionDates(id: string, start: string | null, end: string | null, auid: string): Promise<void> {
    await mutateGraphQLRaw(UPDATE_COMMISSION_DATES, { id, input: commissionDatesInput(start, end) }, actor(auid))
}

export async function setCommissionSetting(id: string, key: CommissionSetting, enabled: boolean, auid: string): Promise<void> {
    const setting = COMMISSION_SETTINGS.find((candidate) => candidate.key === key)!
    await mutateGraphQLRaw(setting.mutation, { id, enabled }, actor(auid))
}

export async function createReplica(commissionId: string, name: string, type: "STANDARD" | "TRAINEE", auid: string): Promise<void> {
    await mutateGraphQLRaw(CREATE_COMMISSION_REPLICA, { input: createReplicaInput(commissionId, name, type) }, actor(auid))
}

export async function renameReplica(id: string, name: string, auid: string): Promise<void> {
    await mutateGraphQLRaw(RENAME_COMMISSION_REPLICA, { id, name: name.trim() || undefined }, actor(auid))
}

export async function addReplicaMember(replicaId: string, memberAuid: number, role: "HEAD" | "EXPERT", auid: string): Promise<void> {
    await mutateGraphQLRaw(ADD_COMMISSION_REPLICA_MEMBER, { id: replicaId, input: { auid: [memberAuid], role } }, actor(auid))
}

export async function removeReplicaMember(replicaId: string, memberId: string, auid: string): Promise<void> {
    await mutateGraphQLRaw(REMOVE_COMMISSION_REPLICA_MEMBER, { id: replicaId, memberId }, actor(auid))
}

export async function setChaoticCandidateChanges(replicaId: string, panelId: string, enabled: boolean, auid: string): Promise<void> {
    await mutateGraphQLRaw(SET_REPLICA_PANEL_CHAOTIC_CANDIDATE_CHANGES, { id: replicaId, panelId, enabled }, actor(auid))
}

export async function setChaoticPanelChanges(replicaId: string, enabled: boolean, auid: string): Promise<void> {
    await mutateGraphQLRaw(SET_REPLICA_CHAOTIC_PANEL_CHANGES, { id: replicaId, enabled }, actor(auid))
}

export async function setMemberReady(replicaId: string, memberId: string, ready: boolean, auid: string): Promise<void> {
    const document = ready ? MarkReplicaMemberReadyDocument : MarkReplicaMemberNotReadyDocument
    await mutateGraphQLRaw(print(document), { replicaId, memberId }, actor(auid))
}

export async function submitCommissionForReview(id: string, auid: string): Promise<void> {
    await mutateGraphQLRaw(print(DevSubmitCommissionForReviewDocument), { id }, actor(auid))
}

/**
 * Start the tasting: core's sequence, which moves the competition and
 * commission forward first and sets the first candidate, as the web's does.
 */
export async function startTasting(replicaId: string, commissionId: string, auid: string): Promise<void> {
    await startCommissionReplica(
        (query, variables) => fetchGraphQLRaw(query, variables, actor(auid)),
        replicaId,
        commissionId,
    )
}
