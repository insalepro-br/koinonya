import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Plus, 
  Target, 
  Calendar, 
  CreditCard, 
  FileText, 
  Search, 
  Trash2, 
  CheckCircle2, 
  ChevronDown, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart as PieChartIcon, 
  X, 
  Heart, 
  Coins, 
  Building2, 
  Users2,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { FinancialTransaction, FinancialCampaign, TransactionType, PaymentMethod, Member } from '../types';

interface FinancialModuleProps {
  transactions: FinancialTransaction[];
  campaigns: FinancialCampaign[];
  members?: Member[];
  onSaveTransaction: (tx: Partial<FinancialTransaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onSaveCampaign: (campaign: Partial<FinancialCampaign>) => Promise<void>;
  onDeleteCampaign: (id: string) => Promise<void>;
}

const EXPENSE_CATEGORIES = [
  'Aluguel & Condomínio',
  'Energia, Água & Internet',
  'Ação Social & Cestas Básicas',
  'Equipamentos de Som & Mídia',
  'Manutenção Predial & Limpeza',
  'Ajuda de Custo Pastoral',
  'Ministério Infantil & Escola Bíblica',
  'Missões & Evangelismo Externo',
  'Eventos & Conferências',
  'Outras Despesas'
];

const FinancialModule: React.FC<FinancialModuleProps> = ({
  transactions,
  campaigns,
  members = [],
  onSaveTransaction,
  onDeleteTransaction,
  onSaveCampaign,
  onDeleteCampaign
}) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'campaigns' | 'reports'>('transactions');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);

  // New Transaction Form State (Inflows vs Outflows)
  const [txMode, setTxMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [txForm, setTxForm] = useState<Partial<FinancialTransaction>>({
    type: 'TITHE',
    amount: 100,
    description: '',
    category: 'Dízimos',
    date: new Date(),
    payment_method: 'PIX',
    member_id: '',
    member_name: '',
    campaign_id: '',
    notes: ''
  });

  // New Campaign Form State
  const [campaignForm, setCampaignForm] = useState<Partial<FinancialCampaign>>({
    title: '',
    description: '',
    target_amount: 5000,
    raised_amount: 0,
    start_date: new Date(),
    active: true
  });

  // Totals calculations
  const totalTithes = useMemo(() => {
    return transactions.filter(t => t.type === 'TITHE').reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [transactions]);

  const totalOfferings = useMemo(() => {
    return transactions.filter(t => t.type === 'OFFERING').reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [transactions]);

  const totalCampaigns = useMemo(() => {
    return transactions.filter(t => t.type === 'CAMPAIGN').reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [transactions]);

  const totalInflows = useMemo(() => {
    return transactions.filter(t => t.type !== 'EXPENSE').reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [transactions]);

  const netBalance = useMemo(() => {
    return totalInflows - totalExpenses;
  }, [totalInflows, totalExpenses]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.member_name && t.member_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesType = true;
      if (selectedType === 'INCOME') {
        matchesType = t.type !== 'EXPENSE';
      } else if (selectedType === 'EXPENSE') {
        matchesType = t.type === 'EXPENSE';
      } else if (selectedType !== 'ALL') {
        matchesType = t.type === selectedType;
      }

      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, selectedType]);

  // Chart data: Distribution of Income by Category
  const incomeCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.type !== 'EXPENSE').forEach(t => {
      const cat = t.type === 'TITHE' ? 'Dízimos' : t.type === 'OFFERING' ? 'Ofertas' : 'Campanhas';
      map[cat] = (map[cat] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  // Chart data: Distribution of Expenses by Category
  const expenseCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      const cat = t.category || 'Geral';
      map[cat] = (map[cat] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
  const EXPENSE_COLORS = ['#ef4444', '#f97316', '#eab308', '#ec4899', '#8b5cf6', '#64748b'];

  const handleSelectMember = (memberId: string) => {
    if (!memberId) {
      setTxForm(prev => ({ ...prev, member_id: '', member_name: '' }));
      return;
    }
    const found = members.find(m => m.id === memberId);
    setTxForm(prev => ({
      ...prev,
      member_id: memberId,
      member_name: found ? found.name : ''
    }));
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.amount || txForm.amount <= 0) return;

    let finalType: TransactionType = txMode === 'EXPENSE' ? 'EXPENSE' : (txForm.type || 'TITHE');
    let cat = txForm.category;

    if (txMode === 'INCOME') {
      if (finalType === 'TITHE') cat = 'Dízimos';
      else if (finalType === 'OFFERING') cat = 'Ofertas';
      else if (finalType === 'CAMPAIGN') cat = 'Campanhas Especiais';
    } else {
      cat = txForm.category || 'Despesas Gerais';
    }

    await onSaveTransaction({
      ...txForm,
      type: finalType,
      id: Math.random().toString(36).substr(2, 9),
      category: cat || 'Geral',
      created_at: new Date()
    });

    // If income linked to a campaign, increment the campaign raised amount
    if (finalType === 'CAMPAIGN' && txForm.campaign_id) {
      const targetCamp = campaigns.find(c => c.id === txForm.campaign_id);
      if (targetCamp) {
        await onSaveCampaign({
          ...targetCamp,
          raised_amount: (targetCamp.raised_amount || 0) + Number(txForm.amount)
        });
      }
    }

    setIsTxModalOpen(false);
    setTxForm({
      type: 'TITHE',
      amount: 100,
      description: '',
      category: 'Dízimos',
      date: new Date(),
      payment_method: 'PIX',
      member_id: '',
      member_name: '',
      campaign_id: '',
      notes: ''
    });
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.title) return;

    await onSaveCampaign({
      ...campaignForm,
      id: Math.random().toString(36).substr(2, 9),
      raised_amount: campaignForm.raised_amount || 0,
      created_at: new Date()
    });

    setIsCampaignModalOpen(false);
    setCampaignForm({
      title: '',
      description: '',
      target_amount: 5000,
      raised_amount: 0,
      start_date: new Date(),
      active: true
    });
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
      {/* Top Header (Clean, without module number badges) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">
            Gestão Financeira & Campanhas
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
            Controle de dízimos, ofertas, despesas/saídas operacionais, campanhas e prestação de contas pastoral.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsCampaignModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3.5 whitespace-nowrap bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded-2xl font-black shadow-xs hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            <Target className="w-4 h-4" />
            <span>Nova Campanha</span>
          </button>

          <button
            onClick={() => {
              setTxMode('EXPENSE');
              setTxForm(prev => ({
                ...prev,
                type: 'EXPENSE',
                category: EXPENSE_CATEGORIES[0],
                description: '',
                amount: 100
              }));
              setIsTxModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3.5 whitespace-nowrap bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-2xl font-black shadow-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            <TrendingDown className="w-4 h-4" />
            <span>Registrar Saída</span>
          </button>

          <button
            onClick={() => {
              setTxMode('INCOME');
              setTxForm(prev => ({
                ...prev,
                type: 'TITHE',
                category: 'Dízimos',
                description: '',
                amount: 100
              }));
              setIsTxModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3.5 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 transition-all text-xs uppercase tracking-wider cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Entrada</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Saldo Líquido, Total Entradas, Total Saídas, Campanhas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Saldo Líquido Atual */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-xs border border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Saldo em Caixa</p>
            <h3 className={`text-xl 2xl:text-3xl font-black whitespace-nowrap tabular-nums mt-1 ${netBalance >= 0 ? 'text-slate-800 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
              R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              Entradas - Saídas acumuladas
            </p>
          </div>
          <div className={`p-4 rounded-2xl ${netBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
            <Wallet className="w-7 h-7" />
          </div>
        </div>

        {/* Total Entradas */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-xs border border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Entradas</p>
            <h3 className="text-xl 2xl:text-3xl font-black whitespace-nowrap tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              + R$ {totalInflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              Dízimos: R$ {totalTithes.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} • Ofertas: R$ {totalOfferings.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <ArrowUpCircle className="w-7 h-7" />
          </div>
        </div>

        {/* Total Saídas / Despesas */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-xs border border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Saídas / Despesas</p>
            <h3 className="text-xl 2xl:text-3xl font-black whitespace-nowrap tabular-nums text-rose-600 dark:text-rose-400 mt-1">
              - R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              {transactions.filter(t => t.type === 'EXPENSE').length} pagamentos efetuados
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <ArrowDownCircle className="w-7 h-7" />
          </div>
        </div>

        {/* Campanhas Ativas */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-xs border border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Campanhas Especiais</p>
            <h3 className="text-xl 2xl:text-3xl font-black whitespace-nowrap tabular-nums text-amber-600 dark:text-amber-400 mt-1">
              R$ {totalCampaigns.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              {campaigns.length} campanhas de expansão
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <Target className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Extrato Financeiro ({transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'campaigns'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Campanhas de Expansão ({campaigns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
          }`}
        >
          <PieChartIcon className="w-4 h-4" />
          <span>Prestação de Contas (Entradas & Saídas)</span>
        </button>
      </div>

      {/* TAB 1: TRANSACTIONS LIST */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Search and filters */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-[28px] border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por descrição, membro ou categoria..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-medium text-sm text-slate-700 dark:text-slate-200 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="ALL">Todas as Transações</option>
              <option value="INCOME">Apenas Entradas (Dízimos & Ofertas)</option>
              <option value="EXPENSE">Apenas Saídas / Despesas</option>
              <option value="TITHE">Somente Dízimos</option>
              <option value="OFFERING">Somente Ofertas</option>
              <option value="CAMPAIGN">Somente Campanhas</option>
            </select>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Fluxo / Tipo</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Categoria / Destino</th>
                    <th className="px-6 py-4">Membro / Favorecido</th>
                    <th className="px-6 py-4">Método</th>
                    <th className="px-6 py-4 text-right">Valor (R$)</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-xs">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx) => {
                      const isExpense = tx.type === 'EXPENSE';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isExpense
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800'
                                : tx.type === 'TITHE' 
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' 
                                : tx.type === 'OFFERING'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {isExpense ? (
                                <>
                                  <ArrowDownRight className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                  <span>Saída / Despesa</span>
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>{tx.type === 'TITHE' ? 'Dízimo' : tx.type === 'OFFERING' ? 'Oferta' : 'Campanha'}</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">
                            {tx.description}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">
                            {tx.category || (isExpense ? 'Despesa' : 'Geral')}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                            {tx.member_name || (isExpense ? 'Fornecedor / Despesa' : 'Anônimo / Ofertante')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">
                              {tx.payment_method}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-right font-black text-sm whitespace-nowrap ${
                            isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isExpense ? '- ' : '+ '}
                            R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => onDeleteTransaction(tx.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                              title="Remover Lançamento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-wider">
                        Nenhum lançamento encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => {
            const pct = Math.min(100, Math.round(((camp.raised_amount || 0) / (camp.target_amount || 1)) * 100));

            return (
              <div 
                key={camp.id}
                className="bg-white dark:bg-slate-800 p-7 rounded-[36px] border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col justify-between gap-6 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Campanha Ativa
                    </span>
                    <button
                      onClick={() => onDeleteCampaign(camp.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Campanha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h4 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                    {camp.title}
                  </h4>
                  {camp.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 line-clamp-3">
                      {camp.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Arrecadado</p>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        R$ {(camp.raised_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400">Meta</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        R$ {camp.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                    <span>{pct}% concluído</span>
                    <span>Início: {new Date(camp.start_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTxMode('INCOME');
                    setTxForm(prev => ({
                      ...prev,
                      type: 'CAMPAIGN',
                      campaign_id: camp.id,
                      description: `Doação para: ${camp.title}`
                    }));
                    setIsTxModalOpen(true);
                  }}
                  className="w-full py-3 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Registrar Doação para Esta Campanha
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: REPORTS / PRESTAÇÃO DE CONTAS */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Entradas por Categoria */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-xs border border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Composição de Entradas</h3>
            <p className="text-xs text-slate-400 font-medium mb-6">Dízimos, ofertas de culto e campanhas</p>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {incomeCategoryData.map((entry, index) => (
                      <Cell key={`cell-in-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
              {incomeCategoryData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo Consolidado Entradas vs Saídas */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-xs border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Balanço Pastoral Consolidado</h3>
              <p className="text-xs text-slate-400 font-medium mb-6">Demonstrativo de entradas, despesas e saldo em caixa</p>

              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-between border border-emerald-100 dark:border-emerald-900/50">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Total de Entradas (Receitas)</span>
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                    + R$ {totalInflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-between border border-rose-100 dark:border-rose-900/50">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Total de Saídas (Despesas Operacionais)</span>
                  <span className="text-base font-black text-rose-700 dark:text-rose-300">
                    - R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-lg shadow-slate-900/10">
                  <span className="text-xs font-black uppercase tracking-wider">Saldo Líquido em Caixa</span>
                  <span className={`text-xl font-black ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total Dízimos</p>
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      R$ {totalTithes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total Ofertas/Campanhas</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      R$ {(totalOfferings + totalCampaigns).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 text-slate-400 text-[11px] font-medium">
              Nota: Todas as movimentações atendem às diretrizes de governança eclesiástica transparente para conselho pastoral e prestação de contas congregacional.
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO LANÇAMENTO (ENTRADA OU SAÍDA) */}
      {isTxModalOpen && (
        <div className="fixed inset-0 !mt-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[36px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className={`p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center ${
              txMode === 'INCOME' ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-rose-50/60 dark:bg-rose-950/20'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl text-white ${txMode === 'INCOME' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                  {txMode === 'INCOME' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">
                    {txMode === 'INCOME' ? 'Lançar Entrada' : 'Registrar Saída / Despesa'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {txMode === 'INCOME' ? 'Dízimos & Ofertas da Igreja' : 'Despesas & Pagamentos Ministeriais'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsTxModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternador Entrada vs Saída */}
            <div className="p-6 pb-0">
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setTxMode('INCOME');
                    setTxForm(prev => ({ ...prev, type: 'TITHE', category: 'Dízimos' }));
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    txMode === 'INCOME' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>+ Entrada (Receita)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxMode('EXPENSE');
                    setTxForm(prev => ({ ...prev, type: 'EXPENSE', category: EXPENSE_CATEGORIES[0] }));
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    txMode === 'EXPENSE' 
                      ? 'bg-rose-600 text-white shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>- Saída (Despesa)</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateTransaction} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {txMode === 'INCOME' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Tipo de Entrada *</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 text-sm outline-none cursor-pointer"
                      value={txForm.type}
                      onChange={(e) => setTxForm({ ...txForm, type: e.target.value as TransactionType })}
                    >
                      <option value="TITHE">Dízimo</option>
                      <option value="OFFERING">Oferta de Culto</option>
                      <option value="CAMPAIGN">Doação para Campanha</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Categoria da Despesa *</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 text-sm outline-none cursor-pointer"
                      value={txForm.category}
                      onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none"
                    value={txForm.amount || ''}
                    onChange={(e) => setTxForm({ ...txForm, amount: Number(e.target.value) })}
                    placeholder="150,00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  {txMode === 'INCOME' ? 'Descrição / Motivo *' : 'Descrição da Despesa / Favorecido *'}
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none"
                  value={txForm.description || ''}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  placeholder={txMode === 'INCOME' ? "Ex: Dízimo mês atual ou Oferta de Gratidão" : "Ex: Conta de Luz do Templo ou Manutenção do Ar-Condicionado"}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    {txMode === 'INCOME' ? 'Membro / Ofertante' : 'Membro / Solicitante'}
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 text-sm outline-none cursor-pointer"
                    value={txForm.member_id || ''}
                    onChange={(e) => handleSelectMember(e.target.value)}
                  >
                    <option value="">{txMode === 'INCOME' ? 'Anônimo / Visitante' : 'Não vinculado'}</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Forma de Pagamento</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 text-sm outline-none cursor-pointer"
                    value={txForm.payment_method}
                    onChange={(e) => setTxForm({ ...txForm, payment_method: e.target.value as PaymentMethod })}
                  >
                    <option value="PIX">Pix</option>
                    <option value="BANK_TRANSFER">Transferência / TED</option>
                    <option value="CASH">Dinheiro em Espécie</option>
                    <option value="DEBIT_CARD">Cartão de Débito</option>
                    <option value="CREDIT_CARD">Cartão de Crédito</option>
                  </select>
                </div>
              </div>

              {txMode === 'INCOME' && txForm.type === 'CAMPAIGN' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Vincular à Campanha</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 text-sm outline-none cursor-pointer"
                    value={txForm.campaign_id || ''}
                    onChange={(e) => setTxForm({ ...txForm, campaign_id: e.target.value })}
                  >
                    <option value="">Nenhuma campanha específica</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3.5 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-all ${
                    txMode === 'INCOME'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  }`}
                >
                  {txMode === 'INCOME' ? 'Confirmar Entrada' : 'Confirmar Saída'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA CAMPANHA */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 !mt-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[36px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">Nova Campanha</h3>
              </div>
              <button onClick={() => setIsCampaignModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Título da Campanha *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none"
                  value={campaignForm.title || ''}
                  onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  placeholder="Ex: Reforma do Templo, Missões, Som Novo"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Meta Financeira (R$) *</label>
                <input
                  type="number"
                  step="100"
                  min="100"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none"
                  value={campaignForm.target_amount || ''}
                  onChange={(e) => setCampaignForm({ ...campaignForm, target_amount: Number(e.target.value) })}
                  placeholder="10000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Descrição e Propósito</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium text-slate-800 dark:text-white text-sm outline-none resize-none"
                  value={campaignForm.description || ''}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  placeholder="Explique o destino específico dos recursos e o impacto para a obra de Deus..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 cursor-pointer"
                >
                  Criar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialModule;
