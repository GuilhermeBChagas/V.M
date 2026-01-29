
import React, { useRef, useState } from 'react';
import { Incident, Building, User } from '../types';
import { ArrowLeft, Pencil, CheckCircle, XCircle, Download, Loader2, Ban, ShieldCheck, Printer } from 'lucide-react';

declare var html2pdf: any;

interface IncidentDetailProps {
    incident: Incident;
    building: Building | undefined;
    author: User | undefined;
    onBack: () => void;
    onDelete?: (id: string) => void;
    // Permissões explícitas em vez de userRole
    canEdit?: boolean;
    canDelete?: boolean;
    canApprove?: boolean;
    onApprove?: (id: string) => void;
    onEdit?: () => void;
    customLogo?: string | null; // Logo Direita (GCM)
    customLogoLeft?: string | null; // Logo Esquerda (Muni)
}

export const IncidentDetail: React.FC<IncidentDetailProps> = ({
    incident, building, author, onBack, onDelete,
    canEdit = false, canDelete = false, canApprove = false,
    onApprove, onEdit, customLogo, customLogoLeft
}) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    // Determina se exibe a barra de ferramentas (se tiver pelo menos uma permissão)
    const showToolbar = canEdit || canDelete || canApprove;
    const isPending = incident.status === 'PENDING';
    const isCancelled = incident.status === 'CANCELLED';

    const handleExportPDF = () => {
        if (!contentRef.current || typeof html2pdf === 'undefined') { handlePrint(); return; }
        setIsExporting(true);

        const element = contentRef.current;

        const opt = {
            margin: [5, 5, 5, 5],
            filename: `RA_${incident.raCode.replace('/', '-')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            setIsExporting(false);
        });
    };

    // Função para imprimir exatamente o mesmo layout do PDF
    const handlePrint = () => {
        if (!contentRef.current) { window.print(); return; }

        const element = contentRef.current;

        // Criar janela de impressão
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) { window.print(); return; }

        // Obter todos os stylesheets da página atual
        let styles = '';
        try {
            styles = Array.from(document.styleSheets)
                .map(sheet => {
                    try {
                        return Array.from(sheet.cssRules).map(rule => rule.cssText).join('');
                    } catch (e) {
                        return '';
                    }
                })
                .join('');
        } catch (e) {
            console.log('Não foi possível copiar estilos');
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>RA ${incident.raCode}</title>
                    <style>
                        ${styles}
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        @page { size: A4; margin: 8mm; }
                        @media print {
                            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                            .no-print { display: none !important; }
                        }
                        body { 
                            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; 
                            background: white; 
                            color: black;
                            padding: 0;
                            margin: 0;
                        }
                        .print-wrapper {
                            width: 100%;
                            max-width: 210mm;
                            margin: 0 auto;
                            padding: 5mm;
                            background: white;
                        }
                    </style>
                </head>
                <body>
                    <div class="print-wrapper">${element.outerHTML}</div>
                </body>
            </html>
        `);
        printWindow.document.close();

        // Aguardar carregamento e imprimir
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 300);
        };
    };

    const handleApprove = async () => {
        if (!onApprove) return;
        setIsValidating(true);
        try {
            await onApprove(incident.id);
        } catch (err: any) {
            console.error("Erro interno no botão de aprovação:", err);
        } finally {
            setIsValidating(false);
        }
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(incident.id);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-10 px-0 md:px-4">
            {/* --- BARRA DE CONTROLE (TELA - NÃO IMPRIME) --- */}
            {showToolbar && (
                <div className={`mb-6 p-4 rounded-xl border-2 flex flex-col sm:flex-row justify-between items-center no-print shadow-sm gap-4 ${isCancelled ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : isPending ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${isCancelled ? 'bg-red-100' : isPending ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            {isCancelled ? <Ban className="text-red-600" /> : <ShieldCheck className={isPending ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'} />}
                        </div>
                        <div>
                            <p className="font-black uppercase text-[10px] md:text-xs text-slate-800 dark:text-slate-200">{isCancelled ? 'REGISTRO CANCELADO' : isPending ? 'VALIDAR DOCUMENTO RA ' + incident.raCode : 'GERENCIAR REGISTRO PUBLICADO'}</p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">{isCancelled ? 'ESTE DOCUMENTO NÃO POSSUI VALIDADE LEGAL' : isPending ? 'REVISE OS DADOS ANTES DE CARIMBAR' : 'DOCUMENTO OFICIAL VALIDADADO E CARIMBADO'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto justify-end">
                        {!isCancelled && (
                            <>
                                {canDelete && (
                                    <button
                                        onClick={handleDelete}
                                        className="col-span-1 sm:flex-none px-2 sm:px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 font-black text-[10px] uppercase shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                                    >
                                        <XCircle size={14} className="flex-shrink-0" />
                                        <span>CANCELAR</span>
                                    </button>
                                )}
                                {canEdit && (
                                    <button
                                        onClick={onEdit}
                                        disabled={isValidating}
                                        className="col-span-1 sm:flex-none px-2 sm:px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-black text-[10px] uppercase shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 whitespace-nowrap transition-colors"
                                    >
                                        <Pencil size={14} className="flex-shrink-0" />
                                        <span>EDITAR</span>
                                    </button>
                                )}
                            </>
                        )}
                        {isPending && !isCancelled && canApprove && (
                            <button
                                onClick={handleApprove}
                                disabled={isValidating}
                                className="col-span-2 sm:col-span-1 px-3 py-2 bg-blue-900 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-800 dark:hover:bg-blue-600 font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 transition-all active:scale-95 whitespace-nowrap"
                            >
                                {isValidating ? <Loader2 size={14} className="animate-spin flex-shrink-0" /> : <CheckCircle size={14} className="flex-shrink-0" />}
                                {isValidating ? 'VALIDANDO...' : 'VALIDAR'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6 no-print px-4 md:px-0">
                <button onClick={onBack} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-black text-[10px] uppercase flex items-center gap-1">
                    <ArrowLeft size={16} /> VOLTAR
                </button>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md font-black text-[10px] md:text-xs uppercase flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-colors">
                        <Printer size={16} /> <span className="hidden sm:inline">IMPRIMIR</span>
                    </button>
                    <button onClick={handleExportPDF} disabled={isExporting} className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-md font-black text-[10px] md:text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
                        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} <span className="hidden sm:inline">{isExporting ? 'PROCESSANDO' : 'GERAR PDF'}</span>
                    </button>
                </div>
            </div>

            {/* --- ÁREA DE IMPRESSÃO / RELATÓRIO (FOLHA A4) --- */}
            <div className="w-full overflow-x-auto md:overflow-x-visible pb-6">
                <div ref={contentRef} className={`bg-white text-black shadow-2xl relative flex flex-col mx-auto w-full min-w-[320px] md:max-w-[210mm] min-h-[280mm] p-4 md:p-10 transition-colors ${isCancelled ? 'grayscale opacity-75' : ''}`}>

                    {/* CABEÇALHO - BRASÕES MAIS PRÓXIMOS DAS ESCRITAS */}
                    <div className="flex justify-center items-center mb-1 pb-4 gap-4 md:gap-12">
                        {/* Logo Esquerda (Muni) */}
                        <div className="w-12 h-12 md:w-20 md:h-20 flex-shrink-0 flex items-center justify-center">
                            {customLogoLeft ? (
                                <img src={customLogoLeft} className="max-h-full max-w-full object-contain" alt="Brasão Muni" />
                            ) : (
                                <div className="w-10 h-10 md:w-16 md:h-16 rounded-full border border-slate-800 flex items-center justify-center bg-slate-50 shadow-sm">
                                    <span className="text-[5px] md:text-[7px] font-black uppercase text-center text-slate-400">BRASÃO<br />MUNI</span>
                                </div>
                            )}
                        </div>

                        {/* Texto Central conforme imagem */}
                        <div className="text-center min-w-0 max-w-[60%]">
                            <h1 className="text-[10px] md:text-[14px] font-black uppercase text-slate-900 leading-tight tracking-tight whitespace-nowrap">
                                PREFEITURA MUNICIPAL DE ARAPONGAS
                            </h1>
                            <h2 className="text-[8px] md:text-[12px] font-black uppercase text-slate-900 tracking-wide mt-0.5 md:mt-1">
                                SECRETARIA MUNICIPAL DE SEGURANÇA PÚBLICA E TRÂNSITO
                            </h2>
                            <h3 className="text-[7px] md:text-[10px] font-bold uppercase text-blue-600 mt-0.5 tracking-wider">
                                CENTRO DE MONITORAMENTO MUNICIPAL
                            </h3>
                        </div>

                        {/* Logo Direita (GCM) */}
                        <div className="w-12 h-12 md:w-20 md:h-20 flex-shrink-0 flex items-center justify-center">
                            {customLogo ? (
                                <img src={customLogo} className="max-h-full max-w-full object-contain" alt="Brasão GCM" />
                            ) : (
                                <div className="w-10 h-10 md:w-16 md:h-16 rounded-full border border-slate-800 flex items-center justify-center bg-slate-50 shadow-sm">
                                    <span className="text-[5px] md:text-[7px] font-black uppercase text-center text-slate-400">BRASÃO<br />GCM</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* LINHA DE DIVISÃO SUPERIOR (AZUL) */}
                    <div style={{ width: '100%', height: '1px', background: '#1e3a5f', marginBottom: '6px' }}></div>

                    {/* TÍTULO COM LINHAS LATERAIS */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <div style={{ flex: '1', height: '1px', background: 'rgba(30, 58, 95, 0.3)' }}></div>
                        <h2 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: '#1e3a5f', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>
                            REGISTRO DE ATENDIMENTO
                        </h2>
                        <div style={{ flex: '1', height: '1px', background: 'rgba(30, 58, 95, 0.3)' }}></div>
                    </div>

                    {/* LINHA DE DIVISÃO INFERIOR (AZUL) */}
                    <div style={{ width: '100%', height: '1px', background: '#1e3a5f', marginBottom: '12px' }}></div>

                    {/* TABELA DE DADOS - MINIMALISTA */}
                    <div style={{ border: '1px solid #334155', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>

                        {/* LINHA 1: RA e NATUREZA */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
                            <div style={{ width: '90px', background: '#1e3a5f', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid #334155' }}>
                                <span style={{ fontSize: '7px', fontWeight: '600', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em' }}>R.A</span>
                                <span style={{ fontSize: '16px', fontWeight: '800', color: 'white', lineHeight: '1' }}>{incident.raCode}</span>
                            </div>
                            <div style={{ flex: '1', padding: '8px 10px', background: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <span style={{ fontSize: '7px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px' }}>NATUREZA</span>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase' }}>{incident.alterationType}</span>
                            </div>
                        </div>

                        {/* LINHA 2: DATA, HORÁRIOS e LOCAL */}
                        <div style={{ display: 'grid', gridTemplateColumns: '75px 60px 60px 1fr', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px' }}>DATA</span>
                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#0f172a' }}>{new Date(incident.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px' }}>INÍCIO</span>
                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#0f172a' }}>{incident.startTime}</span>
                            </div>
                            <div style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px' }}>TÉRMINO</span>
                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#0f172a' }}>{incident.endTime || '--:--'}</span>
                            </div>
                            <div style={{ padding: '5px 8px', background: '#eff6ff' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#1e40af', textTransform: 'uppercase', marginBottom: '1px' }}>LOCAL</span>
                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#1e3a5f', textTransform: 'uppercase' }}>{building?.name || '---'}</span>
                            </div>
                        </div>

                        {/* LINHA 3: ENDEREÇO */}
                        <div style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>ENDEREÇO:</span>
                            <span style={{ fontSize: '9px', fontWeight: '500', color: '#334155', textTransform: 'uppercase' }}>{building?.address || '---'}</span>
                        </div>

                        {/* LINHA 4: RESPONSÁVEIS */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.7fr', background: '#f8fafc' }}>
                            <div style={{ padding: '4px 8px', borderRight: '1px solid #e2e8f0' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px' }}>RESPONSÁVEL</span>
                                <span style={{ display: 'block', fontSize: '9px', fontWeight: '600', color: '#0f172a', textTransform: 'uppercase' }}>{building?.managerName || '---'}</span>
                            </div>
                            <div style={{ padding: '4px 8px', borderRight: '1px solid #e2e8f0' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px' }}>CONTATO</span>
                                <span style={{ display: 'block', fontSize: '9px', fontWeight: '600', color: '#0f172a', textTransform: 'uppercase' }}>{building?.managerPhone || '---'}</span>
                            </div>
                            <div style={{ padding: '4px 8px', borderRight: '1px solid #e2e8f0' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px' }}>CARGO</span>
                                <span style={{ display: 'block', fontSize: '9px', fontWeight: '600', color: '#0f172a', textTransform: 'uppercase' }}>---</span>
                            </div>
                            <div style={{ padding: '4px 8px' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px' }}>DOC</span>
                                <span style={{ display: 'block', fontSize: '9px', fontWeight: '600', color: '#0f172a', textTransform: 'uppercase' }}>---</span>
                            </div>
                        </div>
                    </div>

                    {/* TÍTULO DO RELATO */}
                    <div className="text-center mb-4 relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300"></div></div>
                        <h3 className="relative bg-white px-6 text-[11px] md:text-[14px] font-black uppercase text-blue-900 inline-block font-serif tracking-[0.3em]">
                            RELATO
                        </h3>
                    </div>

                    {/* CORPO DO TEXTO */}
                    <div className="text-justify text-[11px] md:text-[13px] leading-relaxed font-serif uppercase mb-8 whitespace-pre-wrap px-2 min-h-[6rem] text-slate-900">
                        {incident.description}
                    </div>

                    {/* FOTOS */}
                    {incident.photos && incident.photos.length > 0 && (
                        <div className="mb-8 break-inside-avoid">
                            <div className="grid grid-cols-5 gap-2 md:gap-4 justify-center">
                                {incident.photos.map((p, idx) => (
                                    <div key={idx} className="flex flex-col items-center">
                                        <div className="border border-slate-400 p-1 bg-white shadow-sm w-full aspect-[3/4] flex items-center justify-center overflow-hidden rounded-sm">
                                            <img
                                                src={p}
                                                className="w-full h-full object-cover"
                                                alt={`Evidência ${idx + 1}`}
                                            />
                                        </div>
                                        <span className="text-[6px] md:text-[8px] uppercase font-black text-slate-500 mt-1.5">FOTO {idx + 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* RODAPÉ E ASSINATURAS */}
                    <div className="mt-auto pt-6 break-inside-avoid w-full border-t-2 border-slate-100">
                        <div className="grid grid-cols-2 gap-6 md:gap-12 items-end">
                            {/* Assinatura Vigilante */}
                            <div className="min-w-0">
                                <div className="text-[7px] md:text-[9px] font-black uppercase text-slate-800 mb-2 tracking-wider">AGENTE(S) RESPONSÁVEL(IS):</div>
                                <div className="border-b-2 border-slate-400 text-[10px] md:text-[12px] uppercase px-1 py-2 bg-slate-50/50 min-h-[40px] leading-tight font-bold italic">
                                    {incident.vigilants}
                                </div>
                            </div>

                            {/* Validação Supervisor */}
                            <div className="min-w-0">
                                {incident.approvedBy ? (
                                    <div className="border-2 border-slate-900 p-3 relative bg-slate-50 min-w-full rounded-sm shadow-sm">
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-3 py-0.5 text-[6px] md:text-[8px] font-black uppercase text-slate-900 tracking-widest border border-slate-900 leading-none whitespace-nowrap">
                                            AUTORIDADE VALIDANTE
                                        </div>
                                        <div className="flex flex-col items-center justify-center gap-1 pt-2">
                                            <div className="text-center">
                                                <span className="text-[10px] md:text-[14px] font-black text-slate-900 uppercase leading-none block scale-y-110 truncate max-w-full mb-1">{incident.approvedBy}</span>
                                            </div>
                                            <div className="w-full border-t border-slate-400 mt-1 pt-2 flex flex-col items-center">
                                                <span className="text-[6px] md:text-[7px] font-bold uppercase text-slate-600 tracking-widest flex items-center gap-1">
                                                    <ShieldCheck size={8} className="text-blue-900" /> CERTIFICADO DIGITALMENTE
                                                </span>
                                                <span className="text-[7px] md:text-[9px] font-mono font-black text-slate-800 mt-0.5">
                                                    DATA: {new Date(incident.approvedAt!).toLocaleDateString('pt-BR')} ÀS {new Date(incident.approvedAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-slate-300 p-6 text-center bg-slate-50/30 rounded-sm">
                                        <span className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">AGUARDANDO VALIDAÇÃO</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-2 flex justify-between text-[6px] md:text-[8px] text-slate-400 uppercase font-bold border-t border-slate-100">
                            <span>CENTRO DE MONITORAMENTO - S.M.S.P.T</span>
                            <span className="tracking-widest">IMPRESSO EM {new Date().toLocaleDateString('pt-BR')} ÀS {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>

                    {/* MARCA D'ÁGUA SE CANCELADO */}
                    {isCancelled && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10">
                            <span className="text-[60px] md:text-[120px] font-black text-red-600 transform -rotate-45 border-8 md:border-[16px] border-red-600 p-6 md:p-12 rounded-3xl">CANCELADO</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
