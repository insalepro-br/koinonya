import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold">
          <Smartphone className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Aplicativo instalado neste dispositivo</span>
        </div>
      );
    }
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          variant === 'card'
            ? 'inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/25 transition-all whitespace-nowrap shrink-0'
            : 'flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0'
        }
        title="Instalar Koinonya como aplicativo no dispositivo"
      >
        <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className={variant === 'header' ? 'hidden lg:inline' : ''}>Instalar App</span>
      </button>
    );
  }

  // Fallback for iOS Safari or desktop browsers where beforeinstallprompt is not emitted yet
  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuideModal(true)}
        className={
          variant === 'card'
            ? 'inline-flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all whitespace-nowrap shrink-0'
            : 'flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-2xl text-xs font-bold transition-all whitespace-nowrap shrink-0'
        }
        title={isIOS ? 'Como instalar no iPhone/iPad' : 'Instalar Koinonya App'}
      >
        <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className={variant === 'header' ? 'hidden xl:inline' : ''}>
          {isIOS ? 'Instalar no iOS' : 'App Mobile'}
        </span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Instalar Koinonya no Dispositivo
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Acesso rápido em tela cheia via koinonya.app
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                  <Share className="w-4 h-4 text-indigo-600 shrink-0" />
                  1. Toque no botão Compartilhar na barra do Safari.
                </p>
                <p className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                  <PlusSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  2. Role e toque em "Adicionar à Tela de Início".
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  3. Confirme em "Adicionar" para abrir o Koinonya como aplicativo nativo.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="font-bold text-slate-800 dark:text-white">
                  No Chrome / Edge / Android:
                </p>
                <p>
                  1. Abra o menu do navegador (ícone de instalação na barra de endereços ou 3 pontos).
                </p>
                <p>
                  2. Selecione <strong>"Instalar aplicativo Koinonya"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[120] flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg border border-amber-500">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Modo Offline — Exibindo dados em cache</span>
    </div>
  );
};
