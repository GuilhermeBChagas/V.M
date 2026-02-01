import React, { useState, useEffect, useRef } from 'react';
import { Incident, Building, User, AlterationType } from '../types';
import { Save, X, Clock, MapPin, FileText, Loader2, Search, Users, Navigation, Check, AlertTriangle, Plus, UserPlus, UserMinus, Calendar, ChevronDown, Send, Camera, ImagePlus, Trash2, Zap } from 'lucide-react';
import { normalizeString } from '../utils/stringUtils';

interface IncidentFormProps {
    user: User;
    users: User[];
    buildings: Building[];
    alterationTypes: AlterationType[];
    nextRaCode: string;
    onSave: (incident: Incident) => void;
    onCancel: () => void;
    initialData?: Incident | null;
    isLoading?: boolean;
    preSelectedBuildingId?: string;
}

export const IncidentForm: React.FC<IncidentFormProps> = ({
    user,
    users,
    buildings,
    alterationTypes,
    nextRaCode,
    onSave,
    onCancel,
    initialData,
    isLoading,
    preSelectedBuildingId
}) => {
    // Form State
    const [buildingId, setBuildingId] = useState('');
    const [vigilantsList, setVigilantsList] = useState<string[]>([]);
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [alterationType, setAlterationType] = useState('');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);

    // Validation State
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [timeError, setTimeError] = useState<string>('');

    // Building Search State
    const [buildingSearch, setBuildingSearch] = useState('');
    const [isBuildingDropdownOpen, setIsBuildingDropdownOpen] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const buildingContainerRef = useRef<HTMLDivElement>(null);

    // Vigilant Search State
    const [vigilantSearch, setVigilantSearch] = useState('');
    const [isVigilantDropdownOpen, setIsVigilantDropdownOpen] = useState(false);
    const vigilantContainerRef = useRef<HTMLDivElement>(null);





    useEffect(() => {
        if (initialData) {
            setBuildingId(initialData.buildingId);
            const b = buildings.find(x => x.id === initialData.buildingId);
            if (b) setBuildingSearch(b.name);

            setVigilantsList(initialData.vigilants.split(', ').filter(v => v.trim() !== ''));
            setDate(initialData.date);
            setStartTime(initialData.startTime);
            setEndTime(initialData.endTime);
            setAlterationType(initialData.alterationType);
            setDescription(initialData.description);
            setPhotos(initialData.photos || []);
        } else {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            setDate(`${year}-${month}-${day}`);
            setStartTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
            setEndTime('');
            setVigilantsList([user.name]);

            if (preSelectedBuildingId) {
                setBuildingId(preSelectedBuildingId);
                const b = buildings.find(x => x.id === preSelectedBuildingId);
                if (b) setBuildingSearch(b.name);
            }
            setAlterationType('');
            setDescription('');
            setPhotos([]);
        }
    }, [initialData, user, preSelectedBuildingId, buildings]);

    // Click Outside logic
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (buildingContainerRef.current && !buildingContainerRef.current.contains(event.target as Node)) {
                setIsBuildingDropdownOpen(false);
            }
            if (vigilantContainerRef.current && !vigilantContainerRef.current.contains(event.target as Node)) {
                setIsVigilantDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        var R = 6371;
        var dLat = (lat2 - lat1) * (Math.PI / 180);
        var dLon = (lon2 - lon1) * (Math.PI / 180);
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleLocateNearest = () => {
        if (!navigator.geolocation) return;
        const buildingsWithCoords = buildings.filter(b => b.latitude && b.longitude);
        if (buildingsWithCoords.length === 0) return;

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                let nearest: Building | null = null;
                let minDistance = Infinity;

                buildingsWithCoords.forEach(b => {
                    const bLat = parseFloat(b.latitude!.replace(',', '.'));
                    const bLng = parseFloat(b.longitude!.replace(',', '.'));
                    if (!isNaN(bLat) && !isNaN(bLng)) {
                        const dist = getDistanceFromLatLonInKm(userLat, userLng, bLat, bLng);
                        if (dist < minDistance) { minDistance = dist; nearest = b; }
                    }
                });

                if (nearest) {
                    setBuildingId(nearest.id);
                    setBuildingSearch(nearest.name);
                }
                setIsLocating(false);
                setIsBuildingDropdownOpen(false);
            },
            () => setIsLocating(false),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const filteredBuildings = buildings.filter(b =>
        normalizeString(b.name).includes(normalizeString(buildingSearch)) ||
        normalizeString(b.buildingNumber).includes(normalizeString(buildingSearch))
    );

    const filteredUsers = users.filter(u =>
        normalizeString(u.name).includes(normalizeString(vigilantSearch))
    );

    const handleAddVigilant = (name: string) => {
        if (!vigilantsList.includes(name)) {
            setVigilantsList([...vigilantsList, name]);
        }
        setVigilantSearch('');
        setIsVigilantDropdownOpen(false);
    };

    const handleRemoveVigilant = (name: string) => {
        setVigilantsList(vigilantsList.filter(v => v !== name));
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);

        if (value.length >= 3) {
            value = value.slice(0, 2) + ':' + value.slice(2);
        }

        setter(value);
    };

    // --- Image Handling ---

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const remainingSlots = 5 - photos.length;
        if (remainingSlots <= 0) {
            alert("Você já atingiu o limite de 5 fotos.");
            return;
        }

        // Explicitly cast FileList to File[] and slice to limit to 5 total
        (Array.from(files) as File[]).slice(0, remainingSlots).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotos(prev => {
                    if (prev.length >= 5) return prev;
                    return [...prev, reader.result as string];
                });
            };
            reader.readAsDataURL(file);
        });
    };



    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    // Limpar erros quando campos são preenchidos
    const clearErrors = () => {
        setValidationErrors([]);
        setTimeError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Limpar erros anteriores
        setValidationErrors([]);
        setTimeError('');

        // Validação de campos obrigatórios
        const errors: string[] = [];

        if (!buildingId) {
            errors.push("Próprio (Local)");
        }
        if (vigilantsList.length === 0) {
            errors.push("Vigilantes (adicione pelo menos um)");
        }
        if (!alterationType) {
            errors.push("Tipo de Alteração");
        }
        if (!date) {
            errors.push("Data");
        }
        if (!startTime) {
            errors.push("Hora Inicial");
        }
        if (!endTime) {
            errors.push("Hora Final");
        }
        if (!description || description.trim() === '') {
            errors.push("Relato da Alteração");
        }

        // Se houver campos não preenchidos, exibir na interface
        if (errors.length > 0) {
            setValidationErrors(errors);
            // Scroll para o topo do formulário para ver o erro
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Validação de Tempo: Hora Final deve ser MAIOR que Hora Inicial
        // Formato HH:MM permite comparação direta de string
        if (endTime <= startTime) {
            setTimeError(`A Hora Final (${endTime}) deve ser maior que a Hora Inicial (${startTime}).`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const incident: Incident = {
            id: initialData?.id || Date.now().toString(),
            raCode: initialData?.raCode || nextRaCode,
            buildingId,
            userId: user.id,
            operatorName: user.name,
            vigilants: vigilantsList.join(', '),
            date,
            startTime,
            endTime,
            alterationType,
            description,
            status: initialData?.status || 'PENDING',
            timestamp: initialData?.timestamp || new Date().toISOString(),
            photos: photos,
            aiAnalysis: initialData?.aiAnalysis,
            severity: initialData?.severity
        };
        onSave(incident);
    };

    const currentRa = initialData?.raCode || nextRaCode;

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all animate-in zoom-in-95 duration-300 mb-20">

            {/* HEADER MODERNO */}
            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
                            {initialData ? 'EDITAR R.A' : 'NOVO R.A'}
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">PREENCHA TODOS OS CAMPOS (EXCETO FOTOS)</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border-2 border-blue-600 px-4 py-2 rounded-xl flex flex-col items-center justify-center min-w-[120px] shadow-sm">
                    <span className="text-xs font-black text-blue-600 uppercase tracking-widest leading-none mb-1">CÓDIGO R.A</span>
                    <span className="text-lg font-black text-slate-800 dark:text-white leading-none">{currentRa}</span>
                </div>
            </div>

            {/* ALERTAS DE VALIDAÇÃO */}
            {validationErrors.length > 0 && (
                <div className="mx-8 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl flex-shrink-0">
                            <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wide mb-2">Campos obrigatórios não preenchidos</h4>
                            <ul className="space-y-1">
                                {validationErrors.map((error, index) => (
                                    <li key={index} className="text-xs font-semibold text-red-600 dark:text-red-300 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                        {error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            type="button"
                            onClick={clearErrors}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                        >
                            <X size={16} className="text-red-500" />
                        </button>
                    </div>
                </div>
            )}

            {timeError && (
                <div className="mx-8 mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex-shrink-0">
                            <Clock className="text-amber-600 dark:text-amber-400" size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">Erro de Horário</h4>
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">{timeError}</p>
                        </div>
                        <button
                            type="button"
                            onClick={clearErrors}
                            className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
                        >
                            <X size={16} className="text-amber-500" />
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-8 space-y-8">

                {/* LINHA 1: PRÓPRIO E VIGILANTES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* PRÓPRIO */}
                    <div className="space-y-2" ref={buildingContainerRef}>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">PRÓPRIO</label>
                        <div className="relative flex gap-2">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="PESQUISAR PRÉDIO"
                                    value={buildingSearch}
                                    onChange={(e) => {
                                        setBuildingSearch(e.target.value);
                                        setIsBuildingDropdownOpen(true);
                                        if (buildingId) setBuildingId('');
                                    }}
                                    onFocus={() => setIsBuildingDropdownOpen(true)}
                                    className={`w-full pl-10 pr-10 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl text-sm font-semibold outline-none transition-all ${buildingId ? 'border-emerald-500 focus:border-emerald-600 bg-emerald-50/30' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'}`}
                                />
                                {buildingSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBuildingSearch('');
                                            setBuildingId('');
                                            if (buildingContainerRef.current) {
                                                const input = buildingContainerRef.current.querySelector('input');
                                                input?.focus();
                                            }
                                        }}
                                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={handleLocateNearest}
                                disabled={isLocating}
                                className="p-3.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-2 border-blue-100 dark:border-blue-800 rounded-2xl hover:bg-blue-100 transition-colors flex-shrink-0 active:scale-95"
                            >
                                {isLocating ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>

                            {isBuildingDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto animate-in slide-in-from-top-2">
                                    {filteredBuildings.map(b => (
                                        <button
                                            key={b.id}
                                            type="button"
                                            onClick={() => {
                                                setBuildingId(b.id);
                                                setBuildingSearch(b.name);
                                                setIsBuildingDropdownOpen(false);
                                            }}
                                            className="w-full p-4 flex items-center gap-3 text-left hover:bg-blue-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors group"
                                        >
                                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                {b.buildingNumber}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase truncate">{b.name}</p>
                                                <p className="text-xs text-slate-500 uppercase truncate">{b.address}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* VIGILANTES */}
                    <div className="space-y-2" ref={vigilantContainerRef}>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">VIGILANTES</label>
                        <div className="relative">
                            <div className="relative group">
                                <Search className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="BUSCAR VIGILANTE"
                                    value={vigilantSearch}
                                    onChange={(e) => {
                                        setVigilantSearch(e.target.value);
                                        setIsVigilantDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsVigilantDropdownOpen(true)}
                                    className="w-full pl-10 pr-10 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-none focus:border-blue-500 transition-all"
                                />
                                {vigilantSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setVigilantSearch('');
                                            setIsVigilantDropdownOpen(false);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                            {isVigilantDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto animate-in slide-in-from-top-2">
                                    {filteredUsers.map(u => {
                                        const isAlreadyAdded = vigilantsList.includes(u.name);
                                        return (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => isAlreadyAdded ? handleRemoveVigilant(u.name) : handleAddVigilant(u.name)}
                                                className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors group"
                                            >
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black uppercase transition-all ${isAlreadyAdded ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                                    {isAlreadyAdded ? <Check size={16} /> : u.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-black uppercase truncate leading-none ${isAlreadyAdded ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'}`}>{u.name}</p>
                                                    <p className="text-xs font-bold text-slate-400 uppercase mt-1">Matrícula: {u.matricula}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3 min-h-[40px]">
                            {vigilantsList.map(v => (
                                <div key={v} className="inline-flex items-center gap-2 pl-1 pr-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-black uppercase">{v.charAt(0)}</div>
                                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{v}</span>
                                    <button type="button" onClick={() => handleRemoveVigilant(v)} className="p-1 hover:text-red-500 text-slate-400"><X size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* NATUREZA E REGISTRO DE TEMPO */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    <div className="md:col-span-4 space-y-2">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 whitespace-nowrap">TIPO DE ALTERAÇÃO</label>
                        <div className="relative">
                            <select
                                value={alterationType}
                                onChange={e => setAlterationType(e.target.value)}
                                required
                                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-none focus:border-blue-500 transition-all appearance-none pr-10"
                            >
                                <option value="">SELECIONE O TIPO</option>
                                {alterationTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>

                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">DATA</label>
                            <div className="relative">
                                <Calendar className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                                <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full pl-11 p-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-blue-500 transition-all" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">HORA INICIAL</label>
                            <div className="relative">
                                <Clock className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={5}
                                    placeholder="HH:MM"
                                    required
                                    value={startTime}
                                    onChange={e => handleTimeChange(e, setStartTime)}
                                    className="w-full pl-11 p-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">HORA FINAL</label>
                            <div className="relative">
                                <Clock className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={5}
                                    placeholder="HH:MM"
                                    required
                                    value={endTime}
                                    onChange={e => handleTimeChange(e, setEndTime)}
                                    className="w-full pl-11 p-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RELATO DA ALTERAÇÃO */}
                {/* RELATO DA ALTERAÇÃO */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">RELATO DA ALTERAÇÃO</label>
                        <span className={`text-[10px] font-bold ${description.length >= 2000 ? 'text-red-500' : 'text-slate-400'}`}>{description.length}/2000</span>
                    </div>
                    <textarea
                        required
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        maxLength={2000}
                        rows={6}
                        className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-3xl text-sm font-medium outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                        placeholder="Descreva a alteração"
                    />
                </div>

                {/* ANEXOS E FOTOS */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">EVIDÊNCIAS FOTOGRÁFICAS</label>
                            <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Máximo de 5 imagens ({photos.length}/5) - Opcional</span>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                disabled={photos.length >= 5}
                                onClick={() => document.getElementById('file-upload')?.click()}
                                className="flex-1 sm:flex-none px-4 py-3 bg-white dark:bg-slate-800 border-2 border-blue-100 dark:border-slate-700 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ImagePlus size={16} /> Adicionar Foto
                            </button>
                            <button
                                type="button"
                                disabled={photos.length >= 5}
                                onClick={() => document.getElementById('camera-input')?.click()}
                                className="flex-1 sm:flex-none px-4 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Camera size={16} /> Abrir Câmera
                            </button>
                            <input id="file-upload" type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" disabled={photos.length >= 5} />
                            <input id="camera-input" type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" disabled={photos.length >= 5} />
                        </div>
                    </div>

                    {/* Preview Grid */}
                    {photos.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                            {photos.map((photo, index) => (
                                <div key={index} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-white dark:border-slate-700 shadow-md">
                                    <img src={photo} className="w-full h-full object-cover" alt={`Evidence ${index}`} />
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(index)}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 py-1 text-center">
                                        <span className="text-xs font-black text-white uppercase tracking-widest">FOTO {index + 1}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex flex-col-reverse sm:flex-row justify-end items-center gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={onCancel} className="w-full sm:w-auto py-4 px-8 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all active:scale-95">CANCELAR</button>
                    <button type="submit" disabled={isLoading} className="w-full sm:w-auto py-4 px-10 bg-blue-900 dark:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase shadow-xl shadow-blue-900/20 hover:bg-blue-800 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70">
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                        {initialData ? 'SALVAR ALTERAÇÕES' : 'FINALIZAR REGISTRO'}
                    </button>
                </div>
            </form>


        </div>
    );
};