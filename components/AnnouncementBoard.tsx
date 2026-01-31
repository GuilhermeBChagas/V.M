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
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Megaphone className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Mural de Avisos</h3>
                </div>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold flex items-center gap-1 hover:underline"
                    >
                        Ver todos <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>

            {announcements.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10">
                    <Megaphone className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">Nenhum aviso no momento.</p>
                </div>
            ) : (
                <div className="space-y-4">
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
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
                        <div className={`h-2 ${selectedAnnouncement.priority === 'URGENT' ? 'bg-red-500' :
                            selectedAnnouncement.priority === 'IMPORTANT' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />

                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded ${selectedAnnouncement.priority === 'URGENT' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                        selectedAnnouncement.priority === 'IMPORTANT' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                        }`}>
                                        {selectedAnnouncement.priority}
                                    </span>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">{selectedAnnouncement.title}</h2>
                                </div>
                                <button
                                    onClick={() => setSelectedAnnouncement(null)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="prose prose-slate dark:prose-invert max-w-none mb-8">
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap font-medium">
                                    {selectedAnnouncement.content}
                                </p>
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

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t dark:border-slate-800 flex justify-end">
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
