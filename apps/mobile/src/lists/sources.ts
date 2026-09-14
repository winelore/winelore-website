import { toDashboardCompetition, withBeverageType, type DashboardCompetition } from "@winelore/core/dashboard"
import { sdk } from "../api/client"
import type { DashboardBeverage } from "../dashboard/useHome"
import type { Page } from "./usePagedList"

/**
 * One page of each list, through the same queries the web's list pages use
 * and shaped by the same `@winelore/core` mappers, so a card reads the same on
 * a phone as on the web's page.
 */

/** Every competition — the web's /competitions. */
export async function fetchCompetitionsPage(offset: number, limit: number): Promise<Page<DashboardCompetition>> {
    const response = await sdk.GetDashboardCompetitions({ limit, offset })
    return {
        items: (response.competitions?.items ?? []).map((item) => toDashboardCompetition(item)),
        total: response.competitionCount ?? 0,
    }
}

/** Competitions the user holds — the web's /myCompetitions. */
export function myCompetitionsSource(auid: string) {
    return async (offset: number, limit: number): Promise<Page<DashboardCompetition>> => {
        const response = await sdk.GetMyCompetitions({
            limit,
            offset,
            filter: { holders: [[Number(auid)]] },
            holder: [Number(auid)],
        })
        return {
            items: (response.competitions?.items ?? []).map((item) => toDashboardCompetition(item, auid)),
            total: response.competitionCount ?? 0,
        }
    }
}

/** Every beverage — the web's /beverages. */
export async function fetchBeveragesPage(offset: number, limit: number): Promise<Page<DashboardBeverage>> {
    const response = await sdk.GetBeverages({ limit, offset })
    return {
        items: (response.beverages?.items ?? []).map((item) => withBeverageType(item)),
        total: response.beverageCount ?? 0,
    }
}

/** Beverages the user produces — the web's /myBeverages. */
export function myBeveragesSource(auid: string) {
    return async (offset: number, limit: number): Promise<Page<DashboardBeverage>> => {
        const response = await sdk.GetMyBeverages({
            limit,
            offset,
            filter: { producers: [[Number(auid)]] },
            producer: [Number(auid)],
        })
        return {
            // The web's My Beverages reads an uncoloured beverage as wine.
            items: (response.beverages?.items ?? []).map((item) => withBeverageType(item, "WINE")),
            total: response.beverageCount ?? 0,
        }
    }
}
