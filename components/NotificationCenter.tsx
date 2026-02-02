import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Trash2, Calendar, FileText, Megaphone, Shield } from 'lucide-react';
import { Incident, LoanRecord, Announcement, User } from '../types';
import { announcementService } from '../services/announcementService';

interface NotificationItem {
    id: string;
    type: 'INCIDENT' | 'LOAN' | 'ANNOUNCEMENT';
    title: string;
    description: string;
    timestamp: string;
    status: 'UNREAD' | 'READ';
    data?: any; // Original data object
}

interface NotificationCenterProps {
    currentUser: User;
    incidents: Incident[];
    loans: LoanRecord[];
    onNavigate: (view: string, data?: any) => void;
    onAnnouncementRead: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
    currentUser,
    incidents,
    loans,
    onNavigate,
    onAnnouncementRead
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Persisted state for dismissed items (since backend might not support soft-delete/dismissal for all)
    const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
        const saved = localStorage.getItem('notification_dismissals');
        return saved ? JSON.parse(saved) : [];
    });

    // Handle clicks outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Save dismissed IDs
    useEffect(() => {
        localStorage.setItem('notification_dismissals', JSON.stringify(dismissedIds));
    }, [dismissedIds]);

    // Fetch and aggregate notifications
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const allNotifications: NotificationItem[] = [];

            // 1. Pending Incidents (Pending = Unread for this context mostly, but let's track status locally too?)
            // Actually, for "Pending" items, they are essentially unread tasks.
            incidents.forEach(inc => {
                if (inc.status === 'PENDING' && !dismissedIds.includes(inc.id)) {
                    allNotifications.push({
                        id: inc.id,
                        type: 'INCIDENT',
                        title: 'Nova Ocorrência Pendente',
                        description: `R.A #${inc.raCode} aguardando aprovação.`,
                        timestamp: inc.createdAt || inc.date, // Fallback if createdAt missing
                        status: 'UNREAD', // You might want to track if "seen" but usually pending is unread
                        data: inc
                    });
                }
            });

            // 2. Pending Loans
            // Filter logic from App.tsx: Receiver or Operator
            const relatedLoans = loans.filter(l =>
                l.status === 'PENDING' &&
                (l.receiverId === currentUser.id || l.operatorId === currentUser.id) &&
                !dismissedIds.includes(l.id)
            );

            // Group by Batch? Or individual? Let's show individual for now or batch if id is same
            // Deduplicate by batch if needed, but let's just show all for simplicity first
            relatedLoans.forEach(loan => {
                allNotifications.push({
                    id: loan.id,
                    type: 'LOAN',
                    title: 'Cautela Pendente',
                    description: `${loan.quantity || 1}x ${loan.assetDescription} - ${loan.receiverName}`,
                    timestamp: loan.checkoutTime,
                    status: 'UNREAD',
                    data: loan
                });
            });

            // 3. Announcements
            // We fetch active announcements. If !isRead -> UNREAD. If isRead -> READ.
            const announcements = await announcementService.getActiveAnnouncements(currentUser.id, currentUser.role);
            announcements.forEach(ann => {
                if (!dismissedIds.includes(ann.id)) {
                    allNotifications.push({
                        id: ann.id,
                        type: 'ANNOUNCEMENT',
                        title: ann.title,
                        description: ann.content.replace(/<[^>]*>/g, '').substring(0, 50) + '...', // Strip HTML
                        timestamp: ann.createdAt,
                        status: ann.isRead ? 'READ' : 'UNREAD',
                        data: ann
                    });
                }
            });

            // Sort by Date Descending
            allNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setNotifications(allNotifications);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen || incidents || loans) { // Refetch when data changes or menu opens
            fetchNotifications();
        }
    }, [isOpen, incidents, loans, dismissedIds]); // Added dismissedIds dep to refresh filter

    const handleItemClick = async (notif: NotificationItem) => {
        // 1. Mark as Read locally/remotely
        if (notif.status === 'UNREAD') {
            if (notif.type === 'ANNOUNCEMENT') {
                await announcementService.markAsRead(notif.id, currentUser.id);
                onAnnouncementRead();

                // Update local state to show as READ immediately
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'READ' } : n));
            } else {
                // For loans/incidents, "Read" might just mean "I acknowledged this notification"
                // Since there's no backend "read_at" for incident/loan *notification*, we can track it locally if needed
                // OR we assume clicking it navigates to the view, which is the goal.
                // For now, let's keep it "UNREAD" in the list until they "Dismiss" or it is no longer PENDING?
                // User Requirement: "Ação 1: Clica para expandir ou marcar como Lido".
                // Let's toggle local status to READ so "Delete" becomes available.
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'READ' } : n));
            }
        }

        // 2. Navigate/Expand
        // For Announcements, maybe expand in place or navigate?
        // User: "Interaction: Click opens a list... Action 1: Click to expand or mark as Read"
        // Let's assume clicking the item body navigates, and we add a specific "Mark as Read" button?
        // OR clicking *is* the read action.

        switch (notif.type) {
            case 'INCIDENT':
                onNavigate('PENDING_APPROVALS', { tab: 'INCIDENTS' }); // Simplified nav
                setIsOpen(false);
                break;
            case 'LOAN':
                onNavigate('PENDING_APPROVALS', { tab: 'LOANS' });
                setIsOpen(false);
                break;
            case 'ANNOUNCEMENT':
                onNavigate('ANNOUNCEMENTS'); // Or open modal if passed?
                setIsOpen(false);
                break;
        }
    };

    const handleDismiss = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDismissedIds(prev => [...prev, id]);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

    // --- Render Helpers ---

    const getIcon = (type: string) => {
        switch (type) {
            case 'INCIDENT': return <FileText size={16} className="text-orange-500" />;
            case 'LOAN': return <Shield size={16} className="text-blue-500" />;
            case 'ANNOUNCEMENT': return <Megaphone size={16} className="text-purple-500" />;
            default: return <Bell size={16} />;
        }
    };

    const renderNotificationList = (isMobile: boolean) => (
        <>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Notificações</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{unreadCount} Novas</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchNotifications()}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                        title="Atualizar"
                    >
                        <Check size={16} />
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 rounded-full text-slate-400 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto p-2 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Bell size={48} strokeWidth={1} className="mb-4 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">Nenhuma notificação</p>
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div
                            key={notif.id}
                            onClick={() => handleItemClick(notif)}
                            className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${notif.status === 'UNREAD'
                                ? 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900/10 shadow-md hover:shadow-lg ring-1 ring-indigo-500/5'
                                : 'bg-slate-50 dark:bg-slate-900/50 border-transparent opacity-75 hover:opacity-100'
                                }`}
                        >
                            {/* Unread Accent Bar */}
                            {notif.status === 'UNREAD' && (
                                <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${notif.type === 'INCIDENT' ? 'bg-orange-500' :
                                    notif.type === 'LOAN' ? 'bg-blue-500' : 'bg-purple-500'
                                    }`} />
                            )}

                            <div className="flex gap-4">
                                <div className={`p-2.5 rounded-xl h-fit flex-shrink-0 shadow-sm transition-transform group-hover:scale-110 ${notif.status === 'UNREAD'
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                    : 'bg-slate-200 dark:bg-slate-800'
                                    }`}>
                                    {getIcon(notif.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className={`text-[11px] font-black uppercase tracking-tight truncate flex-1 ${notif.status === 'UNREAD' ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'
                                            }`}>
                                            {notif.title}
                                        </h4>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {notif.status === 'UNREAD' && (
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-snug font-medium">
                                        {notif.description}
                                    </p>

                                    <div className="mt-3 flex justify-end items-center gap-2">
                                        {notif.status === 'READ' && (
                                            <button
                                                onClick={(e) => handleDismiss(e, notif.id)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-[9px] font-black uppercase transition-colors"
                                            >
                                                <Trash2 size={10} /> Remover
                                            </button>
                                        )}
                                        {notif.status === 'UNREAD' && (
                                            <div className="flex items-center gap-1 py-1.5 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                Toque para ler <Megaphone size={10} className="ml-0.5 opacity-50" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={`p-2.5 rounded-xl relative transition-all duration-300 group ${isOpen
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 scale-105'
                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 shadow-sm'
                    }`}
            >
                <Bell size={20} strokeWidth={isOpen ? 2.5 : 2} className={isOpen ? 'animate-wiggle' : 'group-hover:animate-wiggle'} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white dark:border-slate-900 shadow-sm">
                            {unreadCount > 0 && (
                                <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white leading-none">
                                    {unreadCount > 9 ? '+9' : unreadCount}
                                </span>
                            )}
                        </span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed md:absolute top-[68px] md:top-full right-4 md:right-0 w-[calc(100vw-2rem)] md:w-96 max-w-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh] md:max-h-[600px] z-[120] animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden mt-1 md:mt-3">
                    {renderNotificationList(false)}
                </div>
            )}
        </div>
    );
};
