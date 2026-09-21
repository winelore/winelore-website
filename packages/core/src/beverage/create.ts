import { print } from "graphql"
import { DevCreateBatchDocument, DevCreateBeverageDocument, DevCreateSampleDocument } from "../gql/graphql"

/**
 * Creating a beverage, a batch and a sample — the web's /beverage/create,
 * /batch/create and /sample/create, and the app's sheets of the same paths:
 * the characteristics a beverage type asks for, the inputs the backend
 * takes, and the checks the web makes before sending them.
 */

/** Sends one GraphQL document as the signed-in user; each app has its own transport. */
export type BeverageSend = (query: string, variables: Record<string, unknown>) => Promise<any>

// --- Characteristics --------------------------------------------------------

export type CharacteristicScope = "BEVERAGE" | "BATCH" | "SAMPLE"

export interface BeverageCharacteristic {
    id: string
    code: string
    name: string
    /** The backend's class name, e.g. "EnumPropertyResponse", "IntPropertyResponse". */
    typeName: string
    isRequired: boolean
    allowedValues?: string[]
    minLimit?: number
    maxLimit?: number
}

export const GET_BEVERAGE_TYPE_EDITIONS = `
    query GetEditions($typeId: ID!) {
        beverageTypeEditionsByType(typeId: $typeId) { id version status propertySchemas }
    }
`

function parsePropertyList(text: string): Array<Record<string, any>> {
    if (!text.trim()) return []
    const items: Array<Record<string, any>> = []
    const itemPattern = /(\w+PropertyResponse)\((.*?)\)(?=, \w+PropertyResponse|\s*$)/g
    let match: RegExpExecArray | null
    while ((match = itemPattern.exec(text)) !== null) {
        const property: Record<string, any> = { typeName: match[1] }
        const fieldPattern = /(\w+)=((?:\[.*?\]|[^,]+))/g
        let field: RegExpExecArray | null
        while ((field = fieldPattern.exec(match[2])) !== null) {
            let value: any = field[2].trim()
            if (value === "null") value = null
            else if (value.startsWith("[") && value.endsWith("]")) {
                value = value
                    .slice(1, -1)
                    .split(",")
                    .map((part: string) => part.trim())
                    .filter(Boolean)
            }
            property[field[1]] = value
        }
        items.push(property)
    }
    return items
}

/**
 * A type edition's `propertySchemas`, which the backend sends as Kotlin's
 * `toString()` of its schema map — `{BEVERAGE=[EnumPropertyResponse(code=…,
 * …)], BATCH=[…], SAMPLE=[…]}` — rather than as JSON.
 */
export function parsePropertySchemas(raw: string | null | undefined): Record<CharacteristicScope, Array<Record<string, any>>> {
    const result: Record<CharacteristicScope, Array<Record<string, any>>> = { BEVERAGE: [], BATCH: [], SAMPLE: [] }
    if (!raw) return result
    const beverage = raw.match(/BEVERAGE=\[([\s\S]*?)\](?:, BATCH=|\})/)
    if (beverage?.[1]) result.BEVERAGE = parsePropertyList(beverage[1])
    const batch = raw.match(/BATCH=\[([\s\S]*?)\](?:, SAMPLE=|\})/)
    if (batch?.[1]) result.BATCH = parsePropertyList(batch[1])
    const sample = raw.match(/SAMPLE=\[([\s\S]*?)\](?:\})/)
    if (sample?.[1]) result.SAMPLE = parsePropertyList(sample[1])
    return result
}

/** The characteristics a type's active edition (else its first) asks of a beverage, batch or sample. */
export function characteristicsOf(
    editions: Array<{ status?: string | null; propertySchemas?: string | null }> | null | undefined,
    scope: CharacteristicScope,
): BeverageCharacteristic[] {
    const edition = (editions || []).find((candidate) => candidate.status === "ACTIVE") || editions?.[0]
    return parsePropertySchemas(edition?.propertySchemas)[scope].map((property) => ({
        id: property.id || property.code,
        code: property.code,
        name: property.name || property.code,
        typeName: property.typeName || "",
        isRequired: property.isRequired === "true" || property.isRequired === true,
        allowedValues: Array.isArray(property.allowedValues) ? property.allowedValues : undefined,
        minLimit: property.minLimit != null ? Number(property.minLimit) : undefined,
        maxLimit: property.maxLimit != null ? Number(property.maxLimit) : undefined,
    }))
}

export async function loadCharacteristics(send: BeverageSend, typeId: string, scope: CharacteristicScope): Promise<BeverageCharacteristic[]> {
    if (!typeId) return []
    const data = await send(GET_BEVERAGE_TYPE_EDITIONS, { typeId })
    return characteristicsOf(data?.beverageTypeEditionsByType, scope)
}

/** How a form asks for a characteristic: chips of its options, a number, or text. */
export function characteristicInputKind(characteristic: BeverageCharacteristic): "choice" | "integer" | "decimal" | "text" {
    const type = characteristic.typeName.toUpperCase()
    if (type.includes("ENUM") || (characteristic.allowedValues?.length ?? 0) > 0) return "choice"
    if (characteristic.code === "vintage" || type.includes("INT")) return "integer"
    if (type.includes("DOUBLE") || characteristic.code === "alcoholByVolume") return "decimal"
    return "text"
}

// --- Beverage types ---------------------------------------------------------

export interface BeverageTypeOption {
    id: string
    code: string
    name: string
}

/** Published types, wine first and then by name — the order the form offers them. */
export function beverageTypeOptions(items: Array<BeverageTypeOption & { status?: string | null }> | null | undefined): BeverageTypeOption[] {
    return (items || [])
        .filter((item) => !item.status || item.status === "PUBLISHED")
        .map(({ id, code, name }) => ({ id, code, name }))
        .sort((a, b) => {
            if (a.code?.toUpperCase() === "WINE") return -1
            if (b.code?.toUpperCase() === "WINE") return 1
            return (a.name || a.code).localeCompare(b.name || b.code)
        })
}

// --- Beverage ---------------------------------------------------------------

export type ProducerRoleChoice = "MAKER" | "BOTTLER"

export interface NewBeverage {
    name: string
    typeId: string
    role: ProducerRoleChoice
    attributes?: Record<string, string>
    origin?: { latitude: number; longitude: number } | null
}

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

/** The backend's input: the signed-in user as its producer in the chosen role. */
export function beverageCreateInput(beverage: NewBeverage, actor: string): Record<string, any> {
    const role: ProducerRoleChoice = beverage.role === "BOTTLER" ? "BOTTLER" : "MAKER"
    const auid = Number.parseInt(actor, 10)
    const input: Record<string, any> = {
        name: beverage.name.trim(),
        typeId: beverage.typeId,
        producers: [isUuid(actor) ? { producerId: actor, role } : { auid: Number.isNaN(auid) ? undefined : [auid], role }],
    }
    const attributes = { ...(beverage.attributes || {}) }
    if (Object.keys(attributes).length > 0) input.attributes = attributes
    const origin = beverage.origin
    if (origin && typeof origin.latitude === "number" && typeof origin.longitude === "number") {
        input.origin = { latitude: origin.latitude, longitude: origin.longitude }
    }
    return input
}

/**
 * The input without the attributes a backend refused as unknown ("Unknown:
 * color"), for one more try; null when that is not what went wrong.
 */
export function withoutUnknownAttributes(input: Record<string, any>, message: string): Record<string, any> | null {
    const lower = message.toLowerCase()
    if (!lower.includes("unknown:") || !input.attributes) return null
    const attributes = { ...input.attributes }
    if (lower.includes("color")) delete attributes.color
    if (lower.includes("style")) delete attributes.style
    const next = { ...input, attributes }
    if (Object.keys(attributes).length === 0) delete next.attributes
    return next
}

export async function createBeverage(send: BeverageSend, beverage: NewBeverage, actor: string): Promise<string> {
    if (!beverage.name.trim()) throw new Error("Beverage name is required")
    if (!beverage.typeId) throw new Error("Beverage type is required")
    const mutation = print(DevCreateBeverageDocument)
    let input = beverageCreateInput(beverage, actor)
    let result: any
    try {
        result = await send(mutation, { input })
    } catch (error) {
        const retry = withoutUnknownAttributes(input, error instanceof Error ? error.message : "")
        if (!retry) throw error
        input = retry
        result = await send(mutation, { input })
    }
    const id: string | undefined = result?.createBeverage?.id
    if (!id) throw new Error("Failed to create beverage")
    return id
}

/** A failed create as a message key, where the backend's message is recognisable. */
export function beverageCreateErrorKey(raw: string | null | undefined): "beverage.createErrorColor" | "beverage.createErrorGeneric" | null {
    const lower = (raw || "").toLowerCase()
    if (lower.includes("invalid values: color")) return "beverage.createErrorColor"
    return lower ? null : "beverage.createErrorGeneric"
}

// --- Batch and sample -------------------------------------------------------

/**
 * Attribute values as the backend stores them: whole numbers and decimals as
 * numbers, "true"/"false" as booleans, the rest as trimmed text, blanks
 * dropped. A batch's vintage is a whole year, and its strength always a
 * decimal — the backend reads a whole-number ABV as an integer otherwise.
 */
export function formatCreateAttributes(attributes: Record<string, unknown> | null | undefined, kind: "batch" | "sample"): Record<string, unknown> {
    const formatted: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(attributes || {})) {
        if (value === undefined || value === null || value === "") continue
        if (kind === "batch" && key === "vintage") {
            const year = Number.parseInt(String(value), 10)
            if (!Number.isNaN(year)) formatted[key] = year
        } else if (kind === "batch" && (key === "alcoholByVolume" || key === "abv" || key === "alcohol")) {
            let strength = Number.parseFloat(String(value))
            if (!Number.isNaN(strength)) {
                if (Number.isInteger(strength)) strength += 0.00001
                formatted[key] = strength
            }
        } else if (typeof value === "string") {
            const text = value.trim()
            if (/^-?\d+$/.test(text)) formatted[key] = Number.parseInt(text, 10)
            else if (/^-?\d+\.\d+$/.test(text)) formatted[key] = Number.parseFloat(text)
            else if (text.toLowerCase() === "true") formatted[key] = true
            else if (text.toLowerCase() === "false") formatted[key] = false
            else formatted[key] = text
        } else {
            formatted[key] = value
        }
    }
    return formatted
}

/** A volume field's millilitres: a positive whole number, or nothing. */
export function parseVolumeMl(value: string | number | null | undefined): number | undefined {
    if (value === undefined || value === null || value === "") return undefined
    const volume = Number.parseInt(String(value), 10)
    return !Number.isNaN(volume) && volume > 0 ? volume : undefined
}

/** Whether a volume field holds something that is not a positive number. */
export function isInvalidVolume(value: string): boolean {
    return value !== "" && (Number.isNaN(Number(value)) || Number(value) <= 0)
}

export interface NewBatch {
    beverageId: string
    lotNumber?: string | null
    volumeMl?: string | number | null
    attributes?: Record<string, unknown>
}

export async function createBatch(send: BeverageSend, batch: NewBatch): Promise<string> {
    if (!batch.beverageId) throw new Error("Beverage is required")
    const attributes = formatCreateAttributes(batch.attributes, "batch")
    const result = await send(print(DevCreateBatchDocument), {
        input: {
            beverageId: batch.beverageId,
            lotNumber: batch.lotNumber?.trim() || undefined,
            volumeMl: parseVolumeMl(batch.volumeMl),
            attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        },
    })
    const id: string | undefined = result?.createBatch?.id
    if (!id) throw new Error("Failed to create batch")
    return id
}

export const GET_BATCH_ALLOCATION = `
    query GetBatchDetailAndSamples($id: ID!) {
        batch(id: $id) {
            id lotNumber volumeMl attributes createdAt
            beverage { id name typeId status }
        }
        samples(batchId: $id) { items { id volumeMl } }
    }
`

export interface BatchAllocation {
    usedVolumeMl: number
    /** Null when the batch has no volume to run out of. */
    remainingVolumeMl: number | null
    samplesCount: number
}

/** How much of a batch its samples have taken. */
export function batchAllocation(batchVolumeMl: number | null | undefined, samples: Array<{ volumeMl?: number | null }> | null | undefined): BatchAllocation {
    const used = (samples || []).reduce((sum, sample) => sum + (Number(sample.volumeMl) || 0), 0)
    return {
        usedVolumeMl: used,
        remainingVolumeMl: typeof batchVolumeMl === "number" ? Math.max(0, batchVolumeMl - used) : null,
        samplesCount: samples?.length ?? 0,
    }
}

/** A sample larger than what its batch has left. */
export class SampleExceedsBatchError extends Error {
    constructor(
        readonly volumeMl: number,
        readonly remainingMl: number,
        readonly batchVolumeMl: number,
    ) {
        super(`Sample volume ${volumeMl} ml exceeds the batch's remaining ${remainingMl} ml of ${batchVolumeMl} ml`)
    }
}

export interface NewSample {
    batchId: string
    volumeMl?: string | number | null
    attributes?: Record<string, unknown>
}

/**
 * The sample, once its volume is checked against what the batch has left —
 * checked again here, since another sample may have been taken since the
 * form loaded.
 */
export async function createSample(send: BeverageSend, sample: NewSample): Promise<string> {
    if (!sample.batchId) throw new Error("Batch is required")
    const volumeMl = parseVolumeMl(sample.volumeMl)
    if (volumeMl !== undefined) {
        const check = await send(GET_BATCH_ALLOCATION, { id: sample.batchId }).catch(() => null)
        const batchVolume = check?.batch?.volumeMl
        if (typeof batchVolume === "number" && batchVolume > 0) {
            const { remainingVolumeMl } = batchAllocation(batchVolume, check?.samples?.items)
            if (remainingVolumeMl !== null && volumeMl > remainingVolumeMl) {
                throw new SampleExceedsBatchError(volumeMl, remainingVolumeMl, batchVolume)
            }
        }
    }
    const attributes = formatCreateAttributes(sample.attributes, "sample")
    const result = await send(print(DevCreateSampleDocument), {
        input: { batchId: sample.batchId, volumeMl, attributes: Object.keys(attributes).length > 0 ? attributes : undefined },
    })
    const id: string | undefined = result?.createSample?.id
    if (!id) throw new Error("Failed to create sample")
    return id
}

// --- What to create them for -------------------------------------------------

export const GET_MY_BEVERAGES_FOR_CREATE = `
    query GetMyBeveragesList($filter: BeverageFilterInput, $limit: Int!) {
        beverages(filter: $filter, limit: $limit) { items { id name typeId status } }
    }
`

export const GET_ALL_BEVERAGES_FOR_CREATE = `
    query GetAllBeverages($limit: Int!) {
        beverages(limit: $limit) { items { id name typeId status } }
    }
`

export interface BeverageChoice {
    id: string
    name: string
    typeId: string
    status?: string
    /** False when the user has none and the whole catalogue is offered instead. */
    isOwn: boolean
}

/** The beverages a batch can be made for: the user's own, or — having none — the catalogue's. */
export async function loadBeverageChoices(send: BeverageSend, auid: number): Promise<BeverageChoice[]> {
    let items: any[] = []
    let isOwn = true
    try {
        items = (await send(GET_MY_BEVERAGES_FOR_CREATE, { filter: { producers: [[auid]] }, limit: 100 }))?.beverages?.items || []
    } catch {
        // Falls through to the catalogue.
    }
    if (items.length === 0) {
        isOwn = false
        items = (await send(GET_ALL_BEVERAGES_FOR_CREATE, { limit: 100 }).catch(() => null))?.beverages?.items || []
    }
    return items.map((item) => ({ id: item.id, name: item.name, typeId: item.typeId, status: item.status, isOwn }))
}

export const GET_BATCHES_FOR_SAMPLE = `
    query GetBatchesForSample($beverageId: ID!) {
        batches(beverageId: $beverageId, limit: 100) { items { id lotNumber volumeMl attributes createdAt } }
    }
`

/** A batch as a choice: its lot number, or the end of its id. */
export function batchChoiceLabel(batch: { id: string; lotNumber?: string | null }): string {
    return batch.lotNumber || `ID: ${batch.id.slice(-6).toUpperCase()}`
}

/** The year presets a vintage offers: this year and the four before. */
export function vintagePresets(now: Date): number[] {
    const year = now.getFullYear()
    return [year, year - 1, year - 2, year - 3, year - 4]
}

export const ABV_PRESETS = ["11.5", "12.0", "12.5", "13.0", "13.5", "14.0", "14.5"] as const
export const BATCH_VOLUME_PRESETS = [750, 1500, 100_000, 500_000, 1_000_000] as const
export const SAMPLE_VOLUME_PRESETS = [100, 375, 500, 750, 1000, 1500] as const

const GET_BEVERAGE_FOR_BATCH = `
    query GetBeverageDetail($id: ID!) {
        beverage(id: $id) { id name typeId status }
    }
`

const GET_BEVERAGE_TYPE_NAME = `
    query GetBeverageTypeName($id: ID!) {
        beverageType(id: $id) { name }
    }
`

async function typeNameOf(send: BeverageSend, typeId: string | null | undefined): Promise<string> {
    if (!typeId) return ""
    return (await send(GET_BEVERAGE_TYPE_NAME, { id: typeId }).catch(() => null))?.beverageType?.name || ""
}

export interface BeverageForBatch {
    beverage: { id: string; name: string; typeId: string; typeName: string; status?: string }
    characteristics: BeverageCharacteristic[]
}

/** A beverage a batch is being made for: its name and type, and what its type asks of a batch. Null if there is none. */
export async function loadBeverageForBatch(send: BeverageSend, beverageId: string): Promise<BeverageForBatch | null> {
    const beverage = (await send(GET_BEVERAGE_FOR_BATCH, { id: beverageId }))?.beverage
    if (!beverage) return null
    const [typeName, characteristics] = await Promise.all([
        typeNameOf(send, beverage.typeId),
        loadCharacteristics(send, beverage.typeId, "BATCH").catch(() => []),
    ])
    return { beverage: { ...beverage, typeName }, characteristics }
}

export interface BatchForSample extends BatchAllocation {
    batch: {
        id: string
        lotNumber?: string | null
        volumeMl?: number | null
        beverage?: { id: string; name: string; typeId: string; typeName: string; status?: string } | null
    }
    characteristics: BeverageCharacteristic[]
}

/** A batch a sample is being taken from: its beverage, how much is left, and what its type asks of a sample. */
export async function loadBatchForSample(send: BeverageSend, batchId: string): Promise<BatchForSample | null> {
    const data = await send(GET_BATCH_ALLOCATION, { id: batchId })
    const batch = data?.batch
    if (!batch) return null
    const typeId = batch.beverage?.typeId
    const [typeName, characteristics] = await Promise.all([
        typeNameOf(send, typeId),
        typeId ? loadCharacteristics(send, typeId, "SAMPLE").catch(() => []) : Promise.resolve([]),
    ])
    return {
        batch: { ...batch, beverage: batch.beverage ? { ...batch.beverage, typeName } : null },
        characteristics,
        ...batchAllocation(batch.volumeMl, data?.samples?.items),
    }
}

/** A volume preset's label: millilitres below a hundred litres, litres from there. */
export function volumePresetLabel(volumeMl: number, locale?: string): string {
    return volumeMl >= 100_000 ? `${(volumeMl / 1000).toLocaleString(locale)} L` : `${volumeMl.toLocaleString(locale)} ml`
}
