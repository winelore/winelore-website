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
