import React, { useState } from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  ListChecks,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import type { AgendaFieldType, AgendaFormField } from "@/types/agenda";
import { generateRandomCode } from "@/lib/agenda-engine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const AGENDA_FIELD_TYPES: Array<{ value: AgendaFieldType; label: string }> = [
  { value: "TEXTO_CURTO", label: "Texto Curto" },
  { value: "TEXTO_LONGO", label: "Texto Longo (Observações)" },
  { value: "TELEFONE", label: "Telefone / WhatsApp" },
  { value: "EMAIL", label: "E-mail" },
  { value: "NUMERO", label: "Número" },
  { value: "DATA", label: "Data" },
  { value: "SELECAO_UNICA", label: "Lista de Seleção (Única)" },
  { value: "SELECAO_MULTIPLA", label: "Múltipla Escolha" },
  { value: "SIM_NAO", label: "Sim / Não" },
];

interface FormBuilderEditorProps {
  eventId: string;
  fields: AgendaFormField[];
  onChange: (nextFields: AgendaFormField[]) => void;
}

export const FormBuilderEditor: React.FC<FormBuilderEditorProps> = ({
  eventId,
  fields,
  onChange,
}) => {
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<AgendaFieldType>("TEXTO_CURTO");
  const [newPlaceholder, setNewPlaceholder] = useState("");
  const [newOptionsText, setNewOptionsText] = useState("");
  const [newRequired, setNewRequired] = useState(false);

  const sortedFields = [...fields].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const handleAddField = () => {
    const label = newLabel.trim();
    if (!label) {
      toast.error("Informe o título da pergunta.");
      return;
    }

    const needsOptions = newType === "SELECAO_UNICA" || newType === "SELECAO_MULTIPLA";
    const parsedOptions = needsOptions
      ? newOptionsText
          .split(/\n|,/)
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined;

    if (needsOptions && (!parsedOptions || parsedOptions.length === 0)) {
      toast.error("Informe pelo menos uma opção separada por vírgula ou quebra de linha.");
      return;
    }

    const nextField: AgendaFormField = {
      id_campo: `FLD-${generateRandomCode(5)}`,
      id_evento: eventId,
      nome_campo: label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, ""),
      label,
      tipo: newType,
      obrigatorio: newRequired,
      placeholder: newPlaceholder.trim() || undefined,
      opcoes: parsedOptions,
      ordem: sortedFields.length + 1,
      ativo: true,
    };

    onChange([...sortedFields, nextField]);
    setNewLabel("");
    setNewPlaceholder("");
    setNewOptionsText("");
    setNewRequired(false);
  };

  const handleMove = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sortedFields.length) return;
    const copy = [...sortedFields];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    onChange(copy.map((f, i) => ({ ...f, ordem: i + 1 })));
  };

  const handleUpdateField = (idCampo: string, patch: Partial<AgendaFormField>) => {
    onChange(
      sortedFields.map((f) => (f.id_campo === idCampo ? { ...f, ...patch } : f))
    );
  };

  const handleDeleteField = (idCampo: string) => {
    onChange(
      sortedFields
        .filter((f) => f.id_campo !== idCampo)
        .map((f, i) => ({ ...f, ordem: i + 1 }))
    );
  };

  const needsOptions = newType === "SELECAO_UNICA" || newType === "SELECAO_MULTIPLA";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Adicionar Nova Pergunta
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Nome, WhatsApp e E-mail já são obrigatórios no link público. Adicione perguntas extras de qualificação abaixo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Pergunta / Rótulo *
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex: Qual o faturamento mensal da empresa?"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Tipo de Resposta
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as AgendaFieldType)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {AGENDA_FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Placeholder (Opcional)
            </label>
            <input
              type="text"
              value={newPlaceholder}
              onChange={(e) => setNewPlaceholder(e.target.value)}
              placeholder="Ex: Digite sua resposta..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-end pb-1">
            <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newRequired}
                onChange={(e) => setNewRequired(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary"
              />
              <span>Resposta obrigatória</span>
            </label>
          </div>
        </div>

        {needsOptions && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Opções (separadas por vírgula ou uma por linha) *
            </label>
            <textarea
              rows={2}
              value={newOptionsText}
              onChange={(e) => setNewOptionsText(e.target.value)}
              placeholder="Até R$ 30 mil, De R$ 30 mil a R$ 100 mil, Acima de R$ 100 mil"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddField}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Pergunta
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Perguntas Configuradas ({sortedFields.length})
          </span>
        </div>

        {sortedFields.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            Nenhuma pergunta personalizada cadastrada. O visitante preencherá apenas Nome, WhatsApp e E-mail.
          </div>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {sortedFields.map((field, index) => {
              const typeMeta = AGENDA_FIELD_TYPES.find((t) => t.value === field.tipo);
              return (
                <div
                  key={field.id_campo}
                  className={cn(
                    "p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
                    field.ativo === false && "opacity-55 bg-muted/20"
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground tabular-nums">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-semibold text-foreground truncate">
                        {field.label}
                      </span>
                      <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {typeMeta?.label || field.tipo}
                      </span>
                      {field.obrigatorio && (
                        <span className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                          Obrigatória
                        </span>
                      )}
                    </div>
                    {field.opcoes && field.opcoes.length > 0 && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        Opções: {field.opcoes.join(" · ")}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateField(field.id_campo, { obrigatorio: !field.obrigatorio })}
                      className={cn(
                        "px-2 py-1 rounded-md border text-[10px] font-bold transition-colors cursor-pointer",
                        field.obrigatorio
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                      title="Alternar obrigatoriedade"
                    >
                      {field.obrigatorio ? "Obrig." : "Opcional"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateField(field.id_campo, { ativo: field.ativo === false })}
                      className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                      title={field.ativo === false ? "Ativar pergunta" : "Ocultar pergunta"}
                    >
                      {field.ativo === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, -1)}
                      className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                      title="Mover para cima"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === sortedFields.length - 1}
                      onClick={() => handleMove(index, 1)}
                      className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteField(field.id_campo)}
                      className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 cursor-pointer"
                      title="Remover pergunta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface FormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  evento: { id_evento: string; nome: string };
  initialFields: AgendaFormField[];
  onSaveFields: (fields: AgendaFormField[]) => Promise<void> | void;
}

export const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  isOpen,
  onClose,
  evento,
  initialFields,
  onSaveFields,
}) => {
  const [fields, setFields] = useState<AgendaFormField[]>(initialFields);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.resolve(onSaveFields(fields));
      toast.success("Perguntas do evento atualizadas!");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar perguntas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-6">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl border border-primary/20 bg-primary/10 text-primary grid place-items-center shrink-0">
              <ListChecks className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Formulário do Agendamento
              </div>
              <h3 className="text-base font-bold text-foreground truncate">
                {evento.nome}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <FormBuilderEditor
            eventId={evento.id_evento}
            fields={fields}
            onChange={setFields}
          />
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Salvando..." : "Salvar Perguntas"}
          </button>
        </div>
      </div>
    </div>
  );
};
