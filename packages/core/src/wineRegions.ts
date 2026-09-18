import type {
    WineRegionBounds,
    WineRegionFeature,
    WineRegionLayer,
    WineRegionPosition,
} from "./wineRegionTypes"

/**
 * The wine regions the map draws and a beverage's origin falls in — EU PDOs
 * and Ukraine's geographical indications, from the two GeoJSON files the
 * website serves under /data. Loading them is each app's own (the web reads
 * them from disk, a phone downloads them); finding regions in them is here.
 */

export const WINE_REGION_DATASETS = ["eu-wine-pdo.geojson", "ukraine-wine-regions.geojson"] as const

function pointOnSegment(lng: number, lat: number, start: WineRegionPosition, end: WineRegionPosition) {
    const cross = (lat - start[1]) * (end[0] - start[0]) - (lng - start[0]) * (end[1] - start[1])
    if (Math.abs(cross) > 1e-10) return false
    return (
        lng >= Math.min(start[0], end[0]) &&
        lng <= Math.max(start[0], end[0]) &&
        lat >= Math.min(start[1], end[1]) &&
        lat <= Math.max(start[1], end[1])
    )
}

function pointInRing(lng: number, lat: number, ring: WineRegionPosition[]) {
    let inside = false
    for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
        const start = ring[previous]
        const end = ring[current]
        if (pointOnSegment(lng, lat, start, end)) return true
        const crossesLatitude = end[1] > lat !== start[1] > lat
        const intersectionLng = ((start[0] - end[0]) * (lat - end[1])) / (start[1] - end[1]) + end[0]
        if (crossesLatitude && lng < intersectionLng) inside = !inside
    }
    return inside
}

function pointInPolygon(lng: number, lat: number, rings: WineRegionPosition[][]) {
    if (!rings[0] || !pointInRing(lng, lat, rings[0])) return false
    return !rings.slice(1).some((hole) => pointInRing(lng, lat, hole))
}

/** A region's polygons, each as rings (the outline, then any holes). */
function polygonsOf(feature: WineRegionFeature): WineRegionPosition[][][] {
    return feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates as WineRegionPosition[][]]
        : (feature.geometry.coordinates as WineRegionPosition[][][])
}

export function wineRegionContainsPoint(feature: WineRegionFeature, lat: number, lng: number): boolean {
    const [minLng, minLat, maxLng, maxLat] = feature.properties.bbox
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) return false
    return polygonsOf(feature).some((polygon) => pointInPolygon(lng, lat, polygon))
}

const bboxArea = ({ properties: { bbox } }: WineRegionFeature) => (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])

/** The regions a point lies in, smallest first — the most specific appellation leads. */
export function wineRegionsForPoint(features: WineRegionFeature[], lat: number, lng: number): WineRegionFeature[] {
    return features.filter((feature) => wineRegionContainsPoint(feature, lat, lng)).sort((a, b) => bboxArea(a) - bboxArea(b))
}

/** The regions whose box overlaps the bounds, across the antimeridian too. */
export function wineRegionsInBounds(features: WineRegionFeature[], bounds: WineRegionBounds): WineRegionFeature[] {
    return features.filter((feature) => {
        const [minLng, minLat, maxLng, maxLat] = feature.properties.bbox
        const overlapsLatitude = maxLat >= bounds.south && minLat <= bounds.north
        const overlapsLongitude =
            bounds.west <= bounds.east ? maxLng >= bounds.west && minLng <= bounds.east : maxLng >= bounds.west || minLng <= bounds.east
        return overlapsLatitude && overlapsLongitude
    })
}

export function toWineRegionLayer(feature: WineRegionFeature): WineRegionLayer {
    return { id: feature.properties.id, name: feature.properties.name, country: feature.properties.country, geojson: feature }
}

/** The regions in view, as the map's layers: by name. */
export function visibleWineRegionLayers(features: WineRegionFeature[], bounds: WineRegionBounds): WineRegionLayer[] {
    return wineRegionsInBounds(features, bounds)
        .map(toWineRegionLayer)
        .sort((left, right) => left.name.localeCompare(right.name))
}

export interface WineRegionSummary {
    id: string
    name: string
    type: string
    status: string
    countryCode: string
    localName?: string
}

/** How the beverage panel lists the regions an origin lies in. */
export function wineRegionSummaries(matches: WineRegionFeature[]): WineRegionSummary[] {
    return matches.map((feature) => ({
        id: feature.properties.id,
        name: feature.properties.name,
        type: "Wine region",
        status: feature.properties.status || "mapped",
        countryCode: feature.properties.country,
        localName: feature.properties.localName,
    }))
}

export function isRegisteredWineRegion(status: string | null | undefined): boolean {
    return status?.toLowerCase() === "registered"
}

/** The bounds of a view from its centre and its span in degrees. */
export function boundsAround(latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number): WineRegionBounds {
    const wrap = (value: number) => ((((value + 180) % 360) + 360) % 360) - 180
    return {
        south: Math.max(-90, latitude - latitudeDelta / 2),
        north: Math.min(90, latitude + latitudeDelta / 2),
        west: longitudeDelta >= 360 ? -180 : wrap(longitude - longitudeDelta / 2),
        east: longitudeDelta >= 360 ? 180 : wrap(longitude + longitudeDelta / 2),
    }
}

/** Kilometres between two points — the map searches out to its view's corner. */
export function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number {
    const radians = (degrees: number) => (degrees * Math.PI) / 180
    const dLat = radians(to.latitude - from.latitude)
    const dLng = radians(to.longitude - from.longitude)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLng / 2) ** 2
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * A region's outlines for a map to draw, each point kept only if it is at
 * least `tolerance` degrees from the last one kept — enough detail for the
 * zoom, a fraction of the points. Holes are dropped: a native map's polygon
 * has none, and few regions have any.
 */
export function wineRegionOutlines(feature: WineRegionFeature, tolerance: number): Array<Array<{ latitude: number; longitude: number }>> {
    return polygonsOf(feature)
        .map((rings) => {
            const ring = rings[0] ?? []
            const kept: WineRegionPosition[] = []
            for (const point of ring) {
                const last = kept[kept.length - 1]
                if (!last || Math.abs(point[0] - last[0]) >= tolerance || Math.abs(point[1] - last[1]) >= tolerance) kept.push(point)
            }
            return kept.map(([longitude, latitude]) => ({ latitude, longitude }))
        })
        .filter((outline) => outline.length >= 3)
}
