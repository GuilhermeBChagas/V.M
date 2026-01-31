import { supabase } from './supabaseClient';
import { Announcement } from '../types';

export const announcementService = {
    /**
     * Obtém os recados ativos para o usuário logado
     */
    async getActiveAnnouncements(userId: string, userRole?: string): Promise<Announcement[]> {
        try {
            // Busca recados ativos (Broadcast, para o usuário ou para o grupo/role dele)
            let query = supabase
                .from('announcements')
                .select('*')
                .eq('is_archived', false);

            if (userRole) {
                query = query.or(`target_type.eq.BROADCAST,and(target_type.eq.USER,target_id.eq.${userId}),and(target_type.eq.GROUP,target_id.eq.${userRole})`);
            } else {
                query = query.or(`target_type.eq.BROADCAST,and(target_type.eq.USER,target_id.eq.${userId})`);
            }

            const { data, error } = await query
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            const { data: readData, error: readError } = await supabase
                .from('announcement_reads')
                .select('announcement_id')
                .eq('user_id', userId);

            if (readError) throw readError;

            const readIds = new Set(readData?.map(r => r.announcement_id) || []);

            return (data || []).map(ann => ({
                id: ann.id,
                title: ann.title,
                content: ann.content,
                senderId: ann.sender_id,
                senderName: ann.sender_id === 'admin-master' ? 'Administrador Master' : 'Sistema',
                targetType: ann.target_type,
                targetId: ann.target_id,
                priority: ann.priority,
                expiresAt: ann.expires_at,
                isArchived: ann.is_archived,
                createdAt: ann.created_at,
                updatedAt: ann.updated_at,
                isRead: readIds.has(ann.id)
            }));
        } catch (error) {
            console.error('Erro ao buscar recados:', error);
            return [];
        }
    },

    /**
     * Obtém apenas a contagem de recados não lidos
     */
    async getUnreadCount(userId: string, userRole?: string): Promise<number> {
        try {
            const announcements = await this.getActiveAnnouncements(userId, userRole);
            return announcements.filter(a => !a.isRead).length;
        } catch (error) {
            return 0;
        }
    },

    /**
     * Marca um recado como lido
     */
    async markAsRead(announcementId: string, userId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('announcement_reads')
                .upsert({ announcement_id: announcementId, user_id: userId, read_at: new Date().toISOString() });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erro ao marcar como lido:', error);
            return false;
        }
    },

    /**
     * Cria um novo recado (Apenas Admins/Supervisores via políticas RLS)
     */
    async createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'isRead' | 'senderName'>): Promise<Announcement | null> {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .insert({
                    title: announcement.title,
                    content: announcement.content,
                    sender_id: announcement.senderId,
                    target_type: announcement.targetType,
                    target_id: announcement.targetId,
                    priority: announcement.priority,
                    expires_at: announcement.expiresAt
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar recado:', error);
            return null;
        }
    }
};
