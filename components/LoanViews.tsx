
import React, { useState, useMemo, useRef } from 'react';
import { User, Vehicle, Vest, Radio, Equipment, LoanRecord, SystemLog } from '../types';
import { supabase } from '../services/supabaseClient';
import {
    ArrowRightLeft, History, Plus, Search, User as UserIcon,
    Car, Shield, Radio as RadioIcon, Package, CheckCircle,
    XCircle, Clock, Calendar, ChevronRight, CornerDownLeft,
    AlertCircle, Loader2, Filter, Layers, Gauge, Fuel, DollarSign, Droplet, ArrowUpRight, AlertTriangle, Download, X
} from 'lucide-react';
import { Modal } from './Modal';
import { normalizeString } from '../utils/stringUtils';

declare var html2pdf: any;

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
    initialTab?: 'ACTIVE' | 'HISTORY';
    isReportView?: boolean;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void;
    filterStatus?: 'ACTIVE' | 'PENDING';
    onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const LoanViews: React.FC<LoanViewsProps> = ({
    currentUser, users, vehicles, vests, radios, equipments, onLogAction,
    loans, onRefresh, initialTab = 'ACTIVE', isReportView = false,
    hasMore = false, isLoadingMore = false, onLoadMore, filterStatus,
    onShowConfirm
}) => {
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'NEW'>(initialTab === 'HISTORY' ? 'HISTORY' : 'ACTIVE');
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const printRef = useRef<HTMLDivElement>(null);

    // Form States
    const [receiverId, setReceiverId] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [showUserOptions, setShowUserOptions] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState<{ type: string, id: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // States for Vehicle Mileage Modals
    const [showVehicleStartModal, setShowVehicleStartModal] = useState(false);
    const [vehicleStartData, setVehicleStartData] = useState<{ id: string, model: string, currentKm: number, manualKm: number } | null>(null);

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
        batchIdsToComplete?: string[] // IDs de outros itens do lote para devolver junto
    } | null>(null);

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

    const handleCreateLoan = async () => {
        if (!receiverId || selectedAssets.length === 0) return alert("Selecione um recebedor e ao menos um item.");

        // Check for Vehicles to confirm mileage
        const vehicleAsset = selectedAssets.find(a => a.type === 'VEHICLE');
        if (vehicleAsset) {
            const vehicle = vehicles.find(v => v.id === vehicleAsset.id);
            if (vehicle) {
                setVehicleStartData({
                    id: vehicle.id,
                    model: `${vehicle.model} (${vehicle.plate})`,
                    currentKm: vehicle.currentKm || 0,
                    manualKm: vehicle.currentKm || 0
                });
                setShowVehicleStartModal(true);
                return; // Stop here, wait for modal confirmation
            }
        }

        await processLoanCreation();
    };

    const processLoanCreation = async (startKmOverride?: number) => {
        setIsSubmitting(true);
        const batchId = crypto.randomUUID();
        const receiver = users.find(u => u.id === receiverId);

        const newLoans = selectedAssets.map(asset => {
            let description = '';
            let meta = {};

            if (asset.type === 'VEHICLE') {
                const v = vehicles.find(x => x.id === asset.id);
                description = `${v?.model} (${v?.plate})`;
                if (startKmOverride !== undefined) {
                    meta = { kmStart: startKmOverride };
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
                meta: Object.keys(meta).length > 0 ? meta : null
            };
        });

        try {
            const { error } = await supabase.from('loan_records').insert(newLoans);
            if (error) throw error;

            onLogAction('LOAN_CREATE', `Criou cautela para ${receiver?.name} com ${newLoans.length} itens.`);
            onLogAction('LOAN_CREATE', `Criou cautela para ${receiver?.name} com ${newLoans.length} itens.`);
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
                refuel: false,
                fuelLiters: '',
                fuelType: 'Gasolina',
                fuelKm: ''
            });
            setShowVehicleReturnModal(true);
            return;
        }

        onShowConfirm(
            "Confirmar Devolução",
            `Deseja confirmar a devolução do item: ${loan.assetDescription}?`,
            async () => {
                try {
                    const { error } = await supabase.from('loan_records').update({
                        status: 'COMPLETED',
                        return_time: new Date().toISOString()
                    }).eq('id', loan.id);

                    if (error) throw error;

                    onLogAction('LOAN_RETURN', `Recebeu devolução: ${loan.assetDescription}`);
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
                fuelKm: vehicleReturnData.refuel && vehicleReturnData.fuelKm ? parseInt(vehicleReturnData.fuelKm.replace(/\D/g, '')) : null
            };

            const { error: loanError } = await supabase.from('loan_records').update({
                status: 'COMPLETED',
                return_time: new Date().toISOString(),
                meta: metaUpdate
            }).eq('id', vehicleReturnData.loanId);

            if (loanError) throw loanError;

            // Update Vehicle KM Table
            // TEMPORARY FIX: The 'currentKm' column does not exist in the database properly yet.
            // We are skipping the update of the master Vehicle record to allow the return flow to complete.
            // The KM is still recorded in the loan history (loan_records meta).
            /*
            const { error: vehicleError } = await supabase.from('vehicles').update({
                currentKm: vehicleReturnData.kmEnd
            }).eq('id', vehicleReturnData.vehicleId);

            if (vehicleError) throw vehicleError;
            */

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

            onLogAction('LOAN_RETURN', logMsg);
            setShowVehicleReturnModal(false);
            setVehicleReturnData(null);
            onRefresh();
        } catch (err: any) {
            console.error("Erro return vehicle:", err);
            alert('Erro ao devolver veículo: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- BATCH RETURN LOGIC (UPDATED) ---
    const handleReturnBatch = (loansToReturn: LoanRecord[]) => {
        if (loansToReturn.length === 0) return;

        // Check if batch contains a vehicle
        const vehicleLoan = loansToReturn.find(l => l.assetType === 'VEHICLE');

        if (vehicleLoan) {
            // Identify other items to return together
            const otherLoanIds = loansToReturn
                .filter(l => l.id !== vehicleLoan.id)
                .map(l => l.id);

            setVehicleReturnData({
                loanId: vehicleLoan.id,
                vehicleId: vehicleLoan.assetId,
                model: vehicleLoan.assetDescription,
                kmStart: vehicleLoan.meta?.kmStart || 0,
                kmEnd: vehicleLoan.meta?.kmStart || 0, // Default to start KM
                refuel: false,
                fuelLiters: '',
                fuelType: 'Gasolina',
                fuelKm: '',
                batchIdsToComplete: otherLoanIds // Pass the rest of the batch
            });
            setShowVehicleReturnModal(true);
            return;
        }

        const receiverName = loansToReturn[0].receiverName;

        onShowConfirm(
            "Devolver Todos",
            `Confirmar a devolução de ${loansToReturn.length} itens de ${receiverName}?`,
            async () => {
                try {
                    const ids = loansToReturn.map(l => l.id);
                    const { error } = await supabase.from('loan_records').update({
                        status: 'COMPLETED',
                        return_time: new Date().toISOString()
                    }).in('id', ids);

                    if (error) throw error;
                    onLogAction('LOAN_RETURN', `Recebeu devolução de lote (${loansToReturn.length} itens) de ${receiverName}`);
                    setTimeout(() => onRefresh(), 200);
                } catch (err: any) {
                    console.error("Erro ao devolver lote:", err);
                    alert('Erro ao processar devolução em lote: ' + err.message);
                }
            }
        );
    };

    const handleConfirm = async (loan: LoanRecord) => {
        try {
            const { error } = await supabase.from('loan_records').update({ status: 'ACTIVE' }).eq('id', loan.id);
            if (error) throw error;
            onLogAction('LOAN_CONFIRM', `Confirmou item: ${loan.assetDescription}`);
            onRefresh();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        }
    };

    const handleReject = async (loan: LoanRecord) => {
        onShowConfirm(
            "Recusar Item",
            `Deseja recursar o item: ${loan.assetDescription}?`,
            async () => {
                try {
                    const { error } = await supabase.from('loan_records').update({
                        status: 'REJECTED',
                        return_time: new Date().toISOString()
                    }).eq('id', loan.id);
                    if (error) throw error;
                    onLogAction('LOAN_RETURN', `Recusou item: ${loan.assetDescription}`);
                    onRefresh();
                } catch (err: any) {
                    alert('Erro ao recusar item: ' + err.message);
                }
            }
        );
    };

    const handleCancelBatch = async (loansToCancel: LoanRecord[]) => {
        const receiverName = loansToCancel[0].receiverName;
        onShowConfirm(
            "Cancelar Cautela",
            `Deseja cancelar esta cautela pendente para ${receiverName}? Todos os itens serão liberados.`,
            async () => {
                try {
                    const ids = loansToCancel.map(l => l.id);
                    const { error } = await supabase.from('loan_records').delete().in('id', ids);
                    if (error) throw error;
                    onLogAction('LOAN_RETURN', `Cancelou cautela pendente para ${receiverName} (${loansToCancel.length} itens)`);
                    onRefresh();
                } catch (err: any) {
                    alert('Erro ao cancelar cautela: ' + err.message);
                }
            }
        );
    };

    // --- BATCH CONFIRMATION LOGIC ---
    const handleConfirmBatch = (loansToConfirm: LoanRecord[]) => {
        if (loansToConfirm.length === 0) return;
        const receiverName = loansToConfirm[0].receiverName;

        onShowConfirm(
            "Confirmar Lote",
            `Confirma a entrega de ${loansToConfirm.length} itens para ${receiverName}?`,
            async () => {
                try {
                    const ids = loansToConfirm.map(l => l.id);
                    const { error } = await supabase.from('loan_records').update({ status: 'ACTIVE' }).in('id', ids);
                    if (error) throw error;
                    onLogAction('LOAN_CONFIRM', `Confirmou lote de ${loansToConfirm.length} itens para ${receiverName}`);
                    onRefresh();
                } catch (err: any) {
                    alert('Erro ao confirmar lote: ' + err.message);
                }
            }
        );
    };

    const filteredLoans = loans.filter(l => {
        if (activeTab === 'HISTORY') return l.status === 'COMPLETED' || l.status === 'REJECTED';
        if (filterStatus === 'PENDING') return l.status === 'PENDING';
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
        // Date filtering
        const loanDate = new Date(l.checkoutTime);
        if (dateStart && new Date(dateStart) > loanDate) return false;
        if (dateEnd) {
            const endDate = new Date(dateEnd);
            endDate.setHours(23, 59, 59, 999);
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

        type LoanGroup = {
            type: 'PENDING' | 'ACTIVE' | 'HISTORY';
            receiverId: string;
            receiverName: string;
            loans: LoanRecord[];
            id: string;
            timestamp: number;
        };

        const groups: LoanGroup[] = [];
        const pendingGroups: Record<string, LoanRecord[]> = {};
        const activeGroups: Record<string, LoanRecord[]> = {};
        const historyGroups: Record<string, LoanRecord[]> = {};

        sortedLoans.forEach(loan => {
            if (loan.status === 'PENDING') {
                const key = loan.batchId || loan.receiverId;
                if (!pendingGroups[key]) pendingGroups[key] = [];
                pendingGroups[key].push(loan);
            } else if (loan.status === 'ACTIVE') {
                const key = loan.receiverId;
                if (!activeGroups[key]) activeGroups[key] = [];
                activeGroups[key].push(loan);
            } else if (loan.status === 'COMPLETED' || loan.status === 'REJECTED') {
                const key = loan.receiverId;
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
        if (activeTab === 'HISTORY') return 'Histórico de Cautelas';
        if (activeTab === 'NEW') return 'Nova Cautela';
        return 'Monitoramento de Cautelas';
        return 'Cautelas Ativas';
    };

    const getPageSubtitle = () => {
        if (filterStatus === 'PENDING') return 'Itens aguardando confirmação do operador';
        return 'Gestão de empréstimos de materiais';
    };

    const showTabs = !isReportView && filterStatus !== 'PENDING';

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
            margin: [10, 10, 10, 10],
            filename: `Relatorio_Cautelas_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        html2pdf().set(opt).from(element).save().then(() => setIsExporting(false));
    };

    return (
        <div className="space-y-4 animate-fade-in relative">
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm no-print">
                {/* Title Row */}
                <div className="flex items-center gap-3 mb-5">
                    <div className={`p-2.5 rounded-xl ${activeTab === 'HISTORY' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                        {activeTab === 'HISTORY' ? <History size={22} strokeWidth={2} /> : <ArrowRightLeft size={22} strokeWidth={2} />}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
                            {getPageTitle()}
                        </h2>
                        <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                            {getPageSubtitle()}
                        </p>
                    </div>
                </div>

                {/* Search and Actions Row */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Input - Full Width */}
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, item ou matrícula..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-white transition-all shadow-sm"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 sm:flex-shrink-0">
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
                        {(activeTab === 'HISTORY' || isReportView) && (
                            <button
                                onClick={handleExportPDF}
                                disabled={isExporting}
                                className="flex-1 sm:flex-none px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 dark:from-slate-700 dark:to-slate-800 dark:hover:from-slate-600 dark:hover:to-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all duration-200 disabled:opacity-50"
                            >
                                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                <span className="hidden sm:inline">Exportar</span>
                                <span className="sm:hidden">PDF</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Data Inicial</label>
                            <input
                                type="date"
                                value={dateStart}
                                onChange={e => setDateStart(e.target.value)}
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Data Final</label>
                            <input
                                type="date"
                                value={dateEnd}
                                onChange={e => setDateEnd(e.target.value)}
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                    </div>
                )}

                {/* Tabs */}
                {showTabs && (
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
                        <button
                            onClick={() => setActiveTab('NEW')}
                            className={`flex-1 justify-center px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all duration-200 border-2 flex items-center gap-1.5 ${activeTab === 'NEW'
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600'
                                }`}
                        >
                            <Plus size={14} /> <span className="hidden sm:inline">Nova Cautela</span><span className="sm:hidden">Novo</span>
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
                        <div ref={printRef} className="space-y-4">
                            {/* UNIFIED GRID VIEW */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                                {groupedLoans.map((group) => (
                                    <div
                                        key={group.id}
                                        className={`rounded-2xl border-2 overflow-hidden flex flex-col shadow-sm transition-all hover:shadow-md ${group.type === 'PENDING'
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
                                                    <div key={loan.id} className="bg-slate-50/40 dark:bg-slate-800/20 rounded-xl p-2 flex flex-col items-center justify-center text-center border border-slate-100 dark:border-slate-800 min-h-[75px] relative group transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm">
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
                                                        {((group.type === 'PENDING' && (currentUser.id === group.receiverId || currentUser.id === loan.operatorId)) || group.type === 'ACTIVE') && (
                                                            <div className="absolute inset-0 bg-slate-900/90 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-[2px] z-10 p-1.5 gap-1 font-black uppercase">
                                                                {group.type === 'PENDING' ? (
                                                                    <>
                                                                        {currentUser.id === group.receiverId && (
                                                                            <>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); handleConfirm(loan); }}
                                                                                    className="flex-1 py-1 bg-emerald-600 text-white text-[7px] rounded-lg shadow-lg active:scale-95 transition-all"
                                                                                >
                                                                                    Aceitar
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); handleReject(loan); }}
                                                                                    className="flex-1 py-1 bg-red-600 text-white text-[7px] rounded-lg shadow-lg active:scale-95 transition-all"
                                                                                >
                                                                                    Recusar
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {currentUser.id === loan.operatorId && currentUser.id !== group.receiverId && (
                                                                            <span className="text-white text-[7px] text-center px-1">Aguardando Confirmação</span>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleReturn(loan); }}
                                                                        className="w-full py-1 bg-emerald-600 text-white text-[8px] rounded-lg shadow-lg active:scale-95 transition-all"
                                                                    >
                                                                        Devolver
                                                                    </button>
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
                                                        {currentUser.id === group.receiverId && (
                                                            <button
                                                                onClick={() => handleConfirmBatch(group.loans)}
                                                                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-amber-500/25"
                                                            >
                                                                <CheckCircle size={12} /> ACEITAR TUDO
                                                            </button>
                                                        )}

                                                        {group.loans.some(l => l.operator_id === currentUser.id || l.operatorId === currentUser.id) && (
                                                            <button
                                                                onClick={() => handleCancelBatch(group.loans)}
                                                                className="px-2.5 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-all active:scale-95"
                                                                title="Cancelar Cautela"
                                                            >
                                                                <XCircle size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleReturnBatch(group.loans)}
                                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-emerald-500/25"
                                                    >
                                                        <CornerDownLeft size={12} /> DEVOLVER TODOS
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {groupedLoans.length === 0 && (
                                <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                                    <div className="w-16 h-16 mx-auto bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                        <ArrowRightLeft size={32} />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-400 uppercase">Nenhuma cautela encontrada</h3>
                                    <p className="text-xs text-slate-400 mt-1">Não há itens ativos ou pendentes no momento.</p>
                                </div>
                            )}
                        </div>
                        {hasMore && (
                            <div className="text-center pt-4">
                                <button
                                    onClick={onLoadMore}
                                    disabled={isLoadingMore}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase"
                                >
                                    {isLoadingMore ? 'Carregando...' : 'Carregar Mais'}
                                </button>
                            </div>
                        )}
                    </>
                )}

            {/* Global Modals and Overlays (Outside ternary) */}
            <div className="no-print">


                {/* Modal: Confirm Vehicle Start KM */}
                <Modal
                    isOpen={showVehicleStartModal}
                    type="confirm"
                    title="Confirmação de Saída de Viatura"
                    message=""
                    onClose={() => setShowVehicleStartModal(false)}
                    onConfirm={() => processLoanCreation(vehicleStartData?.manualKm)}
                >
                </Modal>

                {/* Custom Overlay for Vehicle Start */}
                {
                    showVehicleStartModal && vehicleStartData && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Car size={24} /></div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Saída de Viatura</h3>
                                        <p className="text-xs text-slate-500 uppercase">{vehicleStartData.model}</p>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">Quilometragem Inicial (KM)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={vehicleStartData.manualKm ? vehicleStartData.manualKm.toLocaleString('pt-BR') : ''}
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/\D/g, '');
                                                const numeric = rawValue ? parseInt(rawValue) : 0;
                                                setVehicleStartData({ ...vehicleStartData, manualKm: numeric });
                                            }}
                                            className={`w-full pl-10 p-3 rounded-lg border bg-slate-50 dark:bg-slate-800 font-bold text-lg outline-none focus:ring-2 transition-all ${vehicleStartData.manualKm < vehicleStartData.currentKm
                                                ? 'border-red-300 focus:ring-red-500 text-red-600'
                                                : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 text-slate-800 dark:text-white'
                                                }`}
                                        />
                                        <Gauge className="absolute left-3 top-3.5 text-slate-400" size={20} />
                                    </div>

                                    {/* Visual Validation & Mask Display */}
                                    <div className="mt-3">
                                        {vehicleStartData.manualKm < vehicleStartData.currentKm ? (
                                            <div className="flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
                                                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase">KM Inconsistente</p>
                                                    <p className="text-[10px]">Valor menor que o atual ({vehicleStartData.currentKm.toLocaleString('pt-BR')} KM).</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle size={16} />
                                                    <span className="text-[10px] font-black uppercase">Quilometragem Validada</span>
                                                </div>
                                                {vehicleStartData.manualKm > vehicleStartData.currentKm && (
                                                    <span className="text-[10px] font-mono font-bold">+{vehicleStartData.manualKm - vehicleStartData.currentKm} Km</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setShowVehicleStartModal(false)} className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                    <button
                                        onClick={() => processLoanCreation(vehicleStartData.manualKm)}
                                        disabled={vehicleStartData.manualKm < vehicleStartData.currentKm}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Confirmar Saída
                                    </button>
                                </div>
                            </div>
                        </div>
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
            </div>
        </div >
    );
};
