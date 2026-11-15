import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Users, 
  UserPlus, 
  Search, 
  Plus, 
  ChevronRight, 
  Droplets, 
  Flame, 
  Heart, 
  ShieldCheck, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  X, 
  Calendar, 
  Check, 
  MessageSquare,
  Sparkles,
  ArrowRight,
  Filter,
  UserCheck,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { 
  DiscipleshipTrack, 
  MemberTrackProgress, 
  DiscipleshipStep, 
  Member, 
  SystemUser, 
  TrackCategory 
} from '../types';

interface DiscipleshipModuleProps {
  tracks: DiscipleshipTrack[];
  progressList: MemberTrackProgress[];
  members: Member[];
  team: SystemUser[];
  onSaveTrack: (track: DiscipleshipTrack) => Promise<void> | void;
  onDeleteTrack: (trackId: string) => Promise<void> | void;
  onSaveProgress: (progress: MemberTrackProgress) => Promise<void> | void;
  onDeleteProgress: (progressId: string) => Promise<void> | void;
  onAdvanceMemberStage?: (memberId: string, targetStage: string) => Promise<void> | void;
}

const CATEGORY_CONFIG: Record<TrackCategory, { label: string; badge: string; icon: any }> = {
  INTEGRATION: {
    label: 'Novos Convertidos & Batismo',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    icon: Droplets
  },
  DOCTRINE: {
    label: 'Maturidade & Discipulado',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    icon: BookOpen
  },
  LEADERSHIP: {
    label: 'Formação de Líderes de Célula',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    icon: GraduationCap
  },
  MINISTRY: {
    label: 'Capacitação Ministerial',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    icon: Award
  }
};

export const DiscipleshipModule: React.FC<DiscipleshipModuleProps> = ({
  tracks,
  progressList,
  members,
  team,
  onSaveTrack,
  onDeleteTrack,
  onSaveProgress,
  onDeleteProgress,
  onAdvanceMemberStage
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'disciples' | 'tracks'>('disciples');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState<MemberTrackProgress | null>(null);
  const [editingTrack, setEditingTrack] = useState<DiscipleshipTrack | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [confirmUnenrollId, setConfirmUnenrollId] = useState<string | null>(null);
  const [confirmDeleteTrack, setConfirmDeleteTrack] = useState(false);

  // Enroll Form
  const [enrollForm, setEnrollForm] = useState({
    member_id: '',
    track_id: '',
    mentor_id: '',
    notes: ''
  });

  // Track Form
  const [trackForm, setTrackForm] = useState<Partial<DiscipleshipTrack>>({
    title: '',
    description: '',
    category: 'INTEGRATION',
    active: true,
    steps: []
  });

  const [stepDraft, setStepDraft] = useState({
    title: '',
    description: '',
    target_stage: ''
  });

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepDraft, setEditingStepDraft] = useState({
    title: '',
    description: '',
    target_stage: ''
  });

  // Metrics
  const activeDisciplesCount = progressList.filter(p => p.status === 'IN_PROGRESS').length;
  
  // Ready for baptism: completed step with baptism or step 3 in integration track
  const readyForBaptismCount = progressList.filter(p => {
    return p.completed_step_ids?.includes('step-pre-batismo') || 
           (p.track_title?.toLowerCase().includes('integração') && p.progress_percent >= 50 && p.progress_percent < 100);
  }).length;

  const inLeadershipTrainingCount = progressList.filter(p => {
    return (p.track_title?.toLowerCase().includes('líder') || p.track_id.includes('lideranca')) && p.status === 'IN_PROGRESS';
  }).length;

  const completedTracksCount = progressList.filter(p => p.status === 'COMPLETED').length;

  // Filtered Disciples
  const filteredProgress = useMemo(() => {
    return progressList.filter(prog => {
      const member = members.find(m => m.id === prog.member_id);
      const name = prog.member_name || member?.name || '';
      const trackTitle = prog.track_title || '';
      const mentorName = prog.mentor_name || '';

      const matchesSearch = 
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trackTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mentorName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || prog.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [progressList, members, searchTerm, statusFilter]);

  // Filtered Tracks
  const filteredTracks = useMemo(() => {
    return tracks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [tracks, searchTerm, categoryFilter]);

  // Toggle step completion for a disciple
  const handleToggleStep = async (prog: MemberTrackProgress, step: DiscipleshipStep) => {
    const track = tracks.find(t => t.id === prog.track_id);
    const totalSteps = track?.steps?.length || 1;
    const isCompleted = prog.completed_step_ids.includes(step.id);
    
    let updatedStepIds: string[];
    const updatedDates = { ...(prog.step_completion_dates || {}) };

    if (isCompleted) {
      updatedStepIds = prog.completed_step_ids.filter(id => id !== step.id);
      delete updatedDates[step.id];
    } else {
      updatedStepIds = [...prog.completed_step_ids, step.id];
      updatedDates[step.id] = new Date().toISOString();
    }

    const newProgressPercent = Math.round((updatedStepIds.length / totalSteps) * 100);
    const isFullyCompleted = updatedStepIds.length === totalSteps;

    const updatedProg: MemberTrackProgress = {
      ...prog,
      completed_step_ids: updatedStepIds,
      step_completion_dates: updatedDates,
      progress_percent: newProgressPercent,
      status: isFullyCompleted ? 'COMPLETED' : 'IN_PROGRESS',
      completed_at: isFullyCompleted ? new Date() : undefined
    };

    await onSaveProgress(updatedProg);
    setSelectedProgress(updatedProg);

    // If step has target_stage and is now completed, suggest advancing member in pipeline
    if (!isCompleted && step.target_stage && onAdvanceMemberStage) {
      await onAdvanceMemberStage(prog.member_id, step.target_stage);
      setActionSuccess(`✓ Passo "${step.title}" concluído! O contato foi avançado para a fase correspondente no Pipeline.`);
    } else {
      setActionSuccess(`✓ Progresso atualizado: ${newProgressPercent}% concluído.`);
    }
    setTimeout(() => setActionSuccess(null), 5000);
  };

  // Submit enrollment
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.member_id || !enrollForm.track_id) return;

    const member = members.find(m => m.id === enrollForm.member_id);
    const track = tracks.find(t => t.id === enrollForm.track_id);
    const mentor = team.find(u => u.id === enrollForm.mentor_id);

    const newProg: MemberTrackProgress = {
      id: 'prog_' + Math.random().toString(36).substr(2, 9),
      org_id: member?.org_id || 'default',
      church_id: member?.church_id || 'default',
      member_id: enrollForm.member_id,
      member_name: member?.name || 'Membro',
      track_id: enrollForm.track_id,
      track_title: track?.title || 'Trilha',
      mentor_id: mentor?.id,
      mentor_name: mentor?.name,
      completed_step_ids: [],
      notes: enrollForm.notes,
      started_at: new Date(),
      status: 'IN_PROGRESS',
      progress_percent: 0,
      created_at: new Date()
    };

    await onSaveProgress(newProg);
    setIsEnrollModalOpen(false);
    setEnrollForm({ member_id: '', track_id: '', mentor_id: '', notes: '' });
    setActionSuccess(`✓ ${member?.name} foi matriculado(a) com sucesso na trilha "${track?.title}"!`);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  // Add step to track draft
  const handleAddStepToDraft = () => {
    if (!stepDraft.title.trim()) return;
    const currentSteps = trackForm.steps || [];
    const newStep: DiscipleshipStep = {
      id: 'step_' + Math.random().toString(36).substr(2, 8),
      title: stepDraft.title.trim(),
      description: stepDraft.description.trim(),
      order: currentSteps.length + 1,
      required: true,
      target_stage: stepDraft.target_stage || undefined
    };
    setTrackForm({
      ...trackForm,
      steps: [...currentSteps, newStep]
    });
    setStepDraft({ title: '', description: '', target_stage: '' });
  };

  const handleRemoveStepFromDraft = (stepId: string) => {
    const updated = (trackForm.steps || [])
      .filter(s => s.id !== stepId)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    setTrackForm({ ...trackForm, steps: updated });
    if (editingStepId === stepId) {
      setEditingStepId(null);
    }
  };

  const handleStartEditStep = (step: DiscipleshipStep) => {
    setEditingStepId(step.id);
    setEditingStepDraft({
      title: step.title,
      description: step.description || '',
      target_stage: step.target_stage || ''
    });
  };

  const handleSaveEditedStep = (stepId: string) => {
    if (!editingStepDraft.title.trim()) return;
    const updated = (trackForm.steps || []).map(s =>
      s.id === stepId
        ? {
            ...s,
            title: editingStepDraft.title.trim(),
            description: editingStepDraft.description.trim(),
            target_stage: editingStepDraft.target_stage || undefined
          }
        : s
    );
    setTrackForm({ ...trackForm, steps: updated });
    setEditingStepId(null);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const steps = [...(trackForm.steps || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    const temp = steps[index];
    steps[index] = steps[targetIndex];
    steps[targetIndex] = temp;
    setTrackForm({
      ...trackForm,
      steps: steps.map((s, idx) => ({ ...s, order: idx + 1 }))
    });
  };

  // Save Track
  const handleSaveTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackForm.title?.trim()) return;

    const normalizedSteps = (trackForm.steps || []).map((s, idx) => ({
      ...s,
      order: idx + 1
    }));

    const newTrack: DiscipleshipTrack = {
      id: editingTrack?.id || 'track_' + Math.random().toString(36).substr(2, 8),
      org_id: editingTrack?.org_id || 'default',
      church_id: editingTrack?.church_id || 'default',
      title: trackForm.title.trim(),
      description: trackForm.description || '',
      category: (trackForm.category as TrackCategory) || 'INTEGRATION',
      steps: normalizedSteps,
      active: trackForm.active !== false,
      created_at: editingTrack?.created_at || new Date()
    };

    await onSaveTrack(newTrack);
    setIsTrackModalOpen(false);
    setEditingTrack(null);
    setEditingStepId(null);
    setTrackForm({ title: '', description: '', category: 'INTEGRATION', active: true, steps: [] });
    setActionSuccess(`✓ Trilha "${newTrack.title}" salva com sucesso!`);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const openTrackModalForEdit = (track: DiscipleshipTrack) => {
    setEditingTrack(track);
    setEditingStepId(null);
    setConfirmDeleteTrack(false);
    setTrackForm({
      title: track.title,
      description: track.description,
      category: track.category,
      active: track.active,
      steps: [...track.steps]
    });
    setIsTrackModalOpen(true);
  };

  const openWhatsAppMentor = (phone?: string, discipleName?: string, trackTitle?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 8) return;
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(
      `Paz, ${discipleName}! Como está caminhando na trilha "${trackTitle}"? Passando para saber se tem alguma dúvida e orar com você essa semana! 🕊️`
    );
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 p-6 sm:p-10 space-y-8 font-inter">
      {/* Action Notification */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-emerald-800 dark:text-emerald-200 text-xs font-bold shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
            Trilhas de Discipulado & Escola de Líderes
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Acompanhe a evolução espiritual de cada pessoa, desde os passos de batismo e maturidade até a formação e consagração de novos líderes de célula.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setEditingTrack(null);
              setTrackForm({ title: '', description: '', category: 'INTEGRATION', active: true, steps: [] });
              setIsTrackModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-indigo-500" />
            <span>Nova Trilha de Ensino</span>
          </button>

          <button
            onClick={() => setIsEnrollModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Matricular Discípulo</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Discípulos em Andamento
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 dark:text-white">
              {activeDisciplesCount}
            </span>
            <span className="text-xs font-bold text-slate-400">vidas ativas</span>
          </div>
          <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-2">
            Crescendo em fé e mentoria
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Prontos para o Batismo
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Droplets className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
              {readyForBaptismCount}
            </span>
            <span className="text-xs font-bold text-slate-400">candidatos</span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
            Completaram estudos pré-batismais
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Em Formação de Liderança
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {inLeadershipTrainingCount}
            </span>
            <span className="text-xs font-bold text-slate-400">futuros líderes</span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
            Escola de Células & Mentoria
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Trilhas Concluídas
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {completedTracksCount}
            </span>
            <span className="text-xs font-bold text-slate-400">certificados</span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
            100% dos passos finalizados
          </p>
        </div>
      </div>

      {/* Sub-Tabs: Discípulos vs Trilhas */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubTab('disciples')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
              activeSubTab === 'disciples'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Discípulos em Acompanhamento ({progressList.length})
          </button>

          <button
            onClick={() => setActiveSubTab('tracks')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
              activeSubTab === 'tracks'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Catálogo de Trilhas & Passos de Fé ({tracks.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative w-64 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          {activeSubTab === 'disciples' ? (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">Todos os Status</option>
              <option value="IN_PROGRESS">Em Andamento</option>
              <option value="COMPLETED">Concluído (100%)</option>
            </select>
          ) : (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">Todas as Categorias</option>
              <option value="INTEGRATION">Novos Convertidos</option>
              <option value="DOCTRINE">Maturidade & Doutrina</option>
              <option value="LEADERSHIP">Liderança de Célula</option>
            </select>
          )}
        </div>
      </div>

      {/* VIEW 1: DISCÍPULOS & MENTORIA */}
      {activeSubTab === 'disciples' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of Disciples */}
          <div className="lg:col-span-2 space-y-4">
            {filteredProgress.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 text-slate-400 space-y-4">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-300">Nenhum discípulo matriculado ainda.</p>
                  <p className="text-xs text-slate-400 mt-1">Clique em "Matricular Discípulo" para iniciar o acompanhamento individual de um membro.</p>
                </div>
                <button
                  onClick={() => setIsEnrollModalOpen(true)}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md"
                >
                  Matricular Primeiro Discípulo
                </button>
              </div>
            ) : (
              filteredProgress.map((prog) => {
                const member = members.find(m => m.id === prog.member_id);
                const track = tracks.find(t => t.id === prog.track_id);
                const isSelected = selectedProgress?.id === prog.id;
                const totalSteps = track?.steps?.length || 1;
                const completedCount = prog.completed_step_ids?.length || 0;

                return (
                  <div
                    key={prog.id}
                    onClick={() => {
                      setSelectedProgress(prog);
                      setConfirmUnenrollId(null);
                    }}
                    className={`p-6 bg-white dark:bg-slate-800 rounded-3xl border transition-all cursor-pointer relative ${
                      isSelected 
                        ? 'border-indigo-600 dark:border-indigo-500 shadow-lg ring-2 ring-indigo-500/10' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                          {prog.member_name?.[0]?.toUpperCase() || member?.name?.[0]?.toUpperCase() || 'D'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-800 dark:text-white text-base">
                              {prog.member_name || member?.name}
                            </h4>
                            {prog.status === 'COMPLETED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                Concluído
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                                Em Andamento
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                            {prog.track_title || track?.title}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {member?.phone && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhatsAppMentor(member.phone, member.name, prog.track_title);
                            }}
                            className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all"
                            title="Conversar no WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                        <span className="text-sm font-black text-slate-800 dark:text-white">
                          {prog.progress_percent}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 mb-4">
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            prog.progress_percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${prog.progress_percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>{completedCount} de {totalSteps} passos concluídos</span>
                        <span>Iniciado em: {new Date(prog.started_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    {/* Mentor & Details */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span className="text-[10px] font-black uppercase text-slate-400">Mentor / Líder:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {prog.mentor_name || 'Equipe Pastoral'}
                        </span>
                      </div>

                      <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Ver Passos & Detalhes
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Disciple Journey Detail Sidebar */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm h-fit space-y-6">
            {selectedProgress ? (
              (() => {
                const track = tracks.find(t => t.id === selectedProgress.track_id);
                const member = members.find(m => m.id === selectedProgress.member_id);
                return (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="pb-4 border-b border-slate-100 dark:border-slate-700">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                        Prontuário de Discipulado
                      </span>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1">
                        {selectedProgress.member_name || member?.name}
                      </h3>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                        {selectedProgress.track_title || track?.title}
                      </p>
                    </div>

                    {/* Stepper with checkable steps */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Passos da Trilha (Clique para marcar/desmarcar):
                      </h4>

                      <div className="space-y-2.5">
                        {track?.steps?.map((step) => {
                          const isDone = selectedProgress.completed_step_ids?.includes(step.id);
                          const date = selectedProgress.step_completion_dates?.[step.id];

                          return (
                            <div
                              key={step.id}
                              onClick={() => handleToggleStep(selectedProgress, step)}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                                isDone 
                                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isDone 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'border-2 border-slate-300 dark:border-slate-600 text-transparent'
                              }`}>
                                <Check className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-xs font-black ${isDone ? 'text-emerald-900 dark:text-emerald-300 line-through opacity-80' : 'text-slate-800 dark:text-white'}`}>
                                    {step.title}
                                  </span>
                                  {step.target_stage && (
                                    <span className="text-[8px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                                      {step.target_stage}
                                    </span>
                                  )}
                                </div>
                                {step.description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                    {step.description}
                                  </p>
                                )}
                                {isDone && date && (
                                  <p className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Concluído em: {new Date(date).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {selectedProgress.notes && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                          Observações Pastorais:
                        </span>
                        <p className="text-slate-600 dark:text-slate-300">
                          {selectedProgress.notes}
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                      {confirmUnenrollId === selectedProgress.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Confirmar remoção?</span>
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteProgress(selectedProgress.id);
                              setSelectedProgress(null);
                              setConfirmUnenrollId(null);
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                          >
                            Remover
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmUnenrollId(null)}
                            className="px-2.5 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-[10px] font-bold"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmUnenrollId(selectedProgress.id)}
                          className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-bold flex items-center gap-1.5 p-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Desmatricular</span>
                        </button>
                      )}

                      {member?.phone && (
                        <button
                          type="button"
                          onClick={() => openWhatsAppMentor(member.phone, member.name, selectedProgress.track_title)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-3">
                <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold">Selecione um discípulo ao lado para acompanhar os passos de fé e marcar lições concluídas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CATÁLOGO DE TRILHAS & PASSOS */}
      {activeSubTab === 'tracks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTracks.map((track) => {
            const catInfo = CATEGORY_CONFIG[track.category] || CATEGORY_CONFIG.INTEGRATION;
            const CategoryIcon = catInfo.icon;
            const enrolledCount = progressList.filter(p => p.track_id === track.id).length;

            return (
              <div
                key={track.id}
                className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-800 transition-all space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border ${catInfo.badge} flex items-center gap-1.5`}>
                      <CategoryIcon className="w-3 h-3" />
                      {catInfo.label}
                    </span>
                    <button
                      onClick={() => openTrackModalForEdit(track)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                      title="Editar Trilha"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-lg">
                      {track.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {track.description}
                    </p>
                  </div>

                  {/* Steps List */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider">
                      {track.steps.length} Passos Estruturados:
                    </span>
                    <div className="space-y-1.5">
                      {track.steps.map((st, i) => (
                        <div key={st.id || i} className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
                            {st.title}
                          </span>
                          {st.target_stage && (
                            <span className="text-[8px] font-black uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                              ➔ {st.target_stage}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400">
                    👥 {enrolledCount} discípulos matriculados
                  </span>
                  <button
                    onClick={() => {
                      setEnrollForm({ ...enrollForm, track_id: track.id });
                      setIsEnrollModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-black uppercase text-[10px] rounded-xl transition-all"
                  >
                    + Matricular
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: MATRICULAR DISCÍPULO EM TRILHA */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 !mt-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Matricular Discípulo na Trilha
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Selecione o membro, a trilha de crescimento e o líder responsável pela mentoria.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsEnrollModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-200">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Membro / Visitante *
                </label>
                <select
                  required
                  value={enrollForm.member_id}
                  onChange={(e) => setEnrollForm({ ...enrollForm, member_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="">Selecione o contato...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.stage}) {m.cell_id ? '• Em Célula' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Trilha de Formação *
                </label>
                <select
                  required
                  value={enrollForm.track_id}
                  onChange={(e) => setEnrollForm({ ...enrollForm, track_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="">Selecione a trilha...</option>
                  {tracks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.steps.length} passos)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Mentor / Líder Responsável (Opcional)
                </label>
                <select
                  value={enrollForm.mentor_id}
                  onChange={(e) => setEnrollForm({ ...enrollForm, mentor_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="">Nenhum (Acompanhamento da Equipe Geral)</option>
                  {team.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.duty || u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Notas de Início / Pedido de Oração
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Entregou a vida no último domingo, deseja ser batizado em breve."
                  value={enrollForm.notes}
                  onChange={(e) => setEnrollForm({ ...enrollForm, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-5 py-2.5 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/30"
                >
                  Confirmar Matrícula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR TRILHA */}
      {isTrackModalOpen && (
        <div className="fixed inset-0 !mt-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    {editingTrack ? `Editar: ${editingTrack.title}` : 'Nova Trilha de Ensino'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Estruture os passos de fé, lições e requisitos de formação.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsTrackModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTrackSubmit} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-200">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Título da Trilha *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Escola de Maturidade Cristã"
                  value={trackForm.title}
                  onChange={(e) => setTrackForm({ ...trackForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Categoria da Trilha
                  </label>
                  <select
                    value={trackForm.category}
                    onChange={(e) => setTrackForm({ ...trackForm, category: e.target.value as TrackCategory })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="INTEGRATION">Novos Convertidos & Batismo</option>
                    <option value="DOCTRINE">Maturidade & Discipulado</option>
                    <option value="LEADERSHIP">Formação de Líderes de Célula</option>
                    <option value="MINISTRY">Capacitação Ministerial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Descrição Curta
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Fundamentos bíblicos e vida cristã prática."
                    value={trackForm.description}
                    onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Passos da Trilha */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Passos / Módulos desta Trilha ({trackForm.steps?.length || 0}):
                </span>

                <div className="space-y-2">
                  {trackForm.steps?.map((st, idx) => {
                    const isEditingThisStep = editingStepId === st.id;
                    return (
                      <div key={st.id || idx} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                        {isEditingThisStep ? (
                          <div className="space-y-2.5 p-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                                Editando Passo {idx + 1}
                              </span>
                            </div>
                            <input
                              type="text"
                              placeholder="Título do passo"
                              value={editingStepDraft.title}
                              onChange={(e) => setEditingStepDraft({ ...editingStepDraft, title: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Descrição breve ou material"
                              value={editingStepDraft.description}
                              onChange={(e) => setEditingStepDraft({ ...editingStepDraft, description: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <select
                                value={editingStepDraft.target_stage}
                                onChange={(e) => setEditingStepDraft({ ...editingStepDraft, target_stage: e.target.value })}
                                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold focus:outline-none"
                              >
                                <option value="">Nenhum avanço automático</option>
                                <option value="FIRST_CONTACT">Avançar para Primeiro Contato</option>
                                <option value="RETURNING">Avançar para Retornando</option>
                                <option value="MEMBER">Avançar para Membro</option>
                                <option value="LEADER">Avançar para Líder</option>
                              </select>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingStepId(null)}
                                  className="px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-xl"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditedStep(st.id)}
                                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Salvar Passo</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-800 dark:text-white text-xs truncate">
                                  {idx + 1}. {st.title}
                                </span>
                                {st.target_stage && (
                                  <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase shrink-0">
                                    · {st.target_stage}
                                  </span>
                                )}
                              </div>
                              {st.description && <p className="text-[11px] text-slate-400 truncate mt-0.5">{st.description}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveStep(idx, 'up')}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                title="Mover para cima"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === (trackForm.steps?.length || 1) - 1}
                                onClick={() => handleMoveStep(idx, 'down')}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                title="Mover para baixo"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditStep(st)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                title="Editar este passo"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveStepFromDraft(st.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                title="Remover passo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Form to add step */}
                <div className="p-4 bg-indigo-50/50 dark:bg-slate-900/80 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                  <span className="text-[9.5px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider block">
                    + Adicionar Próximo Passo:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nome do passo (ex: Aula 1: Salvação e Graça)"
                      value={stepDraft.title}
                      onChange={(e) => setStepDraft({ ...stepDraft, title: e.target.value })}
                      className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Descrição breve ou link de material"
                      value={stepDraft.description}
                      onChange={(e) => setStepDraft({ ...stepDraft, description: e.target.value })}
                      className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase text-slate-400 font-bold">Estágio Alvo:</span>
                      <select
                        value={stepDraft.target_stage}
                        onChange={(e) => setStepDraft({ ...stepDraft, target_stage: e.target.value })}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] focus:outline-none"
                      >
                        <option value="">Nenhum avanço automático</option>
                        <option value="FIRST_CONTACT">Avançar para Primeiro Contato</option>
                        <option value="RETURNING">Avançar para Retornando</option>
                        <option value="MEMBER">Avançar para Membro</option>
                        <option value="LEADER">Avançar para Líder</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddStepToDraft}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                    >
                      Inserir Passo
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div>
                  {editingTrack && (
                    confirmDeleteTrack ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Excluir trilha?</span>
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteTrack(editingTrack.id);
                            setConfirmDeleteTrack(false);
                            setIsTrackModalOpen(false);
                            setEditingTrack(null);
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px]"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTrack(false)}
                          className="px-2.5 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold text-[10px]"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTrack(true)}
                        className="px-4 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-bold text-xs flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir Trilha</span>
                      </button>
                    )
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsTrackModalOpen(false)}
                    className="px-5 py-2.5 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/30"
                  >
                    Salvar Trilha de Ensino
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscipleshipModule;
