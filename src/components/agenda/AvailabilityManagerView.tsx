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
  SlidersHorizontal,
  Pencil,
  Save,
  X,
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
  const [blockReason, setBlockReason] = useState<string>("Bloqueio administrativo");
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
    } else if (selectedEventId && events.length > 0 && !events.some((e) => e.id_evento === selectedEventId)) {
      setSelectedEventId(events[0].id_evento);
    }
  }, [initialEventId, events, selectedEventId]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id_evento === selectedEventId) || null,
    [events, selectedEventId]
  );

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
      .filter(
        (b) =>
          b.id_evento === selectedEventId &&
          b.data_agendamento === selectedDate
      )
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }, [bookings, selectedEventId, selectedDate]);

  const eventWaitlist = useMemo(
    () => waitlist.filter((w) => w.id_evento === selectedEventId),
    [waitlist, selectedEventId]
  );

  const handleToggleDayBlock = async () => {
    if (!selectedEventId) return;
    await onToggleBlock(selectedEventId, selectedDate, "ALL_DAY", blockReason.trim() || "Dia bloqueado");
    toast.success(
      dayAllBlock ? "Dia desbloqueado com sucesso." : `Dia ${formatDateBR(selectedDate)} bloqueado.`
    );
  };

  const handleToggleSlotBlock = async (horaInicio: string, currentlyBlocked: boolean) => {
    if (!selectedEventId) return;
    await onToggleBlock(selectedEventId, selectedDate, horaInicio, blockReason.trim() || "Horário bloqueado");
    toast.success(
      currentlyBlocked
        ? `Horário ${horaInicio} liberado.`
        : `Horário ${horaInicio} bloqueado.`
    );
  };

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-2">
        <SlidersHorizontal className="h-6 w-6 mx-auto text-muted-foreground" />
        <div className="text-sm font-bold text-foreground">
          Crie um evento primeiro para gerenciar horários
        </div>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Acesse a aba Eventos, cadastre sua grade semanal e volte aqui para bloquear dias específicos, acompanhar vagas por horário e gerenciar a lista de espera.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Evento Selecionado
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {events.map((ev) => (
                <option key={ev.id_evento} value={ev.id_evento}>
                  {ev.nome} ({ev.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Data de Consulta
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Motivo de Bloqueio (Opcional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ex: Feriado, Reunião interna..."
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={handleToggleDayBlock}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors",
                  dayAllBlock
                    ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
                    : "border-border bg-muted/50 text-foreground hover:bg-muted"
                )}
              >
                {dayAllBlock ? (
                  <>
                    <Unlock className="h-3.5 w-3.5" /> Desbloquear Dia
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" /> Bloquear Dia
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick 7-day strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {quickDates.map((qd) => {
            const active = selectedDate === qd.iso;
            return (
              <button
                key={qd.iso}
                type="button"
                onClick={() => setSelectedDate(qd.iso)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground font-semibold"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {qd.label} · {qd.weekday}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split: Slots & Day Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Slots Grid */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Grade de Horários — {formatDateBR(selectedDate)} ({getWeekdayKey(selectedDate)})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedEvent?.nome} · Clique no cadeado para bloquear ou liberar um horário específico.
              </p>
            </div>
            {dayAllBlock && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                <Lock className="h-3 w-3" /> Dia Bloqueado: {dayAllBlock.motivo}
              </span>
            )}
          </div>

          {slots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground">
                Nenhum horário configurado para {getWeekdayKey(selectedDate)}
              </div>
              <div>
                Verifique os dias de atendimento e a grade do evento em &ldquo;Eventos &gt; Editar&rdquo;.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {slots.map((slot) => {
                const slotSpecificBlock = blocks.find(
                  (b) =>
                    (b.id_evento === "*" || b.id_evento === selectedEventId) &&
                    b.data === selectedDate &&
                    b.hora_inicio === slot.hora_inicio
                );
                const isFull = !slot.bloqueado && slot.vagas_restantes <= 0;
                const isEditing = editingSlotId === slot.id_horario;

                return (
                  <div
                    key={slot.id_horario}
                    className={cn(
                      "rounded-xl border p-3.5 space-y-3 transition-colors",
                      slot.bloqueado
                        ? "border-destructive/30 bg-destructive/5"
                        : isFull
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-background"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="font-mono text-sm font-bold tabular-nums text-foreground">
                          {slot.hora_inicio} — {slot.hora_fim}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
                          <span>
                            Ocupação: {slot.agendamentos_confirmados}/{slot.capacidade_total}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={cn(
                              "font-semibold",
                              slot.bloqueado
                                ? "text-destructive"
                                : isFull
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {slot.bloqueado
                              ? slot.motivo_bloqueio || "Bloqueado"
                              : isFull
                              ? "Lotado"
                              : `${slot.vagas_restantes} ${
                                  slot.vagas_restantes === 1 ? "vaga livre" : "vagas livres"
                                }`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
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
                              "p-2 rounded-lg border text-xs cursor-pointer transition-colors",
                              isEditing
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                            title="Editar horário e vagas"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {!dayAllBlock && (
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleSlotBlock(slot.hora_inicio, Boolean(slotSpecificBlock))
                            }
                            className={cn(
                              "p-2 rounded-lg border text-xs cursor-pointer transition-colors",
                              slotSpecificBlock
                                ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
                                : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                            title={slotSpecificBlock ? "Liberar horário" : "Bloquear horário"}
                          >
                            {slotSpecificBlock ? (
                              <Unlock className="h-4 w-4" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && onUpdateSchedule && (
                      <div className="pt-2.5 border-t border-border space-y-2.5">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                              Início
                            </label>
                            <input
                              type="time"
                              value={editStart}
                              onChange={(e) => setEditStart(e.target.value)}
                              className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-mono text-foreground"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                              Término
                            </label>
                            <input
                              type="time"
                              value={editEnd}
                              onChange={(e) => setEditEnd(e.target.value)}
                              className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-mono text-foreground"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                              Vagas
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={500}
                              value={editCap}
                              onChange={(e) => setEditCap(Math.max(1, Number(e.target.value) || 1))}
                              className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-mono font-bold tabular-nums text-foreground"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingSlotId(null)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-muted cursor-pointer"
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
                            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
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

        {/* Right Column: Day Bookings + Waitlist */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Agendados no Dia ({dayBookings.length})
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                {formatDateBR(selectedDate)}
              </span>
            </div>

            {dayBookings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Nenhum agendamento registrado para esta data.
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {dayBookings.map((bk) => (
                  <div
                    key={bk.id_agendamento}
                    className="p-3 bg-background hover:bg-muted/30 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectBooking?.(bk)}
                        className="text-left min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary tabular-nums">
                            {bk.hora_inicio}
                          </span>
                          <span className="text-xs font-bold text-foreground truncate">
                            {bk.lead_nome || "Participante"}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono tabular-nums mt-0.5">
                          {bk.protocolo} · {bk.lead_whatsapp || bk.lead_email || "Sem contato"}
                        </div>
                      </button>

                      <select
                        value={bk.status}
                        onChange={(e) =>
                          onUpdateBookingStatus(
                            bk.id_agendamento,
                            e.target.value as AgendaBookingStatus
                          )
                        }
                        className="rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold cursor-pointer"
                      >
                        <option value="CONFIRMADO">Confirmado</option>
                        <option value="REALIZADO">Realizado</option>
                        <option value="NO_SHOW">No-Show</option>
                        <option value="CANCELADO">Cancelado</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Waitlist for this event */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Lista de Espera ({eventWaitlist.length})
              </h3>
            </div>

            {eventWaitlist.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                Nenhum interessado aguardando vaga neste evento.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {eventWaitlist.map((w) => {
                  const inviteUrl =
                    typeof window !== "undefined" && selectedEvent
                      ? `${window.location.origin}${buildPublicAgendaPath(selectedEvent.slug, {
                          nome: w.nome,
                          whatsapp: w.whatsapp,
                          email: w.email,
                        })}`
                      : "";
                  const waHref = buildWhatsAppLink(
                    w.whatsapp,
                    `Olá ${w.nome}! Liberamos um horário para ${
                      w.evento_nome || selectedEvent?.nome || "nosso evento"
                    }. Você pode escolher seu horário aqui: ${inviteUrl}`
                  );

                  return (
                    <div
                      key={w.id_espera}
                      className="rounded-xl border border-border bg-background p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{w.nome}</div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate">
                          {w.whatsapp} {w.email ? `· ${w.email}` : ""}
                        </div>
                        {w.observacoes && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
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
    </div>
  );
};
