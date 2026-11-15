import React, { useState, useMemo } from 'react';
import { Member, ScheduleEvent, SystemUser, PipelineStage } from '../types';
import { DEFAULT_STAGES, getStageIcon, stageTone } from '../constants';
import MemberCard from './MemberCard';
import EditPipelineModal from './EditPipelineModal';
import { 
  Plus, 
  Filter, 
  Search, 
  Sparkles, 
  UserCheck, 
  X, 
  Users, 
  Sliders, 
  Settings2, 
  QrCode,
  Columns,
  List,
  Edit3,
  MessageCircle,
  CalendarPlus,
  Clock,
  Home,
  ChevronDown,
  AlertCircle
} from 'lucide-react';

interface KanbanBoardProps {
  members: Member[];
  events?: ScheduleEvent[];
  team?: SystemUser[];
  stages?: PipelineStage[];
  onMoveMember: (id: string, nextStage: string) => void;
  onAddMember: (stage?: string) => void;
  onMemberClick?: (member: Member) => void;
  onEditEvent?: (event: ScheduleEvent) => void;
  onAddTask?: (member: Member) => void;
  onSeedDemoData?: () => void;
  onUpdateStages?: (newStages: PipelineStage[], memberMigrations?: { fromStageId: string; toStageId: string }[]) => Promise<void>;
  onOpenVisitorQr?: () => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  members, 
  events = [], 
  team = [], 
  stages: customStages,
  onMoveMember, 
  onAddMember, 
  onMemberClick, 
  onEditEvent,
  onAddTask,
  onSeedDemoData,
  onUpdateStages,
  onOpenVisitorQr
}) => {
  const stages = useMemo(() => {
    return customStages && customStages.length > 0 ? customStages : DEFAULT_STAGES;
  }, [customStages]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('koinonia_pipeline_view') as 'kanban' | 'list') || 'kanban';
    }
    return 'kanban';
  });

  const handleSetViewMode = (mode: 'kanban' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('koinonia_pipeline_view', mode);
    } catch {}
  };
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeaderId, setSelectedLeaderId] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = !searchQuery || 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.phone && m.phone.includes(searchQuery)) ||
        (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.household_name && m.household_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLeader = !selectedLeaderId || m.responsible_leader_id === selectedLeaderId;
      const matchesStage = selectedStageFilter === 'ALL' || m.stage === selectedStageFilter;

      return matchesSearch && matchesLeader && matchesStage;
    });
  }, [members, searchQuery, selectedLeaderId, selectedStageFilter]);

  const handleSeed = async () => {
    if (!onSeedDemoData || isSeeding) return;
    setIsSeeding(true);
    try {
      await onSeedDemoData();
    } finally {
      setIsSeeding(false);
    }
  };

  const handleOpenStageEditor = (stageId?: string) => {
    setEditingStageId(stageId || null);
    setIsPipelineModalOpen(true);
  };

  const getLeaderName = (id?: string) => {
    const leader = team.find(u => u.id === id);
    return leader ? leader.name : 'Sem Líder';
  };

  const getDaysInStage = (lastActivityDate?: Date | string) => {
    if (!lastActivityDate) return 0;
    const d = lastActivityDate instanceof Date ? lastActivityDate : new Date(lastActivityDate);
    if (isNaN(d.getTime())) return 0;
    const diffMs = Date.now() - d.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden transition-colors bg-slate-50 dark:bg-slate-900">
      {/* Header Controls */}
      <div className="flex flex-col gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 transition-colors shrink-0">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
              Pipeline de Crescimento
            </h2>
            <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black">
              {filteredMembers.length} {filteredMembers.length === 1 ? 'pessoa' : 'pessoas'}
            </span>

            {/* View Mode Toggle: Kanban Board vs List View */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 ml-2">
              <button
                type="button"
                onClick={() => handleSetViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === 'kanban' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Visualizar como Quadro Kanban"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quadro</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Visualizar em formato de Lista"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Buscar no pipeline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-36 sm:w-48 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button 
              onClick={() => setShowFilterBar(!showFilterBar)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition-all ${
                showFilterBar || selectedLeaderId || selectedStageFilter !== 'ALL'
                  ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {(selectedLeaderId || selectedStageFilter !== 'ALL') && (
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
              )}
            </button>

            {/* Customizar Etapas */}
            {onUpdateStages && (
              <button
                onClick={() => handleOpenStageEditor()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm"
                title="Personalizar as fases e etapas do pipeline"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden md:inline">Personalizar Etapas</span>
              </button>
            )}

            {/* QR Code Visitantes Button */}
            {onOpenVisitorQr && (
              <button
                onClick={onOpenVisitorQr}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                title="Abrir QR Code e Link da Ficha Pública de Visitantes"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">QR Code Ficha</span>
              </button>
            )}

            {members.length === 0 && onSeedDemoData && (
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all disabled:opacity-50"
                title="Carregar dados de exemplo"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{isSeeding ? 'Carregando...' : 'Exemplos'}</span>
              </button>
            )}

            <button 
              onClick={() => onAddMember()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> 
              <span>Novo Contato</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        {showFilterBar && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Líder:</span>
              <select
                value={selectedLeaderId}
                onChange={(e) => setSelectedLeaderId(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg outline-none font-medium"
              >
                <option value="">Todos os líderes</option>
                {team.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Etapa:</span>
              <select
                value={selectedStageFilter}
                onChange={(e) => setSelectedStageFilter(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg outline-none font-medium"
              >
                <option value="ALL">Todas as etapas</option>
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            {(selectedLeaderId || selectedStageFilter !== 'ALL') && (
              <button 
                onClick={() => {
                  setSelectedLeaderId('');
                  setSelectedStageFilter('ALL');
                }}
                className="text-[10px] font-bold text-rose-500 hover:underline uppercase"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty State Banner */}
      {members.length === 0 && (
        <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-slate-800 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white">Seu Pipeline está pronto para uso!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Você pode cadastrar um contato manualmente, personalizar as etapas ou carregar contatos de demonstração.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onUpdateStages && (
              <button
                onClick={() => handleOpenStageEditor()}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                Personalizar Etapas
              </button>
            )}
            {onSeedDemoData && (
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="px-4 py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isSeeding ? 'Carregando...' : 'Carregar Exemplos'}
              </button>
            )}
            <button
              onClick={() => onAddMember()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm"
            >
              + Adicionar Contato
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Kanban Columns OR List View */}
      {viewMode === 'kanban' ? (
        <div className="flex flex-1 overflow-x-auto p-4 gap-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          {stages.map((stage) => {
            const stageMembers = filteredMembers.filter(m => m.stage === stage.id);
            const isTargeted = dragOverStage === stage.id;
            
            return (
              <div 
                key={stage.id} 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverStage !== stage.id) setDragOverStage(stage.id);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDragOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const memberId = e.dataTransfer.getData('text/plain');
                  if (memberId) {
                    onMoveMember(memberId, stage.id);
                  }
                }}
                className={`flex-shrink-0 w-80 flex flex-col h-full rounded-2xl transition-all duration-200 ${
                  isTargeted 
                    ? 'ring-2 ring-indigo-500 ring-offset-2 bg-indigo-50/50 dark:bg-indigo-950/20' 
                    : ''
                }`}
              >
                {/* Column Header */}
                <div className={`p-3 rounded-t-2xl border-t-4 ${stage.border} bg-white dark:bg-slate-800 flex justify-between items-center mb-3 shadow-sm transition-colors group/header`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-lg shrink-0 ${stageTone(stage.color)}`}>
                      {getStageIcon(stage.iconName, 'w-4 h-4')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider leading-none truncate">
                        {stage.label}
                      </h3>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                        {stageMembers.length} {stageMembers.length === 1 ? 'contato' : 'contatos'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {onUpdateStages && (
                      <button
                        onClick={() => handleOpenStageEditor(stage.id)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title={`Editar etapa "${stage.label}"`}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button 
                      onClick={() => onAddMember(stage.id)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title={`Adicionar contato em ${stage.label}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Column Cards Drop Area */}
                <div className={`flex-1 overflow-y-auto space-y-3 pr-1 pb-4 rounded-xl transition-all ${
                  isTargeted ? 'bg-indigo-50/40 dark:bg-indigo-900/10 p-2' : ''
                }`}>
                  {stageMembers.map(member => (
                    <MemberCard 
                      key={member.id} 
                      member={member} 
                      events={events}
                      team={team}
                      stages={stages}
                      onMove={onMoveMember}
                      onClick={onMemberClick}
                      onEditEvent={onEditEvent}
                      onAddTask={onAddTask}
                    />
                  ))}
                  
                  {stageMembers.length === 0 && (
                    <div 
                      onClick={() => onAddMember(stage.id)}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:border-indigo-400 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-all group"
                    >
                      <Plus className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-bold text-center">Nenhum neste estágio</p>
                      <span className="text-[9px] font-medium text-slate-400 mt-0.5">Clique para adicionar ou arraste para cá</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* PIPELINE LIST VIEW */
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pessoa & Contato</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapa Atual (Edição Rápida)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Líder Responsável</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dias na Etapa</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredMembers.map((member) => {
                    const days = getDaysInStage(member.last_activity);
                    const currentStage = stages.find(s => s.id === member.stage) || stages[0];

                    return (
                      <tr 
                        key={member.id}
                        onClick={() => onMemberClick?.(member)}
                        className="group hover:bg-indigo-50/20 dark:hover:bg-slate-700/30 transition-all cursor-pointer"
                      >
                        {/* Member & Family info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                              {member.name[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {member.name}
                                </p>
                                {member.household_name && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800 rounded-lg text-[9px] font-bold">
                                    <Home className="w-2.5 h-2.5" />
                                    {member.household_name}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                                <span>{member.phone || 'Sem telefone'}</span>
                                {member.email && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[150px]">{member.email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Inline Stage Switcher */}
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <select
                              value={member.stage}
                              onChange={(e) => onMoveMember(member.id, e.target.value)}
                              className={`pl-3 pr-8 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider border cursor-pointer appearance-none transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${
                                stageTone(currentStage?.color) || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              } ${currentStage?.border || 'border-slate-200 dark:border-slate-700'}`}
                            >
                              {stages.map(s => (
                                <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium">
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                          </div>
                        </td>

                        {/* Leader */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              <UserCheck className="w-3 h-3 text-slate-400" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              {getLeaderName(member.responsible_leader_id)}
                            </span>
                          </div>
                        </td>

                        {/* Days in stage with alert if stagnant */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                              {days === 0 ? 'Hoje' : `${days} ${days === 1 ? 'dia' : 'dias'}`}
                            </span>
                            {days >= 7 && (
                              <span 
                                className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-full text-[9px] font-black uppercase flex items-center gap-1"
                                title="Atenção: contato parado nesta etapa há mais de 7 dias"
                              >
                                <AlertCircle className="w-2.5 h-2.5" /> Atenção
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions: Edit, WhatsApp, Follow-up */}
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onMemberClick?.(member)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white dark:hover:text-white text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                              title="Editar Perfil Completo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => onAddTask?.(member)}
                              className="p-2 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-all"
                              title="Agendar Acompanhamento"
                            >
                              <CalendarPlus className="w-4 h-4" />
                            </button>
                            {member.phone && (
                              <a
                                href={`https://wa.me/${member.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-all"
                                title="Conversar no WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredMembers.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-3">
                  <Users className="w-14 h-14 opacity-20" />
                  <p className="font-bold text-xs uppercase tracking-widest text-slate-400">
                    Nenhum contato encontrado no pipeline
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Stages Customization Modal */}
      {isPipelineModalOpen && onUpdateStages && (
        <EditPipelineModal
          isOpen={isPipelineModalOpen}
          onClose={() => {
            setIsPipelineModalOpen(false);
            setEditingStageId(null);
          }}
          stages={stages}
          members={members}
          onSaveStages={onUpdateStages}
          initialEditingStageId={editingStageId}
        />
      )}
    </div>
  );
};

export default KanbanBoard;
