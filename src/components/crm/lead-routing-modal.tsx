import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  GitFork, 
  CheckCircle2, 
  UserCheck, 
  Users, 
  Sparkles, 
  Inbox, 
  Info,
  Flame,
  Shuffle,
  Sliders,
  Scale,
  Plus,
  Minus
} from "lucide-react";
import { useData } from "@/hooks/use-data";
import {
  DEFAULT_TEMPERATURE_RULES,
  getDefaultPipelineIdForRole,
  getMatchingUsersForRole,
  type LeadDistributionType,
  type LeadRoutingConfig,
  type LeadRoutingMode,
  type LeadTargetRole,
  type TemperatureRoutingTarget
} from "@/lib/lead-rules";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface LeadRoutingModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  onDistributed?: () => void;
}

const PRIMARY_ROLES: Array<{ role: LeadTargetRole; label: string; desc: string }> = [
  { role: "LDR", label: "LDR", desc: "Higienização e qualificação inicial (Frio/Topo)" },
  { role: "BDR", label: "BDR", desc: "Prospecção ativa outbound e cadência (Morno)" },
  { role: "SDR", label: "SDR", desc: "Qualificação MIN e agendamento consultivo (Quente)" },
  { role: "Seller", label: "Seller", desc: "Ciclo completo ponta a ponta" },
  { role: "Hunter", label: "Hunter", desc: "Contas estratégicas e High Ticket" },
  { role: "Closer", label: "Closer", desc: "Negociação e fechamento direto" },
];

export function LeadRoutingModal({ isOpen, open, onClose, onDistributed }: LeadRoutingModalProps) {
  const isModalOpen = Boolean(isOpen ?? open);
  const { pipelines, users, leads, leadRoutingConfig, updateLeadRoutingConfig, distributeLeadsByRoutingConfig } = useData();

  const [enabled, setEnabled] = useState<boolean>(leadRoutingConfig?.enabled ?? true);
  const [routingMode, setRoutingMode] = useState<LeadRoutingMode>(leadRoutingConfig?.routingMode || "single_role");
  const [targetRole, setTargetRole] = useState<LeadTargetRole>(leadRoutingConfig?.targetRole || "SDR");
  const [targetPipelineId, setTargetPipelineId] = useState<string>(
    leadRoutingConfig?.targetPipelineId || "sdr"
  );
  const [targetStage, setTargetStage] = useState<string>(
    leadRoutingConfig?.targetStage || "Lead/Oportunidade Recebida"
  );
  const [distributionType, setDistributionType] = useState<LeadDistributionType>(
    leadRoutingConfig?.distributionType || "role_round_robin"
  );
  const [specificUserId, setSpecificUserId] = useState<string>(
    leadRoutingConfig?.specificUserId || (users[0]?.id || "")
  );
  const [memberQuotas, setMemberQuotas] = useState<Record<string, number>>(
    leadRoutingConfig?.memberQuotas || {}
  );
  const [randomRoleTargets, setRandomRoleTargets] = useState<LeadTargetRole[]>(
    leadRoutingConfig?.randomRoleTargets && leadRoutingConfig.randomRoleTargets.length > 0
      ? leadRoutingConfig.randomRoleTargets
      : ["LDR", "SDR", "BDR"]
  );
  const [temperatureRules, setTemperatureRules] = useState<NonNullable<LeadRoutingConfig["temperatureRules"]>>(
    leadRoutingConfig?.temperatureRules || DEFAULT_TEMPERATURE_RULES
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDistributing, setIsDistributing] = useState<boolean>(false);

  useEffect(() => {
    if (isModalOpen && leadRoutingConfig) {
      setEnabled(leadRoutingConfig.enabled ?? true);
      setRoutingMode(leadRoutingConfig.routingMode || "single_role");
      setTargetRole(leadRoutingConfig.targetRole || "SDR");
      setTargetPipelineId(leadRoutingConfig.targetPipelineId || "sdr");
      setTargetStage(leadRoutingConfig.targetStage || "Lead/Oportunidade Recebida");
      setDistributionType(leadRoutingConfig.distributionType || "role_round_robin");
      setSpecificUserId(leadRoutingConfig.specificUserId || (users[0]?.id || ""));
      setMemberQuotas(leadRoutingConfig.memberQuotas || {});
      setRandomRoleTargets(
        leadRoutingConfig.randomRoleTargets && leadRoutingConfig.randomRoleTargets.length > 0
          ? leadRoutingConfig.randomRoleTargets
          : ["LDR", "SDR", "BDR"]
      );
      setTemperatureRules({
        ...DEFAULT_TEMPERATURE_RULES,
        ...(leadRoutingConfig.temperatureRules || {}),
      });
    }
  }, [isModalOpen, leadRoutingConfig, users]);

  const eligibleInitialLeads = useMemo(() => {
    return leads.filter((l) => {
      const isUnassigned = !l.owner || l.owner === "Sem dono" || l.owner === "Sem responsável";
      const isInitial = l.stage === "Novo Lead" || l.stage === "Leads" || l.stage === "Sem Contato";
      return isUnassigned || isInitial;
    });
  }, [leads]);

  const roleUsers = useMemo(() => {
    if (routingMode === "single_role") {
      return getMatchingUsersForRole(users, targetRole);
    }
    if (routingMode === "random_role") {
      const map = new Map<string, (typeof users)[number]>();
      randomRoleTargets.forEach((r) => {
        getMatchingUsersForRole(users, r).forEach((u) => map.set(u.id, u));
      });
      return Array.from(map.values());
    }
    const map = new Map<string, (typeof users)[number]>();
    (["Quente", "Morno", "Frio"] as const).forEach((t) => {
      getMatchingUsersForRole(users, temperatureRules[t].targetRole).forEach((u) => map.set(u.id, u));
    });
    return Array.from(map.values());
  }, [users, routingMode, targetRole, randomRoleTargets, temperatureRules]);

  if (!isModalOpen) return null;

  const targetPipeline = pipelines.find((p) => p.id === targetPipelineId) || pipelines[0];
  const stages = targetPipeline?.stages || [];
  const specificUserObj = users.find((u) => u.id === specificUserId) || users[0];

  const handleRoleSelect = (role: LeadTargetRole) => {
    setTargetRole(role);
    const pipeId = getDefaultPipelineIdForRole(role, pipelines);
    const matchedPipe = pipelines.find((p) => p.id === pipeId) || pipelines[0];
    if (matchedPipe) {
      setTargetPipelineId(matchedPipe.id);
      if (matchedPipe.stages.length > 0) {
        setTargetStage(matchedPipe.stages[0].name);
      }
    }
  };

  const handlePipelineSelect = (pipeId: string) => {
    setTargetPipelineId(pipeId);
    const pipe = pipelines.find((p) => p.id === pipeId);
    if (pipe && pipe.stages.length > 0) {
      setTargetStage(pipe.stages[0].name);
    }
  };

  const updateTempRule = (
    tempKey: "Quente" | "Morno" | "Frio",
    updates: Partial<TemperatureRoutingTarget>
  ) => {
    setTemperatureRules((prev) => {
      const current = prev[tempKey];
      const next = { ...current, ...updates };
      if (updates.targetRole && !updates.targetPipelineId) {
        const autoPipeId = getDefaultPipelineIdForRole(updates.targetRole, pipelines);
        const autoPipe = pipelines.find((p) => p.id === autoPipeId) || pipelines[0];
        next.targetPipelineId = autoPipe?.id || autoPipeId;
        next.targetStage = autoPipe?.stages?.[0]?.name || "Novo Lead";
      } else if (updates.targetPipelineId && !updates.targetStage) {
        const pipe = pipelines.find((p) => p.id === updates.targetPipelineId);
        next.targetStage = pipe?.stages?.[0]?.name || "Novo Lead";
      }
      return { ...prev, [tempKey]: next };
    });
  };

  const toggleRandomRole = (role: LeadTargetRole) => {
    setRandomRoleTargets((prev) => {
      if (prev.includes(role)) {
        return prev.length > 1 ? prev.filter((r) => r !== role) : prev;
      }
      return [...prev, role];
    });
  };

  const changeQuota = (memberKey: string, delta: number) => {
    setMemberQuotas((prev) => {
      const cur = Math.max(0, Math.min(20, Number(prev[memberKey] ?? 1)));
      return { ...prev, [memberKey]: Math.max(0, Math.min(20, cur + delta)) };
    });
  };

  const buildConfig = (): LeadRoutingConfig => ({
    ...(leadRoutingConfig || {}),
    enabled,
    routingMode,
    targetRole,
    targetPipelineId,
    targetStage,
    distributionType,
    specificUserId: distributionType === "specific_user" ? specificUserId : undefined,
    specificUserName: distributionType === "specific_user" ? specificUserObj?.name || "Usuário" : undefined,
    memberQuotas,
    randomRoleTargets,
    temperatureRules,
    updatedAt: new Date().toISOString(),
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateLeadRoutingConfig(buildConfig());
      toast.success("Regras detalhadas de automação salvas com sucesso!");
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
      const newConfig = buildConfig();
      await updateLeadRoutingConfig(newConfig);

      if (distributeLeadsByRoutingConfig) {
        await distributeLeadsByRoutingConfig(undefined, newConfig);
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

  const activeQuotaUsers = roleUsers.length > 0 ? roleUsers : users.filter((u) => u.status !== "Inativo");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <GitFork className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                Automação &amp; Roteamento de Leads
                <span className={cn(
                  "text-[10px] uppercase font-black px-2 py-0.5 rounded-full",
                  enabled ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
                )}>
                  {enabled ? "Ativa" : "Pausada"}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Direcione por função (LDR, SDR, BDR, Seller), por temperatura (Quente/Morno/Frio) ou aleatório, com divisão detalhada entre membros.
              </p>
            </div>
          </div>
          <button
            type="button"
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
                Ativar Automação de Encaminhamento de Leads Entrantes
              </span>
              <p className="text-xs text-muted-foreground">
                Aplica automaticamente estas regras para leads vindos de LPs, Agendamentos, Pesquisas ou Importação.
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

          {/* 1. Modo de Encaminhamento */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-primary" />
              1. Estratégia de Destino (Para onde o lead vai?)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRoutingMode("single_role")}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-1",
                  routingMode === "single_role"
                    ? "bg-primary/10 border-primary ring-1 ring-primary/30"
                    : "bg-card border-border hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" /> Função Específica
                  </span>
                  {routingMode === "single_role" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Envia sempre para LDR, SDR, BDR, Seller ou Closer em um funil definido.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRoutingMode("temperature_rules")}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-1",
                  routingMode === "temperature_rules"
                    ? "bg-primary/10 border-primary ring-1 ring-primary/30"
                    : "bg-card border-border hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-orange-500" /> Por Temperatura
                  </span>
                  {routingMode === "temperature_rules" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Quente → SDR, Morno → BDR, Frio → LDR (ou personalize cada faixa).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRoutingMode("random_role")}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-1",
                  routingMode === "random_role"
                    ? "bg-primary/10 border-primary ring-1 ring-primary/30"
                    : "bg-card border-border hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Shuffle className="h-3.5 w-3.5 text-purple-500" /> Aleatório (Funções)
                  </span>
                  {routingMode === "random_role" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Sorteia entre as funções marcadas (ex.: LDR, SDR, BDR).
                </p>
              </button>
            </div>
          </div>

          {/* 1A: MODO FUNÇÃO ÚNICA */}
          {routingMode === "single_role" && (
            <div className="space-y-4 p-4 rounded-2xl bg-muted/20 border border-border">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PRIMARY_ROLES.map(({ role, label, desc }) => {
                  const isSelected = targetRole === role;
                  const countInRole = getMatchingUsersForRole(users, role).length;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleSelect(role)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                        isSelected
                          ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/30"
                          : "bg-card hover:bg-muted/40 border-border"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-foreground">{label}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {countInRole} ativo{countInRole === 1 ? "" : "s"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Pipeline de Destino</label>
                  <select
                    value={targetPipelineId}
                    onChange={(e) => handlePipelineSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {pipelines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.functionRole ? `(${p.functionRole})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Etapa Inicial de Entrada</label>
                  <select
                    value={targetStage}
                    onChange={(e) => setTargetStage(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {stages.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 1B: MODO POR TEMPERATURA */}
          {routingMode === "temperature_rules" && (
            <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Mapeamento por Temperatura do Lead
                </span>
                <button
                  type="button"
                  onClick={() => setTemperatureRules(DEFAULT_TEMPERATURE_RULES)}
                  className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Restaurar Padrão (Quente→SDR · Morno→BDR · Frio→LDR)
                </button>
              </div>

              {(["Quente", "Morno", "Frio"] as const).map((tempKey) => {
                const rule = temperatureRules[tempKey] || DEFAULT_TEMPERATURE_RULES[tempKey];
                const tempPipe = pipelines.find((p) => p.id === rule.targetPipelineId) || pipelines[0];
                const badgeClass =
                  tempKey === "Quente"
                    ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                    : tempKey === "Morno"
                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                    : "bg-blue-500/15 text-blue-500 border-blue-500/30";

                return (
                  <div
                    key={tempKey}
                    className="grid grid-cols-1 md:grid-cols-[110px_120px_1fr_1fr] gap-2.5 items-center p-3 rounded-xl bg-card border border-border"
                  >
                    <span className={cn("px-2.5 py-1 rounded-lg text-[11px] font-black uppercase text-center border", badgeClass)}>
                      {tempKey}
                    </span>

                    <select
                      value={rule.targetRole}
                      onChange={(e) => updateTempRule(tempKey, { targetRole: e.target.value as LeadTargetRole })}
                      className="px-2.5 py-1.5 bg-muted/40 border border-border rounded-lg text-xs font-bold"
                    >
                      {PRIMARY_ROLES.map((r) => (
                        <option key={r.role} value={r.role}>{r.label}</option>
                      ))}
                    </select>

                    <select
                      value={rule.targetPipelineId}
                      onChange={(e) => updateTempRule(tempKey, { targetPipelineId: e.target.value })}
                      className="px-2.5 py-1.5 bg-muted/40 border border-border rounded-lg text-xs font-medium"
                    >
                      {pipelines.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    <select
                      value={rule.targetStage}
                      onChange={(e) => updateTempRule(tempKey, { targetStage: e.target.value })}
                      className="px-2.5 py-1.5 bg-muted/40 border border-border rounded-lg text-xs font-medium"
                    >
                      {(tempPipe?.stages || []).map((st) => (
                        <option key={st.name} value={st.name}>{st.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

          {/* 1C: MODO ALEATÓRIO ENTRE FUNÇÕES */}
          {routingMode === "random_role" && (
            <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border">
              <div className="text-xs font-bold text-foreground">
                Selecione quais funções participam do sorteio aleatório a cada novo lead:
              </div>
              <div className="flex flex-wrap gap-2">
                {PRIMARY_ROLES.map(({ role, label }) => {
                  const selected = randomRoleTargets.includes(role);
                  const countInRole = getMatchingUsersForRole(users, role).length;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRandomRole(role)}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer",
                        selected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>{label}</span>
                      <span className="text-[10px] opacity-80">({countInRole})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Como dividir quando houver mais de 1 membro na função */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              2. Se houver mais de um {routingMode === "single_role" ? targetRole : "membro na função"}, como dividir?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  id: "role_round_robin" as LeadDistributionType,
                  title: "Sistemática 1-por-1 (Roleta Alternada)",
                  desc: "1 lead para o primeiro, 1 para o segundo, sucessivamente.",
                  icon: Sparkles,
                },
                {
                  id: "weighted_quota" as LeadDistributionType,
                  title: "Quantidade Personalizada por Membro",
                  desc: "Define quantos leads seguidos cada colaborador recebe no ciclo.",
                  icon: Scale,
                },
                {
                  id: "random_member" as LeadDistributionType,
                  title: "Aleatório entre os Membros",
                  desc: "Sorteia aleatoriamente um membro ativo da função destino.",
                  icon: Shuffle,
                },
                {
                  id: "least_loaded" as LeadDistributionType,
                  title: "Menor Carteira (Balanceado)",
                  desc: "Prioriza quem tem menos leads em atendimento aberto no momento.",
                  icon: Users,
                },
                {
                  id: "specific_user" as LeadDistributionType,
                  title: "Usuário Fixo Específico",
                  desc: "Direciona todos os leads para um único colaborador selecionado.",
                  icon: UserCheck,
                },
                {
                  id: "unassigned" as LeadDistributionType,
                  title: "Fila Aberta (Sem Responsável)",
                  desc: "Entra no funil sem dono para qualquer membro puxar.",
                  icon: Inbox,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = distributionType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDistributionType(opt.id)}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                      active
                        ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                        : "bg-card border-border hover:bg-muted/30"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground">{opt.title}</div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sub-configuração: Quantidade por Membro */}
            {distributionType === "weighted_quota" && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2.5">
                <div className="text-xs font-bold text-foreground">
                  Cota de leads por ciclo para cada membro ativo:
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {activeQuotaUsers.map((u) => {
                    const key = u.id || u.name;
                    const quota = Number(memberQuotas[key] ?? 1);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{u.name}</div>
                          <div className="text-[10px] text-muted-foreground">{u.role}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => changeQuota(key, -1)}
                            className="h-6 w-6 rounded-md border border-border grid place-items-center hover:bg-muted cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center font-mono text-xs font-black tabular-nums">
                            {quota}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQuota(key, 1)}
                            className="h-6 w-6 rounded-md border border-border grid place-items-center hover:bg-muted cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-configuração: Usuário Fixo */}
            {distributionType === "specific_user" && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border">
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
              </div>
            )}
          </div>

          {/* Resumo visual */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-foreground block">
                Prévia da Regra Configurada ({roleUsers.length} colaboradores elegíveis):
              </span>
              <p className="text-muted-foreground leading-relaxed">
                {routingMode === "single_role" && (
                  <>
                    Destino: <strong>{targetRole}</strong> no funil <strong>{targetPipeline?.name}</strong> (etapa <strong>"{targetStage}"</strong>).{" "}
                  </>
                )}
                {routingMode === "temperature_rules" && (
                  <>
                    Quente → <strong>{temperatureRules.Quente.targetRole}</strong> · Morno → <strong>{temperatureRules.Morno.targetRole}</strong> · Frio → <strong>{temperatureRules.Frio.targetRole}</strong>.{" "}
                  </>
                )}
                {routingMode === "random_role" && (
                  <>
                    Sorteio aleatório entre: <strong>{randomRoleTargets.join(", ")}</strong>.{" "}
                  </>
                )}
                Divisão: <strong>
                  {distributionType === "role_round_robin" && "Sistemática 1-por-1"}
                  {distributionType === "weighted_quota" && "Quantidade personalizada por membro"}
                  {distributionType === "random_member" && "Aleatória entre membros"}
                  {distributionType === "least_loaded" && "Menor carteira ativa"}
                  {distributionType === "specific_user" && `Fixo em ${specificUserObj?.name || "usuário"}`}
                  {distributionType === "unassigned" && "Fila aberta (sem responsável)"}
                </strong>
                {roleUsers.length > 0 && ` · Equipe: ${roleUsers.map((u) => u.name).join(", ")}.`}
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
              {isSaving ? "Salvando..." : "Salvar Regras"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
