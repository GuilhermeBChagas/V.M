
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Auth } from './Auth';
import { Dashboard } from './Dashboard';
import { IncidentForm } from './IncidentForm';
import { BuildingForm } from './BuildingForm';
import { UserForm } from './UserForm';
import { SectorForm } from './SectorForm';
import { JobTitleForm } from './JobTitleForm';
import { IncidentDetail } from './IncidentDetail';
import { ChartsView } from './ChartsView';
import { LogsView } from './LogsView';
import { ToolsView } from './ToolsView';
import { Modal } from './Modal';
import { DatabaseSetup } from './DatabaseSetup';
import { AlterationTypeForm } from './AlterationTypeForm';
import { AlterationTypeManager } from './AlterationTypeManager';
import { ProfileView } from './ProfileView';
import { VehicleList, VehicleForm, VestList, VestForm, RadioList, RadioForm, EquipmentList, EquipmentForm } from './AssetViews';
import { LoanViews } from './LoanViews';
import AnnouncementManager from './AnnouncementManager';
import { announcementService } from '../services/announcementService';
import { User, Building, Incident, ViewState, UserRole, Sector, JobTitle, AlterationType, SystemLog, Vehicle, Vest, Radio, Equipment, LoanRecord, SystemPermissionMap, PermissionKey, UserPermissionOverrides, MenuVisibilityMap, UserMenuVisibilityOverrides } from '../types';
import { LayoutDashboard, Building as BuildingIcon, Users, LogOut, Menu, FileText, Pencil, Plus, Map, MapPin, Trash2, ChevronRight, Shield, Loader2, Search, PieChart as PieChartIcon, Download, Filter, CheckCircle, Clock, X, AlertCircle, Database, Settings, UserCheck, Moon, Sun, Wrench, ChevronDown, FolderOpen, Car, Radio as RadioIcon, Package, ArrowRightLeft, CloudOff, History, Ban, XCircle, Tag, RefreshCw, Bell, Key, Hash, FileSpreadsheet, Briefcase, Megaphone } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { normalizeString } from '../utils/stringUtils';

declare var html2pdf: any;
declare var XLSX: any;

declare const __APP_VERSION__: string;
declare const __GIT_HASH__: string;
declare const __BUILD_DATE__: string;

// --- CONFIGURAÇÃO PADRÃO DE PERMISSÕES (FALLBACK) ---
const DEFAULT_PERMISSIONS: SystemPermissionMap = {
  VIEW_DASHBOARD: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.RONDA, UserRole.OUTROS],
  CREATE_INCIDENT: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.RONDA],
  VIEW_ALL_INCIDENTS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  EDIT_INCIDENT: [UserRole.ADMIN, UserRole.SUPERVISOR],
  APPROVE_INCIDENT: [UserRole.ADMIN, UserRole.SUPERVISOR],
  DELETE_INCIDENT: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_ASSETS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  DELETE_ASSETS: [UserRole.ADMIN],
  MANAGE_LOANS: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR],
  RETURN_LOANS: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR],
  MANAGE_USERS: [UserRole.ADMIN],
  DELETE_USERS: [UserRole.ADMIN],
  MANAGE_BUILDINGS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_SECTORS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_ALTERATION_TYPES: [UserRole.ADMIN, UserRole.SUPERVISOR],
  ACCESS_TOOLS: [UserRole.ADMIN],
  EXPORT_REPORTS: [UserRole.ADMIN, UserRole.SUPERVISOR]
};

// --- HELPER FUNCTION ---
const mapIncident = (db: any): Incident => ({
  ...db,
  raCode: db.ra_code || db.raCode,
  buildingId: db.building_id || db.buildingId,
  userId: db.user_id || db.userId,
  operatorName: db.operator_name || db.operatorName,
  vigilants: db.vigilants,
  date: db.date,
  startTime: db.start_time || db.startTime,
  endTime: db.end_time || db.endTime,
  alterationType: db.alteration_type || db.alterationType,
  approvedBy: db.approved_by || db.approvedBy,
  approvedAt: db.approved_at || db.approvedAt,
  isEdited: db.is_edited || db.isEdited,
  editedBy: db.edited_by || db.editedBy,
  lastEditedAt: db.last_edited_at || db.lastEditedAt,
  cancellationReason: db.cancellation_reason || db.cancellationReason,
  cancelledBy: db.cancelled_by || db.cancelledBy,
  cancelledAt: db.cancelled_at || db.cancelledAt,

  created_at: db.created_at,
  status: (db.status || 'PENDING').toUpperCase()
});

const mapLoan = (l: any): LoanRecord => ({
  ...l,
  batchId: l.batch_id || l.batchId,
  operatorId: l.operator_id || l.operatorId,
  receiverId: l.receiver_id || l.receiverId,
  receiverName: l.receiver_name || l.receiverName,
  assetType: l.asset_type || l.item_type || l.assetType, // Added item_type fallback
  assetId: l.asset_id || l.item_id || l.assetId, // Added item_id fallback
  assetDescription: l.asset_description || l.description || l.assetDescription, // Mapped to support both column names
  checkoutTime: l.checkout_time || l.checkoutTime,
  returnTime: l.return_time || l.returnTime,
});

// --- INLINE COMPONENTS DEFINITIONS ---

interface NavItemProps {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed: boolean;
  badge?: number;
  isSubItem?: boolean;
  hasChevron?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, collapsed, badge, isSubItem, hasChevron }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center transition-all duration-300 relative group
      ${collapsed ? 'justify-center py-4 px-0' : 'px-4 py-3 mx-0 rounded-2xl'} 
      ${active
        ? 'bg-blue-600/10 text-blue-400 ring-1 ring-blue-500/20'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'} 
      ${isSubItem ? 'pl-11' : ''}`}
    title={collapsed ? label : ''}
  >
    {/* Active indicator pill (only if not collapsed and not subitem) */}
    {active && !collapsed && !isSubItem && (
      <div className="absolute left-[-16px] h-6 w-1 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
    )}

    {icon && (
      <div className={`flex-shrink-0 transition-transform duration-300 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
    )}

    {!collapsed && (
      <span className={`text-sm font-semibold tracking-wide truncate ${isSubItem ? 'text-[13px]' : 'ml-3'}`}>
        {label}
      </span>
    )}

    {badge && badge > 0 && (
      <span className={`absolute ${collapsed ? 'top-2 right-1' : 'right-10'} bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-[#0b101d] shadow-lg transform transition-transform group-hover:scale-110 top-1/2 -translate-y-1/2`}>
        {badge}
      </span>
    )}
  </button>
);

const IncidentHistory: React.FC<{
  incidents: Incident[];
  buildings: Building[];
  alterationTypes: AlterationType[];
  onView: (incident: Incident) => void;
  onEdit: (incident: Incident) => void;
  onDelete: (id: string) => void;
  onApprove?: (id: string) => void;
  filterStatus: 'PENDING' | 'COMPLETED';
  currentUser: User | null;
  customLogo: string | null;
  customLogoLeft?: string | null;
  loans?: LoanRecord[];
  onConfirmLoanBatch?: (batchId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
}> = (props) => {
  const { incidents, buildings, onView, onApprove,
    filterStatus, currentUser, customLogo, customLogoLeft, loans = [], onConfirmLoanBatch,
    onLoadMore, hasMore, isLoadingMore, canApprove, canExport } = props;
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');

  const [statusFilter, setStatusFilter] = useState<'APPROVED' | 'CANCELLED' | 'PENDING'>(
    filterStatus === 'PENDING' ? 'PENDING' : 'APPROVED'
  );

  useEffect(() => {
    setStatusFilter(filterStatus === 'PENDING' ? 'PENDING' : 'APPROVED');
  }, [filterStatus]);

  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  let filtered = incidents.filter(i => {
    const status = (i.status || '').toUpperCase();
    if (filterStatus === 'PENDING') return status === 'PENDING';
    return status === 'APPROVED' || status === 'CANCELLED';
  });

  const startFilter = dateStart ? new Date(`${dateStart}T${timeStart || '00:00'}`) : null;
  const endFilter = dateEnd ? new Date(`${dateEnd}T${timeEnd || '23:59'}`) : null;

  filtered = filtered.filter(i => {
    if (!startFilter && !endFilter) return true;
    const incidentTime = new Date(`${i.date}T${i.startTime}`);
    if (startFilter && incidentTime < startFilter) return false;
    if (endFilter && incidentTime > endFilter) return false;
    return true;
  });

  const sortedIncidents = [...filtered].sort((a, b) => {
    const splitRa = (ra: string) => {
      const parts = (ra || "").split('/');
      return { num: parseInt(parts[0]) || 0, year: parseInt(parts[1]) || 0 };
    };
    const raA = splitRa(a.raCode);
    const raB = splitRa(b.raCode);
    if (raB.year !== raA.year) return raB.year - raA.year;
    return raB.num - raA.num;
  });

  const displayIncidents = sortedIncidents.filter(i => {
    const searchNorm = normalizeString(search);
    const building = buildings.find(b => b.id === i.buildingId);
    const buildingName = normalizeString(building?.name || '');
    const buildingNumber = normalizeString(building?.buildingNumber || '');

    return (
      normalizeString(i.raCode || '').includes(searchNorm) ||
      normalizeString(i.description).includes(searchNorm) ||
      buildingName.includes(searchNorm) ||
      buildingNumber.includes(searchNorm)
    );
  });

  const handleExportPDF = () => {
    if (!printRef.current || typeof html2pdf === 'undefined') return;
    setIsExporting(true);
    const element = printRef.current;
    const opt = {
      margin: [5, 5, 5, 5],
      filename: `Relatorio_Atendimentos_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save().then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm no-print">
        {/* Title Row */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2.5 rounded-xl ${filterStatus === 'PENDING' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            {filterStatus === 'PENDING' ? <Clock size={22} strokeWidth={2} /> : <History size={22} strokeWidth={2} />}
          </div>
          <div className="flex-1">
            <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
              {filterStatus === 'PENDING' ? 'Atendimentos Pendentes' : 'Histórico de Atendimentos'}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
              {filterStatus === 'PENDING' ? 'Aguardando validação ou recebimento' : 'Gestão de registros de atendimento'}
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
              placeholder="Buscar por RA, local ou descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-white transition-all"
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
            {canExport && filterStatus === 'COMPLETED' && (
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
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Data Inicial</label>
              <input
                type="date"
                value={dateStart}
                onChange={e => setDateStart(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Hora Inicial</label>
              <input
                type="time"
                value={timeStart}
                onChange={e => setTimeStart(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Data Final</label>
              <input
                type="date"
                value={dateEnd}
                onChange={e => setDateEnd(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Hora Final</label>
              <input
                type="time"
                value={timeEnd}
                onChange={e => setTimeEnd(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-3">
        {displayIncidents.map(incident => {
          const building = buildings.find(b => b.id === incident.buildingId);
          const isCancelled = incident.status === 'CANCELLED';
          const isPending = incident.status === 'PENDING';
          const isApproved = incident.status === 'APPROVED';
          let borderClass = 'border-l-4 border-slate-300';
          if (isApproved) borderClass = 'border-l-4 border-emerald-500';
          else if (isCancelled) borderClass = 'border-l-4 border-red-500';
          else if (isPending) borderClass = 'border-l-4 border-amber-500';
          return (
            <div key={incident.id} onClick={() => onView(incident)} className={`bg-white dark:bg-slate-900 p-4 rounded-r-xl ${borderClass} shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer group relative overflow-hidden ${isCancelled ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
              <div className="flex-1 min-w-0 z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-slate-800 text-white text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider">RA {incident.raCode}</span>
                  {isCancelled && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-black px-2 py-0.5 rounded uppercase flex items-center gap-1"><Ban size={10} /> Cancelado</span>}
                  {isApproved && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-black px-2 py-0.5 rounded uppercase flex items-center gap-1"><CheckCircle size={10} /> Validado</span>}
                  {isPending && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-black px-2 py-0.5 rounded uppercase flex items-center gap-1"><Clock size={10} /> Pendente</span>}
                  <span className="text-xs font-bold text-slate-400 ml-auto md:ml-2">{new Date(incident.date).toLocaleDateString('pt-BR')} • {incident.startTime}</span>
                </div>
                <h3 className={`font-black text-sm uppercase mb-1 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors ${isCancelled ? 'text-slate-500 line-through decoration-red-500 decoration-2' : 'text-slate-800 dark:text-slate-100'}`}>{building?.name || 'Local Desconhecido'}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{incident.description}</p>
              </div>
              <div className="w-full md:w-auto mt-2 md:mt-0 flex-shrink-0 z-20" onClick={(e) => e.stopPropagation()}>
                {isPending && canApprove && (
                  <button onClick={() => onApprove?.(incident.id)} className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all">
                    <CheckCircle size={14} /> Validar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filterStatus !== 'PENDING' && hasMore && (
        <button
          onClick={() => onLoadMore?.()}
          disabled={isLoadingMore}
          className="w-full py-4 mt-4 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          {isLoadingMore ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={16} />}
          {isLoadingMore ? 'BUSCANDO REGISTROS...' : 'CARREGAR MAIS REGISTROS'}
        </button>
      )}

      {/* Hidden Export Area */}
      <div className="hidden">
        <div ref={printRef} className="p-6 bg-white text-black" style={{ width: '280mm', minHeight: '180mm', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
          {/* Cabecalho Institucional conforme imagem */}
          <div className="flex justify-center items-center mb-8 gap-12">
            <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
              {customLogoLeft ? (
                <img src={customLogoLeft} className="max-h-full max-w-full object-contain" alt="Brasão Esquerda" />
              ) : (
                <div className="w-16 h-16 rounded-full border border-slate-800 flex items-center justify-center bg-slate-50">
                  <span className="text-[7px] font-black uppercase text-center text-slate-400">BRASÃO<br />MUNI</span>
                </div>
              )}
            </div>

            <div className="text-center">
              <h1 className="text-[18px] font-black uppercase text-slate-900 leading-tight">
                PREFEITURA MUNICIPAL DE ARAPONGAS
              </h1>
              <h2 className="text-[14px] font-black uppercase text-slate-900 mt-1">
                SECRETARIA MUNICIPAL DE SEGURANÇA PÚBLICA E TRÂNSITO
              </h2>
              <h3 className="text-[12px] font-bold uppercase text-blue-600 mt-1 tracking-wider">
                CENTRO DE MONITORAMENTO MUNICIPAL
              </h3>
              <div className="mt-8 inline-block px-8 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-[13px] font-black uppercase tracking-[0.15em] text-slate-700 shadow-sm">
                Relatório Geral de Atendimentos
              </div>
              {(dateStart || dateEnd) && (
                <div className="text-[10px] uppercase font-bold text-slate-500 mt-2">
                  Período: {dateStart ? new Date(dateStart + 'T00:00').toLocaleDateString('pt-BR') : 'Início'} até {dateEnd ? new Date(dateEnd + 'T00:00').toLocaleDateString('pt-BR') : 'Hoje'}
                </div>
              )}
            </div>

            <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
              {customLogo ? (
                <img src={customLogo} className="max-h-full max-w-full object-contain" alt="Brasão Direita" />
              ) : (
                <div className="w-16 h-16 rounded-full border border-slate-800 flex items-center justify-center bg-slate-50">
                  <span className="text-[7px] font-black uppercase text-center text-slate-400">BRASÃO<br />GCM</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Dados */}
          <table className="w-full border-collapse border border-slate-900">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-900 p-2 text-[10px] font-black uppercase w-[80px]">Número R.A</th>
                <th className="border border-slate-900 p-2 text-[10px] font-black uppercase w-[150px]">Local</th>
                <th className="border border-slate-900 p-2 text-[10px] font-black uppercase w-[80px]">Data</th>
                <th className="border border-slate-900 p-2 text-[10px] font-black uppercase w-[60px]">H. Inicial</th>
                <th className="border border-slate-900 p-2 text-[10px] font-black uppercase w-[60px]">H. Final</th>
                <th className="border border-slate-900 p-2 text-[10px] font-black uppercase">Relato</th>
              </tr>
            </thead>
            <tbody>
              {displayIncidents.map(i => {
                const building = buildings.find(b => b.id === i.buildingId);
                return (
                  <tr key={i.id} style={{ pageBreakInside: 'avoid' }}>
                    <td className="border border-slate-900 p-2 text-[10px] font-bold text-center align-middle whitespace-nowrap">{i.raCode}</td>
                    <td className="border border-slate-900 p-2 text-[10px] font-bold uppercase align-middle">{building?.name || '---'}</td>
                    <td className="border border-slate-900 p-2 text-[10px] font-bold text-center align-middle whitespace-nowrap">{new Date(i.date).toLocaleDateString('pt-BR')}</td>
                    <td className="border border-slate-900 p-2 text-[10px] font-bold text-center align-middle whitespace-nowrap">{i.startTime}</td>
                    <td className="border border-slate-900 p-2 text-[10px] font-bold text-center align-middle whitespace-nowrap">{i.endTime || '--:--'}</td>
                    <td className="border border-slate-900 p-2 text-[9px] font-medium leading-tight align-top whitespace-pre-wrap break-all">{i.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-6 flex justify-between text-[8px] font-black uppercase text-slate-400">
            <span>Relatório gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</span>
            <span>Página 1 de 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const BuildingList: React.FC<{ buildings: Building[], sectors: Sector[], onEdit: (b: Building) => void, onDelete: (id: string) => void, onAdd: () => void, onRefresh: () => void, canEdit: boolean, canDelete: boolean }> = ({ buildings, onEdit, onAdd, canEdit }) => {
  const [search, setSearch] = useState('');
  const filtered = buildings.filter(b => normalizeString(b.name).includes(normalizeString(search)) || normalizeString(b.buildingNumber).includes(normalizeString(search)));
  return (
    <div className="space-y-4">
      {/* Unified Header Section */}
      <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Title Row */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <BuildingIcon size={22} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
              Próprios Municipais
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
              Total: {buildings.length} prédios cadastrados
            </p>
          </div>
        </div>

        {/* Search and Actions Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar prédio por nome ou número..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-white transition-all"
            />
          </div>
          {canEdit && (
            <button onClick={onAdd} className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 transition-all duration-200">
              <Plus size={16} strokeWidth={3} />
              <span className="hidden sm:inline">Novo Próprio</span>
            </button>
          )}
        </div>
      </div>
      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest w-16">Nº</th>
              <th className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Nome / Endereço</th>
              <th className="px-6 py-3 text-center text-xs font-black text-slate-500 uppercase tracking-widest w-40">Segurança</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map(b => {
              const hasCoordinates = b.latitude && b.longitude && b.latitude.trim() !== '' && b.longitude.trim() !== '';
              const mapsUrl = hasCoordinates ? `https://www.google.com/maps?q=${b.latitude},${b.longitude}` : '';
              return (
                <tr key={b.id} onClick={() => canEdit && onEdit(b)} className={`transition-colors border-b dark:border-slate-800 ${canEdit ? 'cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-900/10' : ''}`}>
                  <td className="px-6 py-4 text-xs font-black text-slate-700 dark:text-slate-300">{b.buildingNumber}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{b.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5 font-bold">{b.address}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {hasCoordinates && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          title="Ver no Mapa"
                        >
                          <MapPin size={14} strokeWidth={2.5} />
                        </a>
                      )}
                      {b.hasAlarm && <div className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg shadow-sm border border-red-100 dark:border-red-800" title="Alarme Monitorado"><Bell size={14} strokeWidth={2.5} /></div>}
                      {b.hasKey && <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg shadow-sm border border-amber-100 dark:border-amber-800" title="Chave na Portaria"><Key size={14} strokeWidth={2.5} /></div>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {filtered.map(b => {
          const hasCoordinates = b.latitude && b.longitude && b.latitude.trim() !== '' && b.longitude.trim() !== '';
          const mapsUrl = hasCoordinates ? `https://www.google.com/maps?q=${b.latitude},${b.longitude}` : '';
          return (
            <div key={b.id} onClick={() => canEdit && onEdit(b)} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">{b.buildingNumber}</span>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase truncate tracking-tight">{b.name}</p>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase truncate tracking-tight mb-2">{b.address}</p>
                <div className="flex items-center gap-1.5">
                  {b.hasAlarm && <span className="text-[9px] font-black bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-800 uppercase flex items-center gap-1"><Bell size={10} /> Alarme</span>}
                  {b.hasKey && <span className="text-[9px] font-black bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800 uppercase flex items-center gap-1"><Key size={10} /> Chave</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {hasCoordinates && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-center"
                  >
                    <MapPin size={18} strokeWidth={2.5} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const UserList: React.FC<{ users: User[], jobTitles?: JobTitle[], onEdit: (u: User) => void, onDelete: (id: string) => void, onAdd: () => void, onRefresh: () => void, canEdit: boolean, canDelete: boolean }> = ({ users, onEdit, onAdd, canEdit, jobTitles = [] }) => {
  const [search, setSearch] = useState('');

  const filtered = users
    .filter(u => normalizeString(u.name).includes(normalizeString(search)) || normalizeString(u.matricula).includes(normalizeString(search)))
    .sort((a, b) => a.name.localeCompare(b.name));

  const getRoleStyles = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800";
      case UserRole.SUPERVISOR:
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800";
      case UserRole.OPERADOR:
        return "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800";
      case UserRole.RONDA:
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Unified Header Section */}
      <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Title Row */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <Users size={22} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
              Gestão de Usuários
            </h2>
            <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Total: {users.length} Colaboradores
            </p>
          </div>
        </div>

        {/* Search and Actions Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por nome ou matrícula..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-white transition-all"
            />
          </div>
          {canEdit && (
            <button onClick={onAdd} className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 transition-all duration-200">
              <Plus size={16} strokeWidth={3} />
              <span className="hidden sm:inline">Novo Usuário</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Colaborador</th>
                <th className="px-8 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-widest w-32">Cód. Acesso</th>
                <th className="px-8 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest">Função no Sistema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(u => (
                <tr
                  key={u.id}
                  onClick={() => canEdit && onEdit(u)}
                  className={`transition-all duration-200 group ${canEdit ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-brand-900/10' : ''}`}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-brand-700 dark:text-brand-400 font-black text-sm uppercase border border-slate-200 dark:border-slate-700 group-hover:bg-brand-600 group-hover:text-white group-hover:border-brand-500 transition-all">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase leading-none group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">{u.name}</p>
                        <p className="text-xs text-slate-400 uppercase font-bold mt-1 tracking-wider">Matrícula: {u.matricula}</p>
                        <p className="text-xs text-brand-600 dark:text-brand-400 uppercase font-black tracking-wider mt-0.5">
                          {jobTitles.find(t => t.id === u.jobTitleId)?.name || ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                      <Hash size={12} />
                      {u.userCode || '--'}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm ${getRoleStyles(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            <Users size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-sm font-black uppercase tracking-widest">Nenhum colaborador encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

const JobTitleList: React.FC<{ jobTitles: JobTitle[], onEdit: (j: JobTitle) => void, onDelete: (id: string) => void, onAdd: () => void }> = ({ jobTitles, onEdit, onDelete, onAdd }) => {
  const [search, setSearch] = useState('');
  const filtered = jobTitles.filter(j => normalizeString(j.name).includes(normalizeString(search)));

  return (
    <div className="space-y-4">
      {/* Unified Header Section */}
      <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Title Row */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <Briefcase size={22} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
              Gestão de Cargos
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
              Total: {jobTitles.length} cargos cadastrados
            </p>
          </div>
        </div>

        {/* Search and Actions Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome do cargo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-white transition-all"
            />
          </div>
          <button onClick={onAdd} className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 transition-all duration-200">
            <Plus size={16} strokeWidth={3} />
            <span className="hidden sm:inline">Novo Cargo</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {filtered.map(j => (
          <div key={j.id} onClick={() => onEdit(j)} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors group">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase group-hover:text-brand-600 dark:group-hover:text-brand-400">{j.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SectorList: React.FC<{ sectors: Sector[], onEdit: (s: Sector) => void, onDelete: (id: string) => void, onAdd: () => void }> = ({ sectors, onEdit, onDelete, onAdd }) => {
  const [search, setSearch] = useState('');
  const filtered = sectors.filter(s => normalizeString(s.name).includes(normalizeString(search)));

  return (
    <div className="space-y-4">
      {/* Unified Header Section */}
      <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Title Row */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <Map size={22} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
              Setores Operacionais
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
              Total: {sectors.length} setores cadastrados
            </p>
          </div>
        </div>

        {/* Search and Actions Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome do setor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-white transition-all"
            />
          </div>
          <button onClick={onAdd} className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 transition-all duration-200">
            <Plus size={16} strokeWidth={3} />
            <span className="hidden sm:inline">Novo Setor</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {filtered.map(s => (
          <div key={s.id} onClick={() => onEdit(s)} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors group">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase group-hover:text-brand-600 dark:group-hover:text-brand-400">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main App Component
export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<SystemPermissionMap>(DEFAULT_PERMISSIONS);
  const [userOverrides, setUserOverrides] = useState<UserPermissionOverrides>({});
  const [userMenuOverrides, setUserMenuOverrides] = useState<UserMenuVisibilityOverrides>({});
  const [menuVisibility, setMenuVisibility] = useState<MenuVisibilityMap>({});
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [registrationsMenuOpen, setRegistrationsMenuOpen] = useState(false);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false);
  const [pendentesMenuOpen, setPendentesMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pendingSubTab, setPendingSubTab] = useState<'INCIDENTS' | 'LOANS'>('INCIDENTS');

  // Data States
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [alterationTypes, setAlterationTypes] = useState<AlterationType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vests, setVests] = useState<Vest[]>([]);
  const [radios, setRadios] = useState<Radio[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loanPage, setLoanPage] = useState(0);
  const [hasMoreLoans, setHasMoreLoans] = useState(true);
  const [loadingMoreLoans, setLoadingMoreLoans] = useState(false);

  const fetchLockRef = useRef(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showDbSetup, setShowDbSetup] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [unsyncedIncidents, setUnsyncedIncidents] = useState<Incident[]>([]);

  // Editors
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [editingJobTitle, setEditingJobTitle] = useState<JobTitle | null>(null);
  const [editingAlterationType, setEditingAlterationType] = useState<AlterationType | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingVest, setEditingVest] = useState<Vest | null>(null);
  const [editingRadio, setEditingRadio] = useState<Radio | null>(null);

  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  // Cancellation Modal State
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; incidentId: string; reason: string }>({ isOpen: false, incidentId: '', reason: '' });

  const [preSelectedBuildingId, setPreSelectedBuildingId] = useState<string | undefined>(undefined);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'alert' | 'confirm' | 'error'; title: string; message: string; onConfirm?: () => void; }>({ isOpen: false, type: 'alert', title: '', message: '' });
  const [customLogoRight, setCustomLogoRight] = useState<string | null>(null);
  const [customLogoLeft, setCustomLogoLeft] = useState<string | null>(null);

  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
  const gitHash = typeof __GIT_HASH__ !== 'undefined' ? __GIT_HASH__ : 'dev';
  const buildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '---';
  const APP_VERSION = `v${appVersion}-${gitHash}`;
  const DISPLAY_VERSION = `${appVersion}.${gitHash}`; // Simplified for discrete view

  // --- FETCH FUNCTIONS INSIDE APP COMPONENT ---

  const fetchIncidents = useCallback(async (isLoadMore = false) => {
    if (fetchLockRef.current) return;
    fetchLockRef.current = true;
    if (isLoadMore) setLoadingMore(true);
    else { setPage(0); setHasMore(true); }
    const currentPage = isLoadMore ? page + 1 : 0;
    const PAGE_SIZE = 10;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    try {
      let finalData: Incident[] = [];
      if (!isLoadMore) {
        const [pendingRes, historyRes] = await Promise.all([
          supabase.from('incidents').select('*').eq('status', 'PENDING'),
          supabase.from('incidents').select('*').neq('status', 'PENDING').order('created_at', { ascending: false }).range(0, PAGE_SIZE - 1)
        ]);
        if (pendingRes.error) throw pendingRes.error;
        if (historyRes.error) throw historyRes.error;
        const mappedPending = (pendingRes.data || []).map(mapIncident);
        const mappedHistory = (historyRes.data || []).map(mapIncident);
        finalData = [...mappedPending, ...mappedHistory];
        if ((historyRes.data?.length || 0) < PAGE_SIZE) setHasMore(false);
      } else {
        const { data, error } = await supabase.from('incidents').select('*').neq('status', 'PENDING').order('created_at', { ascending: false }).range(from, to);
        if (error) throw error;
        finalData = (data || []).map(mapIncident);
        if (finalData.length < PAGE_SIZE) setHasMore(false);
        setPage(currentPage);
      }
      setIncidents(prev => {
        if (isLoadMore) {
          const newRecords = finalData.filter(fd => !prev.some(p => p.id === fd.id));
          return [...prev, ...newRecords];
        } else {
          const combined = [...unsyncedIncidents, ...finalData.filter(fd => !unsyncedIncidents.some(ui => ui.id === fd.id))];
          return combined;
        }
      });
    } catch (error: any) { console.error("Erro ao buscar ocorrências:", error); } finally { setLoadingMore(false); fetchLockRef.current = false; }
  }, [unsyncedIncidents, page]);

  const fetchLoans = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMoreLoans(true); else { setLoanPage(0); setHasMoreLoans(true); }
    const currentPage = isLoadMore ? loanPage + 1 : 0;
    const PAGE_SIZE = 10;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    try {
      let finalData: LoanRecord[] = [];
      if (!isLoadMore) {
        const [activeRes, completedRes] = await Promise.all([
          supabase.from('loan_records').select('*').in('status', ['PENDING', 'ACTIVE']),
          supabase.from('loan_records').select('*').in('status', ['COMPLETED', 'REJECTED']).order('return_time', { ascending: false }).range(0, PAGE_SIZE - 1)
        ]);
        if (activeRes.error) throw activeRes.error;
        if (completedRes.error) throw completedRes.error;
        const mappedActive = (activeRes.data || []).map(mapLoan);
        const mappedCompleted = (completedRes.data || []).map(mapLoan);
        finalData = [...mappedActive, ...mappedCompleted];
        if ((completedRes.data?.length || 0) < PAGE_SIZE) setHasMoreLoans(false);
      } else {
        const { data, error } = await supabase.from('loan_records').select('*').in('status', ['COMPLETED', 'REJECTED']).order('return_time', { ascending: false }).range(from, to);
        if (error) throw error;
        finalData = (data || []).map(mapLoan);
        if (finalData.length < PAGE_SIZE) setHasMoreLoans(false);
        setLoanPage(currentPage);
      }
      setLoans(prev => {
        if (isLoadMore) {
          const newRecords = finalData.filter(fd => !prev.some(p => p.id === fd.id));
          return [...prev, ...newRecords];
        } else { return finalData; }
      });
    } catch (error: any) { console.error("Erro ao buscar cautelas:", error); } finally { setLoadingMoreLoans(false); }
  }, [loanPage]);

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('system_logs').select('*').order('timestamp', { ascending: false }).limit(100);
      if (error) throw error;
      if (data) setLogs(data);
    } catch (e) { console.error("Error fetching logs", e); }
  }, []);

  const fetchStaticData = useCallback(async () => {
    let atRes;
    try { atRes = await supabase.from('alteration_types').select('*').order('order', { ascending: true }); if (atRes.error) throw atRes.error; }
    catch (err) { atRes = await supabase.from('alteration_types').select('*'); }
    const [sRes, bRes, jtRes] = await Promise.all([
      supabase.from('sectors').select('*'),
      supabase.from('buildings').select('*'),
      supabase.from('app_config').select('value').eq('key', 'system_job_titles').single()
    ]);
    if (sRes.data) setSectors(sRes.data);
    if (bRes.data) setBuildings([...bRes.data].sort((a, b) => a.buildingNumber.localeCompare(b.buildingNumber, undefined, { numeric: true })));
    if (atRes.data) setAlterationTypes(atRes.data);
    if (jtRes.data && jtRes.data.value) setJobTitles(JSON.parse(jtRes.data.value));
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      const [vRes, veRes, rRes, eRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('vests').select('*'),
        supabase.from('radios').select('*'),
        supabase.from('equipments').select('*')
      ]);
      if (vRes.data) setVehicles(vRes.data);
      if (veRes.data) setVests(veRes.data);
      if (rRes.data) setRadios(rRes.data);
      if (eRes.data) setEquipments(eRes.data);
    } catch (e) { }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('users')
        .select('id, name, avatar, role, matricula, user_code, job_title_id, email, cpf, passwordHash, status')
        .order('name', { ascending: true })
        .limit(200);
      if (error) throw error;
      const mappedUsers = data ? data.map((u: any) => ({ ...u, userCode: u.user_code, jobTitleId: u.job_title_id })) : [];
      setUsers(mappedUsers as User[]);
    } catch (error: any) { console.error(error); } finally { setLoading(false); }
  }, []);

  const createLog = async (action: SystemLog['action'], details: string, logUser?: User | null) => {
    const targetUser = logUser || user;
    if (!targetUser) return;
    try { await supabase.from('system_logs').insert({ userId: targetUser.id, userName: targetUser.name, action, details, timestamp: new Date().toISOString() }); } catch (e) { }
  };

  const showAlert = (title: string, message: string) => { setModalConfig({ isOpen: true, type: 'alert', title, message }); };
  const showError = (title: string, message: string) => { setModalConfig({ isOpen: true, type: 'error', title, message }); };
  const showConfirm = (title: string, message: string, onConfirm: () => void) => { setModalConfig({ isOpen: true, type: 'confirm', title, message, onConfirm }); };

  const fetchPermissions = useCallback(async () => {
    try {
      const { data } = await supabase.from('app_config')
        .select('key, value')
        .in('key', ['system_permissions', 'user_permission_overrides', 'menu_visibility', 'user_menu_visibility_overrides']);

      const config = data?.reduce((acc: any, item: any) => {
        acc[item.key] = item.value ? JSON.parse(item.value) : null;
        return acc;
      }, {}) || {};

      setPermissions(config['system_permissions'] || DEFAULT_PERMISSIONS);
      setUserOverrides(config['user_permission_overrides'] || {});
      setMenuVisibility(config['menu_visibility'] || {});
      setUserMenuOverrides(config['user_menu_visibility_overrides'] || {});

    } catch (e) { setPermissions(DEFAULT_PERMISSIONS); }
  }, []);

  const handleUpdatePermissions = async (newPermissions: SystemPermissionMap) => {
    try {
      await supabase.from('app_config').upsert({ key: 'system_permissions', value: JSON.stringify(newPermissions) });
      setPermissions(newPermissions);
      createLog('UPDATE_PERMISSIONS', 'Atualizou matriz de permissões do sistema');
      showAlert('Sucesso', 'Permissões atualizadas com sucesso.');
    } catch (e: any) { showError('Erro', e.message); }
  };

  const handleUpdateOverrides = async (newOverrides: UserPermissionOverrides) => {
    try {
      await supabase.from('app_config').upsert({ key: 'user_permission_overrides', value: JSON.stringify(newOverrides) });
      setUserOverrides(newOverrides);
      createLog('UPDATE_PERMISSIONS', 'Atualizou exceções de permissão por usuário');
      showAlert('Sucesso', 'Exceções salvas com sucesso.');
    } catch (e: any) { showError('Erro', e.message); }
  };

  const handleUpdateMenuVisibility = async (newConfig: MenuVisibilityMap) => {
    try {
      await supabase.from('app_config').upsert({ key: 'menu_visibility', value: JSON.stringify(newConfig) });
      setMenuVisibility(newConfig);
      createLog('MANAGE_SETTINGS', 'Atualizou layout de menus por cargo');
      showAlert('Sucesso', 'Layout atualizado com sucesso.');
    } catch (e: any) {
      console.error(e);
      alert('Erro ao salvar visibilidade do menu.');
    }
  };

  const handleUpdateMenuOverrides = async (newConfig: UserMenuVisibilityOverrides) => {
    try {
      await supabase.from('app_config').upsert({ key: 'user_menu_visibility_overrides', value: JSON.stringify(newConfig) });
      setUserMenuOverrides(newConfig);
      await createLog('MANAGE_SETTINGS', 'Atualizou permissões de menu (overrides por usuário)');
      showAlert('Sucesso', 'Exceções de menu salvas com sucesso.');
    } catch (e: any) {
      console.error(e);
      alert('Erro ao salvar overrides de menu.');
    }
  };

  // --- PERMISSION CHECKER ---
  const can = (action: PermissionKey): boolean => {
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true; // ADMIN always has full access

    // Check for user-specific override first
    const override = userOverrides[user.id]?.[action];
    if (override !== undefined) return override;

    // Fallback to role-based permission
    const allowedRoles = permissions[action] || DEFAULT_PERMISSIONS[action] || [];
    return allowedRoles.includes(user.role);
  };

  const isMenuVisible = (menuId: string): boolean => {
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true; // ADMIN always sees everything

    // Check specific user override first
    if (userMenuOverrides[user.id]) {
      return userMenuOverrides[user.id].includes(menuId);
    }

    const roleConfig = menuVisibility[user.role];
    // If no config exists for the role, default to showing everything (permissive by default for easy start)
    if (!roleConfig) return true;
    return roleConfig.includes(menuId);
  };

  const fetchGlobalConfig = useCallback(async () => {
    try {
      const { data: rightData } = await supabase.from('app_config').select('value').eq('key', 'custom_logo').single();
      if (rightData && rightData.value) { setCustomLogoRight(rightData.value); localStorage.setItem('app_custom_logo', rightData.value); }
      const { data: leftData } = await supabase.from('app_config').select('value').eq('key', 'custom_logo_left').single();
      if (leftData && leftData.value) { setCustomLogoLeft(leftData.value); localStorage.setItem('app_custom_logo_left', leftData.value); }
    } catch (e) { }
  }, []);

  useEffect(() => {
    const savedLocalMode = localStorage.getItem('is_local_mode') === 'true';
    setIsLocalMode(savedLocalMode);
    const savedUnsynced = localStorage.getItem('unsynced_incidents');
    if (savedUnsynced) setUnsyncedIncidents(JSON.parse(savedUnsynced));
  }, []);

  useEffect(() => { localStorage.setItem('unsynced_incidents', JSON.stringify(unsyncedIncidents)); }, [unsyncedIncidents]);

  useEffect(() => {
    const savedLogoRight = localStorage.getItem('app_custom_logo');
    if (savedLogoRight) setCustomLogoRight(savedLogoRight);
    const savedLogoLeft = localStorage.getItem('app_custom_logo_left');
    if (savedLogoLeft) setCustomLogoLeft(savedLogoLeft);
    fetchGlobalConfig();
    fetchPermissions();
  }, [fetchGlobalConfig, fetchPermissions]);

  const handleUpdateLogoRight = async (logo: string | null) => {
    setCustomLogoRight(logo);
    if (logo) localStorage.setItem('app_custom_logo', logo);
    else localStorage.removeItem('app_custom_logo');
    try { await supabase.from('app_config').upsert({ key: 'custom_logo', value: logo || '' }); } catch (error: any) { console.error(error); }
  };

  const handleUpdateLogoLeft = async (logo: string | null) => {
    setCustomLogoLeft(logo);
    if (logo) localStorage.setItem('app_custom_logo_left', logo);
    else localStorage.removeItem('app_custom_logo_left');
    try { await supabase.from('app_config').upsert({ key: 'custom_logo_left', value: logo || '' }); } catch (error: any) { console.error(error); }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setDarkMode(true);
    const savedVersion = localStorage.getItem('app_version');
    const savedUser = localStorage.getItem('vigilante_session');
    if (savedVersion !== APP_VERSION) { localStorage.removeItem('vigilante_session'); localStorage.setItem('app_version', APP_VERSION); setUser(null); }
    else if (savedUser) { try { setUser(JSON.parse(savedUser)); } catch (e) { localStorage.removeItem('vigilante_session'); } }
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [darkMode]);

  const fetchAnnouncementsCount = useCallback(async () => {
    if (!user) return;
    const count = await announcementService.getUnreadCount(user.id, user.role);
    setUnreadAnnouncementsCount(count);
  }, [user]);

  const loadEssentialData = useCallback(async () => {
    setDbError(null);
    try {
      await Promise.all([fetchStaticData(), fetchIncidents(), fetchAssets(), fetchLoans(), fetchLogs(), fetchAnnouncementsCount(), fetchUsers()]);
      setInitialDataLoaded(true);
    }
    catch (error: any) { setDbError(error.message || "Falha na conexão."); setInitialDataLoaded(true); }
  }, [fetchStaticData, fetchIncidents, fetchAssets, fetchLoans, fetchLogs, fetchUsers]);

  useEffect(() => {
    if (user) {
      fetchAnnouncementsCount();
      const interval = setInterval(fetchAnnouncementsCount, 30000); // Polling a cada 30s
      return () => clearInterval(interval);
    }
  }, [user, fetchAnnouncementsCount]);

  useEffect(() => { if (user && !initialDataLoaded) { loadEssentialData(); } }, [user, initialDataLoaded, loadEssentialData]);

  const handleNavigate = (newView: ViewState) => { setView(newView); setSidebarOpen(false); };

  const handleDeleteSector = (id: string) => {
    if (!can('MANAGE_SECTORS')) return showError('Acesso Negado', 'Sem permissão.');
    showConfirm("Remover Setor", "Deseja realmente remover este setor?", async () => {
      try { await supabase.from('sectors').delete().eq('id', id); fetchStaticData(); handleNavigate('SECTORS'); } catch (err: any) { showError("Erro", err.message); }
    });
  };

  const handleDeleteAlterationType = (id: string) => {
    if (!can('MANAGE_ALTERATION_TYPES')) return showError('Acesso Negado', 'Sem permissão.');
    showConfirm("Remover Tipo", "Deseja realmente remover este tipo de alteração?", async () => {
      try { await supabase.from('alteration_types').delete().eq('id', id); fetchStaticData(); handleNavigate('ALTERATION_TYPES'); } catch (err: any) { showError("Erro", err.message); }
    });
  };

  const handleSaveIncident = async (inc: Incident) => {
    setSaving(true);
    try {
      const existing = incidents.find(i => i.id === inc.id);
      const isNew = !existing;
      const payload = {
        id: inc.id,
        ra_code: inc.raCode || generateNextRaCode(),
        building_id: inc.buildingId,
        user_id: inc.userId,
        operator_name: inc.operatorName,
        vigilants: inc.vigilants,
        date: inc.date,
        start_time: inc.startTime,
        end_time: inc.endTime,
        alteration_type: inc.alterationType,
        description: inc.description,
        photos: inc.photos,
        status: (inc.status || 'PENDING').toUpperCase(),
        is_edited: !isNew,
        last_edited_at: !isNew ? new Date().toISOString() : null,
        edited_by: !isNew ? user?.name : null
      };
      let savedLocally = false;
      if (isLocalMode) {
        const localInc = { ...inc, raCode: payload.ra_code, isLocal: true };
        setUnsyncedIncidents(prev => [localInc, ...prev.filter(i => i.id !== inc.id)]);
        savedLocally = true;
      } else {
        try {
          const { error } = await supabase.from('incidents').upsert(payload);
          if (error) throw error;
          setUnsyncedIncidents(prev => prev.filter(i => i.id !== inc.id));
        } catch (err: any) {
          const offlineData = { ...inc, raCode: payload.ra_code, isLocal: true };
          setUnsyncedIncidents(prev => [offlineData, ...prev.filter(i => i.id !== inc.id)]);
          savedLocally = true;
        }
      }
      await fetchIncidents();
      createLog(isNew ? 'CREATE_INCIDENT' : 'UPDATE_INCIDENT', `RA ${payload.ra_code} em ${buildings.find(b => b.id === inc.buildingId)?.name}`);
      handleNavigate('DASHBOARD');
      setEditingIncident(null);
      setPreSelectedBuildingId(undefined);
      showAlert("Registro Salvo", savedLocally ? "Dados salvos localmente." : "Registro enviado com sucesso.");
    } catch (err: any) { showError("Erro ao processar", err.message); } finally { setSaving(false); }
  };

  const handleSyncData = async () => {
    if (unsyncedIncidents.length === 0) return;
    setSaving(true);
    try {
      const toSync = [...unsyncedIncidents];
      for (const inc of toSync) {
        const payload = {
          id: inc.id,
          ra_code: inc.raCode,
          building_id: inc.buildingId,
          user_id: inc.userId,
          operator_name: inc.operatorName,
          vigilants: inc.vigilants,
          date: inc.date,
          start_time: inc.startTime,
          end_time: inc.endTime,
          alteration_type: inc.alteration_type,
          description: inc.description,
          photos: inc.photos,
          status: inc.status
        };
        const { error } = await supabase.from('incidents').upsert(payload);
        if (!error) { setUnsyncedIncidents(prev => prev.filter(i => i.id !== inc.id)); }
      }
      await fetchIncidents();
      showAlert("Sincronização", "Processamento finalizado.");
    } catch (err: any) { showError("Erro na sincronização", err.message); } finally { setSaving(false); }
  };

  const handleConfirmLoanBatch = async (batchId: string) => {
    try {
      const pendingIds = loans.filter(l => l.batchId === batchId && (l.status === 'PENDING' || (l.status as string) === 'pending')).map(l => l.id);
      if (pendingIds.length === 0) return;
      const { error } = await supabase.from('loan_records').update({ status: 'ACTIVE' }).in('id', pendingIds);
      if (error) throw error;
      createLog('LOAN_CONFIRM', `Confirmou recebimento de lote`);
      fetchLoans();
      showAlert("Sucesso", "Recebimento confirmado.");
    } catch (err: any) { showError("Erro", "Falha ao confirmar: " + err.message); }
  };

  const generateNextRaCode = () => {
    const currentYear = new Date().getFullYear();
    const yearIncidents = incidents.filter(i => i.raCode && i.raCode.endsWith(currentYear.toString()));
    let maxNum = 0;
    yearIncidents.forEach(i => { const num = parseInt(i.raCode.split('/')[0]); if (!isNaN(num) && num > maxNum) maxNum = num; });
    return `${maxNum + 1}/${currentYear}`;
  };

  const handleToggleLocalMode = (enabled: boolean) => { setIsLocalMode(enabled); localStorage.setItem('is_local_mode', enabled.toString()); };

  const handleViewIncident = async (partialIncident: Incident) => {
    if (partialIncident.isLocal) { setSelectedIncident(partialIncident); handleNavigate('INCIDENT_DETAIL'); return; }
    setLoadingDetail(true);
    try {
      const { data, error } = await supabase.from('incidents').select('*').eq('id', partialIncident.id).single();
      if (error) throw error;
      if (data) { setSelectedIncident(mapIncident(data)); handleNavigate('INCIDENT_DETAIL'); }
    } catch (err: any) { showError("Erro ao carregar detalhes", err.message); } finally { setLoadingDetail(false); }
  };

  const handleSaveSector = async (sector: Sector) => {
    try {
      const { error } = await supabase.from('sectors').upsert(sector);
      if (error) throw error;
      fetchStaticData();
      handleNavigate('SECTORS');
    } catch (err: any) { showError("Erro", err.message); }
  };

  const handleSaveJobTitle = async (jobTitle: JobTitle) => {
    try {
      const newJobTitles = jobTitle.id && jobTitles.find(j => j.id === jobTitle.id)
        ? jobTitles.map(j => j.id === jobTitle.id ? jobTitle : j)
        : [...jobTitles, jobTitle];

      await supabase.from('app_config').upsert({ key: 'system_job_titles', value: JSON.stringify(newJobTitles) });
      setJobTitles(newJobTitles);
      handleNavigate('JOB_TITLES');
    } catch (err: any) { showError("Erro", err.message); }
  };

  const handleDeleteJobTitle = (id: string) => {
    if (!can('MANAGE_JOB_TITLES')) return showError('Acesso Negado', 'Sem permissão.');
    showConfirm("Remover Cargo", "Deseja realmente remover este cargo?", async () => {
      try {
        const newJobTitles = jobTitles.filter(j => j.id !== id);
        await supabase.from('app_config').upsert({ key: 'system_job_titles', value: JSON.stringify(newJobTitles) });
        setJobTitles(newJobTitles);
        handleNavigate('JOB_TITLES');
      } catch (err: any) { showError("Erro", err.message); }
    });
  };

  const handleSaveAlterationType = async (type: AlterationType) => {
    try {
      const { error } = await supabase.from('alteration_types').upsert(type);
      if (error) throw error;
      fetchStaticData();
      handleNavigate('ALTERATION_TYPES');
    } catch (err: any) { showError("Erro ao Salvar", err.message); }
  };

  const handleReorderAlterationTypes = async (newOrder: AlterationType[]) => {
    setAlterationTypes(newOrder);
    try {
      const updates = newOrder.map((item, index) => ({ id: item.id, name: item.name, order: index }));
      const { error } = await supabase.from('alteration_types').upsert(updates);
      if (error) throw error;
    } catch (err: any) { showError("Erro ao reordenar", err.message); fetchStaticData(); }
  };

  const handleSaveAsset = async (table: string, item: any, viewReturn: ViewState, logName: string) => {
    try {
      const isNew = !item.id || item.id === '';
      const payload = { ...item, id: isNew ? crypto.randomUUID() : item.id };
      const { error } = await supabase.from(table).upsert(payload);
      if (error) throw error;
      fetchAssets();
      handleNavigate(viewReturn);
      createLog(isNew ? 'CREATE_ASSET' : 'UPDATE_ASSET', `${isNew ? 'Criou' : 'Atualizou'} ${logName}: ${item.model || item.number || item.name}`);
    } catch (err: any) { showError("Erro", err.message); }
  };

  const handleDeleteAsset = (table: string, id: string, logName: string) => {
    if (!can('DELETE_ASSETS')) return showError('Acesso Negado', 'Você não tem permissão para excluir ativos.');
    showConfirm("Excluir Item", "Tem certeza?", async () => {
      try { await supabase.from(table).delete().eq('id', id); fetchAssets(); } catch (err: any) { showError("Erro", err.message); }
    });
  };

  const handleDeleteIncident = (id: string) => {
    if (!can('DELETE_INCIDENT')) return showError('Acesso Negado', 'Você não tem permissão para cancelar registros.');
    setCancelModal({ isOpen: true, incidentId: id, reason: '' });
  };

  const handleConfirmCancellation = async () => {
    if (cancelModal.reason.trim() === "") return showError("Erro", "O motivo do cancelamento é obrigatório.");

    try {
      await supabase.from('incidents').update({
        status: 'CANCELLED',
        cancellation_reason: cancelModal.reason,
        cancelled_by: user?.name,
        cancelled_at: new Date().toISOString()
      }).eq('id', cancelModal.incidentId);

      fetchIncidents();
      handleNavigate('HISTORY');
      setCancelModal({ isOpen: false, incidentId: '', reason: '' });
      createLog('UPDATE_INCIDENT', `Cancelou RA (Motivo: ${cancelModal.reason})`);
    } catch (err: any) { showError("Erro", err.message); }
  };

  const handleDeleteUser = (id: string) => {
    if (!can('DELETE_USERS')) return showError('Acesso Negado', 'Você não tem permissão para excluir usuários.');
    showConfirm("Remover Usuário", "Deseja realmente remover?", async () => {
      try { await supabase.from('users').delete().eq('id', id); fetchUsers(); } catch (err: any) { showError("Erro", err.message); }
    });
  };

  const handleDeleteBuilding = (id: string) => {
    if (!can('MANAGE_BUILDINGS')) return showError('Acesso Negado', 'Sem permissão.');
    showConfirm("Remover Prédio", "Deseja excluir esta unidade?", async () => {
      try { await supabase.from('buildings').delete().eq('id', id); fetchStaticData(); } catch (any) { showError("Erro", "Falha ao remover."); }
    });
  };

  const handleApproveIncident = async (id: string) => {
    if (!can('APPROVE_INCIDENT')) return showError('Acesso Negado', 'Você não tem permissão para validar registros.');
    try {
      await supabase.from('incidents').update({ status: 'APPROVED', approved_by: user?.name, approved_at: new Date().toISOString() }).eq('id', id);
      fetchIncidents(); handleNavigate('HISTORY');
    } catch (err: any) { showError("Falha", err.message); }
  };

  const handleUpdatePassword = async (currentPass: string, nPass: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('users').update({ passwordHash: nPass }).eq('id', user.id);
      if (error) throw error;
      setUser({ ...user, passwordHash: nPass });
    } catch (err: any) { throw new Error(err.message); }
  };

  const handleLogin = async (identifier: string, password: string) => {
    if (isLocalMode && identifier === '00') {
      if (password === 'admin') {
        const emergencyUser: User = { id: 'emergency-master', name: 'SUPERVISOR (CONTINGÊNCIA)', role: UserRole.ADMIN, cpf: '000.000.000-00', matricula: 'EMERGENCY', userCode: '00', status: 'ACTIVE' };
        setUser(emergencyUser); localStorage.setItem('vigilante_session', JSON.stringify(emergencyUser)); localStorage.setItem('app_version', APP_VERSION);
        createLog('LOGIN', 'Acesso de contingência (Admin)', emergencyUser);
        return;
      } else { throw new Error("Senha de contingência incorreta."); }
    }
    // Busca direta no banco para garantir login mesmo sem lista carregada
    const { data: dbData, error } = await supabase.from('users')
      .select('*')
      .or(`email.eq.${identifier},cpf.eq.${identifier},matricula.eq.${identifier},user_code.eq.${identifier}`)
      .single();

    if (error || !dbData) throw new Error("Usuário não cadastrado.");

    // Mapeamento manual para garantir compatibilidade com a interface User
    const dbUser: User = {
      ...dbData,
      userCode: dbData.user_code || dbData.userCode,
      jobTitleId: dbData.job_title_id || dbData.jobTitleId,
      // Garantir que campos obrigatórios existam
      name: dbData.name,
      role: dbData.role,
      id: dbData.id
    };
    if (dbUser.passwordHash && dbUser.passwordHash !== password) throw new Error("Senha incorreta.");
    setUser(dbUser); localStorage.setItem('vigilante_session', JSON.stringify(dbUser)); localStorage.setItem('app_version', APP_VERSION);
    createLog('LOGIN', 'Acesso realizado via credenciais', dbUser);
  };

  const handleLogout = async () => { if (user) await createLog('LOGOUT', 'Saiu do sistema'); setUser(null); localStorage.removeItem('vigilante_session'); handleNavigate('DASHBOARD'); };

  const handleRegister = async (userData: Omit<User, 'id'>) => {
    try {
      const { data, error } = await supabase.from('users').insert({ ...userData, status: 'PENDING' }).select().single();
      if (error) throw error;
      if (data) createLog('USER_REGISTER', `Novo cadastro: ${userData.name}`, data as User);
      showAlert("Sucesso", "Cadastro realizado. Aguarde aprovação.");
    }
    catch (err: any) { showError("Erro", err.message); }
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const renderContent = () => {
    switch (view) {
      case 'DASHBOARD':
        return <Dashboard
          incidents={incidents}
          buildings={buildings}
          sectors={sectors}
          onViewIncident={handleViewIncident}
          onNavigate={handleNavigate}
          onRefresh={() => fetchIncidents(false)}
          onNewIncidentWithBuilding={(bId) => { setPreSelectedBuildingId(bId); setEditingIncident(null); handleNavigate('NEW_RECORD'); }}
          currentUser={user!}
          onUnreadChange={fetchAnnouncementsCount}
          pendingIncidentsCount={pendingIncidentsCount}
          pendingLoansCount={pendingLoansCount}
          unreadAnnouncementsCount={unreadAnnouncementsCount}
        />;
      case 'NEW_RECORD':
        if (!can('CREATE_INCIDENT') && !can('EDIT_INCIDENT')) return <div className="p-8 text-center">Acesso Negado</div>;
        return <IncidentForm user={user!} users={users} buildings={buildings} alterationTypes={alterationTypes} nextRaCode={generateNextRaCode()} onSave={handleSaveIncident} onCancel={() => { setEditingIncident(null); setPreSelectedBuildingId(undefined); handleNavigate('DASHBOARD'); }} initialData={editingIncident} isLoading={saving} preSelectedBuildingId={preSelectedBuildingId} />;
      case 'HISTORY': return <IncidentHistory incidents={incidents} buildings={buildings} alterationTypes={alterationTypes} onView={handleViewIncident} onEdit={(i) => { setEditingIncident(i); handleNavigate('NEW_RECORD'); }} onDelete={handleDeleteIncident} filterStatus="COMPLETED" currentUser={user} customLogo={customLogoRight} customLogoLeft={customLogoLeft} hasMore={hasMore} isLoadingMore={loadingMore} onLoadMore={() => fetchIncidents(true)} canEdit={can('EDIT_INCIDENT')} canDelete={can('DELETE_INCIDENT')} canApprove={can('APPROVE_INCIDENT')} canExport={can('EXPORT_REPORTS')} />;
      case 'PENDING_APPROVALS':
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="animate-in slide-in-from-bottom-2 duration-300">
              {pendingSubTab === 'INCIDENTS' ? (
                <IncidentHistory
                  incidents={incidents}
                  buildings={buildings}
                  alterationTypes={alterationTypes}
                  onView={handleViewIncident}
                  onEdit={(i) => { setEditingIncident(i); handleNavigate('NEW_RECORD'); }}
                  onDelete={handleDeleteIncident}
                  onApprove={handleApproveIncident}
                  filterStatus="PENDING"
                  currentUser={user}
                  customLogo={customLogoRight}
                  customLogoLeft={customLogoLeft}
                  loans={loans}
                  onConfirmLoanBatch={handleConfirmLoanBatch}
                  canEdit={can('EDIT_INCIDENT')}
                  canDelete={can('DELETE_INCIDENT')}
                  canApprove={can('APPROVE_INCIDENT')}
                  canExport={can('EXPORT_REPORTS')}
                />
              ) : (
                <LoanViews
                  currentUser={user!}
                  users={users}
                  vehicles={vehicles}
                  vests={vests}
                  radios={radios}
                  equipments={equipments}
                  onLogAction={createLog}
                  loans={loans}
                  onRefresh={() => fetchLoans(false)}
                  initialTab="ACTIVE"
                  filterStatus="PENDING"
                  onShowConfirm={showConfirm}
                />
              )}
            </div>
          </div>
        );
      case 'BUILDINGS': return <BuildingList buildings={buildings} sectors={sectors} onEdit={(b) => { setEditingBuilding(b); handleNavigate('BUILDING_FORM'); }} onDelete={handleDeleteBuilding} onAdd={() => { setEditingBuilding(null); handleNavigate('BUILDING_FORM'); }} onRefresh={fetchStaticData} canEdit={can('MANAGE_BUILDINGS')} canDelete={can('MANAGE_BUILDINGS')} />;
      case 'BUILDING_FORM': return <BuildingForm initialData={editingBuilding} sectors={sectors} onSave={async (b) => { await supabase.from('buildings').upsert(b); fetchStaticData(); handleNavigate('BUILDINGS'); }} onCancel={() => handleNavigate('BUILDINGS')} onDelete={handleDeleteBuilding} />;
      case 'USERS': return <UserList users={users} jobTitles={jobTitles} onEdit={(u) => { setEditingUser(u); handleNavigate('USER_FORM'); }} onDelete={handleDeleteUser} onAdd={() => { setEditingUser(null); handleNavigate('USER_FORM'); }} onRefresh={fetchUsers} canEdit={can('MANAGE_USERS')} canDelete={can('DELETE_USERS')} />;
      case 'USER_FORM': return <UserForm initialData={editingUser} jobTitles={jobTitles} onSave={async (u) => { const { userCode, jobTitleId, ...rest } = u; await supabase.from('users').upsert({ ...rest, user_code: userCode, job_title_id: jobTitleId }); fetchUsers(); handleNavigate('USERS'); }} onCancel={() => handleNavigate('USERS')} onDelete={handleDeleteUser} />;
      case 'JOB_TITLES': return <JobTitleList jobTitles={jobTitles} onEdit={(t) => { setEditingJobTitle(t); handleNavigate('JOB_TITLE_FORM'); }} onDelete={handleDeleteJobTitle} onAdd={() => { setEditingJobTitle(null); handleNavigate('JOB_TITLE_FORM'); }} />;
      case 'JOB_TITLE_FORM': return <JobTitleForm initialData={editingJobTitle} onSave={handleSaveJobTitle} onCancel={() => handleNavigate('JOB_TITLES')} onDelete={handleDeleteJobTitle} />;
      case 'VEHICLES': return <VehicleList items={vehicles} onAdd={() => { setEditingVehicle(null); handleNavigate('VEHICLE_FORM'); }} onEdit={(i) => { setEditingVehicle(i); handleNavigate('VEHICLE_FORM'); }} onDelete={(id) => handleDeleteAsset('vehicles', id, 'Veículo')} />;
      case 'VEHICLE_FORM': return <VehicleForm initialData={editingVehicle} onSave={(i: any) => handleSaveAsset('vehicles', i, 'VEHICLES', 'Veículo')} onCancel={() => handleNavigate('VEHICLES')} onDelete={() => editingVehicle && handleDeleteAsset('vehicles', editingVehicle.id, 'Veículo')} />;
      case 'VESTS': return <VestList items={vests} onAdd={() => { setEditingVest(null); handleNavigate('VEST_FORM'); }} onEdit={(i) => { setEditingVest(i); handleNavigate('VEST_FORM'); }} onDelete={(id) => handleDeleteAsset('vests', id, 'Colete')} />;
      case 'VEST_FORM': return <VestForm initialData={editingVest} onSave={(i: any) => handleSaveAsset('vests', i, 'VESTS', 'Colete')} onCancel={() => handleNavigate('VESTS')} onDelete={() => editingVest && handleDeleteAsset('vests', editingVest.id, 'Colete')} />;
      case 'RADIOS': return <RadioList items={radios} onAdd={() => { setEditingRadio(null); handleNavigate('RADIO_FORM'); }} onEdit={(i) => { setEditingRadio(i); handleNavigate('RADIO_FORM'); }} onDelete={(id) => handleDeleteAsset('radios', id, 'Rádio')} />;
      case 'RADIO_FORM': return <RadioForm initialData={editingRadio} onSave={(i: any) => handleSaveAsset('radios', i, 'RADIOS', 'Rádio')} onCancel={() => handleNavigate('RADIOS')} onDelete={() => editingRadio && handleDeleteAsset('radios', editingRadio.id, 'Rádio')} />;
      case 'EQUIPMENTS': return <EquipmentList items={equipments} onAdd={() => { setEditingEquipment(null); handleNavigate('EQUIPMENT_FORM'); }} onEdit={(i) => { setEditingEquipment(i); handleNavigate('EQUIPMENT_FORM'); }} onDelete={(id) => handleDeleteAsset('equipments', id, 'Equipamento')} />;
      case 'EQUIPMENT_FORM': return <EquipmentForm initialData={editingEquipment} onSave={(i: any) => handleSaveAsset('equipments', i, 'EQUIPMENTS', 'Equipamento')} onCancel={() => handleNavigate('EQUIPMENTS')} onDelete={() => editingEquipment && handleDeleteAsset('equipments', editingEquipment.id, 'Equipamento')} />;
      case 'LOANS': return <LoanViews currentUser={user!} users={users} vehicles={vehicles} vests={vests} radios={radios} equipments={equipments} onLogAction={createLog} loans={loans} onRefresh={() => fetchLoans(false)} filterStatus="ACTIVE" onShowConfirm={showConfirm} />;
      case 'LOAN_HISTORY': return <LoanViews currentUser={user!} users={users} vehicles={vehicles} vests={vests} radios={radios} equipments={equipments} onLogAction={createLog} initialTab="HISTORY" isReportView={true} loans={loans} onRefresh={() => fetchLoans(false)} hasMore={hasMoreLoans} isLoadingMore={loadingMoreLoans} onLoadMore={() => fetchLoans(true)} onShowConfirm={showConfirm} />;
      case 'SECTORS': return <SectorList sectors={sectors} onEdit={(s) => { setEditingSector(s); handleNavigate('SECTOR_FORM'); }} onDelete={handleDeleteSector} onAdd={() => { setEditingSector(null); handleNavigate('SECTOR_FORM'); }} />;
      case 'SECTOR_FORM': return <SectorForm initialData={editingSector} onSave={handleSaveSector} onCancel={() => handleNavigate('SECTORS')} onDelete={handleDeleteSector} />;
      case 'ALTERATION_TYPES': return <AlterationTypeManager types={alterationTypes} onAdd={async (name) => { const newType = { id: crypto.randomUUID(), name, order: alterationTypes.length }; await handleSaveAlterationType(newType); }} onEdit={(t) => { setEditingAlterationType(t); setView('ALTERATION_TYPE_FORM'); }} onDelete={handleDeleteAlterationType} onReorder={handleReorderAlterationTypes} />;
      case 'ALTERATION_TYPE_FORM': return <AlterationTypeForm initialData={editingAlterationType} onSave={handleSaveAlterationType} onCancel={() => handleNavigate('ALTERATION_TYPES')} onDelete={handleDeleteAlterationType} />;
      case 'CHARTS': return <ChartsView incidents={incidents} buildings={buildings} sectors={sectors} />;
      case 'LOGS': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} onLogAction={createLog} initialTab='LOGS' />;
      case 'TOOLS': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} currentLogoLeft={customLogoLeft} onUpdateLogoLeft={handleUpdateLogoLeft} onLogAction={createLog} initialTab='APPEARANCE' />;
      case 'IMPORT_EXPORT': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} currentLogoLeft={customLogoLeft} onUpdateLogoLeft={handleUpdateLogoLeft} onLogAction={createLog} initialTab='IMPORT_EXPORT' />;
      case 'PERMISSIONS_TOOLS': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} isLocalMode={isLocalMode} onToggleLocalMode={handleToggleLocalMode} unsyncedCount={unsyncedIncidents.length} onSync={handleSyncData} initialTab='ACCESS_CONTROL' onLogAction={createLog} permissions={permissions} onUpdatePermissions={handleUpdatePermissions} userOverrides={userOverrides} onUpdateOverrides={handleUpdateOverrides} users={users} menuVisibility={menuVisibility} onUpdateMenuVisibility={handleUpdateMenuVisibility} userMenuOverrides={userMenuOverrides} onUpdateMenuOverrides={handleUpdateMenuOverrides} />;
      case 'DATABASE_TOOLS': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} isLocalMode={isLocalMode} onToggleLocalMode={handleToggleLocalMode} unsyncedCount={unsyncedIncidents.length} onSync={handleSyncData} initialTab='DATABASE' onLogAction={createLog} permissions={permissions} onUpdatePermissions={handleUpdatePermissions} />;
      case 'SYSTEM_INFO': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} currentLogoLeft={customLogoLeft} onUpdateLogoLeft={handleUpdateLogoLeft} onLogAction={createLog} initialTab='SYSTEM' />;

      case 'INCIDENT_DETAIL': return <IncidentDetail incident={selectedIncident!} building={buildings.find(b => b.id === selectedIncident?.buildingId)} author={users.find(u => u.id === selectedIncident?.userId)} approverRole={users.find(u => u.name === selectedIncident?.approvedBy)?.role} approverJobTitle={jobTitles.find(jt => jt.id === users.find(u => u.name === selectedIncident?.approvedBy)?.jobTitleId)?.name} onBack={() => handleNavigate('DASHBOARD')} onApprove={handleApproveIncident} onEdit={() => { setEditingIncident(selectedIncident); handleNavigate('NEW_RECORD'); }} onDelete={handleDeleteIncident} customLogo={customLogoRight} customLogoLeft={customLogoLeft} canEdit={can('EDIT_INCIDENT')} canDelete={can('DELETE_INCIDENT')} canApprove={can('APPROVE_INCIDENT')} currentUser={user!} />;
      case 'ANNOUNCEMENTS': return <AnnouncementManager currentUser={user!} users={users} onAnnouncementCreated={fetchAnnouncementsCount} />;
      case 'PROFILE': return <ProfileView user={user!} onUpdatePassword={handleUpdatePassword} />;
      default: return <Dashboard
        incidents={incidents}
        buildings={buildings}
        sectors={sectors}
        onViewIncident={handleViewIncident}
        onNavigate={handleNavigate}
        onRefresh={() => fetchIncidents(false)}
        currentUser={user!}
        pendingIncidentsCount={pendingIncidentsCount}
        pendingLoansCount={pendingLoansCount}
        unreadAnnouncementsCount={unreadAnnouncementsCount}
      />;
    }
  };

  if (!user) return <Auth onLogin={handleLogin} onRegister={handleRegister} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} customLogo={customLogoRight} onShowSetup={() => setShowDbSetup(true)} systemVersion={DISPLAY_VERSION} users={users} isLocalMode={isLocalMode} onToggleLocalMode={handleToggleLocalMode} unsyncedCount={unsyncedIncidents.length} onSync={handleSyncData} />;
  const pendingIncidentsCount = incidents.filter(i => i.status === 'PENDING').length;
  // Conta lotes (batches) pendentes. Supervisores veem tudo, outros veem os seus (como recebedor ou operador)
  const pendingLoansCount = Array.from(new Set(
    loans.filter(l => l.status === 'PENDING' && (
      l.receiverId === user.id ||
      l.operatorId === user.id ||
      can('APPROVE_INCIDENT')
    )).map(l => l.batchId || l.id)
  )).length;
  // Badge total é a soma
  const totalPendingBadge = pendingIncidentsCount + pendingLoansCount;

  return (
    <div className="min-h-screen flex transition-colors duration-200">
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#0b101d] transform transition-all duration-500 lg:relative border-r border-white/5 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.5)] ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'} ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>
        <div className="h-full flex flex-col text-white">
          <div className={`transition-all duration-500 flex items-center ${isSidebarCollapsed ? 'h-20 justify-center px-2' : 'h-24 px-8 justify-start gap-3'}`}>
            <div className={`transition-all duration-500 flex items-center justify-center group hover:scale-110 ${isSidebarCollapsed ? 'h-12 w-12' : 'h-16 w-16'}`}>
              {customLogoRight ? (
                <img src={customLogoRight} className="w-full h-full object-contain" alt="Logo" />
              ) : (
                <Shield className="text-white drop-shadow-md" size={isSidebarCollapsed ? 28 : 36} strokeWidth={1.5} />
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col animate-in fade-in duration-500 slide-in-from-left-2">
                <span className="text-white font-black text-lg tracking-tighter uppercase leading-none">Vigilante</span>
                <span className="text-blue-500 text-[10px] font-black tracking-[0.3em] uppercase mt-0.5">Municipal</span>
              </div>
            )}
          </div>
          <nav className={`flex-1 overflow-y-auto no-scrollbar pt-4 ${isSidebarCollapsed ? 'px-0' : 'px-4 space-y-1'}`}>
            {!isSidebarCollapsed && <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] px-4 mb-4 mt-2">Principal</h3>}
            {can('VIEW_DASHBOARD') && isMenuVisible('dashboard') && <NavItem icon={<LayoutDashboard />} label="Painel de Controle" active={view === 'DASHBOARD'} onClick={() => handleNavigate('DASHBOARD')} collapsed={isSidebarCollapsed} />}
            {isMenuVisible('dashboard') && (
              <NavItem
                icon={<Megaphone />}
                label="Mural de Avisos"
                active={view === 'ANNOUNCEMENTS'}
                onClick={() => handleNavigate('ANNOUNCEMENTS')}
                collapsed={isSidebarCollapsed}
                badge={unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : undefined}
                hasChevron={true}
              />
            )}
            {can('VIEW_DASHBOARD') && isMenuVisible('new_record') && <NavItem icon={<FileText />} label="Registar R.A" active={view === 'NEW_RECORD'} onClick={() => { setEditingIncident(null); handleNavigate('NEW_RECORD'); }} collapsed={isSidebarCollapsed} />}
            {(can('MANAGE_LOANS') || can('RETURN_LOANS') || loans.some(l => l.receiverId === user.id && l.status === 'ACTIVE')) && isMenuVisible('loans_root') && (
              <NavItem icon={<ArrowRightLeft />} label="Cautelas" active={view === 'LOANS'} onClick={() => handleNavigate('LOANS')} collapsed={isSidebarCollapsed} />
            )}

            <div className="pt-6">
              {!isSidebarCollapsed && <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] px-4 mb-4">Monitoramento</h3>}
              {isMenuVisible('monitoring_group') && (
                <div className="relative">
                  {(can('VIEW_ALL_INCIDENTS')) && isMenuVisible('history_root') && <NavItem icon={<CheckCircle />} label="Históricos" active={view === 'HISTORY' || view === 'LOAN_HISTORY'} onClick={() => setReportsMenuOpen(!reportsMenuOpen)} collapsed={isSidebarCollapsed} hasChevron={!isSidebarCollapsed} />}
                  {!isSidebarCollapsed && (can('VIEW_ALL_INCIDENTS')) && isMenuVisible('history_root') && <div className="absolute right-3 top-3.5 pointer-events-none text-brand-300">{reportsMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>}
                </div>
              )}
              {reportsMenuOpen && !isSidebarCollapsed && (can('VIEW_ALL_INCIDENTS')) && isMenuVisible('history_root') && (
                <div className="space-y-1 mt-1">
                  {isMenuVisible('history_incidents') && <NavItem label="Atendimentos" icon={<FileText size={14} className="mr-2" />} active={view === 'HISTORY'} onClick={() => handleNavigate('HISTORY')} collapsed={isSidebarCollapsed} isSubItem />}
                  {isMenuVisible('history_loans') && <NavItem label="Cautelas" icon={<ArrowRightLeft size={14} className="mr-2" />} active={view === 'LOAN_HISTORY'} onClick={() => handleNavigate('LOAN_HISTORY')} collapsed={isSidebarCollapsed} isSubItem />}
                </div>
              )}
              {isMenuVisible('monitoring_group') && isMenuVisible('pending_root') && (
                <div className="relative">
                  <NavItem icon={<UserCheck />} label="Pendentes" active={view === 'PENDING_APPROVALS'} onClick={() => setPendentesMenuOpen(!pendentesMenuOpen)} collapsed={isSidebarCollapsed} badge={totalPendingBadge > 0 ? totalPendingBadge : undefined} hasChevron={!isSidebarCollapsed} />
                  {!isSidebarCollapsed && <div className="absolute right-3 top-3.5 pointer-events-none text-brand-300">{pendentesMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>}
                </div>
              )}
              {pendentesMenuOpen && !isSidebarCollapsed && isMenuVisible('monitoring_group') && isMenuVisible('pending_root') && (
                <div className="space-y-1 mt-1">
                  {isMenuVisible('pending_incidents') && <NavItem label="Atendimentos" icon={<FileText size={14} className="mr-2" />} active={view === 'PENDING_APPROVALS' && pendingSubTab === 'INCIDENTS'} onClick={() => { setPendingSubTab('INCIDENTS'); handleNavigate('PENDING_APPROVALS'); }} collapsed={isSidebarCollapsed} isSubItem badge={pendingIncidentsCount > 0 ? pendingIncidentsCount : undefined} />}
                  {isMenuVisible('pending_loans') && <NavItem label="Cautelas" icon={<ArrowRightLeft size={14} className="mr-2" />} active={view === 'PENDING_APPROVALS' && pendingSubTab === 'LOANS'} onClick={() => { setPendingSubTab('LOANS'); handleNavigate('PENDING_APPROVALS'); }} collapsed={isSidebarCollapsed} isSubItem badge={pendingLoansCount > 0 ? pendingLoansCount : undefined} />}
                </div>
              )}

              {isMenuVisible('monitoring_group') && isMenuVisible('charts') && <NavItem icon={<PieChartIcon />} label="Estatísticas" active={view === 'CHARTS'} onClick={() => handleNavigate('CHARTS')} collapsed={isSidebarCollapsed} />}
            </div>
            {(can('MANAGE_ASSETS') || can('MANAGE_USERS') || can('MANAGE_BUILDINGS') || can('MANAGE_SECTORS') || can('MANAGE_ALTERATION_TYPES')) && isMenuVisible('admin_group') && (
              <div className="pt-6">
                {!isSidebarCollapsed && <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] px-4 mb-4">Administração</h3>}
                {isMenuVisible('registrations_root') && (
                  <div className="relative">
                    <NavItem icon={<FolderOpen />} label="Cadastros" active={view.includes('FORM') || view === 'BUILDINGS' || view === 'USERS' || view === 'VEHICLES' || view === 'VESTS' || view === 'RADIOS' || view === 'EQUIPMENTS' || view === 'ALTERATION_TYPES' || view === 'SECTORS' || view === 'JOB_TITLES'} onClick={() => setRegistrationsMenuOpen(!registrationsMenuOpen)} collapsed={isSidebarCollapsed} hasChevron={!isSidebarCollapsed} />
                    {!isSidebarCollapsed && <div className="absolute right-3 top-3.5 pointer-events-none text-brand-300">{registrationsMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>}
                  </div>
                )}
                {registrationsMenuOpen && !isSidebarCollapsed && isMenuVisible('registrations_root') && (
                  <div className="space-y-1 mt-1">
                    {can('MANAGE_BUILDINGS') && isMenuVisible('reg_buildings') && (
                      <NavItem label="Próprios" icon={<BuildingIcon size={14} className="mr-2" />} active={view === 'BUILDINGS' || view === 'BUILDING_FORM'} onClick={() => handleNavigate('BUILDINGS')} collapsed={isSidebarCollapsed} isSubItem />
                    )}
                    {can('MANAGE_ALTERATION_TYPES') && isMenuVisible('reg_types') && (
                      <NavItem label="Tipos de Alteração" icon={<Tag size={14} className="mr-2" />} active={view === 'ALTERATION_TYPES' || view === 'ALTERATION_TYPE_FORM'} onClick={() => handleNavigate('ALTERATION_TYPES')} collapsed={isSidebarCollapsed} isSubItem />
                    )}
                    {can('MANAGE_SECTORS') && isMenuVisible('reg_sectors') && (
                      <NavItem label="Setores" icon={<Map size={14} className="mr-2" />} active={view === 'SECTORS' || view === 'SECTOR_FORM'} onClick={() => handleNavigate('SECTORS')} collapsed={isSidebarCollapsed} isSubItem />
                    )}
                    {can('MANAGE_USERS') && isMenuVisible('reg_users') && <NavItem label="Usuários" icon={<Users size={14} className="mr-2" />} active={view === 'USERS' || view === 'USER_FORM'} onClick={() => handleNavigate('USERS')} collapsed={isSidebarCollapsed} isSubItem />}
                    {can('MANAGE_JOB_TITLES') && <NavItem label="Cargos e Funções" icon={<Briefcase size={14} className="mr-2" />} active={view === 'JOB_TITLES' || view === 'JOB_TITLE_FORM'} onClick={() => handleNavigate('JOB_TITLES')} collapsed={isSidebarCollapsed} isSubItem />}
                    {can('MANAGE_ASSETS') && isMenuVisible('reg_assets') && (
                      <>
                        <NavItem label="Veículos" icon={<Car size={14} className="mr-2" />} active={view === 'VEHICLES' || view === 'VEHICLE_FORM'} onClick={() => handleNavigate('VEHICLES')} collapsed={isSidebarCollapsed} isSubItem />
                        <NavItem label="Coletes" icon={<Shield size={14} className="mr-2" />} active={view === 'VESTS' || view === 'VEST_FORM'} onClick={() => handleNavigate('VESTS')} collapsed={isSidebarCollapsed} isSubItem />
                        <NavItem label="Rádios HT" icon={<RadioIcon size={14} className="mr-2" />} active={view === 'RADIOS' || view === 'RADIO_FORM'} onClick={() => handleNavigate('RADIOS')} collapsed={isSidebarCollapsed} isSubItem />
                        <NavItem label="Outros" icon={<Package size={14} className="mr-2" />} active={view === 'EQUIPMENTS' || view === 'EQUIPMENT_FORM'} onClick={() => handleNavigate('EQUIPMENTS')} collapsed={isSidebarCollapsed} isSubItem />
                      </>
                    )}
                  </div>
                )}
                {can('ACCESS_TOOLS') && isMenuVisible('tools_root') && (
                  <div className="relative">
                    <NavItem icon={<Wrench />} label="Ferramentas" active={view === 'TOOLS' || view === 'LOGS' || view === 'DATABASE_TOOLS' || view === 'PERMISSIONS_TOOLS' || view === 'IMPORT_EXPORT' || view === 'SYSTEM_INFO'} onClick={() => setToolsMenuOpen(!toolsMenuOpen)} collapsed={isSidebarCollapsed} />
                    {!isSidebarCollapsed && <div className="absolute right-3 top-3.5 pointer-events-none text-brand-300">{toolsMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>}
                    {toolsMenuOpen && !isSidebarCollapsed && (
                      <div className="space-y-1 mt-1">
                        {isMenuVisible('tool_appearance') && <NavItem label="Aparência" active={view === 'TOOLS'} onClick={() => handleNavigate('TOOLS')} collapsed={isSidebarCollapsed} isSubItem />}
                        {isMenuVisible('tool_import') && <NavItem label="Importação / Exportação" active={view === 'IMPORT_EXPORT'} onClick={() => handleNavigate('IMPORT_EXPORT')} collapsed={isSidebarCollapsed} isSubItem />}
                        {isMenuVisible('tool_permissions') && <NavItem label="Permissões" active={view === 'PERMISSIONS_TOOLS'} onClick={() => handleNavigate('PERMISSIONS_TOOLS')} collapsed={isSidebarCollapsed} isSubItem />}
                        {isMenuVisible('tool_logs') && <NavItem label="Log do sistema" active={view === 'LOGS'} onClick={() => handleNavigate('LOGS')} collapsed={isSidebarCollapsed} isSubItem />}
                        {isMenuVisible('tool_database') && <NavItem label="Banco de Dados" active={view === 'DATABASE_TOOLS'} onClick={() => handleNavigate('DATABASE_TOOLS')} collapsed={isSidebarCollapsed} isSubItem />}
                        <NavItem label="Sobre o Sistema" active={view === 'SYSTEM_INFO'} onClick={() => handleNavigate('SYSTEM_INFO')} collapsed={isSidebarCollapsed} isSubItem />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="mt-8 pt-4 border-t border-white/5">

              <NavItem icon={<LogOut className="rotate-180" />} label="Sair do Sistema" onClick={handleLogout} collapsed={isSidebarCollapsed} />

              {!isSidebarCollapsed && (
                <div className="py-2 text-center opacity-30 group-hover:opacity-100 transition-opacity duration-700">
                  <p className="text-[8px] font-mono text-slate-500 uppercase tracking-[0.15em] cursor-default">
                    Internal System v{DISPLAY_VERSION}
                  </p>
                </div>
              )}
            </div>
          </nav>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center px-4 md:px-8 justify-between shadow-sm z-30 transition-colors duration-200">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2"><Menu /></button>
            <h2 className="hidden md:block text-xs font-black uppercase text-slate-400 tracking-widest">Gestão Municipal</h2>
            {isLocalMode && <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded text-xs font-black uppercase animate-pulse"><CloudOff size={12} /> Offline Ativado</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">{darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
            <button onClick={() => handleNavigate('PROFILE')} className="flex items-center gap-3 border-l pl-3 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg p-1 transition-colors group">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-black uppercase text-slate-900 dark:text-slate-100 leading-tight group-hover:text-brand-600 transition-colors">{user.name.split(' ')[0]}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{user.role === 'OPERADOR' ? 'OPERADOR' : user.role}</p>
              </div>
              <div className="h-10 w-10 bg-brand-900 rounded-full flex items-center justify-center text-white font-bold uppercase border-2 border-white shadow-sm ring-1 ring-brand-100 transition-all">{user.name.charAt(0)}</div>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{renderContent()}</main>
      </div>
      {showDbSetup && <DatabaseSetup onClose={() => setShowDbSetup(false)} />}
      <Modal isOpen={modalConfig.isOpen} type={modalConfig.type} title={modalConfig.title} message={modalConfig.message} onConfirm={modalConfig.onConfirm} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />

      {/* MODAL DE CANCELAMENTO */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform scale-100 transition-all animate-in zoom-in-95 duration-200 border border-red-200 dark:border-red-900">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                  <Ban className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cancelar Registro</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Por favor, informe o motivo do cancelamento deste registro. Esta ação é irreversível.</p>

                  <textarea
                    value={cancelModal.reason}
                    onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                    className="w-full mt-4 p-3 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Descreva o motivo..."
                    rows={3}
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModal({ isOpen: false, incidentId: '', reason: '' })}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancellation}
                disabled={!cancelModal.reason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
