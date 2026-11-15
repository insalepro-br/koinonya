
import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  User as UserIcon,
  Edit3,
  Trash2
} from 'lucide-react';
import { ScheduleEvent, EventType, SystemUser } from '../types';

interface ScheduleModuleProps {
  events: ScheduleEvent[];
  team?: SystemUser[];
  onAddEvent?: (date?: Date) => void;
  onEditEvent?: (event: ScheduleEvent) => void;
  onDeleteEvent?: (id: string) => void;
}

const ScheduleModule: React.FC<ScheduleModuleProps> = ({ events, team = [], onAddEvent, onEditEvent, onDeleteEvent }) => {
  const [viewDate, setViewDate] = useState(new Date());

  const getEventTypeStyle = (type: EventType) => {
    switch (type) {
      case EventType.SERVICE: return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case EventType.MEETING: return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case EventType.EVENT: return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case EventType.FOLLOW_UP: return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case EventType.VISIT: return 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getEventTypeLabel = (type: EventType) => {
    switch (type) {
      case EventType.SERVICE: return 'Culto';
      case EventType.MEETING: return 'Reunião';
      case EventType.EVENT: return 'Evento';
      case EventType.FOLLOW_UP: return 'Acomp.';
      case EventType.VISIT: return 'Visita';
      default: return 'Geral';
    }
  };

  const getResponsibleName = (id?: string) => {
    if (!id) return null;
    return team.find(t => t.id === id)?.name || 'N/D';
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const monthName = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDayOfMonth + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const isToday = (day: number | null) => {
    if (!day) return false;
    const now = new Date();
    return now.getDate() === day && now.getMonth() === viewDate.getMonth() && now.getFullYear() === viewDate.getFullYear();
  };

  const hasEventOnDay = (day: number | null) => {
    if (!day) return false;
    return events.some(e => {
      const d = new Date(e.start_date);
      return d.getDate() === day && d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });
  };

  const currentMonthEvents = events.filter(e => {
    const d = new Date(e.start_date);
    return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
  });

  return (
    <div className="p-6 h-full overflow-hidden flex flex-col gap-6 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Controle de compromissos e atividades da comunidade.</p>
        </div>
        <button 
          onClick={() => onAddEvent?.()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" /> NOVO AGENDAMENTO
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-800 dark:text-white uppercase text-[10px] tracking-widest capitalize">{monthName}</h3>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={nextMonth} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg text-slate-400"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="text-[9px] font-black text-slate-300 dark:text-slate-500">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((day, i) => (
                <button 
                  key={i} 
                  disabled={!day}
                  onClick={() => day && onAddEvent?.(new Date(viewDate.getFullYear(), viewDate.getMonth(), day))}
                  className={`aspect-square flex flex-col items-center justify-center text-[11px] font-black rounded-lg transition-all relative ${day ? 'hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-500 dark:text-slate-400 cursor-pointer' : 'opacity-0'} ${isToday(day) ? 'bg-indigo-600 text-white dark:text-white shadow-md' : ''}`}
                >
                  {day}
                  {hasEventOnDay(day) && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isToday(day) ? 'bg-white' : 'bg-indigo-400'}`}></span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-700/60 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Atividades Agendadas</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {currentMonthEvents.length > 0 ? 
              currentMonthEvents
                .sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                .map(event => (
              <div 
                key={event.id} 
                className="group p-3 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-700/50 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/60 rounded-xl transition-all flex items-center justify-between gap-4"
              >
                <div 
                  onClick={() => onEditEvent?.(event)}
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg w-12 h-12 shadow-sm shrink-0">
                    <span className="text-[8px] font-black text-slate-400 uppercase leading-none">{new Date(event.start_date).toLocaleDateString('pt-BR', {month: 'short'})}</span>
                    <span className="text-base font-black text-slate-800 dark:text-white leading-none mt-0.5">{new Date(event.start_date).getDate()}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${getEventTypeStyle(event.type)}`}>
                        {getEventTypeLabel(event.type)}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate">{event.title}</h4>
                    </div>
                    <div className="flex items-center gap-3 mt-1 overflow-hidden">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(event.start_date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {event.responsible_id && (
                    <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase shadow-sm">
                      <UserIcon className="w-3 h-3" />
                      {getResponsibleName(event.responsible_id)}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEditEvent?.(event); }}
                      className="p-2 text-slate-300 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        e.preventDefault();
                        if(onDeleteEvent) onDeleteEvent(event.id); 
                      }}
                      className="p-2 text-slate-300 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 flex flex-col items-center justify-center text-slate-300 dark:text-slate-500 gap-3 opacity-50">
                <CalendarIcon className="w-10 h-10" />
                <p className="font-black text-[10px] uppercase tracking-widest text-center">Nenhum evento para este mês</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModule;
