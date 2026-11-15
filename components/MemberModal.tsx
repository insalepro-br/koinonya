import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  User, 
  Mail, 
  Phone, 
  Tag, 
  UserCheck, 
  ChevronDown, 
  History, 
  Edit3, 
  Trash2, 
  Clock, 
  FileText, 
  Home, 
  MapPin, 
  Search, 
  Loader2,
  Users2,
  Flame,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  MessageCircle,
  Send
} from 'lucide-react';
import { Member, MemberStage, SystemUser, ScheduleEvent, PipelineStage, Cell, MessageLog } from '../types';
import { DEFAULT_STAGES, getStageIcon, stageTone } from '../constants';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: Partial<Member>) => void;
  initialData?: Member | null;
  team?: SystemUser[];
  members?: Member[];
  events?: ScheduleEvent[];
  stages?: PipelineStage[];
  cells?: Cell[];
  messageLogs?: MessageLog[];
  onEditEvent?: (event: ScheduleEvent) => void;
  onDeleteEvent?: (id: string) => void;
  onLogMessage?: (member: Member, messageText: string) => Promise<void>;
}

const MemberModal: React.FC<MemberModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  team = [], 
  members = [],
  events = [],
  stages: customStages,
  cells = [],
  messageLogs = [],
  onEditEvent,
  onDeleteEvent,
  onLogMessage
}) => {
  const stages = customStages && customStages.length > 0 ? customStages : DEFAULT_STAGES;
  const defaultStageId = stages[0]?.id || MemberStage.NEW;

  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [quickWaText, setQuickWaText] = useState('');
  const [formData, setFormData] = useState<Partial<Member>>({
    name: '',
    email: '',
    phone: '',
    cep: '',
    gender: '',
    stage: defaultStageId,
    religion: '',
    address: '',
    neighborhood: '',
    city: '',
    channel: 'MANUAL',
    interests: '',
    responsible_leader_id: '',
    cell_id: '',
    notes: '',
    household_name: '',
    household_role: '' as any,
    household_id: ''
  });

  useEffect(() => {
    setFormError(null);
    if (initialData && initialData.id) {
      setFormData({
        ...initialData,
        household_role: initialData.household_role || ('' as any),
        neighborhood: initialData.neighborhood || '',
        city: initialData.city || '',
        cell_id: initialData.cell_id || ''
      });
    } else {
      setFormData({
        name: '', email: '', phone: '', cep: '', gender: '', 
        stage: initialData?.stage || defaultStageId,
        religion: '', address: '', neighborhood: '', city: '', channel: 'MANUAL', interests: '',
        responsible_leader_id: '', cell_id: '', notes: '',
        household_name: '', household_role: '' as any, household_id: ''
      });
    }
  }, [initialData, isOpen, defaultStageId]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);
    const trimmedName = formData.name?.trim();
    if (!trimmedName) {
      setFormError('Por favor, informe ao menos o Nome Completo para cadastrar.');
      return;
    }

    const payload: Partial<Member> = {
      ...formData,
      name: trimmedName,
      household_role: formData.household_role ? (formData.household_role as any) : undefined
    };
    onSave(payload);
  };

  // Existing households for suggestions
  const existingHouseholds = useMemo(() => {
    const names = new Set<string>();
    members.forEach(m => {
      if (m.household_name?.trim()) names.add(m.household_name.trim());
    });
    return Array.from(names);
  }, [members]);

  // Linked family members
  const linkedFamilyMembers = useMemo(() => {
    const curName = formData.household_name?.trim().toLowerCase();
    const curHId = formData.household_id?.trim();
    if (!curName && !curHId) return [];

    return members.filter(m => 
      m.id !== initialData?.id &&
      m.active !== false &&
      ((curHId && m.household_id === curHId) ||
       (curName && m.household_name?.trim().toLowerCase() === curName))
    );
  }, [members, formData.household_name, formData.household_id, initialData]);

  const applyCepMask = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = applyCepMask(e.target.value);
    setFormData(prev => ({ ...prev, cep: maskedValue }));
    
    if (maskedValue.length === 9) {
      handleCepLookup(maskedValue);
    }
  };

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: data.logradouro || prev.address || '',
            neighborhood: data.bairro || prev.neighborhood || '',
            city: data.localidade ? `${data.localidade}/${data.uf}` : prev.city || ''
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleSelectHouseholdSuggestion = (hName: string) => {
    setFormData(prev => ({ ...prev, household_name: hName }));
    const familyRef = members.find(m => m.household_name?.toLowerCase() === hName.toLowerCase() && m.address);
    if (familyRef && !formData.address) {
      setFormData(prev => ({
        ...prev,
        household_name: hName,
        address: familyRef.address || prev.address,
        neighborhood: familyRef.neighborhood || prev.neighborhood,
        city: familyRef.city || prev.city,
        cep: familyRef.cep || prev.cep
      }));
    }
  };

  const memberEvents = events
    .filter(e => e.member_id === initialData?.id)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  const memberMessages = useMemo(() => {
    if (!initialData?.id) return [];
    return messageLogs
      .filter(l => l.member_id === initialData.id)
      .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
  }, [messageLogs, initialData?.id]);

  const formatWaNumber = (phone?: string) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (!digits) return '';
    return (digits.length === 10 || digits.length === 11) ? `55${digits}` : digits;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 !mt-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[36px] md:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh]">
        
        {/* Header Fixo */}
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/30 dark:bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
                {initialData?.id ? 'Perfil do Contato' : 'Novo Contato'}
              </h3>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">
                Cadastro Ágil & Acompanhamento
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              title="Salvar Contato Agora"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-2.5 hover:bg-white dark:hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Formulário com Rodapé Pinned e Corpo Rolável */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
            
            {/* Aviso Informativo de Cadastro Ágil */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-2.5 text-xs text-indigo-800 dark:text-indigo-300 font-semibold">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                <strong>Cadastro Ágil:</strong> Apenas o <strong>Nome Completo</strong> é obrigatório. Todos os outros campos são opcionais e você pode complementar a qualquer momento.
              </span>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 ml-1">
                    Nome Completo *
                  </label>
                  <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                    Obrigatório
                  </span>
                </div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    className="w-full pl-12 pr-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 dark:text-white text-base"
                    value={formData.name || ''}
                    onChange={e => {
                      if (formError) setFormError(null);
                      setFormData({...formData, name: e.target.value});
                    }}
                    placeholder="Ex: João Silva Santos"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  WhatsApp / Telefone <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800 dark:text-white text-sm"
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="(11) 98765-4321"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  E-mail <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800 dark:text-white text-sm"
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="joao@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  Gênero <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <div className="relative">
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-slate-700 dark:text-slate-200 text-sm"
                    value={formData.gender || ''}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="">Não informado</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Bloco de Localização, Bairro e CEP (Alimenta KPIs de Mapeamento) */}
              <div className="md:col-span-2 p-5 bg-indigo-50/40 dark:bg-slate-900/40 rounded-3xl border border-indigo-100 dark:border-slate-700/60 space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Localização & Mapeamento por Bairro
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* CEP */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                      CEP <span className="font-normal text-slate-400">(Opcional)</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 dark:text-slate-500" />
                      <input 
                        type="text"
                        className="w-full pl-9 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 dark:text-white text-xs"
                        value={formData.cep || ''}
                        onChange={handleCepChange}
                        placeholder="12233-680"
                        maxLength={9}
                      />
                      {isLoadingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                    </div>
                  </div>

                  {/* Bairro / Região */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 ml-1">
                      Bairro / Região <span className="font-normal text-slate-400">(Opcional)</span>
                    </label>
                    <input 
                      type="text"
                      className="w-full px-3.5 py-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/60 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white font-bold text-xs placeholder:font-normal placeholder:text-slate-400"
                      value={formData.neighborhood || ''}
                      onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                      placeholder="Ex: Centro, Jardins, Vila Nova"
                    />
                  </div>

                  {/* Cidade / UF */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                      Cidade / UF <span className="font-normal text-slate-400">(Opcional)</span>
                    </label>
                    <input 
                      type="text"
                      className="w-full px-3.5 py-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white font-medium text-xs placeholder:text-slate-400"
                      value={formData.city || ''}
                      onChange={e => setFormData({...formData, city: e.target.value})}
                      placeholder="Ex: São Paulo/SP"
                    />
                  </div>

                  {/* Logradouro / Rua e Número */}
                  <div className="md:col-span-12 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                      Logradouro / Rua e Número <span className="font-normal text-slate-400">(Opcional)</span>
                    </label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white font-medium text-xs placeholder:text-slate-400"
                      value={formData.address || ''}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      placeholder="Rua das Flores, 123 - Apto 42"
                    />
                  </div>
                </div>
              </div>

              {/* MÓDULO DE FAMÍLIA / HOUSEHOLD */}
              <div className="md:col-span-2 p-5 bg-amber-50/50 dark:bg-amber-950/30 rounded-3xl border border-amber-200/60 dark:border-amber-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    Núcleo Familiar / Household <span className="font-normal text-slate-500 dark:text-slate-400 text-[10px] lowercase">(opcional)</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 ml-1">
                      Nome da Família <span className="font-normal text-slate-400">(Opcional)</span>
                    </label>
                    <div className="relative">
                      <input 
                        list="households-list"
                        type="text"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-800 dark:text-white text-sm"
                        placeholder="Ex: Família Silva"
                        value={formData.household_name || ''}
                        onChange={e => setFormData({ ...formData, household_name: e.target.value })}
                      />
                      <datalist id="households-list">
                        {existingHouseholds.map(h => (
                          <option key={h} value={h} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 ml-1">
                      Papel na Família <span className="font-normal text-slate-400">(Opcional)</span>
                    </label>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none appearance-none font-bold text-slate-700 dark:text-slate-300 text-sm"
                        value={formData.household_role || ''}
                        onChange={e => setFormData({ 
                          ...formData, 
                          household_role: e.target.value as any 
                        })}
                      >
                        <option value="">Selecione o papel...</option>
                        <option value="HEAD">Titular / Chefe de Família</option>
                        <option value="SPOUSE">Cônjuge</option>
                        <option value="CHILD">Filho(a)</option>
                        <option value="OTHER">Outro Membro / Parente</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Linked family members */}
                {linkedFamilyMembers.length > 0 && (
                  <div className="pt-2 border-t border-amber-200/50 dark:border-amber-800">
                    <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users2 className="w-3.5 h-3.5" />
                      Membros vinculados a esta família na igreja ({linkedFamilyMembers.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {linkedFamilyMembers.map(m => (
                        <div key={m.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 shadow-2xs">
                          <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-[10px] font-black flex items-center justify-center">
                            {m.name[0]}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{m.name}</span>
                          {m.household_role && (
                            <span className="text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                              {m.household_role === 'HEAD' ? 'Titular' : m.household_role === 'SPOUSE' ? 'Cônjuge' : m.household_role === 'CHILD' ? 'Filho(a)' : 'Parente'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  Origem / Canal <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <div className="relative">
                  <input 
                    list="channel-options-modal"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800 dark:text-white text-sm"
                    value={formData.channel || ''}
                    onChange={e => setFormData({...formData, channel: e.target.value})}
                    placeholder="Selecione ou digite..."
                  />
                  <datalist id="channel-options-modal">
                    <option value="MANUAL" />
                    <option value="QR_CODE" />
                    <option value="INSTAGRAM" />
                    <option value="WEBSITE" />
                    <option value="INDICATION" />
                    <option value="VISITA_PRESENCIAL" />
                  </datalist>
                  <Tag className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 dark:text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  Líder Responsável <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select 
                    className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-slate-700 dark:text-slate-200 text-sm"
                    value={formData.responsible_leader_id || ''}
                    onChange={e => setFormData({...formData, responsible_leader_id: e.target.value})}
                  >
                    <option value="">Sem líder atribuído</option>
                    {team.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  Mentor de Discipulado (Etapa 1) <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                  <select 
                    className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-slate-700 dark:text-slate-200 text-sm"
                    value={formData.mentor_id || ''}
                    onChange={e => {
                      const mId = e.target.value;
                      const selectedUser = team.find(u => u.id === mId);
                      setFormData({
                        ...formData, 
                        mentor_id: mId,
                        mentor_name: selectedUser?.name || ''
                      });
                    }}
                  >
                    <option value="">Sem mentor atribuído</option>
                    {team.map(u => <option key={u.id} value={u.id}>{u.name} ({u.duty || u.role})</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  Célula / Pequeno Grupo <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <div className="relative">
                  <Flame className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 pointer-events-none" />
                  <select 
                    className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-slate-700 dark:text-slate-200 text-sm"
                    value={formData.cell_id || ''}
                    onChange={e => setFormData({...formData, cell_id: e.target.value})}
                  >
                    <option value="">Nenhuma célula vinculada</option>
                    {cells.filter(c => c.active !== false).map(c => {
                      const leaderName = team.find(u => u.id === c.leader_id)?.name;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.neighborhood ? `(${c.neighborhood})` : ''}{leaderName ? ` - ${leaderName}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  Estágio no Pipeline
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none flex items-center justify-center">
                    {getStageIcon(stages.find(s => s.id === formData.stage)?.iconName, 'w-4 h-4')}
                  </span>
                  <select 
                    className={`w-full pl-12 pr-10 py-3.5 border rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-sm ${stageTone(stages.find(s => s.id === formData.stage)?.color) || 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                    value={formData.stage}
                    onChange={e => setFormData({...formData, stage: e.target.value})}
                  >
                    {stages.map(s => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium">
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  Notas e Comentários <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                  <textarea 
                    className="w-full pl-12 pr-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-slate-800 dark:text-white font-medium text-sm"
                    rows={3}
                    placeholder="Observações pastorais ou pedidos de oração..."
                    value={formData.notes || ''}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Histórico de Atividades & Mensagens WhatsApp (se for contato existente) */}
            {initialData?.id && (
              <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                {/* Histórico de Mensagens WhatsApp */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-emerald-500" />
                      <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                        Histórico de Mensagens WhatsApp ({memberMessages.length})
                      </h4>
                    </div>
                  </div>

                  {formData.phone && formatWaNumber(formData.phone).length >= 10 && (
                    <div className="flex flex-col sm:flex-row gap-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 rounded-2xl">
                      <input
                        type="text"
                        value={quickWaText}
                        onChange={e => setQuickWaText(e.target.value)}
                        placeholder={`Escreva uma mensagem rápida para ${formData.name?.split(' ')[0] || 'o contato'}...`}
                        className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none"
                      />
                      <a
                        href={`https://wa.me/${formatWaNumber(formData.phone)}?text=${encodeURIComponent(
                          quickWaText.trim() || `Olá, ${formData.name?.split(' ')[0] || ''}! Paz do Senhor!`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          const msg = quickWaText.trim() || `Olá, ${formData.name?.split(' ')[0] || ''}! Paz do Senhor!`;
                          if (initialData && onLogMessage) {
                            onLogMessage({ ...initialData, ...formData } as Member, msg);
                          }
                          setQuickWaText('');
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar & Registrar</span>
                      </a>
                    </div>
                  )}

                  <div className="space-y-2">
                    {memberMessages.length > 0 ? (
                      memberMessages.map(log => (
                        <div key={log.id} className="p-3.5 bg-emerald-50/30 dark:bg-slate-900/50 rounded-2xl border border-emerald-100 dark:border-slate-700/70 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                            <span>
                              {log.campaign_name
                                ? `Campanha: ${log.campaign_name}`
                                : log.channel === 'AUTOMATION_RULE'
                                ? 'Régua Automática'
                                : 'WhatsApp Direto'}
                              {log.sent_by_name ? ` • por ${log.sent_by_name}` : ''}
                            </span>
                            <span>
                              {new Date(log.sent_at).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(log.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                            "{log.message_text}"
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nenhuma mensagem registrada ainda</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Histórico de Agenda / Visitas */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      Histórico de Acompanhamento ({memberEvents.length})
                    </h4>
                  </div>

                  <div className="space-y-2.5">
                    {memberEvents.length > 0 ? (
                      memberEvents.map(event => (
                        <div key={event.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/70 flex items-center justify-between group">
                          <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center shrink-0">
                              <span className="text-[7.5px] font-black text-slate-400 uppercase leading-none">{new Date(event.start_date).toLocaleDateString('pt-BR', {month: 'short'})}</span>
                              <span className="text-xs font-black text-slate-800 dark:text-white">{new Date(event.start_date).getDate()}</span>
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white text-xs">{event.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400 font-medium">
                                <Clock className="w-3 h-3" />
                                {new Date(event.start_date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              type="button"
                              onClick={() => onEditEvent?.(event)}
                              className="p-1.5 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => onDeleteEvent?.(event.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nenhum evento registrado ainda</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé Fixo / Sticky Footer Sempre Visível */}
          <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs flex items-center justify-between gap-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                {formData.name?.trim() ? `✓ Pronto para salvar` : 'Digite o nome para salvar'}
              </span>
              <button 
                type="submit"
                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Contato</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberModal;
