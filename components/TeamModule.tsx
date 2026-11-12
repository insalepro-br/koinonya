import React, { useState } from 'react';
import { Users, UserPlus, Shield, Mail, Trash2, Edit3, Key, X, Save, Briefcase, ChevronDown, Phone, CheckCircle2, Activity } from 'lucide-react';
import { SystemUser, UserRole, AccessLevel, UserPresenceStatus } from '../types';
import { ROLE_TRANSLATIONS, DEFAULT_ACCESS_LEVELS, USER_STATUS_CONFIG } from '../constants';

interface TeamModuleProps {
  team: SystemUser[];
  accessLevels?: AccessLevel[];
  onSave: (user: Partial<SystemUser>) => void;
  onDelete: (id: string) => void;
}

const TeamModule: React.FC<TeamModuleProps> = ({ 
  team, 
  accessLevels = DEFAULT_ACCESS_LEVELS, 
  onSave, 
  onDelete 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  
  const [formData, setFormData] = useState<Partial<SystemUser>>({
    name: '',
    email: '',
    whatsapp: '',
    password: '',
    role: UserRole.LEADER,
    duty: '',
    status: 'online'
  });

  const openModal = (user?: SystemUser) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        ...user,
        status: user.status || 'online'
      });
    } else {
      setSelectedUser(null);
      setFormData({
        name: '',
        email: '',
        whatsapp: '',
        password: '',
        role: UserRole.LEADER,
        duty: '',
        status: 'online'
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsModalOpen(false);
  };

  const getRoleDisplayName = (role: string | UserRole) => {
    const roleStr = String(role);
    if (ROLE_TRANSLATIONS[roleStr]) {
      return ROLE_TRANSLATIONS[roleStr];
    }
    // Check if custom level matches
    const matched = accessLevels.find(l => l.roleKey === roleStr || l.id === roleStr || l.name === roleStr);
    return matched ? matched.name : roleStr;
  };

  const getRoleBadge = (role: string | UserRole) => {
    const roleStr = String(role);
    const displayName = getRoleDisplayName(role);

    // Look for custom level color
    const matched = accessLevels.find(l => l.roleKey === roleStr || l.id === roleStr || l.name === roleStr);
    if (matched?.color) {
      return (
        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${matched.color} dark:bg-opacity-20`}>
          {displayName}
        </span>
      );
    }

    const styles: Record<string, string> = {
      [UserRole.ADMIN]: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
      [UserRole.PASTOR]: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
      [UserRole.LEADER]: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      [UserRole.VOLUNTEER]: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      [UserRole.RECEPTION]: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      [UserRole.SUPER_ADMIN]: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    };

    const styleClass = styles[roleStr] || 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';

    return (
      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border tracking-wider ${styleClass}`}>
        {displayName}
      </span>
    );
  };

  // Build options list for role selector
  const roleOptions = React.useMemo(() => {
    const list: { key: string; label: string }[] = [];
    
    // Add from accessLevels
    accessLevels.forEach(lvl => {
      const val = lvl.roleKey || lvl.id;
      if (!list.some(item => item.key === val)) {
        list.push({ key: val, label: lvl.name });
      }
    });

    // Ensure standard system roles exist
    Object.values(UserRole).forEach(r => {
      if (!list.some(item => item.key === r)) {
        list.push({ key: r, label: ROLE_TRANSLATIONS[r] || r });
      }
    });

    return list;
  }, [accessLevels]);

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">
            Equipe de Liderança
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Gestão de usuários, funções ministeriais e níveis de acesso ao sistema.
          </p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95 uppercase tracking-widest text-[10px]"
        >
          <UserPlus className="w-4 h-4" /> ADICIONAR LÍDER
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Líder / Membro</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nível de Acesso</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Contato</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Atuação Ministerial</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/60">
              {team.map((user) => (
                <tr key={user.id} className="group hover:bg-indigo-50/20 dark:hover:bg-slate-700/40 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          {user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span 
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${
                            USER_STATUS_CONFIG[user.status || 'online']?.dotClass || 'bg-emerald-500'
                          }`}
                          title={`Status: ${USER_STATUS_CONFIG[user.status || 'online']?.label || 'On-line'}`}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {user.whatsapp ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{user.whatsapp}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Sem telefone</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                    {user.duty ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl">
                        <Briefcase className="w-3 h-3 text-indigo-500" />
                        {user.duty}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic font-normal text-[11px]">Não especificada</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => openModal(user)} 
                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                        title="Editar Líder"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(user.id)} 
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                        title="Remover Líder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {team.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    Nenhum líder cadastrado na equipe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição de Líder */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[36px] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/40 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">
                    {selectedUser ? 'Editar Líder' : 'Novo Membro da Equipe'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Defina o cargo, permissões e dados de contato.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-8 space-y-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nome Completo</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Ex: Pr. Carlos Eduardo"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">E-mail</label>
                    <input 
                      type="email" 
                      required 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      placeholder="lider@igreja.com.br"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">WhatsApp</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={formData.whatsapp} 
                      onChange={e => setFormData({...formData, whatsapp: e.target.value})} 
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nível de Acesso (Função)</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl font-black text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase" 
                      value={formData.role} 
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      {roleOptions.map(opt => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Senha de Acesso</label>
                    <input 
                      type="password" 
                      placeholder={selectedUser ? '•••••• (Manter atual)' : 'Mínimo 6 caracteres'} 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Atuação / Ministério</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                    value={formData.duty} 
                    onChange={e => setFormData({...formData, duty: e.target.value})} 
                    placeholder="Ex: Pastor Titular, Coordenador de Células, Diácono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" /> Status de Presença
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(USER_STATUS_CONFIG) as (keyof typeof USER_STATUS_CONFIG)[]).map((key) => {
                      const cfg = USER_STATUS_CONFIG[key];
                      const isSelected = formData.status === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: key })}
                          className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-slate-700/80 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotClass} shrink-0`} />
                          <span className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-xl shadow-indigo-100 dark:shadow-none uppercase text-xs tracking-wider transition-all"
                >
                  Salvar Líder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamModule;
