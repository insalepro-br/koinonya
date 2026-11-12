import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Users, 
  MessageCircle, 
  CalendarPlus, 
  UserCheck, 
  Mail, 
  Upload, 
  QrCode, 
  Archive, 
  RotateCcw, 
  Home, 
  X, 
  ShieldAlert,
  List,
  LayoutGrid,
  ChevronDown,
  Phone,
  Flame,
  MapPin,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { Member, MemberStage, SystemUser, PipelineStage, Cell } from '../types';
import { DEFAULT_STAGES, getStageIcon } from '../constants';
import ImportContactsModal from './ImportContactsModal';
import { exportContactsCSV, downloadCSV } from '../utils/exportImportHelpers';

interface ContactsModuleProps {
  members: Member[];
  team?: SystemUser[];
  stages?: PipelineStage[];
  cells?: Cell[];
  onEditMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  onRestoreMember?: (id: string) => void;
  onPermanentDeleteMember?: (id: string) => void;
  onAddMember: () => void;
  onImportMembers?: (members: Member[]) => void;
  onQuickTask?: (member: Member) => void;
  onOpenVisitorQr?: () => void;
  onUpdateStage?: (id: string, newStage: string) => void;
}

const ContactsModule: React.FC<ContactsModuleProps> = ({ 
  members, 
  team = [],
  stages: customStages,
  cells = [],
  onEditMember, 
  onDeleteMember,
  onRestoreMember,
  onPermanentDeleteMember,
  onAddMember,
  onImportMembers,
  onQuickTask,
  onOpenVisitorQr,
  onUpdateStage
}) => {
  const stages = customStages && customStages.length > 0 ? customStages : DEFAULT_STAGES;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedCell, setSelectedCell] = useState<string>('ALL');
  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active');
  const [viewLayout, setViewLayout] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('koinonia_contacts_view') as 'table' | 'cards') || 'table';
    }
    return 'table';
  });

  const handleSetViewLayout = (layout: 'table' | 'cards') => {
    setViewLayout(layout);
    try {
      localStorage.setItem('koinonia_contacts_view', layout);
    } catch {}
  };

  const [memberToDeletePermanent, setMemberToDeletePermanent] = useState<Member | null>(null);
  const [memberToArchive, setMemberToArchive] = useState<Member | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportContacts = () => {
    const targetMembers = viewTab === 'active' ? activeMembers : archivedMembers;
    const csv = exportContactsCSV(targetMembers, stages, team, cells);
    const dateStr = new Date().toISOString().split('T')[0];
    const prefix = viewTab === 'active' ? 'koinonya_contatos_ativos' : 'koinonya_contatos_arquivados';
    downloadCSV(`${prefix}_${dateStr}.csv`, csv);
  };

  const activeMembers = useMemo(() => members.filter(m => m.active !== false), [members]);
  const archivedMembers = useMemo(() => members.filter(m => m.active === false), [members]);

  const displayedList = useMemo(() => {
    const list = viewTab === 'active' ? activeMembers : archivedMembers;
    return list.filter(m => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.phone && m.phone.includes(searchTerm)) ||
        (m.neighborhood && m.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.city && m.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.address && m.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.household_name && m.household_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStage = selectedStage === 'ALL' || m.stage === selectedStage;
      const matchesCell = 
        selectedCell === 'ALL' || 
        (selectedCell === 'UNASSIGNED' ? !m.cell_id : m.cell_id === selectedCell);

      return matchesSearch && matchesStage && matchesCell;
    });
  }, [viewTab, activeMembers, archivedMembers, searchTerm, selectedStage, selectedCell]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n');
        const newMembers: Member[] = [];
        const startIndex = rows[0]?.toLowerCase().includes('nome') ? 1 : 0;

        for (let i = startIndex; i < rows.length; i++) {
          const columns = rows[i].split(',');
          if (columns.length >= 2 && columns[0]?.trim()) {
            newMembers.push({
              id: Math.random().toString(36).substr(2, 9),
              name: columns[0].trim(),
              email: columns[1]?.trim() || '',
              phone: columns[2]?.trim() || '',
              gender: columns[3]?.trim() || '',
              stage: stages[0]?.id || MemberStage.NEW,
              channel: columns[4]?.trim() || 'CSV_IMPORT',
              registration_date: new Date(),
              last_activity: new Date(),
              engagement_score: 50,
              church_id: 'default',
              org_id: 'default',
              active: true
            });
          }
        }
        if (newMembers.length > 0 && onImportMembers) {
          onImportMembers(newMembers);
        }
      };
      reader.readAsText(file);
    }
  };

  const getStageInfo = (stageId: string) => {
    return stages.find(s => s.id === stageId) || stages[0];
  };

  const getLeaderName = (id?: string) => {
    const leader = team.find(u => u.id === id);
    return leader ? leader.name : 'Sem Responsável';
  };

  const getCellName = (id?: string) => {
    if (!id) return null;
    const found = cells.find(c => c.id === id);
    return found ? found.name : null;
  };

  const getHouseholdRoleLabel = (role?: 'HEAD' | 'SPOUSE' | 'CHILD' | 'OTHER') => {
    switch (role) {
      case 'HEAD': return 'Titular / Chefe';
      case 'SPOUSE': return 'Cônjuge';
      case 'CHILD': return 'Filho(a)';
      case 'OTHER': return 'Dependente';
      default: return 'Família';
    }
  };

  const confirmArchive = () => {
    if (memberToArchive) {
      onDeleteMember(memberToArchive.id);
      setMemberToArchive(null);
    }
  };

  const confirmPermanentDelete = () => {
    if (memberToDeletePermanent && onPermanentDeleteMember) {
      onPermanentDeleteMember(memberToDeletePermanent.id);
      setMemberToDeletePermanent(null);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col gap-6 bg-slate-50/50 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Gestão de Contatos</h2>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black">
              {displayedList.length} {displayedList.length === 1 ? 'pessoa' : 'pessoas'}
            </span>

            {/* Alternador de Visualização (Lista vs Cartões) com destaque imediato */}
            <div className="flex items-center bg-slate-200/90 dark:bg-slate-700/80 p-1 rounded-2xl border border-slate-300 dark:border-slate-600 shadow-inner">
              <button
                type="button"
                onClick={() => handleSetViewLayout('table')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  viewLayout === 'table'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Visualizar em formato de Lista / Tabela"
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetViewLayout('cards')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  viewLayout === 'cards'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Visualizar em formato de Cartões em Grade"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cartões</span>
              </button>
            </div>
          </div>
          <p className="text-slate-500 font-medium text-sm mt-1">Acompanhe, edite e organize cada pessoa em sua jornada na igreja.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200/80 rounded-2xl font-black shadow-xs transition-all uppercase tracking-wider text-xs cursor-pointer"
            title="Importar contatos via planilha CSV (com suporte a modelo)"
          >
            <Upload className="w-4 h-4 text-indigo-600" /> 
            <span>Importar CSV</span>
          </button>

          <button 
            type="button"
            onClick={handleExportContacts}
            className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl font-black shadow-xs transition-all uppercase tracking-wider text-xs cursor-pointer"
            title="Exportar lista atual de contatos em formato CSV / Excel"
          >
            <Download className="w-4 h-4 text-slate-500" /> 
            <span>Exportar CSV</span>
          </button>

          {onOpenVisitorQr && (
            <button 
              type="button"
              onClick={onOpenVisitorQr}
              className="flex items-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-2xl font-black shadow-xs hover:bg-indigo-100 transition-all uppercase tracking-wider text-xs cursor-pointer"
              title="Abrir QR Code de Visitantes"
            >
              <QrCode className="w-4 h-4" /> 
              <span className="hidden sm:inline">QR Code Ficha</span>
            </button>
          )}
          <button 
            onClick={onAddMember}
            className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest text-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Novo Contato
          </button>
        </div>
      </div>

      {/* Tabs (Ativos vs Lixeira / Arquivados) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewTab('active')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              viewTab === 'active'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-500 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Contatos Ativos</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              viewTab === 'active' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {activeMembers.length}
            </span>
          </button>

          <button
            onClick={() => setViewTab('archived')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              viewTab === 'archived'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                : 'bg-white text-slate-500 hover:text-rose-600 border border-slate-200'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Lixeira / Arquivados</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              viewTab === 'archived' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600 font-bold'
            }`}>
              {archivedMembers.length}
            </span>
          </button>
        </div>

        {/* Informative mode badge */}
        <div className="text-xs font-bold text-slate-400">
          Modo atual: <strong className="text-indigo-600 uppercase">{viewLayout === 'table' ? 'Lista Detalhada' : 'Grade de Cartões'}</strong>
        </div>
      </div>

      {/* Search and Stage Filter */}
      <div className="bg-white p-3 rounded-[28px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            type="text"
            placeholder="Buscar por nome, bairro, telefone, email ou família..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm text-slate-700 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="px-5 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs uppercase tracking-widest text-slate-600 outline-none cursor-pointer"
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
          >
            <option value="ALL">Todas as Etapas</option>
            {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>

          {cells.length > 0 && (
            <select 
              className="px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs uppercase tracking-widest text-slate-600 outline-none cursor-pointer"
              value={selectedCell}
              onChange={(e) => setSelectedCell(e.target.value)}
            >
              <option value="ALL">Todas as Células</option>
              <option value="UNASSIGNED">Sem Célula</option>
              {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Duplicated layout toggle buttons for fast accessibility */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleSetViewLayout('table')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewLayout === 'table' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Alternar para Modo Lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewLayout('cards')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewLayout === 'cards' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Alternar para Modo Cartões"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Table / List View OR Card Grid View */}
      <div className="flex-1 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0">
        {viewLayout === 'table' ? (
          /* TABULAR LIST VIEW */
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pessoa & Família</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapa Atual (Edição Rápida)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Líder & Origem</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {viewTab === 'active' ? 'Interesses / Pedidos' : 'Data do Arquivamento'}
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayedList.map((member) => {
                  const currentStage = getStageInfo(member.stage);

                  return (
                    <tr 
                      key={member.id} 
                      onClick={() => viewTab === 'active' && onEditMember(member)}
                      className={`group transition-all border-b border-slate-50 last:border-0 ${
                        viewTab === 'active' ? 'hover:bg-indigo-50/20 cursor-pointer' : 'bg-slate-50/30'
                      }`}
                    >
                      {/* Name & Household */}
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-black transition-all shadow-sm shrink-0 ${
                            viewTab === 'active'
                              ? 'bg-slate-50 border-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600'
                              : 'bg-rose-50 border-rose-100 text-rose-400'
                          }`}>
                            {member.name[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
                                {member.name}
                              </p>
                              {(member.household_name || member.household_role) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-lg text-[9px] font-bold">
                                  <Home className="w-2.5 h-2.5" />
                                  {member.household_name || getHouseholdRoleLabel(member.household_role)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase mt-1">
                              <span className="bg-slate-100 px-1 rounded text-slate-500">{member.gender || 'N/I'}</span>
                              {member.phone && (
                                <>
                                  <span className="mx-0.5">•</span>
                                  <span>{member.phone}</span>
                                </>
                              )}
                              {member.neighborhood && (
                                <>
                                  <span className="mx-0.5">•</span>
                                  <span className="inline-flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-bold capitalize">
                                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                                    {member.neighborhood}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Stage (with quick dropdown edit in active mode) */}
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {viewTab === 'active' && onUpdateStage ? (
                          <div className="relative inline-block">
                            <select
                              value={member.stage}
                              onChange={(e) => onUpdateStage(member.id, e.target.value)}
                              className={`pl-3 pr-7 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider border cursor-pointer appearance-none transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${
                                currentStage.color || 'bg-slate-100 text-slate-700'
                              } ${currentStage.border || 'border-slate-200'}`}
                            >
                              {stages.map(s => (
                                <option key={s.id} value={s.id} className="bg-white text-slate-800 font-medium">
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                          </div>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${currentStage.color} ${currentStage.border}`}>
                            {currentStage.label}
                          </span>
                        )}
                      </td>

                      {/* Leader, Cell & Channel */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>{getLeaderName(member.responsible_leader_id)}</span>
                          </div>
                          {member.cell_id && getCellName(member.cell_id) && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 w-fit">
                              <Flame className="w-3 h-3 text-rose-500" />
                              <span>{getCellName(member.cell_id)}</span>
                            </div>
                          )}
                          <span className="text-[9px] text-slate-400 uppercase font-bold">
                            Canal: {member.channel || 'MANUAL'}
                          </span>
                        </div>
                      </td>

                      {/* Interests or Deleted Date */}
                      <td className="px-6 py-4">
                        {viewTab === 'active' ? (
                          member.interests ? (
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold italic border border-indigo-100">
                              #{member.interests}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px] font-medium italic">Não informado</span>
                          )
                        ) : (
                          <div className="text-xs font-semibold text-slate-600">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Arquivado em:</span>
                            {member.deleted_at ? new Date(member.deleted_at).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            }) : 'Data não registrada'}
                          </div>
                        )}
                      </td>

                      {/* Action buttons with explicit "Editar" */}
                      <td className="px-8 py-4">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {viewTab === 'active' ? (
                            <>
                              <button 
                                onClick={() => onEditMember(member)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-2xs cursor-pointer"
                                title="Editar Cadastro Completo"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>
                              <button 
                                onClick={() => onQuickTask?.(member)}
                                className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-xl transition-all shadow-sm bg-indigo-50/50 cursor-pointer"
                                title="Agendar Atividade"
                              >
                                <CalendarPlus className="w-4 h-4" />
                              </button>
                              {member.phone && (
                                <a 
                                  href={`https://wa.me/${member.phone.replace(/\D/g,'')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-2 text-emerald-500 hover:bg-emerald-100 rounded-xl transition-all shadow-sm bg-emerald-50/50 cursor-pointer"
                                  title="Enviar WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </a>
                              )}
                              <button 
                                onClick={() => setMemberToArchive(member)}
                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Arquivar Contato (Lixeira)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => onRestoreMember?.(member.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black transition-all cursor-pointer"
                                title="Restaurar contato para lista ativa"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                              </button>
                              <button 
                                onClick={() => setMemberToDeletePermanent(member)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black transition-all cursor-pointer"
                                title="Excluir definitivamente do banco de dados (LGPD)"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARD GRID VIEW (Cartões Visuais) */
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/60">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedList.map((member) => {
                const currentStage = getStageInfo(member.stage);

                return (
                  <div 
                    key={member.id}
                    onClick={() => viewTab === 'active' && onEditMember(member)}
                    className={`p-6 rounded-3xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-xl transition-all flex flex-col justify-between gap-5 cursor-pointer group relative overflow-hidden border-t-4 ${currentStage.border}`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-base group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm shrink-0">
                            {member.name[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-slate-800 text-base group-hover:text-indigo-600 transition-colors truncate">
                              {member.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              {member.gender || 'Gênero N/I'} • {member.channel || 'MANUAL'}
                            </p>
                          </div>
                        </div>

                        {/* Stage Selector / Badge */}
                        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                          {viewTab === 'active' && onUpdateStage ? (
                            <select
                              value={member.stage}
                              onChange={(e) => onUpdateStage(member.id, e.target.value)}
                              className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider border cursor-pointer outline-none shadow-2xs ${currentStage.color} ${currentStage.border}`}
                            >
                              {stages.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${currentStage.color} ${currentStage.border}`}>
                              {currentStage.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Household Badge */}
                      {(member.household_name || member.household_role) && (
                        <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-xl text-[10px] font-black">
                          <Home className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{member.household_name || 'Família vinculada'}</span>
                          {member.household_role && (
                            <span className="text-[9px] text-amber-700 font-bold">• {getHouseholdRoleLabel(member.household_role)}</span>
                          )}
                        </div>
                      )}

                      {/* Contact Details */}
                      <div className="mt-4 p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-600">
                        {member.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-700">{member.phone}</span>
                          </div>
                        )}
                        {member.neighborhood && (
                          <div className="flex items-center gap-2 text-indigo-600 font-bold">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>Bairro: {member.neighborhood}</span>
                          </div>
                        )}
                        {member.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate text-slate-500 font-medium">{member.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-bold text-slate-700">Líder: {getLeaderName(member.responsible_leader_id)}</span>
                        </div>
                        {member.cell_id && getCellName(member.cell_id) && (
                          <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-bold">
                            <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>Célula: {getCellName(member.cell_id)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      {viewTab === 'active' ? (
                        <>
                          <button
                            onClick={() => onEditMember(member)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-100 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar Perfil</span>
                          </button>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onQuickTask?.(member)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer border border-indigo-100"
                              title="Agendar Acompanhamento"
                            >
                              <CalendarPlus className="w-4 h-4" />
                            </button>
                            {member.phone && (
                              <a
                                href={`https://wa.me/${member.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer border border-emerald-100"
                                title="Conversar no WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => setMemberToArchive(member)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-rose-100"
                              title="Arquivar Contato"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full flex justify-between items-center">
                          <button
                            onClick={() => onRestoreMember?.(member.id)}
                            className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-emerald-200"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                          </button>
                          <button
                            onClick={() => setMemberToDeletePermanent(member)}
                            className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-rose-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {displayedList.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-3">
            <Users className="w-14 h-14 opacity-15" />
            <p className="font-bold text-xs uppercase tracking-widest text-slate-400">
              {viewTab === 'active' 
                ? 'Nenhum contato ativo encontrado' 
                : 'Nenhum contato arquivado na lixeira'}
            </p>
          </div>
        )}
      </div>

      {/* Modal: Confirm Archive (Soft Delete) */}
      {memberToArchive && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-[32px] p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
              <Archive className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Arquivar Contato?</h3>
            <p className="text-sm text-slate-500 mt-2">
              Você está arquivando <strong>{memberToArchive.name}</strong>. O contato sairá do pipeline e das estatísticas ativas, mas continuará salvo na lixeira e poderá ser restaurado a qualquer momento.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMemberToArchive(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmArchive}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-200 cursor-pointer"
              >
                Arquivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Permanent Delete (LGPD / Hard Delete) */}
      {memberToDeletePermanent && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-[32px] p-6 shadow-2xl border border-rose-100 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-rose-900">Exclusão Definitiva (LGPD)</h3>
            <p className="text-sm text-slate-500 mt-2">
              Atenção: Esta ação é <strong>irreversível</strong>. Todos os dados de <strong>{memberToDeletePermanent.name}</strong> serão apagados permanentemente do banco de dados para conformidade de privacidade.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMemberToDeletePermanent(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPermanentDelete}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-200 cursor-pointer"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Importar Contatos com Modelo Oficial e Prévia */}
      <ImportContactsModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        stages={stages} 
        onImport={(imported) => {
          if (onImportMembers) {
            onImportMembers(imported);
          }
        }} 
      />
    </div>
  );
};

export default ContactsModule;
