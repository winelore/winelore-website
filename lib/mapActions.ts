"use server"

import {
    findWineRegionsInBounds,
    findWineRegionsForPoint,
    toWineRegionLayer,
} from "@/lib/wineRegions"
import {
    nominatimRegionUrl,
    parseNominatimRegion,
    wineRegionSummaries,
    type WineRegionBounds,
    type WineRegionFeatureCollection,
} from '@winelore/core'

const globalForMapCache = globalThis as typeof globalThis & {
    reverseGeocodeCache?: Map<string, {
        region?: string
        countryCode?: string
        countryName?: string
    }>
}

async function reverseGeocode(lat: number, lng: number) {
    if (!globalForMapCache.reverseGeocodeCache) {
        globalForMapCache.reverseGeocodeCache = new Map()
    }

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
    const cached = globalForMapCache.reverseGeocodeCache.get(cacheKey)
    if (cached) return cached

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
        const response = await fetch(nominatimRegionUrl(lat, lng), {
            headers: {
                "Accept": "application/json",
                "User-Agent": "WineLoreWebsite/1.0 (contact@winelore.com)",
            },
            signal: controller.signal,
        })

        if (!response.ok) return {}

        const result = parseNominatimRegion(await response.json())
        globalForMapCache.reverseGeocodeCache.set(cacheKey, result)
        return result
    } catch (error) {
        console.warn("Reverse geocoding failed:", error)
        return {}
    } finally {
        clearTimeout(timeoutId)
    }
}

export async function getRegionInfo(lat: number, lng: number) {
    try {
        const [geography, matches] = await Promise.all([
            reverseGeocode(lat, lng),
            findWineRegionsForPoint(lat, lng),
        ])
        const geojson: WineRegionFeatureCollection = {
            type: "FeatureCollection",
            features: matches,
        }
        const wineRegions = wineRegionSummaries(matches)

        return {
            ...geography,
            wineRegions,
            geojson,
        }
    } catch (error) {
        console.error("Failed to get region info:", error);
        return {
            error: "Internal Server Error",
            wineRegions: [],
            geojson: null,
        }
    }
}

export async function getVisiblePolygons(bounds: WineRegionBounds) {
    return (await findWineRegionsInBounds(bounds))
        .map(toWineRegionLayer)
        .sort((left, right) => left.name.localeCompare(right.name))
}
