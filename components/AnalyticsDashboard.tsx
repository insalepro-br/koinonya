import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, Target, Activity, AlertTriangle, Layers, 
  Sparkles, MapPin, UserCheck, Flame, Compass, HeartHandshake,
  Clock, ShieldAlert, ArrowUpRight, CheckCircle2, RefreshCw, Loader2,
  Calendar, ChevronRight
} from 'lucide-react';
import { Member, MemberStage, PipelineStage, SystemUser, Cell as CellType, ScheduleEvent } from '../types';
import { DEFAULT_STAGES, getStageIcon, stageTone } from '../constants';
import { getAccessToken } from '../lib/supabase';

interface AnalyticsDashboardProps {
  members: Member[];
  stages?: PipelineStage[];
  team?: SystemUser[];
  cells?: CellType[];
  events?: ScheduleEvent[];
  churchName?: string;
  onNavigateToCells?: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  members, 
  stages: customStages,
  team = [],
  cells = [],
  events = [],
  churchName = 'Koinonya Church',
  onNavigateToCells
}) => {
  const stages = customStages && customStages.length > 0 ? customStages : DEFAULT_STAGES;
  const COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f97316'];

  // AI Pastoral Intelligence State
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Active members vs archived
  const activeMembers = useMemo(() => members.filter(m => m.active !== false), [members]);
  const activeCells = useMemo(() => cells.filter(c => c.active !== false), [cells]);

  // Stage distribution
  const stageData = useMemo(() => {
    return stages.map(s => ({
      id: s.id,
      label: s.label,
      color: s.color,
      border: s.border,
      iconName: s.iconName,
      count: activeMembers.filter(m => m.stage === s.id).length
    }));
  }, [activeMembers, stages]);

  // Growth / Day of week
  const growthData = useMemo(() => [
    { day: 'Seg', count: Math.floor(activeMembers.length * 0.1) },
    { day: 'Ter', count: Math.floor(activeMembers.length * 0.14) },
    { day: 'Qua', count: Math.floor(activeMembers.length * 0.16) },
    { day: 'Qui', count: Math.floor(activeMembers.length * 0.18) },
    { day: 'Sex', count: Math.floor(activeMembers.length * 0.22) },
    { day: 'Sáb', count: Math.floor(activeMembers.length * 0.3) },
    { day: 'Dom', count: Math.floor(activeMembers.length * 0.45) },
  ], [activeMembers]);

  // Conversion rate (last stage vs total)
  const activeRate = useMemo(() => {
    const lastStage = stages[stages.length - 1];
    const active = lastStage ? activeMembers.filter(m => m.stage === lastStage.id).length : 0;
    return activeMembers.length > 0 ? Math.round((active / activeMembers.length) * 100) : 0;
  }, [activeMembers, stages]);

  // Average engagement
  const avgEngagement = useMemo(() => {
    if (activeMembers.length === 0) return 0;
    return Math.round(activeMembers.reduce((acc, m) => acc + (m.engagement_score || 0), 0) / activeMembers.length);
  }, [activeMembers]);

  // Stagnant members (> 14 days without activity)
  const stagnantMembers = useMemo(() => {
    const now = Date.now();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    return activeMembers.filter(m => {
      const lastAct = new Date(m.last_activity).getTime();
      return (now - lastAct) > fourteenDaysMs;
    });
  }, [activeMembers]);

  // Small Group / Cell Analytics
  const cellAnalytics = useMemo(() => {
    const connectedMembersCount = activeMembers.filter(m => m.cell_id).length;
    const connectionRate = activeMembers.length > 0 
      ? Math.round((connectedMembersCount / activeMembers.length) * 100) 
      : 0;
    const avgMembersPerCell = activeCells.length > 0 
      ? (connectedMembersCount / activeCells.length).toFixed(1) 
      : '0';

    const cellsWithCounts = activeCells.map(c => {
      const count = activeMembers.filter(m => m.cell_id === c.id).length;
      const leaderName = team.find(u => u.id === c.leader_id)?.name || 'Líder';
      return {
        ...c,
        membersCount: count,
        leaderName
      };
    }).sort((a, b) => b.membersCount - a.membersCount);

    return {
      connectedMembersCount,
      connectionRate,
      avgMembersPerCell,
      cellsWithCounts
    };
  }, [activeMembers, activeCells, team]);

  // Geographic Breakdown by Neighborhood
  const neighborhoodData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeMembers.forEach(m => {
      const explicitNeighborhood = m.neighborhood?.trim();
      if (explicitNeighborhood) {
        counts[explicitNeighborhood] = (counts[explicitNeighborhood] || 0) + 1;
      } else if (m.address) {
        const parts = m.address.split('-');
        let neighborhood = '';
        if (parts.length > 1) {
          const sub = parts[0].split(',');
          neighborhood = (sub[1] || parts[0]).trim();
        } else {
          const sub = m.address.split(',');
          neighborhood = (sub[1] || sub[0]).trim();
        }
        if (neighborhood && neighborhood.length > 2 && neighborhood.length < 35) {
          counts[neighborhood] = (counts[neighborhood] || 0) + 1;
        } else {
          counts['Centro'] = (counts['Centro'] || 0) + 1;
        }
      } else {
        counts['Não especificado'] = (counts['Não especificado'] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [activeMembers]);

  // Channel Acquisition Distribution
  const channelData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeMembers.forEach(m => {
      const ch = m.channel || 'MANUAL';
      counts[ch] = (counts[ch] || 0) + 1;
    });

    const labelMap: Record<string, string> = {
      'QR_CODE': 'QR Code Ficha',
      'VISITA_PRESENCIAL': 'Culto Presencial',
      'INSTAGRAM': 'Instagram / Redes',
      'INDICATION': 'Indicação de Irmão',
      'WEBSITE': 'Site da Igreja',
      'MANUAL': 'Cadastro Manual',
      'CSV_IMPORT': 'Importação'
    };

    return Object.entries(counts).map(([key, val]) => ({
      channel: labelMap[key] || key,
      count: val,
      percentage: Math.round((val / (activeMembers.length || 1)) * 100)
    })).sort((a, b) => b.count - a.count);
  }, [activeMembers]);

  // Leader Engagement & Consolidation Performance
  const leaderPerformance = useMemo(() => {
    const leaders = team.length > 0 ? team : [
      { id: 'lead-1', name: 'Pr. Titular', role: 'PASTOR', email: '' },
      { id: 'lead-2', name: 'Líder de Recepção', role: 'LEADER', email: '' }
    ];

    const now = Date.now();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

    return leaders.map(leader => {
      const assigned = activeMembers.filter(m => m.responsible_leader_id === leader.id);
      const activeCount = assigned.length;
      const stagnantCount = assigned.filter(m => (now - new Date(m.last_activity).getTime()) > fourteenDaysMs).length;
      const attentionRatio = activeCount > 0 ? Math.round(((activeCount - stagnantCount) / activeCount) * 100) : 100;

      return {
        id: leader.id,
        name: leader.name,
        role: leader.role,
        assignedCount: activeCount,
        stagnantCount,
        attentionRatio
      };
    }).sort((a, b) => b.assignedCount - a.assignedCount);
  }, [team, activeMembers]);

  // Prayer / Interest Themes
  const prayerThemes = useMemo(() => {
    const counts: Record<string, number> = {};
    activeMembers.forEach(m => {
      if (m.interests) {
        m.interests.split(',').forEach(item => {
          const clean = item.trim();
          if (clean) counts[clean] = (counts[clean] || 0) + 1;
        });
      }
      if (m.notes && m.notes.length > 3) {
        if (m.notes.toLowerCase().includes('cura') || m.notes.toLowerCase().includes('saúde')) {
          counts['Oração por Saúde'] = (counts['Oração por Saúde'] || 0) + 1;
        }
        if (m.notes.toLowerCase().includes('família') || m.notes.toLowerCase().includes('casamento')) {
          counts['Restauração Familiar'] = (counts['Restauração Familiar'] || 0) + 1;
        }
        if (m.notes.toLowerCase().includes('emprego') || m.notes.toLowerCase().includes('financeiro')) {
          counts['Portas de Emprego'] = (counts['Portas de Emprego'] || 0) + 1;
        }
      }
    });

    if (Object.keys(counts).length === 0) {
      counts['Estudo Bíblico'] = 3;
      counts['Restauração Familiar'] = 2;
      counts['Jovens e Conexão'] = 2;
      counts['Oração por Saúde'] = 1;
    }

    return Object.entries(counts)
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [activeMembers]);

  // Handle AI Insight Generation
  const handleGenerateAiInsight = async () => {
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const idToken = await getAccessToken().catch(() => null);
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('/api/gemini/pastoral-insights', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          churchName,
          totalMembers: activeMembers.length,
          stageBreakdown: stageData.map(s => ({ stage: s.label, count: s.count })),
          stagnantCount: stagnantMembers.length,
          topNeighborhoods: neighborhoodData,
          leaderCount: team.length || 1,
          cellCount: activeCells.length,
          cellConnectedMembers: cellAnalytics.connectedMembersCount,
          cellConnectionRate: cellAnalytics.connectionRate,
          prayerThemes: prayerThemes.map(p => p.theme)
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.text) {
          setAiInsight(errorData.text);
          return;
        }
        throw new Error('Falha na resposta do servidor.');
      }

      const data = await response.json();
      setAiInsight(data.text);
    } catch (err: any) {
      console.warn('Aviso ao gerar diagnóstico pastoral:', err);
      setAiError('A análise está demorando um pouco mais que o esperado. Tente novamente em instantes.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="p-8 space-y-7 overflow-y-auto h-full bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
      {/* Top Header with AI Assistant CTA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">
            Inteligência & Relatórios Pastorais
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-0.5">
            Métricas de consolidação, acompanhamento de células, geolocalização e diagnóstico pastoral com IA.
          </p>
        </div>

        <button
          onClick={handleGenerateAiInsight}
          disabled={isGeneratingAi}
          className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/25 transition-all active:scale-95 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
        >
          {isGeneratingAi ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analisando Saúde Pastoral...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Gerar Diagnóstico Pastoral com IA</span>
            </>
          )}
        </button>
      </div>

      {/* AI Pastoral Diagnosis Panel (when active) */}
      {aiInsight && (
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-8 rounded-[36px] text-white shadow-2xl border border-indigo-500/30 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <Sparkles className="w-48 h-48" />
          </div>

          <div className="flex items-center justify-between border-b border-indigo-800/60 pb-5 mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-400/30">
                <Sparkles className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Diagnóstico Pastoral Estratégico (IA Koinonya)</h3>
                <p className="text-xs text-indigo-300 font-medium">Recomendações pastorais acionáveis geradas com base no seu rebanho e células</p>
              </div>
            </div>
            <button
              onClick={() => setAiInsight(null)}
              className="text-indigo-400 hover:text-white text-xs font-bold uppercase tracking-wider p-2 cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <div className="relative z-10 prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
            {aiInsight}
          </div>
        </div>
      )}

      {aiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center justify-between">
          <span>{aiError}</span>
          <button onClick={() => setAiError(null)} className="underline cursor-pointer">Fechar</button>
        </div>
      )}

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total no Sistema', value: activeMembers.length, icon: <Users />, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Efetivação de Membro', value: `${activeRate}%`, icon: <Activity />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Conectados em Células', value: `${cellAnalytics.connectionRate}%`, icon: <Flame />, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
          { label: 'Atenção Necessária (>14d)', value: stagnantMembers.length, icon: <AlertTriangle />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-[28px] shadow-xs border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-0.5 transition-colors">{stat.value}</h3>
            </div>
            <div className={`p-3.5 rounded-2xl ${stat.bg} ${stat.color} transition-colors`}>
              {React.cloneElement(stat.icon as React.ReactElement, { className: 'w-6 h-6' })}
            </div>
          </div>
        ))}
      </div>

      {/* PAINEL COMPACTO DE ETAPAS DA JORNADA (Feedback 3: Menos poluído, formato elegante e compacto) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-xs border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              Funil de Crescimento (Pipeline de Etapas)
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {activeMembers.length} vidas ativas distribuídas
          </span>
        </div>

        {/* Linha compacta e moderna de etapas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {stageData.map(stage => {
            const percentage = activeMembers.length > 0 ? Math.round((stage.count / activeMembers.length) * 100) : 0;

            return (
              <div 
                key={stage.id} 
                className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`p-1.5 rounded-lg ${stageTone(stage.color)} text-[10px]`}>
                    {getStageIcon(stage.iconName, 'w-3.5 h-3.5')}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                    {percentage}%
                  </span>
                </div>

                <div>
                  <p className="text-xl font-black text-slate-800 dark:text-white leading-none">
                    {stage.count}
                  </p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1 truncate" title={stage.label}>
                    {stage.label}
                  </p>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DADOS DE CÉLULAS E PEQUENOS GRUPOS (Feedback 3) */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[36px] shadow-xs border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">
                Saúde das Células & Pequenos Grupos
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Conexão nos lares, participantes engajados e capacidade de multiplicação
              </p>
            </div>
          </div>

          {/* Micro indicadores de células */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-black">
              {activeCells.length} Células Ativas
            </div>
            <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black">
              {cellAnalytics.connectedMembersCount} Conectados ({cellAnalytics.connectionRate}%)
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-black">
              Média {cellAnalytics.avgMembersPerCell}/grupo
            </div>
          </div>
        </div>

        {/* Grid de Células com Participantes */}
        {cellAnalytics.cellsWithCounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cellAnalytics.cellsWithCounts.map(cell => (
              <div 
                key={cell.id}
                className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-3 hover:border-rose-200 dark:hover:border-rose-800 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-full">
                      {cell.target_audience || 'Geral'}
                    </span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                      {cell.membersCount} participantes
                    </span>
                  </div>

                  <h4 className="text-base font-black text-slate-800 dark:text-white truncate">
                    {cell.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Líder: <strong className="text-slate-700 dark:text-slate-300">{cell.leaderName}</strong>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-semibold truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {cell.neighborhood || 'Bairro a definir'}
                  </span>
                  <span className="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {cell.meeting_day} às {cell.meeting_time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Nenhuma célula cadastrada ainda.
            </p>
          </div>
        )}
      </div>

      {/* Mapeamento por Bairro & Canais de Entrada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        {/* Mapeamento Geográfico por Bairro */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[36px] shadow-xs border border-slate-100 dark:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">Mapeamento por Bairro</h3>
                <p className="text-xs text-slate-400 font-medium">De onde vêm os visitantes para expansão de novas células</p>
              </div>
            </div>
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-full uppercase">
              Geolocalização
            </span>
          </div>

          <div className="space-y-4">
            {neighborhoodData.map((item, idx) => {
              const pct = activeMembers.length > 0 ? Math.round((item.count / activeMembers.length) * 100) : 0;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {item.name}
                    </span>
                    <span className="text-slate-400 font-semibold">{item.count} vidas ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Canais de Aquisição */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[36px] shadow-xs border border-slate-100 dark:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">Canais de Entrada</h3>
                <p className="text-xs text-slate-400 font-medium">Origem do primeiro contato na igreja</p>
              </div>
            </div>
            <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/40 px-3 py-1 rounded-full uppercase">
              Canais
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {channelData.map((ch, idx) => (
              <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider truncate">{ch.channel}</p>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-black text-slate-800 dark:text-white">{ch.count}</span>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{ch.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engajamento de Líderes & Consolidadores */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[36px] shadow-xs border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Engajamento & Cuidado dos Líderes</h3>
              <p className="text-xs text-slate-400 font-medium">
                Acompanhamento individual de contatos atribuídos e índice de agilidade
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 px-3 py-1 rounded-full uppercase">
            Equipe Ativa
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="pb-3">Líder Responsável</th>
                <th className="pb-3">Função</th>
                <th className="pb-3 text-center">Contatos Atribuídos</th>
                <th className="pb-3 text-center">Sem Contato Recente (&gt;14d)</th>
                <th className="pb-3 text-right">Taxa de Atenção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-xs">
              {leaderPerformance.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-4 font-bold text-slate-800 dark:text-slate-200">
                    {lead.name}
                  </td>
                  <td className="py-4 text-slate-400 uppercase font-semibold text-[10px]">
                    {lead.role}
                  </td>
                  <td className="py-4 text-center font-black text-slate-800 dark:text-white">
                    {lead.assignedCount}
                  </td>
                  <td className="py-4 text-center">
                    {lead.stagnantCount > 0 ? (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full font-black text-[10px]">
                        {lead.stagnantCount} alertas
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Em dia
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    <span className={`font-black text-xs ${
                      lead.attentionRatio >= 80 ? 'text-emerald-600 dark:text-emerald-400' : lead.attentionRatio >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {lead.attentionRatio}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nuvem de Pedidos de Oração & Interesses */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[36px] shadow-xs border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Interesses & Pedidos de Oração Frequentes</h3>
              <p className="text-xs text-slate-400 font-medium">Necessidades espirituais e temas mais declarados pelas famílias</p>
            </div>
          </div>
          <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/40 px-3 py-1 rounded-full uppercase">
            Cuidado Pastoral
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {prayerThemes.map((item, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 transition-all"
            >
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.theme}</span>
              <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-full text-[10px] font-black">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
