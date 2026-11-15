import React, { useState } from 'react';
import {
  Ban,
  Copy,
  Check,
  MessageSquare,
  LogOut,
  CreditCard,
  ShieldAlert,
  Calendar,
  QrCode
} from 'lucide-react';
import { Organization, SaaSInvoice, SystemUser } from '../types';

interface SubscriptionGateProps {
  organization: Organization;
  currentUser: SystemUser | null;
  invoices: SaaSInvoice[];
  onLogout: () => void;
}

const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
  organization,
  currentUser,
  invoices,
  onLogout
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openInvoices = invoices.filter(
    inv => inv.status === 'PENDING' || inv.status === 'OVERDUE'
  );
  const isCanceled = organization.subscription_status === 'CANCELED';

  const handleCopyPix = async (inv: SaaSInvoice) => {
    const code = inv.pix_code || 'financeiro@koinonya.app';
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleWhatsAppSupport = () => {
    const msg = encodeURIComponent(
      `Olá, equipe Koinonya! Sou ${currentUser?.name || 'responsável'} da igreja "${organization.name}" (ID: ${organization.id}). ` +
      `Gostaria de regularizar nossa assinatura para reativar o acesso.`
    );
    window.open(`https://wa.me/5511999999999?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 font-inter">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-[36px] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        <div className="p-8 sm:p-10 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
              {isCanceled ? <Ban className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
            </div>
            <div>
              <span className="inline-block px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase tracking-wider mb-2">
                {isCanceled ? 'Assinatura Cancelada' : 'Acesso Temporariamente Suspenso'}
              </span>
              <h1 className="text-2xl font-black tracking-tight">
                {organization.name}
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                {isCanceled
                  ? 'Esta assinatura foi encerrada. Seus dados históricos permanecem preservados com segurança.'
                  : 'Identificamos pendência financeira na assinatura. Regularize abaixo para liberar o acesso imediatamente.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Conta</span>
          </button>
        </div>

        <div className="p-8 sm:p-10 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Plano Contratado</p>
              <p className="text-sm font-black text-slate-800 dark:text-white mt-1">{organization.plan || 'IGREJA'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Mensalidade</p>
              <p className="text-sm font-black text-slate-800 dark:text-white mt-1 tabular-nums">
                {(organization.monthly_price ?? 149).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Chave PIX Oficial</p>
              <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                financeiro@koinonya.app
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Faturas em Aberto ({openInvoices.length})</span>
              </h2>
            </div>

            {openInvoices.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                Nenhuma fatura avulsa vinculada. Utilize a chave PIX <strong className="text-slate-700 dark:text-slate-200">financeiro@koinonya.app</strong> ou acione o suporte financeiro pelo WhatsApp para liberação imediata.
              </div>
            ) : (
              <div className="space-y-3">
                {openInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums">
                          {inv.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${
                            inv.status === 'OVERDUE'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {inv.status === 'OVERDUE' ? 'Vencida' : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Ref. {inv.reference_month} • Vencimento {new Date(inv.due_date).toLocaleDateString('pt-BR')}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyPix(inv)}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0"
                    >
                      {copiedId === inv.id ? <Check className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                      <span>{copiedId === inv.id ? 'PIX Copiado!' : 'Copiar PIX'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Já realizou o pagamento? Envie o comprovante para reativação instantânea.
            </p>
            <button
              type="button"
              onClick={handleWhatsAppSupport}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all whitespace-nowrap shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Enviar Comprovante no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionGate;
