import { createFileRoute } from "@tanstack/react-router";
import { useData } from "@/hooks/use-data";
import { 
  Search, Plus, LayoutGrid, List, Users as UsersIcon, ChevronDown, Eye, Calendar, Lock, Ban, Layers
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { LeadDrawer } from "@/components/crm/lead-drawer";
import { NewLeadModal } from "@/components/crm/new-lead-modal";
import { KanbanCard } from "@/components/crm/kanban-card";
import { NewTaskModal } from "@/components/crm/new-task-modal";
import { ScheduleModal } from "@/components/crm/schedule-modal";
import { toast } from "sonner";
import { isWithinInterval } from "date-fns";
import { type PipelineStage, type Lead } from "@/data/mock";

export const Route = createFileRoute("/app/crm")({
  component: CRMPage,
});

function CRMPage() {
  const { leads, updateLead, deleteLead, addLead, addTask, pipelines, rolePermissions, users, currentUser, initialized, dateFilter } = useData();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [scheduleModalLead, setScheduleModalLead] = useState<Lead | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [taskModalLead, setTaskModalLead] = useState<string | null>(null);
  const [activePipelineId, setActivePipelineId] = useState<string>("");
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Garante que activePipelineId tenha um valor válido assim que pipelines carregar
  useEffect(() => {
    if (pipelines.length > 0 && !activePipelineId) {
      setActivePipelineId(pipelines[0].id);
    }
  }, [pipelines, activePipelineId]);

  const currentPipeline = useMemo(() => 
    pipelines.find(p => p.id === activePipelineId) || pipelines[0] || { id: '', name: 'Padrão', stages: [], color: 'primary' },
    [activePipelineId, pipelines]
  );

  // Lógica de Visibilidade: SDR vê X, Closer vê Y, Full Stack vê tudo
  const visibleStages = useMemo(() => {
    const allStages = currentPipeline.stages;
    if (!currentUser) return [];

    // Se for admin ou head, visualiza todas as abas do pipeline selecionado por padrão
    if (currentUser.role === "Admin Geral" || currentUser.role === "Head of Sales") {
      return allStages;
    }

    const allowedStageNames = rolePermissions[currentUser.role] || [];
    return allStages.filter((s: PipelineStage) => allowedStageNames.includes(s.name));
  }, [currentPipeline, currentUser, rolePermissions]);

  const filteredLeads = useMemo(() => {
    const fromDate = dateFilter.from;
    const toDate = dateFilter.to;

    return leads.filter(l => {
      // SÓ MOSTRA LEADS ATIVOS NO CRM
      if (l.status !== 'Ativo') return false;

      // Filtra por pipeline ativa
      if (l.pipelineId !== activePipelineId && l.pipelineId !== undefined && l.pipelineId !== "default") {
         if (activePipelineId !== "prospection") return false; 
      }

      // Validação de data segura com type narrowing explícito para a closure
      if (fromDate instanceof Date && toDate instanceof Date) {
        const inPeriod = isWithinInterval(new Date(l.createdAt), { 
          start: fromDate, 
          end: toDate 
        });
        if (!inPeriod) return false;
      }

      const matchesSearch = [l.name, l.company, l.source].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const matchesOwner = selectedOwner === "all" || l.owner === selectedOwner;
      
      return matchesSearch && matchesOwner;
    });
  }, [leads, search, selectedOwner, dateFilter, activePipelineId]);

  if (!initialized) return <div className="p-8 text-center font-black animate-pulse">Sincronizando Pipelines...</div>;

  const handleDragStart = (id: string, e?: React.DragEvent) => {
    setDraggedLeadId(id);
    if (e && e.dataTransfer) {
      try {
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
      } catch {}
    }
  };

  const handleDrop = (stageName: string, e?: React.DragEvent) => {
    const leadId = draggedLeadId || e?.dataTransfer?.getData("text/plain");
    if (!leadId) return;
    updateLead(leadId, { stage: stageName });
    toast.success(`Lead movido para "${stageName}"`);
    setDraggedLeadId(null);
    setDragOverStage(null);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-muted/10">
      <div className="p-4 md:p-6 border-b border-border bg-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* Seletor de Pipeline */}
          <div className="relative group">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
            <select 
              value={activePipelineId}
              onChange={(e) => setActivePipelineId(e.target.value)}
              className="pl-9 pr-10 py-2.5 bg-primary/5 border border-primary/20 rounded-xl text-xs font-black uppercase tracking-widest appearance-none focus:outline-none hover:bg-primary/10 transition-all cursor-pointer shadow-sm"
              disabled={pipelines.length === 0}
            >
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              {pipelines.length === 0 && <option value="" disabled>Nenhum pipeline cadastrado</option>}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-primary pointer-events-none" />
          </div>

          <div className="h-6 w-px bg-border hidden sm:block" />

          <div className="flex items-center bg-muted rounded-xl p-1 border border-border">
            <button onClick={() => setViewMode('kanban')} className={cn("p-2 rounded-lg transition-all", viewMode === 'kanban' ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}><List className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <div className="relative flex-1 sm:flex-none">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 sm:w-48 lg:w-64" />
          </div>
          <button onClick={() => setShowNewLeadModal(true)} className="bg-primary text-primary-foreground h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-elegant hover:scale-105 transition-transform shrink-0"><Plus className="h-4 w-4" /> NOVO REGISTRO</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 scrollbar-thin">
        {viewMode === 'kanban' ? (
          <div className="flex gap-6 h-full min-w-max pb-4">
            {visibleStages.map((stage: PipelineStage) => {
              const stageLeads = filteredLeads.filter(l => l.stage === stage.name);
              const isOver = dragOverStage === stage.name;

              return (
                <div 
                  key={stage.name} 
                  className="w-72 md:w-80 flex flex-col gap-4"
                  onDragOver={(e) => { 
                    e.preventDefault(); 
                    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                    setDragOverStage(stage.name); 
                  }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(stage.name, e);
                  }}
                >
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full", 
                        stage.color === 'primary' ? "bg-primary" : stage.color === 'info' ? "bg-blue-500" : stage.color === 'warning' ? "bg-amber-500" : stage.color === 'success' ? "bg-emerald-500" : stage.color === 'destructive' ? "bg-rose-500" : stage.color === 'purple' ? "bg-purple-500" : "bg-slate-400"
                      )} />
                      <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{stage.name}</h3>
                    </div>
                    <span className="bg-muted text-muted-foreground text-[10px] font-black px-2 py-0.5 rounded-full">{stageLeads.length}</span>
                  </div>
                  <div className={cn("flex-1 bg-muted/20 rounded-[2rem] p-3 space-y-3 overflow-y-auto border border-dashed transition-all scrollbar-none", isOver ? "border-primary bg-primary/5" : "border-border/50")}>
                    {stageLeads.map((lead) => (
                      <KanbanCard 
                        key={lead.id} 
                        lead={lead} 
                        color={currentPipeline.color}
                        stages={currentPipeline.stages.map(s => s.name)}
                        onClick={() => setSelectedLeadId(lead.id)} 
                        onDragStart={(e) => handleDragStart(lead.id, e)} 
                        onDragEnd={() => { setDraggedLeadId(null); setDragOverStage(null); }}
                        onSchedule={() => setScheduleModalLead(lead)}
                        onMoveStage={(newStage) => {
                          updateLead(lead.id, { stage: newStage });
                          toast.success(`Lead movido para "${newStage}"`);
                        }}
                      />
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 text-center py-12">
                        {isOver ? "SOLTE AQUI" : "Vazio"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl shadow-card overflow-hidden">
            {/* Tabela de Leads (simplificada para o exemplo) */}
            <div className="p-20 text-center text-muted-foreground italic">Visão de Lista em desenvolvimento...</div>
          </div>
        )}
      </div>

      {selectedLeadId && leads.find(l => l.id === selectedLeadId) && (
        <LeadDrawer 
          lead={leads.find(l => l.id === selectedLeadId)!} 
          stages={currentPipeline.stages.map((s: PipelineStage) => s.name)} 
          onClose={() => setSelectedLeadId(null)} 
          onUpdate={updateLead} 
          onDelete={deleteLead} 
        />
      )}

      {scheduleModalLead && (
        <ScheduleModal
          isOpen={!!scheduleModalLead}
          onClose={() => setScheduleModalLead(null)}
          lead={scheduleModalLead}
          existingEvent={scheduleModalLead.metadata?.calendarEvent}
        />
      )}

      {showNewLeadModal && <NewLeadModal onClose={() => setShowNewLeadModal(false)} onAdd={addLead} />}
    </div>
  );
}