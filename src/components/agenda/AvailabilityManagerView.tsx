import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Lock,
  Unlock,
  Users,
  MessageCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Pencil,
  Save,
  X,
  UserX,
} from "lucide-react";
import type {
  AgendaBlock,
  AgendaBooking,
  AgendaBookingStatus,
  AgendaEvent,
  AgendaSchedule,
  AgendaWaitlistEntry,
} from "@/types/agenda";
import {
  buildPublicAgendaPath,
  buildWhatsAppLink,
  formatDateBR,
  getEventSlotsForDate,
  getWeekdayKey,
} from "@/lib/agenda-engine";
import { cloudStore } from "@/services/cloudStorageService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AvailabilityManagerViewProps {
  events: AgendaEvent[];
  schedules: AgendaSchedule[];
  blocks: AgendaBlock[];
  bookings: AgendaBooking[];
  waitlist: AgendaWaitlistEntry[];
  products?: Array<{ id: string; name: string; salePrice?: number }>;
  initialEventId?: string;
  onToggleBlock: (
    idEvento: string,
    data: string,
    horaInicio: string,
    motivo?: string
  ) => Promise<any>;
  onUpdateBookingStatus: (
    idAgendamento: string,
    novoStatus: AgendaBookingStatus,
    motivo?: string
  ) => Promise<any>;
  onUpdateSchedule?: (idHorario: string, updates: Partial<AgendaSchedule>) => Promise<any>;
  onSelectBooking?: (booking: AgendaBooking) => void;
}

function getLocalTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const AvailabilityManagerView: React.FC<AvailabilityManagerViewProps> = ({
  events,
  schedules,
  blocks,
  bookings,
  waitlist,
  products = [],
  initialEventId,
  onToggleBlock,
  onUpdateBookingStatus,
  onUpdateSchedule,
  onSelectBooking,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || events[0]?.id_evento || ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayIso());
  const [blockReason, setBlockReason] = useState<string>("");

  // Inline slot edit (horário + vagas)
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState<string>("");
  const [editEnd, setEditEnd] = useState<string>("");
  const [editCap, setEditCap] = useState<number>(1);
  const [savingSlot, setSavingSlot] = useState<boolean>(false);

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

  const linkedProduct = useMemo(() => {
    if (!eventoAtual?.product_id) return null;
    return products.find((p) => p.id === eventoAtual.product_id) || null;
  }, [eventoAtual, products]);

  const quickDates = useMemo(() => {
    const out: Array<{ iso: string; label: string; weekday: string }> = [];
    const base = new Date();
    const monthShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${d}`;
      out.push({
        iso,
        label: i === 0 ? "Hoje" : `${d} ${monthShort[dt.getMonth()]}`,
        weekday: getWeekdayKey(iso),
      });
    }
    return out;
  }, []);

  const dayAllBlock = useMemo(() => {
    if (!selectedEventId) return undefined;
    return blocks.find(
      (b) =>
        (b.id_evento === "*" || b.id_evento === selectedEventId) &&
        b.data === selectedDate &&
        b.hora_inicio === "ALL_DAY"
    );
  }, [blocks, selectedEventId, selectedDate]);

  const slots = useMemo(() => {
    if (!selectedEventId || !selectedDate) return [];
    const db = cloudStore.getState();
    return getEventSlotsForDate(
      {
        agendaEvents: events.length ? events : db.agendaEvents,
        agendaSchedules: schedules.length ? schedules : db.agendaSchedules,
        agendaBlocks: blocks,
        agendaBookings: bookings,
      },
      selectedEventId,
      selectedDate
    );
  }, [events, schedules, blocks, bookings, selectedEventId, selectedDate]);

  const dayBookings = useMemo(() => {
    return bookings
      .filter((b) => b.id_evento === selectedEventId && b.data_agendamento === selectedDate)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }, [bookings, selectedEventId, selectedDate]);

  const eventWaitlist = useMemo(
    () => waitlist.filter((w) => w.id_evento === selectedEventId),
    [waitlist, selectedEventId]
  );

  const handleToggleDayBlock = async () => {
    if (!selectedEventId) return;
    await onToggleBlock(
      selectedEventId,
      selectedDate,
      "ALL_DAY",
      blockReason.trim() || "Dia bloqueado administrativamente"
    );
    toast.success(
      dayAllBlock
        ? "Dia desbloqueado com sucesso."
        : `Dia ${formatDateBR(selectedDate)} bloqueado.`
    );
  };

  const handleToggleSlotBlock = async (horaInicio: string, currentlyBlocked: boolean) => {
    if (!selectedEventId) return;
    await onToggleBlock(
      selectedEventId,
      selectedDate,
      horaInicio,
      blockReason.trim() || "Bloqueio manual pelo painel administrativo"
    );
    toast.success(
      currentlyBlocked ? `Horário ${horaInicio} liberado.` : `Horário ${horaInicio} bloqueado.`
    );
  };

  if (events.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Nenhum evento encontrado. Crie seu primeiro evento para gerenciar horários e vagas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-colors">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
            Controle de Disponibilidade &amp; Capacidade
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
            Monitore o preenchimento de vagas em tempo real para cada horário, edite horários/vagas ou realize bloqueios administrativos pontuais.
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
                {ev.nome} ({ev.id_evento})
              </option>
            ))}
          </select>
        </div>
      </div>

      {eventoAtual ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Seletor de Data & Parâmetros + Motivo Bloqueio */}
          <div className="space-y-4">
            <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Selecionar Data
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleToggleDayBlock}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 border cursor-pointer transition-colors",
                    dayAllBlock
                      ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                      : "bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-orange-500"
                  )}
                >
                  {dayAllBlock ? (
                    <>
                      <Unlock className="w-3 h-3" /> Liberar Dia
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" /> Bloquear Dia
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Data de Atendimento
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              {/* Atalho Rápido 7 dias */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {quickDates.map((qd) => {
                  const active = selectedDate === qd.iso;
                  return (
                    <button
                      key={qd.iso}
                      type="button"
                      onClick={() => setSelectedDate(qd.iso)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border text-[11px] whitespace-nowrap shrink-0 cursor-pointer transition-colors",
                        active
                          ? "border-orange-600 bg-orange-600 text-white font-semibold"
                          : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 hover:border-orange-500"
                      )}
                    >
                      {qd.label}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2 text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center justify-between gap-2">
                  <span>Programação:</span>
                  <span className="font-mono text-right text-neutral-800 dark:text-neutral-300">
                    {(eventoAtual.dias_semana || []).join(", ") || "SEG - SEX"}
                  </span>
                </div>
                {linkedProduct && (
                  <div className="flex items-center justify-between gap-2">
                    <span>Produto / Valor:</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-right truncate">
                      {linkedProduct.name}
                      {Number(linkedProduct.salePrice || 0) > 0
                        ? ` · R$ ${Number(linkedProduct.salePrice).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}`
                        : ""}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Capacidade Base por Slot:</span>
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                    {eventoAtual.capacidade_padrao} vaga
                    {eventoAtual.capacidade_padrao !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Duração da Sessão:</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-300">
                    {eventoAtual.duracao_minutos} min
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {eventoAtual.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Motivo Opcional para Bloqueio */}
            <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Motivo do Bloqueio
                </h3>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Informe a razão ao bloquear um horário (ex: Reunião de Diretoria, Feriado ou Ausência).
              </p>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ex: Reunião interna da equipe"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Coluna 2 & 3: Horários e Vagas em Tempo Real + Agendamentos + Lista de Espera */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Horários para {formatDateBR(selectedDate)} ({getWeekdayKey(selectedDate)})
                  </h3>
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                  {slots.length} horário{slots.length !== 1 ? "s" : ""} cadastrado
                  {slots.length !== 1 ? "s" : ""}
                </span>
              </div>

              {slots.length === 0 ? (
                <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                  <Calendar className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                    Nenhum horário cadastrado para este dia da semana.
                  </p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                    Verifique os dias aplicáveis configurados na edição do evento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {slots.map((slot) => {
                    const esgotado = slot.vagas_restantes <= 0 && !slot.bloqueado;
                    const percentual =
                      slot.capacidade_total > 0
                        ? Math.round(
                            (slot.agendamentos_confirmados / slot.capacidade_total) * 100
                          )
                        : 0;
                    const isEditing = editingSlotId === slot.id_horario;
                    const slotSpecificBlock = blocks.find(
                      (b) =>
                        (b.id_evento === "*" || b.id_evento === selectedEventId) &&
                        b.data === selectedDate &&
                        b.hora_inicio === slot.hora_inicio
                    );

                    return (
                      <div
                        key={slot.id_horario}
                        className={cn(
                          "p-4 rounded-xl border transition-all space-y-3",
                          slot.bloqueado
                            ? "bg-neutral-100 dark:bg-neutral-950/80 border-neutral-200 dark:border-neutral-800/80 opacity-80"
                            : esgotado
                            ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                            : "bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          {/* Horário & Status + Barra */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-base font-bold font-mono text-neutral-900 dark:text-white">
                                {slot.hora_inicio} às {slot.hora_fim}
                              </span>
                              {slot.bloqueado ? (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                  <Lock className="w-3.5 h-3.5" />
                                  Bloqueado Administrativamente
                                </span>
                              ) : esgotado ? (
                                <span className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Vagas Esgotadas ({slot.agendamentos_confirmados}/
                                  {slot.capacidade_total})
                                </span>
                              ) : (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Disponível ({slot.vagas_restantes} vaga
                                  {slot.vagas_restantes !== 1 ? "s" : ""} livre
                                  {slot.vagas_restantes !== 1 ? "s" : ""})
                                </span>
                              )}
                            </div>

                            {slot.bloqueado && slot.motivo_bloqueio && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">
                                Motivo: {slot.motivo_bloqueio}
                              </p>
                            )}

                            {/* Barra de Progresso */}
                            <div className="flex items-center gap-3 pt-1.5">
                              <div className="w-36 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    slot.bloqueado
                                      ? "bg-neutral-400 dark:bg-neutral-600"
                                      : esgotado
                                      ? "bg-rose-500"
                                      : "bg-orange-500"
                                  )}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(slot.agendamentos_confirmados > 0 ? 10 : 0, percentual)
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                                {slot.agendamentos_confirmados} de {slot.capacidade_total} vagas ocupadas ({percentual}%)
                              </span>
                            </div>
                          </div>

                          {/* Ações do Slot */}
                          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                            {onUpdateSchedule && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isEditing) {
                                    setEditingSlotId(null);
                                  } else {
                                    setEditingSlotId(slot.id_horario);
                                    setEditStart(slot.hora_inicio);
                                    setEditEnd(slot.hora_fim);
                                    setEditCap(slot.capacidade_total);
                                  }
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border cursor-pointer transition-colors",
                                  isEditing
                                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300"
                                    : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                )}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>
                            )}

                            {!dayAllBlock && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleSlotBlock(
                                    slot.hora_inicio,
                                    Boolean(slotSpecificBlock)
                                  )
                                }
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                                  slotSpecificBlock
                                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200"
                                    : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                )}
                              >
                                {slotSpecificBlock ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Desbloquear Horário</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Bloquear Horário</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Edição Inline de Horário e Vagas */}
                        {isEditing && onUpdateSchedule && (
                          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2.5">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-neutral-500">
                                  Início
                                </label>
                                <input
                                  type="time"
                                  value={editStart}
                                  onChange={(e) => setEditStart(e.target.value)}
                                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs font-mono text-neutral-900 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-neutral-500">
                                  Término
                                </label>
                                <input
                                  type="time"
                                  value={editEnd}
                                  onChange={(e) => setEditEnd(e.target.value)}
                                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs font-mono text-neutral-900 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-neutral-500">
                                  Vagas
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={500}
                                  value={editCap}
                                  onChange={(e) =>
                                    setEditCap(Math.max(1, Number(e.target.value) || 1))
                                  }
                                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs font-mono font-bold tabular-nums text-neutral-900 dark:text-white"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingSlotId(null)}
                                className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                              >
                                <X className="h-3 w-3" /> Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={savingSlot}
                                onClick={async () => {
                                  if (!editStart || !editEnd || editEnd <= editStart) {
                                    toast.error("O horário final deve ser maior que o inicial.");
                                    return;
                                  }
                                  setSavingSlot(true);
                                  try {
                                    await onUpdateSchedule(slot.id_horario, {
                                      hora_inicio: editStart,
                                      hora_fim: editEnd,
                                      capacidade: Math.max(1, Number(editCap) || 1),
                                    });
                                    toast.success("Horário e vagas atualizados!");
                                    setEditingSlotId(null);
                                  } finally {
                                    setSavingSlot(false);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-orange-600 hover:bg-orange-500 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-50 cursor-pointer"
                              >
                                <Save className="h-3 w-3" /> Salvar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Agendamentos em DD/MM/YYYY (Controle de Presença / Cancelamento) */}
            <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Agendamentos em {formatDateBR(selectedDate)}
                </h3>
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                  {dayBookings.length} registro{dayBookings.length !== 1 ? "s" : ""}
                </span>
              </div>

              {dayBookings.length === 0 ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Nenhum agendamento registrado para esta data.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {dayBookings.map((agd) => (
                    <div
                      key={agd.id_agendamento}
                      className="p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectBooking?.(agd)}
                        className="text-left space-y-0.5 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                            {agd.hora_inicio}
                          </span>
                          <span className="font-semibold text-neutral-900 dark:text-white truncate">
                            {agd.lead_nome || "Participante"}
                          </span>
                          <span className="font-mono text-[10px] text-neutral-500">
                            {agd.protocolo}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          Status atual: <strong className="font-mono">{agd.status}</strong>
                        </p>
                      </button>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateBookingStatus(agd.id_agendamento, "REALIZADO")}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 border cursor-pointer transition-colors",
                            agd.status === "REALIZADO"
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-emerald-500"
                          )}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Realizado</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateBookingStatus(agd.id_agendamento, "NO_SHOW")}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 border cursor-pointer transition-colors",
                            agd.status === "NO_SHOW"
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-amber-500"
                          )}
                        >
                          <UserX className="w-3 h-3" />
                          <span>Faltou</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateBookingStatus(
                              agd.id_agendamento,
                              agd.status === "CANCELADO" ? "CONFIRMADO" : "CANCELADO"
                            )
                          }
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 border cursor-pointer transition-colors",
                            agd.status === "CANCELADO"
                              ? "bg-rose-600 text-white border-rose-600"
                              : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-rose-500"
                          )}
                        >
                          <XCircle className="w-3 h-3" />
                          <span>{agd.status === "CANCELADO" ? "Reativar" : "Cancelar"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de Espera do Evento */}
            <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  <span>Lista de Espera ({eventWaitlist.length})</span>
                </h3>
              </div>

              {eventWaitlist.length === 0 ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Nenhum interessado aguardando vaga neste evento.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {eventWaitlist.map((w) => {
                    const inviteUrl =
                      typeof window !== "undefined" && eventoAtual
                        ? `${window.location.origin}${buildPublicAgendaPath(eventoAtual.slug, {
                            nome: w.nome,
                            whatsapp: w.whatsapp,
                            email: w.email,
                          })}`
                        : "";
                    const waHref = buildWhatsAppLink(
                      w.whatsapp,
                      `Olá ${w.nome}! Liberamos um horário para ${
                        w.evento_nome || eventoAtual?.nome || "nosso evento"
                      }. Você pode escolher seu horário aqui: ${inviteUrl}`
                    );

                    return (
                      <div
                        key={w.id_espera}
                        className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                            {w.nome}
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono truncate">
                            {w.whatsapp} {w.email ? `· ${w.email}` : ""}
                          </div>
                          {w.observacoes && (
                            <div className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                              {w.observacoes}
                            </div>
                          )}
                        </div>
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shrink-0"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> Chamar
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
