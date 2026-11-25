import { type Lead, type Stage, type Classification, type LeadType, type Strategy, type DecisionRole, type MINScore, type Temperature, type CopilotInterviewDocument, SLA_CONFIG, CLASSIFICATION_CONFIG, SOURCES } from "@/data/mock";
import { Link } from "@tanstack/react-router";
import { 
  Trash2, Flame, Unlock, Lock, FileText, Clock, UserPlus, CheckSquare, Sparkles, 
  History, Info, Mail, Phone, Target, GitMerge, AlertCircle, ExternalLink, Pencil, 
  Save, X, Thermometer, UserCheck, Zap, TrendingUp, Calendar, ArrowUpRight, 
  ArrowDownRight, Check, Ban, CreditCard, RefreshCw, MessageCircle, DollarSign, 
  Building2, Globe, User, Video, FileCheck, Layers, ArrowRightLeft, ArrowRight, ChevronDown 
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useData } from "@/hooks/use-data";
import { MaskedInput } from "@/components/ui/masked-input";
import { validatePhone, validateEmail } from "@/lib/validators";
import { calculateLeadScore, getScoreColor, getScoreDeltaInfo } from "@/lib/scoring";
import { cn, formatCurrency } from "@/lib/utils";
import { calculateMinQualification, getMinClassificationBadge, type MinScoreValue, type MinQualification } from "@/lib/min-qualification";
import { differenceInDays, format } from "date-fns";
import { ScheduleModal } from "@/components/crm/schedule-modal";
import { TransferLeadModal } from "@/components/crm/transfer-lead-modal";
import { 
  getLeadStatusCodeInfo, 
  getLeadStatusCode, 
  LEAD_STATUS_CONFIG, 
  type LeadStatusCode 
} from "@/lib/lead-status-utils";
import { buildGoogleCalendarTemplateLink, formatDateBR } from "@/lib/agenda-engine";

interface LeadDrawerProps {
  lead: Lead;
  stages: Stage[];
  onClose: () => void;
  onUpdate: (id: string, u: any) => void;
  onDelete: (id: string) => void;
}

export function LeadDrawer({ lead, stages, onClose, onUpdate, onDelete }: LeadDrawerProps) {
  const { users, stageWorkflows, currentUser, products, landingPages, surveys = [], surveysResponses = [], pipelines = [], pipelineHistory = [] } = useData();
  const [activeTab, setActiveTab] = useState<'perfil' | 'historico'>('perfil');
  const [isEditing, setIsEditing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [expandedCopilotDocId, setExpandedCopilotDocId] = useState<string | null>(null);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  
  const [editForm, setEditForm] = useState({
    name: "",
    company: "",
    email: "",
    whatsapp: "",
    personType: "PJ" as 'PF' | 'PJ',
    role: "",
    revenue: "" as number | string,
    capag: "" as number | string,
    value: 0,
    owner: "",
    source: "",
    landingPage: "",
    productId: "",
    lpVisits: 1,
    isCustomer: false,
    isRecurring: false
  });

  const currentPipeline = useMemo(() => {
    return pipelines.find(p => p.id === (lead.pipelineId || "prospection")) || pipelines[0];
  }, [lead.pipelineId, pipelines]);

  const leadPipelineMovements = useMemo(() => {
    return pipelineHistory.filter(h => h.leadId === lead.id);
  }, [pipelineHistory, lead.id]);

  const copilotDocuments = useMemo<CopilotInterviewDocument[]>(() => {
    const docs = Array.isArray(lead.copilotDocuments)
      ? lead.copilotDocuments
      : Array.isArray(lead.metadata?.copilotDocuments)
      ? lead.metadata.copilotDocuments
      : [];
    return [...docs].sort((a, b) => (Number(b.interviewNumber) || 0) - (Number(a.interviewNumber) || 0));
  }, [lead.copilotDocuments, lead.metadata]);

  const handleDeleteCopilotDocument = (docId: string) => {
    const nextDocs = copilotDocuments.filter((d) => d.id !== docId);
    onUpdate(lead.id, {
      copilotDocuments: nextDocs,
      metadata: {
        ...(lead.metadata || {}),
        copilotDocuments: nextDocs,
      },
    });
    setConfirmDeleteDocId(null);
    if (expandedCopilotDocId === docId) setExpandedCopilotDocId(null);
    toast.success("Documento da entrevista excluído do cadastro e do Copiloto.");
  };

  useEffect(() => { 
    if (lead) {
      setEditForm({
        name: lead.name || "",
        company: lead.company || "",
        email: lead.email || "",
        whatsapp: lead.whatsapp || "",
        personType: lead.personType || "PJ",
        role: lead.role || "",
        revenue: lead.revenue !== undefined ? lead.revenue : "",
        capag: lead.capag !== undefined ? lead.capag : "",
        value: lead.value || 0,
        owner: lead.owner || "Admin",
        source: lead.source || "Manual",
        landingPage: lead.landingPage || "",
        productId: lead.productId || "",
        lpVisits: Number(lead.lpVisits) || (lead.landingPage || lead.source?.includes("LP") ? 1 : 0),
        isCustomer: Boolean(lead.isCustomer || lead.classification === "Cliente" || lead.stage === "Ganho"),
        isRecurring: Boolean(lead.isRecurring || lead.type === "Recorrente" || (lead.isCustomer && (Number(lead.lpVisits || 0) > 1)))
      });
      setIsEditing(false);
    }
  }, [lead?.id]);

  const sla = lead ? (SLA_CONFIG[lead.sla] || SLA_CONFIG.ok) : SLA_CONFIG.ok;
  const workflow = stageWorkflows.find(w => w.stageName === lead?.stage);
  const rules = workflow?.rules || [];
  const completedCheckpoints = lead?.completedCheckpoints || [];

  const currentScore = useMemo(() => lead ? calculateLeadScore(lead) : 0, [lead]);
  const scoreColor = useMemo(() => getScoreColor(currentScore), [currentScore]);
  const delta = useMemo(() => lead ? getScoreDeltaInfo(currentScore, lead.prevScore) : null, [currentScore, lead?.prevScore]);

  const linkedProduct = useMemo(() => products.find(p => p.id === (isEditing ? editForm.productId : lead.productId)), [products, lead, isEditing, editForm.productId]);

  // Obter ou calcular qualificação MIN atual do lead
  const currentMin: MinQualification | undefined = useMemo(() => {
    if (lead?.minQualification) return lead.minQualification;
    if (lead?.minScore && lead.minScore !== "Nenhum") {
      const m = lead.minScore.includes("M") ? 1 : 0;
      const i = lead.minScore.includes("I") ? 1 : 0;
      const n = lead.minScore.includes("N") ? 1 : 0;
      return calculateMinQualification(m, i, n);
    }
    return undefined;
  }, [lead?.minQualification, lead?.minScore]);

  const minBadge = useMemo(() => getMinClassificationBadge(currentMin), [currentMin]);

  const leadSurveyResponses = useMemo(() => {
    if (!lead) return [];
    const cleanLeadPhone = (lead.whatsapp || "").replace(/\D/g, "");
    const cleanLeadEmail = (lead.email || "").trim().toLowerCase();

    const matched = surveysResponses.filter((r) => {
      if (r.leadId === lead.id || r.lead_id === lead.id) return true;
      if (r.answers?.leadId === lead.id || r.answers?.lead_id === lead.id) return true;
      
      const rEmail = (r.leadEmail || r.lead_email || r.answers?.email || "").trim().toLowerCase();
      if (cleanLeadEmail && rEmail && rEmail === cleanLeadEmail) return true;

      const rPhone = (r.leadWhatsapp || r.lead_whatsapp || r.answers?.whatsapp || r.answers?.phone || "").replace(/\D/g, "");
      if (cleanLeadPhone && rPhone && rPhone === cleanLeadPhone) return true;

      return false;
    });

    if (matched.length === 0) {
      const answers = lead.metadata?.surveyAnswers || lead.metadata?.answers || lead.quizAnswers || (lead as any).surveyAnswers;
      if (answers && Object.keys(answers).length > 0) {
        return [
          {
            id: `synthetic_${lead.id}`,
            survey_id: lead.metadata?.surveyId || "pesquisa_lp",
            surveyId: lead.metadata?.surveyId || "pesquisa_lp",
            lead_id: lead.id,
            leadId: lead.id,
            answers,
            minClassification: lead.metadata?.surveyTemperature || lead.minQualification || "Respondido",
            created_at: lead.metadata?.surveyAnsweredAt || lead.created_at || new Date().toISOString(),
          } as any,
        ];
      }
    }

    return matched;
  }, [surveysResponses, lead?.id, lead?.email, lead?.whatsapp, lead?.metadata, lead?.quizAnswers]);

  if (!lead) return null;

  const handleSaveEdit = () => {
    const updated = { ...editForm };

    if (updated.whatsapp) {
      const phoneCheck = validatePhone(updated.whatsapp);
      if (!phoneCheck.isValid) {
        toast.error(phoneCheck.error || "Telefone inválido.");
        return;
      }
      updated.whatsapp = phoneCheck.normalized;
    }

    if (updated.email) {
      const emailCheck = validateEmail(updated.email);
      if (!emailCheck.isValid) {
        toast.error(emailCheck.error || "E-mail inválido.");
        return;
      }
      updated.email = emailCheck.normalized;
    }

    onUpdate(lead.id, updated);
    setIsEditing(false);
    toast.success("Dados do lead atualizados com sucesso!");
  };

  const handleUpdateMinDimension = (dimension: 'm' | 'i' | 'n', val: MinScoreValue | null) => {
    const nextM = dimension === 'm' ? (val === null ? undefined : val) : currentMin?.m;
    const nextI = dimension === 'i' ? (val === null ? undefined : val) : currentMin?.i;
    const nextN = dimension === 'n' ? (val === null ? undefined : val) : currentMin?.n;

    const nextMin = calculateMinQualification(
      nextM !== undefined ? nextM : (dimension === 'm' ? val : 0),
      nextI !== undefined ? nextI : (dimension === 'i' ? val : 0),
      nextN !== undefined ? nextN : (dimension === 'n' ? val : 0)
    );

    let legacyMinScore: MINScore = "Nenhum";
    if (nextMin) {
      if (nextMin.m === 1 && nextMin.i === 1 && nextMin.n === 1) legacyMinScore = "MIN";
      else if (nextMin.m === 1 && nextMin.i === 1) legacyMinScore = "MI";
      else if (nextMin.m === 1 && nextMin.n === 1) legacyMinScore = "MN";
      else if (nextMin.i === 1 && nextMin.n === 1) legacyMinScore = "IN";
      else if (nextMin.m === 1) legacyMinScore = "M";
      else if (nextMin.i === 1) legacyMinScore = "I";
      else if (nextMin.n === 1) legacyMinScore = "N";
    }

    const temp = nextMin ? (nextMin.classification === "QUENTE" ? "Quente" : nextMin.classification === "MORNO" ? "Morno" : "Frio") : lead.temperature;

    onUpdate(lead.id, {
      minQualification: nextMin,
      minScore: legacyMinScore,
      temperature: temp
    });

    toast.success(`Qualificação MIN atualizada: ${nextMin?.classification || 'Alterado'}`);
  };

  const handleMarkLost = () => {
    if (!confirm(`Confirmar descarte de '${lead.name}'?`)) return;
    
    const now = new Date().toLocaleString('pt-BR');
    const activity = { 
      id: `lost-${Date.now()}`, 
      type: 'system' as const, 
      description: `Lead marcado como Perdido. Etapa de origem: ${lead.stage}`, 
      timestamp: now, 
      user: currentUser?.name || 'Sistema' 
    };

    onUpdate(lead.id, { 
      stage: "Perdido", 
      activities: [activity, ...(lead.activities || [])] 
    });
    toast.error("Lead movido para Perdido.");
  };

  const toggleCheckpoint = (ruleText: string) => {
    const next = completedCheckpoints.includes(ruleText)
      ? completedCheckpoints.filter(r => r !== ruleText)
      : [...completedCheckpoints, ruleText];
    onUpdate(lead.id, { completedCheckpoints: next });
  };

  const mandatoryRules = rules.filter(r => r.mandatory);
  const allMandatoryDone = mandatoryRules.every(r => completedCheckpoints.includes(r.text));
  const currentStageIndex = stages.indexOf(lead.stage);
  const prevStage = currentStageIndex > 0 ? stages[currentStageIndex - 1] : null;
  const nextStage = currentStageIndex !== -1 && currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

  const handleSetStage = (targetStage: string) => {
    if (!targetStage || targetStage === lead.stage) return;
    const now = new Date().toLocaleString('pt-BR');
    const activity = { 
      id: `stg-${Date.now()}`, 
      type: 'stage_change' as const, 
      description: `Etapa alterada: ${lead.stage} → ${targetStage}`, 
      timestamp: now, 
      user: currentUser?.name || 'Sistema' 
    };
    onUpdate(lead.id, { 
      stage: targetStage, 
      completedCheckpoints: [], 
      activities: [activity, ...(lead.activities || [])] 
    });
    toast.success(`Etapa alterada para "${targetStage}"`);
  };

  const handleAdvance = () => {
    if (!allMandatoryDone && mandatoryRules.length > 0) {
      toast.error("Conclua os itens obrigatórios.");
      return;
    }
    if (nextStage) {
      handleSetStage(nextStage);
    }
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    const newActivity = { 
      id: `act-${Date.now()}`, 
      type: 'note' as const, 
      description: note, 
      timestamp: new Date().toLocaleString('pt-BR'), 
      user: currentUser?.name || 'Você' 
    };
    onUpdate(lead.id, { 
      lastInteraction: "Agora",
      activities: [newActivity, ...(lead.activities || [])] 
    });
    setNote("");
    toast.success("Nota adicionada ao histórico!");
  };

  const cleanPhone = (isEditing ? editForm.whatsapp : lead.whatsapp)?.replace(/\D/g, "") || "";
  const ownerName = isEditing ? editForm.owner : lead.owner || "Admin";
  const avatarInitials = ownerName ? ownerName.split(" ").map(p => p[0]).slice(0, 2).join("") : "AD";

  // Cálculo de tempo base em dias
  const daysSinceCreation = differenceInDays(new Date(), new Date(lead.createdAt));
  const formattedCreationDate = new Date(lead.createdAt).toLocaleDateString('pt-BR');

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full sm:max-w-lg bg-background border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Topo / Header */}
        <div className="p-5 border-b border-border bg-gradient-surface">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-black bg-muted px-2 py-0.5 rounded-md border border-border">
                {lead.stage}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground">
                {daysSinceCreation === 0 ? "Criado hoje" : `${daysSinceCreation}d na base`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-black uppercase hover:bg-muted transition-colors">
                    <Ban className="h-3 w-3 inline mr-1" /> Cancelar
                  </button>
                  <button onClick={handleSaveEdit} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-black uppercase shadow-elegant hover:opacity-95 transition-all">
                    <Check className="h-3 w-3 inline mr-1" /> Salvar
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(true)} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Editar informações">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => { if(confirm("Excluir lead permanentemente?")) { onDelete(lead.id); onClose(); } }} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Identificação Principal */}
          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-2.5">
                <input 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  className="font-display text-lg font-bold bg-background border border-primary/40 rounded-xl px-3 py-1.5 w-full outline-none" 
                  placeholder="Nome do Lead" 
                />
                <div className="grid grid-cols-2 gap-2">
                  <MaskedInput 
                    maskType="phone"
                    value={editForm.whatsapp || ""} 
                    onChange={val => setEditForm({...editForm, whatsapp: val})} 
                    placeholder="+55 (24) 99999-9999" 
                  />
                  <MaskedInput 
                    maskType="email"
                    value={editForm.email || ""} 
                    onChange={val => setEditForm({...editForm, email: val})} 
                    placeholder="E-mail" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Visitas a LPs</label>
                    <input 
                      type="number"
                      min={0}
                      value={editForm.lpVisits} 
                      onChange={e => setEditForm({...editForm, lpVisits: Number(e.target.value)})} 
                      className="text-xs bg-background border border-border rounded-xl px-3 py-1.5 w-full outline-none" 
                      placeholder="Visitas a LPs" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Status de Compra</label>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, isCustomer: !editForm.isCustomer, isRecurring: !editForm.isCustomer || editForm.isRecurring })}
                      className={cn(
                        "w-full py-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                        editForm.isCustomer ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      <Sparkles className="h-3 w-3" />
                      {editForm.isCustomer ? "Cliente (Recorrência)" : "Lead Normal"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-2xl font-bold tracking-tight">{lead.name}</h2>
                    
                    {/* Badge do Status */}
                    {(() => {
                      const statusInfo = getLeadStatusCodeInfo(lead);
                      return (
                        <span 
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs",
                            statusInfo.bgClass,
                            statusInfo.textClass,
                            statusInfo.borderClass
                          )}
                          title={statusInfo.description}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusInfo.dotColor)} />
                          <span>{statusInfo.badgeLabel}</span>
                        </span>
                      );
                    })()}
                  </div>
                  {cleanPhone && (
                    <a 
                      href={`https://wa.me/${cleanPhone}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold inline-flex items-center gap-1.5 border border-emerald-500/20"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                </div>
                <div className="text-xs text-muted-foreground font-medium mt-1 flex flex-wrap items-center gap-2">
                  {lead.company && <span className="font-semibold text-foreground">{lead.company}</span>}
                  {lead.role && <span>· {lead.role}</span>}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted uppercase font-bold">{lead.personType || "PJ"}</span>
                  {lead.source && <span>· Origem: <strong>{lead.source}</strong></span>}
                </div>
              </div>
            )}
          </div>

          {/* Seletor & Stepper Interativo de Etapas do Pipeline */}
          <div className="mt-3.5 p-3 bg-muted/40 rounded-2xl border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{currentPipeline?.name || "Funil Comercial"}</span>
                </span>
                {currentPipeline?.functionRole && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-primary/10 text-primary border border-primary/20 rounded">
                    {currentPipeline.functionRole}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  to="/playbook/view"
                  search={{ leadId: lead.id }}
                  target="_blank"
                  className="px-2 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-white border border-amber-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                  title="Abrir Copiloto de Vendas para entrevistar este lead"
                >
                  <Zap className="h-3 w-3" />
                  <span>Copiloto</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowTransferModal(true)}
                  className="px-2 py-1 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                  title="Transferir lead para outro pipeline/funil"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  <span>Transferir</span>
                </button>

                <select
                  value={lead.stage}
                  onChange={(e) => handleSetStage(e.target.value)}
                  className="text-xs font-black uppercase bg-card border border-primary/40 text-primary px-2.5 py-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs cursor-pointer"
                >
                  {stages.map(stg => (
                    <option key={stg} value={stg} className="text-foreground normal-case font-bold">{stg}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stepper horizontal clicável */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
              {stages.map((stg, idx) => {
                const isCurrent = stg === lead.stage;
                const isPassed = currentStageIndex > idx;
                return (
                  <button
                    key={stg}
                    type="button"
                    onClick={() => handleSetStage(stg)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border cursor-pointer",
                      isCurrent
                        ? "bg-primary text-primary-foreground border-primary shadow-sm scale-102"
                        : isPassed
                        ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                    title={`Mover para "${stg}"`}
                  >
                    {isPassed ? <Check className="h-2.5 w-2.5 text-primary" /> : <span className="text-[8px] opacity-60">{idx + 1}.</span>}
                    <span>{stg}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards de Métricas Rápidas */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <StatCell label="VALOR TOTAL">
              {isEditing ? (
                <input type="number" value={editForm.value} onChange={e => setEditForm({...editForm, value: Number(e.target.value)})} className="w-full bg-background border border-primary/20 rounded-lg px-2 py-1 text-sm font-black mt-1" />
              ) : (
                <div className="font-display text-sm font-black text-foreground mt-0.5">{formatCurrency(lead.value)}</div>
              )}
            </StatCell>
            <StatCell label="Score">
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn("font-display text-base font-black", scoreColor)}>{currentScore}</span>
                {delta && <span className={cn("text-[8px] font-black px-1 py-0.2 rounded", delta.bg, delta.color)}>{delta.label}</span>}
              </div>
            </StatCell>
            <StatCell label="SLA" className={sla.text}>
              <div className="font-display text-xs font-black mt-0.5 uppercase">{sla.label}</div>
            </StatCell>
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-border bg-muted/30">
          <TabBtn active={activeTab === 'perfil'} onClick={() => setActiveTab('perfil')} icon={Info} label="Qualificação & Perfil" />
          <TabBtn active={activeTab === 'historico'} onClick={() => setActiveTab('historico')} icon={History} label="Histórico & Notas" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'perfil' ? (
            <div className="p-5 space-y-6 pb-12">

              {/* DOCUMENTOS DO COPILOTO (ENTREVISTAS SALVAS) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-muted/20 border border-emerald-500/30 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-500 uppercase tracking-wider">
                    <FileText className="h-4 w-4" /> Documentos do Copiloto ({copilotDocuments.length})
                  </div>
                  <Link
                    to="/playbook/view"
                    search={{ leadId: lead.id }}
                    target="_blank"
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                  >
                    <Zap className="h-3 w-3" /> Abrir Copiloto
                  </Link>
                </div>

                {copilotDocuments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma entrevista do Copiloto salva neste lead ainda. Ao finalizar uma entrevista no Copiloto, o formulário será gravado aqui automaticamente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {copilotDocuments.map((doc) => {
                      const isExpanded = expandedCopilotDocId === doc.id;
                      const isConfirmingDel = confirmDeleteDocId === doc.id;
                      return (
                        <div key={doc.id} className="rounded-xl bg-background/80 border border-border overflow-hidden">
                          <div className="p-3 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedCopilotDocId(isExpanded ? null : doc.id)}
                              className="flex-1 text-left flex items-center gap-2.5 min-w-0 cursor-pointer"
                            >
                              <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180 text-primary")} />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-foreground truncate">{doc.title}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {new Date(doc.createdAt).toLocaleString("pt-BR")} · {doc.interviewer || "Copiloto"}
                                </div>
                              </div>
                            </button>

                            {isConfirmingDel ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCopilotDocument(doc.id)}
                                  className="px-2 py-1 rounded-md bg-destructive text-white text-[10px] font-black uppercase cursor-pointer"
                                >
                                  Apagar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteDocId(null)}
                                  className="px-2 py-1 rounded-md border border-border text-[10px] font-semibold cursor-pointer"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteDocId(doc.id)}
                                title="Apagar entrevista deste cadastro e do Copiloto"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {isExpanded && (
                            <div className="px-3.5 pb-3.5 pt-2 border-t border-border/70 bg-muted/20 space-y-3 text-xs">
                              {Array.isArray(doc.mandatoryQuestions) && doc.mandatoryQuestions.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                    Perguntas &amp; Respostas
                                  </div>
                                  {doc.mandatoryQuestions.map((q) => (
                                    <div key={q.id} className="p-2.5 rounded-lg bg-background border border-border/60">
                                      <div className="text-[11px] font-bold text-foreground">{q.text}</div>
                                      <div className="text-xs text-primary font-medium mt-0.5">
                                        {q.answer || <span className="italic text-muted-foreground">Não respondida</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                  <div className="text-[9px] font-black uppercase text-emerald-500 mb-1">Green Flags</div>
                                  {doc.greenFlags?.length > 0 ? (
                                    doc.greenFlags.map((f) => <div key={f.id} className="text-[11px]">• {f.text}</div>)
                                  ) : (
                                    <div className="text-[11px] opacity-50 italic">Nenhuma</div>
                                  )}
                                </div>
                                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                  <div className="text-[9px] font-black uppercase text-rose-500 mb-1">Red Flags</div>
                                  {doc.redFlags?.length > 0 ? (
                                    doc.redFlags.map((f) => <div key={f.id} className="text-[11px]">• {f.text}</div>)
                                  ) : (
                                    <div className="text-[11px] opacity-50 italic">Nenhuma</div>
                                  )}
                                </div>
                              </div>

                              {doc.notes && (
                                <div className="p-2.5 rounded-lg bg-background border border-border/60">
                                  <div className="text-[10px] font-black uppercase text-muted-foreground mb-0.5">Notas da Entrevista</div>
                                  <div className="text-[11px] whitespace-pre-wrap">{doc.notes}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CARD DE RESPOSTAS DA PESQUISA (DEEPFIND) */}
              {leadSurveyResponses.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-muted/20 border border-purple-500/30 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-purple-400 uppercase tracking-wider">
                      <FileCheck className="h-4 w-4 text-purple-400" /> Respostas da Pesquisa (DeepFind)
                    </div>
                    <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {leadSurveyResponses.length} {leadSurveyResponses.length === 1 ? "Registro" : "Registros"}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Este lead preencheu as perguntas da pesquisa/diagnóstico da Landing Page. Clique no botão abaixo para ver todas as respostas.
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSurveyModal(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer hover:scale-[1.01]"
                  >
                    <Layers className="h-4 w-4" />
                    <span>Ver Respostas da Pesquisa do Lead</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </button>
                </div>
              )}

              {/* CARD DE AGENDAMENTO */}
              {lead.metadata?.calendarEvent ? (() => {
                const ce = lead.metadata.calendarEvent;
                const fallbackCalHref =
                  ce.calendarLink ||
                  buildGoogleCalendarTemplateLink({
                    title: ce.title || `Reunião: ${lead.name}`,
                    description: ce.description || "",
                    location: ce.location || "Online",
                    date: ce.date,
                    startTime: ce.startTime || "09:00",
                    endTime: ce.endTime || "09:30",
                  });

                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-muted/20 border border-primary/30 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-wider">
                        <Calendar className="h-4 w-4" /> Reunião Agendada
                      </div>
                      <div className="flex items-center gap-1.5">
                        {ce.protocolo && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-background border border-border text-foreground">
                            {ce.protocolo}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-[9px] uppercase font-black px-2 py-0.5 rounded border",
                            ce.status === "cancelled"
                              ? "bg-destructive/20 text-destructive border-destructive/30"
                              : "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                          )}
                        >
                          {ce.status === "cancelled" ? "Cancelado" : "Confirmado"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-foreground">{ce.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-medium font-mono tabular-nums">
                        {formatDateBR(ce.date)} · {ce.startTime} - {ce.endTime}
                      </div>
                    </div>

                    {ce.attendees?.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <strong>Participantes ({ce.attendees.length}):</strong> {ce.attendees.join(", ")}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-primary/20 flex-wrap">
                      {ce.meetLink && (
                        <a
                          href={ce.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-emerald-600 transition-colors"
                        >
                          <Video className="h-3.5 w-3.5" /> Entrar no Google Meet
                        </a>
                      )}

                      <a
                        href={fallbackCalHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground text-xs font-bold flex items-center gap-1.5 hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Adicionar ao Calendar
                      </a>

                      <button
                        type="button"
                        onClick={() => setShowScheduleModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all ml-auto cursor-pointer"
                      >
                        Gerenciar Agendamento
                      </button>
                    </div>
                  </div>
                );
              })() : (
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-elegant hover:scale-[1.01] transition-all cursor-pointer"
                >
                  <Calendar className="h-4 w-4" /> Agendar / Gerenciar Reunião
                </button>
              )}

              {/* GRUPO 1: QUALIFICAÇÃO MIN (Interativa) */}
              <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-black uppercase text-foreground tracking-wider flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-primary" /> Qualificação MIN
                  </div>

                  {/* Badge de Classificação Automática */}
                  <div className={cn(
                    "px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs font-black uppercase shadow-sm",
                    minBadge.bg, minBadge.text, minBadge.border
                  )}>
                    <span>{minBadge.emoji}</span>
                    <span>{minBadge.label}</span>
                    <span className="text-[10px] opacity-80">({minBadge.scoreText})</span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Marque se os critérios foram identificados durante o atendimento comercial:
                </p>

                <div className="space-y-2 pt-1">
                  {/* M - Momento */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border">
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1">
                        <span className="h-4 w-4 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-black">M</span>
                        Momento
                      </div>
                      <div className="text-[10px] text-muted-foreground">É o timing adequado para fechar agora?</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateMinDimension('m', currentMin?.m === 1 ? null : 1)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                          currentMin?.m === 1 ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Sim (1)
                      </button>
                      <button
                        onClick={() => handleUpdateMinDimension('m', currentMin?.m === 0 ? null : 0)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                          currentMin?.m === 0 ? "bg-zinc-700 text-white border-zinc-700 shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Não (0)
                      </button>
                    </div>
                  </div>

                  {/* I - Interesse */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border">
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1">
                        <span className="h-4 w-4 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-black">I</span>
                        Interesse
                      </div>
                      <div className="text-[10px] text-muted-foreground">O lead demonstrou interesse claro?</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateMinDimension('i', currentMin?.i === 1 ? null : 1)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                          currentMin?.i === 1 ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Sim (1)
                      </button>
                      <button
                        onClick={() => handleUpdateMinDimension('i', currentMin?.i === 0 ? null : 0)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                          currentMin?.i === 0 ? "bg-zinc-700 text-white border-zinc-700 shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Não (0)
                      </button>
                    </div>
                  </div>

                  {/* N - Necessidade */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border">
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1">
                        <span className="h-4 w-4 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-black">N</span>
                        Necessidade
                      </div>
                      <div className="text-[10px] text-muted-foreground">O lead possui urgência ou dor latente?</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateMinDimension('n', currentMin?.n === 1 ? null : 1)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                          currentMin?.n === 1 ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Sim (1)
                      </button>
                      <button
                        onClick={() => handleUpdateMinDimension('n', currentMin?.n === 0 ? null : 0)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                          currentMin?.n === 0 ? "bg-zinc-700 text-white border-zinc-700 shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Não (0)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* PESQUISAS RESPONDIDAS PELO LEAD */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-black uppercase text-foreground tracking-wider flex items-center gap-1.5">
                    <FileCheck className="h-3.5 w-3.5 text-primary" /> Pesquisas Respondidas
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {leadSurveyResponses.length} {leadSurveyResponses.length === 1 ? "pesquisa" : "pesquisas"}
                  </span>
                </div>

                {leadSurveyResponses.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      O lead respondeu a formulários de pesquisa de qualificação/diagnóstico.
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSurveyModal(true)}
                      className="w-full py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>Ver Respostas das Pesquisas</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    Nenhuma pesquisa de qualificação ou diagnóstico vinculada a este lead ainda.
                  </div>
                )}
              </div>

              {/* GRUPO 2: DADOS DO LEAD */}
              <div className="space-y-3">
                <div className="text-[11px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5 border-b border-border pb-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Dados do Lead
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Tipo</span>
                    <div className="font-bold text-foreground">{lead.personType || "Pessoa Jurídica (PJ)"}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {lead.personType === 'PF' ? "Renda / Remuneração" : "Faturamento"}
                    </span>
                    <div className="font-bold text-foreground">
                      {lead.revenue ? (typeof lead.revenue === 'number' ? formatCurrency(lead.revenue) : lead.revenue) : "-"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Empresa</span>
                    <div className="font-bold text-foreground truncate">{lead.company || "-"}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Cargo</span>
                    <div className="font-bold text-foreground truncate">{lead.role || "-"}</div>
                  </div>
                </div>
              </div>

              {/* GRUPO 3: DADOS COMERCIAIS */}
              <div className="space-y-3">
                <div className="text-[11px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5 border-b border-border pb-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-primary" /> Dados Comerciais
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Tempo Base</span>
                    <div className="font-bold text-foreground">{daysSinceCreation === 0 ? "Hoje" : `${daysSinceCreation} dias`}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Data de Entrada</span>
                    <div className="font-bold text-foreground">{formattedCreationDate}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Capag</span>
                    <div className="font-bold text-foreground">{lead.capag || "-"}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Último Contato</span>
                    <div className="font-bold text-foreground truncate">{lead.lastInteraction || "Sem contato"}</div>
                  </div>
                </div>

                {/* Responsável */}
                <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold">
                      {avatarInitials}
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Responsável</div>
                      <div className="text-xs font-bold text-foreground">{lead.owner || "Admin"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GRUPO 4: ORIGEM, LP & RECORRÊNCIA */}
              <div className="space-y-3">
                <div className="text-[11px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5 border-b border-border pb-1.5">
                  <Globe className="h-3.5 w-3.5 text-primary" /> Origem, LP & Recorrência
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Canal de Origem</span>
                    <div className="font-bold text-foreground">{lead.source || "Manual"}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Landing Page (LP)</span>
                    <div className="font-bold text-foreground truncate">{lead.landingPage || "-"}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Visitas a LPs</span>
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <span className="text-primary font-black text-sm">{lead.lpVisits || (lead.landingPage ? 1 : 0)}</span>
                      <span className="text-[10px] text-muted-foreground">visita(s) registrada(s)</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Status Comercial</span>
                    <div className="font-bold text-foreground">
                      {lead.isCustomer || lead.classification === 'Cliente' || lead.stage === 'Ganho' || lead.stage === 'Recebimento' ? (
                        <span className="text-emerald-500 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Cliente (Recorrência)
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Lead em Prospecção</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow & Checkpoints */}
              <div className="p-4 border-t border-border bg-muted/10 rounded-2xl space-y-3">
                <div className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-primary" /> Checklist da Etapa ({lead.stage})
                </div>

                {rules.length > 0 ? (
                  <div className="space-y-1.5">
                    {rules.map((r) => {
                      const isDone = completedCheckpoints.includes(r.text);
                      return (
                        <button key={r.id} onClick={() => toggleCheckpoint(r.text)} className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-card border border-transparent hover:border-border transition-all text-left shadow-sm">
                          <div className={cn("h-5 w-5 rounded-md border-2 grid place-items-center flex-shrink-0", isDone ? "bg-success border-success" : "border-border bg-muted")}>
                            {isDone && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className={cn("font-bold text-xs flex-1", isDone ? "line-through opacity-50" : "")}>{r.text}</span>
                          <div className={cn("shrink-0", r.mandatory ? "text-destructive" : "text-success")}>
                            {r.mandatory ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Nenhuma regra obrigatória cadastrada para esta etapa.</p>
                )}
                
                <div className="flex gap-2 pt-2">
                  {lead.stage !== "Perdido" && lead.stage !== "Ganho" && (
                    <button 
                      onClick={handleMarkLost}
                      className="flex-1 text-[10px] font-black uppercase py-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Ban className="h-3.5 w-3.5" /> Perder Lead
                    </button>
                  )}
                  {nextStage && (
                    <button 
                      onClick={handleAdvance} 
                      disabled={!allMandatoryDone && mandatoryRules.length > 0} 
                      className={cn(
                        "flex-2 text-[10px] font-black uppercase py-3 rounded-xl shadow-elegant transition-all", 
                        (allMandatoryDone || mandatoryRules.length === 0) ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground cursor-not-allowed"
                      )}
                    >
                      Avançar para {nextStage}
                    </button>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="p-5 space-y-6 pb-12">
              {/* HISTÓRICO DE MOVIMENTAÇÕES DE PIPELINE / FUNIS (JORNADA & AUDITORIA) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-muted/20 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-wider">
                    <Layers className="h-4 w-4" /> Jornada & Movimentações no Pipeline
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(true)}
                    className="text-[9px] font-black uppercase tracking-wider text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRightLeft className="h-3 w-3" /> Transferir Funil
                  </button>
                </div>

                {leadPipelineMovements.length === 0 ? (
                  <div className="p-3 bg-background/60 rounded-xl border border-border text-center">
                    <p className="text-xs text-muted-foreground">
                      Funil Atual: <strong className="text-foreground">{currentPipeline?.name || "Prospecção"}</strong> · Etapa: <strong className="text-foreground">{lead.stage}</strong>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Nenhuma transferência entre funis registrada até o momento.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leadPipelineMovements.map((mov, mIdx) => (
                      <div key={mov.id || mIdx} className="p-2.5 rounded-xl bg-background/80 border border-border/70 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <div className="flex items-center gap-1.5 text-foreground flex-wrap">
                            <span className="text-muted-foreground">{mov.fromPipelineName || "Origem"}</span>
                            <span className="text-xs font-semibold text-muted-foreground">({mov.fromStage})</span>
                            <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                            <span className="text-primary">{mov.toPipelineName || "Destino"}</span>
                            <span className="text-xs font-semibold text-primary">({mov.toStage})</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground shrink-0 font-medium">
                            {mov.timestamp ? new Date(mov.timestamp).toLocaleString('pt-BR') : "Recente"}
                          </span>
                        </div>
                        
                        {(mov.responsibleName || mov.reason) && (
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5 border-t border-border/40">
                            {mov.responsibleName && (
                              <span>Responsável: <strong className="text-foreground">{mov.responsibleName}</strong></span>
                            )}
                            {mov.reason && (
                              <span className="italic truncate max-w-[200px]" title={mov.reason}>"{mov.reason}"</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <textarea 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  placeholder="Escreva uma anotação ou registro de contato..." 
                  className="w-full bg-muted/40 border border-border rounded-2xl p-3.5 text-xs min-h-[90px] outline-none focus:border-primary" 
                />
                <button 
                  onClick={handleAddNote} 
                  className="absolute bottom-3 right-3 text-[10px] bg-primary text-primary-foreground px-3.5 py-1.5 rounded-xl font-bold uppercase shadow-sm hover:opacity-95"
                >
                  Registrar
                </button>
              </div>

              <div className="space-y-3 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-border">
                {(lead.activities || []).map((act) => (
                  <div key={act.id} className="relative pl-8">
                    <div className="absolute left-0 top-1.5 h-5 w-5 rounded-full border-2 border-background grid place-items-center z-10 bg-primary/20 text-primary">
                      {act.type === 'stage_change' ? <History className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                    </div>
                    <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-1">
                      <div className="text-xs font-semibold leading-relaxed">{act.description}</div>
                      <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase">
                        <span>{act.timestamp}</span>
                        <span>{act.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MODAL DE AGENDAMENTO GOOGLE AGENDA */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        lead={lead}
        existingEvent={lead.metadata?.calendarEvent}
      />

      {/* MODAL DE RESPOSTAS DE PESQUISAS */}
      {showSurveyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-foreground">
                    Respostas das Pesquisas — {lead.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Respostas fornecidas em pesquisas de qualificação e diagnóstico
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSurveyModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {leadSurveyResponses.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhuma resposta de pesquisa encontrada para este lead.
                </div>
              ) : (
                leadSurveyResponses.map((resp, rIdx) => {
                  const survey = surveys.find((s) => s.id === resp.survey_id || s.id === resp.surveyId);
                  const answersObj = resp.answers || {};
                  return (
                    <div
                      key={resp.id || rIdx}
                      className="p-4 rounded-xl border border-border bg-muted/20 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <div>
                          <div className="font-bold text-xs text-foreground flex items-center gap-2">
                            <span>{survey?.title || "Pesquisa do Lead"}</span>
                            {resp.minClassification && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-primary/20 text-primary border border-primary/30">
                                MIN: {resp.minClassification}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Respondido em: {resp.created_at || resp.createdAt || "Recente"}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        {survey?.questions?.map((q, qIdx) => {
                          const ans = answersObj[q.id] || answersObj[q.text] || "Não respondido";
                          return (
                            <div key={q.id || qIdx} className="p-2.5 rounded-lg bg-background border border-border/60">
                              <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 mb-1">
                                <span className="h-4 w-4 rounded bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center">
                                  {qIdx + 1}
                                </span>
                                <span>{q.text}</span>
                                {q.minDimension && (
                                  <span className="text-[9px] uppercase font-bold text-primary ml-auto">
                                    [{q.minDimension.toUpperCase()}]
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-semibold text-foreground pl-5">
                                {typeof ans === "object" ? JSON.stringify(ans) : String(ans)}
                              </div>
                            </div>
                          );
                        }) || (
                          <div className="space-y-1.5">
                            {Object.entries(answersObj).map(([k, v]) => (
                              <div key={k} className="p-2 rounded bg-background text-xs">
                                <strong className="text-muted-foreground">{k}:</strong>{" "}
                                <span className="font-semibold text-foreground">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-border bg-muted/20 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSurveyModal(false)}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE TRANSFERÊNCIA DE FUNIL */}
      <TransferLeadModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        lead={lead}
      />
    </>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "flex-1 py-3.5 text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all", 
        active ? "bg-background border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function StatCell({ label, className = "", children }: { label: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card border border-border p-2.5 shadow-sm">
      <div className="text-[9px] uppercase font-black text-muted-foreground">{label}</div>
      <div className={cn(className)}>{children}</div>
    </div>
  );
}
