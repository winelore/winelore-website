import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getGeographicInfo as reverseGeocode } from './geocoding';

// Place names change infrequently. Share successful lookups across routes while
// allowing failed/time-out requests to be tried again on the next render.
const lookup = unstable_cache(async (latitude: number, longitude: number) => {
    const result = await reverseGeocode(latitude, longitude);
    if (!result) throw new Error('Reverse geocoding unavailable');
    return result;
}, ['geographic-info-v1'], { revalidate: 86400 });

export const getGeographicInfo = cache(async (latitude: number, longitude: number) => {
    try {
        return await lookup(latitude, longitude);
    } catch {
        return null;
    }
});
