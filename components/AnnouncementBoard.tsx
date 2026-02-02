import React, { useState, useEffect } from 'react';
import { Announcement, User } from '../types';
import { announcementService } from '../services/announcementService';
import AnnouncementCard from './AnnouncementCard';
import { Megaphone, X, ExternalLink, ChevronRight } from 'lucide-react';

interface AnnouncementBoardProps {
    currentUser: User;
    onViewAll?: () => void;
    onUnreadChange?: () => void;
}

const AnnouncementBoard: React.FC<AnnouncementBoardProps> = ({ currentUser, onViewAll, onUnreadChange }) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

    useEffect(() => {
        loadAnnouncements();
    }, [currentUser.id]);

    const loadAnnouncements = async () => {
        setLoading(true);
        const data = await announcementService.getActiveAnnouncements(currentUser.id, currentUser.role);
        setAnnouncements(data);
        setLoading(false);
    };

    const handleRead = async (id: string) => {
        const ann = announcements.find(a => a.id === id);
        if (ann) {
            setSelectedAnnouncement(ann);
            if (!ann.isRead) {
                const success = await announcementService.markAsRead(id, currentUser.id);
                if (success) {
                    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
                    if (onUnreadChange) onUnreadChange();
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse">
                <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400 relative">
                        <Megaphone className="w-5 h-5" />
                        {announcements.some(a => !a.isRead) && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full shadow-sm animate-pulse" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">Mural Digital</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comunicados Oficiais</p>
                    </div>
                </div>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors group"
                    >
                        Ver todos <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                )}
            </div>

            {announcements.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12 border-2 border-dashed border-slate-100 dark:border-slate-700/50 rounded-2xl">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Nenhum comunicado ativo</p>
                </div>
            ) : (
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                    {announcements.slice(0, 5).map(ann => (
                        <AnnouncementCard
                            key={ann.id}
                            announcement={ann}
                            onRead={handleRead}
                        />
                    ))}
                </div>
            )}

            {/* Modal de Detalhe do Recado */}
            {selectedAnnouncement && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <div className={`h-2 shrink-0 ${selectedAnnouncement.priority === 'URGENT' ? 'bg-red-500' :
                            selectedAnnouncement.priority === 'IMPORTANT' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />

                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded ${selectedAnnouncement.priority === 'URGENT' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                        selectedAnnouncement.priority === 'IMPORTANT' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                        }`}>
                                        {selectedAnnouncement.priority === 'URGENT' ? 'Urgente' :
                                            selectedAnnouncement.priority === 'IMPORTANT' ? 'Importante' : 'Informativo'
                                        }
                                    </span>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2 leading-tight">{selectedAnnouncement.title}</h2>
                                </div>
                                <button
                                    onClick={() => setSelectedAnnouncement(null)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0"
                                >
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="prose prose-slate dark:prose-invert max-w-none mb-8 prose-sm md:prose-base">
                                <div dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }} />
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 border dark:border-slate-700">
                                        {selectedAnnouncement.senderName?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700 dark:text-slate-300 leading-none">{selectedAnnouncement.senderName}</p>
                                        <p className="text-xs mt-1 dark:text-slate-500">Remetente</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-700 dark:text-slate-300">
                                        {new Date(selectedAnnouncement.createdAt).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                    <p className="text-xs mt-1 dark:text-slate-500">Data da publicação</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t dark:border-slate-800 flex justify-end shrink-0">
                            <button
                                onClick={() => setSelectedAnnouncement(null)}
                                className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnouncementBoard;
