
import React, { useState, useEffect } from 'react';
import { Building, Sector } from '../types';
import { Save, X, Key, Bell, Trash2, MapPin, Loader2 } from 'lucide-react';

interface BuildingFormProps {
    initialData?: Building | null;
    sectors: Sector[];
    onSave: (building: Building) => void;
    onCancel: () => void;
    onDelete?: (id: string) => void;
    isLoading?: boolean;
}

export const BuildingForm: React.FC<BuildingFormProps> = ({ initialData, sectors, onSave, onCancel, onDelete, isLoading }) => {
    const [formData, setFormData] = useState<Building>({
        id: '',
        buildingNumber: '',
        name: '',
        address: '',
        sectorId: sectors[0]?.id || '',
        hasKey: false,
        hasAlarm: false,
        managerName: '',
        managerPhone: '',
        managerEmail: '',
        latitude: '',
        longitude: ''
    });

    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData(prev => ({
                ...prev,
                id: '',
                sectorId: sectors[0]?.id || ''
            }));
        }
    }, [initialData, sectors]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleCaptureLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocalização não suportada neste navegador.");
            return;
        }

        setIsLoadingLocation(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude.toString(),
                    longitude: position.coords.longitude.toString()
                }));
                setIsLoadingLocation(false);
            },
            (error) => {
                console.error(error);
                alert("Erro ao obter localização. Verifique as permissões.");
                setIsLoadingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: formData.buildingNumber || Date.now().toString()
        });
    };

    const handleDelete = () => {
        if (initialData && onDelete) {
            onDelete(initialData.id);
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase">
                    {initialData ? 'Editar Prédio' : 'Novo Prédio'}
                </h2>
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Identificação Oficinal</h3>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-widest">Nº do Prédio</label>
                        <input name="buildingNumber" value={formData.buildingNumber} onChange={handleChange} required className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3.5 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Ex: 101" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-widest">Nome da Unidade</label>
                        <input name="name" value={formData.name} onChange={handleChange} required className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3.5 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-widest">Endereço Completo</label>
                        <input name="address" value={formData.address} onChange={handleChange} required className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3.5 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-widest">Setor</label>
                        <select name="sectorId" value={formData.sectorId} onChange={handleChange} className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3.5 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none uppercase">
                            {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <MapPin size={14} /> Geolocalização (Opcional)
                            </h3>
                            <button
                                type="button"
                                onClick={handleCaptureLocation}
                                disabled={isLoadingLocation}
                                className="text-xs font-black uppercase text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                            >
                                {isLoadingLocation ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                                Capturar Minha Posição
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-widest">Latitude</label>
                                <input name="latitude" value={formData.latitude || ''} onChange={handleChange} className="block w-full rounded-lg border-slate-300 dark:border-slate-600 border p-2.5 bg-slate-50 dark:bg-slate-800/50 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono font-bold" placeholder="-23.000000" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-widest">Longitude</label>
                                <input name="longitude" value={formData.longitude || ''} onChange={handleChange} className="block w-full rounded-lg border-slate-300 dark:border-slate-600 border p-2.5 bg-slate-50 dark:bg-slate-800/50 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono font-bold" placeholder="-51.000000" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 py-2 mt-2 md:col-span-2">
                        <label className={`inline-flex items-center cursor-pointer p-4 rounded-xl border transition-all ${formData.hasKey ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                            <input type="checkbox" name="hasKey" checked={formData.hasKey} onChange={handleChange} className="h-5 w-5 text-amber-600 rounded border-slate-300 dark:border-slate-600" />
                            <span className="ml-3 text-sm font-black uppercase text-amber-900 dark:text-amber-500"><Key className="inline w-4 h-4 mr-1" /> Chave</span>
                        </label>
                        <label className={`inline-flex items-center cursor-pointer p-4 rounded-xl border transition-all ${formData.hasAlarm ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                            <input type="checkbox" name="hasAlarm" checked={formData.hasAlarm} onChange={handleChange} className="h-5 w-5 text-red-600 rounded border-slate-300 dark:border-slate-600" />
                            <span className="ml-3 text-sm font-black uppercase text-red-900 dark:text-red-500"><Bell className="inline w-4 h-4 mr-1" /> Alarme</span>
                        </label>
                    </div>

                    <div className="md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Responsável (Opcional)</h3>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-widest">Nome do Responsável</label>
                        <input name="managerName" value={formData.managerName} onChange={handleChange} className="block w-full rounded-xl border-slate-300 dark:border-slate-600 border p-3.5 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-widest">Telefone</label>
                        <input name="managerPhone" value={formData.managerPhone} onChange={handleChange} className="block w-full rounded-xl border-slate-300 dark:border-slate-600 border p-3.5 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="(00) 00000-0000" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-widest">E-mail</label>
                        <input name="managerEmail" type="email" value={formData.managerEmail} onChange={handleChange} className="block w-full rounded-xl border-slate-300 dark:border-slate-600 border p-3.5 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <div className="w-full sm:w-auto">
                        {initialData && onDelete && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isLoading}
                                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-3 border border-red-200 dark:border-red-800 text-sm font-medium rounded-lg text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors uppercase disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir Prédio
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                        <button type="button" onClick={onCancel} className="w-full sm:w-auto py-3 px-6 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">CANCELAR</button>
                        <button type="submit" disabled={isLoading} className="w-full sm:w-auto inline-flex justify-center py-3 px-8 border border-transparent shadow-lg text-[11px] font-black rounded-xl text-white bg-blue-900 dark:bg-blue-700 hover:bg-blue-800 dark:hover:bg-blue-600 transition-all active:scale-95 uppercase disabled:opacity-70 disabled:cursor-not-allowed">
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {initialData ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR PRÉDIO'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};
