import { useEffect, useMemo, useState } from "react"
import { beverageOriginParts, nominatimReverseUrl, parseNominatimAddress, type GeographicInfo } from "@winelore/core"

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

const cache = new Map<string, Promise<GeographicInfo | null>>()
let queue: Promise<unknown> = Promise.resolve()

// Five decimals is about a metre: the same vineyard, the same answer.
const keyOf = ({ latitude, longitude }: Point) => `${latitude.toFixed(5)},${longitude.toFixed(5)}`

async function request(point: Point): Promise<GeographicInfo | null> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const response = await fetch(nominatimReverseUrl(point.latitude, point.longitude), {
            headers: {
                "User-Agent": "WineLoreApp/1.0 (contact@winelore.com)",
                // As the web asks: English first, then Ukrainian.
                "Accept-Language": "en, uk;q=0.9, *;q=0.5",
            },
            signal: controller.signal,
        })
        if (!response.ok) return null
        const data = await response.json()
        return parseNominatimAddress(data?.address)
    } catch {
        return null
    } finally {
        clearTimeout(timeout)
    }
}

function lookUp(point: Point): Promise<GeographicInfo | null> {
    const key = keyOf(point)
    let pending = cache.get(key)
    if (!pending) {
        pending = queue.then(() => request(point))
        // The next lookup waits for this one and then the spacing.
        queue = pending.then(() => new Promise((resolve) => setTimeout(resolve, SPACING_MS)))
        // A failure is not an answer; let a later screen try again.
        pending.then((info) => {
            if (!info) cache.delete(key)
        })
        cache.set(key, pending)
    }
    return pending
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
