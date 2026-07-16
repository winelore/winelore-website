"use client"
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
    return (
        <MapContainer
            center={[49.0, 31.0]}
            zoom={5}
            minZoom={3} // Забороняємо занадто сильно віддаляти
            maxBounds={[[-90, -180], [90, 180]]} // ЗАБОРОНЯЄМО нескінченну прокрутку
            maxBoundsViscosity={1.0} // Робить так, щоб карта "билася" об край і не йшла далі
            className="w-full h-full z-0"
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                noWrap={true} // Додатково кажемо Leaflet не малювати копії світу
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