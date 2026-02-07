import React, { useState, useEffect } from 'react';
import { Announcement, User, UserRole, JobTitle } from '../types';
import { announcementService } from '../services/announcementService';
import { Plus, Trash2, Megaphone, CheckCircle2, Users, Search, X, PieChart, BarChart2, Calendar, Filter, Download, Send, Eye, Clock, AlertTriangle, FileText, Briefcase, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { RichTextEditor } from './RichTextEditor';

interface AnnouncementManagerProps {
    currentUser: User;
    users: User[];
    jobTitles?: JobTitle[];
    onAnnouncementCreated?: () => void;
    onDelete?: (id: string) => void;
    canManage?: boolean;
    onShowConfirm?: (title: string, message: string, onConfirm: () => void) => void;
    onBack?: () => void;
}

const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({ currentUser, users, jobTitles = [], onAnnouncementCreated, canManage, onShowConfirm, onBack }) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'LIST' | 'FORM' | 'REPORT'>('LIST');
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [selectedForReading, setSelectedForReading] = useState<Announcement | null>(null);
    const [readingReport, setReadingReport] = useState<{ userId: string, readAt: string | null, userName: string, role: string, jobTitleId?: string }[]>([]);
    const [loadingReport, setLoadingReport] = useState(false);

    const handleCardClick = (ann: Announcement) => {
        if (canManage) {
            openReport(ann);
        } else {
            setSelectedForReading(ann);
            markAsRead(ann);
        }
    };

    const markAsRead = async (ann: Announcement) => {
        if (ann.isRead) return;
        const success = await announcementService.markAsRead(ann.id, currentUser.id);
        if (success) {
            setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, isRead: true } : a));
            if (onAnnouncementCreated) onAnnouncementCreated();
        }
    };

    // Form State
    const [formData, setFormData] = useState<{
        title: string;
        content: string;
        targetType: 'BROADCAST' | 'SELECTION'; // Internal UI Type
        selectedGroups: string[];
        selectedJobTitles: string[];
        selectedUsers: string[];
        priority: 'INFO' | 'IMPORTANT' | 'URGENT';
        expiresAt: string;
        requestConfirmation: boolean;
    }>({
        title: '',
        content: '',
        targetType: 'BROADCAST',
        selectedGroups: [],
        selectedJobTitles: [],
        selectedUsers: [],
        priority: 'INFO',
        expiresAt: '',
        requestConfirmation: false
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [userSearchTerm, setUserSearchTerm] = useState('');

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        setLoading(true);
        const data = await announcementService.getActiveAnnouncements(currentUser.id, currentUser.role);
        setAnnouncements(data);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        const targetData = {
            type: formData.targetType === 'BROADCAST' ? 'BROADCAST' : 'SELECTION',
            groups: [],
            jobTitles: formData.targetType === 'SELECTION' ? formData.selectedJobTitles : [],
            users: formData.targetType === 'SELECTION' ? formData.selectedUsers : []
        };

        // Legacy fields for compatibility
        const legacyTargetType = formData.targetType === 'BROADCAST' ? 'BROADCAST' : 'GROUP';
        const legacyTargetId = '';

        const newAnn = await announcementService.createAnnouncement({
            title: formData.title,
            content: formData.content,
            senderId: currentUser.id,
            targetType: legacyTargetType as any,
            targetId: legacyTargetId,
            targetData: targetData as any,
            requestConfirmation: formData.requestConfirmation,
            priority: formData.priority,
            expiresAt: formData.expiresAt || undefined,
            attachments: []
        });

        if (newAnn) {
            setView('LIST');
            loadAnnouncements();
            if (onAnnouncementCreated) onAnnouncementCreated();
            setFormData({
                title: '', content: '', targetType: 'BROADCAST', selectedGroups: [], selectedJobTitles: [], selectedUsers: [], priority: 'INFO', expiresAt: '', requestConfirmation: false
            });
            setUserSearchTerm('');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        const doDelete = async () => {
            console.log('Iniciando exclusão do aviso:', id);
            try {
                const result = await announcementService.deleteAnnouncement(id);

                if (!result.success) {
                    console.error('Falha na exclusão do aviso:', result.error);
                    alert(`Erro ao excluir: ${result.error}\nVerifique se você tem permissões de Administrador no Supabase.`);
                } else {
                    console.log('Aviso excluído com sucesso!');
                    // Success!
                    setView('LIST');
                    setSelectedAnnouncement(null);
                    loadAnnouncements();
                    if (onAnnouncementCreated) onAnnouncementCreated(); // Update global count
                }
            } catch (err: any) {
                console.error('Erro inesperado durante a exclusão:', err);
                alert(`Erro inesperado: ${err.message}`);
            }
        };

        if (onShowConfirm) {
            onShowConfirm('Excluir Aviso', 'Tem certeza que deseja excluir este aviso permanentemente? Esta ação removerá também todo o histórico de leitura.', doDelete);
        } else {
            if (confirm('Tem certeza que deseja excluir este aviso permanentemente?')) {
                doDelete();
            }
        }
    };

    const openReport = async (ann: Announcement) => {
        setSelectedAnnouncement(ann);
        setView('REPORT');
        setLoadingReport(true);
        setReadingReport([]); // Limpa o estado anterior
        try {
            const report = await announcementService.getReadingReport(ann.id);
            setReadingReport(report as any);
        } catch (error) {
            console.error('Error fetching report:', error);
        } finally {
            setLoadingReport(false);
        }
    };

    // --- Sub-components (Render Helpers) ---

    const renderHeader = () => (
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                        <Megaphone size={22} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                            {canManage ? 'Gestão do Mural' : 'Mural de Avisos'}
                        </h2>
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            {canManage ? 'Gerencie comunicados e acompanhe leituras' : 'Fique por dentro das novidades'}
                        </p>
                    </div>
                </div>
                {canManage && view === 'LIST' && (
                    <button
                        onClick={() => setView('FORM')}
                        className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
                    >
                        <Plus size={16} strokeWidth={3} /> NOVO AVISO
                    </button>
                )}
            </div>
        </div>
    );

    const renderReadModal = () => {
        if (!selectedForReading) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                    <div className={`h-2 shrink-0 ${selectedForReading.priority === 'URGENT' ? 'bg-red-500' : selectedForReading.priority === 'IMPORTANT' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${selectedForReading.priority === 'URGENT' ? 'bg-red-100 text-red-700' : selectedForReading.priority === 'IMPORTANT' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {selectedForReading.priority === 'URGENT' ? 'Urgente' : selectedForReading.priority === 'IMPORTANT' ? 'Importante' : 'Informativo'}
                                </span>
                                <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 mt-3">{selectedForReading.title}</h2>
                            </div>
                            <button onClick={() => setSelectedForReading(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="prose prose-slate dark:prose-invert max-w-none prose-sm md:prose-base leading-relaxed text-slate-600 dark:text-slate-300">
                            <div dangerouslySetInnerHTML={{ __html: selectedForReading.content }} />
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button onClick={() => setSelectedForReading(null)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20">
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderListView = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar avisos..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {announcements
                    .filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(ann => (
                        <div
                            key={ann.id}
                            onClick={() => handleCardClick(ann)}
                            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group cursor-pointer"
                        >
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${ann.priority === 'URGENT' ? 'bg-red-500' : ann.priority === 'IMPORTANT' ? 'bg-amber-500' : 'bg-blue-500'
                                }`} />

                            <div className="flex justify-between items-start mb-4 pl-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-1">{ann.title}</h3>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(ann.createdAt).toLocaleDateString('pt-BR')}</span>
                                        {canManage ? (
                                            <span className="flex items-center gap-1"><Users size={12} />
                                                {ann.targetData?.type === 'BROADCAST' ? 'Todos' : `${ann.targetData?.groups.length} Grupos, ${ann.targetData?.users.length} Usuários, ${ann.targetData?.jobTitles?.length || 0} Cargos`}
                                            </span>
                                        ) : (
                                            <span className={`flex items-center gap-1 ${ann.isRead ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {ann.isRead ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                {ann.isRead ? 'Lido' : 'Não Lido'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pl-4 mb-6 prose dark:prose-invert prose-sm max-w-none line-clamp-2 text-slate-500">
                                <div dangerouslySetInnerHTML={{ __html: ann.content }} />
                            </div>

                            {canManage && (
                                <div className="pl-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Progresso de Leitura</span>
                                        <span onClick={(e) => { e.stopPropagation(); openReport(ann); }} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors">Ver Relatório <ArrowRightIcon className="inline w-3 h-3 ml-1" /></span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 w-1/3 rounded-full" />
                                    </div>
                                </div>
                            )}

                            {!canManage && !ann.isRead && (
                                <div className="pl-4 mt-4 pt-2">
                                    <span className="text-xs font-black text-indigo-600 uppercase tracking-wide flex items-center gap-1">Ler Comunicado <ArrowRightIcon className="inline w-3 h-3 ml-1" /></span>
                                </div>
                            )}
                        </div>
                    ))}
            </div>
        </div>
    );

    const renderReportView = () => {
        if (!selectedAnnouncement) return null;
        const total = readingReport.length;
        const read = readingReport.filter(r => r.readAt).length;
        const percentage = total > 0 ? Math.round((read / total) * 100) : 0;

        return (
            <div className="animate-in fade-in slide-in-from-right-8 space-y-6">
                {/* Announcement Info and Delete Action */}
                <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg shrink-0">
                            <Megaphone size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight line-clamp-1">{selectedAnnouncement.title}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Relatório de Leitura Detalhado</p>
                        </div>
                    </div>
                    <button
                        onClick={(e) => handleDelete(selectedAnnouncement.id, e as any)}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black uppercase transition-all active:scale-95 border border-red-100"
                    >
                        <Trash2 size={16} /> Excluir Aviso
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full"><Users size={24} /></div>
                        <div><p className="text-xs font-black text-slate-400 uppercase">Destinatários</p><p className="text-2xl font-black text-slate-800 dark:text-white">{total}</p></div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full"><CheckCircle2 size={24} /></div>
                        <div><p className="text-xs font-black text-slate-400 uppercase">Lidos</p><p className="text-2xl font-black text-emerald-600">{read}</p></div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full"><Clock size={24} /></div>
                        <div><p className="text-xs font-black text-slate-400 uppercase">Pendentes</p><p className="text-2xl font-black text-red-600">{total - read}</p></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 uppercase">Taxa de Leitura</h3>
                        <span className="text-2xl font-black text-indigo-600">{percentage}%</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${percentage}%` }} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                        <h3 className="font-black text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-[0.2em]">Detalhamento por Usuário</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse min-w-[300px]">
                            <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 border-b border-slate-100 dark:border-slate-800 backdrop-blur-md z-10">
                                <tr>
                                    <th className="px-4 md:px-6 py-4 font-black tracking-widest uppercase">Ponto / Usuário</th>
                                    <th className="px-4 md:px-6 py-4 font-black tracking-widest uppercase hidden sm:table-cell">Cargo / Função</th>
                                    <th className="px-4 md:px-6 py-4 font-black tracking-widest uppercase text-center">Status</th>
                                    <th className="px-4 md:px-6 py-4 font-black tracking-widest uppercase hidden md:table-cell text-right">Data Leitura</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {loadingReport ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando dados...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : readingReport.length > 0 ? readingReport.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-slate-700 dark:text-slate-200 text-xs md:text-sm leading-tight">{r.userName}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase sm:hidden tracking-wider">
                                                    {r.jobTitleId ? (jobTitles.find(j => j.id === r.jobTitleId)?.name || r.role) : r.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                                            <span className="text-[11px] font-bold uppercase tracking-tight">{r.jobTitleId ? (jobTitles.find(j => j.id === r.jobTitleId)?.name || r.role) : r.role}</span>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {r.readAt ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30">Lido</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30">Pendente</span>
                                                )}
                                                {r.readAt && <span className="md:hidden text-[8px] text-slate-400 font-mono font-bold">{new Date(r.readAt).toLocaleDateString('pt-BR')}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-[10px] hidden md:table-cell text-right font-bold">
                                            {r.readAt ? new Date(r.readAt).toLocaleString('pt-BR') : '-'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-xs">Nenhum registro de leitura encontrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const toggleUser = (userId: string) => {
        if (formData.selectedUsers.includes(userId)) {
            setFormData({ ...formData, selectedUsers: formData.selectedUsers.filter(id => id !== userId) });
        } else {
            setFormData({ ...formData, selectedUsers: [...formData.selectedUsers, userId] });
        }
    };

    const toggleJobTitle = (jobId: string) => {
        if (formData.selectedJobTitles.includes(jobId)) {
            setFormData({ ...formData, selectedJobTitles: formData.selectedJobTitles.filter(id => id !== jobId) });
        } else {
            setFormData({ ...formData, selectedJobTitles: [...formData.selectedJobTitles, jobId] });
        }
    };

    const renderFormView = () => (
        <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2rem] p-4 md:p-8 border border-slate-200 dark:border-slate-700 shadow-xl animate-in zoom-in-95">
            <form onSubmit={handleCreate} className="space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Título</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full p-3 md:p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm md:text-base"
                            placeholder="Ex: Atualização do Sistema"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
                        <div className="flex flex-wrap md:flex-nowrap bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                            {['INFO', 'IMPORTANT', 'URGENT'].map((p: any) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, priority: p })}
                                    className={`flex-1 py-2 md:py-3 rounded-lg text-[10px] md:text-xs font-black uppercase transition-all ${formData.priority === p ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {p === 'INFO' ? 'Info' : p === 'IMPORTANT' ? 'Importante' : 'Urgente'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Conteúdo</label>
                    <RichTextEditor
                        value={formData.content}
                        onChange={val => setFormData({ ...formData, content: val })}
                        placeholder="Escreva o conteúdo do aviso aqui... (Suporta formatação básica)"
                        className="min-h-[200px]"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Destinatários</label>

                        <div className="flex items-center gap-4 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="targetType"
                                    checked={formData.targetType === 'BROADCAST'}
                                    onChange={() => setFormData({ ...formData, targetType: 'BROADCAST' })}
                                    className="accent-indigo-600"
                                />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Todos (Mural Público)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="targetType"
                                    checked={formData.targetType === 'SELECTION'}
                                    onChange={() => setFormData({ ...formData, targetType: 'SELECTION' })}
                                    className="accent-indigo-600"
                                />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Selecionar Grupos/Usuários</span>
                            </label>
                        </div>

                        {formData.targetType === 'SELECTION' && (
                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <p className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <Briefcase size={14} /> Cargos e Funções
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {jobTitles.length > 0 ? jobTitles.map(job => (
                                            <label key={job.id} className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${formData.selectedJobTitles.includes(job.id)
                                                ? 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                                                }`}>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={formData.selectedJobTitles.includes(job.id)}
                                                    onChange={() => toggleJobTitle(job.id)}
                                                />
                                                {job.name}
                                            </label>
                                        )) : <p className="text-xs text-slate-400 italic">Nenhum cargo cadastrado.</p>}
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <p className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <Users size={14} /> Usuários Específicos
                                    </p>
                                    <div className="mb-3 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Buscar usuário..."
                                            value={userSearchTerm}
                                            onChange={e => setUserSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                                        {users.filter(u => {
                                            if (!userSearchTerm) return formData.selectedUsers.includes(u.id);
                                            return u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                                u.matricula.toLowerCase().includes(userSearchTerm.toLowerCase());
                                        }).slice(0, 50).map(user => (
                                            <label key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group">
                                                <span className={`text-xs font-bold ${formData.selectedUsers.includes(user.id) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                                    {user.name} <span className="text-[10px] text-slate-400 font-normal">({user.matricula})</span>
                                                </span>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${formData.selectedUsers.includes(user.id)
                                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                                    : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                                                    }`}>
                                                    {formData.selectedUsers.includes(user.id) && <Check size={10} strokeWidth={4} />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={formData.selectedUsers.includes(user.id)}
                                                    onChange={() => toggleUser(user.id)}
                                                />
                                            </label>
                                        ))}
                                        {!userSearchTerm && formData.selectedUsers.length === 0 && (
                                            <p className="text-center text-xs text-slate-400 py-4 italic">Digite acima para buscar usuários...</p>
                                        )}
                                    </div>
                                    {formData.selectedUsers.length > 0 && (
                                        <p className="mt-2 text-[10px] font-bold text-indigo-600 text-right">
                                            {formData.selectedUsers.length} usuários selecionados
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Validade (Opcional)</label>
                            <input
                                type="datetime-local"
                                value={formData.expiresAt}
                                onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200"
                            />
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <input
                                type="checkbox"
                                id="req-read"
                                checked={formData.requestConfirmation}
                                onChange={e => setFormData({ ...formData, requestConfirmation: e.target.checked })}
                                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="req-read" className="cursor-pointer">
                                <p className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase">Exigir Confirmação de Leitura</p>
                                <p className="text-xs text-indigo-600 dark:text-indigo-400">O usuário precisará clicar em um botão para confirmar.</p>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 gap-3">
                    <button type="button" onClick={() => setView('LIST')} className="px-8 py-3 bg-slate-100 text-slate-600 font-black uppercase text-xs rounded-xl hover:bg-slate-200">Cancelar</button>
                    <button type="submit" className="px-10 py-3 bg-indigo-600 text-white font-black uppercase text-xs rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-105 transition-all">Publicar Agora</button>
                </div>
            </form>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-10 max-w-7xl mx-auto">
            {(view !== 'LIST' || onBack) && (
                <div className="flex mb-2 px-1">
                    <button
                        onClick={() => {
                            if (view !== 'LIST') setView('LIST');
                            else if (onBack) onBack();
                        }}
                        className="btn-back"
                    >
                        <ArrowLeft size={18} />
                        <span>VOLTAR</span>
                    </button>
                </div>
            )}
            {renderHeader()}
            {view === 'LIST' && renderListView()}
            {view === 'FORM' && renderFormView()}
            {view === 'REPORT' && renderReportView()}
            {renderReadModal()}
        </div>
    );
};

const ArrowRightIcon = ({ className }: { className?: string }) => (
    <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
);

export default AnnouncementManager;
