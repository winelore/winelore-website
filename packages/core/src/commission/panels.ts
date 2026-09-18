import { normalizeAuids } from "../auidUtils"
import { parseAttributes } from "../evaluation/attributes"
import { isReplicaCandidateFinished } from "../evaluation/routing"

/**
 * The commission's panels and their candidates — the samples tasted, in
 * order — as the web's panels section and the app's show them: what each
 * row says, search, the selected replica's tasting progress, reordering.
 */

export interface CandidateSample {
    id: string
    volumeMl?: number | null
    batch?: {
        id: string
        lotNumber?: string | null
        volumeMl?: number | null
        attributes?: any
        beverage?: {
            id: string
            name: string
            status?: string
            attributes?: any
            producers?: { auid?: number[] | number | null; producerId?: string | null }[] | null
        } | null
    } | null
}

export interface PanelCandidate {
    id: string
    panelId?: string | null
    anonymizedCode?: string | null
    beverageType?: { id: string; code: string; name: string } | null
    sample?: CandidateSample | null
}

export interface CommissionPanelEntry {
    id: string
    name: string
    candidates?: PanelCandidate[] | null
}

/** Below this many samples the whole list fits on screen, so a search box is just noise. */
export const PANEL_SEARCH_THRESHOLD = 6

/** Producers' names for a candidate's beverage, once they are known. */
export function candidateProducerNames(candidate: PanelCandidate, names: Record<string, string> | undefined): string | null {
    const producers = candidate.sample?.batch?.beverage?.producers
    if (!producers?.length || !names) return null
    const list = producers.flatMap((producer) => normalizeAuids(producer.auid)).map((id) => names[id] || id)
    return list.length > 0 ? list.join(", ") : null
}

/** A beverage type as shown: translated when there is a translation, else its name. */
export function candidateTypeLabel(
    type: PanelCandidate["beverageType"],
    formatBeverageType: (code: string) => string,
): string | null {
    if (!type) return null
    const translated = formatBeverageType(type.code)
    return translated !== type.code ? translated : type.name
}

export interface CandidateDescription {
    /** The real beverage, only for holders and once the commission has ended: tasting is blind. */
    beverageName: string | null
    producerName: string | null
    code: string | null
    lotNo: string | null
    vintage: string | null
    volume: number | null
    typeLabel: string | null
}

export function describeCandidate(
    candidate: PanelCandidate,
    options: { showRealBeverage: boolean; names?: Record<string, string>; formatBeverageType: (code: string) => string },
): CandidateDescription {
    const beverageName = candidate.sample?.batch?.beverage?.name
    return {
        beverageName: options.showRealBeverage && beverageName ? beverageName : null,
        producerName: options.showRealBeverage ? candidateProducerNames(candidate, options.names) : null,
        code: candidate.anonymizedCode?.trim() || null,
        lotNo: candidate.sample?.batch?.lotNumber || null,
        vintage: parseAttributes(candidate.sample?.batch?.attributes).vintage || null,
        volume: candidate.sample?.volumeMl || null,
        typeLabel: candidateTypeLabel(candidate.beverageType, options.formatBeverageType),
    }
}

export interface PanelEntry {
    panel: CommissionPanelEntry
    items: PanelCandidate[]
}

/**
 * Each panel with its candidates in tasting order — with a reorder not yet
 * saved already applied, so the list moves the moment it is asked to.
 */
export function panelEntries(
    panels: CommissionPanelEntry[],
    pendingOrder?: { panelId: string; ids: string[] } | null,
    candidates: PanelCandidate[] = [],
): PanelEntry[] {
    return panels.map((panel) => {
        const list = panel.candidates?.length ? panel.candidates : candidates.filter((candidate) => candidate.panelId === panel.id)
        if (pendingOrder?.panelId !== panel.id) return { panel, items: list }
        const position = new Map(pendingOrder.ids.map((id, index) => [id, index]))
        return { panel, items: [...list].sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0)) }
    })
}

/**
 * The panels matching a search: a panel whose name matches keeps all its
 * samples, any other only those whose code, beverage, producer, lot, vintage
 * or type matches. Panels left empty are dropped.
 */
export function searchPanelEntries(
    entries: PanelEntry[],
    query: string,
    describe: (candidate: PanelCandidate) => CandidateDescription,
): PanelEntry[] {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    const matches = (candidate: PanelCandidate) => {
        const d = describe(candidate)
        return [d.code, d.beverageName, d.producerName, d.lotNo, d.vintage, d.typeLabel].some((value) => value?.toLowerCase().includes(q))
    }
    return entries
        .map(({ panel, items }) => ({ panel, items: panel.name.toLowerCase().includes(q) ? items : items.filter(matches) }))
        .filter((entry) => entry.items.length > 0)
}

/** The new order of a panel's candidates after moving one, or null when it would not move. */
export function moveCandidate(items: PanelCandidate[], from: number, to: number): string[] | null {
    if (from === to || to < 0 || to >= items.length || from < 0 || from >= items.length) return null
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next.map((candidate) => candidate.id)
}

// --- Progress ---------------------------------------------------------------

export type SampleState = "CURRENT" | "EVALUATED" | "DISQUALIFIED" | "POSTPONED" | "PENDING"

export interface PanelProgress {
    isCurrent: boolean
    finished: number
    total: number
    stateByCandidateId: Map<string, SampleState>
}

/** The replica whose tasting progress is laid over the panels once it has started. */
export interface PanelsProgressReplica {
    name: string
    status: string
    currentPanelId?: string | null
    replicaPanels: Array<{
        id: string
        currentCandidateId?: string | null
        panel?: { id: string } | null
        replicaCandidates?: Array<{ id: string; status: string; candidate?: { id: string } | null }> | null
    }>
}

/**
 * How far the selected replica has got: per panel, which sample is being
 * tasted and which are done, and overall. Nothing before it starts.
 */
export function panelsProgress(replica: PanelsProgressReplica | null | undefined): {
    show: boolean
    live: boolean
    byPanel: Map<string, PanelProgress>
    finished: number
    total: number
} {
    const byPanel = new Map<string, PanelProgress>()
    const show = replica?.status === "STARTED" || replica?.status === "COMPLETED"
    const live = replica?.status === "STARTED"
    if (!replica || !show) return { show: false, live: false, byPanel, finished: 0, total: 0 }

    for (const replicaPanel of replica.replicaPanels) {
        const panelId = replicaPanel.panel?.id
        if (!panelId) continue
        const candidates = replicaPanel.replicaCandidates || []
        const stateByCandidateId = new Map<string, SampleState>()
        let finished = 0
        for (const candidate of candidates) {
            const done = isReplicaCandidateFinished(candidate.status)
            if (done) finished++
            if (!candidate.candidate?.id) continue
            const current = live && !done && candidate.id === replicaPanel.currentCandidateId
            stateByCandidateId.set(candidate.candidate.id, current ? "CURRENT" : (candidate.status as SampleState))
        }
        byPanel.set(panelId, {
            isCurrent: live && replicaPanel.id === replica.currentPanelId,
            finished,
            total: candidates.length,
            stateByCandidateId,
        })
    }

    let finished = 0
    let total = 0
    byPanel.forEach((progress) => {
        finished += progress.finished
        total += progress.total
    })
    return { show, live, byPanel, finished, total }
}
