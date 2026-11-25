import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  QrCode,
  Pencil,
  Copy,
  Trash2,
  ListChecks,
  ExternalLink,
  SlidersHorizontal,
  Power,
} from "lucide-react";
import type {
  AgendaBooking,
  AgendaEvent,
  AgendaEventStatus,
  AgendaFormField,
  AgendaSchedule,
} from "@/types/agenda";
import { buildPublicAgendaPath, getEventAvailabilitySummary } from "@/lib/agenda-engine";
import { cloudStore } from "@/services/cloudStorageService";
import { cn } from "@/lib/utils";

interface EventListViewProps {
  events: AgendaEvent[];
  schedules: AgendaSchedule[];
  bookings: AgendaBooking[];
  formFields: AgendaFormField[];
  products?: Array<{ id: string; name: string }>;
  onCreateEvent: () => void;
  onEditEvent: (ev: AgendaEvent) => void;
  onOpenFormBuilder: (ev: AgendaEvent) => void;
  onOpenAvailability: (ev: AgendaEvent) => void;
  onOpenQRCode: (ev: AgendaEvent) => void;
  onDuplicateEvent: (idEvento: string) => Promise<any>;
  onDeleteEvent: (idEvento: string) => Promise<any>;
  onToggleStatus: (ev: AgendaEvent) => Promise<any>;
}

const STATUS_STYLE: Record<AgendaEventStatus, string> = {
  PUBLICADO: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PAUSADO: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  ENCERRADO: "border-destructive/30 bg-destructive/10 text-destructive",
  RASCUNHO: "border-border bg-muted text-muted-foreground",
};

export const EventListView: React.FC<EventListViewProps> = ({
  events,
  schedules,
  bookings,
  formFields,
  products = [],
  onCreateEvent,
  onEditEvent,
  onOpenFormBuilder,
  onOpenAvailability,
  onOpenQRCode,
  onDuplicateEvent,
  onDeleteEvent,
  onToggleStatus,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const cloudDb = cloudStore.getState();

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
      if (q) {
        const hay = `${e.nome} ${e.slug} ${e.local_evento} ${e.descricao}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento, slug ou local..."
              className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1 text-xs">
            {[
              { id: "ALL", label: "Todos" },
              { id: "PUBLICADO", label: "Publicados" },
              { id: "PAUSADO", label: "Pausados" },
              { id: "ENCERRADO", label: "Encerrados" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                  statusFilter === tab.id
                    ? "bg-background text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onCreateEvent}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" /> Novo Evento
        </button>
      </div>

      {/* Empty State */}
      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <div className="mx-auto h-11 w-11 rounded-xl border border-primary/20 bg-primary/10 text-primary grid place-items-center">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-foreground">
              Nenhum evento de agendamento criado
            </h3>
            <p className="text-xs text-muted-foreground">
              Crie seus eventos agendáveis (ex: Sessão Estratégica, Mentoria, Diagnóstico), configure horários e compartilhe nas suas Landing Pages ou via QR Code.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateEvent}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Criar Primeiro Evento
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-xs text-muted-foreground">
          Nenhum evento corresponde aos filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEvents.map((ev) => {
            const evSchedules = schedules.filter((s) => s.id_evento === ev.id_evento && s.ativo !== false);
            const evFields = formFields.filter((f) => f.id_evento === ev.id_evento && f.ativo !== false);
            const evBookings = bookings.filter(
              (b) => b.id_evento === ev.id_evento && b.status !== "CANCELADO"
            );
            const summary = getEventAvailabilitySummary(cloudDb, ev);
            const linkedProduct = ev.product_id
              ? products.find((p) => p.id === ev.product_id)
              : undefined;
            const publicPath = buildPublicAgendaPath(ev.slug);

            return (
              <div
                key={ev.id_evento}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase",
                            STATUS_STYLE[ev.status] || STATUS_STYLE.RASCUNHO
                          )}
                        >
                          {ev.status}
                        </span>
                        <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {ev.tipo_evento || "ONLINE"}
                        </span>
                        {linkedProduct && (
                          <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary truncate max-w-[160px]">
                            {linkedProduct.name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-foreground truncate">
                        {ev.nome}
                      </h3>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">
                        {publicPath}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleStatus(ev)}
                      className={cn(
                        "p-2 rounded-lg border text-xs transition-colors cursor-pointer shrink-0",
                        ev.status === "PUBLICADO"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                          : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                      )}
                      title={ev.status === "PUBLICADO" ? "Pausar evento" : "Publicar evento"}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </div>

                  {ev.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {ev.descricao}
                    </p>
                  )}

                  {/* Stats line */}
                  <div className="grid grid-cols-4 gap-2 pt-1 border-t border-border text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Duração</div>
                      <div className="font-mono font-bold tabular-nums">{ev.duracao_minutos}m</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Horários</div>
                      <div className="font-mono font-bold tabular-nums">{evSchedules.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Agendados</div>
                      <div className="font-mono font-bold tabular-nums text-primary">
                        {evBookings.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Vagas (Próx.)</div>
                      <div className="font-mono font-bold tabular-nums">
                        {summary.disponivel ? summary.vagasTotais : 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onEditEvent(ev)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenFormBuilder(ev)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted cursor-pointer"
                    >
                      <ListChecks className="h-3 w-3" /> Perguntas ({evFields.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAvailability(ev)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted cursor-pointer"
                    >
                      <SlidersHorizontal className="h-3 w-3" /> Horários
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenQRCode(ev)}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/15 cursor-pointer"
                    >
                      <QrCode className="h-3 w-3" /> QR & Link
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={publicPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/30"
                      title="Abrir link público"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onDuplicateEvent(ev.id_evento)}
                      className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Duplicar evento"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {confirmDeleteId === ev.id_evento ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteEvent(ev.id_evento);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded-lg bg-destructive px-2 py-1 text-[10px] font-bold text-destructive-foreground cursor-pointer"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold cursor-pointer"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(ev.id_evento)}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 cursor-pointer"
                        title="Excluir evento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
