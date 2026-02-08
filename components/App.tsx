
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NotificationCenter } from './NotificationCenter';
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
import { MapView } from './MapView';
import AnnouncementManager from './AnnouncementManager';
import { announcementService } from '../services/announcementService';
import { User, Building, Incident, ViewState, UserRole, Sector, JobTitle, AlterationType, SystemLog, Vehicle, Vest, Radio, Equipment, LoanRecord, SystemPermissionMap, PermissionKey, UserPermissionOverrides, Escala, EscalaReminder } from '../types';
import { MENU_STRUCTURE, MenuItemDef } from '../constants/menuStructure';
import { LayoutDashboard, Building as BuildingIcon, Users, LogOut, Menu, FileText, Pencil, Plus, Map, MapPin, Trash2, ChevronRight, Shield, Loader2, Search, PieChart as PieChartIcon, Download, Filter, CheckCircle, Check, Clock, X, AlertCircle, Database, Settings, UserCheck, Moon, Sun, Wrench, ChevronDown, FolderOpen, Car, Radio as RadioIcon, Package, ArrowRightLeft, ArrowLeft, CloudOff, WifiOff, History, Ban, XCircle, Tag, RefreshCw, Bell, Key, Hash, FileSpreadsheet, Briefcase, Megaphone, ShieldCheck, Printer, Maximize2, RotateCw, Type, Move, Layers, MousePointer2, Minus, Info, Sliders, Square, Maximize, FilePlus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { normalizeString } from '../utils/stringUtils';
import CryptoJS from 'crypto-js';
import { formatDateBR } from '../utils/dateUtils';

declare var html2pdf: any;
declare var XLSX: any;

declare const __APP_VERSION__: string;
declare const __GIT_HASH__: string;
declare const __BUILD_DATE__: string;

// --- CONFIGURAÇÃO PADRÃO DE PERMISSÕES (FALLBACK) ---
const DEFAULT_PERMISSIONS: SystemPermissionMap = {
  // Dashboard & General
  VIEW_DASHBOARD: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.RONDA, UserRole.OUTROS],
  VIEW_MAP: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.RONDA, UserRole.OUTROS],
  VIEW_CHARTS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  VIEW_ANNOUNCEMENTS: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.RONDA, UserRole.OUTROS],

  // Incidents
  CREATE_INCIDENT: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.RONDA],
  VIEW_MY_INCIDENTS: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.RONDA],
  VIEW_ALL_INCIDENTS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  VIEW_MY_PENDING_INCIDENTS: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.RONDA],
  VIEW_ALL_PENDING_INCIDENTS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  EDIT_INCIDENT: [UserRole.ADMIN, UserRole.SUPERVISOR],
  APPROVE_INCIDENT: [UserRole.ADMIN, UserRole.SUPERVISOR],
  DELETE_INCIDENT: [UserRole.ADMIN, UserRole.SUPERVISOR],

  // Loans
  CREATE_LOAN: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR],
  APPROVE_LOAN: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR],
  RETURN_LOAN: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR],
  VIEW_MY_LOANS: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.RONDA],
  VIEW_ALL_LOANS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  VIEW_MY_PENDING_LOANS: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.RONDA],
  VIEW_ALL_PENDING_LOANS: [UserRole.ADMIN, UserRole.SUPERVISOR],

  // Assets
  VIEW_ASSETS: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERADOR],
  MANAGE_VEHICLES: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_VESTS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_RADIOS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_EQUIPMENTS: [UserRole.ADMIN, UserRole.SUPERVISOR],

  // Administration
  MANAGE_USERS: [UserRole.ADMIN],
  MANAGE_BUILDINGS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_SECTORS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_JOB_TITLES: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_ALTERATION_TYPES: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_ESCALAS: [UserRole.ADMIN, UserRole.SUPERVISOR],
  MANAGE_ANNOUNCEMENTS: [UserRole.ADMIN, UserRole.SUPERVISOR],
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
  // Campos de Assinatura e IP (Novos)
  signatureHash: db.signature_hash || db.signatureHash,
  createdIp: db.created_ip || db.createdIp,
  updatedIp: db.updated_ip || db.updatedIp,
  approvedIp: db.approved_ip || db.approvedIp,

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
  // Novos campos de auditoria
  signatureHash: l.signature_hash || l.signatureHash,
  createdIp: l.created_ip || l.createdIp,
  updatedIp: l.updated_ip || l.updatedIp,
});

const mapVehicle = (v: any): Vehicle => ({
  ...v,
  fleetNumber: v.fleet_number || v.fleetNumber,
  fuelType: v.fuel_type || v.fuelType,
  currentKm: v.current_km !== undefined ? v.current_km : v.currentKm
});

// Helper for sequential integrity
const calculateNextRaCode = (currentIncidents: any[]) => {
  const currentYear = new Date().getFullYear();
  const yearIncidents = currentIncidents.filter(i => {
    const ra = i.raCode || i.ra_code || '';
    return ra.endsWith(currentYear.toString());
  });
  let maxNum = 0;
  yearIncidents.forEach(i => {
    const ra = i.raCode || i.ra_code || '';
    const num = parseInt(ra.split('/')[0]);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  });
  return `${maxNum + 1}/${currentYear}`;
};

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
  isOpen?: boolean;
  sidebarDark?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, collapsed, badge, isSubItem, hasChevron, isOpen, sidebarDark }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center transition-all duration-300 relative group gap-4
      ${collapsed ? 'justify-center py-4 px-0' : 'px-5 py-3.5 mx-0 rounded-xl'} 
      ${active
        ? `${sidebarDark ? 'bg-blue-500/10 text-blue-400 shadow-[0_4px_12px_rgba(59,130,246,0.1)]' : 'bg-blue-50 text-blue-600 shadow-sm'}`
        : `${sidebarDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`} 
      ${isSubItem ? 'pl-12 opacity-80' : ''}`}
    title={collapsed ? label : ''}
  >
    {/* Subtle active indicator (Magic Indicator effect) */}
    {active && (
      <div className={`absolute left-0 w-1.5 h-6 rounded-r-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)] transition-all duration-500 ${collapsed ? 'left-0' : 'left-0'}`} />
    )}

    {icon && (
      <div className={`flex-shrink-0 transition-all duration-300 ${active ? 'scale-110 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'text-slate-400 group-hover:scale-110 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`}>
        {React.cloneElement(icon as React.ReactElement, { size: collapsed ? 24 : 20, strokeWidth: active ? 2.5 : 2 })}
      </div>
    )}

    {!collapsed && (
      <span className={`text-[13px] font-semibold tracking-tight truncate flex-1 text-left ${active ? 'font-bold' : 'font-medium opacity-90'}`}>
        {label}
      </span>
    )}

    {/* Badge */}
    {badge && badge > 0 && (
      <span className={`
        ${collapsed
          ? 'absolute -top-1 -right-1'
          : 'relative ml-auto'} 
        bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ${sidebarDark ? 'ring-[#0f172a]' : 'ring-white'} shadow-lg transform transition-transform group-hover:scale-110 flex-shrink-0`}
      >
        {badge}
      </span>
    )}

    {hasChevron && !collapsed && (
      <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} text-slate-400 flex-shrink-0`}>
        <ChevronDown size={14} />
      </div>
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
  canViewAll?: boolean;
  jobTitles: JobTitle[];
  onFilterChange?: (filters: { dateStart: string, timeStart: string, dateEnd: string, timeEnd: string }) => void;
  onBack?: () => void;
  requireFilter?: boolean;
  onLogAction?: (action: any, details: string) => void;
  embeddedPreview?: boolean;
}> = (props) => {
  const { incidents, buildings, onView, onEdit, onDelete, onApprove,
    filterStatus, currentUser, customLogo, customLogoLeft, loans = [], onConfirmLoanBatch,
    onLoadMore, hasMore, isLoadingMore, canEdit, canDelete, canApprove, canExport, canViewAll = false, jobTitles, onFilterChange, onBack, requireFilter = false, onLogAction,
    embeddedPreview = false } = props;
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');

  // Auto-refresh on filter change
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({ dateStart, timeStart, dateEnd, timeEnd });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStart, timeStart, dateEnd, timeEnd]);
  const [exportIP, setExportIP] = useState<string>('');
  const [exportDate, setExportDate] = useState<string>('');
  const [exportHash, setExportHash] = useState<string>('');
  const [pdfMargins, setPdfMargins] = useState(() => {
    const saved = localStorage.getItem('app_pdf_margins');
    return saved ? JSON.parse(saved) : { top: 15, right: 8, bottom: 15, left: 8 };
  });

  useEffect(() => {
    localStorage.setItem('app_pdf_margins', JSON.stringify(pdfMargins));
  }, [pdfMargins]);




  const [showMarginSettings, setShowMarginSettings] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [pdfPaperSize, setPdfPaperSize] = useState<'A4' | 'LETTER' | 'LEGAL'>('A4');
  const [pdfScale, setPdfScale] = useState(100);
  const [autoFit, setAutoFit] = useState(true); // New Auto-Fit state
  const [pdfUnit, setPdfUnit] = useState<'mm' | 'cm' | 'in'>('mm');
  const [showMarginGuides, setShowMarginGuides] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const [statusFilter, setStatusFilter] = useState<'APPROVED' | 'CANCELLED' | 'PENDING'>(
    filterStatus === 'PENDING' ? 'PENDING' : 'APPROVED'
  );

  useEffect(() => {
    setStatusFilter(filterStatus === 'PENDING' ? 'PENDING' : 'APPROVED');
  }, [filterStatus]);

  const [measuredChunks, setMeasuredChunks] = useState<Incident[][] | null>(null);

  const fetchClientIP = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      if (res.ok) {
        const data = await res.json();
        return data.ip || '---';
      }
    } catch (e) { console.warn('Falha IP:', e); }
    return '---';
  };

  const printRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  let filtered = incidents.filter(i => {
    const status = (i.status || '').toUpperCase();
    if (filterStatus === 'PENDING') return status === 'PENDING';
    return status === 'APPROVED' || status === 'CANCELLED';
  });

  // Permission filtering: if not canViewAll, only see own records
  if (!canViewAll && currentUser) {
    filtered = filtered.filter(i => i.userId === currentUser.id);
  }

  const startFilter = dateStart ? new Date(`${dateStart}T${timeStart || '00:00'}`) : null;
  const endFilter = dateEnd ? new Date(`${dateEnd}T${timeEnd || '23:59'}`) : null;

  filtered = filtered.filter(i => {
    if (!startFilter && !endFilter) return true;
    // Forçar interpretação local ao remover qualquer 'Z' ou offset se existir e garantir formato ISO básico
    const incidentTimeStr = `${i.date}T${i.startTime || '00:00'}`;
    const incidentTime = new Date(incidentTimeStr);

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

  // Helper for Margin Presets
  const applyPreset = (preset: 'normal' | 'narrow' | 'none') => {
    if (preset === 'normal') {
      setPdfMargins({ top: 15, right: 15, bottom: 15, left: 15 });
    } else if (preset === 'narrow') {
      setPdfMargins({ top: 5, right: 5, bottom: 5, left: 5 });
    } else if (preset === 'none') {
      setPdfMargins({ top: 0, right: 0, bottom: 0, left: 0 });
    }
  };

  // Check if any filter is active
  const isFilterActive = !!(search || (dateStart && dateEnd) || statusFilter !== 'APPROVED'); // Simplified check
  const showResults = !requireFilter || (requireFilter && (dateStart || dateEnd || search)); // Show if not requiring filter OR if filter is present (basic date filter usually)

  // Local component for rendering a single report page
  const ReportView: React.FC<{
    chunk: Incident[];
    pageIndex: number;
    chunksLength: number;
    pdfOrientation: 'portrait' | 'landscape';
    pdfPaperSize: 'A4' | 'LETTER' | 'LEGAL';
    pdfMargins: { top: number; right: number; bottom: number; left: number };
    pdfUnit: 'mm' | 'cm' | 'in';
    showMarginGuides: boolean;
    customLogo: string | null;
    customLogoLeft?: string | null;
    jobTitles: JobTitle[];
    exportDate: string;
    exportIP: string;
    exportHash: string;
    buildings: Building[];
    currentUser: User | null;
    hideFooter?: boolean;
  }> = ({
    chunk,
    pageIndex,
    chunksLength,
    pdfOrientation,
    pdfPaperSize,
    pdfMargins,
    pdfUnit,
    showMarginGuides,
    customLogo,
    customLogoLeft,
    jobTitles,
    exportDate,
    exportIP,
    exportHash,
    buildings,
    currentUser,
    hideFooter = false,
  }) => {
      const pageWidth = pdfOrientation === 'landscape' ? (pdfPaperSize === 'A4' ? '297mm' : pdfPaperSize === 'LETTER' ? '279mm' : '356mm') : (pdfPaperSize === 'A4' ? '210mm' : '216mm');
      const pageHeight = pdfOrientation === 'landscape' ? (pdfPaperSize === 'A4' ? '210mm' : '216mm') : (pdfPaperSize === 'A4' ? '297mm' : pdfPaperSize === 'LETTER' ? '279mm' : '356mm');

      return (
        <div
          key={pageIndex}
          className="report-page bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col justify-between relative group"
          style={{
            width: pageWidth,
            height: pageHeight,
            paddingTop: `${pdfMargins.top}${pdfUnit}`,
            paddingBottom: `${pdfMargins.bottom}${pdfUnit}`,
            paddingLeft: `${pdfMargins.left}${pdfUnit}`,
            paddingRight: `${pdfMargins.right}${pdfUnit}`,
            pageBreakAfter: 'always',
            fontFamily: "'Inter', sans-serif",
            boxSizing: 'border-box'
          }}
        >
          {/* Interactive Margin Guides (Dashed) */}
          {showMarginGuides && (
            <div
              className="margin-guide absolute inset-0 pointer-events-none transition-opacity opacity-0 group-hover:opacity-100"
              style={{
                top: `${pdfMargins.top}${pdfUnit}`,
                bottom: `${pdfMargins.bottom}${pdfUnit}`,
                left: `${pdfMargins.left}${pdfUnit}`,
                right: `${pdfMargins.right}${pdfUnit}`,
                border: '1px dashed rgba(59, 130, 246, 0.3)'
              }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-[8px] font-black text-blue-400 uppercase py-1">Top: {pdfMargins.top}{pdfUnit}</div>
              <div className="absolute left-0 top-1/2 -rotate-90 -translate-x-full text-[8px] font-black text-blue-400 uppercase py-1">Left: {pdfMargins.left}{pdfUnit}</div>
            </div>
          )}

          <div>
            <div className="flex justify-center items-start mb-6 gap-12 pt-4">
              <div className="w-24 h-20 flex-shrink-0 flex items-center justify-center">
                {customLogoLeft ? (
                  <img src={customLogoLeft} className="max-h-full max-w-full object-contain" alt="Brasão" />
                ) : (
                  <div className="w-16 h-16 rounded-full border border-slate-300 flex items-center justify-center bg-slate-50 shadow-inner">
                    <Shield size={24} className="text-slate-300" />
                  </div>
                )}
              </div>

              <div className="text-center">
                <h1 className="text-[18px] font-black uppercase text-slate-900 leading-tight tracking-tight">
                  PREFEITURA MUNICIPAL DE ARAPONGAS
                </h1>
                <h2 className="text-[14px] font-black uppercase text-slate-900 mt-1">
                  SECRETARIA MUNICIPAL DE SEGURANÇA PÚBLICA E TRÂNSITO
                </h2>
                <h3 className="text-[12px] font-bold uppercase text-brand-600 mt-1 tracking-[0.1em]">
                  CENTRO DE MONITORAMENTO MUNICIPAL
                </h3>
                <div className="flex items-center justify-between gap-4 bg-slate-50/80 px-4 py-2 rounded-xl mt-4 border border-slate-100">
                  <div className="text-left">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-800 leading-none">Relatório Geral</h4>
                  </div>
                  <div className="flex-1 text-center">
                    {(dateStart || dateEnd) && (
                      <div className="text-[9px] uppercase font-bold text-slate-500 flex items-center justify-center gap-1.5">
                        <Clock size={10} strokeWidth={3} /> {dateStart ? formatDateBR(dateStart) : 'Início'} até {dateEnd ? formatDateBR(dateEnd) : 'Hoje'}
                      </div>
                    )}
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-[9px] font-black text-slate-900 uppercase tracking-tighter">PÁGINA {pageIndex + 1} DE {chunksLength}</p>
                  </div>
                </div>
              </div>

              <div className="w-24 h-20 flex-shrink-0 flex items-center justify-center">
                {customLogo ? (
                  <img src={customLogo} className="max-h-full max-w-full object-contain" alt="Logo" />
                ) : (
                  <div className="w-16 h-16 rounded-full border border-slate-300 flex items-center justify-center bg-slate-50 shadow-inner">
                    <Shield size={24} className="text-slate-300" />
                  </div>
                )}
              </div>
            </div>

            <table className="w-full border-collapse border-b-2 border-slate-900">
              <thead style={{ display: 'table-header-group' }}>
                <tr className="bg-slate-900 text-white">
                  {(() => {
                    const isPortrait = pdfOrientation === 'portrait';
                    return (
                      <>
                        <th className={`p-3 text-[10px] font-black uppercase text-left border-r border-slate-700`} style={{ width: isPortrait ? '50px' : '80px' }}>R.A</th>
                        <th className={`p-3 text-[10px] font-black uppercase text-left border-r border-slate-700`} style={{ width: isPortrait ? '100px' : '150px' }}>Próprio</th>
                        <th className={`p-3 text-[10px] font-black uppercase text-center border-r border-slate-700`} style={{ width: isPortrait ? '60px' : '90px' }}>Data</th>
                        <th className={`p-3 text-[10px] font-black uppercase text-center border-r border-slate-700`} style={{ width: isPortrait ? '45px' : '70px' }}>Início</th>
                        <th className={`p-3 text-[10px] font-black uppercase text-center border-r border-slate-700`} style={{ width: isPortrait ? '45px' : '70px' }}>Fim</th>
                        <th className={`p-3 text-[10px] font-black uppercase text-center border-r border-slate-700`} style={{ width: isPortrait ? '80px' : '130px' }}>Natureza</th>
                        <th className="p-3 text-[10px] font-black uppercase text-left">Relato</th>
                      </>
                    );
                  })()}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {chunk.map(i => {
                  const building = buildings.find(b => b.id === i.buildingId);
                  return (
                    <tr key={i.id} style={{ pageBreakInside: 'avoid' }} className="hover:bg-slate-50 transition-colors break-inside-avoid">
                      {/* Calculated styling for columns */}
                      {(() => {
                        const isPortrait = pdfOrientation === 'portrait';
                        return (
                          <>
                            <td className={`p-2 text-[9px] font-black border-x border-slate-200 ${i.status === 'CANCELLED' ? 'text-red-600 line-through' : 'text-slate-900'}`} style={{ width: isPortrait ? '50px' : '80px' }}>{i.raCode}</td>
                            <td className={`p-2 text-[9px] font-bold uppercase border-r border-slate-200 ${i.status === 'CANCELLED' ? 'text-red-600 line-through' : 'text-slate-700'}`} style={{ width: isPortrait ? '100px' : '150px' }}>{building?.name || '---'}</td>
                            <td className={`p-2 text-[9px] font-bold text-center border-r border-slate-200 ${i.status === 'CANCELLED' ? 'text-red-600 line-through' : ''}`} style={{ width: isPortrait ? '60px' : '90px' }}>{formatDateBR(i.date)}</td>
                            <td className={`p-2 text-[9px] font-bold text-center border-r border-slate-200 ${i.status === 'CANCELLED' ? 'text-red-600 line-through' : ''}`} style={{ width: isPortrait ? '45px' : '70px' }}>{i.startTime}</td>
                            <td className={`p-2 text-[9px] font-bold text-center border-r border-slate-200 ${i.status === 'CANCELLED' ? 'text-red-600 line-through' : ''}`} style={{ width: isPortrait ? '45px' : '70px' }}>{i.endTime || '--:--'}</td>
                            <td className={`p-2 text-[8px] font-black uppercase text-center border-r border-slate-200 ${i.status === 'CANCELLED' ? 'text-red-600 line-through' : 'text-slate-900'}`} style={{ width: isPortrait ? '80px' : '130px' }}>{i.alterationType}</td>
                            <td className={`p-2 text-[8px] leading-tight align-top whitespace-pre-wrap break-words border-r border-slate-200 ${i.status === 'CANCELLED' ? 'text-red-600 font-bold' : 'font-medium'}`}>
                              {i.status === 'CANCELLED' && <span className="text-red-700 font-black mr-1">[CANCELADO]</span>}
                              {i.status !== 'CANCELLED' && i.description}
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!hideFooter && (
            <>
              <div className="border-t border-slate-100 mt-1" />

              {/* RODAPÉ E ASSINATURAS - ESTILO INCIDENTDETAIL */}
              <div className="mt-auto pt-6 border-t-2 border-slate-100 pb-2">
                <div className="grid grid-cols-2 gap-8 items-end">
                  {/* Assinatura Operador */}
                  <div className="flex flex-col items-start justify-end h-full">
                    <div className="text-[10px] font-black uppercase text-slate-900 leading-tight mb-2">
                      {currentUser?.name || 'OPERADOR NÃO IDENTIFICADO'}
                    </div>
                    <div className="text-[7px] font-black uppercase text-slate-500 tracking-widest mb-1">
                      {jobTitles.find(t => t.id === currentUser?.jobTitleId)?.name || currentUser?.role || 'OPERADOR'}
                    </div>

                    <div className="space-y-1 w-full pt-1">
                      <div className="text-[6px] font-bold uppercase text-slate-400">RELATÓRIO GERADO POR:</div>
                      <div className="text-[6.5px] font-black uppercase text-slate-700">
                        {currentUser?.name} <span className="text-slate-400 font-medium">EM</span> {exportDate.split(' às ')[0]} <span className="text-slate-400 font-medium">ÀS</span> {exportDate.split(' às ')[1]}
                      </div>
                      <div className="text-[5.5px] font-mono text-slate-400 uppercase">IP: {exportIP}</div>
                    </div>
                  </div>

                  {/* Validação e Hash de Segurança */}
                  <div className="flex flex-col items-end justify-end h-full text-right">
                    <div className="w-full flex flex-col items-end">
                      <div className="text-[7px] font-bold uppercase text-slate-500 flex items-center gap-1 mb-1 justify-end">
                        <ShieldCheck size={10} className="text-blue-600" /> CONFERÊNCIA DIGITAL DE INTEGRIDADE
                      </div>
                      <div className="text-[5.5px] font-mono font-bold text-slate-400 uppercase break-all max-w-[200px] leading-[1.1]">
                        HASH: {exportHash}
                      </div>
                      <div className="text-[5px] font-mono text-slate-300 uppercase mt-1">
                        REGISTRO OFICIAL DE AUDITORIA - {new Date().getFullYear()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      );
    };

  const calculateChunks = useCallback(() => {
    if (!measureRef.current) return;

    // --- NEW PAGINATION LOGIC: REAL-TIME DOM MEASUREMENT ---
    const PAGE_HEIGHT_MM = pdfOrientation === 'landscape'
      ? (pdfPaperSize === 'A4' ? 210 : 216)
      : (pdfPaperSize === 'A4' ? 297 : 279);

    // Ajuste dos parâmetros de altura para aproveitar melhor o espaço sem ultrapassar as margens
    const HEADER_HEIGHT_EST = 55; // Aumentado para incluir cabeçalho da tabela e info do relatório
    const FOOTER_HEIGHT_EST = embeddedPreview ? 0 : 15;
    const SAFE_MARGIN_MM = 5; // Margem de segurança mais conservadora
    const AVAILABLE_HEIGHT_MM = PAGE_HEIGHT_MM - pdfMargins.top - pdfMargins.bottom - HEADER_HEIGHT_EST - FOOTER_HEIGHT_EST - SAFE_MARGIN_MM;

    // Convert mm to pixels for measurement (approx 3.78px per mm)
    const MM_TO_PX = 3.78;
    const availableHeightPx = AVAILABLE_HEIGHT_MM * MM_TO_PX;

    const rows = Array.from(measureRef.current.querySelectorAll('tr.incident-row'));
    const chunkedIncidents: Incident[][] = [];
    let currentChunk: Incident[] = [];
    let currentHeight = 0;

    rows.forEach((row, index) => {
      const rowHeight = (row as HTMLElement).offsetHeight;
      const incident = displayIncidents[index];

      if (currentHeight + rowHeight > availableHeightPx && currentChunk.length > 0) {
        chunkedIncidents.push(currentChunk);
        currentChunk = [incident];
        currentHeight = rowHeight;
      } else {
        currentChunk.push(incident);
        currentHeight += rowHeight;
      }
    });

    if (currentChunk.length > 0) chunkedIncidents.push(currentChunk);

    setMeasuredChunks(chunkedIncidents);
    return chunkedIncidents;
  }, [pdfOrientation, pdfPaperSize, pdfMargins, embeddedPreview, displayIncidents, measureRef]);

  // Efeito para recalcular paginação automaticamente no modo embedded
  useEffect(() => {
    if (embeddedPreview && displayIncidents.length > 0) {
      const timer = setTimeout(() => {
        calculateChunks();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [embeddedPreview, displayIncidents, calculateChunks]);

  const renderReportPages = () => {
    let chunks: Incident[][] = measuredChunks || (window as any)._measuredChunks;

    if (!chunks || chunks.length === 0) {
      // Fallback to basic chunking for initial render/preview
      chunks = [[]];
      let current: Incident[] = [];
      displayIncidents.forEach((item, idx) => {
        current.push(item);
        // Simple heuristic: roughly 12 items per page
        if (current.length >= 12 || idx === displayIncidents.length - 1) {
          chunks.push(current);
          current = [];
        }
      });
      if (chunks.length > 1 && chunks[0].length === 0) chunks.shift();
    }

    return chunks.map((chunk, pageIndex) => (
      <ReportView
        key={`page-${pageIndex}`}
        chunk={chunk}
        pageIndex={pageIndex}
        chunksLength={chunks.length}
        pdfOrientation={pdfOrientation}
        pdfPaperSize={pdfPaperSize}
        pdfMargins={pdfMargins}
        pdfUnit={pdfUnit}
        showMarginGuides={showMarginGuides}
        customLogo={customLogo}
        customLogoLeft={customLogoLeft}
        jobTitles={jobTitles}
        exportDate={exportDate}
        exportIP={exportIP}
        exportHash={exportHash}
        buildings={buildings}
        currentUser={currentUser}
        hideFooter={embeddedPreview}
      />
    ));
  };

  const runExportWithIP = (ip: string) => {
    // --- PREPARAÇÃO DOS DADOS ---
    const now = new Date();
    // Ajuste fuso horário Brasil (GMT-3)
    const brazilOffset = -3 * 60;
    const localTime = new Date(now.getTime() + (brazilOffset + now.getTimezoneOffset()) * 60000);
    const isoDate = localTime.toISOString();
    const formattedDate = formatDateBR(localTime.toISOString().split('T')[0]) + ' às ' + localTime.toISOString().split('T')[1].substring(0, 5);

    // --- ASSINATURA ELETRÔNICA DE SEGURANÇA (HASHING) ---
    // Snapshot dos dados do relatório para integridade
    const dataSnapshot = `REPORT_EXPORT|USER:${currentUser?.id}|DATE:${isoDate}|IP:${ip}|COUNT:${displayIncidents.length}`;
    const hash = CryptoJS.SHA256(dataSnapshot).toString();

    setExportIP(ip);
    setExportDate(formattedDate);
    setExportHash(hash);

    setExportHash(hash);

    // Pequeno delay para garantir que o React renderizou o IP/Data no DOM
    setTimeout(async () => {
      if (!measureRef.current || !printRef.current) return;

      const chunkedIncidents = calculateChunks();
      if (!chunkedIncidents) return;

      (window as any)._measuredChunks = chunkedIncidents;
      // Trigger a re-render to use measured chunks
      setIsExporting(true);

      setTimeout(() => {
        const element = printRef.current;
        const pageWidthMm = pdfOrientation === 'landscape'
          ? (pdfPaperSize === 'A4' ? 297 : pdfPaperSize === 'LETTER' ? 279 : 356)
          : (pdfPaperSize === 'A4' ? 210 : 216);
        const targetWidthPx = Math.round(pageWidthMm * 3.78);

        const opt = {
          margin: [0, 0, 0, 0],
          filename: `Relatorio_Atendimentos_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: autoFit ? 3 : (pdfScale / 100) * 3,
            useCORS: true,
            letterRendering: true,
            scrollY: 0,
            windowWidth: targetWidthPx,
            onclone: (doc: Document) => {
              const el = doc.getElementById('history-export-container');
              if (el) {
                el.style.scale = '1';
                el.style.width = 'max-content';
                el.style.alignItems = 'flex-start'; // Garante que comece no (0,0) e não corte a esquerda
                el.style.gap = '0px';
                el.style.padding = '0';
                const pages = el.querySelectorAll('.report-page');
                pages.forEach((p: any) => {
                  p.style.boxShadow = 'none';
                  p.style.border = 'none';
                  const guides = p.querySelectorAll('.margin-guide');
                  guides.forEach((g: any) => g.style.display = 'none');
                });
              }
            }
          },
          jsPDF: {
            unit: pdfUnit,
            format: pdfPaperSize.toLowerCase(),
            orientation: pdfOrientation
          },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        html2pdf().set(opt).from(element).save().then(() => {
          setIsExporting(false);
          (window as any)._measuredChunks = null;
        });
      }, 150);
    }, 100);
  };

  // Export PDF function
  const handleExportPDF = () => {
    // If preview is not open, open it first
    if (!showExportPreview && !embeddedPreview) {
      setShowExportPreview(true);
      return;
    }

    // Actual export logic
    if (!printRef.current || typeof html2pdf === 'undefined') return;
    setIsExporting(true);

    const ip = '---'; // We can fetch IP asynchronously but for simplicity or keeping existing flow
    fetchClientIP().then(fetchedIp => { runExportWithIP(fetchedIp); });
  };

  const showEmbeddedPreview = embeddedPreview && showResults && displayIncidents.length > 0;

  return (
    <div className="space-y-8">
      {onBack && (
        <div className="flex px-1">
          <button type="button" onClick={onBack} className="btn-back">
            <ArrowLeft size={18} />
            <span>VOLTAR</span>
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
        {/* Header Logic remains same */}
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl shadow-sm border ${filterStatus === 'PENDING' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-brand-50 border-brand-100 text-brand-600'}`}>
            <FileText size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
              {filterStatus === 'PENDING' ? 'Validação de Registros' : (requireFilter ? 'Relatórios de Atendimento' : 'Histórico de Atendimentos')}
            </h2>
            <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Gerencie e visualize os registros de serviço do sistema
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 sm:flex-shrink-0">
          {!requireFilter && (
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
          {canExport && filterStatus === 'COMPLETED' && requireFilter && !embeddedPreview && (
            <div className="flex gap-1">
              <button
                onClick={() => setShowExportPreview(true)}
                disabled={isExporting}
                className="flex-1 sm:flex-none px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 dark:from-slate-700 dark:to-slate-800 dark:hover:from-slate-600 dark:hover:to-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all duration-200 disabled:opacity-50"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Exportar Relatório</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          )}
          {showEmbeddedPreview && (
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex-1 sm:flex-none px-4 sm:px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all duration-200 disabled:opacity-50"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {(showFilters || requireFilter) && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid gap-3">
        {requireFilter && !showResults ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <Filter size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest text-center">Selecione os filtros acima para gerar o relatório</p>
          </div>
        ) : showEmbeddedPreview ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[700px]">
            {/* Sidebar Controls - Embedded */}
            <div className="w-full md:w-64 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-6 overflow-y-auto">
              <section className="space-y-4">
                <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <Square size={14} className="text-brand-500" /> Margem Manual ({pdfUnit})
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase pl-1">Topo</label>
                    <input
                      type="number"
                      value={pdfMargins.top}
                      onChange={e => setPdfMargins({ ...pdfMargins, top: Number(e.target.value) })}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase pl-1">Fundo</label>
                    <input
                      type="number"
                      value={pdfMargins.bottom}
                      onChange={e => setPdfMargins({ ...pdfMargins, bottom: Number(e.target.value) })}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase pl-1">Esq.</label>
                    <input
                      type="number"
                      value={pdfMargins.left}
                      onChange={e => setPdfMargins({ ...pdfMargins, left: Number(e.target.value) })}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase pl-1">Dir.</label>
                    <input
                      type="number"
                      value={pdfMargins.right}
                      onChange={e => setPdfMargins({ ...pdfMargins, right: Number(e.target.value) })}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setPdfOrientation('portrait')}
                    className={`flex-1 py-2 text-[10px] font-black border rounded-lg transition-all ${pdfOrientation === 'portrait' ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                  >
                    Retrato
                  </button>
                  <button
                    onClick={() => setPdfOrientation('landscape')}
                    className={`flex-1 py-2 text-[10px] font-black border rounded-lg transition-all ${pdfOrientation === 'landscape' ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                  >
                    Paisagem
                  </button>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPdfScale(Math.max(50, pdfScale - 10))}
                    className="p-1.5 bg-white border border-slate-200 rounded text-slate-400 hover:text-brand-600"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="flex-1 text-center text-xs font-black">{pdfScale}%</span>
                  <button
                    onClick={() => setPdfScale(Math.min(150, pdfScale + 10))}
                    className="p-1.5 bg-white border border-slate-200 rounded text-slate-400 hover:text-brand-600"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </section>

              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                {isExporting ? 'Processando...' : 'Imprimir PDF'}
              </button>
            </div>

            {/* Preview Canvas - Embedded */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 md:p-8 overflow-y-auto no-scrollbar scroll-smooth flex flex-col items-center min-h-[600px]">
              <div className="mb-8 flex items-center gap-3 px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-full border border-slate-200 dark:border-slate-800 shadow-sm opacity-60">
                <Maximize size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Previsualização fiel à impressão</span>
              </div>
              <div
                ref={printRef}
                id="history-export-container"
                className="flex flex-col items-center gap-8 bg-transparent transform-gpu origin-top"
                style={{ scale: pdfScale / 100 }}
              >
                {renderReportPages()}
              </div>
            </div>
          </div>
        ) : (
          displayIncidents.map(incident => {
            const building = buildings.find(b => b.id === incident.buildingId);
            const isCancelled = incident.status === 'CANCELLED';
            const isPending = incident.status === 'PENDING';
            const isApproved = incident.status === 'APPROVED';
            let borderClass = 'border-l-4 border-slate-300';
            if (isApproved) borderClass = 'border-l-4 border-emerald-500';
            else if (isCancelled) borderClass = 'border-l-4 border-red-500';
            else if (isPending) borderClass = 'border-l-4 border-amber-500';
            return (
              <div key={incident.id} onClick={() => onView(incident)} className={`bg-white dark:bg-slate-900 p-4 rounded-xl ${borderClass} shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer group relative overflow-hidden ${isCancelled ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                <div className="flex-1 w-full min-w-0 z-10">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">RA {incident.raCode}</span>
                    {incident.isLocal && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1"><WifiOff size={10} /> Local</span>}
                    {isCancelled && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1"><Ban size={10} /> Cancelado</span>}
                    {isApproved && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1"><CheckCircle size={10} /> Validado</span>}
                    {isPending && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1"><Clock size={10} /> Pendente</span>}
                    <span className="text-[10px] font-bold text-slate-400 ml-auto whitespace-nowrap">{formatDateBR(incident.date)} • {incident.startTime}</span>
                  </div>
                  <h3 className={`font-black text-sm uppercase mb-1 break-words group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors ${isCancelled ? 'text-slate-500 line-through decoration-red-500 decoration-2' : 'text-slate-800 dark:text-slate-100'}`}>{building?.name || 'Local Desconhecido'}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium break-words whitespace-normal leading-relaxed">{incident.description}</p>
                </div>
                <div className="w-full md:w-auto mt-2 md:mt-0 flex-shrink-0 z-20" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    {isPending && canApprove && (
                      <button
                        onClick={() => onApprove?.(incident.id)}
                        title="Validar Registro"
                        className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-90 transition-all flex items-center justify-center"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    {canEdit && !isCancelled && !isApproved && (
                      <button
                        onClick={() => onEdit(incident)}
                        title="Editar Registro"
                        className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm active:scale-90 flex items-center justify-center"
                      >
                        <Pencil size={18} />
                      </button>
                    )}
                    {canDelete && !isCancelled && (
                      <button
                        onClick={() => onDelete(incident.id)}
                        title="Excluir/Cancelar Registro"
                        className="p-2.5 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shadow-sm active:scale-90 flex items-center justify-center"
                      >
                        <Ban size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!requireFilter && !showEmbeddedPreview && hasMore && (
        <button
          onClick={() => onLoadMore?.()}
          disabled={isLoadingMore}
          className="w-full py-4 mt-4 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          {isLoadingMore ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={16} />}
          {isLoadingMore ? 'BUSCANDO REGISTROS...' : 'CARREGAR MAIS REGISTROS'}
        </button>
      )}

      {/* Export Preview Modal (Remaining for fallback or other views) */}
      {showExportPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[98vw] h-[95vh] rounded-3xl flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600 dark:text-brand-400 shadow-sm border border-brand-100 dark:border-brand-900/30">
                  <Printer size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Visualizar Relatório</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Ajuste o layout e as margens para impressão perfeita</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden md:block mx-2"></div>
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-brand-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                >
                  {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} strokeWidth={2.5} />}
                  {isExporting ? 'Processando...' : 'Exportar PDF'}
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
            <div className="flex-1 flex overflow-hidden">
              <div className="w-85 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-8 overflow-y-auto space-y-8 no-scrollbar">
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
                  <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl">
                    <button onClick={() => applyPreset('normal')} className={`px-2 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${pdfMargins.top === 15 ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:bg-white/50'}`}>Normal</button>
                    <button onClick={() => applyPreset('narrow')} className={`px-2 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${pdfMargins.top === 5 ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:bg-white/50'}`}>Estreita</button>
                    <button onClick={() => applyPreset('none')} className={`px-2 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${pdfMargins.top === 0 ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:bg-white/50'}`}>Zero</button>
                  </div>
                </section>

                <section className="space-y-6">
                  <h4 className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <Layers size={14} className="text-brand-500" /> Configuração de Página
                  </h4>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pl-1 mb-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escala de Conteúdo</label>
                      </div>
                      <div className="flex items-center gap-3 h-[42px]">
                        <button onClick={() => setAutoFit(!autoFit)} className={`flex-1 h-full px-4 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${autoFit ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                          {autoFit ? <CheckCircle size={14} className="text-brand-600" /> : <Maximize2 size={14} />}
                          Auto-Fit
                        </button>
                        {!autoFit && <div className="relative w-24 h-full"><input type="number" value={pdfScale} onChange={(e) => setPdfScale(Number(e.target.value))} className="w-full h-full px-3 text-center text-xs font-black border border-slate-200 rounded-xl outline-none focus:border-brand-500 bg-white" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">%</span></div>}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex-1 bg-[#F3F4F6] dark:bg-slate-950 p-12 overflow-y-auto no-scrollbar scroll-smooth flex flex-col items-center">
                {(() => {
                  let chunks: Incident[][] = (window as any)._measuredChunks;

                  if (!chunks || chunks.length === 0) {
                    chunks = [[]];
                    let current: Incident[] = [];
                    displayIncidents.forEach((item, idx) => {
                      current.push(item);
                      if (current.length >= 10 || idx === displayIncidents.length - 1) {
                        chunks.push(current);
                        current = [];
                      }
                    });
                    if (chunks.length > 1 && chunks[0].length === 0) chunks.shift();
                  }

                  return chunks.map((chunk, pageIndex) => (
                    <ReportView
                      key={`modal-page-${pageIndex}`}
                      chunk={chunk}
                      pageIndex={pageIndex}
                      chunksLength={chunks.length}
                      pdfOrientation={pdfOrientation}
                      pdfPaperSize={pdfPaperSize}
                      pdfMargins={pdfMargins}
                      pdfUnit={pdfUnit}
                      showMarginGuides={showMarginGuides}
                      customLogo={customLogo}
                      customLogoLeft={customLogoLeft}
                      jobTitles={jobTitles}
                      exportDate={exportDate}
                      exportIP={exportIP}
                      exportHash={exportHash}
                      buildings={buildings}
                      currentUser={currentUser}
                      hideFooter={embeddedPreview}
                    />
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN MEASUREMENT CONTAINER */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="fixed -left-[5000px] top-0 pointer-events-none bg-white overflow-hidden"
        style={{
          width: pdfOrientation === 'landscape'
            ? (pdfPaperSize === 'A4' ? '297mm' : '356mm')
            : (pdfPaperSize === 'A4' ? '210mm' : '216mm'),
          paddingLeft: `${pdfMargins.left}${pdfUnit}`,
          paddingRight: `${pdfMargins.right}${pdfUnit}`
        }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {displayIncidents.map(i => {
              const building = buildings.find(b => b.id === i.buildingId);
              const isPortrait = pdfOrientation === 'portrait';
              return (
                <tr key={i.id} className="incident-row">
                  <td className={`p-2 text-[9px] ${i.status === 'CANCELLED' ? 'text-red-600 line-through' : ''}`} style={{ width: isPortrait ? '50px' : '80px' }}>{i.raCode}</td>
                  <td className={`p-2 text-[9px] ${i.status === 'CANCELLED' ? 'text-red-600 line-through' : ''}`} style={{ width: isPortrait ? '100px' : '150px' }}>{building?.name}</td>
                  <td className={`p-2 text-[9px] ${i.status === 'CANCELLED' ? 'text-red-600 line-through' : ''}`} style={{ width: isPortrait ? '80px' : '130px' }}>{i.alterationType}</td>
                  <td className="p-2 text-[8px] whitespace-pre-wrap break-words">
                    {i.status === 'CANCELLED' && <span>[CANCELADO] </span>}
                    {i.status !== 'CANCELLED' && i.description}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BuildingList: React.FC<{ buildings: Building[], sectors: Sector[], onEdit: (b: Building) => void, onDelete: (id: string) => void, onAdd: () => void, onRefresh: () => void, canEdit: boolean, canDelete: boolean, onBack?: () => void }> = ({ buildings, onEdit, onAdd, canEdit, onBack }) => {
  const [search, setSearch] = useState('');
  const filtered = buildings.filter(b => normalizeString(b.name).includes(normalizeString(search)) || normalizeString(b.buildingNumber).includes(normalizeString(search)));
  return (
    <div className="space-y-8">
      {onBack && (
        <div className="flex px-1">
          <button type="button" onClick={onBack} className="btn-back">
            <ArrowLeft size={18} />
            <span>VOLTAR</span>
          </button>
        </div>
      )}
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
            <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
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
              className="w-full pl-12 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            )}
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

const UserList: React.FC<{ users: User[], jobTitles?: JobTitle[], onEdit: (u: User) => void, onDelete: (id: string) => void, onAdd: () => void, onRefresh: () => void, canEdit: boolean, canDelete: boolean, onBack?: () => void }> = ({ users, onEdit, onAdd, canEdit, jobTitles = [], onBack }) => {
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
    <div className="space-y-8">
      {onBack && (
        <div className="flex px-1">
          <button type="button" onClick={onBack} className="btn-back">
            <ArrowLeft size={18} />
            <span>VOLTAR</span>
          </button>
        </div>
      )}
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
            <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
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
              className="w-full pl-12 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            )}
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
                  className={`transition-all duration-200 group ${canEdit ? 'cursor-pointer' : ''}
                    ${u.status === 'PENDING'
                      ? 'bg-amber-50/70 dark:bg-amber-900/20 border-l-[4px] border-amber-500 shadow-sm'
                      : 'hover:bg-slate-50 dark:hover:bg-brand-900/10 border-l-[4px] border-transparent'}
                  `}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-brand-700 dark:text-brand-400 font-black text-sm uppercase border border-slate-200 dark:border-slate-700 group-hover:bg-brand-600 group-hover:text-white group-hover:border-brand-500 transition-all overflow-hidden relative shadow-inner">
                        {u.photoUrl ? (
                          <img src={u.photoUrl} alt={u.name} className="h-full w-full object-cover" />
                        ) : (
                          u.name.charAt(0)
                        )}
                        {u.status === 'PENDING' && (
                          <div className="absolute inset-0 bg-amber-500/10 animate-pulse" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase leading-none group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">{u.name}</p>
                          {u.status === 'PENDING' && (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded shadow-sm uppercase tracking-tighter animate-pulse flex items-center gap-1">
                              <Bell size={8} /> Novo
                            </span>
                          )}
                        </div>
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

const JobTitleList: React.FC<{ jobTitles: JobTitle[], onEdit: (j: JobTitle) => void, onDelete: (id: string) => void, onAdd: () => void, canEdit: boolean, canDelete: boolean, onBack?: () => void }> = ({ jobTitles, onEdit, onDelete, onAdd, canEdit, canDelete, onBack }) => {
  const [search, setSearch] = useState('');
  const filtered = jobTitles.filter(j => normalizeString(j.name).includes(normalizeString(search)));

  return (
    <div className="space-y-8">
      {onBack && (
        <div className="flex px-1">
          <button type="button" onClick={onBack} className="btn-back">
            <ArrowLeft size={18} />
            <span>VOLTAR</span>
          </button>
        </div>
      )}
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
            <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
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
              className="w-full pl-12 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            )}
          </div>
          {canEdit && (
            <button onClick={onAdd} className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 transition-all duration-200">
              <Plus size={16} strokeWidth={3} />
              <span className="hidden sm:inline">Novo Cargo</span>
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {filtered.map(j => (
          <div key={j.id} onClick={() => canEdit && onEdit(j)} className={`bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center ${canEdit ? 'cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-900/10' : ''} transition-colors group`}>
            <span className={`text-sm font-bold text-slate-800 dark:text-slate-100 uppercase ${canEdit ? 'group-hover:text-brand-600 dark:group-hover:text-brand-400' : ''}`}>{j.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SectorList: React.FC<{ sectors: Sector[], onEdit: (s: Sector) => void, onDelete: (id: string) => void, onAdd: () => void, canEdit: boolean, canDelete: boolean, onBack?: () => void }> = ({ sectors, onEdit, onDelete, onAdd, canEdit, canDelete, onBack }) => {
  const [search, setSearch] = useState('');
  const filtered = sectors.filter(s => normalizeString(s.name).includes(normalizeString(search)));

  return (
    <div className="space-y-8">
      {onBack && (
        <div className="flex px-1">
          <button type="button" onClick={onBack} className="btn-back">
            <ArrowLeft size={18} />
            <span>VOLTAR</span>
          </button>
        </div>
      )}
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
            <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
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
              className="w-full pl-12 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            )}
          </div>
          {canEdit && (
            <button onClick={onAdd} className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 transition-all duration-200">
              <Plus size={16} strokeWidth={3} />
              <span className="hidden sm:inline">Novo Setor</span>
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {filtered.map(s => (
          <div key={s.id} onClick={() => canEdit && onEdit(s)} className={`bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center ${canEdit ? 'cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-900/10' : ''} transition-colors group`}>
            <span className={`text-sm font-bold text-slate-800 dark:text-slate-100 uppercase ${canEdit ? 'group-hover:text-brand-600 dark:group-hover:text-brand-400' : ''}`}>{s.name}</span>
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
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [registrationsMenuOpen, setRegistrationsMenuOpen] = useState(false);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false);
  const [pendentesMenuOpen, setPendentesMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarDark, setSidebarDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_dark');
      return saved ? JSON.parse(saved) : true; // Default to dark sidebar
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_dark', JSON.stringify(sidebarDark));
  }, [sidebarDark]);

  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pendingSubTab, setPendingSubTab] = useState<'INCIDENTS' | 'LOANS'>('INCIDENTS');
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [viewHistory, setViewHistory] = useState<ViewState[]>([]);
  const [viewRefreshCounter, setViewRefreshCounter] = useState(0);

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
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [escalaReminders, setEscalaReminders] = useState<EscalaReminder[]>([]);
  const [triggeredReminders, setTriggeredReminders] = useState<any[]>([]);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [announcementsRevision, setAnnouncementsRevision] = useState(0);

  // Privacy Terms State
  const [pendingPrivacyUser, setPendingPrivacyUser] = useState<User | null>(null);
  const [pendingPrivacyIP, setPendingPrivacyIP] = useState<string>('');
  const [lastAnnouncementUpdate, setLastAnnouncementUpdate] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loanPage, setLoanPage] = useState(0);
  const [hasMoreLoans, setHasMoreLoans] = useState(true);
  const [loadingMoreLoans, setLoadingMoreLoans] = useState(false);

  const fetchLockRef = useRef(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [reminderManagingEscala, setReminderManagingEscala] = useState<Escala | null>(null);
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
  const [editingEscala, setEditingEscala] = useState<Escala | null>(null);

  // Cancellation Modal State
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; incidentId: string; reason: string }>({ isOpen: false, incidentId: '', reason: '' });

  const [preSelectedBuildingId, setPreSelectedBuildingId] = useState<string | undefined>(undefined);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'alert' | 'confirm' | 'error'; title: string; message: string; onConfirm?: () => void; }>({ isOpen: false, type: 'alert', title: '', message: '' });
  const [customLogoRight, setCustomLogoRight] = useState<string | null>(null);
  const [customLogoLeft, setCustomLogoLeft] = useState<string | null>(null);

  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0.000';
  const gitHash = typeof __GIT_HASH__ !== 'undefined' ? __GIT_HASH__ : 'dev';
  const buildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '---';
  const APP_VERSION = `v${appVersion}`;
  const DISPLAY_VERSION = appVersion;

  // --- FETCH FUNCTIONS INSIDE APP COMPONENT ---

  const fetchIncidents = useCallback(async (isLoadMore = false, dateFilters?: { dateStart?: string, timeStart?: string, dateEnd?: string, timeEnd?: string }) => {
    // Determine the target content range based on load type
    // If loading more, we want the NEXT page (page + 1)
    // If refreshing (isLoadMore = false), we reset to page 0
    const targetPage = isLoadMore ? page + 1 : 0;

    console.log(`[FetchIncidents] Start. isLoadMore=${isLoadMore}, targetPage=${targetPage}, currentStorePage=${page}`);

    if (fetchLockRef.current) {
      console.warn(`[FetchIncidents] Blocked by lock.`);
      return;
    }
    fetchLockRef.current = true;

    if (isLoadMore) setLoadingMore(true);
    else {
      // Important: If not loading more, we are resetting.
      // We do NOT setPage(0) here yet because state updates are async and might confuse subsequent logic if we relied on 'page' state.
      // Instead we use 'targetPage' (which is 0) for all logic.
      setHasMore(true);
    }

    const PAGE_SIZE = 10;
    const from = targetPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const hasFilters = !!(dateFilters && (dateFilters.dateStart || dateFilters.dateEnd));

    try {
      let finalData: Incident[] = [];
      const listColumns = 'id, ra_code, building_id, user_id, operator_name, date, start_time, end_time, alteration_type, description, status, timestamp, is_edited, last_edited_at, edited_by, created_ip, updated_ip, approved_ip, signature_hash, approved_by, approved_at, created_at';

      if (!isLoadMore) {
        // ... (Logic for initial load / refresh)
        let pendingQuery = supabase.from('incidents').select(listColumns).eq('status', 'PENDING');
        let historyQuery = supabase.from('incidents').select(listColumns).neq('status', 'PENDING').order('created_at', { ascending: false });

        if (hasFilters) {
          if (dateFilters?.dateStart) {
            pendingQuery = pendingQuery.gte('date', dateFilters.dateStart);
            historyQuery = historyQuery.gte('date', dateFilters.dateStart);
          }
          if (dateFilters?.dateEnd) {
            pendingQuery = pendingQuery.lte('date', dateFilters.dateEnd);
            historyQuery = historyQuery.lte('date', dateFilters.dateEnd);
          }
          // Remove limit if filtering
          historyQuery = historyQuery.limit(1000);
          setHasMore(false);
        } else {
          historyQuery = historyQuery.range(0, PAGE_SIZE - 1);
        }

        const [pendingRes, historyRes] = await Promise.all([pendingQuery, historyQuery]);
        if (pendingRes.error) throw pendingRes.error;
        if (historyRes.error) throw historyRes.error;
        const mappedPending = (pendingRes.data || []).map(mapIncident);
        const mappedHistory = (historyRes.data || []).map(mapIncident);
        finalData = [...mappedPending, ...mappedHistory];
        if (!hasFilters && (historyRes.data?.length || 0) < PAGE_SIZE) setHasMore(false);
        setPage(0); // Restore reset state for fresh loads
      } else {
        const { data, error } = await supabase.from('incidents').select(listColumns).neq('status', 'PENDING').order('created_at', { ascending: false }).range(from, to);
        if (error) throw error;
        finalData = (data || []).map(mapIncident);
        if (finalData.length < PAGE_SIZE) setHasMore(false);
        setPage(targetPage);
      }

      console.log(`[FetchIncidents] Fetched ${finalData.length} records. From ${from} to ${to}. HasMore=${finalData.length >= PAGE_SIZE}`);

      setIncidents(prev => {
        if (isLoadMore) {
          const newRecords = finalData.filter(fd => !prev.some(p => p.id === fd.id));
          console.log(`[FetchIncidents] Appending ${newRecords.length} new records (filtered duplicates).`);
          return [...prev, ...newRecords];
        } else {
          const combined = [...unsyncedIncidents, ...finalData.filter(fd => !unsyncedIncidents.some(ui => ui.id === fd.id))];
          return combined;
        }
      });
    } catch (error: any) { console.error("Erro ao buscar ocorrências:", error); } finally { setLoadingMore(false); fetchLockRef.current = false; }
  }, [unsyncedIncidents, page]);

  const fetchLoans = useCallback(async (isLoadMore = false, dateFilters?: { dateStart?: string, timeStart?: string, dateEnd?: string, timeEnd?: string }) => {
    if (isLoadMore) setLoadingMoreLoans(true); else { setLoanPage(0); setHasMoreLoans(true); }
    const currentPage = isLoadMore ? loanPage + 1 : 0;
    const PAGE_SIZE = 10;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const hasFilters = !!(dateFilters && (dateFilters.dateStart || dateFilters.dateEnd));

    try {
      let finalData: LoanRecord[] = [];
      const loanListColumns = 'id, status, checkout_time, return_time, operator_id, receiver_id, receiver_name, batch_id, asset_type, item_id, description, meta';

      if (!isLoadMore) {
        let activeQuery = supabase.from('loan_records').select(loanListColumns).in('status', ['PENDING', 'ACTIVE']);
        let completedQuery = supabase.from('loan_records').select(loanListColumns).in('status', ['COMPLETED', 'REJECTED']).order('return_time', { ascending: false });

        if (hasFilters) {
          if (dateFilters?.dateStart) {
            const start = `${dateFilters.dateStart}T${dateFilters.timeStart || '00:00'}:00`;
            activeQuery = activeQuery.gte('checkout_time', start);
            completedQuery = completedQuery.gte('checkout_time', start);
          }
          if (dateFilters?.dateEnd) {
            const end = `${dateFilters.dateEnd}T${dateFilters.timeEnd || '23:59'}:59`;
            activeQuery = activeQuery.lte('checkout_time', end);
            completedQuery = completedQuery.lte('checkout_time', end);
          }
          completedQuery = completedQuery.limit(1000);
          setHasMoreLoans(false);
        } else {
          completedQuery = completedQuery.range(0, PAGE_SIZE - 1);
        }

        const [activeRes, completedRes] = await Promise.all([activeQuery, completedQuery]);
        if (activeRes.error) throw activeRes.error;
        if (completedRes.error) throw completedRes.error;
        const mappedActive = (activeRes.data || []).map(mapLoan);
        const mappedCompleted = (completedRes.data || []).map(mapLoan);
        finalData = [...mappedActive, ...mappedCompleted];
        if (!hasFilters && (completedRes.data?.length || 0) < PAGE_SIZE) setHasMoreLoans(false);
      } else {
        const { data, error } = await supabase.from('loan_records').select(loanListColumns).in('status', ['COMPLETED', 'REJECTED']).order('return_time', { ascending: false }).range(from, to);
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
    } catch (error: any) {
      console.error("Erro ao buscar cautelas:", error.message || error);
    } finally {
      setLoadingMoreLoans(false);
    }
  }, [loanPage]);

  const fetchEscalaReminders = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('escala_reminders').select('*');
      if (error) throw error;
      if (data) setEscalaReminders(data);
    } catch (e) {
      console.warn("Falha ao buscar lembretes de escala.");
    }
  }, []);

  const fetchEscalas = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('escalas').select('*').order('name', { ascending: true });
      if (error) throw error;
      if (data) setEscalas(data);
      fetchEscalaReminders();
    } catch (e) {
      console.warn("Falha ao buscar escalas. Tabela pode não existir ainda.");
    }
  }, [fetchEscalaReminders]);

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('system_logs').select('id, userId, userName, action, details, timestamp').order('timestamp', { ascending: false }).limit(100);
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
      supabase.from('buildings').select('id, buildingNumber, name, address, sectorId, hasKey, hasAlarm, latitude, longitude, managerName, managerPhone, managerEmail'),
      supabase.from('app_config').select('value').eq('key', 'system_job_titles').single()
    ]);
    if (sRes.data) setSectors(sRes.data);
    if (bRes.data) setBuildings([...bRes.data].sort((a, b) => a.buildingNumber.localeCompare(b.buildingNumber, undefined, { numeric: true })));
    if (atRes.data) setAlterationTypes(atRes.data);
    if (jtRes.data && jtRes.data.value) setJobTitles(JSON.parse(jtRes.data.value));
    fetchEscalas();
  }, [fetchEscalas]);

  const fetchAssets = useCallback(async () => {
    try {
      const [vRes, veRes, rRes, eRes] = await Promise.all([
        supabase.from('vehicles').select('*').limit(10),
        supabase.from('vests').select('id, number, size'),
        supabase.from('radios').select('id, number, brand, serialNumber'),
        supabase.from('equipments').select('id, name, description, quantity')
      ]);
      if (vRes.data) setVehicles(vRes.data.map(mapVehicle));
      if (veRes.data) setVests(veRes.data);
      if (rRes.data) setRadios(rRes.data);
      if (eRes.data) setEquipments(eRes.data);
    } catch (e) { }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('users')
        .select('id, name, role, user_code, job_title_id, photo_url, signature_url, terms_accepted_at, status, email, cpf, matricula, password_hash')
        .order('name', { ascending: true })
        .limit(200);
      if (error) throw error;
      const mappedUsers = data ? data.map((u: any) => ({
        ...u,
        userCode: u.user_code,
        jobTitleId: u.job_title_id,
        photoUrl: u.photo_url,
        signatureUrl: u.signature_url,
        termsAcceptedAt: u.terms_accepted_at,
        passwordHash: u.password_hash
      })) : [];
      setUsers(mappedUsers as User[]);
      localStorage.setItem('cached_users', JSON.stringify(mappedUsers));
    } catch (error: any) {
      console.warn("Offline: Carregando usuários do cache.");
      const cached = localStorage.getItem('cached_users');
      if (cached) setUsers(JSON.parse(cached));
    } finally { setLoading(false); }
  }, []);

  const createLog = async (action: SystemLog['action'], details: string, logUser?: User | null) => {
    const targetUser = logUser || user;
    if (!targetUser) return;
    try { await supabase.from('system_logs').insert({ userId: targetUser.id, userName: targetUser.name, action, details, timestamp: new Date().toISOString() }); } catch (e) { }
  };

  const handleSaveEscala = async (escala: Escala) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('escalas').upsert(escala);
      if (error) throw error;
      fetchEscalas();
      handleNavigate('ESCALAS');
    } catch (e: any) { showError("Erro", e.message); }
    finally { setSaving(false); }
  };

  const handleDeleteEscala = async (id: string) => {
    showConfirm("Remover Escala", "Confirmar exclusão desta escala?", async () => {
      setSaving(true);
      try {
        const { error } = await supabase.from('escalas').delete().eq('id', id);
        if (error) throw error;
        fetchEscalas();
      } catch (e: any) { showError("Erro", e.message); }
      finally { setSaving(false); }
    });
  };

  const handleSaveEscalaReminder = async (reminder: EscalaReminder) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('escala_reminders').upsert(reminder);
      if (error) throw error;
      fetchEscalaReminders();
    } catch (e: any) { showError("Erro", e.message); }
    finally { setSaving(false); }
  };

  const handleDeleteEscalaReminder = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('escala_reminders').delete().eq('id', id);
      if (error) throw error;
      fetchEscalaReminders();
    } catch (e: any) { showError("Erro", e.message); }
    finally { setSaving(false); }
  };

  const showAlert = (title: string, message: string) => { setModalConfig({ isOpen: true, type: 'alert', title, message }); };
  const showError = (title: string, message: string) => { setModalConfig({ isOpen: true, type: 'error', title, message }); };
  const showConfirm = (title: string, message: string, onConfirm: () => void) => { setModalConfig({ isOpen: true, type: 'confirm', title, message, onConfirm }); };

  const fetchPermissions = useCallback(async () => {
    try {
      const { data } = await supabase.from('app_config')
        .select('key, value')
        .in('key', ['system_permissions', 'user_permission_overrides']);

      const config = data?.reduce((acc: any, item: any) => {
        acc[item.key] = item.value ? JSON.parse(item.value) : null;
        return acc;
      }, {}) || {};

      setPermissions(config['system_permissions'] || DEFAULT_PERMISSIONS);
      setUserOverrides(config['user_permission_overrides'] || {});

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

  const isMenuVisible = (item: MenuItemDef): boolean => {
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true;

    // Se o item é uma seção, ele é visível se algum de seus filhos for visível
    if (item.isSection && item.children) {
      return item.children.some(child => isMenuVisible(child));
    }

    // Se o item tem filhos, e nenhum deles é visível, o item pai também não deve ser
    if (item.children && item.children.length > 0) {
      const anyChildVisible = item.children.some(child => isMenuVisible(child));
      if (!anyChildVisible) return false;
    }

    // Caso não tenha permissões específicas exigidas, é público para logados
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) return true;

    // Visibilidade baseada em se o usuário tem PELO MENOS UMA das permissões exigidas
    return item.requiredPermissions.some(p => can(p));
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

  const loadBackgroundData = useCallback(async () => {
    try {
      await Promise.all([fetchAssets(), fetchLogs(), fetchUsers()]);
    } catch (e) { console.warn("Background data load failed", e); }
  }, [fetchAssets, fetchLogs, fetchUsers]);

  const loadCriticalData = useCallback(async () => {
    setDbError(null);
    try {
      // Carrega dados críticos para o Dashboard primeiro
      await Promise.all([fetchStaticData(), fetchIncidents(), fetchLoans(), fetchAnnouncementsCount()]);
      setInitialDataLoaded(true);

      // Inicia carregamento secundário sem bloquear
      loadBackgroundData();
    }
    catch (error: any) { setDbError(error.message || "Falha na conexão."); setInitialDataLoaded(true); }
  }, [fetchStaticData, fetchIncidents, fetchLoans, fetchAnnouncementsCount, loadBackgroundData]);

  useEffect(() => {
    if (!user) return;

    fetchAnnouncementsCount();

    // Configuração do Realtime para Avisos
    // 1. Escuta novos avisos ou avisos alterados/deletados
    const channel = supabase
      .channel('announcements_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        console.log('Realtime: Mudança nos avisos, atualizando contagem...');
        fetchAnnouncementsCount();
        setAnnouncementsRevision(prev => prev + 1);
      })
      // 2. Escuta quando O PRÓPRIO USUÁRIO marca algo como lido
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_reads', filter: `user_id=eq.${user.id}` }, () => {
        fetchAnnouncementsCount();
        setAnnouncementsRevision(prev => prev + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAnnouncementsCount]);

  useEffect(() => { if (user && !initialDataLoaded) { loadCriticalData(); } }, [user, initialDataLoaded, loadCriticalData]);

  const handleNavigate = (newView: ViewState, skipHistory = false) => {
    if (!skipHistory) setViewHistory(prev => [...prev, view]);
    setView(newView);
    setViewRefreshCounter(prev => prev + 1);
    setSidebarOpen(false);
  };

  const handleBack = () => {
    if (viewHistory.length > 0) {
      const prevView = viewHistory[viewHistory.length - 1];
      setViewHistory(prev => prev.slice(0, -1));
      setView(prevView);
    } else {
      setView('DASHBOARD');
    }
  };

  const handleDeleteSector = (id: string) => {
    if (!can('MANAGE_SECTORS')) return showError('Acesso Negado', 'Sem permissão.');
    if (saving) return;
    showConfirm("Remover Setor", "Deseja realmente remover este setor? Isso pode falhar se houver prédios ou usuários vinculados.", async () => {
      setSaving(true);
      try {
        const { error } = await supabase.from('sectors').delete().eq('id', id);
        if (error) {
          if (error.code === '23503') throw new Error("Não é possível remover este setor pois existem Prédios ou Vínculos dependentes dele.");
          throw error;
        }
        fetchStaticData();
        createLog('DELETE_SECTOR', `Excluiu setor ID: ${id}`);
        handleNavigate('SECTORS');
      } catch (err: any) {
        showError("Erro", err.message);
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDeleteAlterationType = (id: string) => {
    if (!can('MANAGE_ALTERATION_TYPES')) return showError('Acesso Negado', 'Sem permissão.');
    if (saving) return;
    showConfirm("Remover Tipo", "Deseja realmente remover este tipo de alteração?", async () => {
      setSaving(true);
      try {
        const { error } = await supabase.from('alteration_types').delete().eq('id', id);
        if (error) {
          if (error.code === '23503') throw new Error("Não é possível remover este tipo pois existem R.As que o utilizam.");
          throw error;
        }
        fetchStaticData();
        createLog('DELETE_ALTERATION_TYPE', `Excluiu tipo RA ID: ${id}`);
        handleNavigate('ALTERATION_TYPES');
      } catch (err: any) {
        showError("Erro", err.message);
      } finally {
        setSaving(false);
      }
    });
  };

  const generateNextRaCode = () => {
    const currentYear = new Date().getFullYear();
    const yearIncidents = incidents.filter(i => i.raCode && i.raCode.endsWith(currentYear.toString()));
    let maxNum = 0;
    yearIncidents.forEach(i => { const num = parseInt(i.raCode.split('/')[0]); if (!isNaN(num) && num > maxNum) maxNum = num; });
    return `${maxNum + 1}/${currentYear}`;
  };

  // --- INCIDENT HANDLERS (View, Edit, Delete, Filter) ---
  const handleIncidentFilterChange = useCallback((filters: { dateStart: string, timeStart: string, dateEnd: string, timeEnd: string }) => {
    fetchIncidents(false, filters);
  }, [fetchIncidents]);

  const handleSaveIncident = async (inc: Incident) => {
    setSaving(true);
    try {
      const existing = incidents.find(i => i.id === inc.id);
      const isNew = !existing;
      // Provisory ID and Tentative Sequence
      const tempId = inc.id || (isNew ? crypto.randomUUID() : inc.id);
      const tentativeRa = inc.raCode || generateNextRaCode();

      const payload = {
        id: tempId,
        ra_code: tentativeRa,
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
        timestamp: inc.timestamp || new Date().toISOString(), // Persistent record creation time
        is_edited: !isNew,
        last_edited_at: !isNew ? new Date().toISOString() : null,
        edited_by: !isNew ? user?.name : null
      };

      // FETCH IP for Audit
      if (isNew) {
        (payload as any).created_ip = await fetchClientIP();
      } else {
        (payload as any).updated_ip = await fetchClientIP();
      }

      let savedLocally = false;

      // Offline-First: Always ensure local integrity
      const localData = { ...inc, id: tempId, raCode: payload.ra_code, timestamp: payload.timestamp, isLocal: true };

      if (isLocalMode) {
        setUnsyncedIncidents(prev => [localData, ...prev.filter(i => i.id !== tempId)]);
        savedLocally = true;
      } else {
        try {
          // Attempt immediate sync
          const { error } = await supabase.from('incidents').upsert(payload);
          if (error) throw error;

          // If success, remove from unsynced in case it was there
          setUnsyncedIncidents(prev => prev.filter(i => i.id !== tempId));
        } catch (err: any) {
          console.warn("Rede instável. Salvando na fila de sincronização (Outbox).", err.message);
          setUnsyncedIncidents(prev => [localData, ...prev.filter(i => i.id !== tempId)]);
          savedLocally = true;
        }
      }

      await fetchIncidents();
      createLog(isNew ? 'CREATE_INCIDENT' : 'UPDATE_INCIDENT', `RA ${payload.ra_code} em ${buildings.find(b => b.id === inc.buildingId)?.name}`);
      handleNavigate('DASHBOARD');
      setEditingIncident(null);
      setPreSelectedBuildingId(undefined);

      if (savedLocally) {
        showAlert("Integridade Local", "Registro salvo no dispositivo. Será sincronizado automaticamente ao detectar conexão.");
      } else {
        showAlert("Sincronizado", "Registro validado e enviado com sucesso.");
      }
    } catch (err: any) {
      showError("Erro Crítico de Armazenamento", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncData = async () => {
    if (saving || unsyncedIncidents.length === 0) return;
    setSaving(true);
    let syncedCount = 0;

    try {
      // 1. Estrita Ordem Sequencial (FIFO) baseada no momento da criação real
      const queue = [...unsyncedIncidents].sort((a, b) =>
        new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
      );

      for (const inc of queue) {
        if (!navigator.onLine) break; // Pausa se a conexão cair durante o processamento

        try {
          let finalRaCode = inc.raCode;

          // 2. Verificação de Conflito de Sequência (Server Check)
          const { data: serverExisting } = await supabase
            .from('incidents')
            .select('ra_code')
            .eq('ra_code', inc.raCode)
            .maybeSingle();

          if (serverExisting) {
            console.warn(`Colisão de RA detectada: ${inc.raCode}. Aplicando re-sequenciamento.`);
            // Busca dados diretos do servidor para garantir o próximo número correto
            const currentYear = new Date().getFullYear();
            const { data: serverYearData } = await supabase
              .from('incidents')
              .select('ra_code')
              .ilike('ra_code', `%/${currentYear}`);

            // Re-calcula baseado no estado global (local + servidor)
            const allRecords = [...incidents, ...(serverYearData || []).map(r => ({ raCode: r.ra_code }))];
            finalRaCode = calculateNextRaCode(allRecords);

            // Log do re-sequenciamento
            await createLog('DATABASE_TOOLS', `Re-sequenciamento: RA ${inc.raCode} -> ${finalRaCode} (Conflito de Sincronia)`);
          }

          const payload = {
            id: inc.id,
            ra_code: finalRaCode,
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
            status: inc.status,
            timestamp: inc.timestamp,
            is_edited: inc.isEdited,
            last_edited_at: inc.lastEditedAt,
            edited_by: inc.editedBy
          };

          const { error } = await supabase.from('incidents').upsert(payload);
          if (error) throw error;

          // Remove da fila somente após confirmação do servidor
          setUnsyncedIncidents(prev => prev.filter(i => i.id !== inc.id));
          syncedCount++;
        } catch (itemError: any) {
          console.error(`Erro ao processar registro ${inc.id}:`, itemError);
          // Não remove da fila para permitir nova tentativa na próxima sync
        }
      }

      await fetchIncidents();
      if (syncedCount > 0) {
        showAlert("Sincronização Finalizada", `${syncedCount} registros integrados com sucesso.`);
      }
    } catch (err: any) {
      showError("Erro na Fila de Sincronização", err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- SYNC ENGINE (SENIOR ARCHITECTURE) ---
  // Triggers: Boot (1), Event (2), Heartbeat (3)
  useEffect(() => {
    const trySync = () => {
      // Logic for triggers 1 and 2: Immediate check
      if (navigator.onLine && unsyncedIncidents.length > 0 && !saving) {
        handleSyncData();
      }
    };

    // Trigger 2: OS/Browser Network Event
    window.addEventListener('online', trySync);

    // Trigger 1: Boot/Mount (Immediate flush attempt)
    trySync();

    // Trigger 3: Heartbeat (Recurring "Pulse" Check)
    // Solves "False Positive" WiFi connections by attempting sync periodically
    const heartbeat = setInterval(() => {
      if (unsyncedIncidents.length > 0 && !saving) {
        console.log("Heartbeat: Attempting sync verify...");
        handleSyncData();
      }
    }, 15000); // Checks every 15 seconds if items are pending

    return () => {
      window.removeEventListener('online', trySync);
      clearInterval(heartbeat);
    };
  }, [unsyncedIncidents, saving]);

  // --- ESCALA REMINDERS CHECKER ---
  const triggeredIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || escalas.length === 0 || escalaReminders.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      const currentDay = now.toISOString().split('T')[0];
      const newTriggers: any[] = [];

      escalaReminders.filter(r => r.isActive).forEach(reminder => {
        const escala = escalas.find(e => e.id === reminder.escalaId);
        if (!escala) return;

        try {
          const [endH, endM] = escala.endTime.split(':').map(Number);

          // Calcula o alvo de encerramento mais próximo (hoje ou amanhã)
          let endTarget = new Date();
          endTarget.setHours(endH, endM, 0, 0);

          // Se o alvo de hoje já passou há muito tempo (mais de 1h), 
          // ou se estamos verificando uma escala que termina de manhã cedo e agora é noite,
          // o alvo real pode ser o próximo dia.
          // Mas para simplificar: se agora > endTarget, o próximo é amanhã.
          // Exceto se estivermos "dentro" do intervalo de aviso (ex: 18:45 para as 19:00).

          const triggerWindowMs = reminder.minutesBeforeEnd * 60000;
          const triggerTarget = new Date(endTarget.getTime() - triggerWindowMs);

          // Caso especial: se agora está entre trigger e end, dispara.
          let shouldTrigger = false;

          if (now >= triggerTarget && now < endTarget) {
            shouldTrigger = true;
          }
          // Lógica para escalas que atravessam a meia-noite (fim as 07:00, agora é 06:45)
          // Se o endTarget já passou hoje (ex: 07:00 passou e agora é 06:45?? Não, 06:45 vem ANTES de 07:00).
          // O único problema é se o triggerTarget for ontem (ex: escala acaba as 00:15, trigger 30 min antes = 23:45 ontem).
          else if (triggerTarget > endTarget) { // Trigger window cross midnight
            const prevDayTrigger = new Date(triggerTarget.getTime() - 86400000);
            if (now >= prevDayTrigger && now < endTarget) {
              shouldTrigger = true;
            }
          }

          if (shouldTrigger) {
            const triggerId = `${reminder.id}_${currentDay}`;
            if (!triggeredIdsRef.current.has(triggerId)) {
              triggeredIdsRef.current.add(triggerId);
              newTriggers.push({
                id: triggerId,
                type: 'SCHEDULE_REMINDER',
                title: reminder.name,
                description: reminder.message,
                timestamp: now.toISOString(),
                status: 'UNREAD',
                data: { ...reminder, actionType: 'NAVIGATE', navigateTo: 'HISTORY' } // Force navigateTo HISTORY for old reminders
              });
            }
          }
        } catch (e) { console.warn("Error calculating reminder time", e); }
      });

      if (newTriggers.length > 0) {
        setTriggeredReminders(prev => [...newTriggers, ...prev]);
      }
    };

    const interval = setInterval(checkReminders, 20000); // Check every 20s
    checkReminders();

    return () => clearInterval(interval);
  }, [user, escalas, escalaReminders]);


  const handleConfirmLoanBatch = async (batchId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const pendingIds = loans.filter(l => l.batchId === batchId && (l.status === 'PENDING' || (l.status as string) === 'pending')).map(l => l.id);
      if (pendingIds.length === 0) return;
      const { error } = await supabase.from('loan_records').update({ status: 'ACTIVE' }).in('id', pendingIds);
      if (error) throw error;
      createLog('LOAN_CONFIRM', `Confirmou recebimento de lote`);
      fetchLoans();
      showAlert("Sucesso", "Recebimento confirmado.");
    } catch (err: any) { showError("Erro", "Falha ao confirmar: " + err.message); } finally { setSaving(false); }
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
      setSaving(true);
      try {
        const { error } = await supabase.from('job_titles').delete().eq('id', id);
        if (error) {
          if (error.code === '23503') throw new Error("Não é possível remover este cargo pois existem usuários vinculados a ele.");
          throw error;
        }
        const newJobTitles = jobTitles.filter(j => j.id !== id);
        await supabase.from('app_config').upsert({ key: 'system_job_titles', value: JSON.stringify(newJobTitles) });
        setJobTitles(newJobTitles);
        createLog('DELETE_JOB_TITLE', `Excluiu cargo ID: ${id}`);
        handleNavigate('JOB_TITLES');
      } catch (err: any) {
        showError("Erro", err.message);
      } finally {
        setSaving(false);
      }
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
    if (saving) return;
    setSaving(true);
    try {
      const isNew = !item.id || item.id === '';
      const payload: any = { ...item, id: isNew ? crypto.randomUUID() : item.id };

      // Normaliza para snake_case para compatibilidade com o banco (PostgREST ignora campos extras)
      if (table === 'vehicles') {
        if (item.currentKm !== undefined) payload.current_km = item.currentKm;
        if (item.fuelType !== undefined) payload.fuel_type = item.fuelType;
        if (item.fleetNumber !== undefined) payload.fleet_number = item.fleetNumber;
      }

      const { error } = await supabase.from(table).upsert(payload);
      if (error) throw error;
      fetchAssets();
      handleNavigate(viewReturn);
      createLog(isNew ? 'CREATE_ASSET' : 'UPDATE_ASSET', `${isNew ? 'Criou' : 'Atualizou'} ${logName}: ${item.model || item.number || item.name}`);
    } catch (err: any) { showError("Erro", err.message); } finally { setSaving(false); }
  };

  const handleDeleteAsset = (table: string, id: string, logName: string) => {
    // Determine the required permission based on the table name
    const permissionMap: Record<string, PermissionKey> = {
      'vehicles': 'MANAGE_VEHICLES',
      'vests': 'MANAGE_VESTS',
      'radios': 'MANAGE_RADIOS',
      'equipments': 'MANAGE_EQUIPMENTS'
    };
    const requiredPermission = permissionMap[table] || 'VIEW_ASSETS';
    if (!can(requiredPermission)) return showError('Acesso Negado', 'Você não tem permissão para excluir ativos.');
    if (saving) return;
    showConfirm("Excluir Item", "Tem certeza?", async () => {
      setSaving(true);
      try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) {
          if (error.code === '23503') throw new Error("Este item não pode ser excluído pois possui histórico de Cautelas ou R.As vinculado a ele. Recomenda-se apenas manter o item inativo.");
          throw error;
        }
        fetchAssets();
        createLog('DELETE_ASSET', `Removeu do inventário (${table}) ID: ${id}`);
      } catch (err: any) {
        showError("Erro", err.message);
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDeleteIncident = (id: string) => {
    if (!can('DELETE_INCIDENT')) return showError('Acesso Negado', 'Você não tem permissão para cancelar registros.');
    setCancelModal({ isOpen: true, incidentId: id, reason: '' });
  };

  const handleConfirmCancellation = async () => {
    if (cancelModal.reason.trim() === "") return showError("Erro", "O motivo do cancelamento é obrigatório.");
    if (saving) return;
    setSaving(true);
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
    } catch (err: any) { showError("Erro", err.message); } finally { setSaving(false); }
  };

  const handleDeleteUser = (id: string) => {
    if (!can('MANAGE_USERS')) return showError('Acesso Negado', 'Você não tem permissão para excluir usuários.');
    if (saving) return;

    showConfirm("Remover Usuário", "Deseja realmente remover este usuário permanentemente? Esta ação não pode ser desfeita.", async () => {
      setSaving(true);
      try {
        const { error } = await supabase.from('users').delete().eq('id', id);

        if (error) {
          if (error.code === '23503') {
            throw new Error("Não é possível excluir este usuário pois ele possui registros vinculados ao CPF/Matrícula (R.As, Cautelas ou Mensagens). Para segurança dos dados, recomenda-se apenas BLOQUEAR o acesso do usuário.");
          }
          throw error;
        }

        fetchUsers();
        createLog('DELETE_USER', `Excluiu usuário ID: ${id}`);
      } catch (err: any) {
        showError("Erro ao excluir", err.message);
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDeleteBuilding = (id: string) => {
    if (!can('MANAGE_BUILDINGS')) return showError('Acesso Negado', 'Sem permissão.');
    showConfirm("Remover Prédio", "Deseja excluir esta unidade?", async () => {
      setSaving(true);
      try {
        const { error } = await supabase.from('buildings').delete().eq('id', id);
        if (error) {
          if (error.code === '23503') throw new Error("Não é possível remover este prédio pois ele possui R.As (Relatórios) vinculados a ele.");
          throw error;
        }
        fetchStaticData();
        createLog('DELETE_BUILDING', `Excluiu unidade (prédio) ID: ${id}`);
      } catch (err: any) {
        showError("Erro ao remover", err.message);
      } finally {
        setSaving(false);
      }
    });
  };

  const handleApproveIncident = async (id: string) => {
    if (!can('APPROVE_INCIDENT')) return showError('Acesso Negado', 'Você não tem permissão para validar registros.');
    if (saving) return;
    setSaving(true);
    try {
      const incident = incidents.find(i => i.id === id);
      if (!incident) throw new Error("O corrência não encontrada");

      const currentIP = await fetchClientIP();

      // --- ASSINATURA ELETRÔNICA AVANÇADA (HASHING) ---
      // 1. Snapshot dos dados vitais
      const dataSnapshot = `ID:${incident.id}|CONTENT:${incident.description}|AUTHOR:${incident.userId}|APPROVER:${user.id}|DATE:${new Date().toISOString()}|IP:${currentIP}`;
      // 2. Geração do Hash SHA-256
      const signatureHash = CryptoJS.SHA256(dataSnapshot).toString();

      // 3. Atualização no Banco com o Hash
      const { error } = await supabase.from('incidents').update({
        status: 'APPROVED',
        approved_by: user.name, // Nome do atual aprovador
        approved_at: new Date().toISOString(),
        signature_hash: signatureHash, // Grava o Hash
        approved_ip: currentIP
      }).eq('id', id);

      if (error) throw error;

      createLog('APPROVE_INCIDENT', `Validação do RA ${incident.raCode} com Assinatura Digital (Hash: ${signatureHash})`);
      fetchIncidents();
      setPendingSubTab('INCIDENTS');
      handleNavigate('DASHBOARD');
      showAlert("Validado com Sucesso", "Registro aprovado e assinado digitalmente.");
    } catch (err: any) { showError("Falha", err.message); } finally { setSaving(false); }
  };

  const handleUpdatePassword = async (currentPass: string, nPass: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('users').update({ passwordHash: nPass }).eq('id', user.id);
      if (error) throw error;
      const updatedUser = { ...user, passwordHash: nPass };
      setUser(updatedUser);
      localStorage.setItem('vigilante_session', JSON.stringify(updatedUser));
    } catch (err: any) { throw new Error(err.message); }
  };

  const handleUpdateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    try {
      // Mapeamento para snake_case do banco de dados se necessário
      const dbUpdates: any = { ...updates };
      if (updates.userCode !== undefined) { dbUpdates.user_code = updates.userCode; delete dbUpdates.userCode; }
      if (updates.jobTitleId !== undefined) { dbUpdates.job_title_id = updates.jobTitleId; delete dbUpdates.jobTitleId; }
      if (updates.photoUrl !== undefined) { dbUpdates.photo_url = updates.photoUrl; delete dbUpdates.photoUrl; }
      if (updates.signatureUrl !== undefined) { dbUpdates.signature_url = updates.signatureUrl; delete dbUpdates.signatureUrl; }

      const { error } = await supabase.from('users').update(dbUpdates).eq('id', user.id);
      if (error) throw error;

      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('vigilante_session', JSON.stringify(updatedUser));
      fetchUsers(); // Atualizar lista global
    } catch (err: any) { throw new Error(err.message); }
  };

  const fetchClientIP = async () => {
    try {
      if (navigator.onLine) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          return data.ip || 'Não identificado';
        }
      }
    } catch (e) { console.warn('Falha ao obter IP:', e); }
    return 'Não identificado';
  };

  const finalizeLogin = async (targetUser: User, clientIP: string, isOffline: boolean = false) => {
    try {
      setUser(targetUser);
      localStorage.setItem('vigilante_session', JSON.stringify(targetUser));
      localStorage.setItem('app_version', APP_VERSION);

      const logMsg = isOffline
        ? `Acesso Offline (Cache) - IP: ${clientIP}`
        : `Acesso realizado via credenciais - IP: ${clientIP}`;

      await createLog('LOGIN', logMsg, targetUser);

      if (isOffline) showAlert("Modo Offline", "Login realizado com credenciais em cache.");
      // Limpa estado pendente se houver
      setPendingPrivacyUser(null);
      setPendingPrivacyIP('');
    } catch (e) {
      console.error("Erro ao finalizar login:", e);
    }
  };

  const handleLogin = async (identifier: string, password: string) => {
    setSaving(true);
    try {
      const id = identifier.trim();
      const pwd = password.trim();

      // Parallelize IP fetch with DB query
      const ipPromise = fetchClientIP();

      // Busca user no banco (Online) ou Cache (Offline) - OTIMIZADO
      const dbUserPromise = (async () => {
        if (!navigator.onLine) return null; // Force offline fallback

        // Single optimized query instead of 4 sequential ones
        const { data, error } = await supabase.from('users').select('*')
          .or(`email.eq.${id},cpf.eq.${id},matricula.eq.${id},user_code.eq.${id}`)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
      })();

      if (isLocalMode && id === '00') {
        // ... (mantendo lógica de contingência existente se necessário, mas simplificando para focar na otimização principal)
        // Para simplificar o diff, vou manter a lógica de contingência separada ou assumir que ela roda antes.
        // Mas como estou substituindo o bloco, preciso reincluir ou adaptar.
        // A lógica de contingência original checava antes. Vou reincluir abaixo de forma limpa.
      }

      // Check emergency logic first if applicable (re-implementing cleanly)
      if (isLocalMode && id === '00') {
        const clientIP = await ipPromise; // Await IP here if needed
        if (pwd === 'admin') {
          const emergencyUser: User = { id: 'emergency-master', name: 'SUPERVISOR (CONTINGÊNCIA)', role: UserRole.ADMIN, cpf: '000.000.000-00', matricula: 'EMERGENCY', userCode: '00', status: 'ACTIVE' };
          setUser(emergencyUser); localStorage.setItem('vigilante_session', JSON.stringify(emergencyUser)); localStorage.setItem('app_version', APP_VERSION);
          createLog('LOGIN', `Acesso de contingência (Admin) - IP: ${clientIP}`, emergencyUser);
          return;
        } else { throw new Error("Senha de contingência incorreta."); }
      }

      let [dbData, clientIP] = await Promise.all([dbUserPromise.catch(() => null), ipPromise]);
      let isOfflineLogin = false;

      // Fallback logic if online query fails or returns null
      if (!dbData) {
        if (navigator.onLine) {
          // Se estava online e não achou, talvez tentar retry ou assumir não encontrado.
          // O código original tentava fallback se "catch(err)" ocorresse.
          // Aqui dbUserPromise retorna null se offline.
        }

        // Tenta cache
        isOfflineLogin = true;
        const cachedUsers = JSON.parse(localStorage.getItem('cached_users') || '[]');
        const val = id.toLowerCase();
        dbData = cachedUsers.find((u: any) =>
          (u.email || '').trim().toLowerCase() === val ||
          (u.cpf || '').trim().toLowerCase() === val ||
          (u.matricula || '').trim().toLowerCase() === val ||
          (u.userCode || '').trim().toLowerCase() === val
        );
      }

      if (!dbData) throw new Error(isOfflineLogin ? "Usuário não encontrado localmente (verifique a internet)." : "Usuário não cadastrado.");

      // Mapeamento manual para garantir compatibilidade com a interface User
      const dbUser: User = {
        ...dbData,
        userCode: dbData.user_code || dbData.userCode,
        jobTitleId: dbData.job_title_id || dbData.jobTitleId,
        photoUrl: dbData.photo_url || dbData.photoUrl,
        signatureUrl: dbData.signature_url || dbData.signatureUrl,
        // Garantir que campos obrigatórios existam
        name: dbData.name,
        role: dbData.role,
        id: dbData.id,
        passwordHash: dbData.passwordHash || dbData.password_hash, // Suporte a ambos
        termsAcceptedAt: dbData.terms_accepted_at || dbData.termsAcceptedAt
      };

      // Validação de Senha 
      if (dbUser.passwordHash && dbUser.passwordHash !== pwd) throw new Error("Senha incorreta.");

      // Verificação de Status
      if (dbUser.status === 'PENDING') throw new Error("Seu cadastro ainda está em análise pela administração. Você será notificado assim que for aprovado.");
      if (dbUser.status === 'BLOCKED') throw new Error("Sua conta está bloqueada ou suspensa. Entre em contato com o suporte.");

      // --- TERMO DE ACEITE DE ASSINATURA ELETRÔNICA ---
      const hasAcceptedTerms = dbUser.termsAcceptedAt;

      if (!hasAcceptedTerms) {
        // Se não aceitou, interrompe e mostra modal
        setPendingPrivacyUser(dbUser);
        setPendingPrivacyIP(clientIP);
        return;
      }

      // Se já aceitou, finaliza
      await finalizeLogin(dbUser, clientIP, isOfflineLogin);
    } catch (err: any) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptTerms = async () => {
    if (!pendingPrivacyUser) return;

    try {
      const now = new Date().toISOString();
      // Persistir no Banco
      const { error } = await supabase.from('users').update({ terms_accepted_at: now }).eq('id', pendingPrivacyUser.id);
      if (error) throw error;

      const updatedUser = { ...pendingPrivacyUser, termsAcceptedAt: now };
      const isOffline = !navigator.onLine;
      await finalizeLogin(updatedUser, pendingPrivacyIP, isOffline);
    } catch (err: any) {
      showError("Erro", "Falha ao registrar aceite: " + err.message);
    }
  };

  const handleCancelTerms = () => {
    setPendingPrivacyUser(null);
    setPendingPrivacyIP('');
    showError("Acesso Negado", "O termo de aceite é obrigatório.");
  };

  const handleLogout = async () => { if (user) await createLog('LOGOUT', 'Saiu do sistema'); setUser(null); localStorage.removeItem('vigilante_session'); handleNavigate('DASHBOARD'); };


  const handleRegister = async (userData: Omit<User, 'id'>) => {
    setSaving(true);
    try {
      const { userCode, jobTitleId, photoUrl, signatureUrl, passwordHash, email, ...rest } = userData;

      // Sanitize Payload
      const payload = {
        ...rest,
        id: crypto.randomUUID(), // Gera ID manualmente para evitar erro se o banco não tiver default
        email: email || null, // Convert empty string to null
        user_code: userCode,
        job_title_id: jobTitleId,
        photo_url: photoUrl,
        signature_url: signatureUrl,
        password_hash: passwordHash,
        status: 'PENDING'
      };

      const { data, error } = await supabase.from('users').insert(payload).select().single();
      if (error) throw error;
      if (data) createLog('USER_REGISTER', `Novo cadastro: ${userData.name}`, data as User);
      showAlert("Sucesso", "Cadastro realizado. Aguarde aprovação.");
    }
    catch (err: any) { showError("Erro", err.message); }
    finally { setSaving(false); }
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const renderPrivacyModal = () => (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 transform animate-in zoom-in-95 duration-300">
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 bg-brand-600">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl text-white">
              <Shield size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Termo de Aceite</h2>
              <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">Assinatura Eletrônica e Privacidade</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <section className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="mt-1 p-1 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded">
                <Check size={16} strokeWidth={3} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">1. Validade Jurídica</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Ao utilizar este sistema, você concorda que as assinaturas eletrônicas aqui geradas possuem plena validade jurídica para todos os fins, equivalente à assinatura manuscrita.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 p-1 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded">
                <Check size={16} strokeWidth={3} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">2. Integridade dos Dados</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Cada registro é selado com um hash criptográfico de integridade e armazena metadados de auditoria, incluindo data, hora e endereço IP do autor e do validador.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 p-1 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded">
                <Check size={16} strokeWidth={3} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">3. Responsabilidade</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  O uso de sua senha pessoal é intransferível. Você é integralmente responsável por todos os atos registrados em seu nome através de seu código de acesso.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 p-1 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded">
                <Check size={16} strokeWidth={3} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">4. Privacidade</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Seus dados profissionais e biometria digital (assinatura) são utilizados exclusivamente para as finalidades de auditoria e geração dos relatórios de serviço.
                </p>
              </div>
            </div>
          </section>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic text-center">
              "Declaro que li e compreendo os termos acima, aceitando que o uso de minhas credenciais neste sistema constitui minha manifestação inequívoca de vontade e autoria."
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleCancelTerms}
            className="flex-1 px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            Não Aceito
          </button>
          <button
            onClick={handleAcceptTerms}
            className="flex-1 px-6 py-4 bg-brand-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-700 shadow-lg shadow-brand-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Li e Aceito os Termos <Check size={16} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );

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
          announcementsRevision={announcementsRevision}
          isAnnouncementsVisible={can('VIEW_ANNOUNCEMENTS')}
          canViewPendingIncidents={can('VIEW_ALL_PENDING_INCIDENTS') || can('VIEW_MY_PENDING_INCIDENTS') || can('APPROVE_INCIDENT')}
          canViewActiveLoans={can('VIEW_ALL_PENDING_LOANS') || can('VIEW_MY_PENDING_LOANS') || can('APPROVE_LOAN') || can('RETURN_LOAN')}
          canViewRecentActivities={can('VIEW_ALL_INCIDENTS') || can('VIEW_MY_INCIDENTS')}
        />;
      case 'LOAN_REPORTS':
        return <LoanViews
          currentUser={user!}
          users={users}
          vehicles={vehicles}
          vests={vests}
          radios={radios}
          equipments={equipments}
          onLogAction={(a: any, d: string) => createLog(a, d)}
          loans={loans}
          onRefresh={fetchLoans}
          initialTab="HISTORY"
          isReportView={true}
          canCreate={can('CREATE_LOAN')}
          canApprove={can('APPROVE_LOAN')}
          canReturn={can('RETURN_LOAN')}
          canViewHistory={can('VIEW_ALL_LOANS') || can('VIEW_MY_LOANS')}
          canViewAll={can('VIEW_ALL_LOANS') || can('VIEW_ALL_PENDING_LOANS')}
          onShowConfirm={showConfirm}
          customLogo={customLogoRight}
          customLogoLeft={customLogoLeft}
          onBack={() => handleNavigate('DASHBOARD')}
        />;
      case 'NEW_RECORD':
        if (!can('CREATE_INCIDENT') && !can('EDIT_INCIDENT')) return <div className="p-8 text-center">Acesso Negado</div>;
        return <IncidentForm user={user!} users={users} incidents={incidents} buildings={buildings} alterationTypes={alterationTypes} nextRaCode={generateNextRaCode()} onSave={handleSaveIncident} onCancel={() => { setEditingIncident(null); setPreSelectedBuildingId(undefined); handleBack(); }} initialData={editingIncident} isLoading={saving} preSelectedBuildingId={preSelectedBuildingId} onShowConfirm={showConfirm} />;
      case 'HISTORY': return <IncidentHistory incidents={incidents} buildings={buildings} alterationTypes={alterationTypes} onView={handleViewIncident} onEdit={(i) => { setEditingIncident(i); handleNavigate('NEW_RECORD'); }} onDelete={handleDeleteIncident} filterStatus="COMPLETED" currentUser={user} customLogo={customLogoRight} customLogoLeft={customLogoLeft} hasMore={hasMore} isLoadingMore={loadingMore} onLoadMore={() => fetchIncidents(true)} canEdit={can('EDIT_INCIDENT')} canDelete={can('DELETE_INCIDENT')} canApprove={can('APPROVE_INCIDENT')} canExport={can('EXPORT_REPORTS')} canViewAll={can('VIEW_ALL_INCIDENTS')} jobTitles={jobTitles} onFilterChange={handleIncidentFilterChange} onBack={handleBack} onLogAction={createLog} />;
      case 'INCIDENT_REPORTS': return <IncidentHistory incidents={incidents} buildings={buildings} alterationTypes={alterationTypes} onView={handleViewIncident} onEdit={(i) => { setEditingIncident(i); handleNavigate('NEW_RECORD'); }} onDelete={handleDeleteIncident} filterStatus="COMPLETED" currentUser={user} customLogo={customLogoRight} customLogoLeft={customLogoLeft} hasMore={hasMore} isLoadingMore={loadingMore} onLoadMore={() => fetchIncidents(true)} canEdit={can('EDIT_INCIDENT')} canDelete={can('DELETE_INCIDENT')} canApprove={can('APPROVE_INCIDENT')} canExport={can('EXPORT_REPORTS')} canViewAll={can('VIEW_ALL_INCIDENTS')} jobTitles={jobTitles} onFilterChange={handleIncidentFilterChange} onBack={handleBack} requireFilter={true} onLogAction={createLog} embeddedPreview={true} />;
      case 'PENDING_APPROVALS':
        return (
          <div className="space-y-8 animate-fade-in">
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
                  canExport={can('EXPORT_REPORTS')}
                  canViewAll={can('VIEW_ALL_PENDING_INCIDENTS') || can('APPROVE_INCIDENT')}
                  jobTitles={jobTitles}
                  onBack={handleBack}
                  onLogAction={createLog}
                />
              ) : (
                <LoanViews
                  key={`pending-loans-${viewRefreshCounter}`}
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
                  canCreate={can('CREATE_LOAN')}
                  canApprove={can('APPROVE_LOAN')}
                  canReturn={can('RETURN_LOAN')}
                  canViewHistory={can('VIEW_MY_LOANS') || can('VIEW_ALL_LOANS')}
                  canViewAll={can('VIEW_ALL_PENDING_LOANS') || can('APPROVE_LOAN') || can('RETURN_LOAN')}
                />
              )}
            </div>
          </div>
        );
      case 'BUILDINGS': return <BuildingList buildings={buildings} sectors={sectors} onEdit={(b) => { setEditingBuilding(b); handleNavigate('BUILDING_FORM'); }} onDelete={handleDeleteBuilding} onAdd={() => { setEditingBuilding(null); handleNavigate('BUILDING_FORM'); }} onRefresh={fetchStaticData} canEdit={can('MANAGE_BUILDINGS')} canDelete={can('MANAGE_BUILDINGS')} onBack={handleBack} />;
      case 'BUILDING_FORM': return <BuildingForm initialData={editingBuilding} sectors={sectors} onSave={async (b) => { setSaving(true); try { await supabase.from('buildings').upsert(b); fetchStaticData(); handleNavigate('BUILDINGS'); } catch (e: any) { showError("Erro", e.message); } finally { setSaving(false); } }} onCancel={handleBack} onDelete={handleDeleteBuilding} isLoading={saving} />;
      case 'USERS': return <UserList users={users} jobTitles={jobTitles} onEdit={(u) => { setEditingUser(u); handleNavigate('USER_FORM'); }} onDelete={handleDeleteUser} onAdd={() => { setEditingUser(null); handleNavigate('USER_FORM'); }} onRefresh={fetchUsers} canEdit={can('MANAGE_USERS')} canDelete={can('MANAGE_USERS')} onBack={handleBack} />;
      case 'USER_FORM': return <UserForm initialData={editingUser} jobTitles={jobTitles} onSave={async (u) => { setSaving(true); try { const { userCode, jobTitleId, photoUrl, signatureUrl, termsAcceptedAt, ...rest } = u; await supabase.from('users').upsert({ ...rest, user_code: userCode, job_title_id: jobTitleId, photo_url: photoUrl, signature_url: signatureUrl, terms_accepted_at: termsAcceptedAt }); fetchUsers(); handleNavigate('USERS'); } catch (e: any) { showError("Erro", e.message); } finally { setSaving(false); } }} onCancel={handleBack} onDelete={handleDeleteUser} isLoading={saving} />;
      case 'JOB_TITLES': return <JobTitleList jobTitles={jobTitles} onEdit={(t) => { setEditingJobTitle(t); handleNavigate('JOB_TITLE_FORM'); }} onDelete={handleDeleteJobTitle} onAdd={() => { setEditingJobTitle(null); handleNavigate('JOB_TITLE_FORM'); }} canEdit={can('MANAGE_JOB_TITLES')} canDelete={can('MANAGE_JOB_TITLES')} onBack={handleBack} />;
      case 'JOB_TITLE_FORM': return <JobTitleForm initialData={editingJobTitle} onSave={handleSaveJobTitle} onCancel={handleBack} onDelete={handleDeleteJobTitle} />;
      case 'VEHICLES': return <VehicleList items={vehicles} onAdd={() => { setEditingVehicle(null); handleNavigate('VEHICLE_FORM'); }} onEdit={(i) => { setEditingVehicle(i); handleNavigate('VEHICLE_FORM'); }} onDelete={(id) => handleDeleteAsset('vehicles', id, 'Veículo')} canEdit={can('MANAGE_VEHICLES')} canDelete={can('MANAGE_VEHICLES')} onBack={handleBack} />;
      case 'VEHICLE_FORM': return <VehicleForm initialData={editingVehicle} onSave={(i: any) => handleSaveAsset('vehicles', i, 'VEHICLES', 'Veículo')} onCancel={handleBack} onDelete={() => editingVehicle && handleDeleteAsset('vehicles', editingVehicle.id, 'Veículo')} isLoading={saving} />;
      case 'VESTS': return <VestList items={vests} onAdd={() => { setEditingVest(null); handleNavigate('VEST_FORM'); }} onEdit={(i) => { setEditingVest(i); handleNavigate('VEST_FORM'); }} onDelete={(id) => handleDeleteAsset('vests', id, 'Colete')} canEdit={can('MANAGE_VESTS')} canDelete={can('MANAGE_VESTS')} onBack={handleBack} />;
      case 'VEST_FORM': return <VestForm initialData={editingVest} onSave={(i: any) => handleSaveAsset('vests', i, 'VESTS', 'Colete')} onCancel={handleBack} onDelete={() => editingVest && handleDeleteAsset('vests', editingVest.id, 'Colete')} isLoading={saving} />;
      case 'RADIOS': return <RadioList items={radios} onAdd={() => { setEditingRadio(null); handleNavigate('RADIO_FORM'); }} onEdit={(i) => { setEditingRadio(i); handleNavigate('RADIO_FORM'); }} onDelete={(id) => handleDeleteAsset('radios', id, 'Rádio')} canEdit={can('MANAGE_RADIOS')} canDelete={can('MANAGE_RADIOS')} onBack={handleBack} />;
      case 'RADIO_FORM': return <RadioForm initialData={editingRadio} onSave={(i: any) => handleSaveAsset('radios', i, 'RADIOS', 'Rádio')} onCancel={handleBack} onDelete={() => editingRadio && handleDeleteAsset('radios', editingRadio.id, 'Rádio')} isLoading={saving} />;
      case 'EQUIPMENTS': return <EquipmentList items={equipments} onAdd={() => { setEditingEquipment(null); handleNavigate('EQUIPMENT_FORM'); }} onEdit={(i) => { setEditingEquipment(i); handleNavigate('EQUIPMENT_FORM'); }} onDelete={(id) => handleDeleteAsset('equipments', id, 'Equipamento')} canEdit={can('MANAGE_EQUIPMENTS')} canDelete={can('MANAGE_EQUIPMENTS')} onBack={handleBack} />;
      case 'EQUIPMENT_FORM': return <EquipmentForm initialData={editingEquipment} onSave={(i: any) => handleSaveAsset('equipments', i, 'EQUIPMENTS', 'Equipamento')} onCancel={handleBack} onDelete={() => editingEquipment && handleDeleteAsset('equipments', editingEquipment.id, 'Equipamento')} isLoading={saving} />;
      case 'NEW_LOAN': return <LoanViews key={`new-loan-${viewRefreshCounter}`} currentUser={user!} users={users} vehicles={vehicles} vests={vests} radios={radios} equipments={equipments} onLogAction={createLog} loans={loans} onRefresh={() => fetchLoans(false)} initialTab="NEW" filterStatus="ACTIVE" onShowConfirm={showConfirm} canCreate={can('CREATE_LOAN')} canApprove={can('APPROVE_LOAN')} canReturn={can('RETURN_LOAN')} canViewHistory={can('VIEW_MY_LOANS') || can('VIEW_ALL_LOANS')} canViewAll={can('VIEW_ALL_LOANS')} customLogo={customLogoRight} customLogoLeft={customLogoLeft} onFilterChange={(f) => fetchLoans(false, f)} onBack={handleBack} />;
      case 'LOANS': return <LoanViews key={`active-loans-${viewRefreshCounter}`} currentUser={user!} users={users} vehicles={vehicles} vests={vests} radios={radios} equipments={equipments} onLogAction={createLog} loans={loans} onRefresh={() => fetchLoans(false)} filterStatus="ACTIVE" onShowConfirm={showConfirm} canCreate={can('CREATE_LOAN')} canApprove={can('APPROVE_LOAN')} canReturn={can('RETURN_LOAN')} canViewHistory={can('VIEW_MY_LOANS') || can('VIEW_ALL_LOANS')} canViewAll={can('VIEW_ALL_LOANS')} customLogo={customLogoRight} customLogoLeft={customLogoLeft} onFilterChange={(f) => fetchLoans(false, f)} onBack={handleBack} />;
      case 'LOAN_HISTORY': return <LoanViews key={`loan-history-${viewRefreshCounter}`} currentUser={user!} users={users} vehicles={vehicles} vests={vests} radios={radios} equipments={equipments} onLogAction={createLog} initialTab="HISTORY" loans={loans} onRefresh={() => fetchLoans(false)} hasMore={hasMoreLoans} isLoadingMore={loadingMoreLoans} onLoadMore={() => fetchLoans(true)} onShowConfirm={showConfirm} canCreate={can('CREATE_LOAN')} canApprove={can('APPROVE_LOAN')} canReturn={can('RETURN_LOAN')} canViewHistory={can('VIEW_MY_LOANS') || can('VIEW_ALL_LOANS')} canViewAll={can('VIEW_ALL_LOANS')} customLogo={customLogoRight} customLogoLeft={customLogoLeft} onFilterChange={(f) => fetchLoans(false, f)} onBack={handleBack} />;
      case 'SECTORS': return <SectorList sectors={sectors} onEdit={(s) => { setEditingSector(s); handleNavigate('SECTOR_FORM'); }} onDelete={handleDeleteSector} onAdd={() => { setEditingSector(null); handleNavigate('SECTOR_FORM'); }} canEdit={can('MANAGE_SECTORS')} canDelete={can('MANAGE_SECTORS')} onBack={handleBack} />;
      case 'SECTOR_FORM': return <SectorForm initialData={editingSector} onSave={handleSaveSector} onCancel={handleBack} onDelete={handleDeleteSector} />;
      case 'ALTERATION_TYPES': return <AlterationTypeManager types={alterationTypes} onAdd={async (name) => { const newType = { id: crypto.randomUUID(), name, order: alterationTypes.length }; await handleSaveAlterationType(newType); }} onEdit={(t) => { setEditingAlterationType(t); setView('ALTERATION_TYPE_FORM'); }} onDelete={handleDeleteAlterationType} onReorder={handleReorderAlterationTypes} canManage={can('MANAGE_ALTERATION_TYPES')} onBack={handleBack} />;
      case 'ALTERATION_TYPE_FORM': return <AlterationTypeForm initialData={editingAlterationType} onSave={handleSaveAlterationType} onCancel={handleBack} onDelete={handleDeleteAlterationType} />;
      case 'ESCALAS': return <EscalaList escalas={escalas} onEdit={(e) => { setEditingEscala(e); handleNavigate('ESCALA_FORM'); }} onDelete={handleDeleteEscala} onAdd={() => { setEditingEscala(null); handleNavigate('ESCALA_FORM'); }} onManageReminders={(e) => { setReminderManagingEscala(e); handleNavigate('ESCALA_REMINDERS'); }} canEdit={can('MANAGE_ESCALAS')} canDelete={can('MANAGE_ESCALAS')} onBack={handleBack} />;
      case 'ESCALA_FORM':
        return <EscalaForm initialData={editingEscala} onSave={handleSaveEscala} onCancel={() => handleNavigate('ESCALAS')} isLoading={saving} />;
      case 'ESCALA_REMINDERS':
        return reminderManagingEscala ? (
          <EscalaReminderManager
            escala={reminderManagingEscala}
            reminders={escalaReminders.filter(r => r.escalaId === reminderManagingEscala.id)}
            onSave={handleSaveEscalaReminder}
            onDelete={handleDeleteEscalaReminder}
            onTest={(r) => {
              setTriggeredReminders(prev => [{
                id: `test_${Date.now()}`,
                type: 'SCHEDULE_REMINDER',
                title: `[TESTE] ${r.name}`,
                description: r.message,
                timestamp: new Date().toISOString(),
                status: 'UNREAD',
                data: r
              }, ...prev]);
              showAlert("Teste Enviado", "Uma notificação de teste foi adicionada ao seu painel.");
            }}
            onBack={() => { setReminderManagingEscala(null); handleNavigate('ESCALAS'); }}
            isLoading={saving}
          />
        ) : null;
      case 'CHARTS': return <ChartsView incidents={incidents} buildings={buildings} sectors={sectors} onBack={handleBack} />;
      case 'MAP':
        if (!can('VIEW_MAP')) return <div className="flex flex-col items-center justify-center h-full text-slate-400 font-bold uppercase tracking-widest p-8">Acesso não autorizado</div>;
        return <MapView buildings={buildings} onNavigateBuilding={(b) => { setEditingBuilding(b); handleNavigate('BUILDING_FORM'); }} onBack={handleBack} />;
      case 'LOGS': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} onLogAction={createLog} initialTab='LOGS' onBack={handleBack} />;
      case 'TOOLS': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} currentLogoLeft={customLogoLeft} onUpdateLogoLeft={handleUpdateLogoLeft} onLogAction={createLog} initialTab='APPEARANCE' onBack={handleBack} />;
      case 'IMPORT_EXPORT': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} currentLogoLeft={customLogoLeft} onUpdateLogoLeft={handleUpdateLogoLeft} onLogAction={createLog} initialTab='IMPORT_EXPORT' onBack={handleBack} />;
      case 'PERMISSIONS_TOOLS': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} isLocalMode={isLocalMode} onToggleLocalMode={handleToggleLocalMode} unsyncedCount={unsyncedIncidents.length} onSync={handleSyncData} initialTab='ACCESS_CONTROL' onLogAction={createLog} permissions={permissions} onUpdatePermissions={handleUpdatePermissions} userOverrides={userOverrides} onUpdateOverrides={handleUpdateOverrides} users={users} onBack={handleBack} />;
      case 'DATABASE_TOOLS': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} isLocalMode={isLocalMode} onToggleLocalMode={handleToggleLocalMode} unsyncedCount={unsyncedIncidents.length} onSync={handleSyncData} initialTab='DATABASE' onLogAction={createLog} permissions={permissions} onUpdatePermissions={handleUpdatePermissions} onBack={handleBack} />;
      case 'SYSTEM_INFO': return <ToolsView logs={logs} onTestLog={async () => { await createLog('UPDATE_INCIDENT', 'Teste de logs'); await fetchLogs(); }} currentLogo={customLogoRight} onUpdateLogo={handleUpdateLogoRight} currentLogoLeft={customLogoLeft} onUpdateLogoLeft={handleUpdateLogoLeft} onLogAction={createLog} initialTab='SYSTEM' onBack={handleBack} />;

      case 'INCIDENT_DETAIL': return <IncidentDetail incident={selectedIncident!} building={buildings.find(b => b.id === selectedIncident?.buildingId)} author={users.find(u => u.id === selectedIncident?.userId)} authorRole={users.find(u => u.id === selectedIncident?.userId)?.role} authorJobTitle={jobTitles.find(jt => jt.id === users.find(u => u.id === selectedIncident?.userId)?.jobTitleId)?.name} approverRole={users.find(u => u.name === selectedIncident?.approvedBy)?.role} approverJobTitle={jobTitles.find(jt => jt.id === users.find(u => u.name === selectedIncident?.approvedBy)?.jobTitleId)?.name} onBack={handleBack} onApprove={handleApproveIncident} onEdit={() => { setEditingIncident(selectedIncident); handleNavigate('NEW_RECORD'); }} onDelete={handleDeleteIncident} customLogo={customLogoRight} customLogoLeft={customLogoLeft} canEdit={can('EDIT_INCIDENT')} canDelete={can('DELETE_INCIDENT')} canApprove={can('APPROVE_INCIDENT')} currentUser={user!} />;
      case 'ANNOUNCEMENTS': return <AnnouncementManager currentUser={user!} users={users} jobTitles={jobTitles} onAnnouncementCreated={fetchAnnouncementsCount} canManage={can('MANAGE_ANNOUNCEMENTS')} onShowConfirm={showConfirm} onBack={handleBack} />;
      case 'PROFILE': return <ProfileView user={user!} onUpdatePassword={handleUpdatePassword} onUpdateProfile={handleUpdateProfile} jobTitles={jobTitles} onBack={handleBack} />;
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
        isAnnouncementsVisible={MENU_STRUCTURE.some(s => s.children?.some(c => c.id === 'announcements' && isMenuVisible(c)))}
        canViewPendingIncidents={can('VIEW_ALL_PENDING_INCIDENTS') || can('VIEW_MY_PENDING_INCIDENTS') || can('APPROVE_INCIDENT')}
        canViewActiveLoans={can('VIEW_ALL_PENDING_LOANS') || can('VIEW_MY_PENDING_LOANS') || can('APPROVE_LOAN') || can('RETURN_LOAN')}
        canViewRecentActivities={can('VIEW_ALL_INCIDENTS') || can('VIEW_MY_INCIDENTS')}
      />;
    }
  };
  if (!user) {
    return (
      <>
        <Auth
          onLogin={handleLogin}
          onRegister={handleRegister}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          customLogo={customLogoRight}
          onShowSetup={() => setShowDbSetup(true)}
          systemVersion={DISPLAY_VERSION}
          users={users}
          isLocalMode={isLocalMode}
          onToggleLocalMode={handleToggleLocalMode}
          unsyncedCount={unsyncedIncidents.length}
          onSync={handleSyncData}
          isLoading={saving}
        />
        <Modal
          isOpen={modalConfig.isOpen}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          onConfirm={modalConfig.onConfirm}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        />
        {showDbSetup && <DatabaseSetup onClose={() => setShowDbSetup(false)} />}

        {/* TERMO DE ACEITE NO LOGIN */}
        {pendingPrivacyUser && renderPrivacyModal()}
      </>
    );
  }

  const pendingIncidentsCount = incidents.filter(i => {
    if (i.status !== 'PENDING') return false;
    if (can('VIEW_ALL_PENDING_INCIDENTS') || can('APPROVE_INCIDENT')) return true;
    if (can('VIEW_MY_PENDING_INCIDENTS')) return i.userId === user?.id;
    return false;
  }).length;
  // Conta lotes (batches) pendentes. Supervisores veem tudo, outros veem os seus (como recebedor ou operador)
  const pendingLoansCount = Array.from(new Set(
    loans.filter(l => {
      if (l.status !== 'PENDING') return false;
      if (can('VIEW_ALL_PENDING_LOANS') || can('APPROVE_LOAN') || can('RETURN_LOAN')) return true;
      if (can('VIEW_MY_PENDING_LOANS')) return l.receiverId === user.id || l.operatorId === user.id;
      return false;
    }).map(l => l.batchId || l.id)
  )).length;
  const pendingUsersCount = users.filter(u => u.status === 'PENDING').length;
  // Badge total é a soma
  const totalPendingBadge = pendingIncidentsCount + pendingLoansCount + (can('MANAGE_USERS') ? pendingUsersCount : 0);

  // --- DYNAMIC SIDEBAR HELPERS ---

  const getIcon = (name: string) => {
    switch (name) {
      case 'LayoutDashboard': return <LayoutDashboard size={20} />;
      case 'Megaphone': return <Megaphone size={20} />;
      case 'FileText': return <FileText size={20} />;
      case 'ArrowRightLeft': return <ArrowRightLeft size={20} />;
      case 'History': return <History size={20} />;
      case 'UserCheck': return <UserCheck size={20} />;
      case 'PieChartIcon': return <PieChartIcon size={20} />;
      case 'FolderOpen': return <FolderOpen size={20} />;
      case 'BuildingIcon': return <BuildingIcon size={20} />;
      case 'Tag': return <Tag size={20} />;
      case 'Map': return <Map size={20} />;
      case 'Users': return <Users size={20} />;
      case 'Briefcase': return <Briefcase size={20} />;
      case 'Car': return <Car size={20} />;
      case 'Shield': return <Shield size={20} />;
      case 'RadioIcon': return <RadioIcon size={20} />;
      case 'Package': return <Package size={20} />;
      case 'Wrench': return <Wrench size={20} />;
      case 'Clock': return <Clock size={20} />;
      case 'FilePlus': return <FilePlus size={20} />;
      case 'Key': return <Key size={20} />;
      case 'FileSpreadsheet': return <FileSpreadsheet size={20} />;
      default: return null;
    }
  };

  const getBadge = (id: string) => {
    if (id === 'announcements') return unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : undefined;
    if (id === 'pending_root') return totalPendingBadge > 0 ? totalPendingBadge : undefined;
    if (id === 'pending_incidents') return pendingIncidentsCount > 0 ? pendingIncidentsCount : undefined;
    if (id === 'pending_loans') return pendingLoansCount > 0 ? pendingLoansCount : undefined;
    return undefined;
  };

  const isSelected = (id: string): boolean => {
    switch (id) {
      case 'dashboard': return view === 'DASHBOARD';
      case 'announcements': return view === 'ANNOUNCEMENTS';
      case 'new_record': return view === 'NEW_RECORD';
      case 'new_loan': return view === 'NEW_LOAN';
      case 'loans': return view === 'LOANS';
      case 'history_incidents': return view === 'HISTORY';
      case 'history_loans': return view === 'LOAN_HISTORY';
      case 'report_incidents': return view === 'INCIDENT_REPORTS';
      case 'report_loans': return view === 'LOAN_REPORTS';
      case 'pending_incidents': return view === 'PENDING_APPROVALS' && pendingSubTab === 'INCIDENTS';
      case 'pending_loans': return view === 'PENDING_APPROVALS' && pendingSubTab === 'LOANS';
      case 'map': return view === 'MAP';
      case 'charts': return view === 'CHARTS';
      case 'reg_buildings': return view === 'BUILDINGS' || view === 'BUILDING_FORM';
      case 'reg_types': return view === 'ALTERATION_TYPES' || view === 'ALTERATION_TYPE_FORM';
      case 'reg_sectors': return view === 'SECTORS' || view === 'SECTOR_FORM';
      case 'reg_users': return view === 'USERS' || view === 'USER_FORM';
      case 'reg_escalas': return view === 'ESCALAS' || view === 'ESCALA_FORM' || view === 'ESCALA_REMINDERS';
      case 'reg_job_titles': return view === 'JOB_TITLES' || view === 'JOB_TITLE_FORM';
      case 'reg_vehicles': return view === 'VEHICLES' || view === 'VEHICLE_FORM';
      case 'reg_vests': return view === 'VESTS' || view === 'VEST_FORM';
      case 'reg_radios': return view === 'RADIOS' || view === 'RADIO_FORM';
      case 'reg_equipments': return view === 'EQUIPMENTS' || view === 'EQUIPMENT_FORM';
      case 'tool_appearance': return view === 'TOOLS';
      case 'tool_import': return view === 'IMPORT_EXPORT';
      case 'tool_permissions': return view === 'PERMISSIONS_TOOLS';
      case 'tool_logs': return view === 'LOGS';
      case 'tool_database': return view === 'DATABASE_TOOLS';
      case 'tool_system': return view === 'SYSTEM_INFO';
      case 'report_incidents': return view === 'INCIDENT_REPORTS';
      case 'report_loans': return view === 'LOAN_REPORTS';
      default: return false;
    }
  };

  const menuActions: Record<string, () => void> = {
    'dashboard': () => { setViewHistory([]); handleNavigate('DASHBOARD', true); },
    'announcements': () => { setViewHistory([]); handleNavigate('ANNOUNCEMENTS', true); },
    'new_record': () => { setViewHistory([]); setEditingIncident(null); handleNavigate('NEW_RECORD', true); },
    'new_loan': () => { setViewHistory([]); handleNavigate('NEW_LOAN', true); },
    'loans': () => { setViewHistory([]); handleNavigate('LOANS', true); },
    'history_incidents': () => { setViewHistory([]); handleNavigate('HISTORY', true); },
    'history_loans': () => { setViewHistory([]); handleNavigate('LOAN_HISTORY', true); },
    'report_incidents': () => { setViewHistory([]); handleNavigate('INCIDENT_REPORTS', true); },
    'report_loans': () => { setViewHistory([]); handleNavigate('LOAN_REPORTS', true); },
    'pending_incidents': () => { setViewHistory([]); setPendingSubTab('INCIDENTS'); handleNavigate('PENDING_APPROVALS', true); },
    'pending_loans': () => { setViewHistory([]); setPendingSubTab('LOANS'); handleNavigate('PENDING_APPROVALS', true); },
    'map': () => { setViewHistory([]); handleNavigate('MAP', true); },
    'charts': () => { setViewHistory([]); handleNavigate('CHARTS', true); },
    'reg_buildings': () => { setViewHistory([]); handleNavigate('BUILDINGS', true); },
    'reg_types': () => { setViewHistory([]); handleNavigate('ALTERATION_TYPES', true); },
    'reg_sectors': () => { setViewHistory([]); handleNavigate('SECTORS', true); },
    'reg_users': () => { setViewHistory([]); handleNavigate('USERS', true); },
    'reg_escalas': () => { setViewHistory([]); handleNavigate('ESCALAS', true); },
    'reg_job_titles': () => { setViewHistory([]); handleNavigate('JOB_TITLES', true); },
    'reg_vehicles': () => { setViewHistory([]); handleNavigate('VEHICLES', true); },
    'reg_vests': () => { setViewHistory([]); handleNavigate('VESTS', true); },
    'reg_radios': () => { setViewHistory([]); handleNavigate('RADIOS', true); },
    'reg_equipments': () => { setViewHistory([]); handleNavigate('EQUIPMENTS', true); },
    'tool_appearance': () => { setViewHistory([]); handleNavigate('TOOLS', true); },
    'tool_import': () => { setViewHistory([]); handleNavigate('IMPORT_EXPORT', true); },
    'tool_permissions': () => { setViewHistory([]); handleNavigate('PERMISSIONS_TOOLS', true); },
    'tool_logs': () => { setViewHistory([]); handleNavigate('LOGS', true); },
    'tool_database': () => { setViewHistory([]); handleNavigate('DATABASE_TOOLS', true); },
    'tool_system': () => { setViewHistory([]); handleNavigate('SYSTEM_INFO', true); },
  };

  const handleMenuClick = (item: MenuItemDef) => {
    if (item.children) {
      setOpenMenus(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
    } else if (menuActions[item.id]) {
      menuActions[item.id]();
    }
  };

  const renderMenuItems = (items: MenuItemDef[], depth = 0) => {
    return items.map(item => {
      if (!isMenuVisible(item)) return null;

      if (item.isSection) {
        if (isSidebarCollapsed) {
          return (
            <React.Fragment key={item.id}>
              {item.children && renderMenuItems(item.children, depth + 1)}
            </React.Fragment>
          );
        }
        return (
          <div key={item.id} className="mt-8 mb-4 first:mt-2 animate-in fade-in duration-500">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] px-5 mb-3 select-none flex items-center gap-3 ${sidebarDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {item.label}
              <div className={`h-px flex-1 opacity-10 ${sidebarDark ? 'bg-white' : 'bg-slate-900'}`}></div>
            </h3>
            {item.children && renderMenuItems(item.children, depth + 1)}
          </div>
        );
      }

      const isOpen = openMenus.includes(item.id);
      const isAct = isSelected(item.id);

      return (
        <React.Fragment key={item.id}>
          <NavItem
            icon={getIcon(item.iconName)}
            label={item.label}
            active={isAct}
            onClick={() => handleMenuClick(item)}
            collapsed={isSidebarCollapsed}
            badge={getBadge(item.id)}
            isSubItem={depth > 1}
            hasChevron={item.children && item.children.length > 0 && !isSidebarCollapsed}
            isOpen={isOpen}
            sidebarDark={sidebarDark}
          />
          {item.children && isOpen && !isSidebarCollapsed && (
            <div className={`space-y-1 mt-1 origin-top animate-in fade-in slide-in-from-top-1 duration-300`}>
              {renderMenuItems(item.children, depth + 1)}
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="min-h-screen flex transition-colors duration-200">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 lg:relative border-r flex flex-col
          ${sidebarOpen ? 'translate-x-0 w-[85vw] max-w-[320px]' : '-translate-x-full lg:translate-x-0'} 
          ${isSidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'} 
          ${sidebarDark ? 'bg-[#0f172a] border-white/5 shadow-2xl' : 'bg-[#f8fafc] border-slate-200 shadow-sm'}`}
      >
        <div className="h-full flex flex-col">
          {/* Logo Section */}
          <div className={`flex items-center transition-all duration-300 relative ${isSidebarCollapsed ? 'h-20 justify-center px-2' : 'h-24 px-6 justify-start gap-3'}`}>
            <div className={`transition-all duration-300 flex items-center justify-center group ${isSidebarCollapsed ? 'h-10 w-10' : 'h-12 w-12'}`}>
              {customLogoRight ? (
                <img src={customLogoRight} className="w-full h-full object-contain drop-shadow-sm" alt="Logo" />
              ) : (
                <Shield className={`${sidebarDark ? 'text-blue-400' : 'text-blue-600'} drop-shadow-sm animate-in zoom-in duration-500`} size={isSidebarCollapsed ? 28 : 32} strokeWidth={2} />
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
                <span className={`${sidebarDark ? 'text-white' : 'text-slate-900'} font-black text-base tracking-tight uppercase leading-none`}>Vigilante</span>
                <span className="text-blue-500 text-[9px] font-black tracking-[0.2em] uppercase mt-0.5 opacity-80">MUNICIPAL</span>
              </div>
            )}

            {/* Collapse Toggle Button (Desktop Only) */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`hidden lg:flex absolute -right-3 top-8 h-6 w-6 rounded-full border shadow-sm items-center justify-center transition-all z-20 hover:scale-110
                ${sidebarDark ? 'bg-[#0f172a] border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-blue-600'}`}
              title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
            >
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ArrowLeft size={14} />}
            </button>
          </div>

          {/* Navigation Section */}
          <nav className={`flex-1 overflow-y-auto no-scrollbar py-4 custom-scrollbar ${isSidebarCollapsed ? 'px-2' : 'px-3 space-y-1'}`}>
            {renderMenuItems(MENU_STRUCTURE)}

            <div className={`mt-10 pt-6 border-t ${sidebarDark ? 'border-white/5' : 'border-slate-200'}`}>
              <NavItem
                icon={<LogOut size={20} className="rotate-180" />}
                label="Sair do Sistema"
                onClick={handleLogout}
                collapsed={isSidebarCollapsed}
                sidebarDark={sidebarDark}
              />
              {!isSidebarCollapsed && (
                <div className="mt-4 px-4 py-2 border border-slate-200/50 dark:border-white/5 rounded-xl bg-slate-500/5">
                  <p className={`text-[10px] font-sans font-black text-center tracking-widest opacity-40 ${sidebarDark ? 'text-white' : 'text-slate-900'}`}>
                    {DISPLAY_VERSION}
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
            <h2 className="hidden md:block text-xs font-black uppercase text-slate-400 tracking-widest">Gestão de Alterações</h2>
            {isLocalMode && <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded text-xs font-black uppercase animate-pulse"><CloudOff size={12} /> Offline Ativado</span>}
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter
              currentUser={user}
              incidents={incidents}
              loans={loans}
              pendingUsers={users.filter(u => u.status === 'PENDING')}
              extraNotifications={triggeredReminders}
              canManageUsers={can('MANAGE_USERS')}
              onNavigate={(viewName, data) => {
                if (viewName === 'PENDING_APPROVALS' && data?.tab) {
                  setPendingSubTab(data.tab);
                }
                handleNavigate(viewName as ViewState, data ? false : true);
              }}
              onDismissExtra={(id) => setTriggeredReminders(prev => prev.filter(t => t.id !== id))}
              onAnnouncementRead={fetchAnnouncementsCount}
            />
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {showThemeMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => { setDarkMode(!darkMode); setShowThemeMenu(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <span>Sistema: {darkMode ? 'Escuro' : 'Claro'}</span>
                      {darkMode ? <Moon size={14} /> : <Sun size={14} />}
                    </button>
                    <button
                      onClick={() => { setSidebarDark(!sidebarDark); setShowThemeMenu(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <span>Sidebar: {sidebarDark ? 'Escura' : 'Clara'}</span>
                      {sidebarDark ? <Moon size={14} /> : <Sun size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {showThemeMenu && <div className="fixed inset-0 z-40" onClick={() => setShowThemeMenu(false)} />}

            <button
              onClick={() => handleNavigate('PROFILE')}
              className="flex items-center gap-3 p-1.5 pr-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 group ml-1"
            >
              <div className="h-9 w-9 bg-brand-900 rounded-full flex items-center justify-center text-white font-bold uppercase transition-all overflow-hidden">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 transition-colors">
                  {user.name.split(' ')[0]}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  {user.role}
                </p>
              </div>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{renderContent()}</main>
      </div>
      {showDbSetup && <DatabaseSetup onClose={() => setShowDbSetup(false)} />}
      <Modal isOpen={modalConfig.isOpen} type={modalConfig.type} title={modalConfig.title} message={modalConfig.message} onConfirm={modalConfig.onConfirm} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />

      {/* TERMO DE ACEITE NO DASHBOARD (Fallback) */}
      {pendingPrivacyUser && renderPrivacyModal()}

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

const EscalaList: React.FC<{
  escalas: Escala[],
  onEdit: (e: Escala) => void,
  onDelete: (id: string) => void,
  onAdd: () => void,
  onManageReminders: (e: Escala) => void,
  canEdit: boolean,
  canDelete: boolean,
  onBack?: () => void
}> = ({ escalas, onEdit, onDelete, onAdd, onManageReminders, canEdit, canDelete, onBack }) => {
  const [search, setSearch] = useState('');
  const filtered = escalas.filter(e => normalizeString(e.name).includes(normalizeString(search)));

  return (
    <div className="space-y-8">
      {onBack && (
        <div className="flex px-1">
          <button type="button" onClick={onBack} className="btn-back">
            <ArrowLeft size={18} />
            <span>VOLTAR</span>
          </button>
        </div>
      )}
      <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
            <Clock size={22} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
              Escalas de Serviço
            </h2>
            <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Total: {escalas.length} escalas cadastradas
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar escala por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white transition-all"
            />
          </div>
          {canEdit && (
            <button onClick={onAdd} className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-95 transition-all duration-200">
              <Plus size={16} strokeWidth={3} />
              <span>Nova Escala</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(escala => (
          <div key={escala.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <Clock size={16} />
                </div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase text-xs tracking-tight">{escala.name}</h3>
              </div>
              <div className="flex gap-1">
                {canEdit && (
                  <button
                    onClick={() => { onManageReminders(escala); }}
                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                    title="Configurar Lembretes"
                  >
                    <Bell size={14} />
                  </button>
                )}
                {canEdit && (
                  <button onClick={() => onEdit(escala)} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                    <Pencil size={14} />
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => onDelete(escala.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Horário da Escala</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{escala.startTime} ÀS {escala.endTime}</span>
                </div>
              </div>
              {escala.description && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">
                  {escala.description}
                </p>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 py-12 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <Clock size={40} className="mb-4 opacity-20" />
            <p className="font-black uppercase text-[10px] tracking-[0.2em]">Nenhuma escala encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

const EscalaForm: React.FC<{ initialData: Escala | null, onSave: (e: Escala) => void, onCancel: () => void, onDelete?: (id: string) => void, isLoading?: boolean }> = ({ initialData, onSave, onCancel, onDelete, isLoading }) => {
  const [formData, setFormData] = useState<Escala>(initialData || {
    id: crypto.randomUUID(),
    name: '',
    startTime: '07:00',
    endTime: '19:00',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div className="flex px-1">
        <button type="button" onClick={onCancel} className="btn-back">
          <ArrowLeft size={18} />
          <span>VOLTAR</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
            <Clock size={120} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded text-[10px] font-black uppercase tracking-widest">Configuração</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">{initialData ? 'Editar Escala' : 'Nova Escala de Serviço'}</h2>
            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">Defina o nome e horários da escala</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nome da Escala</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:text-white transition-all placeholder:text-slate-400 placeholder:font-normal"
                placeholder="EX: ESCALA 12X36 - DIA A"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Hora de Início</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:text-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Hora de Término</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:text-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Descrição / Observações (Opcional)</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:text-white transition-all placeholder:text-slate-400 placeholder:font-normal min-h-[100px]"
                placeholder="Detalhes adicionais sobre a escala..."
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-8 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              {initialData ? 'Atualizar Escala' : 'Salvar Escala'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EscalaReminderManager: React.FC<{
  escala: Escala,
  reminders: EscalaReminder[],
  onSave: (r: EscalaReminder) => void,
  onDelete: (id: string) => void,
  onBack: () => void,
  onTest?: (r: EscalaReminder) => void,
  isLoading: boolean
}> = ({ escala, reminders, onSave, onDelete, onBack, isLoading, onTest }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingReminder, setEditingReminder] = useState<EscalaReminder | null>(null);

  const defaultReminder: EscalaReminder = {
    id: crypto.randomUUID(),
    escalaId: escala.id,
    name: 'Lembrete de Encerramento',
    minutesBeforeEnd: 30,
    message: 'Atenção: A escala encerra em 30 minutos. Favor realizar a exportação dos relatórios.',
    actionType: 'NAVIGATE',
    actionPayload: { view: 'HISTORY' },
    isActive: true
  };

  const [formData, setFormData] = useState<EscalaReminder>(defaultReminder);

  const handleStartEdit = (reminder: EscalaReminder) => {
    setEditingReminder(reminder);
    setFormData({ ...reminder });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingReminder(null);
    setFormData(defaultReminder);
  };

  const handleToggleActive = (reminder: EscalaReminder) => {
    onSave({ ...reminder, isActive: !reminder.isActive });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex px-1">
        <button type="button" onClick={onBack} className="btn-back">
          <ArrowLeft size={18} />
          <span>VOLTAR</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600">
              <Clock size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Lembretes Automáticos</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{escala.name} ({escala.startTime} - {escala.endTime})</p>
            </div>
          </div>
          {!isAdding && (
            <button
              onClick={() => { setFormData({ ...defaultReminder, id: crypto.randomUUID() }); setIsAdding(true); }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
            >
              <Plus size={16} strokeWidth={3} /> Novo Lembrete
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/30 shadow-xl animate-in zoom-in-95 duration-200">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-4 flex items-center gap-2">
            {editingReminder ? <Pencil className="text-indigo-500" size={18} /> : <Plus className="text-indigo-500" size={18} />}
            {editingReminder ? 'Editar Lembrete' : 'Configurar Novo Lembrete'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Título do Lembrete</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Minutos antes do fim</label>
              <input
                type="number"
                value={formData.minutesBeforeEnd}
                onChange={e => setFormData({ ...formData, minutesBeforeEnd: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Tipo de Ação</label>
              <select
                value={formData.actionType}
                onChange={e => {
                  const val = e.target.value as 'MESSAGE' | 'NAVIGATE';
                  setFormData({
                    ...formData,
                    actionType: val,
                    actionPayload: val === 'NAVIGATE' ? { view: 'HISTORY' } : undefined
                  });
                }}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white appearance-none"
              >
                <option value="MESSAGE">Apenas Mensagem</option>
                <option value="NAVIGATE">Mensagem + Botão Exportar</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Mensagem da Notificação</label>
              <textarea
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white min-h-[80px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button onClick={handleCancel} className="px-6 py-2.5 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Cancelar</button>
            <button
              onClick={() => { onSave(formData); handleCancel(); }}
              className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
            >
              {editingReminder ? 'Atualizar' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {reminders.map(reminder => (
          <div key={reminder.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${reminder.isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                <Clock size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                  {reminder.name}
                  {!reminder.isActive && <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">Inativo</span>}
                </h4>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Gatilho: {reminder.minutesBeforeEnd} min antes do encerramento</p>
                <p className="text-[10px] text-slate-400 mt-1 italic leading-tight">"{reminder.message}"</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTest?.(reminder)}
                className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all"
                title="Testar Notificação"
              >
                <Megaphone size={18} />
              </button>
              <button
                onClick={() => handleStartEdit(reminder)}
                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                title="Editar Lembrete"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => handleToggleActive(reminder)}
                className={`p-2 rounded-lg transition-all ${reminder.isActive ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title={reminder.isActive ? "Desativar" : "Ativar"}
              >
                <CheckCircle size={18} />
              </button>
              <button
                onClick={() => onDelete(reminder.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {reminders.length === 0 && !isAdding && (
          <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <Bell size={40} className="mb-4 opacity-10" />
            <p className="text-xs font-black uppercase tracking-widest font-sans">Nenhum lembrete configurado</p>
            <button onClick={() => setIsAdding(true)} className="mt-4 text-[10px] font-black text-indigo-500 uppercase hover:underline">Configurar seu primeiro lembrete</button>
          </div>
        )}
      </div>
    </div>
  );
};
