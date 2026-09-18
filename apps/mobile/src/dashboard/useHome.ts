import { useCallback, useEffect, useRef, useState } from "react"
import {
    DASHBOARD_PANEL_LIMIT,
    GET_DASHBOARD_TEMPLATE_EDITIONS,
    isTemplateOwnedBy,
    selectLatestTemplateEditions,
    toDashboardCompetition,
    withBeverageType,
    type ActiveCommission,
    type BeverageProducerRef,
    type DashboardCompetition,
    type DashboardTemplate,
    type RawTemplateEdition,
} from "@winelore/core/dashboard"
import { fetchGraphQLRaw, sdk } from "../api/client"
import { getStoredSession } from "../auth/session"
import { loadBeverageTypes } from "./beverageTypes"
import { dashboardOptions, fetchMemberCommissions } from "./useDashboard"

/** A beverage as the home screen's card renders it. */
export interface DashboardBeverage {
    id: string
    name: string
    status?: string | null
    typeId?: string | null
    /** Colour code from `attributes`, used when `typeId` maps to nothing. */
    type?: string
    producers?: BeverageProducerRef[] | null
    /** Where it was made, for the lists that reverse-geocode an origin. */
    origin?: { latitude: number; longitude: number } | null
}

/**
 * One panel's data. Panels load and fail independently, as on the web, where
 * each is its own try/catch — one slow or broken query must not blank the
 * other three.
 */
export type Panel<T> =
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; items: T[] }

export interface HomeData {
    commissions: Panel<ActiveCommission>
    templates: Panel<DashboardTemplate>
    competitions: Panel<DashboardCompetition>
    beverages: Panel<DashboardBeverage>
    /** Beverage type id -> code, so cards can translate the type. */
    beverageTypes: Record<string, string>
}

const LOADING: HomeData = {
    commissions: { status: "loading" },
    templates: { status: "loading" },
    competitions: { status: "loading" },
    beverages: { status: "loading" },
    beverageTypes: {},
}

async function loadCompetitions(auid: string): Promise<DashboardCompetition[]> {
    const response = await sdk.GetMyCompetitions({
        limit: DASHBOARD_PANEL_LIMIT,
        filter: { holders: [[Number(auid)]] },
    })
    return (response.competitions?.items ?? []).map((item) => toDashboardCompetition(item, auid))
}

async function loadBeverages(auid: string): Promise<DashboardBeverage[]> {
    const response = await sdk.GetMyBeverages({
        limit: DASHBOARD_PANEL_LIMIT,
        filter: { producers: [[Number(auid)]] },
        producer: [Number(auid)],
    })
    return (response.beverages?.items ?? []).map((beverage) => withBeverageType(beverage))
}

async function loadTemplates(auid: string): Promise<DashboardTemplate[]> {
    // The backend cannot filter editions by owner, so this over-fetches and
    // filters, exactly as the web's template action does.
    const response = await fetchGraphQLRaw<{
        evaluationTemplateEditions?: { items?: RawTemplateEdition[] } | null
    }>(GET_DASHBOARD_TEMPLATE_EDITIONS, { limit: 100 })
    return selectLatestTemplateEditions(response?.evaluationTemplateEditions?.items)
        .filter((template) => isTemplateOwnedBy(template, auid))
        .slice(0, DASHBOARD_PANEL_LIMIT)
}

const settle = <T,>(result: PromiseSettledResult<T[]>): Panel<T> =>
    result.status === "fulfilled" ? { status: "ready", items: result.value } : { status: "error" }

/**
 * Everything the home screen shows — the native counterpart of what the web's
 * `app/page.tsx` fetches on the server. The shaping and filtering are the same
 * functions from `@winelore/core/dashboard`, so an account sees the same cards
 * on both.
 *
 * A reload keeps the current data on screen until the new data arrives, so a
 * pull-to-refresh does not flash every panel back to its skeleton.
 */
export function useHome() {
    const [data, setData] = useState<HomeData>(LOADING)
    const generation = useRef(0)

    const load = useCallback(async () => {
        const current = ++generation.current
        const session = await getStoredSession()
        if (!session?.auid) {
            setData({
                commissions: { status: "ready", items: [] },
                templates: { status: "ready", items: [] },
                competitions: { status: "ready", items: [] },
                beverages: { status: "ready", items: [] },
                beverageTypes: {},
            })
            return
        }
        const { auid } = session

        const [commissions, templates, competitions, beverages, beverageTypes] = await Promise.allSettled([
            fetchMemberCommissions(auid, dashboardOptions),
            loadTemplates(auid),
            loadCompetitions(auid),
            loadBeverages(auid),
            loadBeverageTypes(),
        ])

        // A newer reload has started; let it win.
        if (current !== generation.current) return

        setData({
            commissions: settle(commissions),
            templates: settle(templates),
            competitions: settle(competitions),
            beverages: settle(beverages),
            // Cosmetic: without it a card falls back to the attribute colour.
            beverageTypes: beverageTypes.status === "fulfilled" ? beverageTypes.value : {},
        })
    }, [])

    useEffect(() => {
        load()
    }, [load])

    return { data, reload: load }
}
