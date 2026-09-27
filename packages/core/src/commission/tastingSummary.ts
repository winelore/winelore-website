import { findEvaluationForMember, normalizeAuids } from "../auidUtils"
import type { GetCommissionTemplatesDeepResult } from "../commissionTemplatesQuery"
import { parseAttributes } from "../evaluation/attributes"
import { commentHasVisibleContent, type CompetitionFeatureFlags } from "../evaluationDisplay"
import { hasEvaluationTotalScore } from "../evaluationTotals"
import { formatPropertyScoreValue, hasStoredScoreValue, type BooleanScoreLabels } from "../formatPropertyScore"
import type { GeographicInfo } from "../geocoding"
import { buildPropertyMapFromCommissionTemplates, type PropertyMeta } from "../propertyMap"

/**
 * A judge's own tasting summary — the web's
 * /commission/[id]/replica/[replicaId]/summary and the app's screen of the
 * same path: every sample they completed in a finished session, in tasting
 * order, with their scores and comments, and the file it downloads as.
 */

// --- Data -------------------------------------------------------------------

export interface ExpertBeverageSummaryEntry {
    order: number
    code: string
    beverageName: string
    totalScores: Array<{ code: string; name: string; value: string }>
    producerAuids: string[]
    evaluation: {
        scores: Array<{ code: string; value: string }>
        comments: Array<{
            id: string
            text?: string
            voiceUrl?: string | null
            propertyId?: string | null
        }>
    }
    beverageType?: string
    wineType?: string
    vintage?: string
    volume?: string
    origin?: { latitude: number; longitude: number } | null
}

export interface MyTastingSummaryData {
    entries: ExpertBeverageSummaryEntry[]
    propertyMap: Record<string, PropertyMeta>
    propertyCommentsEnabled: boolean
    voiceCommentsEnabled: boolean
    commissionName?: string
}

export interface ReplicaCandidateWithBeverage {
    id: string
    candidate?: {
        id: string
        anonymizedCode?: string | null
        beverageType?: {
            id?: string | null
            code?: string | null
            name?: string | null
        } | null
        sample?: {
            id?: string | null
            volumeMl?: number | null
            batch?: {
                id?: string | null
                attributes?: unknown
                beverage?: {
                    id?: string | null
                    name?: string | null
                    producers?: Array<{ auid?: unknown }> | null
                    attributes?: unknown
                    origin?: {
                        latitude: number
                        longitude: number
                    } | null
                } | null
            } | null
        } | null
    } | null
}

/** A judge's evaluation of one sample, as either evaluation query returns it. */
export interface SummaryEvaluation {
    isComplete?: boolean | null
    evaluatorAuid?: unknown
    scores?: Array<{ code: string; value: string | null }> | null
    comments?: Array<{
        id: string
        text?: string | null
        voiceUrl?: string | null
        propertyId?: string | null
    }> | null
}

/** GetReplicaCandidates' `commissionReplica`, as far as the summary reads it. */
export interface SummaryReplica {
    commission?: {
        id: string
        panels?: Array<{ candidates?: Array<{ id: string }> | null }> | null
    } | null
    replicaPanels?: Array<{
        id: string
        panel?: { id: string } | null
        replicaCandidates?: Array<{ id: string; candidate?: { id: string } | null }> | null
    }> | null
}

export function emptyTastingSummary(flags?: Partial<CompetitionFeatureFlags>, commissionName?: string): MyTastingSummaryData {
    return {
        entries: [],
        propertyMap: {},
        propertyCommentsEnabled: flags?.propertyCommentsEnabled ?? false,
        voiceCommentsEnabled: flags?.voiceCommentsEnabled ?? false,
        ...(commissionName ? { commissionName } : {}),
    }
}

/**
 * A replica's candidates, flattened across its panels and put in tasting
 * order — the order the commission's panels list them, which is the order
 * the chair runs them in. Each keeps the ids of the panel it sits in.
 */
export function replicaCandidatesInTastingOrder<R extends SummaryReplica>(replica: R | null | undefined) {
    type Entry = NonNullable<NonNullable<R["replicaPanels"]>[number]["replicaCandidates"]>[number]
    const candidates = (replica?.replicaPanels || []).flatMap((panel) =>
        ((panel.replicaCandidates || []) as Entry[]).map((candidate) => ({
            ...candidate,
            replicaPanelId: panel.id,
            panelId: panel.panel?.id,
            candidate: candidate.candidate ? { ...candidate.candidate, panelId: panel.panel?.id } : null,
        })),
    )
    const order = (replica?.commission?.panels || []).flatMap((panel) => (panel.candidates || []).map((candidate) => candidate.id))
    if (order.length === 0) return candidates
    const position = (entry: (typeof candidates)[number]) => (entry.candidate ? order.indexOf(entry.candidate.id) : -1)
    return [...candidates].sort((a, b) => position(a) - position(b))
}

function producerAuids(candidate: ReplicaCandidateWithBeverage["candidate"]): string[] {
    const producers = candidate?.sample?.batch?.beverage?.producers
    if (!Array.isArray(producers)) return []
    const auids = new Set<string>()
    producers.forEach((producer) => normalizeAuids(producer.auid).forEach((id) => auids.add(id)))
    return Array.from(auids)
}

function storedScores(evaluation: SummaryEvaluation, propertyMap: Record<string, PropertyMeta>) {
    return (evaluation.scores || [])
        .filter((score) => hasStoredScoreValue(score.value, propertyMap[score.code]?.kind))
        .map((score) => ({ code: score.code, value: score.value == null ? "" : String(score.value) }))
}

function normalizeEvaluation(
    evaluation: SummaryEvaluation,
    propertyMap: Record<string, PropertyMeta>,
): ExpertBeverageSummaryEntry["evaluation"] {
    return {
        scores: storedScores(evaluation, propertyMap),
        comments: (evaluation.comments || []).map((comment) => ({
            id: comment.id,
            text: comment.text ?? undefined,
            voiceUrl: comment.voiceUrl,
            propertyId: comment.propertyId,
        })),
    }
}

/**
 * One entry per sample the judge completed, in tasting order. Its headline
 * scores are the result properties (or the last two scores, when the
 * template marks none).
 */
export function buildExpertBeverageSummary(
    replicaCandidates: ReplicaCandidateWithBeverage[],
    myEvaluationsByReplicaCandidateId: Map<string, SummaryEvaluation | null | undefined>,
    unknownBeverageLabel: string,
    propertyMap: Record<string, PropertyMeta>,
): ExpertBeverageSummaryEntry[] {
    const entries: ExpertBeverageSummaryEntry[] = []

    replicaCandidates.forEach((rc, index) => {
        const evaluation = myEvaluationsByReplicaCandidateId.get(rc.id)
        if (!evaluation?.isComplete) return

        const normalized = normalizeEvaluation(evaluation, propertyMap)
        const hasData = normalized.scores.length > 0 || normalized.comments.length > 0
        if (!hasData && !hasEvaluationTotalScore({ scores: normalized.scores }, propertyMap)) return

        const named = (score: { code: string; value: string }) => ({
            code: score.code,
            name: propertyMap[score.code]?.name ?? score.code,
            value: score.value,
        })
        let totalScores = normalized.scores
            .filter((score) => propertyMap[score.code]?.isResult === true || score.code === "total_score" || score.code === "typicity")
            .map(named)
        if (totalScores.length === 0 && normalized.scores.length > 0) {
            totalScores = normalized.scores.slice(-2).map(named)
        }

        const candidate = rc.candidate
        const beverage = candidate?.sample?.batch?.beverage
        const code = candidate?.anonymizedCode?.trim()
        entries.push({
            order: index + 1,
            code: code || `#${index + 1}`,
            beverageName: beverage?.name || unknownBeverageLabel,
            totalScores,
            producerAuids: producerAuids(candidate),
            evaluation: normalized,
            beverageType: candidate?.beverageType?.code || undefined,
            wineType: parseAttributes(beverage?.attributes).color || undefined,
            vintage: parseAttributes(candidate?.sample?.batch?.attributes).vintage || undefined,
            volume: candidate?.sample?.volumeMl ? `${candidate.sample.volumeMl} ml` : undefined,
            origin: beverage?.origin || undefined,
        })
    })

    return entries
}

// --- Loading ----------------------------------------------------------------

/** The commission a summary belongs to, as GetCommission returns it. */
export interface SummaryCommission {
    name?: string | null
    propertyCommentsEnabled?: boolean | null
    voiceCommentsEnabled?: boolean | null
}

/** The fetches a summary makes; each app sends them its own way. */
export interface TastingSummarySource {
    replica: (replicaId: string) => Promise<SummaryReplica | null | undefined>
    commission: (commissionId: string) => Promise<SummaryCommission | null | undefined>
    templates: (commissionId: string) => Promise<GetCommissionTemplatesDeepResult | null | undefined>
    /** The signed-in judge's evaluation of a replica candidate. */
    myEvaluation: (replicaCandidateId: string) => Promise<SummaryEvaluation | null | undefined>
    /** Every evaluation of a replica candidate. */
    evaluations: (replicaCandidateId: string) => Promise<SummaryEvaluation[]>
}

/**
 * The judge's own evaluation of a sample. Some backend versions return null
 * from the judge-scoped lookup though the same completed evaluation is in
 * the sample's list — which the group breakdown reads — so that list is the
 * fallback for a judge whose own lookup is not complete.
 */
async function myEvaluationOf(
    source: TastingSummarySource,
    replicaCandidateId: string,
    actorAuid: string | null,
): Promise<SummaryEvaluation | null> {
    const direct = (await source.myEvaluation(replicaCandidateId).catch(() => null)) ?? null
    if (direct?.isComplete || !actorAuid) return direct
    try {
        const match = findEvaluationForMember(await source.evaluations(replicaCandidateId), actorAuid)
        return match?.isComplete ? match : (direct ?? match ?? null)
    } catch {
        return direct
    }
}

/**
 * A judge's summary of one replica: its candidates in tasting order, their
 * own evaluation of each, and the commission's templates for the names and
 * kinds of the scores. `commission`, when the caller already has it, saves
 * fetching it again.
 */
export async function loadMyTastingSummary(
    source: TastingSummarySource,
    replicaId: string,
    actorAuid: string | null,
    options: { commission?: SummaryCommission | null; unknownBeverageLabel?: string } = {},
): Promise<MyTastingSummaryData> {
    const replica = await source.replica(replicaId)
    const commissionId = replica?.commission?.id
    if (!commissionId) return emptyTastingSummary()

    const [commission, templates] = await Promise.all([
        options.commission !== undefined ? options.commission : source.commission(commissionId),
        source.templates(commissionId),
    ])
    const candidates = replicaCandidatesInTastingOrder(replica) as ReplicaCandidateWithBeverage[]
    const evaluations = await Promise.all(candidates.map((rc) => myEvaluationOf(source, rc.id, actorAuid)))

    const evaluationByCandidate = new Map<string, SummaryEvaluation | null>()
    candidates.forEach((rc, index) => evaluationByCandidate.set(rc.id, evaluations[index]))
    const propertyMap = buildPropertyMapFromCommissionTemplates(templates)

    return {
        entries: buildExpertBeverageSummary(
            candidates,
            evaluationByCandidate,
            options.unknownBeverageLabel ?? "Unknown Beverage",
            propertyMap,
        ),
        propertyMap,
        propertyCommentsEnabled: commission?.propertyCommentsEnabled ?? false,
        voiceCommentsEnabled: commission?.voiceCommentsEnabled ?? false,
        commissionName: commission?.name || undefined,
    }
}

/** Every producer named in a summary, to resolve their names once. */
export function tastingSummaryProducerAuids(entries: ExpertBeverageSummaryEntry[] | null | undefined): string[] {
    return Array.from(new Set((entries || []).flatMap((entry) => entry.producerAuids)))
}

// --- Download ---------------------------------------------------------------

type Point = { latitude: number; longitude: number }

const pointKey = (point: Point) => `${point.latitude},${point.longitude}`

function isPoint(origin: ExpertBeverageSummaryEntry["origin"]): origin is Point {
    return !!origin && typeof origin.latitude === "number" && typeof origin.longitude === "number"
}

/** The distinct origins in a summary — each is looked up once before a download. */
export function tastingSummaryOrigins(entries: ExpertBeverageSummaryEntry[]): Point[] {
    const points = new Map<string, Point>()
    entries.forEach((entry) => {
        if (isPoint(entry.origin)) points.set(pointKey(entry.origin), entry.origin)
    })
    return Array.from(points.values())
}

/**
 * An origin as the download writes it: the looked-up country, district,
 * region and city, or the coordinates when the lookup found nothing.
 */
export function tastingSummaryOriginText(
    origin: ExpertBeverageSummaryEntry["origin"],
    lookUp: (point: Point) => GeographicInfo | null | undefined,
): string {
    if (!isPoint(origin)) return "-"
    const info = lookUp(origin)
    const parts = info ? [info.country, info.districtDetail, info.regionDetail, info.cityDetail].filter(Boolean) : []
    if (parts.length > 0) return Array.from(new Set(parts)).join(", ")
    return `${origin.latitude}, ${origin.longitude}`
}

/** A looked-up origin, found again by its point. */
export function tastingSummaryOriginLookup(found: Array<[Point, GeographicInfo | null]>) {
    const byKey = new Map(found.map(([point, info]) => [pointKey(point), info]))
    return (point: Point) => byKey.get(pointKey(point))
}

export interface TastingSummaryExportOptions {
    producerName: (auids: string[]) => string
    generalCommentLabel: string
    booleanLabels: BooleanScoreLabels
    formatBeverageType: (type: string) => string
    origin: (origin: ExpertBeverageSummaryEntry["origin"]) => string
}

export interface TastingSummarySheet {
    name: string
    rows: string[][]
}

/**
 * One key per property. The map holds each property under its code and
 * again under its id — comments name a property by id — and scores are by
 * code, which is inserted first.
 */
function propertyCodes(propertyMap: Record<string, PropertyMeta>): string[] {
    const seen = new Set<PropertyMeta>()
    return Object.keys(propertyMap).filter((key) => {
        if (seen.has(propertyMap[key])) return false
        seen.add(propertyMap[key])
        return true
    })
}

const DESCRIPTION_HEADERS = ["Order", "Code", "Beverage", "Beverage Type", "Wine Type", "Vintage", "Volume (ml)", "Origin", "Producer"]

/**
 * The download's sheets — overview (the result scores), detailed scores and
 * comments — as plain rows of cells. Writing the file is left to each app:
 * the web hands it to the browser, the phone to the share sheet.
 */
export function tastingSummarySheets(data: MyTastingSummaryData, options: TastingSummaryExportOptions): TastingSummarySheet[] {
    const { propertyMap } = data
    const label = (code: string) => propertyMap[code]?.name ?? code
    const format = (code: string, value: string | undefined) =>
        hasStoredScoreValue(value, propertyMap[code]?.kind)
            ? formatPropertyScoreValue(value!, propertyMap[code], options.booleanLabels)
            : null
    const allCodes = propertyCodes(propertyMap).sort()
    const resultCodes = allCodes.filter((code) => propertyMap[code]?.isResult === true)

    const describe = (entry: ExpertBeverageSummaryEntry) => [
        String(entry.order),
        entry.code,
        entry.beverageName,
        entry.beverageType ? options.formatBeverageType(entry.beverageType) : "-",
        entry.wineType ? options.formatBeverageType(entry.wineType) : "-",
        entry.vintage || "-",
        entry.volume || "-",
        options.origin(entry.origin),
        options.producerName(entry.producerAuids),
    ]
    const scoreOf = (entry: ExpertBeverageSummaryEntry, code: string) => entry.evaluation.scores.find((score) => score.code === code)?.value

    const overview = [
        [...DESCRIPTION_HEADERS, ...resultCodes.map(label)],
        ...data.entries.map((entry) => [
            ...describe(entry),
            ...resultCodes.map((code) => {
                const headline = entry.totalScores.find((score) => score.code === code)?.value
                return format(code, headline !== undefined && headline !== "" ? headline : (scoreOf(entry, code) ?? "")) ?? "-"
            }),
        ]),
    ]

    const detail = [
        [...DESCRIPTION_HEADERS, ...allCodes.map(label)],
        ...data.entries.map((entry) => [...describe(entry), ...allCodes.map((code) => format(code, scoreOf(entry, code)) ?? "")]),
    ]

    const flags = { propertyCommentsEnabled: data.propertyCommentsEnabled, voiceCommentsEnabled: data.voiceCommentsEnabled }
    const comments = [
        [...DESCRIPTION_HEADERS, "Property", "Comment Text", "Voice URL"],
        ...data.entries.flatMap((entry) =>
            entry.evaluation.comments
                .filter((comment) => commentHasVisibleContent(comment, flags))
                .map((comment) => [
                    ...describe(entry),
                    comment.propertyId ? (propertyMap[comment.propertyId]?.name ?? comment.propertyId) : options.generalCommentLabel,
                    comment.text?.trim() ?? "",
                    data.voiceCommentsEnabled && comment.voiceUrl ? comment.voiceUrl : "",
                ]),
        ),
    ]

    return [
        { name: "Overview", rows: overview },
        { name: "Detailed Scores", rows: detail },
        { name: "Comments", rows: comments },
    ]
}

function escapeCsvCell(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

/** The CSV download: the overview sheet. */
export function tastingSummaryCsv(sheets: TastingSummarySheet[]): string {
    return sheets[0].rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")
}

/** The download's file name, after the commission. */
export function tastingSummaryFilename(commissionName: string | undefined, extension: "xlsx" | "csv"): string {
    const base = (commissionName || "expert-tasting").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80) || "results"
    return `${base}-results.${extension}`
}
