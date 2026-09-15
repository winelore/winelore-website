import { print } from "graphql"
import {
    DevApproveCommissionDocument,
    DevApproveCompetitionDocument,
    DevApproveCompetitionSeriesDocument,
    DevGetEvaluationTemplateEditionsDocument,
    DevPlanCommissionDocument,
    DevPlanCommissionReplicaDocument,
    DevPlanCompetitionDocument,
    DevSetCommissionTemplateEditionDocument,
    DevStartCommissionDocument,
    DevStartCompetitionDocument,
    DevSubmitCommissionForReviewDocument,
    DevSubmitCompetitionForReviewDocument,
    DevSubmitCompetitionSeriesForReviewDocument,
    GetReplicaCandidatesDocument,
    StartCommissionReplicaDocument,
} from "../gql/sdk"

/**
 * What a holder, chair and judge do from the commission page, as raw strings
 * both apps send with the user as the actor — and the start sequence, which
 * the web's server action ran alone until the app needed it too.
 */

export const RENAME_COMMISSION = `
  mutation RenameCommission($id: ID!, $name: String!) {
      renameCommission(id: $id, name: $name) { id name }
  }
`

export const UPDATE_COMMISSION_DATES = `
  mutation UpdateCommissionDates($id: ID!, $input: PlannedDatesInput!) {
      updateCommissionDates(id: $id, input: $input) { id }
  }
`

/** Members are added one by one afterwards; the input requires the list, and an empty one is valid. */
export const CREATE_COMMISSION_REPLICA = `
  mutation CreateCommissionReplica($input: CreateCommissionReplicaInput!) {
      createCommissionReplica(input: $input) { id name type status }
  }
`

export const RENAME_COMMISSION_REPLICA = `
  mutation RenameCommissionReplica($id: ID!, $name: String) {
      renameCommissionReplica(id: $id, name: $name) { id name type status }
  }
`

export const ADD_COMMISSION_REPLICA_MEMBER = `
  mutation AddCommissionReplicaMember($id: ID!, $input: CommissionReplicaMemberInput!) {
      addCommissionReplicaMember(id: $id, input: $input) {
          id
          name
          members { id auid role isReady }
      }
  }
`

export const REMOVE_COMMISSION_REPLICA_MEMBER = `
  mutation RemoveCommissionReplicaMember($id: ID!, $memberId: ID!) {
      removeCommissionReplicaMember(id: $id, memberId: $memberId) {
          id
          name
          members { id auid role isReady }
      }
  }
`

export const SET_REPLICA_PANEL_CHAOTIC_CANDIDATE_CHANGES = `
  mutation SetCommissionReplicaPanelChaoticCurrentCandidateChangesEnabled($id: ID!, $panelId: ID!, $enabled: Boolean!) {
      setCommissionReplicaPanelChaoticCurrentCandidateChangesEnabled(id: $id, panelId: $panelId, enabled: $enabled) {
          id
          currentPanelId
      }
  }
`

export const SET_REPLICA_CHAOTIC_PANEL_CHANGES = `
  mutation SetCommissionReplicaChaoticCurrentPanelChangesEnabled($id: ID!, $enabled: Boolean!) {
      setCommissionReplicaChaoticCurrentPanelChangesEnabled(id: $id, enabled: $enabled) {
          id
          chaoticCurrentPanelChangesEnabled
      }
  }
`

export function createReplicaInput(commissionId: string, name: string, type: "STANDARD" | "TRAINEE") {
    return { commissionId, name: name.trim() || undefined, type, members: [] }
}

export function commissionDatesInput(start: string | null, end: string | null) {
    return {
        start: start ? new Date(start).toISOString() : null,
        end: end ? new Date(end).toISOString() : null,
    }
}

// --- Starting a replica -----------------------------------------------------

/**
 * Send a query or mutation as the user. It throws when the response has no
 * data; errors beside data are tolerated, as the web's helper does.
 */
export type CommissionSend = <T = any>(query: string, variables?: Record<string, unknown>) => Promise<T>

/** Thrown when there is nothing to taste; the page says so rather than a raw error. */
export const NO_CANDIDATES_TO_START = "NO_CANDIDATES_TO_START"

const HIERARCHY_FIELDS = `
    id
    status
    panels {
        id
        candidates {
            id
            beverageType { id code name }
            sample { id batch { id beverage { id name } } }
        }
    }
    templateEditions {
        id
        beverageType { id code }
        templateEdition { id }
    }
    competition {
        id
        status
        series { id status }
    }
`

const GET_REPLICA_HIERARCHY = `
    query GetReplicaHierarchy($id: ID!) {
        commissionReplica(id: $id) {
            id
            status
            members { id auid role isReady }
            commission { ${HIERARCHY_FIELDS} }
        }
    }
`

const GET_COMMISSION_CANDIDATES = `
    query GetCommissionCandidates($id: ID!) {
        commission(id: $id) { ${HIERARCHY_FIELDS} }
    }
`

const INITIALIZE_REPLICA_PANEL = `
    mutation InitializeCommissionReplicaPanel($id: ID!, $panelId: ID!, $currentCandidateId: ID) {
        setCommissionReplicaCurrentPanel(id: $id, currentPanelId: $panelId) { id }
        setCommissionReplicaPanelCurrentCandidate(id: $id, panelId: $panelId, currentCandidateId: $currentCandidateId) { id }
    }
`

/** The fallback beverage type when neither candidates nor the default edition name one. */
const DEFAULT_BEVERAGE_TYPE_ID = "11111111-1111-4111-8111-111111111101"

const ignore = async (work: () => Promise<unknown>) => {
    try {
        await work()
    } catch {
        // Already in that state, or not allowed to change it: carry on.
    }
}

/**
 * Start a replica's tasting session.
 *
 * The backend requires the whole chain to be running — the series approved,
 * the competition and commission started, templates bound and the replica
 * planned — so a chair starting from the lobby moves each forward first. It
 * then starts the replica and puts the first panel's first pending candidate
 * in front of the judges. Steps that are already done fail quietly; starting
 * the commission or the replica does not.
 */
export async function startCommissionReplica(
    send: CommissionSend,
    replicaId: string,
    commissionId?: string,
    onWarning?: (context: string, error: unknown) => void,
): Promise<unknown> {
    let replica: any = null
    try {
        replica = (await send(GET_REPLICA_HIERARCHY, { id: replicaId }))?.commissionReplica
    } catch (error) {
        onWarning?.("replica hierarchy", error)
    }

    let candidates: any[] = (replica?.commission?.panels || []).flatMap((panel: any) => panel.candidates || [])
    const fallbackId = commissionId || replica?.commission?.id
    if (candidates.length === 0 && fallbackId) {
        try {
            const commission = (await send(GET_COMMISSION_CANDIDATES, { id: fallbackId }))?.commission
            if (commission) {
                replica = { ...(replica ?? {}), commission }
                candidates = (commission.panels || []).flatMap((panel: any) => panel.candidates || [])
            }
        } catch (error) {
            onWarning?.("commission candidates", error)
        }
    }

    if (candidates.length === 0) throw new Error(NO_CANDIDATES_TO_START)

    const commission = replica?.commission
    const series = commission?.competition?.series
    const competition = commission?.competition
    const commId = commission?.id || commissionId
    const commStatus = commission?.status

    if (series?.id && series.status !== "APPROVED" && series.status !== "PUBLISHED") {
        if (series.status === "DRAFT") await ignore(() => send(print(DevSubmitCompetitionSeriesForReviewDocument), { id: series.id }))
        await ignore(() => send(print(DevApproveCompetitionSeriesDocument), { id: series.id }))
    }

    if (competition?.id && competition.status !== "STARTED") {
        if (competition.status === "DRAFT") {
            await ignore(() => send(print(DevSubmitCompetitionForReviewDocument), { id: competition.id }))
            await ignore(() => send(print(DevApproveCompetitionDocument), { id: competition.id }))
        }
        if (competition.status === "DRAFT" || competition.status === "APPROVED") {
            await ignore(() => send(print(DevPlanCompetitionDocument), { id: competition.id }))
        }
        await ignore(() => send(print(DevStartCompetitionDocument), { id: competition.id }))
    }

    if (commId && commStatus !== "STARTED") {
        if (commStatus === "DRAFT") {
            await bindMissingTemplates(send, commId, commission, candidates, onWarning)
            await ignore(() => send(print(DevSubmitCommissionForReviewDocument), { id: commId }))
            await ignore(() => send(print(DevApproveCommissionDocument), { id: commId }))
        }
        if (commStatus === "DRAFT" || commStatus === "APPROVED") {
            await ignore(() => send(print(DevPlanCommissionDocument), { id: commId }))
        }
        await send(print(DevStartCommissionDocument), { id: commId })
    }

    if (replica?.status !== "PLANNED" && replica?.status !== "STARTED") {
        await ignore(() => send(print(DevPlanCommissionReplicaDocument), { id: replicaId }))
    }

    const started = await send(print(StartCommissionReplicaDocument), { id: replicaId })

    try {
        const result = await send(print(GetReplicaCandidatesDocument), { replicaId })
        const firstPanel = result?.commissionReplica?.replicaPanels?.[0]
        const first =
            firstPanel?.replicaCandidates?.find((candidate: any) => candidate.status === "PENDING") ||
            firstPanel?.replicaCandidates?.[0]
        if (firstPanel && first) {
            await send(INITIALIZE_REPLICA_PANEL, { id: replicaId, panelId: firstPanel.id, currentCandidateId: first.id })
        }
    } catch (error) {
        onWarning?.("initial candidate", error)
    }

    return started
}

/** Bind a published template to every candidate beverage type that has none yet. */
async function bindMissingTemplates(
    send: CommissionSend,
    commissionId: string,
    commission: any,
    candidates: any[],
    onWarning?: (context: string, error: unknown) => void,
) {
    const bound = new Set((commission?.templateEditions || []).map((link: any) => link.beverageType?.id).filter(Boolean))
    const items: any[] = (await send(print(DevGetEvaluationTemplateEditionsDocument)))?.evaluationTemplateEditions?.items || []
    const active = items.filter(
        (item) => (item.status === "PUBLISHED" || item.status === "ACTIVE") && item.categories?.length > 0,
    )
    const fallback = active.find((item) => item.categories?.length > 1) || active[0] || items[0]

    const types = new Set<string>(candidates.map((candidate) => candidate?.beverageType?.id).filter(Boolean))
    const bind = (beverageTypeId: string, templateEditionId: string) =>
        send(print(DevSetCommissionTemplateEditionDocument), { id: commissionId, beverageTypeId, templateEditionId })

    if (types.size > 0) {
        for (const typeId of types) {
            if (bound.has(typeId)) continue
            const edition = active.find((item) => item.template?.beverageType?.id === typeId) || fallback
            if (!edition) continue
            try {
                await bind(typeId, edition.id)
            } catch (error) {
                onWarning?.(`template for beverage type ${typeId}`, error)
            }
        }
    } else if (bound.size === 0 && fallback) {
        await ignore(() => bind(fallback.template?.beverageType?.id || DEFAULT_BEVERAGE_TYPE_ID, fallback.id))
    }
}
