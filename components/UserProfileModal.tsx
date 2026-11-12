import React, { useState } from 'react';
import { X, Save, User, Mail, Phone, Briefcase, Lock, Shield, Check, Sparkles, Church as ChurchIcon, Activity, AlertCircle } from 'lucide-react';
import { SystemUser, Church, Organization, UserPresenceStatus } from '../types';
import { ROLE_TRANSLATIONS, USER_STATUS_CONFIG } from '../constants';

interface UserProfileModalProps {
  user: SystemUser;
  church?: Church;
  organization?: Organization;
  onSave: (updatedUser: Partial<SystemUser>) => Promise<void> | void;
  onClose: () => void;
}

const AVATAR_COLORS = [
  { id: 'indigo', bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-400' },
  { id: 'purple', bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-400' },
  { id: 'emerald', bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-400' },
  { id: 'blue', bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-400' },
  { id: 'rose', bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-400' },
  { id: 'amber', bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-400' },
];

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  church,
  organization,
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    whatsapp: user.whatsapp || '',
    duty: user.duty || '',
    password: '',
    avatarColor: user.avatar || 'indigo',
    status: (user.status || 'online') as UserPresenceStatus
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (formData.password && formData.password.length < 6) {
      setErrorMsg('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setIsSubmitting(true);
    try {
      const updates: Partial<SystemUser> = {
        name: formData.name.trim(),
        whatsapp: formData.whatsapp.trim(),
        duty: formData.duty.trim(),
        avatar: formData.avatarColor,
        status: formData.status
      };
      if (formData.password) {
        updates.password = formData.password;
      }
      await onSave(updates);
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível atualizar o perfil. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedColorObj = AVATAR_COLORS.find(c => c.id === formData.avatarColor) || AVATAR_COLORS[0];
  const translatedRole = ROLE_TRANSLATIONS[String(user.role)] || user.role || 'Membro';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[36px] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header com Avatar Preview */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-16 h-16 rounded-2xl ${selectedColorObj.bg} ${selectedColorObj.text} flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-100 dark:shadow-none transition-all`}>
                {formData.name?.[0]?.toUpperCase() || user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${USER_STATUS_CONFIG[formData.status]?.dotClass || 'bg-emerald-500'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                  {formData.name || 'Meu Perfil'}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {translatedRole}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {user.email}
              </p>
              {church?.name && (
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <ChurchIcon className="w-3 h-3 text-indigo-500" />
                  <span>{church.name}</span>
                </div>
              )}
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário de Edição */}
        <form onSubmit={handleSubmit} className="p-7 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Perfil atualizado com sucesso! Fechando...</span>
            </div>
          )}

          {/* Status de Presença */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-500" /> Status de Presença
            </label>
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {(Object.keys(USER_STATUS_CONFIG) as (keyof typeof USER_STATUS_CONFIG)[]).map((key) => {
                const cfg = USER_STATUS_CONFIG[key];
                const isSelected = formData.status === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: key })}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-slate-700/80 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${cfg.dotClass} shrink-0 ${isSelected ? 'ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-600' : ''}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white leading-tight truncate">{cfg.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium pl-1">
              {USER_STATUS_CONFIG[formData.status]?.desc || 'Status visível para a equipe.'}
            </p>
          </div>

          {/* Seletor de Estilo do Avatar */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Cor do Avatar de Identificação
            </label>
            <div className="flex items-center gap-2.5 pt-1">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, avatarColor: c.id })}
                  className={`w-7 h-7 rounded-xl ${c.bg} transition-all ${
                    formData.avatarColor === c.id 
                      ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-md' 
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                  title={c.id}
                />
              ))}
            </div>
          </div>

          {/* Nome e E-mail */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3 text-indigo-500" /> Nome Completo
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Pr. Carlos Eduardo"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-indigo-500" /> E-mail
                </label>
                <input
                  type="email"
                  disabled
                  className="w-full px-4 py-3 bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 font-medium text-xs cursor-not-allowed"
                  value={formData.email}
                  title="O e-mail é vinculado à sua conta de autenticação"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-emerald-500" /> WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            {/* Atuação Ministerial */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3 h-3 text-indigo-500" /> Atuação / Ministério
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.duty}
                onChange={e => setFormData({ ...formData, duty: e.target.value })}
                placeholder="Ex: Pastor Titular, Coordenador de Células, Diácono"
              />
            </div>

            {/* Alterar Senha (Opcional) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" /> Alterar Senha de Acesso (Opcional)
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="Deixe em branco para manter a senha atual"
              />
            </div>
          </div>

          {/* Informações adicionais do sistema */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span>Nível de Acesso: <strong className="text-slate-700 dark:text-slate-200">{translatedRole}</strong></span>
            </div>
            {organization?.plan && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black uppercase text-[8px]">
                Plano {organization.plan}
              </span>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Salvar Perfil
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default UserProfileModal;
