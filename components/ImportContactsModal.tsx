import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  MapPin, 
  Phone, 
  Mail,
  Loader2,
  FileCheck
} from 'lucide-react';
import { Member, PipelineStage } from '../types';
import { 
  downloadCSV, 
  generateContactsTemplateCSV, 
  parseContactsCSV, 
  ParsedImportResult 
} from '../utils/exportImportHelpers';

interface ImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages?: PipelineStage[];
  onImport: (members: Member[]) => Promise<void> | void;
}

const ImportContactsModal: React.FC<ImportContactsModalProps> = ({
  isOpen,
  onClose,
  stages = [],
  onImport
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const defaultStage = stages[0]?.id || 'NEW';

  const handleDownloadTemplate = () => {
    const csvContent = generateContactsTemplateCSV();
    downloadCSV('koinonya_modelo_importacao_contatos.csv', csvContent);
  };

  const processFile = (file: File) => {
    setErrorMsg(null);
    if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      setErrorMsg('Por favor, selecione um arquivo no formato CSV (.csv).');
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseContactsCSV(text, defaultStage);
        if (result.validMembers.length === 0) {
          setErrorMsg('Nenhum contato válido foi encontrado. Verifique se o arquivo possui a coluna "Nome Completo".');
          setParsedResult(null);
        } else {
          setParsedResult(result);
        }
      } catch (err: any) {
        setErrorMsg('Falha ao processar o arquivo CSV: ' + (err?.message || 'Formato inválido'));
        setParsedResult(null);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Erro na leitura do arquivo local.');
      setIsProcessing(false);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedResult || parsedResult.validMembers.length === 0) return;
    setIsSubmitting(true);
    try {
      await onImport(parsedResult.validMembers as Member[]);
      onClose();
    } catch (err: any) {
      setErrorMsg('Erro ao salvar os contatos importados: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedResult(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 !mt-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-[36px] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/40 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Importar Contatos & Membros
              </h3>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Planilha CSV com suporte a Bairro, CEP e Etapa
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-white dark:hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          
          {/* Card 1: Baixar Modelo Oficial */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white">
                  Modelo Oficial de Importação (.CSV)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-0.5">
                  Baixe a planilha pré-configurada com colunas: <strong>Nome, Email, Telefone, Gênero, Bairro, CEP, Endereço e Etapa</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-200 dark:shadow-none flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Modelo</span>
            </button>
          </div>

          {/* Card 2: Dropzone de Upload */}
          {!parsedResult ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 md:p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragOver 
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
              />
              
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-inner">
                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              </div>

              <h4 className="text-base font-black text-slate-800 dark:text-white">
                {isProcessing ? 'Processando arquivo...' : 'Clique para selecionar ou arraste o arquivo CSV'}
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                Compatível com planilhas exportadas do Excel, Google Sheets e outros sistemas (separador vírgula ou ponto-e-vírgula).
              </p>
            </div>
          ) : (
            /* Card 3: Pré-visualização dos dados */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <h5 className="text-sm font-black text-slate-800 dark:text-white">
                      {selectedFile?.name}
                    </h5>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      ✓ {parsedResult.validMembers.length} pessoas identificadas com sucesso
                      {parsedResult.invalidRowsCount > 0 && ` (${parsedResult.invalidRowsCount} linhas ignoradas por estarem vazias)`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors uppercase tracking-wider"
                >
                  Trocar arquivo
                </button>
              </div>

              {/* Tabela de Amostra */}
              <div className="border border-slate-200/80 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Amostra dos contatos detectados (primeiras {parsedResult.previewRows.length} linhas)
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    Total a importar: <strong>{parsedResult.validMembers.length}</strong>
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 text-slate-400 text-[10px] uppercase font-black">
                        <th className="px-4 py-2.5">Nome Completo</th>
                        <th className="px-3 py-2.5">Telefone</th>
                        <th className="px-3 py-2.5">Bairro</th>
                        <th className="px-3 py-2.5">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedResult.previewRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-white">
                            {r.name}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                            {r.phone}
                          </td>
                          <td className="px-3 py-2.5 text-indigo-600 dark:text-indigo-400 font-medium">
                            {r.neighborhood !== '-' ? `📍 ${r.neighborhood}` : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                            {r.email}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Mensagem de Erro */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 md:p-8 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={!parsedResult || parsedResult.validMembers.length === 0 || isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Importação {parsedResult ? `(${parsedResult.validMembers.length})` : ''}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ImportContactsModal;
