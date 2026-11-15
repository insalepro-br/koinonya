import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Baby,
  Users,
  QrCode,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Printer,
  MessageCircle,
  Trash2,
  X,
  LogOut,
  UserPlus,
  CalendarDays,
  HeartHandshake,
  Check
} from 'lucide-react';
import {
  ServiceCheckin,
  CheckinType,
  Member,
  MemberStage,
  ScheduleEvent,
  Church,
  SystemUser
} from '../types';

interface CheckinModuleProps {
  checkins: ServiceCheckin[];
  members: Member[];
  events: ScheduleEvent[];
  church?: Church | null;
  currentUser?: SystemUser | null;
  onSaveCheckin: (checkin: Partial<ServiceCheckin>) => Promise<void>;
  onDeleteCheckin: (id: string) => Promise<void>;
  onCreateVisitorMember?: (member: Partial<Member>) => Promise<Member | void>;
  onOpenVisitorQr?: () => void;
  onLogMessage?: (personId: string, personName: string, personPhone: string, messageText: string) => Promise<void>;
  onOpenMember?: (member: Member) => void;
}

const KIDS_ROOMS = [
  { id: 'Berçário (0-2 anos)', label: 'Berçário', ageRange: '0–2 anos' },
  { id: 'Maternal (3-5 anos)', label: 'Maternal', ageRange: '3–5 anos' },
  { id: 'Primários (6-8 anos)', label: 'Primários', ageRange: '6–8 anos' },
  { id: 'Juniores (9-11 anos)', label: 'Juniores', ageRange: '9–11 anos' },
];

const formatDateKey = (d: Date) => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const generateSecurityCode = () => {
  const num = Math.floor(100 + Math.random() * 900);
  return `K-${num}`;
};

const sanitizePhoneForWa = (phone?: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
};

export const CheckinModule: React.FC<CheckinModuleProps> = ({
  checkins,
  members,
  events,
  church,
  currentUser,
  onSaveCheckin,
  onDeleteCheckin,
  onCreateVisitorMember,
  onOpenVisitorQr,
  onLogMessage,
  onOpenMember
}) => {
  const [subTab, setSubTab] = useState<'PORTARIA' | 'KIDS' | 'RADAR'>('PORTARIA');
  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  // Selected session state
  const [selectedEventId, setSelectedEventId] = useState<string>('CUSTOM_TODAY');
  const [customSessionTitle, setCustomSessionTitle] = useState('Culto de Celebração');
  const [sessionDateStr, setSessionDateStr] = useState(todayKey);

  // Portaria filters
  const [memberSearch, setMemberSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'MEMBER' | 'VISITOR' | 'KIDS'>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Kids filters & modals
  const [kidsRoomFilter, setKidsRoomFilter] = useState<string>('ALL');
  const [kidsSearch, setKidsSearch] = useState('');
  const [kidsStatusFilter, setKidsStatusFilter] = useState<'CHECKED_IN' | 'ALL'>('CHECKED_IN');
  const [isKidsModalOpen, setIsKidsModalOpen] = useState(false);
  const [selectedBadgeCheckin, setSelectedBadgeCheckin] = useState<ServiceCheckin | null>(null);
  const [checkoutTarget, setCheckoutTarget] = useState<ServiceCheckin | null>(null);
  const [checkoutCodeInput, setCheckoutCodeInput] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Kids Form
  const [kidsForm, setKidsForm] = useState({
    person_id: '',
    person_name: '',
    kids_room: KIDS_ROOMS[1].id,
    guardian_name: '',
    guardian_phone: '',
    allergies_notes: '',
    is_visitor: false
  });

  // Walk-in Visitor Modal
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [visitorForm, setVisitorForm] = useState({
    name: '',
    phone: '',
    email: '',
    neighborhood: '',
    household_name: '',
    notes: ''
  });

  // Radar de Frequência
  const [radarFilter, setRadarFilter] = useState<'ABSENT_15' | 'ABSENT_30' | 'FREQUENT' | 'ALL'>('ABSENT_15');
  const [radarSearch, setRadarSearch] = useState('');

  const activeMembers = useMemo(() => members.filter(m => m.active !== false), [members]);

  // Active session info
  const activeSession = useMemo(() => {
    if (selectedEventId !== 'CUSTOM_TODAY') {
      const ev = events.find(e => e.id === selectedEventId);
      if (ev) {
        return {
          event_id: ev.id,
          event_title: ev.title,
          service_date: new Date(ev.start_date),
          dateKey: formatDateKey(new Date(ev.start_date))
        };
      }
    }
    const [y, m, d] = sessionDateStr.split('-').map(Number);
    const parsedDate = new Date(y || new Date().getFullYear(), (m || 1) - 1, d || new Date().getDate(), 19, 0, 0);
    return {
      event_id: undefined,
      event_title: customSessionTitle.trim() || 'Culto de Celebração',
      service_date: parsedDate,
      dateKey: sessionDateStr
    };
  }, [selectedEventId, events, customSessionTitle, sessionDateStr]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // KPIs
  const todayCheckins = useMemo(
    () => checkins.filter(c => formatDateKey(c.service_date) === todayKey),
    [checkins, todayKey]
  );

  const activeKidsCount = useMemo(
    () => checkins.filter(c => c.checkin_type === 'KIDS' && c.status === 'CHECKED_IN').length,
    [checkins]
  );

  const todayVisitorsCount = useMemo(
    () => todayCheckins.filter(c => c.is_visitor).length,
    [todayCheckins]
  );

  // Compute attendance stats per active member
  const memberAttendanceStats = useMemo(() => {
    const now = Date.now();
    return activeMembers.map(member => {
      const memberCheckins = checkins.filter(c => c.person_id === member.id);
      const lastCheckinDate = memberCheckins.length > 0
        ? new Date(Math.max(...memberCheckins.map(c => new Date(c.service_date).getTime())))
        : new Date(member.last_activity);
      const daysSince = Math.max(0, Math.floor((now - lastCheckinDate.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        member,
        totalCheckins: memberCheckins.length,
        lastSeen: lastCheckinDate,
        daysSince,
        hasCheckedInEver: memberCheckins.length > 0
      };
    });
  }, [activeMembers, checkins]);

  const absentOver15Count = useMemo(
    () => memberAttendanceStats.filter(s => s.daysSince >= 15).length,
    [memberAttendanceStats]
  );

  // Session checkins
  const sessionCheckins = useMemo(() => {
    return checkins.filter(c => {
      const sameDate = formatDateKey(c.service_date) === activeSession.dateKey;
      if (activeSession.event_id && c.event_id) {
        return c.event_id === activeSession.event_id;
      }
      return sameDate && c.event_title.toLowerCase() === activeSession.event_title.toLowerCase();
    });
  }, [checkins, activeSession]);

  const filteredSessionCheckins = useMemo(() => {
    return sessionCheckins.filter(c => {
      if (attendanceFilter === 'MEMBER') return !c.is_visitor && c.checkin_type !== 'KIDS';
      if (attendanceFilter === 'VISITOR') return Boolean(c.is_visitor);
      if (attendanceFilter === 'KIDS') return c.checkin_type === 'KIDS';
      return true;
    });
  }, [sessionCheckins, attendanceFilter]);

  const checkedInPersonIdsInSession = useMemo(() => {
    const set = new Set<string>();
    sessionCheckins.forEach(c => {
      if (c.person_id) set.add(c.person_id);
    });
    return set;
  }, [sessionCheckins]);

  // Filtered members for quick portaria check-in
  const filteredPortariaMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return activeMembers
      .filter(m => {
        if (!q) return true;
        return (
          m.name.toLowerCase().includes(q) ||
          (m.phone && m.phone.toLowerCase().includes(q)) ||
          (m.household_name && m.household_name.toLowerCase().includes(q))
        );
      })
      .slice(0, 30);
  }, [activeMembers, memberSearch]);

  // Map household_name -> members
  const householdMembersMap = useMemo(() => {
    const map: Record<string, Member[]> = {};
    activeMembers.forEach(m => {
      const key = m.household_name?.trim().toLowerCase();
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(m);
      }
    });
    return map;
  }, [activeMembers]);

  // Quick single member check-in
  const handleQuickMemberCheckin = async (member: Member) => {
    if (checkedInPersonIdsInSession.has(member.id)) return;
    setBusyId(member.id);
    try {
      const isChild = member.household_role === 'CHILD';
      let guardianName: string | undefined;
      let guardianPhone: string | undefined;
      if (isChild && member.household_name) {
        const family = householdMembersMap[member.household_name.trim().toLowerCase()] || [];
        const guardian = family.find(f => f.household_role === 'HEAD') || family.find(f => f.household_role === 'SPOUSE') || family.find(f => f.id !== member.id);
        guardianName = guardian?.name;
        guardianPhone = guardian?.phone;
      }

      const code = isChild ? generateSecurityCode() : undefined;
      await onSaveCheckin({
        event_id: activeSession.event_id,
        event_title: activeSession.event_title,
        service_date: activeSession.service_date,
        checkin_type: isChild ? 'KIDS' : (activeSession.event_id ? 'EVENT' : 'SERVICE'),
        person_id: member.id,
        person_name: member.name,
        person_phone: member.phone,
        household_name: member.household_name,
        is_visitor: member.stage === MemberStage.NEW,
        kids_room: isChild ? KIDS_ROOMS[1].id : undefined,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        security_code: code,
        status: 'CHECKED_IN',
        checked_in_at: new Date(),
        checked_in_by: currentUser?.name || 'Recepção'
      });
      showToast(
        isChild
          ? `Check-in Kids registrado para ${member.name} (Código ${code}).`
          : `Presença confirmada para ${member.name}.`
      );
    } finally {
      setBusyId(null);
    }
  };

  // Family 1-click check-in
  const handleFamilyCheckin = async (householdName: string) => {
    const key = householdName.trim().toLowerCase();
    const family = householdMembersMap[key] || [];
    const pending = family.filter(m => !checkedInPersonIdsInSession.has(m.id));
    if (pending.length === 0) return;

    setBusyId(`fam_${key}`);
    try {
      const guardian = family.find(f => f.household_role === 'HEAD') || family.find(f => f.household_role === 'SPOUSE') || family[0];
      for (const m of pending) {
        const isChild = m.household_role === 'CHILD';
        await onSaveCheckin({
          event_id: activeSession.event_id,
          event_title: activeSession.event_title,
          service_date: activeSession.service_date,
          checkin_type: isChild ? 'KIDS' : (activeSession.event_id ? 'EVENT' : 'SERVICE'),
          person_id: m.id,
          person_name: m.name,
          person_phone: m.phone,
          household_name: m.household_name,
          is_visitor: m.stage === MemberStage.NEW,
          kids_room: isChild ? KIDS_ROOMS[1].id : undefined,
          guardian_name: isChild ? guardian?.name : undefined,
          guardian_phone: isChild ? guardian?.phone : undefined,
          security_code: isChild ? generateSecurityCode() : undefined,
          status: 'CHECKED_IN',
          checked_in_at: new Date(),
          checked_in_by: currentUser?.name || 'Recepção'
        });
      }
      showToast(`Família ${householdName}: ${pending.length} presença(s) registrada(s).`);
    } finally {
      setBusyId(null);
    }
  };

  // Quick Walk-in Visitor registration + Check-in
  const handleSubmitWalkinVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorForm.name.trim()) return;
    setBusyId('walkin');
    try {
      let createdMemberId: string | undefined;
      if (onCreateVisitorMember) {
        const created = await onCreateVisitorMember({
          name: visitorForm.name.trim(),
          phone: visitorForm.phone.trim() || 'Não informado',
          email: visitorForm.email.trim(),
          neighborhood: visitorForm.neighborhood.trim(),
          household_name: visitorForm.household_name.trim() || undefined,
          notes: visitorForm.notes.trim() || 'Registrado na Portaria durante check-in do culto.',
          stage: MemberStage.NEW,
          channel: 'MANUAL'
        });
        if (created && typeof created === 'object' && 'id' in created) {
          createdMemberId = created.id;
        }
      }

      await onSaveCheckin({
        event_id: activeSession.event_id,
        event_title: activeSession.event_title,
        service_date: activeSession.service_date,
        checkin_type: 'SERVICE',
        person_id: createdMemberId,
        person_name: visitorForm.name.trim(),
        person_phone: visitorForm.phone.trim(),
        household_name: visitorForm.household_name.trim() || undefined,
        is_visitor: true,
        status: 'CHECKED_IN',
        checked_in_at: new Date(),
        checked_in_by: currentUser?.name || 'Recepção'
      });

      setIsVisitorModalOpen(false);
      setVisitorForm({ name: '', phone: '', email: '', neighborhood: '', household_name: '', notes: '' });
      showToast(`Visitante ${visitorForm.name.trim()} cadastrado e com presença registrada.`);
    } finally {
      setBusyId(null);
    }
  };

  // Kids Check-in creation
  const handleSelectChildOption = (memberId: string) => {
    const child = activeMembers.find(m => m.id === memberId);
    if (!child) {
      setKidsForm(prev => ({ ...prev, person_id: '', person_name: '' }));
      return;
    }
    let guardianName = '';
    let guardianPhone = '';
    if (child.household_name) {
      const family = householdMembersMap[child.household_name.trim().toLowerCase()] || [];
      const guardian = family.find(f => f.household_role === 'HEAD') || family.find(f => f.household_role === 'SPOUSE') || family.find(f => f.id !== child.id);
      if (guardian) {
        guardianName = guardian.name;
        guardianPhone = guardian.phone || '';
      }
    }
    setKidsForm(prev => ({
      ...prev,
      person_id: child.id,
      person_name: child.name,
      guardian_name: guardianName || prev.guardian_name,
      guardian_phone: guardianPhone || prev.guardian_phone,
      is_visitor: child.stage === MemberStage.NEW
    }));
  };

  const handleSubmitKidsCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kidsForm.person_name.trim() || !kidsForm.guardian_name.trim()) return;
    setBusyId('kids_create');
    try {
      const code = generateSecurityCode();
      const newId = 'chk_' + Math.random().toString(36).substr(2, 9);
      const selectedChild = activeMembers.find(m => m.id === kidsForm.person_id);
      const payload: Partial<ServiceCheckin> = {
        id: newId,
        event_id: activeSession.event_id,
        event_title: activeSession.event_title,
        service_date: activeSession.service_date,
        checkin_type: 'KIDS',
        person_id: kidsForm.person_id || undefined,
        person_name: kidsForm.person_name.trim(),
        person_phone: kidsForm.guardian_phone.trim(),
        household_name: selectedChild?.household_name,
        is_visitor: kidsForm.is_visitor,
        kids_room: kidsForm.kids_room,
        guardian_name: kidsForm.guardian_name.trim(),
        guardian_phone: kidsForm.guardian_phone.trim(),
        security_code: code,
        allergies_notes: kidsForm.allergies_notes.trim() || undefined,
        status: 'CHECKED_IN',
        checked_in_at: new Date(),
        checked_in_by: currentUser?.name || 'Recepção Kids'
      };
      await onSaveCheckin(payload);
      setIsKidsModalOpen(false);
      setKidsForm({
        person_id: '',
        person_name: '',
        kids_room: KIDS_ROOMS[1].id,
        guardian_name: '',
        guardian_phone: '',
        allergies_notes: '',
        is_visitor: false
      });
      setSubTab('KIDS');
      setSelectedBadgeCheckin({
        ...(payload as ServiceCheckin),
        id: newId,
        org_id: currentUser?.org_id || '',
        church_id: currentUser?.church_id || 'main',
        created_at: new Date()
      });
      showToast(`Check-in Kids concluído. Código de segurança: ${code}.`);
    } finally {
      setBusyId(null);
    }
  };

  // Kids Checkout confirmation
  const handleConfirmKidsCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutTarget) return;
    const expected = (checkoutTarget.security_code || '').trim().toUpperCase();
    const entered = checkoutCodeInput.trim().toUpperCase();
    if (expected && entered !== expected) {
      setCheckoutError(`Código incorreto. Confira a etiqueta do responsável (${expected}).`);
      return;
    }
    setBusyId(checkoutTarget.id);
    try {
      await onSaveCheckin({
        ...checkoutTarget,
        status: 'CHECKED_OUT',
        checked_out_at: new Date(),
        checked_out_by: currentUser?.name || 'Recepção Kids'
      });
      showToast(`Retirada confirmada para ${checkoutTarget.person_name}.`);
      setCheckoutTarget(null);
      setCheckoutCodeInput('');
      setCheckoutError(null);
    } finally {
      setBusyId(null);
    }
  };

  // Send Kids security code or pastoral follow-up via WhatsApp + log to message_logs
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

  // Kids tab filtered list
  const kidsCheckinsList = useMemo(() => {
    const q = kidsSearch.trim().toLowerCase();
    return checkins.filter(c => {
      if (c.checkin_type !== 'KIDS') return false;
      if (kidsStatusFilter === 'CHECKED_IN' && c.status !== 'CHECKED_IN') return false;
      if (kidsRoomFilter !== 'ALL' && c.kids_room !== kidsRoomFilter) return false;
      if (!q) return true;
      return (
        c.person_name.toLowerCase().includes(q) ||
        (c.guardian_name && c.guardian_name.toLowerCase().includes(q)) ||
        (c.security_code && c.security_code.toLowerCase().includes(q))
      );
    });
  }, [checkins, kidsRoomFilter, kidsSearch, kidsStatusFilter]);

  const kidsRoomCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    KIDS_ROOMS.forEach(r => (counts[r.id] = 0));
    checkins.forEach(c => {
      if (c.checkin_type === 'KIDS' && c.status === 'CHECKED_IN' && c.kids_room) {
        counts[c.kids_room] = (counts[c.kids_room] || 0) + 1;
      }
    });
    return counts;
  }, [checkins]);

  // Radar filtered list
  const filteredRadar = useMemo(() => {
    const q = radarSearch.trim().toLowerCase();
    return memberAttendanceStats
      .filter(s => {
        if (radarFilter === 'ABSENT_15' && s.daysSince < 15) return false;
        if (radarFilter === 'ABSENT_30' && s.daysSince < 30) return false;
        if (radarFilter === 'FREQUENT' && s.totalCheckins === 0) return false;
        if (!q) return true;
        return (
          s.member.name.toLowerCase().includes(q) ||
          (s.member.neighborhood && s.member.neighborhood.toLowerCase().includes(q)) ||
          (s.member.household_name && s.member.household_name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.daysSince - a.daysSince);
  }, [memberAttendanceStats, radarFilter, radarSearch]);

  const childCandidates = useMemo(
    () => activeMembers.filter(m => m.household_role === 'CHILD'),
    [activeMembers]
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Check-in de Cultos & Koinonya Kids
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registro rápido de presença na portaria, etiquetas de segurança infantil e acompanhamento de frequência.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onOpenVisitorQr && (
            <button
              onClick={onOpenVisitorQr}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              QR Code Visitante
            </button>
          )}
          <button
            onClick={() => setIsVisitorModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Visitante na Portaria
          </button>
          <button
            onClick={() => setIsKidsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Baby className="w-4 h-4" />
            Novo Check-in Kids
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
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Presentes Hoje</span>
            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {todayCheckins.length}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Check-ins contabilizados na data de hoje
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Koinonya Kids Ativos</span>
            <Baby className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {activeKidsCount}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Crianças em sala aguardando retirada
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Visitantes no Culto</span>
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {todayVisitorsCount}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Acolhidos presencialmente hoje
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Radar de Ausências (+15d)</span>
            <HeartHandshake className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {absentOver15Count}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Contatos prontos para cuidado pastoral
          </p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg">
          <button
            onClick={() => setSubTab('PORTARIA')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'PORTARIA'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Portaria & Cultos
          </button>
          <button
            onClick={() => setSubTab('KIDS')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'KIDS'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Koinonya Kids ({activeKidsCount})
          </button>
          <button
            onClick={() => setSubTab('RADAR')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'RADAR'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Radar de Frequência ({absentOver15Count})
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Sessão ativa:</span>
          <strong className="text-slate-800 dark:text-slate-200">{activeSession.event_title}</strong>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{activeSession.service_date.toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      {/* TAB 1: PORTARIA & CULTOS */}
      {subTab === 'PORTARIA' && (
        <div className="space-y-6">
          {/* Session Selector */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Culto ou Evento da Agenda
              </label>
              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="CUSTOM_TODAY">Culto / Reunião Avulsa (Personalizado)</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} — {new Date(ev.start_date).toLocaleDateString('pt-BR')}
                  </option>
                ))}
              </select>
            </div>

            {selectedEventId === 'CUSTOM_TODAY' && (
              <>
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Nome da Celebração
                  </label>
                  <input
                    type="text"
                    value={customSessionTitle}
                    onChange={e => setCustomSessionTitle(e.target.value)}
                    placeholder="Ex: Culto de Domingo à Noite"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Data do Culto
                  </label>
                  <input
                    type="date"
                    value={sessionDateStr}
                    onChange={e => setSessionDateStr(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Fast Member & Family Check-in */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Busca Rápida de Membros & Famílias
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {activeMembers.length} cadastros ativos
                  </span>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Buscar por nome, telefone ou família..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700/70 max-h-[520px] overflow-y-auto">
                {filteredPortariaMembers.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Nenhum cadastro encontrado para "{memberSearch}".
                    </p>
                    <button
                      onClick={() => {
                        setVisitorForm(prev => ({ ...prev, name: memberSearch }));
                        setIsVisitorModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      <UserPlus className="w-4 h-4" />
                      Cadastrar como Visitante na Portaria
                    </button>
                  </div>
                ) : (
                  filteredPortariaMembers.map(member => {
                    const isCheckedIn = checkedInPersonIdsInSession.has(member.id);
                    const familyKey = member.household_name?.trim().toLowerCase();
                    const familyMembers = familyKey ? householdMembersMap[familyKey] || [] : [];
                    const pendingFamilyCount = familyMembers.filter(f => !checkedInPersonIdsInSession.has(f.id)).length;

                    return (
                      <div
                        key={member.id}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenMember?.(member)}
                              className="text-sm font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate text-left"
                            >
                              {member.name}
                            </button>
                            {member.household_role === 'CHILD' && (
                              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                                Kids
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            <span>{member.phone || 'Sem telefone'}</span>
                            {member.household_name && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{member.household_name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {familyMembers.length > 1 && pendingFamilyCount > 1 && member.household_name && (
                            <button
                              onClick={() => handleFamilyCheckin(member.household_name!)}
                              disabled={busyId === `fam_${familyKey}`}
                              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                              title={`Registrar presença para toda a família (${pendingFamilyCount} pessoas)`}
                            >
                              + Família ({pendingFamilyCount})
                            </button>
                          )}

                          {isCheckedIn ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap shrink-0">
                              <Check className="w-3.5 h-3.5" />
                              Presente
                            </span>
                          ) : (
                            <button
                              onClick={() => handleQuickMemberCheckin(member)}
                              disabled={busyId === member.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Check-in
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Attendance Sheet for Selected Session */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Lista de Presença · {sessionCheckins.length}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeSession.event_title}
                  </p>
                </div>

                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                  {([
                    { id: 'ALL', label: 'Todos' },
                    { id: 'MEMBER', label: 'Membros' },
                    { id: 'VISITOR', label: 'Visitantes' },
                    { id: 'KIDS', label: 'Kids' }
                  ] as const).map(f => (
                    <button
                      key={f.id}
                      onClick={() => setAttendanceFilter(f.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        attendanceFilter === f.id
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700/70 max-h-[520px] overflow-y-auto">
                {filteredSessionCheckins.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <UserCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Nenhuma presença registrada neste filtro ainda
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Selecione membros à esquerda ou registre um visitante na portaria.
                    </p>
                  </div>
                ) : (
                  filteredSessionCheckins.map(item => (
                    <div
                      key={item.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {item.person_name}
                          </span>
                          {item.checkin_type === 'KIDS' && item.security_code && (
                            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                              {item.security_code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                          <span className="tabular-nums">
                            {new Date(item.checked_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {item.checkin_type === 'KIDS'
                              ? item.kids_room || 'Koinonya Kids'
                              : item.is_visitor
                                ? 'Visitante'
                                : 'Membro'}
                          </span>
                          {item.household_name && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{item.household_name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.checkin_type === 'KIDS' && (
                          <button
                            onClick={() => setSelectedBadgeCheckin(item)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Ver Etiqueta de Segurança"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteCheckin(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Remover registro de presença"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KOINONYA KIDS */}
      {subTab === 'KIDS' && (
        <div className="space-y-6">
          {/* Room Capacity Interactive Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <button
              onClick={() => setKidsRoomFilter('ALL')}
              className={`p-3.5 rounded-xl border text-left transition-colors ${
                kidsRoomFilter === 'ALL'
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className={`text-xs font-medium ${kidsRoomFilter === 'ALL' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                Todas as Salas
              </div>
              <div className="text-xl font-bold mt-1 tabular-nums">{activeKidsCount}</div>
              <div className={`text-xs mt-0.5 ${kidsRoomFilter === 'ALL' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                Em sala agora
              </div>
            </button>

            {KIDS_ROOMS.map(room => {
              const isSelected = kidsRoomFilter === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => setKidsRoomFilter(isSelected ? 'ALL' : room.id)}
                  className={`p-3.5 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className={`text-xs font-medium ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {room.label}
                  </div>
                  <div className="text-xl font-bold mt-1 tabular-nums">{kidsRoomCounts[room.id] || 0}</div>
                  <div className={`text-xs mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {room.ageRange}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search & Status Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={kidsSearch}
                onChange={e => setKidsSearch(e.target.value)}
                placeholder="Buscar criança, responsável ou código (ex: K-482)..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg shrink-0">
              <button
                onClick={() => setKidsStatusFilter('CHECKED_IN')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  kidsStatusFilter === 'CHECKED_IN'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Em Sala ({activeKidsCount})
              </button>
              <button
                onClick={() => setKidsStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  kidsStatusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Histórico Completo
              </button>
            </div>
          </div>

          {/* Kids Grid */}
          {kidsCheckinsList.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center space-y-3">
              <Baby className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Nenhuma criança encontrada nesta visão
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Registre a entrada da criança para gerar automaticamente o código de segurança da etiqueta e vincular o responsável.
              </p>
              <button
                onClick={() => setIsKidsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4" />
                Registrar Primeiro Check-in Kids
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kidsCheckinsList.map(item => {
                const isCheckedOut = item.status === 'CHECKED_OUT';
                return (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4 ${
                      isCheckedOut ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                            {item.person_name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                            <span>{item.kids_room || 'Koinonya Kids'}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              Entrada {new Date(item.checked_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className={isCheckedOut ? 'text-slate-500 dark:text-slate-400 font-medium' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                              {isCheckedOut ? 'Retirada Concluída' : 'Em Sala'}
                            </span>
                          </div>
                        </div>

                        <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center shrink-0">
                          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Código</div>
                          <div className="text-base font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {item.security_code || 'K-000'}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Responsável:</span>{' '}
                          <strong className="text-slate-800 dark:text-slate-100">{item.guardian_name || 'Não informado'}</strong>
                          {item.guardian_phone && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span className="tabular-nums">{item.guardian_phone}</span>
                            </>
                          )}
                        </div>
                        {isCheckedOut && item.checked_out_at && (
                          <div className="text-slate-500 dark:text-slate-400 tabular-nums">
                            Retirada às {new Date(item.checked_out_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {item.checked_out_by ? ` por ${item.checked_out_by}` : ''}
                          </div>
                        )}
                      </div>

                      {item.allergies_notes && (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                          <span>
                            <strong>Cuidado / Alergia:</strong> {item.allergies_notes}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedBadgeCheckin(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Etiqueta
                        </button>
                        {item.guardian_phone && (
                          <button
                            onClick={() =>
                              handleSendWhatsApp(
                                item.guardian_phone,
                                item.person_id || item.id,
                                item.guardian_name || item.person_name,
                                `Olá ${item.guardian_name || ''}! Check-in de ${item.person_name} confirmado no Koinonya Kids (${item.kids_room}). Seu código de segurança para retirada é: *${item.security_code}*.`
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors whitespace-nowrap shrink-0"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </button>
                        )}
                      </div>

                      {!isCheckedOut ? (
                        <button
                          onClick={() => {
                            setCheckoutTarget(item);
                            setCheckoutCodeInput('');
                            setCheckoutError(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white transition-colors whitespace-nowrap shrink-0"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Confirmar Retirada
                        </button>
                      ) : (
                        <button
                          onClick={() => onDeleteCheckin(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg"
                          title="Excluir registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RADAR DE FREQUÊNCIA */}
      {subTab === 'RADAR' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={radarSearch}
                onChange={e => setRadarSearch(e.target.value)}
                placeholder="Buscar membro, bairro ou família..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
              {([
                { id: 'ABSENT_15', label: 'Ausentes +15 dias' },
                { id: 'ABSENT_30', label: 'Ausentes +30 dias' },
                { id: 'FREQUENT', label: 'Com Check-in' },
                { id: 'ALL', label: 'Todos' }
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => setRadarFilter(f.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    radarFilter === f.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Membro / Contato</th>
                    <th className="py-3 px-4">Última Presença / Atividade</th>
                    <th className="py-3 px-4 text-right">Dias Ausente</th>
                    <th className="py-3 px-4 text-right">Check-ins</th>
                    <th className="py-3 px-4 text-right">Ação Pastoral</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70 text-sm">
                  {filteredRadar.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500 dark:text-slate-400">
                        Nenhum contato encontrado para este critério de frequência.
                      </td>
                    </tr>
                  ) : (
                    filteredRadar.map(({ member, totalCheckins, lastSeen, daysSince }) => {
                      const firstName = member.name.split(' ')[0];
                      const churchName = church?.name || 'nossa igreja';
                      const careMessage = `Olá ${firstName}! Tudo bem? Sentimos sua falta nos cultos da ${churchName}. Estamos orando por você e sua família! Caso precise de algo ou de uma visita, conte conosco.`;

                      return (
                        <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => onOpenMember?.(member)}
                              className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left"
                            >
                              {member.name}
                            </button>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {member.phone || 'Sem telefone'}
                              {member.neighborhood ? ` · ${member.neighborhood}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                            {lastSeen.toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            <span
                              className={`text-xs font-semibold ${
                                daysSince >= 30
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : daysSince >= 15
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {daysSince}d
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                            {totalCheckins}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleSendWhatsApp(member.phone, member.id, member.name, careMessage)}
                              disabled={!member.phone}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-40 whitespace-nowrap shrink-0"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Enviar Cuidado
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO CHECK-IN KIDS */}
      {isKidsModalOpen && (
        <div className="fixed inset-0 !mt-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Baby className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Novo Check-in · Koinonya Kids
                </h3>
              </div>
              <button
                onClick={() => setIsKidsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitKidsCheckin} className="p-6 space-y-4">
              {childCandidates.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Selecionar Criança Cadastrada (Opcional)
                  </label>
                  <select
                    value={kidsForm.person_id}
                    onChange={e => handleSelectChildOption(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Digitar criança manualmente / visitante...</option>
                    {childCandidates.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.household_name ? `(${c.household_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Nome da Criança *
                  </label>
                  <input
                    type="text"
                    required
                    value={kidsForm.person_name}
                    onChange={e => setKidsForm(prev => ({ ...prev, person_name: e.target.value }))}
                    placeholder="Nome completo"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Salinha / Faixa Etária *
                  </label>
                  <select
                    value={kidsForm.kids_room}
                    onChange={e => setKidsForm(prev => ({ ...prev, kids_room: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    {KIDS_ROOMS.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Nome do Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    value={kidsForm.guardian_name}
                    onChange={e => setKidsForm(prev => ({ ...prev, guardian_name: e.target.value }))}
                    placeholder="Pai, mãe ou responsável"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    WhatsApp do Responsável
                  </label>
                  <input
                    type="text"
                    value={kidsForm.guardian_phone}
                    onChange={e => setKidsForm(prev => ({ ...prev, guardian_phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Alergias, Restrições ou Observações
                </label>
                <textarea
                  rows={2}
                  value={kidsForm.allergies_notes}
                  onChange={e => setKidsForm(prev => ({ ...prev, allergies_notes: e.target.value }))}
                  placeholder="Ex: Alergia a amendoim, restrição à lactose, usa fralda..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kidsForm.is_visitor}
                  onChange={e => setKidsForm(prev => ({ ...prev, is_visitor: e.target.checked }))}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400"
                />
                <span>Criança visitante (primeira vez no ministério infantil)</span>
              </label>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsKidsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'kids_create'}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                >
                  Gerar Código & Fazer Check-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISITANTE NA PORTARIA */}
      {isVisitorModalOpen && (
        <div className="fixed inset-0 !mt-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Visitante na Portaria
                </h3>
              </div>
              <button onClick={() => setIsVisitorModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitWalkinVisitor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={visitorForm.name}
                  onChange={e => setVisitorForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do visitante"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={visitorForm.phone}
                    onChange={e => setVisitorForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={visitorForm.neighborhood}
                    onChange={e => setVisitorForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                    placeholder="Ex: Centro"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Família / Pedido de Oração (Opcional)
                </label>
                <input
                  type="text"
                  value={visitorForm.notes}
                  onChange={e => setVisitorForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observação rápida para acolhimento"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsVisitorModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'walkin'}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  Cadastrar & Confirmar Presença
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ETIQUETA DE SEGURANÇA KIDS */}
      {selectedBadgeCheckin && (
        <div className="fixed inset-0 !mt-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Etiqueta de Segurança Infantil
              </h3>
              <button onClick={() => setSelectedBadgeCheckin(null)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Etiqueta Criança + Canhoto Responsável */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-5 bg-slate-50 dark:bg-slate-900/70 space-y-4 text-center">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {church?.name || 'Koinonya Kids'} · {selectedBadgeCheckin.kids_room}
                </div>
                <div className="text-4xl font-mono font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {selectedBadgeCheckin.security_code || 'K-000'}
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedBadgeCheckin.person_name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Responsável: <strong>{selectedBadgeCheckin.guardian_name || 'N/D'}</strong>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                    {new Date(selectedBadgeCheckin.checked_in_at).toLocaleString('pt-BR')}
                  </div>
                </div>
                {selectedBadgeCheckin.allergies_notes && (
                  <div className="p-2 rounded-lg bg-amber-100/80 dark:bg-amber-950/50 text-xs font-medium text-amber-900 dark:text-amber-200">
                    Atenção: {selectedBadgeCheckin.allergies_notes}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5">
                {selectedBadgeCheckin.guardian_phone && (
                  <button
                    onClick={() =>
                      handleSendWhatsApp(
                        selectedBadgeCheckin.guardian_phone,
                        selectedBadgeCheckin.person_id || selectedBadgeCheckin.id,
                        selectedBadgeCheckin.guardian_name || selectedBadgeCheckin.person_name,
                        `Olá ${selectedBadgeCheckin.guardian_name || ''}! Check-in de ${selectedBadgeCheckin.person_name} realizado no Koinonya Kids (${selectedBadgeCheckin.kids_room}). Apresente o código *${selectedBadgeCheckin.security_code}* na retirada.`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar Código no WhatsApp
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Etiqueta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHECK-OUT SEGURO KIDS */}
      {checkoutTarget && (
        <div className="fixed inset-0 !mt-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirmar Retirada · Koinonya Kids
                </h3>
              </div>
              <button onClick={() => setCheckoutTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmKidsCheckout} className="p-6 space-y-4">
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                <div>
                  Criança: <strong className="text-slate-900 dark:text-white">{checkoutTarget.person_name}</strong>
                </div>
                <div>
                  Responsável: <strong className="text-slate-900 dark:text-white">{checkoutTarget.guardian_name}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Digite o Código de Segurança da Etiqueta ({checkoutTarget.security_code})
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={checkoutCodeInput}
                  onChange={e => {
                    setCheckoutCodeInput(e.target.value);
                    setCheckoutError(null);
                  }}
                  placeholder={checkoutTarget.security_code || 'K-000'}
                  className="w-full px-3 py-2.5 text-base font-mono font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                {checkoutError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium">
                    {checkoutError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCheckoutTarget(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busyId === checkoutTarget.id}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <LogOut className="w-4 h-4" />
                  Liberar Criança
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckinModule;
