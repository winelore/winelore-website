"use server"

// Глобальний об'єкт для кешування в пам'яті Node.js
// Використовуємо global, щоб кеш виживав під час Hot Reload у Next.js (dev mode)
const globalForCache = global as unknown as { eAmbrosiaCache: any[] | null, eAmbrosiaTime: number };

if (!globalForCache.eAmbrosiaCache) {
    globalForCache.eAmbrosiaCache = null;
    globalForCache.eAmbrosiaTime = 0;
}

// Функція, яка бере дані з реєстру ЄС (або з нашого швидкого кешу)
async function getEAmbrosiaData() {
    const now = Date.now();

    // Якщо дані в кеші є і їм менше 24 годин - віддаємо миттєво з пам'яті!
    if (globalForCache.eAmbrosiaCache && (now - globalForCache.eAmbrosiaTime < 24 * 60 * 60 * 1000)) {
        return globalForCache.eAmbrosiaCache;
    }

    console.log("Завантаження даних E-Ambrosia (тільки перший раз)...");

    // Завантажуємо свіжі дані. cache: 'no-store' вимикає стандартний кеш Next.js, який падає від 8.8MB
    const res = await fetch('https://webgate.ec.europa.eu/eambrosia-api/api/v1/geographical-indications', {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) throw new Error("API EU Error");

    const rawData = await res.json();

    // ОПТИМІЗАЦІЯ: Відкидаємо сири та м'ясо. Залишаємо лише вина і тільки потрібні поля.
    // Це стисне 8.8 Мегабайт до кількох сотень Кілобайт!
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

    // Зберігаємо оптимізовані дані в оперативну пам'ять сервера
    globalForCache.eAmbrosiaCache = wineData;
    globalForCache.eAmbrosiaTime = now;

    console.log("Дані E-Ambrosia успішно закешовано в пам'ять сервера!");
    return wineData;
}

export async function getRegionInfo(lat: number, lng: number) {
    try {
        // 1. Отримуємо точну адресу та область через Nominatim
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`, {
            headers: { 'User-Agent': 'WineLore-App/1.0' }
        });
        const geoData = await geoRes.json();

        const countryCode = geoData.address?.country_code?.toUpperCase(); // "UA"
        const countryName = geoData.address?.country; // "Ukraine"
        const state = geoData.address?.state || ''; // Наприклад: "Odeska Oblast"
        const region = state || geoData.address?.region || geoData.address?.county;

        if (!countryCode) {
            return { region, countryCode, countryName, eAmbrosiaGIs: [] };
        }

        let countryGIs: any[] = [];

        try {
            // 2. БЕРЕМО ДАНІ З НАШОГО ШВИДКОГО КЕШУ
            const eAmbroData = await getEAmbrosiaData();

            countryGIs = eAmbroData.filter((gi: any) => {
                const stringifiedGi = JSON.stringify(gi).toUpperCase();
                return stringifiedGi.includes(`"${countryCode}"`) || stringifiedGi.includes(`"${countryName?.toUpperCase()}"`);
            });
        } catch (apiError) {
            console.error("E-Ambrosia API error:", apiError);
        }

        // 4. СМАРТ-ФІЛЬТР для областей
        let localGIs = countryGIs;

        if (countryCode === 'UA' && state) {
            const stateLower = state.toLowerCase();

            if (stateLower.includes('zakarpattia') || stateLower.includes('transcarpathia')) {
                localGIs = countryGIs.filter(gi => gi.name.toLowerCase().includes('zakarpat'));
            }
            else if (stateLower.includes('odesa') || stateLower.includes('odessa')) {
                localGIs = countryGIs.filter(gi =>
                    gi.name.toLowerCase().includes('shab') ||
                    gi.name.toLowerCase().includes('yalpuh') ||
                    gi.name.toLowerCase().includes('asha')
                );
            }
            else {
                localGIs = [];
            }
        } else if (state) {
            const stateBaseName = state.split(' ')[0].toLowerCase();
            const matchedLocal = countryGIs.filter(gi => gi.name.toLowerCase().includes(stateBaseName));
            if (matchedLocal.length > 0) {
                localGIs = matchedLocal;
            }
        }

        return {
            region,
            countryCode,
            countryName,
            eAmbrosiaGIs: localGIs
        };
    } catch (error) {
        console.error("Failed to get region info:", error);
        return { error: 'Internal Server Error', eAmbrosiaGIs: [] };
    }
}