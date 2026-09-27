/**
 * Reading Nominatim's reverse-geocoding answer. The web's beverage pages and
 * the mobile My Beverages list both show origins through this.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import { beverageOriginParts, nominatimReverseUrl, parseNominatimAddress } from "../src/geocoding"

test("the request asks for address details at the point", () => {
    const url = nominatimReverseUrl(48.1, 17.2)
    assert.match(url, /^https:\/\/nominatim\.openstreetmap\.org\/reverse\?/)
    assert.match(url, /lat=48\.1&lon=17\.2/)
    assert.match(url, /addressdetails=1/)
})

test("country, region and district come from their first available field", () => {
    const info = parseNominatimAddress({
        country: "Slovakia",
        state: "Bratislava Region",
        county: "Pezinok District",
        town: "Modra",
    })
    assert.equal(info?.country, "Slovakia")
    assert.equal(info?.region, "Bratislava Region")
    assert.equal(info?.district, "Pezinok District")
    assert.equal(info?.cityDetail, "Modra")
})

test("a district that repeats its region or country is dropped", () => {
    // Kyiv is its own region; the district field repeats it.
    const info = parseNominatimAddress({ country: "Ukraine", state: "Kyiv", city: "Kyiv" })
    assert.equal(info?.region, "Kyiv")
    assert.equal(info?.district, undefined)
})

test("no address reads as no information", () => {
    assert.equal(parseNominatimAddress(undefined), null)
    assert.deepEqual(beverageOriginParts(null), [])
})

test("a card's origin is country then district, skipping what is missing", () => {
    assert.deepEqual(beverageOriginParts({ country: "Hungary", district: "Tokaj" }), ["Hungary", "Tokaj"])
    assert.deepEqual(beverageOriginParts({ country: "Hungary" }), ["Hungary"])
})
