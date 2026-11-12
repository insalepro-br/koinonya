import React, { useState, useMemo, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Ticket,
  Plus,
  Search,
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Edit3,
  MessageCircle,
  IdCard,
  Printer,
  X,
  UserCheck,
  DollarSign,
  Church as ChurchIcon
} from 'lucide-react';
import {
  Church,
  Organization,
  Member,
  Cell,
  SystemUser,
  ChurchEvent,
  ChurchEventCategory,
  ChurchEventStatus,
  EventRegistration,
  PipelineStage
} from '../types';
import { DEFAULT_STAGES } from '../constants';

interface EventsHubModuleProps {
  churchEvents: ChurchEvent[];
  registrations: EventRegistration[];
  members: Member[];
  cells: Cell[];
  stages?: PipelineStage[];
  church: Church | null;
  organization: Organization | null;
  currentUser: SystemUser | null;
  onSaveEvent: (ev: Partial<ChurchEvent>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onSaveRegistration: (reg: Partial<EventRegistration>) => Promise<void>;
  onDeleteRegistration: (id: string) => Promise<void>;
  onSeedEvents: () => Promise<void>;
  onOpenPublicPortalPreview: () => void;
  onLogMessage?: (personId: string, personName: string, personPhone: string, messageText: string) => Promise<void>;
}

const EVENT_CATEGORY_LABELS: Record<ChurchEventCategory, string> = {
  CONFERENCE: 'Conferência',
  RETREAT: 'Retiro / Encontro',
  BAPTISM: 'Batismo nas Águas',
  COURSE: 'Curso / Escola',
  WORKSHOP: 'Workshop',
  SPECIAL_SERVICE: 'Culto Especial'
};

const EVENT_STATUS_LABELS: Record<ChurchEventStatus, { label: string; style: string }> = {
  OPEN: { label: 'Inscrições Abertas', style: 'text-emerald-700 dark:text-emerald-400' },
  FULL: { label: 'Lotado', style: 'text-amber-700 dark:text-amber-400' },
  CLOSED: { label: 'Encerrado', style: 'text-slate-500 dark:text-slate-400' },
  COMPLETED: { label: 'Concluído', style: 'text-indigo-600 dark:text-indigo-400' }
};

const formatCurrencyBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const EventsHubModule: React.FC<EventsHubModuleProps> = ({
  churchEvents,
  registrations,
  members,
  cells,
  stages = DEFAULT_STAGES,
  church,
  organization,
  currentUser,
  onSaveEvent,
  onDeleteEvent,
  onSaveRegistration,
  onDeleteRegistration,
  onSeedEvents,
  onOpenPublicPortalPreview,
  onLogMessage
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'member_card'>('events');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventSearch, setEventSearch] = useState('');
  const [regSearch, setRegSearch] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'CHECKED_IN' | 'PENDING_PAY'>('ALL');

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<ChurchEvent> | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Enroll modal form
  const [enrollMemberId, setEnrollMemberId] = useState('');
  const [enrollName, setEnrollName] = useState('');
  const [enrollPhone, setEnrollPhone] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollPaid, setEnrollPaid] = useState(false);

  // Digital Member Card state
  const activeMembers = useMemo(() => members.filter(m => m.active !== false), [members]);
  const [cardSearch, setCardSearch] = useState('');
  const [selectedCardMemberId, setSelectedCardMemberId] = useState<string>('');
  const memberCardQrRef = useRef<HTMLCanvasElement>(null);
  const portalQrRef = useRef<HTMLCanvasElement>(null);

  const publicPortalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?portal=true&churchId=${church?.id || currentUser?.church_id || 'default'}&orgId=${organization?.id || currentUser?.org_id || 'default'}`
    : '';

  useEffect(() => {
    if (!selectedEventId && churchEvents.length > 0) {
      setSelectedEventId(churchEvents[0].id);
    } else if (selectedEventId && !churchEvents.some(e => e.id === selectedEventId)) {
      setSelectedEventId(churchEvents[0]?.id || '');
    }
  }, [churchEvents, selectedEventId]);

  useEffect(() => {
    if (!selectedCardMemberId && activeMembers.length > 0) {
      setSelectedCardMemberId(activeMembers[0].id);
    }
  }, [activeMembers, selectedCardMemberId]);

  const selectedEvent = useMemo(
    () => churchEvents.find(e => e.id === selectedEventId) || null,
    [churchEvents, selectedEventId]
  );

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    return churchEvents.filter(e =>
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q) ||
      EVENT_CATEGORY_LABELS[e.category]?.toLowerCase().includes(q)
    );
  }, [churchEvents, eventSearch]);

  const selectedEventRegs = useMemo(() => {
    if (!selectedEvent) return [];
    const q = regSearch.trim().toLowerCase();
    return registrations
      .filter(r => r.event_id === selectedEvent.id)
      .filter(r => {
        if (regStatusFilter === 'CONFIRMED') return r.status === 'CONFIRMED';
        if (regStatusFilter === 'CHECKED_IN') return r.status === 'CHECKED_IN';
        if (regStatusFilter === 'PENDING_PAY') return r.payment_status === 'PENDING' && r.status !== 'CANCELED';
        return true;
      })
      .filter(r =>
        !q ||
        r.participant_name.toLowerCase().includes(q) ||
        r.participant_phone.toLowerCase().includes(q) ||
        r.ticket_code.toLowerCase().includes(q)
      );
  }, [registrations, selectedEvent, regSearch, regStatusFilter]);

  const metrics = useMemo(() => {
    const openEvents = churchEvents.filter(e => e.active !== false && e.status === 'OPEN').length;
    const validRegs = registrations.filter(r => r.status !== 'CANCELED');
    const checkedInCount = validRegs.filter(r => r.status === 'CHECKED_IN').length;
    const revenue = validRegs
      .filter(r => r.payment_status === 'PAID')
      .reduce((acc, r) => acc + (r.amount_paid || 0), 0);
    return {
      openEvents,
      totalRegs: validRegs.length,
      checkedInCount,
      revenue
    };
  }, [churchEvents, registrations]);

  const selectedCardMember = useMemo(
    () => activeMembers.find(m => m.id === selectedCardMemberId) || activeMembers[0] || null,
    [activeMembers, selectedCardMemberId]
  );

  const filteredCardMembers = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    if (!q) return activeMembers.slice(0, 40);
    return activeMembers.filter(
      m => m.name.toLowerCase().includes(q) || (m.phone || '').toLowerCase().includes(q)
    );
  }, [activeMembers, cardSearch]);

  useEffect(() => {
    if (activeTab === 'member_card' && selectedCardMember && memberCardQrRef.current) {
      const payload = `KOINONYA:MEMBER:${selectedCardMember.id}:${organization?.id || 'org'}:${selectedCardMember.name}`;
      QRCode.toCanvas(memberCardQrRef.current, payload, {
        width: 148,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' }
      }).catch(err => console.error('QR member card error:', err));
    }
  }, [activeTab, selectedCardMember, organization]);

  useEffect(() => {
    if (isPortalModalOpen && portalQrRef.current && publicPortalUrl) {
      QRCode.toCanvas(portalQrRef.current, publicPortalUrl, {
        width: 220,
        margin: 2,
        color: { dark: '#1e1b4b', light: '#ffffff' }
      }).catch(err => console.error('QR portal error:', err));
    }
  }, [isPortalModalOpen, publicPortalUrl]);

  const handleOpenNewEvent = () => {
    setEditingEvent({
      title: '',
      description: '',
      category: 'CONFERENCE',
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      start_time: '19:30',
      location: church?.address || 'Templo Principal',
      capacity: 100,
      registration_fee: 0,
      allow_public_registration: true,
      status: 'OPEN',
      active: true
    });
    setIsEventModalOpen(true);
  };

  const handleSubmitEventForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.title?.trim()) return;
    await onSaveEvent({
      ...editingEvent,
      capacity: Number(editingEvent.capacity) || 100,
      registration_fee: Number(editingEvent.registration_fee) || 0,
      created_by_name: editingEvent.created_by_name || currentUser?.name || 'Admin'
    });
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  const handleOpenEnrollModal = () => {
    setEnrollMemberId('');
    setEnrollName('');
    setEnrollPhone('');
    setEnrollEmail('');
    setEnrollPaid((selectedEvent?.registration_fee || 0) <= 0);
    setIsEnrollModalOpen(true);
  };

  const handleSelectEnrollMember = (memberId: string) => {
    setEnrollMemberId(memberId);
    const m = activeMembers.find(item => item.id === memberId);
    if (m) {
      setEnrollName(m.name);
      setEnrollPhone(m.phone || '');
      setEnrollEmail(m.email || '');
    }
  };

  const handleSubmitEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !enrollName.trim() || !enrollPhone.trim()) return;
    const isFree = (selectedEvent.registration_fee || 0) <= 0;
    const ticketCode = `KNY-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${String(Date.now()).slice(-3)}`;

    await onSaveRegistration({
      event_id: selectedEvent.id,
      event_title: selectedEvent.title,
      member_id: enrollMemberId || undefined,
      participant_name: enrollName.trim(),
      participant_phone: enrollPhone.trim(),
      participant_email: enrollEmail.trim(),
      ticket_code: ticketCode,
      payment_status: isFree ? 'FREE' : enrollPaid ? 'PAID' : 'PENDING',
      amount_paid: isFree ? 0 : selectedEvent.registration_fee,
      status: 'CONFIRMED',
      source: 'MANUAL'
    });

    setIsEnrollModalOpen(false);
  };

  const handleToggleRegCheckin = async (reg: EventRegistration) => {
    const nextStatus = reg.status === 'CHECKED_IN' ? 'CONFIRMED' : 'CHECKED_IN';
    await onSaveRegistration({
      ...reg,
      status: nextStatus,
      checked_in_at: nextStatus === 'CHECKED_IN' ? new Date() : null
    });
  };

  const handleToggleRegPayment = async (reg: EventRegistration) => {
    if (reg.payment_status === 'FREE') return;
    const nextPay = reg.payment_status === 'PAID' ? 'PENDING' : 'PAID';
    await onSaveRegistration({
      ...reg,
      payment_status: nextPay
    });
  };

  const handleSendWhatsAppTicket = async (reg: EventRegistration) => {
    const cleanPhone = (reg.participant_phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 8) return;
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const msg = `Paz, ${reg.participant_name.split(' ')[0]}! Sua inscrição em "${reg.event_title}" está confirmada na ${church?.name || 'nossa igreja'}. Código do seu ingresso: *${reg.ticket_code}*. Esperamos você!`;
    if (onLogMessage) {
      await onLogMessage(reg.member_id || reg.id, reg.participant_name, reg.participant_phone, msg);
    }
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const handleExportAttendeesCsv = () => {
    if (!selectedEvent) return;
    const headers = ['Ticket', 'Nome', 'Telefone', 'E-mail', 'Pagamento', 'Valor', 'Status', 'Origem', 'Inscrito em'];
    const rows = selectedEventRegs.map(r => [
      r.ticket_code,
      r.participant_name,
      r.participant_phone,
      r.participant_email || '',
      r.payment_status,
      r.amount_paid.toFixed(2),
      r.status,
      r.source,
      r.created_at.toLocaleDateString('pt-BR')
    ]);
    const csv = [headers, ...rows]
      .map(line => line.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inscritos-${selectedEvent.id}.csv`;
    link.click();
  };

  const handleCopyPortalLink = async () => {
    try {
      await navigator.clipboard.writeText(publicPortalUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setCopiedLink(false);
    }
  };

  const handleDownloadMemberCardQr = () => {
    if (!memberCardQrRef.current || !selectedCardMember) return;
    const link = document.createElement('a');
    link.download = `carteirinha-qr-${selectedCardMember.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = memberCardQrRef.current.toDataURL('image/png');
    link.click();
  };

  const getStageLabel = (stageId: string) =>
    stages.find(s => s.id === stageId)?.label || stageId;

  const getCellName = (cellId?: string) =>
    cellId ? cells.find(c => c.id === cellId)?.name || 'Célula vinculada' : 'Sem célula vinculada';

  return (
    <div className="h-full overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-50/60 dark:bg-slate-900">
      {/* Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Eventos, Inscrições & Portal da Igreja
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Inscrições online via QR Code, controle de vagas, check-in de participantes e carteirinha digital do membro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsPortalModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>QR & Link do Portal</span>
          </button>

          <button
            onClick={onOpenPublicPortalPreview}
            className="px-4 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir Portal Público</span>
          </button>

          <button
            onClick={handleOpenNewEvent}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Evento</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Eventos Abertos</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {metrics.openEvents}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Inscrições Confirmadas</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {metrics.totalRegs}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Check-ins Realizados</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {metrics.checkedInCount}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Taxas Recebidas</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
            {formatCurrencyBRL(metrics.revenue)}
          </p>
        </div>
      </div>

      {/* Segmented View Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'events'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Eventos & Inscrições</span>
          </button>
          <button
            onClick={() => setActiveTab('member_card')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'member_card'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <IdCard className="w-3.5 h-3.5" />
            <span>Carteirinha Digital do Membro</span>
          </button>
        </div>

        {churchEvents.length === 0 && activeTab === 'events' && (
          <button
            onClick={onSeedEvents}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Criar 3 eventos modelo
          </button>
        )}
      </div>

      {/* TAB 1: EVENTS & REGISTRATIONS */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Event Directory */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={eventSearch}
                  onChange={e => setEventSearch(e.target.value)}
                  placeholder="Buscar evento ou local..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[540px] overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nenhum evento cadastrado ainda.
                  </p>
                  <button
                    onClick={handleOpenNewEvent}
                    className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
                  >
                    Cadastrar Primeiro Evento
                  </button>
                </div>
              ) : (
                filteredEvents.map(ev => {
                  const count = registrations.filter(r => r.event_id === ev.id && r.status !== 'CANCELED').length;
                  const isSelected = ev.id === selectedEventId;
                  const st = EVENT_STATUS_LABELS[ev.status] || EVENT_STATUS_LABELS.OPEN;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`w-full text-left p-4 transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{EVENT_CATEGORY_LABELS[ev.category]}</span>
                        <span className={`font-semibold ${st.style}`}>{st.label}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 line-clamp-1">
                        {ev.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
                        <span>{ev.start_date.toLocaleDateString('pt-BR')}</span>
                        <span aria-hidden="true">·</span>
                        <span>{count}/{ev.capacity} vagas</span>
                        <span aria-hidden="true">·</span>
                        <span>{ev.registration_fee > 0 ? formatCurrencyBRL(ev.registration_fee) : 'Gratuito'}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Event & Registrations */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {selectedEvent ? (
              <>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {EVENT_CATEGORY_LABELS[selectedEvent.category]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {selectedEvent.allow_public_registration ? 'Visível no Portal Público' : 'Inscrição Interna'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedEvent.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {selectedEvent.start_date.toLocaleDateString('pt-BR')} às {selectedEvent.start_time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {selectedEvent.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {selectedEventRegs.filter(r => r.status !== 'CANCELED').length}/{selectedEvent.capacity} inscritos
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingEvent(selectedEvent);
                        setIsEventModalOpen(true);
                      }}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Editar Evento"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteEvent(selectedEvent.id)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                      title="Excluir Evento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleExportAttendeesCsv}
                      className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={handleOpenEnrollModal}
                      className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Inscrever Participante</span>
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="px-6 py-3 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regSearch}
                      onChange={e => setRegSearch(e.target.value)}
                      placeholder="Buscar por nome, telefone ou código..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
                    {[
                      { id: 'ALL', label: 'Todos' },
                      { id: 'CONFIRMED', label: 'Confirmados' },
                      { id: 'CHECKED_IN', label: 'Presentes' },
                      { id: 'PENDING_PAY', label: 'Pgto. Pendente' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setRegStatusFilter(f.id as any)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          regStatusFilter === f.id
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Registrations Table */}
                <div className="overflow-x-auto">
                  {selectedEventRegs.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <Ticket className="w-9 h-9 text-slate-300 mx-auto" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Nenhuma inscrição encontrada para este filtro.
                      </p>
                      <button
                        onClick={handleOpenEnrollModal}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
                      >
                        Inscrever Manualmente
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <th className="py-3 px-4">Participante</th>
                          <th className="py-3 px-4">Código</th>
                          <th className="py-3 px-4">Pagamento</th>
                          <th className="py-3 px-4">Presença</th>
                          <th className="py-3 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                        {selectedEventRegs.map(reg => (
                          <tr key={reg.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-900 dark:text-white">{reg.participant_name}</p>
                              <p className="text-slate-500 dark:text-slate-400 tabular-nums">
                                {reg.participant_phone}
                                {' · '}
                                {reg.source === 'PUBLIC_PORTAL' ? 'Portal Público' : 'Secretaria'}
                              </p>
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                              {reg.ticket_code}
                            </td>
                            <td className="py-3 px-4">
                              {reg.payment_status === 'FREE' ? (
                                <span className="text-slate-500 dark:text-slate-400">Gratuito</span>
                              ) : (
                                <button
                                  onClick={() => handleToggleRegPayment(reg)}
                                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                                    reg.payment_status === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                  }`}
                                >
                                  {reg.payment_status === 'PAID'
                                    ? `Pago (${formatCurrencyBRL(reg.amount_paid)})`
                                    : `Pendente (${formatCurrencyBRL(reg.amount_paid)})`}
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleRegCheckin(reg)}
                                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                                  reg.status === 'CHECKED_IN'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50'
                                }`}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>{reg.status === 'CHECKED_IN' ? 'Presente' : 'Fazer Check-in'}</span>
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleSendWhatsAppTicket(reg)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                                  title="Enviar confirmação por WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDeleteRegistration(reg.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                  title="Remover inscrição"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
                Selecione ou cadastre um evento para gerenciar participantes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DIGITAL MEMBER CARD */}
      {activeTab === 'member_card' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Member Picker */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Selecionar Membro</h3>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cardSearch}
                  onChange={e => setCardSearch(e.target.value)}
                  placeholder="Buscar membro por nome ou telefone..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[440px] overflow-y-auto">
              {filteredCardMembers.length === 0 ? (
                <p className="p-6 text-xs text-center text-slate-500">Nenhum membro encontrado.</p>
              ) : (
                filteredCardMembers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedCardMemberId(m.id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                      selectedCardMember?.id === m.id
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{m.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {getStageLabel(m.stage)} · {m.phone || 'Sem telefone'}
                      </p>
                    </div>
                    <IdCard className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Digital Card Preview */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8 space-y-6">
            {selectedCardMember ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Carteirinha Digital Koinonya
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Credencial com QR Code único para check-in rápido nos cultos e eventos.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleDownloadMemberCardQr}
                      className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar QR PNG</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir</span>
                    </button>
                  </div>
                </div>

                {/* Printable Credential Card */}
                <div className="max-w-lg mx-auto bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 overflow-hidden">
                        {church?.logo_url ? (
                          <img src={church.logo_url} alt={church.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <ChurchIcon className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{church?.name || organization?.name || 'Koinonya Church'}</p>
                        <p className="text-[11px] text-indigo-300 truncate">Credencial de Identificação Eclesiástica</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                      #{selectedCardMember.id.slice(0, 6).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-1 space-y-3 text-center sm:text-left min-w-0">
                      <div>
                        <p className="text-[11px] text-slate-400">Nome do Membro</p>
                        <p className="text-xl font-bold text-white truncate">{selectedCardMember.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[11px] text-slate-400">Estágio</p>
                          <p className="font-semibold text-indigo-300">{getStageLabel(selectedCardMember.stage)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Membro desde</p>
                          <p className="font-semibold text-white tabular-nums">
                            {new Date(selectedCardMember.registration_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs">
                        <p className="text-[11px] text-slate-400">Célula / Pequeno Grupo</p>
                        <p className="font-medium text-slate-200 truncate">{getCellName(selectedCardMember.cell_id)}</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl shrink-0">
                      <canvas ref={memberCardQrRef} className="rounded" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">
                Cadastre membros para emitir a carteirinha digital.
              </p>
            )}
          </div>
        </div>
      )}

      {/* EVENT CREATE/EDIT MODAL */}
      {isEventModalOpen && editingEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingEvent.id ? 'Editar Evento' : 'Novo Evento da Igreja'}
              </h3>
              <button
                onClick={() => { setIsEventModalOpen(false); setEditingEvent(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEventForm} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Título do Evento</label>
                <input
                  type="text"
                  required
                  value={editingEvent.title || ''}
                  onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  placeholder="Ex: Conferência de Famílias"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Categoria</label>
                  <select
                    value={editingEvent.category || 'CONFERENCE'}
                    onChange={e => setEditingEvent({ ...editingEvent, category: e.target.value as ChurchEventCategory })}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(EVENT_CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={editingEvent.status || 'OPEN'}
                    onChange={e => setEditingEvent({ ...editingEvent, status: e.target.value as ChurchEventStatus })}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(EVENT_STATUS_LABELS).map(([k, info]) => (
                      <option key={k} value={k}>{info.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Data</label>
                  <input
                    type="date"
                    required
                    value={(() => {
                      if (!editingEvent.start_date) return '';
                      const d = new Date(editingEvent.start_date);
                      if (isNaN(d.getTime())) return '';
                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    })()}
                    onChange={e => setEditingEvent({ ...editingEvent, start_date: new Date(`${e.target.value}T12:00:00`) })}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Horário</label>
                  <input
                    type="time"
                    required
                    value={editingEvent.start_time || '19:30'}
                    onChange={e => setEditingEvent({ ...editingEvent, start_time: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Local</label>
                <input
                  type="text"
                  required
                  value={editingEvent.location || ''}
                  onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Capacidade (Vagas)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingEvent.capacity ?? 100}
                    onChange={e => setEditingEvent({ ...editingEvent, capacity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Taxa R$ (0 = Gratuito)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editingEvent.registration_fee ?? 0}
                    onChange={e => setEditingEvent({ ...editingEvent, registration_fee: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Descrição</label>
                <textarea
                  rows={3}
                  value={editingEvent.description || ''}
                  onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingEvent.allow_public_registration !== false}
                  onChange={e => setEditingEvent({ ...editingEvent, allow_public_registration: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Publicar para inscrições abertas no Portal Público da Igreja</span>
              </label>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsEventModalOpen(false); setEditingEvent(null); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                >
                  Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL ENROLLMENT MODAL */}
      {isEnrollModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Nova Inscrição</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedEvent.title}</p>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEnroll} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Vincular membro cadastrado (opcional)
                </label>
                <select
                  value={enrollMemberId}
                  onChange={e => handleSelectEnrollMember(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Preencher participante avulso...</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.phone || 'sem fone'})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nome completo</label>
                <input
                  type="text"
                  required
                  value={enrollName}
                  onChange={e => setEnrollName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">WhatsApp</label>
                <input
                  type="text"
                  required
                  value={enrollPhone}
                  onChange={e => setEnrollPhone(e.target.value)}
                  placeholder="(11) 98888-7777"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">E-mail (opcional)</label>
                <input
                  type="email"
                  value={enrollEmail}
                  onChange={e => setEnrollEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {selectedEvent.registration_fee > 0 && (
                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enrollPaid}
                    onChange={e => setEnrollPaid(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Pagamento de {formatCurrencyBRL(selectedEvent.registration_fee)} já recebido</span>
                </label>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                >
                  Confirmar Inscrição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PUBLIC PORTAL QR CODE MODAL */}
      {isPortalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">QR Code do Portal da Igreja</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Eventos, inscrições online e pedidos de oração sem login.</p>
              </div>
              <button
                onClick={() => setIsPortalModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 text-center space-y-5">
              <div className="inline-block p-4 bg-white border border-slate-200 rounded-2xl">
                <canvas ref={portalQrRef} className="rounded-lg" />
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                <input
                  type="text"
                  readOnly
                  value={publicPortalUrl}
                  className="flex-1 bg-transparent text-xs font-mono text-slate-600 dark:text-slate-300 outline-none truncate"
                />
                <button
                  onClick={handleCopyPortalLink}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (!portalQrRef.current) return;
                    const link = document.createElement('a');
                    link.download = `qrcode-portal-${(church?.name || 'koinonya').toLowerCase().replace(/\s+/g, '-')}.png`;
                    link.href = portalQrRef.current.toDataURL('image/png');
                    link.click();
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PNG</span>
                </button>
                <button
                  onClick={() => {
                    setIsPortalModalOpen(false);
                    onOpenPublicPortalPreview();
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Visualizar Portal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsHubModule;
