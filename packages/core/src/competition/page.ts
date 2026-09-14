import { getDateLocale } from "../i18n"
import type { Locale } from "../i18n/types"

type Translate = (key: any, params?: Record<string, string | number>) => string

/**
 * The competition page, shared by the web's /competition/[id] and the Expo
 * app's competition screen: the data shape, the timing lines, the status
 * steps and the small pieces of presentation logic both render.
 */

// --- Data -------------------------------------------------------------------

export interface CompetitionPageCommission {
    id: string
    name: string
    status: string
    plannedStartAt: string | null
    plannedEndAt: string | null
    startedAt: string | null
    endedAt: string | null
    wineJumperMiniGameEnabled: boolean
    voiceCommentsEnabled: boolean
    propertyCommentsEnabled: boolean
    beverageOriginDuringEvaluationEnabled: boolean
}

export interface CompetitionPageData {
    id: string
    name: string
    status: string
    startedAt: string | null
    plannedStartAt: string | null
    plannedEndAt: string | null
    endedAt: string | null
    series: { id: string; name: string; status: string }
    /** Holder auids, flattened. */
    holders: number[]
    commissions: CompetitionPageCommission[]
}

interface RawPlannedDates {
    start?: string | null
    end?: string | null
}

export interface RawCompetitionPageCompetition {
    id: string
    name: string
    status: string
    startedAt?: string | null
    endedAt?: string | null
    plannedDates?: RawPlannedDates | null
    holders?: unknown
    series: { id: string; name: string; status: string }
}

export interface RawCompetitionPageCommission {
    id: string
    name: string
    status: string
    startedAt?: string | null
    endedAt?: string | null
    plannedDates?: RawPlannedDates | null
    wineJumperMiniGameEnabled?: boolean | null
    voiceCommentsEnabled?: boolean | null
    propertyCommentsEnabled?: boolean | null
    beverageOriginDuringEvaluationEnabled?: boolean | null
}

/** The competition and its commissions as the page renders them. */
export function toCompetitionPage(
    competition: RawCompetitionPageCompetition,
    commissions: RawCompetitionPageCommission[] | null | undefined,
): CompetitionPageData {
    return {
        id: competition.id,
        name: competition.name,
        status: competition.status,
        startedAt: competition.startedAt || null,
        plannedStartAt: competition.plannedDates?.start || null,
        plannedEndAt: competition.plannedDates?.end || null,
        endedAt: competition.endedAt || null,
        series: {
            id: competition.series.id,
            name: competition.series.name,
            status: competition.series.status,
        },
        holders: Array.isArray(competition.holders) ? ((competition.holders as unknown[]).flat() as number[]) : [],
        commissions: (commissions ?? []).map((commission) => ({
            id: commission.id,
            name: commission.name,
            status: commission.status,
            plannedStartAt: commission.plannedDates?.start || null,
            plannedEndAt: commission.plannedDates?.end || null,
            startedAt: commission.startedAt || null,
            endedAt: commission.endedAt || null,
            wineJumperMiniGameEnabled: commission.wineJumperMiniGameEnabled || false,
            voiceCommentsEnabled: commission.voiceCommentsEnabled || false,
            propertyCommentsEnabled: commission.propertyCommentsEnabled || false,
            beverageOriginDuringEvaluationEnabled: commission.beverageOriginDuringEvaluationEnabled || false,
        })),
    }
}

/** Whether a user holds the competition, and so may edit and run it. */
export function isCompetitionHolder(holders: number[], auid: number | string | null | undefined): boolean {
    if (auid === null || auid === undefined || auid === "") return false
    return holders.some((holder) => String(holder) === String(auid))
}

// --- Timing -----------------------------------------------------------------

const HOUR = 1000 * 60 * 60
const MINUTE = 1000 * 60

function plannedFor(plannedStartAt: string, t: Translate, locale: Locale): string {
    const date = new Intl.DateTimeFormat(getDateLocale(locale), {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(plannedStartAt))
    return t("time.plannedFor", { date })
}

function lasted(startedAt: string, endedAt: string, t: Translate): string {
    const diff = Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime())
    const hours = Math.floor(diff / HOUR)
    const minutes = Math.floor((diff % HOUR) / MINUTE)
    const time = hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes })
    return t("time.lasted", { time })
}

interface TimingInput {
    status: string
    startedAt: string | null
    endedAt: string | null
    plannedStartAt: string | null
}

/**
 * The timer beside the competition's status: a stopwatch while it runs, how
 * long it lasted once over, and when it is planned for before then.
 */
export function formatCompetitionPageTiming(
    { status, startedAt, endedAt, plannedStartAt }: TimingInput,
    t: Translate,
    locale: Locale,
    now: number = Date.now(),
): string {
    if (status === "STARTED" && startedAt) {
        const diff = Math.max(0, now - new Date(startedAt).getTime())
        const hours = Math.floor(diff / HOUR)
        const minutes = Math.floor((diff % HOUR) / MINUTE)
        const seconds = Math.floor((diff % MINUTE) / 1000)
        return hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`
    }
    if (status === "COMPLETED" && startedAt && endedAt) return lasted(startedAt, endedAt, t)
    if (status === "PLANNED" && plannedStartAt) return plannedFor(plannedStartAt, t, locale)
    return ""
}

/** The same line for one of the competition's commission sessions. */
export function formatCompetitionSessionTiming(
    { status, startedAt, endedAt, plannedStartAt }: TimingInput,
    t: Translate,
    locale: Locale,
    now: number = Date.now(),
): string {
    if (status === "STARTED" && startedAt) {
        const diff = Math.max(0, now - new Date(startedAt).getTime())
        const hours = Math.floor(diff / HOUR)
        const minutes = Math.floor((diff % HOUR) / MINUTE)
        const seconds = Math.floor((diff % MINUTE) / 1000)
        const time = hours > 0 ? t("time.durationHoursMinutes", { hours, minutes }) : t("time.durationMinutes", { minutes })
        return `${time} ${seconds}s`
    }
    if (status === "COMPLETED" && startedAt && endedAt) return lasted(startedAt, endedAt, t)
    if (status === "PLANNED" && plannedStartAt) return plannedFor(plannedStartAt, t, locale)
    return ""
}

/** Whether either timing line changes second to second. */
export function competitionTimingTicks(status: string): boolean {
    return status === "STARTED"
}

// --- Presentation -----------------------------------------------------------

/** Which of the three steps — planned, started, completed — the competition is on. */
export function competitionStepIndex(status: string): 0 | 1 | 2 {
    if (status === "STARTED") return 1
    if (status === "COMPLETED") return 2
    return 0
}

/**
 * A Google Calendar "new event" link for the planned window. With no planned
 * end the event runs two hours.
 */
export function googleCalendarUrl(
    name: string,
    details: string,
    plannedStartAt: string,
    plannedEndAt: string | null,
): string {
    const start = new Date(plannedStartAt)
    const end = plannedEndAt ? new Date(plannedEndAt) : new Date(start.getTime() + 2 * HOUR)
    const formatCalDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    const dates = `${formatCalDate(start)}/${formatCalDate(end)}`
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(name)}&dates=${dates}&details=${encodeURIComponent(details)}`
}

/** How many avatar gradients there are; each platform keeps its own table of them. */
export const HOLDER_AVATAR_GRADIENT_COUNT = 8

/** Which gradient a holder's avatar uses — stable per person. */
export function holderAvatarIndex(auid: number): number {
    return Math.abs(auid) % HOLDER_AVATAR_GRADIENT_COUNT
}

/** Two letters for a holder's avatar: from the name, else the auid's last two digits. */
export function holderInitials(username: string | undefined, auid: number): string {
    if (!username) return `${auid}`.slice(-2)
    return (username.startsWith("@") ? username.slice(1, 3) : username.slice(0, 2)).toUpperCase()
}

// --- Editing ----------------------------------------------------------------

/** The name a new commission is offered: the next number along. */
export function defaultCommissionName(existingCount: number): string {
    return `Commission ${existingCount + 1}`
}

/** A planned-dates input, with each date as ISO or null. */
export function plannedDatesInput(start: string | null | undefined, end: string | null | undefined) {
    return {
        start: start ? new Date(start).toISOString() : null,
        end: end ? new Date(end).toISOString() : null,
    }
}

export interface NewCommission {
    competitionId: string
    name: string
    plannedStartDate?: string
    plannedEndDate?: string
    wineJumperMiniGameEnabled?: boolean
    voiceCommentsEnabled?: boolean
    propertyCommentsEnabled?: boolean
    beverageOriginDuringEvaluationEnabled?: boolean
}

/** The `CreateCommissionInput` for a new commission; no dates at all is null, not two nulls. */
export function createCommissionInput(params: NewCommission) {
    return {
        competitionId: params.competitionId,
        name: params.name,
        plannedDates:
            params.plannedStartDate || params.plannedEndDate
                ? plannedDatesInput(params.plannedStartDate, params.plannedEndDate)
                : null,
        wineJumperMiniGameEnabled: params.wineJumperMiniGameEnabled ?? false,
        voiceCommentsEnabled: params.voiceCommentsEnabled ?? false,
        propertyCommentsEnabled: params.propertyCommentsEnabled ?? false,
        beverageOriginDuringEvaluationEnabled: params.beverageOriginDuringEvaluationEnabled ?? false,
    }
}

/**
 * A commission added from the competition page: named, with the
 * competition's planned window, and property comments on — what the web's
 * "Add commission" creates.
 */
export function quickCommission(competition: CompetitionPageData, name: string): NewCommission {
    return {
        competitionId: competition.id,
        name: name.trim() || defaultCommissionName(competition.commissions.length),
        plannedStartDate: competition.plannedStartAt || undefined,
        plannedEndDate: competition.plannedEndAt || undefined,
        wineJumperMiniGameEnabled: false,
        voiceCommentsEnabled: false,
        propertyCommentsEnabled: true,
        beverageOriginDuringEvaluationEnabled: false,
    }
}
