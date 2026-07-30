export type WineRegionPosition = [number, number]

export interface WineRegionGeometry {
    type: "Polygon" | "MultiPolygon"
    coordinates: WineRegionPosition[][] | WineRegionPosition[][][]
}

export interface WineRegionProperties {
    id: string
    name: string
    country: string
    bbox: [number, number, number, number]
    localName?: string
    eAmbrosiaId?: string
    type?: string
    status?: string
    modifiedOn?: string
    registrationNumber?: string
    registrationDate?: string
    coverage?: "defined" | "approximated"
}

export interface WineRegionFeature {
    type: "Feature"
    id: string
    properties: WineRegionProperties
    geometry: WineRegionGeometry
}

export interface WineRegionFeatureCollection {
    type: "FeatureCollection"
    features: WineRegionFeature[]
}

export interface WineRegionLayer {
    id: string
    name: string
    country: string
    geojson: WineRegionFeature
}

export interface WineRegionBounds {
    south: number
    west: number
    north: number
    east: number
}
