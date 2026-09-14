import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  DollarSign,
  Briefcase,
  Users,
  Target,
  ListPlus,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Layout,
  Gift,
  FileText,
  FileSpreadsheet,
  Download,
  MousePointerClick,
  FileCode,
  FileBox,
} from "lucide-react";
import { LeadFormField, LeadFieldType } from "../types/landingPage";

export const DEFAULT_LEAD_FIELDS: LeadFormField[] = [
  {
    id: "name",
    label: "Nome Completo",
    type: "text",
    placeholder: "Ex: Carlos Eduardo Silva",
    required: true,
    enabled: true,
  },
  {
    id: "phone",
    label: "WhatsApp / Telefone",
    type: "tel",
    placeholder: "(11) 98765-4321",
    required: true,
    enabled: true,
  },
  {
    id: "email",
    label: "Melhor E-mail",
    type: "email",
    placeholder: "carlos@empresa.com.br",
    required: true,
    enabled: true,
  },
];

export interface GiftConfig {
  enabled?: boolean;
  type?: "ebook" | "pdf" | "spreadsheet" | "presentation" | "other";
  title?: string;
  description?: string;
  downloadUrl?: string;
  fileName?: string;
  buttonText?: string;
}

interface LeadFormFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields?: LeadFormField[];
  displayMode?: "inline" | "modal";
  gift?: GiftConfig;
  onSave: (
    fields: LeadFormField[],
    options?: { displayMode?: "inline" | "modal"; gift?: GiftConfig }
  ) => void;
}

export const LeadFormFieldsModal: React.FC<LeadFormFieldsModalProps> = ({
  isOpen,
  onClose,
  fields = DEFAULT_LEAD_FIELDS,
  displayMode = "inline",
  gift,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<"fields" | "display" | "gift">("fields");

  const [currentFields, setCurrentFields] = useState<LeadFormField[]>(() => {
    if (fields && fields.length > 0) return fields;
    return DEFAULT_LEAD_FIELDS;
  });

  const [currentDisplayMode, setCurrentDisplayMode] = useState<"inline" | "modal">(displayMode);

  const [currentGift, setCurrentGift] = useState<GiftConfig>(() => ({
    enabled: gift?.enabled || false,
    type: gift?.type || "spreadsheet",
    title: gift?.title || "Planilha Exclusiva de Aceleração & Métricas",
    description:
      gift?.description ||
      "Faça o download agora mesmo da sua planilha pronta para uso e impulsione seus resultados.",
    downloadUrl: gift?.downloadUrl || "",
    fileName: gift?.fileName || "material-exclusivo.xlsx",
    buttonText: gift?.buttonText || "Baixar Material Agora",
  }));

  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddField = (preset?: {
    label: string;
    type: LeadFieldType;
    placeholder?: string;
    options?: string[];
  }) => {
    const newId = `field_${Date.now()}`;
    const newField: LeadFormField = {
      id: newId,
      label: preset?.label || "Nova Pergunta de Qualificação",
      type: preset?.type || "select",
      placeholder: preset?.placeholder || "Selecione uma opção...",
      required: false,
      enabled: true,
      options: preset?.options || ["Opção 1", "Opção 2", "Opção 3"],
    };

    setCurrentFields((prev) => [...prev, newField]);
    setExpandedFieldId(newId);
  };

  const handleUpdateField = (id: string, patch: Partial<LeadFormField>) => {
    setCurrentFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  const handleRemoveField = (id: string) => {
    setCurrentFields((prev) => prev.filter((f) => f.id !== id));
    if (expandedFieldId === id) setExpandedFieldId(null);
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentFields.length) return;

    setCurrentFields((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleAddOption = (fieldId: string) => {
    setCurrentFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const currentOpts = f.options || [];
        return {
          ...f,
          options: [...currentOpts, `Opção ${currentOpts.length + 1}`],
        };
      })
    );
  };

  const handleUpdateOption = (fieldId: string, optIndex: number, newVal: string) => {
    setCurrentFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const nextOpts = [...(f.options || [])];
        nextOpts[optIndex] = newVal;
        return { ...f, options: nextOpts };
      })
    );
  };

  const handleRemoveOption = (fieldId: string, optIndex: number) => {
    setCurrentFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const nextOpts = (f.options || []).filter((_, i) => i !== optIndex);
        return { ...f, options: nextOpts };
      })
    );
  };

  const handleSaveAndClose = () => {
    onSave(currentFields, {
      displayMode: currentDisplayMode,
      gift: currentGift,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] rounded-3xl bg-zinc-950 border border-purple-500/50 shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-700/50 text-purple-400">
              <ListPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Configurar Formulário, Exibição & Brinde</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono">
                  {currentFields.filter((f) => f.enabled !== false).length} campos ativos
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Ajuste os dados de captura, o modo de exibição na LP e brindes atrelados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-zinc-800 bg-zinc-900/40 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("fields")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "fields"
                ? "border-purple-500 text-white bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ListPlus className="w-3.5 h-3.5 text-purple-400" />
            <span>Campos do Formulário ({currentFields.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("display")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "display"
                ? "border-purple-500 text-white bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layout className="w-3.5 h-3.5 text-blue-400" />
            <span>Modo de Exibição</span>
            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-zinc-800 text-zinc-300">
              {currentDisplayMode === "modal" ? "Flutuante" : "Na LP"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gift")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "gift"
                ? "border-purple-500 text-white bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            <span>Brinde / Recompensa</span>
            {currentGift.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* TAB 1: CAMPOS DO FORMULÁRIO */}
        {activeTab === "fields" && (
          <>
            {/* Quick Presets Bar */}
            <div className="px-6 py-3 bg-zinc-900/40 border-b border-zinc-800/60 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Adicionar Campo Personalizado:
              </span>

              <button
                type="button"
                onClick={() =>
                  handleAddField({
                    label: "Cargo / Ocupação",
                    type: "select",
                    placeholder: "Selecione seu cargo...",
                    options: ["Sócio / Fundador", "Diretor / VP", "Gerente", "Analista / Especialista", "Autônomo"],
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700/60"
              >
                <Briefcase className="w-3 h-3 text-blue-400" />
                <span>Cargo</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleAddField({
                    label: "Tamanho da Equipe",
                    type: "select",
                    placeholder: "Quantas pessoas na equipe?",
                    options: ["1 a 5 pessoas", "6 a 20 pessoas", "21 a 50 pessoas", "Mais de 50 pessoas"],
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700/60"
              >
                <Users className="w-3 h-3 text-emerald-400" />
                <span>Equipe</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleAddField({
                    label: "Principal Desafio Atual",
                    type: "select",
                    placeholder: "Qual o maior desafio?",
                    options: [
                      "Atrair leads qualificados",
                      "Aumentar taxa de conversão",
                      "Treinar e escalar equipe comercial",
                      "Reduzir tempo de fechamento",
                    ],
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700/60"
              >
                <Target className="w-3 h-3 text-orange-400" />
                <span>Desafio</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddField()}
                className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-purple-500/40 ml-auto"
              >
                <Plus className="w-3 h-3" />
                <span>Pergunta Livre</span>
              </button>
            </div>

            {/* Fields List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {currentFields.map((field, idx) => {
                const isExpanded = expandedFieldId === field.id;
                const isCore = field.id === "name" || field.id === "phone" || field.id === "email";

                return (
                  <div
                    key={field.id}
                    className={`rounded-2xl border transition-all ${
                      field.enabled === false
                        ? "border-zinc-800/60 bg-zinc-950/40 opacity-60"
                        : isExpanded
                        ? "border-purple-500/80 bg-zinc-900/90 shadow-lg"
                        : "border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700"
                    }`}
                  >
                    {/* Row Header */}
                    <div className="flex items-center gap-3 p-4">
                      <div className="flex items-center gap-1 text-zinc-500">
                        <GripVertical className="w-4 h-4 text-zinc-600" />
                        <span className="text-xs font-mono font-bold text-zinc-500 w-4">
                          {idx + 1}.
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedFieldId(isExpanded ? null : field.id)}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">
                            {field.label}
                          </span>
                          {isCore && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              Padrão
                            </span>
                          )}
                          {field.required && (
                            <span className="text-[10px] text-red-400 font-bold">*Obrigatório</span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-800 text-zinc-400">
                            {field.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {field.placeholder || "Sem placeholder"}
                        </p>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateField(field.id, { enabled: field.enabled === false ? true : false })}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            field.enabled !== false ? "text-emerald-400 hover:bg-emerald-950/30" : "text-zinc-600 hover:bg-zinc-800"
                          }`}
                          title={field.enabled !== false ? "Desativar campo" : "Ativar campo"}
                        >
                          {field.enabled !== false ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>

                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveField(idx, "up")}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={idx === currentFields.length - 1}
                          onClick={() => handleMoveField(idx, "down")}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {!isCore && (
                          <button
                            type="button"
                            onClick={() => handleRemoveField(field.id)}
                            className="p-1.5 rounded-lg hover:bg-red-950/50 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Excluir pergunta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedFieldId(isExpanded ? null : field.id)}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expand Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-zinc-800/80 space-y-3 bg-zinc-950/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                              Pergunta / Rótulo do Campo
                            </label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                              Texto de Apoio (Placeholder)
                            </label>
                            <input
                              type="text"
                              value={field.placeholder || ""}
                              onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {!isCore && (
                            <div>
                              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                                Tipo de Resposta
                              </label>
                              <select
                                value={field.type}
                                onChange={(e) => handleUpdateField(field.id, { type: e.target.value as LeadFieldType })}
                                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                              >
                                <option value="select">Múltipla Escolha (Lista Suspensa)</option>
                                <option value="text">Texto Curto</option>
                                <option value="number">Número</option>
                                <option value="textarea">Texto Longo</option>
                              </select>
                            </div>
                          )}

                          <div className="flex items-center gap-3 pt-4">
                            <label className="flex items-center gap-2 text-xs text-zinc-300 font-bold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-zinc-900 border-zinc-700"
                              />
                              <span>Preenchimento Obrigatório</span>
                            </label>
                          </div>
                        </div>

                        {/* Options editor if type is select */}
                        {field.type === "select" && (
                          <div className="pt-2 border-t border-zinc-800/60">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span>Opções de Resposta ({field.options?.length || 0})</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleAddOption(field.id)}
                                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Adicionar Opção</span>
                              </button>
                            </div>

                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {(field.options || []).map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-zinc-500 w-5 text-right">
                                    {optIdx + 1}.
                                  </span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleUpdateOption(field.id, optIdx, e.target.value)}
                                    className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-purple-500"
                                    placeholder={`Opção ${optIdx + 1}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(field.id, optIdx)}
                                    className="p-1 rounded hover:bg-red-950 text-zinc-500 hover:text-red-400 cursor-pointer"
                                    title="Remover esta opção"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TAB 2: MODO DE EXIBIÇÃO (INLINE vs MODAL FLUTUANTE) */}
        {activeTab === "display" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Layout className="w-4 h-4 text-purple-400" />
                <span>Onde o formulário de cadastro deve ser exibido?</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Escolha se o lead preencherá diretamente na página ou através de um card flutuante moderno ao clicar nos botões de CTA.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Inline */}
              <div
                onClick={() => setCurrentDisplayMode("inline")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  currentDisplayMode === "inline"
                    ? "border-purple-500 bg-purple-950/30 ring-2 ring-purple-500/20"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-purple-900/40 text-purple-300">
                      <Layout className="w-5 h-5" />
                    </div>
                    {currentDisplayMode === "inline" && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                        Selecionado
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-white">Formulário Embutido na LP</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    O formulário de cadastro fica visível diretamente na página, dentro da seção dedicada. Os botões de CTA rolam a página suavemente até o formulário.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${currentDisplayMode === "inline" ? "text-purple-400" : "text-zinc-600"}`} />
                  <span>Ideal para páginas com alta taxa de leitura</span>
                </div>
              </div>

              {/* Option 2: Floating Card / Modal */}
              <div
                onClick={() => setCurrentDisplayMode("modal")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  currentDisplayMode === "modal"
                    ? "border-purple-500 bg-purple-950/30 ring-2 ring-purple-500/20"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-blue-900/40 text-blue-300">
                      <MousePointerClick className="w-5 h-5" />
                    </div>
                    {currentDisplayMode === "modal" && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                        Selecionado
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-white">Card Flutuante (Ao Clicar no Botão)</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Aparece como um pop-up moderno centralizado com fundo escurecido sempre que o lead clica em qualquer botão de CTA da página.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${currentDisplayMode === "modal" ? "text-purple-400" : "text-zinc-600"}`} />
                  <span>Máxima conversão em dispositivos móveis</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Como funciona o fluxo unificado:
              </span>
              <p className="text-zinc-400">
                1. O visitante preenche o formulário (seja embutido ou flutuante).
              </p>
              <p className="text-zinc-400">
                2. O lead é gravado com sucesso no CRM e na planilha Google Sheets.
              </p>
              <p className="text-zinc-400">
                3. Se houver pesquisa atrelada, o diagnóstico (DeepFind) é iniciado automaticamente em seguida.
              </p>
              <p className="text-zinc-400">
                4. Se houver brinde atrelado, a tela de download é liberada para o visitante.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: BRINDE / RECOMPENSA DIGITAL (EBOOK, PDF, PLANILHA XLSX, PPTX) */}
        {activeTab === "gift" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Ativar Brinde / Material Exclusivo</h4>
                  <p className="text-xs text-zinc-400">
                    Libere um arquivo (Ebook, PDF, Planilha XLSX, Apresentação PPTX) logo após o preenchimento.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentGift((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  currentGift.enabled ? "text-emerald-400 hover:bg-emerald-950/40" : "text-zinc-600 hover:bg-zinc-800"
                }`}
              >
                {currentGift.enabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>

            {currentGift.enabled && (
              <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Tipo do Arquivo / Formato
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "spreadsheet", label: "Planilha XLSX", icon: FileSpreadsheet, color: "text-emerald-400" },
                      { id: "pdf", label: "Documento PDF", icon: FileText, color: "text-rose-400" },
                      { id: "ebook", label: "Ebook / Guia", icon: FileBox, color: "text-purple-400" },
                      { id: "presentation", label: "Slides PPTX", icon: FileCode, color: "text-orange-400" },
                    ].map((fmt) => {
                      const Icon = fmt.icon;
                      const isSel = currentGift.type === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setCurrentGift((prev) => ({ ...prev, type: fmt.id as any }))}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                            isSel
                              ? "border-purple-500 bg-purple-950/40 text-white ring-1 ring-purple-500/50"
                              : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700"
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${fmt.color}`} />
                          <span>{fmt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Título do Brinde / Recompensa
                  </label>
                  <input
                    type="text"
                    value={currentGift.title || ""}
                    onChange={(e) => setCurrentGift((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Planilha de Indicadores & Gestão Comercial 2026"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Descrição do Brinde
                  </label>
                  <textarea
                    rows={2}
                    value={currentGift.description || ""}
                    onChange={(e) => setCurrentGift((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Ex: Faça o download agora da sua planilha pronta para uso e impulsione seus resultados."
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Link / URL Direta de Download (Opcional)
                    </label>
                    <input
                      type="url"
                      value={currentGift.downloadUrl || ""}
                      onChange={(e) => setCurrentGift((prev) => ({ ...prev, downloadUrl: e.target.value }))}
                      placeholder="https://drive.google.com/... ou link direto"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Se deixar em branco, o sistema gerará o arquivo automaticamente para o lead.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Texto do Botão de Download
                    </label>
                    <input
                      type="text"
                      value={currentGift.buttonText || ""}
                      onChange={(e) => setCurrentGift((prev) => ({ ...prev, buttonText: e.target.value }))}
                      placeholder="Ex: Baixar Planilha Gratuita"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-900/50 hover:scale-[1.02]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Salvar Configurações do Formulário</span>
          </button>
        </div>
      </div>
    </div>
  );
};
