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
            className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${getPriorityStyles()} ${!announcement.isRead ? 'shadow-md scale-[1.02] border-opacity-100' : 'opacity-80 grayscale-[20%] border-opacity-40'
                } hover:shadow-lg cursor-pointer`}
            onClick={() => onRead(announcement.id)}
        >
            {!announcement.isRead && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            )}

            <div className="flex items-start gap-3">
                <div className="mt-1">{getPriorityIcon()}</div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h4 className={`font-bold ${announcement.isRead ? 'font-medium' : 'font-black'} ${announcement.isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {announcement.title}
                        </h4>
                        {announcement.isRead && (
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 ml-2" />
                        )}
                    </div>
                    <p className={`text-sm mt-1 line-clamp-2 leading-relaxed ${announcement.isRead ? 'text-slate-500 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {announcement.content}
                    </p>
                    <div className="flex justify-between items-center mt-3 text-xs uppercase tracking-wider font-bold opacity-80">
                        <span className="dark:text-slate-400">De: {announcement.senderName}</span>
                        <span className="dark:text-slate-500">{new Date(announcement.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementCard;
