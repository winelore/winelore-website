// app/map/MapComponent.tsx
"use client"
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Фікс для стандартних іконок Leaflet у Next.js
const customIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

function MapEvents({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
    const map = useMapEvents({
        moveend: () => {
            onBoundsChange(map.getBounds());
        }
    });

    useEffect(() => {
        // Завантажуємо дані при ініціалізації карти
        onBoundsChange(map.getBounds());
    }, [map, onBoundsChange]);

    return null;
}

interface MapComponentProps {
    beverages: any[];
    onSelectBeverage: (bev: any) => void;
    onBoundsChange: (bounds: L.LatLngBounds) => void;
}

export default function MapComponent({ beverages, onSelectBeverage, onBoundsChange }: MapComponentProps) {
    // Центруємо карту на Європі / Україні за замовчуванням
    return (
        <MapContainer center={[49.0, 31.0]} zoom={5} className="w-full h-full z-0" zoomControl={false}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <ZoomControl position="bottomright" />
            <MapEvents onBoundsChange={onBoundsChange} />

            {beverages.map((bev) => (
                bev.origin?.latitude && bev.origin?.longitude && (
                    <Marker
                        key={bev.id}
                        position={[bev.origin.latitude, bev.origin.longitude]}
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