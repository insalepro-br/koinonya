
import React, { useEffect, useState } from 'react';
import { Shield, Mail, Key, User, Church as ChurchIcon, ArrowRight, Eye, EyeOff, CheckCircle2, Info, X, Check, ArrowLeft } from 'lucide-react';
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
  const [step, setStep] = useState(0);
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

  // Cadastro em etapas. Com sessão já autenticada (Google) a etapa de conta é pulada.
  type StepId = 'conta' | 'igreja' | 'confirmar';
  const steps: { id: StepId; label: string }[] = [
    ...(sessionEmail ? [] : [{ id: 'conta' as const, label: 'Conta' }]),
    { id: 'igreja', label: 'Igreja' },
    { id: 'confirmar', label: 'Confirmar' },
  ];
  const currentStep = steps[Math.min(step, steps.length - 1)].id;
  const isLastStep = step >= steps.length - 1;
  useEffect(() => { setStep(0); }, [mode, sessionEmail]);

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

    // Etapas intermediárias: o navegador já validou os campos visíveis; só avança.
    if (mode === 'register' && !isLastStep) {
      setStep(step + 1);
      return;
    }

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

  const googleButton = (
    <>
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

      <div className="relative mb-6 text-center">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-100 dark:border-slate-700"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white dark:bg-slate-800 px-4 text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">ou use seu e-mail</span>
        </div>
      </div>
    </>
  );

  const inputBase = 'w-full py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-white text-sm';

  const emailField = (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">E-mail</label>
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-500" />
        <input
          type="email" required
          className={`${inputBase} pl-12 pr-6 disabled:opacity-50`}
          placeholder="seu@email.com"
          value={form.email}
          onChange={e => setForm({...form, email: e.target.value})}
          disabled={!!sessionEmail}
        />
      </div>
    </div>
  );

  const passwordField = (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Senha</label>
      <div className="relative">
        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-500" />
        <input
          type={showPass ? 'text' : 'password'} required minLength={mode === 'register' ? 8 : undefined}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          className={`${inputBase} pl-12 pr-14`}
          placeholder="••••••••"
          value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
        />
        <button
          type="button"
          onClick={() => setShowPass(!showPass)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  const submitLabel = mode === 'login' ? 'Entrar no Sistema' : isLastStep ? 'Finalizar Registro' : 'Continuar';

  return (
    <div className="relative h-[100dvh] bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/20 dark:bg-indigo-500/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 dark:bg-blue-500/10 blur-[120px] rounded-full"></div>

      {/* Rolagem invisível: o cartão mantém o tamanho e, em telas muito baixas, rola por dentro. */}
      <div className="relative z-10 h-full overflow-y-auto scrollbar-hide">
        <div className="min-h-full flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-[48px] shadow-2xl border border-slate-100 dark:border-slate-700 p-10 md:p-14">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-none animate-in zoom-in duration-500">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Koinonya</h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[8px] mt-2">Ecosystem de Crescimento</p>
            </div>

            <div className="flex p-1 bg-slate-50 dark:bg-slate-900 rounded-2xl mb-6">
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

            {/* Linha do tempo do cadastro */}
            {mode === 'register' && (
              <ol className="flex items-start mb-6" aria-label="Etapas do cadastro">
                {steps.map((st, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <li key={st.id} className="flex-1 flex flex-col items-center relative">
                      {i > 0 && (
                        <span
                          aria-hidden="true"
                          className={`absolute top-3 right-1/2 w-full h-0.5 -translate-y-1/2 ${i <= step ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                        />
                      )}
                      <button
                        type="button"
                        disabled={!done}
                        onClick={() => setStep(i)}
                        aria-current={active ? 'step' : undefined}
                        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                          done ? 'bg-indigo-600 text-white cursor-pointer'
                          : active ? 'bg-white dark:bg-slate-800 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-100 dark:ring-indigo-900/40'
                          : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-500'
                        }`}
                      >
                        {done ? <Check className="w-3 h-3" /> : i + 1}
                      </button>
                      <span className={`mt-2 text-[8px] font-black uppercase tracking-widest ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{st.label}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl animate-in fade-in slide-in-from-top-1">
                  <div className="flex gap-3">
                    <X className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                    <p className="text-[10px] font-bold text-red-800 dark:text-red-200 uppercase leading-tight">{error}</p>
                  </div>
                </div>
              )}

              {info && !error && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200 leading-snug">{info}</p>
                  </div>
                </div>
              )}

              {sessionEmail && !error && mode === 'register' && currentStep === 'igreja' && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl">
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-indigo-800 dark:text-indigo-200 uppercase leading-none">Conectado com Sucesso</p>
                      <p className="text-[9px] text-indigo-700 dark:text-indigo-400 mt-1">Você entrou como {sessionEmail}. Agora, finalize os dados da sua igreja.</p>
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

              {/* Entrar */}
              {mode === 'login' && (
                <>
                  {googleButton}
                  {emailField}
                  {passwordField}
                </>
              )}

              {/* Cadastro, etapa 1: conta */}
              {mode === 'register' && currentStep === 'conta' && (
                <>
                  {googleButton}
                  {emailField}
                  {passwordField}
                </>
              )}

              {/* Cadastro, etapa 2: líder e igreja */}
              {mode === 'register' && currentStep === 'igreja' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Líder</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-500" />
                      <input
                        type="text" required
                        className={`${inputBase} pl-12 pr-6`}
                        placeholder="Seu nome"
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome da Organização</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-500" />
                      <input
                        type="text" required
                        className={`${inputBase} pl-12 pr-6`}
                        placeholder="Ex: Ministério Global"
                        value={form.orgName}
                        onChange={e => setForm({...form, orgName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Primeira Igreja</label>
                    <div className="relative">
                      <ChurchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-500" />
                      <input
                        type="text" required
                        className={`${inputBase} pl-12 pr-6`}
                        placeholder="Nome da Igreja"
                        value={form.churchName}
                        onChange={e => setForm({...form, churchName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Plano de Acesso</label>
                    <select
                      className={`${inputBase} px-6 outline-none appearance-none`}
                      value={form.plan}
                      onChange={e => setForm({...form, plan: e.target.value as SubscriptionPlan})}
                    >
                      <option value={SubscriptionPlan.IGREJA}>Individual (Igreja)</option>
                      <option value={SubscriptionPlan.MULTI}>Multi-Igrejas (Multi)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Cadastro, etapa 3: confirmação */}
              {mode === 'register' && currentStep === 'confirmar' && (
                <>
                  <dl className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[10px]">
                    <dt className="font-black uppercase text-slate-400">E-mail</dt>
                    <dd className="font-bold text-slate-700 dark:text-slate-200 truncate">{sessionEmail || form.email}</dd>
                    <dt className="font-black uppercase text-slate-400">Líder</dt>
                    <dd className="font-bold text-slate-700 dark:text-slate-200 truncate">{form.name}</dd>
                    <dt className="font-black uppercase text-slate-400">Organização</dt>
                    <dd className="font-bold text-slate-700 dark:text-slate-200 truncate">{form.orgName}</dd>
                    <dt className="font-black uppercase text-slate-400">Igreja</dt>
                    <dd className="font-bold text-slate-700 dark:text-slate-200 truncate">{form.churchName}</dd>
                  </dl>
                  <div className="py-4 px-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <label className="flex items-start gap-4 cursor-pointer">
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 transition-all"
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
                </>
              )}

              <div className="flex gap-3 pt-2">
                {mode === 'register' && step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    disabled={loading}
                    aria-label="Voltar"
                    className="px-6 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-[24px] hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95 uppercase tracking-[0.2em] text-[10px] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {submitLabel}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {loading && (
                <p className="text-center text-[9px] text-slate-400 mt-2 animate-pulse uppercase font-bold tracking-widest">Processando... Por favor, aguarde.</p>
              )}
            </form>

            <div className="mt-6 flex items-center justify-center gap-2">
              <Info className="w-3 h-3 text-slate-300 dark:text-slate-500" />
              <p className="text-center text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                Ambiente Seguro & Protegido
              </p>
            </div>
            <p className="mt-3 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
              <a href="/termos" target="_blank" rel="noopener" className="underline hover:text-indigo-600 dark:hover:text-indigo-400">Termos de Uso</a>
              <span className="mx-2" aria-hidden="true">·</span>
              <a href="/privacidade" target="_blank" rel="noopener" className="underline hover:text-indigo-600 dark:hover:text-indigo-400">Privacidade</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
