/**
 * Reverse geocoding through OpenStreetMap's Nominatim, as far as it can be
 * shared: the request URL and the reading of its answer. The request itself
 * stays in each app, since the web makes it on the server and a phone has to
 * pace it (Nominatim allows one request a second per client).
 */

export interface GeographicInfo {
    country?: string
    region?: string
    district?: string
    districtDetail?: string
    regionDetail?: string
    cityDetail?: string
}

/** The Nominatim reverse-geocoding request for a point. */
export function nominatimReverseUrl(latitude: number, longitude: number): string {
    return `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`
}

/** Nominatim's `address` object: every field optional, and many alternatives. */
export type NominatimAddress = Record<string, string | undefined>

/**
 * Country, region and district out of a Nominatim `address`, with duplicates
 * dropped — a city-state's district is often its region and its country too.
 */
export function parseNominatimAddress(address: NominatimAddress | null | undefined): GeographicInfo | null {
    if (!address) return null

    const country = address.country
    const region = address.state || address.region || address.province || address.state_district || address.territory
    // The best candidate for the district or local municipality.
    const district =
        address.city_district ||
        address.district ||
        address.municipality ||
        address.suburb ||
        address.local_administrative_area ||
        address.subdistrict ||
        address.county ||
        address.city

    const result: GeographicInfo = {}
    if (country) result.country = country
    if (region && region !== country) result.region = region
    if (district && district !== region && district !== country) result.district = district

    // The detailed address a beverage page lists: district, region, city.
    const detailedDistrict = address.county || address.district || address.state_district
    const detailedRegion = address.state || address.region || address.province || address.territory
    const detailedCity = address.city || address.town || address.village || address.hamlet || address.isolated_dwelling

    if (detailedDistrict && detailedDistrict !== country) result.districtDetail = detailedDistrict
    if (detailedRegion && detailedRegion !== country) result.regionDetail = detailedRegion
    if (detailedCity && detailedCity !== detailedRegion && detailedCity !== detailedDistrict) result.cityDetail = detailedCity

    return result
}

/** The origin a beverage card shows: country, then district. */
export function beverageOriginParts(info: GeographicInfo | null | undefined): string[] {
    if (!info) return []
    return [info.country, info.district].filter((part): part is string => Boolean(part))
}

/** The coarser lookup the map's beverage panel makes: a point's region and country, in English. */
export function nominatimRegionUrl(latitude: number, longitude: number): string {
    return `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&accept-language=en&zoom=5`
}

export interface RegionGeography {
    region?: string
    countryCode?: string
    countryName?: string
}

/** A region lookup's answer: the state (or region, or county) and the country. */
export function parseNominatimRegion(data: { address?: NominatimAddress } | null | undefined): RegionGeography {
    const address = data?.address
    return {
        region: address?.state || address?.region || address?.county,
        countryCode: address?.country_code?.toUpperCase(),
        countryName: address?.country,
    }
}

/** The origin picker's search: the best match for a place name. */
export function nominatimSearchUrl(query: string): string {
    return `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
}

/** The origin picker's name for a chosen point, at town-and-district detail. */
export function nominatimPlaceUrl(latitude: number, longitude: number): string {
    return `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
}

/** A chosen point, to six decimals — about ten centimetres, as the web keeps it. */
export function roundCoordinate(value: number): number {
    return Number.parseFloat(value.toFixed(6))
}

/** A search's first match as a point and its name, or null when there is none. */
export function parseNominatimSearch(data: unknown): { latitude: number; longitude: number; name: string } | null {
    const first = Array.isArray(data) ? data[0] : null
    if (!first) return null
    const latitude = Number.parseFloat(first.lat)
    const longitude = Number.parseFloat(first.lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    return { latitude: roundCoordinate(latitude), longitude: roundCoordinate(longitude), name: String(first.display_name ?? "") }
}
