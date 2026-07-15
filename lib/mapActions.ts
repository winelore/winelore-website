// app/actions/mapActions.ts
"use server"

export async function getRegionInfo(lat: number, lng: number) {
    try {
        // 1. Отримуємо країну та регіон через OSM Nominatim (Reverse Geocoding)
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { 'User-Agent': 'WineLore-App/1.0' }
        });
        const geoData = await geoRes.json();

        const countryCode = geoData.address?.country_code?.toUpperCase(); // Наприклад: 'UA'
        const countryName = geoData.address?.country;
        const region = geoData.address?.state || geoData.address?.region || geoData.address?.county;

        if (!countryCode) {
            return { region, countryCode, countryName, eAmbrosiaGIs: [] };
        }

        // 2. Отримуємо дані з E-Ambrosia (API ЄС)
        // Кешуємо запит на 24 години, оскільки реєстр оновлюється не часто
        const eAmbroRes = await fetch('https://webgate.ec.europa.eu/eambrosia-api/api/v1/geographical-indications', {
            next: { revalidate: 86400 }
        });

        if (!eAmbroRes.ok) {
            console.error("E-Ambrosia API error:", eAmbroRes.status);
            return { region, countryCode, countryName, eAmbrosiaGIs: [], error: 'E-Ambrosia API unavailable' };
        }

        const eAmbroData = await eAmbroRes.json();

        // 3. Фільтруємо географічні зазначення для знайденої країни та типу 'Wine'
        const matchedGIs = eAmbroData.filter((gi: any) => {
            const matchesCountry =
                gi.countryCode === countryCode ||
                gi.country === countryCode ||
                gi.country === countryName ||
                (Array.isArray(gi.countries) && gi.countries.some((c: any) => c.countryCode === countryCode || c === countryCode));

            // Шукаємо серед винних категорій
            const isWine = gi.productCategory?.toLowerCase().includes('wine') ||
                gi.productCategoryCode === 'Wine' ||
                gi.productCategoryCode === '2204'; // Combined nomenclature code для вина

            return matchesCountry && isWine;
        });

        return {
            region,
            countryCode,
            countryName,
            eAmbrosiaGIs: matchedGIs.map((gi: any) => ({
                id: gi.id,
                name: gi.name,
                type: gi.type, // PDO / PGI
                status: gi.status,
                fileNumber: gi.fileNumber
            }))
        };
    } catch (error) {
        console.error("Failed to get region info:", error);
        return { error: 'Internal Server Error', eAmbrosiaGIs: [] };
    }
}