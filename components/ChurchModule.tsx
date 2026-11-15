
import React, { useState, useEffect, useRef } from 'react';
import { Church as ChurchIcon, Save, MapPin, Phone, Mail, Camera, Search, Loader2, Trash2, ChevronDown, QrCode, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Church, SystemUser } from '../types';
import { db, doc, getDoc } from '../lib/dataStore';

interface ChurchModuleProps {
  churchId: string;
  team: SystemUser[];
  onSave: (church: Church) => void;
  onOpenVisitorQr?: () => void;
}

const ChurchModule: React.FC<ChurchModuleProps> = ({ churchId, team, onSave, onOpenVisitorQr }) => {
  const [church, setChurch] = useState<Church | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchChurch = async () => {
      const d = await getDoc(doc(db, "churches", churchId));
      if (d.exists()) {
        setChurch({ ...d.data() } as Church);
      }
    };
    fetchChurch();
  }, [churchId]);

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro && church) {
          setChurch({
            ...church,
            cep: cleanCep,
            address: `${data.logradouro}${data.bairro ? ', ' + data.bairro : ''}`,
            city: data.localidade,
            state: data.uf
          });
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (file && church) {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError("A imagem selecionada excede o limite de 2MB. Escolha um arquivo menor.");
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setChurch({
          ...church,
          logo_url: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    if (church) {
      setChurch({ ...church, logo_url: undefined });
      setUploadError(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!church) return;
    onSave(church);
    setIsEditing(false);
    setUploadError(null);
    setSaveFeedback("Dados da igreja atualizados com sucesso.");
    setTimeout(() => setSaveFeedback(null), 4000);
  };


  if (!church) return null;

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full max-w-5xl mx-auto bg-slate-50/50 dark:bg-slate-900/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Minha Igreja</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Dados institucionais da comunidade.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenVisitorQr && (
            <button
              onClick={onOpenVisitorQr}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-black shadow-sm transition-all uppercase tracking-widest text-[9px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
            >
              <QrCode className="w-3.5 h-3.5" /> Ficha de Visitante / QR Code
            </button>
          )}
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`px-5 py-3 rounded-xl font-black shadow-sm transition-all uppercase tracking-widest text-[9px] border ${
              isEditing 
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40' 
                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            {isEditing ? 'Cancelar' : 'Editar Dados'}
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {saveFeedback && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveFeedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center">
            <div className="relative group">
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              <div className="w-28 h-28 bg-indigo-50 dark:bg-indigo-950/40 rounded-[28px] flex items-center justify-center text-indigo-300 border-2 border-dashed border-indigo-200 dark:border-indigo-800 overflow-hidden relative shadow-inner">
                {church.logo_url ? (
                  <img src={church.logo_url} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <ChurchIcon className="w-10 h-10" />
                )}
                {isEditing && church.logo_url && (
                  <button onClick={removeLogo} className="absolute inset-0 bg-rose-500/80 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              {isEditing && (
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all z-10">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-800 dark:text-white text-center">{church.name}</h3>
            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1">Sede Administrativa</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nome da Instituição</label>
                <input 
                  type="text" disabled={!isEditing}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-white disabled:opacity-60 transition-all"
                  value={church.name}
                  onChange={e => setChurch({...church, name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">CEP</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-500" />
                  <input 
                    type="text" disabled={!isEditing} maxLength={9}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-white disabled:opacity-60 transition-all"
                    value={church.cep || ''}
                    onChange={e => {
                      setChurch({...church, cep: e.target.value});
                      handleCepLookup(e.target.value);
                    }}
                  />
                  {isLoadingCep && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Pastor Sênior / Responsável</label>
                <div className="relative">
                  <select 
                    disabled={!isEditing}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-black text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 disabled:opacity-60 transition-all appearance-none outline-none"
                    value={church.pastor_name}
                    onChange={e => setChurch({...church, pastor_name: e.target.value})}
                  >
                    <option value="">Selecione na Equipe</option>
                    {team.map(m => <option key={m.id} value={m.name}>{m.name} ({m.role})</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 dark:text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Endereço Completo</label>
                <input 
                  type="text" disabled={!isEditing}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-white disabled:opacity-60 transition-all"
                  value={church.address}
                  onChange={e => setChurch({...church, address: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">WhatsApp Igreja</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-500" />
                  <input 
                    type="text" disabled={!isEditing}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-white disabled:opacity-60 transition-all"
                    value={church.phone}
                    onChange={e => setChurch({...church, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">E-mail Institucional</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-500" />
                  <input 
                    type="email" disabled={!isEditing}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-white disabled:opacity-60 transition-all"
                    value={church.email}
                    onChange={e => setChurch({...church, email: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
              >
                <Save className="w-5 h-5" /> Salvar Alterações
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChurchModule;
