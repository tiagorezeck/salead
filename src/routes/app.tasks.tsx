import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useData, type Task, type Subtask } from "@/hooks/use-data";
import { Calendar, Clock, CheckCircle2, Plus, Circle, Users as UsersIcon, ChevronDown, Search, ChevronRight, ListTodo, Pencil, Trash2, AlertCircle, Timer, UserPlus, X } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { NewTaskModal } from "@/components/crm/new-task-modal";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO, isAfter, isBefore, startOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/tasks")({ 
  component: TasksPage,
  validateSearch: (search: Record<string, unknown>) => ({
    lead: (search.lead as string) || undefined,
  }),
});

const prioStyle = {
  urgente: "bg-destructive text-white border-destructive shadow-sm animate-pulse",
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  media: "bg-warning/15 text-warning border-warning/30",
  baixa: "bg-muted text-muted-foreground border-border",
};

function TasksPage() {
  const { tasks, toggleTask, addTask, updateTask, deleteTask, users, currentUser, initialized, dateFilter } = useData();
  const { lead: leadFilter } = useSearch({ from: "/app/tasks" });
  
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState(leadFilter || "");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const isAdmin = currentUser?.role === "Admin Geral";

  useEffect(() => {
    if (initialized && currentUser && !isAdmin) {
      setSelectedOwner(currentUser.name);
    }
  }, [initialized, currentUser, isAdmin]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // FILTRO DE PERÍODO GLOBAL COM VALIDAÇÃO
      if (dateFilter.from && dateFilter.to) {
        const inPeriod = isWithinInterval(new Date(t.due), { 
          start: dateFilter.from, 
          end: dateFilter.to 
        });
        if (!inPeriod) return false;
      }

      const matchesStatus = filter === "all" ? true : filter === "pending" ? !t.done : t.done;
      const matchesOwner = selectedOwner === "all" || t.owners.includes(selectedOwner);
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.lead.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesOwner && matchesSearch;
    });
  }, [tasks, filter, selectedOwner, searchQuery, dateFilter]);

  if (!initialized) return <div className="p-8 text-center">Sincronizando agenda...</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Execução & Performance</div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">Sua pauta de trabalho</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualizando compromissos de <span className="text-primary font-bold">{dateFilter.label}</span>.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <div className="relative">
              <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
              <select 
                value={selectedOwner} 
                onChange={(e) => setSelectedOwner(e.target.value)} 
                className="pl-9 pr-8 py-2 bg-muted/50 border border-border rounded-xl text-xs font-bold appearance-none focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Usuários</option>
                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>
          )}
          <div className="flex bg-muted rounded-lg p-1 border border-border">
            <button onClick={() => setFilter("pending")} className={cn("px-3 py-1 text-xs rounded-md transition-all", filter === "pending" ? "bg-background shadow-sm font-bold" : "text-muted-foreground")}>Pendentes</button>
            <button onClick={() => setFilter("done")} className={cn("px-3 py-1 text-xs rounded-md transition-all", filter === "done" ? "bg-background shadow-sm font-bold" : "text-muted-foreground")}>Concluídas</button>
            <button onClick={() => setFilter("all")} className={cn("px-3 py-1 text-xs rounded-md transition-all", filter === "all" ? "bg-background shadow-sm font-bold" : "text-muted-foreground")}>Todas</button>
          </div>
          <button onClick={() => setShowNewTaskModal(true)} className="text-sm px-3 py-2 rounded-lg bg-gradient-primary text-primary-foreground font-semibold shadow-elegant inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Nova tarefa</button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input 
          placeholder="Buscar por tarefa ou cliente..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
        />
      </div>

      <div className="space-y-4">
        {filteredTasks.map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onToggle={() => toggleTask(task.id)} 
            onEdit={() => setEditingTask(task)}
            onDelete={() => { if(confirm("Excluir tarefa?")) deleteTask(task.id); }}
            onUpdateTask={(updates) => updateTask(task.id, updates)}
          />
        ))}
        {filteredTasks.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl">
            <div className="text-muted-foreground">Nenhuma tarefa encontrada neste intervalo de datas.</div>
          </div>
        )}
      </div>

      {(showNewTaskModal || editingTask) && (
        <NewTaskModal 
          taskToEdit={editingTask || undefined}
          onClose={() => { setShowNewTaskModal(false); setEditingTask(null); }} 
          onAdd={addTask} 
        />
      )}
    </div>
  );
}

function TaskItem({ task, onToggle, onEdit, onDelete, onUpdateTask }: { 
  task: Task; 
  onToggle: () => void; 
  onEdit: () => void;
  onDelete: () => void;
  onUpdateTask: (updates: Partial<Task>) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  
  const createdDate = parseISO(task.createdAt);
  const dueDate = parseISO(task.due);
  const today = startOfDay(new Date());
  
  const isOverdue = !task.done && isBefore(dueDate, today);
  const daysToComplete = task.completedAt 
    ? differenceInDays(parseISO(task.completedAt), createdDate)
    : differenceInDays(new Date(), createdDate);

  const subtasks = task.subtasks || [];
  const subtasksDone = subtasks.filter(s => s.done).length;
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
    const updated = subtasks.map(st => st.id === stId ? { ...st, done: !st.done } : st);
    onUpdateTask({ subtasks: updated });
  };

  const removeSubtask = (stId: string) => {
    const updated = subtasks.filter(st => st.id !== stId);
    onUpdateTask({ subtasks: updated });
  };

  return (
    <div className={cn(
      "bg-gradient-surface border rounded-2xl shadow-card transition-all overflow-hidden",
      task.done ? "opacity-60" : "hover:border-primary/40",
      isExpanded ? "ring-2 ring-primary/20" : ""
    )}>
      <div className="p-4 flex items-center gap-4">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={cn(
            "h-6 w-6 rounded-lg border transition-all grid place-items-center flex-shrink-0",
            task.done ? "bg-success border-success" : "border-border bg-muted/50 hover:border-primary/50",
            !canComplete && !task.done && "cursor-not-allowed opacity-50"
          )}
          title={!canComplete ? "Conclua todas as subtarefas primeiro" : ""}
        >
          {task.done ? <CheckCircle2 className="h-4 w-4 text-success-foreground" /> : <Circle className="h-4 w-4 text-transparent" />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-2">
            <div className={cn("text-sm font-bold truncate", task.done && "line-through")}>{task.title}</div>
            <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", prioStyle[task.priority])}>{task.priority}</span>
            {isOverdue && <span className="text-[9px] font-black bg-destructive text-white px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle className="h-2.5 w-2.5" /> ATRASADA</span>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{task.lead}</div>
            <div className="h-1 w-1 rounded-full bg-border" />
            <div className="flex -space-x-1.5">
              {(task.owners || []).map((o, i) => (
                <div key={i} className="h-5 w-5 rounded-full bg-primary text-[8px] font-bold text-white border-2 border-background grid place-items-center" title={o}>
                  {o.split(" ").map(p => p[0]).slice(0, 2).join("")}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <div className={cn("text-[10px] font-black uppercase", isOverdue ? "text-destructive" : "text-muted-foreground")}>
            Prazo: {format(dueDate, "dd 'de' MMM", { locale: ptBR })}
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">Criada há {daysToComplete} dias</div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
          <button onClick={onDelete} className="p-2 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
          <button onClick={() => setIsExpanded(!isExpanded)} className={cn("p-2 text-muted-foreground transition-transform", isExpanded && "rotate-180")}>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-14 pb-5 pt-2 border-t border-border/50 bg-muted/10 animate-in slide-in-from-top-2 duration-200">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <ListTodo className="h-3.5 w-3.5" /> Checkpoint de Execução ({subtasksDone}/{totalSubtasks})
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    placeholder="Novo passo..." 
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter') handleAddSubtask(); }}
                    className="bg-background border border-border rounded-lg px-2 py-1 text-[10px] w-32 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button onClick={handleAddSubtask} className="p-1 bg-primary text-primary-foreground rounded-md hover:scale-110 transition-transform"><Plus className="h-3 w-3" /></button>
                </div>
              </div>
              
              <div className="space-y-2">
                {subtasks.map(st => (
                  <div key={st.id} className="flex items-center gap-3 group/st">
                    <button 
                      onClick={() => toggleSubtask(st.id)}
                      className="flex-1 flex items-center gap-3 p-2 rounded-lg hover:bg-background transition-all text-left"
                    >
                      <div className={cn("h-4 w-4 rounded border flex items-center justify-center transition-colors", st.done ? "bg-primary border-primary text-white" : "border-border bg-background")}>
                        {st.done && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <span className={cn("text-xs font-medium", st.done && "line-through text-muted-foreground")}>{st.title}</span>
                    </button>
                    <button onClick={() => removeSubtask(st.id)} className="opacity-0 group-hover/st:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Timer className="h-3.5 w-3.5" /> Métricas de Performance
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-background border border-border">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase">Lead Time</div>
                  <div className="text-sm font-bold">{daysToComplete} dias</div>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase">Status Prazo</div>
                  <div className={cn("text-sm font-bold", isOverdue ? "text-destructive" : "text-success")}>
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