
import React, { useState } from 'react';
import { Shield, Mail, Key, User, Church as ChurchIcon, ArrowRight, Eye, EyeOff, CheckCircle2, Info, X } from 'lucide-react';
import { SystemUser, UserRole, Church, Organization, SubscriptionPlan } from '../types';
import { KoinoniaDB } from '../services/db';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { googleProvider } from '../lib/firebase';

interface LoginScreenProps {
  onLogin: (user: SystemUser) => void;
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

  const handleGoogleLogin = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      console.log("Starting Google Login...");
      const result = await signInWithPopup(auth, googleProvider);
      const uid = result.user.uid;
      
      console.log("Google Login success, checking profile for:", uid);
      const profile = await KoinoniaDB.getUserProfile(uid);
      
      if (profile) {
        console.log("Profile found, logging in...");
        onLogin(profile);
      } else {
        console.log("No profile found, redirecting to registration...");
        setMode('register');
        setForm(prev => ({
          ...prev,
          name: result.user.displayName || '',
          email: result.user.email || ''
        }));
      }
    } catch (err: any) {
      console.error("Google Login record error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site.');
      } else {
        setError('Falha no login com Google: ' + (err.message || 'Erro desconhecido'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    try {
      setLoading(true);
      if (mode === 'register') {
        if (!form.lgpdConsent) {
          setError('Você precisa aceitar os termos da LGPD para continuar.');
          setLoading(false);
          return;
        }

        let uid = auth.currentUser?.uid;
        
        if (!uid) {
           console.log("Creating new user account...");
           const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
           uid = userCredential.user.uid;
        } else {
           console.log("Using existing session user:", uid);
           // If user is already logged in but trying to register, check if they should just login
           const existingProfile = await KoinoniaDB.getUserProfile(uid);
           if (existingProfile) {
             onLogin(existingProfile);
             return;
           }
        }
        
        const orgId = Math.random().toString(36).substr(2, 9);
        const churchId = Math.random().toString(36).substr(2, 9);

        const newOrg: Organization = {
          id: orgId,
          name: form.orgName,
          plan: form.plan,
          owner_id: uid,
          created_at: new Date(),
          active: true,
          lgpd_consent_version: 'v1.0'
        };

        const newChurch: Church = {
          id: churchId,
          org_id: orgId,
          name: form.churchName,
          pastor_name: form.name,
          address: '',
          phone: '',
          email: form.email,
          created_at: new Date()
        };

        const newUser: SystemUser = {
          id: uid,
          name: form.name,
          email: form.email,
          role: UserRole.ADMIN,
          org_id: orgId,
          church_id: churchId,
          permissions: ['all'],
          lgpd_consent_date: new Date()
        };

        console.log("Saving user profile...");
        await KoinoniaDB.saveUserProfile(newUser);
        console.log("Saving organization...");
        await KoinoniaDB.saveOrganization(newOrg);
        console.log("Saving initial church...");
        await KoinoniaDB.saveChurch(newChurch);
        
        console.log("Registration complete, notifying parent...");
        onLogin(newUser);
      } else {
        console.log("Attempting sign in...");
        const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
        console.log("Login auth success, fetching profile...");
        const profile = await KoinoniaDB.getUserProfile(userCredential.user.uid);
        if (profile) {
          onLogin(profile);
        } else {
          setError('Seu usuário foi autenticado, mas o perfil não foi encontrado. Clique em "Criar Conta" para finalizar seu cadastro.');
        }
      }
    } catch (err: any) {
      console.error("Auth process error:", err);
      let msg = "Falha na autenticação ou registro.";
      if (err.code === 'auth/email-already-in-use') {
        msg = "Este e-mail já está sendo usado. Tente fazer login ou use outro e-mail.";
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = "O método de Login por E-mail não está ativado no Firebase Console. Por favor, ative-o em Authentication > Sign-in method.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "O formato do e-mail é inválido.";
      } else if (err.code === 'auth/weak-password') {
        msg = "A senha deve ter pelo menos 6 caracteres.";
      } else if (err.message && err.message.includes('offline')) {
        msg = "O sistema está com dificuldades de conexão (Offline). Isso pode acontecer se o banco de dados ainda estiver sendo criado ou se o navegador estiver bloqueando a conexão dentro do iframe. Tente abrir o app em uma NOVA ABA.";
      } else if (err.message) {
        try {
          const parsed = JSON.parse(err.message);
          msg = `Erro no banco (${parsed.operationType} em ${parsed.path}). Verifique suas permissões.`;
        } catch {
          msg = err.message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden transition-colors">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/20 dark:bg-indigo-500/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 dark:bg-blue-500/10 blur-[120px] rounded-full"></div>

      <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-[48px] shadow-2xl border border-slate-100 dark:border-slate-700 p-10 md:p-14 relative z-10 transition-all">
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
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
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

          {auth.currentUser && !error && mode === 'login' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl mb-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200 uppercase leading-none">Acesso pendente</p>
                  <p className="text-[9px] text-amber-700 dark:text-amber-400 mt-1">Sua conta foi autenticada, mas o perfil ainda não foi carregado. Clique em "Criar Conta" para finalizar seu cadastro.</p>
                  <button 
                    type="button"
                    onClick={() => { setMode('register'); setError(null); }}
                    className="mt-2 text-[9px] font-black text-indigo-600 dark:text-indigo-400 underline uppercase"
                  >
                    Finalizar meu cadastro agora
                  </button>
                  <button 
                    type="button"
                    onClick={() => auth.signOut()}
                    className="mt-2 ml-4 text-[9px] font-black text-slate-400 underline uppercase"
                  >
                    Usar outra conta
                  </button>
                </div>
              </div>
            </div>
          )}

          {auth.currentUser && !error && mode === 'register' && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl mb-4">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-indigo-800 dark:text-indigo-200 uppercase leading-none">Conectado com Sucesso</p>
                  <p className="text-[9px] text-indigo-700 dark:text-indigo-400 mt-1">Você se autenticou via Google ({auth.currentUser.email}). Agora, finalize os dados da sua igreja abaixo.</p>
                </div>
              </div>
            </div>
          )}

          {mode === 'login' && (
             <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-2xl mb-6">
               <div className="flex gap-3">
                 <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                 <div>
                   <p className="text-[9px] font-black text-blue-800 dark:text-blue-200 uppercase tracking-wider">Aviso de Migração</p>
                   <p className="text-[9px] text-blue-600 dark:text-blue-400 mt-1 font-medium leading-relaxed">
                     O sistema migrou para uma base de dados real. Credenciais de teste (admin@koinonya.app) não funcionam. 
                     Clique em <strong>'CRIAR CONTA'</strong> para registrar sua igreja pela primeira vez.
                   </p>
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
                disabled={!!auth.currentUser}
              />
            </div>
          </div>

          {!auth.currentUser && (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Senha</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type={showPass ? 'text' : 'password'} required
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