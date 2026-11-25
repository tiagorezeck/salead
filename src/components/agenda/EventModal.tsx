import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  Package,
  ListChecks,
  Sparkles,
} from "lucide-react";
import type {
  AgendaEvent,
  AgendaEventStatus,
  AgendaEventType,
  AgendaFormField,
  AgendaSchedule,
} from "@/types/agenda";
import { generateRandomCode, slugifyText, WEEKDAY_OPTIONS } from "@/lib/agenda-engine";
import { FormBuilderEditor } from "@/components/agenda/FormBuilderView";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventoToEdit?: AgendaEvent | null;
  initialSchedules?: AgendaSchedule[];
  initialFields?: AgendaFormField[];
  products?: Array<{ id: string; name: string; salePrice?: number }>;
  onSave: (
    evento: AgendaEvent,
    horarios: AgendaSchedule[],
    campos: AgendaFormField[]
  ) => Promise<any>;
}

type ModalTab = "geral" | "horarios" | "perguntas";

function calcEndTime(startHHMM: string, durationMinutes: number): string {
  const [h, m] = startHHMM.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return "10:00";
  const total = h * 60 + m + (durationMinutes || 30);
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  eventoToEdit,
  initialSchedules = [],
  initialFields = [],
  products = [],
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>("geral");
  const [saving, setSaving] = useState(false);

  const [eventId, setEventId] = useState("");
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [tipoEvento, setTipoEvento] = useState<AgendaEventType>("ONLINE");
  const [localEvento, setLocalEvento] = useState("Reunião Online (Videochamada)");
  const [labelLocal, setLabelLocal] = useState("");
  const [localOpcoesText, setLocalOpcoesText] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [productId, setProductId] = useState("");
  const [exibirProdutoPublico, setExibirProdutoPublico] = useState(true);
  const [duracaoMinutos, setDuracaoMinutos] = useState(30);
  const [capacidadePadrao, setCapacidadePadrao] = useState(1);
  const [diasAntecedenciaMax, setDiasAntecedenciaMax] = useState(30);
  const [diasSemana, setDiasSemana] = useState<string[]>(["SEG", "TER", "QUA", "QUI", "SEX"]);
  const [status, setStatus] = useState<AgendaEventStatus>("PUBLICADO");
  const [agendaPublicaAtiva, setAgendaPublicaAtiva] = useState(true);
  const [permitirListaEspera, setPermitirListaEspera] = useState(true);
  const [permiteCancelamento, setPermiteCancelamento] = useState(true);
  const [horasCancelamento, setHorasCancelamento] = useState(4);
  const [mensagemConfirmacao, setMensagemConfirmacao] = useState(
    "Seu horário está confirmado! Nossa equipe entrará em contato pelo WhatsApp para enviar os detalhes."
  );
  const [mensagemIndisponivel, setMensagemIndisponivel] = useState("");

  const [schedules, setSchedules] = useState<AgendaSchedule[]>([]);
  const [fields, setFields] = useState<AgendaFormField[]>([]);

  // Novo slot form
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("09:30");
  const [newCap, setNewCap] = useState(1);

  const lastInitKeyRef = React.useRef<string>("");
  const slotsCustomizedRef = React.useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      lastInitKeyRef.current = "";
      slotsCustomizedRef.current = false;
      return;
    }

    const initKey = eventoToEdit ? `edit:${eventoToEdit.id_evento}` : "create:new";
    if (lastInitKeyRef.current === initKey) {
      return;
    }
    lastInitKeyRef.current = initKey;
    slotsCustomizedRef.current = Boolean(eventoToEdit);

    setActiveTab("geral");
    if (eventoToEdit) {
      setEventId(eventoToEdit.id_evento);
      setNome(eventoToEdit.nome);
      setSlug(eventoToEdit.slug);
      setSlugTouched(true);
      setDescricao(eventoToEdit.descricao || "");
      setTipoEvento(eventoToEdit.tipo_evento || "ONLINE");
      setLocalEvento(eventoToEdit.local_evento || "");
      setLabelLocal(eventoToEdit.label_local || "");
      setLocalOpcoesText((eventoToEdit.local_opcoes || []).join("\n"));
      setImagemUrl(eventoToEdit.imagem_url || "");
      setProductId(eventoToEdit.product_id || "");
      setExibirProdutoPublico(eventoToEdit.exibir_produto_publico !== false);
      setDuracaoMinutos(Number(eventoToEdit.duracao_minutos || 30));
      setCapacidadePadrao(Number(eventoToEdit.capacidade_padrao || 1));
      setDiasAntecedenciaMax(Number(eventoToEdit.dias_antecedencia_max || 30));
      setDiasSemana(
        Array.isArray(eventoToEdit.dias_semana) && eventoToEdit.dias_semana.length > 0
          ? eventoToEdit.dias_semana
          : ["SEG", "TER", "QUA", "QUI", "SEX"]
      );
      setStatus(eventoToEdit.status || "PUBLICADO");
      setAgendaPublicaAtiva(eventoToEdit.agenda_publica_ativa !== false);
      setPermitirListaEspera(eventoToEdit.permitir_lista_espera !== false);
      setPermiteCancelamento(eventoToEdit.permite_cancelamento !== false);
      setHorasCancelamento(Number(eventoToEdit.horas_antecedencia_cancelamento || 4));
      setMensagemConfirmacao(
        eventoToEdit.mensagem_confirmacao ||
          "Seu horário está confirmado! Nossa equipe entrará em contato pelo WhatsApp."
      );
      setMensagemIndisponivel(eventoToEdit.mensagem_indisponivel || "");
      setSchedules(initialSchedules);
      setFields(initialFields);
      setNewCap(Number(eventoToEdit.capacidade_padrao || 1));
      setNewEnd(calcEndTime("09:00", Number(eventoToEdit.duracao_minutos || 30)));
    } else {
      const freshId = `EVT-${generateRandomCode(5)}`;
      const defaultDays = ["SEG", "TER", "QUA", "QUI", "SEX"];
      setEventId(freshId);
      setNome("");
      setSlug("");
      setSlugTouched(false);
      setDescricao("");
      setTipoEvento("ONLINE");
      setLocalEvento("Reunião Online (Google Meet / WhatsApp)");
      setLabelLocal("");
      setLocalOpcoesText("");
      setImagemUrl("");
      setProductId("");
      setExibirProdutoPublico(true);
      setDuracaoMinutos(30);
      setCapacidadePadrao(1);
      setDiasAntecedenciaMax(30);
      setDiasSemana(defaultDays);
      setStatus("PUBLICADO");
      setAgendaPublicaAtiva(true);
      setPermitirListaEspera(true);
      setPermiteCancelamento(true);
      setHorasCancelamento(4);
      setMensagemConfirmacao(
        "Seu horário está confirmado! Nossa equipe entrará em contato pelo WhatsApp para enviar os detalhes."
      );
      setMensagemIndisponivel("");
      setSchedules([
        { id_horario: `SCH-${generateRandomCode(5)}`, id_evento: freshId, hora_inicio: "09:00", hora_fim: "09:30", capacidade: 1, dias_aplicaveis: defaultDays, ativo: true },
        { id_horario: `SCH-${generateRandomCode(5)}`, id_evento: freshId, hora_inicio: "10:00", hora_fim: "10:30", capacidade: 1, dias_aplicaveis: defaultDays, ativo: true },
        { id_horario: `SCH-${generateRandomCode(5)}`, id_evento: freshId, hora_inicio: "14:00", hora_fim: "14:30", capacidade: 1, dias_aplicaveis: defaultDays, ativo: true },
        { id_horario: `SCH-${generateRandomCode(5)}`, id_evento: freshId, hora_inicio: "16:00", hora_fim: "16:30", capacidade: 1, dias_aplicaveis: defaultDays, ativo: true },
      ]);
      setFields([]);
      setNewStart("09:00");
      setNewEnd("09:30");
      setNewCap(1);
    }
  }, [isOpen, eventoToEdit, initialSchedules, initialFields]);

  if (!isOpen) return null;

  const toggleWeekday = (dayId: string) => {
    setDiasSemana((prev) => {
      const nextDays = prev.includes(dayId)
        ? prev.filter((d) => d !== dayId)
        : [...prev, dayId];
      // Mantém os horários da grade sincronizados com os dias da semana selecionados
      setSchedules((cur) =>
        cur.map((s) => ({
          ...s,
          dias_aplicaveis: nextDays.length > 0 ? nextDays : s.dias_aplicaveis,
        }))
      );
      return nextDays;
    });
  };

  const handleAddSlot = () => {
    if (!newStart || !newEnd) {
      toast.error("Informe início e fim do horário.");
      return;
    }
    if (schedules.some((s) => s.hora_inicio === newStart)) {
      toast.error("Já existe um horário começando às " + newStart);
      return;
    }
    slotsCustomizedRef.current = true;
    setSchedules((prev) =>
      [
        ...prev,
        {
          id_horario: `SCH-${generateRandomCode(5)}`,
          id_evento: eventId,
          hora_inicio: newStart,
          hora_fim: newEnd,
          capacidade: Math.max(1, Number(newCap) || 1),
          dias_aplicaveis: diasSemana,
          ativo: true,
        },
      ].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    );
  };

  const handleGenerateCommercialGrid = () => {
    const hours = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];
    const next: AgendaSchedule[] = hours.map((h) => ({
      id_horario: `SCH-${generateRandomCode(5)}`,
      id_evento: eventId,
      hora_inicio: h,
      hora_fim: calcEndTime(h, duracaoMinutos),
      capacidade: Math.max(1, Number(capacidadePadrao) || 1),
      dias_aplicaveis: diasSemana,
      ativo: true,
    }));
    setSchedules(next);
    toast.success("Grade comercial gerada!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do evento.");
      setActiveTab("geral");
      return;
    }
    if (diasSemana.length === 0) {
      toast.error("Selecione pelo menos um dia da semana.");
      setActiveTab("geral");
      return;
    }
    if (schedules.filter((s) => s.ativo !== false).length === 0) {
      toast.error("Adicione pelo menos 1 horário ativo na grade.");
      setActiveTab("horarios");
      return;
    }

    const nowIso = new Date().toISOString();
    const localOpcoes = localOpcoesText
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: AgendaEvent = {
      id_evento: eventId,
      nome: nome.trim(),
      slug: slugifyText(slug || nome),
      descricao: descricao.trim(),
      local_evento: localEvento.trim() || "Online",
      tipo_evento: tipoEvento,
      duracao_minutos: Math.max(5, Number(duracaoMinutos) || 30),
      capacidade_padrao: Math.max(1, Number(capacidadePadrao) || 1),
      dias_semana: diasSemana,
      dias_antecedencia_max: Math.max(1, Number(diasAntecedenciaMax) || 30),
      imagem_url: imagemUrl.trim() || undefined,
      product_id: productId || undefined,
      exibir_produto_publico: exibirProdutoPublico,
      label_local: labelLocal.trim() || undefined,
      local_opcoes: localOpcoes.length > 0 ? localOpcoes : undefined,
      status,
      agenda_publica_ativa: agendaPublicaAtiva,
      mensagem_indisponivel: mensagemIndisponivel.trim() || undefined,
      permitir_lista_espera: permitirListaEspera,
      mensagem_confirmacao: mensagemConfirmacao.trim(),
      permite_cancelamento: permiteCancelamento,
      horas_antecedencia_cancelamento: Math.max(0, Number(horasCancelamento) || 0),
      visitas: eventoToEdit?.visitas || 0,
      criado_em: eventoToEdit?.criado_em || nowIso,
      atualizado_em: nowIso,
    };

    const syncedSchedules = schedules.map((s) => {
      const existingDays = Array.isArray(s.dias_aplicaveis) ? s.dias_aplicaveis : [];
      const intersected = existingDays.filter((d) => diasSemana.includes(d));
      return {
        ...s,
        id_evento: eventId,
        dias_aplicaveis: intersected.length > 0 ? intersected : diasSemana,
      };
    });

    setSaving(true);
    try {
      await Promise.resolve(onSave(payload, syncedSchedules, fields));
      toast.success(
        eventoToEdit ? "Evento atualizado com sucesso!" : "Evento criado e publicado na agenda!"
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar evento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-6">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border border-primary/20 bg-primary/10 text-primary grid place-items-center">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Configuração de Evento de Agendamento
              </div>
              <h3 className="text-base font-bold text-foreground">
                {eventoToEdit ? eventoToEdit.nome : "Novo Evento Agendável"}
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

        {/* Modal Tabs */}
        <div className="px-6 pt-3 border-b border-border flex items-center gap-1 bg-muted/10">
          <button
            type="button"
            onClick={() => setActiveTab("geral")}
            className={cn(
              "px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "geral"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            1. Dados do Evento
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("horarios")}
            className={cn(
              "px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "horarios"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            2. Grade de Horários ({schedules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("perguntas")}
            className={cn(
              "px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "perguntas"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <ListChecks className="h-3.5 w-3.5" />
            3. Formulário ({fields.length})
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
            {activeTab === "geral" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Nome do Evento *
                    </label>
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => {
                        setNome(e.target.value);
                        if (!slugTouched) setSlug(slugifyText(e.target.value));
                      }}
                      placeholder="Ex: Sessão Estratégica High-Ticket"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Slug Público (/agendar/...)
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(slugifyText(e.target.value));
                      }}
                      placeholder="sessao-estrategica"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">
                    Descrição (exibida para o visitante na página pública)
                  </label>
                  <textarea
                    rows={2}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Explique o objetivo da reunião, call ou atendimento..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Modalidade
                    </label>
                    <select
                      value={tipoEvento}
                      onChange={(e) => setTipoEvento(e.target.value as AgendaEventType)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium"
                    >
                      <option value="ONLINE">Online (Meet / Zoom / WhatsApp)</option>
                      <option value="PRESENCIAL">Presencial</option>
                      <option value="HIBRIDO">Híbrido (Online ou Presencial)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Local / Link de Atendimento
                    </label>
                    <input
                      type="text"
                      value={localEvento}
                      onChange={(e) => setLocalEvento(e.target.value)}
                      placeholder="Ex: Google Meet ou Endereço"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3 text-primary" /> Produto Salead (Opcional)
                    </label>
                    <select
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    >
                      <option value="">Sem vínculo direto</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Duração (min)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={480}
                      value={duracaoMinutos}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 30;
                        setDuracaoMinutos(val);
                        setNewEnd(calcEndTime(newStart, val));
                        if (!slotsCustomizedRef.current) {
                          setSchedules((prev) =>
                            prev.map((s) => ({
                              ...s,
                              hora_fim: calcEndTime(s.hora_inicio, val),
                            }))
                          );
                        }
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono tabular-nums"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Vagas / Horário
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={capacidadePadrao}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        setCapacidadePadrao(val);
                        setNewCap(val);
                        if (!slotsCustomizedRef.current) {
                          setSchedules((prev) =>
                            prev.map((s) => ({ ...s, capacidade: val }))
                          );
                        }
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono tabular-nums"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-bold uppercase text-muted-foreground"
                      title="Quantos dias futuros à frente ficam visíveis para agendamento (ex: 30 dias)"
                    >
                      Dias Futuros Abertos
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={diasAntecedenciaMax}
                      onChange={(e) => setDiasAntecedenciaMax(Number(e.target.value) || 30)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono tabular-nums"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as AgendaEventStatus)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold"
                    >
                      <option value="PUBLICADO">Publicado (Ativo)</option>
                      <option value="PAUSADO">Pausado / Fechado</option>
                      <option value="ENCERRADO">Encerrado</option>
                      <option value="RASCUNHO">Rascunho</option>
                    </select>
                  </div>
                </div>

                {/* Dias da semana */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground block">
                    Dias da Semana Disponíveis *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((d) => {
                      const active = diasSemana.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleWeekday(d.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Rótulo do Campo Local (opcional)
                    </label>
                    <input
                      type="text"
                      value={labelLocal}
                      onChange={(e) => setLabelLocal(e.target.value)}
                      placeholder="Ex: Bairro / Escola / Empresa / Local"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      URL da Imagem / Capa do Evento (opcional)
                    </label>
                    <input
                      type="url"
                      value={imagemUrl}
                      onChange={(e) => setImagemUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Opções de Local para o Visitante (opcional, 1 por linha)
                    </label>
                    <textarea
                      rows={2}
                      value={localOpcoesText}
                      onChange={(e) => setLocalOpcoesText(e.target.value)}
                      placeholder="Ex: Online via Google Meet&#10;Presencial - Unidade Centro"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Mensagem Pós-Agendamento
                    </label>
                    <textarea
                      rows={2}
                      value={mensagemConfirmacao}
                      onChange={(e) => setMensagemConfirmacao(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {productId && (
                  <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exibirProdutoPublico}
                      onChange={(e) => setExibirProdutoPublico(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="font-medium">
                      Exibir produto vinculado e valor na página pública de agendamento
                    </span>
                  </label>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agendaPublicaAtiva}
                      onChange={(e) => setAgendaPublicaAtiva(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="font-medium">Exibir no Portal Público</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permitirListaEspera}
                      onChange={(e) => setPermitirListaEspera(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="font-medium">Ativar Lista de Espera</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permiteCancelamento}
                      onChange={(e) => setPermiteCancelamento(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="font-medium">Auto-remarcação / Cancelar</span>
                  </label>
                </div>

                {(!agendaPublicaAtiva || status !== "PUBLICADO") && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Mensagem quando agenda estiver fechada / indisponível
                    </label>
                    <input
                      type="text"
                      value={mensagemIndisponivel}
                      onChange={(e) => setMensagemIndisponivel(e.target.value)}
                      placeholder="Deixe em branco para usar a mensagem padrão do sistema."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                )}
              </>
            )}

            {activeTab === "horarios" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Adicionar Horário à Grade
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Define os horários exibidos nos dias da semana selecionados.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateCommercialGrid}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/15 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Gerar Grade Comercial Padrão
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">
                        Início
                      </label>
                      <input
                        type="time"
                        value={newStart}
                        onChange={(e) => {
                          setNewStart(e.target.value);
                          setNewEnd(calcEndTime(e.target.value, duracaoMinutos));
                        }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">
                        Término
                      </label>
                      <input
                        type="time"
                        value={newEnd}
                        onChange={(e) => setNewEnd(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">
                        Vagas
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={newCap}
                        onChange={(e) => setNewCap(Number(e.target.value) || 1)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono tabular-nums"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSlot}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                  {schedules.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      Nenhum horário configurado. Adicione horários acima ou gere a grade padrão.
                    </div>
                  ) : (
                    schedules.map((slot) => (
                      <div
                        key={slot.id_horario}
                        className={cn(
                          "px-4 py-3 flex flex-wrap items-center justify-between gap-3",
                          slot.ativo === false && "opacity-60"
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              aria-label="Hora de início"
                              value={slot.hora_inicio}
                              onChange={(e) => {
                                slotsCustomizedRef.current = true;
                                setSchedules((prev) =>
                                  prev.map((s) =>
                                    s.id_horario === slot.id_horario
                                      ? { ...s, hora_inicio: e.target.value }
                                      : s
                                  )
                                );
                              }}
                              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                            />
                            <span className="text-xs text-muted-foreground font-semibold">—</span>
                            <input
                              type="time"
                              aria-label="Hora de término"
                              value={slot.hora_fim}
                              onChange={(e) => {
                                slotsCustomizedRef.current = true;
                                setSchedules((prev) =>
                                  prev.map((s) =>
                                    s.id_horario === slot.id_horario
                                      ? { ...s, hora_fim: e.target.value }
                                      : s
                                  )
                                );
                              }}
                              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1">
                            <input
                              type="number"
                              min={1}
                              max={500}
                              aria-label="Quantidade de vagas"
                              value={slot.capacidade}
                              onChange={(e) => {
                                slotsCustomizedRef.current = true;
                                const parsed = Math.max(1, Number(e.target.value) || 1);
                                setSchedules((prev) =>
                                  prev.map((s) =>
                                    s.id_horario === slot.id_horario
                                      ? { ...s, capacidade: parsed }
                                      : s
                                  )
                                );
                              }}
                              className="w-14 bg-transparent text-xs font-mono font-bold tabular-nums text-foreground focus:outline-none text-center"
                            />
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {slot.capacidade === 1 ? "vaga" : "vagas"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSchedules((prev) =>
                                prev.map((s) =>
                                  s.id_horario === slot.id_horario
                                    ? { ...s, ativo: s.ativo === false }
                                    : s
                                )
                              )
                            }
                            className={cn(
                              "px-2.5 py-1 rounded-md border text-[11px] font-semibold cursor-pointer",
                              slot.ativo !== false
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border-border text-muted-foreground"
                            )}
                          >
                            {slot.ativo !== false ? "Ativo" : "Pausado"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSchedules((prev) =>
                                prev.filter((s) => s.id_horario !== slot.id_horario)
                              )
                            }
                            className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Remover horário"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "perguntas" && (
              <FormBuilderEditor
                eventId={eventId}
                fields={fields}
                onChange={setFields}
              />
            )}
          </div>

          <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
            <div className="text-[11px] text-muted-foreground font-mono">
              /agendar/{slug || slugifyText(nome || "evento")}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Salvando..." : eventoToEdit ? "Salvar Alterações" : "Publicar Evento"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
