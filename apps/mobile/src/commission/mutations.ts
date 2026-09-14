import { mutateGraphQLRaw } from "../api/client"

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
