import { loadOutcomePolicies, type OutcomePolicySummary } from "@winelore/core"
import { GET_TEMPLATE_CATALOG, toTemplateCatalog, type CatalogTemplate } from "@winelore/core/commission"
import { toDashboardCompetition, withBeverageType, type DashboardCompetition } from "@winelore/core/dashboard"
import { fetchGraphQLRaw, sdk } from "../api/client"
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

/**
 * Templates the user owns — the web's /myTemplates. The backend cannot filter
 * templates by owner, so the web fetches the catalog whole and filters it;
 * this does the same, as one page.
 */
export function myTemplatesSource(auid: string) {
    return async (): Promise<Page<CatalogTemplate>> => {
        const response = await fetchGraphQLRaw<any>(GET_TEMPLATE_CATALOG, { limit: 100 })
        const items = toTemplateCatalog(response?.evaluationTemplateEditions?.items, Number(auid))
        return { items, total: items.length }
    }
}

/**
 * Outcome policies the user owns — the web's /myOutcomePolicies. The backend
 * pages them by cursor, the last id of the page before, where the list asks
 * by offset; each page's cursor is remembered by the offset it ends at.
 */
export function myOutcomePoliciesSource(auid: string) {
    const cursors = new Map<number, string>()
    return async (offset: number, limit: number): Promise<Page<OutcomePolicySummary>> => {
        const { policies, totalCount } = await loadOutcomePolicies(
            (query, variables) => fetchGraphQLRaw<any>(query, variables),
            Number(auid),
            limit,
            offset === 0 ? undefined : cursors.get(offset),
        )
        if (policies.length > 0) cursors.set(offset + policies.length, policies[policies.length - 1].id)
        return { items: policies, total: totalCount }
    }
}
