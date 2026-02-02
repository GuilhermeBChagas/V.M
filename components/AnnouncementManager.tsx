import React, { useState, useEffect } from 'react';
import { Announcement, User, UserRole } from '../types';
import { announcementService } from '../services/announcementService';
import { Plus, Trash2, Megaphone, Info, AlertCircle, Flame, Users, User as UserIcon, Globe, X, Search, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AnnouncementManagerProps {
    currentUser: User;
    users: User[];
    onAnnouncementCreated?: () => void;
    onDelete?: (id: string) => void;
    canManage?: boolean;
}

const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({ currentUser, users, onAnnouncementCreated, canManage }) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        targetType: 'BROADCAST' as 'USER' | 'GROUP' | 'BROADCAST',
        targetId: '',
        priority: 'INFO' as 'INFO' | 'IMPORTANT' | 'URGENT',
        expiresAt: ''
    });

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        setLoading(true);
        // Busca recados ativos (Broadcast, para o usuário ou para o grupo/role dele)
        const data = await announcementService.getActiveAnnouncements(currentUser.id, currentUser.role);
        setAnnouncements(data);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.content) return;
        if ((formData.targetType === 'USER' || formData.targetType === 'GROUP') && !formData.targetId) return;

        const newAnn = await announcementService.createAnnouncement({
            title: formData.title,
            content: formData.content,
            senderId: currentUser.id,
            targetType: formData.targetType,
            targetId: formData.targetId || undefined,
            priority: formData.priority,
            expiresAt: formData.expiresAt || undefined
        });

        if (newAnn) {
            setShowForm(false);
            setFormData({
                title: '',
                content: '',
                targetType: 'BROADCAST',
                targetId: '',
                priority: 'INFO',
                expiresAt: ''
            });
            loadAnnouncements();
            if (onAnnouncementCreated) onAnnouncementCreated();
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Deseja excluir este aviso?')) return;

        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (!error) {
            loadAnnouncements();
            if (onAnnouncementCreated) onAnnouncementCreated();
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Unified Header Section */}
            <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                {/* Title Row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                            <Megaphone size={22} strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
                                {canManage ? 'Gestão do Mural' : 'Mural de Avisos'}
                            </h2>
                            <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {canManage ? 'Envie avisos para toda a equipe ou indivíduos' : 'Fique por dentro das últimas atualizações'}
                            </p>
                        </div>
                    </div>

                    {canManage && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-95 transition-all duration-200"
                        >
                            {showForm ? <X size={16} /> : <Plus size={16} strokeWidth={3} />}
                            <span>{showForm ? 'FECHAR MURAL' : 'NOVO AVISO'}</span>
                        </button>
                    )}
                </div>
            </div>

            {showForm && (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-12 border border-slate-100 dark:border-slate-700 shadow-2xl animate-in slide-in-from-top-6 duration-500">
                    <form onSubmit={handleCreate} className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Título do Aviso</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all"
                                    placeholder="Ex: Manutenção no Servidor"
                                    required
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Prioridade</label>
                                <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-900/50 rounded-[1.25rem] border border-slate-100 dark:border-slate-700">
                                    {(['INFO', 'IMPORTANT', 'URGENT'] as const).map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, priority: p })}
                                            className={`flex-1 py-3 px-2 rounded-2xl text-xs font-black uppercase transition-all ${formData.priority === p
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            {p === 'INFO' ? 'Informativo' : p === 'IMPORTANT' ? 'Importante' : 'Urgente'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Conteúdo</label>
                            <textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                className="w-full p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-600 dark:text-slate-300 min-h-[160px] transition-all"
                                placeholder="Descreva o recado detalhadamente..."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Destinatário</label>
                                <div className="relative">
                                    <select
                                        value={formData.targetType}
                                        onChange={e => setFormData({ ...formData, targetType: e.target.value as any, targetId: '' })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <option value="BROADCAST">Todos (Mural Público)</option>
                                        <option value="USER">Usuário Específico</option>
                                        <option value="GROUP">Departamento / Cargo</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <Users size={18} />
                                    </div>
                                </div>
                            </div>

                            {formData.targetType === 'USER' && (
                                <div className="space-y-3 animate-in fade-in zoom-in-95 relative">
                                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Selecionar Usuário</label>
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                        <input
                                            type="text"
                                            value={userSearchTerm}
                                            onChange={e => {
                                                setUserSearchTerm(e.target.value);
                                                setIsUserDropdownOpen(true);
                                                if (formData.targetId) setFormData({ ...formData, targetId: '' });
                                            }}
                                            onFocus={() => setIsUserDropdownOpen(true)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 uppercase"
                                            placeholder="Buscar pelo nome..."
                                        />
                                        {formData.targetId && (
                                            <div className="absolute right-4 top-4 text-xs font-black text-emerald-500 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                                                <CheckCircle2 size={12} /> Selecionado
                                            </div>
                                        )}
                                    </div>

                                    {isUserDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto animate-in slide-in-from-top-2">
                                            {users.filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase())).length === 0 ? (
                                                <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase">Nenhum usuário encontrado</div>
                                            ) : (
                                                users.filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase())).map(u => (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, targetId: u.id });
                                                            setUserSearchTerm(u.name);
                                                            setIsUserDropdownOpen(false);
                                                        }}
                                                        className="w-full p-3 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors group"
                                                    >
                                                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                            {u.name.charAt(0)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase truncate">{u.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Matrícula: {u.matricula}</p>
                                                        </div>
                                                        {formData.targetId === u.id && <CheckCircle2 size={16} className="text-emerald-500" />}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {formData.targetType === 'GROUP' && (
                                <div className="space-y-3 animate-in fade-in zoom-in-95">
                                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Selecionar Grupo</label>
                                    <div className="relative">
                                        <select
                                            value={formData.targetId}
                                            onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                            required
                                        >
                                            <option value="">Selecione o Cargo...</option>
                                            {Object.values(UserRole).map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <Users size={18} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Expira em (Opcional)</label>
                                <input
                                    type="datetime-local"
                                    value={formData.expiresAt}
                                    onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-slate-100 dark:border-slate-700/50">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-8 py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 font-black text-xs uppercase hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-12 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/25 active:scale-95"
                            >
                                Publicar Agora
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {announcements.map(ann => (
                    <div
                        key={ann.id}
                        className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-start gap-6 hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all group relative overflow-hidden"
                    >
                        <div className={`p-4 rounded-2xl flex-shrink-0 ${ann.priority === 'URGENT' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                            ann.priority === 'IMPORTANT' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            }`}>
                            {ann.targetType === 'BROADCAST' ? <Globe size={28} /> : ann.targetType === 'USER' ? <UserIcon size={28} /> : <Users size={28} />}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase text-lg leading-tight truncate pr-8">{ann.title}</h4>
                                {canManage && (
                                    <button
                                        onClick={(e) => handleDelete(ann.id, e)}
                                        className="absolute top-8 right-8 p-2 text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                        title="Excluir"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 font-medium leading-relaxed">
                                {ann.content}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px]">
                                    <Megaphone size={12} /> {ann.targetType === 'BROADCAST' ? 'Público' : ann.targetType === 'USER' ? 'Individual' : 'Grupo'}
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <span className="flex items-center gap-1.5">
                                    {new Date(ann.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {announcements.length === 0 && !loading && (
                    <div className="lg:col-span-2 h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem]">
                        <Megaphone size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest">Nenhum aviso publicado</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default AnnouncementManager;
