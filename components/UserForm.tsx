
import React, { useState, useEffect } from 'react';
import { User, UserRole, JobTitle } from '../types';
import { Save, X, User as UserIcon, Shield, Trash2, UserCheck, Eye, Activity, Mail, Hash, MoreHorizontal, Briefcase, Loader2, ArrowLeft } from 'lucide-react';

interface UserFormProps {
    initialData?: User | null;
    onSave: (user: User) => void;
    onDelete?: (id: string) => void;
    onCancel: () => void;
    jobTitles?: JobTitle[];
    isLoading?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({ initialData, onSave, onDelete, onCancel, jobTitles = [], isLoading }) => {
    const [formData, setFormData] = useState<Partial<User>>({
        id: '',
        name: '',
        cpf: '',
        matricula: '',
        userCode: '',
        email: '',
        jobTitleId: '',
        role: UserRole.OPERADOR,
        status: 'ACTIVE',
        photoUrl: '',
        signatureUrl: '',
        termsAcceptedAt: undefined
    });
    const [password, setPassword] = useState('');

    // Função de máscara padronizada (mesma do Auth.tsx)
    const maskCPF = (value: string) => {
        return value
            .replace(/\D/g, '') // Remove tudo o que não é dígito
            .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos
            .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos de novo (para o segundo bloco de números)
            .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca um hífen entre o terceiro e o quarto dígitos
            .replace(/(-\d{2})\d+?$/, '$1'); // Impede que sejam digitados mais caracteres
    };

    useEffect(() => {
        if (initialData) {
            // Aplica a máscara no CPF ao carregar, caso venha sem formatação do banco
            setFormData({
                ...initialData,
                cpf: initialData.cpf ? maskCPF(initialData.cpf) : '',
                userCode: initialData.userCode || '',
                jobTitleId: initialData.jobTitleId || '',
                photoUrl: initialData.photoUrl || '',
                signatureUrl: initialData.signatureUrl || '',
                termsAcceptedAt: initialData.termsAcceptedAt
            });
        } else {
            setFormData(prev => ({ ...prev, id: crypto.randomUUID() }));
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'cpf') {
            // Aplica a máscara imediatamente ao digitar
            setFormData(prev => ({ ...prev, [name]: maskCPF(value) }));
        } else if (name === 'userCode') {
            // Permite apenas números, máx 2 dígitos
            const cleanVal = value.replace(/\D/g, '').slice(0, 2);
            setFormData(prev => ({ ...prev, [name]: cleanVal }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Email não é mais obrigatório na verificação
        if (formData.name && formData.cpf && formData.matricula) {
            onSave({
                id: formData.id || crypto.randomUUID(),
                name: formData.name,
                cpf: formData.cpf,
                matricula: formData.matricula,
                userCode: formData.userCode || undefined,
                email: formData.email || '',
                jobTitleId: formData.jobTitleId || undefined,
                role: formData.role as UserRole,
                status: formData.status as 'ACTIVE' | 'PENDING' | 'BLOCKED',
                passwordHash: password || undefined,
                photoUrl: formData.photoUrl,
                signatureUrl: formData.signatureUrl,
                termsAcceptedAt: formData.termsAcceptedAt
            });
        } else {
            alert("Preencha Nome, CPF e Matrícula.");
        }
    };

    const handleDelete = () => {
        if (initialData && initialData.id && onDelete) {
            onDelete(initialData.id);
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center uppercase">
                    <UserIcon className="w-5 h-5 mr-2" />
                    {initialData ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <button onClick={onCancel} className="btn-back scale-75 md:scale-90 origin-right">
                    <ArrowLeft size={18} />
                    <span>VOLTAR</span>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">Nome Completo</label>
                        <input name="name" value={formData.name} onChange={handleChange} required className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="João da Silva" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">CPF</label>
                        <input name="cpf" value={formData.cpf} onChange={handleChange} required className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="000.000.000-00" maxLength={14} />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">Matrícula</label>
                        <input name="matricula" value={formData.matricula} onChange={handleChange} required className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="MAT-1234" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 flex justify-between uppercase tracking-widest">
                            <span>Código de Acesso</span>
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Login Rápido</span>
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Hash className="h-4 w-4 text-slate-400" />
                            </div>
                            <input name="userCode" type="text" value={formData.userCode} onChange={handleChange} maxLength={2} className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3 pl-9 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="01 a 99" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 flex justify-between uppercase tracking-widest">
                            <span>E-mail</span>
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Opcional</span>
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-4 w-4 text-slate-400" />
                            </div>
                            <input name="email" type="email" value={formData.email} onChange={handleChange} className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3 pl-9 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="email@exemplo.com" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">
                            {initialData ? 'Nova Senha (opcional)' : 'Senha Inicial'}
                        </label>
                        <input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!initialData} className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3 bg-white dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">Status da Conta</label>
                        <div className="relative">
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3 bg-white dark:bg-slate-800 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500 appearance-none text-sm font-bold uppercase"
                            >
                                <option value="ACTIVE">Ativo (Aprovado)</option>
                                <option value="PENDING">Pendente de Aprovação</option>
                                <option value="BLOCKED">Bloqueado</option>
                            </select>
                            <Activity className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 flex justify-between uppercase tracking-widest">
                            <span>Cargo / Função</span>
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Opcional</span>
                        </label>
                        <div className="relative">
                            <select
                                name="jobTitleId"
                                value={formData.jobTitleId}
                                onChange={handleChange}
                                className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3 bg-white dark:bg-slate-800 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500 appearance-none text-sm font-bold pr-10 uppercase"
                            >
                                <option value="">Selecione um Cargo...</option>
                                {jobTitles.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <Briefcase className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">Foto de Perfil (Base64/URL)</label>
                            <input name="photoUrl" value={formData.photoUrl || ''} onChange={handleChange} className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3 bg-white dark:bg-slate-800 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="URL da foto ou base64..." />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">Assinatura Digital (PNG Base64)</label>
                            <input name="signatureUrl" value={formData.signatureUrl || ''} onChange={handleChange} className="block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm border p-3 bg-white dark:bg-slate-800 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Base64 da assinatura..." />
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-1">Termos de Uso e Assinatura</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    {formData.termsAcceptedAt ? (
                                        <>
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Aceito em: {new Date(formData.termsAcceptedAt).toLocaleString('pt-BR')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Pendente de Aceite</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {formData.termsAcceptedAt ? (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, termsAcceptedAt: null }))}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                                    >
                                        Revogar Aceite
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, termsAcceptedAt: new Date().toISOString() }))}
                                        className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/10 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        Marcar como Aceito
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">Nível de Permissão</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            <div
                                onClick={() => setFormData({ ...formData, role: UserRole.OUTROS })}
                                className={`cursor-pointer border rounded-lg p-3 flex flex-col justify-center items-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${formData.role === UserRole.OUTROS ? 'border-slate-500 bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-500' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                <MoreHorizontal className={`w-6 h-6 mb-2 ${formData.role === UserRole.OUTROS ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`} />
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">Nível 1</p>
                            </div>

                            <div
                                onClick={() => setFormData({ ...formData, role: UserRole.RONDA })}
                                className={`cursor-pointer border rounded-lg p-3 flex flex-col justify-center items-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${formData.role === UserRole.RONDA ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                <Eye className={`w-6 h-6 mb-2 ${formData.role === UserRole.RONDA ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">Nível 2</p>
                            </div>

                            <div
                                onClick={() => setFormData({ ...formData, role: UserRole.OPERADOR })}
                                className={`cursor-pointer border rounded-lg p-3 flex flex-col justify-center items-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${formData.role === UserRole.OPERADOR ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 ring-1 ring-brand-500' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                <UserIcon className={`w-6 h-6 mb-2 ${formData.role === UserRole.OPERADOR ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">Nível 3</p>
                            </div>

                            <div
                                onClick={() => setFormData({ ...formData, role: UserRole.SUPERVISOR })}
                                className={`cursor-pointer border rounded-lg p-3 flex flex-col justify-center items-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${formData.role === UserRole.SUPERVISOR ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-500' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                <UserCheck className={`w-6 h-6 mb-2 ${formData.role === UserRole.SUPERVISOR ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">Nível 4</p>
                            </div>

                            <div
                                onClick={() => setFormData({ ...formData, role: UserRole.ADMIN })}
                                className={`cursor-pointer border rounded-lg p-3 flex flex-col justify-center items-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${formData.role === UserRole.ADMIN ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-500' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                <Shield className={`w-6 h-6 mb-2 ${formData.role === UserRole.ADMIN ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">Nível 5</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <div className="w-full sm:w-auto">
                        {initialData && initialData.id && onDelete && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isLoading}
                                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-3 border border-red-200 dark:border-red-800 text-sm font-medium rounded-lg text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors uppercase disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir Usuário
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                        <button type="button" onClick={onCancel} className="w-full sm:w-auto py-3 px-6 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">CANCELAR</button>
                        <button type="submit" disabled={isLoading} className="w-full sm:w-auto inline-flex justify-center py-3 px-8 border border-transparent shadow-lg text-[11px] font-black rounded-xl text-white bg-blue-900 dark:bg-blue-700 hover:bg-blue-800 dark:hover:bg-blue-600 transition-all active:scale-95 uppercase disabled:opacity-70 disabled:cursor-not-allowed">
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {initialData ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR USUÁRIO'}
                        </button>
                    </div>
                </div>
            </form >
        </div >
    );
};
