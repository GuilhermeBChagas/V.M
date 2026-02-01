
export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  OPERADOR = 'OPERADOR',
  RONDA = 'RONDA',
  OUTROS = 'OUTROS'
}

export type PermissionKey =
  // Dashboard & General
  | 'VIEW_DASHBOARD'
  | 'VIEW_MAP'
  | 'VIEW_CHARTS'
  | 'VIEW_ANNOUNCEMENTS'

  // Incidents (R.A)
  | 'CREATE_INCIDENT'
  | 'VIEW_MY_INCIDENTS'
  | 'VIEW_ALL_INCIDENTS'
  | 'EDIT_INCIDENT'
  | 'APPROVE_INCIDENT'
  | 'DELETE_INCIDENT'

  // Loans (Cautelas)
  | 'CREATE_LOAN'
  | 'APPROVE_LOAN'
  | 'RETURN_LOAN'
  | 'VIEW_MY_LOANS'
  | 'VIEW_ALL_LOANS'

  // Assets (Inventário)
  | 'VIEW_ASSETS'
  | 'MANAGE_ASSETS'
  | 'DELETE_ASSETS'

  // Administration
  | 'MANAGE_USERS'
  | 'DELETE_USERS'
  | 'MANAGE_BUILDINGS'
  | 'MANAGE_SECTORS'
  | 'MANAGE_JOB_TITLES'
  | 'MANAGE_ALTERATION_TYPES'
  | 'MANAGE_ANNOUNCEMENTS'
  | 'ACCESS_TOOLS'
  | 'EXPORT_REPORTS';

export interface SystemPermissionMap {
  [key: string]: UserRole[];
}

export interface UserPermissionOverrides {
  [userId: string]: {
    [key in PermissionKey]?: boolean;
  };
}


export interface Sector {
  id: string;
  name: string;
}

export interface JobTitle {
  id: string;
  name: string;
}

export interface AlterationType {
  id: string;
  name: string;
  order?: number;
}

export interface User {
  id: string;
  name: string;
  cpf: string;
  matricula: string;
  userCode?: string; // Novo campo: Código de 1 a 99
  jobTitleId?: string; // Cargo/Função selecionável
  role: UserRole;
  status?: 'ACTIVE' | 'PENDING' | 'BLOCKED';
  email?: string;
  passwordHash?: string;
}

export interface Building {
  id: string;
  buildingNumber: string;
  name: string;
  address: string;
  sectorId: string;
  hasKey: boolean;
  hasAlarm: boolean;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  latitude?: string; // Coordenada Latitude
  longitude?: string; // Coordenada Longitude
}

export interface Incident {
  id: string;
  raCode: string;
  buildingId: string;
  userId: string;
  operatorName: string;
  vigilants: string;
  date: string;
  startTime: string;
  endTime: string;
  timestamp: string;
  created_at?: string; // Data real de criação no banco
  alterationType: string;
  description: string;
  aiAnalysis?: string;
  severity?: 'Baixa' | 'Média' | 'Alta';
  photoUrl?: string;
  photos?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedBy?: string;
  approvedAt?: string;
  isEdited?: boolean;
  editedBy?: string;
  lastEditedAt?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  isLocal?: boolean; // Flag para indicar que o dado só existe localmente
}

export interface Vehicle {
  id: string;
  model: string;         // Modelo
  plate: string;         // Placa
  prefix: string;        // Prefixo
  fleetNumber: string;   // Numero de Frota
  fuelType: string;      // Combustível
  department: string;    // Secretaria
  currentKm?: number;    // Quilometragem Atual
}

export interface Vest {
  id: string;
  number: string;        // Número
  size: string;          // Tamanho
}

export interface Radio {
  id: string;
  number: string;        // Número
  brand: string;         // Marca
  serialNumber: string;  // Numero de Serie
}

export interface Equipment {
  id: string;
  name: string;
  description: string;
  quantity: number;
}

export interface LoanRecord {
  id: string;
  batchId?: string; // ID do lote para agrupar itens
  operatorId: string; // Quem entregou
  receiverId: string; // Quem recebeu
  receiverName: string;
  assetType: 'VEHICLE' | 'VEST' | 'RADIO' | 'EQUIPMENT';
  assetId: string;
  assetDescription: string; // Snapshot do nome/modelo para histórico
  checkoutTime: string;
  returnTime?: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'REJECTED';
  isLocal?: boolean; // Flag para indicar que o dado só existe localmente

  // Metadados específicos (JSON no banco)
  meta?: {
    kmStart?: number;
    kmEnd?: number;
    fuelRefill?: boolean;
    fuelLiters?: number;
    fuelType?: string;
    fuelKm?: number;
    notes?: string;
  };
}

export interface SystemLog {
  id: string;
  userId: string;
  userName: string;
  action: 'LOGIN' | 'LOGOUT' | 'CREATE_INCIDENT' | 'UPDATE_INCIDENT' | 'APPROVE_INCIDENT' | 'DELETE_RESOURCE' | 'USER_REGISTER' | 'CREATE_ASSET' | 'UPDATE_ASSET' | 'DELETE_ASSET' | 'LOAN_CREATE' | 'LOAN_CONFIRM' | 'LOAN_RETURN' | 'UPDATE_PERMISSIONS' | 'MANAGE_SETTINGS' | 'DATABASE_TOOLS';
  details: string;
  timestamp: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  senderId: string;
  senderName?: string;
  targetType: 'USER' | 'GROUP' | 'BROADCAST';
  targetId?: string; // Para USER: userId, Para GROUP: string da Role (ADMIN, OPERADOR, etc)
  priority: 'INFO' | 'IMPORTANT' | 'URGENT';
  expiresAt?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  isRead?: boolean;
}

export interface AnnouncementRead {
  announcementId: string;
  userId: string;
  readAt: string;
}

export type ViewState =
  | 'DASHBOARD'
  | 'BUILDINGS' | 'BUILDING_FORM'
  | 'USERS' | 'USER_FORM'
  | 'SECTORS' | 'SECTOR_FORM'
  | 'JOB_TITLES' | 'JOB_TITLE_FORM'
  | 'ALTERATION_TYPES' | 'ALTERATION_TYPE_FORM'
  | 'NEW_RECORD' | 'HISTORY' | 'INCIDENT_DETAIL' | 'PENDING_APPROVALS'
  | 'CHARTS' | 'LOGS' | 'TOOLS' | 'DATABASE_TOOLS' | 'PERMISSIONS_TOOLS' | 'PROFILE' | 'SYSTEM_INFO'
  | 'VEHICLES' | 'VEHICLE_FORM'
  | 'VESTS' | 'VEST_FORM'
  | 'RADIOS' | 'RADIO_FORM'
  | 'EQUIPMENTS' | 'EQUIPMENT_FORM'
  | 'LOANS'
  | 'LOAN_HISTORY'
  | 'ANNOUNCEMENTS'
  | 'IMPORT_EXPORT'
  | 'MAP';
