import React, { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  ExternalLink,
  ListTodo,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserCheck,
  Users as UsersIcon,
  Video,
  Briefcase,
  Circle,
  X,
} from "lucide-react";
import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Task, User } from "@/hooks/use-data";
import type { Lead } from "@/data/mock";
import type {
  AgendaBooking,
  AgendaCustomItem,
  AgendaOtherCategory,
} from "@/types/agenda";
import { buildWhatsAppLink } from "@/lib/agenda-engine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DayDetailTab = "tarefas" | "eventos" | "outros";

interface NormalizedCalendarEvent {
  key: string;
  title: string;
  timeLabel: string;
  subtitle: string;
  owner: string;
  statusLabel: string;
  statusClass: string;
  meetLink?: string;
  whatsapp?: string;
  leadId?: string;
  booking?: AgendaBooking;
  calendarLink?: string;
  isCancelled: boolean;
}

const OTHER_CATEGORY_META: Record<
  AgendaOtherCategory,
  { label: string; short: string; colorClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  VISITA: {
    label: "Visita",
    short: "Visita",
    colorClass: "bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/30",
    icon: MapPin,
  },
  REUNIAO: {
    label: "Reunião",
    short: "Reunião",
    colorClass: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    icon: UsersIcon,
  },
  LIGACAO: {
    label: "Ligação / Call",
    short: "Ligação",
    colorClass: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30",
    icon: Phone,
  },
  COMPROMISSO: {
    label: "Compromisso",
    short: "Compromisso",
    colorClass: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    icon: Briefcase,
  },
  OUTRO: {
    label: "Outro",
    short: "Outro",
    colorClass: "bg-muted text-foreground border-border",
    icon: Calendar,
  },
};

const WEEK_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function extractIsoDateKey(raw?: string | Date | null): string {
  if (!raw) return "";
  if (raw instanceof Date) {
    return isValid(raw) ? format(raw, "yyyy-MM-dd") : "";
  }
  const str = String(raw).trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  try {
    const parsed = parseISO(str);
    if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  } catch {}
  const native = new Date(str);
  return isValid(native) ? format(native, "yyyy-MM-dd") : "";
}

interface AgendaCalendarViewProps {
  tasks: Task[];
  bookings: AgendaBooking[];
  customItems: AgendaCustomItem[];
  leads: Lead[];
  users: User[];
  isAdmin: boolean;
  currentUserName?: string;
  onToggleTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTaskForDate: (dateIso: string) => void;
  onSelectBooking: (booking: AgendaBooking) => void;
  onCreateEvent: () => void;
  onOpenBookingsTab: () => void;
  onAddCustomItem: (
    item: Omit<AgendaCustomItem, "id" | "criado_em" | "concluido"> & { concluido?: boolean }
  ) => Promise<any>;
  onUpdateCustomItem: (id: string, updates: Partial<AgendaCustomItem>) => Promise<any>;
  onToggleCustomItem: (id: string) => Promise<any>;
  onDeleteCustomItem: (id: string) => Promise<any>;
}

export const AgendaCalendarView: React.FC<AgendaCalendarViewProps> = ({
  tasks,
  bookings,
  customItems,
  leads,
  users,
  isAdmin,
  currentUserName,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onCreateTaskForDate,
  onSelectBooking,
  onCreateEvent,
  onOpenBookingsTab,
  onAddCustomItem,
  onUpdateCustomItem,
  onToggleCustomItem,
  onDeleteCustomItem,
}) => {
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const todayIso = format(today, "yyyy-MM-dd");

  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso);
  const [rightTab, setRightTab] = useState<DayDetailTab>("tarefas");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");

  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);
  const [confirmDeleteCustomId, setConfirmDeleteCustomId] = useState<string | null>(null);

  const [showOtherForm, setShowOtherForm] = useState(false);
  const [editingOtherId, setEditingOtherId] = useState<string | null>(null);
  const [otherForm, setOtherForm] = useState<{
    titulo: string;
    categoria: AgendaOtherCategory;
    hora_inicio: string;
    hora_fim: string;
    local: string;
    lead_id: string;
    descricao: string;
  }>({
    titulo: "",
    categoria: "VISITA",
    hora_inicio: "09:00",
    hora_fim: "10:00",
    local: "",
    lead_id: "",
    descricao: "",
  });

  const activeYear = viewMonth.getFullYear();
  const activeMonthIdx = viewMonth.getMonth();

  const yearOptions = useMemo(() => {
    const baseYear = today.getFullYear();
    const minY = Math.min(baseYear - 12, activeYear - 2);
    const maxY = Math.max(baseYear + 12, activeYear + 2);
    const list: number[] = [];
    for (let y = minY; y <= maxY; y++) {
      list.push(y);
    }
    return list;
  }, [today, activeYear]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const monthEnd = endOfMonth(viewMonth);
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });
    while (days.length < 42) {
      const last = days[days.length - 1];
      const next = new Date(last);
      next.setDate(last.getDate() + 1);
      days.push(next);
    }
    return days;
  }, [viewMonth]);

  const matchesOwnerScope = (ownersOrName?: string | string[]) => {
    const effectiveOwner = !isAdmin && currentUserName ? currentUserName : ownerFilter;
    if (!effectiveOwner || effectiveOwner === "all") return true;
    const target = effectiveOwner.trim().toLowerCase();
    if (Array.isArray(ownersOrName)) {
      if (ownersOrName.length === 0) return true;
      return ownersOrName.some((o) => String(o || "").trim().toLowerCase() === target);
    }
    if (!ownersOrName) return true;
    return String(ownersOrName).trim().toLowerCase() === target;
  };

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t) continue;
      if (!matchesOwnerScope(t.owners)) continue;
      const key = extractIsoDateKey(t.due) || extractIsoDateKey(t.createdAt);
      if (!key) continue;
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks, ownerFilter, isAdmin, currentUserName]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, NormalizedCalendarEvent[]>();
    const seenProtocols = new Set<string>();

    for (const bk of bookings) {
      if (!bk || !bk.data_agendamento) continue;
      if (!matchesOwnerScope(bk.responsavel_nome)) continue;
      const key = extractIsoDateKey(bk.data_agendamento);
      if (!key) continue;

      if (bk.protocolo) seenProtocols.add(bk.protocolo);
      if (bk.google_event_id) seenProtocols.add(bk.google_event_id);

      const isCancelled = bk.status === "CANCELADO";
      const statusMeta =
        bk.status === "REALIZADO"
          ? {
              label: "Realizado",
              cls: "border-primary/30 bg-primary/10 text-primary",
            }
          : bk.status === "NO_SHOW"
          ? {
              label: "No-Show",
              cls: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
            }
          : bk.status === "CANCELADO"
          ? {
              label: "Cancelado",
              cls: "border-destructive/30 bg-destructive/10 text-destructive",
            }
          : {
              label: "Confirmado",
              cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            };

      const list = map.get(key) || [];
      list.push({
        key: bk.id_agendamento,
        title: bk.evento_nome || "Agendamento",
        timeLabel: `${bk.hora_inicio || "--:--"} — ${bk.hora_fim || "--:--"}`,
        subtitle: bk.lead_nome || "Visitante",
        owner: bk.responsavel_nome || "Equipe",
        statusLabel: statusMeta.label,
        statusClass: statusMeta.cls,
        meetLink: bk.meet_link,
        whatsapp: bk.lead_whatsapp,
        leadId: bk.id_lead,
        booking: bk,
        calendarLink: bk.calendar_link,
        isCancelled,
      });
      map.set(key, list);
    }

    for (const lead of leads) {
      const ce = lead?.metadata?.calendarEvent;
      if (!ce || !ce.date) continue;
      const gid = String(ce.googleEventId || "");
      if (gid && seenProtocols.has(gid)) continue;
      if (!matchesOwnerScope(lead.owner)) continue;
      const key = extractIsoDateKey(ce.date);
      if (!key) continue;

      const list = map.get(key) || [];
      list.push({
        key: `lead-ce-${lead.id}-${gid || key}`,
        title: ce.title || `Reunião: ${lead.name}`,
        timeLabel: `${ce.startTime || "--:--"}${ce.endTime ? ` — ${ce.endTime}` : ""}`,
        subtitle: `${lead.name}${lead.company ? ` · ${lead.company}` : ""}`,
        owner: lead.owner || "Equipe",
        statusLabel: "Reunião CRM",
        statusClass: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        meetLink: ce.meetLink,
        whatsapp: lead.whatsapp,
        leadId: lead.id,
        calendarLink: ce.calendarLink,
        isCancelled: false,
      });
      map.set(key, list);
    }

    map.forEach((arr, k) => {
      arr.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
      map.set(k, arr);
    });

    return map;
  }, [bookings, leads, ownerFilter, isAdmin, currentUserName]);

  const othersByDate = useMemo(() => {
    const map = new Map<string, AgendaCustomItem[]>();
    for (const item of customItems) {
      if (!item || !item.data) continue;
      if (!matchesOwnerScope(item.responsavel_nome)) continue;
      const key = extractIsoDateKey(item.data);
      if (!key) continue;
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    }
    map.forEach((arr, k) => {
      arr.sort((a, b) => (a.hora_inicio || "99:99").localeCompare(b.hora_inicio || "99:99"));
      map.set(k, arr);
    });
    return map;
  }, [customItems, ownerFilter, isAdmin, currentUserName]);

  const monthSummary = useMemo(() => {
    const monthPrefix = format(viewMonth, "yyyy-MM");
    let totalEvents = 0;
    let pendingTasks = 0;
    let totalOthers = 0;

    eventsByDate.forEach((list, dateKey) => {
      if (dateKey.startsWith(monthPrefix)) {
        totalEvents += list.filter((e) => !e.isCancelled).length;
      }
    });
    tasksByDate.forEach((list, dateKey) => {
      if (dateKey.startsWith(monthPrefix)) {
        pendingTasks += list.filter((t) => !t.done).length;
      }
    });
    othersByDate.forEach((list, dateKey) => {
      if (dateKey.startsWith(monthPrefix)) {
        totalOthers += list.length;
      }
    });

    return { totalEvents, pendingTasks, totalOthers };
  }, [viewMonth, eventsByDate, tasksByDate, othersByDate]);

  const selectedDayTasks = tasksByDate.get(selectedDateIso) || [];
  const selectedDayEvents = eventsByDate.get(selectedDateIso) || [];
  const selectedDayOthers = othersByDate.get(selectedDateIso) || [];

  const selectedDateObj = useMemo(() => {
    try {
      const d = parseISO(`${selectedDateIso}T12:00:00`);
      return isValid(d) ? d : new Date();
    } catch {
      return new Date();
    }
  }, [selectedDateIso]);

  const formattedWeekday = format(selectedDateObj, "EEEE", { locale: ptBR });
  const formattedDayMonth = format(selectedDateObj, "dd 'de' MMMM", { locale: ptBR });
  const formattedYear = format(selectedDateObj, "yyyy", { locale: ptBR });

  const handleGoToday = () => {
    setViewMonth(startOfMonth(new Date()));
    setSelectedDateIso(todayIso);
  };

  const handleSelectDay = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    setSelectedDateIso(iso);
    if (!isSameMonth(day, viewMonth)) {
      setViewMonth(startOfMonth(day));
    }
    setShowOtherForm(false);
    setEditingOtherId(null);
  };

  const resetOtherForm = () => {
    setOtherForm({
      titulo: "",
      categoria: "VISITA",
      hora_inicio: "09:00",
      hora_fim: "10:00",
      local: "",
      lead_id: "",
      descricao: "",
    });
    setEditingOtherId(null);
    setShowOtherForm(false);
  };

  const handleOpenEditOther = (item: AgendaCustomItem) => {
    setEditingOtherId(item.id);
    setOtherForm({
      titulo: item.titulo,
      categoria: item.categoria,
      hora_inicio: item.hora_inicio || "",
      hora_fim: item.hora_fim || "",
      local: item.local || "",
      lead_id: item.lead_id || "",
      descricao: item.descricao || "",
    });
    setShowOtherForm(true);
  };

  const handleSaveOther = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherForm.titulo.trim()) {
      toast.error("Informe o título do compromisso.");
      return;
    }
    const linkedLead = otherForm.lead_id
      ? leads.find((l) => l.id === otherForm.lead_id)
      : undefined;

    if (editingOtherId) {
      await onUpdateCustomItem(editingOtherId, {
        titulo: otherForm.titulo.trim(),
        categoria: otherForm.categoria,
        data: selectedDateIso,
        hora_inicio: otherForm.hora_inicio,
        hora_fim: otherForm.hora_fim,
        local: otherForm.local.trim(),
        lead_id: linkedLead?.id || "",
        lead_nome: linkedLead
          ? `${linkedLead.name}${linkedLead.company ? ` (${linkedLead.company})` : ""}`
          : "",
        descricao: otherForm.descricao.trim(),
      });
      toast.success("Compromisso atualizado.");
    } else {
      await onAddCustomItem({
        titulo: otherForm.titulo.trim(),
        categoria: otherForm.categoria,
        data: selectedDateIso,
        hora_inicio: otherForm.hora_inicio,
        hora_fim: otherForm.hora_fim,
        local: otherForm.local.trim(),
        lead_id: linkedLead?.id || "",
        lead_nome: linkedLead
          ? `${linkedLead.name}${linkedLead.company ? ` (${linkedLead.company})` : ""}`
          : "",
        responsavel_nome: currentUserName || "Equipe",
        descricao: otherForm.descricao.trim(),
      });
    }
    resetOtherForm();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* LEFT PANEL: REFINED MONTH & YEAR CALENDAR */}
      <div className="lg:col-span-7 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between overflow-hidden">
        {/* Calendar Header Controls */}
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2.5 bg-muted/15">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMonth((prev) => subYears(prev, 1))}
              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground grid place-items-center transition-colors cursor-pointer"
              title="Ano anterior"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMonth((prev) => subMonths(prev, 1))}
              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground grid place-items-center transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1 px-1">
              <select
                aria-label="Selecionar mês"
                value={activeMonthIdx}
                onChange={(e) => {
                  const next = new Date(activeYear, Number(e.target.value), 1);
                  setViewMonth(next);
                }}
                className="rounded-lg bg-transparent hover:bg-muted/70 px-2 py-1 text-sm font-display font-bold text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx} className="bg-card text-foreground">
                    {name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Selecionar ano"
                value={activeYear}
                onChange={(e) => {
                  const next = new Date(Number(e.target.value), activeMonthIdx, 1);
                  setViewMonth(next);
                }}
                className="rounded-lg bg-transparent hover:bg-muted/70 px-2 py-1 text-sm font-mono font-bold tabular-nums text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="bg-card text-foreground">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setViewMonth((prev) => addMonths(prev, 1))}
              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground grid place-items-center transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMonth((prev) => addYears(prev, 1))}
              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground grid place-items-center transition-colors cursor-pointer"
              title="Próximo ano"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <select
                aria-label="Filtrar usuário no calendário"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground cursor-pointer"
              >
                <option value="all">Toda a Equipe</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleGoToday}
              className="h-8 px-3 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors cursor-pointer whitespace-nowrap"
            >
              Hoje
            </button>
          </div>
        </div>

        {/* Calendar Body */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col justify-center">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
            {WEEK_HEADERS.map((wd) => (
              <div
                key={wd}
                className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-1"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Rounded Day Tiles */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((day) => {
              const iso = format(day, "yyyy-MM-dd");
              const inCurrentMonth = isSameMonth(day, viewMonth);
              const isToday = iso === todayIso;
              const isSelected = iso === selectedDateIso;

              const dayTasks = tasksByDate.get(iso) || [];
              const dayPendingTasks = dayTasks.filter((t) => !t.done);
              const dayDoneTasks = dayTasks.filter((t) => t.done);
              const dayEvents = (eventsByDate.get(iso) || []).filter((ev) => !ev.isCancelled);
              const dayOthers = othersByDate.get(iso) || [];

              const hasEvents = dayEvents.length > 0;
              const hasPendingTasks = dayPendingTasks.length > 0;
              const hasOnlyDoneTasks = dayTasks.length > 0 && dayPendingTasks.length === 0;
              const hasOthers = dayOthers.length > 0;
              const totalCount = dayEvents.length + dayTasks.length + dayOthers.length;

              // Subtle tinted date coloring based on day contents
              let tileClasses = inCurrentMonth
                ? "bg-background/70 border-border/70 hover:bg-muted/60 hover:border-border"
                : "bg-transparent border-transparent opacity-35 hover:opacity-75 hover:bg-muted/30";

              if (hasEvents && hasPendingTasks) {
                tileClasses =
                  "bg-gradient-to-br from-sky-500/12 to-amber-500/12 border-sky-500/35 hover:border-sky-500/55";
              } else if (hasEvents) {
                tileClasses = "bg-sky-500/10 border-sky-500/35 hover:bg-sky-500/16";
              } else if (hasPendingTasks) {
                tileClasses = "bg-amber-500/10 border-amber-500/35 hover:bg-amber-500/16";
              } else if (hasOthers) {
                tileClasses = "bg-violet-500/10 border-violet-500/35 hover:bg-violet-500/16";
              } else if (hasOnlyDoneTasks) {
                tileClasses = "bg-emerald-500/8 border-emerald-500/25 hover:bg-emerald-500/14";
              }

              const tooltipParts: string[] = [];
              if (hasEvents) tooltipParts.push(`${dayEvents.length} evento(s)`);
              if (hasPendingTasks) tooltipParts.push(`${dayPendingTasks.length} tarefa(s) pendente(s)`);
              if (dayDoneTasks.length > 0) tooltipParts.push(`${dayDoneTasks.length} concluída(s)`);
              if (hasOthers) tooltipParts.push(`${dayOthers.length} outro(s)`);

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  title={
                    tooltipParts.length
                      ? `${format(day, "dd/MM/yyyy")}: ${tooltipParts.join(" · ")}`
                      : format(day, "dd/MM/yyyy")
                  }
                  className={cn(
                    "group relative h-[54px] sm:h-[60px] rounded-xl border p-1.5 sm:p-2 flex flex-col items-center justify-between transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    tileClasses,
                    isToday && !isSelected && "border-primary/70 ring-1 ring-primary/40",
                    isSelected &&
                      "border-primary bg-primary/12 ring-2 ring-primary/35 shadow-xs opacity-100"
                  )}
                >
                  {/* Day numeral + optional count in corner */}
                  <div className="w-full flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-6 min-w-6 px-1 rounded-lg text-xs font-semibold tabular-nums transition-colors",
                        isToday
                          ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                          : isSelected
                          ? "text-primary font-bold"
                          : "text-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {totalCount > 0 && (
                      <span className="text-[10px] font-mono font-bold tabular-nums text-muted-foreground/90">
                        {totalCount}
                      </span>
                    )}
                  </div>

                  {/* Clean Semantic Color Indicators */}
                  <div className="w-full flex items-center justify-center gap-1 min-h-[6px]">
                    {hasEvents && (
                      <span
                        className="h-1.5 flex-1 max-w-[14px] rounded-full bg-sky-500"
                        title={`${dayEvents.length} evento(s)`}
                      />
                    )}
                    {hasPendingTasks && (
                      <span
                        className="h-1.5 flex-1 max-w-[14px] rounded-full bg-amber-500"
                        title={`${dayPendingTasks.length} tarefa(s) pendente(s)`}
                      />
                    )}
                    {!hasPendingTasks && dayDoneTasks.length > 0 && (
                      <span
                        className="h-1.5 flex-1 max-w-[14px] rounded-full bg-emerald-500"
                        title={`${dayDoneTasks.length} tarefa(s) concluída(s)`}
                      />
                    )}
                    {hasOthers && (
                      <span
                        className="h-1.5 flex-1 max-w-[14px] rounded-full bg-violet-500"
                        title={`${dayOthers.length} outro(s)`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean Legend & Month Totals */}
        <div className="px-4 py-2.5 border-t border-border bg-muted/15 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary inline-block" />
              <span>Hoje</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500 inline-block" />
              <span>Eventos</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
              <span>Tarefas a fazer</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              <span>Concluídas</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-500 inline-block" />
              <span>Outros</span>
            </span>
          </div>

          <div className="font-mono tabular-nums text-[11px] text-foreground/80">
            {monthSummary.totalEvents} ev · {monthSummary.pendingTasks} tar · {monthSummary.totalOthers} out
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: SELECTED DAY DETAIL CARD */}
      <div className="lg:col-span-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col overflow-hidden">
        {/* Selected Day Header */}
        <div className="p-4 border-b border-border bg-muted/15 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                <span className="capitalize">{formattedWeekday}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{formattedYear}</span>
                {selectedDateIso === todayIso && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-primary font-bold">Hoje</span>
                  </>
                )}
              </div>
              <h2 className="font-display text-lg font-bold text-foreground capitalize mt-0.5 leading-snug">
                {formattedDayMonth}
              </h2>
            </div>

            {selectedDateIso !== todayIso && (
              <button
                type="button"
                onClick={handleGoToday}
                className="px-2.5 py-1 rounded-lg border border-border bg-background text-[11px] font-semibold hover:bg-muted cursor-pointer shrink-0"
              >
                Voltar p/ Hoje
              </button>
            )}
          </div>

          {/* 3 Category Buttons: Tarefas | Eventos | Outros */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/60 border border-border">
            <button
              type="button"
              onClick={() => setRightTab("tarefas")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                rightTab === "tarefas"
                  ? "bg-background text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListTodo className={cn("h-3.5 w-3.5", rightTab === "tarefas" && "text-amber-500")} />
              <span>Tarefas</span>
              <span className="font-mono text-[10px] tabular-nums opacity-75">
                {selectedDayTasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRightTab("eventos")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                rightTab === "eventos"
                  ? "bg-background text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className={cn("h-3.5 w-3.5", rightTab === "eventos" && "text-sky-500")} />
              <span>Eventos</span>
              <span className="font-mono text-[10px] tabular-nums opacity-75">
                {selectedDayEvents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRightTab("outros")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                rightTab === "outros"
                  ? "bg-background text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapPin className={cn("h-3.5 w-3.5", rightTab === "outros" && "text-violet-500")} />
              <span>Outros</span>
              <span className="font-mono text-[10px] tabular-nums opacity-75">
                {selectedDayOthers.length}
              </span>
            </button>
          </div>
        </div>

        {/* Right Panel Content (Fixed viewport height matching calendar) */}
        <div className="p-4 flex-1 overflow-y-auto max-h-[395px] space-y-3">
          {/* SUB-TAB 1: TAREFAS DO DIA */}
          {rightTab === "tarefas" && (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {selectedDayTasks.length} tarefa(s) em{" "}
                  <span className="font-mono tabular-nums font-medium text-foreground">
                    {format(selectedDateObj, "dd/MM/yyyy")}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onCreateTaskForDate(selectedDateIso)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" /> Nova Tarefa
                </button>
              </div>

              {selectedDayTasks.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-xl border border-dashed border-border bg-muted/10 space-y-1.5">
                  <ListTodo className="h-5 w-5 mx-auto text-muted-foreground/60" />
                  <div className="text-xs font-semibold text-foreground">
                    Nenhuma tarefa para este dia
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Clique em Nova Tarefa para agendar um acompanhamento nesta data.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border bg-background overflow-hidden">
                  {selectedDayTasks.map((task) => {
                    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
                    const doneSub = subtasks.filter((s) => s.done).length;
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "p-3 flex items-start gap-2.5 transition-colors hover:bg-muted/25",
                          task.done && "opacity-60"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleTask(task.id)}
                          className={cn(
                            "mt-0.5 h-5 w-5 rounded-md border grid place-items-center shrink-0 cursor-pointer transition-colors",
                            task.done
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-border bg-card hover:border-primary"
                          )}
                          title={task.done ? "Reabrir tarefa" : "Concluir tarefa"}
                        >
                          {task.done ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-transparent" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div
                            className={cn(
                              "text-xs font-semibold text-foreground",
                              task.done && "line-through"
                            )}
                          >
                            {task.title || "Tarefa"}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span>{task.lead || "Geral"}</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{task.priority || "média"}</span>
                            {Array.isArray(task.owners) && task.owners.length > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{task.owners.join(", ")}</span>
                              </>
                            )}
                            {subtasks.length > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">
                                  {doneSub}/{subtasks.length} passos
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted cursor-pointer"
                            title="Editar tarefa"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {confirmDeleteTaskId === task.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteTask(task.id);
                                  setConfirmDeleteTaskId(null);
                                  toast.success("Tarefa removida.");
                                }}
                                className="px-2 py-1 rounded bg-destructive text-destructive-foreground text-[10px] font-bold cursor-pointer"
                              >
                                Excluir
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTaskId(null)}
                                className="px-1.5 py-1 rounded border border-border text-[10px] cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTaskId(task.id)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted cursor-pointer"
                              title="Excluir tarefa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* SUB-TAB 2: EVENTOS AGENDADOS NO DIA */}
          {rightTab === "eventos" && (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {selectedDayEvents.length} evento(s) em{" "}
                  <span className="font-mono tabular-nums font-medium text-foreground">
                    {format(selectedDateObj, "dd/MM/yyyy")}
                  </span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onOpenBookingsTab}
                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted cursor-pointer whitespace-nowrap"
                  >
                    Ver Todos
                  </button>
                  <button
                    type="button"
                    onClick={onCreateEvent}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" /> Novo Evento
                  </button>
                </div>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-xl border border-dashed border-border bg-muted/10 space-y-1.5">
                  <Calendar className="h-5 w-5 mx-auto text-muted-foreground/60" />
                  <div className="text-xs font-semibold text-foreground">
                    Nenhum evento agendado nesta data
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Reuniões confirmadas pelo portal público ou CRM aparecem aqui.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border bg-background overflow-hidden">
                  {selectedDayEvents.map((ev) => {
                    const waHref = ev.whatsapp ? buildWhatsAppLink(ev.whatsapp) : "";
                    return (
                      <div
                        key={ev.key}
                        onClick={() => {
                          if (ev.booking) onSelectBooking(ev.booking);
                        }}
                        className={cn(
                          "p-3 space-y-2 transition-colors",
                          ev.booking && "cursor-pointer hover:bg-muted/25",
                          ev.isCancelled && "opacity-55"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-primary tabular-nums">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>{ev.timeLabel}</span>
                            </div>
                            <div className="text-xs font-bold text-foreground mt-0.5 truncate">
                              {ev.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-foreground/90">{ev.subtitle}</span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <UserCheck className="h-3 w-3" /> {ev.owner}
                              </span>
                            </div>
                          </div>

                          <span
                            className={cn(
                              "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase shrink-0",
                              ev.statusClass
                            )}
                          >
                            {ev.statusLabel}
                          </span>
                        </div>

                        <div
                          className="flex items-center gap-1.5 flex-wrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ev.meetLink && (
                            <a
                              href={ev.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-500"
                            >
                              <Video className="h-3 w-3" /> Meet
                            </a>
                          )}
                          {ev.whatsapp && (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                            >
                              <MessageCircle className="h-3 w-3" /> WhatsApp
                            </a>
                          )}
                          {ev.leadId && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate({
                                  to: "/app/crm",
                                  search: { leadId: ev.leadId } as any,
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[10px] font-semibold hover:bg-muted cursor-pointer"
                            >
                              Abrir Lead <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                          {ev.booking && (
                            <button
                              type="button"
                              onClick={() => onSelectBooking(ev.booking!)}
                              className="ml-auto rounded-md border border-border px-2.5 py-1 text-[10px] font-semibold hover:bg-muted cursor-pointer"
                            >
                              Detalhes
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* SUB-TAB 3: OUTROS (VISITAS, REUNIÕES, LIGAÇÕES, COMPROMISSOS) */}
          {rightTab === "outros" && (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Visitas, reuniões e outros ({format(selectedDateObj, "dd/MM/yyyy")})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (showOtherForm) {
                      resetOtherForm();
                    } else {
                      setEditingOtherId(null);
                      setShowOtherForm(true);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer whitespace-nowrap"
                >
                  {showOtherForm ? (
                    <>
                      <X className="h-3.5 w-3.5" /> Fechar
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </>
                  )}
                </button>
              </div>

              {showOtherForm && (
                <form
                  onSubmit={handleSaveOther}
                  className="rounded-xl border border-primary/30 bg-muted/20 p-3 space-y-2.5"
                >
                  <div className="text-xs font-bold text-foreground">
                    {editingOtherId ? "Editar Compromisso" : "Novo Compromisso em Outros"}
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    {(Object.keys(OTHER_CATEGORY_META) as AgendaOtherCategory[]).map((cat) => {
                      const meta = OTHER_CATEGORY_META[cat];
                      const active = otherForm.categoria === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setOtherForm((p) => ({ ...p, categoria: cat }))}
                          className={cn(
                            "py-1.5 px-1 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer truncate",
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {meta.short}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    required
                    value={otherForm.titulo}
                    onChange={(e) => setOtherForm((p) => ({ ...p, titulo: e.target.value }))}
                    placeholder="Ex: Visita técnica ao cliente / Almoço comercial..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={otherForm.hora_inicio}
                      onChange={(e) =>
                        setOtherForm((p) => ({ ...p, hora_inicio: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono"
                    />
                    <input
                      type="time"
                      value={otherForm.hora_fim}
                      onChange={(e) =>
                        setOtherForm((p) => ({ ...p, hora_fim: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={otherForm.local}
                      onChange={(e) => setOtherForm((p) => ({ ...p, local: e.target.value }))}
                      placeholder="Local / Endereço (opcional)"
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                    />
                    <select
                      value={otherForm.lead_id}
                      onChange={(e) => setOtherForm((p) => ({ ...p, lead_id: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
                    >
                      <option value="">Sem vínculo com Lead</option>
                      {leads.slice(0, 80).map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                          {l.company ? ` (${l.company})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    rows={2}
                    value={otherForm.descricao}
                    onChange={(e) => setOtherForm((p) => ({ ...p, descricao: e.target.value }))}
                    placeholder="Observações ou pauta..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs resize-none"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetOtherForm}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
                    >
                      {editingOtherId ? "Salvar" : "Adicionar"}
                    </button>
                  </div>
                </form>
              )}

              {selectedDayOthers.length === 0 && !showOtherForm ? (
                <div className="py-12 px-4 text-center rounded-xl border border-dashed border-border bg-muted/10 space-y-1.5">
                  <MapPin className="h-5 w-5 mx-auto text-muted-foreground/60" />
                  <div className="text-xs font-semibold text-foreground">
                    Nenhum compromisso em Outros
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Registre visitas, reuniões externas ou compromissos no botão acima.
                  </p>
                </div>
              ) : (
                selectedDayOthers.length > 0 && (
                  <div className="divide-y divide-border rounded-xl border border-border bg-background overflow-hidden">
                    {selectedDayOthers.map((item) => {
                      const meta =
                        OTHER_CATEGORY_META[item.categoria] || OTHER_CATEGORY_META.OUTRO;
                      const CatIcon = meta.icon;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "p-3 flex items-start gap-2.5 transition-colors hover:bg-muted/25",
                            item.concluido && "opacity-60"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onToggleCustomItem(item.id)}
                            className={cn(
                              "mt-0.5 h-5 w-5 rounded-md border grid place-items-center shrink-0 cursor-pointer transition-colors",
                              item.concluido
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-border bg-card hover:border-primary"
                            )}
                            title={item.concluido ? "Reabrir" : "Concluir"}
                          >
                            {item.concluido ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-transparent" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                  meta.colorClass
                                )}
                              >
                                <CatIcon className="h-2.5 w-2.5" />
                                {meta.label}
                              </span>
                              {(item.hora_inicio || item.hora_fim) && (
                                <span className="text-[11px] font-mono font-bold text-muted-foreground tabular-nums">
                                  {item.hora_inicio || "--:--"}
                                  {item.hora_fim ? ` — ${item.hora_fim}` : ""}
                                </span>
                              )}
                            </div>

                            <div
                              className={cn(
                                "text-xs font-semibold text-foreground",
                                item.concluido && "line-through"
                              )}
                            >
                              {item.titulo}
                            </div>

                            {(item.local || item.lead_nome) && (
                              <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                                {item.local && <span>{item.local}</span>}
                                {item.local && item.lead_nome && <span aria-hidden="true">·</span>}
                                {item.lead_nome && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (item.lead_id) {
                                        navigate({
                                          to: "/app/crm",
                                          search: { leadId: item.lead_id } as any,
                                        });
                                      }
                                    }}
                                    className={cn(
                                      "font-semibold",
                                      item.lead_id && "text-primary hover:underline cursor-pointer"
                                    )}
                                  >
                                    {item.lead_nome}
                                  </button>
                                )}
                              </div>
                            )}

                            {item.descricao && (
                              <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                                {item.descricao}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditOther(item)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted cursor-pointer"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {confirmDeleteCustomId === item.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteCustomItem(item.id);
                                    setConfirmDeleteCustomId(null);
                                  }}
                                  className="px-2 py-1 rounded bg-destructive text-destructive-foreground text-[10px] font-bold cursor-pointer"
                                >
                                  Excluir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteCustomId(null)}
                                  className="px-1.5 py-1 rounded border border-border text-[10px] cursor-pointer"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteCustomId(item.id)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
