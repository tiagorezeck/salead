import { type Lead, type Pipeline, type User } from "@/data/mock";

export type LeadTargetRole = 'LDR' | 'SDR' | 'Seller' | 'Hunter' | 'Closer' | 'Onboarding' | 'Qualquer';

export interface LeadRoutingConfig {
  enabled: boolean;
  targetRole: LeadTargetRole;
  targetPipelineId: string;
  targetStage: string;
  distributionType: 'role_round_robin' | 'specific_user' | 'unassigned';
  specificUserId?: string;
  specificUserName?: string;
  lastAssignedIndex?: number;
  updatedAt?: string;
}

export const DEFAULT_LEAD_ROUTING_CONFIG: LeadRoutingConfig = {
  enabled: true,
  targetRole: 'LDR',
  targetPipelineId: 'prospection', // LDR — QUALIFICAÇÃO INICIAL
  targetStage: 'Novo Lead',
  distributionType: 'role_round_robin',
  updatedAt: new Date().toISOString()
};

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
      if (currentStageObj.order <= 2) {
        return false;
      }
      return true;
    }
  }

  // Por padrão seguro, se não puder determinar, considera inicial
  return false;
}

/**
 * Validação central da regra:
 * "Quero que TODOS possam buscar os leads na base e colocar no seu pipeline,
 * com a observação se o lead já está em andamento com algum vendedor,
 * não permitindo ele seguir (só vale para etapas que o contato já foi feito,
 * etapa de novo lead, contato (que não foi realizado) poderá entrar)"
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

  // Se o usuário logado for Admin Geral, ele tem soberania para transferir/reatribuir
  const isAdmin = currentUser?.role === "Admin Geral";

  // Se o lead não tem responsável: LIVRE para qualquer vendedor puxar
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

  // Se o lead já é do próprio usuário logado
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

  // Se o lead é de OUTRO vendedor:
  if (contactMade) {
    // Contato já realizado: BLOQUEADO
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
    // Contato AINDA NÃO realizado (Novo lead ou primeira tentativa): PERMITIDO
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
