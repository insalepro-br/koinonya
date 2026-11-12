import React, { useState, useMemo } from 'react';
import {
  HeartHandshake,
  Plus,
  Search,
  MessageCircle,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Edit3,
  X,
  Lock,
  Sparkles,
  MapPin,
  UserCheck,
  Check
} from 'lucide-react';
import {
  PrayerRequest,
  PrayerCategory,
  PrayerStatus,
  PrayerPrivacy,
  PastoralVisit,
  PastoralVisitType,
  PastoralVisitStatus,
  Member,
  SystemUser,
  Church,
  UserRole
} from '../types';

interface PastoralCareModuleProps {
  prayerRequests: PrayerRequest[];
  visits: PastoralVisit[];
  members: Member[];
  team: SystemUser[];
  church?: Church | null;
  currentUser?: SystemUser | null;
  onSavePrayer: (req: Partial<PrayerRequest>) => Promise<void>;
  onDeletePrayer: (id: string) => Promise<void>;
  onSaveVisit: (visit: Partial<PastoralVisit>) => Promise<void>;
  onDeleteVisit: (id: string) => Promise<void>;
  onLogMessage?: (personId: string, personName: string, personPhone: string, messageText: string) => Promise<void>;
  onOpenMember?: (member: Member) => void;
}

const CATEGORY_LABELS: Record<PrayerCategory, string> = {
  HEALTH: 'Saúde & Cura',
  FAMILY: 'Família & Casamento',
  FINANCE: 'Trabalho & Finanças',
  SPIRITUAL: 'Vida Espiritual',
  THANKSGIVING: 'Ação de Graças',
  OTHER: 'Outro Motivo'
};

const PRIVACY_LABELS: Record<PrayerPrivacy, string> = {
  PUBLIC_CHURCH: 'Mural da Igreja',
  LEADERS_ONLY: 'Equipe de Intercessão',
  PASTOR_CONFIDENTIAL: 'Sigilo Pastoral'
};

const STATUS_LABELS: Record<PrayerStatus, string> = {
  RECEIVED: 'Recebido',
  IN_PRAYER: 'Em Oração',
  ANSWERED: 'Respondido'
};

const VISIT_TYPE_LABELS: Record<PastoralVisitType, string> = {
  HOME_VISIT: 'Visita Domiciliar',
  HOSPITAL: 'Visita Hospitalar',
  COUNSELING: 'Aconselhamento no Gabinete',
  CALL: 'Ligação / Chamada Pastoral',
  NEW_CONVERT: 'Acolhimento Novo Convertido'
};

const VISIT_STATUS_LABELS: Record<PastoralVisitStatus, string> = {
  SCHEDULED: 'Agendada',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada'
};

const sanitizePhoneForWa = (phone?: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
};

export const PastoralCareModule: React.FC<PastoralCareModuleProps> = ({
  prayerRequests,
  visits,
  members,
  team,
  church,
  currentUser,
  onSavePrayer,
  onDeletePrayer,
  onSaveVisit,
  onDeleteVisit,
  onLogMessage,
  onOpenMember
}) => {
  const [subTab, setSubTab] = useState<'PRAYERS' | 'VISITS'>('PRAYERS');
  const [prayerSearch, setPrayerSearch] = useState('');
  const [prayerStatusFilter, setPrayerStatusFilter] = useState<'ALL' | PrayerStatus>('ALL');
  const [onlyUrgent, setOnlyUrgent] = useState(false);

  const [visitSearch, setVisitSearch] = useState('');
  const [visitStatusFilter, setVisitStatusFilter] = useState<'ALL' | PastoralVisitStatus>('SCHEDULED');

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Prayer Modal
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
  const [prayerForm, setPrayerForm] = useState<{
    id?: string;
    member_id: string;
    requester_name: string;
    requester_phone: string;
    category: PrayerCategory;
    urgency: 'NORMAL' | 'URGENT';
    privacy: PrayerPrivacy;
    request_text: string;
  }>({
    member_id: '',
    requester_name: '',
    requester_phone: '',
    category: 'SPIRITUAL',
    urgency: 'NORMAL',
    privacy: 'LEADERS_ONLY',
    request_text: ''
  });

  // Testimony Modal
  const [answeringPrayer, setAnsweringPrayer] = useState<PrayerRequest | null>(null);
  const [testimonyNotes, setTestimonyNotes] = useState('');

  // Visit Modal
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [visitForm, setVisitForm] = useState<{
    id?: string;
    member_id: string;
    member_name: string;
    member_phone: string;
    address_info: string;
    visit_type: PastoralVisitType;
    scheduled_date: string;
    scheduled_time: string;
    responsible_id: string;
    status: PastoralVisitStatus;
    prayer_request_id?: string;
    notes: string;
  }>({
    member_id: '',
    member_name: '',
    member_phone: '',
    address_info: '',
    visit_type: 'HOME_VISIT',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '19:30',
    responsible_id: currentUser?.id || '',
    status: 'SCHEDULED',
    notes: ''
  });

  const activeMembers = useMemo(() => members.filter(m => m.active !== false), [members]);

  const isPastorOrAdmin = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.PASTOR ||
      currentUser.role === UserRole.SUPER_ADMIN
    );
  }, [currentUser]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Visibility filter for confidential pastoral requests
  const visiblePrayers = useMemo(() => {
    return prayerRequests.filter(p => {
      if (p.privacy === 'PASTOR_CONFIDENTIAL' && !isPastorOrAdmin) return false;
      return true;
    });
  }, [prayerRequests, isPastorOrAdmin]);

  // Scan legacy member notes with "Pedido de Oração:" not yet imported into prayer_requests
  const unimportedNotePrayers = useMemo(() => {
    const existingMemberTexts = new Set(
      prayerRequests.map(p => `${p.member_id || ''}::${p.request_text.trim().toLowerCase()}`)
    );
    const list: Array<{ member: Member; text: string }> = [];
    activeMembers.forEach(m => {
      if (!m.notes) return;
      const match = m.notes.match(/Pedido de Ora[çc][ãa]o:\s*(.+)/i);
      if (match && match[1]) {
        const extracted = match[1].split('\n')[0].trim();
        if (extracted && !existingMemberTexts.has(`${m.id}::${extracted.toLowerCase()}`)) {
          list.push({ member: m, text: extracted });
        }
      }
    });
    return list;
  }, [activeMembers, prayerRequests]);

  // KPIs
  const activePrayersCount = useMemo(
    () => visiblePrayers.filter(p => p.status !== 'ANSWERED').length,
    [visiblePrayers]
  );
  const urgentPrayersCount = useMemo(
    () => visiblePrayers.filter(p => p.status !== 'ANSWERED' && p.urgency === 'URGENT').length,
    [visiblePrayers]
  );
  const answeredPrayersCount = useMemo(
    () => visiblePrayers.filter(p => p.status === 'ANSWERED').length,
    [visiblePrayers]
  );
  const scheduledVisitsCount = useMemo(
    () => visits.filter(v => v.status === 'SCHEDULED').length,
    [visits]
  );

  // Filtered lists
  const filteredPrayers = useMemo(() => {
    const q = prayerSearch.trim().toLowerCase();
    return visiblePrayers.filter(p => {
      if (prayerStatusFilter !== 'ALL' && p.status !== prayerStatusFilter) return false;
      if (onlyUrgent && p.urgency !== 'URGENT') return false;
      if (!q) return true;
      return (
        p.requester_name.toLowerCase().includes(q) ||
        p.request_text.toLowerCase().includes(q) ||
        CATEGORY_LABELS[p.category].toLowerCase().includes(q)
      );
    });
  }, [visiblePrayers, prayerSearch, prayerStatusFilter, onlyUrgent]);

  const filteredVisits = useMemo(() => {
    const q = visitSearch.trim().toLowerCase();
    return visits.filter(v => {
      if (visitStatusFilter !== 'ALL' && v.status !== visitStatusFilter) return false;
      if (!q) return true;
      return (
        v.member_name.toLowerCase().includes(q) ||
        (v.responsible_name && v.responsible_name.toLowerCase().includes(q)) ||
        (v.address_info && v.address_info.toLowerCase().includes(q)) ||
        VISIT_TYPE_LABELS[v.visit_type].toLowerCase().includes(q)
      );
    });
  }, [visits, visitSearch, visitStatusFilter]);

  // Handlers
  const handleSelectPrayerMember = (memberId: string) => {
    const found = activeMembers.find(m => m.id === memberId);
    if (!found) {
      setPrayerForm(prev => ({ ...prev, member_id: '', requester_name: '', requester_phone: '' }));
      return;
    }
    setPrayerForm(prev => ({
      ...prev,
      member_id: found.id,
      requester_name: found.name,
      requester_phone: found.phone || ''
    }));
  };

  const handleSavePrayerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerForm.requester_name.trim() || !prayerForm.request_text.trim()) return;
    setBusyId('save_prayer');
    try {
      await onSavePrayer({
        id: prayerForm.id,
        member_id: prayerForm.member_id || undefined,
        requester_name: prayerForm.requester_name.trim(),
        requester_phone: prayerForm.requester_phone.trim(),
        category: prayerForm.category,
        urgency: prayerForm.urgency,
        privacy: prayerForm.privacy,
        request_text: prayerForm.request_text.trim(),
        status: 'RECEIVED',
        prayer_count: 0,
        source: 'MANUAL'
      });
      setIsPrayerModalOpen(false);
      setPrayerForm({
        member_id: '',
        requester_name: '',
        requester_phone: '',
        category: 'SPIRITUAL',
        urgency: 'NORMAL',
        privacy: 'LEADERS_ONLY',
        request_text: ''
      });
      showToast('Pedido de oração registrado na fila de intercessão.');
    } finally {
      setBusyId(null);
    }
  };

  const handleImportVisitorPrayers = async () => {
    if (unimportedNotePrayers.length === 0) return;
    setBusyId('import_prayers');
    try {
      for (const item of unimportedNotePrayers) {
        await onSavePrayer({
          member_id: item.member.id,
          requester_name: item.member.name,
          requester_phone: item.member.phone || '',
          category: 'OTHER',
          urgency: 'NORMAL',
          privacy: 'LEADERS_ONLY',
          request_text: item.text,
          status: 'RECEIVED',
          prayer_count: 0,
          source: 'QR_CODE'
        });
      }
      showToast(`${unimportedNotePrayers.length} pedido(s) de visitantes importado(s) para o Mural.`);
    } finally {
      setBusyId(null);
    }
  };

  const handlePrayNow = async (req: PrayerRequest) => {
    setBusyId(req.id);
    try {
      await onSavePrayer({
        ...req,
        prayer_count: (req.prayer_count || 0) + 1,
        status: req.status === 'RECEIVED' ? 'IN_PRAYER' : req.status
      });
      showToast(`Oração registrada por ${req.requester_name}.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAnswered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answeringPrayer) return;
    setBusyId(answeringPrayer.id);
    try {
      await onSavePrayer({
        ...answeringPrayer,
        status: 'ANSWERED',
        testimony_notes: testimonyNotes.trim() || undefined,
        answered_at: new Date()
      });
      showToast(`Oração de ${answeringPrayer.requester_name} marcada como respondida.`);
      setAnsweringPrayer(null);
      setTestimonyNotes('');
    } finally {
      setBusyId(null);
    }
  };

  const handleSendWhatsApp = async (
    phone: string | undefined,
    personId: string,
    personName: string,
    messageText: string
  ) => {
    const cleanWa = sanitizePhoneForWa(phone);
    if (cleanWa) {
      window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(messageText)}`, '_blank', 'noopener,noreferrer');
    }
    if (onLogMessage) {
      await onLogMessage(personId, personName, phone || '', messageText);
    }
    showToast(`Mensagem registrada e aberta no WhatsApp para ${personName}.`);
  };

  // Visit handlers
  const handleSelectVisitMember = (memberId: string) => {
    const found = activeMembers.find(m => m.id === memberId);
    if (!found) {
      setVisitForm(prev => ({ ...prev, member_id: '', member_name: '', member_phone: '', address_info: '' }));
      return;
    }
    const addr = [found.address, found.neighborhood, found.city].filter(Boolean).join(' - ');
    setVisitForm(prev => ({
      ...prev,
      member_id: found.id,
      member_name: found.name,
      member_phone: found.phone || '',
      address_info: addr
    }));
  };

  const openNewVisitForPrayer = (req: PrayerRequest) => {
    const linkedMember = req.member_id ? activeMembers.find(m => m.id === req.member_id) : undefined;
    const addr = linkedMember
      ? [linkedMember.address, linkedMember.neighborhood, linkedMember.city].filter(Boolean).join(' - ')
      : '';
    setVisitForm({
      member_id: req.member_id || '',
      member_name: req.requester_name,
      member_phone: req.requester_phone || linkedMember?.phone || '',
      address_info: addr,
      visit_type: req.category === 'HEALTH' ? 'HOSPITAL' : 'HOME_VISIT',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '19:30',
      responsible_id: currentUser?.id || '',
      status: 'SCHEDULED',
      prayer_request_id: req.id,
      notes: `Motivo: ${req.request_text}`
    });
    setIsVisitModalOpen(true);
  };

  const openEditVisit = (v: PastoralVisit) => {
    setVisitForm({
      id: v.id,
      member_id: v.member_id || '',
      member_name: v.member_name,
      member_phone: v.member_phone || '',
      address_info: v.address_info || '',
      visit_type: v.visit_type,
      scheduled_date: new Date(v.scheduled_date).toISOString().split('T')[0],
      scheduled_time: v.scheduled_time || '19:30',
      responsible_id: v.responsible_id || '',
      status: v.status,
      prayer_request_id: v.prayer_request_id,
      notes: v.notes || ''
    });
    setIsVisitModalOpen(true);
  };

  const handleSaveVisitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitForm.member_name.trim()) return;
    setBusyId('save_visit');
    try {
      const [y, m, d] = visitForm.scheduled_date.split('-').map(Number);
      const schedDate = new Date(y || new Date().getFullYear(), (m || 1) - 1, d || new Date().getDate(), 12, 0, 0);
      const responsible = team.find(t => t.id === visitForm.responsible_id);

      await onSaveVisit({
        id: visitForm.id,
        member_id: visitForm.member_id || undefined,
        member_name: visitForm.member_name.trim(),
        member_phone: visitForm.member_phone.trim(),
        address_info: visitForm.address_info.trim(),
        visit_type: visitForm.visit_type,
        scheduled_date: schedDate,
        scheduled_time: visitForm.scheduled_time,
        responsible_id: visitForm.responsible_id || undefined,
        responsible_name: responsible?.name || currentUser?.name || 'Equipe Pastoral',
        status: visitForm.status,
        prayer_request_id: visitForm.prayer_request_id,
        notes: visitForm.notes.trim(),
        completed_at: visitForm.status === 'COMPLETED' ? new Date() : null
      });
      setIsVisitModalOpen(false);
      setSubTab('VISITS');
      showToast('Atendimento pastoral salvo na agenda de cuidados.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCompleteVisit = async (v: PastoralVisit) => {
    setBusyId(v.id);
    try {
      await onSaveVisit({
        ...v,
        status: 'COMPLETED',
        completed_at: new Date()
      });
      showToast(`Visita para ${v.member_name} concluída.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Cuidado Pastoral & Intercessão
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Mural de pedidos de oração com níveis de sigilo, registro de intercessões e agenda de visitas pastorais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setVisitForm({
                member_id: '',
                member_name: '',
                member_phone: '',
                address_info: '',
                visit_type: 'HOME_VISIT',
                scheduled_date: new Date().toISOString().split('T')[0],
                scheduled_time: '19:30',
                responsible_id: currentUser?.id || '',
                status: 'SCHEDULED',
                notes: ''
              });
              setIsVisitModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Agendar Visita
          </button>
          <button
            onClick={() => setIsPrayerModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo Pedido de Oração
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Auto-import notice from Check-in notes */}
      {unimportedNotePrayers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-sm">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span>
              Encontramos <strong className="tabular-nums">{unimportedNotePrayers.length}</strong> pedido(s) de oração registrados nas fichas de check-in de visitantes.
            </span>
          </div>
          <button
            onClick={handleImportVisitorPrayers}
            disabled={busyId === 'import_prayers'}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap shrink-0"
          >
            Importar para o Mural
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Pedidos em Aberto</span>
            <HeartHandshake className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {activePrayersCount}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Recebidos ou em corrente de oração
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Pedidos Urgentes</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {urgentPrayersCount}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Prioridade imediata de cuidado pastoral
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Orações Respondidas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {answeredPrayersCount}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Testemunhos registrados pela liderança
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Visitas Agendadas</span>
            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {scheduledVisitsCount}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Atendimentos domiciliares e gabinete
          </p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg">
          <button
            onClick={() => setSubTab('PRAYERS')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'PRAYERS'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Mural de Oração ({activePrayersCount})
          </button>
          <button
            onClick={() => setSubTab('VISITS')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'VISITS'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Visitas & Aconselhamento ({visits.length})
          </button>
        </div>
      </div>

      {/* TAB 1: MURAL DE ORAÇÃO */}
      {subTab === 'PRAYERS' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={prayerSearch}
                onChange={e => setPrayerSearch(e.target.value)}
                placeholder="Buscar por nome, motivo ou categoria..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setOnlyUrgent(!onlyUrgent)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  onlyUrgent
                    ? 'bg-rose-600 border-rose-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Somente Urgentes ({urgentPrayersCount})
              </button>

              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                {([
                  { id: 'ALL', label: 'Todos' },
                  { id: 'RECEIVED', label: 'Recebidos' },
                  { id: 'IN_PRAYER', label: 'Em Oração' },
                  { id: 'ANSWERED', label: 'Respondidos' }
                ] as const).map(f => (
                  <button
                    key={f.id}
                    onClick={() => setPrayerStatusFilter(f.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      prayerStatusFilter === f.id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredPrayers.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center space-y-3">
              <HeartHandshake className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Nenhum pedido de oração encontrado
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Cadastre pedidos manualmente, importe do check-in de visitantes ou receba diretamente pelo QR Code do culto.
              </p>
              <button
                onClick={() => setIsPrayerModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4" />
                Registrar Primeiro Pedido
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPrayers.map(req => {
                const linkedMember = req.member_id ? activeMembers.find(m => m.id === req.member_id) : undefined;
                const churchName = church?.name || 'nossa igreja';
                const firstName = req.requester_name.split(' ')[0];
                const prayerWaText = `Olá ${firstName}! Aqui é da equipe pastoral da ${churchName}. Recebemos o seu pedido de oração e estamos intercedendo por você hoje. Que a paz de Cristo guarde o seu coração!`;

                return (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {linkedMember && onOpenMember ? (
                              <button
                                type="button"
                                onClick={() => onOpenMember(linkedMember)}
                                className="text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate text-left"
                              >
                                {req.requester_name}
                              </button>
                            ) : (
                              <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                {req.requester_name}
                              </h4>
                            )}
                            {req.privacy === 'PASTOR_CONFIDENTIAL' && (
                              <span title="Sigilo Pastoral" className="shrink-0">
                                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                            <span>{CATEGORY_LABELS[req.category]}</span>
                            <span aria-hidden="true">·</span>
                            <span>{PRIVACY_LABELS[req.privacy]}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{new Date(req.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-0.5">
                          <div
                            className={`text-xs font-semibold ${
                              req.status === 'ANSWERED'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : req.urgency === 'URGENT'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            {req.urgency === 'URGENT' && req.status !== 'ANSWERED' ? 'Urgente · ' : ''}
                            {STATUS_LABELS[req.status]}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {req.prayer_count || 0} intercessões
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                        {req.request_text}
                      </p>

                      {req.testimony_notes && (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
                          <strong>Testemunho / Resposta:</strong> {req.testimony_notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex flex-wrap items-center gap-2">
                        {req.status !== 'ANSWERED' && (
                          <button
                            onClick={() => handlePrayNow(req)}
                            disabled={busyId === req.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap shrink-0"
                          >
                            <HeartHandshake className="w-3.5 h-3.5" />
                            Orar Agora
                          </button>
                        )}
                        {req.requester_phone && (
                          <button
                            onClick={() =>
                              handleSendWhatsApp(
                                req.requester_phone,
                                req.member_id || req.id,
                                req.requester_name,
                                prayerWaText
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 whitespace-nowrap shrink-0"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </button>
                        )}
                        <button
                          onClick={() => openNewVisitForPrayer(req)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Agendar Visita
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {req.status !== 'ANSWERED' && (
                          <button
                            onClick={() => {
                              setAnsweringPrayer(req);
                              setTestimonyNotes(req.testimony_notes || '');
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg whitespace-nowrap shrink-0"
                          >
                            Responder
                          </button>
                        )}
                        <button
                          onClick={() => onDeletePrayer(req.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="Excluir pedido"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VISITAS & ACONSELHAMENTO */}
      {subTab === 'VISITS' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={visitSearch}
                onChange={e => setVisitSearch(e.target.value)}
                placeholder="Buscar membro, responsável ou endereço..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
              {([
                { id: 'SCHEDULED', label: `Agendadas (${scheduledVisitsCount})` },
                { id: 'COMPLETED', label: 'Concluídas' },
                { id: 'CANCELED', label: 'Canceladas' },
                { id: 'ALL', label: 'Todas' }
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => setVisitStatusFilter(f.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    visitStatusFilter === f.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredVisits.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Nenhuma visita encontrada neste filtro
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Organize visitas domiciliares, hospitalares e atendimentos de gabinete para toda a equipe pastoral.
              </p>
              <button
                onClick={() => setIsVisitModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4" />
                Agendar Primeira Visita
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVisits.map(v => {
                const dateStr = new Date(v.scheduled_date).toLocaleDateString('pt-BR');
                const confirmMsg = `Olá ${v.member_name.split(' ')[0]}! Confirmando nosso atendimento pastoral (${VISIT_TYPE_LABELS[v.visit_type]}) agendado para ${dateStr}${v.scheduled_time ? ` às ${v.scheduled_time}` : ''}. Deus abençoe!`;

                return (
                  <div
                    key={v.id}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                            {v.member_name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                            <span>{VISIT_TYPE_LABELS[v.visit_type]}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {dateStr}
                              {v.scheduled_time ? ` às ${v.scheduled_time}` : ''}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-semibold shrink-0 ${
                            v.status === 'COMPLETED'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : v.status === 'CANCELED'
                                ? 'text-slate-400'
                                : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {VISIT_STATUS_LABELS[v.status]}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Responsável:</span>{' '}
                          <strong className="text-slate-800 dark:text-slate-100">{v.responsible_name || 'A definir'}</strong>
                        </div>
                        {v.address_info && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{v.address_info}</span>
                          </div>
                        )}
                      </div>

                      {v.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 rounded-lg p-3 whitespace-pre-line">
                          {v.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        {v.member_phone && (
                          <button
                            onClick={() =>
                              handleSendWhatsApp(
                                v.member_phone,
                                v.member_id || v.id,
                                v.member_name,
                                confirmMsg
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 whitespace-nowrap shrink-0"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </button>
                        )}
                        {v.status === 'SCHEDULED' && (
                          <button
                            onClick={() => handleCompleteVisit(v)}
                            disabled={busyId === v.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Concluir
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditVisit(v)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                          title="Editar visita"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteVisit(v.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="Excluir visita"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: NOVO PEDIDO DE ORAÇÃO */}
      {isPrayerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Novo Pedido de Oração
              </h3>
              <button onClick={() => setIsPrayerModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrayerForm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Vincular a Membro Cadastrado (Opcional)
                </label>
                <select
                  value={prayerForm.member_id}
                  onChange={e => handleSelectPrayerMember(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="">Informar nome manualmente...</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.phone ? `(${m.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Solicitante *
                  </label>
                  <input
                    type="text"
                    required
                    value={prayerForm.requester_name}
                    onChange={e => setPrayerForm(prev => ({ ...prev, requester_name: e.target.value }))}
                    placeholder="Nome completo"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    WhatsApp (Opcional)
                  </label>
                  <input
                    type="text"
                    value={prayerForm.requester_phone}
                    onChange={e => setPrayerForm(prev => ({ ...prev, requester_phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={prayerForm.category}
                    onChange={e => setPrayerForm(prev => ({ ...prev, category: e.target.value as PrayerCategory }))}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Urgência
                  </label>
                  <select
                    value={prayerForm.urgency}
                    onChange={e => setPrayerForm(prev => ({ ...prev, urgency: e.target.value as 'NORMAL' | 'URGENT' }))}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Visibilidade
                  </label>
                  <select
                    value={prayerForm.privacy}
                    onChange={e => setPrayerForm(prev => ({ ...prev, privacy: e.target.value as PrayerPrivacy }))}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    {Object.entries(PRIVACY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Motivo da Oração *
                </label>
                <textarea
                  required
                  rows={4}
                  value={prayerForm.request_text}
                  onChange={e => setPrayerForm(prev => ({ ...prev, request_text: e.target.value }))}
                  placeholder="Descreva o pedido de oração..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsPrayerModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'save_prayer'}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Salvar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MARCAR ORAÇÃO RESPONDIDA */}
      {answeringPrayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Registrar Testemunho / Resposta
              </h3>
              <button onClick={() => setAnsweringPrayer(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkAnswered} className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Solicitante: <strong className="text-slate-900 dark:text-white">{answeringPrayer.requester_name}</strong>
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Relato do Testemunho (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={testimonyNotes}
                  onChange={e => setTestimonyNotes(e.target.value)}
                  placeholder="Como Deus respondeu a este pedido..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setAnsweringPrayer(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirmar Resposta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGENDAR / EDITAR VISITA PASTORAL */}
      {isVisitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {visitForm.id ? 'Editar Visita Pastoral' : 'Agendar Visita / Aconselhamento'}
              </h3>
              <button onClick={() => setIsVisitModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVisitForm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Selecionar Membro / Visitante (Opcional)
                </label>
                <select
                  value={visitForm.member_id}
                  onChange={e => handleSelectVisitMember(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="">Informar manualmente...</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.neighborhood ? `· ${m.neighborhood}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Nome da Pessoa *
                  </label>
                  <input
                    type="text"
                    required
                    value={visitForm.member_name}
                    onChange={e => setVisitForm(prev => ({ ...prev, member_name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={visitForm.member_phone}
                    onChange={e => setVisitForm(prev => ({ ...prev, member_phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Tipo
                  </label>
                  <select
                    value={visitForm.visit_type}
                    onChange={e => setVisitForm(prev => ({ ...prev, visit_type: e.target.value as PastoralVisitType }))}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    {Object.entries(VISIT_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={visitForm.scheduled_date}
                    onChange={e => setVisitForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={visitForm.scheduled_time}
                    onChange={e => setVisitForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Pastor / Líder Responsável
                  </label>
                  <select
                    value={visitForm.responsible_id}
                    onChange={e => setVisitForm(prev => ({ ...prev, responsible_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Equipe Pastoral</option>
                    {team.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Status
                  </label>
                  <select
                    value={visitForm.status}
                    onChange={e => setVisitForm(prev => ({ ...prev, status: e.target.value as PastoralVisitStatus }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    {Object.entries(VISIT_STATUS_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Endereço / Local / Quarto
                </label>
                <input
                  type="text"
                  value={visitForm.address_info}
                  onChange={e => setVisitForm(prev => ({ ...prev, address_info: e.target.value }))}
                  placeholder="Rua, bairro, hospital ou gabinete..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Anotações Pastorais
                </label>
                <textarea
                  rows={3}
                  value={visitForm.notes}
                  onChange={e => setVisitForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Contexto da visita, orientações e próximos passos..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsVisitModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'save_visit'}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Salvar Visita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PastoralCareModule;
