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
    SetCommissionTemplateEditionDocument,
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

// --- Panels and candidates --------------------------------------------------

export const ADD_COMMISSION_PANEL = `
  mutation AddCommissionPanel($commissionId: ID!, $name: String!) {
      addCommissionPanel(commissionId: $commissionId, name: $name) { id name }
  }
`

export const RENAME_COMMISSION_PANEL = `
  mutation RenameCommissionPanel($commissionId: ID!, $panelId: ID!, $name: String!) {
      renameCommissionPanel(commissionId: $commissionId, panelId: $panelId, name: $name) { id name }
  }
`

export const REMOVE_COMMISSION_PANEL = `
  mutation RemoveCommissionPanel($commissionId: ID!, $panelId: ID!) {
      removeCommissionPanel(commissionId: $commissionId, panelId: $panelId) { id }
  }
`

export const REMOVE_COMMISSION_CANDIDATE = `
  mutation RemoveCommissionCandidate($candidateId: ID!) {
      removeCommissionCandidate(candidateId: $candidateId)
  }
`

export const CHANGE_COMMISSION_CANDIDATE_CODE = `
  mutation ChangeCommissionCandidateCode($id: ID!, $anonymizedCode: String) {
      changeCommissionCandidateCode(id: $id, anonymizedCode: $anonymizedCode) { id anonymizedCode }
  }
`

export const REORDER_COMMISSION_CANDIDATES = `
  mutation ReorderCommissionCandidates($panelId: ID!, $candidateIds: [ID!]!) {
      reorderCommissionCandidates(panelId: $panelId, candidateIds: $candidateIds) { id }
  }
`

const ADD_COMMISSION_CANDIDATE = `
  mutation AddCommissionCandidate($input: AddCommissionCandidateInput!) {
      addCommissionCandidate(input: $input) {
          id
          panel { id }
          anonymizedCode
          sample {
              id
              volumeMl
              batch { id lotNumber volumeMl beverage { id name } }
          }
      }
  }
`

const CHECK_COMMISSION_TEMPLATES = `
  query CheckCommissionTemplates($id: ID!) {
      commission(id: $id) {
          id
          status
          templateEditions { id beverageType { id code } }
      }
  }
`

const GET_BEVERAGE_TYPE = `
  query GetBeverageType($id: ID!) {
      beverage(id: $id) { id type { id code } }
  }
`

/** A code as stored: trimmed, or none. */
export function candidateCodeInput(code: string | null | undefined): string | null {
    return code?.trim() ? code.trim() : null
}

/**
 * Add a sample to a panel as a candidate.
 *
 * While the commission is a draft, a beverage type that has no template yet
 * gets one bound — its type's published template, else any published one —
 * so the tasting can be scored; the web's action has always done this. That
 * step failing does not undo the add.
 */
export async function addCommissionCandidate(
    send: CommissionSend,
    input: { commissionId: string; panelId: string; sampleId: string; anonymizedCode?: string | null },
    onWarning?: (context: string, error: unknown) => void,
): Promise<{ id: string; panelId: string }> {
    const added = (
        await send(ADD_COMMISSION_CANDIDATE, {
            input: { panelId: input.panelId, sampleId: input.sampleId, anonymizedCode: candidateCodeInput(input.anonymizedCode) },
        })
    )?.addCommissionCandidate
    if (!added) throw new Error("The candidate was not added")

    try {
        const commission = (await send(CHECK_COMMISSION_TEMPLATES, { id: input.commissionId }))?.commission
        const beverageId = added.sample?.batch?.beverage?.id
        if (commission?.status === "DRAFT" && beverageId) {
            const bound = new Set((commission.templateEditions || []).map((link: any) => link.beverageType?.id).filter(Boolean))
            const typeId: string | null = (await send(GET_BEVERAGE_TYPE, { id: beverageId }))?.beverage?.type?.id || null
            if (typeId && !bound.has(typeId)) {
                const items: any[] =
                    (await send(print(DevGetEvaluationTemplateEditionsDocument)))?.evaluationTemplateEditions?.items || []
                const usable = (item: any) => (item.status === "PUBLISHED" || item.status === "ACTIVE") && item.categories?.length > 0
                const edition =
                    items.find((item) => usable(item) && item.template?.beverageType?.id === typeId) || items.find(usable) || items[0]
                if (edition) {
                    await send(print(DevSetCommissionTemplateEditionDocument), {
                        id: input.commissionId,
                        beverageTypeId: typeId,
                        templateEditionId: edition.id,
                    })
                }
            }
        }
    } catch (error) {
        onWarning?.("template for the new candidate", error)
    }

    return { id: added.id, panelId: added.panel?.id }
}

// --- Choosing a sample ------------------------------------------------------

export const SEARCH_BEVERAGES = `
  query SearchBeverages($query: String!, $limit: Int!, $offset: Int!) {
      search(query: $query, types: [BEVERAGE], limit: $limit, offset: $offset) {
          items { id name }
      }
  }
`

export const GET_BEVERAGES_PAGE = `
  query GetBeverages($limit: Int!, $offset: Int!) {
      beverages(limit: $limit, offset: $offset) { items { id name } }
      beverageCount
  }
`

export const GET_BATCHES_PAGE = `
  query GetBatches($beverageId: ID!, $limit: Int!, $offset: Int!) {
      batches(beverageId: $beverageId, limit: $limit, offset: $offset) {
          items { id lotNumber volumeMl createdAt attributes }
      }
      batchCount(beverageId: $beverageId)
  }
`

export const GET_SAMPLES_PAGE = `
  query GetSamples($batchId: ID!, $limit: Int!, $offset: Int!) {
      samples(batchId: $batchId, limit: $limit, offset: $offset) {
          items { id volumeMl createdAt }
      }
      sampleCount(batchId: $batchId)
  }
`

export interface WizardPage<T> {
    items: T[]
    page: number
    totalPages: number
    hasMore: boolean
}

/**
 * One page of beverages to pick from: a search by name, or all of them. A
 * search reports more while it fills a page, since it has no total.
 */
export async function loadBeveragePage(
    send: CommissionSend,
    search: string,
    page: number,
    limit: number,
): Promise<WizardPage<{ id: string; name: string }>> {
    const offset = Math.max(0, (page - 1) * limit)
    const query = search.trim()
    if (query) {
        const items = ((await send(SEARCH_BEVERAGES, { query, limit, offset }))?.search?.items || []).filter(
            (item: any) => item?.id && item?.name,
        )
        const hasMore = items.length === limit
        return { items, page, totalPages: hasMore ? Math.max(page + 1, 2) : page, hasMore }
    }
    const data = await send(GET_BEVERAGES_PAGE, { limit, offset })
    const items = (data?.beverages?.items || []).filter((item: any) => item?.id && item?.name)
    const totalPages = Math.ceil((data?.beverageCount || items.length) / limit)
    return { items, page, totalPages, hasMore: page < totalPages }
}

async function countedPage<T>(
    send: CommissionSend,
    query: string,
    variables: Record<string, unknown>,
    list: string,
    count: string,
    page: number,
    limit: number,
): Promise<WizardPage<T>> {
    const data = await send(query, { ...variables, limit, offset: Math.max(0, (page - 1) * limit) })
    const items: T[] = data?.[list]?.items || []
    const total = typeof data?.[count] === "number" ? data[count] : items.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    return { items, page, totalPages, hasMore: page < totalPages }
}

export interface WizardBatch {
    id: string
    lotNumber?: string | null
    volumeMl?: number | null
    createdAt?: string | null
    attributes?: any
}

export interface WizardSample {
    id: string
    volumeMl?: number | null
    createdAt?: string | null
}

export const loadBatchPage = (send: CommissionSend, beverageId: string, page: number, limit: number) =>
    countedPage<WizardBatch>(send, GET_BATCHES_PAGE, { beverageId }, "batches", "batchCount", page, limit)

export const loadSamplePage = (send: CommissionSend, batchId: string, page: number, limit: number) =>
    countedPage<WizardSample>(send, GET_SAMPLES_PAGE, { batchId }, "samples", "sampleCount", page, limit)

// --- Templates --------------------------------------------------------------

export const REMOVE_COMMISSION_TEMPLATE_EDITION = `
  mutation RemoveCommissionTemplateEdition($id: ID!, $beverageTypeId: ID!) {
      removeCommissionTemplateEdition(id: $id, beverageTypeId: $beverageTypeId) { id }
  }
`

export const SET_COMMISSION_TEMPLATE_EDITION = print(SetCommissionTemplateEditionDocument)
