"use client";

import React, { useState } from "react";
import { X, Save, Zap, Activity, ShieldCheck, Settings2, HelpCircle } from "lucide-react";
import { type Automation } from "@/hooks/use-data";
import { type AutomationEvent, type AutomationPriority } from "@/lib/automation-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AutomationModalProps {
  automation?: Partial<Automation>;
  onClose: () => void;
  onSave: (a: Partial<Automation>) => void;
}

const EVENTS: { value: AutomationEvent; label: string }[] = [
  { value: 'lead.created', label: 'Lead Criado (Inbound)' },
  { value: 'lead.stage_changed', label: 'Lead mudou de Etapa' },
  { value: 'lead.sla_breach', label: 'SLA atingiu Alerta/Crítico' },
  { value: 'task.completed', label: 'Tarefa Concluída' },
  { value: 'survey.responded', label: 'Pesquisa Respondida' },
];

const ACTIONS = [
  { value: 'create_task', label: 'Criar Tarefa' },
  { value: 'add_note', label: 'Adicionar Nota ao Histórico' },
  { value: 'notify', label: 'Notificar Gestor (Toast)' },
  { value: 'update_score', label: 'Atualizar Score (+/-)' },
];

const CATEGORIES = ['Vendas', 'Marketing', 'SLA', 'Operacional'];

export function AutomationModal({ automation, onClose, onSave }: AutomationModalProps) {
  const [form, setForm] = useState({
    name: automation?.name || "",
    category: automation?.category || "Vendas",
    triggerEvent: (automation?.triggerEvent as AutomationEvent) || "lead.created",
    priority: (automation?.priority as AutomationPriority) || "media",
    actionType: automation?.actionType || "create_task",
    actionConfig: automation?.actionConfig || { title: "", text: "", message: "", points: 10 }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Dê um nome para a automação.");
    
    // Mapeia os nomes amigáveis para a visualização na lista
    const triggerLabel = EVENTS.find(e => e.value === form.triggerEvent)?.label || "Evento customizado";
    const actionLabel = ACTIONS.find(a => a.value === form.actionType)?.label || "Ação customizada";

    onSave({
      ...automation,
      ...form,
      trigger: triggerLabel,
      action: actionLabel
    });
    
    toast.success(automation?.id ? "Automação atualizada!" : "Automação criada!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-surface">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">{automation?.id ? "Editar Automação" : "Nova Automação Comercial"}</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Workflow Inteligente</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-muted-foreground">Nome da Automação</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Ex: Tarefa de primeiro contato" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-muted-foreground">Categoria</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-primary flex items-center gap-2"><Activity className="h-3 w-3" /> Evento de Gatilho</label>
              <select value={form.triggerEvent} onChange={e => setForm({...form, triggerEvent: e.target.value as AutomationEvent})} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm">
                {EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-muted-foreground">Prioridade</label>
              <div className="flex gap-2">
                {(['baixa', 'media', 'alta', 'urgente'] as AutomationPriority[]).map(p => (
                  <button key={p} type="button" onClick={() => setForm({...form, priority: p})} className={cn("flex-1 py-2 text-[8px] font-black uppercase tracking-tighter rounded-lg border transition-all", form.priority === p ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 border-border text-muted-foreground")}>{p}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <label className="text-[10px] uppercase font-black text-primary flex items-center gap-2"><Settings2 className="h-3 w-3" /> Ação a Executar</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACTIONS.map(act => (
                <button key={act.value} type="button" onClick={() => setForm({...form, actionType: act.value})} className={cn("p-4 rounded-xl border transition-all text-center flex flex-col items-center gap-2 group", form.actionType === act.value ? "bg-primary/5 border-primary text-primary" : "bg-muted/30 border-border text-muted-foreground")}>
                  <div className="text-[8px] font-black uppercase leading-tight">{act.label}</div>
                </button>
              ))}
            </div>

            <div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-4">
               {form.actionType === 'create_task' && (
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black uppercase text-muted-foreground">Título da Tarefa</label>
                   <input required value={form.actionConfig.title} onChange={e => setForm({...form, actionConfig: {...form.actionConfig, title: e.target.value}})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="O que o robô deve agendar?" />
                 </div>
               )}
               {form.actionType === 'add_note' && (
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black uppercase text-muted-foreground">Texto da Anotação</label>
                   <textarea required value={form.actionConfig.text} onChange={e => setForm({...form, actionConfig: {...form.actionConfig, text: e.target.value}})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm min-h-[80px]" placeholder="Registro automático no histórico..." />
                 </div>
               )}
               {form.actionType === 'notify' && (
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black uppercase text-muted-foreground">Mensagem do Alerta</label>
                   <input required value={form.actionConfig.message} onChange={e => setForm({...form, actionConfig: {...form.actionConfig, message: e.target.value}})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="O que aparecerá no toast?" />
                 </div>
               )}
               {form.actionType === 'update_score' && (
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black uppercase text-muted-foreground">Pontos a Somar (Use negativo para subtrair)</label>
                   <input type="number" required value={form.actionConfig.points} onChange={e => setForm({...form, actionConfig: {...form.actionConfig, points: Number(e.target.value)}})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-mono" />
                 </div>
               )}
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted">CANCELAR</button>
          <button onClick={handleSubmit} className="px-8 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-elegant flex items-center justify-center gap-2 hover:scale-[1.02]">
            <Save className="h-4 w-4" /> SALVAR AUTOMAÇÃO
          </button>
        </div>
      </div>
    </div>
  );
}