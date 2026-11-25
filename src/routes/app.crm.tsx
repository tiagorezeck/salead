import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useData } from "@/hooks/use-data";
import { 
  Search, Plus, LayoutGrid, List, Users as UsersIcon, ChevronDown, Eye, Calendar, Lock, Ban, Layers,
  Phone, Mail, MessageCircle, ArrowRight, CheckCircle2, Clock, Sparkles, Settings2, ArrowRightLeft,
  ArrowDownToLine, GitFork, Globe
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { LeadDrawer } from "@/components/crm/lead-drawer";
import { NewLeadModal } from "@/components/crm/new-lead-modal";
import { KanbanCard } from "@/components/crm/kanban-card";
import { NewTaskModal } from "@/components/crm/new-task-modal";
import { ScheduleModal } from "@/components/crm/schedule-modal";
import { PipelineManagerModal } from "@/components/crm/pipeline-manager-modal";
import { TransferLeadModal } from "@/components/crm/transfer-lead-modal";
import { PullLeadModal } from "@/components/crm/pull-lead-modal";
import { LeadRoutingModal } from "@/components/crm/lead-routing-modal";
import { toast } from "sonner";
import { isWithinInterval, format } from "date-fns";
import { isRoleEnabledOnPipeline } from "@/lib/lead-rules";
import { ptBR } from "date-fns/locale";
import { type PipelineStage, type Lead, CLASSIFICATION_CONFIG, SLA_CONFIG } from "@/data/mock";
import { calculateLeadScore, getScoreColor } from "@/lib/scoring";

export const Route = createFileRoute("/app/crm")({
  component: CRMPage,
  validateSearch: (search: Record<string, unknown>) => ({
    leadId: (search.leadId as string) || undefined,
  }),
});

function CRMPage() {
  const { leads, updateLead, deleteLead, addLead, addTask, pipelines, rolePermissions, users, currentUser, initialized, dateFilter, leadRoutingConfig, agendaEvents, agendaBookings, distributeLeadsByRoutingConfig } = useData();
  const { leadId: paramLeadId } = useSearch({ from: "/app/crm" });
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(paramLeadId || null);
  const [scheduleModalLead, setScheduleModalLead] = useState<Lead | null>(null);
  const [transferModalLead, setTransferModalLead] = useState<Lead | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showPullLeadModal, setShowPullLeadModal] = useState(false);
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [taskModalLead, setTaskModalLead] = useState<string | null>(null);
  const [activePipelineId, setActivePipelineId] = useState<string>("");
  const [activeEventFilter, setActiveEventFilter] = useState<string>("all");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isSendingToSdr, setIsSendingToSdr] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const doesLeadMatchAgendaEvent = (l: any, evId: string, evNome: string, evSlug?: string) => {
    if (!l) return false;
    const normNome = (evNome || "").trim().toLowerCase();
    const normSlug = (evSlug || "").trim().toLowerCase();
    const normEmail = (l.email || "").trim().toLowerCase();

    if (l.metadata?.eventId && l.metadata.eventId === evId) return true;
    if (l.metadata?.calendarEvent?.eventId && l.metadata.calendarEvent.eventId === evId) return true;
    if (normNome && String(l.metadata?.eventName || "").trim().toLowerCase() === normNome) return true;
    if (normSlug && String(l.metadata?.eventSlug || "").trim().toLowerCase() === normSlug) return true;
    if (normNome && String(l.metadata?.calendarEvent?.title || "").toLowerCase().includes(normNome)) return true;
    if (normSlug && Array.isArray(l.tags) && l.tags.some((t: any) => String(t).toLowerCase() === normSlug)) return true;
    if (normNome && (
      String(l.landingPage || "").toLowerCase().includes(normNome) ||
      String(l.source || "").toLowerCase().includes(normNome)
    )) return true;

    return (agendaBookings || []).some((b) =>
      b.id_evento === evId &&
      (b.id_lead === l.id || (b.lead_email && normEmail && b.lead_email.toLowerCase() === normEmail))
    );
  };

  const getLeadEventLabel = (l: any): string => {
    if (!l) return "";
    if (l.metadata?.eventName) return String(l.metadata.eventName);
    const matchedBooking = (agendaBookings || []).find(
      (b) =>
        b.id_lead === l.id ||
        (b.lead_email && l.email && b.lead_email.toLowerCase() === l.email.toLowerCase())
    );
    if (matchedBooking?.evento_nome) return matchedBooking.evento_nome;
    const matchedEv = (agendaEvents || []).find(
      (ev) =>
        (l.metadata?.eventId && ev.id_evento === l.metadata.eventId) ||
        (l.metadata?.eventSlug && ev.slug === l.metadata.eventSlug) ||
        (Array.isArray(l.tags) && l.tags.some((t: any) => String(t).toLowerCase() === ev.slug.toLowerCase()))
    );
    if (matchedEv?.nome) return matchedEv.nome;
    if (l.metadata?.calendarEvent?.eventName) return String(l.metadata.calendarEvent.eventName);
    if (typeof l.source === "string" && l.source.startsWith("Agenda Pública:")) {
      return l.source.replace("Agenda Pública:", "").split("(")[0].trim();
    }
    if (typeof l.source === "string" && l.source.startsWith("Lista de Espera:")) {
      return l.source.replace("Lista de Espera:", "").trim();
    }
    return "";
  };

  const agendaEventOptions = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; slug: string; count: number }>();
    (agendaEvents || []).forEach((ev) => {
      if (!ev?.id_evento) return;
      map.set(ev.id_evento, { id: ev.id_evento, nome: ev.nome, slug: ev.slug, count: 0 });
    });
    (agendaBookings || []).forEach((b) => {
      if (b?.id_evento && !map.has(b.id_evento)) {
        map.set(b.id_evento, { id: b.id_evento, nome: b.evento_nome || b.id_evento, slug: "", count: 0 });
      }
    });
    const list = Array.from(map.values()).map((item) => ({
      ...item,
      count: leads.filter((l) => {
        const st = String(l.status || "Ativo").trim().toLowerCase();
        if (st === "inativo" || st === "desativado" || st === "bloqueado") return false;
        return doesLeadMatchAgendaEvent(l, item.id, item.nome, item.slug);
      }).length,
    }));
    return list;
  }, [agendaEvents, agendaBookings, leads]);

  const availableOrigins = useMemo(() => {
    const agendaNames = new Set(agendaEventOptions.map((e) => e.nome.trim().toLowerCase()));
    const set = new Set<string>();
    leads.forEach((l: any) => {
      const ev = l.landingPage || l.landing_page || l.metadata?.pageTitle || l.source;
      if (ev && typeof ev === "string" && ev.trim()) {
        if (!agendaNames.has(ev.trim().toLowerCase())) {
          set.add(ev.trim());
        }
      }
    });
    return Array.from(set);
  }, [leads, agendaEventOptions]);

  useEffect(() => {
    if (paramLeadId) {
      setSelectedLeadId(paramLeadId);
    }
  }, [paramLeadId]);

  useEffect(() => {
    setSelectedLeadIds([]);
  }, [activeEventFilter, activePipelineId]);

  const visiblePipelines = useMemo(() => {
    const activeOnly = pipelines.filter((p) => p.active !== false);
    if (!currentUser) return activeOnly;
    const filtered = activeOnly.filter((p) => isRoleEnabledOnPipeline(p, currentUser.role));
    return filtered.length > 0 ? filtered : activeOnly;
  }, [pipelines, currentUser]);

  // Garante que activePipelineId tenha um valor válido assim que pipelines carregar
  useEffect(() => {
    if (
      visiblePipelines.length > 0 &&
      activePipelineId !== "all" &&
      (!activePipelineId || !visiblePipelines.some(p => p.id === activePipelineId))
    ) {
      setActivePipelineId(visiblePipelines[0].id);
    }
  }, [visiblePipelines, activePipelineId]);

  const currentPipeline = useMemo(() => {
    if (activePipelineId === "all") {
      const stageMap = new Map<string, PipelineStage>();
      visiblePipelines.forEach((pipe) => {
        (pipe.stages || []).forEach((stg) => {
          if (!stageMap.has(stg.name)) {
            stageMap.set(stg.name, stg);
          }
        });
      });
      return { id: "all", name: "Todos os Funis", stages: Array.from(stageMap.values()), color: "primary" };
    }
    return visiblePipelines.find(p => p.id === activePipelineId) || visiblePipelines[0] || pipelines[0] || { id: '', name: 'Padrão', stages: [], color: 'primary' };
  }, [activePipelineId, visiblePipelines, pipelines]);

  // Lógica de Visibilidade: SDR vê X, Closer vê Y, Full Stack vê tudo
  const visibleStages = useMemo(() => {
    const allStages = currentPipeline.stages || [];
    if (!currentUser) return [];

    // Se for admin, head ou visão consolidada, visualiza todas as etapas
    if (activePipelineId === "all" || currentUser.role === "Admin Geral" || currentUser.role === "Head of Sales") {
      return allStages;
    }

    const allowedStageNames = rolePermissions[currentUser.role] || [];
    if (allowedStageNames.length === 0) return allStages;
    return allStages.filter((s: PipelineStage) => allowedStageNames.includes(s.name));
  }, [currentPipeline, currentUser, rolePermissions, activePipelineId]);

  const matchesActiveEvent = (l: any) => {
    if (activeEventFilter === "all") return true;
    if (activeEventFilter.startsWith("agenda:")) {
      const evId = activeEventFilter.slice("agenda:".length);
      const ev = agendaEventOptions.find((e) => e.id === evId);
      return doesLeadMatchAgendaEvent(l, evId, ev?.nome || evId, ev?.slug);
    }
    const rawOrigin = activeEventFilter.startsWith("origin:")
      ? activeEventFilter.slice("origin:".length)
      : activeEventFilter;
    return [l.landingPage, l.landing_page, l.metadata?.pageTitle, l.metadata?.eventName, l.source].some(
      (v) => v && String(v).toLowerCase().includes(rawOrigin.toLowerCase())
    );
  };

  const eventLeadsAcrossAllPipelines = useMemo(() => {
    if (activeEventFilter === "all") return [];
    return leads.filter((l) => {
      const st = String(l.status || "Ativo").trim().toLowerCase();
      if (st === "inativo" || st === "desativado" || st === "bloqueado") return false;
      return matchesActiveEvent(l);
    });
  }, [leads, activeEventFilter, agendaEventOptions, agendaBookings]);

  const filteredLeads = useMemo(() => {
    const fromDate = dateFilter.from;
    const toDate = dateFilter.to;

    return leads.filter(l => {
      // SÓ MOSTRA LEADS ATIVOS NO CRM (robusto para aceitar ativo, Ativo, Ativa ou indefinido)
      const st = String(l.status || "Ativo").trim().toLowerCase();
      if (st === "inativo" || st === "desativado" || st === "bloqueado") return false;

      // Filtra por pipeline ativa (fallback para prospection se não definido)
      const leadPipe = l.pipelineId || "prospection";
      if (activePipelineId && leadPipe !== activePipelineId && activePipelineId !== "all") {
        return false;
      }

      // Validação de data segura com type narrowing explícito para a closure
      if (fromDate instanceof Date && toDate instanceof Date) {
        const inPeriod = isWithinInterval(new Date(l.createdAt), { 
          start: fromDate, 
          end: toDate 
        });
        if (!inPeriod) return false;
      }

      const matchesSearch = [l.name, l.company, l.source, l.email, l.whatsapp, l.metadata?.eventName].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const matchesOwner = selectedOwner === "all" || l.owner === selectedOwner;
      const matchesEvent = matchesActiveEvent(l);
      
      return matchesSearch && matchesOwner && matchesEvent;
    });
  }, [leads, search, selectedOwner, dateFilter, activePipelineId, activeEventFilter, agendaEventOptions, agendaBookings]);

  if (!initialized) return <div className="p-8 text-center font-black animate-pulse">Sincronizando Pipelines...</div>;

  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendEventLeadsToSdr = async () => {
    const targetIds =
      selectedLeadIds.length > 0
        ? selectedLeadIds
        : (activeEventFilter !== "all" ? eventLeadsAcrossAllPipelines : filteredLeads).map((l) => l.id);

    if (targetIds.length === 0) {
      toast.info("Selecione ao menos um lead ou filtre um evento com leads.");
      return;
    }

    const sdrPipe =
      pipelines.find((p) => p.id === "sdr") ||
      pipelines.find((p) => String(p.functionRole || "").toUpperCase() === "SDR");
    const targetStage =
      sdrPipe?.stages?.find((s) => {
        const nm = String(s.name || "").toLowerCase();
        return nm.includes("reuni") || nm.includes("agend") || nm.includes("recebid");
      })?.name ||
      sdrPipe?.stages?.[0]?.name ||
      "Lead/Oportunidade Recebida";

    setIsSendingToSdr(true);
    try {
      await distributeLeadsByRoutingConfig(targetIds, {
        ...leadRoutingConfig,
        enabled: true,
        routingMode: "single_role",
        targetRole: "SDR",
        targetPipelineId: sdrPipe?.id || "sdr",
        targetStage,
      });
      setSelectedLeadIds([]);
      if (sdrPipe?.id) {
        setActivePipelineId(sdrPipe.id);
      }
    } finally {
      setIsSendingToSdr(false);
    }
  };

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
          <div className="flex items-center gap-2">
            <div className="relative group">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
              <select 
                value={activePipelineId}
                onChange={(e) => setActivePipelineId(e.target.value)}
                className="pl-9 pr-10 py-2.5 bg-primary/5 border border-primary/20 rounded-xl text-xs font-black uppercase tracking-widest appearance-none focus:outline-none hover:bg-primary/10 transition-all cursor-pointer shadow-sm"
                disabled={visiblePipelines.length === 0}
              >
                <option value="all">Todos os Funis</option>
                {visiblePipelines.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.functionRole ? `(${p.functionRole})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-primary pointer-events-none" />
            </div>

            {/* Seletor de Evento da Agenda / LP / Origem para filtrar o Kanban */}
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
              <select 
                value={activeEventFilter}
                onChange={(e) => setActiveEventFilter(e.target.value)}
                className="pl-9 pr-10 py-2.5 bg-card border border-border rounded-xl text-xs font-bold uppercase tracking-wider appearance-none focus:outline-none hover:bg-muted/80 transition-all cursor-pointer shadow-sm max-w-[260px]"
              >
                <option value="all">Evento / LP (Todos)</option>
                {agendaEventOptions.length > 0 && (
                  <optgroup label="Eventos da Agenda">
                    {agendaEventOptions.map((ev) => (
                      <option key={ev.id} value={`agenda:${ev.id}`}>
                        {ev.nome} ({ev.count})
                      </option>
                    ))}
                  </optgroup>
                )}
                {availableOrigins.length > 0 && (
                  <optgroup label="Landing Pages e Origens">
                    {availableOrigins.map((ev) => (
                      <option key={ev} value={`origin:${ev}`}>{ev}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            <button
              onClick={() => setShowPipelineModal(true)}
              className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm flex items-center gap-1.5 text-xs font-bold"
              title="Gerenciar Pipelines, Etapas e SLAs"
            >
              <Settings2 className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Configurar Funis</span>
            </button>
          </div>

          <div className="h-6 w-px bg-border hidden sm:block" />

          <div className="flex items-center bg-muted rounded-xl p-1 border border-border">
            <button onClick={() => setViewMode('kanban')} className={cn("p-2 rounded-lg transition-all", viewMode === 'kanban' ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}><List className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <div className="relative flex-1 sm:flex-none">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 sm:w-48 lg:w-64" />
          </div>

          {/* Botão de puxar lead da base direto para o funil selecionado */}
          <button 
            onClick={() => setShowPullLeadModal(true)}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm hover:scale-102 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Buscar e puxar leads liberados da base para este pipeline"
          >
            <ArrowDownToLine className="h-4 w-4" />
            <span className="hidden sm:inline">Puxar da Base</span>
          </button>

          {/* Botão para regras de distribuição e entrada */}
          <button 
            onClick={() => setShowRoutingModal(true)}
            className="h-10 px-3.5 rounded-xl border border-border bg-card hover:bg-muted/80 text-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
            title="Configurar quem recebe os novos leads da base (LDR, SDR, Seller)"
          >
            <GitFork className="h-4 w-4 text-primary" />
            <span className="hidden md:inline">Distribuição</span>
            {leadRoutingConfig?.enabled && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button onClick={() => setShowNewLeadModal(true)} className="bg-primary text-primary-foreground h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-elegant hover:scale-105 transition-transform shrink-0 cursor-pointer">
            <Plus className="h-4 w-4" /> NOVO REGISTRO
          </button>
        </div>
      </div>

      {/* Barra de seleção e ação rápida para Evento selecionado / leads selecionados */}
      {(activeEventFilter !== "all" || selectedLeadIds.length > 0) && (
        <div className="px-4 md:px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            {activeEventFilter !== "all" ? (
              <span className="font-bold text-foreground">
                Filtro ativo:{" "}
                <strong className="text-amber-700 dark:text-amber-300">
                  {activeEventFilter.startsWith("agenda:")
                    ? agendaEventOptions.find((e) => e.id === activeEventFilter.slice(7))?.nome || "Evento"
                    : activeEventFilter.replace("origin:", "")}
                </strong>{" "}
                · {filteredLeads.length} neste funil ({eventLeadsAcrossAllPipelines.length} no total)
              </span>
            ) : (
              <span className="font-bold text-foreground">
                {selectedLeadIds.length} lead(s) selecionado(s)
              </span>
            )}
            {activeEventFilter !== "all" &&
              activePipelineId !== "all" &&
              eventLeadsAcrossAllPipelines.length > filteredLeads.length && (
                <button
                  type="button"
                  onClick={() => setActivePipelineId("all")}
                  className="px-2.5 py-1 rounded-lg bg-background border border-border text-[11px] font-bold hover:bg-muted transition-colors cursor-pointer"
                >
                  Ver todos os {eventLeadsAcrossAllPipelines.length} em Todos os Funis
                </button>
              )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const targetPool =
                  filteredLeads.length > 0 ? filteredLeads : eventLeadsAcrossAllPipelines;
                if (selectedLeadIds.length === targetPool.length && targetPool.length > 0) {
                  setSelectedLeadIds([]);
                } else {
                  setSelectedLeadIds(targetPool.map((l) => l.id));
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-background border border-border text-[11px] font-bold hover:bg-muted transition-colors cursor-pointer"
            >
              {selectedLeadIds.length > 0 ? `Selecionados (${selectedLeadIds.length})` : "Selecionar Leads do Evento"}
            </button>

            <button
              type="button"
              disabled={isSendingToSdr}
              onClick={handleSendEventLeadsToSdr}
              className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-wider hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UsersIcon className="h-3.5 w-3.5" />
              {isSendingToSdr
                ? "Enviando..."
                : selectedLeadIds.length > 0
                ? `Enviar (${selectedLeadIds.length}) para SDR`
                : "Enviar Leads do Evento para SDR"}
            </button>

            {activeEventFilter !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setActiveEventFilter("all");
                  setSelectedLeadIds([]);
                }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Limpar Filtro
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 md:p-6 scrollbar-thin">
        {viewMode === 'kanban' ? (
          <div className="flex gap-6 h-full min-w-max pb-4">
            {(() => {
              const stageNamesSet = new Set(visibleStages.map((s: PipelineStage) => s.name));
              const unmatchedLeads = filteredLeads.filter((l) => !stageNamesSet.has(l.stage));
              if (unmatchedLeads.length === 0) return null;
              return (
                <div className="w-72 md:w-80 flex flex-col gap-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Entrada / Outras Etapas</h3>
                    </div>
                    <span className="bg-muted text-muted-foreground text-[10px] font-black px-2 py-0.5 rounded-full">{unmatchedLeads.length}</span>
                  </div>
                  <div className="flex-1 bg-muted/20 rounded-[2rem] p-3 space-y-3 overflow-y-auto border border-dashed border-amber-500/40 scrollbar-none">
                    {unmatchedLeads.map((lead) => (
                      <KanbanCard
                        key={lead.id}
                        lead={lead}
                        color={currentPipeline.color}
                        stages={currentPipeline.stages.map(s => s.name)}
                        selectable={activeEventFilter !== "all" || selectedLeadIds.length > 0}
                        selected={selectedLeadIds.includes(lead.id)}
                        onToggleSelect={() => toggleLeadSelection(lead.id)}
                        onClick={() => setSelectedLeadId(lead.id)}
                        onDragStart={(e) => handleDragStart(lead.id, e)}
                        onDragEnd={() => { setDraggedLeadId(null); setDragOverStage(null); }}
                        onSchedule={() => setScheduleModalLead(lead)}
                        onTransfer={(e) => {
                          e?.stopPropagation();
                          setTransferModalLead(lead);
                        }}
                        onMoveStage={(newStage) => {
                          updateLead(lead.id, { stage: newStage });
                          toast.success(`Lead movido para "${newStage}"`);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
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
                        selectable={activeEventFilter !== "all" || selectedLeadIds.length > 0}
                        selected={selectedLeadIds.includes(lead.id)}
                        onToggleSelect={() => toggleLeadSelection(lead.id)}
                        onClick={() => setSelectedLeadId(lead.id)} 
                        onDragStart={(e) => handleDragStart(lead.id, e)} 
                        onDragEnd={() => { setDraggedLeadId(null); setDragOverStage(null); }}
                        onSchedule={() => setScheduleModalLead(lead)}
                        onTransfer={(e) => {
                          e?.stopPropagation();
                          setTransferModalLead(lead);
                        }}
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
          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="p-4">Lead / Empresa</th>
                    <th className="p-4">Etapa</th>
                    <th className="p-4">Classificação</th>
                    <th className="p-4">Score</th>
                    <th className="p-4">Valor</th>
                    <th className="p-4">Responsável</th>
                    <th className="p-4">Contato</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredLeads.map((lead) => {
                    const score = calculateLeadScore(lead);
                    const classification = CLASSIFICATION_CONFIG[lead.classification || "Lead"] || { label: "Lead", cls: "bg-muted text-muted-foreground" };
                    const cleanPhone = lead.whatsapp?.replace(/\D/g, "") || "";
                    const eventLabel = getLeadEventLabel(lead);
                    const isChecked = selectedLeadIds.includes(lead.id);

                    return (
                      <tr 
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={cn(
                          "hover:bg-muted/30 cursor-pointer transition-colors group",
                          isChecked && "bg-primary/5"
                        )}
                      >
                        <td className="p-4">
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleLeadSelection(lead.id)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Selecionar ${lead.name}`}
                              className="mt-1 h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                            />
                            <div>
                              <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex flex-wrap items-center gap-2">
                                <span>{lead.name}</span>
                                {eventLabel && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase">
                                    <Calendar className="h-2.5 w-2.5" />
                                    {eventLabel}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {lead.company || "Empresa não informada"} {lead.source && `· ${lead.source}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                            {lead.stage}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={cn("text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-tighter", classification.cls)}>
                            {classification.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={cn("font-black px-2 py-0.5 rounded-md text-[11px]", getScoreColor(score))}>
                            {score} pts
                          </span>
                        </td>
                        <td className="p-4 font-bold text-foreground">
                          {lead.value ? formatCurrency(lead.value) : "R$ 0,00"}
                        </td>
                        <td className="p-4 text-muted-foreground font-medium">
                          {lead.owner || "Sem responsável"}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/55${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {lead.email && (
                              <a
                                href={`mailto:${lead.email}`}
                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                                title="Enviar E-mail"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setTransferModalLead(lead)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                              title="Transferir de Funil"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setSelectedLeadId(lead.id)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-muted-foreground font-medium">
                        Nenhum lead encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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

      {showPipelineModal && (
        <PipelineManagerModal
          isOpen={showPipelineModal}
          onClose={() => setShowPipelineModal(false)}
          activePipelineId={activePipelineId}
          onSelectPipeline={(id) => setActivePipelineId(id)}
        />
      )}

      {transferModalLead && (
        <TransferLeadModal
          isOpen={!!transferModalLead}
          onClose={() => setTransferModalLead(null)}
          lead={transferModalLead}
        />
      )}

      {/* Modal para puxar lead da base diretamente no CRM */}
      <PullLeadModal
        open={showPullLeadModal}
        onClose={() => setShowPullLeadModal(false)}
        initialTargetPipelineId={activePipelineId}
      />

      {/* Modal de configuração de distribuição de leads entrantes (LDR/SDR/Seller) */}
      <LeadRoutingModal
        open={showRoutingModal}
        onClose={() => setShowRoutingModal(false)}
      />
    </div>
  );
}