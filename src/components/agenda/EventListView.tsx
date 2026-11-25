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
  ExternalLink,
  Pause,
  Play,
  FileSpreadsheet,
  MapPin,
  Tag,
  Repeat,
  Sparkles,
} from "lucide-react";
import type {
  AgendaBooking,
  AgendaEvent,
  AgendaEventStatus,
  AgendaFormField,
  AgendaSchedule,
} from "@/types/agenda";
import { buildPublicAgendaPath, formatDateBR } from "@/lib/agenda-engine";
import { cn } from "@/lib/utils";

interface EventListViewProps {
  events: AgendaEvent[];
  schedules: AgendaSchedule[];
  bookings: AgendaBooking[];
  formFields: AgendaFormField[];
  products?: Array<{ id: string; name: string; salePrice?: number }>;
  onCreateEvent: () => void;
  onEditEvent: (ev: AgendaEvent) => void;
  onOpenFormBuilder: (ev: AgendaEvent) => void;
  onOpenAvailability: (ev: AgendaEvent) => void;
  onOpenQRCode: (ev: AgendaEvent) => void;
  onDuplicateEvent: (idEvento: string) => Promise<any>;
  onDeleteEvent: (idEvento: string) => Promise<any>;
  onToggleStatus: (ev: AgendaEvent) => Promise<any>;
  onLoadStarterEvent?: () => Promise<any>;
}

function getStatusBadge(status: AgendaEventStatus) {
  if (status === "PUBLICADO") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
        PUBLICADO
      </span>
    );
  }
  if (status === "PAUSADO") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
        PAUSADO
      </span>
    );
  }
  if (status === "ENCERRADO") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
        ENCERRADO
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
      RASCUNHO
    </span>
  );
}

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
  onLoadStarterEvent,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento, slug ou local..."
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900 p-1 text-xs">
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
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold shadow-2xs"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
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
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-semibold text-white cursor-pointer shrink-0 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Criar Evento
        </button>
      </div>

      {/* Empty State */}
      {events.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl space-y-3">
          <Calendar className="w-10 h-10 text-neutral-400 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Nenhum evento criado ainda
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            Crie o primeiro evento para começar a gerar links públicos com escolha de dia, horário disponível e questionário.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={onCreateEvent}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Primeiro Evento
            </button>
            {onLoadStarterEvent && (
              <button
                type="button"
                onClick={onLoadStarterEvent}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                Carregar Evento Exemplo
              </button>
            )}
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-10 text-center text-xs text-neutral-500">
          Nenhum evento corresponde aos filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredEvents.map((ev) => {
            const horariosDoEvento = schedules.filter(
              (h) => h.id_evento === ev.id_evento && h.ativo !== false
            );
            const totalAgendamentos = bookings.filter(
              (a) => a.id_evento === ev.id_evento && a.status === "CONFIRMADO"
            ).length;
            const camposCount = formFields.filter(
              (c) => c.id_evento === ev.id_evento && c.ativo !== false
            ).length;
            const linkedProduct = ev.product_id
              ? products.find((p) => p.id === ev.product_id)
              : undefined;
            const publicPath = buildPublicAgendaPath(ev.slug);

            return (
              <div
                key={ev.id_evento}
                className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm"
              >
                {/* Lado Esquerdo: Dados do Evento */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
                      {ev.nome}
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      {getStatusBadge(ev.status)}
                      <span className="text-neutral-300 dark:text-neutral-600">·</span>
                      <span className="font-mono text-neutral-500 dark:text-neutral-400">
                        {ev.id_evento}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 max-w-2xl">
                    {ev.descricao || "Sem descrição cadastrada."}
                  </p>

                  {/* Produto Atrelado + Campo Obrigatório de Local */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {linkedProduct && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-medium">
                        <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{linkedProduct.name}</span>
                        {Number(linkedProduct.salePrice || 0) > 0 && (
                          <strong className="font-mono ml-1">
                            ·{" "}
                            {Number(linkedProduct.salePrice).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </strong>
                        )}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 text-orange-800 dark:text-orange-300 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                      <span>
                        Campo obrigatório: {ev.label_local?.trim() || "Bairro / Escola / Local"}
                      </span>
                    </span>
                  </div>

                  {/* Metadados */}
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {!ev.data_fim ? (
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                        <Repeat className="w-3.5 h-3.5" />
                        Recorrente ({(ev.dias_semana || []).join(", ")}) · Contínuo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        {formatDateBR(ev.data_inicio)} até {formatDateBR(ev.data_fim)} (
                        {(ev.dias_semana || []).join(", ")})
                      </span>
                    )}
                    <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">
                      ·
                    </span>
                    <span className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      {ev.duracao_minutos} min por atendimento
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">
                      ·
                    </span>
                    <span className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
                      <Users className="w-3.5 h-3.5 text-neutral-400" />
                      <strong className="text-orange-600 dark:text-orange-400 font-mono tabular-nums">
                        {ev.capacidade_padrao} vagas
                      </strong>{" "}
                      por horário
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-neutral-500 dark:text-neutral-400">
                      {horariosDoEvento.length} horário{horariosDoEvento.length !== 1 ? "s" : ""} ativo
                      {horariosDoEvento.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-neutral-500 dark:text-neutral-400">
                      {totalAgendamentos} agendamento{totalAgendamentos !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Lado Direito: Ações */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-neutral-100 dark:border-neutral-800">
                  {/* Status Toggle */}
                  <button
                    type="button"
                    onClick={() => onToggleStatus(ev)}
                    title={
                      ev.status === "PUBLICADO"
                        ? "Pausar agendamentos"
                        : "Publicar e abrir agendamentos"
                    }
                    className={cn(
                      "p-2 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer",
                      ev.status === "PUBLICADO"
                        ? "hover:text-amber-500"
                        : "hover:text-emerald-500"
                    )}
                  >
                    {ev.status === "PUBLICADO" ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>

                  {/* QR Code & Link */}
                  <button
                    type="button"
                    onClick={() => onOpenQRCode(ev)}
                    title="Ver QR Code e Compartilhar Link"
                    className="px-3 py-2 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-orange-500" />
                    <span className="hidden sm:inline">QR Code</span>
                  </button>

                  {/* Abrir Página Pública (Fluxo Data -> Horário -> Questionário) */}
                  <a
                    href={publicPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir página pública independente (1. Data -> 2. Horário -> 3. Dados)"
                    className="px-3 py-2 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                    <span className="hidden sm:inline">Página Pública</span>
                  </a>

                  {/* Disponibilidade */}
                  <button
                    type="button"
                    onClick={() => onOpenAvailability(ev)}
                    title="Gerenciar Vagas e Bloqueios (Disponibilidade)"
                    className="px-2.5 py-2 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    <span className="hidden xl:inline">Disponibilidade</span>
                  </button>

                  {/* Formulário Dinâmico */}
                  <button
                    type="button"
                    onClick={() => onOpenFormBuilder(ev)}
                    title={`Editar formulário de captação (${camposCount} campos)`}
                    className="px-2.5 py-2 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="hidden xl:inline">Formulário ({camposCount})</span>
                  </button>

                  {/* Duplicar */}
                  <button
                    type="button"
                    onClick={() => onDuplicateEvent(ev.id_evento)}
                    title="Duplicar Evento"
                    className="p-2 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {/* Editar */}
                  <button
                    type="button"
                    onClick={() => onEditEvent(ev)}
                    title="Editar Evento"
                    className="p-2 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Excluir (Confirmação inline) */}
                  {confirmDeleteId === ev.id_evento ? (
                    <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg px-2 py-1 text-[11px]">
                      <span className="text-rose-700 dark:text-rose-300 font-semibold">
                        Excluir?
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteEvent(ev.id_evento);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-semibold cursor-pointer"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded cursor-pointer"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(ev.id_evento)}
                      title="Excluir Evento"
                      className="p-2 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
