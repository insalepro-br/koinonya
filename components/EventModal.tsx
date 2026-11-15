
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Clock, MapPin, Tag, UserCheck, ChevronDown, Trash2 } from 'lucide-react';
import { ScheduleEvent, EventType, SystemUser } from '../types';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<ScheduleEvent>) => void;
  onDelete?: (id: string) => void;
  initialData?: ScheduleEvent | null;
  defaultDate?: Date;
  team?: SystemUser[];
}

const eventTypeLabels: Record<EventType, string> = {
  [EventType.SERVICE]: 'Culto',
  [EventType.MEETING]: 'Reunião',
  [EventType.EVENT]: 'Evento',
  [EventType.FOLLOW_UP]: 'Acompanhamento',
  [EventType.VISIT]: 'Visita',
};

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData, defaultDate, team = [] }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formData, setFormData] = useState<Partial<ScheduleEvent>>({
    title: '',
    description: '',
    type: EventType.SERVICE,
    location: '',
    start_date: new Date(),
    end_date: new Date(new Date().getTime() + 60 * 60 * 1000),
    responsible_id: ''
  });

  // Formata data para o padrão datetime-local (YYYY-MM-DDTHH:mm) respeitando o fuso local
  const formatToLocalISO = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData && initialData.id) {
        setFormData({ ...initialData });
      } else {
        // RESET TOTAL para novo evento para evitar sobrescrever dados residuais
        const baseDate = defaultDate || new Date();
        setFormData({
          id: undefined, 
          title: initialData?.title || '',
          description: initialData?.description || '',
          type: initialData?.type || EventType.SERVICE,
          location: initialData?.location || '',
          start_date: initialData?.start_date || baseDate,
          end_date: initialData?.end_date || new Date(baseDate.getTime() + 60 * 60 * 1000),
          responsible_id: initialData?.responsible_id || '',
          member_id: initialData?.member_id
        });
      }
    }
  }, [initialData, defaultDate, isOpen]);

  const handleDateChange = (val: string) => {
    if (!val) return;
    // Parsing manual para garantir fuso horário local e evitar regressão de horas
    const [datePart, timePart] = val.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    const newDate = new Date(year, month - 1, day, hours, minutes);
    
    setFormData(prev => ({
      ...prev,
      start_date: newDate,
      end_date: new Date(newDate.getTime() + 60 * 60 * 1000)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 !mt-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/30 dark:bg-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">
              {initialData?.id ? 'Editar Compromisso' : 'Novo Compromisso'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-8 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Título do Evento / Atividade</label>
            <input 
              type="text" required
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800 dark:text-white font-medium"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="Ex: Visita Pastoral"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Atividade</label>
              <div className="relative">
                <select 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-slate-800 dark:text-white font-bold text-xs uppercase tracking-widest"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as EventType})}
                >
                  {Object.values(EventType).map(type => (
                    <option key={type} value={type}>{eventTypeLabels[type]}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Local</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white font-medium"
                  value={formData.location || ''}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  placeholder="Local ou Link"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Líder Responsável</label>
              <div className="relative">
                <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select 
                  className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-slate-800 dark:text-white font-medium"
                  value={formData.responsible_id || ''}
                  onChange={e => setFormData({...formData, responsible_id: e.target.value})}
                >
                  <option value="">Selecione um líder da equipe</option>
                  {team && team.length > 0 ? team.map(member => (
                    <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
                  )) : (
                    <option disabled>Nenhum líder cadastrado na Equipe</option>
                  )}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 dark:text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Data e Hora</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="datetime-local" required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white font-medium"
                  value={formData.start_date ? formatToLocalISO(new Date(formData.start_date)) : ''}
                  onChange={e => handleDateChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Descrição / Notas</label>
            <textarea 
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-slate-800 dark:text-white font-medium"
              value={formData.description || ''}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Detalhes adicionais..."
            />
          </div>

          <div className="pt-6 flex flex-col sm:flex-row gap-3">
            {initialData?.id && onDelete && (
              <button 
                type="button"
                onClick={() => {
                  if (confirmDelete) {
                    onDelete(initialData.id!);
                    onClose();
                  } else {
                    setConfirmDelete(true);
                  }
                }}
                className={`py-3.5 px-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest text-[10px] ${
                  confirmDelete 
                    ? 'bg-rose-600 text-white shadow-lg animate-pulse' 
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-100 dark:border-rose-900/60'
                }`}
              >
                <Trash2 className="w-4 h-4" /> 
                {confirmDelete ? 'Confirmar Exclusão?' : 'Excluir'}
              </button>
            )}
            <button 
              type="button"
              onClick={() => { setConfirmDelete(false); onClose(); }}
              className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all uppercase tracking-widest text-[10px]"
            >
              CANCELAR
            </button>
            <button 
              type="submit"
              className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
            >
              <Save className="w-5 h-5" /> {initialData?.id ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR AGENDAMENTO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
