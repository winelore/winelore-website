import { useEffect, useState } from "react"
import { File, Paths } from "expo-file-system"
import { WINE_REGION_DATASETS, type WineRegionFeature, type WineRegionFeatureCollection } from "@winelore/core"
import { getWebOrigin } from "../navigation/destinations"

/** The files change with a data release, not by the day; a week between downloads is plenty. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

let loaded: Promise<WineRegionFeature[]> | null = null

async function dataset(name: string): Promise<WineRegionFeature[]> {
    const file = new File(Paths.cache, `wine-regions-${name}`)
    const fresh = file.exists && file.modificationTime != null && Date.now() - file.modificationTime < MAX_AGE_MS
    if (fresh) {
        try {
            return (JSON.parse(await file.text()) as WineRegionFeatureCollection).features
        } catch {
            // A torn write; download it again.
        }
    }
    const response = await fetch(`${getWebOrigin()}/data/${name}`)
    if (!response.ok) throw new Error(`Wine regions: ${response.status}`)
    const text = await response.text()
    const features = (JSON.parse(text) as WineRegionFeatureCollection).features
    try {
        if (file.exists) file.delete()
        file.create()
        file.write(text)
    } catch {
        // Cached or not, this run has them.
    }
    return features
}

/**
 * Every mapped wine region — the website's own GeoJSON files, the ones its
 * server reads — downloaded once and kept in the cache directory for a week.
 * Finding regions in them is core's, as on the web.
 */
export function loadWineRegions(): Promise<WineRegionFeature[]> {
    if (!loaded) {
        loaded = Promise.all(WINE_REGION_DATASETS.map(dataset)).then((sets) => sets.flat())
        // A failed download is retried by the next caller.
        loaded.catch(() => {
            loaded = null
        })
    }
    return loaded
}

/** The regions, once they have loaded; empty until then, or if they cannot be. */
export function useWineRegions(): WineRegionFeature[] {
    const [features, setFeatures] = useState<WineRegionFeature[]>([])
    useEffect(() => {
        let active = true
        loadWineRegions()
            .then((all) => active && setFeatures(all))
            .catch(() => {})
        return () => {
            active = false
        }
    }, [])
    return features
}
