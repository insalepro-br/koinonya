
import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { 
  LayoutDashboard, 
  Columns, 
  Zap, 
  Settings, 
  Search, 
  LogOut,
  Menu,
  X,
  Shield,
  CalendarDays,
  Users,
  Church as ChurchIcon,
  QrCode,
  Flame,
  DollarSign,
  ChevronDown,
  Edit3,
  Moon,
  Phone,
  Layers,
  GraduationCap,
  CalendarCheck,
  UserCheck,
  HeartHandshake,
  Ticket
} from 'lucide-react';
import MemberModal from './components/MemberModal';
import EventModal from './components/EventModal';
import LoginScreen from './components/LoginScreen';
import UserProfileModal from './components/UserProfileModal';
import SubscriptionGate from './components/SubscriptionGate';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';

// Módulos carregados sob demanda: cada um vira um chunk próprio no build.
const KanbanBoard = lazy(() => import('./components/KanbanBoard'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const AutomationSettings = lazy(() => import('./components/AutomationSettings'));
const ScheduleModule = lazy(() => import('./components/ScheduleModule'));
const ContactsModule = lazy(() => import('./components/ContactsModule'));
const CellsModule = lazy(() => import('./components/CellsModule'));
const FinancialModule = lazy(() => import('./components/FinancialModule'));
const ChurchModule = lazy(() => import('./components/ChurchModule'));
const TeamModule = lazy(() => import('./components/TeamModule'));
const SettingsModule = lazy(() => import('./components/SettingsModule'));
const PublicVisitorCheckin = lazy(() => import('./components/PublicVisitorCheckin'));
const VisitorQrModal = lazy(() => import('./components/VisitorQrModal'));
const SaaSManagementModule = lazy(() => import('./components/SaaSManagementModule'));
const DiscipleshipModule = lazy(() => import('./components/DiscipleshipModule'));
const MinistriesModule = lazy(() => import('./components/MinistriesModule'));
const CheckinModule = lazy(() => import('./components/CheckinModule'));
const PastoralCareModule = lazy(() => import('./components/PastoralCareModule'));
const EventsHubModule = lazy(() => import('./components/EventsHubModule'));
const PublicChurchPortal = lazy(() => import('./components/PublicChurchPortal'));

const ModuleFallback = ({ fullScreen = false }: { fullScreen?: boolean }) => (
  <div className={`${fullScreen ? 'h-screen' : 'h-full'} w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900`}>
    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
  </div>
);
import { Member, MemberStage, SystemUser, ScheduleEvent, EventType, Organization, PipelineStage, Church, UserRole, Cell, CellMeeting, AutomationRule, FinancialTransaction, FinancialCampaign, AccessLevel, UserPresenceStatus, DiscipleshipTrack, MemberTrackProgress, MessageLog, BroadcastCampaign, Ministry, MinistrySchedule, ServiceCheckin, PrayerRequest, PastoralVisit, SaaSInvoice, ChurchEvent, EventRegistration } from './types';
import { DEFAULT_STAGES, DEFAULT_ACCESS_LEVELS, ROLE_TRANSLATIONS, USER_STATUS_CONFIG } from './constants';
import { KoinoniaDB } from './services/db';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut, updatePassword } from 'firebase/auth';

const navItems = [
  { id: 'analytics', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'kanban', label: 'Pipeline', icon: <Columns className="w-5 h-5" /> },
  { id: 'contacts', label: 'Contatos', icon: <Users className="w-5 h-5" /> },
  { id: 'discipleship', label: 'Discipulado', icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'cells', label: 'Células', icon: <Flame className="w-5 h-5" /> },
  { id: 'ministries', label: 'Ministérios', icon: <CalendarCheck className="w-5 h-5" /> },
  { id: 'checkin', label: 'Check-in & Kids', icon: <UserCheck className="w-5 h-5" /> },
  { id: 'pastoral', label: 'Cuidado Pastoral', icon: <HeartHandshake className="w-5 h-5" /> },
  { id: 'events', label: 'Eventos & Portal', icon: <Ticket className="w-5 h-5" /> },
  { id: 'finance', label: 'Financeiro', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'agenda', label: 'Agenda', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'church', label: 'Igreja', icon: <ChurchIcon className="w-5 h-5" /> },
  { id: 'team', label: 'Equipe', icon: <Shield className="w-5 h-5" /> },
  { id: 'saas', label: 'Gestão SaaS', icon: <Layers className="w-5 h-5" /> },
  { id: 'automation', label: 'IA & Automação', icon: <Zap className="w-5 h-5" /> },
  { id: 'settings', label: 'Ajustes', icon: <Settings className="w-5 h-5" /> },
];

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('analytics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('koinonia_theme') === 'dark');

  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [team, setTeam] = useState<SystemUser[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [campaigns, setCampaigns] = useState<FinancialCampaign[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [discipleshipTracks, setDiscipleshipTracks] = useState<DiscipleshipTrack[]>([]);
  const [trackProgressList, setTrackProgressList] = useState<MemberTrackProgress[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [broadcastCampaigns, setBroadcastCampaigns] = useState<BroadcastCampaign[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [ministrySchedules, setMinistrySchedules] = useState<MinistrySchedule[]>([]);
  const [serviceCheckins, setServiceCheckins] = useState<ServiceCheckin[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [pastoralVisits, setPastoralVisits] = useState<PastoralVisit[]>([]);
  const [orgInvoices, setOrgInvoices] = useState<SaaSInvoice[]>([]);
  const [allSaaSInvoices, setAllSaaSInvoices] = useState<SaaSInvoice[]>([]);
  const [churchEvents, setChurchEvents] = useState<ChurchEvent[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [isVisitorQrOpen, setIsVisitorQrOpen] = useState(false);
  const [isCheckinRoute, setIsCheckinRoute] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('checkin') === 'true' || params.get('v') === 'checkin' || window.location.pathname.startsWith('/checkin');
  });
  const [isPortalRoute, setIsPortalRoute] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('portal') === 'true' || params.get('v') === 'portal' || window.location.pathname.startsWith('/portal');
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>(DEFAULT_ACCESS_LEVELS);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const seededModulesRef = useRef<Set<string>>(new Set());

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  // Sync access levels from organization
  useEffect(() => {
    if (organization?.access_levels && organization.access_levels.length > 0) {
      setAccessLevels(organization.access_levels);
    }
  }, [organization]);

  // --- ACCESS LEVELS (NÍVEIS DE ACESSO & PERMISSÕES) ---
  const handleSaveAccessLevel = async (newLevel: AccessLevel) => {
    if (!organization) return;
    const exists = accessLevels.some(l => l.id === newLevel.id);
    const updated = exists 
      ? accessLevels.map(l => l.id === newLevel.id ? newLevel : l)
      : [...accessLevels, newLevel];
    
    setAccessLevels(updated);
    const updatedOrg = { ...organization, access_levels: updated };
    setOrganization(updatedOrg);
    await KoinoniaDB.updateOrganizationFields(organization.id, { access_levels: updated });
  };

  const handleDeleteAccessLevel = async (levelId: string) => {
    if (!organization) return;
    const updated = accessLevels.filter(l => l.id !== levelId);
    setAccessLevels(updated);
    const updatedOrg = { ...organization, access_levels: updated };
    setOrganization(updatedOrg);
    await KoinoniaDB.updateOrganizationFields(organization.id, { access_levels: updated });
  };

  const handleResetAccessLevels = async () => {
    if (!organization) return;
    setAccessLevels(DEFAULT_ACCESS_LEVELS);
    const updatedOrg = { ...organization, access_levels: DEFAULT_ACCESS_LEVELS };
    setOrganization(updatedOrg);
    await KoinoniaDB.updateOrganizationFields(organization.id, { access_levels: DEFAULT_ACCESS_LEVELS });
  };

  // --- USER PROFILE (EDITAR MEU PERFIL) ---
  const handleSaveUserProfile = async (updatedData: Partial<SystemUser>) => {
    if (!currentUser) return;
    const { password, ...profileUpdates } = updatedData;
    if (password) {
      if (!auth.currentUser) {
        throw new Error('Sessão de autenticação expirada. Faça login novamente.');
      }
      try {
        await updatePassword(auth.currentUser, password);
      } catch (err: any) {
        if (err?.code === 'auth/requires-recent-login') {
          throw new Error('Por segurança, saia e faça login novamente antes de alterar sua senha.');
        }
        throw new Error(err?.message || 'Não foi possível atualizar a senha.');
      }
    }

    const updated: SystemUser = {
      ...currentUser,
      ...profileUpdates
    };
    delete (updated as any).password;
    setCurrentUser(updated);
    await KoinoniaDB.saveUserProfile(updated);
    setTeam(prev => prev.map(u => u.id === updated.id ? updated : u));
  };

  const handleUpdateStatus = async (newStatus: UserPresenceStatus) => {
    if (!currentUser) return;
    const updated: SystemUser = {
      ...currentUser,
      status: newStatus
    };
    setCurrentUser(updated);
    await KoinoniaDB.saveUserProfile(updated);
    setTeam(prev => prev.map(u => u.id === updated.id ? updated : u));
  };

  // --- CHURCH ---
  const handleSaveChurch = async (churchData: Church) => {
    await KoinoniaDB.saveChurch(churchData);
  };

  // --- CELLS (CÉLULAS / PEQUENOS GRUPOS) ---
  const handleSaveCell = async (cellData: Partial<Cell>) => {
    if (!currentUser) return;
    const newCell: Cell = {
      ...cellData,
      id: cellData.id || Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: cellData.church_id || currentUser.church_id || 'main',
      created_at: cellData.created_at || new Date(),
      active: cellData.active !== false
    } as Cell;
    await KoinoniaDB.saveCell(newCell);
  };

  const handleDeleteCell = async (cellId: string) => {
    await KoinoniaDB.deleteCell(cellId);
  };

  const handleSaveCellMeeting = async (meetingData: Partial<CellMeeting>) => {
    if (!currentUser) return;
    const newMeeting: CellMeeting = {
      ...meetingData,
      id: meetingData.id || Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: meetingData.church_id || currentUser.church_id || 'main',
      created_at: new Date()
    } as CellMeeting;
    await KoinoniaDB.saveCellMeeting(newMeeting);
  };

  const handleSaveAutomationRule = async (ruleData: Partial<AutomationRule>) => {
    if (!currentUser) return;
    await KoinoniaDB.saveAutomationRule({
      ...(ruleData as AutomationRule),
      id: ruleData.id || Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: currentUser.church_id || 'main',
      created_at: ruleData.created_at || new Date()
    });
  };

  const handleSaveMessageLog = async (logData: Partial<MessageLog>) => {
    if (!currentUser) return;
    await KoinoniaDB.saveMessageLog({
      ...(logData as MessageLog),
      id: logData.id || 'log_' + Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: logData.church_id || currentUser.church_id || 'main',
      sent_by_id: logData.sent_by_id || currentUser.id,
      sent_by_name: logData.sent_by_name || currentUser.name,
      sent_at: logData.sent_at || new Date(),
      status: logData.status || 'OPENED_WA'
    });
  };

  const handleSaveBroadcastCampaign = async (campData: Partial<BroadcastCampaign>) => {
    if (!currentUser) return;
    await KoinoniaDB.saveBroadcastCampaign({
      ...(campData as BroadcastCampaign),
      id: campData.id || 'camp_' + Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: campData.church_id || currentUser.church_id || 'main',
      created_by_name: campData.created_by_name || currentUser.name,
      created_at: campData.created_at || new Date()
    });
  };

  const handleDeleteBroadcastCampaign = async (id: string) => {
    await KoinoniaDB.deleteBroadcastCampaign(id);
  };

  // --- MINISTÉRIOS & ESCALAS (ETAPA 3) ---
  const handleSaveMinistry = async (minData: Partial<Ministry>) => {
    if (!currentUser) return;
    await KoinoniaDB.saveMinistry({
      ...(minData as Ministry),
      id: minData.id || 'min_' + Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: minData.church_id || currentUser.church_id || 'main',
      active: minData.active !== false,
      created_at: minData.created_at || new Date()
    });
  };

  const handleDeleteMinistry = async (id: string) => {
    await KoinoniaDB.deleteMinistry(id);
  };

  const handleSaveMinistrySchedule = async (schedData: Partial<MinistrySchedule>) => {
    if (!currentUser) return;
    await KoinoniaDB.saveMinistrySchedule({
      ...(schedData as MinistrySchedule),
      id: schedData.id || 'sched_' + Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: schedData.church_id || currentUser.church_id || 'main',
      created_at: schedData.created_at || new Date()
    });
  };

  const handleDeleteMinistrySchedule = async (id: string) => {
    await KoinoniaDB.deleteMinistrySchedule(id);
  };

  // --- CHECK-IN DE CULTOS & KOINONYA KIDS (ETAPA 4) ---
  const handleSaveServiceCheckin = async (checkinData: Partial<ServiceCheckin>) => {
    if (!currentUser) return;
    const isNew = !checkinData.id || !serviceCheckins.some(c => c.id === checkinData.id);
    const payload: ServiceCheckin = {
      ...(checkinData as ServiceCheckin),
      id: checkinData.id || 'chk_' + Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: checkinData.church_id || currentUser.church_id || 'main',
      event_title: checkinData.event_title || 'Culto de Celebração',
      service_date: checkinData.service_date || new Date(),
      checkin_type: checkinData.checkin_type || 'SERVICE',
      person_name: checkinData.person_name || 'Participante',
      status: checkinData.status || 'CHECKED_IN',
      checked_in_at: checkinData.checked_in_at || new Date(),
      created_at: checkinData.created_at || new Date()
    };
    await KoinoniaDB.saveServiceCheckin(payload);

    // Atualiza atividade e engajamento do membro quando registra presença
    if (isNew && payload.person_id) {
      const target = members.find(m => m.id === payload.person_id);
      if (target) {
        await KoinoniaDB.saveMember({
          ...target,
          last_activity: new Date(),
          engagement_score: Math.min(100, (target.engagement_score ?? 50) + 3)
        });
      }
    }
  };

  const handleDeleteServiceCheckin = async (id: string) => {
    await KoinoniaDB.deleteServiceCheckin(id);
  };

  const handleCreateVisitorFromCheckin = async (memberData: Partial<Member>) => {
    if (!currentUser) return;
    const newMember: Member = {
      ...memberData,
      id: memberData.id || Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: memberData.church_id || currentUser.church_id || 'main',
      registration_date: new Date(),
      last_activity: new Date(),
      engagement_score: 55,
      stage: memberData.stage || MemberStage.NEW,
      active: true
    } as Member;
    await KoinoniaDB.saveMember(newMember);
    return newMember;
  };

  // --- CUIDADO PASTORAL, ORAÇÃO & VISITAS (ETAPA 5) ---
  const handleSavePrayerRequest = async (reqData: Partial<PrayerRequest>) => {
    if (!currentUser) return;
    await KoinoniaDB.savePrayerRequest({
      ...(reqData as PrayerRequest),
      id: reqData.id || 'pray_' + Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: reqData.church_id || currentUser.church_id || 'main',
      category: reqData.category || 'OTHER',
      urgency: reqData.urgency || 'NORMAL',
      privacy: reqData.privacy || 'LEADERS_ONLY',
      status: reqData.status || 'RECEIVED',
      prayer_count: typeof reqData.prayer_count === 'number' ? reqData.prayer_count : 0,
      source: reqData.source || 'MANUAL',
      created_at: reqData.created_at || new Date()
    });
  };

  const handleDeletePrayerRequest = async (id: string) => {
    await KoinoniaDB.deletePrayerRequest(id);
  };

  const handleSavePastoralVisit = async (visitData: Partial<PastoralVisit>) => {
    if (!currentUser) return;
    const payload: PastoralVisit = {
      ...(visitData as PastoralVisit),
      id: visitData.id || 'vis_' + Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: visitData.church_id || currentUser.church_id || 'main',
      visit_type: visitData.visit_type || 'HOME_VISIT',
      scheduled_date: visitData.scheduled_date || new Date(),
      status: visitData.status || 'SCHEDULED',
      created_by_name: visitData.created_by_name || currentUser.name,
      created_at: visitData.created_at || new Date()
    };
    await KoinoniaDB.savePastoralVisit(payload);

    if (payload.status === 'COMPLETED' && payload.member_id) {
      const target = members.find(m => m.id === payload.member_id);
      if (target) {
        await KoinoniaDB.saveMember({
          ...target,
          last_activity: new Date(),
          engagement_score: Math.min(100, (target.engagement_score ?? 50) + 5)
        });
      }
    }
  };

  const handleDeletePastoralVisit = async (id: string) => {
    await KoinoniaDB.deletePastoralVisit(id);
  };

  // --- EVENTOS, INSCRIÇÕES & PORTAL DA IGREJA (ETAPA 7) ---
  const handleSaveChurchEvent = async (evData: Partial<ChurchEvent>) => {
    if (!currentUser) return;
    await KoinoniaDB.saveChurchEvent({
      ...(evData as ChurchEvent),
      id: evData.id || 'cev_' + Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: evData.church_id || currentUser.church_id || 'main',
      category: evData.category || 'CONFERENCE',
      start_date: evData.start_date || new Date(),
      start_time: evData.start_time || '19:30',
      location: evData.location || 'Templo Principal',
      capacity: Number(evData.capacity) || 100,
      registration_fee: Number(evData.registration_fee) || 0,
      allow_public_registration: evData.allow_public_registration !== false,
      status: evData.status || 'OPEN',
      active: evData.active !== false,
      created_by_name: evData.created_by_name || currentUser.name,
      created_at: evData.created_at || new Date()
    });
  };

  const handleDeleteChurchEvent = async (id: string) => {
    await KoinoniaDB.deleteChurchEvent(id);
  };

  const handleSaveEventRegistration = async (regData: Partial<EventRegistration>) => {
    if (!currentUser) return;
    const payload: EventRegistration = {
      ...(regData as EventRegistration),
      id: regData.id || 'reg_' + Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: regData.church_id || currentUser.church_id || 'main',
      ticket_code: regData.ticket_code || `KNY-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      payment_status: regData.payment_status || 'FREE',
      amount_paid: Number(regData.amount_paid) || 0,
      status: regData.status || 'CONFIRMED',
      source: regData.source || 'MANUAL',
      checked_in_at: regData.checked_in_at || null,
      created_at: regData.created_at || new Date()
    };
    await KoinoniaDB.saveEventRegistration(payload);
  };

  const handleDeleteEventRegistration = async (id: string) => {
    await KoinoniaDB.deleteEventRegistration(id);
  };

  // --- GESTÃO FINANCEIRA (MÓDULO 6) ---
  const handleSaveTransaction = async (txData: Partial<FinancialTransaction>) => {
    if (!currentUser) return;
    const newTx: FinancialTransaction = {
      ...txData,
      id: txData.id || Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: txData.church_id || currentUser.church_id || 'main',
      date: txData.date || new Date(),
      created_at: new Date()
    } as FinancialTransaction;
    await KoinoniaDB.saveTransaction(newTx);
  };

  const handleDeleteTransaction = async (id: string) => {
    await KoinoniaDB.deleteTransaction(id);
  };

  const handleSaveCampaign = async (campaignData: Partial<FinancialCampaign>) => {
    if (!currentUser) return;
    const newCamp: FinancialCampaign = {
      ...campaignData,
      id: campaignData.id || Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: campaignData.church_id || currentUser.church_id || 'main',
      start_date: campaignData.start_date || new Date(),
      active: campaignData.active !== false,
      created_at: new Date()
    } as FinancialCampaign;
    await KoinoniaDB.saveCampaign(newCamp);
  };

  const handleDeleteCampaign = async (id: string) => {
    await KoinoniaDB.deleteCampaign(id);
  };

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  // Role-Based Access Control (RBAC): Super Admin, Church Admin, or Pastor have full management access
  const isManagerOrAdmin = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.PASTOR ||
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.permissions?.includes('admin')
    );
  }, [currentUser]);

  // Navigation visible items based on user role (protects Equipe, Igreja, Financeiro e SaaS de Voluntários/Membros)
  const visibleNavItems = useMemo(() => {
    return navItems.filter(item => {
      if (item.id === 'team' || item.id === 'church' || item.id === 'finance' || item.id === 'saas') {
        return isManagerOrAdmin;
      }
      return true;
    });
  }, [isManagerOrAdmin]);

  // Active members for pipeline / kanban / schedule (archived records remain safe in Soft-Delete Recycle Bin)
  const activeMembers = useMemo(() => {
    return members.filter(m => m.active !== false);
  }, [members]);

  // Guard active tab if user role does not have access
  useEffect(() => {
    if (currentUser && !isManagerOrAdmin && (activeTab === 'team' || activeTab === 'church' || activeTab === 'finance' || activeTab === 'saas')) {
      setActiveTab('kanban');
    }
  }, [currentUser, isManagerOrAdmin, activeTab]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('koinonia_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('koinonia_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          console.log("Auth state changed: user logged in", user.uid);
          const profile = await KoinoniaDB.getUserProfile(user.uid);
          if (profile) {
            setCurrentUser(profile);
            const org = await KoinoniaDB.getOrganization(profile.org_id);
            setOrganization(org);
            setIsLoggedIn(true);
          } else {
            console.warn("Profile not found for authenticated user:", user.uid);
            // Don't set isLoggedIn(false) yet, let LoginScreen handle registration completion if auth is present
            // setIsLoggedIn(false); // Removed to avoid race with LoginScreen
          }
        } else {
          setIsLoggedIn(false);
          setCurrentUser(null);
          setOrganization(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Data Subscriptions
  useEffect(() => {
    if (!currentUser || !isLoggedIn) return;

    const shouldAutoSeed = (mod: string) => {
      // Dados de demonstração só com VITE_DEMO_SEED=true (nunca em produção).
      if (import.meta.env.VITE_DEMO_SEED !== 'true') return false;
      const key = `koinonya_seeded_${currentUser.org_id}_${mod}`;
      if (seededModulesRef.current.has(key) || localStorage.getItem(key) === '1') {
        return false;
      }
      seededModulesRef.current.add(key);
      localStorage.setItem(key, '1');
      return true;
    };

    const unsubMembers = KoinoniaDB.subscribeMembers(currentUser.org_id, setMembers);
    const unsubEvents = KoinoniaDB.subscribeEvents(currentUser.org_id, setEvents);
    const unsubTeam = KoinoniaDB.subscribeTeam(currentUser.org_id, setTeam);
    const unsubChurches = KoinoniaDB.subscribeChurches(currentUser.org_id, setChurches);
    const unsubCells = KoinoniaDB.subscribeCells(currentUser.org_id, (loadedCells) => {
      setCells(loadedCells);
      if (loadedCells.length === 0 && shouldAutoSeed('cells')) {
        KoinoniaDB.seedInitialCells(currentUser.org_id, currentUser.church_id || 'main').catch(console.warn);
      }
    });
    const unsubRules = KoinoniaDB.subscribeAutomationRules(currentUser.org_id, (loadedRules) => {
      setAutomationRules(loadedRules);
      if (loadedRules.length === 0 && shouldAutoSeed('rules')) {
        KoinoniaDB.seedDefaultAutomationRules(currentUser.org_id, currentUser.church_id || 'main').catch(console.warn);
      }
    });
    const unsubTx = KoinoniaDB.subscribeTransactions(currentUser.org_id, (loaded) => {
      setTransactions(loaded);
      if (loaded.length === 0 && shouldAutoSeed('finance')) {
        KoinoniaDB.seedInitialFinancialData(currentUser.org_id, currentUser.church_id || 'main').catch(console.warn);
      }
    });
    const unsubCamp = KoinoniaDB.subscribeCampaigns(currentUser.org_id, setCampaigns);
    const unsubOrgs = currentUser.role === UserRole.SUPER_ADMIN
      ? KoinoniaDB.subscribeAllOrganizations((loadedOrgs) => {
          setOrganizations(loadedOrgs);
          const current = loadedOrgs.find(o => o.id === currentUser.org_id);
          if (current) {
            setOrganization(current);
          }
          if (loadedOrgs.length <= 1 && shouldAutoSeed('tenants')) {
            KoinoniaDB.seedInitialTenantsIfEmpty(organization);
          }
        })
      : KoinoniaDB.subscribeOrganization(currentUser.org_id, (loadedOrg) => {
          if (loadedOrg) {
            setOrganization(loadedOrg);
            setOrganizations([loadedOrg]);
          }
        });
    const unsubTracks = KoinoniaDB.subscribeDiscipleshipTracks(currentUser.org_id, (loadedTracks) => {
      setDiscipleshipTracks(loadedTracks);
      if (loadedTracks.length === 0 && shouldAutoSeed('tracks')) {
        KoinoniaDB.seedInitialDiscipleshipTracks(currentUser.org_id, currentUser.church_id || 'main').catch(console.warn);
      }
    });
    const unsubProgress = KoinoniaDB.subscribeMemberTrackProgress(currentUser.org_id, setTrackProgressList);
    const unsubMessageLogs = KoinoniaDB.subscribeMessageLogs(currentUser.org_id, setMessageLogs);
    const unsubBroadcastCampaigns = KoinoniaDB.subscribeBroadcastCampaigns(currentUser.org_id, setBroadcastCampaigns);
    const unsubMinistries = KoinoniaDB.subscribeMinistries(currentUser.org_id, (loadedMinistries) => {
      setMinistries(loadedMinistries);
      if (loadedMinistries.length === 0 && shouldAutoSeed('ministries')) {
        KoinoniaDB.seedInitialMinistries(currentUser.org_id, currentUser.church_id || 'main').catch(console.warn);
      }
    });
    const unsubMinistrySchedules = KoinoniaDB.subscribeMinistrySchedules(currentUser.org_id, setMinistrySchedules);
    const unsubServiceCheckins = KoinoniaDB.subscribeServiceCheckins(currentUser.org_id, setServiceCheckins);
    const unsubPrayerRequests = KoinoniaDB.subscribePrayerRequests(currentUser.org_id, setPrayerRequests);
    const unsubPastoralVisits = KoinoniaDB.subscribePastoralVisits(currentUser.org_id, setPastoralVisits);
    const unsubChurchEvents = KoinoniaDB.subscribeChurchEvents(currentUser.org_id, (loadedEvents) => {
      setChurchEvents(loadedEvents);
      if (loadedEvents.length === 0 && shouldAutoSeed('church_events')) {
        KoinoniaDB.seedInitialChurchEvents(currentUser.org_id, currentUser.church_id || 'main').catch(console.warn);
      }
    });
    const unsubEventRegistrations = KoinoniaDB.subscribeEventRegistrations(currentUser.org_id, setEventRegistrations);
    const unsubOrgInvoices = KoinoniaDB.subscribeOrgInvoices(currentUser.org_id, setOrgInvoices);
    const unsubAllInvoices = currentUser.role === UserRole.SUPER_ADMIN
      ? KoinoniaDB.subscribeAllSaaSInvoices(setAllSaaSInvoices)
      : () => {};

    return () => {
      unsubMembers();
      unsubEvents();
      unsubTeam();
      unsubChurches();
      unsubCells();
      unsubRules();
      unsubTx();
      unsubCamp();
      unsubOrgs();
      unsubTracks();
      unsubProgress();
      unsubMessageLogs();
      unsubBroadcastCampaigns();
      unsubMinistries();
      unsubMinistrySchedules();
      unsubServiceCheckins();
      unsubPrayerRequests();
      unsubPastoralVisits();
      unsubChurchEvents();
      unsubEventRegistrations();
      unsubOrgInvoices();
      unsubAllInvoices();
    };
  }, [currentUser, isLoggedIn]);

  const handleLoginSuccess = async (user: SystemUser) => {
    console.log("Login success handler called for:", user.id);
    setCurrentUser(user);
    try {
      const org = await KoinoniaDB.getOrganization(user.org_id);
      setOrganization(org);
    } catch (e) {
      console.error("Failed to load organization during login:", e);
    }
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    setCurrentUser(null);
    setOrganization(null);
    setOrganizations([]);
  };

  // --- CRUD MEMBROS (CONTATOS) ---
  const handleSaveMember = async (memberData: Partial<Member>) => {
    if (!currentUser) return;
    try {
      const newMember: Member = {
        ...memberData,
        id: memberData.id || Math.random().toString(36).substr(2, 9),
        org_id: currentUser.org_id,
        church_id: memberData.church_id || currentUser.church_id || 'main',
        registration_date: memberData.registration_date || new Date(),
        last_activity: new Date(),
        engagement_score: memberData.engagement_score ?? 50,
        stage: memberData.stage || MemberStage.NEW,
        active: memberData.active !== false
      } as Member;

      await KoinoniaDB.saveMember(newMember);
      setIsMemberModalOpen(false);
      setSelectedMember(null);
    } catch (err) {
      console.error("Erro ao salvar membro:", err);
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await KoinoniaDB.deleteMember(id, currentUser?.email || currentUser?.name);
      if (selectedMember?.id === id) setIsMemberModalOpen(false);
    } catch (err) {
      console.error("Erro ao arquivar membro:", err);
    }
  };

  const handleRestoreMember = async (id: string) => {
    try {
      await KoinoniaDB.restoreMember(id);
    } catch (err) {
      console.error("Erro ao restaurar membro:", err);
    }
  };

  const handlePermanentDeleteMember = async (id: string) => {
    try {
      await KoinoniaDB.permanentDeleteMember(id);
      if (selectedMember?.id === id) setIsMemberModalOpen(false);
    } catch (err) {
      console.error("Erro ao excluir permanentemente membro:", err);
    }
  };

  const handleImportMembers = async (importedList: Member[]) => {
    if (!currentUser || importedList.length === 0) return;
    try {
      for (const m of importedList) {
        await KoinoniaDB.saveMember({
          ...m,
          org_id: currentUser.org_id,
          church_id: m.church_id || currentUser.church_id || 'main',
          registration_date: m.registration_date || new Date(),
          last_activity: new Date(),
          engagement_score: m.engagement_score || 50,
          active: true
        });
      }
    } catch (err) {
      console.error("Erro ao importar membros em lote:", err);
    }
  };

  // --- CRUD EVENTOS (AGENDA) ---
  const handleSaveEvent = async (eventData: Partial<ScheduleEvent>) => {
    if (!currentUser) return;
    const newEvent: ScheduleEvent = {
      ...eventData,
      id: eventData.id || Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: eventData.church_id || currentUser.church_id,
      created_at: eventData.created_at || new Date(),
      start_date: eventData.start_date ? new Date(eventData.start_date) : new Date(),
      end_date: eventData.end_date ? new Date(eventData.end_date) : new Date(),
    } as ScheduleEvent;

    await KoinoniaDB.saveEvent(newEvent);
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await KoinoniaDB.deleteEvent(id);
      if (selectedEvent?.id === id) {
        setIsEventModalOpen(false);
        setSelectedEvent(null);
      }
    } catch (err) {
      console.error("Erro ao excluir agendamento:", err);
    }
  };

  // --- CRUD EQUIPE (USUÁRIOS) ---
  const handleSaveTeamMember = async (userData: Partial<SystemUser>) => {
    if (!currentUser) return;
    const newUser: SystemUser = {
      ...userData,
      id: userData.id || Math.random().toString(36).substr(2, 9),
      org_id: currentUser.org_id,
      church_id: userData.church_id || currentUser.church_id,
      permissions: userData.permissions || ['standard'],
    } as SystemUser;

    await KoinoniaDB.saveUserProfile(newUser);
  };

  const handleQuickAddTask = (member: Member) => {
    if (!currentUser) return;
    setSelectedEvent({
      id: '',
      title: `Acomp: ${member.name}`,
      description: `Acompanhamento agendado via pipeline.`,
      type: EventType.FOLLOW_UP,
      start_date: new Date(),
      end_date: new Date(new Date().getTime() + 30 * 60 * 1000),
      member_id: member.id,
      responsible_id: member.responsible_leader_id || currentUser.id,
      church_id: member.church_id,
      org_id: currentUser.org_id,
      created_at: new Date()
    } as ScheduleEvent);
    setIsEventModalOpen(true);
  };

  const pipelineStages: PipelineStage[] = organization?.pipeline_stages && organization.pipeline_stages.length > 0
    ? organization.pipeline_stages
    : DEFAULT_STAGES;

  const handleUpdatePipelineStages = async (
    newStages: PipelineStage[],
    memberMigrations?: { fromStageId: string; toStageId: string }[]
  ) => {
    if (!currentUser || !organization) return;
    try {
      if (memberMigrations && memberMigrations.length > 0) {
        for (const migration of memberMigrations) {
          const affected = members.filter(m => m.stage === migration.fromStageId);
          for (const m of affected) {
            await KoinoniaDB.saveMember({
              ...m,
              stage: migration.toStageId,
              last_activity: new Date()
            });
          }
        }
      }

      const updatedOrg: Organization = {
        ...organization,
        pipeline_stages: newStages
      };
      setOrganization(updatedOrg);
      await KoinoniaDB.updateOrganizationFields(organization.id, { pipeline_stages: newStages });
    } catch (err) {
      console.error("Erro ao atualizar etapas do pipeline:", err);
      throw err;
    }
  };

  const moveMember = async (id: string, nextStage: string) => {
    const member = members.find(m => m.id === id);
    if (member) {
      await KoinoniaDB.saveMember({ ...member, stage: nextStage, last_activity: new Date() });
    }
  };

  const handleSeedDemoData = async () => {
    if (!currentUser) return;
    try {
      await KoinoniaDB.seedInitialMembers(currentUser.org_id, currentUser.church_id || 'main');
    } catch (e) {
      console.error("Failed to seed initial members:", e);
    }
  };

  const currentChurch = churches.find(c => c.id === currentUser?.church_id) || churches[0] || null;

  // Render standalone public visitor checkin if accessed via public link or QR code
  if (isCheckinRoute) {
    const params = new URLSearchParams(window.location.search);
    return (
      <Suspense fallback={<ModuleFallback fullScreen />}>
        <PublicVisitorCheckin 
          churchId={params.get('churchId') || params.get('church') || currentUser?.church_id || undefined}
          orgId={params.get('orgId') || params.get('org') || currentUser?.org_id || undefined}
          onExitCheckin={() => {
            window.history.pushState({}, '', window.location.pathname);
            setIsCheckinRoute(false);
          }}
        />
      </Suspense>
    );
  }

  // Render standalone public community portal (Events, Online Registration & Prayer)
  if (isPortalRoute) {
    const params = new URLSearchParams(window.location.search);
    return (
      <Suspense fallback={<ModuleFallback fullScreen />}>
        <PublicChurchPortal
          churchId={params.get('churchId') || params.get('church') || currentUser?.church_id || undefined}
          orgId={params.get('orgId') || params.get('org') || currentUser?.org_id || undefined}
          onExitPortal={() => {
            window.history.pushState({}, '', window.location.pathname);
            setIsPortalRoute(false);
          }}
        />
      </Suspense>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLoginSuccess} />;
  }

  const isOrgLocked =
    organization &&
    (organization.subscription_status === 'SUSPENDED' || organization.subscription_status === 'CANCELED') &&
    currentUser?.role !== UserRole.SUPER_ADMIN;

  if (isOrgLocked && organization) {
    return (
      <SubscriptionGate
        organization={organization}
        currentUser={currentUser}
        invoices={orgInvoices}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 overflow-hidden font-inter text-slate-800 dark:text-slate-100 transition-colors">
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} bg-slate-900 dark:bg-black transition-all duration-500 flex flex-col z-50 shadow-2xl relative border-r border-slate-800 dark:border-slate-800/50`}>
        <div className="p-10 flex items-center gap-5">
          <div className="w-12 h-12 bg-indigo-500 rounded-[18px] flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col truncate">
              <span className="font-black text-2xl text-white tracking-tight uppercase">Koinonya</span>
              <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">{organization?.name}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-8 py-6 space-y-2 overflow-y-auto scrollbar-hide">
          {visibleNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-5 px-5 py-4 rounded-[24px] transition-all group ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' 
                  : 'text-slate-500 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className={`${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors shrink-0`}>
                {item.icon}
              </div>
              {isSidebarOpen && <span className="font-black text-[10px] uppercase tracking-[0.15em] truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-slate-800 shrink-0">
           <button onClick={handleLogout} className="w-full flex items-center gap-5 px-5 py-4 rounded-[24px] text-rose-400 hover:bg-rose-500/10 transition-all group">
             <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0" />
             {isSidebarOpen && <span className="font-black text-[10px] uppercase tracking-[0.15em]">Sair</span>}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden">
        <header className="h-24 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between px-12 shrink-0 z-40 transition-colors">
          <div className="flex items-center gap-8">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl text-slate-400 transition-all">
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter truncate transition-colors">
              {visibleNavItems.find(i => i.id === activeTab)?.label || 'Koinonya'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <PWAInstallButton variant="header" />

            <button
              onClick={() => setIsVisitorQrOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm whitespace-nowrap shrink-0"
              title="QR Code & Ficha Pública de Visitantes"
            >
              <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="hidden sm:inline">QR Code Visitante</span>
            </button>

            <div className="relative" ref={profileDropdownRef}>
              {(() => {
                const currentUserStatus = (currentUser?.status || 'online') as UserPresenceStatus;
                const statusConfig = USER_STATUS_CONFIG[currentUserStatus] || USER_STATUS_CONFIG.online;
                return (
                  <>
                    <button 
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-3 p-1.5 sm:p-2 bg-slate-50 dark:bg-slate-700/80 rounded-[28px] border border-slate-100 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 hover:shadow-lg transition-all text-left group"
                      title="Abrir menu do perfil e opções"
                    >
                      <div className="text-right hidden md:block px-2">
                        <p className="text-[12px] font-black text-slate-800 dark:text-white leading-tight truncate max-w-[130px]">
                          {currentUser?.name || 'Usuário'}
                        </p>
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          <span className="text-[7.5px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full uppercase">
                            {organization?.plan || 'IGREJA'}
                          </span>
                          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                            {ROLE_TRANSLATIONS[String(currentUser?.role)] || currentUser?.role}
                          </p>
                        </div>
                      </div>
                      <div className="w-11 h-11 rounded-[18px] bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-100 dark:shadow-none shrink-0 relative">
                        {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                        {/* Status Dot: On-line (Verde), Ocupado (Laranja), Off-line (Vermelho) */}
                        <span 
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${statusConfig.dotClass} border-2 border-white dark:border-slate-800 rounded-full shadow-sm transition-all`} 
                          title={`Status: ${statusConfig.label}`}
                        />
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 hidden sm:block ${isProfileOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''}`} />
                    </button>

                    {/* Menu de Expansão do Usuário */}
                    {isProfileOpen && (
                      <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-700 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                        {/* Card do Usuário com Dados e Atuação */}
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-3.5 mb-2">
                            <div className="relative shrink-0">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md">
                                {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${statusConfig.dotClass}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-black text-slate-800 dark:text-white truncate">
                                {currentUser?.name}
                              </h4>
                              <p className="text-xs text-slate-400 truncate font-medium">
                                {currentUser?.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                              {ROLE_TRANSLATIONS[String(currentUser?.role)] || currentUser?.role}
                            </span>
                            {currentChurch?.name && (
                              <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 truncate max-w-[170px]">
                                {currentChurch.name}
                              </span>
                            )}
                          </div>

                          {/* Seletor Rápido de Status: On-line (Verde), Ocupado (Laranja), Off-line (Vermelho) */}
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                Meu Status de Presença:
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase border ${statusConfig.badgeClass}`}>
                                {statusConfig.label}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl">
                              {(Object.keys(USER_STATUS_CONFIG) as (keyof typeof USER_STATUS_CONFIG)[]).map((stKey) => {
                                const item = USER_STATUS_CONFIG[stKey];
                                const isSelected = currentUserStatus === stKey;
                                return (
                                  <button
                                    key={stKey}
                                    type="button"
                                    onClick={() => handleUpdateStatus(stKey)}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all ${
                                      isSelected 
                                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                    title={item.desc}
                                  >
                                    <span className={`w-2 h-2 rounded-full ${item.dotClass} shrink-0`} />
                                    <span className="truncate">{item.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {currentUser?.duty && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                              <span className="text-slate-400 font-bold uppercase text-[9px]">Atuação:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{currentUser.duty}</span>
                            </div>
                          )}
                          {currentUser?.whatsapp && (
                            <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                              <span className="text-slate-400 font-bold uppercase text-[9px]">WhatsApp:</span>
                              <span>{currentUser.whatsapp}</span>
                            </div>
                          )}
                        </div>

                        {/* Opções e Ações */}
                        <div className="p-2 space-y-1">
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              setIsProfileModalOpen(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-2xl transition-all text-left"
                          >
                            <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Editar Meu Perfil</span>
                          </button>

                    <button
                      onClick={() => {
                        setIsDarkMode(!isDarkMode);
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Moon className="w-4 h-4 text-amber-500" />
                        <span>Tema Escuro</span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {isDarkMode ? 'Ativo' : 'Inativo'}
                      </span>
                    </button>

                    {isManagerOrAdmin && (
                      <button
                        onClick={() => {
                          setActiveTab('saas');
                          setIsProfileOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-2xl transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Painel SaaS Master (Clientes)</span>
                        </div>
                        <span className="text-[8.5px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-full border border-indigo-200/50">
                          MRR
                        </span>
                      </button>
                    )}

                    {isManagerOrAdmin && (
                      <button
                        onClick={() => {
                          setActiveTab('settings');
                          setIsProfileOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-all text-left"
                      >
                        <Shield className="w-4 h-4 text-rose-500" />
                        <span>Níveis de Acesso & Permissões</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setActiveTab('church');
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-all text-left"
                    >
                      <ChurchIcon className="w-4 h-4 text-emerald-500" />
                      <span>Dados da Igreja</span>
                    </button>
                  </div>

                  {/* Sair */}
                  <div className="pt-2 px-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl transition-all text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Encerrar Sessão</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
          </div>
        </header>

        {(organization?.subscription_status === 'SUSPENDED' || organization?.subscription_status === 'PAST_DUE') && (
          <div className={`${organization.subscription_status === 'SUSPENDED' ? 'bg-rose-600' : 'bg-amber-600'} text-white px-8 py-3 text-xs font-bold flex items-center justify-between gap-4 shrink-0 shadow-lg animate-in fade-in`}>
            <div className="flex items-center gap-3">
              <span>
                <strong>Aviso de Assinatura:</strong>{' '}
                {organization.subscription_status === 'SUSPENDED'
                  ? 'Esta organização está marcada como suspensa (modo Super Admin ativo). Regularize ou reative no Painel SaaS.'
                  : 'Existe uma pendência na mensalidade desta igreja. Verifique as faturas PIX em Ajustes para evitar suspensão.'}
              </span>
            </div>
            {isManagerOrAdmin && (
              <button
                onClick={() => setActiveTab(currentUser?.role === UserRole.SUPER_ADMIN ? 'saas' : 'settings')}
                className="px-4 py-1.5 bg-white text-slate-900 rounded-xl font-black uppercase text-[10px] hover:bg-slate-100 transition-all shadow-sm shrink-0 whitespace-nowrap"
              >
                {currentUser?.role === UserRole.SUPER_ADMIN ? 'Gerenciar no Painel SaaS' : 'Ver Faturas PIX'}
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          <Suspense fallback={<ModuleFallback />}>
          {activeTab === 'analytics' && (
            <AnalyticsDashboard 
              members={members} 
              stages={pipelineStages}
              team={team}
              cells={cells}
              events={events}
              churchName={currentChurch?.name}
            />
          )}
          {activeTab === 'kanban' && (
            <KanbanBoard 
              members={activeMembers} 
              events={events}
              team={team}
              stages={pipelineStages}
              onMoveMember={moveMember} 
              onAddMember={(stage?: string) => { 
                setSelectedMember(stage ? { stage } as Member : null); 
                setIsMemberModalOpen(true); 
              }}
              onMemberClick={(m) => { setSelectedMember(m); setIsMemberModalOpen(true); }}
              onEditEvent={(e) => { setSelectedEvent(e); setIsEventModalOpen(true); }}
              onAddTask={handleQuickAddTask}
              onSeedDemoData={handleSeedDemoData}
              onUpdateStages={handleUpdatePipelineStages}
              onOpenVisitorQr={() => setIsVisitorQrOpen(true)}
            />
          )}
          {activeTab === 'contacts' && (
            <ContactsModule 
              members={members} 
              team={team}
              stages={pipelineStages}
              cells={cells}
              onEditMember={(m) => { setSelectedMember(m); setIsMemberModalOpen(true); }}
              onDeleteMember={handleDeleteMember}
              onRestoreMember={handleRestoreMember}
              onPermanentDeleteMember={handlePermanentDeleteMember}
              onAddMember={() => { setSelectedMember(null); setIsMemberModalOpen(true); }}
              onImportMembers={handleImportMembers}
              onQuickTask={handleQuickAddTask}
              onOpenVisitorQr={() => setIsVisitorQrOpen(true)}
              onUpdateStage={moveMember}
            />
          )}
          {activeTab === 'discipleship' && (
            <DiscipleshipModule 
              tracks={discipleshipTracks}
              progressList={trackProgressList}
              members={members}
              team={team}
              onSaveTrack={async (track) => {
                if (!currentUser) return;
                await KoinoniaDB.saveDiscipleshipTrack({
                  ...track,
                  org_id: currentUser.org_id,
                  church_id: currentUser.church_id || 'main'
                });
              }}
              onDeleteTrack={async (trackId) => {
                await KoinoniaDB.deleteDiscipleshipTrack(trackId);
              }}
              onSaveProgress={async (progress) => {
                if (!currentUser) return;
                await KoinoniaDB.saveMemberTrackProgress({
                  ...progress,
                  org_id: currentUser.org_id,
                  church_id: currentUser.church_id || 'main'
                });
              }}
              onDeleteProgress={async (progId) => {
                await KoinoniaDB.deleteMemberTrackProgress(progId);
              }}
              onAdvanceMemberStage={async (memberId, targetStage) => {
                const target = members.find(m => m.id === memberId);
                if (target) {
                  await KoinoniaDB.saveMember({
                    ...target,
                    stage: targetStage,
                    last_activity: new Date()
                  });
                }
              }}
            />
          )}
          {activeTab === 'cells' && (
            <CellsModule 
              cells={cells}
              members={members}
              team={team}
              onSaveCell={handleSaveCell}
              onDeleteCell={handleDeleteCell}
              onSaveMeeting={handleSaveCellMeeting}
              onOpenMember={(m) => { setSelectedMember(m); setIsMemberModalOpen(true); }}
              onEditMember={(m) => { setSelectedMember(m); setIsMemberModalOpen(true); }}
              onUpdateMemberCell={async (memberId, cellId) => {
                const target = members.find(m => m.id === memberId);
                if (target) {
                  await KoinoniaDB.saveMember({
                    ...target,
                    cell_id: cellId || '',
                    last_activity: new Date()
                  });
                }
              }}
            />
          )}
          {activeTab === 'ministries' && (
            <MinistriesModule
              ministries={ministries}
              schedules={ministrySchedules}
              members={members}
              team={team}
              events={events}
              church={currentChurch}
              currentUser={currentUser}
              onSaveMinistry={handleSaveMinistry}
              onDeleteMinistry={handleDeleteMinistry}
              onSaveSchedule={handleSaveMinistrySchedule}
              onDeleteSchedule={handleDeleteMinistrySchedule}
              onSeedMinistries={async () => {
                if (!currentUser) return;
                await KoinoniaDB.seedInitialMinistries(currentUser.org_id, currentUser.church_id || 'main');
              }}
              onLogMessage={async (personId, personName, personPhone, messageText) => {
                await handleSaveMessageLog({
                  member_id: personId,
                  member_name: personName,
                  member_phone: personPhone,
                  channel: 'WHATSAPP',
                  campaign_name: 'Escala de Ministério',
                  message_text: messageText,
                  status: 'OPENED_WA'
                });
              }}
            />
          )}
          {activeTab === 'checkin' && (
            <CheckinModule
              checkins={serviceCheckins}
              members={members}
              events={events}
              church={currentChurch}
              currentUser={currentUser}
              onSaveCheckin={handleSaveServiceCheckin}
              onDeleteCheckin={handleDeleteServiceCheckin}
              onCreateVisitorMember={handleCreateVisitorFromCheckin}
              onOpenVisitorQr={() => setIsVisitorQrOpen(true)}
              onOpenMember={(m) => { setSelectedMember(m); setIsMemberModalOpen(true); }}
              onLogMessage={async (personId, personName, personPhone, messageText) => {
                await handleSaveMessageLog({
                  member_id: personId,
                  member_name: personName,
                  member_phone: personPhone,
                  channel: 'WHATSAPP',
                  campaign_name: 'Check-in & Kids',
                  message_text: messageText,
                  status: 'OPENED_WA'
                });
              }}
            />
          )}
          {activeTab === 'pastoral' && (
            <PastoralCareModule
              prayerRequests={prayerRequests}
              visits={pastoralVisits}
              members={members}
              team={team}
              church={currentChurch}
              currentUser={currentUser}
              onSavePrayer={handleSavePrayerRequest}
              onDeletePrayer={handleDeletePrayerRequest}
              onSaveVisit={handleSavePastoralVisit}
              onDeleteVisit={handleDeletePastoralVisit}
              onOpenMember={(m) => { setSelectedMember(m); setIsMemberModalOpen(true); }}
              onLogMessage={async (personId, personName, personPhone, messageText) => {
                await handleSaveMessageLog({
                  member_id: personId,
                  member_name: personName,
                  member_phone: personPhone,
                  channel: 'WHATSAPP',
                  campaign_name: 'Cuidado Pastoral',
                  message_text: messageText,
                  status: 'OPENED_WA'
                });
              }}
            />
          )}
          {activeTab === 'events' && (
            <EventsHubModule
              churchEvents={churchEvents}
              registrations={eventRegistrations}
              members={members}
              cells={cells}
              stages={pipelineStages}
              church={currentChurch}
              organization={organization}
              currentUser={currentUser}
              onSaveEvent={handleSaveChurchEvent}
              onDeleteEvent={handleDeleteChurchEvent}
              onSaveRegistration={handleSaveEventRegistration}
              onDeleteRegistration={handleDeleteEventRegistration}
              onSeedEvents={async () => {
                if (!currentUser) return;
                await KoinoniaDB.seedInitialChurchEvents(currentUser.org_id, currentUser.church_id || 'main');
              }}
              onOpenPublicPortalPreview={() => setIsPortalRoute(true)}
              onLogMessage={async (personId, personName, personPhone, messageText) => {
                await handleSaveMessageLog({
                  member_id: personId,
                  member_name: personName,
                  member_phone: personPhone,
                  channel: 'WHATSAPP',
                  campaign_name: 'Eventos & Portal',
                  message_text: messageText,
                  status: 'OPENED_WA'
                });
              }}
            />
          )}
          {activeTab === 'finance' && (
            <FinancialModule 
              transactions={transactions}
              campaigns={campaigns}
              members={members}
              onSaveTransaction={handleSaveTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onSaveCampaign={handleSaveCampaign}
              onDeleteCampaign={handleDeleteCampaign}
            />
          )}
          {activeTab === 'agenda' && (
            <ScheduleModule 
              events={events} 
              team={team}
              onAddEvent={() => { setSelectedEvent(null); setIsEventModalOpen(true); }}
              onEditEvent={(e) => { setSelectedEvent(e); setIsEventModalOpen(true); }}
              onDeleteEvent={handleDeleteEvent}
            />
          )}
          {activeTab === 'church' && (
            <ChurchModule 
              churchId={currentUser?.church_id || 'default'} 
              team={team}
              onSave={handleSaveChurch}
              onOpenVisitorQr={() => setIsVisitorQrOpen(true)}
            />
          )}
          {activeTab === 'team' && (
            <TeamModule 
              team={team} 
              accessLevels={accessLevels}
              onSave={handleSaveTeamMember} 
              onDelete={async (id) => {
                await KoinoniaDB.deleteUserProfile(id);
              }} 
            />
          )}
          {activeTab === 'automation' && (
            <AutomationSettings 
              rules={automationRules}
              members={members}
              team={team}
              church={currentChurch}
              stages={pipelineStages}
              cells={cells}
              messageLogs={messageLogs}
              broadcastCampaigns={broadcastCampaigns}
              currentUser={currentUser}
              onSaveRule={handleSaveAutomationRule}
              onSeedDefaultRules={async () => {
                if (!currentUser) return;
                await KoinoniaDB.seedDefaultAutomationRules(currentUser.org_id, currentUser.church_id || 'main');
              }}
              onSaveMessageLog={handleSaveMessageLog}
              onSaveBroadcastCampaign={handleSaveBroadcastCampaign}
              onDeleteBroadcastCampaign={handleDeleteBroadcastCampaign}
            />
          )}
          {activeTab === 'saas' && (
            <SaaSManagementModule 
              organizations={organizations} 
              invoices={currentUser?.role === UserRole.SUPER_ADMIN ? allSaaSInvoices : orgInvoices}
              currentOrgId={organization?.id}
              isSuperAdmin={currentUser?.role === UserRole.SUPER_ADMIN}
              activeMembersCount={activeMembers.length}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsModule 
              isDarkMode={isDarkMode} 
              onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
              accessLevels={accessLevels}
              onSaveAccessLevel={handleSaveAccessLevel}
              onDeleteAccessLevel={handleDeleteAccessLevel}
              onResetAccessLevels={handleResetAccessLevels}
              church={currentChurch}
              members={members}
              cells={cells}
              transactions={transactions}
              team={team}
              organization={organization}
              events={events}
              orgInvoices={orgInvoices}
              onOpenSaaS={() => setActiveTab('saas')}
            />
          )}
          </Suspense>
        </div>

        <MemberModal 
          isOpen={isMemberModalOpen} 
          onClose={() => { setIsMemberModalOpen(false); setSelectedMember(null); }} 
          onSave={handleSaveMember} 
          initialData={selectedMember} 
          team={team}
          members={members}
          events={events}
          stages={pipelineStages}
          cells={cells}
          messageLogs={messageLogs}
          onEditEvent={(e) => { setSelectedEvent(e); setIsEventModalOpen(true); }}
          onDeleteEvent={handleDeleteEvent}
          onLogMessage={async (member, messageText) => {
            await handleSaveMessageLog({
              member_id: member.id,
              member_name: member.name,
              member_phone: member.phone || '',
              channel: 'WHATSAPP',
              message_text: messageText,
              status: 'OPENED_WA'
            });
          }}
        />
        <EventModal 
          isOpen={isEventModalOpen} 
          onClose={() => { setIsEventModalOpen(false); setSelectedEvent(null); }} 
          onSave={handleSaveEvent} 
          onDelete={handleDeleteEvent}
          initialData={selectedEvent} 
          team={team}
        />
        {isVisitorQrOpen && (
          <Suspense fallback={null}>
            <VisitorQrModal
              isOpen={isVisitorQrOpen}
              onClose={() => setIsVisitorQrOpen(false)}
              church={currentChurch}
              organization={organization}
            />
          </Suspense>
        )}

        {isProfileModalOpen && currentUser && (
          <UserProfileModal 
            user={currentUser}
            church={currentChurch || undefined}
            organization={organization || undefined}
            onSave={handleSaveUserProfile}
            onClose={() => setIsProfileModalOpen(false)}
          />
        )}
        <OfflineIndicator />
      </main>
    </div>
  );
};

export default App;
