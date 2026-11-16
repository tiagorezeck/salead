import React, { useState, useEffect } from "react";
import { 
  X, 
  GitFork, 
  CheckCircle2, 
  UserCheck, 
  Users, 
  Sparkles, 
  Inbox, 
  ArrowRight,
  ShieldAlert,
  Info,
  Layers,
  ArrowDownToLine
} from "lucide-react";
import { useData } from "@/hooks/use-data";
import { type LeadRoutingConfig, type LeadTargetRole } from "@/lib/lead-rules";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface LeadRoutingModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  onDistributed?: () => void;
}

export function LeadRoutingModal({ isOpen, open, onClose, onDistributed }: LeadRoutingModalProps) {
  const isModalOpen = Boolean(isOpen ?? open);
  const { pipelines, users, leads, leadRoutingConfig, updateLeadRoutingConfig, distributeLeadsByRoutingConfig } = useData();

  const [enabled, setEnabled] = useState<boolean>(leadRoutingConfig?.enabled ?? true);
  const [targetRole, setTargetRole] = useState<LeadTargetRole>(leadRoutingConfig?.targetRole || "LDR");
  const [targetPipelineId, setTargetPipelineId] = useState<string>(
    leadRoutingConfig?.targetPipelineId || "prospection"
  );
  const [targetStage, setTargetStage] = useState<string>(
    leadRoutingConfig?.targetStage || "Novo Lead"
  );
  const [distributionType, setDistributionType] = useState<'role_round_robin' | 'specific_user' | 'unassigned'>(
    leadRoutingConfig?.distributionType || "role_round_robin"
  );
  const [specificUserId, setSpecificUserId] = useState<string>(
    leadRoutingConfig?.specificUserId || (users[0]?.id || "")
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDistributing, setIsDistributing] = useState<boolean>(false);

  // Sincroniza estado quando o modal abre
  useEffect(() => {
    if (isModalOpen && leadRoutingConfig) {
      setEnabled(leadRoutingConfig.enabled ?? true);
      setTargetRole(leadRoutingConfig.targetRole || "LDR");
      setTargetPipelineId(leadRoutingConfig.targetPipelineId || "prospection");
      setTargetStage(leadRoutingConfig.targetStage || "Novo Lead");
      setDistributionType(leadRoutingConfig.distributionType || "role_round_robin");
      setSpecificUserId(leadRoutingConfig.specificUserId || (users[0]?.id || ""));
    }
  }, [isModalOpen, leadRoutingConfig, users]);

  // Contagem de leads sem dono ou em etapas iniciais na base
  const unassignedLeads = leads.filter(l => !l.owner || l.owner === "Sem dono" || l.owner === "Sem responsável");
  const eligibleInitialLeads = leads.filter(l => {
    const isUnassigned = !l.owner || l.owner === "Sem dono" || l.owner === "Sem responsável";
    const isInitial = l.stage === "Novo Lead" || l.stage === "Leads" || l.stage === "Sem Contato";
    return isUnassigned || isInitial;
  });

  if (!isModalOpen) return null;

  // Filtra ou busca funil correspondente à função
  const targetPipeline = pipelines.find(p => p.id === targetPipelineId) || pipelines[0];
  const stages = targetPipeline?.stages || [];

  // Ao trocar de função comercial (LDR, SDR, Seller, etc), sugere o funil apropriado
  const handleRoleSelect = (role: LeadTargetRole) => {
    setTargetRole(role);
    let matchedPipe = pipelines.find(p => p.functionRole?.toLowerCase() === role.toLowerCase() || p.code?.toLowerCase() === role.toLowerCase());
    if (!matchedPipe) {
      if (role === "LDR") matchedPipe = pipelines.find(p => p.id === "prospection") || pipelines[0];
      if (role === "SDR") matchedPipe = pipelines.find(p => p.id === "sdr") || pipelines[0];
      if (role === "Seller") matchedPipe = pipelines.find(p => p.id === "seller") || pipelines[0];
      if (role === "Hunter") matchedPipe = pipelines.find(p => p.id === "hunter") || pipelines[0];
      if (role === "Closer") matchedPipe = pipelines.find(p => p.id === "sales") || pipelines[0];
    }
    if (matchedPipe) {
      setTargetPipelineId(matchedPipe.id);
      if (matchedPipe.stages.length > 0) {
        setTargetStage(matchedPipe.stages[0].name);
      }
    }
  };

  const handlePipelineSelect = (pipeId: string) => {
    setTargetPipelineId(pipeId);
    const pipe = pipelines.find(p => p.id === pipeId);
    if (pipe && pipe.stages.length > 0) {
      setTargetStage(pipe.stages[0].name);
    }
  };

  // Usuários que correspondem ao papel selecionado (ou todos comerciais se não houver)
  const roleUsers = users.filter(u => {
    const r = u.role?.toLowerCase() || "";
    const tr = targetRole.toLowerCase();
    if (r.includes(tr)) return true;
    if (tr === "seller" && (r.includes("vendedor") || r.includes("comercial") || r.includes("closer"))) return true;
    if (tr === "ldr" && (r.includes("qualificador") || r.includes("prospector") || r.includes("inbound"))) return true;
    return false;
  });

  const specificUserObj = users.find(u => u.id === specificUserId) || users[0];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newConfig: LeadRoutingConfig = {
        enabled,
        targetRole,
        targetPipelineId,
        targetStage,
        distributionType,
        specificUserId: distributionType === "specific_user" ? specificUserId : undefined,
        specificUserName: distributionType === "specific_user" ? (specificUserObj?.name || "Usuário") : undefined,
        updatedAt: new Date().toISOString()
      };

      await updateLeadRoutingConfig(newConfig);
      toast.success("Regras de distribuição de novos leads salvas com sucesso!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar configuração de distribuição.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndDistribute = async () => {
    setIsDistributing(true);
    try {
      const newConfig: LeadRoutingConfig = {
        enabled,
        targetRole,
        targetPipelineId,
        targetStage,
        distributionType,
        specificUserId: distributionType === "specific_user" ? specificUserId : undefined,
        specificUserName: distributionType === "specific_user" ? (specificUserObj?.name || "Usuário") : undefined,
        updatedAt: new Date().toISOString()
      };

      await updateLeadRoutingConfig(newConfig);

      if (distributeLeadsByRoutingConfig) {
        const res = await distributeLeadsByRoutingConfig(undefined, newConfig);
        if (res && res.count > 0) {
          toast.success(`${res.count} leads distribuídos imediatamente com base na regra definida!`);
        }
      }

      if (onDistributed) onDistributed();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao distribuir leads.");
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <GitFork className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                Roteamento de Leads Entrantes
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                  Regra Ativa
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Defina quem recebe automaticamente novos leads que entram na base (LDR, SDR ou Seller)
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
          {/* Toggle Geral */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-foreground">
                Ativar Distribuição Automática de Leads Entrantes
              </span>
              <p className="text-xs text-muted-foreground">
                Quando novos leads forem cadastrados via LP, Planilha ou Webhook, rotear segundo esta regra
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>

          {/* 1. Escolha da Função Comercial */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              1. Para qual função comercial os novos leads devem ir?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["LDR", "SDR", "Seller"] as LeadTargetRole[]).map((role) => {
                const isSelected = targetRole === role;
                const roleDesc = 
                  role === "LDR" ? "Qualificação preliminar e higienização de contatos" :
                  role === "SDR" ? "Qualificação avançada MIN e agendamento consultivo" :
                  "Ciclo completo ponta a ponta: contato e fechamento";

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer",
                      isSelected
                        ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/30"
                        : "bg-card hover:bg-muted/40 border-border"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-black text-foreground">
                          {role}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-3">
                        {roleDesc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Opções adicionais de nicho */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-muted-foreground">Outras funções:</span>
              {(["Hunter", "Closer"] as LeadTargetRole[]).map((altRole) => (
                <button
                  key={altRole}
                  type="button"
                  onClick={() => handleRoleSelect(altRole)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer",
                    targetRole === altRole
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {altRole}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Seleção de Funil e Etapa de Entrada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Pipeline de Destino
              </label>
              <select
                value={targetPipelineId}
                onChange={(e) => handlePipelineSelect(e.target.value)}
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.functionRole ? `(${p.functionRole})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Etapa Inicial de Entrada
              </label>
              <select
                value={targetStage}
                onChange={(e) => setTargetStage(e.target.value)}
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {stages.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Como o Responsável deve ser atribuído */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              2. Como escolher quem receberá o lead?
            </label>

            <div className="space-y-2.5">
              {/* Opção A: Roleta / Round Robin entre usuários da função */}
              <label
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                  distributionType === "role_round_robin"
                    ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                    : "bg-card border-border hover:bg-muted/30"
                )}
              >
                <input
                  type="radio"
                  name="distributionType"
                  value="role_round_robin"
                  checked={distributionType === "role_round_robin"}
                  onChange={() => setDistributionType("role_round_robin")}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Distribuir entre todos os membros da função {targetRole} (Roleta / Round-Robin)
                    </span>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Alterna de forma justa e igualitária entre todos os colaboradores cadastrados como {targetRole}.
                    {roleUsers.length > 0 ? (
                      <span className="text-foreground font-medium block mt-1">
                        Membros ativos identificados ({roleUsers.length}): {roleUsers.map(u => u.name).join(", ")}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 block mt-1">
                        * Nenhum usuário com cargo exclusivo de {targetRole} encontrado. O sistema distribuirá entre a equipe comercial ativa.
                      </span>
                    )}
                  </p>
                </div>
              </label>

              {/* Opção B: Usuário Específico */}
              <label
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                  distributionType === "specific_user"
                    ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                    : "bg-card border-border hover:bg-muted/30"
                )}
              >
                <input
                  type="radio"
                  name="distributionType"
                  value="specific_user"
                  checked={distributionType === "specific_user"}
                  onChange={() => setDistributionType("specific_user")}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex-1 space-y-2">
                  <div>
                    <span className="text-xs font-bold text-foreground">
                      Atribuir sempre a um usuário fixo
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Todos os novos leads recebidos serão direcionados diretamente para o colaborador escolhido.
                    </p>
                  </div>

                  {distributionType === "specific_user" && (
                    <select
                      value={specificUserId}
                      onChange={(e) => setSpecificUserId(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role || "Comercial"}) - {u.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>

              {/* Opção C: Fila Aberta / Sem Responsável */}
              <label
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                  distributionType === "unassigned"
                    ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                    : "bg-card border-border hover:bg-muted/30"
                )}
              >
                <input
                  type="radio"
                  name="distributionType"
                  value="unassigned"
                  checked={distributionType === "unassigned"}
                  onChange={() => setDistributionType("unassigned")}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Fila Aberta ("Sem responsável" / Piscina de Leads)
                    </span>
                    <Inbox className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    O lead entra no funil selecionado sem vendedor atribuído, ficando liberado para qualquer membro da equipe buscar e puxar para seu pipeline.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Resumo visual da regra */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-foreground block">
                Resumo da Automação de Entrada:
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Novo lead entra na base → Destinado ao <strong>{targetRole}</strong> no funil{" "}
                <strong>{targetPipeline?.name}</strong> (etapa <strong>"{targetStage}"</strong>) →{" "}
                {distributionType === "role_round_robin" && (
                  <span>Distribuído em <strong>roleta alternada</strong> entre os membros da função.</span>
                )}
                {distributionType === "specific_user" && (
                  <span>Atribuído diretamente para <strong>{specificUserObj?.name}</strong>.</span>
                )}
                {distributionType === "unassigned" && (
                  <span>Entra na <strong>fila aberta (sem dono)</strong> pronto para a equipe pescar.</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{eligibleInitialLeads.length}</span> leads sem dono ou iniciais na base
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAndDistribute}
              disabled={isSaving || isDistributing || eligibleInitialLeads.length === 0}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Salva as regras e distribui imediatamente os leads que estão sem dono ou em etapas iniciais"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isDistributing ? "Distribuindo..." : `Salvar e Distribuir Agora (${eligibleInitialLeads.length})`}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isDistributing}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-elegant flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "Salvando..." : "Salvar Apenas Regras"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
