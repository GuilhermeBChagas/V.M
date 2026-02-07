
import { PermissionKey } from '../types';

export interface MenuItemDef {
    id: string;
    label: string;
    requiredPermissions: PermissionKey[];
    iconName?: string;
    isSection?: boolean;
    children?: MenuItemDef[];
}

export const MENU_STRUCTURE: MenuItemDef[] = [
    {
        id: 'section_principal',
        label: 'Principal',
        isSection: true,
        requiredPermissions: [],
        children: [
            { id: 'dashboard', label: 'Painel de Controle', iconName: 'LayoutDashboard', requiredPermissions: ['VIEW_DASHBOARD'] },
            { id: 'announcements', label: 'Mural de Avisos', iconName: 'Megaphone', requiredPermissions: ['VIEW_ANNOUNCEMENTS'] },
            { id: 'map', label: 'Mapa', iconName: 'Map', requiredPermissions: ['VIEW_MAP'] }
        ]
    },
    {
        id: 'section_incidents_ops',
        label: 'Atendimentos',
        isSection: true,
        requiredPermissions: [],
        children: [
            { id: 'new_record', label: 'Novo Registro', iconName: 'FilePlus', requiredPermissions: ['CREATE_INCIDENT'] },
            { id: 'pending_incidents', label: 'Pendentes', iconName: 'UserCheck', requiredPermissions: ['APPROVE_INCIDENT', 'VIEW_MY_PENDING_INCIDENTS', 'VIEW_ALL_PENDING_INCIDENTS'] },
            { id: 'history_incidents', label: 'Históricos', iconName: 'History', requiredPermissions: ['VIEW_ALL_INCIDENTS', 'VIEW_MY_INCIDENTS'] },
            { id: 'report_incidents', label: 'Relatórios', iconName: 'FileSpreadsheet', requiredPermissions: ['EXPORT_REPORTS', 'VIEW_ALL_INCIDENTS'] }
        ]
    },
    {
        id: 'section_loans_ops',
        label: 'Cautelas',
        isSection: true,
        requiredPermissions: [],
        children: [
            { id: 'new_loan', label: 'Nova Cautela', iconName: 'Plus', requiredPermissions: ['CREATE_LOAN'] },
            { id: 'loans', label: 'Painel de Cautelas', iconName: 'Key', requiredPermissions: ['CREATE_LOAN', 'APPROVE_LOAN', 'RETURN_LOAN', 'VIEW_MY_LOANS'] },
            { id: 'history_loans', label: 'Históricos', iconName: 'History', requiredPermissions: ['VIEW_ALL_LOANS', 'VIEW_MY_LOANS'] },
            { id: 'report_loans', label: 'Relatórios', iconName: 'FileSpreadsheet', requiredPermissions: ['EXPORT_REPORTS', 'VIEW_ALL_LOANS'] }
        ]
    },
    {
        id: 'section_management',
        label: 'Gestão',
        isSection: true,
        requiredPermissions: [],
        children: [
            { id: 'charts', label: 'Estatísticas', iconName: 'PieChartIcon', requiredPermissions: ['VIEW_CHARTS'] },
            {
                id: 'registrations_root',
                label: 'Cadastros',
                iconName: 'FolderOpen',
                requiredPermissions: ['MANAGE_BUILDINGS', 'MANAGE_USERS', 'MANAGE_SECTORS', 'MANAGE_ALTERATION_TYPES', 'MANAGE_ESCALAS', 'MANAGE_VEHICLES', 'MANAGE_VESTS', 'MANAGE_RADIOS', 'MANAGE_EQUIPMENTS'],
                children: [
                    { id: 'reg_buildings', label: 'Prédios', iconName: 'BuildingIcon', requiredPermissions: ['MANAGE_BUILDINGS'] },
                    { id: 'reg_types', label: 'Tipos de Alteração', iconName: 'Tag', requiredPermissions: ['MANAGE_ALTERATION_TYPES'] },
                    { id: 'reg_sectors', label: 'Setores', iconName: 'Map', requiredPermissions: ['MANAGE_SECTORS'] },
                    { id: 'reg_users', label: 'Usuários', iconName: 'Users', requiredPermissions: ['MANAGE_USERS'] },
                    { id: 'reg_escalas', label: 'Escalas de Serviço', iconName: 'Clock', requiredPermissions: ['MANAGE_ESCALAS'] },
                    { id: 'reg_job_titles', label: 'Cargos e Funções', iconName: 'Briefcase', requiredPermissions: ['MANAGE_JOB_TITLES'] },
                    { id: 'reg_vehicles', label: 'Veículos', iconName: 'Car', requiredPermissions: ['MANAGE_VEHICLES'] },
                    { id: 'reg_vests', label: 'Coletes', iconName: 'Shield', requiredPermissions: ['MANAGE_VESTS'] },
                    { id: 'reg_radios', label: 'Rádios HT', iconName: 'RadioIcon', requiredPermissions: ['MANAGE_RADIOS'] },
                    { id: 'reg_equipments', label: 'Outros', iconName: 'Package', requiredPermissions: ['MANAGE_EQUIPMENTS'] }
                ]
            },
            {
                id: 'tools_root',
                label: 'Ferramentas',
                iconName: 'Wrench',
                requiredPermissions: ['ACCESS_TOOLS'],
                children: [
                    { id: 'tool_appearance', label: 'Aparência', requiredPermissions: ['ACCESS_TOOLS'] },
                    { id: 'tool_import', label: 'Importação / Exportação', requiredPermissions: ['ACCESS_TOOLS'] },
                    { id: 'tool_permissions', label: 'Permissões', requiredPermissions: ['ACCESS_TOOLS'] },
                    { id: 'tool_logs', label: 'Log do Sistema', requiredPermissions: ['ACCESS_TOOLS'] },
                    { id: 'tool_database', label: 'Banco de Dados', requiredPermissions: ['ACCESS_TOOLS'] },
                    { id: 'tool_system', label: 'Sobre o Sistema', requiredPermissions: ['ACCESS_TOOLS'] }
                ]
            }
        ]
    }
];
