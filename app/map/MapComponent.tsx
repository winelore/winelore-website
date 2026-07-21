"use client"
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, ZoomControl, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Кастомна іконка без тіні
const customIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface BoundsData {
    lat: number;
    lng: number;
    radiusKm: number;
}

function MapEvents({ onBoundsChange }: { onBoundsChange: (data: BoundsData) => void }) {
    const map = useMapEvents({
        moveend: () => {
            const center = map.getCenter();
            const bounds = map.getBounds();
            const radiusMeters = map.distance(center, bounds.getNorthEast());
            onBoundsChange({ lat: center.lat, lng: center.lng, radiusKm: radiusMeters / 1000 });
        }
    });

    useEffect(() => {
        const center = map.getCenter();
        const bounds = map.getBounds();
        const radiusMeters = map.distance(center, bounds.getNorthEast());
        onBoundsChange({ lat: center.lat, lng: center.lng, radiusKm: radiusMeters / 1000 });
    }, [map, onBoundsChange]);

    return null;
}

interface MapComponentProps {
    beverages: any[];
    onSelectBeverage: (bev: any) => void;
    onBoundsChange: (data: BoundsData) => void;
    selectedRegionGeoJson?: any;
    visiblePolygons?: { name: string, geojson: any }[];
}

export default function MapComponent({ beverages, onSelectBeverage, onBoundsChange, selectedRegionGeoJson, visiblePolygons = [] }: MapComponentProps) {
    return (
        <MapContainer
            center={[49.0, 31.0]}
            zoom={5}
            minZoom={3}
            maxBounds={[[-90, -180], [90, 180]]}
            maxBoundsViscosity={1.0}
            className="w-full h-full z-0"
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                noWrap={true}
            />
            <ZoomControl position="bottomright" />
            <MapEvents onBoundsChange={onBoundsChange} />

            {/* МАЛЮЄМО ВСІ ФОНОВІ РЕГІОНИ (Ледь помітні межі) */}
            {visiblePolygons.map((poly, idx) => {
                const isSelected = selectedRegionGeoJson && JSON.stringify(selectedRegionGeoJson) === JSON.stringify(poly.geojson);
                if (isSelected) return null; // Обраний малюємо окремо нижче

                return (
                    <GeoJSON
                        key={`poly-${poly.name}-${idx}`}
                        data={poly.geojson}
                        style={{
                            color: '#94a3b8', // Світло-сіра обводка
                            weight: 1.5,
                            opacity: 0.3,     // Зроблено прозорішим (було 0.5)
                            fill: false,      // ПОВНІСТЮ ПРИБРАНО ЗАЛИВКУ
                            dashArray: '4, 4' // Пунктирна лінія
                        }}
                    />
                )
            })}

            {/* МАЛЮЄМО ОБРАНИЙ РЕГІОН (Яскраво-фіолетові межі поверх інших) */}
            {selectedRegionGeoJson && (
                <GeoJSON
                    key={`selected-${Math.random()}`} // Унікальний ключ для миттєвого перемальовування
                    data={selectedRegionGeoJson}
                    style={{
                        color: '#6366f1', // Indigo контур
                        weight: 2.5,      // Трохи тонше для елегантності
                        opacity: 0.6,     // Зроблено прозорішим (було 0.8)
                        fill: false,      // ПОВНІСТЮ ПРИБРАНО ЗАЛИВКУ
                        dashArray: '6, 6' // Пунктирна лінія
                    }}
                />
            )}

            {/* Маркери вин */}
            {beverages.map((bev) => (
                bev.latitude && bev.longitude && (
                    <Marker
                        key={bev.id}
                        position={[bev.latitude, bev.longitude]}
                        icon={customIcon}
                        eventHandlers={{
                            click: () => onSelectBeverage(bev)
                        }}
                    />
                )
            ))}
        </MapContainer>
    )
}