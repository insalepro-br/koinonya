import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  HeartHandshake,
  UserPlus,
  CheckCircle2,
  ArrowLeft,
  Church as ChurchIcon,
  Download,
  Loader2,
  Send,
  Phone,
  Mail,
  User,
  Lock
} from 'lucide-react';
import { Church, ChurchEvent, EventRegistration, PrayerCategory } from '../types';
import { KoinoniaDB } from '../services/db';
import PublicVisitorCheckin from './PublicVisitorCheckin';

interface PublicChurchPortalProps {
  churchId?: string;
  orgId?: string;
  onExitPortal?: () => void;
}

const CATEGORY_LABELS: Record<ChurchEvent['category'], string> = {
  CONFERENCE: 'Conferência',
  RETREAT: 'Retiro / Encontro',
  BAPTISM: 'Batismo nas Águas',
  COURSE: 'Curso / Escola',
  WORKSHOP: 'Workshop',
  SPECIAL_SERVICE: 'Culto Especial'
};

const PRAYER_CATEGORIES: { id: PrayerCategory; label: string }[] = [
  { id: 'HEALTH', label: 'Saúde e Cura' },
  { id: 'FAMILY', label: 'Família e Casamento' },
  { id: 'FINANCE', label: 'Provisão e Trabalho' },
  { id: 'SPIRITUAL', label: 'Vida Espiritual' },
  { id: 'THANKSGIVING', label: 'Agradecimento / Testemunho' },
  { id: 'OTHER', label: 'Outro Motivo' }
];

const formatCurrencyBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const PublicChurchPortal: React.FC<PublicChurchPortalProps> = ({
  churchId: propChurchId,
  orgId: propOrgId,
  onExitPortal
}) => {
  const [churchId] = useState<string>(() => {
    if (propChurchId) return propChurchId;
    const params = new URLSearchParams(window.location.search);
    return params.get('churchId') || params.get('church') || 'default';
  });

  const [orgId, setOrgId] = useState<string>(() => {
    if (propOrgId) return propOrgId;
    const params = new URLSearchParams(window.location.search);
    return params.get('orgId') || params.get('org') || 'default';
  });

  const [activeSection, setActiveSection] = useState<'events' | 'prayer' | 'visitor'>('events');
  const [church, setChurch] = useState<Church | null>(null);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Registration state
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regNotes, setRegNotes] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [confirmedTicket, setConfirmedTicket] = useState<EventRegistration | null>(null);
  const ticketCanvasRef = useRef<HTMLCanvasElement>(null);

  // Prayer state
  const [prayerName, setPrayerName] = useState('');
  const [prayerPhone, setPrayerPhone] = useState('');
  const [prayerCategory, setPrayerCategory] = useState<PrayerCategory>('SPIRITUAL');
  const [prayerUrgency, setPrayerUrgency] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [prayerPrivacy, setPrayerPrivacy] = useState<'LEADERS_ONLY' | 'PASTOR_CONFIDENTIAL' | 'PUBLIC_CHURCH'>('LEADERS_ONLY');
  const [prayerText, setPrayerText] = useState('');
  const [submittingPrayer, setSubmittingPrayer] = useState(false);
  const [prayerSubmitted, setPrayerSubmitted] = useState(false);
  const [prayerError, setPrayerError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (churchId && churchId !== 'default') {
          const c = await KoinoniaDB.getPublicChurch(churchId);
          if (active && c) {
            setChurch(c);
            if (c.org_id && orgId === 'default') {
              setOrgId(c.org_id);
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar dados públicos da igreja:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [churchId, orgId]);

  useEffect(() => {
    if (!orgId || orgId === 'default') return;
    const unsub = KoinoniaDB.subscribePublicChurchEvents(orgId, (loaded) => {
      setEvents(loaded.filter(ev => ev.active !== false));
    });
    return () => unsub();
  }, [orgId]);

  useEffect(() => {
    if (confirmedTicket && ticketCanvasRef.current) {
      const payload = `KOINONYA:TICKET:${confirmedTicket.ticket_code}:${confirmedTicket.event_id}:${confirmedTicket.participant_name}`;
      QRCode.toCanvas(ticketCanvasRef.current, payload, {
        width: 190,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      }).catch(err => console.error('QR error:', err));
    }
  }, [confirmedTicket]);

  const formatPhoneInput = (val: string) => {
    let v = val.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    if (v.length > 6) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length > 0) return `(${v}`;
    return v;
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setRegError(null);

    if (regName.trim().length < 2) {
      setRegError('Informe seu nome completo para emissão do ingresso.');
      return;
    }
    if (regPhone.replace(/\D/g, '').length < 10) {
      setRegError('Informe um WhatsApp válido com DDD.');
      return;
    }

    setSubmittingReg(true);
    try {
      const ticket = await KoinoniaDB.submitPublicEventRegistration({
        org_id: selectedEvent.org_id || orgId,
        church_id: selectedEvent.church_id || church?.id || churchId,
        event_id: selectedEvent.id,
        event_title: selectedEvent.title,
        participant_name: regName,
        participant_phone: regPhone,
        participant_email: regEmail,
        registration_fee: selectedEvent.registration_fee,
        notes: regNotes
      });
      setConfirmedTicket(ticket);
      setSelectedEvent(null);
      setRegName('');
      setRegPhone('');
      setRegEmail('');
      setRegNotes('');
    } catch (err: any) {
      setRegError(err?.message || 'Não foi possível concluir sua inscrição. Tente novamente.');
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleDownloadTicketPng = () => {
    if (!ticketCanvasRef.current || !confirmedTicket) return;
    const link = document.createElement('a');
    link.download = `ingresso-${confirmedTicket.ticket_code}.png`;
    link.href = ticketCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleSubmitPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrayerError(null);

    if (prayerName.trim().length < 2) {
      setPrayerError('Informe seu nome para que possamos orar por você.');
      return;
    }
    if (prayerText.trim().length < 4) {
      setPrayerError('Escreva seu pedido de oração com pelo menos uma frase.');
      return;
    }

    setSubmittingPrayer(true);
    try {
      await KoinoniaDB.submitPublicPrayerRequest({
        org_id: church?.org_id || orgId,
        church_id: church?.id || churchId,
        requester_name: prayerName,
        requester_phone: prayerPhone,
        category: prayerCategory,
        urgency: prayerUrgency,
        privacy: prayerPrivacy,
        request_text: prayerText
      });
      setPrayerSubmitted(true);
      setPrayerText('');
    } catch (err: any) {
      setPrayerError(err?.message || 'Erro ao enviar pedido de oração.');
    } finally {
      setSubmittingPrayer(false);
    }
  };

  if (activeSection === 'visitor') {
    return (
      <PublicVisitorCheckin
        churchId={church?.id || churchId}
        orgId={church?.org_id || orgId}
        onExitCheckin={() => setActiveSection('events')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 overflow-hidden">
              {church?.logo_url ? (
                <img src={church.logo_url} alt={church.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <ChurchIcon className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {church?.name || 'Portal da Comunidade'}
              </h1>
              <p className="text-xs text-slate-500 truncate">
                {church?.city ? `${church.city}${church.state ? `/${church.state}` : ''}` : 'Koinonya • Portal do Membro e Visitante'}
              </p>
            </div>
          </div>

          {onExitPortal && (
            <button
              onClick={onExitPortal}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Sistema</span>
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Intro + Navigation Tabs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Portal da Igreja
            </h2>
            <p className="text-sm text-slate-600">
              Inscreva-se nos próximos eventos, envie pedidos de oração ou registre sua visita.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveSection('events')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeSection === 'events'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Eventos ({events.length})</span>
            </button>
            <button
              onClick={() => {
                setPrayerSubmitted(false);
                setActiveSection('prayer');
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeSection === 'prayer'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Pedir Oração</span>
            </button>
            <button
              onClick={() => setActiveSection('visitor')}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sou Visitante</span>
            </button>
          </div>
        </div>

        {/* CONFIRMED TICKET VIEW */}
        {confirmedTicket && (
          <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shrink-0 text-center space-y-2">
              <canvas ref={ticketCanvasRef} className="mx-auto rounded-lg" />
              <p className="font-mono text-xs font-bold text-slate-700 tabular-nums">
                {confirmedTicket.ticket_code}
              </p>
            </div>

            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-700 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Inscrição confirmada com sucesso</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{confirmedTicket.event_title}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Participante: <strong className="text-slate-900">{confirmedTicket.participant_name}</strong>
                  {' · '}
                  <span className="tabular-nums">{confirmedTicket.participant_phone}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1 tabular-nums">
                  {confirmedTicket.payment_status === 'FREE'
                    ? 'Inscrição gratuita — apresente este QR Code na recepção do evento.'
                    : `Taxa de ${formatCurrencyBRL(confirmedTicket.amount_paid)} • Pagamento pendente na recepção ou secretaria.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <button
                  onClick={handleDownloadTicketPng}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar QR Code PNG</span>
                </button>
                <button
                  onClick={() => setConfirmedTicket(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Fechar comprovante
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EVENTS SECTION */}
        {activeSection === 'events' && (
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 flex items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span className="text-sm font-medium">Carregando programação da igreja...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-2">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">Nenhum evento aberto no momento</h3>
                <p className="text-sm text-slate-500">
                  Volte em breve ou utilize a aba Pedir Oração para enviar uma intenção pastoral.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((ev) => {
                  const isClosed = ev.status === 'CLOSED' || ev.status === 'COMPLETED' || ev.status === 'FULL';
                  return (
                    <div
                      key={ev.id}
                      className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-indigo-600">
                            {CATEGORY_LABELS[ev.category] || ev.category}
                          </span>
                          <span className="tabular-nums font-semibold text-slate-700">
                            {ev.registration_fee > 0 ? formatCurrencyBRL(ev.registration_fee) : 'Gratuito'}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 leading-snug">
                          {ev.title}
                        </h3>

                        {ev.description && (
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {ev.description}
                          </p>
                        )}

                        <div className="pt-2 space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-center gap-2 tabular-nums">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {ev.start_date.toLocaleDateString('pt-BR', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                            <span aria-hidden="true">·</span>
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{ev.start_time || '19:00'}</span>
                          </div>
                          {ev.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{ev.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500 tabular-nums">
                          Capacidade: {ev.capacity} vagas
                        </span>
                        <button
                          disabled={isClosed}
                          onClick={() => {
                            setRegError(null);
                            setSelectedEvent(ev);
                          }}
                          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                            isClosed
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {ev.status === 'FULL'
                            ? 'Vagas Esgotadas'
                            : ev.status === 'CLOSED' || ev.status === 'COMPLETED'
                            ? 'Inscrições Encerradas'
                            : 'Fazer Inscrição'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PRAYER SECTION */}
        {activeSection === 'prayer' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto">
            {prayerSubmitted ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Pedido de oração recebido</h3>
                <p className="text-sm text-slate-600">
                  Sua intenção foi encaminhada para a equipe pastoral e de intercessão. Estamos orando por você!
                </p>
                <button
                  onClick={() => setPrayerSubmitted(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Enviar outro pedido
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitPrayer} className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Pedido de Oração Pastoral</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Compartilhe sua necessidade. Você escolhe o nível de privacidade do pedido.
                  </p>
                </div>

                {prayerError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700">
                    {prayerError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Seu nome</label>
                    <input
                      type="text"
                      required
                      value={prayerName}
                      onChange={e => setPrayerName(e.target.value)}
                      placeholder="Ex: Ana Paula"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">WhatsApp (opcional)</label>
                    <input
                      type="text"
                      value={prayerPhone}
                      onChange={e => setPrayerPhone(formatPhoneInput(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Área</label>
                    <select
                      value={prayerCategory}
                      onChange={e => setPrayerCategory(e.target.value as PrayerCategory)}
                      className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {PRAYER_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Prioridade</label>
                    <select
                      value={prayerUrgency}
                      onChange={e => setPrayerUrgency(e.target.value as 'NORMAL' | 'URGENT')}
                      className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="URGENT">Urgente</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Privacidade</span>
                    </label>
                    <select
                      value={prayerPrivacy}
                      onChange={e => setPrayerPrivacy(e.target.value as any)}
                      className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="LEADERS_ONLY">Líderes e Intercessores</option>
                      <option value="PASTOR_CONFIDENTIAL">Somente Pastores</option>
                      <option value="PUBLIC_CHURCH">Mural da Igreja</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Como podemos orar por você?</label>
                  <textarea
                    rows={4}
                    required
                    value={prayerText}
                    onChange={e => setPrayerText(e.target.value)}
                    placeholder="Escreva seu pedido de oração..."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingPrayer}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {submittingPrayer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{submittingPrayer ? 'Enviando...' : 'Enviar Pedido de Oração'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Registration Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 !mt-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-indigo-600">
                  {CATEGORY_LABELS[selectedEvent.category]}
                </p>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedEvent.title}</h3>
                <p className="text-xs text-slate-500 mt-1 tabular-nums">
                  {selectedEvent.start_date.toLocaleDateString('pt-BR')} · {selectedEvent.start_time} ·{' '}
                  {selectedEvent.registration_fee > 0
                    ? formatCurrencyBRL(selectedEvent.registration_fee)
                    : 'Gratuito'}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2 py-1"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSubmitRegistration} className="p-5 space-y-4">
              {regError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                  {regError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nome completo</span>
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="Nome e sobrenome"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>WhatsApp</span>
                </label>
                <input
                  type="text"
                  required
                  value={regPhone}
                  onChange={e => setRegPhone(formatPhoneInput(e.target.value))}
                  placeholder="(11) 98888-7777"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>E-mail (opcional)</span>
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Observações (opcional)</label>
                <input
                  type="text"
                  value={regNotes}
                  onChange={e => setRegNotes(e.target.value)}
                  placeholder="Ex: tamanho da camiseta, restrição alimentar..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  {submittingReg && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmar Inscrição</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicChurchPortal;
