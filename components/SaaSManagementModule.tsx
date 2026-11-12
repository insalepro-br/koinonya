import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  DollarSign, 
  Users, 
  CreditCard, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Ban, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Calendar, 
  TrendingUp, 
  Sparkles, 
  X, 
  Edit3, 
  Check, 
  MessageSquare,
  Info,
  Receipt,
  Copy,
  Trash2,
  Download,
  FilePlus2,
  QrCode
} from 'lucide-react';
import {
  Organization,
  SubscriptionStatus,
  BillingCycle,
  SaaSInvoice,
  InvoiceStatus,
  SaaSInvoicePaymentMethod
} from '../types';
import { KoinoniaDB } from '../services/db';
import { downloadCSV } from '../utils/exportImportHelpers';

interface SaaSManagementModuleProps {
  organizations: Organization[];
  invoices?: SaaSInvoice[];
  currentOrgId?: string;
  isSuperAdmin?: boolean;
  activeMembersCount?: number;
  onRefresh?: () => void;
}

const PLAN_DETAILS: Record<string, { label: string; defaultPrice: number; defaultMaxMembers: number; desc: string; badgeColor: string }> = {
  IGREJA: {
    label: 'Igreja Local',
    defaultPrice: 149,
    defaultMaxMembers: 250,
    desc: 'Até 250 membros ativos, templo sede, células e automação WhatsApp.',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
  },
  MULTI: {
    label: 'Multi-Campi',
    defaultPrice: 249,
    defaultMaxMembers: 1000,
    desc: 'Até 1.000 membros ativos, Sede + Filiais, escalas e consolidação.',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
  },
  ENTERPRISE: {
    label: 'Enterprise / Rede',
    defaultPrice: 499,
    defaultMaxMembers: 10000,
    desc: 'Redes estaduais/nacionais, até 10.000 membros, IA pastoral e suporte VIP.',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
  }
};

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; icon: any; badgeClass: string; rowBg: string }> = {
  ACTIVE: {
    label: 'Ativo / Em Dia',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    rowBg: 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
  },
  TRIAL: {
    label: 'Em Teste (Trial)',
    icon: Clock,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    rowBg: 'hover:bg-amber-50/30 dark:hover:bg-amber-950/20'
  },
  PAST_DUE: {
    label: 'Pendente / Vencida',
    icon: AlertTriangle,
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
    rowBg: 'bg-orange-50/20 hover:bg-orange-50/40 dark:bg-orange-950/10'
  },
  SUSPENDED: {
    label: 'Acesso Suspenso',
    icon: Ban,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    rowBg: 'bg-rose-50/20 hover:bg-rose-50/40 dark:bg-rose-950/10'
  },
  CANCELED: {
    label: 'Cancelada',
    icon: X,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    rowBg: 'opacity-70 hover:opacity-100'
  }
};

const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; badgeClass: string }> = {
  PAID: {
    label: 'Paga',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
  },
  PENDING: {
    label: 'Em Aberto',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
  },
  OVERDUE: {
    label: 'Vencida',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
  },
  CANCELED: {
    label: 'Cancelada',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
  }
};

const PAYMENT_METHOD_LABELS: Record<SaaSInvoicePaymentMethod, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CARD: 'Cartão',
  TRANSFER: 'Transferência'
};

export const SaaSManagementModule: React.FC<SaaSManagementModuleProps> = ({
  organizations,
  invoices = [],
  currentOrgId,
  isSuperAdmin = false,
  activeMembersCount = 0,
  onRefresh
}) => {
  const [subTab, setSubTab] = useState<'tenants' | 'invoices'>('tenants');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('ALL');
  const [referenceMonth, setReferenceMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showArchInfo, setShowArchInfo] = useState(false);
  const [isNewOrgModalOpen, setIsNewOrgModalOpen] = useState(false);
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);
  const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);

  const [newOrgForm, setNewOrgForm] = useState({
    name: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    plan: 'IGREJA',
    monthly_price: 149,
    max_members: 250,
    billing_cycle: 'MONTHLY' as BillingCycle,
    trial_days: 14,
    notes: ''
  });

  const [newInvoiceForm, setNewInvoiceForm] = useState({
    org_id: currentOrgId || organizations[0]?.id || '',
    amount: 149,
    due_date: (() => {
      const d = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    reference_month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    payment_method: 'PIX' as SaaSInvoicePaymentMethod,
    notes: ''
  });

  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter(o => o.subscription_status === 'ACTIVE' || (!o.subscription_status && o.active));
  const trialOrgs = organizations.filter(o => o.subscription_status === 'TRIAL');
  const pastDueOrgs = organizations.filter(o => o.subscription_status === 'PAST_DUE');
  const suspendedOrgs = organizations.filter(o => o.subscription_status === 'SUSPENDED');

  const mrr = organizations.reduce((acc, org) => {
    if (org.subscription_status === 'ACTIVE' || (!org.subscription_status && org.active)) {
      const price = typeof org.monthly_price === 'number' ? org.monthly_price : (PLAN_DETAILS[org.plan]?.defaultPrice || 149);
      return acc + price;
    }
    return acc;
  }, 0);

  const arr = mrr * 12;

  // Invoice KPIs
  const invoiceStats = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'PAID').reduce((acc, i) => acc + i.amount, 0);
    const pending = invoices.filter(i => i.status === 'PENDING').reduce((acc, i) => acc + i.amount, 0);
    const overdue = invoices.filter(i => i.status === 'OVERDUE').reduce((acc, i) => acc + i.amount, 0);
    const validTotal = invoices.filter(i => i.status !== 'CANCELED').length;
    const paidCount = invoices.filter(i => i.status === 'PAID').length;
    const complianceRate = validTotal > 0 ? Math.round((paidCount / validTotal) * 100) : 100;
    return { paid, pending, overdue, complianceRate };
  }, [invoices]);

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org.owner_name && org.owner_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (org.owner_email && org.owner_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      org.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && (org.subscription_status === 'ACTIVE' || (!org.subscription_status && org.active))) ||
      org.subscription_status === statusFilter;

    const matchesPlan = planFilter === 'ALL' || org.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      inv.org_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.reference_month.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = invoiceStatusFilter === 'ALL' || inv.status === invoiceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const handleCreateNewOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgForm.name.trim() || !newOrgForm.owner_email.trim()) return;

    try {
      const created = await KoinoniaDB.provisionTenantOrganization({
        name: newOrgForm.name.trim(),
        owner_name: newOrgForm.owner_name.trim() || 'Pastor Responsável',
        owner_email: newOrgForm.owner_email.trim(),
        owner_phone: newOrgForm.owner_phone.trim(),
        plan: newOrgForm.plan,
        monthly_price: Number(newOrgForm.monthly_price) || 149,
        billing_cycle: newOrgForm.billing_cycle,
        trial_days: Number(newOrgForm.trial_days) || 14,
        notes: newOrgForm.notes.trim()
      });

      if (newOrgForm.max_members) {
        await KoinoniaDB.saveOrganization({
          ...created,
          max_members: Number(newOrgForm.max_members)
        });
      }

      setIsNewOrgModalOpen(false);
      setNewOrgForm({
        name: '',
        owner_name: '',
        owner_email: '',
        owner_phone: '',
        plan: 'IGREJA',
        monthly_price: 149,
        max_members: 250,
        billing_cycle: 'MONTHLY',
        trial_days: 14,
        notes: ''
      });
      showToast('Nova Igreja Cliente provisionada com sucesso.');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao provisionar organização:', err);
    }
  };

  const handleUpdateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    try {
      await KoinoniaDB.saveOrganization(editingOrg);
      setEditingOrg(null);
      showToast(`Cobrança e plano de "${editingOrg.name}" atualizados.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao salvar cobrança:', err);
    }
  };

  const handleExtendTrial = async (org: Organization, days: number) => {
    try {
      const currentEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : new Date();
      const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);
      const updated: Organization = {
        ...org,
        subscription_status: 'TRIAL',
        trial_ends_at: newEnd,
        next_billing_date: newEnd,
        active: true
      };
      await KoinoniaDB.saveOrganization(updated);
      showToast(`Período de teste de "${org.name}" prorrogado em +${days} dias.`);
    } catch (err) {
      console.error('Erro ao prorrogar teste:', err);
    }
  };

  const handleToggleSuspension = async (org: Organization) => {
    try {
      const isCurrentlySuspended = org.subscription_status === 'SUSPENDED';
      const updated: Organization = {
        ...org,
        subscription_status: isCurrentlySuspended ? 'ACTIVE' : 'SUSPENDED',
        active: isCurrentlySuspended
      };
      await KoinoniaDB.saveOrganization(updated);
      showToast(
        isCurrentlySuspended
          ? `Acesso da igreja "${org.name}" reativado com sucesso.`
          : `Acesso da igreja "${org.name}" suspenso por inadimplência.`
      );
    } catch (err) {
      console.error('Erro ao alterar suspensão:', err);
    }
  };

  const handleBatchGenerateInvoices = async () => {
    setIsGeneratingInvoices(true);
    try {
      const targetOrgs = isSuperAdmin
        ? organizations
        : organizations.filter(o => o.id === currentOrgId);
      const count = await KoinoniaDB.generateMonthlySaaSInvoices(targetOrgs, invoices, referenceMonth);
      showToast(
        count > 0
          ? `${count} fatura(s) gerada(s) para a competência ${referenceMonth}.`
          : `Todas as organizações elegíveis já possuem fatura para ${referenceMonth}.`
      );
    } catch (err) {
      console.error('Erro ao gerar faturas em lote:', err);
    } finally {
      setIsGeneratingInvoices(false);
    }
  };

  const handleCreateManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetOrg = organizations.find(o => o.id === newInvoiceForm.org_id) || organizations[0];
    if (!targetOrg) return;

    try {
      const invId = `inv_${Date.now().toString(36)}`;
      const pixSlug = targetOrg.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
      const invoice: SaaSInvoice = {
        id: invId,
        org_id: targetOrg.id,
        org_name: targetOrg.name,
        amount: Number(newInvoiceForm.amount) || 149,
        due_date: new Date(`${newInvoiceForm.due_date}T23:59:00`),
        paid_at: null,
        status: new Date(`${newInvoiceForm.due_date}T23:59:00`).getTime() < Date.now() ? 'OVERDUE' : 'PENDING',
        payment_method: newInvoiceForm.payment_method,
        reference_month: newInvoiceForm.reference_month,
        pix_code: `00020126580014BR.GOV.BCB.PIX0136financeiro@koinonya.app5204000053039865802BR5913KOINONYA SAAS6009SAO PAULO62150511${pixSlug}${newInvoiceForm.reference_month.replace('-', '')}6304A1B2`,
        notes: newInvoiceForm.notes.trim() || `Fatura avulsa ${targetOrg.name}`,
        created_at: new Date()
      };
      await KoinoniaDB.saveSaaSInvoice(invoice);
      setIsNewInvoiceModalOpen(false);
      showToast(`Fatura para "${targetOrg.name}" registrada com sucesso.`);
    } catch (err) {
      console.error('Erro ao criar fatura avulsa:', err);
    }
  };

  const handleMarkInvoicePaid = async (inv: SaaSInvoice) => {
    try {
      await KoinoniaDB.saveSaaSInvoice({
        ...inv,
        status: 'PAID',
        paid_at: new Date()
      });

      const targetOrg = organizations.find(o => o.id === inv.org_id);
      if (targetOrg) {
        const daysToAdd = targetOrg.billing_cycle === 'ANNUAL' ? 365 : 30;
        const baseDate = targetOrg.next_billing_date && new Date(targetOrg.next_billing_date).getTime() > Date.now()
          ? new Date(targetOrg.next_billing_date)
          : new Date();
        const nextBilling = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

        await KoinoniaDB.saveOrganization({
          ...targetOrg,
          subscription_status: 'ACTIVE',
          active: true,
          next_billing_date: nextBilling
        });
      }

      showToast(`Pagamento confirmado para "${inv.org_name}" e assinatura renovada automaticamente.`);
    } catch (err) {
      console.error('Erro ao baixar fatura:', err);
    }
  };

  const handleMarkInvoiceOverdue = async (inv: SaaSInvoice) => {
    try {
      await KoinoniaDB.saveSaaSInvoice({
        ...inv,
        status: 'OVERDUE'
      });
      const targetOrg = organizations.find(o => o.id === inv.org_id);
      if (targetOrg && targetOrg.subscription_status !== 'SUSPENDED') {
        await KoinoniaDB.saveOrganization({
          ...targetOrg,
          subscription_status: 'PAST_DUE'
        });
      }
      showToast(`Fatura de "${inv.org_name}" marcada como vencida.`);
    } catch (err) {
      console.error('Erro ao atualizar fatura:', err);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await KoinoniaDB.deleteSaaSInvoice(id);
      showToast('Fatura removida.');
    } catch (err) {
      console.error('Erro ao remover fatura:', err);
    }
  };

  const handleCopyPixCode = async (inv: SaaSInvoice) => {
    const code = inv.pix_code || 'financeiro@koinonya.app';
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback ignored
    }
    setCopiedInvoiceId(inv.id);
    setTimeout(() => setCopiedInvoiceId(null), 2500);
  };

  const openWhatsAppBillingNotice = (org: Organization, invoice?: SaaSInvoice) => {
    const phone = org.owner_phone ? org.owner_phone.replace(/\D/g, '') : '';
    const churchName = org.name;
    const rawAmount = invoice?.amount ?? org.monthly_price ?? PLAN_DETAILS[org.plan]?.defaultPrice ?? 149;
    const value = rawAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dueText = invoice ? ` com vencimento em ${new Date(invoice.due_date).toLocaleDateString('pt-BR')}` : '';
    const message = encodeURIComponent(
      `Olá, Paz do Senhor! Aqui é da equipe financeira do Koinonya.\n\n` +
      `Segue o resumo da assinatura da ${churchName}: fatura de ${value}${dueText}.\n\n` +
      `Chave PIX oficial: financeiro@koinonya.app\n` +
      (invoice?.pix_code ? `PIX Copia e Cola:\n${invoice.pix_code}\n\n` : '') +
      `Qualquer dúvida estamos à disposição!`
    );
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const handleExportTenantsCSV = () => {
    const header = ['ID Tenant', 'Igreja', 'Plano', 'Mensalidade', 'Limite Membros', 'Status', 'Responsavel', 'Email', 'Telefone', 'Proximo Vencimento'];
    const rows = filteredOrgs.map(o => [
      o.id,
      `"${o.name.replace(/"/g, '""')}"`,
      o.plan,
      String(o.monthly_price ?? PLAN_DETAILS[o.plan]?.defaultPrice ?? 149),
      String(o.max_members ?? PLAN_DETAILS[o.plan]?.defaultMaxMembers ?? 250),
      o.subscription_status || (o.active ? 'ACTIVE' : 'SUSPENDED'),
      `"${(o.owner_name || '').replace(/"/g, '""')}"`,
      o.owner_email || '',
      o.owner_phone || '',
      o.next_billing_date ? new Date(o.next_billing_date).toLocaleDateString('pt-BR') : ''
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(`koinonya_clientes_saas_${new Date().toISOString().split('T')[0]}.csv`, csv);
    showToast('Relatório de clientes SaaS exportado em CSV.');
  };

  const handleExportInvoicesCSV = () => {
    const header = ['ID Fatura', 'ID Tenant', 'Igreja', 'Competencia', 'Vencimento', 'Valor', 'Metodo', 'Status', 'Pago Em'];
    const rows = filteredInvoices.map(i => [
      i.id,
      i.org_id,
      `"${i.org_name.replace(/"/g, '""')}"`,
      i.reference_month,
      new Date(i.due_date).toLocaleDateString('pt-BR'),
      String(i.amount),
      i.payment_method,
      i.status,
      i.paid_at ? new Date(i.paid_at).toLocaleDateString('pt-BR') : ''
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(`koinonya_faturas_saas_${new Date().toISOString().split('T')[0]}.csv`, csv);
    showToast('Extrato de faturas SaaS exportado em CSV.');
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 p-6 sm:p-10 space-y-8 font-inter">
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-emerald-800 dark:text-emerald-200 text-sm font-bold shadow-sm animate-in fade-in">
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
            Gestão de Clientes & Faturamento SaaS
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Controle igrejas clientes, cotas de membros por plano, faturas PIX recorrentes, inadimplência e bloqueio automático.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowArchInfo(!showArchInfo)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold transition-all shadow-sm whitespace-nowrap shrink-0"
          >
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Como Funciona o SaaS</span>
          </button>

          <button
            type="button"
            onClick={subTab === 'tenants' ? handleExportTenantsCSV : handleExportInvoicesCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold transition-all shadow-sm whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Exportar CSV</span>
          </button>

          {isSuperAdmin && subTab === 'invoices' && (
            <button
              type="button"
              onClick={() => {
                const defaultOrg = organizations.find(o => o.id === currentOrgId) || organizations[0];
                if (defaultOrg) {
                  setNewInvoiceForm(prev => ({
                    ...prev,
                    org_id: defaultOrg.id,
                    amount: defaultOrg.monthly_price ?? PLAN_DETAILS[defaultOrg.plan]?.defaultPrice ?? 149
                  }));
                }
                setIsNewInvoiceModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="w-4 h-4 shrink-0" />
              <span>Nova Fatura</span>
            </button>
          )}
          {isSuperAdmin && subTab === 'tenants' && (
            <button
              type="button"
              onClick={() => setIsNewOrgModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nova Igreja Cliente</span>
            </button>
          )}
        </div>
      </div>

      {!isSuperAdmin && (
        <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center gap-3 text-xs font-bold text-indigo-800 dark:text-indigo-200">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            Visualização da assinatura da sua igreja (somente leitura). Alterações de plano, emissão e baixa de faturas são gerenciadas pela administração da plataforma Koinonya.
          </span>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-fit shadow-sm">
        <button
          type="button"
          onClick={() => setSubTab('tenants')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
            subTab === 'tenants'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Clientes & Planos ({totalOrgs})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('invoices')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
            subTab === 'invoices'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span>Faturas & Cobrança ({invoices.length})</span>
        </button>
      </div>

      {showArchInfo && (
        <div className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl shadow-xl border border-indigo-700/50 relative overflow-hidden animate-in fade-in zoom-in-95">
          <button
            onClick={() => setShowArchInfo(false)}
            className="absolute top-4 right-4 p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Governança Multi-Tenant Koinonya
            </div>
            <h3 className="text-xl font-black">
              Como seus clientes são atendidos, faturados e bloqueados automaticamente:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-indigo-100">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="font-bold text-white mb-1">1. Isolamento por org_id</p>
                <p className="opacity-80">
                  Membros, finanças, faturas e cultos são isolados por <code className="bg-white/10 px-1 rounded">org_id</code> com regras estritas no Firestore.
                </p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="font-bold text-white mb-1">2. Baixa & Renovação Auto</p>
                <p className="opacity-80">
                  Ao confirmar o pagamento de uma fatura PIX, o tenant retorna para Ativo e o próximo vencimento avança +30 ou +365 dias.
                </p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="font-bold text-white mb-1">3. Bloqueio Real por Inadimplência</p>
                <p className="opacity-80">
                  Igrejas marcadas como Suspensa ou Cancelada exibem a tela de regularização com código PIX no acesso dos usuários.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'tenants' ? (
        <>
          {/* SaaS Financial Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  MRR (Receita Mensal)
                </span>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800 dark:text-white tabular-nums">
                  {mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-xs font-bold text-slate-400">/mês</span>
              </div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 tabular-nums">
                <TrendingUp className="w-3.5 h-3.5" />
                ARR Estimado: {arr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Igrejas Clientes
                </span>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800 dark:text-white tabular-nums">
                  {totalOrgs}
                </span>
                <span className="text-xs font-bold text-slate-400">igrejas no total</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
                {activeOrgs.length} ativas • {trialOrgs.length} em teste
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Status de Assinatura
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
                <div className="font-bold text-emerald-600 dark:text-emerald-400">{activeOrgs.length} Ativas</div>
                <div className="font-bold text-amber-600 dark:text-amber-400">{trialOrgs.length} Em Teste</div>
                <div className="font-bold text-orange-600 dark:text-orange-400">{pastDueOrgs.length} Pendentes</div>
                <div className="font-bold text-rose-600 dark:text-rose-400">{suspendedOrgs.length} Suspensas</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Ticket Médio Mensal
                </span>
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800 dark:text-white tabular-nums">
                  {activeOrgs.length > 0
                    ? (mrr / activeOrgs.length).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : 'R$ 149,00'}
                </span>
                <span className="text-xs font-bold text-slate-400">/igreja</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
                Planos de R$ 149 a R$ 499
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por igreja, pastor, e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="ALL">Todos</option>
                  <option value="ACTIVE">Ativo / Em Dia</option>
                  <option value="TRIAL">Em Teste (Trial)</option>
                  <option value="PAST_DUE">Pendente</option>
                  <option value="SUSPENDED">Suspenso</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Plano:</span>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="ALL">Todos</option>
                  <option value="IGREJA">Igreja Local</option>
                  <option value="MULTI">Multi-Campi</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tenant Organizations Table */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Igreja Cliente & ID</th>
                    <th className="py-4 px-6">Responsável</th>
                    <th className="py-4 px-6">Plano & Limite</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Próx. Cobrança</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                  {filteredOrgs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Nenhuma igreja encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredOrgs.map((org) => {
                      const currentStatus = (org.subscription_status || (org.active ? 'ACTIVE' : 'SUSPENDED')) as SubscriptionStatus;
                      const statusInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.ACTIVE;
                      const StatusIcon = statusInfo.icon;
                      const planInfo = PLAN_DETAILS[org.plan] || PLAN_DETAILS.IGREJA;
                      const price = typeof org.monthly_price === 'number' ? org.monthly_price : planInfo.defaultPrice;
                      const maxMembers = org.max_members || planInfo.defaultMaxMembers;
                      const isCurrent = currentOrgId === org.id;

                      return (
                        <tr key={org.id} className={`transition-colors ${statusInfo.rowBg}`}>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shrink-0">
                                {org.name[0]?.toUpperCase() || 'I'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-800 dark:text-white truncate text-sm">
                                    {org.name}
                                  </span>
                                  {isCurrent && (
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-600 text-white whitespace-nowrap shrink-0">
                                      Atual
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {org.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-700 dark:text-slate-200">
                                {org.owner_name || 'Não informado'}
                              </p>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                {org.owner_email && (
                                  <span className="flex items-center gap-1 truncate max-w-[150px]" title={org.owner_email}>
                                    <Mail className="w-3 h-3 shrink-0" />
                                    {org.owner_email}
                                  </span>
                                )}
                                {org.owner_phone && (
                                  <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                    <Phone className="w-3 h-3 shrink-0" />
                                    {org.owner_phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${planInfo.badgeColor}`}>
                                {planInfo.label}
                              </span>
                              <p className="font-black text-slate-800 dark:text-white text-sm tabular-nums">
                                {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                <span className="text-[10px] font-medium text-slate-400">/{org.billing_cycle === 'ANNUAL' ? 'ano' : 'mês'}</span>
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 tabular-nums">
                                <Users className="w-3 h-3 shrink-0" />
                                {isCurrent
                                  ? `${activeMembersCount}/${maxMembers} membros`
                                  : `Cota: ${maxMembers} membros`}
                              </p>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${statusInfo.badgeClass} whitespace-nowrap`}>
                              <StatusIcon className="w-3 h-3 shrink-0" />
                              {statusInfo.label}
                            </span>
                            {currentStatus === 'TRIAL' && org.trial_ends_at && (
                              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                                Termina: {new Date(org.trial_ends_at).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </td>

                          <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium tabular-nums">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {org.next_billing_date
                                  ? new Date(org.next_billing_date).toLocaleDateString('pt-BR')
                                  : 'Não agendado'}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isSuperAdmin && org.owner_phone && (
                                <button
                                  type="button"
                                  onClick={() => openWhatsAppBillingNotice(org)}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all"
                                  title="Enviar cobrança via WhatsApp"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                              )}

                              {isSuperAdmin && currentStatus === 'TRIAL' && (
                                <button
                                  type="button"
                                  onClick={() => handleExtendTrial(org, 7)}
                                  className="px-2.5 py-1 text-[10px] font-black bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 rounded-xl transition-all whitespace-nowrap shrink-0"
                                  title="Prorrogar testes em +7 dias"
                                >
                                  +7 Dias
                                </button>
                              )}

                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSuspension(org)}
                                  className={`p-2 rounded-xl transition-all ${
                                    currentStatus === 'SUSPENDED'
                                      ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                      : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                  }`}
                                  title={currentStatus === 'SUSPENDED' ? 'Reativar Acesso' : 'Suspender Acesso'}
                                >
                                  {currentStatus === 'SUSPENDED' ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                </button>
                              )}

                              {isSuperAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingOrg(org)}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-all"
                                  title="Editar Plano, Limite e Cobrança"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">Somente leitura</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Invoices Revenue KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Recebido (Baixadas)</span>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-3 tabular-nums">
                {invoiceStats.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Faturas liquidadas</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">A Receber (Em Aberto)</span>
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-3 tabular-nums">
                {invoiceStats.pending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Aguardando PIX / Boleto</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Vencidas / Inadimplentes</span>
              <p className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-3 tabular-nums">
                {invoiceStats.overdue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Prioridade de cobrança</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Adimplência SaaS</span>
              <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-3 tabular-nums">
                {invoiceStats.complianceRate}%
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Faturas pagas sobre emitidas</p>
            </div>
          </div>

          {/* Batch Invoice Generator & Filter Bar */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar fatura por igreja ou competência..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">Todos os Status</option>
                <option value="PENDING">Em Aberto</option>
                <option value="OVERDUE">Vencida</option>
                <option value="PAID">Paga</option>
                <option value="CANCELED">Cancelada</option>
              </select>
            </div>

            {isSuperAdmin && (
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <input
                  type="month"
                  value={referenceMonth}
                  onChange={(e) => setReferenceMonth(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isGeneratingInvoices}
                  onClick={handleBatchGenerateInvoices}
                  className="px-5 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {isGeneratingInvoices ? 'Gerando...' : 'Gerar Faturas do Mês'}
                </button>
              </div>
            )}
          </div>

          {/* Invoices Table */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Igreja Cliente</th>
                    <th className="py-4 px-6">Competência</th>
                    <th className="py-4 px-6">Vencimento</th>
                    <th className="py-4 px-6">Valor</th>
                    <th className="py-4 px-6">Método</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Nenhuma fatura encontrada. Clique em "Gerar Faturas do Mês" ou "Nova Fatura".
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const invStatus = INVOICE_STATUS_CONFIG[inv.status] || INVOICE_STATUS_CONFIG.PENDING;
                      const targetOrg = organizations.find(o => o.id === inv.org_id);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="py-4 px-6">
                            <p className="font-black text-slate-800 dark:text-white text-sm">{inv.org_name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{inv.id}</p>
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                            {inv.reference_month}
                          </td>
                          <td className="py-4 px-6 text-slate-600 dark:text-slate-300 tabular-nums">
                            {new Date(inv.due_date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-4 px-6 font-black text-slate-800 dark:text-white tabular-nums">
                            {inv.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-600 dark:text-slate-300">
                            {PAYMENT_METHOD_LABELS[inv.payment_method] || inv.payment_method}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${invStatus.badgeClass} whitespace-nowrap`}>
                              {invStatus.label}
                            </span>
                            {inv.paid_at && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 tabular-nums">
                                Pago em {new Date(inv.paid_at).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyPixCode(inv)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-all"
                                title="Copiar PIX Copia e Cola"
                              >
                                {copiedInvoiceId === inv.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                              </button>

                              {isSuperAdmin && targetOrg && targetOrg.owner_phone && inv.status !== 'PAID' && (
                                <button
                                  type="button"
                                  onClick={() => openWhatsAppBillingNotice(targetOrg, inv)}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all"
                                  title="Enviar fatura PIX no WhatsApp"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                              )}

                              {isSuperAdmin && inv.status !== 'PAID' && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkInvoicePaid(inv)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0"
                                  title="Confirmar pagamento e renovar assinatura"
                                >
                                  Baixar / Paga
                                </button>
                              )}

                              {isSuperAdmin && inv.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkInvoiceOverdue(inv)}
                                  className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-all"
                                  title="Marcar fatura como vencida"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              )}

                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                                  title="Excluir fatura"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal: Provisionar Nova Igreja Cliente */}
      {isNewOrgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Provisionar Nova Igreja Cliente
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Cria uma organização isolada no Firestore com sede própria e plano.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewOrgModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewOrg} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-200">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Nome da Igreja / Comunidade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Igreja Batista Renovada - Central"
                  value={newOrgForm.name}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Pastor / Responsável Legal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pr. André Valente"
                    value={newOrgForm.owner_name}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, owner_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    WhatsApp para Cobrança
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={newOrgForm.owner_phone}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, owner_phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  E-mail do Administrador da Igreja *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@igrejarenovada.com.br"
                  value={newOrgForm.owner_email}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, owner_email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Plano
                  </label>
                  <select
                    value={newOrgForm.plan}
                    onChange={(e) => {
                      const p = e.target.value;
                      setNewOrgForm({
                        ...newOrgForm,
                        plan: p,
                        monthly_price: PLAN_DETAILS[p]?.defaultPrice || 149,
                        max_members: PLAN_DETAILS[p]?.defaultMaxMembers || 250
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="IGREJA">Igreja Local (R$ 149)</option>
                    <option value="MULTI">Multi-Campi (R$ 249)</option>
                    <option value="ENTERPRISE">Enterprise (R$ 499)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newOrgForm.monthly_price}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, monthly_price: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Limite Membros
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={newOrgForm.max_members}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, max_members: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Período de Testes
                </label>
                <select
                  value={newOrgForm.trial_days}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, trial_days: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value={0}>Cobrança Imediata</option>
                  <option value={7}>7 Dias Grátis</option>
                  <option value={14}>14 Dias Grátis (Padrão)</option>
                  <option value={30}>30 Dias Grátis</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Notas Internas (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Condições comerciais ou observações de cobrança."
                  value={newOrgForm.notes}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsNewOrgModalOpen(false)}
                  className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Criar e Ativar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Fatura Avulsa */}
      {isNewInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Emitir Nova Fatura PIX
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Gera cobrança vinculada ao tenant com PIX Copia e Cola automático.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewInvoiceModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualInvoice} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-200">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Igreja Cliente
                </label>
                <select
                  value={newInvoiceForm.org_id}
                  onChange={(e) => {
                    const org = organizations.find(o => o.id === e.target.value);
                    setNewInvoiceForm({
                      ...newInvoiceForm,
                      org_id: e.target.value,
                      amount: org?.monthly_price ?? PLAN_DETAILS[org?.plan || 'IGREJA']?.defaultPrice ?? 149
                    });
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                >
                  {(isSuperAdmin ? organizations : organizations.filter(o => o.id === currentOrgId)).map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newInvoiceForm.amount}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, amount: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    required
                    value={newInvoiceForm.due_date}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, due_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Competência
                  </label>
                  <input
                    type="month"
                    required
                    value={newInvoiceForm.reference_month}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, reference_month: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Método
                  </label>
                  <select
                    value={newInvoiceForm.payment_method}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, payment_method: e.target.value as SaaSInvoicePaymentMethod })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="CARD">Cartão</option>
                    <option value="TRANSFER">Transferência</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mensalidade ou taxa de implantação"
                  value={newInvoiceForm.notes}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsNewInvoiceModalOpen(false)}
                  className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Emitir Fatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Cobrança & Plano do Cliente */}
      {editingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  Ajustar Cobrança: {editingOrg.name}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Altere status, mensalidade, limite de membros e responsável.
                </p>
              </div>
              <button
                onClick={() => setEditingOrg(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBilling} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Status da Assinatura
                  </label>
                  <select
                    value={editingOrg.subscription_status || 'ACTIVE'}
                    onChange={(e) => setEditingOrg({
                      ...editingOrg,
                      subscription_status: e.target.value as SubscriptionStatus,
                      active: e.target.value !== 'SUSPENDED' && e.target.value !== 'CANCELED'
                    })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="ACTIVE">Ativo / Em Dia</option>
                    <option value="TRIAL">Período de Testes (Trial)</option>
                    <option value="PAST_DUE">Pendente / Inadimplente</option>
                    <option value="SUSPENDED">Suspenso (Acesso Bloqueado)</option>
                    <option value="CANCELED">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Plano Ativo
                  </label>
                  <select
                    value={editingOrg.plan}
                    onChange={(e) => {
                      const p = e.target.value;
                      setEditingOrg({
                        ...editingOrg,
                        plan: p,
                        max_members: editingOrg.max_members || PLAN_DETAILS[p]?.defaultMaxMembers || 250
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="IGREJA">Igreja Local</option>
                    <option value="MULTI">Multi-Campi</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingOrg.monthly_price ?? 149}
                    onChange={(e) => setEditingOrg({ ...editingOrg, monthly_price: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Ciclo
                  </label>
                  <select
                    value={editingOrg.billing_cycle || 'MONTHLY'}
                    onChange={(e) => setEditingOrg({ ...editingOrg, billing_cycle: e.target.value as BillingCycle })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="ANNUAL">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Cota Membros
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={editingOrg.max_members ?? PLAN_DETAILS[editingOrg.plan]?.defaultMaxMembers ?? 250}
                    onChange={(e) => setEditingOrg({ ...editingOrg, max_members: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Responsável
                  </label>
                  <input
                    type="text"
                    value={editingOrg.owner_name || ''}
                    onChange={(e) => setEditingOrg({ ...editingOrg, owner_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    WhatsApp Cobrança
                  </label>
                  <input
                    type="text"
                    value={editingOrg.owner_phone || ''}
                    onChange={(e) => setEditingOrg({ ...editingOrg, owner_phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Notas de Negociação & Faturamento
                </label>
                <textarea
                  rows={2}
                  value={editingOrg.notes || ''}
                  onChange={(e) => setEditingOrg({ ...editingOrg, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingOrg(null)}
                  className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSManagementModule;

