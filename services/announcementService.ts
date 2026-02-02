import { supabase } from './supabaseClient';
import { Announcement } from '../types';

export const announcementService = {
    /**
     * Obtém os recados ativos para o usuário logado
     */
    async getActiveAnnouncements(userId: string, userRole?: string): Promise<Announcement[]> {
        try {
            // Conta RLS para filtrar
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_archived', false)
                .order('priority', { ascending: false }) // Urgent > Important > Info
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Busca leituras
            const { data: readData, error: readError } = await supabase
                .from('announcement_reads')
                .select('announcement_id')
                .eq('user_id', userId);

            if (readError) throw readError;

            const readIds = new Set(readData?.map(r => r.announcement_id) || []);

            // Busca dados do remetente se necessário - mas por enquanto assume admin/sistema
            // Mapeia snake_case do banco para camelCase do TS
            return (data || []).map((ann: any) => ({
                id: ann.id,
                title: ann.title,
                content: ann.content,
                senderId: ann.sender_id,
                senderName: ann.sender_id === 'admin-master' ? 'Administrador Master' : 'Sistema', // TODO: Join com users
                targetType: ann.target_type, // Legacy
                targetId: ann.target_id, // Legacy
                targetData: ann.target_data,
                requestConfirmation: ann.request_confirmation,
                priority: ann.priority,
                expiresAt: ann.expires_at,
                isArchived: ann.is_archived,
                createdAt: ann.created_at,
                updatedAt: ann.updated_at,
                isRead: readIds.has(ann.id),
                attachments: ann.attachments || [],
                readCount: 0, // Placeholder, populado no report ou view manager
                totalRecipients: 0 // Placeholder
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
                .upsert({ announcement_id: announcementId, user_id: userId, read_at: new Date().toISOString() }, { onConflict: 'announcement_id,user_id' });

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
            const dbPayload = {
                title: announcement.title,
                content: announcement.content,
                sender_id: announcement.senderId,
                target_type: announcement.targetType, // Legacy support
                target_id: announcement.targetId, // Legacy support
                target_data: announcement.targetData,
                request_confirmation: announcement.requestConfirmation,
                priority: announcement.priority,
                expires_at: announcement.expiresAt,
                attachments: announcement.attachments
            };

            const { data, error } = await supabase
                .from('announcements')
                .insert(dbPayload)
                .select()
                .single();

            if (error) throw error;
            return data as any;
        } catch (error) {
            console.error('Erro ao criar recado:', error);
            return null;
        }
    },

    /**
     * Obtém o relatório de leitura para um aviso específico
     */
    async getReadingReport(announcementId: string): Promise<{ userId: string, readAt: string | null, userName: string, role: string, jobTitleId?: string }[]> {
        try {
            // 1. Get all users
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, name, role, job_title_id');

            if (usersError) throw usersError;

            // 2. Get reads for this announcement
            const { data: reads, error: readsError } = await supabase
                .from('announcement_reads')
                .select('user_id, read_at')
                .eq('announcement_id', announcementId);

            if (readsError) throw readsError;

            // 3. Merge
            const readMap = new Map();
            reads?.forEach(r => readMap.set(r.user_id, r.read_at));

            return (users || []).map((u: any) => ({
                userId: u.id,
                userName: u.name,
                role: u.role,
                jobTitleId: u.job_title_id,
                readAt: readMap.get(u.id) || null
            }));
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            return [];
        }
    },

    /**
     * Exclui um recado e seu histórico (Apenas Admins via RLS)
     */
    async deleteAnnouncement(announcementId: string): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('Service: Deletando aviso id:', announcementId);

            // 1. Opcional: deletar leituras manualmente para garantir limpeza total
            const { error: readError } = await supabase
                .from('announcement_reads')
                .delete()
                .eq('announcement_id', announcementId);

            if (readError) {
                console.warn('Erro ao limpar leituras (ignorado):', readError);
            }

            // 2. Deletar o aviso
            // Usamos count: 'exact' para verificar se o banco realmente permitiu a deleção
            const { error, count } = await supabase
                .from('announcements')
                .delete({ count: 'exact' })
                .eq('id', announcementId);

            if (error) throw error;

            // Se count for 0, as políticas RLS bloquearam a exclusão silenciosamente
            if (count === 0) {
                console.error('RLS Block: Nenhum registro excluído apesar de não haver erro SQL.');
                throw new Error('Permissão negada pelo banco de dados. O registro não foi encontrado ou você não tem permissão para excluí-lo.');
            }

            console.log('Service: Sucesso na exclusão.');
            return { success: true };
        } catch (error: any) {
            console.error('Erro ao excluir recado:', error);
            return { success: false, error: error.message };
        }
    }
};
