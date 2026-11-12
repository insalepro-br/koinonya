import React, { useState, useMemo } from 'react';
import {
  Zap,
  Play,
  Copy,
  Plus,
  MessageCircle,
  Clock,
  Sparkles,
  Edit3,
  X,
  Check,
  Send,
  Users,
  Filter,
  Smartphone,
  ChevronRight,
  Search,
  History,
  CheckCircle2,
  Megaphone,
  MapPin,
  Flame,
  Tag,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { generateHumanizedMessage } from '../services/geminiService';
import {
  AutomationRule,
  Member,
  PipelineStage,
  SystemUser,
  Church,
  Cell,
  MessageLog,
  BroadcastCampaign
} from '../types';
import { DEFAULT_STAGES } from '../constants';

interface AutomationSettingsProps {
  rules?: AutomationRule[];
  members?: Member[];
  team?: SystemUser[];
  church?: Church | null;
  stages?: PipelineStage[];
  cells?: Cell[];
  messageLogs?: MessageLog[];
  broadcastCampaigns?: BroadcastCampaign[];
  currentUser?: SystemUser | null;
  onSaveRule?: (rule: Partial<AutomationRule>) => Promise<void>;
  onSeedDefaultRules?: () => Promise<void>;
  onSaveMessageLog?: (log: Partial<MessageLog>) => Promise<void>;
  onSaveBroadcastCampaign?: (campaign: Partial<BroadcastCampaign>) => Promise<void>;
  onDeleteBroadcastCampaign?: (id: string) => Promise<void>;
}

const formatWhatsAppNumber = (phone?: string) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
};

const QUICK_TAGS = [
  { tag: '{primeiro_nome}', label: 'Primeiro Nome' },
  { tag: '{nome}', label: 'Nome Completo' },
  { tag: '{igreja}', label: 'Nome da Igreja' },
  { tag: '{lider}', label: 'Líder' },
  { tag: '{bairro}', label: 'Bairro' },
  { tag: '{celula}', label: 'Célula' }
];

const AutomationSettings: React.FC<AutomationSettingsProps> = ({
  rules = [],
  members = [],
  team = [],
  church,
  stages = DEFAULT_STAGES,
  cells = [],
  messageLogs = [],
  broadcastCampaigns = [],
  currentUser,
  onSaveRule,
  onSeedDefaultRules,
  onSaveMessageLog,
  onSaveBroadcastCampaign,
  onDeleteBroadcastCampaign
}) => {
  const [activeTab, setActiveTab] = useState<'flows' | 'bulk' | 'broadcast' | 'history' | 'sandbox'>('flows');
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 1-to-1 Broadcast State
  const [broadcastTargetMemberId, setBroadcastTargetMemberId] = useState<string>('');
  const [broadcastTemplate, setBroadcastTemplate] = useState<string>('');
  const [broadcastGeneratedMsg, setBroadcastGeneratedMsg] = useState<string>('');
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Bulk Broadcast & Segmentation State (Etapa 2)
  const [bulkSearch, setBulkSearch] = useState('');
  const [filterStage, setFilterStage] = useState<string>('ALL');
  const [filterCellId, setFilterCellId] = useState<string>('ALL');
  const [filterNeighborhood, setFilterNeighborhood] = useState<string>('ALL');
  const [filterChannel, setFilterChannel] = useState<string>('ALL');
  const [onlyWithPhone, setOnlyWithPhone] = useState<boolean>(true);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [campaignTitle, setCampaignTitle] = useState<string>('');
  const [bulkTemplate, setBulkTemplate] = useState<string>(
    'Paz, {primeiro_nome}! Passando para abençoar sua semana e convidar você para nossa programação especial na {igreja}. Contamos com você!'
  );
  const [isHumanizingBulk, setIsHumanizingBulk] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);

  // History Tab State
  const [historySearch, setHistorySearch] = useState('');
  const [historyChannelFilter, setHistoryChannelFilter] = useState<string>('ALL');

  // Sandbox AI State
  const [testContactName, setTestContactName] = useState('Mariana Oliveira');
  const [testStageLabel, setTestStageLabel] = useState('Novo Visitante');
  const [testContext, setTestContext] = useState('Primeira visita ao culto da família de domingo com o esposo e 2 filhos');
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  // Rule Form State
  const [ruleFormData, setRuleFormData] = useState<Partial<AutomationRule>>({
    name: '',
    trigger_type: 'CHECKIN_NEW',
    delay_days: 0,
    template_text: '',
    use_ai_humanization: true,
    active: true
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const activeMembersList = useMemo(() => members.filter(m => m.active !== false), [members]);
  const activeRules = useMemo(() => rules.filter(r => r.active !== false), [rules]);

  const targetMember = useMemo(() => {
    return activeMembersList.find(m => m.id === broadcastTargetMemberId) || activeMembersList[0] || null;
  }, [activeMembersList, broadcastTargetMemberId]);

  // Distinct neighborhoods and channels for segmentation filters
  const availableNeighborhoods = useMemo(() => {
    const set = new Set<string>();
    activeMembersList.forEach(m => {
      const nb = m.neighborhood?.trim();
      if (nb) set.add(nb);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeMembersList]);

  const availableChannels = useMemo(() => {
    const set = new Set<string>();
    activeMembersList.forEach(m => {
      if (m.channel?.trim()) set.add(m.channel.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeMembersList]);

  // Segmented list for Bulk Broadcast
  const segmentedMembers = useMemo(() => {
    return activeMembersList.filter(m => {
      if (onlyWithPhone && formatWhatsAppNumber(m.phone).length < 10) return false;
      if (filterStage !== 'ALL' && m.stage !== filterStage) return false;
      if (filterCellId === 'NONE' && m.cell_id) return false;
      if (filterCellId !== 'ALL' && filterCellId !== 'NONE' && m.cell_id !== filterCellId) return false;
      if (filterNeighborhood !== 'ALL' && (m.neighborhood || '').trim().toLowerCase() !== filterNeighborhood.toLowerCase()) {
        return false;
      }
      if (filterChannel !== 'ALL' && (m.channel || '').trim() !== filterChannel) return false;
      if (bulkSearch.trim()) {
        const q = bulkSearch.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchPhone = (m.phone || '').toLowerCase().includes(q);
        const matchNb = (m.neighborhood || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchNb) return false;
      }
      return true;
    });
  }, [activeMembersList, onlyWithPhone, filterStage, filterCellId, filterNeighborhood, filterChannel, bulkSearch]);

  const activeCampaign = useMemo(() => {
    if (!activeCampaignId) return null;
    return broadcastCampaigns.find(c => c.id === activeCampaignId) || null;
  }, [broadcastCampaigns, activeCampaignId]);

  const campaignRecipients = useMemo(() => {
    if (!activeCampaign) return [];
    return activeCampaign.recipient_ids
      .map(id => members.find(m => m.id === id))
      .filter((m): m is Member => Boolean(m));
  }, [activeCampaign, members]);

  const filteredHistoryLogs = useMemo(() => {
    return messageLogs.filter(log => {
      if (historyChannelFilter !== 'ALL' && log.channel !== historyChannelFilter) return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        return (
          log.member_name.toLowerCase().includes(q) ||
          log.message_text.toLowerCase().includes(q) ||
          (log.campaign_name || '').toLowerCase().includes(q) ||
          (log.member_phone || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [messageLogs, historyChannelFilter, historySearch]);

  const replaceTags = (text: string, member?: Member | null) => {
    if (!text) return '';
    const name = member?.name || testContactName;
    const firstName = name.split(' ')[0] || name;
    const churchName = church?.name || 'Comunidade Koinonya';
    const leader = team.find(u => u.id === member?.responsible_leader_id);
    const leaderName = leader?.name || 'Equipe Pastoral';
    const leaderPhone = leader?.whatsapp || leader?.email || '';
    const neighborhood = member?.neighborhood?.trim() || member?.address?.split('-')[1]?.trim() || 'seu bairro';
    const cellName = cells.find(c => c.id === member?.cell_id)?.name || 'Pequeno Grupo';

    return text
      .replace(/{nome}/gi, name)
      .replace(/{primeiro_nome}/gi, firstName)
      .replace(/{igreja}/gi, churchName)
      .replace(/{lider}/gi, leaderName)
      .replace(/{telefone_lider}/gi, leaderPhone)
      .replace(/{bairro}/gi, neighborhood)
      .replace(/{celula}/gi, cellName);
  };

  const getSegmentSummaryLabel = () => {
    const parts: string[] = [];
    if (filterStage !== 'ALL') {
      parts.push(stages.find(s => s.id === filterStage)?.label || filterStage);
    }
    if (filterCellId === 'NONE') {
      parts.push('Sem Célula');
    } else if (filterCellId !== 'ALL') {
      parts.push(cells.find(c => c.id === filterCellId)?.name || 'Célula');
    }
    if (filterNeighborhood !== 'ALL') parts.push(`Bairro: ${filterNeighborhood}`);
    if (filterChannel !== 'ALL') parts.push(`Origem: ${filterChannel}`);
    return parts.length > 0 ? parts.join(' • ') : 'Todos os Contatos';
  };

  const handleToggleSelectAllSegmented = () => {
    const segmentedIds = segmentedMembers.map(m => m.id);
    const allSelected = segmentedIds.length > 0 && segmentedIds.every(id => selectedRecipientIds.includes(id));
    if (allSelected) {
      setSelectedRecipientIds(prev => prev.filter(id => !segmentedIds.includes(id)));
    } else {
      setSelectedRecipientIds(Array.from(new Set([...selectedRecipientIds, ...segmentedIds])));
    }
  };

  const handleToggleRecipient = (id: string) => {
    setSelectedRecipientIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleCreateCampaign = async () => {
    if (!bulkTemplate.trim()) {
      showToast('Escreva uma mensagem antes de iniciar a campanha.');
      return;
    }
    const targetIds = selectedRecipientIds.length > 0
      ? selectedRecipientIds
      : segmentedMembers.map(m => m.id);

    if (targetIds.length === 0) {
      showToast('Selecione ao menos 1 destinatário na lista segmentada.');
      return;
    }

    const newCampaignId = 'camp_' + Math.random().toString(36).substr(2, 9);
    const title = campaignTitle.trim() || `Disparo • ${getSegmentSummaryLabel()}`;

    const campaignData: Partial<BroadcastCampaign> = {
      id: newCampaignId,
      title,
      segment_label: getSegmentSummaryLabel(),
      template_text: bulkTemplate.trim(),
      total_recipients: targetIds.length,
      sent_count: 0,
      recipient_ids: targetIds,
      sent_member_ids: [],
      created_by_name: currentUser?.name || 'Equipe',
      created_at: new Date()
    };

    if (onSaveBroadcastCampaign) {
      await onSaveBroadcastCampaign(campaignData);
    }
    setActiveCampaignId(newCampaignId);
    setCampaignTitle('');
    showToast(`Campanha "${title}" criada com ${targetIds.length} destinatário(s)!`);
  };

  const handleDispatchToCampaignMember = async (
    member: Member,
    campaign: BroadcastCampaign,
    openWhatsApp: boolean
  ) => {
    const messageText = replaceTags(campaign.template_text, member);

    if (onSaveMessageLog) {
      await onSaveMessageLog({
        id: 'log_' + Math.random().toString(36).substr(2, 9),
        member_id: member.id,
        member_name: member.name,
        member_phone: member.phone || '',
        channel: 'BULK_CAMPAIGN',
        campaign_id: campaign.id,
        campaign_name: campaign.title,
        message_text: messageText,
        sent_by_id: currentUser?.id,
        sent_by_name: currentUser?.name || 'Equipe',
        sent_at: new Date(),
        status: openWhatsApp ? 'OPENED_WA' : 'SENT'
      });
    }

    if (onSaveBroadcastCampaign) {
      const updatedSentIds = campaign.sent_member_ids.includes(member.id)
        ? campaign.sent_member_ids
        : [...campaign.sent_member_ids, member.id];

      await onSaveBroadcastCampaign({
        ...campaign,
        sent_member_ids: updatedSentIds,
        sent_count: updatedSentIds.length
      });
    }

    if (!openWhatsApp) {
      showToast(`Envio registrado no histórico de ${member.name}.`);
    }
  };

  const handleHumanizeBulk = async () => {
    if (!bulkTemplate.trim()) return;
    setIsHumanizingBulk(true);
    try {
      const stageName = filterStage !== 'ALL'
        ? stages.find(s => s.id === filterStage)?.label || 'Contato'
        : 'Membros e Visitantes';
      const humanized = await generateHumanizedMessage(
        '{primeiro_nome}',
        stageName,
        bulkTemplate
      );
      setBulkTemplate(humanized);
      showToast('Texto aprimorado pela IA preservando variáveis!');
    } catch (e) {
      console.error(e);
    } finally {
      setIsHumanizingBulk(false);
    }
  };

  const handleOpenEditRule = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setRuleFormData(rule);
    setIsRuleModalOpen(true);
  };

  const handleOpenCreateRule = () => {
    setSelectedRule(null);
    setRuleFormData({
      name: '',
      trigger_type: 'CHECKIN_NEW',
      delay_days: 0,
      template_text: 'Olá, {primeiro_nome}! Que bênção receber você na {igreja}!',
      use_ai_humanization: true,
      active: true
    });
    setIsRuleModalOpen(true);
  };

  const handleSaveRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFormData.name || !ruleFormData.template_text || !onSaveRule) return;

    await onSaveRule({
      ...ruleFormData,
      id: selectedRule?.id || Math.random().toString(36).substr(2, 9),
      created_at: selectedRule?.created_at || new Date()
    });
    setIsRuleModalOpen(false);
  };

  const handleToggleRule = async (rule: AutomationRule) => {
    if (!onSaveRule) return;
    await onSaveRule({
      ...rule,
      active: !rule.active
    });
  };

  const handleSeedDefaults = async () => {
    if (!onSeedDefaultRules || isSeeding) return;
    setIsSeeding(true);
    try {
      await onSeedDefaultRules();
    } finally {
      setIsSeeding(false);
    }
  };

  const handleHumanizeWithAI = async () => {
    if (!broadcastTemplate && !rules[0]?.template_text) return;
    setIsHumanizing(true);
    try {
      const baseText = broadcastTemplate || rules[0]?.template_text || '';
      const personalized = replaceTags(baseText, targetMember);
      const stageName = stages.find(s => s.id === targetMember?.stage)?.label || 'Visitante';

      const humanized = await generateHumanizedMessage(
        targetMember?.name || 'Visitante',
        stageName,
        personalized
      );
      setBroadcastGeneratedMsg(humanized);
    } catch (e) {
      console.error(e);
      setBroadcastGeneratedMsg(replaceTags(broadcastTemplate, targetMember));
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleLogSingleDispatch = async (status: 'OPENED_WA' | 'SENT') => {
    if (!targetMember || !onSaveMessageLog) return;
    const finalMsg = broadcastGeneratedMsg || replaceTags(broadcastTemplate, targetMember);
    if (!finalMsg.trim()) return;

    await onSaveMessageLog({
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      member_id: targetMember.id,
      member_name: targetMember.name,
      member_phone: targetMember.phone || '',
      channel: 'WHATSAPP',
      message_text: finalMsg,
      sent_by_id: currentUser?.id,
      sent_by_name: currentUser?.name || 'Equipe',
      sent_at: new Date(),
      status
    });
    showToast(`Mensagem registrada no prontuário de ${targetMember.name}!`);
  };

  const handleTestSandbox = async () => {
    setIsTesting(true);
    try {
      const msg = await generateHumanizedMessage(testContactName, testStageLabel, testContext);
      setTestResult(msg);
    } catch (err) {
      console.error(err);
      setTestResult('Erro ao consultar o assistente de IA.');
    } finally {
      setIsTesting(false);
    }
  };

  const copyBroadcast = () => {
    const textToCopy = broadcastGeneratedMsg || replaceTags(broadcastTemplate, targetMember);
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 md:p-8 h-full flex flex-col gap-6 bg-slate-50/50 dark:bg-slate-900 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">
            Comunicação, IA & Disparos
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
            {activeRules.length} fluxos ativos • {messageLogs.length} envios registrados no histórico • Segmentação WhatsApp
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {rules.length === 0 && onSeedDefaultRules && (
            <button
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className="flex items-center gap-2 px-5 py-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl font-black shadow-sm hover:bg-emerald-100 transition-all uppercase tracking-widest text-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSeeding ? 'Carregando...' : 'Carregar Réguas Padrão'}</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateRule}
            className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Fluxo</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="px-5 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
        <button
          onClick={() => setActiveTab('flows')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'flows'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Réguas & Fluxos</span>
        </button>

        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'bulk'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Disparos em Massa</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'broadcast'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Disparo 1 a 1</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-slate-800 dark:bg-indigo-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico ({messageLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'sandbox'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Laboratório IA</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {/* TAB 1: FLOWS */}
        {activeTab === 'flows' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`bg-white dark:bg-slate-800 p-6 rounded-[28px] border transition-all flex flex-col justify-between gap-4 ${
                    rule.active
                      ? 'border-slate-200 dark:border-slate-700 shadow-sm'
                      : 'border-slate-100 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-900/40'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-3 rounded-2xl ${
                            rule.delay_days === 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                              : rule.delay_days === 1
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                              : rule.delay_days === 3
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                              : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                          }`}
                        >
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 dark:text-white text-base">{rule.name}</h4>
                          <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                            {rule.delay_days === 0 ? 'Imediato (D+0)' : `D+${rule.delay_days}`}
                            {rule.use_ai_humanization ? ' • Humanização IA ativa' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.active}
                            onChange={() => handleToggleRule(rule)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                        <button
                          onClick={() => handleOpenEditRule(rule)}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                          title="Editar Fluxo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700/70 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium">
                      "{rule.template_text}"
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-400 font-bold">
                    <button
                      onClick={() => {
                        setBulkTemplate(rule.template_text);
                        setActiveTab('bulk');
                      }}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Usar em Massa</span>
                    </button>
                    <button
                      onClick={() => {
                        setBroadcastTemplate(rule.template_text);
                        setActiveTab('broadcast');
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Usar no 1 a 1</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {rules.length === 0 && (
              <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 p-8">
                <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700 dark:text-white">Nenhum fluxo configurado ainda</h4>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Clique abaixo para carregar as réguas de boas-vindas D+0, D+1, D+3, D+7 e alertas pastorais.
                </p>
                <button
                  onClick={handleSeedDefaults}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all cursor-pointer shadow-lg"
                >
                  Carregar Fluxos Recomendados
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BULK BROADCAST & SEGMENTATION (ETAPA 2) */}
        {activeTab === 'bulk' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-8">
            {/* Left Column: Audience Segmentation + Composer */}
            <div className="xl:col-span-7 space-y-6">
              {/* Segmentation Filters Card */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                      <Filter className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                        1. Segmentação de Público
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Filtre contatos por estágio, célula, bairro ou origem do cadastro
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {segmentedMembers.length} encontrado(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Estágio no Pipeline</label>
                    <select
                      value={filterStage}
                      onChange={e => setFilterStage(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                    >
                      <option value="ALL">Todos os Estágios</option>
                      {stages.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-rose-500" /> Célula / PG
                    </label>
                    <select
                      value={filterCellId}
                      onChange={e => setFilterCellId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                    >
                      <option value="ALL">Todas as Células</option>
                      <option value="NONE">Sem Célula Vinculada</option>
                      {cells.filter(c => c.active !== false).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-500" /> Bairro
                    </label>
                    <select
                      value={filterNeighborhood}
                      onChange={e => setFilterNeighborhood(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                    >
                      <option value="ALL">Todos os Bairros</option>
                      {availableNeighborhoods.map(nb => (
                        <option key={nb} value={nb}>{nb}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-emerald-500" /> Canal / Origem
                    </label>
                    <select
                      value={filterChannel}
                      onChange={e => setFilterChannel(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                    >
                      <option value="ALL">Todas as Origens</option>
                      {availableChannels.map(ch => (
                        <option key={ch} value={ch}>{ch}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bulkSearch}
                      onChange={e => setBulkSearch(e.target.value)}
                      placeholder="Buscar por nome, telefone ou bairro..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none"
                    />
                  </div>
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={onlyWithPhone}
                      onChange={e => setOnlyWithPhone(e.target.checked)}
                      className="rounded text-emerald-600 w-4 h-4"
                    />
                    <span>Somente com WhatsApp</span>
                  </label>
                </div>

                {/* Recipient Selection List */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={handleToggleSelectAllSegmented}
                      className="font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {segmentedMembers.length > 0 && segmentedMembers.every(m => selectedRecipientIds.includes(m.id))
                        ? 'Desmarcar Filtrados'
                        : `Selecionar Todos (${segmentedMembers.length})`}
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-500 dark:text-slate-400">
                        {selectedRecipientIds.length} selecionado(s)
                      </span>
                      {selectedRecipientIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedRecipientIds([])}
                          className="text-rose-500 hover:underline font-bold cursor-pointer"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                    {segmentedMembers.map(member => {
                      const isChecked = selectedRecipientIds.includes(member.id);
                      const stageObj = stages.find(s => s.id === member.stage);
                      const hasValidWa = formatWhatsAppNumber(member.phone).length >= 10;
                      return (
                        <label
                          key={member.id}
                          className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRecipient(member.id)}
                              className="rounded text-emerald-600 w-4 h-4 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{member.name}</p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {member.phone || 'Sem telefone'}
                                {member.neighborhood ? ` • ${member.neighborhood}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {stageObj?.label || member.stage}
                            </span>
                            {!hasValidWa && (
                              <p className="text-[9px] text-rose-500 font-bold">Telefone incompleto</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                    {segmentedMembers.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-400 font-medium">
                        Nenhum contato encontrado para este filtro. Ajuste os critérios acima.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Composer Card */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                      2. Mensagem da Campanha
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Cada envio substitui automaticamente os dados do contato
                    </p>
                  </div>
                  <select
                    onChange={(e) => {
                      const r = rules.find(rule => rule.id === e.target.value);
                      if (r) setBulkTemplate(r.template_text);
                    }}
                    className="text-xs font-bold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                  >
                    <option value="">Importar de uma Régua...</option>
                    {rules.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Título da Campanha (Opcional)
                  </label>
                  <input
                    type="text"
                    value={campaignTitle}
                    onChange={e => setCampaignTitle(e.target.value)}
                    placeholder={`Ex: Convite Culto da Família (${getSegmentSummaryLabel()})`}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Inserir variável:</span>
                    {QUICK_TAGS.map(item => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => setBulkTemplate(prev => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${item.tag}`)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    value={bulkTemplate}
                    onChange={e => setBulkTemplate(e.target.value)}
                    placeholder="Escreva sua mensagem personalizada..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                {/* Live Preview */}
                {segmentedMembers[0] && (
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 rounded-2xl">
                    <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 mb-1">
                      Prévia para {segmentedMembers[0].name}:
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                      {replaceTags(bulkTemplate, segmentedMembers[0])}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleHumanizeBulk}
                    disabled={isHumanizingBulk || !bulkTemplate.trim()}
                    className="py-3.5 px-5 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isHumanizingBulk ? 'Aprimorando...' : 'Humanizar com IA'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateCampaign}
                    disabled={!bulkTemplate.trim() || (selectedRecipientIds.length === 0 && segmentedMembers.length === 0)}
                    className="flex-1 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      Gerar Fila de Envio ({selectedRecipientIds.length > 0 ? selectedRecipientIds.length : segmentedMembers.length})
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Active Dispatch Queue & Saved Campaigns */}
            <div className="xl:col-span-5 space-y-6">
              {activeCampaign ? (
                <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        Fila de Disparo Ativa
                      </p>
                      <h3 className="text-lg font-black text-white mt-0.5">{activeCampaign.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{activeCampaign.segment_label}</p>
                    </div>
                    <button
                      onClick={() => setActiveCampaignId(null)}
                      className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                      title="Fechar fila ativa"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300">Progresso dos Envios</span>
                      <span className="text-emerald-400">
                        {activeCampaign.sent_member_ids.length} de {activeCampaign.total_recipients} enviados
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${
                            activeCampaign.total_recipients > 0
                              ? Math.round((activeCampaign.sent_member_ids.length / activeCampaign.total_recipients) * 100)
                              : 0
                          }%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Individual One-Click Queue */}
                  <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
                    {campaignRecipients.map(member => {
                      const isSent = activeCampaign.sent_member_ids.includes(member.id);
                      const personalizedText = replaceTags(activeCampaign.template_text, member);
                      const waNumber = formatWhatsAppNumber(member.phone);

                      return (
                        <div
                          key={member.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isSent
                              ? 'bg-emerald-950/30 border-emerald-700/50'
                              : 'bg-slate-800/80 border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white truncate flex items-center gap-1.5">
                                {isSent && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                <span className="truncate">{member.name}</span>
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {member.phone || 'Sem telefone'}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(personalizedText);
                                  setCopiedMemberId(member.id);
                                  setTimeout(() => setCopiedMemberId(null), 1500);
                                }}
                                className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-all cursor-pointer"
                                title="Copiar mensagem personalizada"
                              >
                                {copiedMemberId === member.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {!isSent && (
                                <button
                                  type="button"
                                  onClick={() => handleDispatchToCampaignMember(member, activeCampaign, false)}
                                  className="p-2 bg-slate-700 hover:bg-indigo-600 text-slate-200 rounded-xl transition-all cursor-pointer"
                                  title="Marcar como enviado no histórico"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {waNumber ? (
                                <a
                                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent(personalizedText)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => handleDispatchToCampaignMember(member, activeCampaign, true)}
                                  className={`px-3 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                    isSent
                                      ? 'bg-emerald-800/60 hover:bg-emerald-700 text-emerald-200'
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                                  }`}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>{isSent ? 'Reenviar' : 'Enviar'}</span>
                                </a>
                              ) : (
                                <span className="px-2.5 py-1.5 bg-slate-700 text-slate-400 rounded-xl text-[10px] font-bold">
                                  Sem WhatsApp
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                  <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h4 className="text-sm font-black text-slate-700 dark:text-white uppercase">
                    Nenhuma Fila Aberta
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Segmente seus contatos à esquerda e clique em <strong>Gerar Fila de Envio</strong> para disparar pelo WhatsApp com registro automático no histórico.
                  </p>
                </div>
              )}

              {/* Past Campaigns List */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Campanhas Recentes ({broadcastCampaigns.length})
                </h4>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {broadcastCampaigns.map(camp => (
                    <div
                      key={camp.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        activeCampaignId === camp.id
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-white truncate">{camp.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {camp.sent_member_ids.length}/{camp.total_recipients} enviados •{' '}
                          {new Date(camp.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveCampaignId(camp.id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold cursor-pointer"
                        >
                          Abrir Fila
                        </button>
                        {onDeleteBroadcastCampaign && (
                          <button
                            type="button"
                            onClick={() => onDeleteBroadcastCampaign(camp.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                            title="Excluir campanha"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {broadcastCampaigns.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">
                      Nenhuma campanha em massa criada ainda.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 1-TO-1 BROADCAST */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[36px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">Disparo Individual WhatsApp</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase">Envio Direto com Registro no Prontuário</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  Selecione o Contato / Visitante
                </label>
                <select
                  value={broadcastTargetMemberId}
                  onChange={(e) => {
                    setBroadcastTargetMemberId(e.target.value);
                    setBroadcastGeneratedMsg('');
                  }}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {activeMembersList.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.phone || 'Sem telefone'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Modelo da Mensagem
                  </label>
                  <select
                    onChange={(e) => {
                      const r = rules.find(rule => rule.id === e.target.value);
                      if (r) {
                        setBroadcastTemplate(r.template_text);
                        setBroadcastGeneratedMsg('');
                      }
                    }}
                    className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg border-none outline-none cursor-pointer"
                  >
                    <option value="">Carregar de um Fluxo...</option>
                    {rules.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <textarea
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Escreva a mensagem aqui com as tags: {primeiro_nome}, {igreja}, {lider}, {bairro}..."
                  value={broadcastTemplate}
                  onChange={e => {
                    setBroadcastTemplate(e.target.value);
                    setBroadcastGeneratedMsg('');
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleHumanizeWithAI}
                  disabled={isHumanizing || !broadcastTemplate}
                  className="flex-1 py-3 px-4 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isHumanizing ? 'Gerando com IA...' : 'Personalizar com IA'}</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-[36px] shadow-2xl flex flex-col justify-between gap-6">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-slate-200">Prévia no WhatsApp</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400">
                    Pronto para envio
                  </span>
                </div>

                <div className="mt-6 bg-slate-800/80 p-5 rounded-2xl border border-slate-700 font-sans text-sm text-slate-100 leading-relaxed shadow-inner whitespace-pre-wrap">
                  {broadcastGeneratedMsg || replaceTags(broadcastTemplate, targetMember) || (
                    <span className="text-slate-500 italic text-xs">
                      Selecione um modelo à esquerda para ver a prévia aqui...
                    </span>
                  )}
                </div>

                {targetMember && (
                  <p className="text-[11px] text-slate-400 mt-3">
                    Destinatário: <strong>{targetMember.name}</strong> • Telefone: <strong>{targetMember.phone || 'Não informado'}</strong>
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={copyBroadcast}
                    className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>

                  {targetMember && formatWhatsAppNumber(targetMember.phone) ? (
                    <a
                      href={`https://wa.me/${formatWhatsAppNumber(targetMember.phone)}?text=${encodeURIComponent(
                        broadcastGeneratedMsg || replaceTags(broadcastTemplate, targetMember)
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleLogSingleDispatch('OPENED_WA')}
                      className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50 cursor-pointer text-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir WhatsApp & Registrar</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex-1 py-3.5 bg-slate-800 text-slate-500 rounded-2xl font-bold text-xs uppercase tracking-wider text-center cursor-not-allowed opacity-60"
                    >
                      Sem Telefone Cadastrado
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MESSAGE HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  Histórico Auditável de Envios
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Todas as mensagens disparadas aparecem automaticamente no prontuário individual de cada contato.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    placeholder="Buscar por contato, texto ou campanha..."
                    className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none w-64"
                  />
                </div>
                <select
                  value={historyChannelFilter}
                  onChange={e => setHistoryChannelFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value="ALL">Todos os Canais</option>
                  <option value="BULK_CAMPAIGN">Disparos em Massa</option>
                  <option value="WHATSAPP">WhatsApp Direto</option>
                  <option value="AUTOMATION_RULE">Régua Automática</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredHistoryLogs.map(log => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-slate-800 dark:text-white">{log.member_name}</span>
                      <span className="text-xs text-slate-400 font-medium">{log.member_phone}</span>
                      {log.campaign_name && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          • {log.campaign_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700 whitespace-pre-wrap">
                      "{log.message_text}"
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0 space-y-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {new Date(log.sent_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(log.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Por: {log.sent_by_name || 'Equipe'} •{' '}
                      {log.channel === 'BULK_CAMPAIGN'
                        ? 'Campanha em Massa'
                        : log.channel === 'AUTOMATION_RULE'
                        ? 'Régua Automática'
                        : 'WhatsApp 1 a 1'}
                    </p>
                  </div>
                </div>
              ))}

              {filteredHistoryLogs.length === 0 && (
                <div className="py-16 text-center text-slate-400 text-xs font-medium">
                  Nenhum envio registrado até o momento. Use "Disparos em Massa" ou "Disparo 1 a 1" para começar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SANDBOX AI */}
        {activeTab === 'sandbox' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pb-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[36px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">Simulador de IA Pastoral</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase">Teste o Tom e Empatia da IA</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome do Contato</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white outline-none"
                  value={testContactName}
                  onChange={e => setTestContactName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Estágio do Pipeline</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 outline-none"
                  value={testStageLabel}
                  onChange={e => setTestStageLabel(e.target.value)}
                >
                  {stages.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contexto Pastoral</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-white outline-none resize-none"
                  value={testContext}
                  onChange={e => setTestContext(e.target.value)}
                />
              </div>

              <button
                onClick={handleTestSandbox}
                disabled={isTesting}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>{isTesting ? 'Gerando com Gemini...' : 'Gerar Mensagem Humanizada'}</span>
              </button>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-[36px] shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <span className="font-bold text-sm text-slate-300">Resposta Humanizada (IA)</span>
                  <span className="text-xs font-bold text-purple-300">Gemini</span>
                </div>

                <div className="mt-6 p-5 bg-slate-800/80 rounded-2xl border border-slate-700 text-sm text-slate-200 leading-relaxed italic">
                  {testResult ? `"${testResult}"` : 'Aguardando simulação... Clique no botão ao lado para gerar.'}
                </div>
              </div>

              {testResult && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(testResult);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Mensagem'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Criar / Editar Fluxo de Automação */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 max-w-lg w-full rounded-[36px] p-8 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">
                    {selectedRule ? 'Editar Fluxo' : 'Novo Fluxo de Automação'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase">Régua de Contato WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRuleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome do Fluxo *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white outline-none"
                  placeholder="Ex: Boas-Vindas D+0, Follow-up D+1..."
                  value={ruleFormData.name || ''}
                  onChange={e => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gatilho</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 outline-none text-xs"
                    value={ruleFormData.trigger_type || 'CHECKIN_NEW'}
                    onChange={e => setRuleFormData({ ...ruleFormData, trigger_type: e.target.value as any })}
                  >
                    <option value="CHECKIN_NEW">Check-in Novo Visitante</option>
                    <option value="FOLLOW_UP_D1">Follow-up D+1 (Pós-Culto)</option>
                    <option value="FOLLOW_UP_D3">Follow-up D+3 (Célula)</option>
                    <option value="FOLLOW_UP_D7">Follow-up D+7 (Próximo Culto)</option>
                    <option value="INACTIVITY_ALERT">Alerta de Inatividade</option>
                    <option value="STAGE_CHANGE">Mudança de Etapa</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Dias de Espera</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white outline-none"
                    value={ruleFormData.delay_days ?? 0}
                    onChange={e => setRuleFormData({ ...ruleFormData, delay_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  Texto Padrão (Template) *
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-white outline-none resize-none"
                  placeholder="Use as tags: {nome}, {primeiro_nome}, {igreja}, {lider}, {bairro}, {celula}..."
                  value={ruleFormData.template_text || ''}
                  onChange={e => setRuleFormData({ ...ruleFormData, template_text: e.target.value })}
                />
                <p className="text-[10px] text-slate-400">
                  Variáveis: <code>&#123;nome&#125;</code>, <code>&#123;primeiro_nome&#125;</code>, <code>&#123;igreja&#125;</code>, <code>&#123;lider&#125;</code>, <code>&#123;bairro&#125;</code>, <code>&#123;celula&#125;</code>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="ai-toggle"
                  checked={ruleFormData.use_ai_humanization}
                  onChange={e => setRuleFormData({ ...ruleFormData, use_ai_humanization: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="ai-toggle" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Humanizar automaticamente com IA ao sugerir mensagem
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider rounded-2xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg cursor-pointer"
                >
                  Salvar Fluxo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationSettings;
