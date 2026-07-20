"use client"
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ВАЖЛИВО: Видалено shadowUrl, щоб уникнути чорних плям при скупченні
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
}

export default function MapComponent({ beverages, onSelectBeverage, onBoundsChange }: MapComponentProps) {
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