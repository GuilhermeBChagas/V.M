
import React, { useRef, useState, useEffect } from 'react';
import { Incident, Building, User } from '../types';
import { ArrowLeft, Pencil, CheckCircle, XCircle, Download, Loader2, Ban, ShieldCheck, Printer, WifiOff, Share2, Settings } from 'lucide-react';
import { formatDateBR } from '../utils/dateUtils';

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
    approverRole?: string;
    approverJobTitle?: string;
    currentUser?: User;
}

export const IncidentDetail: React.FC<IncidentDetailProps> = ({
    incident, building, author, onBack, onDelete,
    canEdit = false, canDelete = false, canApprove = false,
    onApprove, onEdit, customLogo, customLogoLeft, approverRole, approverJobTitle, currentUser
}) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [pdfMargins, setPdfMargins] = useState(() => {
        const saved = localStorage.getItem('app_pdf_margins_detail');
        return saved ? JSON.parse(saved) : { top: 5, right: 5, bottom: 5, left: 5 };
    });

    useEffect(() => {
        localStorage.setItem('app_pdf_margins_detail', JSON.stringify(pdfMargins));
    }, [pdfMargins]);

    const [showMarginSettings, setShowMarginSettings] = useState(false);

    // Determina se exibe a barra de ferramentas (se tiver pelo menos uma permissão)
    const showToolbar = canEdit || canDelete || canApprove;
    const isPending = incident.status === 'PENDING';
    const isCancelled = incident.status === 'CANCELLED';

    const handleExportPDF = () => {
        if (!contentRef.current || typeof html2pdf === 'undefined') { handlePrint(); return; }
        setIsExporting(true);

        const element = contentRef.current;

        const opt = {
            margin: [pdfMargins.top, pdfMargins.left, pdfMargins.bottom, pdfMargins.right],
            filename: `RA_${incident.raCode.replace('/', '-')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                scrollY: 0,
                // Remove visual padding before capturing for PDF to avoid double margins
                onclone: (doc: Document) => {
                    const el = doc.getElementById('incident-detail-report');
                    if (el) {
                        el.style.padding = '0px';
                        // Maintain the width constraints in the clone if necessary or let margins handle it
                    }
                }
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            setIsExporting(false);
        });
    };

    const handleShareImage = async () => {
        if (!contentRef.current || typeof html2pdf === 'undefined') return;
        setIsSharing(true);
        try {
            const element = contentRef.current;
            // Captura o elemento como canvas usando o motor do html2pdf
            html2pdf().set({
                margin: [pdfMargins.top, pdfMargins.left, pdfMargins.bottom, pdfMargins.right],
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 3, useCORS: true, scrollY: 0 }
            }).from(element).toCanvas().get('canvas').then((canvas: HTMLCanvasElement) => {
                canvas.toBlob(async (blob: Blob | null) => {
                    if (!blob) {
                        setIsSharing(false);
                        return;
                    }

                    const fileName = `RA_${incident.raCode.replace('/', '-')}.jpg`;
                    const file = new File([blob], fileName, { type: 'image/jpeg' });

                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                files: [file],
                                title: `Registro de Atendimento ${incident.raCode}`,
                                text: `Segue o Registro de Atendimento ${incident.raCode} em anexo.`
                            });
                        } catch (err) {
                            console.error("Erro ao compartilhar:", err);
                        }
                    } else {
                        // Fallback: download se não suportar share
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = fileName;
                        link.click();
                        URL.revokeObjectURL(link.href);
                    }
                    setIsSharing(false);
                }, 'image/jpeg', 0.95);
            });
        } catch (err) {
            console.error("Erro ao gerar imagem para compartilhamento:", err);
            setIsSharing(false);
        }
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
                        @page { size: A4; margin: 0mm; }
                        @media print {
                            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                            .no-print { display: none !important; }
                        }
                        body { 
                            font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; 
                            background: white; 
                            color: black;
                            padding: 0;
                            margin: 0;
                        }
                        .print-wrapper {
                            width: 100%;
                            max-width: 210mm;
                            margin: 0 auto;
                            padding: 0;
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
                <div className={`mb-6 p-4 rounded-3xl border flex flex-col md:flex-row justify-between items-center no-print shadow-sm gap-4 transition-colors duration-300 ${isCancelled
                    ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'
                    : isPending
                        ? 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30'
                        : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800'
                    }`}>

                    {/* Left: Status Indicator & Title */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${isCancelled ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : isPending ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {isCancelled ? <Ban size={24} strokeWidth={1.5} /> : <ShieldCheck size={24} strokeWidth={1.5} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-extrabold text-sm uppercase text-slate-800 dark:text-slate-100 leading-tight">
                                {isCancelled ? 'Registro Cancelado' : isPending ? `Validação RA ${incident.raCode}` : 'Registro Oficial'}
                            </h2>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                                {isCancelled ? 'Sem validade legal' : isPending ? 'Aguardando Aprovação' : 'Validado e Publicado'}
                            </p>
                        </div>
                    </div>

                    {/* Right: Actions Group */}
                    <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
                        {!isCancelled && (
                            <>
                                {canDelete && (
                                    <button
                                        onClick={handleDelete}
                                        className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-wide border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 transition-all active:scale-95 flex items-center gap-2 flex-grow md:flex-grow-0 justify-center"
                                    >
                                        <XCircle size={16} />
                                        Cancelar
                                    </button>
                                )}
                                {canEdit && (
                                    <button
                                        onClick={onEdit}
                                        disabled={isValidating || incident.status === 'APPROVED'}
                                        className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-wide bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-400 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-grow md:flex-grow-0 justify-center shadow-sm"
                                    >
                                        <Pencil size={16} />
                                        Editar
                                    </button>
                                )}
                            </>
                        )}

                        {isPending && !isCancelled && canApprove && (
                            <button
                                onClick={handleApprove}
                                disabled={isValidating}
                                className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-wide bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto justify-center"
                            >
                                {isValidating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} className="ml-[-2px]" />}
                                {isValidating ? 'Processando...' : 'Validar Documento'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 no-print px-4 md:px-0 w-full max-w-[210mm] mx-auto gap-4">
                <button onClick={onBack} className="btn-back">
                    <ArrowLeft size={18} />
                    <span>VOLTAR</span>
                </button>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setShowMarginSettings(!showMarginSettings)}
                        className={`px-3 h-10 rounded-lg border-2 transition-all no-print ${showMarginSettings ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'}`}
                        title="Ajustar Margens"
                    >
                        <Settings size={18} />
                    </button>
                    <button onClick={handleShareImage} disabled={isSharing} className="flex-1 sm:flex-none px-3 sm:px-6 h-10 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-black text-[9px] sm:text-[10px] uppercase flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
                        {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                        <span className="whitespace-nowrap">{isSharing ? 'GERANDO' : 'COMPARTILHAR'}</span>
                    </button>
                    <button onClick={handleExportPDF} disabled={isExporting} className="flex-1 sm:flex-none px-3 sm:px-6 h-10 bg-slate-800 dark:bg-slate-700 text-white rounded-lg font-black text-[9px] sm:text-[10px] uppercase flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
                        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        <span className="whitespace-nowrap">{isExporting ? 'PROCESSANDO' : 'GERAR PDF'}</span>
                    </button>
                </div>
            </div>

            {/* Margin Settings Panel */}
            {showMarginSettings && (
                <div className="max-w-[210mm] mx-auto mb-6 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 no-print shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Settings size={14} className="text-blue-500" />
                        <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Ajuste de Margens do PDF (mm)</h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Topo</label>
                            <input
                                type="number"
                                value={pdfMargins.top}
                                onChange={e => setPdfMargins({ ...pdfMargins, top: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Inferior</label>
                            <input
                                type="number"
                                value={pdfMargins.bottom}
                                onChange={e => setPdfMargins({ ...pdfMargins, bottom: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Esquerda</label>
                            <input
                                type="number"
                                value={pdfMargins.left}
                                onChange={e => setPdfMargins({ ...pdfMargins, left: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Direita</label>
                            <input
                                type="number"
                                value={pdfMargins.right}
                                onChange={e => setPdfMargins({ ...pdfMargins, right: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* --- ÁREA DE IMPRESSÃO / RELATÓRIO (FOLHA A4) --- */}
            <div className="w-full overflow-x-auto md:overflow-x-visible pb-6">
                <div
                    id="incident-detail-report"
                    ref={contentRef}
                    className={`bg-white text-black shadow-2xl relative flex flex-col mx-auto w-full min-w-[320px] md:max-w-[205mm] min-h-[285mm] overflow-hidden transition-all ${isCancelled ? 'grayscale opacity-75' : ''}`}
                    style={{
                        fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
                        paddingTop: `${pdfMargins.top}mm`,
                        paddingBottom: `${pdfMargins.bottom}mm`,
                        paddingLeft: `${pdfMargins.left}mm`,
                        paddingRight: `${pdfMargins.right}mm`
                    }}
                >

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
                        <h2 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: '#1e3a5f', letterSpacing: '0.15em', whiteSpace: 'nowrap', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
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
                                <span style={{ fontSize: '7px', fontWeight: '600', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>R.A</span>
                                <span style={{ fontSize: '16px', fontWeight: '800', color: 'white', lineHeight: '1', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>{incident.raCode}</span>
                            </div>
                            <div style={{ flex: '1', padding: '8px 10px', background: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <span style={{ fontSize: '7px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>LOCAL</span>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>{building?.name || '---'}</span>
                            </div>
                        </div>

                        {/* LINHA 2: DATA, HORÁRIOS e LOCAL */}
                        <div style={{ display: 'grid', gridTemplateColumns: '75px 60px 60px 1fr', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>DATA</span>
                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#0f172a', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>{formatDateBR(incident.date)}</span>
                            </div>
                            <div style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>INÍCIO</span>
                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#0f172a', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>{incident.startTime}</span>
                            </div>
                            <div style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>TÉRMINO</span>
                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#0f172a', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>{incident.endTime || '--:--'}</span>
                            </div>
                            <div style={{ padding: '5px 8px', background: '#eff6ff' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#1e40af', textTransform: 'uppercase', marginBottom: '1px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>NATUREZA</span>
                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#1e3a5f', textTransform: 'uppercase', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>{incident.alterationType}</span>
                            </div>
                        </div>

                        {/* LINHA 3: ENDEREÇO */}
                        <div style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>ENDEREÇO:</span>
                            <span style={{ fontSize: '9px', fontWeight: '500', color: '#334155', textTransform: 'uppercase', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>{building?.address || '---'}</span>
                        </div>

                        {/* LINHA 4: RESPONSÁVEIS */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.7fr', background: '#f8fafc' }}>
                            <div style={{ padding: '4px 8px', borderRight: '1px solid #e2e8f0' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>RESPONSÁVEL</span>
                                <span style={{ display: 'block', fontSize: '9px', fontWeight: '600', color: '#0f172a', textTransform: 'uppercase', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>{building?.managerName || '---'}</span>
                            </div>
                            <div style={{ padding: '4px 8px', borderRight: '1px solid #e2e8f0' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>CONTATO</span>
                                <span style={{ display: 'block', fontSize: '9px', fontWeight: '600', color: '#0f172a', textTransform: 'uppercase', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>{building?.managerPhone || '---'}</span>
                            </div>
                            <div style={{ padding: '4px 8px', borderRight: '1px solid #e2e8f0' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>CARGO</span>
                                <span style={{ display: 'block', fontSize: '9px', fontWeight: '600', color: '#0f172a', textTransform: 'uppercase', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>---</span>
                            </div>
                            <div style={{ padding: '4px 8px' }}>
                                <span style={{ display: 'block', fontSize: '6px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '1px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>DOC</span>
                                <span style={{ display: 'block', fontSize: '9px', fontWeight: '600', color: '#0f172a', textTransform: 'uppercase', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>---</span>
                            </div>
                        </div>
                    </div>

                    {/* TÍTULO DO RELATO */}
                    <div className="text-center mb-4 relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300"></div></div>
                        <h3 className="relative bg-white px-6 text-[11px] md:text-[14px] font-black uppercase text-blue-900 inline-block tracking-[0.3em]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
                            RELATO
                        </h3>
                    </div>

                    {/* CORPO DO TEXTO - LIMITADO A 10 LINHAS */}
                    <div
                        className="text-justify text-[11px] md:text-[13px] leading-relaxed mb-6 whitespace-pre-wrap break-words px-2 text-slate-900 overflow-hidden"
                        style={{
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                            display: '-webkit-box',
                            WebkitLineClamp: 10,
                            WebkitBoxOrient: 'vertical'
                        }}
                    >
                        {incident.description}
                    </div>

                    {/* MOTIVO DO CANCELAMENTO - APENAS ADMIN */}
                    {isCancelled && incident.cancellationReason && currentUser?.role === 'Nível 5' && (
                        <div className="mb-6 border border-red-200 bg-red-50 p-3 rounded-sm text-center">
                            <h4 className="text-[10px] font-black uppercase text-red-700 mb-1">MOTIVO DO CANCELAMENTO</h4>
                            <p className="text-[10px] uppercase text-red-900 font-bold mb-1">{incident.cancellationReason}</p>
                            {incident.cancelledBy && (
                                <div className="text-[8px] uppercase text-red-800 font-medium border-t border-red-100 pt-1 mt-1 inline-block">
                                    <span className="font-bold">CANCELADO POR:</span> {incident.cancelledBy}
                                </div>
                            )}
                        </div>
                    )}

                    {/* FOTOS DE EVIDÊNCIA - DYNAMIC RESIZING */}
                    {incident.photos && incident.photos.length > 0 && (
                        <div className="mb-6 break-inside-avoid page-break-inside-avoid">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-px flex-1 bg-slate-200"></div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Registros Fotográficos</span>
                                <div className="h-px flex-1 bg-slate-200"></div>
                            </div>

                            {/* Forced 5 Columns Layout, 3:4 Aspect Ratio (Horizontal Strip) */}
                            <div className="grid grid-cols-5 gap-2 w-full">
                                {incident.photos.map((p, idx) => (
                                    <div key={idx} className="flex flex-col break-inside-avoid">
                                        <div className="border border-slate-300 p-0.5 bg-white shadow-sm w-full aspect-[3/4] flex items-center justify-center overflow-hidden rounded-md relative">
                                            <img
                                                src={p}
                                                className="absolute inset-0 w-full h-full object-contain bg-slate-100"
                                                alt={`Evidência ${idx + 1}`}
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className="mt-1 flex justify-between items-center px-0.5">
                                            <span className="text-[6px] uppercase font-black text-slate-500 truncate">Foto {idx + 1}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* RODAPÉ E ASSINATURAS */}
                    <div className="mt-auto pt-14 break-inside-avoid w-full border-t-2 border-slate-100">
                        <div className="grid grid-cols-2 gap-6 md:gap-12 items-end">
                            {/* Assinatura Vigilantes */}
                            <div className="flex flex-col items-start justify-end h-full">
                                <div className="text-[10px] md:text-[12px] font-black uppercase text-slate-900 leading-tight mb-2">
                                    {incident.vigilants.split(',').map((v, i) => (
                                        <div key={i}>{v.trim()}</div>
                                    ))}
                                </div>
                                <div className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-6">VIGILANTES</div>

                                <div className="space-y-3 w-full border-t border-slate-100 pt-3">
                                    <div>
                                        <div className="text-[6px] font-bold uppercase text-slate-400 mb-0.5">REGISTRADO PELO USUÁRIO:</div>
                                        <div className="text-[7px] font-black uppercase text-slate-700">
                                            {author?.name || incident.operatorName} <span className="text-slate-400 font-medium">EM</span> {new Date(incident.timestamp!).toLocaleDateString('pt-BR')} <span className="text-slate-400 font-medium">ÀS</span> {new Date(incident.timestamp!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-[6px] font-mono text-slate-400 uppercase mt-0.5">IP: 187.25.145.140</div>
                                    </div>

                                    {/* Campo de Edição - Exibe apenas se houver registro de edição */}
                                    {incident.isEdited && incident.editedBy && incident.lastEditedAt && (
                                        <div>
                                            <div className="text-[6px] font-bold uppercase text-slate-400 mb-0.5">EDITADO PELO USUÁRIO:</div>
                                            <div className="text-[7px] font-black uppercase text-slate-700">
                                                {incident.editedBy} <span className="text-slate-400 font-medium">EM</span> {new Date(incident.lastEditedAt).toLocaleDateString('pt-BR')} <span className="text-slate-400 font-medium">ÀS</span> {new Date(incident.lastEditedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Validação Supervisor */}
                            <div className="flex flex-col items-center justify-end h-full text-center">
                                {incident.status === 'APPROVED' ? (
                                    <>
                                        <div className="text-[10px] md:text-[12px] font-black uppercase text-slate-900 leading-tight mb-2">
                                            {incident.approvedBy || 'ALEXANDRE VERENICZ'}
                                        </div>
                                        <div className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-6">
                                            {approverJobTitle || 'SUPERVISOR'}
                                        </div>

                                        <div className="w-full border-t border-slate-100 pt-3 flex flex-col items-center">
                                            <div className="text-[7px] font-bold uppercase text-slate-500 flex items-center gap-1 mb-1">
                                                <ShieldCheck size={10} className="text-blue-600" /> ASSINADO ELETRONICAMENTE
                                            </div>
                                            <div className="text-[6px] font-mono font-bold text-slate-400 uppercase">
                                                DATA: {incident.approvalDate ? new Date(incident.approvalDate).toLocaleString('pt-BR') : '06/02/2026 ÀS 01:14'}
                                            </div>
                                            <div className="text-[6px] font-mono text-slate-300 uppercase mt-0.5">
                                                IP: 177.173.197.66
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-24 w-full flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                                        <div className="text-center">
                                            <div className="text-[8px] font-black uppercase text-slate-400 mb-1">ESPAÇO RESERVADO</div>
                                            <div className="text-[6px] font-bold uppercase text-slate-300">ASSINATURA DA SUPERVISÃO</div>
                                        </div>
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
        </div >
    );
};
