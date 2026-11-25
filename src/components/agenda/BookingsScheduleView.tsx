import React, { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  Clock,
  Search,
  MessageCircle,
  ExternalLink,
  Video,
  X,
  UserCheck,
  MapPin,
  FileText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  ArrowUpRight,
} from "lucide-react";
import type {
  AgendaBooking,
  AgendaBookingStatus,
  AgendaEvent,
  AgendaFormResponse,
  AgendaWaitlistEntry,
} from "@/types/agenda";
import {
  buildGoogleCalendarTemplateLink,
  buildPublicAgendaPath,
  buildWhatsAppLink,
  formatDateBR,
  getEventSlotsForDate,
} from "@/lib/agenda-engine";
import { cloudStore } from "@/services/cloudStorageService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isWithinInterval } from "date-fns";

const BOOKING_STATUS_META: Record<
  AgendaBookingStatus,
  { label: string; badgeClass: string }
> = {
  CONFIRMADO: {
    label: "Confirmado",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  REALIZADO: {
    label: "Realizado",
    badgeClass: "border-primary/30 bg-primary/10 text-primary",
  },
  NO_SHOW: {
    label: "No-Show",
    badgeClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  CANCELADO: {
    label: "Cancelado",
    badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

interface EventDetailModalProps {
  booking: AgendaBooking | null;
  events: AgendaEvent[];
  formResponses: AgendaFormResponse[];
  onClose: () => void;
  onUpdateStatus: (
    idAgendamento: string,
    novoStatus: AgendaBookingStatus,
    motivo?: string
  ) => Promise<any>;
  onReschedule: (
    idAgendamento: string,
    novaData: string,
    novaHoraInicio: string,
    novaHoraFim: string
  ) => Promise<any>;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  booking,
  events,
  formResponses,
  onClose,
  onUpdateStatus,
  onReschedule,
}) => {
  const navigate = useNavigate();
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [newDate, setNewDate] = useState(booking?.data_agendamento || "");
  const [newStartTime, setNewStartTime] = useState(booking?.hora_inicio || "09:00");
  const [newEndTime, setNewEndTime] = useState(booking?.hora_fim || "09:30");
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const eventObj = useMemo(
    () => (booking ? events.find((e) => e.id_evento === booking.id_evento) || null : null),
    [booking, events]
  );

  const bookingResponses = useMemo(() => {
    if (!booking) return [];
    return formResponses.filter((r) => r.id_agendamento === booking.id_agendamento);
  }, [booking, formResponses]);

  const availableSlotsForNewDate = useMemo(() => {
    if (!booking || !rescheduleMode || !newDate || booking.id_evento === "CRM-MANUAL") {
      return [];
    }
    return getEventSlotsForDate(cloudStore.getState(), booking.id_evento, newDate).filter(
      (s) => s.disponivel
    );
  }, [booking, rescheduleMode, newDate]);

  if (!booking) return null;

  const calendarHref =
    booking.calendar_link ||
    buildGoogleCalendarTemplateLink({
      title: `${booking.evento_nome || "Agendamento"} — ${booking.lead_nome || "Lead"}`,
      description: `Protocolo: ${booking.protocolo}\nContato: ${booking.lead_whatsapp || ""} ${booking.lead_email || ""}\n${booking.observacoes || ""}`,
      location: booking.lead_local || eventObj?.local_evento || "Online",
      date: booking.data_agendamento,
      startTime: booking.hora_inicio,
      endTime: booking.hora_fim,
    });

  const waHref = buildWhatsAppLink(
    booking.lead_whatsapp,
    `Olá ${booking.lead_nome || ""}! Sobre o seu agendamento ${booking.protocolo} (${
      booking.evento_nome || "Reunião"
    }) em ${formatDateBR(booking.data_agendamento)} às ${booking.hora_inicio}...`
  );

  const statusMeta = BOOKING_STATUS_META[booking.status] || BOOKING_STATUS_META.CONFIRMADO;

  const handleConfirmReschedule = async () => {
    if (!newDate || !newStartTime) {
      toast.error("Informe a nova data e horário.");
      return;
    }
    setSubmitting(true);
    try {
      await onReschedule(booking.id_agendamento, newDate, newStartTime, newEndTime || newStartTime);
      setRescheduleMode(false);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível remarcar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (nextStatus: AgendaBookingStatus, reason?: string) => {
    setSubmitting(true);
    try {
      await onUpdateStatus(booking.id_agendamento, nextStatus, reason);
      toast.success(`Status atualizado para ${BOOKING_STATUS_META[nextStatus].label}.`);
      setCancelMode(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar status.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4 bg-muted/30">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-primary tabular-nums">
                {booking.protocolo}
              </span>
              <span aria-hidden="true" className="text-muted-foreground">·</span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {booking.origem === "CRM_MANUAL" ? "Agenda Manual CRM" : "Agendamento Público"}
              </span>
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase",
                  statusMeta.badgeClass
                )}
              >
                {statusMeta.label}
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground truncate">
              {booking.evento_nome || eventObj?.nome || "Agendamento"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Date, Time & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-border bg-background p-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Data</div>
              <div className="text-sm font-mono font-bold tabular-nums text-foreground mt-0.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {formatDateBR(booking.data_agendamento)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Horário</div>
              <div className="text-sm font-mono font-bold tabular-nums text-foreground mt-0.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {booking.hora_inicio} — {booking.hora_fim}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Local / Formato</div>
              <div className="text-xs font-semibold text-foreground mt-1 flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{booking.lead_local || eventObj?.local_evento || "Online"}</span>
              </div>
            </div>
          </div>

          {/* Participant & Owner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-border bg-background p-4">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Participante / Lead</div>
              <div className="text-sm font-bold text-foreground">{booking.lead_nome || "Visitante"}</div>
              {booking.lead_whatsapp && (
                <div className="text-xs font-mono text-muted-foreground">{booking.lead_whatsapp}</div>
              )}
              {booking.lead_email && (
                <div className="text-xs text-muted-foreground truncate">{booking.lead_email}</div>
              )}
            </div>

            <div className="space-y-2 sm:text-right flex flex-col sm:items-end justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Responsável</div>
                <div className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5 mt-0.5">
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  {booking.responsavel_nome || "Equipe Comercial"}
                </div>
              </div>

              {booking.id_lead && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate({ to: "/app/crm", search: { leadId: booking.id_lead } as any });
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted cursor-pointer"
                >
                  Abrir Lead no CRM <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Respostas do Formulário / Observações */}
          {(bookingResponses.length > 0 || booking.observacoes) && (
            <div className="rounded-xl border border-border bg-background p-4 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Dados e Respostas do Participante
              </div>
              {bookingResponses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {bookingResponses.map((resp) => (
                    <div key={resp.id_resposta} className="rounded-lg border border-border/70 bg-muted/20 p-2.5">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">
                        {resp.label || resp.id_campo}
                      </div>
                      <div className="text-xs font-medium text-foreground mt-0.5 break-words">
                        {resp.valor}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {booking.observacoes}
                </p>
              )}
            </div>
          )}

          {booking.motivo_cancelamento && booking.status === "CANCELADO" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <strong>Motivo do cancelamento:</strong> {booking.motivo_cancelamento}
            </div>
          )}

          {/* Inline Reschedule Panel */}
          {rescheduleMode && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-foreground">Remarcar Data e Horário</div>
                <button
                  type="button"
                  onClick={() => setRescheduleMode(false)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancelar remarcação
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                    Nova Data
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                {booking.id_evento === "CRM-MANUAL" ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                        Início
                      </label>
                      <input
                        type="time"
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                        Fim
                      </label>
                      <input
                        type="time"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                      Horário Disponível na Grade
                    </label>
                    {availableSlotsForNewDate.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                        Sem vagas livres nesta data. Escolha outro dia.
                      </div>
                    ) : (
                      <select
                        value={newStartTime}
                        onChange={(e) => {
                          const slot = availableSlotsForNewDate.find(
                            (s) => s.hora_inicio === e.target.value
                          );
                          setNewStartTime(e.target.value);
                          if (slot) setNewEndTime(slot.hora_fim);
                        }}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono"
                      >
                        <option value="">Selecione...</option>
                        {availableSlotsForNewDate.map((s) => (
                          <option key={s.id_horario} value={s.hora_inicio}>
                            {s.hora_inicio} — {s.hora_fim} ({s.vagas_restantes} vagas)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmReschedule}
                  className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Remarcando..." : "Salvar Nova Data"}
                </button>
              </div>
            </div>
          )}

          {/* Inline Cancel Reason */}
          {cancelMode && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2.5">
              <div className="text-xs font-bold text-destructive">Confirmar Cancelamento</div>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Motivo do cancelamento (opcional)"
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelMode(false)}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-semibold cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleStatusChange("CANCELADO", cancelReason.trim())}
                  className="rounded-lg bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground cursor-pointer"
                >
                  Confirmar Cancelamento
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {booking.lead_whatsapp && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            {booking.meet_link && (
              <a
                href={booking.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <Video className="h-3.5 w-3.5" /> Google Meet
              </a>
            )}
            <a
              href={calendarHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Adicionar ao Calendar
            </a>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setNewDate(booking.data_agendamento);
                setNewStartTime(booking.hora_inicio);
                setNewEndTime(booking.hora_fim);
                setRescheduleMode((v) => !v);
                setCancelMode(false);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Remarcar
            </button>

            {booking.status !== "REALIZADO" && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleStatusChange("REALIZADO")}
                className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Marcar Realizado
              </button>
            )}

            {booking.status === "CONFIRMADO" && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleStatusChange("NO_SHOW")}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer"
              >
                <AlertCircle className="h-3.5 w-3.5" /> No-Show
              </button>
            )}

            {booking.status !== "CANCELADO" && (
              <button
                type="button"
                onClick={() => {
                  setCancelMode((v) => !v);
                  setRescheduleMode(false);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/15 cursor-pointer"
              >
                <XCircle className="h-3.5 w-3.5" /> Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface BookingsScheduleViewProps {
  bookings: AgendaBooking[];
  events: AgendaEvent[];
  waitlist: AgendaWaitlistEntry[];
  formResponses: AgendaFormResponse[];
  users: Array<{ id: string; name: string }>;
  isAdmin: boolean;
  currentUserName?: string;
  dateFilter: { from?: Date; to?: Date; label?: string };
  selectedBooking: AgendaBooking | null;
  onSelectBooking: (booking: AgendaBooking | null) => void;
  onUpdateStatus: (
    idAgendamento: string,
    novoStatus: AgendaBookingStatus,
    motivo?: string
  ) => Promise<any>;
  onReschedule: (
    idAgendamento: string,
    novaData: string,
    novaHoraInicio: string,
    novaHoraFim: string
  ) => Promise<any>;
}

export const BookingsScheduleView: React.FC<BookingsScheduleViewProps> = ({
  bookings,
  events,
  waitlist,
  formResponses,
  users,
  isAdmin,
  currentUserName,
  dateFilter,
  selectedBooking,
  onSelectBooking,
  onUpdateStatus,
  onReschedule,
}) => {
  const [subMode, setSubMode] = useState<"bookings" | "waitlist">("bookings");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [ownerFilter, setOwnerFilter] = useState<string>("ALL");
  // Padrão = "all" para que nenhum agendamento futuro/passado fique oculto silenciosamente
  const [dateScope, setDateScope] = useState<"all" | "global_period">("all");

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...bookings]
      .filter((b) => {
        if (!isAdmin && currentUserName && b.responsavel_nome && b.responsavel_nome !== currentUserName) {
          return false;
        }
        if (isAdmin && ownerFilter !== "ALL" && b.responsavel_nome !== ownerFilter) {
          return false;
        }
        if (eventFilter !== "ALL" && b.id_evento !== eventFilter) {
          return false;
        }
        if (statusFilter !== "ALL" && b.status !== statusFilter) {
          return false;
        }
        if (dateScope === "global_period" && dateFilter.from && dateFilter.to) {
          const dt = new Date(`${b.data_agendamento}T12:00:00`);
          if (
            !isWithinInterval(dt, {
              start: dateFilter.from,
              end: dateFilter.to,
            })
          ) {
            return false;
          }
        }
        if (q) {
          const hay = `${b.protocolo} ${b.lead_nome || ""} ${b.lead_whatsapp || ""} ${
            b.lead_email || ""
          } ${b.evento_nome || ""} ${b.responsavel_nome || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const keyA = `${a.data_agendamento} ${a.hora_inicio}`;
        const keyB = `${b.data_agendamento} ${b.hora_inicio}`;
        return keyB.localeCompare(keyA);
      });
  }, [
    bookings,
    isAdmin,
    currentUserName,
    ownerFilter,
    eventFilter,
    statusFilter,
    dateScope,
    dateFilter,
    search,
  ]);

  const filteredWaitlist = useMemo(() => {
    const q = search.trim().toLowerCase();
    return waitlist.filter((w) => {
      if (eventFilter !== "ALL" && w.id_evento !== eventFilter) return false;
      if (q) {
        const hay = `${w.nome} ${w.whatsapp} ${w.email || ""} ${w.evento_nome || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [waitlist, eventFilter, search]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1 text-xs">
            <button
              type="button"
              onClick={() => setSubMode("bookings")}
              className={cn(
                "px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap",
                subMode === "bookings"
                  ? "bg-background text-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Agendamentos ({bookings.length})
            </button>
            <button
              type="button"
              onClick={() => setSubMode("waitlist")}
              className={cn(
                "px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap",
                subMode === "waitlist"
                  ? "bg-background text-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Lista de Espera ({waitlist.length})
            </button>
          </div>

          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lead, protocolo ou evento..."
              className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold cursor-pointer"
          >
            <option value="ALL">Todos os Eventos</option>
            <option value="CRM-MANUAL">Manual CRM</option>
            {events.map((ev) => (
              <option key={ev.id_evento} value={ev.id_evento}>
                {ev.nome}
              </option>
            ))}
          </select>

          {subMode === "bookings" && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option value="ALL">Todos Status</option>
                <option value="CONFIRMADO">Confirmados</option>
                <option value="REALIZADO">Realizados</option>
                <option value="NO_SHOW">No-Show</option>
                <option value="CANCELADO">Cancelados</option>
              </select>

              {isAdmin && (
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold cursor-pointer"
                >
                  <option value="ALL">Todos Responsáveis</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDateScope("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg cursor-pointer whitespace-nowrap",
                    dateScope === "all"
                      ? "bg-background text-foreground font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setDateScope("global_period")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg cursor-pointer whitespace-nowrap",
                    dateScope === "global_period"
                      ? "bg-background text-foreground font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {dateFilter.label || "Período Global"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {subMode === "bookings" ? (
        filteredBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-2">
            <Calendar className="h-6 w-6 mx-auto text-muted-foreground" />
            <div className="text-sm font-bold text-foreground">
              Nenhum agendamento encontrado
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Os agendamentos realizados pelos links públicos das Landing Pages ou manualmente no CRM aparecem aqui. Clique em qualquer registro para abrir detalhes, remarcar ou iniciar a reunião.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Data / Hora</th>
                    <th className="px-4 py-3 text-left font-bold">Evento / Origem</th>
                    <th className="px-4 py-3 text-left font-bold">Participante</th>
                    <th className="px-4 py-3 text-left font-bold">Responsável</th>
                    <th className="px-4 py-3 text-left font-bold">Status</th>
                    <th className="px-4 py-3 text-right font-bold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredBookings.map((bk) => {
                    const meta =
                      BOOKING_STATUS_META[bk.status] || BOOKING_STATUS_META.CONFIRMADO;
                    const waUrl = buildWhatsAppLink(bk.lead_whatsapp);

                    return (
                      <tr
                        key={bk.id_agendamento}
                        onClick={() => onSelectBooking(bk)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono font-bold tabular-nums text-foreground">
                            {formatDateBR(bk.data_agendamento)}
                          </div>
                          <div className="font-mono text-[11px] text-primary tabular-nums">
                            {bk.hora_inicio} — {bk.hora_fim}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground truncate max-w-[220px]">
                            {bk.evento_nome || "Evento"}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {bk.protocolo} ·{" "}
                            {bk.origem === "CRM_MANUAL" ? "Manual CRM" : "Link Público"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground truncate max-w-[200px]">
                            {bk.lead_nome || "Visitante"}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {bk.lead_whatsapp || bk.lead_email || "Sem contato"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {bk.responsavel_nome || "—"}
                        </td>
                        <td
                          className="px-4 py-3 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={bk.status}
                            onChange={(e) =>
                              onUpdateStatus(
                                bk.id_agendamento,
                                e.target.value as AgendaBookingStatus
                              )
                            }
                            className={cn(
                              "rounded-lg border px-2 py-1 text-[11px] font-bold cursor-pointer",
                              meta.badgeClass
                            )}
                          >
                            <option value="CONFIRMADO">Confirmado</option>
                            <option value="REALIZADO">Realizado</option>
                            <option value="NO_SHOW">No-Show</option>
                            <option value="CANCELADO">Cancelado</option>
                          </select>
                        </td>
                        <td
                          className="px-4 py-3 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            {bk.lead_whatsapp && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => onSelectBooking(bk)}
                              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-muted cursor-pointer"
                            >
                              Detalhes
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : filteredWaitlist.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-2">
          <Users className="h-6 w-6 mx-auto text-muted-foreground" />
          <div className="text-sm font-bold text-foreground">
            Lista de espera vazia
          </div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Quando um evento estiver lotado ou fechado com a lista de espera ativada, os interessados cadastrados aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredWaitlist.map((w) => {
            const ev = events.find((e) => e.id_evento === w.id_evento);
            const inviteUrl =
              typeof window !== "undefined" && ev
                ? `${window.location.origin}${buildPublicAgendaPath(ev.slug, {
                    nome: w.nome,
                    whatsapp: w.whatsapp,
                    email: w.email,
                  })}`
                : "";
            const waHref = buildWhatsAppLink(
              w.whatsapp,
              `Olá ${w.nome}! Abriu vaga para ${
                w.evento_nome || ev?.nome || "nosso evento"
              }. Garanta seu horário pelo link: ${inviteUrl}`
            );

            return (
              <div
                key={w.id_espera}
                className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="text-xs font-bold text-primary truncate">
                    {w.evento_nome || ev?.nome || "Evento"}
                  </div>
                  <div className="text-sm font-bold text-foreground truncate">{w.nome}</div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {w.whatsapp} {w.email ? `· ${w.email}` : ""}
                  </div>
                  {w.observacoes && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {w.observacoes}
                    </div>
                  )}
                </div>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shrink-0"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Convidar
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <EventDetailModal
        booking={selectedBooking}
        events={events}
        formResponses={formResponses}
        onClose={() => onSelectBooking(null)}
        onUpdateStatus={onUpdateStatus}
        onReschedule={onReschedule}
      />
    </div>
  );
};
