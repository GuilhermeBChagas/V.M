
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Incident, Building, Sector, ViewState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle, Clock, Activity, Zap, Plus, ArrowRight, CalendarClock, FileText, Search, MapPin, Loader2, Navigation, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { normalizeString } from '../utils/stringUtils';
import AnnouncementBoard from './AnnouncementBoard';
import { User } from '../types';

interface DashboardProps {
    incidents: Incident[];
    buildings: Building[];
    sectors: Sector[];
    onViewIncident?: (incident: Incident) => void;
    onNavigate: (view: ViewState) => void;
    onRefresh?: () => void;
    onNewIncidentWithBuilding?: (buildingId: string) => void;
    onUnreadChange?: () => void;
    currentUser: User;
    pendingIncidentsCount: number;
    pendingLoansCount: number;
    unreadAnnouncementsCount: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
    incidents,
    buildings,
    sectors,
    onViewIncident,
    onNavigate,
    onRefresh,
    onNewIncidentWithBuilding,
    onUnreadChange,
    currentUser,
    pendingIncidentsCount,
    pendingLoansCount,
    unreadAnnouncementsCount
}) => {
    // Estados da Pesquisa de Prédios
    const [buildingSearchTerm, setBuildingSearchTerm] = useState('');
    const [isBuildingListOpen, setIsBuildingListOpen] = useState(false);
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
                setIsBuildingListOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Lógica de Pesquisa e Geolocalização ---
    const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        var R = 6371;
        var dLat = (lat2 - lat1) * (Math.PI / 180);
        var dLon = (lon2 - lon1) * (Math.PI / 180);
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleLocateNearest = () => {
        setLocationError(null);
        if (!navigator.geolocation) {
            setLocationError("Geolocalização não suportada.");
            return;
        }

        const buildingsWithCoords = buildings.filter(b => b.latitude && b.longitude);
        if (buildingsWithCoords.length === 0) {
            setLocationError("Nenhum prédio possui coordenadas.");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                let nearestBuilding: Building | null = null;
                let minDistance = Infinity;

                buildingsWithCoords.forEach(b => {
                    const latStr = b.latitude!.toString().replace(',', '.');
                    const lngStr = b.longitude!.toString().replace(',', '.');
                    const bLat = parseFloat(latStr);
                    const bLng = parseFloat(lngStr);

                    if (!isNaN(bLat) && !isNaN(bLng)) {
                        const dist = getDistanceFromLatLonInKm(userLat, userLng, bLat, bLng);
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearestBuilding = b;
                        }
                    }
                });

                if (nearestBuilding) {
                    setSelectedBuilding(nearestBuilding);
                    setBuildingSearchTerm(nearestBuilding.name);
                    setIsBuildingListOpen(false);
                } else {
                    setLocationError("Não foi possível determinar o prédio mais próximo.");
                }
                setIsLocating(false);
            },
            (error) => {
                setLocationError("Sinal GPS indisponível ou permissão negada.");
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const filteredBuildings = buildings.filter(b =>
        normalizeString(b.name).includes(normalizeString(buildingSearchTerm)) ||
        normalizeString(b.buildingNumber).includes(normalizeString(buildingSearchTerm))
    );

    const recentIncidents = useMemo(() => {
        return incidents.filter(i => i.status !== 'CANCELLED').slice(0, 5);
    }, [incidents]);

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* SAUDAÇÃO E HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                        Olá, {currentUser.name.split(' ')[0]} 👋
                    </h1>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Bem-vindo ao Painel de Controle</p>
                </div>
            </div>

            {/* BARRA DE PESQUISA COM GPS */}
            <div className="relative" ref={searchContainerRef}>
                <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 flex flex-col sm:flex-row items-center gap-2">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar local por nome ou GPS..."
                            value={buildingSearchTerm}
                            onFocus={() => setIsBuildingListOpen(true)}
                            onChange={(e) => {
                                setBuildingSearchTerm(e.target.value);
                                setIsBuildingListOpen(true);
                                if (selectedBuilding) setSelectedBuilding(null);
                            }}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none uppercase tracking-wide"
                        />
                    </div>
                    <button
                        onClick={handleLocateNearest}
                        disabled={isLocating}
                        className="w-full sm:w-auto bg-brand-600 text-white hover:bg-brand-700 px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-500/25 active:scale-95"
                    >
                        {isLocating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                        <span>Onde estou?</span>
                    </button>
                </div>

                {isBuildingListOpen && buildingSearchTerm && filteredBuildings.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto animate-in slide-in-from-top-2 fade-in">
                        {filteredBuildings.map(b => (
                            <div
                                key={b.id}
                                onClick={() => {
                                    setSelectedBuilding(b);
                                    setBuildingSearchTerm(b.name);
                                    setIsBuildingListOpen(false);
                                }}
                                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors group"
                            >
                                <div className="h-10 w-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-lg group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors font-black">
                                    {b.buildingNumber}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase truncate">{b.name}</p>
                                    <p className="text-xs text-slate-400 font-bold uppercase truncate">{b.address}</p>
                                </div>
                                <ArrowRight size={16} className="text-slate-300 group-hover:text-brand-500" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SELEÇÃO ATIVA */}
            {selectedBuilding && (
                <div className="bg-brand-900 dark:bg-slate-800 rounded-3xl p-6 text-white shadow-2xl animate-in slide-in-from-top-4 fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-white/10 rounded-2xl">
                                <MapPin size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase leading-none">{selectedBuilding.name}</h3>
                                <p className="text-xs text-white/60 font-medium uppercase mt-1">{selectedBuilding.address}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onNewIncidentWithBuilding?.(selectedBuilding.id)}
                            className="w-full md:w-auto px-10 py-4 bg-brand-500 hover:bg-brand-400 text-white rounded-2xl font-black text-xs uppercase shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> Iniciar Registro Aqui
                        </button>
                    </div>
                </div>
            )}

            {/* ATALHOS DE PENDÊNCIAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                    onClick={() => onNavigate('PENDING_APPROVALS')}
                    className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex items-center gap-4"
                >
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:scale-110 transition-transform relative">
                        <FileText size={28} />
                        {pendingIncidentsCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full shadow-sm animate-pulse" />
                        )}
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">Registros Pendentes</h4>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">{pendingIncidentsCount}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase">Aguardando</span>
                        </div>
                    </div>
                    <ArrowRight className="ml-auto text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" size={20} />
                </div>

                <div
                    onClick={() => onNavigate('LOANS')}
                    className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex items-center gap-4"
                >
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform relative">
                        <Zap size={28} />
                        {pendingLoansCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full shadow-sm animate-pulse" />
                        )}
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">Cautelas Ativas</h4>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">{pendingLoansCount}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase">Pendentes</span>
                        </div>
                    </div>
                    <ArrowRight className="ml-auto text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={20} />
                </div>
            </div>

            {/* MURAL E ATIVIDADES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* MURAL DE AVISOS */}
                <div>
                    <AnnouncementBoard
                        currentUser={currentUser}
                        onViewAll={() => onNavigate('ANNOUNCEMENTS')}
                        onUnreadChange={onUnreadChange}
                    />
                </div>

                {/* ÚLTIMOS REGISTROS */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <Activity size={20} />
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Últimas Atividades</h3>
                        </div>
                        <button
                            onClick={() => onNavigate('HISTORY')}
                            className="text-slate-400 text-xs font-bold uppercase hover:text-brand-600 transition-colors"
                        >
                            Ver Todos
                        </button>
                    </div>

                    <div className="space-y-4">
                        {recentIncidents.map(incident => {
                            const building = buildings.find(b => b.id === incident.buildingId);
                            return (
                                <div
                                    key={incident.id}
                                    onClick={() => onViewIncident?.(incident)}
                                    className="p-4 rounded-xl border border-slate-50 dark:border-slate-700/50 hover:border-brand-100 dark:hover:border-brand-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase truncate pr-2">
                                            {building?.name || 'Local'}
                                        </h4>
                                        <span className="text-xs font-bold text-slate-400 uppercase">
                                            {new Date(incident.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2 italic">
                                        "{incident.description}"
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase">
                                            RA {incident.raCode}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${incident.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {incident.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {recentIncidents.length === 0 && (
                            <div className="h-40 flex flex-col items-center justify-center text-slate-400 opacity-50">
                                <FileText size={40} className="mb-2" />
                                <p className="text-sm font-bold uppercase">Nenhum registro</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
