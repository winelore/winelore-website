import { print } from "graphql"
import {
    ADD_COMMISSION_PANEL,
    ADD_COMMISSION_REPLICA_MEMBER,
    CHANGE_COMMISSION_CANDIDATE_CODE,
    GET_TEMPLATE_CATALOG,
    REMOVE_COMMISSION_CANDIDATE,
    REMOVE_COMMISSION_PANEL,
    REMOVE_COMMISSION_TEMPLATE_EDITION,
    RENAME_COMMISSION_PANEL,
    REORDER_COMMISSION_CANDIDATES,
    SET_COMMISSION_TEMPLATE_EDITION,
    addCommissionCandidate,
    candidateCodeInput,
    loadBatchPage,
    loadBeveragePage,
    loadSamplePage,
    toTemplateCatalog,
    type CatalogTemplate,
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

// --- Panels, candidates and templates ---------------------------------------

/** A sender for core's multi-step helpers: lenient like the web's, as the user. */
const sendAs = (auid: string) => (query: string, variables?: Record<string, unknown>) =>
    fetchGraphQLRaw<any>(query, variables, actor(auid))

export async function addPanel(commissionId: string, name: string, auid: string): Promise<void> {
    await mutateGraphQLRaw(ADD_COMMISSION_PANEL, { commissionId, name: name.trim() }, actor(auid))
}

export async function renamePanel(commissionId: string, panelId: string, name: string, auid: string): Promise<void> {
    await mutateGraphQLRaw(RENAME_COMMISSION_PANEL, { commissionId, panelId, name: name.trim() }, actor(auid))
}

export async function removePanel(commissionId: string, panelId: string, auid: string): Promise<void> {
    await mutateGraphQLRaw(REMOVE_COMMISSION_PANEL, { commissionId, panelId }, actor(auid))
}

export async function removeCandidate(candidateId: string, auid: string): Promise<void> {
    await mutateGraphQLRaw(REMOVE_COMMISSION_CANDIDATE, { candidateId }, actor(auid))
}

export async function changeCandidateCode(candidateId: string, code: string, auid: string): Promise<void> {
    await mutateGraphQLRaw(CHANGE_COMMISSION_CANDIDATE_CODE, { id: candidateId, anonymizedCode: candidateCodeInput(code) }, actor(auid))
}

export async function reorderCandidates(panelId: string, candidateIds: string[], auid: string): Promise<void> {
    await mutateGraphQLRaw(REORDER_COMMISSION_CANDIDATES, { panelId, candidateIds }, actor(auid))
}

/** Core's add, which binds a template to a new beverage type while the commission is a draft. */
export async function addCandidate(
    input: { commissionId: string; panelId: string; sampleId: string; anonymizedCode?: string },
    auid: string,
): Promise<void> {
    await addCommissionCandidate(sendAs(auid), input)
}

export const beveragesPage = (search: string, page: number, auid: string) => loadBeveragePage(sendAs(auid), search, page, WIZARD_PAGE)
export const batchesPage = (beverageId: string, page: number, auid: string) => loadBatchPage(sendAs(auid), beverageId, page, WIZARD_PAGE)
export const samplesPage = (batchId: string, page: number, auid: string) => loadSamplePage(sendAs(auid), batchId, page, WIZARD_PAGE)

/** The web's wizard shows eight a page; the phone loads them eight at a time as it scrolls. */
const WIZARD_PAGE = 8

export async function setCommissionTemplate(commissionId: string, beverageTypeId: string, templateEditionId: string, auid: string): Promise<void> {
    await mutateGraphQLRaw(SET_COMMISSION_TEMPLATE_EDITION, { id: commissionId, beverageTypeId, templateEditionId }, actor(auid))
}

export async function removeCommissionTemplate(commissionId: string, beverageTypeId: string, auid: string): Promise<void> {
    await mutateGraphQLRaw(REMOVE_COMMISSION_TEMPLATE_EDITION, { id: commissionId, beverageTypeId }, actor(auid))
}

/** Every template's latest edition, to choose one for a beverage type. */
export async function loadTemplateCatalog(): Promise<CatalogTemplate[]> {
    const data = await fetchGraphQLRaw<any>(GET_TEMPLATE_CATALOG, { limit: 100 })
    return toTemplateCatalog(data?.evaluationTemplateEditions?.items)
}
