/**
 * The map's wine regions, shared by the web's server and the app.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    boundsAround,
    distanceKm,
    isRegisteredWineRegion,
    parseNominatimRegion,
    visibleWineRegionLayers,
    wineRegionOutlines,
    wineRegionSummaries,
    wineRegionsForPoint,
    wineRegionsInBounds,
    type WineRegionFeature,
    type WineRegionPosition,
} from "../src"

const square = (id: string, [west, south, east, north]: [number, number, number, number], holes: WineRegionPosition[][] = []): WineRegionFeature => ({
    type: "Feature",
    id,
    properties: { id, name: id, country: "UA", bbox: [west, south, east, north], status: id === "big" ? "registered" : undefined },
    geometry: {
        type: "Polygon",
        coordinates: [
            [
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south],
            ],
            ...holes,
        ],
    },
})

const big = square("big", [30, 46, 32, 48])
const small = square("small", [30.5, 46.5, 31, 47])
const holed = square("holed", [29, 45, 33, 49], [[[30.4, 46.4], [31.1, 46.4], [31.1, 47.1], [30.4, 47.1], [30.4, 46.4]]])
const far = square("far", [2, 44, 3, 45])

test("a point's regions are the ones containing it, smallest first, holes excluded", () => {
    assert.deepEqual(
        wineRegionsForPoint([big, far, small, holed], 46.75, 30.75).map((feature) => feature.properties.id),
        ["small", "big"],
    )
    assert.deepEqual(
        wineRegionsForPoint([big, holed], 47.5, 31.5).map((feature) => feature.properties.id),
        ["big", "holed"],
    )
})

test("regions in view are those whose box overlaps it, by name, across the antimeridian too", () => {
    assert.deepEqual(
        visibleWineRegionLayers([small, far, big], { south: 45, west: 29, north: 48, east: 31 }).map((layer) => layer.id),
        ["big", "small"],
    )
    const pacific = square("pacific", [178, -18, 179.5, -16])
    assert.equal(wineRegionsInBounds([pacific], { south: -20, west: 170, north: -10, east: -170 }).length, 1)
})

test("a view's bounds and search radius", () => {
    assert.deepEqual(boundsAround(49, 31, 4, 6), { south: 47, north: 51, west: 28, east: 34 })
    assert.deepEqual(boundsAround(0, 179, 2, 4), { south: -1, north: 1, west: 177, east: -179 })
    // A degree of latitude is about 111 km.
    assert.ok(Math.abs(distanceKm({ latitude: 49, longitude: 31 }, { latitude: 50, longitude: 31 }) - 111.2) < 0.5)
})

test("an outline for a map keeps points a tolerance apart and drops holes", () => {
    const dense = square("dense", [0, 0, 1, 1])
    ;(dense.geometry.coordinates as WineRegionPosition[][])[0].splice(1, 0, [0.001, 0], [0.002, 0])
    const [outline] = wineRegionOutlines(dense, 0.01)
    assert.deepEqual(outline[0], { latitude: 0, longitude: 0 })
    assert.equal(outline.length, 5)
    assert.equal(wineRegionOutlines(holed, 0).length, 1)
})

test("the beverage panel's region list and a region lookup", () => {
    assert.deepEqual(wineRegionSummaries([big, small]).map((summary) => [summary.id, summary.status]), [
        ["big", "registered"],
        ["small", "mapped"],
    ])
    assert.equal(isRegisteredWineRegion("Registered"), true)
    assert.equal(isRegisteredWineRegion("mapped"), false)
    assert.deepEqual(parseNominatimRegion({ address: { county: "Odesa Raion", country: "Ukraine", country_code: "ua" } }), {
        region: "Odesa Raion",
        countryCode: "UA",
        countryName: "Ukraine",
    })
})
