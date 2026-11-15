import React, { useState } from 'react';
import { Member, ScheduleEvent, SystemUser, PipelineStage } from '../types';
import { DEFAULT_STAGES, stageTone } from '../constants';
import { generateHumanizedMessage } from '../services/geminiService';
import { 
  MessageCircle, 
  ArrowRight, 
  Loader2, 
  History, 
  Phone, 
  UserCheck, 
  CalendarPlus, 
  Mail, 
  GripVertical, 
  Edit3, 
  Copy, 
  Check, 
  X,
  Sparkles,
  Home,
  MapPin
} from 'lucide-react';

interface MemberCardProps {
  member: Member;
  events?: ScheduleEvent[];
  team?: SystemUser[];
  stages?: PipelineStage[];
  onMove?: (id: string, newStage: string) => void;
  onClick?: (member: Member) => void;
  onEditEvent?: (event: ScheduleEvent) => void;
  onAddTask?: (member: Member) => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ 
  member, 
  events = [], 
  team = [], 
  stages: customStages,
  onMove, 
  onClick, 
  onAddTask
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMsg, setGeneratedMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const stages = customStages && customStages.length > 0 ? customStages : DEFAULT_STAGES;

  const getScoreColor = (score: number) => {
    if (score > 80) return 'bg-emerald-500';
    if (score > 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const leaderName = team.find(u => u.id === member.responsible_leader_id)?.name || 'Sem Líder';

  const handleNextStage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = stages.findIndex(s => s.id === member.stage);
    if (currentIndex >= 0 && currentIndex < stages.length - 1 && onMove) {
      onMove(member.id, stages[currentIndex + 1].id);
    }
  };

  const handleGenerateMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGenerating) return;
    setIsGenerating(true);
    const stageLabel = stages.find(s => s.id === member.stage)?.label || member.stage;
    try {
      const msg = await generateHumanizedMessage(
        member.name, 
        stageLabel, 
        "Contato caloroso de acompanhamento da liderança"
      );
      setGeneratedMsg(msg);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedMsg) {
      navigator.clipboard.writeText(generatedMsg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentIndex = stages.findIndex(s => s.id === member.stage);
  const isAtLastStage = currentIndex >= stages.length - 1;
  const currentStageInfo = stages.find(s => s.id === member.stage);

  const formattedDate = () => {
    try {
      const d = member.registration_date instanceof Date ? member.registration_date : new Date(member.registration_date);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  return (
    <>
      <div 
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', member.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onClick={() => onClick?.(member)}
        className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group cursor-grab active:cursor-grabbing active:scale-[0.98] flex flex-col gap-3 relative overflow-hidden"
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getScoreColor(member.engagement_score)}`} />

        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 mt-0.5 shrink-0 group-hover:text-indigo-400 transition-colors" />
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-slate-800 dark:text-white text-sm leading-tight transition-colors truncate">{member.name}</h4>
              
              {member.household_name && (
                <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-400">
                  <Home className="w-2.5 h-2.5" />
                  <span className="truncate">{member.household_name}</span>
                </div>
              )}

              <div className="flex items-center gap-1 mt-1">
                <History className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  {formattedDate()}
                </p>
              </div>
            </div>
          </div>
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <select
              value={member.stage}
              onChange={(e) => onMove?.(member.id, e.target.value)}
              className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border-none focus:ring-1 focus:ring-indigo-500 outline-none appearance-none cursor-pointer ${stageTone(currentStageInfo?.color) || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'} ${currentStageInfo?.border || 'border-slate-200 dark:border-slate-700'} dark:opacity-80`}
            >
              {stages.map(s => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1 mt-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <Phone className="w-3 h-3 text-slate-300 dark:text-slate-600" />
            <span className="truncate">{member.phone || 'Sem telefone'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <UserCheck className="w-3 h-3 text-slate-300 dark:text-slate-600" />
            <span className="truncate">{leaderName}</span>
          </div>
          {member.neighborhood && (
            <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/70 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-100/60 dark:border-indigo-800/40 w-fit max-w-full">
              <MapPin className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
              <span className="truncate">{member.neighborhood}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-700 mt-1">
          <div className="flex gap-1.5">
            {/* Prominent Edit button */}
            <button 
              onClick={(e) => { e.stopPropagation(); onClick?.(member); }}
              className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white dark:hover:text-white transition-all flex items-center justify-center shadow-sm"
              title="Editar Perfil"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onAddTask?.(member); }}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white dark:hover:text-white transition-all flex items-center justify-center shadow-sm"
              title="Agendar Acompanhamento"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleGenerateMessage}
              disabled={isGenerating}
              className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white dark:hover:text-white disabled:opacity-50 transition-all flex items-center justify-center shadow-sm"
              title="Sugerir Mensagem com IA"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            </button>
            {member.phone && (
              <a 
                href={`https://wa.me/${member.phone.replace(/\D/g, '')}`}
                onClick={(e) => e.stopPropagation()}
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white dark:hover:text-white transition-all flex items-center justify-center shadow-sm"
                title="WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <button 
            onClick={handleNextStage}
            disabled={isAtLastStage}
            className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white dark:hover:text-white disabled:opacity-30 transition-all flex items-center justify-center shadow-sm"
            title="Avançar para a próxima etapa"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* In-App AI Message Preview Modal */}
      {generatedMsg && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="fixed inset-0 !mt-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-white dark:bg-slate-800 max-w-lg w-full rounded-[32px] p-6 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  Sugestão de Mensagem (IA)
                </h3>
              </div>
              <button 
                onClick={() => setGeneratedMsg(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
              Mensagem personalizada para <strong>{member.name}</strong>:
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-medium">
              {generatedMsg}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={copyToClipboard}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>

              {member.phone && (
                <a
                  href={`https://wa.me/${member.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMsg)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setGeneratedMsg(null)}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar no WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MemberCard;
