import { promises as fs } from "node:fs"
import path from "node:path"
import {
    WINE_REGION_DATASETS,
    wineRegionsForPoint,
    wineRegionsInBounds,
    type WineRegionBounds,
    type WineRegionFeature,
    type WineRegionFeatureCollection,
} from '@winelore/core'

export { toWineRegionLayer } from '@winelore/core'

// Finding regions is core's, which the app's map runs over the same files; reading them is here.

interface WineRegionDataset extends WineRegionFeatureCollection {
    metadata?: Record<string, unknown>
}

const globalForWineRegions = globalThis as typeof globalThis & {
    wineRegionFeatures?: WineRegionFeature[]
    wineRegionPointCache?: Map<string, WineRegionFeature[]>
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

    const matches = wineRegionsForPoint(await loadWineRegions(), lat, lng)

    globalForWineRegions.wineRegionPointCache.set(cacheKey, matches)
    return matches
}

export async function findWineRegionsInBounds(bounds: WineRegionBounds) {
    return wineRegionsInBounds(await loadWineRegions(), bounds)
}
