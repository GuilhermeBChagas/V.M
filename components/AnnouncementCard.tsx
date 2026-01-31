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
                return 'bg-red-50 border-red-200 text-red-800';
            case 'IMPORTANT':
                return 'bg-amber-50 border-amber-200 text-amber-800';
            default:
                return 'bg-blue-50 border-blue-200 text-blue-800';
        }
    };

    const getPriorityIcon = () => {
        switch (announcement.priority) {
            case 'URGENT':
                return <Flame className="w-5 h-5 text-red-600" />;
            case 'IMPORTANT':
                return <AlertCircle className="w-5 h-5 text-amber-600" />;
            default:
                return <Info className="w-5 h-5 text-blue-600" />;
        }
    };

    return (
        <div
            className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${getPriorityStyles()} ${!announcement.isRead ? 'shadow-md scale-[1.02]' : 'opacity-80 grayscale-[20%]'
                } hover:shadow-lg cursor-pointer`}
            onClick={() => onRead(announcement.id)}
        >
            {!announcement.isRead && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            )}

            <div className="flex items-start gap-3">
                <div className="mt-1">{getPriorityIcon()}</div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h4 className={`font-bold ${announcement.isRead ? 'font-medium' : 'font-extrabold'}`}>
                            {announcement.title}
                        </h4>
                        {announcement.isRead && (
                            <CheckCircle2 className="w-4 h-4 text-green-600 ml-2" />
                        )}
                    </div>
                    <p className="text-sm mt-1 line-clamp-2 leading-relaxed">
                        {announcement.content}
                    </p>
                    <div className="flex justify-between items-center mt-3 text-[10px] uppercase tracking-wider font-semibold opacity-70">
                        <span>De: {announcement.senderName}</span>
                        <span>{new Date(announcement.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementCard;
