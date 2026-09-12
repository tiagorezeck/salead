import { X as XIcon, Calendar as CalendarIcon, Target as TargetIcon, Search as SearchIcon, Plus as PlusIcon, Trash2 as TrashIcon, ListTodo as ListIcon } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useData, type Task, type Subtask } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface NewTaskModalProps {
  onClose: () => void;
  onAdd: (t: any) => void;
  initialLead?: string;
  taskToEdit?: Task;
}

export function NewTaskModal({ onClose, onAdd, initialLead = "", taskToEdit }: NewTaskModalProps) {
  const { users, currentUser, leads, updateTask } = useData();
  
  const [form, setForm] = useState({
    title: taskToEdit?.title || "",
    lead: taskToEdit?.lead || initialLead,
    owners: taskToEdit?.owners || [currentUser?.name || (users[0]?.name || "")],
    due: taskToEdit?.due || format(new Date(), 'yyyy-MM-dd'),
    priority: taskToEdit?.priority || "media" as const,
    done: taskToEdit?.done || false,
    subtasks: taskToEdit?.subtasks || [] as Subtask[]
  });

  const [newSubtask, setNewSubtask] = useState("");
  const [leadSearch, setLeadSearch] = useState(taskToEdit?.lead || initialLead);
  const [showLeadResults, setShowLeadResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLeadResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLeads = useMemo(() => {
    const sorted = [...leads].sort((a, b) => a.company.localeCompare(b.company));
    if (!leadSearch) return sorted.slice(0, 10);
    return sorted.filter(l => 
      l.company.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.name.toLowerCase().includes(leadSearch.toLowerCase())
    ).slice(0, 10);
  }, [leads, leadSearch]);

  const addSubtask = (text: string) => {
    if (!text.trim()) return form.subtasks;
    const updated = [...form.subtasks, { id: `st-${Date.now()}-${Math.random()}`, title: text, done: false }];
    setForm(prev => ({ ...prev, subtasks: updated }));
    setNewSubtask("");
    return updated;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lead) {
      toast.error("Selecione um lead ou empresa.");
      return;
    }

    let finalSubtasks = form.subtasks;
    if (newSubtask.trim()) {
      finalSubtasks = [...form.subtasks, { id: `st-${Date.now()}`, title: newSubtask, done: false }];
    }

    const finalData = { ...form, subtasks: finalSubtasks };

    if (taskToEdit) {
      updateTask(taskToEdit.id, finalData);
      toast.success("Tarefa atualizada!");
    } else {
      onAdd(finalData);
      toast.success("Tarefa agendada!");
    }
    onClose();
  };

  const updateSubtaskTitle = (id: string, newTitle: string) => {
    setForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(st => st.id === id ? { ...st, title: newTitle } : st)
    }));
  };

  const toggleOwner = (name: string) => {
    const next = form.owners.includes(name)
      ? form.owners.filter(o => o !== name)
      : [...form.owners, name];
    if (next.length === 0) return;
    setForm({ ...form, owners: next });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-border flex items-center justify-between bg-gradient-surface">
          <h2 className="font-display text-lg font-bold">{taskToEdit ? "Editar Tarefa" : "Agendar Tarefa"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon className="h-5 w-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">O que precisa ser feito?</label>
            <input 
              required 
              autoFocus
              placeholder="Ex: Ligar para confirmar reunião..."
              value={form.title} 
              onChange={e => setForm({...form, title: e.target.value})} 
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Lead / Empresa</label>
              <div className="relative">
                <TargetIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input 
                  required 
                  placeholder="Pesquisar..."
                  value={leadSearch} 
                  onFocus={() => setShowLeadResults(true)}
                  onChange={e => {
                    setLeadSearch(e.target.value);
                    setShowLeadResults(true);
                    if (form.lead) setForm({ ...form, lead: "" });
                  }} 
                  className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
                />
              </div>
              {showLeadResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                  {filteredLeads.map(l => (
                    <button key={l.id} type="button" onClick={() => { setForm({...form, lead: l.company}); setLeadSearch(l.company); setShowLeadResults(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-muted border-b border-border/50 last:border-none">
                      <div className="font-bold">{l.company}</div>
                      <div className="text-[10px] text-muted-foreground">{l.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Prazo (Calendário)</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input 
                  type="date"
                  required
                  value={form.due}
                  onChange={e => setForm({...form, due: e.target.value})}
                  className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Responsáveis (Trabalho em Time)</label>
            <div className="flex flex-wrap gap-2 p-3 bg-muted/30 border border-border rounded-xl">
              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleOwner(u.name)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                    form.owners.includes(u.name) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Prioridade</label>
            <div className="grid grid-cols-4 gap-2">
              {(["baixa", "media", "alta", "urgente"] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({...form, priority: p})}
                  className={cn(
                    "py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                    form.priority === p 
                      ? p === 'urgente' ? "bg-destructive text-white border-destructive shadow-lg scale-105" : "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                <ListIcon className="h-3.5 w-3.5" /> Subtarefas Obrigatórias
              </label>
              <span className="text-[10px] font-bold text-muted-foreground">{form.subtasks.length} itens</span>
            </div>
            
            <div className="flex gap-2">
              <input 
                placeholder="Adicionar passo..." 
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addSubtask(newSubtask); } }}
                className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => addSubtask(newSubtask)} className="p-2 bg-primary text-primary-foreground rounded-lg"><PlusIcon className="h-4 w-4" /></button>
            </div>

            <div className="space-y-2">
              {form.subtasks.map((st, i) => (
                <div key={st.id} className="flex items-center gap-3 p-2 bg-muted/20 border border-border rounded-lg group">
                  <div className="h-5 w-5 rounded border border-border bg-background flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">{i + 1}</div>
                  <input 
                    value={st.title}
                    onChange={e => updateSubtaskTitle(st.id, e.target.value)}
                    className="flex-1 bg-transparent border-none text-xs font-medium focus:ring-0 p-0"
                    placeholder="Título da subtarefa..."
                  />
                  <button type="button" onClick={() => setForm({...form, subtasks: form.subtasks.filter(x => x.id !== st.id)})} className="opacity-0 group-hover:opacity-100 text-destructive p-1 transition-opacity"><TrashIcon className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm shadow-elegant hover:scale-[1.02] transition-transform">
              {taskToEdit ? "SALVAR ALTERAÇÕES" : "AGENDAR AGORA"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}