"use client"

import React, { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { Wine, MapPin, Shield, X, Globe, Loader2, Info } from "lucide-react"
import { AppHeader, type AppTabId } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
// import { fetchGraphQL } from "@/lib/apiClient"
// import { GET_BEVERAGES_SPATIAL } from "./queries"
import { getRegionInfo } from "@/lib/mapActions"

// Динамічний імпорт Leaflet карти
const MapComponent = dynamic(() => import('./MapComponent'), {
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
})

export default function MapClientView() {
    const [activeTab, setActiveTab] = useState<AppTabId>("feed")
    const { t } = useTranslation()

    const [beverages, setBeverages] = useState<any[]>([])
    const [selectedBev, setSelectedBev] = useState<any | null>(null)
    const [regionData, setRegionData] = useState<any | null>(null)
    const [loadingRegion, setLoadingRegion] = useState(false)

    // Стани для ресайзу панелі
    const [sidebarWidth, setSidebarWidth] = useState(400)
    const [isResizing, setIsResizing] = useState(false)

    // Логіка просторового пошуку
    const handleBoundsChange = useCallback(async (bounds: any) => {
        try {
            // =========================================================
            // TODO: РОЗКОМЕНТУВАТИ КОЛИ БЕКЕНД ДОДАСТЬ `boundingBox`
            // =========================================================
            /*
            const response = await fetchGraphQL(GET_BEVERAGES_SPATIAL as any, {
                filter: {
                    boundingBox: {
                        minLat: bounds.getSouth(),
                        maxLat: bounds.getNorth(),
                        minLng: bounds.getWest(),
                        maxLng: bounds.getEast()
                    }
                },
                limit: 500
            }) as any;

            if (response?.beverages?.items) {
                setBeverages(response.beverages.items);
            }
            */

            // =========================================================
            // ТИМЧАСОВІ МОКОВІ ДАНІ (УКРАЇНА)
            // =========================================================
            await new Promise(resolve => setTimeout(resolve, 300));

            const mockBeverages = [
                {
                    id: "mock-1",
                    name: "Chateau Chizay - Troyanda Karpat",
                    status: "APPROVED",
                    origin: { latitude: 48.205, longitude: 22.644 }
                },
                {
                    id: "mock-2",
                    name: "Shabo Reserve Telti-Kuruk",
                    status: "PUBLISHED",
                    origin: { latitude: 46.130, longitude: 30.385 }
                },
                {
                    id: "mock-3",
                    name: "Koblevo Cabernet Sauvignon",
                    status: "PUBLISHED",
                    origin: { latitude: 46.626, longitude: 31.188 }
                },
                {
                    id: "mock-4",
                    name: "Beykush Artania - Спеціальне дуже довге ім'я для тестування ресайзу",
                    status: "PUBLISHED",
                    origin: { latitude: 46.598, longitude: 31.460 }
                }
            ];

            setBeverages(mockBeverages);

        } catch (err) {
            console.error("Failed to fetch spatial beverages", err);
        }
    }, [])

    const handleSelectBeverage = async (bev: any) => {
        setSelectedBev(bev);
        setRegionData(null);
        setLoadingRegion(true);

        if (bev.origin?.latitude && bev.origin?.longitude) {
            const data = await getRegionInfo(bev.origin.latitude, bev.origin.longitude);
            setRegionData(data);
        }
        setLoadingRegion(false);
    }

    // Логіка Drag & Drop для зміни ширини меню
    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            // Нова ширина - це ширина екрану мінус позиція мишки по X
            let newWidth = window.innerWidth - e.clientX;

            // Обмежуємо мінімальну та максимальну ширину (мін: 320px, макс: 80% від екрану)
            const minWidth = 320;
            const maxWidth = window.innerWidth * 0.8;

            if (newWidth < minWidth) newWidth = minWidth;
            if (newWidth > maxWidth) newWidth = maxWidth;

            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            // Вимикаємо виділення тексту під час ресайзу для кращого UX
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
        } else {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex-1 relative flex overflow-hidden">
                {/* Карта */}
                <div className="flex-1 relative z-0">
                    <MapComponent
                        beverages={beverages}
                        onSelectBeverage={handleSelectBeverage}
                        onBoundsChange={handleBoundsChange}
                    />
                </div>

                {/* Бокова панель з інформацією */}
                <div
                    className={`absolute top-0 right-0 h-full bg-slate-50 shadow-2xl z-10 flex flex-col border-l border-slate-200/60
                        ${selectedBev ? 'translate-x-0' : 'translate-x-full'} 
                        ${isResizing ? 'transition-none' : 'transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]'}
                    `}
                    style={{ width: `${sidebarWidth}px` }}
                >
                    {/* Повзунок для ресайзу (Resizer) */}
                    <div
                        className="absolute top-0 bottom-0 left-0 w-2 hover:bg-indigo-500/20 active:bg-indigo-500/40 cursor-col-resize z-50 transition-colors duration-200 group/resizer"
                        onMouseDown={startResizing}
                    >
                        {/* Маленька декоративна лінія */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-12 bg-slate-300 rounded-full group-hover/resizer:bg-indigo-400 transition-colors" />
                    </div>

                    {selectedBev && (
                        <>
                            {/* Шапка бокової панелі */}
                            <div className="group/header pl-8 pr-6 py-6 border-b border-slate-200/60 flex items-start justify-between gap-4 bg-white relative overflow-hidden transition-colors hover:bg-slate-50/50">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover/header:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                <div className="flex items-start gap-4 relative z-10 flex-1 min-w-0">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover/header:bg-indigo-600 group-hover/header:text-white group-hover/header:border-indigo-600 transition-all duration-300 shadow-sm group-hover/header:shadow-lg group-hover/header:shadow-indigo-200/50">
                                        <Wine className="w-7 h-7" />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <h2 className="text-xl font-extrabold text-slate-800 truncate group-hover/header:text-indigo-900 transition-colors">
                                            {selectedBev.name}
                                        </h2>
                                        <p className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 border border-indigo-100/50 group-hover/header:border-indigo-200 transition-colors">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            {selectedBev.status}
                                        </p>
                                    </div>
                                </div>

                                {/* Статична кнопка закриття (shrink-0 не дає їй стискатися) */}
                                <button
                                    onClick={() => setSelectedBev(null)}
                                    className="relative z-10 shrink-0 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pl-8 pr-6 py-6 space-y-8 bg-slate-50/50">

                                {/* Блок координат та Nominatim географії */}
                                <div>
                                    <div className="flex items-center gap-3 mb-5 group/geo-header cursor-default">
                                        <div className="relative flex items-center justify-center w-10 h-10 shrink-0 rounded-[14px] bg-white border border-slate-200 shadow-sm transition-all duration-300 group-hover/geo-header:border-indigo-200 group-hover/geo-header:shadow-md group-hover/geo-header:-translate-y-0.5">
                                            <div className="absolute inset-0 rounded-[14px] bg-indigo-50 opacity-0 group-hover/geo-header:opacity-100 transition-opacity duration-300"></div>
                                            <MapPin className="w-5 h-5 text-slate-400 group-hover/geo-header:text-indigo-500 relative z-10 transition-colors duration-300" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 truncate group-hover/geo-header:text-indigo-600 transition-colors duration-300">
                                                {/*{t("map.geography") as string || "Geography"}*/}
                                                {"Geography"}
                                            </h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">Origin details</p>
                                        </div>
                                        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent ml-2 group-hover/geo-header:from-indigo-200 transition-colors duration-300"></div>
                                    </div>

                                    {loadingRegion ? (
                                        <div className="flex items-center gap-3 text-sm font-bold text-slate-500 bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                                            <Loader2 className="w-5 h-5 animate-spin text-indigo-500 shrink-0" />
                                            Detecting region...
                                        </div>
                                    ) : regionData ? (
                                        <div className="group/geo bg-white p-5 rounded-[24px] border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/40 transition-all duration-300">
                                            <p className="text-sm font-bold text-slate-700 group-hover/geo:text-indigo-700 transition-colors">
                                                {regionData.region || "Unknown Region"}
                                            </p>
                                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-2 truncate">
                                                <Globe className="w-3.5 h-3.5 shrink-0 group-hover/geo:text-indigo-500 transition-colors" />
                                                {regionData.countryName || regionData.countryCode}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>

                                {/* Блок реєстру ЄС E-Ambrosia */}
                                {!loadingRegion && regionData && (
                                    <div className="pt-2">
                                        <div className="flex items-center gap-3 mb-5 group/eu cursor-default">
                                            <div className="relative flex items-center justify-center w-10 h-10 shrink-0 rounded-[14px] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/30 transition-all duration-300 group-hover/eu:shadow-lg group-hover/eu:shadow-blue-500/50 group-hover/eu:-translate-y-0.5">
                                                <div className="absolute inset-0 rounded-[14px] bg-white/20 opacity-0 group-hover/eu:opacity-100 transition-opacity duration-300"></div>
                                                <Shield className="w-5 h-5 text-white relative z-10" />
                                                <div className="absolute top-1.5 right-1.5 w-1 h-1 bg-yellow-300 rounded-full animate-pulse shadow-[0_0_4px_rgba(253,224,71,0.8)]"></div>
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-[11px] font-extrabold uppercase tracking-widest truncate bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
                                                    EU E-Ambrosia Register
                                                </h3>
                                                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-0.5 truncate">Official PDO / PGI</p>
                                            </div>
                                            <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent ml-2"></div>
                                        </div>

                                        {regionData.eAmbrosiaGIs && regionData.eAmbrosiaGIs.length > 0 ? (
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-3 bg-blue-50/50 text-blue-800 p-4 rounded-[20px] border border-blue-100/50">
                                                    <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                                    <p className="text-xs font-medium leading-relaxed">
                                                        Found <strong className="font-extrabold">{regionData.eAmbrosiaGIs.length}</strong> protected geographical indications (PDO/PGI) recognized by the EU for {regionData.countryName}.
                                                    </p>
                                                </div>

                                                <div className="space-y-3">
                                                    {regionData.eAmbrosiaGIs.map((gi: any) => (
                                                        <div key={gi.id} className="group/gi bg-white border border-slate-100 p-5 rounded-[24px] shadow-sm hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 cursor-default flex flex-col">
                                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                                {/* Якщо розширювати меню, цей текст більше не обрізатиметься */}
                                                                <h4 className="text-sm font-bold text-slate-800 leading-tight group-hover/gi:text-blue-700 transition-colors">
                                                                    {gi.name}
                                                                </h4>
                                                                <span className="shrink-0 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60 rounded-lg group-hover/gi:bg-amber-100 transition-colors shadow-sm">
                                                                    {gi.type}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-auto">
                                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${gi.status === 'Registered' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                                                <p className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400 group-hover/gi:text-slate-500 transition-colors truncate">
                                                                    {gi.status}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white border border-slate-100 p-8 rounded-[24px] text-center shadow-sm">
                                                <Shield className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                                <p className="text-sm font-bold text-slate-700">No EU GIs found</p>
                                                <p className="text-xs text-slate-500 mt-1">There are no protected indications registered for this country.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}