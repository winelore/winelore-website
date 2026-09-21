/**
 * Creating a competition — the web's /competition/create and the app's sheet
 * of the same path: the series it is filed under, the planned schedule and
 * its presets, and the sequence that makes it.
 */

type Translate = (key: any, params?: Record<string, string | number>) => string

/** Sends one GraphQL document and throws on any error; each app has its own transport. */
export type CreateSend = (query: string, variables: Record<string, unknown>) => Promise<any>

export const GET_COMPETITION_SERIES_LIST = "{ competitionSeriesList(limit: 100) { items { id name owners } } }"

const CREATE_SERIES = `
    mutation CreateSeries($input: CreateCompetitionSeriesInput!) {
        createCompetitionSeries(input: $input) { id name }
    }
`

const CREATE_COMPETITION = `
    mutation CreateCompetition($input: CreateCompetitionInput!) {
        createCompetition(input: $input) { id }
    }
`

const UPDATE_DATES = `
    mutation UpdateCompetitionDates($id: ID!, $input: PlannedDatesInput!) {
        updateCompetitionDates(id: $id, input: $input) { id }
    }
`

export interface SeriesOption {
    id: string
    name: string
}

/** The series a user owns, the ones a new competition may be filed under. */
export function ownedSeries(items: Array<{ id: string; name: string; owners?: unknown }> | null | undefined, auid: number): SeriesOption[] {
    return (items || [])
        .filter((series) => Array.isArray(series.owners) && (series.owners as unknown[]).flat().includes(auid))
        .map((series) => ({ id: series.id, name: series.name }))
}

const tidy = (name: string) => name.trim().replace(/\s+/g, " ")

/** A new series owned by `auid`, open to every country. */
export async function createCompetitionSeries(send: CreateSend, name: string, auid: number): Promise<SeriesOption> {
    const trimmed = tidy(name)
    if (!trimmed) throw new Error("Series name is required.")
    const result = await send(CREATE_SERIES, {
        input: { name: trimmed, countriesType: "GLOBAL", countriesCodes: [], owners: [[auid]] },
    })
    const series = result?.createCompetitionSeries
    if (!series?.id) throw new Error("Failed to create competition series.")
    return { id: series.id, name: series.name }
}

export interface NewCompetition {
    name: string
    /** Empty to file it under the holder's first series, or a new "General Series" when they have none. */
    seriesId: string
    plannedStart: Date | null
    plannedEnd: Date | null
    holder: number
}

/**
 * The competition, then its planned dates. Without a series it goes under
 * the holder's own first series — never someone else's — or a "General
 * Series" made for them.
 */
export async function createCompetition(send: CreateSend, competition: NewCompetition): Promise<string> {
    let seriesId = competition.seriesId
    if (!seriesId) {
        const list = await send(GET_COMPETITION_SERIES_LIST, {}).catch(() => null)
        const mine = ownedSeries(list?.competitionSeriesList?.items, competition.holder)[0]
        seriesId = mine ? mine.id : (await createCompetitionSeries(send, "General Series", competition.holder)).id
    }

    const created = await send(CREATE_COMPETITION, {
        input: { name: tidy(competition.name || "New Competition"), seriesId, holders: [[competition.holder]] },
    })
    const id: string | undefined = created?.createCompetition?.id
    if (!id) throw new Error("Failed to initialize competition root node.")

    if (competition.plannedStart || competition.plannedEnd) {
        await send(UPDATE_DATES, {
            id,
            input: { start: competition.plannedStart?.toISOString() ?? null, end: competition.plannedEnd?.toISOString() ?? null },
        })
    }
    return id
}

export type SchedulePreset = "today" | "tomorrow" | "nextWeek"

/**
 * A preset's start — the next full hour today, or 9:00 tomorrow or in a
 * week — and an end eight hours on, unless the end already set still
 * comes after it.
 */
export function applySchedulePreset(kind: SchedulePreset, now: Date, currentEnd: Date | null): { start: Date; end: Date } {
    const start = new Date(now)
    if (kind === "today") {
        start.setMinutes(0, 0, 0)
        start.setHours(start.getHours() + 1)
    } else {
        start.setDate(start.getDate() + (kind === "tomorrow" ? 1 : 7))
        start.setHours(9, 0, 0, 0)
    }
    const end = currentEnd && currentEnd.getTime() > start.getTime() ? currentEnd : new Date(start.getTime() + 8 * 3_600_000)
    return { start, end }
}

/** Whether a schedule ends before it starts. */
export function isScheduleInverted(start: Date | null, end: Date | null): boolean {
    return !!(start && end && end.getTime() <= start.getTime())
}

/** "2 days 4 h", "3 h 20 min" or "45 min", in the reader's language. */
export function scheduleDuration(start: Date | null, end: Date | null, t: Translate): string | null {
    if (!start || !end || isScheduleInverted(start, end)) return null
    const diff = end.getTime() - start.getTime()
    const days = Math.floor(diff / 86_400_000)
    const hours = Math.floor((diff % 86_400_000) / 3_600_000)
    const minutes = Math.floor((diff % 3_600_000) / 60_000)
    if (days > 0) return t("time.duration", { days, hours })
    if (hours > 0) return t("time.durationHoursMinutes", { hours, minutes })
    return t("time.durationMinutes", { minutes })
}

/**
 * A failed create as a sentence: the backend's messages are raw GraphQL
 * strings, so the recognisable ones become a translated message key.
 */
export function competitionCreateErrorKey(
    raw: string | null | undefined,
):
    | "competition.createErrorGeneric"
    | "competition.createErrorNetwork"
    | "competition.createErrorSeries"
    | "competition.createErrorName"
    | "competition.createErrorAuth" {
    const lower = (raw || "").toLowerCase()
    if (!lower) return "competition.createErrorGeneric"
    if (["failed to fetch", "fetch failed", "server responded with status", "network"].some((part) => lower.includes(part))) {
        return "competition.createErrorNetwork"
    }
    if (["seriesid", "series id", "competition series", "failed to convert argument value"].some((part) => lower.includes(part))) {
        return "competition.createErrorSeries"
    }
    if (lower.includes("name") && ["null", "empty", "required"].some((part) => lower.includes(part))) {
        return "competition.createErrorName"
    }
    if (lower.includes("authentication") || lower.includes("unauthorized")) return "competition.createErrorAuth"
    return "competition.createErrorGeneric"
}
