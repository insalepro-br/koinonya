
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Shield, Mail, Key, User, Church as ChurchIcon, ArrowRight, Eye, EyeOff, CheckCircle2, Info, X } from 'lucide-react';
import { SystemUser, SubscriptionPlan } from '../types';
import { KoinoniaDB } from '../services/db';
import { supabase } from '../lib/supabase';

interface LoginScreenProps {
  onLogin: (user: SystemUser) => void;
}

/** Mensagens do Supabase Auth em português, sem revelar se um e-mail já tem conta. */
function authErrorMessage(err: any): string {
  switch (err?.code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.';
    case 'email_not_confirmed':
      return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
    case 'weak_password':
      return 'Senha fraca: use pelo menos 8 caracteres.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    case 'validation_failed':
      return 'Dados inválidos. Confira o e-mail informado.';
    case 'signup_disabled':
      return 'Novos cadastros estão desativados no momento.';
    default:
      return err?.message || 'Falha na autenticação ou no cadastro.';
  }
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    orgName: '',
    churchName: '',
    plan: SubscriptionPlan.IGREJA,
    lgpdConsent: false
  });

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // E-mail da sessão já autenticada (Google ou e-mail confirmado) que ainda não tem perfil.
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const finishOnboarding = async (data: { orgName: string; churchName: string; userName: string; plan: string }) => {
    const profile = await KoinoniaDB.onboardOrganization(data);
    // Limpa os dados de cadastro pendentes guardados no signUp.
    await supabase.auth.updateUser({ data: { pending_org_name: null, pending_church_name: null, pending_plan: null } }).catch(() => undefined);
    onLogin(profile);
  };

  // Sessão sem perfil: voltou do Google ou entrou depois de confirmar o e-mail.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user || cancelled) return;

      const existing = await KoinoniaDB.getMyProfile().catch(() => null);
      if (cancelled) return;
      if (existing) {
        onLogin(existing);
        return;
      }

      setSessionEmail(user.email ?? null);
      const meta = (user.user_metadata || {}) as Record<string, string | undefined>;
      // Cadastro iniciado por e-mail/senha: os dados da organização ficaram no signUp.
      if (meta.pending_org_name && meta.pending_church_name) {
        setLoading(true);
        try {
          await finishOnboarding({
            orgName: meta.pending_org_name,
            churchName: meta.pending_church_name,
            userName: meta.full_name || user.email || 'Responsável',
            plan: meta.pending_plan || SubscriptionPlan.IGREJA,
          });
          return;
        } catch (err: any) {
          if (!cancelled) setError(authErrorMessage(err));
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      setMode('register');
      setForm(prev => ({
        ...prev,
        name: meta.full_name || meta.name || prev.name,
        email: user.email || prev.email,
      }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleLogin = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    // Redireciona para o Google e volta para o app; a sessão é tratada no retorno.
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      setError('Falha no login com Google: ' + authErrorMessage(oauthError));
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionEmail(null);
    setMode('login');
    setInfo(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setInfo(null);

    try {
      setLoading(true);
      if (mode === 'register') {
        if (!form.lgpdConsent) {
          setError('Você precisa aceitar os termos da LGPD para continuar.');
          return;
        }
        const onboarding = {
          orgName: form.orgName.trim(),
          churchName: form.churchName.trim(),
          userName: form.name.trim(),
          plan: form.plan,
        };

        // Já autenticado (Google ou e-mail confirmado): só cria a organização.
        if (sessionEmail) {
          await finishOnboarding(onboarding);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: onboarding.userName,
              pending_org_name: onboarding.orgName,
              pending_church_name: onboarding.churchName,
              pending_plan: onboarding.plan,
            },
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          await finishOnboarding(onboarding);
        } else {
          // Confirmação de e-mail obrigatória: a organização é criada no primeiro login.
          setMode('login');
          setForm(prev => ({ ...prev, password: '' }));
          setInfo('Enviamos um link de confirmação para o seu e-mail. Depois de confirmar, entre com seu e-mail e senha para concluir o cadastro.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (signInError) throw signInError;

        const profile = await KoinoniaDB.getMyProfile();
        if (profile) {
          onLogin(profile);
          return;
        }
        const { data: userData } = await supabase.auth.getUser();
        const meta = (userData.user?.user_metadata || {}) as Record<string, string | undefined>;
        if (meta.pending_org_name && meta.pending_church_name) {
          await finishOnboarding({
            orgName: meta.pending_org_name,
            churchName: meta.pending_church_name,
            userName: meta.full_name || form.email,
            plan: meta.pending_plan || SubscriptionPlan.IGREJA,
          });
          return;
        }
        setSessionEmail(userData.user?.email ?? form.email);
        setMode('register');
        setInfo('Conta autenticada. Complete os dados da sua organização para continuar.');
      }
    } catch (err: any) {
      console.error("Auth process error:", err);
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // O cartão se ajusta à altura da tela (sem rolagem): mede o tamanho natural e reduz a escala se não couber.
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    if (!stage || !card) return;
    const fit = () => {
      const avail = stage.clientHeight - 24;
      const natural = card.offsetHeight;
      setFitScale(natural > 0 ? Math.min(1, Math.max(0.5, avail / natural)) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    ro.observe(card);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={stageRef} className="h-[100dvh] bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-6 relative overflow-hidden transition-colors">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/20 dark:bg-indigo-500/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 dark:bg-blue-500/10 blur-[120px] rounded-full"></div>

      <div
        ref={cardRef}
        style={{ transform: `scale(${fitScale})`, transformOrigin: 'center' }}
        className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-[48px] shadow-2xl border border-slate-100 dark:border-slate-700 p-10 md:p-14 relative z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-none animate-in zoom-in duration-500">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Koinonya</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[8px] mt-2 transition-colors">Ecosystem de Crescimento</p>
        </div>

        <div className="flex p-1 bg-slate-50 dark:bg-slate-900 rounded-2xl mb-8">
          <button 
            onClick={() => setMode('login')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'login' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
          >
            Entrar
          </button>
          <button 
            onClick={() => setMode('register')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'register' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
          >
            Criar Conta
          </button>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-[20px] font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 mb-6 text-[10px] uppercase tracking-wider"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Entrar com Google
        </button>

        <div className="relative mb-8 text-center">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-100 dark:border-slate-700"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white dark:bg-slate-800 px-4 text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">ou use seu e-mail</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl mb-4 animate-in fade-in slide-in-from-top-1">
              <div className="flex gap-3">
                <X className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-[10px] font-bold text-red-800 dark:text-red-200 uppercase leading-tight">{error}</p>
              </div>
            </div>
          )}

          {info && !error && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl mb-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200 leading-snug">{info}</p>
              </div>
            </div>
          )}

          {sessionEmail && !error && mode === 'register' && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl mb-4">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-indigo-800 dark:text-indigo-200 uppercase leading-none">Conectado com Sucesso</p>
                  <p className="text-[9px] text-indigo-700 dark:text-indigo-400 mt-1">Você entrou como {sessionEmail}. Agora, finalize os dados da sua igreja abaixo.</p>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-2 text-[9px] font-black text-slate-400 underline uppercase"
                  >
                    Usar outra conta
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Líder</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" required
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-white text-sm" 
                    placeholder="Seu nome"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome da Organização</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" required
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-white text-sm" 
                    placeholder="Ex: Ministério Global"
                    value={form.orgName}
                    onChange={e => setForm({...form, orgName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Primeira Igreja</label>
                <div className="relative">
                  <ChurchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" required
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-white text-sm" 
                    placeholder="Nome da Igreja"
                    value={form.churchName}
                    onChange={e => setForm({...form, churchName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Plano de Acesso</label>
                <select 
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-white text-sm outline-none appearance-none"
                  value={form.plan}
                  onChange={e => setForm({...form, plan: e.target.value as SubscriptionPlan})}
                >
                  <option value={SubscriptionPlan.IGREJA}>Individual (Igreja)</option>
                  <option value={SubscriptionPlan.MULTI}>Multi-Igrejas (Multi)</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                type="email" required
                className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-white text-sm disabled:opacity-50" 
                placeholder="seu@email.com"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                disabled={!!sessionEmail}
              />
            </div>
          </div>

          {!sessionEmail && (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Senha</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type={showPass ? 'text' : 'password'} required minLength={mode === 'register' ? 8 : undefined}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="w-full pl-12 pr-14 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-white text-sm" 
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                />
                <button 
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="py-4 px-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
              <label className="flex items-start gap-4 cursor-pointer">
                <div className="pt-1">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                    checked={form.lgpdConsent}
                    onChange={e => setForm({...form, lgpdConsent: e.target.checked})}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                    Concordo com os Termos de Uso e Política de Privacidade (LGPD).
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1 font-medium">Seus dados serão processados de forma segura e apenas para fins de gestão ministerial.</p>
                </div>
              </label>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95 mt-6 uppercase tracking-[0.2em] text-[10px] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                {mode === 'login' ? 'Entrar no Sistema' : 'Finalizar Registro'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {loading && (
            <p className="text-center text-[9px] text-slate-400 mt-2 animate-pulse uppercase font-bold tracking-widest">Processando... Por favor, aguarde.</p>
          )}
        </form>

        <div className="mt-8 flex items-center justify-center gap-2">
           <Info className="w-3 h-3 text-slate-300" />
           <p className="text-center text-slate-400 text-[9px] font-bold uppercase tracking-wider">
             Ambiente Seguro & Protegido
           </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;