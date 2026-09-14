import { normalizeAuids } from "../auidUtils"

/**
 * Shaping for the home dashboard's competition, beverage and template panels,
 * shared by the web home page and the Expo home screen so that the same
 * account shows the same cards on both.
 */

/** How many of each the dashboard panels show. */
export const DASHBOARD_PANEL_LIMIT = 5

// --- Competitions -----------------------------------------------------------

export interface RawDashboardCompetition {
    id: string
    name: string
    status: string
    startedAt?: string | null
    endedAt?: string | null
    plannedDates?: { start?: string | null; end?: string | null } | null
    series?: { id?: string | null; name?: string | null; status?: string | null } | null
    holders?: unknown
}

export interface DashboardCompetition {
    id: string
    name: string
    status: string
    /** Holder auids, flattened. */
    holder: number[]
    plannedStartAt: string | null
    plannedEndAt: string | null
    startedAt: string | null
    endedAt: string | null
    series: { id?: string | null; name?: string | null; status?: string | null }
}

/**
 * Flatten a competition as the backend returns it into the card's shape.
 *
 * A competition with no holders recorded is attributed to the viewer: it came
 * back from a holders-filtered query, so they are one.
 */
export function toDashboardCompetition(
    raw: RawDashboardCompetition,
    viewerAuid: number | string,
): DashboardCompetition {
    const holders = Array.isArray(raw.holders)
        ? (raw.holders as unknown[]).flat() as number[]
        : [Number(viewerAuid)]
    return {
        id: raw.id,
        name: raw.name,
        status: raw.status,
        holder: holders,
        plannedStartAt: raw.plannedDates?.start || null,
        plannedEndAt: raw.plannedDates?.end || null,
        startedAt: raw.startedAt || null,
        endedAt: raw.endedAt || null,
        series: {
            id: raw.series?.id,
            name: raw.series?.name,
            status: raw.series?.status,
        },
    }
}

// --- Beverages --------------------------------------------------------------

export interface BeverageProducerRef {
    auid?: number[] | null
    producerId?: string | null
}

/**
 * A beverage's colour ("RED", "WHITE"…) out of its free-form `attributes`.
 *
 * The backend has returned all three shapes over time: a JSON object, a JSON
 * string, and a Java-style `{color=RED, …}` map string.
 */
export function beverageColorFromAttributes(attributes: unknown): string | undefined {
    if (!attributes) return undefined
    if (typeof attributes === "object") {
        return ((attributes as { color?: string }).color) || undefined
    }
    if (typeof attributes === "string") {
        try {
            const parsed = JSON.parse(attributes)
            return parsed?.color || undefined
        } catch {
            const match = attributes.match(/color=([^,}]+)/)
            return match ? match[1].trim().replace(/^["']|["']$/g, "") : undefined
        }
    }
    return undefined
}

/** The beverage with its colour lifted out of `attributes` as `type`. */
export function withBeverageType<T extends { attributes?: unknown }>(beverage: T): T & { type?: string } {
    return { ...beverage, type: beverageColorFromAttributes(beverage.attributes) }
}

/** Beverage type id -> code ("RED"), from the published beverage types. */
export function buildBeverageTypeCodeMap(
    types: Array<{ id: string; code: string; status?: string | null }> | null | undefined,
): Record<string, string> {
    const map: Record<string, string> = {}
    for (const type of types ?? []) {
        if (type.status && type.status !== "PUBLISHED") continue
        map[type.id] = type.code
    }
    return map
}

/**
 * The code a beverage card translates into its type label: the registered
 * type when the id resolves, else the colour from its attributes.
 */
export function beverageTypeCode(
    beverage: { typeId?: string | null; type?: string | null },
    typeMap?: Record<string, string>,
): string | null {
    return (typeMap && beverage.typeId && typeMap[beverage.typeId]) || beverage.type || null
}

/** Producer labels for a beverage card, deduplicated, in the order given. */
export function beverageProducerLabels(
    producers: BeverageProducerRef[] | null | undefined,
    usernames?: Record<string, string>,
): string[] {
    const labels: string[] = []
    for (const producer of producers ?? []) {
        if (producer.auid && producer.auid.length > 0) {
            for (const auid of producer.auid) labels.push(usernames?.[auid] || `@${auid}`)
        } else if (producer.producerId) {
            labels.push(`Producer ${String(producer.producerId).slice(0, 8)}`)
        }
    }
    return Array.from(new Set(labels))
}

/** Every auid the dashboard cards will want a display name for. */
export function dashboardUsernameAuids(
    competitions: Array<{ holder?: number[] | null }>,
    beverages: Array<{ producers?: BeverageProducerRef[] | null }>,
): string[] {
    const ids = new Set<string>()
    for (const competition of competitions) {
        for (const id of competition.holder ?? []) ids.add(String(id))
    }
    for (const beverage of beverages) {
        for (const producer of beverage.producers ?? []) {
            for (const id of producer.auid ?? []) ids.add(String(id))
        }
    }
    return Array.from(ids)
}

// --- Templates --------------------------------------------------------------

export interface RawTemplateEdition {
    id: string
    version: number
    status?: string | null
    template?: {
        id: string
        name: string
        owners?: unknown
        beverageType?: { id?: string | null; code?: string | null; name?: string | null } | null
        status?: string | null
        createdAt?: string | null
    } | null
}

export interface DashboardTemplate {
    id: string
    name: string
    owners: unknown
    /** Display name of the beverage type, as the web renders it (untranslated). */
    beverageType: string
    latestEdition: { id: string; version: number; status?: string | null }
}

/**
 * One entry per template, carrying its highest-versioned edition.
 *
 * The backend lists editions, not templates, and cannot filter them by owner,
 * so both apps group and filter client-side.
 */
export function selectLatestTemplateEditions(
    editions: RawTemplateEdition[] | null | undefined,
): DashboardTemplate[] {
    const latest = new Map<string, RawTemplateEdition>()
    for (const edition of editions ?? []) {
        if (!edition.template) continue
        const existing = latest.get(edition.template.id)
        if (!existing || edition.version > existing.version) latest.set(edition.template.id, edition)
    }
    return Array.from(latest.values()).map((edition) => ({
        id: edition.template!.id,
        name: edition.template!.name,
        owners: edition.template!.owners ?? [],
        beverageType: edition.template!.beverageType?.name ?? edition.template!.beverageType?.code ?? "",
        latestEdition: { id: edition.id, version: edition.version, status: edition.status },
    }))
}

/**
 * Whether the user owns a template. `owners` is a nested auid array, so this
 * matches through `normalizeAuids` rather than a flat `includes`.
 */
export function isTemplateOwnedBy(template: { owners?: unknown }, auid: number | string): boolean {
    return normalizeAuids(template.owners).includes(String(auid))
}
