import { useEffect, useMemo, useState } from "react"
import {
    beverageOriginParts,
    nominatimRegionUrl,
    nominatimReverseUrl,
    parseNominatimAddress,
    parseNominatimRegion,
    type GeographicInfo,
    type RegionGeography,
} from "@winelore/core"

interface Point {
    latitude: number
    longitude: number
}

/**
 * Nominatim allows one request a second per client, and a phone is one
 * client. The web can fan out from its server; here lookups queue, paced a
 * second apart, and each point is only ever looked up once.
 */
const SPACING_MS = 1000
const TIMEOUT_MS = 4000

const cache = new Map<string, Promise<unknown>>()
let queue: Promise<unknown> = Promise.resolve()

// Five decimals is about a metre: the same vineyard, the same answer.
const keyOf = ({ latitude, longitude }: Point) => `${latitude.toFixed(5)},${longitude.toFixed(5)}`

async function request(url: string): Promise<any | null> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "WineLoreApp/1.0 (contact@winelore.com)",
                // As the web asks: English first, then Ukrainian.
                "Accept-Language": "en, uk;q=0.9, *;q=0.5",
            },
            signal: controller.signal,
        })
        return response.ok ? await response.json() : null
    } catch {
        return null
    } finally {
        clearTimeout(timeout)
    }
}

/** A lookup through the queue, once per key; a failure is not cached, so a later screen can try again. */
function paced<T>(key: string, url: string, read: (data: any) => T | null): Promise<T | null> {
    let pending = cache.get(key) as Promise<T | null> | undefined
    if (!pending) {
        const answer = queue.then(async () => {
            const data = await request(url)
            return data ? read(data) : null
        })
        pending = answer
        // The next lookup waits for this one and then the spacing.
        queue = answer.then(() => new Promise((resolve) => setTimeout(resolve, SPACING_MS)))
        answer.then((value) => {
            if (!value) cache.delete(key)
        })
        cache.set(key, answer)
    }
    return pending
}

/** One point's place, through the paced queue; also what a download's origins go through. */
export function lookUp(point: Point): Promise<GeographicInfo | null> {
    return paced(keyOf(point), nominatimReverseUrl(point.latitude, point.longitude), (data) => parseNominatimAddress(data?.address))
}

/** A point's region and country — the map's beverage panel — through the same queue. */
export function lookUpRegion(point: Point): Promise<RegionGeography | null> {
    return paced(`region:${keyOf(point)}`, nominatimRegionUrl(point.latitude, point.longitude), parseNominatimRegion)
}

/**
 * Beverage id -> origin parts (country, district), as the web's My Beverages
 * shows them. Fills in as lookups finish; a beverage with no recorded origin,
 * or one that cannot be resolved, simply has none.
 */
export function useBeverageOrigins(
    beverages: Array<{ id: string; origin?: Point | null }>,
): Record<string, string[]> {
    const [origins, setOrigins] = useState<Record<string, string[]>>({})
    const located = useMemo(
        () =>
            beverages.filter(
                (beverage): beverage is { id: string; origin: Point } =>
                    typeof beverage.origin?.latitude === "number" && typeof beverage.origin?.longitude === "number",
            ),
        [beverages],
    )

    useEffect(() => {
        let active = true
        for (const beverage of located) {
            lookUp(beverage.origin).then((info) => {
                const parts = beverageOriginParts(info)
                if (active && parts.length > 0) {
                    setOrigins((previous) => ({ ...previous, [beverage.id]: parts }))
                }
            })
        }
        return () => {
            active = false
        }
    }, [located])

    return origins
}
