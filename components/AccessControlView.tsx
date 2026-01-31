
import React, { useState, useEffect } from 'react';
import { SystemPermissionMap, UserPermissionOverrides, User, MenuVisibilityMap, UserMenuVisibilityOverrides, PermissionKey, UserRole } from '../types';
import { Save, Loader2, RefreshCw, Shield, Info, AlertTriangle, Users, Layout, Key, UserCheck, Lock, Check, X, Search, ChevronDown, ChevronRight, Activity, Ban } from 'lucide-react';
import { MENU_STRUCTURE } from './DashboardLayoutManager';

interface AccessControlViewProps {
    permissions: SystemPermissionMap;
    userOverrides: UserPermissionOverrides;
    menuVisibility: MenuVisibilityMap;
    userMenuOverrides: UserMenuVisibilityOverrides;
    users: User[];
    onUpdatePermissions: (perms: SystemPermissionMap) => Promise<void>;
    onUpdateOverrides: (overrides: UserPermissionOverrides) => Promise<void>;
    onUpdateMenuVisibility: (config: MenuVisibilityMap) => Promise<void>;
    onUpdateMenuOverrides: (config: UserMenuVisibilityOverrides) => Promise<void>;
}

// Definição das Permissões Funcionais (Metadata)
const PERMISSION_GROUPS = [
    {
        title: 'Gestão de Incidentes',
        permissions: [
            { key: 'VIEW_DASHBOARD', label: 'Acessar Painel Principal' },
            { key: 'CREATE_INCIDENT', label: 'Criar Registros (R.A)' },
            { key: 'EDIT_INCIDENT', label: 'Editar Registros Existentes' },
            { key: 'VIEW_ALL_INCIDENTS', label: 'Ver Todos os Registros (Histórico Completo)' },
            { key: 'APPROVE_INCIDENT', label: 'Validar/Aprovar Registros' },
            { key: 'DELETE_INCIDENT', label: 'Cancelar/Excluir Registros' },
        ]
    },
    {
        title: 'Gestão de Ativos e Cautelas',
        permissions: [
            { key: 'MANAGE_ASSETS', label: 'Gerenciar Ativos (VTR, Rádio, etc)' },
            { key: 'DELETE_ASSETS', label: 'Excluir Ativos do Inventário' },
            { key: 'MANAGE_LOANS', label: 'Gerenciar Cautelas (Criar/Ver)' },
            { key: 'RETURN_LOANS', label: 'Realizar Devoluções' },
        ]
    },
    {
        title: 'Administração do Sistema',
        permissions: [
            { key: 'MANAGE_USERS', label: 'Gerenciar Usuários' },
            { key: 'DELETE_USERS', label: 'Excluir Usuários' },
            { key: 'MANAGE_BUILDINGS', label: 'Gerenciar Prédios/Locais' },
            { key: 'MANAGE_SECTORS', label: 'Gerenciar Setores' },
            { key: 'MANAGE_ALTERATION_TYPES', label: 'Gerenciar Tipos de Alteração' },
            { key: 'ACCESS_TOOLS', label: 'Acesso a Ferramentas Avançadas' },
            { key: 'EXPORT_REPORTS', label: 'Exportar Relatórios PDF/Excel' },
        ]
    }
];

export const AccessControlView: React.FC<AccessControlViewProps> = ({
    permissions, userOverrides, menuVisibility, userMenuOverrides, users,
    onUpdatePermissions, onUpdateOverrides, onUpdateMenuVisibility, onUpdateMenuOverrides
}) => {
    const [mode, setMode] = useState<'ROLES' | 'USERS'>('ROLES');
    const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.OPERADOR);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // Estados locais para edição
    const [localPermissions, setLocalPermissions] = useState<SystemPermissionMap>(permissions);
    const [localOverrides, setLocalOverrides] = useState<UserPermissionOverrides>(userOverrides);
    const [localMenuVisibility, setLocalMenuVisibility] = useState<MenuVisibilityMap>(menuVisibility);
    const [localMenuOverrides, setLocalMenuOverrides] = useState<UserMenuVisibilityOverrides>(userMenuOverrides);

    // Menu Expand State
    const [expandedMenuIds, setExpandedMenuIds] = useState<string[]>(['monitoring_group', 'admin_group']);

    // Initialize/Reset Logic
    useEffect(() => {
        setLocalPermissions(permissions);
        setLocalOverrides(userOverrides);
        setLocalMenuVisibility(menuVisibility);
        setLocalMenuOverrides(userMenuOverrides);
    }, [permissions, userOverrides, menuVisibility, userMenuOverrides]);

    useEffect(() => {
        if (mode === 'USERS' && !selectedUserId && users.length > 0) {
            setSelectedUserId(users[0].id);
        }
    }, [mode, users]);

    // --- Helpers ---

    const getAllMenuIds = (items: any[]): string[] => {
        let ids: string[] = [];
        items.forEach(item => {
            ids.push(item.id);
            if (item.children) ids = [...ids, ...getAllMenuIds(item.children)];
        });
        return ids;
    };

    const toggleMenuExpand = (id: string) => {
        setExpandedMenuIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // --- Role Logic ---

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

    const handleRoleMenuToggle = (menuId: string, parentId?: string) => {
        setLocalMenuVisibility(prev => {
            const currentVisible = prev[selectedRole] ? prev[selectedRole] : getAllMenuIds(MENU_STRUCTURE);

            const isVisible = currentVisible.includes(menuId);
            let newVisible = [...currentVisible];

            if (isVisible) {
                // Remove (Hide)
                // Recursively remove children
                const removeChildren = (items: any[]) => {
                    items.forEach(child => {
                        newVisible = newVisible.filter(v => v !== child.id);
                        if (child.children) removeChildren(child.children);
                    });
                };

                // Find item and remove children
                const findAndRemove = (items: any[]) => {
                    items.forEach(item => {
                        if (item.id === menuId) {
                            if (item.children) removeChildren(item.children);
                        } else if (item.children) {
                            findAndRemove(item.children);
                        }
                    });
                };
                findAndRemove(MENU_STRUCTURE);
                newVisible = newVisible.filter(v => v !== menuId);

            } else {
                // Add (Show)
                newVisible.push(menuId);
                // Ensure parents are visible
                const activateParents = (targetId: string, items: any[], path: string[]): boolean => {
                    for (const item of items) {
                        if (item.id === targetId) {
                            path.forEach(p => { if (!newVisible.includes(p)) newVisible.push(p); });
                            return true;
                        }
                        if (item.children) {
                            if (activateParents(targetId, item.children, [...path, item.id])) return true;
                        }
                    }
                    return false;
                };
                activateParents(menuId, MENU_STRUCTURE, []);
            }

            return { ...prev, [selectedRole]: newVisible };
        });
    };

    // --- User Override Logic ---

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

            // Cleanup empty users
            if (Object.keys(userO).length === 0) {
                const copy = { ...prev };
                delete copy[userId];
                return copy;
            }

            return { ...prev, [userId]: userO };
        });
    };

    const getEffectiveUserMenuVisibility = (userId: string, menuId: string): { visible: boolean, source: 'ROLE' | 'OVERRIDE_SET' } => {
        const user = users.find(u => u.id === userId);
        if (!user) return { visible: false, source: 'ROLE' };

        // Check user override (Full list replacement)
        if (localMenuOverrides[userId]) {
            return {
                visible: localMenuOverrides[userId].includes(menuId),
                source: 'OVERRIDE_SET'
            };
        }

        // Check Role
        const roleVisible = (localMenuVisibility[user.role] || getAllMenuIds(MENU_STRUCTURE)).includes(menuId);
        return { visible: roleVisible, source: 'ROLE' };
    };

    const handleUserMenuToggle = (userId: string, menuId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        setLocalMenuOverrides(prev => {
            // Se não tem override ainda, inicializa com a config do Role (snapshot)
            let currentList = prev[userId];
            if (!currentList) {
                currentList = localMenuVisibility[user.role] || getAllMenuIds(MENU_STRUCTURE);
            }

            const isVisible = currentList.includes(menuId);
            let newList: string[];

            if (isVisible) {
                // Remove + Children
                const removeChildren = (items: any[]) => {
                    items.forEach(child => {
                        newList = newList.filter((v: string) => v !== child.id);
                        if (child.children) removeChildren(child.children);
                    });
                };
                newList = [...currentList];
                newList = newList.filter(v => v !== menuId);
                const findAndRemove = (items: any[]) => {
                    items.forEach(item => {
                        if (item.id === menuId) { if (item.children) removeChildren(item.children); }
                        else if (item.children) findAndRemove(item.children);
                    });
                };
                findAndRemove(MENU_STRUCTURE);
            } else {
                // Add + Parents
                newList = [...currentList, menuId];
                const activateParents = (targetId: string, items: any[], path: string[]): boolean => {
                    for (const item of items) {
                        if (item.id === targetId) {
                            path.forEach(p => { if (!newList.includes(p)) newList.push(p); });
                            return true;
                        }
                        if (item.children && activateParents(targetId, item.children, [...path, item.id])) return true;
                    }
                    return false;
                };
                activateParents(menuId, MENU_STRUCTURE, []);
            }

            return { ...prev, [userId]: newList };
        });
    };

    const resetUserMenuOverrides = (userId: string) => {
        setLocalMenuOverrides(prev => {
            const copy = { ...prev };
            delete copy[userId];
            return copy;
        });
    };


    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all([
                onUpdatePermissions(localPermissions),
                onUpdateOverrides(localOverrides),
                onUpdateMenuVisibility(localMenuVisibility),
                onUpdateMenuOverrides(localMenuOverrides)
            ]);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    // --- Renderers ---

    const isSystemLocked = mode === 'ROLES' && selectedRole === UserRole.ADMIN;

    const renderMenuTree = (items: any[], depth = 0, context: 'ROLE' | 'USER') => {
        return items.map(item => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenuIds.includes(item.id);

            let isChecked = false;
            let statusBadge = null;

            if (context === 'ROLE') {
                const visibleIds = localMenuVisibility[selectedRole] || getAllMenuIds(MENU_STRUCTURE);
                isChecked = isSystemLocked ? true : visibleIds.includes(item.id);
            } else {
                const { visible, source } = getEffectiveUserMenuVisibility(selectedUserId, item.id);
                isChecked = visible;
                if (source === 'OVERRIDE_SET') {
                    statusBadge = <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase">Person.</span>;
                }
            }

            return (
                <div key={item.id} className="select-none">
                    <div
                        className={`flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50 transition-colors ${isChecked ? 'opacity-100' : 'opacity-60 grayscale'}`}
                        style={{ paddingLeft: `${depth * 20 + 10}px` }}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            {hasChildren ? (
                                <button onClick={() => toggleMenuExpand(item.id)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                            ) : <div className="w-5" />}

                            <div className="flex flex-col">
                                <span className={`text-xs font-bold uppercase ${isChecked ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>{item.label}</span>
                                <span className="text-[9px] text-slate-400 font-mono">{item.id}</span>
                            </div>
                            {statusBadge}
                        </div>

                        <div onClick={() => !isSystemLocked && (context === 'ROLE' ? handleRoleMenuToggle(item.id) : handleUserMenuToggle(selectedUserId, item.id))}
                            className={`cursor-pointer w-10 h-6 rounded-full flex items-center transition-all p-1 ${isChecked ? isSystemLocked ? 'bg-slate-400 cursor-not-allowed justify-end' : 'bg-blue-600 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'}`}>
                            <div className="w-4 h-4 bg-white rounded-full shadow-sm">
                                {isSystemLocked && isChecked && <Lock size={10} className="text-slate-500 m-0.5" />}
                            </div>
                        </div>
                    </div>
                    {hasChildren && isExpanded && (
                        <div className="border-l border-slate-100 dark:border-slate-800 ml-4">
                            {renderMenuTree(item.children, depth + 1, context)}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-[600px]">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 dark:bg-slate-800/20">
                <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                        <Key className="text-blue-600" size={20} /> Controle de Acessos
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Configure permissões e visibilidade de menus
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
                {/* Sidebar de Seleção */}
                <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800/30 border-r border-slate-200 dark:border-slate-700 p-3 flex flex-col shrink-0">
                    {mode === 'ROLES' ? (
                        <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                            <p className="col-span-2 md:col-span-1 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Função Base</p>
                            {Object.values(UserRole).map(role => (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRole(role)}
                                    className={`text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-between ${selectedRole === role ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                                >
                                    {role === 'OPERADOR' ? 'OPERADOR' : role}
                                    {selectedRole === role && <Check size={12} />}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3 h-full flex flex-col">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pesquisar Usuário</p>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={12} />
                                <input type="text" placeholder="Nome ou CPF..." className="w-full pl-9 p-2 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500 uppercase font-bold" />
                            </div>
                            <div className="space-y-1.5 pr-1">
                                {users.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => setSelectedUserId(user.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex flex-col ${selectedUserId === user.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'}`}
                                    >
                                        <span className="truncate">{user.name}</span>
                                        <span className={`text-[8px] ${selectedUserId === user.id ? 'text-purple-200' : 'text-slate-400'}`}>{user.role === 'OPERADOR' ? 'OPERADOR' : user.role}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Área Principal de Configuração */}
                <div className="flex-1 p-6">

                    {/* Header da Seleção Atual */}
                    <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                                {mode === 'ROLES' ? (
                                    <><Shield className="text-blue-500" size={18} /> Editando: {selectedRole === 'OPERADOR' ? 'OPERADOR' : selectedRole}</>
                                ) : (
                                    <><UserCheck className="text-purple-500" size={18} /> Editando: {users.find(u => u.id === selectedUserId)?.name || '...'}</>
                                )}
                            </h3>
                            {mode === 'USERS' && (
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border dark:border-slate-700">Função Base: {users.find(u => u.id === selectedUserId)?.role === 'OPERADOR' ? 'OPERADOR' : users.find(u => u.id === selectedUserId)?.role}</span>
                                    {localMenuOverrides[selectedUserId] && (
                                        <button onClick={() => resetUserMenuOverrides(selectedUserId)} className="text-[9px] font-black text-rose-500 uppercase hover:underline flex items-center gap-1">
                                            <RefreshCw size={9} /> Resetar Menu
                                        </button>
                                    )}
                                </div>
                            )}
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Coluna 1: Permissões Funcionais */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity size={18} className={mode === 'ROLES' ? "text-blue-500" : "text-purple-500"} />
                                <h4 className="text-sm font-black uppercase text-slate-700 dark:text-slate-200">Permissões de Ação</h4>
                            </div>

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
                                                // USER MODE
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
                                                            <button
                                                                onClick={() => handleUserPermissionOverride(selectedUserId, perm.key as PermissionKey, undefined)}
                                                                className={`p-1.5 rounded transition-colors ${isInherited ? 'bg-slate-100 text-slate-600' : 'text-slate-300 hover:text-slate-500'}`}
                                                                title="Herdar do Cargo"
                                                            ><RefreshCw size={12} /></button>
                                                            <button
                                                                onClick={() => handleUserPermissionOverride(selectedUserId, perm.key as PermissionKey, true)}
                                                                className={`p-1.5 rounded transition-colors ${!isInherited && allowed ? 'bg-green-100 text-green-700' : 'text-slate-300 hover:text-green-500'}`}
                                                                title="Permitir"
                                                            ><Check size={12} /></button>
                                                            <button
                                                                onClick={() => handleUserPermissionOverride(selectedUserId, perm.key as PermissionKey, false)}
                                                                className={`p-1.5 rounded transition-colors ${!isInherited && !allowed ? 'bg-red-100 text-red-700' : 'text-slate-300 hover:text-red-500'}`}
                                                                title="Bloquear"
                                                            ><X size={12} /></button>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Coluna 2: Layout / Menus */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Layout size={18} className={mode === 'ROLES' ? "text-blue-500" : "text-purple-500"} />
                                <h4 className="text-sm font-black uppercase text-slate-700 dark:text-slate-200">Visibilidade de Menu</h4>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Estrutura Sidebar</span>
                                    <span className="text-[10px] font-bold uppercase text-slate-400">
                                        {mode === 'ROLES' ? 'Global' : 'Pessoal'}
                                    </span>
                                </div>
                                <div>
                                    {renderMenuTree(MENU_STRUCTURE, 0, mode)}
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex items-start gap-3">
                                <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={16} />
                                <p className="text-[10px] text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                                    <strong>Nota:</strong> Ocultar o menu não revoga a permissão técnica. Use a coluna "Permissões de Ação" para segurança real. O layout apenas simplifica a interface.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
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
