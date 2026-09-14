import { useEffect, useState } from "react"
import { GET_BEVERAGE_TYPES, buildBeverageTypeCodeMap } from "@winelore/core/dashboard"
import { fetchGraphQLRaw } from "../api/client"

let pending: Promise<Record<string, string>> | null = null

/**
 * Beverage type id -> code, so a card can translate a beverage's type.
 *
 * Fetched once and shared: the home screen and every beverage list want the
 * same small table. A failed fetch is forgotten so the next caller retries.
 */
export function loadBeverageTypes(): Promise<Record<string, string>> {
    if (!pending) {
        pending = fetchGraphQLRaw<{
            beverageTypes?: { items?: Array<{ id: string; code: string; status?: string | null }> } | null
        }>(GET_BEVERAGE_TYPES)
            .then((response) => buildBeverageTypeCodeMap(response?.beverageTypes?.items))
            .catch((error) => {
                pending = null
                throw error
            })
    }
    return pending
}

/**
 * The type table for a list screen. Empty until it arrives, and empty if it
 * fails: it is cosmetic, since a card falls back to the attribute colour.
 */
export function useBeverageTypes(): Record<string, string> {
    const [types, setTypes] = useState<Record<string, string>>({})
    useEffect(() => {
        let active = true
        loadBeverageTypes().then(
            (loaded) => active && setTypes(loaded),
            () => {},
        )
        return () => {
            active = false
        }
    }, [])
    return types
}
