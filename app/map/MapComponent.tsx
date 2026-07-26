"use client"
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, ZoomControl, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {
    WineRegionFeatureCollection,
    WineRegionLayer,
} from '@/lib/wineRegionTypes';

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
    south: number;
    west: number;
    north: number;
    east: number;
}

function MapEvents({ onBoundsChange }: { onBoundsChange: (data: BoundsData) => void }) {
    const map = useMapEvents({
        moveend: () => {
            const center = map.getCenter();
            const bounds = map.getBounds();
            const radiusMeters = map.distance(center, bounds.getNorthEast());
            onBoundsChange({
                lat: center.lat,
                lng: center.lng,
                radiusKm: radiusMeters / 1000,
                south: bounds.getSouth(),
                west: bounds.getWest(),
                north: bounds.getNorth(),
                east: bounds.getEast(),
            });
        }
    });

    useEffect(() => {
        const center = map.getCenter();
        const bounds = map.getBounds();
        const radiusMeters = map.distance(center, bounds.getNorthEast());
        onBoundsChange({
            lat: center.lat,
            lng: center.lng,
            radiusKm: radiusMeters / 1000,
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast(),
        });
    }, [map, onBoundsChange]);

    return null;
}

interface MapComponentProps {
    beverages: any[];
    onSelectBeverage: (bev: any) => void;
    onBoundsChange: (data: BoundsData) => void;
    selectedRegionGeoJson?: WineRegionFeatureCollection | null;
    visiblePolygons?: WineRegionLayer[];
}

export default function MapComponent({ beverages, onSelectBeverage, onBoundsChange, selectedRegionGeoJson, visiblePolygons = [] }: MapComponentProps) {
    const selectedRegionIds = new Set(
        selectedRegionGeoJson?.features.map((feature) => feature.properties.id) || [],
    );
    const backgroundRegions = visiblePolygons.filter(
        (region) => !selectedRegionIds.has(region.id),
    );
    const backgroundRegionCollection: WineRegionFeatureCollection = {
        type: "FeatureCollection",
        features: backgroundRegions.map((region) => region.geojson),
    };
    const backgroundRegionKey = backgroundRegions
        .map((region) => region.id)
        .join("|");

    return (
        <div className="relative h-full w-full">
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

                {backgroundRegions.length > 0 && (
                    <GeoJSON
                        key={backgroundRegionKey}
                        data={backgroundRegionCollection}
                        onEachFeature={(feature, layer) => {
                            layer.bindTooltip(`${feature.properties?.name || "Wine region"} · Wine region`, {
                                sticky: true,
                                direction: "top",
                            });
                        }}
                        style={{
                            color: '#7c3aed',
                            weight: 1.5,
                            opacity: 0.62,
                            fill: true,
                            fillColor: '#8b5cf6',
                            fillOpacity: 0.065,
                            dashArray: '4, 5',
                        }}
                    />
                )}

                {selectedRegionGeoJson && selectedRegionGeoJson.features.length > 0 && (
                    <GeoJSON
                        key={selectedRegionGeoJson.features
                            .map((feature) => feature.properties.id)
                            .join('-')}
                        data={selectedRegionGeoJson}
                        onEachFeature={(feature, layer) => {
                            layer.bindTooltip(`${feature.properties?.name || "Wine region"} · Wine region`, {
                                sticky: true,
                                direction: "top",
                            });
                        }}
                        style={{
                            color: '#4f46e5',
                            weight: 2.5,
                            opacity: 0.85,
                            fill: true,
                            fillColor: '#6366f1',
                            fillOpacity: 0.12,
                        }}
                    />
                )}

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

            <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/95 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-violet-700 shadow-lg backdrop-blur">
                <span className="h-2.5 w-5 rounded-sm border border-violet-500 bg-violet-100" />
                {visiblePolygons.length > 0
                    ? `${visiblePolygons.length} wine ${visiblePolygons.length === 1 ? "region" : "regions"} in view`
                    : "No mapped wine regions in view"}
            </div>
        </div>
    )
}
