import { DEFAULT_PIPELINES, ROLES, type Lead, type Pipeline, type Temperature, type User } from "@/data/mock";

export type LeadTargetRole = 'LDR' | 'SDR' | 'BDR' | 'Seller' | 'Hunter' | 'Closer' | 'Onboarding' | 'Qualquer';

export type LeadRoutingMode = 'single_role' | 'temperature_rules' | 'random_role';

export type LeadDistributionType =
  | 'role_round_robin'
  | 'random_member'
  | 'weighted_quota'
  | 'least_loaded'
  | 'specific_user'
  | 'unassigned';

export interface TemperatureRoutingTarget {
  targetRole: LeadTargetRole;
  targetPipelineId: string;
  targetStage: string;
}

export interface LeadRoutingConfig {
  enabled: boolean;
  routingMode?: LeadRoutingMode;
  targetRole: LeadTargetRole;
  targetPipelineId: string;
  targetStage: string;
  distributionType: LeadDistributionType;
  specificUserId?: string;
  specificUserName?: string;
  memberQuotas?: Record<string, number>;
  randomRoleTargets?: LeadTargetRole[];
  temperatureRules?: {
    Quente: TemperatureRoutingTarget;
    Morno: TemperatureRoutingTarget;
    Frio: TemperatureRoutingTarget;
  };
  roleCursors?: Record<string, number>;
  lastAssignedIndex?: number;
  updatedAt?: string;
}

export const DEFAULT_TEMPERATURE_RULES: NonNullable<LeadRoutingConfig['temperatureRules']> = {
  Quente: {
    targetRole: 'SDR',
    targetPipelineId: 'sdr',
    targetStage: 'Lead/Oportunidade Recebida',
  },
  Morno: {
    targetRole: 'BDR',
    targetPipelineId: 'bdr',
    targetStage: 'Prospect Alvo',
  },
  Frio: {
    targetRole: 'LDR',
    targetPipelineId: 'prospection',
    targetStage: 'Novo Lead',
  },
};

export const DEFAULT_LEAD_ROUTING_CONFIG: LeadRoutingConfig = {
  enabled: true,
  routingMode: 'single_role',
  targetRole: 'SDR',
  targetPipelineId: 'sdr',
  targetStage: 'Lead/Oportunidade Recebida',
  distributionType: 'role_round_robin',
  memberQuotas: {},
  randomRoleTargets: ['LDR', 'SDR', 'BDR'],
  temperatureRules: DEFAULT_TEMPERATURE_RULES,
  roleCursors: {},
  updatedAt: new Date().toISOString(),
};

export function normalizeRoleName(role?: string): string {
  return String(role || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getMatchingUsersForRole<T extends { id?: string; name?: string; role?: string; status?: string }>(
  users: T[],
  targetRole: LeadTargetRole | string
): T[] {
  const activeUsers = (users || []).filter(
    (u) => u && u.status !== 'Inativo' && u.status !== 'Bloqueado' && u.status !== 'Pendente'
  );
  const tr = normalizeRoleName(targetRole);
  if (!tr || tr === 'qualquer') {
    const operational = activeUsers.filter((u) => !normalizeRoleName(u.role).includes('desenvolvedor'));
    return operational.length > 0 ? operational : activeUsers;
  }

  return activeUsers.filter((u) => {
    const r = normalizeRoleName(u.role);
    if (!r) return false;
    if (r === tr || r.includes(tr)) return true;
    if (tr === 'seller' && (r.includes('vendedor') || r.includes('comercial') || r.includes('closer') || r.includes('full stack'))) return true;
    if (tr === 'closer' && (r.includes('fechamento') || r.includes('full stack'))) return true;
    if (tr === 'ldr' && (r.includes('qualificador') || r.includes('prospector') || r.includes('inbound'))) return true;
    if (tr === 'bdr' && (r.includes('outbound') || r.includes('prospector'))) return true;
    if (tr === 'sdr' && (r.includes('agend') || r.includes('discovery'))) return true;
    if (tr === 'onboarding' && (r.includes('implantacao') || r.includes('cs'))) return true;
    return false;
  });
}

export function getDefaultPipelineIdForRole(role: LeadTargetRole | string, pipelines: Pipeline[]): string {
  const norm = normalizeRoleName(role);
  const exact = pipelines.find((p) => normalizeRoleName(p.functionRole) === norm);
  if (exact) return exact.id;
  if (norm === 'ldr') return pipelines.find((p) => p.id === 'prospection')?.id || pipelines[0]?.id || 'prospection';
  if (norm === 'bdr') return pipelines.find((p) => p.id === 'bdr')?.id || pipelines[0]?.id || 'bdr';
  if (norm === 'sdr') return pipelines.find((p) => p.id === 'sdr')?.id || pipelines[0]?.id || 'sdr';
  if (norm === 'closer') return pipelines.find((p) => p.id === 'sales')?.id || pipelines[0]?.id || 'sales';
  if (norm === 'seller' || norm.includes('full stack')) return pipelines.find((p) => p.id === 'seller')?.id || pipelines[0]?.id || 'seller';
  if (norm === 'hunter') return pipelines.find((p) => p.id === 'hunter')?.id || pipelines[0]?.id || 'hunter';
  if (norm === 'onboarding') return pipelines.find((p) => p.id === 'execution')?.id || pipelines[0]?.id || 'execution';
  return pipelines[0]?.id || 'sdr';
}

export function getEffectiveEnabledRolesForPipeline(pipeline: Pipeline): string[] {
  if (Array.isArray(pipeline.enabledRoles)) {
    return pipeline.enabledRoles;
  }
  const base: string[] = [];
  if (pipeline.functionRole) {
    base.push(String(pipeline.functionRole));
  }
  const fn = normalizeRoleName(pipeline.functionRole);
  if (fn === 'seller' && !base.includes('Full Stack Seller')) {
    base.push('Full Stack Seller');
  }
  if (fn === 'closer' && !base.includes('Full Stack Seller')) {
    base.push('Full Stack Seller');
  }
  return base;
}

export function isRoleEnabledOnPipeline(pipeline: Pipeline, role?: string): boolean {
  if (!role) return true;
  const norm = normalizeRoleName(role);
  if (
    norm === 'admin geral' ||
    norm === 'admin' ||
    norm === 'head of sales' ||
    norm === 'team leader' ||
    norm === 'gestor'
  ) {
    return true;
  }
  const enabledList = getEffectiveEnabledRolesForPipeline(pipeline);
  if (enabledList.length === 0) {
    return !Array.isArray(pipeline.enabledRoles);
  }
  return enabledList.some((r) => normalizeRoleName(r) === norm);
}

export function enableRoleInPipelinesList(pipelines: Pipeline[], role?: string): Pipeline[] {
  if (!role || !role.trim()) return pipelines;
  const trimmedRole = role.trim();
  const normRole = normalizeRoleName(trimmedRole);
  if (
    normRole === 'admin geral' ||
    normRole === 'admin' ||
    normRole === 'gestor'
  ) {
    return pipelines;
  }

  const baseList: Pipeline[] =
    Array.isArray(pipelines) && pipelines.length > 0 ? pipelines : DEFAULT_PIPELINES;

  let matchedAny = false;
  const updated = baseList.map((pipe) => {
    const pipeRole = normalizeRoleName(pipe.functionRole);
    const isMatch =
      (pipeRole && (pipeRole === normRole || normRole.includes(pipeRole) || pipeRole.includes(normRole))) ||
      (normRole === 'full stack seller' && (pipe.id === 'seller' || pipe.id === 'sales' || pipe.id === 'sdr')) ||
      (normRole === 'ldr' && pipe.id === 'prospection') ||
      (normRole === 'closer' && pipe.id === 'sales') ||
      (normRole === 'onboarding' && pipe.id === 'execution');

    if (!isMatch) return pipe;
    matchedAny = true;

    const currentEnabled = getEffectiveEnabledRolesForPipeline(pipe);
    const alreadyHas = currentEnabled.some((r) => normalizeRoleName(r) === normRole);
    const nextEnabled = alreadyHas ? currentEnabled : [...currentEnabled, trimmedRole];

    return {
      ...pipe,
      active: true,
      enabledRoles: nextEnabled,
    };
  });

  if (!matchedAny && ROLES.includes(trimmedRole as any) && updated.length > 0) {
    // Caso seja um cargo operacional genérico sem funil exclusivo, habilita no funil comercial principal (SDR / Seller)
    const fallbackIdx = updated.findIndex((p) => p.id === 'sdr' || p.id === 'seller' || p.id === 'prospection');
    const targetIdx = fallbackIdx >= 0 ? fallbackIdx : 0;
    const targetPipe = updated[targetIdx];
    const currentEnabled = getEffectiveEnabledRolesForPipeline(targetPipe);
    if (!currentEnabled.some((r) => normalizeRoleName(r) === normRole)) {
      updated[targetIdx] = {
        ...targetPipe,
        active: true,
        enabledRoles: [...currentEnabled, trimmedRole],
      };
    }
  }

  return updated;
}

export interface ResolveRoutingResult {
  targetRole: LeadTargetRole;
  targetPipelineId: string;
  targetStage: string;
  assignedOwner: string;
  routingReason: string;
  nextLastAssignedIndex: number;
  nextRoleCursors: Record<string, number>;
}

export function resolveLeadRoutingAssignment({
  config,
  leadData,
  pipelines,
  users,
  existingLeads = [],
}: {
  config?: LeadRoutingConfig;
  leadData?: { temperature?: Temperature | string; name?: string; stage?: string; pipelineId?: string };
  pipelines: Pipeline[];
  users: Array<Pick<User, 'id' | 'name' | 'role' | 'status'>>;
  existingLeads?: Lead[];
}): ResolveRoutingResult {
  const cfg: LeadRoutingConfig = {
    ...DEFAULT_LEAD_ROUTING_CONFIG,
    ...(config || {}),
    temperatureRules: {
      ...DEFAULT_TEMPERATURE_RULES,
      ...(config?.temperatureRules || {}),
    },
    roleCursors: { ...(config?.roleCursors || {}) },
    memberQuotas: { ...(config?.memberQuotas || {}) },
  };

  const mode: LeadRoutingMode = cfg.routingMode || 'single_role';
  let chosenRole: LeadTargetRole = cfg.targetRole || 'SDR';
  let chosenPipelineId = cfg.targetPipelineId || getDefaultPipelineIdForRole(chosenRole, pipelines);
  let chosenStage = cfg.targetStage || '';
  let routingReason = `Regra fixa: ${chosenRole}`;

  if (mode === 'temperature_rules') {
    const rawTemp = normalizeRoleName(leadData?.temperature || 'Frio');
    const tempKey: 'Quente' | 'Morno' | 'Frio' =
      rawTemp.includes('quente') || rawTemp.includes('hot')
        ? 'Quente'
        : rawTemp.includes('morno') || rawTemp.includes('warm')
        ? 'Morno'
        : 'Frio';
    const tempRule = cfg.temperatureRules?.[tempKey] || DEFAULT_TEMPERATURE_RULES[tempKey];
    chosenRole = tempRule.targetRole || DEFAULT_TEMPERATURE_RULES[tempKey].targetRole;
    chosenPipelineId =
      tempRule.targetPipelineId || getDefaultPipelineIdForRole(chosenRole, pipelines);
    chosenStage = tempRule.targetStage || '';
    routingReason = `Temperatura ${tempKey} → ${chosenRole}`;
  } else if (mode === 'random_role') {
    const rolePool: LeadTargetRole[] =
      Array.isArray(cfg.randomRoleTargets) && cfg.randomRoleTargets.length > 0
        ? cfg.randomRoleTargets
        : ['LDR', 'SDR', 'BDR'];
    chosenRole = rolePool[Math.floor(Math.random() * rolePool.length)] || 'SDR';
    chosenPipelineId = getDefaultPipelineIdForRole(chosenRole, pipelines);
    chosenStage = '';
    routingReason = `Sorteio aleatório entre funções (${rolePool.join(', ')}) → ${chosenRole}`;
  }

  const destPipeline =
    pipelines.find((p) => p.id === chosenPipelineId) ||
    pipelines.find((p) => normalizeRoleName(p.functionRole) === normalizeRoleName(chosenRole)) ||
    pipelines[0];

  const finalPipelineId = destPipeline?.id || chosenPipelineId || 'sdr';
  const finalStage =
    (chosenStage && destPipeline?.stages?.some((s) => s.name === chosenStage)
      ? chosenStage
      : undefined) ||
    chosenStage ||
    destPipeline?.stages?.[0]?.name ||
    'Novo Lead';

  const nextRoleCursors = { ...(cfg.roleCursors || {}) };
  let nextLastAssignedIndex = typeof cfg.lastAssignedIndex === 'number' ? cfg.lastAssignedIndex : -1;

  const matchingUsers = getMatchingUsersForRole(users, chosenRole);
  const activeFallbackPool = users.filter(
    (u) => u && u.status !== 'Inativo' && u.status !== 'Bloqueado' && u.status !== 'Pendente' && !normalizeRoleName(u.role).includes('desenvolvedor')
  );
  const candidatePool = matchingUsers.length > 0 ? matchingUsers : activeFallbackPool;

  let assignedOwner = 'Sem responsável';
  const distType: LeadDistributionType = cfg.distributionType || 'role_round_robin';

  if (distType === 'unassigned') {
    assignedOwner = 'Sem responsável';
  } else if (distType === 'specific_user') {
    const spec =
      users.find((u) => u.id && u.id === cfg.specificUserId) ||
      users.find((u) => u.name && u.name === cfg.specificUserName);
    assignedOwner = spec?.name || cfg.specificUserName || candidatePool[0]?.name || 'Responsável Comercial';
  } else if (candidatePool.length > 0) {
    if (distType === 'random_member') {
      const randIdx = Math.floor(Math.random() * candidatePool.length);
      assignedOwner = candidatePool[randIdx]?.name || 'Responsável Comercial';
      nextRoleCursors[chosenRole] = randIdx;
      nextLastAssignedIndex = randIdx;
    } else if (distType === 'least_loaded') {
      const counts = new Map<string, number>();
      candidatePool.forEach((u) => counts.set(String(u.name || '').toLowerCase(), 0));
      (existingLeads || []).forEach((l) => {
        const stg = normalizeRoleName(l.stage);
        if (stg.includes('ganho') || stg.includes('perdido') || stg.includes('cancelad')) return;
        const ownerKey = String(l.owner || '').toLowerCase();
        if (counts.has(ownerKey)) {
          counts.set(ownerKey, (counts.get(ownerKey) || 0) + 1);
        }
      });
      const sorted = [...candidatePool].sort((a, b) => {
        const ca = counts.get(String(a.name || '').toLowerCase()) || 0;
        const cb = counts.get(String(b.name || '').toLowerCase()) || 0;
        return ca - cb;
      });
      assignedOwner = sorted[0]?.name || 'Responsável Comercial';
    } else if (distType === 'weighted_quota') {
      const sequence: Array<(typeof candidatePool)[number]> = [];
      candidatePool.forEach((member) => {
        const q = Math.max(0, Math.min(20, Number(cfg.memberQuotas?.[member.id || member.name || ''] ?? 1)));
        for (let i = 0; i < q; i++) {
          sequence.push(member);
        }
      });
      const effectiveSeq = sequence.length > 0 ? sequence : candidatePool;
      const lastCursor = typeof nextRoleCursors[chosenRole] === 'number' ? nextRoleCursors[chosenRole] : -1;
      const nextCursor = (lastCursor + 1) % effectiveSeq.length;
      assignedOwner = effectiveSeq[nextCursor]?.name || 'Responsável Comercial';
      nextRoleCursors[chosenRole] = nextCursor;
      nextLastAssignedIndex = nextCursor;
    } else {
      // role_round_robin (sistemático 1 por 1)
      const lastCursor =
        typeof nextRoleCursors[chosenRole] === 'number'
          ? nextRoleCursors[chosenRole]
          : nextLastAssignedIndex;
      const nextCursor = (lastCursor + 1) % candidatePool.length;
      assignedOwner = candidatePool[nextCursor]?.name || 'Responsável Comercial';
      nextRoleCursors[chosenRole] = nextCursor;
      nextLastAssignedIndex = nextCursor;
    }
  }

  return {
    targetRole: chosenRole,
    targetPipelineId: finalPipelineId,
    targetStage: finalStage,
    assignedOwner,
    routingReason,
    nextLastAssignedIndex,
    nextRoleCursors,
  };
}

export interface LeadClaimEligibility {
  canClaim: boolean;
  contactMade: boolean;
  isCurrentOwner: boolean;
  hasOwner: boolean;
  ownerName: string;
  stageName: string;
  pipelineName: string;
  reason: string;
}

/**
 * Determina se uma etapa é de contato preliminar ou se o contato já foi realizado.
 * Retorna true se o contato JÁ FOI FEITO.
 * Retorna false se for etapa de Novo Lead ou primeiro contato que ainda não foi realizado.
 */
export function isContactMadeStage(stageName?: string, pipeline?: Pipeline): boolean {
  if (!stageName) return false;
  const s = stageName.toLowerCase().trim();

  // Etapas onde o contato EXPLICITAMENTE já foi realizado ou avançado
  const contactMadeKeywords = [
    "contato realizado",
    "conectado",
    "qualificação",
    "qualificacao",
    "qualificado",
    "reunião",
    "reuniao",
    "diagnóstico",
    "diagnostico",
    "proposta",
    "negociação",
    "negociacao",
    "decisão",
    "decisao",
    "fechamento",
    "ganho",
    "onboarding",
    "cliente ativo",
    "concluído",
    "concluido"
  ];

  if (contactMadeKeywords.some(kw => s.includes(kw))) {
    return true;
  }

  // Etapas onde o contato AINDA NÃO foi realizado (Livre para entrada/puxar)
  const nonContactKeywords = [
    "novo",
    "recebid",
    "prospect alvo",
    "alvo",
    "sem contato",
    "fila",
    "pendente",
    "primeiro contato",
    "1º contato",
    "contato" // no SDR/Seller, a etapa "Contato" é a primeira tentativa de abordagem
  ];

  if (nonContactKeywords.some(kw => s.includes(kw))) {
    return false;
  }

  // Se houver pipeline configurado, verifica a ordem da etapa
  if (pipeline && Array.isArray(pipeline.stages) && pipeline.stages.length > 0) {
    const currentStageObj = pipeline.stages.find(stg => stg.name.toLowerCase().trim() === s);
    if (currentStageObj) {
      // Se for a primeira ou segunda etapa do pipeline, considera inicial (contato não finalizado)
      if ((currentStageObj.order ?? 1) <= 2) {
        return false;
      }
      return true;
    }
  }

  // Por padrão seguro, se não puder determinar, considera inicial
  return false;
}

/**
 * Validação central da regra de elegibilidade para puxar leads da base.
 */
export function checkLeadClaimEligibility(
  lead: Lead,
  currentUser: User | null | undefined,
  pipelines: Pipeline[] = []
): LeadClaimEligibility {
  const ownerName = lead.owner?.trim() || "";
  const hasOwner = Boolean(
    ownerName && 
    ownerName !== "Sem dono" && 
    ownerName !== "Sem responsável" &&
    ownerName !== "Não atribuído"
  );

  const currentUserName = currentUser?.name?.trim().toLowerCase() || "";
  const currentUserEmail = currentUser?.email?.trim().toLowerCase() || "";
  const isCurrentOwner = Boolean(
    hasOwner && (
      (currentUserName && ownerName.toLowerCase() === currentUserName) ||
      (currentUserEmail && ownerName.toLowerCase() === currentUserEmail)
    )
  );

  const currentPipe = pipelines.find(p => p.id === (lead.pipelineId || "prospection")) || pipelines[0];
  const stageName = lead.stage || "Novo Lead";
  const contactMade = isContactMadeStage(stageName, currentPipe);

  const isAdmin = currentUser?.role === "Admin Geral";

  if (!hasOwner) {
    return {
      canClaim: true,
      contactMade,
      isCurrentOwner: false,
      hasOwner: false,
      ownerName: "Sem responsável",
      stageName,
      pipelineName: currentPipe?.name || "Geral",
      reason: "Lead livre na base sem responsável atribuído. Pode ser puxado para qualquer pipeline."
    };
  }

  if (isCurrentOwner) {
    return {
      canClaim: true,
      contactMade,
      isCurrentOwner: true,
      hasOwner: true,
      ownerName,
      stageName,
      pipelineName: currentPipe?.name || "Geral",
      reason: "Este lead já pertence a você. Você pode movê-lo entre seus pipelines livremente."
    };
  }

  if (contactMade) {
    return {
      canClaim: isAdmin ? true : false,
      contactMade: true,
      isCurrentOwner: false,
      hasOwner: true,
      ownerName,
      stageName,
      pipelineName: currentPipe?.name || "Geral",
      reason: isAdmin 
        ? `Lead em andamento com ${ownerName} na etapa '${stageName}'. Como Administrador Geral, você pode reatribuir este lead.`
        : `Bloqueado: este lead já está em andamento com o vendedor ${ownerName} na etapa '${stageName}' (contato já realizado). Não é permitido puxar.`
    };
  } else {
    return {
      canClaim: true,
      contactMade: false,
      isCurrentOwner: false,
      hasOwner: true,
      ownerName,
      stageName,
      pipelineName: currentPipe?.name || "Geral",
      reason: `Lead atribuído a ${ownerName}, porém ainda na etapa inicial '${stageName}' (contato não realizado). Liberado para você assumir no seu pipeline.`
    };
  }
}

