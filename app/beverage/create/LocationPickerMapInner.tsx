'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, X, Loader2, Compass } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

const markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

function MapClickHandler({
    onSelectLocation,
}: {
    onSelectLocation: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(e: any) {
            onSelectLocation(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function MapFlyTo({ center }: { center: [number, number] | null }) {
    const map = useMapEvents({});
    useEffect(() => {
        if (center) {
            map.flyTo(center, 10, { animate: true, duration: 1.2 });
        }
    }, [center, map]);
    return null;
}

interface LocationPickerProps {
    value: { latitude: number; longitude: number } | null;
    onChange: (coords: { latitude: number; longitude: number } | null) => void;
    disabled?: boolean;
}

export default function LocationPickerMapInner({
    value,
    onChange,
    disabled = false,
}: LocationPickerProps) {
    const { t } = useTranslation();

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [flyToCenter, setFlyToCenter] = useState<[number, number] | null>(null);
    const [placeName, setPlaceName] = useState<string | null>(null);

    // Initial map center
    const defaultCenter: [number, number] = value
        ? [value.latitude, value.longitude]
        : [49.0, 31.0]; // Default centered near Ukraine/Europe

    const handleMapClick = (lat: number, lng: number) => {
        if (disabled) return;
        const roundedLat = parseFloat(lat.toFixed(6));
        const roundedLng = parseFloat(lng.toFixed(6));
        onChange({ latitude: roundedLat, longitude: roundedLng });
        fetchReverseGeocode(roundedLat, roundedLng);
    };

    const fetchReverseGeocode = async (lat: number, lng: number) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
                { headers: { 'Accept-Language': 'uk,en,hu' } }
            );
            if (res.ok) {
                const data = await res.json();
                if (data && data.display_name) {
                    setPlaceName(data.display_name);
                }
            }
        } catch {
            // Ignore geocoding failure gracefully
        }
    };

    const handleSearchSubmit = async () => {
        const query = searchQuery.trim();
        if (!query) return;

        setIsSearching(true);
        setSearchError(null);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                { headers: { 'Accept-Language': 'uk,en,hu' } }
            );
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const foundLat = parseFloat(data[0].lat);
                    const foundLng = parseFloat(data[0].lon);
                    const roundedLat = parseFloat(foundLat.toFixed(6));
                    const roundedLng = parseFloat(foundLng.toFixed(6));
                    onChange({ latitude: roundedLat, longitude: roundedLng });
                    setFlyToCenter([roundedLat, roundedLng]);
                    setPlaceName(data[0].display_name);
                } else {
                    setSearchError(t('beverage.mapSearchNotFound', { defaultValue: 'Локацію не знайдено. Спробуйте іншу назву.' }));
                }
            } else {
                setSearchError(t('beverage.mapSearchError', { defaultValue: 'Помилка пошуку локації.' }));
            }
        } catch (err) {
            setSearchError(t('beverage.mapSearchNetworkError', { defaultValue: 'Помилка мережі при пошуку.' }));
        } finally {
            setIsSearching(false);
        }
    };

    const handleClear = () => {
        onChange(null);
        setPlaceName(null);
        setSearchQuery('');
        setSearchError(null);
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Search and control bar (used div instead of form to avoid nested form hydration error) */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder={t('beverage.mapSearchPlaceholder', { defaultValue: 'Пошук регіону або міста (напр. Бордо, Ужгород, Закарпаття)...' })}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSearchSubmit();
                            }
                        }}
                        disabled={disabled || isSearching}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-20 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                    />
                    <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                    <button
                        type="button"
                        onClick={handleSearchSubmit}
                        disabled={disabled || isSearching || !searchQuery.trim()}
                        className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white transition-all hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                        {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : t('beverage.mapSearchButton', { defaultValue: 'Знайти' })}
                    </button>
                </div>

                {value && (
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={disabled}
                        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
                    >
                        <X className="h-3.5 w-3.5" />
                        <span>{t('beverage.mapClearMarker', { defaultValue: 'Очистити маркер' })}</span>
                    </button>
                )}
            </div>

            {searchError && (
                <p className="text-xs font-semibold text-rose-600">{searchError}</p>
            )}

            {/* Map Canvas */}
            <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-inner bg-slate-100">
                <MapContainer
                    center={defaultCenter}
                    zoom={value ? 8 : 5}
                    minZoom={2}
                    maxBounds={[[-90, -180], [90, 180]]}
                    maxBoundsViscosity={1.0}
                    className="h-full w-full z-0 cursor-crosshair"
                    zoomControl={true}
                >
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        noWrap={true}
                    />
                    <MapClickHandler onSelectLocation={handleMapClick} />
                    <MapFlyTo center={flyToCenter} />

                    {value && (
                        <Marker
                            position={[value.latitude, value.longitude]}
                            icon={markerIcon}
                            draggable={!disabled}
                            eventHandlers={{
                                dragend: (e: any) => {
                                    const latlng = e.target.getLatLng();
                                    handleMapClick(latlng.lat, latlng.lng);
                                },
                            }}
                        />
                    )}
                </MapContainer>

                {/* Instruction overlay badge */}
                <div className="pointer-events-none absolute top-3 left-3 z-[400] flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white/90 px-3 py-1.5 text-[11px] font-extrabold text-indigo-700 shadow-md backdrop-blur">
                    <Compass className="h-3.5 w-3.5 text-indigo-600" />
                    <span>
                        {value
                            ? t('beverage.mapHintSelected', { defaultValue: 'Натисніть або перетягніть маркер для зміни' })
                            : t('beverage.mapHintEmpty', { defaultValue: 'Натисніть на карту, щоб поставити маркер походження' })}
                    </span>
                </div>
            </div>

            {/* Selected Location Info Card */}
            {value ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs font-semibold text-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                            <MapPin className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-extrabold text-indigo-950 truncate">
                                {placeName || t('beverage.mapLocationSelected', { defaultValue: 'Обрана географічна точка' })}
                            </p>
                            <p className="text-[11px] text-indigo-600/90 font-mono">
                                Lat: {value.latitude.toFixed(5)}, Lng: {value.longitude.toFixed(5)}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-medium text-slate-500">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>{t('beverage.mapLocationEmpty', { defaultValue: 'Локація походження ще не обрана. Виберіть точку на карті або скористайтесь пошуком.' })}</span>
                </div>
            )}
        </div>
    );
}
