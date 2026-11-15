import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Users,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  AlertTriangle,
  MessageCircle,
  Copy,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  UserPlus,
  CalendarDays,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  Ministry,
  MinistrySchedule,
  ScheduleAssignment,
  AssignmentStatus,
  Member,
  SystemUser,
  ScheduleEvent,
  Church
} from '../types';

interface MinistriesModuleProps {
  ministries: Ministry[];
  schedules: MinistrySchedule[];
  members: Member[];
  team: SystemUser[];
  events: ScheduleEvent[];
  church?: Church | null;
  currentUser?: SystemUser | null;
  onSaveMinistry: (ministry: Partial<Ministry>) => Promise<void>;
  onDeleteMinistry: (id: string) => Promise<void>;
  onSaveSchedule: (schedule: Partial<MinistrySchedule>) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onSeedMinistries?: () => Promise<void>;
  onLogMessage?: (personId: string, personName: string, personPhone: string, messageText: string) => Promise<void>;
}

interface PersonOption {
  id: string;
  name: string;
  phone: string;
  type: 'MEMBER' | 'TEAM';
  subtitle: string;
}

const formatLocalDateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateInputValue = (date?: Date | string) => {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) return formatLocalDateKey(new Date());
  return formatLocalDateKey(d);
};

const toDateKey = (date: Date | string) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return formatLocalDateKey(d);
};

const formatWaNumber = (phone?: string) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
};

const STATUS_META: Record<AssignmentStatus, { label: string; textClass: string }> = {
  CONFIRMED: { label: 'Confirmado', textClass: 'text-emerald-600 dark:text-emerald-400' },
  PENDING: { label: 'Pendente', textClass: 'text-amber-600 dark:text-amber-400' },
  DECLINED: { label: 'Indisponível', textClass: 'text-rose-600 dark:text-rose-400' }
};

const MinistriesModule: React.FC<MinistriesModuleProps> = ({
  ministries = [],
  schedules = [],
  members = [],
  team = [],
  events = [],
  church,
  currentUser,
  onSaveMinistry,
  onDeleteMinistry,
  onSaveSchedule,
  onDeleteSchedule,
  onSeedMinistries,
  onLogMessage
}) => {
  const [activeTab, setActiveTab] = useState<'schedules' | 'ministries' | 'volunteers'>('schedules');
  const [searchTerm, setSearchTerm] = useState('');
  const [ministryFilter, setMinistryFilter] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<'UPCOMING' | 'ALL' | 'PAST'>('UPCOMING');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [copiedScheduleId, setCopiedScheduleId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Ministry Modal State
  const [isMinistryModalOpen, setIsMinistryModalOpen] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);
  const [roleDraft, setRoleDraft] = useState('');
  const [volunteerSearch, setVolunteerSearch] = useState('');
  const [ministryForm, setMinistryForm] = useState<{
    name: string;
    description: string;
    leader_id: string;
    default_roles: string[];
    volunteer_ids: string[];
  }>({
    name: '',
    description: '',
    leader_id: '',
    default_roles: [],
    volunteer_ids: []
  });

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MinistrySchedule | null>(null);
  const [assignmentPersonId, setAssignmentPersonId] = useState('');
  const [assignmentRole, setAssignmentRole] = useState('');
  const [scheduleForm, setScheduleForm] = useState<{
    ministry_id: string;
    event_id: string;
    event_title: string;
    service_date: string;
    start_time: string;
    end_time: string;
    notes: string;
    assignments: ScheduleAssignment[];
  }>({
    ministry_id: '',
    event_id: '',
    event_title: '',
    service_date: formatDateInputValue(new Date()),
    start_time: '19:00',
    end_time: '21:00',
    notes: '',
    assignments: []
  });

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const activeMinistries = useMemo(
    () => ministries.filter(m => m.active !== false),
    [ministries]
  );

  // Combined directory of team users + active members as potential volunteers
  const allPeopleOptions: PersonOption[] = useMemo(() => {
    const map = new Map<string, PersonOption>();
    team.forEach(u => {
      map.set(u.id, {
        id: u.id,
        name: u.name,
        phone: u.whatsapp || '',
        type: 'TEAM',
        subtitle: u.duty || 'Equipe Pastoral'
      });
    });
    members
      .filter(m => m.active !== false)
      .forEach(m => {
        if (!map.has(m.id)) {
          map.set(m.id, {
            id: m.id,
            name: m.name,
            phone: m.phone || '',
            type: 'MEMBER',
            subtitle: m.neighborhood ? `Membro · ${m.neighborhood}` : 'Contato / Membro'
          });
        }
      });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [team, members]);

  // Conflict Map: dateKey -> person_id -> array of schedules on that date
  const scheduleConflictsMap = useMemo(() => {
    const map = new Map<string, Map<string, MinistrySchedule[]>>();
    schedules.forEach(sch => {
      const dKey = toDateKey(sch.service_date);
      if (!dKey) return;
      if (!map.has(dKey)) map.set(dKey, new Map());
      const dateMap = map.get(dKey)!;
      sch.assignments.forEach(a => {
        if (a.status === 'DECLINED') return;
        const list = dateMap.get(a.person_id) || [];
        list.push(sch);
        dateMap.set(a.person_id, list);
      });
    });
    return map;
  }, [schedules]);

  const getConflictsForPersonOnDate = (
    personId: string,
    dateStr: string,
    excludeScheduleId?: string
  ): MinistrySchedule[] => {
    const dateMap = scheduleConflictsMap.get(dateStr);
    if (!dateMap) return [];
    const list = dateMap.get(personId) || [];
    return list.filter(s => s.id !== excludeScheduleId);
  };

  // KPIs
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const upcomingSchedules = useMemo(
    () => schedules.filter(s => new Date(s.service_date) >= todayStart),
    [schedules, todayStart]
  );

  const uniqueVolunteersCount = useMemo(() => {
    const ids = new Set<string>();
    activeMinistries.forEach(m => m.volunteer_ids.forEach(id => ids.add(id)));
    schedules.forEach(s => s.assignments.forEach(a => ids.add(a.person_id)));
    return ids.size;
  }, [activeMinistries, schedules]);

  const pendingConfirmationsCount = useMemo(() => {
    return upcomingSchedules.reduce(
      (acc, sch) => acc + sch.assignments.filter(a => a.status === 'PENDING').length,
      0
    );
  }, [upcomingSchedules]);

  const totalConflictsCount = useMemo(() => {
    let count = 0;
    upcomingSchedules.forEach(sch => {
      const dKey = toDateKey(sch.service_date);
      sch.assignments.forEach(a => {
        if (a.status !== 'DECLINED' && getConflictsForPersonOnDate(a.person_id, dKey, sch.id).length > 0) {
          count += 1;
        }
      });
    });
    return count;
  }, [upcomingSchedules, scheduleConflictsMap]);

  // Filtered Schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(sch => {
      const schDate = new Date(sch.service_date);
      if (timeFilter === 'UPCOMING' && schDate < todayStart) return false;
      if (timeFilter === 'PAST' && schDate >= todayStart) return false;
      if (ministryFilter !== 'ALL' && sch.ministry_id !== ministryFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchEvent = sch.event_title.toLowerCase().includes(q);
        const matchMin = sch.ministry_name.toLowerCase().includes(q);
        const matchVolunteer = sch.assignments.some(
          a => a.person_name.toLowerCase().includes(q) || a.role_name.toLowerCase().includes(q)
        );
        return matchEvent || matchMin || matchVolunteer;
      }
      return true;
    });
  }, [schedules, timeFilter, todayStart, ministryFilter, searchTerm]);

  // Volunteer overview aggregation
  const volunteerRosterSummary = useMemo(() => {
    const byPerson = new Map<
      string,
      {
        person: PersonOption;
        ministries: string[];
        assignments: Array<{ schedule: MinistrySchedule; assignment: ScheduleAssignment; hasConflict: boolean }>;
      }
    >();

    activeMinistries.forEach(min => {
      min.volunteer_ids.forEach(pid => {
        const person = allPeopleOptions.find(p => p.id === pid);
        if (!person) return;
        if (!byPerson.has(pid)) {
          byPerson.set(pid, { person, ministries: [], assignments: [] });
        }
        byPerson.get(pid)!.ministries.push(min.name);
      });
    });

    upcomingSchedules.forEach(sch => {
      const dKey = toDateKey(sch.service_date);
      sch.assignments.forEach(a => {
        const person = allPeopleOptions.find(p => p.id === a.person_id) || {
          id: a.person_id,
          name: a.person_name,
          phone: a.person_phone || '',
          type: a.person_type,
          subtitle: 'Voluntário'
        };
        if (!byPerson.has(a.person_id)) {
          byPerson.set(a.person_id, { person, ministries: [], assignments: [] });
        }
        const hasConflict =
          a.status !== 'DECLINED' && getConflictsForPersonOnDate(a.person_id, dKey, sch.id).length > 0;
        byPerson.get(a.person_id)!.assignments.push({ schedule: sch, assignment: a, hasConflict });
      });
    });

    return Array.from(byPerson.values())
      .filter(item =>
        !searchTerm.trim() ||
        item.person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ministries.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => a.person.name.localeCompare(b.person.name));
  }, [activeMinistries, upcomingSchedules, allPeopleOptions, searchTerm, scheduleConflictsMap]);

  // Handlers: Seed
  const handleSeed = async () => {
    if (!onSeedMinistries || isSeeding) return;
    setIsSeeding(true);
    try {
      await onSeedMinistries();
      showFeedback('Ministérios padrão criados com sucesso.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Handlers: Ministry Modal
  const openCreateMinistry = () => {
    setEditingMinistry(null);
    setMinistryForm({
      name: '',
      description: '',
      leader_id: '',
      default_roles: ['Líder de Turno', 'Apoio / Voluntário'],
      volunteer_ids: []
    });
    setRoleDraft('');
    setVolunteerSearch('');
    setIsMinistryModalOpen(true);
  };

  const openEditMinistry = (min: Ministry) => {
    setEditingMinistry(min);
    setMinistryForm({
      name: min.name,
      description: min.description || '',
      leader_id: min.leader_id || '',
      default_roles: [...min.default_roles],
      volunteer_ids: [...min.volunteer_ids]
    });
    setRoleDraft('');
    setVolunteerSearch('');
    setIsMinistryModalOpen(true);
  };

  const handleAddRoleDraft = () => {
    const trimmed = roleDraft.trim();
    if (!trimmed) return;
    if (!ministryForm.default_roles.includes(trimmed)) {
      setMinistryForm(prev => ({ ...prev, default_roles: [...prev.default_roles, trimmed] }));
    }
    setRoleDraft('');
  };

  const handleSubmitMinistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ministryForm.name.trim()) return;
    const leader = team.find(u => u.id === ministryForm.leader_id);

    await onSaveMinistry({
      id: editingMinistry?.id || 'min_' + Math.random().toString(36).substr(2, 9),
      name: ministryForm.name.trim(),
      description: ministryForm.description.trim(),
      leader_id: leader?.id || '',
      leader_name: leader?.name || '',
      default_roles: ministryForm.default_roles,
      volunteer_ids: ministryForm.volunteer_ids,
      active: true,
      created_at: editingMinistry?.created_at || new Date()
    });

    setIsMinistryModalOpen(false);
    showFeedback(editingMinistry ? 'Ministério atualizado.' : 'Novo ministério criado.');
  };

  // Handlers: Schedule Modal
  const openCreateSchedule = (preselectedMinistryId?: string) => {
    const targetMin =
      activeMinistries.find(m => m.id === preselectedMinistryId) || activeMinistries[0] || null;
    setEditingSchedule(null);
    setScheduleForm({
      ministry_id: targetMin?.id || '',
      event_id: '',
      event_title: 'Culto de Celebração',
      service_date: formatDateInputValue(new Date()),
      start_time: '19:00',
      end_time: '21:00',
      notes: '',
      assignments: []
    });
    setAssignmentRole(targetMin?.default_roles[0] || '');
    setAssignmentPersonId('');
    setIsScheduleModalOpen(true);
  };

  const openEditSchedule = (sch: MinistrySchedule) => {
    const targetMin = activeMinistries.find(m => m.id === sch.ministry_id);
    setEditingSchedule(sch);
    setScheduleForm({
      ministry_id: sch.ministry_id,
      event_id: sch.event_id || '',
      event_title: sch.event_title,
      service_date: formatDateInputValue(sch.service_date),
      start_time: sch.start_time,
      end_time: sch.end_time || '',
      notes: sch.notes || '',
      assignments: [...sch.assignments]
    });
    setAssignmentRole(targetMin?.default_roles[0] || '');
    setAssignmentPersonId('');
    setIsScheduleModalOpen(true);
  };

  const handleSelectAgendaEvent = (eventId: string) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) {
      setScheduleForm(prev => ({ ...prev, event_id: '' }));
      return;
    }
    const start = new Date(ev.start_date);
    const end = new Date(ev.end_date);
    setScheduleForm(prev => ({
      ...prev,
      event_id: ev.id,
      event_title: ev.title,
      service_date: formatDateInputValue(start),
      start_time: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      end_time: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
    }));
  };

  const handleAddAssignment = () => {
    if (!assignmentPersonId || !assignmentRole.trim()) return;
    const person = allPeopleOptions.find(p => p.id === assignmentPersonId);
    if (!person) return;

    const newAssignment: ScheduleAssignment = {
      id: 'asg_' + Math.random().toString(36).substr(2, 8),
      person_id: person.id,
      person_name: person.name,
      person_phone: person.phone,
      person_type: person.type,
      role_name: assignmentRole.trim(),
      status: 'PENDING'
    };

    setScheduleForm(prev => ({
      ...prev,
      assignments: [...prev.assignments, newAssignment]
    }));
    setAssignmentPersonId('');
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    setScheduleForm(prev => ({
      ...prev,
      assignments: prev.assignments.filter(a => a.id !== assignmentId)
    }));
  };

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = activeMinistries.find(m => m.id === scheduleForm.ministry_id);
    if (!min || !scheduleForm.event_title.trim() || !scheduleForm.service_date) return;

    const parsedDate = new Date(`${scheduleForm.service_date}T${scheduleForm.start_time || '19:00'}:00`);

    await onSaveSchedule({
      id: editingSchedule?.id || 'sch_' + Math.random().toString(36).substr(2, 9),
      ministry_id: min.id,
      ministry_name: min.name,
      event_id: scheduleForm.event_id || undefined,
      event_title: scheduleForm.event_title.trim(),
      service_date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
      start_time: scheduleForm.start_time || '19:00',
      end_time: scheduleForm.end_time || undefined,
      assignments: scheduleForm.assignments,
      notes: scheduleForm.notes.trim(),
      created_by_name: currentUser?.name || 'Equipe',
      created_at: editingSchedule?.created_at || new Date()
    });

    setIsScheduleModalOpen(false);
    showFeedback(editingSchedule ? 'Escala atualizada.' : 'Escala salva com sucesso.');
  };

  const handleUpdateAssignmentStatus = async (
    sch: MinistrySchedule,
    assignmentId: string,
    newStatus: AssignmentStatus
  ) => {
    const updatedAssignments = sch.assignments.map(a =>
      a.id === assignmentId ? { ...a, status: newStatus } : a
    );
    await onSaveSchedule({
      ...sch,
      assignments: updatedAssignments
    });
  };

  const buildVolunteerWhatsAppMsg = (sch: MinistrySchedule, assignment: ScheduleAssignment) => {
    const dateStr = new Date(sch.service_date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });
    const firstName = assignment.person_name.split(' ')[0];
    const churchName = church?.name || 'Comunidade Koinonya';
    return (
      `Paz, ${firstName}! Você foi escalado(a) no ministério *${sch.ministry_name}* da ${churchName}:\n\n` +
      `• Culto/Evento: ${sch.event_title}\n` +
      `• Data: ${dateStr} às ${sch.start_time}\n` +
      `• Função: ${assignment.role_name}\n\n` +
      `Podemos confirmar sua presença nesta escala? Deus abençoe!`
    );
  };

  const handleCopyFullSchedule = (sch: MinistrySchedule) => {
    const dateStr = new Date(sch.service_date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });
    const lines = sch.assignments.map(
      a => `• ${a.role_name}: ${a.person_name} (${STATUS_META[a.status].label})`
    );
    const text =
      `*ESCALA — ${sch.ministry_name.toUpperCase()}*\n` +
      `${sch.event_title} · ${dateStr} às ${sch.start_time}\n\n` +
      (lines.length > 0 ? lines.join('\n') : 'Nenhum voluntário escalado ainda.') +
      (sch.notes ? `\n\nObs: ${sch.notes}` : '');

    navigator.clipboard.writeText(text);
    setCopiedScheduleId(sch.id);
    setTimeout(() => setCopiedScheduleId(null), 2000);
  };

  const selectedModalMinistry = useMemo(
    () => activeMinistries.find(m => m.id === scheduleForm.ministry_id) || null,
    [activeMinistries, scheduleForm.ministry_id]
  );

  const prioritizedPeopleForModal = useMemo(() => {
    if (!selectedModalMinistry) return allPeopleOptions;
    const rosterSet = new Set(selectedModalMinistry.volunteer_ids);
    return [...allPeopleOptions].sort((a, b) => {
      const aIn = rosterSet.has(a.id) ? 0 : 1;
      const bIn = rosterSet.has(b.id) ? 0 : 1;
      if (aIn !== bIn) return aIn - bIn;
      return a.name.localeCompare(b.name);
    });
  }, [allPeopleOptions, selectedModalMinistry]);

  return (
    <div className="p-6 md:p-8 h-full flex flex-col gap-6 bg-slate-50/50 dark:bg-slate-900 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase">
            Ministérios & Escalas
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
            Organize equipes de serviço, monte escalas por culto com detecção de conflitos e notifique voluntários.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activeMinistries.length === 0 && onSeedMinistries && (
            <button
              type="button"
              onClick={handleSeed}
              disabled={isSeeding}
              className="px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              {isSeeding ? 'Criando...' : 'Carregar Ministérios Padrão'}
            </button>
          )}

          <button
            type="button"
            onClick={openCreateMinistry}
            className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Ministério</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateSchedule()}
            disabled={activeMinistries.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Nova Escala</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="px-5 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Ministérios Ativos</p>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1 tabular-nums">
            {activeMinistries.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Voluntários Engajados</p>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1 tabular-nums">
            {uniqueVolunteersCount}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Próximas Escalas</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
            {upcomingSchedules.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Pendências / Conflitos</p>
          <div className="flex items-baseline gap-2 mt-1 tabular-nums">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {pendingConfirmationsCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">pendentes</span>
            {totalConflictsCount > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-500">·</span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                  {totalConflictsCount} conflito(s)
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Tabs & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
        <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'schedules'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Escalas por Culto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ministries')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'ministries'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Ministérios & Equipes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('volunteers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'volunteers'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Agenda por Voluntário
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar culto, ministério ou voluntário..."
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none w-64"
            />
          </div>

          {activeTab === 'schedules' && (
            <>
              <select
                value={ministryFilter}
                onChange={e => setMinistryFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="ALL">Todos os Ministérios</option>
                {activeMinistries.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>

              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value as any)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="UPCOMING">Próximas</option>
                <option value="ALL">Todas</option>
                <option value="PAST">Anteriores</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {/* TAB 1: SCHEDULES */}
        {activeTab === 'schedules' && (
          <div className="space-y-4 pb-8">
            {filteredSchedules.map(sch => {
              const dKey = toDateKey(sch.service_date);
              const dateLabel = new Date(sch.service_date).toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });
              const confirmedCount = sch.assignments.filter(a => a.status === 'CONFIRMED').length;

              const scheduleConflicts = sch.assignments.filter(
                a => a.status !== 'DECLINED' && getConflictsForPersonOnDate(a.person_id, dKey, sch.id).length > 0
              );

              return (
                <div
                  key={sch.id}
                  className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-5"
                >
                  {/* Schedule Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{sch.ministry_name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{dateLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {sch.start_time}{sch.end_time ? `–${sch.end_time}` : ''}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {confirmedCount}/{sch.assignments.length} confirmados
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1">
                        {sch.event_title}
                      </h3>
                      {sch.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sch.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyFullSchedule(sch)}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedScheduleId === sch.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedScheduleId === sch.id ? 'Copiada!' : 'Copiar Escala'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditSchedule(sch)}
                        className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteSchedule(sch.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                        title="Excluir escala"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Conflict Alert Banner */}
                  {scheduleConflicts.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Conflito de horário detectado nesta data:</p>
                        <ul className="mt-1 space-y-0.5">
                          {scheduleConflicts.map(a => {
                            const others = getConflictsForPersonOnDate(a.person_id, dKey, sch.id);
                            return (
                              <li key={a.id}>
                                <strong>{a.person_name}</strong> também está escalado(a) em{' '}
                                {others.map(o => `${o.ministry_name} (${o.start_time})`).join(', ')}.
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Volunteer Assignments Table */}
                  {sch.assignments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-700 text-[11px] font-bold text-slate-400 uppercase">
                            <th className="py-2 pr-4">Função</th>
                            <th className="py-2 pr-4">Voluntário</th>
                            <th className="py-2 pr-4">Confirmação</th>
                            <th className="py-2 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                          {sch.assignments.map(asg => {
                            const conflicts =
                              asg.status !== 'DECLINED'
                                ? getConflictsForPersonOnDate(asg.person_id, dKey, sch.id)
                                : [];
                            const waNumber = formatWaNumber(asg.person_phone);
                            const waMsg = buildVolunteerWhatsAppMsg(sch, asg);

                            return (
                              <tr key={asg.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                                <td className="py-2.5 pr-4 font-bold text-slate-700 dark:text-slate-200">
                                  {asg.role_name}
                                </td>
                                <td className="py-2.5 pr-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 dark:text-white">
                                      {asg.person_name}
                                    </span>
                                    {conflicts.length > 0 && (
                                      <span
                                        className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1"
                                        title={`Conflito com ${conflicts.map(c => c.ministry_name).join(', ')}`}
                                      >
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Conflito ({conflicts[0].ministry_name})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-4">
                                  <select
                                    value={asg.status}
                                    onChange={e =>
                                      handleUpdateAssignmentStatus(sch, asg.id, e.target.value as AssignmentStatus)
                                    }
                                    className={`px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none cursor-pointer ${
                                      STATUS_META[asg.status].textClass
                                    }`}
                                  >
                                    <option value="PENDING">Pendente</option>
                                    <option value="CONFIRMED">Confirmado</option>
                                    <option value="DECLINED">Indisponível</option>
                                  </select>
                                </td>
                                <td className="py-2.5 text-right">
                                  {waNumber ? (
                                    <a
                                      href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={() => {
                                        if (onLogMessage) {
                                          onLogMessage(asg.person_id, asg.person_name, asg.person_phone || '', waMsg);
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      <span>Enviar WhatsApp</span>
                                    </a>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">Sem WhatsApp</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-2">
                      Nenhum voluntário escalado ainda. Clique em <strong>Editar</strong> para adicionar pessoas.
                    </p>
                  )}
                </div>
              );
            })}

            {filteredSchedules.length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center space-y-3">
                <CalendarCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-base font-black text-slate-700 dark:text-white">
                  Nenhuma escala encontrada
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Crie uma escala vinculando um ministério e um culto para organizar funções e confirmar voluntários.
                </p>
                {activeMinistries.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => openCreateSchedule()}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Criar Primeira Escala
                  </button>
                ) : (
                  onSeedMinistries && (
                    <button
                      type="button"
                      onClick={handleSeed}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      Carregar Ministérios Padrão
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MINISTRIES */}
        {activeTab === 'ministries' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-8">
            {activeMinistries
              .filter(m => !searchTerm.trim() || m.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(min => {
                const minSchedulesCount = upcomingSchedules.filter(s => s.ministry_id === min.id).length;
                return (
                  <div
                    key={min.id}
                    className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            <span className="tabular-nums">{min.volunteer_ids.length} voluntários</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{minSchedulesCount} escalas futuras</span>
                          </div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-white mt-0.5">
                            {min.name}
                          </h3>
                          {min.leader_name && (
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                              Líder: {min.leader_name}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditMinistry(min)}
                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                            title="Editar ministério"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMinistry(min.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Excluir ministério"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {min.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {min.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Funções da Equipe</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {min.default_roles.length > 0 ? min.default_roles.join(' · ') : 'Nenhuma função cadastrada'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => openEditMinistry(min)}
                        className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                      >
                        Gerenciar Voluntários
                      </button>

                      <button
                        type="button"
                        onClick={() => openCreateSchedule(min.id)}
                        className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Montar Escala</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

            {activeMinistries.length === 0 && (
              <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-base font-black text-slate-700 dark:text-white">
                  Nenhum ministério cadastrado
                </h4>
                <p className="text-xs text-slate-400">
                  Cadastre seus ministérios (Louvor, Mídia, Kids, Recepção) ou carregue os padrões recomendados.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VOLUNTEERS OVERVIEW */}
        {activeTab === 'volunteers' && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-3 pr-4">Voluntário</th>
                    <th className="py-3 pr-4">Ministérios Vinculados</th>
                    <th className="py-3 pr-4">Próximas Escalas</th>
                    <th className="py-3 text-right">Conflitos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                  {volunteerRosterSummary.map(row => {
                    const conflictCount = row.assignments.filter(a => a.hasConflict).length;
                    return (
                      <tr key={row.person.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="py-3 pr-4">
                          <p className="font-bold text-slate-800 dark:text-white">{row.person.name}</p>
                          <p className="text-[11px] text-slate-400">{row.person.phone || row.person.subtitle}</p>
                        </td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300 font-medium">
                          {row.ministries.length > 0 ? row.ministries.join(' · ') : 'Escalado avulso'}
                        </td>
                        <td className="py-3 pr-4">
                          {row.assignments.length > 0 ? (
                            <div className="space-y-1">
                              {row.assignments.map(item => (
                                <div key={item.assignment.id} className="flex items-center gap-2 text-[11px]">
                                  <span className="tabular-nums font-bold text-slate-700 dark:text-slate-200">
                                    {new Date(item.schedule.service_date).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit'
                                    })}{' '}
                                    {item.schedule.start_time}
                                  </span>
                                  <span>·</span>
                                  <span className="text-slate-600 dark:text-slate-300">
                                    {item.schedule.ministry_name} ({item.assignment.role_name})
                                  </span>
                                  <span>·</span>
                                  <span className={`font-bold ${STATUS_META[item.assignment.status].textClass}`}>
                                    {STATUS_META[item.assignment.status].label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Sem escalas futuras</span>
                          )}
                        </td>
                        <td className="py-3 text-right tabular-nums">
                          {conflictCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {conflictCount} conflito(s)
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Livre</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {volunteerRosterSummary.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        Vincule voluntários aos ministérios ou crie uma escala para visualizar a agenda individual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CRIAR / EDITAR MINISTÉRIO */}
      {isMinistryModalOpen && (
        <div className="fixed inset-0 !mt-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 max-w-2xl w-full rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">
                  {editingMinistry ? `Editar: ${editingMinistry.name}` : 'Novo Ministério'}
                </h3>
                <p className="text-xs text-slate-400">Defina liderança, funções padrão e voluntários vinculados.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMinistryModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMinistry} className="overflow-y-auto flex-1 space-y-5 pt-5 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Nome do Ministério *
                  </label>
                  <input
                    type="text"
                    required
                    value={ministryForm.name}
                    onChange={e => setMinistryForm({ ...ministryForm, name: e.target.value })}
                    placeholder="Ex: Louvor & Adoração"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Líder Responsável
                  </label>
                  <select
                    value={ministryForm.leader_id}
                    onChange={e => setMinistryForm({ ...ministryForm, leader_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="">Sem líder definido</option>
                    {team.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Descrição</label>
                <textarea
                  rows={2}
                  value={ministryForm.description}
                  onChange={e => setMinistryForm({ ...ministryForm, description: e.target.value })}
                  placeholder="Atuação e responsabilidades da equipe..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none resize-none"
                />
              </div>

              {/* Default Roles */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Funções Padrão na Escala
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roleDraft}
                    onChange={e => setRoleDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRoleDraft();
                      }
                    }}
                    placeholder="Ex: Guitarra, Som, Professor Kids..."
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddRoleDraft}
                    className="px-4 py-2 bg-slate-800 dark:bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ministryForm.default_roles.map(role => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200"
                    >
                      <span>{role}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setMinistryForm(prev => ({
                            ...prev,
                            default_roles: prev.default_roles.filter(r => r !== role)
                          }))
                        }
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Volunteer Roster */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Voluntários Vinculados ({ministryForm.volunteer_ids.length})
                  </label>
                  <input
                    type="text"
                    value={volunteerSearch}
                    onChange={e => setVolunteerSearch(e.target.value)}
                    placeholder="Filtrar pessoas..."
                    className="px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-white outline-none"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700/60">
                  {allPeopleOptions
                    .filter(
                      p =>
                        !volunteerSearch.trim() ||
                        p.name.toLowerCase().includes(volunteerSearch.toLowerCase())
                    )
                    .map(person => {
                      const checked = ministryForm.volunteer_ids.includes(person.id);
                      return (
                        <label
                          key={person.id}
                          className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setMinistryForm(prev => ({
                                  ...prev,
                                  volunteer_ids: checked
                                    ? prev.volunteer_ids.filter(id => id !== person.id)
                                    : [...prev.volunteer_ids, person.id]
                                }));
                              }}
                              className="rounded text-indigo-600 dark:text-indigo-400 w-4 h-4"
                            />
                            <span className="font-bold text-slate-800 dark:text-white">{person.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">{person.subtitle}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsMinistryModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Salvar Ministério
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR ESCALA */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 !mt-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 max-w-2xl w-full rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">
                  {editingSchedule ? 'Editar Escala' : 'Nova Escala de Serviço'}
                </h3>
                <p className="text-xs text-slate-400">
                  Associe voluntários às funções e verifique automaticamente conflitos na mesma data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSchedule} className="overflow-y-auto flex-1 space-y-5 pt-5 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Ministério *</label>
                  <select
                    required
                    value={scheduleForm.ministry_id}
                    onChange={e => {
                      const min = activeMinistries.find(m => m.id === e.target.value);
                      setScheduleForm(prev => ({ ...prev, ministry_id: e.target.value }));
                      if (min && min.default_roles.length > 0) {
                        setAssignmentRole(min.default_roles[0]);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none"
                  >
                    {activeMinistries.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Vincular à Agenda (Opcional)
                  </label>
                  <select
                    value={scheduleForm.event_id}
                    onChange={e => handleSelectAgendaEvent(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="">Evento manual...</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({new Date(ev.start_date).toLocaleDateString('pt-BR')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6 space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Culto / Evento *
                  </label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.event_title}
                    onChange={e => setScheduleForm({ ...scheduleForm, event_title: e.target.value })}
                    placeholder="Ex: Culto de Domingo à Noite"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Data *</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.service_date}
                    onChange={e => setScheduleForm({ ...scheduleForm, service_date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none tabular-nums"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Horário *</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.start_time}
                    onChange={e => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* Add Volunteer Assignment Builder */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">
                  Adicionar Voluntário à Escala
                </p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-5">
                    <input
                      list="ministry-role-suggestions"
                      type="text"
                      value={assignmentRole}
                      onChange={e => setAssignmentRole(e.target.value)}
                      placeholder="Função (ex: Vocal, Som)..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                    />
                    <datalist id="ministry-role-suggestions">
                      {(selectedModalMinistry?.default_roles || []).map(r => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </div>

                  <div className="md:col-span-5">
                    <select
                      value={assignmentPersonId}
                      onChange={e => setAssignmentPersonId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                    >
                      <option value="">Selecione a pessoa...</option>
                      {prioritizedPeopleForModal.map(p => {
                        const inRoster = selectedModalMinistry?.volunteer_ids.includes(p.id);
                        return (
                          <option key={p.id} value={p.id}>
                            {inRoster ? `★ ${p.name}` : p.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddAssignment}
                      disabled={!assignmentPersonId || !assignmentRole.trim()}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Incluir
                    </button>
                  </div>
                </div>

                {/* Live Conflict Warning for currently selected person */}
                {assignmentPersonId && (() => {
                  const conflicts = getConflictsForPersonOnDate(
                    assignmentPersonId,
                    scheduleForm.service_date,
                    editingSchedule?.id
                  );
                  if (conflicts.length === 0) return null;
                  return (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        Atenção: esta pessoa já está escalada neste dia em{' '}
                        <strong>{conflicts.map(c => `${c.ministry_name} (${c.start_time})`).join(', ')}</strong>.
                      </span>
                    </div>
                  );
                })()}

                {/* Assigned List */}
                <div className="space-y-2 pt-1">
                  {scheduleForm.assignments.map(asg => {
                    const conflicts = getConflictsForPersonOnDate(
                      asg.person_id,
                      scheduleForm.service_date,
                      editingSchedule?.id
                    );
                    return (
                      <div
                        key={asg.id}
                        className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{asg.role_name}:</span>
                          <span className="font-bold text-slate-800 dark:text-white">{asg.person_name}</span>
                          {conflicts.length > 0 && (
                            <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Conflito ({conflicts[0].ministry_name})
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignment(asg.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  {scheduleForm.assignments.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">
                      Nenhum voluntário incluído ainda.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Observações / Repertório / Uniforme
                </label>
                <textarea
                  rows={2}
                  value={scheduleForm.notes}
                  onChange={e => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  placeholder="Ex: Chegar 40 minutos antes para passagem de som..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Salvar Escala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinistriesModule;
