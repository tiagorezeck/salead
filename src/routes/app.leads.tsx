import { createFileRoute } from "@tanstack/react-router";
import { 
  Search, Download, Plus, Eye, Timer, Clock, Calendar, Filter, X, 
  ChevronDown, Check, Sparkles, Flame, UserCheck, Trash2, 
  RefreshCw, Ban, CheckSquare, Square, AlertTriangle, Globe, MessageCircle, Mail, DollarSign,
  FileCheck
} from "lucide-react";
import { useState, useMemo } from "react";
import { useData } from "@/hooks/use-data";
import { NewLeadModal } from "@/components/crm/new-lead-modal";
import { LeadDrawer } from "@/components/crm/lead-drawer";
import { SLACenterModal } from "@/components/crm/sla-center-modal";
import { cn, formatCurrency } from "@/lib/utils";
import { calculateLeadScore, getScoreColor, getScoreBg } from "@/lib/scoring";
import { isWithinInterval, differenceInDays } from "date-fns";
import { 
  getLeadAgeInfo, 
  getLeadStatusCode, 
  getLeadStatusCodeInfo, 
  LEAD_STATUS_CONFIG, 
  type LeadStatusCode 
} from "@/lib/lead-status-utils";
import { getMinClassificationBadge, calculateMinQualification, type MinQualification } from "@/lib/min-qualification";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Helper para limpar o nome da empresa, retirando referências à LP e duplicatas do nome
function getCleanCompanyName(company?: string, leadName?: string): string {
  if (!company) return "";
  let clean = company.replace(/\s*\(LP:.*?\)/gi, "").trim();
  clean = clean.replace(/\s*-\s*\(LP:.*?\)/gi, "").trim();
  if (leadName && clean.toLowerCase() === leadName.toLowerCase()) {
    return "";
  }
  return clean;
}

// Helper para formatar e colorir a Origem do Lead de forma limpa e direta
interface SourceBadgeInfo {
  label: string;
  bg: string;
  text: string;
  border: string;
}

function getLeadSourceBadge(lead: any): SourceBadgeInfo {
  const rawSource = (lead.source || "").trim();
  const rawMetaSource = (lead.metadata?.source || lead.metadata?.utm?.utm_source || "").trim();
  const tags = Array.isArray(lead.tags) ? lead.tags : [];
  
  // Combina potenciais identificadores
  const combined = `${rawSource} ${rawMetaSource} ${tags.join(" ")}`.toLowerCase();

  // Extrai de padrão de colchetes caso exista ex: "LP: Nome [instagram]"
  let extractedBracket = "";
  const bracketMatch = rawSource.match(/\[(.*?)\]/) || rawSource.match(/\((.*?)\)/);
  if (bracketMatch && bracketMatch[1]) {
    extractedBracket = bracketMatch[1].toLowerCase().trim();
  }

  const token = extractedBracket || combined;

  if (token.includes("instagram-bio") || token.includes("bio")) {
    return { label: "Instagram · Bio", bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/30" };
  }
  if (token.includes("instagram-story") || token.includes("instagram-stories") || token.includes("stories") || token.includes("story")) {
    return { label: "Instagram · Stories", bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/30" };
  }
  if (token.includes("instagram") || token.includes("insta") || token.includes("ig")) {
    return { label: "Instagram", bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/30" };
  }
  if (token.includes("facebook") || token.includes("fb")) {
    return { label: "Facebook", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" };
  }
  if (token.includes("whatsapp-list") || token.includes("lista-vip") || token.includes("broadcast")) {
    return { label: "WhatsApp · Lista", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" };
  }
  if (token.includes("whatsapp") || token.includes("whats") || token.includes("wpp") || token.includes("wa")) {
    return { label: "WhatsApp", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" };
  }
  if (token.includes("google-ads") || token.includes("google_ads") || token.includes("adwords") || token.includes("cpc")) {
    return { label: "Google Ads", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" };
  }
  if (token.includes("meta-ads") || token.includes("meta_ads") || token.includes("paid-social")) {
    return { label: "Meta Ads", bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30" };
  }
  if (token.includes("tiktok")) {
    return { label: "TikTok", bg: "bg-zinc-500/10", text: "text-zinc-700 dark:text-zinc-300", border: "border-zinc-500/30" };
  }
  if (token.includes("youtube") || token.includes("yt")) {
    return { label: "YouTube", bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/30" };
  }
  if (token.includes("linkedin")) {
    return { label: "LinkedIn", bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", border: "border-sky-500/30" };
  }
  if (token.includes("telegram")) {
    return { label: "Telegram", bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30" };
  }
  if (token.includes("email") || token.includes("e-mail") || token.includes("newsletter")) {
    return { label: "E-mail", bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" };
  }
  if (token.includes("sms")) {
    return { label: "SMS", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" };
  }
  if (token.includes("direct") || token.includes("direto") || token.includes("organico") || token.includes("landing page") || token.includes("landing_page")) {
    return { label: "Direto", bg: "bg-muted/80", text: "text-foreground", border: "border-border" };
  }
  if (token.includes("manual")) {
    return { label: "Manual", bg: "bg-muted/80", text: "text-foreground", border: "border-border" };
  }

  // Fallback se começa com LP:
  if (rawSource.startsWith("LP:")) {
    return { label: "Direto", bg: "bg-muted/80", text: "text-foreground", border: "border-border" };
  }

  return { label: rawSource || "Direto", bg: "bg-muted/80", text: "text-foreground", border: "border-border" };
}

export const Route = createFileRoute("/app/leads")({
  component: LeadsPage,
});

function LeadsPage() {
  const { 
    leads, addLead, updateLead, deleteLead, bulkDeleteLeads, 
    bulkUpdateLeadStatus, stages, initialized, dateFilter, products,
    surveysResponses = []
  } = useData();
  
  const [q, setQ] = useState("");
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showSLAModal, setShowSLAModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Estados de Filtro
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMin, setFilterMin] = useState<string>("all");
  const [filterAge, setFilterAge] = useState<string>("all");

  // Estados de Seleção Múltipla
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Helper para obter a qualificação MIN de cada lead
  const resolveLeadMin = (lead: any): MinQualification | undefined => {
    if (lead.minQualification) return lead.minQualification;
    if (lead.minScore && lead.minScore !== "Nenhum") {
      const m = lead.minScore.includes("M") ? 1 : 0;
      const i = lead.minScore.includes("I") ? 1 : 0;
      const n = lead.minScore.includes("N") ? 1 : 0;
      return calculateMinQualification(m, i, n);
    }
    return undefined;
  };

  // Contadores por código visual de status
  const statusCounts = useMemo(() => {
    const counts = {
      all: leads.length,
      novo: 0,
      lead_teste: 0,
      recorrente_sem_compra: 0,
      cliente_recorrente: 0,
      desqualificado: 0,
      excluido: 0
    };
    leads.forEach(l => {
      const code = getLeadStatusCode(l);
      if (counts[code] !== undefined) {
        counts[code]++;
      }
    });
    return counts;
  }, [leads]);

  const filteredRows = useMemo(() => {
    let result = [...leads];

    if (dateFilter.from && dateFilter.to) {
      result = result.filter(l => isWithinInterval(new Date(l.createdAt), { 
        start: dateFilter.from!, 
        end: dateFilter.to! 
      }));
    }

    if (q) {
      const search = q.toLowerCase();
      result = result.filter(l => {
        const info = getLeadStatusCodeInfo(l);
        return [
          l.name, 
          l.company, 
          l.email, 
          l.whatsapp,
          l.owner, 
          l.source, 
          l.role, 
          l.landingPage,
          info.label,
          info.visualCodeName,
          l.isCustomer ? "cliente" : "",
          l.isRecurring ? "recorrência recorrente" : "",
          l.classification
        ].some(v => v?.toLowerCase().includes(search));
      });
    }

    if (filterStatus !== "all") {
      result = result.filter(l => {
        const code = getLeadStatusCode(l);
        if (filterStatus === 'novo') return code === 'novo';
        if (filterStatus === 'lead_teste') return code === 'lead_teste';
        if (filterStatus === 'recorrente_sem_compra') return code === 'recorrente_sem_compra';
        if (filterStatus === 'cliente_recorrente') return code === 'cliente_recorrente';
        if (filterStatus === 'desqualificado') return code === 'desqualificado';
        if (filterStatus === 'excluido') return code === 'excluido';
        if (filterStatus === 'Cliente') return code === 'cliente_recorrente';
        if (filterStatus === 'Recorrente') return code === 'recorrente_sem_compra' || code === 'cliente_recorrente';
        if (filterStatus === 'Ativo') return code === 'novo' || code === 'recorrente_sem_compra' || code === 'cliente_recorrente';
        return l.status === filterStatus;
      });
    }

    if (filterMin !== "all") {
      result = result.filter(l => {
        const minObj = resolveLeadMin(l);
        if (filterMin === 'NONE') return !minObj || minObj.classification === undefined;
        return minObj?.classification === filterMin;
      });
    }

    if (filterAge !== "all") {
      result = result.filter(l => getLeadAgeInfo(l.createdAt).category === filterAge);
    }

    return result.sort((a, b) => {
      const statusWeight = (s: any) => {
        if (s.status === 'Excluido') return 5;
        if (s.status === 'Desqualificado') return 4;
        if (s.isCustomer || s.classification === 'Cliente' || s.stage === 'Ganho' || s.stage === 'Recebimento') return 3;
        if (s.isRecurring || s.type === 'Recorrente' || Number(s.lpVisits || 0) > 1) return 2;
        return 1;
      };
      const weightA = statusWeight(a);
      const weightB = statusWeight(b);
      if (weightA !== weightB) return weightA - weightB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [leads, q, dateFilter, filterStatus, filterMin, filterAge]);

  if (!initialized) return <div className="p-8 text-center text-muted-foreground font-semibold">Carregando base de leads...</div>;

  const criticalCount = leads.filter(l => l.sla === "critico" || l.sla === "vencido").length;

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredRows.length) setSelectedLeads([]);
    else setSelectedLeads(filteredRows.map(l => l.id));
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkRestore = async () => {
    await bulkUpdateLeadStatus(selectedLeads, 'Ativo');
    setSelectedLeads([]);
    toast.success("Leads restaurados para Ativo.");
  };

  const handleBulkDisqualify = async () => {
    await bulkUpdateLeadStatus(selectedLeads, 'Desqualificado');
    setSelectedLeads([]);
    toast.info("Leads marcados como Desqualificados.");
  };

  const handleBulkDeletePermanent = async () => {
    await bulkDeleteLeads(selectedLeads);
    setSelectedLeads([]);
    setShowBulkDeleteConfirm(false);
    toast.success("Leads excluídos permanentemente.");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto relative min-h-screen pb-32">
      
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">Módulo Comercial / CRM</div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">Base de Leads</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Exibindo <strong className="text-foreground">{filteredRows.length}</strong> de {leads.length} registros cadastrados.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowNewLeadModal(true)}
            className="text-xs sm:text-sm px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-black uppercase tracking-wider shadow-elegant inline-flex items-center gap-2 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Novo Lead
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, WhatsApp, empresa, origem, LP ou responsável…"
              className="w-full bg-muted/60 border border-border rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <FilterSelect 
              label="Status" 
              value={filterStatus} 
              onChange={setFilterStatus} 
              options={[
                { v: 'all', l: `Todos Status (${statusCounts.all})` },
                { v: 'novo', l: `🟢 Lead - 1º Contato (${statusCounts.novo})` },
                { v: 'lead_teste', l: `🧪 Modo Teste (${statusCounts.lead_teste})` },
                { v: 'recorrente_sem_compra', l: `🟡 Recorrente - Sem Compra (${statusCounts.recorrente_sem_compra})` },
                { v: 'cliente_recorrente', l: `🔵 Cliente Recorrente (${statusCounts.cliente_recorrente})` },
                { v: 'desqualificado', l: `🔴 Desqualificado (${statusCounts.desqualificado})` },
                { v: 'excluido', l: `❌ Excluído (${statusCounts.excluido})` }
              ]} 
            />

            <FilterSelect 
              label="Qualificação MIN" 
              value={filterMin} 
              onChange={setFilterMin} 
              icon={Flame}
              options={[
                { v: 'all', l: 'Todos os MIN' },
                { v: 'QUENTE', l: '🔥 Quente (3 pts)' },
                { v: 'MORNO', l: '🟠 Morno (2 pts)' },
                { v: 'FRIO', l: '🔵 Frio (1 pt)' },
                { v: 'DESCARTE', l: '⚫ Descarte (0 pts)' },
                { v: 'NONE', l: '⚪ Não avaliado' }
              ]} 
            />

            <FilterSelect 
              label="Tempo Base" 
              value={filterAge} 
              onChange={setFilterAge} 
              icon={Clock}
              options={[
                { v: 'all', l: 'Qualquer tempo' },
                { v: 'new', l: 'Recentes (1-3d)' },
                { v: 'growing', l: 'Em curso (4-7d)' },
                { v: 'old', l: 'Antigos (8d+)' }
              ]} 
            />
            
            {(filterStatus !== 'all' || filterMin !== 'all' || filterAge !== 'all' || q) && (
              <button 
                onClick={() => { setFilterStatus('all'); setFilterMin('all'); setFilterAge('all'); setQ(""); }}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                title="Limpar todos os filtros"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="h-7 w-px bg-border mx-1 hidden lg:block" />
            
            <button 
              onClick={() => setShowSLAModal(true)}
              className={cn(
                "h-9 px-3.5 rounded-xl border flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all shrink-0 shadow-sm cursor-pointer",
                criticalCount > 0 
                  ? "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20" 
                  : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <Timer className={cn("h-3.5 w-3.5", criticalCount > 0 && "animate-pulse")} />
              SLA ({criticalCount})
            </button>
          </div>
        </div>
      </div>

      {/* Tabela Principal Enxuta */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase font-black tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">
                  <button 
                    onClick={toggleSelectAll} 
                    className="text-primary hover:opacity-80 transition-transform active:scale-95 cursor-pointer inline-flex items-center justify-center"
                    title={selectedLeads.length === filteredRows.length && filteredRows.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
                  >
                    {selectedLeads.length === filteredRows.length && filteredRows.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </button>
                </th>
                <th className="text-left px-4 py-3.5 min-w-[240px]">Lead / Empresa</th>
                <th className="text-left px-4 py-3.5">Status</th>
                <th className="text-left px-4 py-3.5">Momento (MIN)</th>
                <th className="text-left px-4 py-3.5">Tempo Base</th>
                <th className="text-left px-4 py-3.5">Valor</th>
                <th className="text-left px-4 py-3.5">Capag</th>
                <th className="text-left px-4 py-3.5">Score</th>
                <th className="text-left px-4 py-3.5">SLA</th>
                <th className="text-left px-4 py-3.5">LP & Visitas</th>
                <th className="text-left px-4 py-3.5">Origem</th>
                <th className="text-right px-4 py-3.5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.map((l) => {
                const score = calculateLeadScore(l);
                const scoreColor = getScoreColor(score);
                const scoreBg = getScoreBg(score);
                
                const minObj = resolveLeadMin(l);
                const minBadge = getMinClassificationBadge(minObj);

                const daysOld = differenceInDays(new Date(), new Date(l.createdAt));
                const isSelected = selectedLeads.includes(l.id);
                const cleanPhone = l.whatsapp?.replace(/\D/g, "") || "";
                
                const statusInfo = getLeadStatusCodeInfo(l);
                const visitsCount = Number(l.lpVisits) || (l.landingPage || l.source?.includes("LP") ? 1 : 0);
                const sourceBadge = getLeadSourceBadge(l);
                const cleanCompany = getCleanCompanyName(l.company, l.name);

                return (
                  <tr key={l.id} className={cn(
                    "hover:bg-muted/30 transition-colors group",
                    l.status === 'Excluido' && "opacity-55 grayscale bg-muted/5",
                    l.status === 'Desqualificado' && "opacity-75 bg-muted/5",
                    isSelected && "bg-primary/5"
                  )}>
                    {/* Checkbox de Seleção */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button 
                        onClick={() => toggleSelectLead(l.id)} 
                        className={cn(
                          "transition-all p-0.5 rounded hover:bg-muted/60 active:scale-90 cursor-pointer inline-flex items-center justify-center", 
                          isSelected ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
                        )}
                        title={isSelected ? "Desmarcar lead" : "Selecionar lead"}
                      >
                        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>
                    </td>

                    {/* Lead / Empresa */}
                    <td className="px-4 py-3 min-w-[240px]">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-sm text-foreground">{l.name}</span>
                          {l.personType && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">{l.personType}</span>
                          )}
                          {Boolean(
                            l.quizAnswers || 
                            l.metadata?.surveyAnswers || 
                            l.metadata?.answers || 
                            (l as any).surveyAnswers ||
                            surveysResponses.some((r: any) => 
                              r.leadId === l.id || 
                              r.lead_id === l.id || 
                              (l.email && (r.leadEmail === l.email || r.answers?.email === l.email)) ||
                              (l.whatsapp && (r.leadWhatsapp === l.whatsapp || r.answers?.whatsapp === l.whatsapp))
                            )
                          ) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(l.id);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/40 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                              title="Lead respondeu à pesquisa - clique para ver as respostas completas"
                            >
                              <FileCheck className="h-2.5 w-2.5" />
                              <span>Pesquisa</span>
                            </button>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-0.5 text-xs">
                          {cleanPhone ? (
                            <a 
                              href={`https://wa.me/${cleanPhone}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              onClick={(e) => e.stopPropagation()} 
                              className="text-emerald-500 hover:text-emerald-400 font-medium hover:underline inline-flex items-center gap-1 whitespace-nowrap transition-colors w-fit"
                              title="Abrir conversa no WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>{l.whatsapp}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60 text-[11px] inline-flex items-center gap-1">
                              <MessageCircle className="h-3 w-3 shrink-0" /> Sem WhatsApp
                            </span>
                          )}

                          {l.email ? (
                            <a 
                              href={`mailto:${l.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 whitespace-nowrap text-[11px] truncate max-w-[220px] transition-colors hover:underline w-fit"
                              title="Enviar e-mail"
                            >
                              <Mail className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                              <span className="truncate">{l.email}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60 text-[11px] inline-flex items-center gap-1">
                              <Mail className="h-3 w-3 shrink-0" /> Sem e-mail
                            </span>
                          )}

                          {cleanCompany ? (
                            <span className="text-[11px] text-muted-foreground/90 font-medium truncate max-w-[220px] block">
                              {cleanCompany}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Status Comercial Clean */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span 
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border shadow-2xs",
                          statusInfo.bgClass,
                          statusInfo.textClass,
                          statusInfo.borderClass
                        )} 
                        title={statusInfo.description}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusInfo.dotColor)} />
                        <span>{statusInfo.badgeLabel}</span>
                      </span>
                    </td>

                    {/* Momento (MIN) */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border shadow-2xs w-fit",
                          minBadge.bg, minBadge.text, minBadge.border
                        )}>
                          <span>{minBadge.emoji}</span>
                          <span>{minBadge.label}</span>
                          {minObj?.total !== undefined && (
                            <span className="opacity-80 text-[9px]">({minBadge.scoreText})</span>
                          )}
                        </div>
                        <span className="text-[9px] font-semibold text-muted-foreground px-1.5 py-0.2 rounded bg-muted/60 w-fit">
                          {l.stage}
                        </span>
                      </div>
                    </td>

                    {/* Tempo Base */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-semibold text-foreground">
                        {daysOld === 0 ? "Hoje" : `${daysOld}d atrás`}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(l.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-xs">
                      {l.value > 0 ? formatCurrency(l.value) : <span className="text-muted-foreground">-</span>}
                    </td>

                    {/* Capag */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {l.capag ? (
                        <span className="font-semibold text-foreground">{typeof l.capag === 'number' ? formatCurrency(l.capag) : l.capag}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                          <div className={cn("h-full transition-all", scoreBg)} style={{ width: `${Math.min(100, score)}%` }} />
                        </div>
                        <span className={cn("text-[10px] font-black", scoreColor)}>{score}</span>
                      </div>
                    </td>

                    {/* SLA */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                        l.sla === "ok" ? "bg-success/15 text-success" :
                        l.sla === "alerta" ? "bg-warning/15 text-warning" :
                        "bg-destructive/15 text-destructive"
                      )}>{l.sla}</span>
                    </td>

                    {/* LP & Visitas */}
                    <td className="px-4 py-3 text-xs max-w-[170px]" title={l.landingPage || "-"}>
                      {l.landingPage ? (
                        <span className="font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[10px] truncate block max-w-full">
                          {l.landingPage}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px] block">-</span>
                      )}
                      <div className="flex items-center gap-1 text-[10px] mt-1">
                        <span className={cn(
                          "inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded border text-[9px]",
                          visitsCount > 1 
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" 
                            : "bg-muted text-muted-foreground border-border/60"
                        )}>
                          <Globe className="h-2.5 w-2.5" />
                          {visitsCount} {visitsCount === 1 ? "visita LP" : "visitas a LPs"}
                        </span>
                      </div>
                    </td>

                    {/* Origem */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={cn(
                        "font-bold text-[11px] px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 shadow-2xs",
                        sourceBadge.bg, sourceBadge.text, sourceBadge.border
                      )}>
                        <span>{sourceBadge.label}</span>
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button 
                        onClick={() => setSelectedId(l.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider hover:opacity-95 active:scale-95 transition-all shadow-sm cursor-pointer"
                      >
                        <Eye className="h-3 w-3" /> Detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center gap-2.5 text-muted-foreground">
                      <Filter className="h-8 w-8 opacity-20" />
                      <p className="text-sm font-medium">Nenhum lead encontrado com estes filtros.</p>
                      <button 
                        onClick={() => { setFilterStatus('all'); setFilterMin('all'); setFilterAge('all'); setQ(""); }} 
                        className="text-xs font-black text-primary hover:underline uppercase tracking-wider cursor-pointer"
                      >
                        Limpar todos os filtros
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barra de Ações em Massa Flutuante */}
      {selectedLeads.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-6 duration-300">
           <div className="bg-background border border-primary/40 rounded-2xl p-2 pr-4 shadow-2xl flex items-center gap-3">
              <div className="h-9 px-4 rounded-xl bg-primary text-primary-foreground flex items-center gap-1.5 shadow-sm">
                 <span className="font-black text-sm">{selectedLeads.length}</span>
                 <span className="text-[10px] font-bold uppercase tracking-wider">selecionados</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                 {filterStatus === 'excluido' || filterStatus === 'desqualificado' ? (
                   <button onClick={handleBulkRestore} className="h-9 px-3 rounded-xl bg-muted border border-border text-foreground text-[10px] font-black uppercase tracking-wider hover:bg-success hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
                      <RefreshCw className="h-3.5 w-3.5" /> Restaurar
                   </button>
                 ) : (
                   <button onClick={handleBulkDisqualify} className="h-9 px-3 rounded-xl bg-muted border border-border text-foreground text-[10px] font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
                      <Ban className="h-3.5 w-3.5" /> Desqualificar
                   </button>
                 )}

                 <button onClick={() => setShowBulkDeleteConfirm(true)} className="h-9 px-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-black uppercase tracking-wider hover:bg-destructive hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                 </button>

                 <div className="h-6 w-px bg-border mx-1" />
                 
                 <button onClick={() => setSelectedLeads([])} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Desmarcar todos">
                    <X className="h-4 w-4" />
                 </button>
              </div>
           </div>
        </div>
      )}

      {showNewLeadModal && <NewLeadModal onClose={() => setShowNewLeadModal(false)} onAdd={addLead} />}
      {showSLAModal && <SLACenterModal onClose={() => setShowSLAModal(false)} />}
      
      {selectedId && (
        <LeadDrawer 
          lead={leads.find(l => l.id === selectedId)!} 
          stages={stages} 
          onClose={() => setSelectedId(null)} 
          onUpdate={updateLead} 
          onDelete={deleteLead} 
        />
      )}

      {/* Alerta de Exclusão Permanente */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader className="items-center text-center">
            <div className="h-14 w-14 rounded-full bg-destructive/10 text-destructive grid place-items-center mb-2">
               <AlertTriangle className="h-7 w-7" />
            </div>
            <AlertDialogTitle className="font-display text-xl font-black uppercase tracking-tight">Exclusão Permanente</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a apagar <strong>{selectedLeads.length} registro(s)</strong> permanentemente. Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeletePermanent} className="bg-destructive text-white font-bold rounded-xl hover:bg-destructive/90 cursor-pointer">
              Sim, apagar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, icon: Icon }: any) {
  return (
    <div className="relative group/sel min-w-[150px]">
      <div className="absolute top-[-7px] left-2 px-1 bg-card text-[8px] font-black text-muted-foreground uppercase tracking-widest z-10">{label}</div>
      <div className="relative">
        {Icon && <Icon className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-primary" />}
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full bg-muted/50 border border-border rounded-xl pr-7 py-1.5 text-xs font-bold appearance-none outline-none focus:border-primary transition-all cursor-pointer",
            Icon ? "pl-7" : "pl-2.5"
          )}
        >
          {options.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <ChevronDown className="h-3 w-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}
