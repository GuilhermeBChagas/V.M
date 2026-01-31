import React, { useState, useEffect } from 'react';
import { Announcement, User, UserRole } from '../types';
import { announcementService } from '../services/announcementService';
import { Plus, Trash2, Megaphone, Info, AlertCircle, Flame, Users, User as UserIcon, Globe } from 'lucide-react';

interface AnnouncementManagerProps {
    currentUser: User;
    users: User[];
    onAnnouncementCreated?: () => void;
}

const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({ currentUser, users, onAnnouncementCreated }) => {
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestão do Mural</h2>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Envie avisos para toda a equipe ou indivíduos</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                >
                    <Plus size={18} /> Novo Aviso
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl animate-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título do Aviso</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                    placeholder="Ex: Manutenção no Servidor"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prioridade</label>
                                <div className="flex gap-2">
                                    {(['INFO', 'IMPORTANT', 'URGENT'] as const).map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, priority: p })}
                                            className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${formData.priority === p
                                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Conteúdo</label>
                            <textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-600 min-h-[120px]"
                                placeholder="Descreva o recado detalhadamente..."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Destinatário</label>
                                <select
                                    value={formData.targetType}
                                    onChange={e => setFormData({ ...formData, targetType: e.target.value as any, targetId: '' })}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                >
                                    <option value="BROADCAST">Todos (Broadcast)</option>
                                    <option value="USER">Usuário Específico</option>
                                    <option value="GROUP">Departamento / Grupo</option>
                                </select>
                            </div>

                            {formData.targetType === 'USER' && (
                                <div className="space-y-2 animate-in fade-in zoom-in-95">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Selecionar Usuário</label>
                                    <select
                                        value={formData.targetId}
                                        onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
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
                                <div className="space-y-2 animate-in fade-in zoom-in-95">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Selecionar Role (Grupo)</label>
                                    <select
                                        value={formData.targetId}
                                        onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                        required
                                    >
                                        <option value="">Selecione a Role...</option>
                                        {Object.values(UserRole).map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Expira em (Opcional)</label>
                                <input
                                    type="datetime-local"
                                    value={formData.expiresAt}
                                    onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-8 py-3 bg-white border border-slate-200 rounded-xl text-slate-500 font-black text-xs uppercase hover:bg-slate-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                            >
                                Publicar Agora
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Listagem de Recados (Estilo Mini) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {announcements.map(ann => (
                    <div key={ann.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-all">
                        <div className={`p-3 rounded-2xl ${ann.priority === 'URGENT' ? 'bg-red-50 text-red-600' :
                            ann.priority === 'IMPORTANT' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                            {ann.targetType === 'BROADCAST' ? <Globe size={24} /> : ann.targetType === 'USER' ? <UserIcon size={24} /> : <Users size={24} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-slate-800 truncate uppercase text-sm">{ann.title}</h4>
                                <div className="flex gap-1">
                                    <button className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-1">{ann.content}</p>
                            <div className="flex items-center gap-3 mt-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <span className="flex items-center gap-1"><Megaphone size={10} /> {ann.targetType}</span>
                                <span>•</span>
                                <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnnouncementManager;
