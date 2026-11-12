import React, { useState, useMemo } from 'react';
import { 
  Users2, 
  Plus, 
  Search, 
  MapPin, 
  Clock, 
  Calendar, 
  UserCheck, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  HeartHandshake, 
  CheckCircle2, 
  Sparkles,
  Flame,
  TrendingUp,
  ChevronRight,
  BookOpen,
  UserPlus,
  MessageCircle,
  UserMinus,
  Check
} from 'lucide-react';
import { Cell, CellMeeting, Member, SystemUser } from '../types';

interface CellsModuleProps {
  cells: Cell[];
  members: Member[];
  team: SystemUser[];
  onSaveCell: (cell: Partial<Cell>) => Promise<void>;
  onDeleteCell: (id: string) => Promise<void>;
  onSaveMeeting?: (meeting: Partial<CellMeeting>) => Promise<void>;
  onSeedInitialCells?: () => Promise<void>;
  onEditMember?: (member: Member) => void;
  onOpenMember?: (member: Member) => void;
  onUpdateMemberCell?: (memberId: string, cellId: string | undefined) => Promise<void>;
}

const WEEKDAYS = [
  { id: 'SEGUNDA', label: 'Segunda-feira' },
  { id: 'TERCA', label: 'Terça-feira' },
  { id: 'QUARTA', label: 'Quarta-feira' },
  { id: 'QUINTA', label: 'Quinta-feira' },
  { id: 'SEXTA', label: 'Sexta-feira' },
  { id: 'SABADO', label: 'Sábado' },
  { id: 'DOMINGO', label: 'Domingo' },
];

const CellsModule: React.FC<CellsModuleProps> = ({
  cells,
  members,
  team,
  onSaveCell,
  onDeleteCell,
  onSaveMeeting,
  onSeedInitialCells,
  onEditMember,
  onOpenMember,
  onUpdateMemberCell
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAudience, setSelectedAudience] = useState('ALL');
  const [isCellModalOpen, setIsCellModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [viewingCellMembers, setViewingCellMembers] = useState<Cell | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Quick link member state
  const [memberToLink, setMemberToLink] = useState<string>('');
  const [linkingSuccessMsg, setLinkingSuccessMsg] = useState<string | null>(null);

  // Form State for Cell
  const [cellFormData, setCellFormData] = useState<Partial<Cell>>({
    name: '',
    leader_id: '',
    co_leader_id: '',
    host_name: '',
    meeting_day: 'QUARTA',
    meeting_time: '20:00',
    neighborhood: '',
    address: '',
    target_audience: 'Jovens & Adultos',
    active: true
  });

  // Form State for Meeting
  const [meetingFormData, setMeetingFormData] = useState<Partial<CellMeeting>>({
    theme: '',
    attendees_count: 0,
    visitors_count: 0,
    notes: '',
    date: new Date()
  });

  const activeCells = useMemo(() => cells.filter(c => c.active !== false), [cells]);

  const filteredCells = useMemo(() => {
    return activeCells.filter(cell => {
      const leaderName = team.find(u => u.id === cell.leader_id)?.name || '';
      const matchesSearch = 
        cell.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cell.neighborhood && cell.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())) ||
        leaderName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAudience = selectedAudience === 'ALL' || cell.target_audience === selectedAudience;
      return matchesSearch && matchesAudience;
    });
  }, [activeCells, searchTerm, selectedAudience, team]);

  const totalConnectedMembers = useMemo(() => {
    return members.filter(m => m.active !== false && m.cell_id).length;
  }, [members]);

  const audienceOptions = useMemo(() => {
    const list = new Set<string>();
    activeCells.forEach(c => {
      if (c.target_audience) list.add(c.target_audience);
    });
    return Array.from(list);
  }, [activeCells]);

  // Unassigned or other members for the linking selector
  const availableMembersToLink = useMemo(() => {
    if (!viewingCellMembers) return [];
    return members
      .filter(m => m.active !== false && m.cell_id !== viewingCellMembers.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, viewingCellMembers]);

  const openCreateModal = () => {
    setSelectedCell(null);
    setCellFormData({
      name: '',
      leader_id: team[0]?.id || '',
      co_leader_id: '',
      host_name: '',
      meeting_day: 'QUARTA',
      meeting_time: '20:00',
      neighborhood: '',
      address: '',
      target_audience: 'Jovens & Adultos',
      active: true
    });
    setIsCellModalOpen(true);
  };

  const openEditModal = (cell: Cell) => {
    setSelectedCell(cell);
    setCellFormData(cell);
    setIsCellModalOpen(true);
  };

  const openMeetingModal = (cell: Cell) => {
    setSelectedCell(cell);
    setMeetingFormData({
      theme: '',
      attendees_count: members.filter(m => m.cell_id === cell.id).length || 5,
      visitors_count: 1,
      notes: '',
      date: new Date()
    });
    setIsMeetingModalOpen(true);
  };

  const handleSaveCellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cellFormData.name || !cellFormData.leader_id) return;
    
    await onSaveCell({
      ...cellFormData,
      id: selectedCell?.id || Math.random().toString(36).substr(2, 9),
      created_at: selectedCell?.created_at || new Date()
    });
    setIsCellModalOpen(false);
  };

  const handleSaveMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell || !onSaveMeeting) return;

    await onSaveMeeting({
      ...meetingFormData,
      id: Math.random().toString(36).substr(2, 9),
      cell_id: selectedCell.id,
      date: meetingFormData.date || new Date(),
      created_at: new Date()
    });
    setIsMeetingModalOpen(false);
  };

  const handleLinkMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToLink || !viewingCellMembers || !onUpdateMemberCell) return;

    await onUpdateMemberCell(memberToLink, viewingCellMembers.id);
    const linked = members.find(m => m.id === memberToLink);
    setLinkingSuccessMsg(`${linked ? linked.name : 'Participante'} vinculado com sucesso!`);
    setMemberToLink('');
    setTimeout(() => setLinkingSuccessMsg(null), 3000);
  };

  const handleUnlinkMember = async (memberId: string) => {
    if (!onUpdateMemberCell) return;
    await onUpdateMemberCell(memberId, undefined);
  };

  const handleSeed = async () => {
    if (!onSeedInitialCells || isSeeding) return;
    setIsSeeding(true);
    try {
      await onSeedInitialCells();
    } finally {
      setIsSeeding(false);
    }
  };

  const getLeader = (leaderId?: string) => team.find(u => u.id === leaderId);

  return (
    <div className="p-8 h-full flex flex-col gap-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden transition-colors">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">
              Células & Pequenos Grupos
            </h2>
            <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black">
              {activeCells.length} {activeCells.length === 1 ? 'grupo' : 'grupos'}
            </span>
          </div>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Gestão pastoral da vida nos lares, participantes cadastrados e frequência semanal.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {activeCells.length === 0 && onSeedInitialCells && (
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-2 px-5 py-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl font-black shadow-xs hover:bg-emerald-100 transition-all uppercase tracking-widest text-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSeeding ? 'Carregando...' : 'Carregar Células Demo'}</span>
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Célula</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[28px] border border-slate-100 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Células Ativas</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{activeCells.length}</h3>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-600 rounded-2xl">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-[28px] border border-slate-100 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Participantes Conectados</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalConnectedMembers}</h3>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-2xl">
            <Users2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-[28px] border border-slate-100 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Taxa de Conexão</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
              {members.length > 0 ? Math.round((totalConnectedMembers / members.length) * 100) : 0}%
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-[28px] border border-slate-100 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Média por Célula</p>
            <h3 className="text-2xl font-black text-blue-600 mt-0.5">
              {activeCells.length > 0 ? (totalConnectedMembers / activeCells.length).toFixed(1) : 0} vidas
            </h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-2xl">
            <HeartHandshake className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-[28px] border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input
            type="text"
            placeholder="Buscar célula por nome, líder ou bairro..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-medium text-sm text-slate-700 dark:text-slate-200 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {audienceOptions.length > 0 && (
          <select
            className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
            value={selectedAudience}
            onChange={e => setSelectedAudience(e.target.value)}
          >
            <option value="ALL">Todos os Públicos</option>
            {audienceOptions.map(aud => (
              <option key={aud} value={aud}>{aud}</option>
            ))}
          </select>
        )}
      </div>

      {/* Cells Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
          {filteredCells.map(cell => {
            const leader = getLeader(cell.leader_id);
            const coLeader = getLeader(cell.co_leader_id);
            const cellMembers = members.filter(m => m.active !== false && m.cell_id === cell.id);

            return (
              <div 
                key={cell.id}
                className="bg-white dark:bg-slate-800 rounded-[32px] p-6 border border-slate-100 dark:border-slate-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
              >
                <div>
                  {/* Top badges & actions */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-rose-50 dark:bg-rose-950 text-rose-600 rounded-xl">
                        <Flame className="w-4 h-4" />
                      </span>
                      {cell.target_audience && (
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                          {cell.target_audience}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(cell)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                        title="Editar Célula"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteCell(cell.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Excluir Célula"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">
                    {cell.name}
                  </h3>

                  {/* Leaders */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-bold">Líder: {leader?.name || 'Não atribuído'}</span>
                    </div>
                    {coLeader && (
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <span className="w-3.5 text-center">•</span>
                        <span>Vice: {coLeader.name}</span>
                      </div>
                    )}
                    {cell.host_name && (
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <span className="w-3.5 text-center">🏠</span>
                        <span>Anfitrião: {cell.host_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Day, Time, and Location */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold">
                        {WEEKDAYS.find(w => w.id === cell.meeting_day)?.label || cell.meeting_day} às {cell.meeting_time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {cell.neighborhood ? `${cell.neighborhood}${cell.address ? ` • ${cell.address}` : ''}` : (cell.address || 'Local a definir')}
                      </span>
                    </div>
                  </div>

                  {/* VISUALIZAÇÃO DIRETA DOS PARTICIPANTES CADASTRADOS (Feedback 2) */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Participantes ({cellMembers.length})
                      </p>
                      <button
                        onClick={() => setViewingCellMembers(cell)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 cursor-pointer flex items-center gap-0.5"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>Gerenciar</span>
                      </button>
                    </div>

                    {cellMembers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {cellMembers.slice(0, 5).map(m => (
                          <div 
                            key={m.id} 
                            onClick={() => (onEditMember || onOpenMember)?.(m)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-bold cursor-pointer hover:border-indigo-200 transition-colors"
                            title={`Ver perfil de ${m.name}`}
                          >
                            <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-black flex items-center justify-center">
                              {m.name[0]}
                            </span>
                            <span className="truncate max-w-[80px]">{m.name.split(' ')[0]}</span>
                          </div>
                        ))}
                        {cellMembers.length > 5 && (
                          <span 
                            onClick={() => setViewingCellMembers(cell)}
                            className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black cursor-pointer hover:bg-indigo-100"
                          >
                            +{cellMembers.length - 5}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Nenhum participante vinculado ainda.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions and Connected Count */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <button
                    onClick={() => setViewingCellMembers(cell)}
                    className="flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    <Users2 className="w-4 h-4" />
                    <span>Ver Todos ({cellMembers.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => openMeetingModal(cell)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                    title="Lançar relatório e frequência de reunião"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Lançar Relatório</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCells.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center text-slate-300 gap-4">
            <Flame className="w-16 h-16 opacity-20" />
            <p className="font-bold text-xs uppercase tracking-widest text-slate-400">
              Nenhuma célula ou pequeno grupo encontrado
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all cursor-pointer"
            >
              Criar Primeira Célula
            </button>
          </div>
        )}
      </div>

      {/* Modal: Nova / Editar Célula */}
      {isCellModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 max-w-lg w-full rounded-[36px] p-8 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">
                    {selectedCell ? 'Editar Célula' : 'Nova Célula / Pequeno Grupo'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Cadastro de Grupo nos Lares
                  </p>
                </div>
              </div>
              <button onClick={() => setIsCellModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCellSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome da Célula *</label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Célula Betel, Ágape, Conexão Jovem"
                  value={cellFormData.name}
                  onChange={e => setCellFormData({ ...cellFormData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Líder Titular *</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                    value={cellFormData.leader_id}
                    onChange={e => setCellFormData({ ...cellFormData, leader_id: e.target.value })}
                  >
                    <option value="">Selecione o líder...</option>
                    {team.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Vice-Líder</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                    value={cellFormData.co_leader_id || ''}
                    onChange={e => setCellFormData({ ...cellFormData, co_leader_id: e.target.value })}
                  >
                    <option value="">Sem vice-líder</option>
                    {team.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Dia da Reunião</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 outline-none text-xs"
                    value={cellFormData.meeting_day}
                    onChange={e => setCellFormData({ ...cellFormData, meeting_day: e.target.value as any })}
                  >
                    {WEEKDAYS.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Horário</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 outline-none text-xs"
                    value={cellFormData.meeting_time}
                    onChange={e => setCellFormData({ ...cellFormData, meeting_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Bairro</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 outline-none text-xs"
                    placeholder="Ex: Centro, Jardim das Flores"
                    value={cellFormData.neighborhood || ''}
                    onChange={e => setCellFormData({ ...cellFormData, neighborhood: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Público-Alvo</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 outline-none text-xs"
                    placeholder="Ex: Jovens, Casais, Misto"
                    value={cellFormData.target_audience || ''}
                    onChange={e => setCellFormData({ ...cellFormData, target_audience: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Anfitrião / Endereço Completo</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-medium text-slate-700 dark:text-slate-200 outline-none text-xs"
                  placeholder="Ex: Casa do Irmão Carlos - Rua das Palmeiras, 120"
                  value={cellFormData.address || ''}
                  onChange={e => setCellFormData({ ...cellFormData, address: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCellModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-2xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-100 cursor-pointer"
                >
                  Salvar Célula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lançar Relatório de Reunião */}
      {isMeetingModalOpen && selectedCell && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 max-w-lg w-full rounded-[36px] p-8 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">Relatório de Reunião</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {selectedCell.name}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsMeetingModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeetingSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tema da Palavra Ministrada *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-xs outline-none"
                  placeholder="Ex: O Poder da Oração, Frutificando em Meio à Crise"
                  value={meetingFormData.theme || ''}
                  onChange={e => setMeetingFormData({ ...meetingFormData, theme: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Presentes (Membros)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-xs outline-none"
                    value={meetingFormData.attendees_count}
                    onChange={e => setMeetingFormData({ ...meetingFormData, attendees_count: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Visitantes / Não-Crentes</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-xs outline-none"
                    value={meetingFormData.visitors_count}
                    onChange={e => setMeetingFormData({ ...meetingFormData, visitors_count: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Testemunhos ou Observações</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-medium text-slate-800 dark:text-white text-xs outline-none resize-none"
                  placeholder="Relato de orações respondidas, conversões ou necessidades da célula..."
                  value={meetingFormData.notes || ''}
                  onChange={e => setMeetingFormData({ ...meetingFormData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-2xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-100 cursor-pointer"
                >
                  Registrar Reunião
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Visualizar, Adicionar e Gerenciar Participantes Cadastrados na Célula (Feedback 2) */}
      {viewingCellMembers && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 max-w-xl w-full rounded-[36px] p-8 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">{viewingCellMembers.name}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Participantes Cadastrados no Sistema
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingCellMembers(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SEÇÃO PARA VINCULAR NOVO PARTICIPANTE À CÉLULA (Feedback 2) */}
            <div className="py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <form onSubmit={handleLinkMemberSubmit} className="flex gap-2">
                <select
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                  value={memberToLink}
                  onChange={(e) => setMemberToLink(e.target.value)}
                >
                  <option value="">Selecione um membro/visitante para vincular a esta célula...</option>
                  {availableMembersToLink.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.household_name ? `(${m.household_name})` : ''} - {m.stage}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!memberToLink}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Vincular</span>
                </button>
              </form>

              {linkingSuccessMsg && (
                <div className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>{linkingSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* LISTA DE PARTICIPANTES ATUAIS */}
            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {members.filter(m => m.active !== false && m.cell_id === viewingCellMembers.id).map(m => (
                <div 
                  key={m.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-all group"
                >
                  <div 
                    onClick={() => {
                      setViewingCellMembers(null);
                      (onEditMember || onOpenMember)?.(m);
                    }}
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all text-sm">
                      {m.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white text-xs group-hover:text-indigo-600 transition-colors">{m.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400">{m.phone || 'Sem telefone'}</span>
                        {m.household_name && (
                          <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded font-semibold">
                            {m.household_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {m.phone && (
                      <a
                        href={`https://wa.me/${m.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Conversar no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    <span className="text-[9px] font-black uppercase px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">
                      {m.stage}
                    </span>
                    <button
                      onClick={() => handleUnlinkMember(m.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      title="Desvincular da célula"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {members.filter(m => m.active !== false && m.cell_id === viewingCellMembers.id).length === 0 && (
                <div className="py-12 text-center text-slate-300">
                  <Users2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-xs uppercase tracking-widest text-slate-400">
                    Nenhum participante vinculado a esta célula
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Utilize o campo acima para vincular irmãos e visitantes já cadastrados na igreja a esta célula.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setViewingCellMembers(null)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider rounded-2xl cursor-pointer"
              >
                Concluir & Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CellsModule;
