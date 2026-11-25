import React, { useEffect, useMemo, useState } from "react";
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
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Calendar,
} from "lucide-react";
import type {
  AgendaEvent,
  AgendaFieldType,
  AgendaFormField,
  AgendaSchedule,
} from "@/types/agenda";
import { generateRandomCode } from "@/lib/agenda-engine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const AGENDA_FIELD_TYPES: Array<{
  value: AgendaFieldType;
  label: string;
  desc: string;
}> = [
  { value: "TEXTO_CURTO", label: "Texto Curto", desc: "Resposta em linha única (ex: Cidade, Cargo)" },
  { value: "TEXTO_LONGO", label: "Texto Longo (Observações)", desc: "Múltiplas linhas (ex: Expectativas)" },
  { value: "SELECAO_UNICA", label: "Lista de Seleção (Única)", desc: "Dropdown com uma escolha" },
  { value: "SELECAO_MULTIPLA", label: "Múltipla Escolha", desc: "Checkboxes com várias escolhas" },
  { value: "TELEFONE", label: "Telefone / WhatsApp", desc: "Número formatado" },
  { value: "EMAIL", label: "E-mail", desc: "Endereço de e-mail" },
  { value: "NUMERO", label: "Número", desc: "Apenas dígitos numéricos" },
  { value: "DATA", label: "Data", desc: "Seletor de dia" },
  { value: "SIM_NAO", label: "Sim / Não", desc: "Booleano rápido" },
];

interface FormBuilderViewProps {
  events: AgendaEvent[];
  schedules: AgendaSchedule[];
  formFields: AgendaFormField[];
  initialEventId?: string;
  onSaveEvent: (
    evento: AgendaEvent,
    horarios: AgendaSchedule[],
    campos: AgendaFormField[]
  ) => Promise<any>;
  onCreateEvent?: () => void;
}

export const FormBuilderView: React.FC<FormBuilderViewProps> = ({
  events,
  schedules,
  formFields,
  initialEventId,
  onSaveEvent,
  onCreateEvent,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || events[0]?.id_evento || ""
  );

  const [novoLabel, setNovoLabel] = useState("");
  const [novoTipo, setNovoTipo] = useState<AgendaFieldType>("TEXTO_CURTO");
  const [novoObrigatorio, setNovoObrigatorio] = useState(false);
  const [novoPlaceholder, setNovoPlaceholder] = useState("");
  const [novasOpcoes, setNovasOpcoes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialEventId && events.some((e) => e.id_evento === initialEventId)) {
      setSelectedEventId(initialEventId);
    } else if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id_evento);
    } else if (
      selectedEventId &&
      events.length > 0 &&
      !events.some((e) => e.id_evento === selectedEventId)
    ) {
      setSelectedEventId(events[0].id_evento);
    }
  }, [initialEventId, events, selectedEventId]);

  const eventoAtual = useMemo(
    () => events.find((e) => e.id_evento === selectedEventId) || null,
    [events, selectedEventId]
  );

  const campos = useMemo(() => {
    if (!eventoAtual) return [];
    return formFields
      .filter((c) => c.id_evento === eventoAtual.id_evento)
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
  }, [formFields, eventoAtual]);

  const persistEventFields = async (nextCampos: AgendaFormField[]) => {
    if (!eventoAtual) return;
    setSaving(true);
    try {
      const evSchedules = schedules.filter((s) => s.id_evento === eventoAtual.id_evento);
      await onSaveEvent(eventoAtual, evSchedules, nextCampos);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCampo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoAtual) return;
    if (!novoLabel.trim()) {
      toast.error("Informe a pergunta ou rótulo do campo.");
      return;
    }

    const needsOptions = novoTipo === "SELECAO_UNICA" || novoTipo === "SELECAO_MULTIPLA";
    const opcoesArr = needsOptions
      ? novasOpcoes
          .split(/\n|,/)
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined;

    if (needsOptions && (!opcoesArr || opcoesArr.length === 0)) {
      toast.error("Informe pelo menos uma opção de resposta.");
      return;
    }

    const nomeCampo = novoLabel
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    const novoCampo: AgendaFormField = {
      id_campo: `FLD-${generateRandomCode(5)}`,
      id_evento: eventoAtual.id_evento,
      nome_campo: nomeCampo,
      label: novoLabel.trim(),
      tipo: novoTipo,
      obrigatorio: novoObrigatorio,
      placeholder: novoPlaceholder.trim() || undefined,
      opcoes: opcoesArr,
      ordem: campos.length + 1,
      ativo: true,
    };

    await persistEventFields([...campos, novoCampo]);
    toast.success("Campo adicionado ao questionário do evento!");
    setNovoLabel("");
    setNovoPlaceholder("");
    setNovasOpcoes("");
    setNovoObrigatorio(false);
  };

  const handleDeleteCampo = async (idCampo: string) => {
    const next = campos
      .filter((c) => c.id_campo !== idCampo)
      .map((c, idx) => ({ ...c, ordem: idx + 1 }));
    await persistEventFields(next);
    toast.success("Campo removido do formulário.");
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= campos.length) return;
    const next = [...campos];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    await persistEventFields(next.map((c, idx) => ({ ...c, ordem: idx + 1 })));
  };

  const handleToggleAtivo = async (idCampo: string) => {
    const next = campos.map((c) =>
      c.id_campo === idCampo ? { ...c, ativo: c.ativo === false } : c
    );
    await persistEventFields(next);
  };

  const handleToggleObrigatorio = async (idCampo: string) => {
    const next = campos.map((c) =>
      c.id_campo === idCampo ? { ...c, obrigatorio: !c.obrigatorio } : c
    );
    await persistEventFields(next);
  };

  if (events.length === 0) {
    return (
      <div className="p-10 text-center bg-white dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl space-y-3">
        <Calendar className="w-8 h-8 text-orange-500 mx-auto" />
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
          Nenhum evento encontrado para configurar formulários
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
          Crie seu primeiro evento de agendamento para personalizar as perguntas do questionário na etapa final do agendamento público.
        </p>
        {onCreateEvent && (
          <button
            type="button"
            onClick={onCreateEvent}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Criar Primeiro Evento
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-colors">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
            Construtor de Formulários de Qualificação
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
            Configure perguntas adicionais personalizadas para cada evento. Os campos Nome e WhatsApp são coletados obrigatoriamente por padrão.
          </p>
        </div>

        {/* Seletor de Evento */}
        <div className="flex items-center gap-3 shrink-0">
          <label className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap font-medium">
            Evento:
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-orange-500 font-medium cursor-pointer"
          >
            {events.map((ev) => (
              <option key={ev.id_evento} value={ev.id_evento}>
                {ev.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Adicionar Novo Campo */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Adicionar Novo Campo
              </h3>
            </div>

            <form onSubmit={handleAddCampo} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Pergunta ou Rótulo do Campo *
                </label>
                <input
                  type="text"
                  required
                  value={novoLabel}
                  onChange={(e) => setNovoLabel(e.target.value)}
                  placeholder="Ex: Qual é o faturamento da sua empresa?"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Tipo de Resposta *
                </label>
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value as AgendaFieldType)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  {AGENDA_FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label} ({t.desc})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Texto de Orientação (Placeholder)
                </label>
                <input
                  type="text"
                  value={novoPlaceholder}
                  onChange={(e) => setNovoPlaceholder(e.target.value)}
                  placeholder="Ex: Digite seu cargo ou selecione uma opção"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {(novoTipo === "SELECAO_UNICA" || novoTipo === "SELECAO_MULTIPLA") && (
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Opções de Resposta (Uma por linha ou separadas por vírgula) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={novasOpcoes}
                    onChange={(e) => setNovasOpcoes(e.target.value)}
                    placeholder={"Opção A\nOpção B\nOpção C"}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer pt-1 select-none">
                <input
                  type="checkbox"
                  checked={novoObrigatorio}
                  onChange={(e) => setNovoObrigatorio(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-700 accent-orange-600"
                />
                <span>Campo obrigatório para concluir o agendamento</span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{saving ? "Salvando..." : "Adicionar Campo ao Formulário"}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Coluna Direita: Campos Ativos do Evento */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Campos Ativos do Evento
                </h3>
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                {campos.length} campo{campos.length !== 1 ? "s" : ""} customizado
                {campos.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Campos Base Fixos */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    Nome Completo
                  </span>
                  <span className="text-rose-500 text-[10px]">* Obrigatório</span>
                </div>
                <span className="text-[11px] text-neutral-400 font-mono">Padrão do Sistema</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-200 dark:border-neutral-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    WhatsApp / Telefone
                  </span>
                  <span className="text-rose-500 text-[10px]">* Obrigatório</span>
                </div>
                <span className="text-[11px] text-neutral-400 font-mono">Padrão do Sistema</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-200 dark:border-neutral-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    E-mail
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400 text-[10px]">Opcional</span>
                </div>
                <span className="text-[11px] text-neutral-400 font-mono">Padrão do Sistema</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-200 dark:border-neutral-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {eventoAtual?.label_local?.trim() || "Bairro / Escola / Local"}
                  </span>
                  <span className="text-rose-500 text-[10px]">* Obrigatório</span>
                </div>
                <span className="text-[11px] text-neutral-400 font-mono">Padrão do Evento</span>
              </div>
            </div>

            {/* Lista dos Campos Customizados */}
            {campos.length === 0 ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 py-6 text-center">
                Nenhum campo adicional configurado. Adicione perguntas ao lado para qualificar melhor os clientes antes do atendimento.
              </p>
            ) : (
              <div className="space-y-2">
                {campos.map((campo, idx) => (
                  <div
                    key={campo.id_campo}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      campo.ativo !== false
                        ? "bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                        : "bg-neutral-50/50 dark:bg-neutral-950/50 border-neutral-200 dark:border-neutral-800/50 opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-neutral-400">{idx + 1}.</span>
                          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {campo.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleObrigatorio(campo.id_campo)}
                            className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded border cursor-pointer",
                              campo.obrigatorio
                                ? "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40"
                                : "text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800"
                            )}
                            title="Alternar obrigatoriedade"
                          >
                            {campo.obrigatorio ? "* Obrigatório" : "Opcional"}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 flex-wrap">
                          <span className="font-mono text-orange-600 dark:text-orange-400">
                            {campo.tipo}
                          </span>
                          {campo.opcoes && campo.opcoes.length > 0 && (
                            <>
                              <span>·</span>
                              <span>{campo.opcoes.length} opções ({campo.opcoes.join(", ")})</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0 || saving}
                          onClick={() => handleMove(idx, "up")}
                          className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 rounded cursor-pointer"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === campos.length - 1 || saving}
                          onClick={() => handleMove(idx, "down")}
                          className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 rounded cursor-pointer"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleToggleAtivo(campo.id_campo)}
                          className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded cursor-pointer"
                          title={campo.ativo !== false ? "Desativar campo" : "Ativar campo"}
                        >
                          {campo.ativo !== false ? (
                            <ToggleRight className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-neutral-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleDeleteCampo(campo.id_campo)}
                          className="p-1 text-neutral-400 hover:text-rose-500 rounded cursor-pointer"
                          title="Excluir campo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Editor + Modal exported for EventModal / inline editing compatibility
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
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Adicionar Nova Pergunta
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Nome, WhatsApp e E-mail já são coletados no link público. Adicione perguntas extras de qualificação abaixo.
          </p>
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
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Perguntas Configuradas ({sortedFields.length})
        </span>

        {sortedFields.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            Nenhuma pergunta personalizada cadastrada.
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
                      onClick={() =>
                        handleUpdateField(field.id_campo, { obrigatorio: !field.obrigatorio })
                      }
                      className={cn(
                        "px-2 py-1 rounded-md border text-[10px] font-bold transition-colors cursor-pointer",
                        field.obrigatorio
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {field.obrigatorio ? "Obrig." : "Opcional"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateField(field.id_campo, { ativo: field.ativo === false })}
                      className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {field.ativo === false ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, -1)}
                      className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === sortedFields.length - 1}
                      onClick={() => handleMove(index, 1)}
                      className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteField(field.id_campo)}
                      className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 cursor-pointer"
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
  onSaveFields?: (fields: AgendaFormField[]) => Promise<void> | void;
  onSave?: (fields: AgendaFormField[]) => Promise<void> | void;
}

export const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  isOpen,
  onClose,
  evento,
  initialFields,
  onSaveFields,
  onSave,
}) => {
  const [fields, setFields] = useState<AgendaFormField[]>(initialFields);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFields(initialFields);
  }, [initialFields, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const saveFn = onSaveFields || onSave;
      if (saveFn) await Promise.resolve(saveFn(fields));
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
              <h3 className="text-base font-bold text-foreground truncate">{evento.nome}</h3>
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
          <FormBuilderEditor eventId={evento.id_evento} fields={fields} onChange={setFields} />
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
