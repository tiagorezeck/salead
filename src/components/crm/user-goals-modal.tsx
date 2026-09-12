import { useState } from "react";
import { X, Target, CheckSquare, Plus, Trash2, Save, TrendingUp, DollarSign, Activity, Clock, Percent, Hash } from "lucide-react";
import { type User, type UserGoal, type GoalType, type OperationalGoal } from "@/hooks/use-data";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface UserGoalsModalProps {
  user: User;
  onClose: () => void;
  onSave: (userId: string, updates: Partial<User>) => void;
}

const GOAL_TYPES: { type: GoalType; label: string; icon: any; unit: any }[] = [
  { type: 'money', label: 'Dinheiro (R$)', icon: DollarSign, unit: 'currency' },
  { type: 'conversion', label: 'Conversão (%)', icon: Percent, unit: 'percent' },
  { type: 'loss', label: 'Perda (%)', icon: TrendingUp, unit: 'percent' },
  { type: 'ticket_count', label: 'Ticket (quant)', icon: Hash, unit: 'count' },
  { type: 'avg_ticket', label: 'Ticket Médio (R$)', icon: Target, unit: 'currency' },
  { type: 'sla_min', label: 'SLA (min)', icon: Clock, unit: 'minutes' },
];

export function UserGoalsModal({ user, onClose, onSave }: UserGoalsModalProps) {
  const [goals, setGoals] = useState<UserGoal[]>(user.goals || []);
  const [opGoals, setOpGoals] = useState<OperationalGoal[]>(user.operationalGoals || []);

  const addGoal = (type: GoalType) => {
    const config = GOAL_TYPES.find(g => g.type === type)!;
    const newGoal: UserGoal = {
      id: `g-${Date.now()}`,
      type,
      label: config.label,
      target: 0,
      unit: config.unit
    };
    setGoals([...goals, newGoal]);
  };

  const addOpGoal = () => {
    setOpGoals([...opGoals, { id: `og-${Date.now()}`, label: 'Nova tarefa...', completed: false }]);
  };

  const updateGoal = (id: string, target: number) => {
    setGoals(goals.map(g => g.id === id ? { ...g, target } : g));
  };

  const updateOpGoal = (id: string, updates: Partial<OperationalGoal>) => {
    setOpGoals(opGoals.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-[2.5rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-surface">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Configurar Metas: {user.name}</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Métricas de Performance & Operação</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Metas Numéricas */}
          <section className="space-y-6">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Métas de Valor (Automáticas)
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {GOAL_TYPES.map(gt => {
                const existing = goals.find(g => g.type === gt.type);
                const Icon = gt.icon;
                return (
                  <div key={gt.type} className={cn(
                    "p-5 rounded-3xl border transition-all flex flex-col gap-4",
                    existing ? "bg-primary/5 border-primary/30 shadow-sm" : "bg-muted/30 border-border opacity-60 hover:opacity-100"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-8 w-8 rounded-xl grid place-items-center", existing ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                           <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-tight">{gt.label}</span>
                      </div>
                      {!existing ? (
                        <button onClick={() => addGoal(gt.type)} className="text-[9px] font-black bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shadow-sm hover:scale-105 transition-all">ATIVAR</button>
                      ) : (
                        <button onClick={() => setGoals(goals.filter(g => g.type !== gt.type))} className="text-muted-foreground hover:text-destructive p-1.5"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                    {existing && (
                      <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-4 py-3">
                        <span className="text-[10px] font-black text-muted-foreground uppercase">Alvo:</span>
                        <input 
                          type="number" 
                          value={existing.target} 
                          onChange={e => updateGoal(existing.id, Number(e.target.value))}
                          className="flex-1 bg-transparent border-none text-sm font-mono font-bold focus:ring-0 p-0"
                        />
                        <span className="text-[10px] font-black text-primary">
                          {gt.unit === 'currency' ? 'R$' : gt.unit === 'percent' ? '%' : gt.unit === 'minutes' ? 'min' : 'un'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Metas Operacionais */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <CheckSquare className="h-4 w-4" /> Metas Operacionais (Avaliação Admin)
              </div>
              <button onClick={addOpGoal} className="text-[9px] font-black bg-muted text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted-foreground/10 uppercase tracking-widest">+ ADICIONAR</button>
            </div>

            <div className="grid gap-3">
              {opGoals.map(g => (
                <div key={g.id} className="flex items-center gap-3 p-4 bg-muted/20 border border-border rounded-2xl group transition-all hover:border-primary/20">
                  <button 
                    onClick={() => updateOpGoal(g.id, { completed: !g.completed })}
                    className={cn("h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all", g.completed ? "bg-success border-success text-white" : "border-border bg-background")}
                  >
                    {g.completed && <CheckSquare className="h-4 w-4" />}
                  </button>
                  <input 
                    value={g.label} 
                    onChange={e => updateOpGoal(g.id, { label: e.target.value })}
                    className={cn("flex-1 bg-transparent border-none text-sm font-bold focus:ring-0 p-0", g.completed && "line-through text-muted-foreground")}
                  />
                  <button onClick={() => setOpGoals(opGoals.filter(x => x.id !== g.id))} className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {opGoals.length === 0 && (
                <div className="py-10 text-center border-2 border-dashed border-border rounded-[2rem] text-[10px] font-black uppercase text-muted-foreground">Nenhuma meta operacional definida.</div>
              )}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-border bg-muted/10 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl border border-border text-xs font-black uppercase tracking-widest hover:bg-muted transition-all">Cancelar</button>
          <button 
            onClick={() => { onSave(user.id, { goals, operationalGoals: opGoals }); onClose(); }}
            className="flex-1 py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-elegant flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Save className="h-4 w-4" /> SALVAR CONFIGURAÇÕES
          </button>
        </div>
      </div>
    </div>
  );
}