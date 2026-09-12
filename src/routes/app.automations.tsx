import { createFileRoute } from "@tanstack/react-router";
import { useData } from "@/hooks/use-data";
import { 
  Zap, Plus, Play, Pause, Settings2, ShieldCheck, Clock, 
  AlertOctagon, CheckCircle2, History, ChevronRight, BarChart3,
  Flame, Timer, Activity, Target, Trash2, Pencil, Sparkles,
  AlertTriangle, Users, Star, ArrowRight, Check, HelpCircle
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AutomationLogger } from "@/lib/automation-logger";
import { type AutomationLog } from "@/lib/automation-types";
import { AUTOMATION_RECIPES, type AutomationRecipe } from "@/lib/automation-recipes";
import { AutomationModal } from "@/components/automation/automation-modal";
import { toast } from "sonner";

export const Route = createFileRoute("/app/automations")({
  component: AutomationsPage,
});

export function AutomationsPage() {
  const { automations, toggleAutomation, addAutomation, updateAutomation, deleteAutomation, initialized } = useData();
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [activeTab, setActiveTab] = useState<'ativos' | 'receitas' | 'logs'>('ativos');
  const [showModal, setShowModal] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<any>(null);

  useEffect(() => {
    setLogs(AutomationLogger.getLogs());
    const unsubscribe = AutomationLogger.subscribe(() => {
      setLogs(AutomationLogger.getLogs());
    });
    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const logsToday = logs.filter(l => l.timestamp.startsWith(today));
    const failures = logsToday.filter(l => l.result === 'falha').length;
    
    return {
      active: automations.filter(a => a.active).length,
      executedToday: logsToday.length,
      failures,
      avgTime: logsToday.length > 0 ? (logsToday.reduce((s, l) => s + l.durationMs, 0) / logsToday.length).toFixed(0) : 0
    };
  }, [automations, logs]);

  const handleEnableRecipe = (recipe: AutomationRecipe) => {
    // Verifica se já existe uma com o mesmo nome
    const alreadyExists = automations.some(a => a.name === recipe.name);
    if (alreadyExists) {
      toast.info(`A automação "${recipe.name}" já está adicionada.`);
      return;
    }

    addAutomation({
      name: recipe.name,
      category: recipe.category,
      triggerEvent: recipe.triggerEvent,
      priority: recipe.priority,
      actionType: recipe.actionType,
      actionConfig: recipe.actionConfig,
      trigger: recipe.triggerLabel,
      action: recipe.actionLabel,
      active: true,
      runs: 0
    });

    toast.success(`Automação "${recipe.name}" ativada com sucesso!`);
    setActiveTab('ativos');
  };

  if (!initialized) return <div className="p-8 text-center animate-pulse">Sincronizando motor...</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto pb-20">
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" /> Motor de Eficiência & Vendas
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">Automações Comerciais</h1>
          <p className="text-sm text-muted-foreground">Configure robôs inteligentes para qualificar leads, disparar alertas e mover oportunidades 24/7.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('receitas')}
            className="text-xs px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary font-bold inline-flex items-center gap-2 hover:bg-primary/20 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4" /> Modelos Prontos (1-Clique)
          </button>
          <button 
            onClick={() => { setEditingAutomation(null); setShowModal(true); }} 
            className="text-xs px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-black uppercase tracking-wider shadow-elegant inline-flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Criar Personalizada
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={ShieldCheck} label="Automações Ativas" value={stats.active} color="text-success" />
        <KPI icon={Zap} label="Executadas Hoje" value={stats.executedToday} color="text-primary" />
        <KPI icon={Clock} label="Tempo de Resposta Médio" value={`${stats.avgTime}ms`} color="text-info" />
        <KPI icon={AlertOctagon} label="Falhas Registradas" value={stats.failures} color="text-destructive" />
      </div>

      {/* Tabs */}
      <div className="flex bg-muted/50 p-1 rounded-xl border border-border w-fit">
        <button 
          onClick={() => setActiveTab('ativos')}
          className={cn(
            "px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer", 
            activeTab === 'ativos' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Zap className="h-3.5 w-3.5" /> Meus Workflows ({automations.length})
        </button>
        <button 
          onClick={() => setActiveTab('receitas')}
          className={cn(
            "px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer", 
            activeTab === 'receitas' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" /> Galeria de Receitas Prontas
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={cn(
            "px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer", 
            activeTab === 'logs' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <History className="h-3.5 w-3.5" /> Histórico de Execução ({logs.length})
        </button>
      </div>

      {/* TAB 1: WORKFLOWS ATIVOS */}
      {activeTab === 'ativos' && (
        <div className="space-y-4">
          <div className="grid gap-3">
            {automations.map((a: any) => (
              <div key={a.id} className="bg-gradient-surface border border-border rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/30 transition-all group">
                <div className={cn("h-11 w-11 rounded-xl grid place-items-center transition-all shrink-0", a.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  <Zap className={cn("h-5 w-5", a.active && "animate-pulse")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-display font-bold text-base md:text-lg">{a.name}</div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground uppercase">{a.category}</span>
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                      a.active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-500/10 text-zinc-500"
                    )}>
                      {a.active ? "Ativo" : "Pausado"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground">Quando:</span> {a.trigger || a.triggerEvent} 
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-bold text-foreground">Fazer:</span> {a.action || a.actionType}
                  </div>
                </div>
                <div className="hidden md:block text-right pr-6">
                  <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Execuções</div>
                  <div className="font-display font-black text-xl text-primary">{a.runs || 0}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleAutomation(a.id)} 
                    className={cn("h-10 px-3 rounded-xl border border-border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer", a.active ? "text-amber-600 bg-amber-500/10 border-amber-500/30" : "text-emerald-600 bg-emerald-500/10 border-emerald-500/30")}
                    title={a.active ? "Pausar Automação" : "Ativar Automação"}
                  >
                    {a.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    <span>{a.active ? "Pausar" : "Ativar"}</span>
                  </button>
                  <button onClick={() => { setEditingAutomation(a); setShowModal(true); }} className="h-10 w-10 grid place-items-center rounded-xl border border-border hover:bg-muted transition-all cursor-pointer" title="Editar">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => { if(confirm("Remover esta automação?")) deleteAutomation(a.id); }} className="h-10 w-10 grid place-items-center rounded-xl border border-border hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer" title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {automations.length === 0 && (
            <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl space-y-4 bg-muted/10">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">Nenhuma automação personalizada ativa</h3>
                <p className="text-xs text-muted-foreground mt-1">Escolha uma de nossas receitas prontas para começar a automatizar em 1 clique.</p>
              </div>
              <button 
                onClick={() => setActiveTab('receitas')}
                className="px-6 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
              >
                <Sparkles className="h-4 w-4" /> Ver Receitas Prontas
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GALERIA DE RECEITAS PRONTAS */}
      {activeTab === 'receitas' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-primary/10 via-amber-500/10 to-orange-500/10 border border-primary/20 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" /> 100% Automático & Sem Código
              </div>
              <h3 className="text-lg font-bold">Como funciona a automação intuitiva?</h3>
              <p className="text-xs text-muted-foreground max-w-2xl">
                Basta clicar em <strong>"Ativar com 1 Clique"</strong> para que o robô comece a vigiar seus leads, diagnósticos e etapas em tempo real, sem necessidade de configuração complexa.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AUTOMATION_RECIPES.map((recipe) => {
              const isAlreadyActive = automations.some(a => a.name === recipe.name && a.active);
              
              return (
                <div 
                  key={recipe.id}
                  className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-primary/40 hover:shadow-elegant transition-all relative overflow-hidden group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary grid place-items-center group-hover:scale-110 transition-transform">
                        {recipe.iconName === 'Flame' ? <Flame className="h-6 w-6 text-orange-500" /> : 
                         recipe.iconName === 'AlertTriangle' ? <AlertTriangle className="h-6 w-6 text-red-500" /> :
                         recipe.iconName === 'Clock' ? <Clock className="h-6 w-6 text-blue-500" /> :
                         recipe.iconName === 'Users' ? <Users className="h-6 w-6 text-purple-500" /> :
                         recipe.iconName === 'Star' ? <Star className="h-6 w-6 text-amber-500" /> :
                         <Zap className="h-6 w-6 text-primary" />}
                      </div>
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground uppercase">
                        {recipe.badge}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-display font-bold text-base text-foreground">{recipe.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{recipe.description}</p>
                    </div>

                    <div className="pt-3 border-t border-border space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <strong className="text-foreground">Gatilho:</strong> {recipe.triggerLabel}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <strong className="text-foreground">Ação:</strong> {recipe.actionLabel}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    {isAlreadyActive ? (
                      <div className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                        <Check className="h-4 w-4" /> Workflow Ativo
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEnableRecipe(recipe)}
                        className="w-full py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] shadow-elegant transition-all cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" /> Ativar com 1 Clique
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-6 py-4">Data/Hora</th>
                  <th className="text-left px-6 py-4">Lead / Alvo</th>
                  <th className="text-left px-6 py-4">Ação Executada</th>
                  <th className="text-center px-6 py-4">Status</th>
                  <th className="text-right px-6 py-4">Tempo de Resposta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-xs text-muted-foreground font-mono">
                      {new Date(l.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {l.targetName}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {l.action}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider inline-flex items-center gap-1",
                        l.result === 'sucesso' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                      )}>
                        {l.result === 'sucesso' ? <CheckCircle2 className="h-3 w-3" /> : <AlertOctagon className="h-3 w-3" />}
                        {l.result}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-muted-foreground">
                      {l.durationMs}ms
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground text-xs">
                      Nenhuma execução registrada no histórico até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição */}
      {showModal && (
        <AutomationModal 
          automation={editingAutomation} 
          onClose={() => setShowModal(false)} 
          onSave={(data) => {
            if (editingAutomation?.id) {
              updateAutomation(editingAutomation.id, data);
            } else {
              addAutomation(data);
            }
          }} 
        />
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex items-center gap-4">
      <div className={cn("h-11 w-11 rounded-xl bg-muted grid place-items-center", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">{label}</div>
        <div className="font-display font-black text-2xl mt-0.5">{value}</div>
      </div>
    </div>
  );
}