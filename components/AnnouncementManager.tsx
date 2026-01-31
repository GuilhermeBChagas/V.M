import React, { useState, useEffect } from 'react';
import { Announcement, User, UserRole } from '../types';
import { announcementService } from '../services/announcementService';
import { Plus, Trash2, Megaphone, Info, AlertCircle, Flame, Users, User as UserIcon, Globe, X } from 'lucide-react';
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                        {canManage ? 'Gestão do Mural' : 'Mural de Avisos'}
                    </h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        {canManage ? 'Envie avisos para toda a equipe ou indivíduos' : 'Fique por dentro das últimas atualizações'}
                    </p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="w-full md:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25 transition-all active:scale-95"
                    >
                        {showForm ? <X size={20} /> : <Plus size={20} />}
                        <span>{showForm ? 'Fechar Mural' : 'Novo Aviso'}</span>
                    </button>
                )}
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
                                            {p}
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
                                <select
                                    value={formData.targetType}
                                    onChange={e => setFormData({ ...formData, targetType: e.target.value as any, targetId: '' })}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all appearance-none"
                                >
                                    <option value="BROADCAST">Todos (Broadcast)</option>
                                    <option value="USER">Usuário Específico</option>
                                    <option value="GROUP">Departamento / Grupo</option>
                                </select>
                            </div>

                            {formData.targetType === 'USER' && (
                                <div className="space-y-3 animate-in fade-in zoom-in-95">
                                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Selecionar Usuário</label>
                                    <select
                                        value={formData.targetId}
                                        onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all"
                                        required
                                    >
                                        <option value="">Selecione o Usuário...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.matricula})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {formData.targetType === 'GROUP' && (
                                <div className="space-y-3 animate-in fade-in zoom-in-95">
                                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Selecionar Grupo</label>
                                    <select
                                        value={formData.targetId}
                                        onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all"
                                        required
                                    >
                                        <option value="">Selecione a Role...</option>
                                        {Object.values(UserRole).map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
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
                                    <Megaphone size={12} /> {ann.targetType}
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
