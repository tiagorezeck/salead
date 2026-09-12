"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useData, type WorkflowRule, type HandoffRule } from "@/hooks/use-data";
import { 
  CheckCircle2, Lock, Unlock, Plus, GitBranch, Trash2, Zap, ArrowRight, Settings2, 
  Layers, ChevronRight, X, Save, AlertCircle 
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { type PipelineStage } from "@/data/mock";

export const Route = createFileRoute("/app/workflows")({ component: WorkflowsPage });

function WorkflowsPage() {
  const { stageWorkflows, updateWorkflow, handoffRules, addHandoffRule, updateHandoffRule, deleteHandoffRule, pipelines, initialized } = useData();
  
  const [activeTab, setActiveTab] = useState<'checkpoints' | 'handoff'>('checkpoints');
  // Inicialização segura: evita ler .id de undefined
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [editingHandoff, setEditingHandoff] = useState<Partial<HandoffRule> | null>(null);

  // Efeito para selecionar a primeira pipeline assim que carregar
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedPipelineId]);

  const currentPipeline = useMemo(() => 
    pipelines.find(p => p.id === selectedPipelineId) || pipelines[0], 
    [selectedPipelineId, pipelines]
  );

  if (!initialized) return <div className="p-8 text-center animate-pulse font-bold text-primary">Carregando motores...</div>;

  // Se não houver pipelines (pós-reset), mostra tela de estado vazio amigável
  if (pipelines.length === 0) {
    return (
      <div className="p-8 h-[calc(100vh-100px)] flex flex-col items-center justify-center text-center space-y-6">
        <div className="h-20 w-20 rounded-[2rem] bg-muted grid place-items-center"><GitBranch className="h-10 w-10 text-muted-foreground/30" /></div>
        <div className="max-w-md space-y-2">
          <h2 className="font-display text-2xl font-bold">Nenhum Pipeline Encontrado</h2>
          <p className="text-sm text-muted-foreground">Crie um novo pipeline nas configurações do sistema para configurar os workflows operacionais.</p>
        </div>
      </div>
    );
  }

  const handleAddCheckpoint = (stageName: string) => {
    if (!currentPipeline) return;
    const wf = stageWorkflows.find(w => w.pipelineId === currentPipeline.id && w.stageName === stageName) || { pipelineId: currentPipeline.id, stageName, rules: [] };
    const newRule: WorkflowRule = { id: `r-${Date.now()}`, text: "Nova tarefa...", mandatory: true };
    updateWorkflow(currentPipeline.id, stageName, { rules: [...wf.rules, newRule] });
    toast.success("Checkpoint adicionado!");
  };

  const handleUpdateHandoff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHandoff) return;
    if (editingHandoff.id) {
      updateHandoffRule(editingHandoff.id, editingHandoff);
    } else {
      addHandoffRule(editingHandoff as any);
    }
    setEditingHandoff(null);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-black">Motor de Eficiência</div>
          <h1 className="font-display text-3xl font-bold">Workflow Operacional</h1>
          <p className="text-sm text-muted-foreground">Padronize o processo comercial e automatize a passagem de bastão.</p>
        </div>
        
        <div className="flex bg-muted/50 p-1 rounded-2xl border border-border w-fit">
          <button 
            onClick={() => setActiveTab('checkpoints')}
            className={cn("px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2", activeTab === 'checkpoints' ? "bg-background shadow-elegant text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <CheckCircle2 className="h-4 w-4" /> Checkpoints
          </button>
          <button 
            onClick={() => setActiveTab('handoff')}
            className={cn("px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2", activeTab === 'handoff' ? "bg-background shadow-elegant text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Zap className="h-4 w-4" /> Handoff Automatizado
          </button>
        </div>
      </div>

      {activeTab === 'checkpoints' ? (
        <div className="space-y-8">
          <div className="flex flex-wrap gap-2">
            {pipelines.map(p => (
              <button 
                key={p.id} 
                onClick={() => setSelectedPipelineId(p.id)}
                className={cn(
                  "px-5 py-3 rounded-2xl border-2 transition-all flex items-center gap-3",
                  selectedPipelineId === p.id ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/30"
                )}
              >
                <Layers className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-widest">{p.name}</span>
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {currentPipeline?.stages.map((stage: PipelineStage) => {
              const wf = stageWorkflows.find(w => w.pipelineId === currentPipeline.id && w.stageName === stage.name) || { rules: [] };
              return (
                <div key={stage.name} className="bg-gradient-surface border border-border rounded-[2.5rem] p-6 shadow-card flex flex-col hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary grid place-items-center"><GitBranch className="h-5 w-5" /></div>
                      <div>
                        <h3 className="font-display font-bold text-lg leading-none">{stage.name}</h3>
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1 block">{wf.rules.length} regras ativas</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    {wf.rules.map((rule) => (
                      <div key={rule.id} className="group flex items-center gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border hover:bg-background transition-all">
                        <button 
                          onClick={() => {
                            const next = wf.rules.map(r => r.id === rule.id ? { ...r, mandatory: !r.mandatory } : r);
                            updateWorkflow(currentPipeline.id, stage.name, { rules: next });
                          }}
                          className={cn("h-8 w-8 rounded-xl grid place-items-center shrink-0", rule.mandatory ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}
                        >
                          {rule.mandatory ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </button>
                        <input 
                          value={rule.text} 
                          onChange={(e) => {
                            const next = wf.rules.map(r => r.id === rule.id ? { ...r, text: e.target.value } : r);
                            updateWorkflow(currentPipeline.id, stage.name, { rules: next });
                          }}
                          className="flex-1 bg-transparent border-none text-xs font-bold focus:ring-0 p-0" 
                        />
                        <button onClick={() => {
                          const next = wf.rules.filter(r => r.id !== rule.id);
                          updateWorkflow(currentPipeline.id, stage.name, { rules: next });
                        }} className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => handleAddCheckpoint(stage.name)} className="mt-6 w-full py-4 rounded-2xl border-2 border-dashed border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" /> ADICIONAR CHECKPOINT
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-primary" />
              <h2 className="font-display text-xl font-bold uppercase tracking-tight">Regras de Transição (Handoff)</h2>
            </div>
            <button 
              onClick={() => setEditingHandoff({ name: "Novo Handoff", active: true, actionType: 'move_only', sourcePipelineId: pipelines[0].id, targetPipelineId: pipelines[1]?.id || pipelines[0].id })}
              className="px-6 py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-elegant hover:scale-105 transition-all"
            >
              + CRIAR REGRA
            </button>
          </div>

          <div className="grid gap-4">
            {handoffRules.map((rule) => (
              <div key={rule.id} className="p-6 rounded-[2.5rem] bg-card border border-border shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                 <div className="flex items-center gap-8">
                    <div className="space-y-1">
                       <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Origem</div>
                       <div className="text-sm font-black">{pipelines.find(p => p.id === rule.sourcePipelineId)?.name}</div>
                       <div className="text-[10px] text-primary font-bold">{rule.sourceStage}</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <div className="space-y-1">
                       <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Destino</div>
                       <div className="text-sm font-black">{pipelines.find(p => p.id === rule.targetPipelineId)?.name}</div>
                       <div className="text-[10px] text-success font-bold">{rule.targetStage}</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => setEditingHandoff(rule)} className="p-3 bg-muted/50 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"><Settings2 className="h-4 w-4" /></button>
                    <button onClick={() => deleteHandoffRule(rule.id)} className="p-3 bg-muted/50 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"><Trash2 className="h-4 w-4" /></button>
                 </div>
              </div>
            ))}
            {handoffRules.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-border rounded-[3rem] text-muted-foreground italic">
                Nenhuma automação de transição configurada.
              </div>
            )}
          </div>
        </div>
      )}

      {editingHandoff && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-border bg-gradient-surface flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">Configurar Handoff Automático</h3>
              <button onClick={() => setEditingHandoff(null)} className="p-1.5 hover:bg-muted rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleUpdateHandoff} className="p-8 space-y-6">
               <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Fluxo de Origem</div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Pipeline</label>
                      <select value={editingHandoff.sourcePipelineId} onChange={e => setEditingHandoff({...editingHandoff, sourcePipelineId: e.target.value})} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm">
                        {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Gatilho (Etapa)</label>
                      <select value={editingHandoff.sourceStage} onChange={e => setEditingHandoff({...editingHandoff, sourceStage: e.target.value})} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm">
                        <option value="">Selecione...</option>
                        {pipelines.find(p => p.id === editingHandoff.sourcePipelineId)?.stages.map((s: PipelineStage) => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[10px] font-black text-success uppercase tracking-[0.2em]">Fluxo de Destino</div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Pipeline</label>
                      <select value={editingHandoff.targetPipelineId} onChange={e => setEditingHandoff({...editingHandoff, targetPipelineId: e.target.value})} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm">
                        {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Destino (Etapa)</label>
                      <select value={editingHandoff.targetStage} onChange={e => setEditingHandoff({...editingHandoff, targetStage: e.target.value})} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm">
                        <option value="">Selecione...</option>
                        {pipelines.find(p => p.id === editingHandoff.targetPipelineId)?.stages.map((s: PipelineStage) => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
               </div>

               <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => setEditingHandoff(null)} className="flex-1 py-4 rounded-2xl border border-border text-xs font-black uppercase tracking-widest hover:bg-muted">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-elegant flex items-center justify-center gap-2">
                    <Save className="h-4 w-4" /> SALVAR REGRA
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}