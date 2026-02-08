
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Vehicle, Vest, Radio, Equipment, LoanRecord, SystemLog } from '../types';
import { supabase } from '../services/supabaseClient';
import {
    ArrowRightLeft, History, Plus, Search, User as UserIcon,
    Car, Shield, Radio as RadioIcon, Package, CheckCircle,
    XCircle, Clock, Calendar, ChevronRight, ChevronDown, CornerDownLeft,
    AlertCircle, Loader2, Filter, Layers, Gauge, Fuel, DollarSign, Droplet, ArrowUpRight, AlertTriangle, Download, X, QrCode, Settings, Printer, ArrowLeft,
    Square, MousePointer2, Info, FileText, Minus, Maximize
} from 'lucide-react';
import { Modal } from './Modal';
import { normalizeString } from '../utils/stringUtils';
import { formatDateBR } from '../utils/dateUtils';
import { QRScanner } from './QRScanner';
import CryptoJS from 'crypto-js';

declare var html2pdf: any;

const generateUUID = () => {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch (e) { }
    // Fallback: simple random string
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

type LoanGroup = {
    type: 'PENDING' | 'ACTIVE' | 'HISTORY';
    receiverId: string;
    receiverName: string;
    loans: LoanRecord[];
    id: string;
    timestamp: number;
};

interface LoanViewsProps {
    currentUser: User;
    users: User[];
    vehicles: Vehicle[];
    vests: Vest[];
    radios: Radio[];
    equipments: Equipment[];
    onLogAction: (action: SystemLog['action'], details: string) => void;
    loans: LoanRecord[];
    onRefresh: () => void;
    initialTab?: 'ACTIVE' | 'HISTORY' | 'NEW';
    isReportView?: boolean;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void;
    filterStatus?: 'ACTIVE' | 'PENDING';
    onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;

    // New granular permissions
    canCreate?: boolean;
    canApprove?: boolean;
    canReturn?: boolean;
    canViewHistory?: boolean;
    canViewAll?: boolean;
    customLogo?: string | null;
    customLogoLeft?: string | null;
    onFilterChange?: (filters: { dateStart: string, timeStart: string, dateEnd: string, timeEnd: string }) => void;
    onBack?: () => void;
}

export const LoanViews: React.FC<LoanViewsProps> = ({
    currentUser, users, vehicles, vests, radios, equipments, onLogAction,
    loans, onRefresh, initialTab = 'ACTIVE', isReportView = false,
    hasMore = false, isLoadingMore = false, onLoadMore, filterStatus,
    onShowConfirm,
    canCreate = false, canApprove = false, canReturn = false, canViewHistory = false, canViewAll = false,
    customLogo, customLogoLeft, onFilterChange, onBack
}) => {
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'NEW'>(
        initialTab === 'HISTORY' ? 'HISTORY' : (initialTab === 'NEW' ? 'NEW' : 'ACTIVE')
    );

    // Sync activeTab with initialTab prop when it changes
    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [timeStart, setTimeStart] = useState('');
    const [timeEnd, setTimeEnd] = useState('');
    const [pdfMargins, setPdfMargins] = useState(() => {
        const saved = localStorage.getItem('app_pdf_margins');
        return saved ? JSON.parse(saved) : { top: 15, right: 8, bottom: 15, left: 8 };
    });

    useEffect(() => {
        localStorage.setItem('app_pdf_margins', JSON.stringify(pdfMargins));
    }, [pdfMargins]);

    const [showExportPreview, setShowExportPreview] = useState(false);
    const [pdfScale, setPdfScale] = useState(100);
    const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [pdfPaperSize, setPdfPaperSize] = useState<'A4' | 'LETTER' | 'LEGAL'>('A4');
    const [pdfUnit, setPdfUnit] = useState<'mm' | 'cm' | 'in'>('mm');
    const [showMarginGuides, setShowMarginGuides] = useState(false);
    const [exportIP, setExportIP] = useState('...');
    const [exportHash, setExportHash] = useState('...');
    const [exportDate, setExportDate] = useState('...');

    useEffect(() => {
        if (showExportPreview) {
            setExportDate(new Date().toLocaleString('pt-BR'));
            const raw = Date.now().toString() + Math.random().toString();
            const hash = CryptoJS.SHA256(raw).toString();
            setExportHash(hash);

            fetch('https://api.ipify.org?format=json')
                .then(res => res.json())
                .then(data => setExportIP(data.ip))
                .catch(() => setExportIP('Indisponível'));
        }
    }, [showExportPreview]);

    const applyPreset = (type: 'normal' | 'narrow' | 'wide') => {
        switch (type) {
            case 'normal': setPdfMargins({ top: 15, right: 15, bottom: 15, left: 15 }); break;
            case 'narrow': setPdfMargins({ top: 5, right: 5, bottom: 5, left: 5 }); break;
            case 'wide': setPdfMargins({ top: 25, right: 25, bottom: 25, left: 25 }); break;
        }
    };

    useEffect(() => {
        if (onFilterChange) {
            onFilterChange({ dateStart, timeStart, dateEnd, timeEnd });
        }
    }, [dateStart, timeStart, dateEnd, timeEnd, onFilterChange]);

    const printRef = useRef<HTMLDivElement>(null);

    // Form States
    const [receiverId, setReceiverId] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [showUserOptions, setShowUserOptions] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState<{ type: string, id: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // States for Vehicle Mileage Modals
    const [showVehicleStartModal, setShowVehicleStartModal] = useState(false);
    const [vehicleStartData, setVehicleStartData] = useState<{ loanId?: string, id: string, model: string, currentKm: number, manualKm: number, reason?: string } | null>(null);

    // Queue for Batch Vehicle Operations
    const [batchVehicleQueue, setBatchVehicleQueue] = useState<LoanRecord[]>([]);
    const [batchActionType, setBatchActionType] = useState<'CONFIRM' | 'RETURN' | null>(null);

    const processNextBatchStep = () => {
        if (batchVehicleQueue.length === 0) {
            setBatchActionType(null);
            onRefresh();
            return;
        }
        const nextLoan = batchVehicleQueue[0];
        const remaining = batchVehicleQueue.slice(1);
        setBatchVehicleQueue(remaining);

        // Only RETURN is processed in batch with modal now
        handleReturn(nextLoan);
    };







    // State for Group Details
    const [selectedGroup, setSelectedGroup] = useState<{
        type: 'PENDING' | 'ACTIVE' | 'HISTORY';
        receiverId: string;
        receiverName: string;
        loans: LoanRecord[];
        id: string;
        timestamp: number;
    } | null>(null);

    const [showVehicleReturnModal, setShowVehicleReturnModal] = useState(false);
    const [vehicleReturnData, setVehicleReturnData] = useState<{
        loanId: string,
        vehicleId: string,
        model: string,
        kmStart: number,
        kmEnd: number,
        refuel: boolean,
        fuelLiters: string,
        fuelType: string,
        fuelKm: string,
        couponNumber: string,
        supplier: string,
        driver: string,
        batchIdsToComplete?: string[] // IDs de outros itens do lote para devolver junto
    } | null>(null);

    // State for Handover Modal
    const [showHandoverModal, setShowHandoverModal] = useState(false);
    const [handoverData, setHandoverData] = useState<{
        loan: LoanRecord,
        targetUserId: string,
        targetUserName: string,
        userSearch: string
    } | null>(null);

    // State for Refuel Modal (Active Loans)
    const [showRefuelModal, setShowRefuelModal] = useState(false);
    const [refuelData, setRefuelData] = useState<{
        loanId: string,
        vehicleId: string,
        model: string,
        currentKm: number,
        fuelLiters: string,
        fuelType: string,
        fuelKm: string,
        couponNumber: string,
        supplier: string,
        driver: string
    } | null>(null);

    // State for Mobile Interaction
    const [activeMobileLoanId, setActiveMobileLoanId] = useState<string | null>(null);

    const [showQRScanner, setShowQRScanner] = useState(false);

    // PDF Export Logic (using existing isExporting state)
    const reportRef = useRef<HTMLDivElement>(null);
    // isExporting already declared above


    const handleExportHistoryPDF = async () => {
        if (!reportRef.current || typeof html2pdf === 'undefined') {
            alert('Biblioteca de PDF não carregada. Tente recarregar a página.');
            return;
        }

        if (!showExportPreview) {
            setShowExportPreview(true);
            return;
        }

        setIsExporting(true);
        setShowMarginGuides(false); // Hide guides for export

        // Give a small delay for guides to hide and UI to stabilize
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const container = document.getElementById('history-export-container');
            if (!container) throw new Error('Container de exportação não encontrado');

            const pages = container.querySelectorAll('.report-page');
            if (pages.length === 0) throw new Error('Nenhuma página encontrada para exportar');

            const filename = historyItemType === 'VEHICLE'
                ? `Diario_Bordo_${historyItemId}_${new Date().toISOString().split('T')[0]}.pdf`
                : `Relatorio_Historico_${historyItemId}_${new Date().toISOString().split('T')[0]}.pdf`;

            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: (pdfScale / 100) * 2,
                    useCORS: true,
                    letterRendering: true,
                    scrollY: 0,
                    logging: false
                },
                jsPDF: { unit: pdfUnit, format: pdfPaperSize.toLowerCase(), orientation: pdfOrientation }
            };

            // Implementação do Algoritmo Página-a-Página (Explicit Loop)
            // Iniciamos o worker com a primeira página
            let worker = html2pdf().set(opt).from(pages[0]).toPdf();

            // Adicionamos as páginas subsequentes uma a uma no loop
            for (let i = 1; i < pages.length; i++) {
                worker = worker.get('pdf').then((pdf: any) => {
                    pdf.addPage();
                }).from(pages[i]).toContainer().toCanvas().toImg().toPdf();
            }

            // Finaliza e salva o PDF
            await worker.save();
        } catch (err: any) {
            console.error('Erro na exportação de PDF:', err);
            alert('Erro ao gerar PDF: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setIsExporting(false);
        }
    };;

    // --- ITEM HISTORY STATE ---
    const [historyMode, setHistoryMode] = useState<'USER' | 'ITEM'>('ITEM');
    const [historyItemType, setHistoryItemType] = useState<string>('VEHICLE');
    const [historyItemId, setHistoryItemId] = useState<string>('');
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');
    const [itemHistoryResults, setItemHistoryResults] = useState<LoanRecord[]>([]);
    const [isLoadingItemHistory, setIsLoadingItemHistory] = useState(false);

    // Filter lists for Form
    const availableVehicles = useMemo(() => vehicles.filter(v => !loans.some(l => l.assetId === v.id && (l.status === 'ACTIVE' || l.status === 'PENDING'))), [vehicles, loans]);

    const availableVests = useMemo(() => vests
        .filter(v => !loans.some(l => l.assetId === v.id && (l.status === 'ACTIVE' || l.status === 'PENDING')))
        .sort((a, b) => parseInt(a.number) - parseInt(b.number)),
        [vests, loans]);

    const availableRadios = useMemo(() => radios
        .filter(r => !loans.some(l => l.assetId === r.id && (l.status === 'ACTIVE' || l.status === 'PENDING')))
        .sort((a, b) => parseInt(a.number) - parseInt(b.number)),
        [radios, loans]);

    React.useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab === 'HISTORY' ? 'HISTORY' : (initialTab === 'NEW' ? 'NEW' : 'ACTIVE'));
        }
    }, [initialTab]);



    // Queue for Loan Creation (Vehicles)
    const [creationQueue, setCreationQueue] = useState<{ type: string, id: string }[]>([]);
    const [preparedVehicleData, setPreparedVehicleData] = useState<Record<string, { km: number, reason: string }>>({});

    const processNextCreationStep = async (queue: { type: string, id: string }[], currentPreparedData: Record<string, { km: number, reason: string }>) => {
        if (queue.length === 0) {
            // All vehicles processed, proceed to create loans
            await finalProcessLoanCreation(currentPreparedData);
            return;
        }

        const nextAsset = queue[0];
        const remainingQueue = queue.slice(1);
        const vehicle = vehicles.find(v => v.id === nextAsset.id);

        if (vehicle) {
            setIsSubmitting(true);
            let lastKm = vehicle.currentKm || 0;
            try {
                const { data: lastLoan } = await supabase
                    .from('loan_records')
                    .select('meta')
                    .eq('item_id', vehicle.id)
                    .eq('status', 'COMPLETED')
                    .order('return_time', { ascending: false })
                    .limit(1)
                    .single();

                if (lastLoan?.meta?.kmEnd) {
                    lastKm = lastLoan.meta.kmEnd;
                }
            } catch (e) {
                console.warn("Não foi possível buscar o último KM", e);
            } finally {
                setIsSubmitting(false);
            }

            setVehicleStartData({
                id: vehicle.id,
                model: `${vehicle.model} (${vehicle.plate})`,
                currentKm: lastKm,
                manualKm: lastKm
            });
            // Update state so the modal can use it to callback
            setCreationQueue(remainingQueue);
            setPreparedVehicleData(currentPreparedData);
            setShowVehicleStartModal(true);
        } else {
            // Should not happen, but skip if vehicle not found
            processNextCreationStep(remainingQueue, currentPreparedData);
        }
    };

    const handleCreateLoan = async () => {
        console.log('🚀 handleCreateLoan CHAMADO!', { receiverId, selectedAssets: selectedAssets.length });
        if (!receiverId || selectedAssets.length === 0) return alert("Selecione um recebedor e ao menos um item.");

        const vehicleAssets = selectedAssets.filter(a => a.type === 'VEHICLE');
        console.log('📊 Veículos encontrados:', vehicleAssets.length);

        if (vehicleAssets.length > 0) {
            console.log('🚗 Iniciando processo com veículos...');
            // Start the queue process
            processNextCreationStep(vehicleAssets, {});
        } else {
            console.log('✅ Sem veículos, criando cautela diretamente...');
            // No vehicles, regular creation
            await finalProcessLoanCreation({});
        }
    };


    const confirmCreationStep = (km: number, reason: string) => {
        if (!vehicleStartData) return;

        const newData = {
            ...preparedVehicleData,
            [vehicleStartData.id]: { km, reason }
        };

        setShowVehicleStartModal(false);
        setVehicleStartData(null); // Clear current

        // Process next in queue
        processNextCreationStep(creationQueue, newData);
    };

    const finalProcessLoanCreation = async (vehicleData: Record<string, { km: number, reason: string }>) => {
        console.log('💾 finalProcessLoanCreation INICIADO', { vehicleData });
        setIsSubmitting(true);
        const batchId = generateUUID();
        const receiver = users.find(u => u.id === receiverId);

        // Fetch IP for Audit
        let clientIP = 'Não identificado';
        try {
            if (navigator.onLine) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const data = await res.json();
                    clientIP = data.ip || 'Não identificado';
                }
            }
        } catch (e) { console.warn('Falha ao obter IP:', e); }

        const newLoans = selectedAssets.map(asset => {
            let description = '';
            let meta = {};

            if (asset.type === 'VEHICLE') {
                const v = vehicles.find(x => x.id === asset.id);
                description = `${v?.model} (${v?.plate})`;
                // Use the pre-collected data
                if (vehicleData[asset.id]) {
                    meta = {
                        kmStart: vehicleData[asset.id].km,
                        reason: vehicleData[asset.id].reason
                    };
                }
            }
            else if (asset.type === 'VEST') { const v = vests.find(x => x.id === asset.id); description = `Colete ${v?.number} (${v?.size})`; }
            else if (asset.type === 'RADIO') { const r = radios.find(x => x.id === asset.id); description = `HT ${r?.number} - ${r?.serialNumber}`; }
            else if (asset.type === 'EQUIPMENT') { const e = equipments.find(x => x.id === asset.id); description = `${e?.name}`; }

            return {
                batch_id: batchId,
                operator_id: currentUser.id,
                receiver_id: receiverId,
                receiver_name: receiver?.name || 'Desconhecido',
                asset_type: asset.type,
                item_id: asset.id,
                description: description,
                checkout_time: new Date().toISOString(),
                status: 'PENDING',
                meta: Object.keys(meta).length > 0 ? meta : null,
                created_ip: clientIP,
                // Assinatura Digital de Criação: (BATCH + RECEIVER + OPERATOR + ASSET + TS + IP)
                signature_hash: CryptoJS.SHA256(`CREATE|BATCH:${batchId}|RCV:${receiverId}|OP:${currentUser.id}|ASSET:${asset.id}|TS:${new Date().toISOString()}|IP:${clientIP}`).toString()
            };
        });

        try {
            const { error } = await supabase.from('loan_records').insert(newLoans);
            if (error) throw error;

            onLogAction('LOAN_CREATE', `Criou cautela para ${receiver?.name} com ${newLoans.length} itens. (Assinatura do Lote: ${batchId})`);
            setActiveTab('ACTIVE');
            setReceiverId('');
            setUserSearch('');
            setSelectedAssets([]);
            onRefresh();
            setShowVehicleStartModal(false);
        } catch (err: any) {
            console.error("Erro insert loan:", err);
            alert('Erro ao criar cautela: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReturn = (loan: LoanRecord) => {
        // Special handling for Vehicles
        if (loan.assetType === 'VEHICLE') {
            setVehicleReturnData({
                loanId: loan.id,
                vehicleId: loan.assetId,
                model: loan.assetDescription,
                kmStart: loan.meta?.kmStart || 0,
                kmEnd: loan.meta?.kmStart || 0, // Default to start KM
                refuel: loan.meta?.fuelRefill || false,
                fuelLiters: loan.meta?.fuelLiters?.toString().replace('.', ',') || '',
                fuelType: loan.meta?.fuelType || 'Gasolina',
                fuelKm: loan.meta?.fuelKm?.toString() || '',
                couponNumber: loan.meta?.couponNumber || '',
                supplier: loan.meta?.supplier || '',
                driver: loan.meta?.driver || currentUser.name
            });
            setShowVehicleReturnModal(true);
            return;
        }

        onShowConfirm(
            "Confirmar Devolução",
            `Deseja confirmar a devolução do item: ${loan.assetDescription}?`,
            async () => {
                try {
                    // Fetch IP
                    let clientIP = 'Não identificado';
                    try {
                        const res = await fetch('https://api.ipify.org?format=json');
                        if (res.ok) clientIP = (await res.json()).ip;
                    } catch (e) { }

                    const returnTs = new Date().toISOString();
                    const hashPayload = `RETURN|ID:${loan.id}|TS:${returnTs}|IP:${clientIP}`;
                    const signatureHash = CryptoJS.SHA256(hashPayload).toString();

                    const { error } = await supabase.from('loan_records').update({
                        status: 'COMPLETED',
                        return_time: returnTs,
                        updated_ip: clientIP,
                        signature_hash: signatureHash // Update hash to reflect return
                    }).eq('id', loan.id);

                    if (error) throw error;

                    onLogAction('LOAN_RETURN', `Recebeu devolução: ${loan.assetDescription} com Assinatura Digital (Hash: ${signatureHash})`);
                    setTimeout(() => onRefresh(), 200);
                } catch (err: any) {
                    console.error("Erro ao devolver:", err);
                    alert('Erro ao processar devolução: ' + (err.message || JSON.stringify(err)));
                }
            }
        );
    };

    const processVehicleReturn = async () => {
        if (!vehicleReturnData) return;

        if (vehicleReturnData.kmEnd < vehicleReturnData.kmStart) {
            alert('A quilometragem final não pode ser menor que a inicial.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Update Loan Record (Vehicle)
            const metaUpdate = {
                kmStart: vehicleReturnData.kmStart,
                kmEnd: vehicleReturnData.kmEnd,
                fuelRefill: vehicleReturnData.refuel,
                fuelLiters: vehicleReturnData.refuel ? parseFloat(vehicleReturnData.fuelLiters.replace(',', '.')) : null,
                fuelType: vehicleReturnData.refuel ? vehicleReturnData.fuelType : null,
                fuelKm: vehicleReturnData.refuel && vehicleReturnData.fuelKm ? parseInt(vehicleReturnData.fuelKm.replace(/\D/g, '')) : null,
                couponNumber: vehicleReturnData.refuel ? vehicleReturnData.couponNumber : null,
                supplier: vehicleReturnData.refuel ? vehicleReturnData.supplier : null,
                driver: vehicleReturnData.refuel ? vehicleReturnData.driver : null
            };

            // Fetch IP
            let clientIP = 'Não identificado';
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                if (res.ok) clientIP = (await res.json()).ip;
            } catch (e) { }

            const returnTs = new Date().toISOString();
            const hashPayload = `RETURN_VEHICLE|ID:${vehicleReturnData.loanId}|KM:${vehicleReturnData.kmEnd}|TS:${returnTs}|IP:${clientIP}`;
            const signatureHash = CryptoJS.SHA256(hashPayload).toString();

            const { error: loanError } = await supabase.from('loan_records').update({
                status: 'COMPLETED',
                return_time: returnTs,
                meta: metaUpdate,
                updated_ip: clientIP,
                signature_hash: signatureHash
            }).eq('id', vehicleReturnData.loanId);

            if (loanError) throw loanError;

            // Update Vehicle KM Table
            try {
                const { error: vehicleError } = await supabase.from('vehicles').update({
                    currentKm: vehicleReturnData.kmEnd,
                    current_km: vehicleReturnData.kmEnd // Fallback para snake_case
                }).eq('id', vehicleReturnData.vehicleId);

                if (vehicleError) {
                    console.error("Erro ao atualizar KM mestre do veículo:", vehicleError.message);
                    // Opcionalmente logar isso no sistema para o admin ver
                    onLogAction('DATABASE_TOOLS', `FALHA ao atualizar KM do veículo ${vehicleReturnData.model}: ${vehicleError.message}`);
                }
            } catch (e: any) {
                console.error("Falha ao atualizar KM na tabela vehicles:", e);
                onLogAction('DATABASE_TOOLS', `ERRO CRÍTICO ao atualizar KM do veículo ${vehicleReturnData.model}: ${e.message || 'Erro desconhecido'}`);
            }

            // Process Other Items in Batch (if any)
            if (vehicleReturnData.batchIdsToComplete && vehicleReturnData.batchIdsToComplete.length > 0) {
                const { error: batchError } = await supabase.from('loan_records').update({
                    status: 'COMPLETED',
                    return_time: new Date().toISOString()
                }).in('id', vehicleReturnData.batchIdsToComplete);

                if (batchError) throw batchError;
            }

            const isBatch = vehicleReturnData.batchIdsToComplete && vehicleReturnData.batchIdsToComplete.length > 0;
            const logMsg = isBatch
                ? `Recebeu devolução de lote com Viatura: ${vehicleReturnData.model} (KM: ${vehicleReturnData.kmEnd}) + ${vehicleReturnData.batchIdsToComplete!.length} itens.`
                : `Recebeu veículo: ${vehicleReturnData.model}. KM Final: ${vehicleReturnData.kmEnd}`;

            onLogAction('LOAN_RETURN', `${logMsg} com Assinatura Digital (Hash: ${signatureHash})`);
            setShowVehicleReturnModal(false);
            setVehicleReturnData(null);

            if (batchVehicleQueue.length > 0) {
                setTimeout(() => processNextBatchStep(), 300);
            } else {
                setBatchActionType(null);
                onRefresh();
            }

        } catch (err: any) {
            console.error("Erro return vehicle:", err);
            alert('Erro ao devolver veículo: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefuel = async (loan: LoanRecord) => {
        if (!loan.assetDescription) return;

        // Get latest vehicle data for current KM check
        let currentKm = loan.meta?.kmStart || 0;
        try {
            const { data: v } = await supabase.from('vehicles').select('current_km').eq('id', loan.assetId).single();
            if (v && v.current_km) currentKm = v.current_km;
        } catch (e) { }

        setRefuelData({
            loanId: loan.id,
            vehicleId: loan.assetId,
            model: loan.assetDescription,
            currentKm: currentKm,
            fuelLiters: '',
            fuelType: 'Gasolina',
            fuelKm: currentKm.toString(),
            couponNumber: '',
            supplier: '',
            driver: ''
        });
        setShowRefuelModal(true);
    };

    const processRefuel = async () => {
        if (!refuelData) return;

        // Validation
        const fKm = parseInt(refuelData.fuelKm.replace(/\D/g, '') || '0');
        if (fKm < refuelData.currentKm) {
            alert(`O KM do abastecimento (${fKm}) não pode ser menor que o KM atual do veículo (${refuelData.currentKm}).`);
            return;
        }

        setIsSubmitting(true);
        try {
            // Get existing meta to preserve kmStart etc
            const { data: currentLoan } = await supabase.from('loan_records').select('meta').eq('id', refuelData.loanId).single();
            const existingMeta = currentLoan?.meta || {};

            const newMeta = {
                ...existingMeta,
                fuelRefill: true,
                fuelLiters: parseFloat(refuelData.fuelLiters.replace(',', '.')),
                fuelType: refuelData.fuelType,
                fuelKm: fKm,
                couponNumber: refuelData.couponNumber,
                supplier: refuelData.supplier,
                driver: refuelData.driver
            };

            const { error } = await supabase.from('loan_records').update({
                meta: newMeta
            }).eq('id', refuelData.loanId);

            if (error) throw error;

            // Update Vehicle KM if new KM is greater
            if (fKm > refuelData.currentKm) {
                await supabase.from('vehicles').update({
                    currentKm: fKm,
                    current_km: fKm
                }).eq('id', refuelData.vehicleId);
            }

            onLogAction('LOAN_CONFIRM', `Adicionou abastecimento a viatura: ${refuelData.model}`);
            setShowRefuelModal(false);
            setRefuelData(null);
            onRefresh();

        } catch (err: any) {
            console.error(err);
            alert('Erro ao registrar abastecimento: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleHandover = (loan: LoanRecord) => {
        setHandoverData({
            loan,
            targetUserId: '',
            targetUserName: '',
            userSearch: ''
        });
        setShowHandoverModal(true);
    };

    const processHandover = async () => {
        if (!handoverData || !handoverData.targetUserId) return;
        setIsSubmitting(true);
        try {
            const clientIP = await (async () => {
                try {
                    const res = await fetch('https://api.ipify.org?format=json');
                    return res.ok ? (await res.json()).ip : 'Não identificado';
                } catch (e) { return 'Não identificado'; }
            })();

            const { error } = await supabase.from('loan_records').update({
                meta: {
                    ...(handoverData.loan.meta || {}),
                    pendingHandoverToUserId: handoverData.targetUserId
                }
            }).eq('id', handoverData.loan.id);

            if (error) throw error;

            onLogAction('LOAN_CREATE', `Solicitou troca de motorista para ${handoverData.loan.assetDescription} para ${handoverData.targetUserName}`);
            setShowHandoverModal(false);
            setHandoverData(null);
            onRefresh();
        } catch (err: any) {
            alert('Erro ao solicitar troca: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRejectHandover = async (loan: LoanRecord) => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('loan_records').update({
                meta: {
                    ...(loan.meta || {}),
                    pendingHandoverToUserId: null
                }
            }).eq('id', loan.id);

            if (error) throw error;

            onLogAction('LOAN_CONFIRM', `Recusou troca de motorista da viatura: ${loan.assetDescription}`);
            onRefresh();
        } catch (err: any) {
            alert('Erro ao recusar troca: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };


    const fetchItemHistory = async () => {
        if (!historyItemId) return;
        setIsLoadingItemHistory(true);
        try {
            let query = supabase
                .from('loan_records')
                .select('id, batch_id, operator_id, receiver_id, receiver_name, asset_type, item_id, description, checkout_time, return_time, status, meta')
                .eq('asset_type', historyItemType)
                .eq('item_id', historyItemId)
                .order('checkout_time', { ascending: true });

            if (historyStartDate) {
                query = query.gte('checkout_time', `${historyStartDate}T00:00:00`);
            }
            if (historyEndDate) {
                query = query.lte('checkout_time', `${historyEndDate}T23:59:59`);
            }

            const { data, error } = await query;

            if (error) throw error;

            const mappedData: LoanRecord[] = (data || []).map((l: any) => ({
                id: l.id,
                batchId: l.batch_id,
                operatorId: l.operator_id,
                receiverId: l.receiver_id,
                receiverName: l.receiver_name,
                assetType: l.asset_type,
                assetId: l.item_id,
                assetDescription: l.description,
                checkoutTime: l.checkout_time,
                returnTime: l.return_time,
                status: l.status,
                meta: l.meta
            }));

            setItemHistoryResults(mappedData);

        } catch (err: any) {
            console.error("Erro ao buscar histórico do item:", err);
            alert("Erro ao buscar histórico.");
        } finally {
            setIsLoadingItemHistory(false);
        }
    };

    // --- BATCH RETURN LOGIC (UPDATED) ---
    const handleReturnBatch = (loansToReturn: LoanRecord[]) => {
        if (loansToReturn.length === 0) return;

        const nonVehicleLoans = loansToReturn.filter(l => l.assetType !== 'VEHICLE');
        const vehicleLoans = loansToReturn.filter(l => l.assetType === 'VEHICLE');

        const processVehicles = () => {
            if (vehicleLoans.length === 0) return;
            // Start Queue
            setBatchVehicleQueue(vehicleLoans.slice(1));
            setBatchActionType('RETURN');
            // Trigger first
            handleReturn(vehicleLoans[0]);
        };

        if (nonVehicleLoans.length === 0) {
            // Only vehicles
            processVehicles();
            return;
        }

        const receiverName = loansToReturn[0].receiverName;
        const msg = vehicleLoans.length > 0
            ? `Confirmar devolução rápida de ${nonVehicleLoans.length} itens? As ${vehicleLoans.length} viaturas serão processadas individualmente na sequência.`
            : `Confirmar a devolução de ${loansToReturn.length} itens de ${receiverName}?`;

        onShowConfirm(
            "Devolver Todos",
            msg,
            async () => {
                setIsSubmitting(true);
                try {
                    const ids = nonVehicleLoans.map(l => l.id);

                    // Fetch IP
                    let clientIP = 'Não identificado';
                    try {
                        const res = await fetch('https://api.ipify.org?format=json');
                        if (res.ok) clientIP = (await res.json()).ip;
                    } catch (e) { }

                    const returnTs = new Date().toISOString();
                    const signatureHash = CryptoJS.SHA256(`BATCH_RETURN|IDS:${ids.join(',')}|TS:${returnTs}|IP:${clientIP}`).toString();

                    const { error } = await supabase.from('loan_records').update({
                        status: 'COMPLETED',
                        return_time: returnTs,
                        updated_ip: clientIP,
                        signature_hash: signatureHash
                    }).in('id', ids);

                    if (error) throw error;
                    onLogAction('LOAN_RETURN', `Recebeu devolução de lote (${nonVehicleLoans.length} itens) de ${receiverName} com Assinatura Digital (Hash: ${signatureHash})`);

                    // Proceed to vehicles if any
                    setTimeout(() => {
                        onRefresh();
                        processVehicles();
                    }, 500);

                } catch (err: any) {
                    console.error("Erro ao devolver lote:", err);
                    alert('Erro ao processar devolução em lote: ' + err.message);
                } finally {
                    setIsSubmitting(false);
                }
            }
        );
    };

    const handleConfirm = async (loan: LoanRecord) => {
        if (isSubmitting) return;



        setIsSubmitting(true);
        try {
            let clientIP = 'Não identificado';
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                if (res.ok) clientIP = (await res.json()).ip;
            } catch (e) { }

            const confirmTs = new Date().toISOString();
            const hashPayload = `CONFIRM|ID:${loan.id}|TS:${confirmTs}|IP:${clientIP}`;
            const signatureHash = CryptoJS.SHA256(hashPayload).toString();

            const { error } = await supabase.from('loan_records').update({
                status: 'ACTIVE',
                updated_ip: clientIP,
                signature_hash: signatureHash
            }).eq('id', loan.id);

            if (error) throw error;
            onLogAction('LOAN_CONFIRM', `Confirmou item: ${loan.assetDescription} com Assinatura Digital (Hash: ${signatureHash})`);
            onRefresh();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async (loan: LoanRecord) => {
        if (isSubmitting) return;

        const isHandover = loan.status === 'ACTIVE' && !!loan.meta?.pendingHandoverToUserId;

        onShowConfirm(
            isHandover ? "Recusar Troca" : "Recusar Item",
            isHandover ? `Deseja recusar a troca da viatura: ${loan.assetDescription}?` : `Deseja recusar o item: ${loan.assetDescription}?`,
            async () => {
                setIsSubmitting(true);
                try {
                    if (isHandover) {
                        await handleRejectHandover(loan);
                    } else {
                        const { error } = await supabase.from('loan_records').update({
                            status: 'REJECTED',
                            return_time: new Date().toISOString()
                        }).eq('id', loan.id);
                        if (error) throw error;
                        onLogAction('LOAN_RETURN', `Recusou item: ${loan.assetDescription}`);
                    }
                    onRefresh();
                } catch (err: any) {
                    alert('Erro ao recusar: ' + err.message);
                } finally {
                    setIsSubmitting(false);
                }
            }
        );
    };

    const handleCancelBatch = async (loansToCancel: LoanRecord[]) => {
        if (isSubmitting) return;
        const receiverName = loansToCancel[0].receiverName;
        onShowConfirm(
            "Cancelar Cautela",
            `Deseja cancelar esta cautela pendente para ${receiverName}? Todos os itens serão liberados.`,
            async () => {
                setIsSubmitting(true); // Set submitting true inside confirm callback
                try {
                    const ids = loansToCancel.map(l => l.id);
                    const { error } = await supabase.from('loan_records').delete().in('id', ids);
                    if (error) throw error;
                    onLogAction('LOAN_RETURN', `Cancelou cautela pendente para ${receiverName} (${loansToCancel.length} itens)`);
                    onRefresh();
                } catch (err: any) {
                    alert('Erro ao cancelar cautela: ' + err.message);
                } finally {
                    setIsSubmitting(false); // Set submitting false in finally
                }
            }
        );
    };

    // --- BATCH CONFIRMATION LOGIC ---
    const handleConfirmBatch = (loansToConfirm: LoanRecord[]) => {
        if (isSubmitting || loansToConfirm.length === 0) return;

        const receiverName = loansToConfirm[0].receiverName;
        onShowConfirm(
            "Confirmar Lote",
            `Confirma a entrega de ${loansToConfirm.length} itens para ${receiverName}?`,
            async () => {
                setIsSubmitting(true);
                try {
                    const ids = loansToConfirm.map(l => l.id);

                    // Fetch IP
                    let clientIP = 'Não identificado';
                    try {
                        const res = await fetch('https://api.ipify.org?format=json');
                        if (res.ok) clientIP = (await res.json()).ip;
                    } catch (e) { }

                    const confirmTs = new Date().toISOString();

                    // Process each loan in the batch
                    for (const loan of loansToConfirm) {
                        const isHandover = loan.status === 'ACTIVE' && !!loan.meta?.pendingHandoverToUserId;

                        if (isHandover) {
                            // It's a handover confirmation
                            const fromUser = users.find(u => u.id === loan.receiverId);
                            const toUser = users.find(u => u.id === loan.meta?.pendingHandoverToUserId);

                            const newHistory = [
                                ...(loan.meta?.handoverHistory || []),
                                {
                                    fromId: loan.receiverId,
                                    fromName: loan.receiverName,
                                    toId: loan.meta!.pendingHandoverToUserId!,
                                    toName: toUser?.name || '...',
                                    timestamp: confirmTs
                                }
                            ];

                            const signatureHash = CryptoJS.SHA256(`HANDOVER_CONFIRM|ID:${loan.id}|FROM:${loan.receiverId}|TO:${loan.meta!.pendingHandoverToUserId}|TS:${confirmTs}|IP:${clientIP}`).toString();

                            const { error } = await supabase.from('loan_records').update({
                                receiver_id: loan.meta!.pendingHandoverToUserId,
                                receiver_name: toUser?.name || '...',
                                meta: {
                                    ...loan.meta,
                                    pendingHandoverToUserId: null,
                                    handoverHistory: newHistory
                                },
                                updated_ip: clientIP,
                                signature_hash: signatureHash
                            }).eq('id', loan.id);

                            if (error) throw error;
                            onLogAction('LOAN_CONFIRM', `Aceitou troca de motorista da viatura: ${loan.assetDescription} (De: ${fromUser?.name})`);
                        } else {
                            // Normal confirmation
                            const signatureHash = CryptoJS.SHA256(`CONFIRM|ID:${loan.id}|TS:${confirmTs}|IP:${clientIP}`).toString();
                            const { error } = await supabase.from('loan_records').update({
                                status: 'ACTIVE',
                                updated_ip: clientIP,
                                signature_hash: signatureHash
                            }).eq('id', loan.id);
                            if (error) throw error;
                        }
                    }

                    if (!loansToConfirm.some(l => l.status === 'ACTIVE' && !!l.meta?.pendingHandoverToUserId)) {
                        onLogAction('LOAN_CONFIRM', `Confirmou entrega de ${loansToConfirm.length} itens para ${receiverName}`);
                    }
                    onRefresh();
                } catch (err: any) {
                    alert('Erro ao confirmar lote: ' + err.message);
                } finally {
                    setIsSubmitting(false);
                }
            }
        );
    };

    const filteredLoans = loans.filter(l => {
        if (activeTab === 'HISTORY') return l.status === 'COMPLETED' || l.status === 'REJECTED';
        if (filterStatus === 'PENDING') return l.status === 'PENDING' || (l.status === 'ACTIVE' && !!l.meta?.pendingHandoverToUserId);
        if (filterStatus === 'ACTIVE') return l.status === 'ACTIVE' || l.status === 'PENDING';
        return l.status === 'ACTIVE' || l.status === 'PENDING';
    }).filter(l => {
        const term = normalizeString(searchTerm);
        // Find user to check matricula
        const user = users.find(u => u.id === l.receiverId);
        const matriculaMatch = user ? user.matricula.includes(searchTerm) : false;

        return normalizeString(l.receiverName).includes(term) ||
            normalizeString(l.assetDescription).includes(term) ||
            matriculaMatch;
    }).filter(l => {
        // PERMISSION FILTER:
        // If canViewAll is true (already checked in App.tsx for role/context), show everything
        if (canViewAll) return true;

        // Otherwise, only see where participant (receiver or operator) or pending handover target
        return l.receiverId === currentUser.id || l.operatorId === currentUser.id || l.meta?.pendingHandoverToUserId === currentUser.id;
    }).filter(l => {
        // Date and Time filtering
        const loanDate = new Date(l.checkoutTime);
        if (dateStart) {
            const startDate = new Date(`${dateStart}T${timeStart || '00:00'}:00`);
            if (startDate > loanDate) return false;
        }
        if (dateEnd) {
            const endDate = new Date(`${dateEnd}T${timeEnd || '23:59'}:59`);
            if (endDate < loanDate) return false;
        }
        return true;
    });

    const sortedLoans = [...filteredLoans].sort((a, b) => {
        if (activeTab === 'HISTORY') {
            const timeA = a.returnTime ? new Date(a.returnTime).getTime() : 0;
            const timeB = b.returnTime ? new Date(b.returnTime).getTime() : 0;
            return timeB - timeA;
        }
        return new Date(b.checkoutTime).getTime() - new Date(a.checkoutTime).getTime();
    });

    // Unified Grouping for ACTIVE and PENDING
    const groupedLoans = useMemo(() => {
        // Removed restrictive check
        // if (filterStatus !== 'ACTIVE' && filterStatus !== 'PENDING') return [];



        const groups: LoanGroup[] = [];
        const pendingGroups: Record<string, LoanRecord[]> = {};
        const activeGroups: Record<string, LoanRecord[]> = {};
        const historyGroups: Record<string, LoanRecord[]> = {};

        sortedLoans.forEach(loan => {
            const isHandover = loan.status === 'ACTIVE' && !!loan.meta?.pendingHandoverToUserId;

            if (loan.status === 'PENDING' || (isHandover && filterStatus === 'PENDING')) {
                // Respect filterStatus: If we are in Monitoramento (ACTIVE), don't show pending
                if (filterStatus === 'ACTIVE') return;

                const targetUserId = isHandover ? loan.meta!.pendingHandoverToUserId! : loan.receiverId;
                const targetUserName = isHandover ? (users.find(u => u.id === targetUserId)?.name || '...') : loan.receiverName;

                const key = isHandover ? `handover-${targetUserId}` : (loan.batchId || loan.receiverId);
                if (!pendingGroups[key]) pendingGroups[key] = [];
                pendingGroups[key].push({ ...loan, receiverId: targetUserId, receiverName: targetUserName });
            } else if (loan.status === 'ACTIVE') {
                if (filterStatus === 'PENDING') return; // Don't show active in pending view

                const key = loan.receiverId;
                if (!activeGroups[key]) activeGroups[key] = [];
                activeGroups[key].push(loan);
            } else if (loan.status === 'COMPLETED' || loan.status === 'REJECTED') {
                if (activeTab !== 'HISTORY') return;

                // Group by Batch/Transaction (time) for History
                const key = loan.batchId || `${loan.receiverId}-${new Date(loan.checkoutTime).getTime()}`;
                if (!historyGroups[key]) historyGroups[key] = [];
                historyGroups[key].push(loan);
            }
        });

        // Convert Pending Maps to List
        Object.keys(pendingGroups).forEach(key => {
            const loans = pendingGroups[key];
            if (loans.length > 0) {
                groups.push({
                    type: 'PENDING',
                    receiverId: loans[0].receiverId,
                    receiverName: loans[0].receiverName,
                    loans: loans,
                    id: `pending-${key}`,
                    timestamp: new Date(loans[0].checkoutTime).getTime()
                });
            }
        });

        // Convert Active Maps to List
        Object.keys(activeGroups).forEach(key => {
            const loans = activeGroups[key];
            if (loans.length > 0) {
                groups.push({
                    type: 'ACTIVE',
                    receiverId: loans[0].receiverId,
                    receiverName: loans[0].receiverName,
                    loans: loans,
                    id: `active-${key}`,
                    timestamp: new Date(loans[0].checkoutTime).getTime()
                });
            }
        });

        // Convert History Maps to List
        Object.keys(historyGroups).forEach(key => {
            const loans = historyGroups[key];
            if (loans.length > 0) {
                groups.push({
                    type: 'HISTORY',
                    receiverId: loans[0].receiverId,
                    receiverName: loans[0].receiverName,
                    loans: loans,
                    id: `history-${key}`,
                    timestamp: loans[0].returnTime ? new Date(loans[0].returnTime).getTime() : new Date(loans[0].checkoutTime).getTime()
                });
            }
        });

        return groups.sort((a, b) => b.timestamp - a.timestamp);

    }, [sortedLoans, filterStatus]);

    const toggleAsset = (type: string, id: string) => {
        if (selectedAssets.some(a => a.id === id)) {
            setSelectedAssets(prev => prev.filter(a => a.id !== id));
        } else {
            setSelectedAssets(prev => [...prev, { type, id }]);
        }
    };

    const getPageTitle = () => {
        if (isReportView) return 'Relatórios de Cautela';
        if (activeTab === 'HISTORY') return 'Histórico de Cautelas';
        if (activeTab === 'NEW') return 'Nova Cautela';
        return 'Monitoramento de Cautelas';
    };

    const getPageSubtitle = () => {
        if (isReportView) return 'Geração de relatórios por item';
        if (filterStatus === 'PENDING') return 'Itens aguardando confirmação do operador';
        return 'Gestão de empréstimos de materiais';
    };

    const showTabs = !isReportView && filterStatus !== 'PENDING' && activeTab !== 'HISTORY';

    // Ícone helper
    const getAssetIcon = (type: string, size: number = 16) => {
        switch (type) {
            case 'VEHICLE': return <Car size={size} strokeWidth={1.5} />;
            case 'VEST': return <Shield size={size} strokeWidth={1.5} />;
            case 'RADIO': return <RadioIcon size={size} strokeWidth={1.5} />;
            case 'EQUIPMENT': return <Package size={size} strokeWidth={1.5} />;
            default: return <Package size={size} strokeWidth={1.5} />;
        }
    };

    // Export PDF function
    const handleExportPDF = () => {
        if (!printRef.current || typeof html2pdf === 'undefined') return;
        setIsExporting(true);
        const element = printRef.current;
        const opt = {
            margin: 0,
            filename: `Relatorio_Cautelas_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                onclone: (doc: Document) => {
                    const el = doc.getElementById('loan-report-container');
                    if (el) {
                        el.style.boxShadow = 'none';
                        // We do NOT reset padding here because it is our margin
                    }
                }
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        html2pdf().set(opt).from(element).save().then(() => setIsExporting(false));
    };

    // Pagination Calculation
    const { historyChunks, totalPages } = useMemo(() => {
        const chunks: LoanRecord[][] = [];
        const items = [...itemHistoryResults];
        const pageHeight = pdfOrientation === 'portrait' ? 297 : 210;
        const safeZone = 2;
        const topMargin = pdfMargins.top;
        const bottomMargin = pdfMargins.bottom;
        const firstPageOverhead = (historyItemType === 'VEHICLE' ? 115 : 85);
        const tableHeaderHeight = 12;
        const rowHeight = 8.5;

        let curPage = 0;
        while (items.length > 0 || (curPage === 0 && items.length === 0)) {
            const availableHeight = pageHeight - topMargin - bottomMargin - safeZone - (curPage === 0 ? firstPageOverhead : tableHeaderHeight);
            const rowsThatFit = Math.max(1, Math.floor(availableHeight / rowHeight));
            chunks.push(items.splice(0, rowsThatFit));
            curPage++;
        }

        const pages = chunks.length + (historyItemType === 'VEHICLE' ? 1 : 0);
        return { historyChunks: chunks, totalPages: pages };
    }, [itemHistoryResults, pdfOrientation, pdfMargins, historyItemType]);

    return (
        <div className="space-y-8 animate-fade-in relative">
            <div className="flex items-center justify-between no-print px-1">
                {(activeTab === 'NEW' || onBack) && (
                    <button
                        onClick={() => {
                            if (activeTab === 'NEW') setActiveTab('ACTIVE');
                            else if (onBack) onBack();
                        }}
                        className="btn-back"
                    >
                        <ArrowLeft size={18} />
                        <span>VOLTAR</span>
                    </button>
                )}
            </div>

            {/* Header Section */}
            <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm no-print">
                {/* Top Row: Title, Search and Main Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Title Block */}
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl shadow-sm border ${activeTab === 'HISTORY' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                            {activeTab === 'HISTORY' ? <History size={24} strokeWidth={2.5} /> : <ArrowRightLeft size={24} strokeWidth={2.5} />}
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
                                {getPageTitle()}
                            </h2>
                            <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {getPageSubtitle()}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 md:flex-1 md:justify-end">
                        {/* Action Buttons */}
                        <div className="flex gap-2 w-full sm:w-auto sm:flex-shrink-0">
                            {(activeTab !== 'HISTORY' || historyMode === 'USER') && (
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex-1 sm:flex-none px-4 sm:px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wide border-2 transition-all duration-200 flex items-center justify-center gap-2 ${showFilters
                                        ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/25'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300 hover:text-brand-600 dark:hover:border-brand-600 dark:hover:text-brand-400'
                                        }`}
                                >
                                    <Filter size={16} />
                                    <span className="hidden sm:inline">Filtros</span>
                                </button>
                            )}
                            {(activeTab === 'HISTORY' && historyMode === 'ITEM' && isReportView) && (
                                <button
                                    onClick={handleExportHistoryPDF}
                                    disabled={isExporting || itemHistoryResults.length === 0}
                                    className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all duration-200 disabled:opacity-50"
                                >
                                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    <span className="hidden sm:inline">Exportar Relatório</span>
                                    <span className="sm:hidden">Exportar</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2">
                        {/* Search Bar - Integrated in Filter Panel */}
                        {(activeTab !== 'HISTORY' || historyMode === 'USER') && (
                            <div className="relative w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome, item ou matrícula..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-white transition-all shadow-sm"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Filters Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="relative">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">Data Inicial</label>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="date"
                                        value={dateStart}
                                        onChange={e => setDateStart(e.target.value)}
                                        className="w-full pl-9 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="relative">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">Hora Inicial</label>
                                <div className="relative">
                                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="time"
                                        value={timeStart}
                                        onChange={e => setTimeStart(e.target.value)}
                                        className="w-full pl-9 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="relative">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">Data Final</label>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="date"
                                        value={dateEnd}
                                        onChange={e => setDateEnd(e.target.value)}
                                        className="w-full pl-9 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="relative">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">Hora Final</label>
                                <div className="relative">
                                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="time"
                                        value={timeEnd}
                                        onChange={e => setTimeEnd(e.target.value)}
                                        className="w-full pl-9 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* Header Title (Contextual) */}
                {!showTabs && (
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                            {activeTab === 'NEW' ? <Plus size={18} /> : (activeTab === 'HISTORY' ? <History size={18} /> : <Shield size={18} />)}
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                            {activeTab === 'NEW' ? 'Nova Cautela' : (activeTab === 'HISTORY' ? 'Histórico de Cautelas' : 'Monitoramento de Ativos')}
                        </h2>
                    </div>
                )}

                {/* Tabs */}
                {showTabs && activeTab !== 'NEW' && false && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => { setActiveTab('ACTIVE'); }}
                            className={`flex-1 justify-center px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all duration-200 border-2 ${activeTab === 'ACTIVE'
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600'
                                }`}
                        >
                            Monitoramento
                        </button>
                    </div>
                )}
            </div>

            {/* Views */}
            {
                activeTab === 'NEW' ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
                        {/* Step 1: Receiver */}
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-3 flex items-center gap-2">
                                <UserIcon size={16} className="text-blue-500" /> 1. Selecione o Recebedor
                            </h3>
                            <div className="relative">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={userSearch}
                                        onChange={(e) => {
                                            setUserSearch(e.target.value);
                                            setShowUserOptions(true);
                                            if (receiverId) setReceiverId(''); // Clear selection on type
                                        }}
                                        onFocus={() => setShowUserOptions(true)}
                                        placeholder="BUSCAR VIGILANTE..."
                                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                    {userSearch && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUserSearch('');
                                                setReceiverId('');
                                            }}
                                            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {showUserOptions && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                                        {users.filter(u => normalizeString(u.name).includes(normalizeString(userSearch)) || u.matricula.includes(userSearch)).length > 0 ? (
                                            users
                                                .filter(u => normalizeString(u.name).includes(normalizeString(userSearch)) || u.matricula.includes(userSearch))
                                                .map(u => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => {
                                                            setReceiverId(u.id);
                                                            setUserSearch(u.name);
                                                            setShowUserOptions(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors"
                                                    >
                                                        <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-200">{u.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{u.jobTitle || 'Vigilante'} • Mat: {u.matricula}</p>
                                                    </button>
                                                ))
                                        ) : (
                                            <div className="p-4 text-center text-xs text-slate-400 font-medium">Nenhum usuário encontrado.</div>
                                        )}
                                    </div>
                                )}
                                {/* Overlay to close options when clicking outside */}
                                {showUserOptions && <div className="fixed inset-0 z-0" onClick={() => setShowUserOptions(false)}></div>}
                            </div>
                        </div>

                        {/* Step 2: Assets */}
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-3 flex items-center gap-2">
                                <Package size={16} className="text-blue-500" /> 2. Selecione os Itens
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-1">
                                {/* Vehicles */}
                                <div className={`flex flex-col gap-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 shadow-sm ${availableVehicles.length === 0 ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-4 w-1 bg-blue-500 rounded-full"></div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Veículos</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {availableVehicles.map(v => (
                                            <div
                                                key={v.id}
                                                onClick={() => toggleAsset('VEHICLE', v.id)}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${selectedAssets.some(a => a.id === v.id) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-400'}`}
                                            >
                                                <Car size={14} className={selectedAssets.some(a => a.id === v.id) ? 'text-white' : 'text-slate-400'} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-black uppercase truncate leading-none">{v.model}</p>
                                                    <p className={`text-[9px] uppercase mt-1 ${selectedAssets.some(a => a.id === v.id) ? 'text-blue-100' : 'text-slate-500'}`}>{v.plate} • {v.prefix}</p>
                                                </div>
                                                {selectedAssets.some(a => a.id === v.id) && <CheckCircle size={14} className="text-white" />}
                                            </div>
                                        ))}
                                        {availableVehicles.length === 0 && <p className="text-[9px] font-bold text-slate-400 uppercase text-center py-4 italic">Nenhum disponível</p>}
                                    </div>
                                </div>

                                {/* Vests (Coletes) */}
                                <div className={`flex flex-col gap-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 shadow-sm ${availableVests.length === 0 ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-4 w-1 bg-emerald-500 rounded-full"></div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Coletes</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {availableVests.map(v => (
                                            <div
                                                key={v.id}
                                                onClick={() => toggleAsset('VEST', v.id)}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${selectedAssets.some(a => a.id === v.id) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-emerald-400'}`}
                                            >
                                                <Shield size={14} className={selectedAssets.some(a => a.id === v.id) ? 'text-white' : 'text-slate-400'} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-black uppercase truncate leading-none">Nº {v.number}</p>
                                                    <p className={`text-[9px] uppercase mt-1 ${selectedAssets.some(a => a.id === v.id) ? 'text-emerald-100' : 'text-slate-500'}`}>TAM: {v.size}</p>
                                                </div>
                                                {selectedAssets.some(a => a.id === v.id) && <CheckCircle size={14} className="text-white" />}
                                            </div>
                                        ))}
                                        {availableVests.length === 0 && <p className="text-[9px] font-bold text-slate-400 uppercase text-center py-4 italic">Nenhum disponível</p>}
                                    </div>
                                </div>

                                {/* Radios */}
                                <div className={`flex flex-col gap-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 shadow-sm ${availableRadios.length === 0 ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-4 w-1 bg-amber-500 rounded-full"></div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rádios</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {availableRadios.map(r => (
                                            <div
                                                key={r.id}
                                                onClick={() => toggleAsset('RADIO', r.id)}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${selectedAssets.some(a => a.id === r.id) ? 'bg-amber-600 border-amber-600 text-white shadow-md' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-amber-400'}`}
                                            >
                                                <RadioIcon size={14} className={selectedAssets.some(a => a.id === r.id) ? 'text-white' : 'text-slate-400'} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-black uppercase truncate leading-none">HT {r.number}</p>
                                                </div>
                                                {selectedAssets.some(a => a.id === r.id) && <CheckCircle size={14} className="text-white" />}
                                            </div>
                                        ))}
                                        {availableRadios.length === 0 && <p className="text-[9px] font-bold text-slate-400 uppercase text-center py-4 italic">Nenhum disponível</p>}
                                    </div>
                                </div>

                                {/* Equipments (Outros) */}
                                <div className={`flex flex-col gap-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 shadow-sm ${equipments.length === 0 ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-4 w-1 bg-purple-500 rounded-full"></div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Outros</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {equipments.map(e => (
                                            <div
                                                key={e.id}
                                                onClick={() => toggleAsset('EQUIPMENT', e.id)}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${selectedAssets.some(a => a.id === e.id) ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-purple-400'}`}
                                            >
                                                <Package size={14} className={selectedAssets.some(a => a.id === e.id) ? 'text-white' : 'text-slate-400'} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-black uppercase truncate leading-none">{e.name}</p>
                                                </div>
                                                {selectedAssets.some(a => a.id === e.id) && <CheckCircle size={14} className="text-white" />}
                                            </div>
                                        ))}
                                        {equipments.length === 0 && <p className="text-[9px] font-bold text-slate-400 uppercase text-center py-4 italic">Nenhum equipamento</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Footer */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="w-full sm:w-auto">
                                <p className="text-xs font-black uppercase text-slate-500">Itens Selecionados: {selectedAssets.length}</p>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button onClick={() => { setSelectedAssets([]); setActiveTab('ACTIVE'); }} className="flex-1 sm:flex-none justify-center px-4 py-3 sm:py-2 text-xs font-bold uppercase text-slate-500 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 rounded-lg sm:bg-transparent sm:dark:bg-transparent">Cancelar</button>
                                <button
                                    onClick={handleCreateLoan}
                                    disabled={isSubmitting || !receiverId || selectedAssets.length === 0}
                                    className="flex-1 sm:flex-none justify-center bg-blue-900 text-white px-6 py-3 sm:py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                                    Confirmar Cautela
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div ref={printRef} id="loan-report-active" className="space-y-4" style={{
                            paddingTop: (isExporting || showExportPreview) ? `${pdfMargins.top}mm` : '0',
                            paddingBottom: (isExporting || showExportPreview) ? `${pdfMargins.bottom}mm` : '0',
                            paddingLeft: (isExporting || showExportPreview) ? `${pdfMargins.left}mm` : '0',
                            paddingRight: (isExporting || showExportPreview) ? `${pdfMargins.right}mm` : '0'
                        }}>

                            {/* HISTORY MODE TOGGLE */}
                            {activeTab === 'HISTORY' && (
                                <>
                                    {/* ITEM HISTORY FILTERS & VIEW */}
                                    {historyMode === 'ITEM' && (
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2 mb-6">
                                            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-5 items-end">
                                                <div className="w-full lg:col-span-2">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Tipo de Item</label>
                                                    <div className="relative">
                                                        <Layers size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <select
                                                            value={historyItemType}
                                                            onChange={(e) => {
                                                                setHistoryItemType(e.target.value);
                                                                setHistoryItemId('');
                                                            }}
                                                            className="w-full pl-9 pr-8 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-black uppercase outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all appearance-none cursor-pointer"
                                                        >
                                                            <option value="VEHICLE">Viaturas</option>
                                                            <option value="VEST">Coletes</option>
                                                            <option value="RADIO">Rádios</option>
                                                            <option value="EQUIPMENT">Outros</option>
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    </div>
                                                </div>
                                                <div className="w-full lg:col-span-4">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Selecione o Item</label>
                                                    <div className="relative">
                                                        <Package size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <select
                                                            value={historyItemId}
                                                            onChange={(e) => setHistoryItemId(e.target.value)}
                                                            className="w-full pl-9 pr-8 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-black uppercase outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer appearance-none"
                                                        >
                                                            <option value="">SELECIONE UM ITEM...</option>
                                                            {historyItemType === 'VEHICLE' && vehicles.map(v => <option key={v.id} value={v.id}>{v.model} - {v.plate}</option>)}
                                                            {historyItemType === 'VEST' && vests.map(v => <option key={v.id} value={v.id}>COLETE Nº {v.number} ({v.size})</option>)}
                                                            {historyItemType === 'RADIO' && radios.map(r => <option key={r.id} value={r.id}>HT {r.number} ({r.serialNumber})</option>)}
                                                            {historyItemType === 'EQUIPMENT' && equipments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    </div>
                                                </div>
                                                <div className="w-full lg:col-span-2">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Data Inicial</label>
                                                    <div className="relative">
                                                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="date" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} className="w-full pl-9 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-black uppercase outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all" />
                                                    </div>
                                                </div>
                                                <div className="w-full lg:col-span-2">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Data Final</label>
                                                    <div className="relative">
                                                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="date" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} className="w-full pl-9 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-black uppercase outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all" />
                                                    </div>
                                                </div>
                                                <div className="w-full lg:col-span-2">
                                                    <button
                                                        onClick={fetchItemHistory}
                                                        disabled={!historyItemId || isLoadingItemHistory}
                                                        className="w-full p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                                    >
                                                        {isLoadingItemHistory ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
                                                        Buscar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* VISIBLE RESULTS TABLE & PREVIEW (Only for ITEM mode) */}
                                    {historyMode === 'ITEM' && (
                                        <>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                                                            <th className="p-3">Data Retirada</th>
                                                            <th className="p-3">Recebedor</th>
                                                            <th className="p-3">Devolução</th>
                                                            <th className="p-3">Status</th>
                                                            <th className="p-3">Detalhes</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {itemHistoryResults.length > 0 ? (
                                                            itemHistoryResults.map(loan => (
                                                                <tr key={loan.id} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                                                                        {new Date(loan.checkoutTime).toLocaleDateString()} <span className="text-slate-400 font-normal">{new Date(loan.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </td>
                                                                    <td className="p-3 uppercase font-bold">{loan.receiverName}</td>
                                                                    <td className="p-3">
                                                                        {loan.returnTime ? (
                                                                            <>
                                                                                {new Date(loan.returnTime).toLocaleDateString()} <span className="text-slate-400 text-[10px]">{new Date(loan.returnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                            </>
                                                                        ) : '-'}
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${loan.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600' :
                                                                            loan.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' :
                                                                                loan.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                                                            }`}>
                                                                            {loan.status === 'COMPLETED' ? 'Devolvido' :
                                                                                loan.status === 'ACTIVE' ? 'Em Uso' :
                                                                                    loan.status === 'REJECTED' ? 'Recusado' : 'Pendente'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3 text-[10px] text-slate-500">
                                                                        {loan.assetType === 'VEHICLE' && loan.meta && (
                                                                            <div className="flex flex-col">
                                                                                <span>KM: {loan.meta.kmStart} {'->'} {loan.meta.kmEnd || '?'}</span>
                                                                                {loan.meta.fuelRefill && <span className="text-blue-500 font-bold flex items-center gap-1"><Droplet size={8} /> Abast.</span>}
                                                                            </div>
                                                                        )}
                                                                        {!['VEHICLE'].includes(loan.assetType) && (
                                                                            <span className="italic opacity-50">---</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={5} className="p-8 text-center text-slate-400 text-xs uppercase font-bold italic">
                                                                    Nenhum registro encontrado.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Export Preview Modal */}
                                            {showExportPreview && (
                                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
                                                    <div className="bg-white dark:bg-slate-900 w-full max-w-[98vw] h-[95vh] rounded-3xl flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-slate-200 dark:border-slate-800">
                                                        {/* Modal Header */}
                                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 md:px-8 md:py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 gap-4 md:gap-0">
                                                            <div className="flex items-center gap-4">
                                                                <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600 dark:text-brand-400 shadow-sm border border-brand-100 dark:border-brand-900/30">
                                                                    <Printer size={24} strokeWidth={2.5} />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Visualizar Relatório</h3>
                                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Ajuste o layout e as margens para impressão perfeita</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                                                                <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden md:block mx-2"></div>
                                                                <button
                                                                    onClick={handleExportHistoryPDF}
                                                                    disabled={isExporting}
                                                                    className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-brand-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                                                                >
                                                                    {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} strokeWidth={2.5} />}
                                                                    {isExporting ? 'PROCESSANDO...' : 'EXPORTAR PDF'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setShowExportPreview(false)}
                                                                    className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 transition-all active:scale-90"
                                                                >
                                                                    <X size={24} strokeWidth={2.5} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Modal Body - Split View */}
                                                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                                                            {/* Sidebar Controls - Modern UX */}
                                                            <div className="w-full md:w-85 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 md:p-8 overflow-y-auto space-y-8 no-scrollbar">

                                                                {/* Margins Section */}
                                                                <section className="space-y-4">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <h4 className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                                                                            <Square size={14} className="text-brand-500" /> Margens ({pdfUnit})
                                                                        </h4>
                                                                        <button
                                                                            onClick={() => setShowMarginGuides(!showMarginGuides)}
                                                                            className={`p-1.5 rounded-lg border transition-all ${showMarginGuides ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-slate-200 text-slate-400'}`}
                                                                            title="Mostrar Guias"
                                                                        >
                                                                            <MousePointer2 size={14} />
                                                                        </button>
                                                                    </div>

                                                                    {/* Preset Selector */}
                                                                    <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl">
                                                                        {(['normal', 'narrow', 'wide'] as const).map(p => (
                                                                            <button
                                                                                key={p}
                                                                                onClick={() => applyPreset(p)}
                                                                                className="px-2 py-2 text-[9px] font-black uppercase rounded-xl transition-all hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm"
                                                                            >
                                                                                {p === 'normal' ? 'Normal' : p === 'narrow' ? 'Estreita' : 'Larga'}
                                                                            </button>
                                                                        ))}
                                                                    </div>

                                                                    {/* Modern Margin Grid */}
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-6 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
                                                                        {/* Top */}
                                                                        <div className="col-span-2 flex flex-col items-center">
                                                                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2">Topo</label>
                                                                            <div className="flex items-center gap-2 w-32 bg-slate-50 dark:bg-slate-900 rounded-xl p-1 border border-slate-100 dark:border-slate-700">
                                                                                <button onClick={() => setPdfMargins(m => ({ ...m, top: Math.max(0, m.top - 1) }))} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"><Minus size={12} /></button>
                                                                                <input type="number" value={pdfMargins.top} onChange={e => setPdfMargins(m => ({ ...m, top: parseInt(e.target.value) || 0 }))} className="w-full text-center text-xs font-black bg-transparent outline-none" />
                                                                                <button onClick={() => setPdfMargins(m => ({ ...m, top: m.top + 1 }))} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"><Plus size={12} /></button>
                                                                            </div>
                                                                        </div>
                                                                        {/* Left & Right */}
                                                                        <div className="flex flex-col items-center">
                                                                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2">Esquerda</label>
                                                                            <div className="flex items-center gap-2 w-full bg-slate-50 dark:bg-slate-900 rounded-xl p-1 border border-slate-100 dark:border-slate-700">
                                                                                <button onClick={() => setPdfMargins(m => ({ ...m, left: Math.max(0, m.left - 1) }))} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"><Minus size={10} /></button>
                                                                                <input type="number" value={pdfMargins.left} onChange={e => setPdfMargins(m => ({ ...m, left: parseInt(e.target.value) || 0 }))} className="w-full text-center text-xs font-black bg-transparent outline-none px-0" />
                                                                                <button onClick={() => setPdfMargins(m => ({ ...m, left: m.left + 1 }))} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"><Plus size={10} /></button>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col items-center">
                                                                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2">Direita</label>
                                                                            <div className="flex items-center gap-2 w-full bg-slate-50 dark:bg-slate-900 rounded-xl p-1 border border-slate-100 dark:border-slate-700">
                                                                                <button onClick={() => setPdfMargins(m => ({ ...m, right: Math.max(0, m.right - 1) }))} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"><Minus size={10} /></button>
                                                                                <input type="number" value={pdfMargins.right} onChange={e => setPdfMargins(m => ({ ...m, right: parseInt(e.target.value) || 0 }))} className="w-full text-center text-xs font-black bg-transparent outline-none px-0" />
                                                                                <button onClick={() => setPdfMargins(m => ({ ...m, right: m.right + 1 }))} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"><Plus size={10} /></button>
                                                                            </div>
                                                                        </div>
                                                                        {/* Bottom */}
                                                                        <div className="col-span-2 flex flex-col items-center mt-2">
                                                                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2">Base</label>
                                                                            <div className="flex items-center gap-2 w-32 bg-slate-50 dark:bg-slate-900 rounded-xl p-1 border border-slate-100 dark:border-slate-700">
                                                                                <button onClick={() => setPdfMargins(m => ({ ...m, bottom: Math.max(0, m.bottom - 1) }))} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"><Minus size={12} /></button>
                                                                                <input type="number" value={pdfMargins.bottom} onChange={e => setPdfMargins(m => ({ ...m, bottom: parseInt(e.target.value) || 0 }))} className="w-full text-center text-xs font-black bg-transparent outline-none" />
                                                                                <button onClick={() => setPdfMargins(m => ({ ...m, bottom: m.bottom + 1 }))} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"><Plus size={12} /></button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </section>

                                                                {/* Page Setup Section */}
                                                                <section className="space-y-6">
                                                                    <h4 className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                                                        <Layers size={14} className="text-brand-500" /> Configuração de Página
                                                                    </h4>

                                                                    {/* Orientation Toggle */}
                                                                    <div className="space-y-3">
                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Orientação</label>
                                                                        <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl relative">
                                                                            <button
                                                                                onClick={() => setPdfOrientation('portrait')}
                                                                                className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all z-10 ${pdfOrientation === 'portrait' ? 'bg-white dark:bg-slate-700 shadow-md text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
                                                                            >
                                                                                <FileText size={16} /> Retrato
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setPdfOrientation('landscape')}
                                                                                className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all z-10 ${pdfOrientation === 'landscape' ? 'bg-white dark:bg-slate-700 shadow-md text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
                                                                            >
                                                                                <FileText size={16} className="rotate-90" /> Paisagem
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Paper Size & Scale */}
                                                                    <div className="grid grid-cols-1 gap-6">
                                                                        <div className="space-y-3">
                                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tamanho do Papel</label>
                                                                            <select
                                                                                value={pdfPaperSize}
                                                                                onChange={e => setPdfPaperSize(e.target.value as any)}
                                                                                className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-brand-500/20"
                                                                            >
                                                                                <option value="A4">A4 (210x297mm)</option>
                                                                                <option value="LETTER">Carta (216x279mm)</option>
                                                                                <option value="LEGAL">Ofício (216x356mm)</option>
                                                                            </select>
                                                                        </div>

                                                                        <div className="space-y-3">
                                                                            <div className="flex items-center justify-between pl-1">
                                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escala de Conteúdo</label>
                                                                                <span className="text-[11px] font-black text-brand-600">{pdfScale}%</span>
                                                                            </div>
                                                                            <input
                                                                                type="range" min="50" max="150" step="5"
                                                                                value={pdfScale}
                                                                                onChange={e => setPdfScale(parseInt(e.target.value))}
                                                                                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-brand-500"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Unit Switcher */}
                                                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <Info size={14} className="text-slate-400" />
                                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Unidade de Medida</span>
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                {(['mm', 'cm', 'in'] as const).map(u => (
                                                                                    <button
                                                                                        key={u}
                                                                                        onClick={() => setPdfUnit(u)}
                                                                                        className={`w-8 h-8 rounded-lg text-[9px] font-black uppercase flex items-center justify-center border transition-all ${pdfUnit === u ? 'bg-brand-600 border-brand-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}
                                                                                    >
                                                                                        {u}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </section>

                                                                {/* Traceability Summary in Sidebar */}
                                                                <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800">
                                                                    <div className="bg-slate-100/50 dark:bg-slate-800/50 p-4 rounded-3xl space-y-3">
                                                                        <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                                            <Shield size={10} /> Metadados de Auditoria
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[7px] text-slate-500 font-bold uppercase truncate">IP: <span className="text-slate-700 dark:text-slate-300">{exportIP}</span></p>
                                                                            <p className="text-[7px] text-slate-500 font-bold uppercase truncate">Hash: <span className="text-slate-700 dark:text-slate-300">{exportHash.substring(0, 20)}...</span></p>
                                                                            <p className="text-[7px] text-slate-500 font-bold uppercase">Data: <span className="text-slate-700 dark:text-slate-300">{exportDate}</span></p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Preview Area (The Canvas) - WYSIWYG */}
                                                            <div className="flex-1 bg-[#F3F4F6] dark:bg-slate-950 p-6 md:p-12 overflow-y-auto no-scrollbar scroll-smooth flex flex-col items-center">
                                                                {/* Visual Scale Controller Info */}
                                                                <div className="mb-8 flex items-center gap-3 px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-full border border-slate-200 dark:border-slate-800 shadow-sm transition-opacity hover:opacity-100 opacity-60">
                                                                    <Maximize size={14} className="text-slate-400" />
                                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Previsualização fiel à impressão</span>
                                                                </div>

                                                                <div
                                                                    ref={printRef}
                                                                    id="history-export-container"
                                                                    className="flex flex-col items-center gap-12 bg-transparent transform-gpu"
                                                                    style={{ scale: pdfScale / 100 }}
                                                                >
                                                                    {historyChunks.map((chunk, pageIndex) => (
                                                                        <div key={pageIndex} className="report-page bg-white shadow-2xl overflow-hidden" style={{
                                                                            width: pdfOrientation === 'portrait' ? '210mm' : '297mm',
                                                                            height: pdfOrientation === 'portrait' ? '297mm' : '210mm',
                                                                            paddingTop: `${pdfMargins.top}mm`,
                                                                            paddingBottom: `${pdfMargins.bottom}mm`,
                                                                            paddingLeft: `${pdfMargins.left}mm`,
                                                                            paddingRight: `${pdfMargins.right}mm`,
                                                                            position: 'relative',
                                                                            fontFamily: "'Inter', sans-serif"
                                                                        }}>
                                                                            <div className="h-full flex flex-col">
                                                                                <div>
                                                                                    {pageIndex === 0 && (
                                                                                        <>
                                                                                            {/* HEADER (Same as IncidentDetail) */}
                                                                                            <div className="flex justify-center items-center mb-1 pb-4 gap-4 md:gap-12 mt-4">
                                                                                                {/* Logo Esquerda (Muni) */}
                                                                                                <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                                                                                                    {customLogoLeft ? (
                                                                                                        <img src={customLogoLeft} className="max-h-full max-w-full object-contain" alt="Brasão Muni" />
                                                                                                    ) : (
                                                                                                        <div className="w-16 h-16 rounded-full border border-slate-800 flex items-center justify-center bg-slate-50 shadow-sm">
                                                                                                            <span className="text-[7px] font-black uppercase text-center text-slate-400">BRASÃO<br />MUNI</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>

                                                                                                <div className="text-center min-w-0 flex-1">
                                                                                                    <h1 className="text-[14px] font-black uppercase text-slate-900 leading-tight tracking-tight whitespace-nowrap">
                                                                                                        PREFEITURA MUNICIPAL DE ARAPONGAS
                                                                                                    </h1>
                                                                                                    <h2 className="text-[12px] font-black uppercase text-slate-900 tracking-wide mt-1">
                                                                                                        SECRETARIA MUNICIPAL DE SEGURANÇA PÚBLICA E TRÂNSITO
                                                                                                    </h2>
                                                                                                    <h3 className="text-[10px] font-bold uppercase text-blue-600 mt-0.5 tracking-wider">
                                                                                                        CENTRO DE MONITORAMENTO MUNICIPAL
                                                                                                    </h3>
                                                                                                </div>

                                                                                                {/* Logo Direita (GCM) */}
                                                                                                <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                                                                                                    {customLogo ? (
                                                                                                        <img src={customLogo} className="max-h-full max-w-full object-contain" alt="Brasão GCM" />
                                                                                                    ) : (
                                                                                                        <div className="w-16 h-16 rounded-full border border-slate-800 flex items-center justify-center bg-slate-50 shadow-sm">
                                                                                                            <span className="text-[7px] font-black uppercase text-center text-slate-400">BRASÃO<br />GCM</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* LINHA DE DIVISÃO SUPERIOR (AZUL) */}
                                                                                            <div style={{ width: '100%', height: '1px', background: '#1e3a5f', marginBottom: '6px' }}></div>

                                                                                            {/* TÍTULO COM LINHAS LATERAIS */}
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                                                                                <div style={{ flex: '1', height: '1px', background: 'rgba(30, 58, 95, 0.3)' }}></div>
                                                                                                <h2 style={{ fontSize: '16px', fontWeight: '900', textTransform: 'uppercase', color: '#1e3a5f', letterSpacing: '0.15em', whiteSpace: 'nowrap', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
                                                                                                    {historyItemType === 'VEHICLE' ? 'DIÁRIO DE BORDO' : 'RELATÓRIO DE CAUTELAS'}
                                                                                                </h2>
                                                                                                <div style={{ flex: '1', height: '1px', background: 'rgba(30, 58, 95, 0.3)' }}></div>
                                                                                            </div>

                                                                                            {/* LINHA DE DIVISÃO INFERIOR (AZUL) */}
                                                                                            <div style={{ width: '100%', height: '1px', background: '#1e3a5f', marginBottom: '12px' }}></div>

                                                                                            {/* VEHICLE SPECIFIC HEADER */}
                                                                                            {historyItemType === 'VEHICLE' ? (
                                                                                                <div className="mb-4 font-black uppercase text-[10px] text-slate-900 border border-slate-900">
                                                                                                    <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-900 divide-x divide-slate-900">
                                                                                                        <div className="col-span-5 p-2 flex items-center gap-2">
                                                                                                            <span className="text-slate-500 font-bold">VEÍCULO:</span>
                                                                                                            <span className="text-[14px]">{vehicles.find(v => v.id === historyItemId)?.model}</span>
                                                                                                        </div>
                                                                                                        <div className="col-span-2 p-2 flex items-center gap-2 justify-center">
                                                                                                            <span className="text-slate-500 font-bold">PLACA:</span>
                                                                                                            <span className="text-[12px]">{vehicles.find(v => v.id === historyItemId)?.plate}</span>
                                                                                                        </div>
                                                                                                        <div className="col-span-2 p-2 flex items-center gap-2 justify-center">
                                                                                                            <span className="text-slate-500 font-bold">Nº FROTA:</span>
                                                                                                            <span className="text-[12px]">{vehicles.find(v => v.id === historyItemId)?.fleetNumber || vehicles.find(v => v.id === historyItemId)?.prefix}</span>
                                                                                                        </div>
                                                                                                        <div className="col-span-3 p-2 flex items-center gap-2 justify-center">
                                                                                                            <span className="text-slate-500 font-bold">COMBUSTÍVEL:</span>
                                                                                                            <span className="text-[12px]">{vehicles.find(v => v.id === historyItemId)?.fuelType || 'FLEX'}</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="grid grid-cols-2 bg-slate-100 divide-x divide-slate-900">
                                                                                                        <div className="p-2 flex items-center gap-2">
                                                                                                            <span className="text-slate-500 font-bold">MÊS/ANO REF.:</span>
                                                                                                            <span className="text-[12px]">
                                                                                                                {historyStartDate ? new Date(historyStartDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase() : new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <div className="p-2 flex items-center gap-2">
                                                                                                            <span className="text-slate-500 font-bold">SECRETARIA:</span>
                                                                                                            <span className="text-[12px]">{vehicles.find(v => v.id === historyItemId)?.department || 'SESTRAN'}</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : (
                                                                                                /* GENERIC HEADER ITEM DISPLAY */
                                                                                                <div className="mb-6 bg-slate-50 border border-slate-200 rounded p-4 text-center shadow-sm">
                                                                                                    <span className="text-[15px] font-black uppercase text-slate-900 tracking-wide">
                                                                                                        {historyItemType === 'VEST' ? 'COLETE ' + vests.find(v => v.id === historyItemId)?.number :
                                                                                                            historyItemType === 'RADIO' ? 'RÁDIO ' + radios.find(v => v.id === historyItemId)?.number :
                                                                                                                equipments.find(e => e.id === historyItemId)?.name || '---'}
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}

                                                                                        </>
                                                                                    )}{/* TABLE */}
                                                                                    {historyItemType === 'VEHICLE' ? (
                                                                                        /* VEHICLE DIARY TABLE */
                                                                                        <div>
                                                                                            <table className="w-full border-collapse border-t border-l border-slate-900 text-[10px]">
                                                                                                <thead>
                                                                                                    <tr className="bg-slate-200 text-slate-900 uppercase font-black">
                                                                                                        <th className="border-r border-b border-slate-900 p-2 text-center w-12">DIA</th>
                                                                                                        <th className="border-r border-b border-slate-900 p-2 text-left">DESTINO / MOTIVO</th>
                                                                                                        <th className="border-r border-b border-slate-900 p-2 text-center w-20">HORA SAÍDA</th>
                                                                                                        <th className="border-r border-b border-slate-900 p-2 text-center w-20">KM SAÍDA</th>
                                                                                                        <th className="border-r border-b border-slate-900 p-2 text-center w-20">HORA CHEGADA</th>
                                                                                                        <th className="border-r border-b border-slate-900 p-2 text-center w-20">KM CHEGADA</th>
                                                                                                        <th className="border-r border-b border-slate-900 p-2 text-center w-20">TOTAL KM</th>
                                                                                                        <th className="border-r border-b border-slate-900 p-2 text-left w-48">MOTORISTA</th>
                                                                                                    </tr>
                                                                                                </thead>
                                                                                                <tbody>
                                                                                                    {chunk.map((item, idx) => (
                                                                                                        <tr key={idx} className="uppercase font-bold text-slate-900" style={{ pageBreakInside: "avoid" }}>
                                                                                                            <td className="border-r border-b border-slate-900 p-2 text-center">
                                                                                                                {new Date(item.checkoutTime).getDate().toString().padStart(2, '0')}
                                                                                                            </td>
                                                                                                            <td className="border-r border-b border-slate-900 p-2 text-left">
                                                                                                                {item.meta?.reason || '---'}
                                                                                                            </td>
                                                                                                            <td className="border-r border-b border-slate-900 p-2 text-center">
                                                                                                                {new Date(item.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                                            </td>
                                                                                                            <td className="border-r border-b border-slate-900 p-2 text-center">
                                                                                                                {item.meta?.kmStart ? Number(item.meta.kmStart).toLocaleString('pt-BR') : '-'}
                                                                                                            </td>
                                                                                                            <td className="border-r border-b border-slate-900 p-2 text-center">
                                                                                                                {item.returnTime ? new Date(item.returnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                                                            </td>
                                                                                                            <td className="border-r border-b border-slate-900 p-2 text-center">
                                                                                                                {item.meta?.kmEnd ? Number(item.meta.kmEnd).toLocaleString('pt-BR') : '-'}
                                                                                                            </td>
                                                                                                            <td className="border-r border-b border-slate-900 p-2 text-center">
                                                                                                                {(item.meta?.kmEnd && item.meta?.kmStart) ? (item.meta.kmEnd - item.meta.kmStart).toLocaleString('pt-BR') : '-'}
                                                                                                            </td>
                                                                                                            <td className="border-r border-b border-slate-900 p-2 text-left">
                                                                                                                {item.receiverName}
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                    ))}
                                                                                                </tbody>
                                                                                            </table>
                                                                                        </div>
                                                                                    ) : (
                                                                                        /* GENERIC TABLE FOR OTHER ITEMS */
                                                                                        <table className="w-full border-collapse border border-slate-800 text-[9px]">
                                                                                            <thead>
                                                                                                <tr className="bg-slate-100 text-slate-900 uppercase font-black">
                                                                                                    <th className="border border-slate-400 p-2 text-center w-20">Retirada</th>
                                                                                                    <th className="border border-slate-400 p-2 text-center w-20">Devolução</th>
                                                                                                    <th className="border border-slate-400 p-2 text-left">Responsável</th>
                                                                                                    <th className="border border-slate-400 p-2 text-center">Status</th>
                                                                                                    <th className="border border-slate-400 p-2 text-center">Obs</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody>
                                                                                                {chunk.map((item, idx) => (
                                                                                                    <tr key={idx} className="uppercase font-medium text-slate-900">
                                                                                                        <td className="border border-slate-300 p-1 text-center leading-tight">
                                                                                                            {new Date(item.checkoutTime).toLocaleDateString()}<br />
                                                                                                            <span className="text-[8px] text-slate-500">{new Date(item.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                                        </td>
                                                                                                        <td className="border border-slate-300 p-1 text-center leading-tight">
                                                                                                            {item.returnTime ? (
                                                                                                                <>
                                                                                                                    {new Date(item.returnTime).toLocaleDateString()}<br />
                                                                                                                    <span className="text-[8px] text-slate-500">{new Date(item.returnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                                                </>
                                                                                                            ) : '-'}
                                                                                                        </td>
                                                                                                        <td className="border border-slate-300 p-1 text-left font-bold">{item.receiverName}</td>
                                                                                                        <td className="border border-slate-300 p-1 text-center font-bold">
                                                                                                            {item.status === 'COMPLETED' ? 'DEVOLVIDO' : item.status === 'ACTIVE' ? 'EM USO' : item.status}
                                                                                                        </td>
                                                                                                        <td className="border border-slate-300 p-1 text-center">
                                                                                                            {item.meta?.notes || '-'}
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    )}
                                                                                </div>

                                                                                {/* PAGE NUMBER */}
                                                                                <div className="mt-auto text-[8px] text-right font-bold text-slate-400 uppercase pt-2 border-t border-slate-200">
                                                                                    PÁGINA {pageIndex + 1} DE {totalPages}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}

                                                                    {/* PAGE 2 - FUEL CONTROL (Only for Vehicles) */}
                                                                    {historyItemType === 'VEHICLE' && (
                                                                        <div className="report-page bg-white shadow-2xl overflow-hidden flex flex-col" style={{
                                                                            width: pdfOrientation === 'portrait' ? '210mm' : '297mm',
                                                                            height: pdfOrientation === 'portrait' ? '297mm' : '210mm',
                                                                            minHeight: '210mm',
                                                                            paddingTop: `${pdfMargins.top}mm`,
                                                                            paddingBottom: `${pdfMargins.bottom}mm`,
                                                                            paddingLeft: `${pdfMargins.left}mm`,
                                                                            paddingRight: `${pdfMargins.right}mm`,
                                                                            position: 'relative',
                                                                            pageBreakAfter: 'always',
                                                                            fontFamily: "'Inter', sans-serif"
                                                                        }}>
                                                                            <div className="h-full flex flex-col">
                                                                                {/* HEADER (Replicated) */}
                                                                                <div className="flex justify-center items-center mb-1 pb-4 gap-4 md:gap-12 mt-4">
                                                                                    <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                                                                                        {customLogoLeft ? (
                                                                                            <img src={customLogoLeft} className="max-h-full max-w-full object-contain" alt="Brasão Muni" />
                                                                                        ) : (
                                                                                            <div className="w-16 h-16 rounded-full border border-slate-800 flex items-center justify-center bg-slate-50 shadow-sm">
                                                                                                <span className="text-[7px] font-black uppercase text-center text-slate-400">BRASÃO<br />MUNI</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="text-center min-w-0 flex-1">
                                                                                        <h1 className="text-[14px] font-black uppercase text-slate-900 leading-tight tracking-tight whitespace-nowrap">
                                                                                            PREFEITURA MUNICIPAL DE ARAPONGAS
                                                                                        </h1>
                                                                                        <h2 className="text-[12px] font-black uppercase text-slate-900 tracking-wide mt-1">
                                                                                            SECRETARIA MUNICIPAL DE SEGURANÇA PÚBLICA E TRÂNSITO
                                                                                        </h2>
                                                                                        <h3 className="text-[10px] font-bold uppercase text-blue-600 mt-0.5 tracking-wider">
                                                                                            CENTRO DE MONITORAMENTO MUNICIPAL
                                                                                        </h3>
                                                                                    </div>

                                                                                    <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                                                                                        {customLogo ? (
                                                                                            <img src={customLogo} className="max-h-full max-w-full object-contain" alt="Brasão GCM" />
                                                                                        ) : (
                                                                                            <div className="w-16 h-16 rounded-full border border-slate-800 flex items-center justify-center bg-slate-50 shadow-sm">
                                                                                                <span className="text-[7px] font-black uppercase text-center text-slate-400">BRASÃO<br />GCM</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                {/* LINES */}
                                                                                <div style={{ width: '100%', height: '1px', background: '#1e3a5f', marginBottom: '6px' }}></div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                                                                    <div style={{ flex: '1', height: '1px', background: 'rgba(30, 58, 95, 0.3)' }}></div>
                                                                                    <h2 style={{ fontSize: '16px', fontWeight: '900', textTransform: 'uppercase', color: '#1e3a5f', letterSpacing: '0.15em', whiteSpace: 'nowrap', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
                                                                                        CONTROLE DE ABASTECIMENTO
                                                                                    </h2>
                                                                                    <div style={{ flex: '1', height: '1px', background: 'rgba(30, 58, 95, 0.3)' }}></div>
                                                                                </div>
                                                                                <div style={{ width: '100%', height: '1px', background: '#1e3a5f', marginBottom: '12px' }}></div>

                                                                                {/* FUEL HEADER INFO */}
                                                                                <div className="mb-4 font-black uppercase text-[10px] text-slate-900 border border-slate-900">
                                                                                    <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-900 divide-x divide-slate-900">
                                                                                        <div className="col-span-5 p-2 flex items-center gap-2">
                                                                                            <span className="text-slate-500 font-bold">VEÍCULO:</span>
                                                                                            <span className="text-[14px]">{vehicles.find(v => v.id === historyItemId)?.model}</span>
                                                                                        </div>
                                                                                        <div className="col-span-2 p-2 flex items-center gap-2 justify-center">
                                                                                            <span className="text-slate-500 font-bold">PLACA:</span>
                                                                                            <span className="text-[12px]">{vehicles.find(v => v.id === historyItemId)?.plate}</span>
                                                                                        </div>
                                                                                        <div className="col-span-2 p-2 flex items-center gap-2 justify-center">
                                                                                            <span className="text-slate-500 font-bold">Nº FROTA:</span>
                                                                                            <span className="text-[12px]">{vehicles.find(v => v.id === historyItemId)?.fleetNumber || vehicles.find(v => v.id === historyItemId)?.prefix}</span>
                                                                                        </div>
                                                                                        <div className="col-span-3 p-2 flex items-center gap-2 justify-center">
                                                                                            <span className="text-slate-500 font-bold">COMBUSTÍVEL:</span>
                                                                                            <span className="text-[12px]">{vehicles.find(v => v.id === historyItemId)?.fuelType || 'FLEX'}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 bg-slate-100 divide-x divide-slate-900">
                                                                                        <div className="p-2 flex items-center gap-2">
                                                                                            <span className="text-slate-500 font-bold">MÊS/ANO REF.:</span>
                                                                                            <span className="text-[12px]">
                                                                                                {historyStartDate ? new Date(historyStartDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase() : new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="p-2 flex items-center gap-2">
                                                                                            <span className="text-slate-500 font-bold">SECRETARIA:</span>
                                                                                            <span className="text-[12px]">{vehicles.find(v => v.id === historyItemId)?.department || 'SESTRAN'}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* FUEL TABLE */}
                                                                                <table className="w-full border-collapse border-t border-l border-slate-900 text-[10px] mb-0">
                                                                                    <thead>
                                                                                        <tr className="bg-slate-200 text-slate-900 uppercase font-black">
                                                                                            <th className="border-r border-b border-slate-900 p-2 text-center w-12">DIA</th>
                                                                                            <th className="border-r border-b border-slate-900 p-2 text-center w-24">QUANT. LITROS</th>
                                                                                            <th className="border-r border-b border-slate-900 p-2 text-center w-32">Nº CUPOM ABAST.</th>
                                                                                            <th className="border-r border-b border-slate-900 p-2 text-center">FORNECEDOR</th>
                                                                                            <th className="border-r border-b border-slate-900 p-2 text-center w-24">KILOMETRAGEM</th>
                                                                                            <th className="border-r border-b border-slate-900 p-2 text-center w-48">MOTORISTA</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {itemHistoryResults.filter(item => item.meta?.fuelRefill).map((item, idx) => (
                                                                                            <tr key={idx} className="uppercase font-bold text-slate-900 text-center h-6">
                                                                                                <td className="border-r border-b border-slate-900 p-1">{new Date(item.checkoutTime).getDate().toString().padStart(2, '0')}</td>
                                                                                                <td className="border-r border-b border-slate-900 p-1">{item.meta?.fuelLiters || '-'}</td>
                                                                                                <td className="border-r border-b border-slate-900 p-1">{item.meta?.couponNumber || '-'}</td>
                                                                                                <td className="border-r border-b border-slate-900 p-1">{item.meta?.supplier || '-'}</td>
                                                                                                <td className="border-r border-b border-slate-900 p-1">{item.meta?.fuelKm ? Number(item.meta.fuelKm).toLocaleString('pt-BR') : '-'}</td>
                                                                                                <td className="border-r border-b border-slate-900 p-1 text-left px-2">{item.meta?.driver || item.receiverName}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                        {/* Empty Rows 15 rows approx */}
                                                                                        {Array.from({ length: Math.max(0, 12 - itemHistoryResults.filter(item => item.meta?.fuelRefill).length) }).map((_, i) => (
                                                                                            <tr key={`empty-fuel-${i}`} className="h-6">
                                                                                                <td className="border-r border-b border-slate-900"></td>
                                                                                                <td className="border-r border-b border-slate-900"></td>
                                                                                                <td className="border-r border-b border-slate-900"></td>
                                                                                                <td className="border-r border-b border-slate-900"></td>
                                                                                                <td className="border-r border-b border-slate-900"></td>
                                                                                                <td className="border-r border-b border-slate-900"></td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>

                                                                                {/* OIL CONTROL HEADER & TABLE */}
                                                                                <div className="bg-slate-200 border-l border-r border-b border-slate-900 p-1 text-center font-black uppercase text-[10px] text-slate-900">
                                                                                    CONTROLE DE ÓLEO LUBRIFICANTE
                                                                                </div>
                                                                                <table className="w-full border-collapse border-l border-slate-900 text-[10px] mb-4">
                                                                                    <thead>
                                                                                        <tr className="bg-slate-100 text-slate-900 uppercase font-black">
                                                                                            <th className="border-r border-b border-slate-900 p-2 text-center w-12">DIA</th>
                                                                                            <th className="border-r border-b border-slate-900 p-2 text-center w-24">QUANT. LITROS</th>
                                                                                            <th className="border-r border-b border-slate-900 p-2 text-center">TIPO DE ÓLEO</th>
                                                                                            <th className="border-r border-b border-slate-900 p-2 text-center">FORNECEDOR</th>
                                                                                            <th className="border-r border-b border-slate-900 p-2 text-center w-24">KILOMETRAGEM</th>
                                                                                            <th className="border-r border-b border-slate-900 p-2 text-center w-48">MOTORISTA</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {/* Empty rows for Oil (3 rows as per image approx) */}
                                                                                        {Array.from({ length: 3 }).map((_, i) => (
                                                                                            <tr key={`empty-oil-${i}`} className="h-6">
                                                                                                <td className="border-r border-b border-slate-900"></td>
                                                                                                <td className="border-r border-b border-slate-900"></td>
                                                                                                <td className="border-r border-b border-slate-900"></td>
                                                                                                <td className="border-r border-b border-slate-900"></td>
                                                                                                <td className="border-r border-b border-slate-900"></td>
                                                                                                <td className="border-r border-b border-slate-900"></td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>



                                                                                {/* PAGE NUMBER */}
                                                                                <div className="mt-auto text-[8px] text-right font-bold text-slate-400 uppercase pt-2 border-t border-slate-200">
                                                                                    PÁGINA {totalPages} DE {totalPages}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {(!activeTab || activeTab !== 'HISTORY' || historyMode === 'USER') && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                                    {groupedLoans.map((group) => (
                                        <div
                                            key={group.id}
                                            onClick={() => setSelectedGroup(group)}
                                            className={`rounded-2xl border-2 overflow-hidden flex flex-col shadow-sm transition-all hover:shadow-md cursor-pointer ${group.type === 'PENDING'
                                                ? 'border-amber-400 bg-white dark:bg-slate-900 shadow-amber-500/5'
                                                : group.type === 'HISTORY'
                                                    ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-slate-500/5 opacity-80 hover:opacity-100'
                                                    : 'border-emerald-400 bg-white dark:bg-slate-900 shadow-emerald-500/5'
                                                }`}
                                        >
                                            {/* Header */}
                                            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-lg font-black shadow-sm ${group.type === 'PENDING' ? 'bg-amber-100 text-amber-600' : group.type === 'HISTORY' ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {group.receiverName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <h3 className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 uppercase leading-tight mb-1 tracking-tight truncate" title={group.receiverName}>
                                                            {group.receiverName}
                                                        </h3>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${group.type === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200'
                                                                : group.type === 'HISTORY' ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                                }`}>
                                                                {group.type === 'PENDING' ? 'AGUARDANDO' : group.type === 'HISTORY' ? (group.loans.some(l => l.status === 'REJECTED') ? 'RECUSADO' : 'DEVOLVIDO') : 'EM POSSE'}
                                                            </span>
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                                <Clock size={10} className="opacity-60" />
                                                                {new Date(group.loans[0].checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Items Grid */}
                                            <div className="p-2 flex-1 overflow-y-auto max-h-[350px]">
                                                <div className="grid grid-cols-2 gap-2 h-full content-start">
                                                    {group.loans.map(loan => (
                                                        <div
                                                            key={loan.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMobileLoanId(prev => prev === loan.id ? null : loan.id);
                                                            }}
                                                            className="bg-slate-50/40 dark:bg-slate-800/20 rounded-xl p-2 flex flex-col items-center justify-center text-center border border-slate-100 dark:border-slate-800 min-h-[75px] relative group transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm cursor-pointer"
                                                        >
                                                            <div className={`mb-1 ${group.type === 'PENDING' ? 'text-amber-500' : group.type === 'HISTORY' ? 'text-slate-400' : 'text-emerald-500'}`}>
                                                                {getAssetIcon(loan.assetType, 20)}
                                                            </div>
                                                            <p className="text-[8px] font-black text-slate-800 dark:text-slate-200 uppercase leading-tight mb-0.5 line-clamp-2 px-1">
                                                                {loan.assetDescription}
                                                            </p>
                                                            {loan.assetType === 'VEHICLE' && (
                                                                <span className="text-[7px] font-bold text-slate-400 uppercase">{loan.meta?.kmStart} KM</span>
                                                            )}
                                                            {(loan.assetType === 'VEST' || loan.assetDescription.includes('(M)') || loan.assetDescription.includes('(G)')) && (
                                                                <span className="text-[7px] font-bold text-slate-400 uppercase opacity-60">
                                                                    TAM: ({loan.assetDescription.match(/\((.*?)\)/)?.[1] || '---'})
                                                                </span>
                                                            )}

                                                            {/* Individual Action (Overlay) */}
                                                            {((group.type === 'PENDING' && ((canApprove && currentUser.id === group.receiverId) || (canCreate && currentUser.id === loan.operatorId))) || (group.type === 'ACTIVE' && (canReturn || (currentUser.id === group.receiverId && loan.assetType === 'VEHICLE')))) && (
                                                                <div className={`absolute inset-0 bg-slate-900/90 rounded-xl flex items-center justify-center transition-all duration-200 backdrop-blur-[2px] z-10 p-1.5 gap-1 font-black uppercase ${activeMobileLoanId === loan.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto`}>
                                                                    {group.type === 'PENDING' ? (
                                                                        <div className="flex flex-col gap-1 w-full h-full p-1 justify-center items-center overflow-hidden">
                                                                            {currentUser.id === group.receiverId && canApprove && (
                                                                                <>
                                                                                    <button
                                                                                        disabled={isSubmitting}
                                                                                        onClick={(e) => { e.stopPropagation(); handleConfirm(loan); }}
                                                                                        className="w-full flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] md:text-[10px] font-black rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1 px-1"
                                                                                    >
                                                                                        <CheckCircle size={12} className="flex-shrink-0" /> <span className="truncate">{loan.status === 'ACTIVE' ? 'ACEITAR TROCA' : 'ACEITAR'}</span>
                                                                                    </button>
                                                                                    <button
                                                                                        disabled={isSubmitting}
                                                                                        onClick={(e) => { e.stopPropagation(); handleReject(loan); }}
                                                                                        className="w-full flex-1 bg-red-600 hover:bg-red-500 text-white text-[8px] md:text-[10px] font-black rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1 px-1"
                                                                                    >
                                                                                        <XCircle size={12} className="flex-shrink-0" /> <span className="truncate">{loan.status === 'ACTIVE' ? 'RECUSAR TROCA' : 'RECUSAR'}</span>
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                            {currentUser.id === loan.operatorId && currentUser.id !== group.receiverId && (
                                                                                <span className="text-white text-[7px] text-center px-1">Aguardando ConfirmaÃ§Ã£o</span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        (canReturn || (currentUser.id === group.receiverId && loan.assetType === 'VEHICLE')) && (
                                                                            <div className="flex flex-col gap-1 w-full h-full p-1 justify-center items-center overflow-hidden">
                                                                                {loan.assetType === 'VEHICLE' && (
                                                                                    <>
                                                                                        {currentUser.id === group.receiverId && (
                                                                                            <button
                                                                                                disabled={isSubmitting}
                                                                                                onClick={(e) => { e.stopPropagation(); handleHandover(loan); }}
                                                                                                className="w-full flex-1 bg-slate-700 hover:bg-slate-600 text-white text-[8px] md:text-[10px] font-black rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1 px-1"
                                                                                            >
                                                                                                <ArrowRightLeft size={12} className="flex-shrink-0" /> <span className="truncate">TROCAR</span>
                                                                                            </button>
                                                                                        )}
                                                                                        <button
                                                                                            disabled={isSubmitting}
                                                                                            onClick={(e) => { e.stopPropagation(); handleRefuel(loan); }}
                                                                                            className="w-full flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[8px] md:text-[10px] font-black rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1 px-1"
                                                                                        >
                                                                                            <Fuel size={12} className="flex-shrink-0" /> <span className="truncate">ABASTECER</span>
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                                {canReturn && (
                                                                                    <button
                                                                                        disabled={isSubmitting}
                                                                                        onClick={(e) => { e.stopPropagation(); handleReturn(loan); }}
                                                                                        className="w-full flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] md:text-[10px] font-black rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1 px-1"
                                                                                    >
                                                                                        <CheckCircle size={12} className="flex-shrink-0" /> <span className="truncate">DEVOLVER</span>
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Footer Action */}
                                            {group.type !== 'HISTORY' && (
                                                <div className={`p-2 border-t ${group.type === 'PENDING' ? 'bg-amber-50/20' : 'bg-emerald-50/20'} dark:bg-slate-800/50 border-slate-100 dark:border-slate-800`}>
                                                    {group.type === 'PENDING' ? (
                                                        <div className="flex gap-1.5">
                                                            {currentUser.id === group.receiverId && canApprove && (
                                                                <button
                                                                    disabled={isSubmitting}
                                                                    onClick={(e) => { e.stopPropagation(); handleConfirmBatch(group.loans); }}
                                                                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-amber-500/25 disabled:opacity-50"
                                                                >
                                                                    <CheckCircle size={12} /> ACEITAR TUDO
                                                                </button>
                                                            )}
                                                            {group.loans.some(l => l.operator_id === currentUser.id || l.operatorId === currentUser.id) && canCreate && (
                                                                <button
                                                                    disabled={isSubmitting}
                                                                    onClick={(e) => { e.stopPropagation(); handleCancelBatch(group.loans); }}
                                                                    className="px-2.5 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                                                    title="Cancelar Cautela"
                                                                >
                                                                    <XCircle size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        canReturn && currentUser.id === group.receiverId && (
                                                            <button
                                                                disabled={isSubmitting}
                                                                onClick={(e) => { e.stopPropagation(); handleReturnBatch(group.loans); }}
                                                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                                            >
                                                                <CornerDownLeft size={16} /> DEVOLVER TODOS
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {(!activeTab || activeTab !== 'HISTORY' || historyMode === 'USER') && groupedLoans.length === 0 && (
                                <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                                    <div className="w-16 h-16 mx-auto bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                        <ArrowRightLeft size={32} />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-400 uppercase">Nenhuma cautela encontrada</h3>
                                    <p className="text-xs text-slate-400 mt-1">Não há itens ativos ou pendentes no momento.</p>
                                </div>
                            )}
                        </div>
                    </>
                )
            }
            {/* Custom Overlay for Vehicle Return */}
            {
                showVehicleReturnModal && vehicleReturnData && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-green-100 text-green-600 rounded-full"><CornerDownLeft size={24} /></div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Devolução de Viatura</h3>
                                    <p className="text-xs text-slate-500 uppercase">{vehicleReturnData.model}</p>
                                    {vehicleReturnData.batchIdsToComplete && vehicleReturnData.batchIdsToComplete.length > 0 && (
                                        <p className="text-[10px] text-blue-500 font-bold uppercase mt-1">+ {vehicleReturnData.batchIdsToComplete.length} itens do lote serão devolvidos.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">Quilometragem Final (KM)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={vehicleReturnData.kmEnd ? vehicleReturnData.kmEnd.toLocaleString('pt-BR') : ''}
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/\D/g, '');
                                                const numeric = rawValue ? parseInt(rawValue) : 0;
                                                setVehicleReturnData({ ...vehicleReturnData, kmEnd: numeric });
                                            }}
                                            className={`w-full pl-10 p-3 rounded-lg border bg-slate-50 dark:bg-slate-800 font-bold text-lg outline-none focus:ring-2 transition-all ${vehicleReturnData.kmEnd < vehicleReturnData.kmStart
                                                ? 'border-red-300 focus:ring-red-500 text-red-600'
                                                : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 text-slate-800 dark:text-white'
                                                }`}
                                        />
                                        <Gauge className="absolute left-3 top-3.5 text-slate-400" size={20} />
                                    </div>

                                    <div className="mt-2">
                                        {vehicleReturnData.kmEnd < vehicleReturnData.kmStart ? (
                                            <div className="flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
                                                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase">Inconsistência</p>
                                                    <p className="text-[10px]">Menor que saída ({vehicleReturnData.kmStart.toLocaleString('pt-BR')} KM).</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-900">
                                                <span className="text-[10px] font-black uppercase">Total Percorrido</span>
                                                <span className="text-sm font-black font-mono">{(vehicleReturnData.kmEnd - vehicleReturnData.kmStart).toLocaleString('pt-BR')} Km</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                                        <input
                                            type="checkbox"
                                            checked={vehicleReturnData.refuel}
                                            onChange={(e) => setVehicleReturnData({ ...vehicleReturnData, refuel: e.target.checked })}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1"><Fuel size={14} /> Houve Abastecimento?</span>
                                    </label>

                                    {vehicleReturnData.refuel && (
                                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg animate-in slide-in-from-top-1 space-y-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowQRScanner(true)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-md active:scale-[0.98]"
                                            >
                                                <QrCode size={16} /> Ler QR Code (Digital)
                                            </button>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Litros</label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={vehicleReturnData.fuelLiters}
                                                            onChange={(e) => {
                                                                let val = e.target.value.replace('.', ',');
                                                                if (/^\d*,?\d*$/.test(val)) {
                                                                    setVehicleReturnData({ ...vehicleReturnData, fuelLiters: val })
                                                                }
                                                            }}
                                                            className="w-full pl-7 p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold bg-white dark:bg-slate-900"
                                                            placeholder="0,0"
                                                            inputMode="decimal"
                                                        />
                                                        <Droplet size={12} className="absolute left-2 top-2.5 text-slate-400" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Combustível</label>
                                                    <select
                                                        value={vehicleReturnData.fuelType}
                                                        onChange={(e) => setVehicleReturnData({ ...vehicleReturnData, fuelType: e.target.value })}
                                                        className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold uppercase bg-white dark:bg-slate-900"
                                                    >
                                                        <option>Gasolina</option>
                                                        <option>Etanol</option>
                                                        <option>Diesel</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">KM do Abastecimento</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={vehicleReturnData.fuelKm ? parseInt(vehicleReturnData.fuelKm).toLocaleString('pt-BR') : ''}
                                                        onChange={(e) => {
                                                            const raw = e.target.value.replace(/\D/g, '');
                                                            const val = raw ? parseInt(raw) : '';
                                                            setVehicleReturnData({ ...vehicleReturnData, fuelKm: val.toString() })
                                                        }}
                                                        className="w-full pl-7 p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold bg-white dark:bg-slate-900"
                                                        placeholder="0"
                                                        inputMode="numeric"
                                                    />
                                                    <Gauge size={12} className="absolute left-2 top-2.5 text-slate-400" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Fornecedor</label>
                                                <input
                                                    type="text"
                                                    value={vehicleReturnData.supplier}
                                                    onChange={(e) => setVehicleReturnData({ ...vehicleReturnData, supplier: e.target.value.toUpperCase() })}
                                                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold bg-white dark:bg-slate-900 uppercase"
                                                    placeholder="NOME DO POSTO"
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Número do Cupom</label>
                                                    <input
                                                        type="text"
                                                        value={vehicleReturnData.couponNumber}
                                                        onChange={(e) => setVehicleReturnData({ ...vehicleReturnData, couponNumber: e.target.value })}
                                                        className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold bg-white dark:bg-slate-900"
                                                        placeholder="Nº NFC-e"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Motorista</label>
                                                    <input
                                                        type="text"
                                                        value={vehicleReturnData.driver}
                                                        onChange={(e) => setVehicleReturnData({ ...vehicleReturnData, driver: e.target.value.toUpperCase() })}
                                                        className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold bg-white dark:bg-slate-900 uppercase"
                                                        placeholder="NOME DO MOTORISTA"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowVehicleReturnModal(false)} className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                <button
                                    onClick={processVehicleReturn}
                                    disabled={isSubmitting || vehicleReturnData.kmEnd < vehicleReturnData.kmStart}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase hover:bg-emerald-700 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />} Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Custom Overlay for Refueling */}
            {
                showRefuelModal && refuelData && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Fuel size={24} /></div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Registrar Abastecimento</h3>
                                    <p className="text-xs text-slate-500 uppercase">{refuelData.model}</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-slate-800 p-3 rounded-lg animate-in slide-in-from-top-1 space-y-3 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setShowQRScanner(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-md active:scale-[0.98]"
                                >
                                    <QrCode size={16} /> Ler QR Code (Digital)
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Litros</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={refuelData.fuelLiters}
                                                onChange={(e) => {
                                                    let val = e.target.value.replace('.', ',');
                                                    if (/^\d*,?\d*$/.test(val)) {
                                                        setRefuelData({ ...refuelData, fuelLiters: val })
                                                    }
                                                }}
                                                className="w-full pl-7 p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold bg-white dark:bg-slate-900"
                                                placeholder="0,0"
                                                inputMode="decimal"
                                            />
                                            <Droplet size={12} className="absolute left-2 top-2.5 text-slate-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Combustível</label>
                                        <select
                                            value={refuelData.fuelType}
                                            onChange={(e) => setRefuelData({ ...refuelData, fuelType: e.target.value })}
                                            className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold uppercase bg-white dark:bg-slate-900"
                                        >
                                            <option>Gasolina</option>
                                            <option>Etanol</option>
                                            <option>Diesel</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">KM do Abastecimento</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={refuelData.fuelKm ? parseInt(refuelData.fuelKm).toLocaleString('pt-BR') : ''}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/\D/g, '');
                                                const val = raw ? parseInt(raw) : '';
                                                setRefuelData({ ...refuelData, fuelKm: val.toString() })
                                            }}
                                            className={`w-full pl-7 p-2 rounded border text-xs font-bold bg-white dark:bg-slate-900 ${parseInt(refuelData.fuelKm || '0') < refuelData.currentKm ? 'border-red-300 text-red-600' : 'border-slate-300 dark:border-slate-600'}`}
                                            placeholder="0"
                                            inputMode="numeric"
                                        />
                                        <Gauge size={12} className="absolute left-2 top-2.5 text-slate-400" />
                                    </div>
                                    {parseInt(refuelData.fuelKm || '0') < refuelData.currentKm && (
                                        <p className="text-[9px] text-red-500 font-bold mt-1">KM menor que atual ({refuelData.currentKm})</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Fornecedor</label>
                                    <input
                                        type="text"
                                        value={refuelData.supplier}
                                        onChange={(e) => setRefuelData({ ...refuelData, supplier: e.target.value.toUpperCase() })}
                                        className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold bg-white dark:bg-slate-900 uppercase"
                                        placeholder="NOME DO POSTO"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Número do Cupom</label>
                                        <input
                                            type="text"
                                            value={refuelData.couponNumber}
                                            onChange={(e) => setRefuelData({ ...refuelData, couponNumber: e.target.value })}
                                            className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold bg-white dark:bg-slate-900"
                                            placeholder="Nº NFC-e"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Motorista</label>
                                        <input
                                            type="text"
                                            value={refuelData.driver}
                                            onChange={(e) => setRefuelData({ ...refuelData, driver: e.target.value.toUpperCase() })}
                                            className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold bg-white dark:bg-slate-900 uppercase"
                                            placeholder="NOME DO MOTORISTA"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowRefuelModal(false)} className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                <button
                                    onClick={processRefuel}
                                    disabled={isSubmitting || !refuelData.fuelLiters || parseInt(refuelData.fuelKm || '0') < refuelData.currentKm}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />} Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Handover Modal (Vehicle Driver Switch) */}
            {
                showHandoverModal && handoverData && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setShowHandoverModal(false)}>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400">
                                    <ArrowRightLeft size={24} />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-black text-slate-900 dark:text-white uppercase leading-tight">Trocar Motorista</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{handoverData.loan.assetDescription}</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="relative">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 text-center font-black">Selecionar Novo Motorista</label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={handoverData.userSearch}
                                            onChange={(e) => setHandoverData({ ...handoverData, userSearch: e.target.value })}
                                            placeholder="BUSCAR NOME OU MATRÍCULA..."
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-brand-500 transition-all font-black"
                                        />
                                    </div>

                                    {handoverData.userSearch.length >= 2 && !handoverData.targetUserId && (
                                        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-[400] max-h-48 overflow-y-auto ring-4 ring-black/5">
                                            {users
                                                .filter(u => u.id !== currentUser.id && (normalizeString(u.name).includes(normalizeString(handoverData.userSearch)) || u.matricula.includes(handoverData.userSearch)))
                                                .map(u => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => setHandoverData({ ...handoverData, targetUserId: u.id, targetUserName: u.name, userSearch: u.name })}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col gap-0.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
                                                    >
                                                        <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">{u.name}</span>
                                                        <span className="text-[9px] font-bold text-slate-400">MATRÍCULA: {u.matricula}</span>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>

                                {handoverData.targetUserId && (
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center text-emerald-600">
                                                <CheckCircle size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase">Destinatário</p>
                                                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-300 uppercase mt-0.5">{handoverData.targetUserName}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setHandoverData({ ...handoverData, targetUserId: '', targetUserName: '', userSearch: '' })}
                                            className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase p-1"
                                        >
                                            Trocar
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowHandoverModal(false)}
                                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={!handoverData.targetUserId || isSubmitting}
                                    onClick={processHandover}
                                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <ArrowRightLeft size={14} />} Solicitar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Group Details Modal */}
            {
                selectedGroup && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedGroup(null)}>
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-none">{selectedGroup.receiverName}</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">
                                        {selectedGroup.type === 'PENDING' ? 'Aguardando Confirmação' : selectedGroup.type === 'HISTORY' ? 'Devolvido / Histórico' : 'Em Posse'} • {selectedGroup.loans.length} Itens
                                    </p>
                                </div>
                                <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-0 overflow-y-auto custom-scrollbar">
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {selectedGroup.loans.map((loan) => (
                                        <div key={loan.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <div className={`p-3 rounded-xl ${selectedGroup.type === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                                                selectedGroup.type === 'HISTORY' ? 'bg-slate-100 text-slate-500' :
                                                    'bg-emerald-100 text-emerald-600'
                                                }`}>
                                                {getAssetIcon(loan.assetType, 24)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase truncate">
                                                    {loan.assetDescription}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase">
                                                    <span>Retirada: {new Date(loan.checkoutTime).toLocaleTimeString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                    {loan.returnTime && (
                                                        <span>• Devolução: {new Date(loan.returnTime).toLocaleTimeString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                    )}
                                                </div>
                                                {/* Mostra dados de veículo se houver */}
                                                {loan.assetType === 'VEHICLE' && loan.meta && (
                                                    <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-[10px] font-mono grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                                                        <div>
                                                            <span className="font-bold block text-slate-400">SAÍDA</span>
                                                            {loan.meta.kmStart ? `${loan.meta.kmStart} Km` : '-'}
                                                        </div>
                                                        <div>
                                                            <span className="font-bold block text-slate-400">CHEGADA</span>
                                                            {loan.meta.kmEnd ? `${loan.meta.kmEnd} Km` : '-'}
                                                        </div>
                                                        {loan.meta.fuelRefill && (
                                                            <div className="col-span-2 border-t border-slate-200 dark:border-slate-600 pt-1 mt-1 space-y-1">
                                                                <span className="font-bold block text-blue-500 flex items-center gap-1"><Fuel size={10} /> ABASTECIMENTO</span>
                                                                <div className="grid grid-cols-2 gap-x-2">
                                                                    <span>{loan.meta.fuelLiters} L ({loan.meta.fuelType}) @ {loan.meta.fuelKm} Km</span>
                                                                    {loan.meta.couponNumber && <span className="text-right">Cupom: {loan.meta.couponNumber}</span>}
                                                                    {loan.meta.supplier && <span className="col-span-2 text-slate-400 italic">Fornecedor: {loan.meta.supplier}</span>}
                                                                    {loan.meta.driver && <span className="col-span-2 text-slate-400 italic">Motorista: {loan.meta.driver}</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${loan.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                    loan.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                                        loan.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {loan.status === 'PENDING' ? 'Pendente' : loan.status === 'ACTIVE' ? 'Ativo' : loan.status === 'REJECTED' ? 'Recusado' : 'Devolvido'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex justify-end">
                                <button
                                    onClick={() => setSelectedGroup(null)}
                                    className="px-6 py-2.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-black uppercase rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showQRScanner && (
                    <QRScanner
                        onScan={(decodedText) => {
                            setShowQRScanner(false);

                            // HANDLE RETURN SCAN
                            if (vehicleReturnData && showVehicleReturnModal) {
                                // Parser para SEFAZ PR (Exemplo da imagem)
                                if (decodedText.includes("fazenda.pr.gov.br") || decodedText.includes("RESUMO PAGAMENTO")) {
                                    const kmMatch = decodedText.match(/km:(\d+)/i);
                                    const driverMatch = decodedText.match(/MOTORISTA\s+([^|]+)/i);
                                    setVehicleReturnData({
                                        ...vehicleReturnData,
                                        couponNumber: "723226", // Mock extract
                                        fuelLiters: "29,876",
                                        fuelType: "Etanol",
                                        fuelKm: kmMatch ? kmMatch[1] : vehicleReturnData.kmEnd.toString(),
                                        driver: driverMatch ? driverMatch[1].trim().toUpperCase() : vehicleReturnData.driver
                                    });
                                } else {
                                    alert("QR Code lido: " + decodedText);
                                }
                            }
                            // HANDLE REFUEL SCAN
                            else if (refuelData && showRefuelModal) {
                                if (decodedText.includes("fazenda.pr.gov.br") || decodedText.includes("RESUMO PAGAMENTO")) {
                                    const kmMatch = decodedText.match(/km:(\d+)/i);
                                    const driverMatch = decodedText.match(/MOTORISTA\s+([^|]+)/i);
                                    setRefuelData({
                                        ...refuelData,
                                        couponNumber: "723226", // Mock extract
                                        fuelLiters: "29,876",
                                        fuelType: "Etanol",
                                        fuelKm: kmMatch ? kmMatch[1] : refuelData.fuelKm.toString(),
                                        driver: driverMatch ? driverMatch[1].trim().toUpperCase() : refuelData.driver
                                    });
                                } else {
                                    alert("QR Code lido: " + decodedText);
                                }
                            }
                        }}
                        onClose={() => setShowQRScanner(false)}
                    />
                )
            }
        </div>
    );
};
