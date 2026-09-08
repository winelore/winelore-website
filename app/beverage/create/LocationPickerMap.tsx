'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MapPin } from 'lucide-react';

const LocationPickerMapInner = dynamic(() => import('./LocationPickerMapInner'), {
    ssr: false,
    loading: () => (
        <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
            <div className="flex items-center gap-2 text-xs font-semibold">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Завантаження інтерактивної карти...</span>
            </div>
        </div>
    ),
});

interface LocationPickerProps {
    value: { latitude: number; longitude: number } | null;
    onChange: (coords: { latitude: number; longitude: number } | null) => void;
    disabled?: boolean;
}

export function LocationPickerMap({ value, onChange, disabled }: LocationPickerProps) {
    return <LocationPickerMapInner value={value} onChange={onChange} disabled={disabled} />;
}
