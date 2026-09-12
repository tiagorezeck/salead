import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, MessageSquare, Lightbulb, Search, ChevronRight, Sparkles, Plus, Pencil, Trash2, X, ExternalLink, Target, UserCheck } from "lucide-react";
import { useState, useMemo } from "react";
import { useData } from "@/hooks/use-data";
import { PlaybookEditor } from "@/components/intelligence/playbook-editor";
import { type Playbook } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/playbooks")({ component: PlaybooksPage });

const ICON_MAP = {
  message: MessageSquare,
  lightbulb: Lightbulb,
  sparkles: Sparkles,
  chevron: ChevronRight,
  book: BookOpen,
};

function PlaybooksPage() {
  const { 
    playbooks, addPlaybook, updatePlaybook, deletePlaybook,
    initialized 
  } = useData();
  
  const [activeTab, setActiveTab] = useState<'playbooks' | 'scripts'>('playbooks');
  const [search, setSearch] = useState("");
  const [editingPB, setEditingPB] = useState<Partial<Playbook> | null>(null);
  const [selectedPBId, setSelectedPBId] = useState<string | null>(null);

  const filteredPlaybooks = useMemo(() => {
    return playbooks.filter((pb: Playbook) => {
      const matchesSearch = pb.title.toLowerCase().includes(search.toLowerCase()) || 
                           pb.category.toLowerCase().includes(search.toLowerCase());
      
      if (activeTab === 'scripts') {
        const cat = pb.category.toLowerCase();
        return matchesSearch && (
          cat.includes('sdr') || 
          cat.includes('closer') || 
          cat.includes('qualificação') || 
          cat.includes('prospecção') ||
          cat.includes('fechamento') ||
          cat.includes('ldr') ||
          cat.includes('bdr')
        );
      }
      return matchesSearch;
    });
  }, [playbooks, search, activeTab]);

  const selectedPB = useMemo(() => {
    return playbooks.find((pb: Playbook) => pb.id === selectedPBId) || filteredPlaybooks[0];
  }, [playbooks, selectedPBId, filteredPlaybooks]);

  if (!initialized) return <div className="p-8 text-center font-bold text-primary animate-pulse">Carregando inteligência...</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Inteligência</div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">Sales Playbooks</h1>
          <p className="text-sm text-muted-foreground mt-1">Scripts, roteiros e melhores práticas do seu time.</p>
        </div>
        <div className="flex gap-2">
          <Link 
            to="/playbook/view" 
            search={{ leadId: undefined }}
            target="_blank"
            className="text-sm px-3 py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 inline-flex items-center gap-1.5 font-bold"
          >
            <ExternalLink className="h-4 w-4" /> ABRIR COPILOTO
          </Link>
          <button 
            onClick={() => setEditingPB({})}
            className="text-sm px-3 py-2 rounded-lg bg-gradient-primary text-primary-foreground font-semibold shadow-elegant inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Novo Playbook
          </button>
        </div>
      </div>

      <div className="flex border-b border-border">
        <button 
          onClick={() => setActiveTab('playbooks')}
          className={cn("px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'playbooks' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Playbooks Gerais</div>
        </button>
        <button 
          onClick={() => setActiveTab('scripts')}
          className={cn("px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'scripts' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          <div className="flex items-center gap-2"><UserCheck className="h-4 w-4" /> Scripts de Qualificação</div>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'scripts' ? "Buscar perguntas de qualificação..." : "Buscar script ou técnica..."} 
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {filteredPlaybooks.map((p: Playbook) => {
              const Icon = ICON_MAP[p.iconType as keyof typeof ICON_MAP] || BookOpen;
              return (
                <div key={p.id} className="relative group">
                  <button 
                    onClick={() => setSelectedPBId(p.id)}
                    className={cn(
                      "w-full flex items-start gap-4 p-5 bg-gradient-surface border rounded-2xl transition-all text-left",
                      selectedPB?.id === p.id ? "border-primary shadow-elegant" : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-xl grid place-items-center transition-colors",
                      selectedPB?.id === p.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{p.category}</div>
                      <div className="font-display font-bold mt-1 truncate">{p.title}</div>
                    </div>
                  </button>
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setEditingPB(p); }} className="p-1.5 rounded-md bg-background border border-border hover:bg-muted text-muted-foreground"><Pencil className="h-3 w-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); if(confirm("Excluir?")) deletePlaybook(p.id); }} className="p-1.5 rounded-md bg-background border border-border hover:bg-destructive/10 hover:text-destructive text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              );
            })}
            {filteredPlaybooks.length === 0 && (
              <div className="col-span-2 py-12 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground text-sm">
                Nenhum roteiro encontrado.
              </div>
            )}
          </div>

          {selectedPB && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                  <BookOpen className="h-4 w-4" /> ROTEIRO: {selectedPB.title}
                </div>
                <span className="text-[10px] font-bold bg-muted px-2 py-1 rounded uppercase text-muted-foreground">{selectedPB.category}</span>
              </div>
              <div className="space-y-4 text-sm leading-relaxed">
                <div className="p-6 bg-muted/30 rounded-xl border-l-4 border-primary whitespace-pre-wrap font-medium text-base">
                  {selectedPB.content}
                </div>
                {selectedPB.objective && (
                  <p className="text-muted-foreground">
                    <span className="font-bold text-foreground">Objetivo:</span> {selectedPB.objective}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-primary p-8 rounded-[2.5rem] text-primary-foreground shadow-elegant relative overflow-hidden group">
            <Sparkles className="absolute -right-6 -bottom-6 h-32 w-32 opacity-20 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
            <div className="relative z-10">
              <h3 className="font-display font-bold text-xl flex items-center gap-2">
                <Lightbulb className="h-6 w-6" /> Hub de Inteligência
              </h3>
              <p className="text-sm opacity-90 mt-4 leading-relaxed">
                Utilize os roteiros acima para padronizar o atendimento e garantir que nenhum dado crítico seja esquecido durante a qualificação.
              </p>
              <div className="mt-8 pt-8 border-t border-white/20 grid grid-cols-2 gap-4">
                <div>
                   <div className="text-[8px] font-black uppercase tracking-widest opacity-60">Scripts Ativos</div>
                   <div className="text-xl font-black mt-0.5">{playbooks.length}</div>
                </div>
                <div>
                   <div className="text-[8px] font-black uppercase tracking-widest opacity-60">Eficiência Time</div>
                   <div className="text-xl font-black mt-0.5">84%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-6 text-center">
            <Lightbulb className="h-8 w-8 text-primary mx-auto mb-3 opacity-50" />
            <div className="text-sm font-bold">Dica de Performance</div>
            <p className="text-xs text-muted-foreground mt-1">"O sucesso da venda acontece na qualificação. Ouça 80% e fale 20% durante o discovery."</p>
          </div>
        </div>
      </div>

      {editingPB && (
        <PlaybookEditor 
          playbook={editingPB}
          onClose={() => setEditingPB(null)}
          onSave={(pb) => {
            if (pb.id) updatePlaybook(pb.id, pb);
            else addPlaybook(pb as any);
          }}
        />
      )}
    </div>
  );
}