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
    label: "Melhor E-mail Corporativo",
    type: "email",
    placeholder: "carlos@empresa.com.br",
    required: true,
    enabled: true,
  },
  {
    id: "revenue",
    label: "Qual o seu faturamento mensal atual?",
    type: "select",
    placeholder: "Selecione a faixa de faturamento...",
    required: true,
    enabled: true,
    options: [
      "Até R$ 10.000 / mês",
      "De R$ 10.000 a R$ 30.000 / mês",
      "De R$ 30.000 a R$ 100.000 / mês",
      "De R$ 100.000 a R$ 300.000 / mês",
      "Acima de R$ 300.000 / mês",
    ],
  },
];

interface LeadFormFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields?: LeadFormField[];
  onSave: (fields: LeadFormField[]) => void;
}

export const LeadFormFieldsModal: React.FC<LeadFormFieldsModalProps> = ({
  isOpen,
  onClose,
  fields = DEFAULT_LEAD_FIELDS,
  onSave,
}) => {
  const [currentFields, setCurrentFields] = useState<LeadFormField[]>(() => {
    if (fields && fields.length > 0) return fields;
    return DEFAULT_LEAD_FIELDS;
  });

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

  // Option management for select / radio types
  const handleAddOption = (fieldId: string) => {
    setCurrentFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const currentOptions = f.options || [];
        return {
          ...f,
          options: [...currentOptions, `Opção ${currentOptions.length + 1}`],
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
    onSave(currentFields);
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
                <span>Perguntas & Qualificação de Leads</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono">
                  {currentFields.filter((f) => f.enabled !== false).length} ativas
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Personalize as perguntas do formulário (ex: faturamento, equipe, cargo, opções)
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

        {/* Quick Presets Bar */}
        <div className="px-6 py-3 bg-zinc-900/40 border-b border-zinc-800/60 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Adicionar Pergunta Rápida:
          </span>

          <button
            type="button"
            onClick={() =>
              handleAddField({
                label: "Qual o seu faturamento mensal atual?",
                type: "select",
                placeholder: "Selecione o faturamento...",
                options: [
                  "Até R$ 10.000 / mês",
                  "De R$ 10.000 a R$ 50.000 / mês",
                  "De R$ 50.000 a R$ 100.000 / mês",
                  "Acima de R$ 100.000 / mês",
                ],
              })
            }
            className="px-2.5 py-1 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Faturamento Mensal</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleAddField({
                label: "Qual o seu cargo ou função?",
                type: "select",
                placeholder: "Selecione seu cargo...",
                options: ["Fundador / CEO / Sócio", "Diretor / Gerente", "Coordenador / Líder", "Profissional Liberal / Autônomo", "Outro"],
              })
            }
            className="px-2.5 py-1 rounded-xl bg-sky-950/70 hover:bg-sky-900 border border-sky-500/40 text-sky-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Briefcase className="w-3.5 h-3.5 text-sky-400" />
            <span>Cargo / Função</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleAddField({
                label: "Quantos colaboradores tem a sua empresa?",
                type: "select",
                placeholder: "Tamanho da equipe...",
                options: ["1 a 5 colaboradores", "6 a 20 colaboradores", "21 a 50 colaboradores", "Mais de 50 colaboradores"],
              })
            }
            className="px-2.5 py-1 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tamanho da Empresa</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddField()}
            className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pergunta Livre</span>
          </button>
        </div>

        {/* Fields List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {currentFields.map((field, idx) => {
            const isExpanded = expandedFieldId === field.id;
            const isBaseField = field.id === "name" || field.id === "phone" || field.id === "email";

            return (
              <div
                key={field.id}
                className={`rounded-2xl border transition-all ${
                  field.enabled !== false
                    ? "bg-zinc-900/80 border-zinc-700/80"
                    : "bg-zinc-950/50 border-zinc-800 opacity-60"
                }`}
              >
                {/* Field Row Header */}
                <div className="flex items-center justify-between p-3.5 gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveField(idx, "up")}
                        className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                        title="Subir pergunta"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === currentFields.length - 1}
                        onClick={() => handleMoveField(idx, "down")}
                        className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                        title="Descer pergunta"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">
                          {field.label}
                        </span>
                        {field.required && (
                          <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                            Obrigatório
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono">
                          {field.type === "select"
                            ? `Opções (${field.options?.length || 0})`
                            : field.type === "tel"
                            ? "Telefone"
                            : field.type === "email"
                            ? "E-mail"
                            : field.type === "number"
                            ? "Número"
                            : "Texto"}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                        Placeholder: "{field.placeholder || "Sem placeholder"}"
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle Active */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateField(field.id, {
                          enabled: field.enabled === false ? true : false,
                        })
                      }
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        field.enabled !== false
                          ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400"
                      }`}
                      title={field.enabled !== false ? "Pergunta ativa no formulário" : "Pergunta desativada"}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${field.enabled !== false ? "text-emerald-400" : "text-zinc-500"}`} />
                      <span>{field.enabled !== false ? "Ativa" : "Oculta"}</span>
                    </button>

                    {/* Expand / Edit Details */}
                    <button
                      type="button"
                      onClick={() => setExpandedFieldId(isExpanded ? null : field.id)}
                      className="px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {isExpanded ? "Fechar" : "Editar"}
                    </button>

                    {/* Delete Custom Field */}
                    {!isBaseField && (
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field.id)}
                        className="p-1.5 rounded-xl hover:bg-red-900/60 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Remover pergunta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Edit Form */}
                {isExpanded && (
                  <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/60 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Texto da Pergunta / Rótulo
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Texto de Ajuda / Placeholder
                        </label>
                        <input
                          type="text"
                          value={field.placeholder || ""}
                          onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                          placeholder="Ex: Selecione uma opção..."
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Tipo de Resposta
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) =>
                            handleUpdateField(field.id, {
                              type: e.target.value as LeadFieldType,
                              options:
                                e.target.value === "select" && (!field.options || field.options.length === 0)
                                  ? ["Opção 1", "Opção 2", "Opção 3"]
                                  : field.options,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="select">Múltipla Escolha (Lista suspensa / Dropdown)</option>
                          <option value="text">Texto Livre (Linha única)</option>
                          <option value="tel">Telefone / WhatsApp</option>
                          <option value="email">E-mail</option>
                          <option value="number">Número</option>
                        </select>
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(field.required)}
                            onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                            className="rounded border-zinc-700 text-purple-600 focus:ring-0"
                          />
                          <span>Resposta Obrigatória para envio do Lead</span>
                        </label>
                      </div>
                    </div>

                    {/* Options Builder for select / radio */}
                    {field.type === "select" && (
                      <div className="space-y-2 pt-2 border-t border-zinc-800">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-purple-300 flex items-center gap-1">
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
            <span>Salvar Perguntas do Formulário</span>
          </button>
        </div>
      </div>
    </div>
  );
};
