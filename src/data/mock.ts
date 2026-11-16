// Mock dataset for COMET CRM frontend
import { MessageSquare, Lightbulb, Sparkles, ChevronRight, BookOpen, type LucideIcon } from "lucide-react";

export type Role = 
  | "Admin Geral" 
  | "Head of Sales" 
  | "Team Leader" 
  | "Marketing" 
  | "LDR" 
  | "BDR" 
  | "SDR" 
  | "Hunter" 
  | "Closer" 
  | "Seller"
  | "Full Stack Seller"
  | "Onboarding" 
  | "CS (Customer Success)" 
  | "Farmer" 
  | "CX (Customer Experience)";

export type Stage = string;

export type StageType = 
  | 'NORMAL' 
  | 'GANHO' 
  | 'PERDIDO' 
  | 'STAND_BY' 
  | 'TRANSFERENCIA' 
  | 'CONCLUIDO' 
  | 'CANCELADO';

export type StageColor = 'default' | 'success' | 'destructive' | 'warning' | 'info' | 'primary' | 'purple' | 'emerald' | 'amber' | 'blue' | 'rose';

export interface PipelineStage {
  id?: string;
  name: string;
  order?: number;
  type?: StageType;
  color?: StageColor;
  slaHours?: number;
  active?: boolean;
  autoAction?: 'NONE' | 'TRANSFER_TO_SDR' | 'TRANSFER_TO_CLOSER' | 'TRANSFER_TO_ONBOARDING' | 'TRANSFER_TO_CS' | 'TRANSFER_TO_FARMER' | 'SCHEDULE_MEETING' | 'CUSTOM_TRANSFER';
  targetPipelineId?: string;
  targetStageName?: string;
  description?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  code?: string;
  functionRole?: Role | string;
  description?: string;
  stages: PipelineStage[];
  color: string;
  active?: boolean;
  order?: number;
  is_default?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PipelineMovementHistory {
  id: string;
  leadId: string;
  previousPipelineId?: string;
  previousPipelineName?: string;
  previousStage?: string;
  newPipelineId?: string;
  newPipelineName?: string;
  newStage?: string;
  previousOwner?: string;
  newOwner?: string;
  movementType: 'STAGE_CHANGE' | 'PIPELINE_TRANSFER' | 'OWNER_CHANGE' | 'BATCH_TRANSFER' | 'AUTO_HANDOFF';
  user: string;
  timestamp: string;
  note?: string;
}

// PIPELINES NATIVOS DO SALEAD (ESTEIRA COMPLETA)
export const DEFAULT_PIPELINES: Pipeline[] = [
  {
    id: "marketing",
    name: "MARKETING",
    code: "MKT",
    functionRole: "Marketing",
    description: "Gestão e execução de campanhas, testes e criação de Landing Pages",
    color: "primary",
    active: true,
    order: 1,
    stages: [
      { id: "mkt_1", name: "Campanha / Conteúdo", order: 1, type: "NORMAL", color: "default", active: true },
      { id: "mkt_2", name: "Criação de Landing Page", order: 2, type: "NORMAL", color: "info", active: true },
      { id: "mkt_3", name: "Aprovação", order: 3, type: "NORMAL", color: "warning", active: true },
      { id: "mkt_4", name: "Iniciar Campanha", order: 4, type: "NORMAL", color: "primary", active: true },
      { id: "mkt_5", name: "Stand By", order: 5, type: "STAND_BY", color: "amber", active: true },
      { id: "mkt_6", name: "Finalizar Campanha", order: 6, type: "CONCLUIDO", color: "success", active: true }
    ]
  },
  {
    id: "prospection", // Mantido id "prospection" com alias LDR para retrocompatibilidade
    name: "LDR — QUALIFICAÇÃO INICIAL",
    code: "LDR",
    functionRole: "LDR",
    description: "Higienização, validação de contato e qualificação preliminar",
    color: "info",
    active: true,
    order: 2,
    stages: [
      { id: "ldr_1", name: "Novo Lead", order: 1, type: "NORMAL", color: "default", slaHours: 2, active: true },
      { id: "ldr_2", name: "Primeiro Contato", order: 2, type: "NORMAL", color: "info", slaHours: 4, active: true },
      { id: "ldr_3", name: "Contato Realizado", order: 3, type: "NORMAL", color: "warning", slaHours: 8, active: true },
      { id: "ldr_4", name: "Qualificação Inicial", order: 4, type: "NORMAL", color: "primary", slaHours: 12, active: true },
      { id: "ldr_5", name: "Qualificado", order: 5, type: "NORMAL", color: "purple", slaHours: 12, active: true },
      { id: "ldr_6", name: "Transferido", order: 6, type: "TRANSFERENCIA", color: "success", autoAction: "TRANSFER_TO_SDR", targetPipelineId: "sdr", targetStageName: "Lead/Oportunidade Recebida", active: true },
      { id: "ldr_7", name: "Stand By", order: 7, type: "STAND_BY", color: "amber", active: true },
      { id: "ldr_8", name: "Perdido", order: 8, type: "PERDIDO", color: "destructive", active: true }
    ]
  },
  {
    id: "bdr",
    name: "BDR — PROSPECÇÃO ATIVA",
    code: "BDR",
    functionRole: "BDR",
    description: "Prospecção ativa outbound, listas estratégicas e cold outreach",
    color: "purple",
    active: true,
    order: 3,
    stages: [
      { id: "bdr_1", name: "Prospect Alvo", order: 1, type: "NORMAL", color: "default", active: true },
      { id: "bdr_2", name: "Prospecção", order: 2, type: "NORMAL", color: "info", slaHours: 24, active: true },
      { id: "bdr_3", name: "Contato Realizado", order: 3, type: "NORMAL", color: "warning", slaHours: 24, active: true },
      { id: "bdr_4", name: "Conectado", order: 4, type: "NORMAL", color: "primary", slaHours: 24, active: true },
      { id: "bdr_5", name: "Qualificado", order: 5, type: "NORMAL", color: "purple", slaHours: 12, active: true },
      { id: "bdr_6", name: "Transferido", order: 6, type: "TRANSFERENCIA", color: "success", autoAction: "TRANSFER_TO_SDR", targetPipelineId: "sdr", targetStageName: "Lead/Oportunidade Recebida", active: true },
      { id: "bdr_7", name: "Stand By", order: 7, type: "STAND_BY", color: "amber", active: true },
      { id: "bdr_8", name: "Perdido", order: 8, type: "PERDIDO", color: "destructive", active: true }
    ]
  },
  {
    id: "sdr",
    name: "SDR — QUALIFICAÇÃO & AGENDAMENTO",
    code: "SDR",
    functionRole: "SDR",
    description: "Qualificação aprofundada via metodologia MIN e agendamento de reuniões",
    color: "blue",
    active: true,
    order: 4,
    stages: [
      { id: "sdr_1", name: "Lead/Oportunidade Recebida", order: 1, type: "NORMAL", color: "default", slaHours: 2, active: true },
      { id: "sdr_2", name: "Contato", order: 2, type: "NORMAL", color: "info", slaHours: 4, active: true },
      { id: "sdr_3", name: "Qualificação MIN", order: 3, type: "NORMAL", color: "warning", slaHours: 8, active: true },
      { id: "sdr_4", name: "Qualificado", order: 4, type: "NORMAL", color: "primary", slaHours: 12, active: true },
      { id: "sdr_5", name: "Reunião Agendada", order: 5, type: "NORMAL", color: "purple", autoAction: "SCHEDULE_MEETING", active: true },
      { id: "sdr_6", name: "Transferido", order: 6, type: "TRANSFERENCIA", color: "success", autoAction: "TRANSFER_TO_CLOSER", targetPipelineId: "sales", targetStageName: "Reunião Agendada", active: true },
      { id: "sdr_7", name: "Stand By", order: 7, type: "STAND_BY", color: "amber", active: true },
      { id: "sdr_8", name: "Perdido", order: 8, type: "PERDIDO", color: "destructive", active: true }
    ]
  },
  {
    id: "sales", // Mantido id "sales" com alias Closer para retrocompatibilidade
    name: "CLOSER — NEGOCIAÇÃO & FECHAMENTO",
    code: "CLOSER",
    functionRole: "Closer",
    description: "Reuniões consultivas, diagnóstico, apresentação de propostas e fechamento",
    color: "primary",
    active: true,
    order: 5,
    stages: [
      { id: "cls_1", name: "Reunião Agendada", order: 1, type: "NORMAL", color: "info", slaHours: 24, active: true },
      { id: "cls_2", name: "Reunião Realizada", order: 2, type: "NORMAL", color: "primary", slaHours: 24, active: true },
      { id: "cls_3", name: "Diagnóstico", order: 3, type: "NORMAL", color: "warning", slaHours: 48, active: true },
      { id: "cls_4", name: "Proposta", order: 4, type: "NORMAL", color: "purple", slaHours: 48, active: true },
      { id: "cls_5", name: "Negociação", order: 5, type: "NORMAL", color: "amber", slaHours: 72, active: true },
      { id: "cls_6", name: "Decisão", order: 6, type: "NORMAL", color: "blue", slaHours: 48, active: true },
      { id: "cls_7", name: "Ganho", order: 7, type: "GANHO", color: "success", autoAction: "TRANSFER_TO_ONBOARDING", targetPipelineId: "execution", targetStageName: "Cliente Ganho", active: true },
      { id: "cls_8", name: "Perdido", order: 8, type: "PERDIDO", color: "destructive", active: true },
      { id: "cls_9", name: "Stand By", order: 9, type: "STAND_BY", color: "amber", active: true }
    ]
  },
  {
    id: "hunter",
    name: "HUNTER — CONTAS ESTRATÉGICAS",
    code: "HUNTER",
    functionRole: "Hunter",
    description: "Prospecção cirúrgica de grandes contas (Enterprise & High Ticket)",
    color: "rose",
    active: true,
    order: 6,
    stages: [
      { id: "hnt_1", name: "Prospect Alvo", order: 1, type: "NORMAL", color: "default", active: true },
      { id: "hnt_2", name: "Prospecção", order: 2, type: "NORMAL", color: "info", slaHours: 48, active: true },
      { id: "hnt_3", name: "Contato", order: 3, type: "NORMAL", color: "warning", slaHours: 48, active: true },
      { id: "hnt_4", name: "Oportunidade Identificada", order: 4, type: "NORMAL", color: "purple", slaHours: 24, active: true },
      { id: "hnt_5", name: "Transferido", order: 5, type: "TRANSFERENCIA", color: "success", autoAction: "TRANSFER_TO_CLOSER", targetPipelineId: "sales", targetStageName: "Reunião Agendada", active: true },
      { id: "hnt_6", name: "Stand By", order: 6, type: "STAND_BY", color: "amber", active: true },
      { id: "hnt_7", name: "Perdido", order: 7, type: "PERDIDO", color: "destructive", active: true }
    ]
  },
  {
    id: "seller",
    name: "SELLER — CICLO COMPLETO",
    code: "SELLER",
    functionRole: "Seller",
    description: "Vendedor ponta a ponta: do primeiro contato até o fechamento contratual",
    color: "emerald",
    active: true,
    order: 7,
    stages: [
      { id: "slr_1", name: "Novo Lead", order: 1, type: "NORMAL", color: "default", slaHours: 2, active: true },
      { id: "slr_2", name: "Contato", order: 2, type: "NORMAL", color: "info", slaHours: 6, active: true },
      { id: "slr_3", name: "Qualificação MIN", order: 3, type: "NORMAL", color: "warning", slaHours: 12, active: true },
      { id: "slr_4", name: "Reunião", order: 4, type: "NORMAL", color: "primary", slaHours: 24, active: true },
      { id: "slr_5", name: "Diagnóstico", order: 5, type: "NORMAL", color: "purple", slaHours: 24, active: true },
      { id: "slr_6", name: "Proposta", order: 6, type: "NORMAL", color: "amber", slaHours: 48, active: true },
      { id: "slr_7", name: "Negociação", order: 7, type: "NORMAL", color: "blue", slaHours: 48, active: true },
      { id: "slr_8", name: "Decisão", order: 8, type: "NORMAL", color: "purple", slaHours: 24, active: true },
      { id: "slr_9", name: "Ganho", order: 9, type: "GANHO", color: "success", autoAction: "TRANSFER_TO_ONBOARDING", targetPipelineId: "execution", targetStageName: "Cliente Ganho", active: true },
      { id: "slr_10", name: "Perdido", order: 10, type: "PERDIDO", color: "destructive", active: true },
      { id: "slr_11", name: "Stand By", order: 11, type: "STAND_BY", color: "amber", active: true }
    ]
  },
  {
    id: "execution", // Mantido id "execution" com alias Onboarding para retrocompatibilidade
    name: "ONBOARDING — IMPLANTAÇÃO",
    code: "ONBOARDING",
    functionRole: "Onboarding",
    description: "Recepção do cliente, coleta de documentos, setup e implantação técnica",
    color: "blue",
    active: true,
    order: 8,
    stages: [
      { id: "onb_1", name: "Cliente Ganho", order: 1, type: "NORMAL", color: "info", slaHours: 24, active: true },
      { id: "onb_2", name: "Onboarding Iniciado", order: 2, type: "NORMAL", color: "warning", slaHours: 48, active: true },
      { id: "onb_3", name: "Dados / Documentos", order: 3, type: "NORMAL", color: "primary", slaHours: 72, active: true },
      { id: "onb_4", name: "Configuração", order: 4, type: "NORMAL", color: "purple", slaHours: 72, active: true },
      { id: "onb_5", name: "Implantação", order: 5, type: "NORMAL", color: "blue", slaHours: 96, active: true },
      { id: "onb_6", name: "Onboarding Concluído", order: 6, type: "CONCLUIDO", color: "success", autoAction: "TRANSFER_TO_CS", targetPipelineId: "cs", targetStageName: "Cliente Ativo", active: true },
      { id: "onb_7", name: "Stand By", order: 7, type: "STAND_BY", color: "amber", active: true },
      { id: "onb_8", name: "Cancelado", order: 8, type: "CANCELADO", color: "destructive", active: true }
    ]
  },
  {
    id: "cs",
    name: "CUSTOMER SUCCESS (CS)",
    code: "CS",
    functionRole: "CS (Customer Success)",
    description: "Garantia de valor, adoção contínua, acompanhamento de saúde do cliente e retenção",
    color: "green",
    active: true,
    order: 9,
    stages: [
      { id: "cs_1", name: "Cliente Ativo", order: 1, type: "NORMAL", color: "info", active: true },
      { id: "cs_2", name: "Acompanhamento", order: 2, type: "NORMAL", color: "warning", active: true },
      { id: "cs_3", name: "Adoção", order: 3, type: "NORMAL", color: "primary", active: true },
      { id: "cs_4", name: "Resultado", order: 4, type: "NORMAL", color: "purple", active: true },
      { id: "cs_5", name: "Sucesso / Renovação", order: 5, type: "GANHO", color: "success", active: true },
      { id: "cs_6", name: "Oportunidade Comercial", order: 6, type: "TRANSFERENCIA", color: "emerald", autoAction: "TRANSFER_TO_FARMER", targetPipelineId: "farmer", targetStageName: "Identificação de Oportunidade", active: true },
      { id: "cs_7", name: "Churn / Cancelamento", order: 7, type: "PERDIDO", color: "destructive", active: true }
    ]
  },
  {
    id: "farmer",
    name: "FARMER — EXPANSÃO & CARTEIRA",
    code: "FARMER",
    functionRole: "Farmer",
    description: "Gestão de carteira ativa, upsell, cross-sell e renovações de alto valor",
    color: "emerald",
    active: true,
    order: 10,
    stages: [
      { id: "frm_1", name: "Cliente Ativo", order: 1, type: "NORMAL", color: "info", active: true },
      { id: "frm_2", name: "Relacionamento", order: 2, type: "NORMAL", color: "warning", active: true },
      { id: "frm_3", name: "Identificação de Oportunidade", order: 3, type: "NORMAL", color: "primary", active: true },
      { id: "frm_4", name: "Nova Necessidade", order: 4, type: "NORMAL", color: "purple", active: true },
      { id: "frm_5", name: "Oportunidade Comercial", order: 5, type: "TRANSFERENCIA", color: "emerald", autoAction: "TRANSFER_TO_CLOSER", targetPipelineId: "sales", targetStageName: "Proposta", active: true },
      { id: "frm_6", name: "Ganho", order: 6, type: "GANHO", color: "success", active: true },
      { id: "frm_7", name: "Perdido", order: 7, type: "PERDIDO", color: "destructive", active: true },
      { id: "frm_8", name: "Stand By", order: 8, type: "STAND_BY", color: "amber", active: true }
    ]
  },
  {
    id: "cx",
    name: "CUSTOMER EXPERIENCE (CX)",
    code: "CX",
    functionRole: "CX (Customer Experience)",
    description: "Suporte consultivo, feedback, tratamento de gargalos e satisfação contínua",
    color: "amber",
    active: true,
    order: 11,
    stages: [
      { id: "cx_1", name: "Interação", order: 1, type: "NORMAL", color: "info", active: true },
      { id: "cx_2", name: "Feedback", order: 2, type: "NORMAL", color: "warning", active: true },
      { id: "cx_3", name: "Tratativa", order: 3, type: "NORMAL", color: "primary", active: true },
      { id: "cx_4", name: "Resolvido", order: 4, type: "CONCLUIDO", color: "success", active: true }
    ]
  }
];

// PLAYBOOKS PADRÃO DO SISTEMA (HARDCODED)
export const DEFAULT_PLAYBOOKS = [
  {
    id: "pb-1",
    title: "Abordagem Inicial (Cold Call)",
    category: "Prospecção",
    iconType: "message" as const,
    objective: "Gerar curiosidade e agendar uma breve conversa de 15 minutos.",
    content: "Vendedor: 'Olá...'",
    specialty: "LDR — Lead Development Representative",
    whenToUse: "Primeiro contato com lead frio (Inbound/Outbound) para validação de potencial.",
    expectedResult: "Lead qualificado para passagem ao BDR ou descartado.",
    avgDuration: "10-15 min",
    initialChecklist: [
      { id: "c1", text: "Empresa identificada" },
      { id: "c2", text: "Segmento confirmado" },
      { id: "c3", text: "Contato encontrado" },
      { id: "c4", text: "Canal validado" }
    ],
    mandatoryQuestions: [
      { id: "q1", text: "Você é o responsável pela área?", type: "mandatory" as const },
      { id: "q2", text: "Quem toma as decisões?", type: "mandatory" as const },
      { id: "q3", text: "Quantos colaboradores possui?", type: "mandatory" as const },
      { id: "q4", text: "Há quanto tempo a empresa atua?", type: "mandatory" as const },
      { id: "q5", text: "Qual principal atividade da empresa?", type: "mandatory" as const },
      { id: "q6", text: "Vocês já utilizam algum sistema ou consultoria?", type: "mandatory" as const },
      { id: "q7", text: "Existe algum projeto de melhoria atualmente?", type: "mandatory" as const },
      { id: "q8", text: "Posso encaminhar algumas informações?", type: "mandatory" as const },
      { id: "q9", text: "Qual o melhor canal para contato?", type: "mandatory" as const },
      { id: "q10", text: "Qual o melhor horário?", type: "mandatory" as const }
    ],
    optionalQuestions: [],
    greenFlags: [
      { id: "g1", text: "Tomador de decisão identificado" },
      { id: "g2", text: "Interesse em receber informações" },
      { id: "g3", text: "Empresa em crescimento" },
      { id: "g4", text: "Dor percebida" }
    ],
    redFlags: [
      { id: "r1", text: "Empresa encerrando atividades" },
      { id: "r2", text: "Sem responsável identificado" },
      { id: "r3", text: "Sem interesse" },
      { id: "r4", text: "Contato inválido" }
    ],
    commonObjections: [
      { id: "obj1", objection: "Não temos tempo agora", response: "Entendo perfeitamente. O objetivo desta call é justamente economizar seu tempo futuro..." }
    ],
    nextAction: "Enviar para BDR",
    approvalCriteria: "Responsável identificado + Interesse em info + Segmento válido",
    rejectionCriteria: "Sem decisor + Sem interesse + Empresa inválida"
  },
  {
    id: "pb-2",
    title: "Qualificação Profunda (Discovery)",
    category: "SDR (Qualificação)",
    iconType: "lightbulb" as const,
    objective: "Entender contexto, dores, prioridades e momento. Preparar terreno para o Closer.",
    content: "Roteiro de discovery BDR...",
    specialty: "BDR — Business Development Representative",
    whenToUse: "Após validação inicial do LDR. Reunião de discovery agendada.",
    expectedResult: "Lead qualificado (BANT) pronto para reunião com Closer.",
    avgDuration: "30-45 min",
    initialChecklist: [
      { id: "c1", text: "Agenda confirmada com lead" },
      { id: "c2", text: "Material de apoio aberto" },
      { id: "c3", text: "CRM atualizado com dados do LDR" }
    ],
    mandatoryQuestions: [
      { id: "q1", text: "O que motivou seu interesse?", type: "mandatory" as const },
      { id: "q2", text: "Qual é o maior desafio hoje?", type: "mandatory" as const },
      { id: "q3", text: "Como isso impacta a empresa?", type: "mandatory" as const },
      { id: "q4", text: "O que já tentaram fazer?", type: "mandatory" as const },
      { id: "q5", text: "O que funcionou?", type: "mandatory" as const },
      { id: "q6", text: "O que não funcionou?", type: "mandatory" as const },
      { id: "q7", text: "Existe urgência?", type: "mandatory" as const },
      { id: "q8", text: "Existe orçamento previsto?", type: "mandatory" as const },
      { id: "q9", text: "Existe prazo?", type: "mandatory" as const },
      { id: "q10", text: "Quem participa da decisão?", type: "mandatory" as const },
      { id: "q11", text: "O que acontece se nada mudar?", type: "mandatory" as const },
      { id: "q12", text: "Como vocês medem resultados hoje?", type: "mandatory" as const }
    ],
    optionalQuestions: [
      { id: "oq1", text: "Quais ferramentas usam hoje?", type: "optional" as const },
      { id: "oq2", text: "Qual o tamanho da equipe envolvida?", type: "optional" as const }
    ],
    greenFlags: [
      { id: "g1", text: "Dor clara" },
      { id: "g2", text: "Urgência" },
      { id: "g3", text: "Orçamento" },
      { id: "g4", text: "Autoridade" }
    ],
    redFlags: [
      { id: "r1", text: "Sem dor" },
      { id: "r2", text: "Apenas pesquisando" },
      { id: "r3", text: "Sem previsão" },
      { id: "r4", text: "Sem decisão" }
    ],
    commonObjections: [
      { id: "obj1", objection: "Não temos tempo agora", response: "Entendo. O diagnóstico leva 20 min e evita semanas de retrabalho. Podemos agendar para amanhã cedo?" },
      { id: "obj2", objection: "Já temos fornecedor", response: "Ótimo. Muitos clientes nossos tinham fornecedor e migravam por gaps específicos. Qual a maior dor com o atual?" }
    ],
    nextAction: "Agendar reunião com Closer",
    approvalCriteria: "Mínimo 3 Green Flags (Dor + Urgência + Autoridade/Orçamento)",
    rejectionCriteria: "2+ Red Flags ou ausência de dor real"
  },
  {
    id: "pb-3",
    title: "Diagnóstico Consultivo & Valor",
    category: "Closer (Fechamento)",
    iconType: "sparkles" as const,
    objective: "Conduzir diagnóstico consultivo. Explorar necessidades. Construir valor. Preparar decisão.",
    content: "Roteiro de diagnóstico SDR...",
    specialty: "SDR — Sales Development Representative",
    whenToUse: "Reunião técnica/consultiva após qualificação BDR. Foco em solução e ROI.",
    expectedResult: "Escopo validado, ROI desenhado, proposta solicitada.",
    avgDuration: "45-60 min",
    initialChecklist: [
      { id: "c1", text: "Briefing do BDR lido" },
      { id: "c2", text: "Calculadora de ROI preparada" },
      { id: "c3", text: "Cases de segmento similares prontos" }
    ],
    mandatoryQuestions: [
      { id: "q1", text: "Quais objetivos pretendem alcançar?", type: "mandatory" as const },
      { id: "q2", text: "Qual resultado esperam?", type: "mandatory" as const },
      { id: "q3", text: "Como medem sucesso?", type: "mandatory" as const },
      { id: "q4", text: "Quais indicadores acompanham?", type: "mandatory" as const },
      { id: "q5", text: "Qual impacto financeiro do problema?", type: "mandatory" as const },
      { id: "q6", text: "Quanto custa manter a situação atual?", type: "mandatory" as const },
      { id: "q7", text: "O que seria uma solução ideal?", type: "mandatory" as const },
      { id: "q8", text: "O que é indispensável?", type: "mandatory" as const },
      { id: "q9", text: "Há restrições?", type: "mandatory" as const },
      { id: "q10", text: "Existe prazo para implantação?", type: "mandatory" as const }
    ],
    optionalQuestions: [
      { id: "oq1", text: "Como é o processo de aprovação interna?", type: "optional" as const },
      { id: "oq2", text: "Já viram demo de concorrentes?", type: "optional" as const }
    ],
    greenFlags: [
      { id: "g1", text: "ROI percebido" },
      { id: "g2", text: "Necessidade clara" },
      { id: "g3", text: "Problema recorrente" },
      { id: "g4", text: "Interesse em solução" }
    ],
    redFlags: [
      { id: "r1", text: "Sem prioridade" },
      { id: "r2", text: "Sem recursos" },
      { id: "r3", text: "Resistência excessiva" },
      { id: "r4", text: "Sem comprometimento" }
    ],
    commonObjections: [
      { id: "obj1", objection: "Preciso falar com meu sócio", response: "Perfeito. Vamos preparar um resumo executivo para vocês alinharem. Qual o melhor dia para uma call de 15 min a três?" },
      { id: "obj2", objection: "Vamos pensar", response: "Claro. O que exatamente precisa ser pensado? O investimento, o prazo ou a confiança na entrega?" }
    ],
    nextAction: "Encaminhar para proposta formal",
    approvalCriteria: "Fit técnico confirmado + ROI alinhado + Stakeholders mapeados",
    rejectionCriteria: "Gap técnico intransponível ou ausência de budget real"
  },
  {
    id: "pb-4",
    title: "Fechamento & Negociação",
    category: "Closer (Fechamento)",
    iconType: "chevron" as const,
    objective: "Conduzir a decisão. Eliminar objeções. Formalizar fechamento.",
    content: "Roteiro de fechamento...",
    specialty: "CLOSER",
    whenToUse: "Apresentação de proposta. Momento da decisão final.",
    expectedResult: "Contrato assinado / Pagamento confirmado / Próximos passos de onboarding.",
    avgDuration: "30-60 min",
    initialChecklist: [
      { id: "c1", text: "Proposta enviada e visualizada" },
      { id: "c2", text: "Decisores confirmados na call" },
      { id: "c3", text: "Condições comerciais aprovadas internamente" },
      { id: "c4", text: "Contrato modelo pronto para assinatura" }
    ],
    mandatoryQuestions: [
      { id: "q1", text: "O que mais gostou da proposta?", type: "mandatory" as const },
      { id: "q2", text: "Existe alguma dúvida?", type: "mandatory" as const },
      { id: "q3", text: "Existe alguma preocupação?", type: "mandatory" as const },
      { id: "q4", text: "Há algo impedindo a decisão?", type: "mandatory" as const },
      { id: "q5", text: "Existe mais alguém que precisa aprovar?", type: "mandatory" as const },
      { id: "q6", text: "Quando pretendem iniciar?", type: "mandatory" as const },
      { id: "q7", text: "Qual condição atende melhor?", type: "mandatory" as const },
      { id: "q8", text: "O que falta para avançarmos hoje?", type: "mandatory" as const },
      { id: "q9", text: "Podemos formalizar agora?", type: "mandatory" as const },
      { id: "q10", text: "Prefere boleto, PIX ou cartão?", type: "mandatory" as const }
    ],
    optionalQuestions: [],
    greenFlags: [
      { id: "g1", text: "Perguntas sobre implantação" },
      { id: "g2", text: "Perguntas sobre contrato" },
      { id: "g3", text: "Perguntas sobre pagamento" },
      { id: "g4", text: "Perguntas sobre prazo" }
    ],
    redFlags: [
      { id: "r1", text: "Adiar decisão" },
      { id: "r3", text: "Evitar responder" },
      { id: "r4", text: "Comparar apenas preço" },
      { id: "r5", text: "Sem autoridade" }
    ],
    commonObjections: [
      { id: "obj1", objection: "Preço alto", response: "Entendo. O preço reflete o resultado X que vamos gerar. Se compararmos com o custo de não resolver (R$ Y/mês), o payback é de Z meses. Vamos parcelar?" },
      { id: "obj2", objection: "Preciso de mais tempo", response: "Sem problemas. O que especificamente precisa ser revisto? Posso enviar um comparativo ou case similar para ajudar na decisão?" },
      { id: "obj3", objection: "Vou falar com a concorrência", response: "Justo. O que você vai avaliar neles? Se for preço, temos condições. Se for entrega, nosso SLA é X. Quer que eu prepare uma tabela comparativa?" },
      { id: "obj4", objection: "Sócio não aprovou", response: "Entendi. Vamos agendar uma call rápida de 15 min com ele? Eu levo os números de ROI e risco." },
      { id: "obj5", objection: "Sem orçamento agora", response: "Podemos estruturar um pagamento escalonado ou iniciar com o módulo essencial? O que viabiliza o início este mês?" }
    ],
    nextAction: "Assinatura contrato / Onboarding",
    approvalCriteria: "Todas as objeções tratadas + Condições acordadas + Autoridade presente",
    rejectionCriteria: "Objeção intransponível (ex: budget zero, autoridade ausente, concorrente escolhido)"
  }
];

// VISIBILIDADE PADRÃO DE MÓDULOS
export const DEFAULT_VISIBILITY = {
  dashboard: true,
  daily_sales: true,
  crm: true,
  leads: true,
  tasks: true,
  gestao_a_vista: true,
  performance: {
    root: true,
    goals: true,
    matrix: true,
    podium: true,
    ranking: true
  }
};

// PERMISSÕES PADRÃO POR CARGO (ETAPAS DO KANBAN)
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  "Admin Geral": ["*"],
  "Gestor": ["*"],
  "Head of Sales": ["*"],
  "Team Leader": ["*"],
  "Marketing": [
    "Campanha / Conteúdo", "Criação de Landing Page", "Aprovação", "Iniciar Campanha", "Stand By", "Finalizar Campanha"
  ],
  "LDR": [
    "Novo Lead", "Primeiro Contato", "Contato Realizado", "Qualificação Inicial", "Qualificado", "Transferido", "Stand By", "Perdido",
    "Leads", "Tentativa de Contato", "Agendamento Realizado", "Descartado"
  ],
  "BDR": [
    "Prospect Alvo", "Prospecção", "Contato Realizado", "Conectado", "Qualificado", "Transferido", "Stand By", "Perdido"
  ],
  "SDR": [
    "Lead/Oportunidade Recebida", "Contato", "Qualificação MIN", "Qualificado", "Reunião Agendada", "Transferido", "Stand By", "Perdido",
    "Qualificação", "Tentativa de Contato", "Contato Realizado", "Agendamento Realizado", "Leads"
  ],
  "Closer": [
    "Reunião Agendada", "Reunião Realizada", "Diagnóstico", "Proposta", "Negociação", "Decisão", "Ganho", "Perdido", "Stand By",
    "Fechamento"
  ],
  "Hunter": [
    "Prospect Alvo", "Prospecção", "Contato", "Oportunidade Identificada", "Transferido", "Stand By", "Perdido"
  ],
  "Seller": [
    "Novo Lead", "Contato", "Qualificação MIN", "Reunião", "Diagnóstico", "Proposta", "Negociação", "Decisão", "Ganho", "Perdido", "Stand By"
  ],
  "Full Stack Seller": [
    "Novo Lead", "Contato", "Qualificação MIN", "Reunião", "Diagnóstico", "Proposta", "Negociação", "Decisão", "Ganho", "Perdido", "Stand By",
    "Leads", "Tentativa de Contato", "Contato Realizado", "Agendamento Realizado", "Qualificação", "Reunião Agendada", "Reunião Realizada", "Fechamento"
  ],
  "Onboarding": [
    "Cliente Ganho", "Onboarding Iniciado", "Dados / Documentos", "Configuração", "Implantação", "Onboarding Concluído", "Stand By", "Cancelado",
    "Onboarding", "Em Execução", "Entrega Final", "Projeto Finalizado"
  ],
  "CS (Customer Success)": [
    "Cliente Ativo", "Acompanhamento", "Adoção", "Resultado", "Sucesso / Renovação", "Oportunidade Comercial", "Churn / Cancelamento",
    "Renovação", "Upsell / Cross-sell"
  ],
  "Farmer": [
    "Cliente Ativo", "Relacionamento", "Identificação de Oportunidade", "Nova Necessidade", "Oportunidade Comercial", "Ganho", "Perdido", "Stand By",
    "Acompanhamento", "Renovação", "Upsell / Cross-sell"
  ],
  "CX (Customer Experience)": [
    "Interação", "Feedback", "Tratativa", "Resolvido"
  ]
};

export interface SystemModule {
  id: string;
  name: string;
  category: "Gestão a Vista" | "Operação" | "Cadastros" | "Planejamento" | "Marketing" | "Administração";
  path: string;
  description: string;
}

export const SYSTEM_MODULES: SystemModule[] = [
  { id: "dashboard", name: "Dashboard", category: "Gestão a Vista", path: "/app/dashboard", description: "Visão geral e KPIs principais" },
  { id: "daily_sales", name: "Meta Diária", category: "Gestão a Vista", path: "/app/daily-sales", description: "Acompanhamento diário de metas e sprints" },
  { id: "performance", name: "Performance", category: "Gestão a Vista", path: "/app/performance", description: "Ranking, pódio e avaliação da equipe" },
  { id: "crm", name: "CRM Pipeline", category: "Operação", path: "/app/crm", description: "Funil Kanban, negociações e oportunidades" },
  { id: "tasks", name: "Minha Agenda", category: "Operação", path: "/app/tasks", description: "Tarefas, follow-ups e compromissos" },
  { id: "leads", name: "Base de Leads", category: "Cadastros", path: "/app/leads", description: "Lista completa e prospecção de contatos" },
  { id: "products", name: "Produtos e Serviços", category: "Cadastros", path: "/app/products", description: "Catálogo de ofertas, preços e comissões" },
  { id: "playbooks", name: "Playbooks Comerciais", category: "Planejamento", path: "/app/playbooks", description: "Scripts de abordagem, objeções e diretrizes" },
  { id: "workflows", name: "Workflows", category: "Planejamento", path: "/app/workflows", description: "Gatilhos de passagem entre etapas" },
  { id: "automations", name: "Automações", category: "Planejamento", path: "/app/automations", description: "Ações automáticas e integrações" },
  { id: "landing_pages", name: "Landing Pages", category: "Marketing", path: "/app/landing-pages", description: "Criação de páginas com IA e links com UTM" },
  { id: "surveys", name: "Pesquisas (CSAT/NPS)", category: "Marketing", path: "/app/surveys", description: "Formulários de qualificação e pesquisas" },
  { id: "investments", name: "Investimentos", category: "Marketing", path: "/app/investments", description: "Gestão de tráfego pago e CAC" },
  { id: "users", name: "Time & Usuários", category: "Administração", path: "/app/users", description: "Gestão de acessos e membros da equipe" },
  { id: "settings", name: "Configurações", category: "Administração", path: "/app/settings", description: "Integrações, Google Drive e parâmetros" },
];

export const DEFAULT_ROLE_MODULES: Record<string, string[]> = {
  "Admin Geral": SYSTEM_MODULES.map(m => m.id),
  "Gestor": SYSTEM_MODULES.map(m => m.id),
  "Head of Sales": SYSTEM_MODULES.filter(m => m.id !== "settings").map(m => m.id),
  "Team Leader": ["dashboard", "daily_sales", "performance", "crm", "tasks", "leads", "products", "playbooks"],
  "Seller": ["dashboard", "daily_sales", "performance", "crm", "tasks", "leads", "products", "playbooks", "landing_pages", "surveys"],
  "Full Stack Seller": ["dashboard", "daily_sales", "performance", "crm", "tasks", "leads", "products", "playbooks", "landing_pages", "surveys"],
  "Closer": ["dashboard", "daily_sales", "performance", "crm", "tasks", "leads", "products", "playbooks"],
  "Hunter": ["daily_sales", "crm", "tasks", "leads", "products", "playbooks"],
  "SDR": ["daily_sales", "crm", "tasks", "leads", "playbooks"],
  "BDR": ["daily_sales", "crm", "tasks", "leads", "playbooks"],
  "LDR": ["daily_sales", "crm", "tasks", "leads", "playbooks"],
  "CS (Customer Success)": ["dashboard", "crm", "tasks", "leads", "products", "surveys"],
  "Farmer": ["dashboard", "crm", "tasks", "leads", "products"],
  "CX (Customer Experience)": ["dashboard", "tasks", "leads", "surveys"],
  "Onboarding": ["crm", "tasks", "leads", "products"],
  "Marketing": ["dashboard", "leads", "landing_pages", "surveys", "investments", "automations", "workflows"],
};

export const STAGES: Stage[] = DEFAULT_PIPELINES[0].stages.map(s => s.name);

export const STAGE_RULES: Record<string, string[]> = {
  Leads: ["Validar dados de contato", "Atribuir SDR responsável"],
  Contato: ["Tentativa WhatsApp (≤4h)", "Tentativa ligação (≤24h)"],
  Qualificação: ["Preencher BANT", "Identificar decisor"],
  Reunião: ["Agendar no Google Calendar", "Confirmar 24h antes"],
  Negociação: ["Enviar proposta formal", "Validar com Head se > R$ 30k"],
  Ganho: ["Assinatura do contrato", "Pagamento confirmado"],
};

export type SLA = "ok" | "alerta" | "critico" | "vencido";
export type Classification = "Lead" | "Cliente" | "VIP";
export type Temperature = "Frio" | "Morno" | "Quente";
export type LeadType = "Novo" | "Recorrente";
export type Strategy = "Down Sell" | "Up Sell" | "Cross Sell" | "Bundle Sell" | "Free" | "Nenhuma";
export type DecisionRole = "Decisor" | "Co-Decisor" | "Influenciador" | "Não Decisor";
export type MINScore = "MIN" | "MI" | "IN" | "MN" | "M" | "I" | "N" | "Nenhum";
export type CaptureType = "Inbound" | "Outbound" | "Manual";
export type LeadStatus = "Ativo" | "Desqualificado" | "Excluido";

export type QuestionType = 
  | 'objective'
  | 'subjective'
  | 'single' 
  | 'multiple' 
  | 'nps' 
  | 'rating5' 
  | 'rating10' 
  | 'boolean' 
  | 'short_text' 
  | 'long_text' 
  | 'dropdown' 
  | 'satisfaction';

export interface Objection {
  id: string;
  title: string;
  category: string;
  response: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  recurring: boolean;
  recurrenceMonths?: number;
  installments?: number;
  imageUrl: string;
  strategy: Strategy;
  relatedProductIds: string[];
}

export const SLA_CONFIG: Record<SLA, { dot: string; label: string; text: string }> = {
  ok: { dot: "bg-success", label: "OK", text: "text-success" },
  alerta: { dot: "bg-warning", label: "Alerta", text: "text-warning" },
  critico: { dot: "bg-destructive animate-pulse", label: "Crítico", text: "text-destructive" },
  vencido: { dot: "bg-destructive", label: "Vencido", text: "text-destructive" },
};

export const CLASSIFICATION_CONFIG: Record<Classification, { label: string; cls: string }> = {
  Lead: { label: "Lead", cls: "bg-muted text-muted-foreground" },
  Cliente: { label: "Cliente", cls: "bg-primary/15 text-primary" },
  VIP: { label: "VIP", cls: "bg-[var(--gold)]/20 text-[var(--gold)]" },
};

export interface Activity {
  id: string;
  type: 'note' | 'stage_change' | 'pipeline_transfer' | 'owner_change' | 'auto_handoff' | 'conversion' | 'system' | 'task' | 'score_change';
  description: string;
  timestamp: string;
  user?: string;
  metadata?: {
    oldScore?: number;
    newScore?: number;
    diff?: number;
    fromStage?: string;
    toStage?: string;
    fromPipeline?: string;
    toPipeline?: string;
    fromOwner?: string;
    toOwner?: string;
    reason?: string;
  };
}

import { type MinQualification } from "@/lib/min-qualification";

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  whatsapp: string;
  value: number;
  stage: Stage;
  stageId?: string;
  owner: string;
  source: string;
  captureType?: CaptureType;
  classification: Classification;
  temperature: Temperature;
  type: LeadType;
  strategy: Strategy;
  decisionRole: DecisionRole;
  minScore: MINScore;
  status: LeadStatus;
  landingPage?: string;
  productId?: string;
  pipelineId?: string;
  tags: string[];
  score: number;
  prevScore?: number;
  sla: SLA;
  lastInteraction: string;
  createdAt: string;
  activities: Activity[];
  completedCheckpoints?: string[];
  wonAt?: string;

  // Rastreamento de Movimentações de Pipeline
  dataMovimentacao?: string;
  dataTransferencia?: string;
  previousOwner?: string;
  previousPipelineId?: string;
  previousStage?: string;

  // Novos campos estruturados Comercial/CRM
  personType?: 'PF' | 'PJ';
  role?: string;
  revenue?: number | string;
  capag?: number | string;
  minQualification?: MinQualification;

  // Rastreamento de Recorrência e Visitas a LPs
  lpVisits?: number;
  isCustomer?: boolean;
  isRecurring?: boolean;
  purchaseCount?: number;
  lastVisitedLp?: string;
  lastLpVisitAt?: string;

  metadata?: any;
}

export const OWNERS: string[] = [];
export const SOURCES = [
  "Instagram",
  "Facebook",
  "Google",
  "WhatsApp",
  "Indicação",
  "Direto",
  "Landing Page",
  "LinkedIn Ads",
  "Outro"
];
export const LANDING_PAGE_IDS = ["voucher-25", "ebook-vendas", "webinar-ia", "diag-comercial"];

export const DEFAULT_SYSTEM_LEADS: Lead[] = [];

export const LEADS: Lead[] = [];

export const MOCK_PRODUCTS: Product[] = [
  { id: "p-1", name: "Consultoria Premium", category: "Serviços", costPrice: 2000, salePrice: 15000, recurring: false, imageUrl: "https://images.unsplash.com/photo-1454165833767-027ff33027ef?auto=format&fit=crop&w=800&q=80", strategy: "Up Sell", relatedProductIds: [] },
  { id: "p-2", name: "Licença Enterprise (Anual)", category: "Software", costPrice: 5000, salePrice: 45000, recurring: true, recurrenceMonths: 12, imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80", strategy: "Nenhuma", relatedProductIds: [] },
  { id: "p-3", name: "Setup & Onboarding", category: "Serviços", costPrice: 500, salePrice: 5000, recurring: false, imageUrl: "https://images.unsplash.com/photo-1552664730(5)ca884978?auto=format&fit=crop&w=800&q=80", strategy: "Cross Sell", relatedProductIds: [] },
];

export const MOCK_OBJECTIONS: Objection[] = [
  { id: "obj-1", title: "Está caro", category: "Preço", response: "Entendo. Comparado a quê exatamente o valor parece alto? Vamos analisar o ROI esperado." },
  { id: "obj-2", title: "Vou falar com meu sócio", category: "Autoridade", response: "Perfeito. Que tal agendarmos uma conversa de 10 min com ele para tirarmos as dúvidas técnicas?" },
];

export type LPTemplate = "Modern" | "Minimal" | "Glass" | "Bold" | "Corporate";

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  question: string;
  text?: string;
  options?: string[];
  allowMultiple?: boolean;
  required?: boolean;
  category?: string;
  mapToProfile?: 'minScore' | 'decisionRole' | 'type' | 'strategy';
  minDimension?: 'company' | 'role' | 'm' | 'i' | 'n';
}

export interface LPFeature { id: string; title: string; desc: string; icon?: string; }
export interface LPStat { id: string; label: string; value: string; }
export interface LPTrustItem { id: string; label: string; }
export interface LPBrand { id: string; logoUrl: string; style: 'original' | 'template'; }

export interface LandingPage {
  id: string;
  name: string;
  title?: string;
  slug?: string;
  type: string;
  template: LPTemplate | string;
  externalUrl?: string;
  visits: number;
  leads: number;
  conv: number;
  status: string;
  productId?: string;
  surveyId?: string;
  useMinQualification?: boolean;
  minSurveyId?: string;
  additionalSurveyIds?: string[];
  headline?: string;
  description?: string;
  badgeText?: string;
  ctaText?: string;
  imageUrl?: string;
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;
  videoUrl?: string;
  documentName?: string;
  whatsappNumbers?: string[];
  whatsappMessage?: string;
  questions?: SurveyQuestion[];
  rewardTitle?: string;
  rewardFile?: string;
  rewardFileName?: string;
  features?: LPFeature[];
  stats?: LPStat[];
  trustItems?: LPTrustItem[];
  brands?: LPBrand[];
  footerText?: string;
  headlineSize?: number;
  descriptionSize?: number;
  imageWidth?: number;
  spacing?: number;
  layout?: 'default' | 'reverse';
  primaryColor?: string;
  secondaryColor?: string;
  headlineColor?: string;
  descriptionColor?: string;
  studentsText?: string;
  ratingLabel?: string;
  ratingValue?: string;
  brandsTitle?: string;
  featuresTitle?: string;
  featuresSubtitle?: string;
  finalCtaTitle?: string;
  finalCtaSubtitle?: string;
  finalCtaButtonText?: string;
  logoStyle?: 'original' | 'template';
  logoSize?: number;
  settings?: any;
}

export const LP_TEMPLATES: { v: LPTemplate; l: string; img: string }[] = [
  { v: "Modern", l: "Moderno", img: "/templates/modern.png" },
  { v: "Minimal", l: "Minimalista", img: "/templates/minimal.png" },
  { v: "Glass", l: "Glassmorphism", img: "/templates/glass.png" },
  { v: "Bold", l: "Bold & Vibrant", img: "/templates/bold.png" },
  { v: "Corporate", l: "Corporativo", img: "/templates/corporate.png" },
];

export interface Survey {
  id: string;
  name: string;
  title?: string;
  type: 'mass' | 'individual';
  purpose?: 'common' | 'min';
  status: 'active' | 'paused';
  createdAt: string;
  created_at?: string;
  visits: number;
  completions: number;
  questions: SurveyQuestion[];
  settings: {
    headline: string;
    description: string;
    buttonText: string;
    thankYouMessage: string;
    accentColor?: string;
  };
  reward?: {
    title: string;
    type: 'file' | 'link' | 'whatsapp';
    value: string;
  };
  template?: LPTemplate;
}

export interface SurveyResponse {
  id: string;
  surveyId?: string;
  survey_id?: string;
  leadId?: string;
  lead_id?: string;
  landingPageId?: string;
  landing_page_id?: string;
  answers: Record<string, any>;
  completedAt?: string;
  created_at?: string;
  durationSeconds?: number;
  duration_seconds?: number;
  leadName?: string;
  leadCompany?: string;
  minClassification?: string;
}

export const MOCK_SURVEYS: Survey[] = [];
export const MOCK_SURVEY_RESPONSES: SurveyResponse[] = [];

export const AUTOMATIONS = [
  { id: 1, name: "Follow-up 24h sem resposta", trigger: "Inatividade > 24h", action: "Cria tarefa + envia WhatsApp", active: true, runs: 142 },
];

export interface PlaybookChecklistItem { id: string; text: string; }
export interface PlaybookQuestion { id: string; text: string; type: 'mandatory' | 'optional'; }
export interface PlaybookFlag { id: string; text: string; }
export interface PlaybookObjection { id: string; objection: string; response: string; }

export interface Playbook {
  id: string;
  title: string;
  category: string;
  content: string;
  objective: string;
  iconType: 'message' | 'lightbulb' | 'sparkles' | 'chevron' | 'book';
  specialty: string;           
  whenToUse: string;           
  expectedResult: string;      
  avgDuration: string;         
  initialChecklist: PlaybookChecklistItem[]; 
  mandatoryQuestions: PlaybookQuestion[];    
  optionalQuestions: PlaybookQuestion[];     
  greenFlags: PlaybookFlag[];                
  redFlags: PlaybookFlag[];                  
  commonObjections: PlaybookObjection[];     
  nextAction: string;                        
  approvalCriteria: string;                  
  rejectionCriteria: string;                 
}

export const PLAYBOOKS: Playbook[] = [];