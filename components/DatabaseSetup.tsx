import React, { useState, useEffect } from 'react';
import { Database, X, CheckCircle, Server, AlertCircle, RefreshCw, Loader2, Cloud } from 'lucide-react';
import { checkSupabaseConnection } from '../services/supabaseClient';

interface DatabaseSetupProps {
    onClose?: () => void;
    mode?: 'modal' | 'inline';
    onSync?: () => Promise<void>;
    unsyncedCount?: number;
}

export const DatabaseSetup: React.FC<DatabaseSetupProps> = ({ onClose, mode = 'modal', onSync, unsyncedCount = 0 }) => {
    const [status, setStatus] = useState<{ loading: boolean; success: boolean; message: string; code?: string }>({
        loading: true,
        success: false,
        message: ''
    });
    const [isSyncing, setIsSyncing] = useState(false);

    const checkConnection = async () => {
        setStatus(prev => ({ ...prev, loading: true }));
        const result = await checkSupabaseConnection();
        setStatus({
            loading: false,
            success: result.success,
            message: result.message,
            code: result.code
        });
    };

    const handleForceSync = async () => {
        if (!onSync) return;
        setIsSyncing(true);
        try {
            await onSync();
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        checkConnection();
    }, []);

    const Content = () => {
        if (status.loading) {
            return (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="text-blue-600 animate-spin" size={48} />
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Verificando Conexão...</p>
                </div>
            );
        }

        return (
            <div className="space-y-6 animate-fade-in">
                <div className={`${status.success ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'} border p-6 rounded-xl flex items-center gap-4`}>
                    <div className={`${status.success ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50'} p-3 rounded-full`}>
                        {status.success ? (
                            <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={32} />
                        ) : (
                            <AlertCircle className="text-red-600 dark:text-red-400" size={32} />
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className={`text-lg font-black uppercase ${status.success ? 'text-emerald-900 dark:text-emerald-300' : 'text-red-900 dark:text-red-300'}`}>
                            {status.success ? 'Sistema Conectado' : 'Falha na Conexão'}
                        </h3>
                        <p className={`text-sm font-medium mt-1 ${status.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                            {status.message}
                        </p>
                    </div>
                    <button
                        onClick={checkConnection}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                        title="Recarregar"
                    >
                        <RefreshCw size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-opacity duration-300" style={{ opacity: status.success ? 1 : 0.5 }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Server className="text-blue-600" size={20} />
                            <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Integridade</h4>
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {status.success ? (status.code === 'NO_TABLES' ? 'Tabelas Inexistentes' : 'Estrutura de tabelas verificada') : 'Indisponível'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {status.success ? (status.code === 'NO_TABLES' ? 'O banco está acessível, mas as tabelas ainda não foram criadas.' : 'Tabelas de Ocorrências, Usuários e Ativos estão sincronizadas.') : 'Conecte-se ao banco para verificar.'}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-opacity duration-300" style={{ opacity: status.success ? 1 : 0.5 }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Database className="text-blue-600" size={20} />
                            <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Sincronização</h4>
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {unsyncedCount > 0 ? `${unsyncedCount} Registros Pendentes` : 'Tudo Sincronizado'}
                        </p>
                        <button
                            onClick={handleForceSync}
                            disabled={!onSync || unsyncedCount === 0 || isSyncing}
                            className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all"
                        >
                            {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <Cloud className="text-white" size={12} />}
                            Forçar Sincronização
                        </button>
                    </div>
                </div>

                <div className="text-center pt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Para manutenção avançada ou execução de scripts SQL, acesse o painel administrativo do Supabase.
                    </p>
                </div>
            </div>
        );
    };

    if (mode === 'inline') {
        return <Content />;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg"><Database className="text-white w-6 h-6" /></div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Banco de Dados</h2>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status do Sistema</p>
                        </div>
                    </div>
                    {onClose && <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>}
                </div>
                <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-slate-50 dark:bg-slate-900">
                    <Content />
                </div>
            </div>
        </div>
    );
};