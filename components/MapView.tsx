import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Building } from '../types';
import { MapPin, Navigation, Info } from 'lucide-react';

// --- Fix for Leaflet default icons in React ---
// This is necessary because the default icon paths are often broken in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
    buildings: Building[];
    onNavigateBuilding?: (building: Building) => void;
}

// Component to handle map invalidation and interactions
const MapController: React.FC = () => {
    const map = useMap();

    useEffect(() => {
        // Invalidate size after mount to ensure tiles load correctly
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);

    return null;
};

// Component to handle auto-fitting bounds
const MapBounds: React.FC<{ markers: [number, number][], active: boolean }> = ({ markers, active }) => {
    const map = useMap();

    useEffect(() => {
        if (!active || markers.length === 0) return;

        const bounds = new L.LatLngBounds(markers.map(m => [m[0], m[1]]));

        // Add some padding to the bounds
        map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 16, // Don't zoom in too close if only one marker or very close markers
            animate: true
        });
    }, [map, markers, active]);

    return null;
};

export const MapView: React.FC<MapViewProps> = ({ buildings, onNavigateBuilding }) => {
    // 1. Filter and parse valid coordinates
    const validBuildings = useMemo(() => {
        return buildings.filter(b => {
            if (!b.latitude || !b.longitude) return false;
            const lat = parseFloat(b.latitude);
            const lng = parseFloat(b.longitude);
            return !isNaN(lat) && !isNaN(lng);
        }).map(b => ({
            ...b,
            parsedLat: parseFloat(b.latitude!),
            parsedLng: parseFloat(b.longitude!)
        }));
    }, [buildings]);

    // 2. Prepare markers array for bounds calculation
    const markersPos = useMemo(() =>
        validBuildings.map(b => [b.parsedLat, b.parsedLng] as [number, number]),
        [validBuildings]);

    // Debug logging
    useEffect(() => {
        console.log(`[MapView] Received ${buildings.length} buildings, ${validBuildings.length} valid coordinates.`);
    }, [buildings, validBuildings]);

    // Default center (e.g., city center) if no buildings
    // Using a generic fallback (São Paulo/Brazil) or 0,0 if irrelevant. 
    // Ideally this should be configurable or based on the first building.
    const defaultCenter: [number, number] = validBuildings.length > 0
        ? [validBuildings[0].parsedLat, validBuildings[0].parsedLng]
        : [-23.5505, -46.6333];


    if (validBuildings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 h-[500px]">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                    <MapPin size={48} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhuma Geolocalização Encontrada</h3>
                <p className="text-sm text-slate-500 max-w-xs text-center mt-2">
                    Nenhum dos prédios cadastrados possui coordenadas de latitude e longitude válidas. Edite os cadastros para visualizar no mapa.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        <MapPin size={22} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">Mapa de Prédios</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                            {validBuildings.length} Locais Mapeados
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-[600px] relative z-0">
                <MapContainer
                    center={defaultCenter}
                    zoom={13}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        // You can swap this URL for Google Maps, Mapbox, or CartoDB for different styles
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Auto-fit bounds controller */}
                    <MapBounds markers={markersPos} active={true} />
                    <MapController />

                    {validBuildings.map((b, index) => (
                        <Marker
                            key={b.id}
                            position={[b.parsedLat, b.parsedLng]}
                        >
                            <Popup>
                                <div className="min-w-[200px]">
                                    <h3 className="text-sm font-black text-slate-800 uppercase mb-1 flex items-center gap-2">
                                        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                                            #{index + 1}
                                        </span>
                                        {b.name}
                                    </h3>
                                    <div className="text-xs text-slate-500 font-medium mb-2 border-b border-slate-100 pb-2">
                                        {b.address}
                                    </div>

                                    <div className="space-y-1">
                                        {b.buildingNumber && (
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400 font-bold uppercase">Nº Predial:</span>
                                                <span className="font-mono font-bold text-slate-700">{b.buildingNumber}</span>
                                            </div>
                                        )}
                                        {b.managerName && (
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400 font-bold uppercase">Resp:</span>
                                                <span className="font-bold text-slate-700">{b.managerName}</span>
                                            </div>
                                        )}
                                    </div>

                                    {onNavigateBuilding && (
                                        <button
                                            onClick={() => onNavigateBuilding(b)}
                                            className="mt-3 w-full flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors"
                                        >
                                            <Navigation size={12} /> Ver Detalhes
                                        </button>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

        </div>
    );
};
