import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Printer, 
  QrCode, 
  Tv, 
  Sparkles, 
  Church as ChurchIcon,
  Share2
} from 'lucide-react';
import { Church, Organization } from '../types';

interface VisitorQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  church: Church | null;
  organization: Organization | null;
}

const VisitorQrModal: React.FC<VisitorQrModalProps> = ({
  isOpen,
  onClose,
  church,
  organization
}) => {
  const [copied, setCopied] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const presenterCanvasRef = useRef<HTMLCanvasElement>(null);

  const churchId = church?.id || 'default';
  const orgId = organization?.id || church?.org_id || 'default';

  // Construct shareable public check-in URL
  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?checkin=true&churchId=${churchId}&orgId=${orgId}`
    : '';

  useEffect(() => {
    if (isOpen && canvasRef.current && publicUrl) {
      QRCode.toCanvas(canvasRef.current, publicUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error("Error generating QR code:", err);
      });
    }
  }, [isOpen, publicUrl]);

  useEffect(() => {
    if (isPresenting && presenterCanvasRef.current && publicUrl) {
      QRCode.toCanvas(presenterCanvasRef.current, publicUrl, {
        width: 360,
        margin: 2,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error("Error generating presenter QR code:", err);
      });
    }
  }, [isPresenting, publicUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = publicUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadQr = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `qrcode-visitantes-${(church?.name || 'igreja').toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleOpenTest = () => {
    window.open(publicUrl, '_blank', 'noopener,noreferrer');
  };

  // FULLSCREEN PRESENTER / TELÃO VIEW
  if (isPresenting) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-950 text-white flex flex-col items-center justify-between p-8 sm:p-12 animate-in fade-in duration-300">
        <div className="w-full flex justify-between items-center max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg">
              <ChurchIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">{church?.name || 'Comunidade de Fé'}</h2>
              <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Momento de Boas-Vindas</p>
            </div>
          </div>
          <button 
            onClick={() => setIsPresenting(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
          >
            Fechar Telão (ESC)
          </button>
        </div>

        <div className="max-w-2xl text-center space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/40 rounded-full text-indigo-300 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Ficha Digital de Visitantes</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Seja Muito Bem-Vindo(a)!
          </h1>

          <p className="text-lg text-slate-300 font-medium max-w-lg mx-auto">
            Aponte a câmera do seu celular para o QR Code abaixo para preencher nossa ficha e orarmos por você:
          </p>

          <div className="inline-block p-6 bg-white rounded-[32px] shadow-2xl shadow-indigo-500/20 border-4 border-indigo-500/40">
            <canvas ref={presenterCanvasRef} className="rounded-xl" />
          </div>

          <p className="text-xs text-slate-500 font-mono">
            {publicUrl}
          </p>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Koinonya ChMS • Sistema de Gestão de Visitantes e Crescimento
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[36px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-indigo-50/50 dark:bg-slate-800/80 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Ficha Pública de Visitantes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                QR Code & Link de Recepção sem Login
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[80vh] scrollbar-thin text-center">
          
          <div className="space-y-1">
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-wider">
              {church?.name || 'Sua Igreja'}
            </span>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Projete no telão ou imprima para a equipe de recepção
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              O visitante aponta a câmera do celular no culto e preenche a ficha diretamente no navegador, sem precisar instalar nenhum aplicativo.
            </p>
          </div>

          {/* QR Code Canvas */}
          <div className="inline-block p-4 bg-white rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700">
            <canvas ref={canvasRef} className="rounded-xl" />
          </div>

          {/* Link Box */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="bg-transparent text-xs text-slate-600 dark:text-slate-300 font-mono outline-none flex-1 truncate select-all"
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setIsPresenting(true)}
              className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <Tv className="w-4 h-4" />
              <span>Modo Telão</span>
            </button>

            <button
              onClick={handleDownloadQr}
              className="p-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Baixar PNG</span>
            </button>

            <button
              onClick={handleOpenTest}
              className="col-span-2 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink className="w-4 h-4 text-indigo-500" />
              <span>Abrir Ficha em Nova Aba (Testar)</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default VisitorQrModal;
