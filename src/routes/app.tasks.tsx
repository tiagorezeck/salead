import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useData, type Task } from "@/hooks/use-data";
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Plus,
  Circle,
  Users as UsersIcon,
  ChevronDown,
  Search,
  ListTodo,
  Pencil,
  Trash2,
  AlertCircle,
  Timer,
  X,
  Clock,
  FileSpreadsheet,
  ExternalLink,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { NewTaskModal } from "@/components/crm/new-task-modal";
import { AgendaCalendarView } from "@/components/agenda/AgendaCalendarView";
import { EventListView } from "@/components/agenda/EventListView";
import { AvailabilityManagerView } from "@/components/agenda/AvailabilityManagerView";
import { BookingsScheduleView, EventDetailModal } from "@/components/agenda/BookingsScheduleView";
import { EventModal } from "@/components/agenda/EventModal";
import { FormBuilderView } from "@/components/agenda/FormBuilderView";
import { QRCodeModal } from "@/components/agenda/QRCodeModal";
import { createStarterAgendaSeed } from "@/lib/agenda-seed";
import type { AgendaBooking, AgendaEvent } from "@/types/agenda";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO, isBefore, startOfDay, isWithinInterval, format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

function safeParseDate(value?: string | Date | null, fallback: Date = new Date()): Date {
  if (!value) return fallback;
  if (value instanceof Date) return isValid(value) ? value : fallback;
  const str = String(value).trim();
  if (!str) return fallback;
  try {
    const parsedIso = parseISO(str);
    if (isValid(parsedIso)) return parsedIso;
  } catch {}
  const parsedNative = new Date(str);
  return isValid(parsedNative) ? parsedNative : fallback;
}

type AgendaTabId =
  | "calendario"
  | "agendamentos"
  | "eventos"
  | "disponibilidade"
  | "formularios"
  | "tarefas";

export const Route = createFileRoute("/app/tasks")({
  component: TasksPage,
  validateSearch: (search: Record<string, unknown>) => {
    const rawTab = String(search.tab || "");
    const normalized = rawTab === "horarios" ? "disponibilidade" : rawTab;
    const validTabs: AgendaTabId[] = [
      "calendario",
      "agendamentos",
      "eventos",
      "disponibilidade",
      "formularios",
      "tarefas",
    ];
    const tab = validTabs.includes(normalized as AgendaTabId)
      ? (normalized as AgendaTabId)
      : undefined;
    return {
      tab,
      eventId: (search.eventId as string) || undefined,
      bookingId: (search.bookingId as string) || undefined,
      lead: (search.lead as string) || undefined,
    };
  },
});

const prioStyle = {
  urgente: "bg-destructive text-white border-destructive shadow-sm",
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  media: "bg-warning/15 text-warning border-warning/30",
  baixa: "bg-muted text-muted-foreground border-border",
};

function TasksPage() {
  const {
    tasks,
    toggleTask,
    addTask,
    updateTask,
    deleteTask,
    leads,
    users,
    products,
    currentUser,
    initialized,
    dateFilter,
    agendaEvents,
    agendaSchedules,
    agendaBlocks,
    agendaBookings,
    agendaFormFields,
    agendaFormResponses,
    agendaWaitlist,
    agendaCustomItems,
    saveAgendaEvent,
    deleteAgendaEvent,
    duplicateAgendaEvent,
    updateAgendaEventPublicConfig,
    updateAgendaSchedule,
    toggleAgendaBlock,
    updateAgendaBookingStatus,
    rescheduleAgendaBooking,
    addAgendaCustomItem,
    updateAgendaCustomItem,
    toggleAgendaCustomItem,
    deleteAgendaCustomItem,
  } = useData();

  const searchParams = useSearch({ from: "/app/tasks" });
  const { tab: paramTab, eventId: paramEventId, bookingId: paramBookingId, lead: leadFilter } = searchParams;

  const [activeTab, setActiveTab] = useState<AgendaTabId>(paramTab || "calendario");
  const [selectedEventIdTarget, setSelectedEventIdTarget] = useState<string | undefined>(paramEventId);
  const [selectedBooking, setSelectedBooking] = useState<AgendaBooking | null>(null);

  // Modals for Events
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [qrEvent, setQrEvent] = useState<AgendaEvent | null>(null);

  // Tarefas tab states
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [dateScope, setDateScope] = useState<"all" | "global_period">("all");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState(leadFilter || "");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskInitialDate, setNewTaskInitialDate] = useState<string | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const isAdmin = currentUser?.role === "Admin Geral" || currentUser?.role === "Head of Sales";

  useEffect(() => {
    if (paramTab) setActiveTab(paramTab);
  }, [paramTab]);

  useEffect(() => {
    if (paramEventId) setSelectedEventIdTarget(paramEventId);
  }, [paramEventId]);

  useEffect(() => {
    if (paramBookingId && agendaBookings.length > 0) {
      const found = agendaBookings.find(
        (b) => b.id_agendamento === paramBookingId || b.protocolo === paramBookingId
      );
      if (found) {
        setSelectedBooking(found);
        setActiveTab("agendamentos");
      }
    }
  }, [paramBookingId, agendaBookings]);

  useEffect(() => {
    if (initialized && currentUser && !isAdmin) {
      setSelectedOwner(currentUser.name);
    }
  }, [initialized, currentUser, isAdmin]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t) return false;
      if (dateScope === "global_period" && dateFilter.from && dateFilter.to) {
        const dueDate = safeParseDate(t.due);
        const start = dateFilter.from <= dateFilter.to ? dateFilter.from : dateFilter.to;
        const end = dateFilter.from <= dateFilter.to ? dateFilter.to : dateFilter.from;
        const inPeriod = isWithinInterval(dueDate, { start, end });
        if (!inPeriod) return false;
      }

      const matchesStatus = filter === "all" ? true : filter === "pending" ? !t.done : t.done;
      const matchesOwner =
        selectedOwner === "all" ||
        (Array.isArray(t.owners) &&
          t.owners.some((o) => String(o || "").toLowerCase() === selectedOwner.toLowerCase()));
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        String(t.title || "").toLowerCase().includes(q) ||
        String(t.lead || "").toLowerCase().includes(q);
      return matchesStatus && matchesOwner && matchesSearch;
    });
  }, [tasks, filter, selectedOwner, searchQuery, dateFilter, dateScope]);

  const activeBookingsCount = useMemo(
    () => agendaBookings.filter((b) => b.status === "CONFIRMADO").length,
    [agendaBookings]
  );

  const pendingTasksCount = useMemo(
    () => tasks.filter((t) => !t.done).length,
    [tasks]
  );

  if (!initialized) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Sincronizando agenda...</div>;
  }

  return (
    <div className="p-4 md:px-6 md:py-4 max-w-[1440px] mx-auto space-y-4">
      {/* Compact Workspace Bar: Tabs + Direct Action Buttons (Criar Evento, Disponibilidade, Formulários, Agendamento Público) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 overflow-x-auto">
          {[
            {
              id: "calendario" as const,
              label: "Calendário",
              count: activeBookingsCount + pendingTasksCount + agendaCustomItems.length,
              icon: Calendar,
            },
            {
              id: "agendamentos" as const,
              label: "Agendamentos",
              count: activeBookingsCount,
              icon: CalendarDays,
            },
            {
              id: "eventos" as const,
              label: "Eventos",
              count: agendaEvents.length,
              icon: Calendar,
            },
            {
              id: "tarefas" as const,
              label: "Tarefas",
              count: pendingTasksCount,
              icon: ListTodo,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0",
                  active
                    ? "bg-background text-foreground shadow-2xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", active ? "text-primary" : "")} />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded-md",
                    active ? "bg-primary/10 text-primary font-bold" : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingEvent(null);
              setEventModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Criar Evento
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("disponibilidade")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "disponibilidade"
                ? "border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400"
                : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            <Clock className="h-3.5 w-3.5 text-orange-500" />
            <span>Disponibilidade</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("formularios")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "formularios"
                ? "border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400"
                : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
            <span>Formulários</span>
          </button>

          <a
            href={
              agendaEvents.find((e) => e.status === "PUBLICADO")?.slug
                ? `/agendar/${encodeURIComponent(
                    agendaEvents.find((e) => e.status === "PUBLICADO")!.slug
                  )}`
                : "/agendar"
            }
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir tela pública de agendamento (Dia -> Horário -> Questionário)"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors whitespace-nowrap"
          >
            <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
            <span>Página Pública</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setNewTaskInitialDate(undefined);
              setShowNewTaskModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Tab 1: Calendário Completo (Esquerda Mês/Ano + Direita Dia Selecionado) */}
      {activeTab === "calendario" && (
        <>
          <AgendaCalendarView
            tasks={tasks}
            bookings={agendaBookings}
            customItems={agendaCustomItems}
            leads={leads}
            users={users}
            isAdmin={isAdmin}
            currentUserName={currentUser?.name}
            onToggleTask={toggleTask}
            onEditTask={(t) => setEditingTask(t)}
            onDeleteTask={deleteTask}
            onCreateTaskForDate={(dateIso) => {
              setEditingTask(null);
              setNewTaskInitialDate(dateIso);
              setShowNewTaskModal(true);
            }}
            onSelectBooking={setSelectedBooking}
            onCreateEvent={() => {
              setEditingEvent(null);
              setEventModalOpen(true);
            }}
            onOpenBookingsTab={() => setActiveTab("agendamentos")}
            onAddCustomItem={addAgendaCustomItem}
            onUpdateCustomItem={updateAgendaCustomItem}
            onToggleCustomItem={toggleAgendaCustomItem}
            onDeleteCustomItem={deleteAgendaCustomItem}
          />
          <EventDetailModal
            booking={selectedBooking}
            events={agendaEvents}
            formResponses={agendaFormResponses}
            onClose={() => setSelectedBooking(null)}
            onUpdateStatus={updateAgendaBookingStatus}
            onReschedule={rescheduleAgendaBooking}
          />
        </>
      )}

      {/* Tab 2: Agendamentos */}
      {activeTab === "agendamentos" && (
        <BookingsScheduleView
          bookings={agendaBookings}
          events={agendaEvents}
          waitlist={agendaWaitlist}
          formResponses={agendaFormResponses}
          users={users}
          isAdmin={isAdmin}
          currentUserName={currentUser?.name}
          dateFilter={dateFilter}
          selectedBooking={selectedBooking}
          onSelectBooking={setSelectedBooking}
          onUpdateStatus={updateAgendaBookingStatus}
          onReschedule={rescheduleAgendaBooking}
        />
      )}

      {/* Tab 3: Eventos */}
      {activeTab === "eventos" && (
        <EventListView
          events={agendaEvents}
          schedules={agendaSchedules}
          bookings={agendaBookings}
          formFields={agendaFormFields}
          products={products}
          onCreateEvent={() => {
            setEditingEvent(null);
            setEventModalOpen(true);
          }}
          onEditEvent={(ev) => {
            setEditingEvent(ev);
            setEventModalOpen(true);
          }}
          onOpenFormBuilder={(ev) => {
            setSelectedEventIdTarget(ev.id_evento);
            setActiveTab("formularios");
          }}
          onOpenAvailability={(ev) => {
            setSelectedEventIdTarget(ev.id_evento);
            setActiveTab("disponibilidade");
          }}
          onOpenQRCode={(ev) => setQrEvent(ev)}
          onDuplicateEvent={duplicateAgendaEvent}
          onDeleteEvent={deleteAgendaEvent}
          onToggleStatus={async (ev) => {
            const nextStatus = ev.status === "PUBLICADO" ? "PAUSADO" : "PUBLICADO";
            await updateAgendaEventPublicConfig(ev.id_evento, {
              status: nextStatus,
              agenda_publica_ativa: nextStatus === "PUBLICADO",
            });
          }}
          onLoadStarterEvent={async () => {
            const seed = createStarterAgendaSeed();
            await saveAgendaEvent(seed.events[0], seed.schedules, seed.fields);
            toast.success("Evento exemplo carregado com horários e questionário!");
          }}
        />
      )}

      {/* Disponibilidade (Controle de Vagas & Bloqueios) */}
      {activeTab === "disponibilidade" && (
        <AvailabilityManagerView
          events={agendaEvents}
          schedules={agendaSchedules}
          blocks={agendaBlocks}
          bookings={agendaBookings}
          waitlist={agendaWaitlist}
          products={products}
          initialEventId={selectedEventIdTarget}
          onToggleBlock={toggleAgendaBlock}
          onUpdateBookingStatus={updateAgendaBookingStatus}
          onUpdateSchedule={updateAgendaSchedule}
          onSelectBooking={(bk) => {
            setSelectedBooking(bk);
            setActiveTab("agendamentos");
          }}
        />
      )}

      {/* Formulários (Construtor de Formulários de Qualificação) */}
      {activeTab === "formularios" && (
        <FormBuilderView
          events={agendaEvents}
          schedules={agendaSchedules}
          formFields={agendaFormFields}
          initialEventId={selectedEventIdTarget}
          onSaveEvent={saveAgendaEvent}
          onCreateEvent={() => {
            setEditingEvent(null);
            setEventModalOpen(true);
          }}
        />
      )}

      {/* Tab 4: Tarefas Operacionais */}
      {activeTab === "tarefas" && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Buscar por tarefa ou cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {isAdmin && (
                <div className="relative">
                  <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                  <select
                    value={selectedOwner}
                    onChange={(e) => setSelectedOwner(e.target.value)}
                    className="pl-9 pr-8 py-2 bg-card border border-border rounded-xl text-xs font-semibold appearance-none focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos os Usuários</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                </div>
              )}

              <div className="flex bg-muted/40 rounded-xl p-1 border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setDateScope("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                    dateScope === "all" ? "bg-background shadow-2xs font-semibold" : "text-muted-foreground"
                  )}
                >
                  Todas Datas
                </button>
                <button
                  type="button"
                  onClick={() => setDateScope("global_period")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                    dateScope === "global_period" ? "bg-background shadow-2xs font-semibold" : "text-muted-foreground"
                  )}
                >
                  {dateFilter.label || "Período Global"}
                </button>
              </div>

              <div className="flex bg-muted/40 rounded-xl p-1 border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setFilter("pending")}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all cursor-pointer",
                    filter === "pending" ? "bg-background shadow-2xs font-semibold" : "text-muted-foreground"
                  )}
                >
                  Pendentes
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("done")}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all cursor-pointer",
                    filter === "done" ? "bg-background shadow-2xs font-semibold" : "text-muted-foreground"
                  )}
                >
                  Concluídas
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all cursor-pointer",
                    filter === "all" ? "bg-background shadow-2xs font-semibold" : "text-muted-foreground"
                  )}
                >
                  Todas
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task.id)}
                onEdit={() => setEditingTask(task)}
                onDelete={() => deleteTask(task.id)}
                onUpdateTask={(updates) => updateTask(task.id, updates)}
              />
            ))}
            {filteredTasks.length === 0 && (
              <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-card text-xs text-muted-foreground">
                Nenhuma tarefa encontrada com os filtros atuais.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <EventModal
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false);
          setEditingEvent(null);
        }}
        eventoToEdit={editingEvent}
        initialSchedules={
          editingEvent
            ? agendaSchedules.filter((s) => s.id_evento === editingEvent.id_evento)
            : []
        }
        initialFields={
          editingEvent
            ? agendaFormFields.filter((f) => f.id_evento === editingEvent.id_evento)
            : []
        }
        products={products}
        onSave={saveAgendaEvent}
      />

      <QRCodeModal
        isOpen={Boolean(qrEvent)}
        onClose={() => setQrEvent(null)}
        evento={qrEvent}
        onUpdatePublicConfig={updateAgendaEventPublicConfig}
      />

      {(showNewTaskModal || editingTask) && (
        <NewTaskModal
          taskToEdit={editingTask || undefined}
          initialDate={newTaskInitialDate}
          onClose={() => {
            setShowNewTaskModal(false);
            setNewTaskInitialDate(undefined);
            setEditingTask(null);
          }}
          onAdd={addTask}
        />
      )}
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  onUpdateTask,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateTask: (updates: Partial<Task>) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");

  const createdDate = safeParseDate(task.createdAt);
  const dueDate = safeParseDate(task.due, createdDate);
  const today = startOfDay(new Date());

  const isOverdue = !task.done && isBefore(dueDate, today);
  const daysToComplete = Math.max(
    0,
    task.completedAt
      ? differenceInDays(safeParseDate(task.completedAt), createdDate)
      : differenceInDays(new Date(), createdDate)
  );

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const subtasksDone = subtasks.filter((s) => s.done).length;
  const totalSubtasks = subtasks.length;
  const canComplete = totalSubtasks === 0 || subtasksDone === totalSubtasks;

  const handleAddSubtask = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newSubtask.trim()) return;
    const updated = [...subtasks, { id: `st-${Date.now()}`, title: newSubtask, done: false }];
    onUpdateTask({ subtasks: updated });
    setNewSubtask("");
  };

  const toggleSubtask = (stId: string) => {
    const updated = subtasks.map((st) => (st.id === stId ? { ...st, done: !st.done } : st));
    onUpdateTask({ subtasks: updated });
  };

  const removeSubtask = (stId: string) => {
    const updated = subtasks.filter((st) => st.id !== stId);
    onUpdateTask({ subtasks: updated });
  };

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl transition-all overflow-hidden",
        task.done ? "opacity-60" : "hover:border-primary/40",
        isExpanded ? "ring-2 ring-primary/20" : ""
      )}
    >
      <div className="p-4 flex items-center gap-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            "h-6 w-6 rounded-lg border transition-all grid place-items-center flex-shrink-0 cursor-pointer",
            task.done ? "bg-success border-success" : "border-border bg-muted/50 hover:border-primary/50",
            !canComplete && !task.done && "cursor-not-allowed opacity-50"
          )}
          title={!canComplete ? "Conclua todas as subtarefas primeiro" : ""}
        >
          {task.done ? (
            <CheckCircle2 className="h-4 w-4 text-success-foreground" />
          ) : (
            <Circle className="h-4 w-4 text-transparent" />
          )}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-2 flex-wrap">
            <div className={cn("text-sm font-bold truncate", task.done && "line-through")}>
              {task.title || "Tarefa"}
            </div>
            <span
              className={cn(
                "text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border",
                prioStyle[task.priority] || prioStyle.media
              )}
            >
              {task.priority || "media"}
            </span>
            {isOverdue && (
              <span className="text-[9px] font-bold bg-destructive text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                <AlertCircle className="h-2.5 w-2.5" /> Atrasada
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="text-[11px] text-muted-foreground font-semibold">{task.lead || "Geral"}</div>
            <div className="h-1 w-1 rounded-full bg-border" />
            <div className="flex -space-x-1.5">
              {(task.owners || []).filter(Boolean).map((o, i) => (
                <div
                  key={i}
                  className="h-5 w-5 rounded-full bg-primary text-[8px] font-bold text-white border-2 border-background grid place-items-center"
                  title={o}
                >
                  {String(o)
                    .trim()
                    .split(/\s+/)
                    .map((p) => p[0] || "")
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "?"}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <div
            className={cn(
              "text-[11px] font-mono font-bold tabular-nums",
              isOverdue ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {format(dueDate, "dd/MM/yyyy", { locale: ptBR })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
            Há {daysToComplete}d
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="p-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {confirmingDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  toast.success("Tarefa removida.");
                  setConfirmingDelete(false);
                }}
                className="rounded-lg bg-destructive px-2 py-1 text-[10px] font-bold text-destructive-foreground cursor-pointer"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold cursor-pointer"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "p-2 text-muted-foreground transition-transform cursor-pointer",
              isExpanded && "rotate-180"
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-14 pb-5 pt-2 border-t border-border/50 bg-muted/10">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ListTodo className="h-3.5 w-3.5" /> Subtarefas ({subtasksDone}/{totalSubtasks})
                </div>
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Novo passo..."
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddSubtask();
                    }}
                    className="bg-background border border-border rounded-lg px-2 py-1 text-[11px] w-32 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="p-1 bg-primary text-primary-foreground rounded-md cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {subtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-3 group/st">
                    <button
                      type="button"
                      onClick={() => toggleSubtask(st.id)}
                      className="flex-1 flex items-center gap-3 p-2 rounded-lg hover:bg-background transition-all text-left cursor-pointer"
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                          st.done ? "bg-primary border-primary text-white" : "border-border bg-background"
                        )}
                      >
                        {st.done && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          st.done && "line-through text-muted-foreground"
                        )}
                      >
                        {st.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSubtask(st.id)}
                      className="opacity-0 group-hover/st:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Timer className="h-3.5 w-3.5" /> Métricas
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-background border border-border">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Lead Time</div>
                  <div className="text-sm font-mono font-bold tabular-nums">{daysToComplete} dias</div>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Status Prazo</div>
                  <div
                    className={cn(
                      "text-sm font-bold",
                      isOverdue ? "text-destructive" : "text-success"
                    )}
                  >
                    {task.done ? "Concluída" : isOverdue ? "Atrasada" : "No Prazo"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}