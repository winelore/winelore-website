import { nominatimReverseUrl, parseNominatimAddress, type GeographicInfo } from '@winelore/core';

export type { GeographicInfo };

/**
 * Reverse geocodes coordinates to retrieve country, region, and district information.
 * Uses OpenStreetMap's Nominatim reverse geocoding API; reading its answer is
 * shared with the mobile app through `parseNominatimAddress`.
 * 
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns GeographicInfo object containing country, region, and district (if available)
 */
export async function getGeographicInfo(latitude: number, longitude: number): Promise<GeographicInfo | null> {
    const url = nominatimReverseUrl(latitude, longitude);

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
        return parseNominatimAddress(data?.address);
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
