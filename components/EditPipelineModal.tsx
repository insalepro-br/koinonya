import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  AlertTriangle, 
  Sparkles, 
  Sliders, 
  Check, 
  Tag,
  Save,
  Info
} from 'lucide-react';
import { PipelineStage, Member } from '../types';
import { 
  STAGE_COLOR_PRESETS, 
  STAGE_ICON_OPTIONS, 
  DEFAULT_STAGES, 
  getStageIcon,
  stageTone 
} from '../constants';

interface EditPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: PipelineStage[];
  members: Member[];
  onSaveStages: (newStages: PipelineStage[], memberMigrations?: { fromStageId: string; toStageId: string }[]) => Promise<void>;
  initialEditingStageId?: string | null;
}

const EditPipelineModal: React.FC<EditPipelineModalProps> = ({
  isOpen,
  onClose,
  stages: currentStages,
  members,
  onSaveStages,
  initialEditingStageId
}) => {
  const [stages, setStages] = useState<PipelineStage[]>(() => 
    currentStages && currentStages.length > 0 ? JSON.parse(JSON.stringify(currentStages)) : JSON.parse(JSON.stringify(DEFAULT_STAGES))
  );

  const [editingStageId, setEditingStageId] = useState<string | null>(initialEditingStageId || null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Deletion with migration prompt state
  const [deletingStage, setDeletingStage] = useState<PipelineStage | null>(null);
  const [targetMigrationStageId, setTargetMigrationStageId] = useState<string>('');
  const [pendingMigrations, setPendingMigrations] = useState<{ fromStageId: string; toStageId: string }[]>([]);

  // Form state for creating a new stage
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(STAGE_COLOR_PRESETS[0]);
  const [newStageIcon, setNewStageIcon] = useState(STAGE_ICON_OPTIONS[0].id);
  const [newStageAutomation, setNewStageAutomation] = useState('');

  if (!isOpen) return null;

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...stages];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setStages(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= stages.length - 1) return;
    const updated = [...stages];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setStages(updated);
  };

  const handleStartDelete = (stage: PipelineStage) => {
    if (stages.length <= 1) {
      setErrorMessage('O pipeline deve ter pelo menos 1 etapa ativa.');
      return;
    }
    setErrorMessage(null);

    // Count how many members are currently in this stage
    const countInStage = members.filter(m => m.stage === stage.id).length;

    if (countInStage > 0) {
      // Prompt migration
      const otherStages = stages.filter(s => s.id !== stage.id);
      setTargetMigrationStageId(otherStages[0]?.id || '');
      setDeletingStage(stage);
    } else {
      // Direct remove
      setStages(stages.filter(s => s.id !== stage.id));
      if (editingStageId === stage.id) setEditingStageId(null);
    }
  };

  const handleConfirmDeleteWithMigration = () => {
    if (!deletingStage || !targetMigrationStageId) return;

    // Record migration
    setPendingMigrations(prev => [
      ...prev,
      { fromStageId: deletingStage.id, toStageId: targetMigrationStageId }
    ]);

    // Remove from stages list
    setStages(stages.filter(s => s.id !== deletingStage.id));
    if (editingStageId === deletingStage.id) setEditingStageId(null);
    setDeletingStage(null);
    setTargetMigrationStageId('');
  };

  const handleCreateStage = () => {
    if (!newStageName.trim()) {
      setErrorMessage('Informe o nome da etapa.');
      return;
    }

    // Generate unique ID based on name or timestamp
    const cleanId = newStageName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 30);

    const uniqueId = stages.some(s => s.id === cleanId) 
      ? `${cleanId}_${Date.now().toString(36).substr(-4)}`
      : cleanId;

    const newStage: PipelineStage = {
      id: uniqueId,
      label: newStageName.trim(),
      color: newStageColor.color,
      border: newStageColor.border,
      iconName: newStageIcon,
      automation: newStageAutomation.trim() || undefined
    };

    setStages([...stages, newStage]);
    setNewStageName('');
    setNewStageAutomation('');
    setIsAddingNew(false);
    setErrorMessage(null);
  };

  const handleUpdateStageProperty = (id: string, updates: Partial<PipelineStage>) => {
    setStages(stages.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleResetToDefaults = () => {
    if (window.confirm ? true : true) {
      setStages(JSON.parse(JSON.stringify(DEFAULT_STAGES)));
      setEditingStageId(null);
      setIsAddingNew(false);
      setErrorMessage(null);
    }
  };

  const handleSave = async () => {
    if (stages.length === 0) {
      setErrorMessage('O pipeline precisa ter ao menos uma etapa.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onSaveStages(stages, pendingMigrations);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar etapas do pipeline:', err);
      setErrorMessage(err?.message || 'Falha ao salvar alterações no pipeline.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 !mt-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Personalizar Pipeline da Igreja
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Adapte as etapas da jornada de crescimento à realidade e ministérios da sua comunidade.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {/* Top helper banner */}
          <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 dark:text-indigo-200">
              <span className="font-bold">Dica:</span> As etapas são organizadas da esquerda para a direita. Use as setas para reordenar, personalize nomes, ícones e cores conforme a sua metodologia (ex: Visitas, PG/Célula, Batismo, Discipulado).
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* List of current stages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Etapas Ativas ({stages.length})
              </h4>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar padrão</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {stages.map((stage, index) => {
                const countMembers = members.filter(m => m.stage === stage.id).length;
                const isEditing = editingStageId === stage.id;

                return (
                  <div 
                    key={stage.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isEditing 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20' 
                        : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        <div className={`p-2 rounded-xl shrink-0 ${stageTone(stage.color)}`}>
                          {getStageIcon(stage.iconName, 'w-4 h-4')}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 dark:text-white text-sm truncate">
                              {stage.label}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                              {countMembers} {countMembers === 1 ? 'pessoa' : 'pessoas'}
                            </span>
                          </div>
                          {stage.automation && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium">
                              {stage.automation}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          title="Mover para a esquerda / cima"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 transition-all"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === stages.length - 1}
                          title="Mover para a direita / baixo"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 transition-all"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setEditingStageId(isEditing ? null : stage.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isEditing 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'
                          }`}
                        >
                          {isEditing ? 'Fechar' : 'Editar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartDelete(stage)}
                          title="Excluir etapa"
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Editor for this stage */}
                    {isEditing && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                              Nome da Etapa
                            </label>
                            <input
                              type="text"
                              value={stage.label}
                              onChange={(e) => handleUpdateStageProperty(stage.id, { label: e.target.value })}
                              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="Ex: Primeira Visita"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                              Ação / Meta Recomendada
                            </label>
                            <input
                              type="text"
                              value={stage.automation || ''}
                              onChange={(e) => handleUpdateStageProperty(stage.id, { automation: e.target.value })}
                              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="Ex: Enviar boas-vindas e ligar"
                            />
                          </div>
                        </div>

                        {/* Color Selector */}
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">
                            Cor do Tema da Etapa
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {STAGE_COLOR_PRESETS.map((preset) => {
                              const isSelected = stage.color === preset.color;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => handleUpdateStageProperty(stage.id, { color: preset.color, border: preset.border })}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${stageTone(preset.color)} ${preset.border} ${
                                    isSelected ? 'ring-2 ring-indigo-500 shadow-sm scale-105' : 'opacity-70 hover:opacity-100'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3" />}
                                  <span>{preset.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Icon Selector */}
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">
                            Ícone da Etapa
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {STAGE_ICON_OPTIONS.map((opt) => {
                              const isSelected = stage.iconName === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => handleUpdateStageProperty(stage.id, { iconName: opt.id })}
                                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all text-xs font-medium ${
                                    isSelected 
                                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold' 
                                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                  }`}
                                >
                                  {getStageIcon(opt.id, 'w-4 h-4 shrink-0')}
                                  <span className="truncate">{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Stage Section */}
          {!isAddingNew ? (
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="w-full py-3.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Incluir Nova Etapa no Pipeline</span>
            </button>
          ) : (
            <div className="p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                    Nova Etapa da Jornada
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Nome da Nova Etapa *
                  </label>
                  <input
                    type="text"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="Ex: Discipulado Nível 1, Batismo, Célula..."
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Objetivo / Ação Recomendada
                  </label>
                  <input
                    type="text"
                    value={newStageAutomation}
                    onChange={(e) => setNewStageAutomation(e.target.value)}
                    placeholder="Ex: Conectar com o líder de discipulado"
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Color options */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-2">
                  Cor da Etapa
                </label>
                <div className="flex flex-wrap gap-2">
                  {STAGE_COLOR_PRESETS.map((preset) => {
                    const isSelected = newStageColor.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setNewStageColor(preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${stageTone(preset.color)} ${preset.border} ${
                          isSelected ? 'ring-2 ring-indigo-500 shadow-sm scale-105' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Icon options */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-2">
                  Ícone
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STAGE_ICON_OPTIONS.map((opt) => {
                    const isSelected = newStageIcon === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setNewStageIcon(opt.id)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all text-xs font-medium ${
                          isSelected 
                            ? 'border-indigo-500 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm' 
                            : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {getStageIcon(opt.id, 'w-4 h-4 shrink-0')}
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateStage}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm"
                >
                  Confirmar e Incluir Etapa
                </button>
              </div>
            </div>
          )}

          {/* Delete with Migration Modal Dialog */}
          {deletingStage && (
            <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                    Existem pessoas na etapa &quot;{deletingStage.label}&quot;
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-medium">
                    Há {members.filter(m => m.stage === deletingStage.id).length} contato(s) cadastrados nessa fase. Para excluir com segurança sem perder dados, escolha para qual etapa eles devem ser movidos:
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-300">
                  Mover contatos existentes para:
                </label>
                <select
                  value={targetMigrationStageId}
                  onChange={(e) => setTargetMigrationStageId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl font-bold text-slate-800 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {stages.filter(s => s.id !== deletingStage.id).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({members.filter(m => m.stage === s.id).length} pessoas atuais)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingStage(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-600/60 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteWithMigration}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm"
                >
                  Transferir Contatos e Excluir Etapa
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            {stages.length} etapas no fluxo
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-200 dark:shadow-none flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Pipeline'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EditPipelineModal;
