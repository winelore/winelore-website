export interface GeographicInfo {
    country?: string;
    region?: string;
    district?: string;
}

/**
 * Reverse geocodes coordinates to retrieve country, region, and district information.
 * Uses OpenStreetMap's Nominatim reverse geocoding API.
 * 
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns GeographicInfo object containing country, region, and district (if available)
 */
export async function getGeographicInfo(latitude: number, longitude: number): Promise<GeographicInfo | null> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second timeout to avoid page rendering delays

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'WineLoreWebsite/1.0 (contact@winelore.com)',
                'Accept-Language': 'en, uk;q=0.9, *;q=0.5', // Prefer English or Ukrainian
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`[Geocoding] Nominatim API returned status: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const address = data?.address;

        if (!address) {
            return null;
        }

        const country = address.country;
        const region = address.state || address.region || address.province || address.state_district || address.territory;
        
        // Find the best candidate for the district/local municipality
        const district = address.city_district || address.district || address.municipality || address.suburb || address.local_administrative_area || address.subdistrict || address.county || address.city;

        // Clean up duplicates (e.g. if city and district are the same)
        const result: GeographicInfo = {};
        if (country) result.country = country;
        if (region && region !== country) result.region = region;
        if (district && district !== region && district !== country) result.district = district;

        return result;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.warn(`[Geocoding] Request timed out for coordinates: ${latitude}, ${longitude}`);
        } else {
            console.error(`[Geocoding] Failed to reverse geocode:`, error);
        }
        return null;
    }
}
