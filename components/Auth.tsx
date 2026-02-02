import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { User as UserIcon, Lock, Sun, Moon, Shield, Loader2, AlertCircle, CheckCircle, ArrowRight, Mail, Eye, EyeOff } from 'lucide-react';
import { isSupabaseConfigured, checkSupabaseConnection } from '../services/supabaseClient';

interface AuthProps {
   onLogin: (identifier: string, password: string) => Promise<void>;
   onRegister: (userData: Omit<User, 'id'>) => void;
   darkMode: boolean;
   onToggleDarkMode: () => void;
   isLoading?: boolean;
   onShowSetup?: () => void;
   customLogo?: string | null;
   systemVersion?: string;
   users?: User[];
   isLocalMode?: boolean;
   onToggleLocalMode?: (enabled: boolean) => void;
   unsyncedCount?: number;
   onSync?: () => Promise<void>;
}

export const Auth: React.FC<AuthProps> = ({
   onLogin, onRegister, darkMode, onToggleDarkMode, isLoading,
   customLogo, systemVersion, users = [],
   isLocalMode, onToggleLocalMode, unsyncedCount, onSync
}) => {
   const [isLogin, setIsLogin] = useState(true);
   const [loginIdentifier, setLoginIdentifier] = useState('');
   const [loginPassword, setLoginPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [rememberMe, setRememberMe] = useState(false);
   const [loginError, setLoginError] = useState<string | null>(null);
   const [identifiedUser, setIdentifiedUser] = useState<User | null>(null);
   const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string; code?: string } | null>(null);
   const [isCheckingConnection, setIsCheckingConnection] = useState(false);

   // Registration States
   const [regName, setRegName] = useState('');
   const [regCpf, setRegCpf] = useState('');
   const [regMatricula, setRegMatricula] = useState('');
   const [regEmail, setRegEmail] = useState('');
   const [regPassword, setRegPassword] = useState('');

   useEffect(() => {
      const savedIdentifier = localStorage.getItem('vigilante_saved_id');
      const savedPwd = localStorage.getItem('vigilante_saved_pwd');

      if (savedIdentifier) {
         setLoginIdentifier(savedIdentifier);
         if (savedPwd) {
            try {
               setLoginPassword(atob(savedPwd));
            } catch (e) { /* Ignore invalid base64 */ }
         }
         setRememberMe(true);
      }
      if (isSupabaseConfigured) {
         setIsCheckingConnection(true);
         checkSupabaseConnection().then(status => {
            setConnectionStatus(status);
            setIsCheckingConnection(false);
         });
      }
   }, []);

   useEffect(() => {
      if (!loginIdentifier || users.length === 0) {
         setIdentifiedUser(null);
         return;
      }

      const val = loginIdentifier.trim();
      const found = users.find(u => u.userCode === val || u.cpf === val || u.matricula === val || u.email === val);
      setIdentifiedUser(found || null);
   }, [loginIdentifier, users]);

   const maskCPF = (value: string) => {
      return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
   };

   const handleLoginIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (/^\d{3}/.test(val) || val.length > 3) {
         if (/^\d/.test(val) && val.length > 2 && val.length <= 14) val = maskCPF(val);
      }
      setLoginIdentifier(val);
   };

   const handleRegCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setRegCpf(maskCPF(e.target.value));
   }

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError(null);
      if (isLoading) return;

      if (connectionStatus && !connectionStatus.success && connectionStatus.code !== 'NO_TABLES') {
         setLoginError(`Erro de Conexão: ${connectionStatus.message}`);
         return;
      }

      if (isLogin) {
         if (rememberMe) {
            localStorage.setItem('vigilante_saved_id', loginIdentifier);
            // Basic obfuscation for UX convenience (Note: Not secure for high-value targets)
            localStorage.setItem('vigilante_saved_pwd', btoa(loginPassword));
         } else {
            localStorage.removeItem('vigilante_saved_id');
            localStorage.removeItem('vigilante_saved_pwd');
         }
         try {
            await onLogin(loginIdentifier, loginPassword);
         } catch (err: any) {
            setLoginError(err.message || 'Falha na autenticação.');
         }
      } else {
         if (!regName || !regPassword) { setLoginError("Nome e Senha são obrigatórios."); return; }
         const newUser: Omit<User, 'id'> = { name: regName, cpf: regCpf, matricula: regMatricula, email: regEmail || '', role: UserRole.OPERADOR, passwordHash: regPassword };
         onRegister(newUser);
      }
   };

   return (
      <div className="min-h-screen relative flex items-center justify-center bg-[#0d1b2a] overflow-hidden font-sans transition-colors duration-500">

         {/* Advanced Animated Gradient Background */}
         <div className="absolute inset-0 overflow-hidden z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/40 blur-[120px]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#0d1b2a_100%)]"></div>
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
         </div>

         {/* Floating Dark Mode Toggle */}
         <div className="absolute top-6 right-6 z-50">
            <button
               onClick={onToggleDarkMode}
               className="p-3 rounded-full bg-white/5 dark:bg-slate-800/20 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:scale-110 transition-all shadow-xl active:scale-95"
            >
               {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
         </div>

         {/* Main Login Container */}
         <div className="relative z-10 w-full max-w-[380px] px-6 py-4 md:py-8 animate-in fade-in zoom-in-95 duration-700">

            {/* Logo and branding area */}
            <div className="flex flex-col items-center mb-4 md:mb-6 text-center">
               <div className="relative group mb-4 md:mb-6">
                  <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full group-hover:bg-blue-400/30 transition-all duration-500"></div>
                  <div className="relative w-20 h-20 md:w-28 md:h-28 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                     {customLogo ? (
                        <img src={customLogo} className="w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" alt="Logo" />
                     ) : (
                        <Shield size={50} strokeWidth={1} className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] md:hidden" />
                     )}
                     <Shield size={80} strokeWidth={1} className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] hidden md:block" />
                  </div>
               </div>

               <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase mb-1">
                  Vigilante Municipal
               </h1>

               <div className="flex items-center gap-3 w-full px-4 text-center justify-center opacity-60">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-blue-300/30"></div>
                  <span className="text-[10px] font-bold text-blue-100 uppercase tracking-[0.3em] whitespace-nowrap">Gestão de Alterações</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-blue-300/30"></div>
               </div>
            </div>

            {/* Glassmorphism Auth Card */}
            <div className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] md:rounded-[2rem] overflow-hidden transform transition-all">

               <div className="p-5 md:p-8">
                  {/* Status Indicator for identified users */}
                  {identifiedUser && isLogin && (
                     <div className="mb-4 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                           <CheckCircle size={14} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-tight">Identificado</span>
                           <span className="text-xs font-bold text-white uppercase leading-tight">{identifiedUser.name.split(' ')[0]}</span>
                        </div>
                     </div>
                  )}

                  {/* Error Messages */}
                  {loginError && (
                     <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3 items-start animate-in slide-in-from-left-2">
                        <AlertCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={18} />
                        <div className="flex-1">
                           <p className="text-[10px] font-black text-rose-500 uppercase">Atenção</p>
                           <p className="text-xs text-rose-200/80 font-medium mt-0.5">{loginError}</p>
                        </div>
                     </div>
                  )}

                  <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                     {isLogin ? (
                        <>
                           {/* Credential Access */}
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-2">Identificação</label>
                              <div className="relative group">
                                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                    <UserIcon size={18} strokeWidth={2} />
                                 </div>
                                 <input
                                    type="text"
                                    required
                                    disabled={isLoading || isCheckingConnection}
                                    value={loginIdentifier}
                                    onChange={handleLoginIdentifierChange}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-black/30 border border-white/5 rounded-xl text-sm font-bold text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
                                    placeholder="CPF, Email ou Matrícula"
                                 />
                              </div>
                           </div>

                           {/* Password Field with reveal toggle */}
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-2">Senha de Acesso</label>
                              <div className="relative group">
                                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                    <Lock size={18} strokeWidth={2} />
                                 </div>
                                 <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    disabled={isLoading || isCheckingConnection}
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    className="block w-full pl-11 pr-12 py-3.5 bg-black/30 border border-white/5 rounded-xl text-sm font-bold text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
                                    placeholder="••••••••"
                                 />
                                 <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
                                 >
                                    {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                                 </button>
                              </div>
                           </div>

                           {/* Modern Switch for Remember Me */}
                           <div className="flex items-center justify-between px-2 pt-1">
                              <div
                                 className="flex items-center cursor-pointer group select-none"
                                 onClick={() => !isLoading && setRememberMe(!rememberMe)}
                              >
                                 <div className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${rememberMe ? 'bg-blue-600' : 'bg-white/10'}`}>
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${rememberMe ? 'translate-x-4' : 'translate-x-0'}`} />
                                 </div>
                                 <span className="ml-3 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">Lembrar Acesso</span>
                              </div>
                           </div>
                        </>
                     ) : (
                        /* Modern Registration Fields */
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-10 duration-500">
                           <div className="space-y-4">
                              <div className="relative">
                                 <UserIcon className="absolute left-4 top-3 text-slate-500" size={18} />
                                 <input type="text" required disabled={isLoading} value={regName} onChange={e => setRegName(e.target.value)} className="w-full pl-12 py-3 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="Nome Completo" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <input type="text" disabled={isLoading} value={regCpf} onChange={handleRegCpfChange} maxLength={14} className="w-full p-3 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white text-center outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="CPF" />
                                 <input type="text" disabled={isLoading} value={regMatricula} onChange={e => setRegMatricula(e.target.value)} className="w-full p-3 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white text-center outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="Matrícula" />
                              </div>
                              <div className="relative">
                                 <Mail className="absolute left-4 top-3 text-slate-500" size={18} />
                                 <input type="email" disabled={isLoading} value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full pl-12 py-3 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="E-mail (Institucional)" />
                              </div>
                              <div className="relative">
                                 <Lock className="absolute left-4 top-3 text-slate-500" size={18} />
                                 <input type="password" required disabled={isLoading} value={regPassword} onChange={e => setRegPassword(e.target.value)} className="w-full pl-12 py-3 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="Criar Senha Forte" />
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Primary Action Button */}
                     <button
                        type="submit"
                        disabled={isLoading || isCheckingConnection}
                        className="w-full group relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        <div className="relative z-10 flex items-center justify-center gap-2">
                           {isLoading || isCheckingConnection ? (
                              <>
                                 <Loader2 className="animate-spin" size={18} />
                                 <span className="text-xs font-black uppercase tracking-[0.2em]">{isCheckingConnection ? 'Conectando...' : 'Autenticando...'}</span>
                              </>
                           ) : (
                              <>
                                 <span className="text-xs font-black uppercase tracking-[0.2em]">{isLogin ? 'Entrar no Sistema' : 'Finalizar Cadastro'}</span>
                                 <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-300" />
                              </>
                           )}
                        </div>
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                     </button>
                  </form>

                  {/* Card Footer Integration */}
                  <div className="mt-6 md:mt-10 text-center">
                     <button
                        type="button"
                        onClick={() => { setIsLogin(!isLogin); setLoginError(null); }}
                        className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-all"
                     >
                        {isLogin ? 'Não possui conta ativa? ' : 'Já possui credenciais? '}
                        <span className="text-blue-400 font-black underline underline-offset-4 decoration-2">
                           {isLogin ? 'Criar Nova Conta' : 'Acessar Painel'}
                        </span>
                     </button>
                  </div>
               </div>
            </div>

            {/* External Page Footer */}
            <div className="mt-4 md:mt-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">
                  Sistema Integrado de Segurança e Vigilância Municipal
               </p>
               {systemVersion && (
                  <p className="text-[8px] font-mono font-medium text-slate-600 mt-1 opacity-50">
                     Internal Build: {systemVersion || '1.0.4'}
                  </p>
               )}
            </div>
         </div>
      </div>
   );
};