"use client";

import React, { useState } from "react";
import { X, Share2, MonitorPlay, Check, Copy, LayoutDashboard, KanbanSquare, Gauge, Target, Users, CheckSquare, ClipboardList, Trophy, Medal, ClipboardCheck, Layout } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useData } from "@/hooks/use-data";

interface LiveTransmitModalProps {
  onClose: () => void;
}

const AVAILABLE_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'crm', label: 'CRM Kanban', icon: KanbanSquare },
  { id: 'perf-ranking', label: 'Perf: Ranking', icon: Trophy, group: 'performance' },
  { id: 'perf-goals', label: 'Perf: Metas', icon: ClipboardCheck, group: 'performance' },
  { id: 'perf-podium', label: 'Perf: Pódio', icon: Medal, group: 'performance' },
  { id: 'perf-matrix', label: 'Perf: Matriz', icon: Layout, group: 'performance' },
  { id: 'daily-sales', label: 'Meta Diária', icon: Target },
  { id: 'leads', label: 'Base de Leads', icon: Users },
  { id: 'tasks', label: 'Agenda de Tarefas', icon: CheckSquare },
];

export function LiveTransmitModal({ onClose }: LiveTransmitModalProps) {
  const { visibility } = useData();
  const [selectedTabs, setSelectedTabs] = useState<string[]>(['dashboard', 'crm']);
  const [generatedLink, setGeneratedLink] = useState("");

  const toggleTab = (id: string) => {
    setSelectedTabs(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    if (selectedTabs.length === 0) {
      toast.error("Selecione pelo menos uma aba para transmitir.");
      return;
    }
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/live?tabs=${selectedTabs.join(',')}`;
    setGeneratedLink(link);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success("Link de Gestão à Vista copiado!");
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-surface">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <MonitorPlay className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Transmitir SALEAD LIVE</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Configuração de Gestão à Vista</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-8 space-y-6">
          {!generatedLink ? (
            <>
              <div className="space-y-4">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest block">Escolha as abas para este link:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_TABS.map(tab => {
                    const active = selectedTabs.includes(tab.id);
                    // Oculta se o módulo estiver desativado nas configurações globais
                    if (tab.group === 'performance') {
                       const key = tab.id.replace('perf-', '') as keyof typeof visibility.performance;
                       if (!visibility.performance[key]) return null;
                    }

                    return (
                      <button
                        key={tab.id}
                        onClick={() => toggleTab(tab.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all text-center group",
                          active ? "bg-primary border-primary text-primary-foreground shadow-elegant scale-105" : "bg-muted/30 border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <tab.icon className={cn("h-5 w-5 transition-transform", active ? "scale-110" : "group-hover:scale-110")} />
                        <span className="text-[10px] font-black uppercase tracking-wider leading-tight">{tab.label}</span>
                        {active && <div className="absolute top-2 right-2"><Check className="h-3 w-3" /></div>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button 
                onClick={handleGenerate}
                className="w-full py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-black text-sm uppercase tracking-widest shadow-elegant hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="h-4 w-4" /> GERAR LINK DE TRANSMISSÃO
              </button>
            </>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-6 rounded-[2rem] bg-success/5 border border-success/20 text-center">
                <div className="h-16 w-16 rounded-full bg-success/10 text-success grid place-items-center mx-auto mb-4">
                   <Check className="h-8 w-8" />
                </div>
                <h3 className="font-display text-xl font-bold">Link Pronto!</h3>
                <p className="text-xs text-muted-foreground mt-2">Envie para o dispositivo de exibição ou abra em uma nova aba.</p>
              </div>

              <div className="flex items-center gap-2 p-2 bg-muted/50 border border-border rounded-xl">
                <input readOnly value={generatedLink} className="flex-1 bg-transparent border-none text-[10px] font-mono p-2 focus:ring-0" />
                <button onClick={copyToClipboard} className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"><Copy className="h-4 w-4" /></button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setGeneratedLink("")} className="flex-1 py-3 rounded-xl border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted">VOLTAR</button>
                <a href={generatedLink} target="_blank" className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest shadow-elegant text-center flex items-center justify-center gap-2">ABRIR AGORA <MonitorPlay className="h-4 w-4" /></a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}