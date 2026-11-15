import React, { useState } from 'react';
import { 
  Settings, 
  Bell, 
  Shield, 
  Moon, 
  Globe, 
  Zap, 
  Smartphone, 
  Sliders, 
  CheckCircle2, 
  Lock, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  Check, 
  RotateCcw,
  Sparkles,
  Info,
  Download,
  FileSpreadsheet,
  FileJson,
  Database,
  Layers,
  Building2,
  CreditCard,
  Copy,
  QrCode
} from 'lucide-react';
import { AccessLevel, Church, Member, Cell, FinancialTransaction, SystemUser, Organization, ScheduleEvent, SaaSInvoice } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  DEFAULT_ACCESS_LEVELS, 
  AVAILABLE_PERMISSIONS, 
  ACCESS_COLOR_PRESETS,
  stageTone 
} from '../constants';
import { 
  downloadJSON, 
  downloadCSV, 
  exportContactsCSV, 
  generateChurchDataBackup 
} from '../utils/exportImportHelpers';

interface SettingsModuleProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  accessLevels?: AccessLevel[];
  onSaveAccessLevel?: (level: AccessLevel) => Promise<void> | void;
  onDeleteAccessLevel?: (levelId: string) => Promise<void> | void;
  onResetAccessLevels?: () => Promise<void> | void;
  church?: Church | null;
  members?: Member[];
  cells?: Cell[];
  transactions?: FinancialTransaction[];
  team?: SystemUser[];
  organization?: Organization | null;
  events?: ScheduleEvent[];
  orgInvoices?: SaaSInvoice[];
  onOpenSaaS?: () => void;
}

const SettingsModule: React.FC<SettingsModuleProps> = ({ 
  isDarkMode, 
  onToggleDarkMode,
  accessLevels = DEFAULT_ACCESS_LEVELS,
  onSaveAccessLevel,
  onDeleteAccessLevel,
  onResetAccessLevels,
  church,
  members = [],
  cells = [],
  transactions = [],
  team = [],
  organization,
  events = [],
  orgInvoices = [],
  onOpenSaaS
}) => {
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AccessLevel | null>(null);
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  // Form state for creating/editing access level
  const [levelForm, setLevelForm] = useState<AccessLevel>({
    id: '',
    name: '',
    roleKey: '',
    desc: '',
    color: ACCESS_COLOR_PRESETS[0].color,
    isSystem: false,
    permissions: []
  });

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const activeMembersCount = members.filter(m => m.active !== false).length;
  const planLimit = organization?.max_members || (organization?.plan === 'ENTERPRISE' ? 10000 : organization?.plan === 'MULTI' ? 1000 : 250);
  const usagePercent = Math.min(100, Math.round((activeMembersCount / Math.max(1, planLimit)) * 100));

  const handleCopyInvoicePix = async (inv: SaaSInvoice) => {
    try {
      await navigator.clipboard.writeText(inv.pix_code || 'financeiro@koinonya.app');
    } catch {
      // Ignore clipboard failure
    }
    setCopiedPixId(inv.id);
    setTimeout(() => setCopiedPixId(null), 2500);
  };

  const handleExportFullBackup = () => {
    const backupData = generateChurchDataBackup({
      church,
      organization,
      members,
      cells,
      transactions,
      team,
      events
    });
    const churchSlug = (church?.name || organization?.name || 'igreja')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadJSON(`koinonya_backup_${churchSlug}_${dateStr}.json`, backupData);

    setExportNotice(
      `✓ Backup Completo (JSON) gerado com sucesso! Contém ${members.length} membros, ${cells.length} células, ${transactions.length} lançamentos financeiros e dados da congregação.`
    );
    setTimeout(() => setExportNotice(null), 8000);
  };

  const handleExportMembersCSV = () => {
    const csv = exportContactsCSV(members, [], team, cells);
    const churchSlug = (church?.name || organization?.name || 'igreja')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCSV(`koinonya_membros_${churchSlug}_${dateStr}.csv`, csv);

    setExportNotice(
      `✓ Planilha de Membros (CSV) gerada com sucesso! ${members.length} pessoas exportadas para Excel.`
    );
    setTimeout(() => setExportNotice(null), 8000);
  };

  const [notificationSettings, setNotificationSettings] = useState([
    { id: 'visitors', label: 'Novos Visitantes', desc: 'Alertar no check-in QR Code.', active: true },
    { id: 'reports', label: 'Relatórios Mensais', desc: 'Resumo executivo de crescimento.', active: true },
    { id: 'inactivity', label: 'Avisos de Inatividade', desc: 'Alertas de estagnação de contatos.', active: true },
  ]);

  const toggleNotification = (id: string) => {
    setNotificationSettings(prev => 
      prev.map(n => n.id === id ? { ...n, active: !n.active } : n)
    );
  };

  const handleOpenLevelModal = (level?: AccessLevel) => {
    if (level) {
      setEditingLevel(level);
      setLevelForm({ ...level });
    } else {
      setEditingLevel(null);
      setLevelForm({
        id: 'nivel_' + Math.random().toString(36).substring(2, 8),
        name: '',
        roleKey: '',
        desc: '',
        color: ACCESS_COLOR_PRESETS[0].color,
        isSystem: false,
        permissions: ['contatos_view', 'pipeline_view', 'agenda_view']
      });
    }
    setIsLevelModalOpen(true);
  };

  const handleTogglePermission = (permId: string) => {
    setLevelForm(prev => {
      const exists = prev.permissions.includes(permId);
      return {
        ...prev,
        permissions: exists 
          ? prev.permissions.filter(p => p !== permId)
          : [...prev.permissions, permId]
      };
    });
  };

  const handleSelectAllPermissions = () => {
    setLevelForm(prev => ({
      ...prev,
      permissions: AVAILABLE_PERMISSIONS.map(p => p.id)
    }));
  };

  const handleDeselectAllPermissions = () => {
    setLevelForm(prev => ({
      ...prev,
      permissions: []
    }));
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelForm.name.trim()) return;

    const payload: AccessLevel = {
      ...levelForm,
      name: levelForm.name.trim(),
      roleKey: levelForm.roleKey || levelForm.name.toUpperCase().replace(/\s+/g, '_'),
      desc: levelForm.desc.trim() || 'Nível de acesso personalizado da liderança.'
    };

    if (onSaveAccessLevel) {
      await onSaveAccessLevel(payload);
    }
    setIsLevelModalOpen(false);
  };

  const handleDeleteLevel = async (levelId: string) => {
    if (onDeleteAccessLevel) {
      await onDeleteAccessLevel(levelId);
    }
  };

  // Group available permissions by category for clear presentation
  const permissionsByCategory = React.useMemo<Record<string, Array<typeof AVAILABLE_PERMISSIONS[number]>>>(() => {
    const map: Record<string, Array<typeof AVAILABLE_PERMISSIONS[number]>> = {};
    AVAILABLE_PERMISSIONS.forEach(p => {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    });
    return map;
  }, []);

  return (
    <div className="p-8 md:p-10 space-y-10 overflow-y-auto h-full max-w-6xl mx-auto scrollbar-thin transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase transition-colors">
            Configurações & Governança
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            Personalize sua experiência, notificações e personalize os níveis de acesso de cada membro da equipe.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 space-y-8">
          
          {/* SEÇÃO 1: PREFERÊNCIAS GERAIS & NOTIFICAÇÕES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* GERAL */}
            <section className="bg-white dark:bg-slate-800 p-8 rounded-[36px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 transition-all">
              <div className="flex items-center gap-3 pb-6 border-b border-slate-50 dark:border-slate-700">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  Preferências Visuais
                </h3>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Idioma da Aplicação</p>
                    <p className="text-xs text-slate-400">Padrão em Português do Brasil.</p>
                  </div>
                  <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-900">
                    Português (BR)
                  </span>
                </div>

                <div 
                  className="flex items-center justify-between cursor-pointer group" 
                  onClick={onToggleDarkMode}
                >
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Tema Escuro / Alto Contraste</p>
                    <p className="text-xs text-slate-400">Melhora o conforto visual em ambientes escuros.</p>
                  </div>
                  <div className={`w-14 h-7 rounded-full transition-all relative flex items-center px-1 ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${isDarkMode ? 'translate-x-7' : 'translate-x-0'} flex items-center justify-center`}>
                      <Moon className={`w-3 h-3 text-indigo-600 transition-opacity ${isDarkMode ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* NOTIFICAÇÕES */}
            <section className="bg-white dark:bg-slate-800 p-8 rounded-[36px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 transition-all">
              <div className="flex items-center gap-3 pb-6 border-b border-slate-50 dark:border-slate-700">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  Alertas & Notificações
                </h3>
              </div>
              
              <div className="space-y-4">
                 {notificationSettings.map((n) => (
                   <div 
                     key={n.id} 
                     onClick={() => toggleNotification(n.id)}
                     className="flex items-center justify-between py-1 cursor-pointer group"
                   >
                    <div className="flex-1 pr-4">
                      <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{n.label}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{n.desc}</p>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-all ${n.active ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${n.active ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </div>
                 ))}
              </div>
            </section>
          </div>

          {/* SEÇÃO 2: NÍVEIS DE ACESSO & PERMISSÕES (EDITÁVEL E DINÂMICO) */}
          <section className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-[44px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 transition-all">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Níveis de Acesso & Permissões
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Crie novos cargos personalizados ou edite as permissões de cada função ministerial.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {onResetAccessLevels && (
                  <button 
                    onClick={onResetAccessLevels}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-2"
                    title="Restaurar Níveis Padrão"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Restaurar Padrão</span>
                  </button>
                )}
                
                <button 
                  onClick={() => handleOpenLevelModal()}
                  className="flex-1 md:flex-none px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> NOVO NÍVEL DE ACESSO
                </button>
              </div>
            </div>

            {/* Grid dos Níveis de Acesso */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accessLevels.map((lvl) => {
                const totalPerms = AVAILABLE_PERMISSIONS.length;
                const activePermsCount = lvl.permissions?.length || 0;
                const isFullyAuthorized = activePermsCount >= totalPerms;

                return (
                  <div 
                    key={lvl.id} 
                    className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-md transition-all group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-1">
                          <span className={`inline-block px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${stageTone(lvl.color) || 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'}`}>
                            {lvl.name}
                          </span>
                          {lvl.isSystem && (
                            <span className="ml-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                              Sistema
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenLevelModal(lvl)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"
                            title="Editar Nível de Acesso"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {!lvl.isSystem && (
                            <button
                              onClick={() => handleDeleteLevel(lvl.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                              title="Excluir Nível"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-4 leading-relaxed min-h-[36px]">
                        {lvl.desc}
                      </p>

                      <div className="mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-400 uppercase tracking-wider">Permissões:</span>
                        <span className={`font-black ${isFullyAuthorized ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>
                          {activePermsCount} de {totalPerms} ativas
                        </span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        {AVAILABLE_PERMISSIONS.filter(p => lvl.permissions?.includes(p.id)).slice(0, 5).map((p) => (
                          <div key={p.id} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                              {p.label}
                            </span>
                          </div>
                        ))}
                        {activePermsCount > 5 && (
                          <p className="text-[9px] font-bold text-slate-400 italic pt-1">
                            + {activePermsCount - 5} outras permissões ativas
                          </p>
                        )}
                        {activePermsCount === 0 && (
                          <p className="text-[10px] text-slate-400 italic">
                            Nenhuma permissão concedida.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-slate-200/40 dark:border-slate-800 flex justify-end">
                      <button
                        onClick={() => handleOpenLevelModal(lvl)}
                        className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Configurar Permissões
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* BACKUP & GOVERNANÇA LGPD */}
          <section className="bg-slate-900 p-8 md:p-10 rounded-[44px] shadow-2xl text-white relative overflow-hidden group">
            <Zap className="absolute top-[-20px] right-[-20px] w-48 h-48 text-indigo-500/10 rotate-12 group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-800/60">
                      Governança & LGPD
                    </span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">Segurança & Governança Koinonya</h3>
                  <p className="text-slate-400 text-sm max-w-xl font-medium leading-relaxed mt-1">
                    Os dados da congregação <strong>{church?.name || organization?.name || 'sua igreja'}</strong> são isolados e protegidos. Você pode exportar uma cópia completa a qualquer momento em conformidade com as diretrizes de privacidade e retenção de dados.
                  </p>
                </div>

                {/* Resumo dos registros a serem exportados */}
                <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-300">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    👥 <strong>{members.length}</strong> Membros
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    🔥 <strong>{cells.length}</strong> Células
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    💰 <strong>{transactions.length}</strong> Lançamentos
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    🛡️ <strong>{team.length}</strong> Equipe
                  </span>
                </div>
              </div>

              {/* Ações de Exportação */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button 
                  type="button"
                  onClick={handleExportFullBackup}
                  className="px-6 py-3.5 bg-white text-slate-900 hover:bg-indigo-50 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  title="Exportar todas as coleções (membros, células, financeiro, equipe, igreja) em arquivo JSON"
                >
                  <FileJson className="w-4 h-4 text-indigo-600" />
                  <span>Backup Completo (JSON)</span>
                </button>

                <button 
                  type="button"
                  onClick={handleExportMembersCSV}
                  className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  title="Exportar cadastro completo de membros e contatos formatado para Excel (CSV)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Planilha de Membros (CSV)</span>
                </button>
              </div>

              {/* Feedback de Sucesso */}
              {exportNotice && (
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{exportNotice}</span>
                </div>
              )}
            </div>
          </section>

          {/* SEÇÃO 4: MINHA ASSINATURA, COTA DO PLANO, FATURAS & APP PWA */}
          <section className="bg-gradient-to-br from-indigo-900 via-slate-900 to-black p-8 rounded-[36px] text-white shadow-xl space-y-6 relative overflow-hidden border border-indigo-800/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-indigo-800/40">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    Minha Assinatura, Cota & Faturas
                  </h3>
                  <p className="text-xs text-indigo-200/80 font-medium">
                    Plano {organization?.plan || 'IGREJA'} • Limite de membros, faturas PIX e acesso via aplicativo instalado.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <PWAInstallButton variant="card" />
                {onOpenSaaS && (
                  <button
                    type="button"
                    onClick={onOpenSaaS}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>Painel SaaS Master</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Plano & Mensalidade</p>
                <p className="text-xl font-black tabular-nums">
                  {(organization?.monthly_price ?? 149).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  <span className="text-xs font-medium text-slate-400">/{organization?.billing_cycle === 'ANNUAL' ? 'ano' : 'mês'}</span>
                </p>
                <p className="text-[11px] text-slate-300">
                  Status: <strong className="text-white">{organization?.subscription_status || 'ACTIVE'}</strong>
                  {organization?.next_billing_date && ` • Vence ${new Date(organization.next_billing_date).toLocaleDateString('pt-BR')}`}
                </p>
              </div>

              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Utilização da Cota de Membros</p>
                  <span className="font-black text-white tabular-nums">{activeMembersCount} / {planLimit} ({usagePercent}%)</span>
                </div>
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${usagePercent > 90 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-300">
                  Cada igreja opera isolada em seu <code className="bg-white/10 px-1 rounded">org_id</code> com proteção LGPD e regras dedicadas.
                </p>
              </div>
            </div>

            {/* Tenant Invoices List */}
            <div className="space-y-3 pt-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
                Faturas da Congregação ({orgInvoices.length})
              </p>
              {orgInvoices.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300">
                  Nenhuma fatura emitida até o momento para esta organização.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {orgInvoices.slice(0, 6).map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-white tabular-nums">
                            {inv.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : inv.status === 'OVERDUE'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {inv.status === 'PAID' ? 'Paga' : inv.status === 'OVERDUE' ? 'Vencida' : 'Em Aberto'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 tabular-nums">
                          Ref. {inv.reference_month} • Venc. {new Date(inv.due_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      {inv.status !== 'PAID' && (
                        <button
                          type="button"
                          onClick={() => handleCopyInvoicePix(inv)}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0"
                        >
                          {copiedPixId === inv.id ? <Check className="w-3.5 h-3.5" /> : <QrCode className="w-3.5 h-3.5" />}
                          <span>{copiedPixId === inv.id ? 'PIX Copiado' : 'Copiar PIX'}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>

      {/* MODAL PARA CRIAR / EDITAR NÍVEL DE ACESSO */}
      {isLevelModalOpen && (
        <div className="fixed inset-0 !mt-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[36px] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/40 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">
                    {editingLevel ? `Editar: ${editingLevel.name}` : 'Novo Nível de Acesso'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Personalize o nome da função e selecione quais módulos esse cargo pode operar.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsLevelModalOpen(false)} 
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLevel} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Nome do Nível / Função
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Diácono, Líder de Louvor, Mídia"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={levelForm.name}
                      onChange={e => setLevelForm({ ...levelForm, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Cor da Etiqueta
                    </label>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {ACCESS_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setLevelForm({ ...levelForm, color: preset.color })}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black border transition-all ${stageTone(preset.color)} ${
                            levelForm.color === preset.color ? 'ring-2 ring-indigo-500 scale-105 shadow' : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Descrição da Atuação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Apoio nas escalas de voluntários e recepção durante os cultos."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={levelForm.desc}
                    onChange={e => setLevelForm({ ...levelForm, desc: e.target.value })}
                  />
                </div>
              </div>

              {/* Matriz de Permissões */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">
                      Permissões Concedidas
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Marque as funcionalidades que usuários com este nível de acesso poderão utilizar.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg"
                    >
                      Marcar Todas
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllPermissions}
                      className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 hover:underline px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                <div className="space-y-5 pt-2">
                  {(Object.entries(permissionsByCategory) as [string, Array<typeof AVAILABLE_PERMISSIONS[number]>][]).map(([category, perms]) => (
                    <div 
                      key={category} 
                      className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3"
                    >
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        {category}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {perms.map((p) => {
                          const isChecked = levelForm.permissions.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer border transition-all ${
                                isChecked 
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-white' 
                                  : 'bg-white dark:bg-slate-800 border-slate-200/40 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 rounded-md"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(p.id)}
                              />
                              <span className="text-xs font-bold leading-tight select-none">
                                {p.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLevelModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Salvar Nível de Acesso
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModule;
