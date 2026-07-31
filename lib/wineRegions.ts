import { promises as fs } from "node:fs"
import path from "node:path"
import type {
    WineRegionBounds,
    WineRegionFeature,
    WineRegionFeatureCollection,
    WineRegionLayer,
    WineRegionPosition,
} from "@/lib/wineRegionTypes"

interface WineRegionDataset extends WineRegionFeatureCollection {
    metadata?: Record<string, unknown>
}

const globalForWineRegions = globalThis as typeof globalThis & {
    wineRegionFeatures?: WineRegionFeature[]
    wineRegionPointCache?: Map<string, WineRegionFeature[]>
}

const WINE_REGION_DATASETS = [
    "eu-wine-pdo.geojson",
    "ukraine-wine-regions.geojson",
]

function pointOnSegment(
    lng: number,
    lat: number,
    start: WineRegionPosition,
    end: WineRegionPosition,
) {
    const cross = (lat - start[1]) * (end[0] - start[0])
        - (lng - start[0]) * (end[1] - start[1])

    if (Math.abs(cross) > 1e-10) return false

    return lng >= Math.min(start[0], end[0])
        && lng <= Math.max(start[0], end[0])
        && lat >= Math.min(start[1], end[1])
        && lat <= Math.max(start[1], end[1])
}

function pointInRing(lng: number, lat: number, ring: WineRegionPosition[]) {
    let inside = false

    for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
        const start = ring[previous]
        const end = ring[current]

        if (pointOnSegment(lng, lat, start, end)) return true

        const crossesLatitude = (end[1] > lat) !== (start[1] > lat)
        const intersectionLng = ((start[0] - end[0]) * (lat - end[1]))
            / (start[1] - end[1])
            + end[0]

        if (crossesLatitude && lng < intersectionLng) inside = !inside
    }

    return inside
}

function pointInPolygon(
    lng: number,
    lat: number,
    rings: WineRegionPosition[][],
) {
    if (!rings[0] || !pointInRing(lng, lat, rings[0])) return false

    return !rings.slice(1).some((hole) => pointInRing(lng, lat, hole))
}

function featureContainsPoint(
    feature: WineRegionFeature,
    lat: number,
    lng: number,
) {
    const [minLng, minLat, maxLng, maxLat] = feature.properties.bbox
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) return false

    if (feature.geometry.type === "Polygon") {
        return pointInPolygon(
            lng,
            lat,
            feature.geometry.coordinates as WineRegionPosition[][],
        )
    }

    return (feature.geometry.coordinates as WineRegionPosition[][][])
        .some((polygon) => pointInPolygon(lng, lat, polygon))
}

async function loadWineRegions() {
    if (globalForWineRegions.wineRegionFeatures) {
        return globalForWineRegions.wineRegionFeatures
    }

    const datasets = await Promise.all(
        WINE_REGION_DATASETS.map(async (filename) => {
            const datasetPath = path.join(
                process.cwd(),
                "public",
                "data",
                filename,
            )
            return JSON.parse(
                await fs.readFile(datasetPath, "utf8"),
            ) as WineRegionDataset
        }),
    )
    const features = datasets.flatMap((dataset) => dataset.features)

    globalForWineRegions.wineRegionFeatures = features
    return features
}

export async function findWineRegionsForPoint(lat: number, lng: number) {
    if (!globalForWineRegions.wineRegionPointCache) {
        globalForWineRegions.wineRegionPointCache = new Map()
    }

    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`
    const cached = globalForWineRegions.wineRegionPointCache.get(cacheKey)
    if (cached) return cached

    const features = await loadWineRegions()
    const matches = features
        .filter((feature) => featureContainsPoint(feature, lat, lng))
        .sort((left, right) => {
            const [leftMinLng, leftMinLat, leftMaxLng, leftMaxLat] = left.properties.bbox
            const [rightMinLng, rightMinLat, rightMaxLng, rightMaxLat] = right.properties.bbox
            const leftArea = (leftMaxLng - leftMinLng) * (leftMaxLat - leftMinLat)
            const rightArea = (rightMaxLng - rightMinLng) * (rightMaxLat - rightMinLat)
            return leftArea - rightArea
        })

    globalForWineRegions.wineRegionPointCache.set(cacheKey, matches)
    return matches
}

export async function findWineRegionsInBounds(bounds: WineRegionBounds) {
    const features = await loadWineRegions()

    return features.filter((feature) => {
        const [minLng, minLat, maxLng, maxLat] = feature.properties.bbox
        const overlapsLatitude = maxLat >= bounds.south && minLat <= bounds.north
        const overlapsLongitude = bounds.west <= bounds.east
            ? maxLng >= bounds.west && minLng <= bounds.east
            : maxLng >= bounds.west || minLng <= bounds.east

        return overlapsLatitude && overlapsLongitude
    })
}

export function toWineRegionLayer(feature: WineRegionFeature): WineRegionLayer {
    return {
        id: feature.properties.id,
        name: feature.properties.name,
        country: feature.properties.country,
        geojson: feature,
    }
}
