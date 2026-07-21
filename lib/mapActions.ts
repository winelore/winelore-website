"use server"

// Глобальний кеш для уникнення лімітів API та пришвидшення роботи
const globalForCache = global as unknown as {
    eAmbrosiaCache: any[] | null,
    eAmbrosiaTime: number,
    polygonCache: Map<string, any>,
    gridCache: Map<string, string>
};

if (!globalForCache.eAmbrosiaCache) {
    globalForCache.eAmbrosiaCache = null;
    globalForCache.eAmbrosiaTime = 0;
}
if (!globalForCache.polygonCache) globalForCache.polygonCache = new Map();
if (!globalForCache.gridCache) globalForCache.gridCache = new Map();

async function getEAmbrosiaData() {
    const now = Date.now();
    if (globalForCache.eAmbrosiaCache && (now - globalForCache.eAmbrosiaTime < 24 * 60 * 60 * 1000)) {
        return globalForCache.eAmbrosiaCache;
    }

    const res = await fetch('https://webgate.ec.europa.eu/eambrosia-api/api/v1/geographical-indications', {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) throw new Error("API EU Error");

    const rawData = await res.json();

    const wineData = rawData
        .filter((gi: any) =>
            gi.productCategory?.toLowerCase().includes('wine') ||
            gi.productCategoryCode === 'Wine' ||
            gi.productCategoryCode === '2204'
        )
        .map((gi: any) => ({
            id: gi.id || gi.fileNumber,
            name: gi.name,
            type: gi.type || gi.protectionType || 'PDO',
            status: gi.status || 'Registered',
            countryCode: gi.countryCode,
            country: gi.country,
            countries: gi.countries
        }));

    globalForCache.eAmbrosiaCache = wineData;
    globalForCache.eAmbrosiaTime = now;

    return wineData;
}

export async function getRegionInfo(lat: number, lng: number) {
    try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en&polygon_geojson=1&zoom=5`, {
            headers: { 'User-Agent': 'WineLore-App/1.0' }
        });
        const geoData = await geoRes.json();

        const countryCode = geoData.address?.country_code?.toUpperCase();
        const countryName = geoData.address?.country;
        const state = geoData.address?.state || '';
        const region = state || geoData.address?.region || geoData.address?.county;
        const geojson = geoData.geojson || null;

        if (!countryCode) {
            return { region, countryCode, countryName, eAmbrosiaGIs: [], geojson };
        }

        let countryGIs: any[] = [];

        try {
            const eAmbroData = await getEAmbrosiaData();
            countryGIs = eAmbroData.filter((gi: any) => {
                const stringifiedGi = JSON.stringify(gi).toUpperCase();
                return stringifiedGi.includes(`"${countryCode}"`) || stringifiedGi.includes(`"${countryName?.toUpperCase()}"`);
            });
        } catch (apiError) {
            console.error("E-Ambrosia API error:", apiError);
        }

        let localGIs = countryGIs;

        if (countryCode === 'UA' && state) {
            const stateLower = state.toLowerCase();
            if (stateLower.includes('zakarpattia') || stateLower.includes('transcarpathia')) {
                localGIs = countryGIs.filter(gi => gi.name.toLowerCase().includes('zakarpat'));
            } else if (stateLower.includes('odesa') || stateLower.includes('odessa')) {
                localGIs = countryGIs.filter(gi =>
                    gi.name.toLowerCase().includes('shab') ||
                    gi.name.toLowerCase().includes('yalpuh') ||
                    gi.name.toLowerCase().includes('asha')
                );
            } else {
                localGIs = [];
            }
        } else if (state) {
            const stateBaseName = state.split(' ')[0].toLowerCase();
            const matchedLocal = countryGIs.filter(gi => gi.name.toLowerCase().includes(stateBaseName));
            if (matchedLocal.length > 0) localGIs = matchedLocal;
        }

        return { region, countryCode, countryName, eAmbrosiaGIs: localGIs, geojson };
    } catch (error) {
        console.error("Failed to get region info:", error);
        return { error: 'Internal Server Error', eAmbrosiaGIs: [], geojson: null };
    }
}

// Функція для фонового завантаження геометрії регіонів
export async function getVisiblePolygons(markers: {lat: number, lng: number}[]) {
    const polygons: any[] = [];
    const missingGrids: any[] = [];

    // Групуємо по сітці, щоб уникати дублікатів
    for (const m of markers) {
        const gridKey = `${m.lat.toFixed(0)}_${m.lng.toFixed(0)}`;
        if (globalForCache.gridCache.has(gridKey)) {
            const regionName = globalForCache.gridCache.get(gridKey);
            if (regionName && regionName !== "UNKNOWN" && regionName !== "FETCHING") {
                const poly = globalForCache.polygonCache.get(regionName);
                if (poly && !polygons.some(p => p.name === poly.name)) {
                    polygons.push(poly);
                }
            }
        } else {
            missingGrids.push({ lat: m.lat, lng: m.lng, gridKey });
        }
    }

    // Завантажуємо нові полігони (максимум 3 за раз, щоб не блокував Nominatim)
    const toProcess = missingGrids.slice(0, 3);
    for (const item of toProcess) {
        globalForCache.gridCache.set(item.gridKey, "FETCHING");

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${item.lat}&lon=${item.lng}&format=json&accept-language=en&polygon_geojson=1&zoom=5`, {
                headers: { 'User-Agent': 'WineLore-App/1.0' }
            });
            const data = await res.json();
            const regionName = data.address?.state || data.address?.region || data.address?.country;

            if (regionName && data.geojson) {
                const polyData = { name: regionName, geojson: data.geojson };
                globalForCache.polygonCache.set(regionName, polyData);
                globalForCache.gridCache.set(item.gridKey, regionName);

                if (!polygons.some(p => p.name === polyData.name)) polygons.push(polyData);
            } else {
                globalForCache.gridCache.set(item.gridKey, "UNKNOWN");
            }

            if (toProcess.length > 1) await new Promise(r => setTimeout(r, 600));
        } catch (e) {
            console.error("Nominatim fetch error:", e);
            globalForCache.gridCache.delete(item.gridKey);
        }
    }

    return polygons;
}