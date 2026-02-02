
import React, { useState, useMemo, useRef } from 'react';
import { User, JobTitle, UserRole } from '../types';
import {
    User as UserIcon,
    Lock,
    Save,
    Shield,
    CreditCard,
    Mail,
    Key,
    Camera,
    Upload,
    Trash2,
    CheckCircle,
    AlertCircle,
    PenTool,
    ShieldCheck
} from 'lucide-react';

interface ProfileViewProps {
    user: User;
    jobTitles: JobTitle[];
    onUpdatePassword: (currentPass: string, newPass: string) => Promise<void>;
    onUpdateProfile: (updates: Partial<User>) => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, jobTitles, onUpdatePassword, onUpdateProfile }) => {
    const [activeTab, setActiveTab] = useState<'SECURITY' | 'SIGNATURE'>('SECURITY');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSavingPass, setIsSavingPass] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    const userJobTitle = useMemo(() => {
        return jobTitles.find(jt => jt.id === user.jobTitleId)?.name || 'Cargo não definido';
    }, [user.jobTitleId, jobTitles]);

    // Lógica do Medidor de Força da Senha
    const strength = useMemo(() => {
        if (!newPassword) return 0;
        let s = 0;
        if (newPassword.length >= 6) s += 1;
        if (/[A-Z]/.test(newPassword)) s += 1;
        if (/[0-9]/.test(newPassword)) s += 1;
        if (/[^A-Za-z0-9]/.test(newPassword)) s += 1;
        return s;
    }, [newPassword]);

    const strengthLabel = ['Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente'][strength];
    const strengthColor = ['bg-slate-200', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][strength];

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'A nova senha e a confirmação não coincidem.' });
            return;
        }

        if (newPassword.length < 4) {
            setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 4 caracteres.' });
            return;
        }

        setIsSavingPass(true);
        try {
            await onUpdatePassword(currentPassword, newPassword);
            setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Erro ao atualizar senha.' });
        } finally {
            setIsSavingPass(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'signature') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            setIsSavingProfile(true);
            try {
                if (type === 'photo') {
                    await onUpdateProfile({ photoUrl: base64String });
                } else {
                    await onUpdateProfile({ signatureUrl: base64String });
                }
            } catch (err) {
                console.error("Erro ao fazer upload:", err);
            } finally {
                setIsSavingProfile(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const removeImage = async (type: 'photo' | 'signature') => {
        setIsSavingProfile(true);
        try {
            if (type === 'photo') {
                await onUpdateProfile({ photoUrl: '' });
            } else {
                await onUpdateProfile({ signatureUrl: '' });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSavingProfile(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">

            {/* Standardized Header Section */}
            <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        <UserIcon size={22} strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
                            Minha Conta
                        </h2>
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            Gerencie sua identidade, acesso e segurança
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Coluna Esquerda: Perfil e Identidade (Sticky no desktop) */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden relative">
                        {/* Banner Decorativo */}
                        <div className="h-32 bg-gradient-to-br from-brand-600 to-indigo-900 relative">
                            {/* Nível de Acesso em destaque */}
                            <div className="absolute top-4 right-4 group">
                                <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center gap-1.5 shadow-lg group-hover:bg-white/20 transition-all cursor-default">
                                    <ShieldCheck size={12} className="text-white" />
                                    <span className="text-[9px] font-black text-white uppercase tracking-wider">{user.role}</span>
                                </div>
                            </div>
                        </div>

                        {/* Foto de Perfil com Upload */}
                        <div className="px-6 pb-8 text-center -mt-16 relative z-10">
                            <div className="relative inline-block group">
                                <div className="h-32 w-32 rounded-3xl bg-white dark:bg-slate-800 border-[6px] border-white dark:border-slate-900 shadow-2xl flex items-center justify-center overflow-hidden">
                                    {user.photoUrl ? (
                                        <img src={user.photoUrl} alt={user.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                                    ) : (
                                        <UserIcon size={48} className="text-slate-300 dark:text-slate-600" />
                                    )}
                                    {isSavingProfile && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Overlay de Ações na Foto */}
                                <div className="absolute -bottom-2 -right-2 flex gap-1">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xl transition-all active:scale-90"
                                        title="Alterar Foto"
                                    >
                                        <Camera size={16} />
                                    </button>
                                    {user.photoUrl && (
                                        <button
                                            onClick={() => removeImage('photo')}
                                            className="p-2.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl shadow-lg transition-all active:scale-90"
                                            title="Remover Foto"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'photo')} />
                            </div>

                            <div className="mt-4">
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{user.name}</h3>
                                <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mt-1">
                                    {userJobTitle}
                                </p>
                            </div>

                            {/* Badge de Cargo no Rodapé do Nome */}
                            <div className="mt-3 inline-flex px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-wide border border-slate-200 dark:border-slate-700">
                                {user.role === UserRole.ADMIN ? 'Acesso Total' : 'Operacional'}
                            </div>
                        </div>

                        {/* Dados em Lista */}
                        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                    <CreditCard size={14} className="text-slate-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Matrícula</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{user.matricula}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                    <Shield size={14} className="text-slate-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CPF</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{user.cpf}</p>
                                </div>
                            </div>
                            {user.email && (
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                        <Mail size={14} className="text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate" title={user.email}>{user.email}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Tabs de Configuração */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Tab Navigation */}
                    <div className="p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl flex gap-1 border border-slate-200 dark:border-slate-700 w-full md:w-fit">
                        <button
                            onClick={() => setActiveTab('SECURITY')}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'SECURITY' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <Key size={14} /> Segurança
                        </button>
                        <button
                            onClick={() => setActiveTab('SIGNATURE')}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'SIGNATURE' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <PenTool size={14} /> Assinatura
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[480px]">
                        {activeTab === 'SECURITY' ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl">
                                        <Key size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Segurança da Conta</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Altere sua senha de acesso periodicamente</p>
                                    </div>
                                </div>

                                <div className="p-8">
                                    {message && (
                                        <div className={`p-4 rounded-2xl mb-8 flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30' : 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30'}`}>
                                            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                            <p className="text-xs font-black uppercase tracking-tight">{message.text}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handlePasswordSubmit} className="space-y-6">
                                        {/* Senha Atual */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Atual de Acesso</label>
                                            <div className="relative group">
                                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                                <input
                                                    type="password"
                                                    required
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all dark:text-white"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Nova Senha */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Crie uma Nova Senha</label>
                                                <div className="relative group">
                                                    <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                                    <input
                                                        type="password"
                                                        required
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all dark:text-white"
                                                        placeholder="••••••••"
                                                    />
                                                </div>

                                                {/* Medidor de Força */}
                                                {newPassword && (
                                                    <div className="mt-3 px-1 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Nível de Força</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${strength >= 3 ? 'text-emerald-500' : 'text-slate-500'}`}>{strengthLabel}</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                                                            {[...Array(4)].map((_, i) => (
                                                                <div key={i} className={`h-full flex-1 transition-all duration-500 ${i < strength ? strengthColor : 'bg-transparent'}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Confirmar Senha */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Repita a Nova Senha</label>
                                                <div className="relative group">
                                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                                    <input
                                                        type="password"
                                                        required
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all dark:text-white"
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={isSavingPass}
                                                className="w-full md:w-auto px-10 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-500/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                {isSavingPass ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Save size={18} />
                                                )}
                                                {isSavingPass ? 'PROCESSANDO...' : 'ATUALIZAR SENHA'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                                            <PenTool size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Assinatura Digital</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Carregar assinatura em formato PNG transparente</p>
                                        </div>
                                    </div>
                                    {user.signatureUrl && (
                                        <button
                                            onClick={() => removeImage('signature')}
                                            className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors active:scale-90"
                                            title="Remover Assinatura"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>

                                <div className="p-8">
                                    <div
                                        onClick={() => signatureInputRef.current?.click()}
                                        className={`
                                            relative min-h-[200px] w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group
                                            ${user.signatureUrl ? 'border-brand-200 bg-brand-50/10 dark:border-brand-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                                        `}
                                    >
                                        {user.signatureUrl ? (
                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-inner border border-slate-100 dark:border-slate-800 max-w-[80%]">
                                                <img src={user.signatureUrl} alt="Assinatura" className="max-h-40 object-contain drop-shadow-md" />
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform group-hover:bg-brand-50 dark:group-hover:bg-brand-900/30">
                                                    <Upload size={32} className="text-slate-400 group-hover:text-brand-500 transition-colors" />
                                                </div>
                                                <span className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Clique para buscar PNG</span>
                                                <p className="text-xs text-slate-400 font-bold uppercase mt-2">Recomendado: Fundo Transparente</p>
                                            </div>
                                        )}
                                        <input type="file" ref={signatureInputRef} className="hidden" accept="image/png" onChange={(e) => handleImageUpload(e, 'signature')} />

                                        {isSavingProfile && (
                                            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-20">
                                                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-8 p-4 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide leading-relaxed text-center">
                                            Sua assinatura será utilizada para assinar automaticamente os relatórios em PDF gerados pelo sistema Vigilante Municipal.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
