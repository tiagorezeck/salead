import React, { useState, useMemo, useEffect } from "react";
import { 
  X, 
  Search, 
  Lock, 
  Unlock, 
  UserCheck, 
  ArrowDownToLine, 
  Layers, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  MessageCircle, 
  Building, 
  Sparkles,
  User,
  Filter
} from "lucide-react";
import { type Lead, type Pipeline } from "@/data/mock";
import { useData } from "@/hooks/use-data";
import { checkLeadClaimEligibility } from "@/lib/lead-rules";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface PullLeadModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  onLeadPulled?: (leadId: string) => void;
  preSelectedLeadId?: string;
  preselectedLeadId?: string;
  initialTargetPipelineId?: string;
  initialPipelineId?: string;
}

export function PullLeadModal({ 
  isOpen, 
  open, 
  onClose, 
  onLeadPulled, 
  preSelectedLeadId, 
  preselectedLeadId,
  initialTargetPipelineId,
  initialPipelineId
}: PullLeadModalProps) {
  const isModalOpen = Boolean(isOpen ?? open);
  const effectivePreselectedLeadId = preSelectedLeadId || preselectedLeadId;
  const effectiveInitialPipelineId = initialTargetPipelineId || initialPipelineId;

  const { leads, pipelines, currentUser, claimLeadToPipeline, transferLead } = useData();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "available" | "unassigned">("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Seleções para o destino de quem está puxando
  const [destPipelineId, setDestPipelineId] = useState<string>("");
  const [destStage, setDestStage] = useState<string>("");
  const [claimNote, setClaimNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sincroniza estado quando o modal é aberto
  useEffect(() => {
    if (isModalOpen) {
      if (effectivePreselectedLeadId) {
        const target = leads.find(l => l.id === effectivePreselectedLeadId);
        if (target) {
          setSelectedLead(target);
        }
      }

      // Define pipeline de destino
      let matchedPipe: Pipeline | undefined;
      if (effectiveInitialPipelineId) {
        matchedPipe = pipelines.find(p => p.id === effectiveInitialPipelineId);
      }
      
      if (!matchedPipe) {
        const userRole = currentUser?.role?.toLowerCase() || "";
        matchedPipe = pipelines.find(p => {
          const pr = (p.functionRole || "").toLowerCase();
          return (userRole.includes("sdr") && pr.includes("sdr")) ||
                 (userRole.includes("ldr") && pr.includes("ldr")) ||
                 (userRole.includes("seller") && pr.includes("seller")) ||
                 (userRole.includes("closer") && pr.includes("closer"));
        }) || pipelines[0];
      }

      if (matchedPipe) {
        setDestPipelineId(matchedPipe.id);
        if (matchedPipe.stages.length > 0) {
          setDestStage(matchedPipe.stages[0].name);
        }
      }
    } else {
      setSelectedLead(null);
      setClaimNote("");
      setSearchQuery("");
    }
  }, [isModalOpen, effectivePreselectedLeadId, effectiveInitialPipelineId, pipelines, currentUser, leads]);

  // Lista processada de leads com análise de elegibilidade
  const analyzedLeads = useMemo(() => {
    return leads.map(lead => {
      const eligibility = checkLeadClaimEligibility(lead, currentUser, pipelines);
      return {
        lead,
        eligibility
      };
    });
  }, [leads, currentUser, pipelines]);

  // Filtros de busca e tipo
  const filteredLeads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return analyzedLeads.filter(({ lead, eligibility }) => {
      // Filtro por texto
      if (q) {
        const matches = [
          lead.name,
          lead.company,
          lead.whatsapp,
          lead.email,
          lead.owner,
          lead.stage,
          lead.source
        ].some(v => v?.toLowerCase().includes(q));

        if (!matches) return false;
      }

      // Filtro por tipo
      if (filterType === "available") {
        return eligibility.canClaim;
      }
      if (filterType === "unassigned") {
        return !eligibility.hasOwner;
      }

      return true;
    });
  }, [analyzedLeads, searchQuery, filterType]);

  const handleSelectLeadToClaim = (lead: Lead) => {
    setSelectedLead(lead);
    // Se o pipeline de destino for o mesmo, tenta sugerir a primeira etapa
    const destPipe = pipelines.find(p => p.id === destPipelineId) || pipelines[0];
    if (destPipe && destPipe.stages.length > 0 && !destStage) {
      setDestStage(destPipe.stages[0].name);
    }
  };

  const handlePipelineChange = (pipeId: string) => {
    setDestPipelineId(pipeId);
    const pipe = pipelines.find(p => p.id === pipeId);
    if (pipe && pipe.stages.length > 0) {
      setDestStage(pipe.stages[0].name);
    }
  };

  const handleConfirmClaim = async () => {
    if (!selectedLead) return;

    const eligibility = checkLeadClaimEligibility(selectedLead, currentUser, pipelines);

    // Validação de segurança estrita solicitada pelo usuário
    if (!eligibility.canClaim && currentUser?.role !== "Admin Geral") {
      toast.error(eligibility.reason);
      return;
    }

    if (!destPipelineId || !destStage) {
      toast.error("Selecione o pipeline de destino e a etapa.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newOwner = currentUser?.name || "Vendedor";
      const customNote = claimNote.trim()
        ? `Lead puxado da base: ${claimNote.trim()}`
        : `Lead puxado da base de leads por ${newOwner}.`;

      if (claimLeadToPipeline) {
        await claimLeadToPipeline(
          selectedLead.id,
          destPipelineId,
          destStage,
          newOwner,
          customNote
        );
      } else {
        await transferLead(
          selectedLead.id,
          destPipelineId,
          destStage,
          newOwner,
          customNote
        );
      }

      toast.success(`Lead "${selectedLead.name}" colocado no seu pipeline com sucesso!`);
      if (onLeadPulled) {
        onLeadPulled(selectedLead.id);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao puxar lead para seu pipeline.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isModalOpen) return null;

  const destPipeline = pipelines.find(p => p.id === destPipelineId) || pipelines[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ArrowDownToLine className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                Buscar e Puxar Leads da Base
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Para Meu Pipeline
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Encontre leads cadastrados na base e transfira para seu funil de atendimento comercial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Regra de Ouro (Aviso explicativo no topo) */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            <strong>Regra de Proteção Comercial:</strong> Leads com <strong>contato já realizado</strong> por outro vendedor não podem ser puxados. Estão liberados leads na etapa de <strong>Novo Lead</strong>, <strong>sem contato</strong> ou <strong>sem responsável</strong>.
          </span>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="p-4 border-b border-border bg-card flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, WhatsApp, empresa, e-mail ou responsável..."
              className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                filterType === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              Todos ({analyzedLeads.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("available")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                filterType === "available"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <Unlock className="h-3 w-3" />
              Liberados ({analyzedLeads.filter(x => x.eligibility.canClaim).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("unassigned")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                filterType === "unassigned"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="h-3 w-3" />
              Sem Dono ({analyzedLeads.filter(x => !x.eligibility.hasOwner).length})
            </button>
          </div>
        </div>

        {/* Layout Split: Lista de Leads (Esquerda/Topo) e Painel de Destino (Direita/Base) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Lista de Resultados */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin border-b lg:border-b-0 lg:border-r border-border">
            {filteredLeads.map(({ lead, eligibility }) => {
              const isSelected = selectedLead?.id === lead.id;
              const cleanPhone = lead.whatsapp ? lead.whatsapp.replace(/\D/g, "") : "";

              return (
                <div
                  key={lead.id}
                  onClick={() => handleSelectLeadToClaim(lead)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer",
                    isSelected
                      ? "bg-primary/10 border-primary ring-1 ring-primary/30 shadow-sm"
                      : eligibility.canClaim
                        ? "bg-card hover:bg-muted/40 border-border"
                        : "bg-muted/20 border-border/60 opacity-80"
                  )}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate">
                        {lead.name}
                      </span>
                      {lead.company && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Building className="h-3 w-3" /> {lead.company}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {cleanPhone && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <MessageCircle className="h-3 w-3" /> {lead.whatsapp}
                        </span>
                      )}
                      {lead.email && <span className="truncate">{lead.email}</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                        Funil: {eligibility.pipelineName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                        Etapa: {lead.stage}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1",
                        eligibility.hasOwner 
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                          : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                      )}>
                        <User className="h-2.5 w-2.5" />
                        {eligibility.ownerName}
                      </span>
                    </div>
                  </div>

                  {/* Badges de Elegibilidade & Botão de Seleção */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {eligibility.isCurrentOwner ? (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-bold inline-flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5" /> Seu Lead
                      </span>
                    ) : eligibility.canClaim ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-1">
                        <Unlock className="h-3.5 w-3.5" /> Liberado
                      </span>
                    ) : (
                      <span 
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1"
                        title={eligibility.reason}
                      >
                        <Lock className="h-3.5 w-3.5" /> Bloqueado (Em andamento)
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectLeadToClaim(lead);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : eligibility.canClaim
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isSelected ? "Selecionado" : "Puxar"}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredLeads.length === 0 && (
              <div className="p-12 text-center text-muted-foreground font-medium space-y-2">
                <Search className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p>Nenhum lead encontrado com os filtros aplicados.</p>
                <button
                  onClick={() => { setSearchQuery(""); setFilterType("all"); }}
                  className="text-xs text-primary font-bold hover:underline cursor-pointer"
                >
                  Limpar busca e filtros
                </button>
              </div>
            )}
          </div>

          {/* Painel Lateral: Configuração de Destino do Lead Puxado */}
          <div className="w-full lg:w-96 bg-muted/10 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Destino do Lead Puxado
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Defina em qual dos seus pipelines e em qual etapa o lead entrará
                </p>
              </div>

              {selectedLead ? (
                <div className="p-3.5 rounded-xl bg-card border border-border space-y-2 shadow-xs">
                  <div className="text-xs font-bold text-foreground">
                    Lead Selecionado: <span className="text-primary">{selectedLead.name}</span>
                  </div>
                  {selectedLead.company && (
                    <div className="text-[11px] text-muted-foreground">
                      Empresa: {selectedLead.company}
                    </div>
                  )}

                  {/* Status de Validação da Regra do Lead Selecionado */}
                  {(() => {
                    const elig = checkLeadClaimEligibility(selectedLead, currentUser, pipelines);
                    return (
                      <div className={cn(
                        "p-2.5 rounded-lg text-xs flex items-start gap-2 border",
                        elig.canClaim 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                          : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
                      )}>
                        {elig.canClaim ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                        )}
                        <span className="text-[11px] leading-snug">
                          {elig.reason}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                  Selecione um lead na lista ao lado para puxar para seu pipeline.
                </div>
              )}

              {/* Seletor de Pipeline */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Seu Pipeline de Destino
                </label>
                <select
                  value={destPipelineId}
                  onChange={(e) => handlePipelineChange(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-xs"
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.functionRole ? `(${p.functionRole})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seletor de Etapa */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Etapa de Entrada no Seu Funil
                </label>
                <select
                  value={destStage}
                  onChange={(e) => setDestStage(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-xs"
                >
                  {(destPipeline?.stages || []).map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Responsável atribuído automaticamente */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Novo Responsável:</span>
                  <strong className="text-xs text-foreground">{currentUser?.name || "Você"}</strong>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                  {currentUser?.role || "Comercial"}
                </span>
              </div>

              {/* Observação Opcional */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  Nota / Motivo (Opcional)
                </label>
                <input
                  type="text"
                  value={claimNote}
                  onChange={(e) => setClaimNote(e.target.value)}
                  placeholder="Ex: Puxei para realizar abordagem outbound hoje"
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Ação de Confirmação */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmClaim}
                disabled={
                  !selectedLead || 
                  isSubmitting || 
                  (!checkLeadClaimEligibility(selectedLead, currentUser, pipelines).canClaim && currentUser?.role !== "Admin Geral")
                }
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-elegant flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownToLine className="h-4 w-4" />
                {isSubmitting ? "Processando..." : "Confirmar e Puxar Lead"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
