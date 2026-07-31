"use server"

import {
    findWineRegionsInBounds,
    findWineRegionsForPoint,
    toWineRegionLayer,
} from "@/lib/wineRegions"
import type {
    WineRegionBounds,
    WineRegionFeatureCollection,
} from "@/lib/wineRegionTypes"

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
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=en&zoom=5`,
            {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "WineLoreWebsite/1.0 (contact@winelore.com)",
                },
                signal: controller.signal,
            },
        )

        if (!response.ok) return {}

        const data = await response.json()
        const result = {
            region: data.address?.state
                || data.address?.region
                || data.address?.county,
            countryCode: data.address?.country_code?.toUpperCase(),
            countryName: data.address?.country,
        }
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
        const wineRegions = matches.map((feature) => ({
            id: feature.properties.id,
            name: feature.properties.name,
            type: "Wine region",
            status: feature.properties.status || "mapped",
            countryCode: feature.properties.country,
            localName: feature.properties.localName,
        }))

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
    const matches = await findWineRegionsInBounds(bounds)

    return matches
        .map(toWineRegionLayer)
        .sort((left, right) => left.name.localeCompare(right.name))
}
