import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  Church as ChurchIcon, 
  Send, 
  Loader2, 
  Search,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { Church } from '../types';
import { KoinoniaDB } from '../services/db';

interface PublicVisitorCheckinProps {
  churchId?: string;
  orgId?: string;
  onExitCheckin?: () => void;
}

const HOW_MET_OPTIONS = [
  'Convite de um amigo ou familiar',
  'Redes Sociais (Instagram, Facebook)',
  'Google / Pesquisa na Internet',
  'Passei em frente à igreja',
  'Evento especial / Conferência',
  'Outro canal'
];

const PublicVisitorCheckin: React.FC<PublicVisitorCheckinProps> = ({
  churchId: propChurchId,
  orgId: propOrgId,
  onExitCheckin
}) => {
  // Extract IDs from URL if not passed via props
  const [churchId, setChurchId] = useState<string>(() => {
    if (propChurchId) return propChurchId;
    const params = new URLSearchParams(window.location.search);
    return params.get('churchId') || params.get('church') || 'default';
  });

  const [orgId, setOrgId] = useState<string>(() => {
    if (propOrgId) return propOrgId;
    const params = new URLSearchParams(window.location.search);
    return params.get('orgId') || params.get('org') || 'default';
  });

  const [church, setChurch] = useState<Church | null>(null);
  const [loadingChurch, setLoadingChurch] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gender: '',
    cep: '',
    address: '',
    neighborhood: '',
    city: '',
    howMet: '',
    prayerRequest: '',
    familyType: 'alone', // 'alone', 'couple', 'family'
    familyCount: 1,
    familyNotes: '',
    lgpdConsent: true
  });

  // Load church info
  useEffect(() => {
    const loadChurch = async () => {
      if (!churchId || churchId === 'default') {
        setLoadingChurch(false);
        return;
      }
      try {
        const c = await KoinoniaDB.getPublicChurch(churchId);
        if (c) {
          setChurch(c);
          if (c.org_id && orgId === 'default') {
            setOrgId(c.org_id);
          }
        }
      } catch (err) {
        console.warn("Could not load church public profile:", err);
      } finally {
        setLoadingChurch(false);
      }
    };
    loadChurch();
  }, [churchId, orgId]);

  // Phone masking
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    
    if (v.length > 10) {
      v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    } else if (v.length > 6) {
      v = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    } else if (v.length > 2) {
      v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
      v = `(${v}`;
    }
    setFormData(prev => ({ ...prev, phone: v }));
  };

  // CEP lookup
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let clean = e.target.value.replace(/\D/g, '').slice(0, 8);
    const masked = clean.length > 5 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : clean;
    setFormData(prev => ({ ...prev, cep: masked }));

    if (clean.length === 8) {
      setIsLoadingCep(true);
      try {
        const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await resp.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: data.logradouro || prev.address,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade ? `${data.localidade}/${data.uf}` : prev.city
          }));
        }
      } catch (err) {
        console.error("Erro busca CEP:", err);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage('Por favor, informe o seu nome completo.');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Por favor, informe um número de WhatsApp válido com DDD.');
      return;
    }

    if (!formData.lgpdConsent) {
      setErrorMessage('Por favor, confirme a autorização de contato para podermos orar por você.');
      return;
    }

    setIsSubmitting(true);
    try {
      await KoinoniaDB.submitPublicVisitorCheckin({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        gender: formData.gender,
        cep: formData.cep,
        address: formData.address,
        neighborhood: formData.neighborhood,
        city: formData.city,
        howMet: formData.howMet,
        prayerRequest: formData.prayerRequest,
        familyCount: formData.familyType === 'alone' ? 1 : formData.familyCount,
        familyNotes: formData.familyNotes,
        churchId: church?.id || churchId || 'default',
        orgId: church?.org_id || orgId || 'default'
      });

      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Erro ao enviar checkin:", err);
      setErrorMessage(err?.message || 'Ocorreu um erro ao enviar sua ficha. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnotherMember = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      gender: '',
      cep: formData.cep,
      address: formData.address,
      neighborhood: formData.neighborhood,
      city: formData.city,
      howMet: formData.howMet,
      prayerRequest: '',
      familyType: 'alone',
      familyCount: 1,
      familyNotes: '',
      lgpdConsent: true
    });
    setIsSubmitted(false);
    setErrorMessage(null);
  };

  // SUCCESS SCREEN
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-[36px] shadow-2xl p-8 sm:p-10 text-center space-y-6 border border-indigo-50 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-100 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-black uppercase tracking-wider">
              {church?.name || 'Comunidade de Fé'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              Seja muito bem-vindo(a), {formData.name.split(' ')[0]}! 🎉
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Sua ficha foi recebida com muito carinho por nossa liderança pastoral. Estamos muito felizes com a sua presença hoje!
            </p>
          </div>

          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-left space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
              <Heart className="w-4 h-4 text-indigo-600" />
              <span>O que acontece agora?</span>
            </div>
            <p className="text-xs text-indigo-950/80 leading-relaxed">
              Durante a semana, nossa equipe entrará em contato via WhatsApp para saber como você está e orar por suas intenções. Aproveite o culto de hoje!
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleResetForAnotherMember}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              Cadastrar outro familiar / acompanhante
            </button>
            {onExitCheckin && (
              <button
                onClick={onExitCheckin}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Voltar à tela inicial
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 py-8 px-4 sm:px-6 flex flex-col justify-between">
      <div className="w-full max-w-xl mx-auto space-y-6">
        
        {/* Church Header Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {church?.logo_url ? (
              <img 
                src={church.logo_url} 
                alt={church.name} 
                className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-100">
                <ChurchIcon className="w-7 h-7" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Ficha de Boas-Vindas
              </span>
              <h1 className="text-lg font-black text-slate-800 truncate leading-tight">
                {church?.name || 'Igreja da Comunidade'}
              </h1>
              {church?.pastor_name && (
                <p className="text-xs text-slate-400 truncate">
                  Pastores: {church.pastor_name}
                </p>
              )}
            </div>
          </div>

          {onExitCheckin && (
            <button
              onClick={onExitCheckin}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              title="Voltar ao CRM"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Welcome Banner */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl text-white shadow-xl shadow-indigo-200/50 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Estamos felizes com a sua visita!</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            Queremos orar por você e pela sua família
          </h2>
          <p className="text-xs text-indigo-100 leading-relaxed font-medium">
            Preencha seus dados abaixo para que nossa equipe de acolhimento possa te abençoar nesta semana. Leva menos de 1 minuto!
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6">
          
          {/* Section: Identificação */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Seus Dados Pessoais</span>
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">
                Nome Completo *
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">
                  WhatsApp / Telefone *
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="(11) 98888-8888"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">
                  E-mail (opcional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="joao@exemplo.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">
                Sexo / Gênero
              </label>
              <div className="flex gap-2">
                {['Masculino', 'Feminino'].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      formData.gender === g 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Localização */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Onde você mora? (Para conectarmos ao grupo mais próximo)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">
                  CEP (busca automática)
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="12233-680"
                    value={formData.cep}
                    onChange={handleCepChange}
                    className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  {isLoadingCep && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">
                  Bairro / Cidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bosque dos Eucaliptos"
                  value={formData.neighborhood}
                  onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section: Como conheceu & Família */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Sua Visita & Família</span>
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">
                Como conheceu a nossa igreja?
              </label>
              <select
                value={formData.howMet}
                onChange={e => setFormData({ ...formData, howMet: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white appearance-none cursor-pointer"
              >
                <option value="">Selecione uma opção...</option>
                {HOW_MET_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">
                Veio acompanhado(a)?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'alone', label: 'Sozinho(a)' },
                  { id: 'couple', label: 'Em Casal' },
                  { id: 'family', label: 'Com a Família' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, familyType: item.id })}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      formData.familyType === item.id 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {formData.familyType !== 'alone' && (
              <div className="space-y-1 p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-100 animate-in fade-in duration-200">
                <label className="text-[10px] font-black uppercase text-indigo-900 block mb-1">
                  Nomes dos familiares / filhos presentes:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Esposa Carla, filhos Pedro (8) e Sofia (5)"
                  value={formData.familyNotes}
                  onChange={e => setFormData({ ...formData, familyNotes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Section: Pedido de Oração */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Como podemos orar por você hoje?</span>
            </h3>

            <div className="space-y-1">
              <textarea
                rows={3}
                placeholder="Compartilhe aqui se você tem algum pedido especial de oração (família, saúde, trabalho, causas espirituais)..."
                value={formData.prayerRequest}
                onChange={e => setFormData({ ...formData, prayerRequest: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none transition-all"
              />
            </div>
          </div>

          {/* LGPD Consent */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100/70 transition-colors">
              <input
                type="checkbox"
                checked={formData.lgpdConsent}
                onChange={e => setFormData({ ...formData, lgpdConsent: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded mt-0.5 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Autorizo o envio de mensagens de acolhimento e oração pela equipe da igreja via WhatsApp, em conformidade com a LGPD.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando sua ficha...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar Minha Ficha de Boas-Vindas</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 font-medium pb-4">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Seus dados são confidenciais e utilizados apenas para cuidado pastoral.</span>
          </div>
          <span>Koinonya ChMS • Sistema de Gestão e Crescimento de Igrejas</span>
        </div>

      </div>
    </div>
  );
};

export default PublicVisitorCheckin;
