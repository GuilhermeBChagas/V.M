
import React, { useState, useEffect } from 'react';
import { SystemPermissionMap, UserPermissionOverrides, User, PermissionKey, UserRole } from '../types';
import { Save, Loader2, RefreshCw, Shield, Info, AlertTriangle, Users, Key, UserCheck, Lock, Check, X, Search, Activity, Layout } from 'lucide-react';
import { normalizeString } from '../utils/stringUtils';

interface AccessControlViewProps {
    permissions: SystemPermissionMap;
    userOverrides: UserPermissionOverrides;
    users: User[];
    onUpdatePermissions: (perms: SystemPermissionMap) => Promise<void>;
    onUpdateOverrides: (overrides: UserPermissionOverrides) => Promise<void>;
}


const PERMISSION_GROUPS = [
    {
        title: 'Painel e Monitoramento',
        permissions: [
            { key: 'VIEW_DASHBOARD', label: 'Acessar Painel Principal (Dashboard)' },
            { key: 'VIEW_CHARTS', label: 'Acessar Estatísticas e Gráficos' },
            { key: 'VIEW_ANNOUNCEMENTS', label: 'Visualizar Mural de Avisos' },
        ]
    },
    {
        title: 'Gestão de Incidentes (R.A)',
        permissions: [
            { key: 'CREATE_INCIDENT', label: 'Criar Novos Registros' },
            { key: 'VIEW_MY_INCIDENTS', label: 'Ver Meus Registros (Histórico Próprio)' },
            { key: 'VIEW_ALL_INCIDENTS', label: 'Ver Todos os Registros (Histórico Global)' },
            { key: 'EDIT_INCIDENT', label: 'Editar Registros Existentes' },
            { key: 'APPROVE_INCIDENT', label: 'Validar / Aprovar Registros' },
            { key: 'DELETE_INCIDENT', label: 'Cancelar / Excluir Registros' },
        ]
    },
    {
        title: 'Gestão de Cautelas',
        permissions: [
            { key: 'CREATE_LOAN', label: 'Iniciar/Saída de Cautelas' },
            { key: 'APPROVE_LOAN', label: 'Aceitar/Confirmar Cautelas (Recebimento)' },
            { key: 'RETURN_LOAN', label: 'Realizar Devolução de Itens' },
            { key: 'VIEW_MY_LOANS', label: 'Ver Minhas Cautelas (Histórico Próprio)' },
            { key: 'VIEW_ALL_LOANS', label: 'Ver Todas as Cautelas (Histórico Global)' },
        ]
    },
    {
        title: 'Gestão de Ativos (Inventário)',
        permissions: [
            { key: 'VIEW_ASSETS', label: 'Visualizar Lista de Ativos' },
            { key: 'MANAGE_ASSETS', label: 'Cadastrar / Editar Ativos' },
            { key: 'DELETE_ASSETS', label: 'Excluir Ativos' },
        ]
    },
    {
        title: 'Administração e Ferramentas',
        permissions: [
            { key: 'MANAGE_USERS', label: 'Gerenciar Usuários' },
            { key: 'DELETE_USERS', label: 'Excluir Usuários' },
            { key: 'MANAGE_BUILDINGS', label: 'Gerenciar Prédios/Locais' },
            { key: 'MANAGE_SECTORS', label: 'Gerenciar Setores' },
            { key: 'MANAGE_ALTERATION_TYPES', label: 'Gerenciar Tipos de Alteração' },
            { key: 'MANAGE_ANNOUNCEMENTS', label: 'Administrar Mural de Avisos' },
            { key: 'ACCESS_TOOLS', label: 'Acesso total a Ferramentas Avançadas' },
            { key: 'EXPORT_REPORTS', label: 'Exportar Relatórios (PDF/Excel)' },
        ]
    }
];

export const AccessControlView: React.FC<AccessControlViewProps> = ({
    permissions, userOverrides, users,
    onUpdatePermissions, onUpdateOverrides
}) => {
    const [mode, setMode] = useState<'ROLES' | 'USERS'>('ROLES');
    const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.OPERADOR);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [userSearch, setUserSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const [localPermissions, setLocalPermissions] = useState<SystemPermissionMap>(permissions);
    const [localOverrides, setLocalOverrides] = useState<UserPermissionOverrides>(userOverrides);

    useEffect(() => {
        setLocalPermissions(permissions);
        setLocalOverrides(userOverrides);
    }, [permissions, userOverrides]);

    useEffect(() => {
        if (mode === 'USERS' && !selectedUserId && users.length > 0) {
            setSelectedUserId(users[0].id);
        }
    }, [mode, users]);

    const handleRolePermissionToggle = (key: string) => {
        setLocalPermissions(prev => {
            const currentRoles = prev[key] || [];
            const hasRole = currentRoles.includes(selectedRole);
            const newRoles = hasRole
                ? currentRoles.filter(r => r !== selectedRole)
                : [...currentRoles, selectedRole];
            return { ...prev, [key]: newRoles };
        });
    };


    const getEffectiveUserPermission = (userId: string, key: string): { allowed: boolean, source: 'ROLE' | 'OVERRIDE_ALLOW' | 'OVERRIDE_DENY' } => {
        const user = users.find(u => u.id === userId);
        if (!user) return { allowed: false, source: 'ROLE' };

        const override = localOverrides[userId]?.[key as PermissionKey];
        if (override === true) return { allowed: true, source: 'OVERRIDE_ALLOW' };
        if (override === false) return { allowed: false, source: 'OVERRIDE_DENY' };

        const allowedByRole = (localPermissions[key] || []).includes(user.role);
        return { allowed: allowedByRole, source: 'ROLE' };
    };


    const handleUserPermissionOverride = (userId: string, key: PermissionKey, value: boolean | undefined) => {
        setLocalOverrides(prev => {
            const userO = { ...(prev[userId] || {}) };
            if (value === undefined) {
                delete userO[key];
            } else {
                userO[key] = value;
            }

            if (Object.keys(userO).length === 0) {
                const copy = { ...prev };
                delete copy[userId];
                return copy;
            }

            return { ...prev, [userId]: userO };
        });
    };


    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all([
                onUpdatePermissions(localPermissions),
                onUpdateOverrides(localOverrides)
            ]);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const isSystemLocked = mode === 'ROLES' && selectedRole === UserRole.ADMIN;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-[600px]">
            <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 dark:bg-slate-800/20">
                <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                        <Key className="text-blue-600" size={20} /> Controle de Acessos
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Configure permissões funcionais (Menus são automáticos)
                    </p>
                </div>

                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => setMode('ROLES')}
                        className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${mode === 'ROLES' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Shield size={12} /> Por Função
                    </button>
                    <button
                        onClick={() => setMode('USERS')}
                        className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${mode === 'USERS' ? 'bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-purple-400' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <UserCheck size={12} /> Individual
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row">
                <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800/30 border-r border-slate-200 dark:border-slate-700 p-3 flex flex-col shrink-0">
                    {mode === 'ROLES' ? (
                        <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                            <p className="col-span-2 md:col-span-1 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Função Base</p>
                            {Object.values(UserRole).map(role => (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRole(role)}
                                    className={`text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-between ${selectedRole === role ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'}`}
                                >
                                    {role}
                                    {selectedRole === role && <Check size={12} />}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3 h-full flex flex-col">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex justify-between">
                                <span>Pesquisar Usuário</span>
                                <span className="text-slate-300">{users.length}</span>
                            </p>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={12} />
                                <input
                                    type="text"
                                    placeholder="Nome ou Matrícula..."
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    className="w-full pl-9 p-2 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500 uppercase font-bold"
                                />
                            </div>
                            <div className="space-y-1.5 pr-1 overflow-y-auto custom-scrollbar max-h-[500px]">
                                {users.filter(u => normalizeString(u.name || '').includes(normalizeString(userSearch)) || normalizeString(u.matricula || '').includes(normalizeString(userSearch))).map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => setSelectedUserId(user.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex flex-col ${selectedUserId === user.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'}`}
                                    >
                                        <span className="truncate">{user.name}</span>
                                        <span className={`text-[8px] ${selectedUserId === user.id ? 'text-purple-200' : 'text-slate-400'}`}>{user.role} {user.matricula && `• ${user.matricula}`}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 p-6">
                    <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                                {mode === 'ROLES' ? (
                                    <><Shield className="text-blue-500" size={18} /> Editando: {selectedRole}</>
                                ) : (
                                    <><UserCheck className="text-purple-500" size={18} /> Editando: {users.find(u => u.id === selectedUserId)?.name || '...'}</>
                                )}
                            </h3>
                        </div>

                        {isSystemLocked && (
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 animate-in fade-in">
                                <Lock className="text-amber-500" size={14} />
                                <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase">
                                    Administrador possui acesso total.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 flex items-start gap-3 mb-8">
                        <Info className="text-blue-500 mt-1 shrink-0" size={20} />
                        <div className="space-y-1">
                            <p className="text-xs font-black text-blue-900 dark:text-blue-100 uppercase">Visibilidade Inteligente</p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                Os menus da barra lateral são exibidos automaticamente com base nas permissões funcionais abaixo.
                                Se o usuário não tiver permissão para uma ação, o menu correspondente será ocultado.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
                        {PERMISSION_GROUPS.map((group, idx) => (
                            <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">{group.title}</h5>
                                <div className="space-y-3">
                                    {group.permissions.map(perm => {
                                        if (mode === 'ROLES') {
                                            const isAllowed = (localPermissions[perm.key as PermissionKey] || []).includes(selectedRole);
                                            return (
                                                <div key={perm.key} className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">{perm.label}</span>
                                                    <button
                                                        onClick={() => !isSystemLocked && handleRolePermissionToggle(perm.key)}
                                                        className={`w-10 h-6 rounded-full flex items-center transition-all p-1 ${isSystemLocked || isAllowed ? (isSystemLocked ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600') : 'bg-slate-200 dark:bg-slate-700'} ${isSystemLocked || isAllowed ? 'justify-end' : 'justify-start'}`}
                                                        disabled={isSystemLocked}
                                                    >
                                                        <div className="w-4 h-4 bg-white rounded-full shadow-sm flex items-center justify-center">
                                                            {isSystemLocked && <Lock size={10} className="text-slate-500" />}
                                                        </div>
                                                    </button>
                                                </div>
                                            );
                                        } else {
                                            const { allowed, source } = getEffectiveUserPermission(selectedUserId, perm.key);
                                            const isInherited = source === 'ROLE';
                                            return (
                                                <div key={perm.key} className="flex items-center justify-between group">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">{perm.label}</span>
                                                        <span className={`text-[9px] uppercase font-bold ${source === 'ROLE' ? 'text-slate-400' : 'text-purple-500'}`}>
                                                            {source === 'ROLE' ? 'Herdado do Cargo' : source === 'OVERRIDE_ALLOW' ? 'Permitido (Manual)' : 'Bloqueado (Manual)'}
                                                        </span>
                                                    </div>
                                                    <div className="flex bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-0.5">
                                                        <button onClick={() => handleUserPermissionOverride(selectedUserId, perm.key as PermissionKey, undefined)} className={`p-1.5 rounded transition-colors ${isInherited ? 'bg-slate-100 text-slate-600' : 'text-slate-300 hover:text-slate-500'}`} title="Herdar"><RefreshCw size={12} /></button>
                                                        <button onClick={() => handleUserPermissionOverride(selectedUserId, perm.key as PermissionKey, true)} className={`p-1.5 rounded transition-colors ${!isInherited && allowed ? 'bg-green-100 text-green-700' : 'text-slate-300 hover:text-green-500'}`} title="Permitir"><Check size={12} /></button>
                                                        <button onClick={() => handleUserPermissionOverride(selectedUserId, perm.key as PermissionKey, false)} className={`p-1.5 rounded transition-colors ${!isInherited && !allowed ? 'bg-red-100 text-red-700' : 'text-slate-300 hover:text-red-500'}`} title="Bloquear"><X size={12} /></button>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 rounded-b-2xl">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all ${saving ? 'bg-slate-300 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Salvando Alterações...' : 'Salvar Todas as Configurações'}
                </button>
            </div>
        </div>
    );
};
