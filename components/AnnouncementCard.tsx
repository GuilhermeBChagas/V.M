import React from 'react';
import { Announcement } from '../types';
import { AlertCircle, Info, Flame, CheckCircle2 } from 'lucide-react';

interface AnnouncementCardProps {
    announcement: Announcement;
    onRead: (id: string) => void;
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ announcement, onRead }) => {
    const isUrgent = announcement.priority === 'URGENT';
    const isImportant = announcement.priority === 'IMPORTANT';

    const getPriorityStyles = () => {
        switch (announcement.priority) {
            case 'URGENT':
                return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300';
            case 'IMPORTANT':
                return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300';
            default:
                return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300';
        }
    };

    const getPriorityIcon = () => {
        switch (announcement.priority) {
            case 'URGENT':
                return <Flame className="w-5 h-5 text-red-600 dark:text-red-400" />;
            case 'IMPORTANT':
                return <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
            default:
                return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
        }
    };

    return (
        <div
            className={`relative p-5 rounded-2xl border transition-all duration-300 group ${getPriorityStyles()} ${!announcement.isRead
                ? 'shadow-md translate-x-1 border-opacity-100'
                : 'opacity-75 grayscale-[10%] border-opacity-40 hover:opacity-100 hover:grayscale-0'
                } hover:shadow-lg cursor-pointer`}
            onClick={() => onRead(announcement.id)}
        >
            {!announcement.isRead && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 border-2 border-white dark:border-slate-800"></span>
                </span>
            )}

            <div className="flex items-start gap-4">
                <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/50 dark:bg-black/10 backdrop-blur-sm shadow-sm`}>
                    {getPriorityIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4">
                        <h4 className={`text-sm font-black uppercase tracking-tight leading-tight mb-1 truncate ${announcement.isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {announcement.title}
                        </h4>
                        {announcement.isRead && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        )}
                    </div>
                    <p className={`text-xs line-clamp-2 leading-relaxed mb-3 ${announcement.isRead ? 'text-slate-500 dark:text-slate-500 font-medium' : 'text-slate-700 dark:text-slate-300 font-semibold'}`}>
                        {announcement.content.replace(/<[^>]*>?/gm, '')}
                    </p>
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-black opacity-70 border-t border-black/5 dark:border-white/5 pt-2">
                        <span className="truncate max-w-[120px]">De: {announcement.senderName}</span>
                        <span>{new Date(announcement.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementCard;
