import { beverageColorFromAttributes } from "../dashboard/entities"
import {
    GET_AWARD_COMMISSION,
    GET_BATCH_SAMPLES,
    GET_BEVERAGE_BATCHES,
    GET_BEVERAGE_PAGE,
    GET_BEVERAGE_PAGE_AWARDS,
    GET_BEVERAGE_TYPE_NAME,
} from "./queries"

// --- Data -------------------------------------------------------------------

export interface BeverageProducer {
    id: string
    producerId?: string | null
    auid?: number[] | null
    /** MAKER, OWNER, DISTRIBUTOR, BOTTLER… */
    role: string
}

export interface BeverageOrigin {
    latitude?: number | null
    longitude?: number | null
}

export interface RawBeverage {
    id: string
    name: string
    status: string
    typeId: string
    schemaEditionIds?: string[] | null
    attributes?: unknown
    createdBy?: number[] | number | null
    producers?: BeverageProducer[] | null
    origin?: BeverageOrigin | null
    createdAt: string
}

export interface BeverageAwardCompetition {
    id: string
    name: string
    status: string
    plannedDates?: { start?: string | null; end?: string | null } | null
    startedAt?: string | null
    endedAt?: string | null
    series?: { id: string; name: string } | null
}

export interface BeverageAward {
    id: string
    commissionId: string
    candidateId: string
    assignedAt: string
    award: {
        id: string
        code: string
        name: string
        description?: string | null
        badgeUrl?: string | null
    }
    commission?: { id: string; name: string; competition: BeverageAwardCompetition } | null
}

export interface BeverageSample {
    id: string
    volumeMl?: number | null
    attributes?: unknown
    createdAt?: string | null
}

export interface BeverageBatch {
    id: string
    volumeMl?: number | null
    lotNumber?: string | null
    attributes?: unknown
    createdAt?: string | null
    samples: BeverageSample[]
}

export interface BeveragePageData {
    beverage: RawBeverage
    /** The registered type's name ("Wine"), or "" when it could not be read. */
    typeName: string
    awards: BeverageAward[]
    batches: BeverageBatch[]
}

/** Sends one GraphQL query; each app supplies its own transport. */
export type BeveragePageQuery = <T>(query: string, variables: Record<string, unknown>) => Promise<T>

/**
 * Everything the beverage page shows, fetched the way the web page fetches it.
 *
 * Only the beverage itself is required: `null` means there is no such
 * beverage, and a failure to read it throws. Awards, batches and the type
 * name each fall back to nothing on their own, so one failing never costs
 * the page the others. `onError` hears about those, for logging.
 */
export async function loadBeveragePage(
    query: BeveragePageQuery,
    id: string,
    onError?: (context: string, error: unknown) => void,
): Promise<BeveragePageData | null> {
    const response = await query<{ beverage?: RawBeverage | null }>(GET_BEVERAGE_PAGE, { id })
    const beverage = response?.beverage
    if (!beverage) return null

    const [awards, batches, typeName] = await Promise.all([
        loadAwards(query, id, onError),
        loadBatches(query, id, onError),
        query<{ beverageType?: { name?: string | null } | null }>(GET_BEVERAGE_TYPE_NAME, { id: beverage.typeId }).then(
            (data) => data?.beverageType?.name || "",
            (error) => {
                onError?.("beverage type name", error)
                return ""
            },
        ),
    ])

    return { beverage, typeName, awards, batches }
}

async function loadAwards(
    query: BeveragePageQuery,
    id: string,
    onError?: (context: string, error: unknown) => void,
): Promise<BeverageAward[]> {
    try {
        const data = await query<{ beverageAwards?: BeverageAward[] | null }>(GET_BEVERAGE_PAGE_AWARDS, { id })
        const awards = data?.beverageAwards ?? []
        // Several awards from one commission need its competition only once.
        const commissions = new Map<string, Promise<BeverageAward["commission"]>>()
        const commissionFor = (commissionId: string) => {
            let pending = commissions.get(commissionId)
            if (!pending) {
                pending = query<{ commission?: BeverageAward["commission"] }>(GET_AWARD_COMMISSION, {
                    id: commissionId,
                }).then(
                    (result) => result?.commission ?? null,
                    (error) => {
                        onError?.(`commission ${commissionId}`, error)
                        return null
                    },
                )
                commissions.set(commissionId, pending)
            }
            return pending
        }
        return await Promise.all(
            awards.map(async (award) => ({ ...award, commission: await commissionFor(award.commissionId) })),
        )
    } catch (error) {
        onError?.("beverage awards", error)
        return []
    }
}

async function loadBatches(
    query: BeveragePageQuery,
    beverageId: string,
    onError?: (context: string, error: unknown) => void,
): Promise<BeverageBatch[]> {
    try {
        const data = await query<{ batches?: { items?: Omit<BeverageBatch, "samples">[] | null } | null }>(
            GET_BEVERAGE_BATCHES,
            { beverageId },
        )
        return await Promise.all(
            (data?.batches?.items ?? []).map(async (batch) => {
                try {
                    const samples = await query<{ samples?: { items?: BeverageSample[] | null } | null }>(
                        GET_BATCH_SAMPLES,
                        { batchId: batch.id },
                    )
                    return { ...batch, samples: samples?.samples?.items ?? [] }
                } catch (error) {
                    onError?.(`samples for batch ${batch.id}`, error)
                    return { ...batch, samples: [] }
                }
            }),
        )
    } catch (error) {
        onError?.("beverage batches", error)
        return []
    }
}

// --- Attributes -------------------------------------------------------------

/**
 * A beverage's or batch's free-form `attributes` as strings.
 *
 * The backend has sent a JSON object, a JSON string and a Kotlin map's
 * `{key=value, …}` string; all three read the same here.
 */
export function parseAttributes(input: unknown): Record<string, string> {
    if (!input) return {}
    const fromObject = (object: object) => {
        const result: Record<string, string> = {}
        for (const [key, value] of Object.entries(object)) {
            if (value !== null && value !== undefined) result[key] = String(value)
        }
        return result
    }
    if (typeof input === "object") return fromObject(input)
    if (typeof input !== "string") return {}

    const trimmed = input.trim()
    if (!trimmed) return {}
    try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === "object") return fromObject(parsed)
    } catch {
        // Not JSON: try the Kotlin map form below.
    }
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return {}
    const content = trimmed.slice(1, -1).trim()
    const result: Record<string, string> = {}
    if (!content) return result
    for (const part of content.split(/,\s*/)) {
        const equals = part.indexOf("=")
        if (equals === -1) continue
        const key = part.substring(0, equals).trim().replace(/^["']|["']$/g, "")
        const value = part.substring(equals + 1).trim().replace(/^["']|["']$/g, "")
        if (key) result[key] = value
    }
    return result
}

/** The beverage's colour ("RED", "WHITE"…), or null when it has none. */
export function beverageColor(attributes: unknown): string | null {
    return beverageColorFromAttributes(attributes) || null
}

export interface TechnicalSpec {
    /** "alcoholByVolume" spaced as "alcohol By Volume"; shown capitalised. */
    key: string
    value: string
}

/** The Technical Specs table: every attribute but the colour, which the page shows as a chip. */
export function technicalSpecs(attributes: unknown): TechnicalSpec[] {
    return Object.entries(parseAttributes(attributes))
        .filter(([key]) => key !== "color")
        .map(([key, value]) => ({ key: key.replace(/([A-Z])/g, " $1").trim(), value }))
}

// --- Tabs -------------------------------------------------------------------

export type BeverageTab = "specs" | "batches" | "awards"

export function isBeverageTab(value: unknown): value is BeverageTab {
    return value === "specs" || value === "batches" || value === "awards"
}

/**
 * The tabs in the order the web shows them: Technical Specs leads when there
 * are any, and trails otherwise, behind Batches and Awards.
 */
export function beverageTabs(specCount: number): BeverageTab[] {
    return specCount > 0 ? ["specs", "batches", "awards"] : ["batches", "awards", "specs"]
}

/** The tab a page opens on without one asked for: specs when there are any. */
export function defaultBeverageTab(specCount: number): BeverageTab {
    return specCount > 0 ? "specs" : "batches"
}

// --- People -----------------------------------------------------------------

/** Whether the viewer is one of the beverage's producers, and so may edit it. */
export function isBeverageProducer(
    producers: BeverageProducer[] | null | undefined,
    auid: number | string | null | undefined,
): boolean {
    if (auid === null || auid === undefined || auid === "") return false
    const viewer = Number(auid)
    return (producers ?? []).some((producer) => {
        const auidMatches = producer.auid
            ? Array.isArray(producer.auid)
                ? producer.auid.map(Number).includes(viewer)
                : Number(producer.auid) === viewer
            : false
        return auidMatches || Boolean(producer.producerId && producer.producerId === String(auid))
    })
}

/** A producer's first AXUS id, where it is a person rather than a winery. */
export function producerAuid(producer: Pick<BeverageProducer, "auid">): number | null {
    const auid = Array.isArray(producer.auid) ? producer.auid[0] : producer.auid
    return auid === null || auid === undefined ? null : Number(auid)
}

/** The auid that entered the beverage, if the backend says. */
export function beverageCreatorAuid(beverage: Pick<RawBeverage, "createdBy">): number | null {
    const id = Array.isArray(beverage.createdBy) ? beverage.createdBy[0] : beverage.createdBy
    return id === null || id === undefined ? null : Number(id)
}

/**
 * What a producer badge says: their name, then `@username`, then the id —
 * `@user-<auid>` for a person, `Winery <id>` for a registered producer.
 */
export function producerName(
    producer: Pick<BeverageProducer, "auid" | "producerId"> & {
        displayName?: string | null
        username?: string | null
    },
    unknownLabel: string,
): string {
    if (producer.displayName) return producer.displayName
    if (producer.username) return `@${producer.username}`
    const auid = producerAuid(producer)
    if (auid !== null) return `@user-${auid}`
    if (producer.producerId) return `Winery ${String(producer.producerId).slice(0, 8)}`
    return unknownLabel
}

/** The `roles.*` message for a producer role the app knows, else null. */
export function producerRoleKey(role: string): "roles.maker" | "roles.owner" | "roles.distributor" | "roles.bottler" | null {
    switch (role.toUpperCase()) {
        case "MAKER":
            return "roles.maker"
        case "OWNER":
            return "roles.owner"
        case "DISTRIBUTOR":
            return "roles.distributor"
        case "BOTTLER":
            return "roles.bottler"
        default:
            return null
    }
}

/** The roles a producer can be added in. */
export const ADDABLE_PRODUCER_ROLES = ["MAKER", "BOTTLER"] as const
export type AddableProducerRole = (typeof ADDABLE_PRODUCER_ROLES)[number]

// --- Status -----------------------------------------------------------------

export type BeverageStatusTone = "approved" | "suspended" | "pending" | "neutral"

/** Which of the web's status colours a beverage status takes. */
export function beverageStatusTone(status: string): BeverageStatusTone {
    switch (status.toUpperCase()) {
        case "APPROVED":
        case "PUBLISHED":
            return "approved"
        case "SUSPENDED":
            return "suspended"
        case "DRAFT":
        case "IN_REVIEW":
        case "SUBMITTED":
            return "pending"
        default:
            return "neutral"
    }
}

// --- Batches ----------------------------------------------------------------

export interface SampleGroup {
    count: number
    /** null for samples without a volume, which the page calls "Standard". */
    volumeMl: number | null
}

export type AllocationTone = "normal" | "high" | "over"

export interface BatchFigures {
    vintage: string | null
    /** "13.5%", or null when the batch has no ABV attribute. */
    abv: string | null
    sampleGroups: SampleGroup[]
    /** Total volume of the samples that have one. */
    sampleVolume: number
    batchVolume: number | null
    /** Share of the batch given to samples, whole percent, capped at 100. */
    allocatedPercent: number | null
    /** 0–1 for the allocation bar. */
    allocatedFraction: number | null
    allocationTone: AllocationTone | null
}

const numberOrNull = (value: unknown) => (typeof value === "number" && !Number.isNaN(value) ? value : null)

/** What a batch card shows: vintage, ABV, and how much of it has gone to samples. */
export function batchFigures(batch: Pick<BeverageBatch, "attributes" | "volumeMl" | "samples">): BatchFigures {
    const attributes = parseAttributes(batch.attributes)
    const abv = attributes.alcoholByVolume || attributes.abv || attributes.alcohol || null

    const groups = new Map<number | "standard", SampleGroup>()
    let sampleVolume = 0
    for (const sample of batch.samples ?? []) {
        const volume = numberOrNull(sample.volumeMl)
        if (volume !== null) sampleVolume += volume
        const key = volume ?? "standard"
        const group = groups.get(key)
        if (group) group.count++
        else groups.set(key, { count: 1, volumeMl: volume })
    }
    const sampleGroups = Array.from(groups.values()).sort((a, b) => (b.volumeMl || 0) - (a.volumeMl || 0))

    const batchVolume = numberOrNull(batch.volumeMl)
    const ratio = batchVolume !== null ? sampleVolume / batchVolume : null
    return {
        vintage: attributes.vintage || null,
        abv: abv ? `${Math.round(parseFloat(abv) * 10) / 10}%` : null,
        sampleGroups,
        sampleVolume,
        batchVolume,
        allocatedPercent: ratio === null ? null : Math.min(100, Math.round(ratio * 100)),
        allocatedFraction: ratio === null ? null : Math.min(1, ratio),
        allocationTone: ratio === null ? null : sampleVolume > batchVolume! ? "over" : ratio > 0.8 ? "high" : "normal",
    }
}

/** The samples list's search: by short code, full id or volume. */
export function filterSamples<T extends Pick<BeverageSample, "id" | "volumeMl">>(samples: T[], search: string): T[] {
    const query = search.toLowerCase().trim()
    if (!query) return samples
    return samples.filter((sample) => {
        const volume = sample.volumeMl ? String(sample.volumeMl) : ""
        return sample.id.toLowerCase().includes(query) || volume.includes(query)
    })
}

/** The samples list shows a search field once it has more than this many. */
export const SAMPLE_SEARCH_THRESHOLD = 4

// --- Awards -----------------------------------------------------------------

export interface AwardGroup {
    /** Absent for awards whose commission could not be read. */
    competition?: BeverageAwardCompetition
    awards: BeverageAward[]
}

/** Awards gathered under the competition that gave them, in the order first seen. */
export function groupAwardsByCompetition(awards: BeverageAward[]): AwardGroup[] {
    const groups = new Map<string, AwardGroup>()
    for (const award of awards) {
        const competition = award.commission?.competition
        const key = competition?.id || "unknown"
        let group = groups.get(key)
        if (!group) {
            group = { competition, awards: [] }
            groups.set(key, group)
        }
        group.awards.push(award)
    }
    return Array.from(groups.values())
}
