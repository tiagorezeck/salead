"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { downloadDataFile } from "@/lib/data-portability";
import { 
  type Lead, 
  type LandingPage, 
  type Product, 
  type Survey, 
  type SurveyQuestion, 
  type SurveyResponse, 
  type Pipeline, 
  type PipelineStage, 
  type PipelineMovementHistory,
  type StageType,
  type Objection, 
  type Playbook,
  type SLA,
  type Activity,
  STAGES,
  STAGE_RULES,
  DEFAULT_PIPELINES,
  DEFAULT_PLAYBOOKS,
  DEFAULT_VISIBILITY,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_ROLE_MODULES,
  SYSTEM_MODULES,
  type SystemModule
} from "@/data/mock";
import { calculateMinQualification, parseLegacyMinScore } from "@/lib/min-qualification";
import { calculateLeadScore, calculateLeadTemperature } from "@/lib/scoring";
import { SURVEY_PRESETS } from "@/lib/survey-templates";
import { normalizePhone, validateEmail, parseCurrencyBR } from "@/lib/validators";
import { 
  getDriveConfig, 
  pushToGoogleDrive,
  forceReadSpreadsheetFromDrive,
  clearLpTestDataInDrive,
  deleteLandingPageFromDrive,
  deleteLeadFromDrive,
  deleteProductFromDrive,
  deleteTaskFromDrive,
  deleteSurveyFromDrive,
  cleanDatabaseKeepOneInDrive,
  createCheckpoint,
  saveSystemCheckpoint,
  formatCheckpointName,
  saveDriveConfig
} from "@/services/googleDriveDatabaseService";
import { cloudStore, purgeLegacyBusinessLocalStorage } from "@/services/cloudStorageService";
import { getCurrentUser, getRegisteredUsers, saveRegisteredUser, saveRegisteredUsers, removeRegisteredUser, DEFAULT_REGISTERED_ADMIN, SYSTEM_STANDBY_ADMIN } from "@/lib/auth-service";
import { 
  type LeadRoutingConfig, 
  DEFAULT_LEAD_ROUTING_CONFIG, 
  checkLeadClaimEligibility,
  isContactMadeStage 
} from "@/lib/lead-rules";

export type { Lead, Product, LandingPage, Survey, SurveyQuestion, SurveyResponse, Pipeline, Objection, Playbook, SLA, Activity };

export const DEFAULT_SURVEYS: Survey[] = SURVEY_PRESETS.map(p => ({
  id: p.id,
  name: p.name,
  type: (p.id.includes("min") || p.id.includes("qualificacao")) ? "individual" : "mass",
  purpose: (p.id.includes("min") || p.id.includes("qualificacao")) ? "min" : "common",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  questions: p.questions ? JSON.parse(JSON.stringify(p.questions)) : [],
  settings: {
    headline: p.name,
    description: p.description,
    buttonText: "Iniciar Diagnóstico",
    thankYouMessage: "Obrigado por responder nosso diagnóstico!",
    accentColor: p.accentColor || "#FF6B00"
  },
  reward: {
    title: "Diagnóstico Completo",
    type: "whatsapp",
    value: ""
  },
  template: "Modern",
  completions: 0,
  visits: 0,
  created_at: new Date().toISOString()
}));

const getLocalSurveys = (): Survey[] => {
  return Array.isArray(cloudStore.getState().surveys) ? cloudStore.getState().surveys : [];
};

const saveLocalSurveys = (surveys: Survey[]) => {
  cloudStore.mutate((draft) => {
    draft.surveys = surveys;
  });
};

const getLocalSurveyResponses = (): SurveyResponse[] => {
  return Array.isArray(cloudStore.getState().surveyResponses) ? cloudStore.getState().surveyResponses : [];
};

const saveLocalSurveyResponses = (responses: SurveyResponse[]) => {
  cloudStore.mutate((draft) => {
    draft.surveyResponses = responses;
  });
};

export type GoalType = 'money' | 'conversion' | 'loss' | 'ticket_count' | 'avg_ticket' | 'sla_min';

export interface DateFilter {
  from: Date | undefined;
  to: Date | undefined;
  label: string;
  type: string;
}

export interface UserGoal {
  id: string;
  type: GoalType;
  label: string;
  target: number;
  unit: string;
}

export interface OperationalGoal {
  id: string;
  label: string;
  completed: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  contact?: string;
  avatar_url?: string;
  avatarUrl?: string;
  status: 'Ativo' | 'Inativo';
  avatar?: string;
  goals?: UserGoal[];
  operationalGoals?: OperationalGoal[];
  theme?: string;
  allowedModules?: string[];
  customPermissionsEnabled?: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  lead: string;
  leadId?: string;
  owners: string[];
  due: string;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  done: boolean;
  subtasks: Subtask[];
  createdAt: string;
  completedAt?: string;
}

export interface VisibilitySettings {
  dashboard: boolean;
  daily_sales: boolean;
  crm: boolean;
  leads: boolean;
  tasks: boolean;
  gestao_a_vista: boolean;
  performance: {
    root: boolean;
    goals: boolean;
    matrix: boolean;
    podium: boolean;
    ranking: boolean;
  };
}

export interface HandoffRule {
  id: string;
  name: string;
  sourcePipelineId: string;
  sourceStage: string;
  targetPipelineId: string;
  targetStage: string;
  actionType: string;
  active: boolean;
}

export interface Automation {
  id: number;
  name: string;
  category: string;
  triggerEvent: string;
  priority: string;
  active: boolean;
  actionType: string;
  actionConfig: any;
  runs: number;
  trigger?: string;
  action?: string;
  created_at: string;
}

export interface WorkflowRule {
  id: string;
  text: string;
  mandatory: boolean;
}

export interface StageWorkflow {
  id?: string;
  pipelineId: string;
  stageName: string;
  rules: WorkflowRule[];
}

export interface CompanySettings {
  id: string;
  name: string;
  sector: string;
  purpose: string;
  logo: string | null;
  contact: string;
  email: string;
  address: string;
  website: string;
  updated_at: string;
  ai_provider: string;
  ai_openrouter_key: string;
  ai_google_key: string;
  ai_model_id: string;
  ai_model_name: string;
}

export type ExtendedLead = Lead;
export type SLAThresholds = { alerta: number; critico: number; vencido: number; };

// ==========================================
// DTOs & MAPPERS (camelCase <-> snake_case)
// ==========================================

const isUUID = (str?: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export const mapLeadFromDb = (row: any): Lead => ({
  id: row.id,
  name: row.name || "",
  company: row.company || "",
  email: row.email ? row.email.trim().toLowerCase() : "",
  whatsapp: row.whatsapp ? normalizePhone(row.whatsapp) : "",
  value: Number(row.value) || 0,
  stage: row.stage || "Leads",
  owner: row.owner || "",
  source: row.source || "Manual",
  classification: row.classification || "Lead",
  temperature: row.temperature || "Frio",
  type: row.type || "Novo",
  strategy: row.strategy || "Nenhuma",
  decisionRole: row.decision_role || "Não Decisor",
  minScore: row.min_score || "Nenhum",
  landingPage: row.landing_page,
  productId: row.product_id,
  pipelineId: row.pipeline_id || "prospection",
  tags: Array.isArray(row.tags) ? row.tags : [],
  score: Number(row.score) || 0,
  prevScore: row.prev_score ? Number(row.prev_score) : undefined,
  sla: row.sla || "ok",
  lastInteraction: row.last_interaction || "Sem contato",
  createdAt: row.created_at || new Date().toISOString(),
  wonAt: row.won_at,
  activities: Array.isArray(row.activities) ? row.activities : [],
  completedCheckpoints: Array.isArray(row.completed_checkpoints) ? row.completed_checkpoints : [],
  captureType: row.metadata?.captureType || (row.source?.includes("LP") || row.source?.includes("Landing") ? "Inbound" : "Manual"),
  status: row.metadata?.status || "Ativo",

  // Novos campos estruturados Comercial/CRM
  personType: row.metadata?.personType || row.person_type || "PJ",
  role: row.metadata?.role || row.role || "",
  revenue: row.metadata?.revenue !== undefined ? row.metadata.revenue : (row.revenue !== undefined ? row.revenue : ""),
  capag: row.metadata?.capag !== undefined ? row.metadata.capag : (row.capag !== undefined ? row.capag : ""),
  minQualification: row.metadata?.minQualification || (row.min_score ? parseLegacyMinScore(row.min_score) : undefined),

  // Rastreamento de Recorrência e Visitas a LPs
  lpVisits: Number(row.metadata?.lpVisits || row.lp_visits) || (row.source?.includes("LP") || row.landing_page ? 1 : 0),
  isCustomer: Boolean(row.metadata?.isCustomer || row.is_customer || row.classification === "Cliente" || row.stage === "Ganho" || row.stage === "Recebimento"),
  isRecurring: Boolean(row.metadata?.isRecurring || row.is_recurring || row.type === "Recorrente" || (row.metadata?.isCustomer && (Number(row.metadata?.lpVisits || 1) > 1))),
  purchaseCount: Number(row.metadata?.purchaseCount || row.purchase_count) || (row.stage === "Ganho" ? 1 : 0),
  lastVisitedLp: row.metadata?.lastVisitedLp || row.landing_page,
  lastLpVisitAt: row.metadata?.lastLpVisitAt || row.updated_at || row.created_at,

  metadata: row.metadata || {}
});

export const mapLeadToDb = (lead: Partial<Lead> & Record<string, any>) => {
  const payload: Record<string, any> = {};

  if (lead.name !== undefined) payload.name = lead.name;
  if (lead.company !== undefined) payload.company = lead.company;
  if (lead.email !== undefined) payload.email = lead.email ? lead.email.trim().toLowerCase() : "";
  if (lead.whatsapp !== undefined) payload.whatsapp = lead.whatsapp ? normalizePhone(lead.whatsapp) : "";
  if (lead.value !== undefined) payload.value = Number(lead.value) || 0;
  if (lead.stage !== undefined) payload.stage = lead.stage;
  if (lead.owner !== undefined) payload.owner = lead.owner;
  if (lead.source !== undefined) payload.source = lead.source;
  if (lead.classification !== undefined) payload.classification = lead.classification;
  if (lead.temperature !== undefined) payload.temperature = lead.temperature;
  if (lead.type !== undefined) payload.type = lead.type;
  if (lead.strategy !== undefined) payload.strategy = lead.strategy;
  
  if (lead.decisionRole !== undefined || lead.decision_role !== undefined) {
    payload.decision_role = lead.decisionRole || lead.decision_role;
  }
  if (lead.minScore !== undefined || lead.min_score !== undefined) {
    payload.min_score = lead.minScore || lead.min_score;
  }
  if (lead.landingPage !== undefined || lead.landing_page !== undefined) {
    payload.landing_page = lead.landingPage || lead.landing_page;
  }
  if (lead.productId !== undefined || lead.product_id !== undefined) {
    payload.product_id = lead.productId || lead.product_id;
  }
  if (lead.pipelineId !== undefined || lead.pipeline_id !== undefined) {
    const pId = lead.pipelineId || lead.pipeline_id;
    if (isUUID(pId)) {
      payload.pipeline_id = pId;
    }
  }
  if (lead.tags !== undefined) {
    payload.tags = Array.isArray(lead.tags) ? lead.tags : [];
  }
  if (lead.score !== undefined) {
    payload.score = Number(lead.score) || 0;
  }
  if (lead.prevScore !== undefined || lead.prev_score !== undefined) {
    payload.prev_score = lead.prevScore !== undefined ? Number(lead.prevScore) : lead.prev_score;
  }
  if (lead.sla !== undefined) payload.sla = lead.sla;
  if (lead.lastInteraction !== undefined || lead.last_interaction !== undefined) {
    payload.last_interaction = lead.lastInteraction || lead.last_interaction;
  }
  if (lead.wonAt !== undefined || lead.won_at !== undefined) {
    payload.won_at = lead.wonAt || lead.won_at;
  }
  if (lead.activities !== undefined) {
    payload.activities = Array.isArray(lead.activities) ? lead.activities : [];
  }
  if (lead.completedCheckpoints !== undefined || lead.completed_checkpoints !== undefined) {
    payload.completed_checkpoints = Array.isArray(lead.completedCheckpoints || lead.completed_checkpoints) 
      ? (lead.completedCheckpoints || lead.completed_checkpoints) 
      : [];
  }

  const existingMeta = lead.metadata || {};
  const newMeta = {
    ...existingMeta,
    ...(lead.captureType ? { captureType: lead.captureType } : {}),
    ...(lead.status ? { status: lead.status } : {}),
    ...(lead.personType !== undefined ? { personType: lead.personType } : {}),
    ...(lead.role !== undefined ? { role: lead.role } : {}),
    ...(lead.revenue !== undefined ? { revenue: lead.revenue } : {}),
    ...(lead.capag !== undefined ? { capag: lead.capag } : {}),
    ...(lead.minQualification !== undefined ? { minQualification: lead.minQualification } : {}),
    ...(lead.lpVisits !== undefined ? { lpVisits: lead.lpVisits } : {}),
    ...(lead.isCustomer !== undefined ? { isCustomer: lead.isCustomer } : {}),
    ...(lead.isRecurring !== undefined ? { isRecurring: lead.isRecurring } : {}),
    ...(lead.purchaseCount !== undefined ? { purchaseCount: lead.purchaseCount } : {}),
    ...(lead.lastVisitedLp !== undefined ? { lastVisitedLp: lead.lastVisitedLp } : {}),
    ...(lead.lastLpVisitAt !== undefined ? { lastLpVisitAt: lead.lastLpVisitAt } : {}),
  };
  payload.metadata = newMeta;

  return payload;
};

export const mapTaskFromDb = (row: any): Task => ({
  id: row.id,
  title: row.title || "",
  lead: row.lead || "",
  leadId: row.lead_id,
  owners: Array.isArray(row.owners) ? row.owners : [],
  due: row.due || "",
  priority: row.priority || "media",
  done: !!row.done,
  subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
  createdAt: row.created_at || new Date().toISOString(),
  completedAt: row.completed_at
});

export const mapTaskToDb = (task: Partial<Task> & Record<string, any>) => {
  const payload: Record<string, any> = {};
  if (task.title !== undefined) payload.title = task.title;
  if (task.lead !== undefined) payload.lead = task.lead;
  if (task.leadId !== undefined || task.lead_id !== undefined) {
    const lId = task.leadId || task.lead_id;
    payload.lead_id = isUUID(lId) ? lId : null;
  }
  if (task.owners !== undefined) payload.owners = Array.isArray(task.owners) ? task.owners : [];
  if (task.due !== undefined) payload.due = task.due || null;
  if (task.priority !== undefined) payload.priority = task.priority;
  if (task.done !== undefined) {
    payload.done = !!task.done;
    if (task.done) payload.completed_at = new Date().toISOString();
  }
  if (task.subtasks !== undefined) payload.subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  return payload;
};

export const mapProductFromDb = (row: any): Product => ({
  id: row.id,
  name: row.name || "",
  category: row.category || "Geral",
  costPrice: Number(row.cost_price) || 0,
  salePrice: Number(row.sale_price) || 0,
  recurring: !!row.recurring,
  recurrenceMonths: row.recurrence_months || 12,
  installments: row.installments || 1,
  imageUrl: row.image_url || "",
  strategy: row.strategy || "Nenhuma",
  relatedProductIds: Array.isArray(row.related_product_ids) ? row.related_product_ids : []
});

export const mapProductToDb = (product: Partial<Product> & Record<string, any>) => {
  const payload: Record<string, any> = {};
  if (product.name !== undefined) payload.name = product.name;
  if (product.category !== undefined) payload.category = product.category;
  if (product.costPrice !== undefined || product.cost_price !== undefined) {
    payload.cost_price = Number(product.costPrice ?? product.cost_price) || 0;
  }
  if (product.salePrice !== undefined || product.sale_price !== undefined) {
    payload.sale_price = Number(product.salePrice ?? product.sale_price) || 0;
  }
  if (product.recurring !== undefined) payload.recurring = !!product.recurring;
  if (product.recurrenceMonths !== undefined || product.recurrence_months !== undefined) {
    payload.recurrence_months = Number(product.recurrenceMonths ?? product.recurrence_months) || 12;
  }
  if (product.installments !== undefined) payload.installments = Number(product.installments) || 1;
  if (product.imageUrl !== undefined || product.image_url !== undefined) {
    payload.image_url = product.imageUrl || product.image_url || "";
  }
  if (product.strategy !== undefined) payload.strategy = product.strategy;
  if (product.relatedProductIds !== undefined || product.related_product_ids !== undefined) {
    const rawIds = product.relatedProductIds || product.related_product_ids || [];
    payload.related_product_ids = Array.isArray(rawIds) ? rawIds.filter(id => isUUID(id)) : [];
  }
  return payload;
};

export const mapPlaybookFromDb = (row: any): Playbook => ({
  id: row.id,
  title: row.title || "",
  category: row.category || "Geral",
  content: row.content || "",
  objective: row.objective || "",
  iconType: row.icon_type || "message",
  specialty: row.specialty || "",
  whenToUse: row.when_to_use || "",
  expectedResult: row.expected_result || "",
  avgDuration: row.avg_duration || "",
  initialChecklist: Array.isArray(row.initial_checklist) ? row.initial_checklist : [],
  mandatoryQuestions: Array.isArray(row.mandatory_questions) ? row.mandatory_questions : [],
  optionalQuestions: Array.isArray(row.optional_questions) ? row.optional_questions : [],
  greenFlags: Array.isArray(row.green_flags) ? row.green_flags : [],
  redFlags: Array.isArray(row.red_flags) ? row.red_flags : [],
  commonObjections: Array.isArray(row.common_objections) ? row.common_objections : [],
  nextAction: row.next_action || "",
  approvalCriteria: row.approval_criteria || "",
  rejectionCriteria: row.rejection_criteria || ""
});

export const mapPlaybookToDb = (pb: Partial<Playbook> & Record<string, any>) => {
  const payload: Record<string, any> = {};
  if (pb.title !== undefined) payload.title = pb.title;
  if (pb.category !== undefined) payload.category = pb.category;
  if (pb.content !== undefined) payload.content = pb.content;
  if (pb.objective !== undefined) payload.objective = pb.objective;
  if (pb.iconType !== undefined || pb.icon_type !== undefined) {
    payload.icon_type = pb.iconType || pb.icon_type;
  }
  if (pb.specialty !== undefined) payload.specialty = pb.specialty;
  if (pb.whenToUse !== undefined || pb.when_to_use !== undefined) {
    payload.when_to_use = pb.whenToUse || pb.when_to_use;
  }
  if (pb.expectedResult !== undefined || pb.expected_result !== undefined) {
    payload.expected_result = pb.expectedResult || pb.expected_result;
  }
  if (pb.avgDuration !== undefined || pb.avg_duration !== undefined) {
    payload.avg_duration = pb.avgDuration || pb.avg_duration;
  }
  if (pb.initialChecklist !== undefined || pb.initial_checklist !== undefined) {
    payload.initial_checklist = pb.initialChecklist || pb.initial_checklist;
  }
  if (pb.mandatoryQuestions !== undefined || pb.mandatory_questions !== undefined) {
    payload.mandatory_questions = pb.mandatoryQuestions || pb.mandatory_questions;
  }
  if (pb.optionalQuestions !== undefined || pb.optional_questions !== undefined) {
    payload.optional_questions = pb.optionalQuestions || pb.optional_questions;
  }
  if (pb.greenFlags !== undefined || pb.green_flags !== undefined) {
    payload.green_flags = pb.greenFlags || pb.green_flags;
  }
  if (pb.redFlags !== undefined || pb.red_flags !== undefined) {
    payload.red_flags = pb.redFlags || pb.red_flags;
  }
  if (pb.commonObjections !== undefined || pb.common_objections !== undefined) {
    payload.common_objections = pb.commonObjections || pb.common_objections;
  }
  if (pb.nextAction !== undefined || pb.next_action !== undefined) {
    payload.next_action = pb.nextAction || pb.next_action;
  }
  if (pb.approvalCriteria !== undefined || pb.approval_criteria !== undefined) {
    payload.approval_criteria = pb.approvalCriteria || pb.approval_criteria;
  }
  if (pb.rejectionCriteria !== undefined || pb.rejection_criteria !== undefined) {
    payload.rejection_criteria = pb.rejectionCriteria || pb.rejection_criteria;
  }
  return payload;
};

export const LOCAL_LP_STORAGE_KEY = "comet_local_landing_pages";
export const DELETED_LP_STORAGE_KEY = "comet_deleted_lp_ids";
export const LP_SEED_INITIALIZED_KEY = "comet_lp_seed_initialized";

export const getDeletedLandingPageIds = (): string[] => {
  const list = cloudStore.getState().deletedLpIds;
  return Array.isArray(list) ? list : [];
};

export const addDeletedLandingPageId = (id: string) => {
  if (!id) return;
  const current = getDeletedLandingPageIds();
  if (!current.includes(id)) {
    cloudStore.mutate((draft) => {
      draft.deletedLpIds = [...(draft.deletedLpIds || []), id];
    });
  }
};

export const removeDeletedLandingPageId = (id: string) => {
  if (!id) return;
  const current = getDeletedLandingPageIds();
  if (current.includes(id)) {
    cloudStore.mutate((draft) => {
      draft.deletedLpIds = (draft.deletedLpIds || []).filter((item) => item !== id);
    });
  }
};

export const notifyRealtimeSync = () => {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("salead_database_root_updated"));
    const bc = new BroadcastChannel("comet_realtime_sync");
    bc.postMessage({ type: "CLOUD_INVALIDATE", timestamp: Date.now() });
    bc.close();
  } catch {}
};

export const getLocalLandingPages = (): LandingPage[] => {
  const list = cloudStore.getState().landingPages;
  return Array.isArray(list) ? list : [];
};

export const saveLocalLandingPages = (lps: LandingPage[], skipPush = true) => {
  cloudStore.mutate(
    (draft) => {
      draft.landingPages = Array.isArray(lps) ? lps : [];
    },
    { skipPush }
  );
};

export const getInitialAILandingPages = (): LandingPage[] => [
  {
    id: "lp_ai_mentoria_cro",
    name: "Mentoria High-Ticket & CRO",
    title: "Mentoria High-Ticket & CRO",
    type: "Gerada por IA",
    template: "COMET",
    status: "Ativa",
    visits: 0,
    leads: 0,
    conv: 0,
    niche: "Mentoria High-Ticket & Infoprodutos",
    cityOrRegion: "São Paulo, SP",
    targetAudience: "Infoprodutores, Mentores e Donos de Agência faturando acima de R$ 30k/mês",
    accentColor: "purple",
    theme: "dark",
    slug: "mentoria-high-ticket-cro",
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    visibility: {
      hero: true,
      socialProof: true,
      quiz: true,
      bentoGrid: true,
      testimonials: true,
      formSection: true,
      faq: true,
      stickyMobileCta: true,
    },
    sectionOrder: ["hero", "socialProof", "quiz", "bentoGrid", "testimonials", "formSection", "faq"],
    hero: {
      model: "split_image",
      badgeText: "⚡ Vagas Abertas para São Paulo - Turma VIP",
      badgeIcon: "Zap",
      headline: "Escale suas Vendas High-Ticket com Tráfego Direto e Conversão Extrema",
      subheadline: "O método definitivo para transformar leads qualificados em clientes de alto valor todos os dias com segurança e previsibilidade.",
      mediaType: "image",
      imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
      ctaText: "QUERO ME CANDIDATAR À MENTORIA",
      ctaSubtext: "⚡ Análise de perfil em menos de 10 minutos via WhatsApp",
      countdownMinutes: 14,
      ratingScore: "4.9/5",
      ratingText: "+14.850 empresários impactados e R$ 48M+ gerados",
      socialProofAvatars: [
        { name: "Lucas M.", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" },
        { name: "Beatriz R.", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" },
        { name: "Carlos E.", avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80" },
      ],
      b2bMetrics: [
        { id: "b2b_1", value: "+340%", label: "Crescimento Médio", sublabel: "Em menos de 90 dias" },
        { id: "b2b_2", value: "99.4%", label: "Satisfação Verificada", sublabel: "Avaliações auditadas" },
        { id: "b2b_3", value: "10 Min", label: "Tempo de Resposta", sublabel: "Atendimento VIP" },
      ],
      scarcityLabel: "Vagas Restantes para São Paulo",
      scarcityRemainingSlots: 4,
      scarcityTotalSlots: 15,
    },
    socialProof: {
      marqueeTitle: "EMPRESAS E MENTORADOS QUE APROVAM NOSSO MÉTODO",
      metrics: [
        { id: "m1", value: "+R$ 48.7M", label: "Faturamento Gerado", sublabel: "Pelos mentorados em 12 meses", iconName: "TrendingUp" },
        { id: "m2", value: "3.8x", label: "ROAS Médio", sublabel: "Em tráfego direto de conversão", iconName: "Zap" },
        { id: "m3", value: "99.4%", label: "Taxa de Aprovação", sublabel: "Avaliações de alta satisfação", iconName: "ShieldCheck" },
        { id: "m4", value: "+14.850", label: "Negócios Impactados", sublabel: "Em todo território nacional", iconName: "Users" },
      ],
      marqueeLogos: ["Forbes Brasil", "Exame", "InfoMoney", "Valor Econômico", "G1 Negócios", "TechCrunch"],
    },
    quiz: {
      badge: "DIAGNÓSTICO PERSONALIZADO",
      title: "Descubra se o seu negócio está pronto para a Aceleração",
      subtitle: "Responda 3 perguntas rápidas para liberar sua condição especial.",
      questions: [
        {
          id: "q1",
          question: "Qual é o seu objetivo de faturamento mensal?",
          description: "Definimos o ritmo de acordo com sua meta.",
          options: [
            { id: "opt_1", label: "Alcançar de R$ 50k a R$ 100k/mês", iconName: "TrendingUp", badge: "Alta Demanda" },
            { id: "opt_2", label: "Escalar acima de R$ 100k/mês no perpétuo", iconName: "Zap" },
            { id: "opt_3", label: "Estruturar equipe de vendas e fechar high-ticket", iconName: "Target" },
          ],
        },
      ],
      resultTitle: "Diagnóstico Aprovado!",
      resultDescription: "Seu perfil está qualificado para a nossa esteira de mentoria.",
    },
    bentoGrid: {
      badge: "ARQUITETURA DO MÉTODO",
      title: "Como funciona a Esteira de Alta Conversão",
      subtitle: "Uma estrutura em blocos desenhada para gerar vendas previsíveis e consistentes.",
      items: [
        { id: "b1", size: "large", title: "Funil Perpétuo de Tráfego Direto", description: "Estrutura validada para atrair leads prontos para comprar no mesmo dia.", tag: "Pilar 1", iconName: "Zap", metric: "+340% Conversão" },
        { id: "b2", size: "standard", title: "Diagnóstico de Qualificação", description: "Filtre curiosos e fale apenas com tomadores de decisão qualificados.", tag: "Pilar 2", iconName: "Target" },
        { id: "b3", size: "standard", title: "Fechamento High-Ticket 1-a-1", description: "Script consultivo testado para converter vendas de R$ 2k a R$ 15k.", tag: "Pilar 3", iconName: "ShieldCheck" },
      ],
    },
    testimonials: {
      badge: "PROVA SOCIAL REAL",
      title: "Resultados de quem já implementou o método",
      subtitle: "Depoimentos reais de alunos e mentorados.",
      items: [
        { id: "t1", name: "Guilherme S.", role: "Mentor de Vendas", companyOrCity: "São Paulo, SP", rating: 5, content: "Em 45 dias triplicamos o volume de vendas diretas pelo WhatsApp.", resultHighlight: "+320% ROI", verified: true, avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80" },
        { id: "t2", name: "Camila M.", role: "Fundadora de Agência", companyOrCity: "Rio de Janeiro, RJ", rating: 5, content: "O modelo de qualificação eliminou os curiosos da nossa equipe comercial.", resultHighlight: "R$ 140k em 30d", verified: true, avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" },
      ],
    },
    formSection: {
      badge: "ETAPA FINAL: GARANTA SUA VAGA",
      title: "Preencha seus dados para receber o diagnóstico comercial",
      subtitle: "Entraremos em contato via WhatsApp em menos de 10 minutos.",
      ctaButtonText: "QUERO MINHA SESSÃO ESTRATÉGICA",
      guaranteeDays: 15,
      guaranteeText: "Garantia Incondicional de 15 Dias: Risco zero para testar e validar.",
      securityBadges: ["Criptografia SSL 256-bit", "Atendimento Imediato via WhatsApp", "Acesso Imediato"],
    },
    faq: [
      { id: "f1", question: "Como recebo o acesso após preencher?", answer: "Nossa equipe entra em contato pelo WhatsApp em até 10 minutos para agendar sua sessão de diagnóstico." },
      { id: "f2", question: "Para quem é indicada esta mentoria?", answer: "Para infoprodutores, mentores, donos de agência e consultores que já faturam e desejam escala previsível." },
    ],
  },
];

export const mapLPFromDb = (row: any): LandingPage => {
  if (!row || typeof row !== 'object') return { id: '', title: 'Landing Page', name: 'Landing Page' } as any;
  
  let config: any = {};
  const rawConfigSource = row["Config JSON"] ?? row.configJson ?? row.config ?? row["Config"];
  if (typeof rawConfigSource === 'object' && rawConfigSource !== null) {
    config = rawConfigSource;
  } else if (typeof rawConfigSource === 'string') {
    try { config = JSON.parse(rawConfigSource); } catch {}
  }

  let content: any = {};
  if (typeof row.content === 'object' && row.content !== null) {
    content = row.content;
  } else if (typeof row.content === 'string') {
    try { content = JSON.parse(row.content); } catch {}
  }

  const lpId = row.id || config.id || config.client_id || row.client_id || row.slug;
  const lpTitle = row.title || row.name || config.title || config.name || "Landing Page";
  const lpName = row.name || row.title || config.name || config.title || "Landing Page";
  const lpSlug = row.slug || config.slug || (lpTitle ? lpTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "");

  const rawVisits = Number(row.visits) || Number(config.visits) || 0;
  const leadsCount = Number(row.leads_count ?? row.leads ?? config.leads) || 0;
  const actualVisits = Math.max(rawVisits, leadsCount);
  const conversionRate = actualVisits > 0 ? Math.min(100, Math.round((leadsCount / actualVisits) * 100)) : 0;

  const heroModel = row.heroModel || row.hero?.model || config.heroModel || config.hero?.model || content.heroModel || content.hero?.model || row.hero_model || config.hero_model;
  const rawHero = (row.hero && Object.keys(row.hero).length > 0)
    ? row.hero
    : (config.hero || content.hero || row.hero);

  const hero = rawHero ? {
    ...rawHero,
    model: heroModel || rawHero.model || "split_image",
  } : undefined;

  const tCam = row.updatedAt ? new Date(row.updatedAt).getTime() : 0;
  const tSnk = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  const resolvedUpdated =
    (Number.isFinite(tCam) ? tCam : 0) >= (Number.isFinite(tSnk) ? tSnk : 0)
      ? (row.updatedAt || row.updated_at || config.updatedAt || config.updated_at)
      : (row.updated_at || row.updatedAt || config.updated_at || config.updatedAt);

  return {
    ...content,
    ...config,
    ...row,
    id: lpId,
    originalId: config.client_id || config.id || row.originalId || lpId,
    name: lpName,
    title: lpTitle,
    slug: lpSlug,
    template: row.template || config.template || "Modern",
    status: row.status || config.status || "Ativa",
    visits: actualVisits,
    leads: leadsCount,
    conv: conversionRate,
    type: row.type || config.type || "COMET CRO",
    surveyId: row.surveyId || config.surveyId || row.survey_id || undefined,
    externalUrl: row.externalUrl || config.externalUrl || row.external_url || undefined,
    heroModel: heroModel || hero?.model,
    hero,
    ...(resolvedUpdated ? { updatedAt: resolvedUpdated, updated_at: resolvedUpdated } : {}),
  };
};

export const mapLPToDb = (lp: Partial<LandingPage> & Record<string, any>) => {
  const { id, name, template, status, visits, leads, leads_count, created_at, updated_at, conv, ...config } = lp;
  const heroModel = lp.hero?.model || lp.heroModel || (config && config.heroModel) || (config && config.hero?.model) || "split_image";
  const payload: Record<string, any> = {
    name: name || lp.title || "Nova Landing Page",
    template: template || "Modern",
    status: status || "Ativa",
    visits: visits !== undefined ? Number(visits) : 0,
    leads_count: (leads_count ?? leads) !== undefined ? Number(leads_count ?? leads) : 0,
    hero_model: heroModel,
    heroModel: heroModel,
    config: {
      ...(config || {}),
      hero: lp.hero || config.hero,
      heroModel: heroModel,
      client_id: id || (config && config.id) || (config && config.client_id),
      slug: lp.slug || (config && config.slug) || (lp.title || name ? (lp.title || name).toLowerCase().replace(/[^a-z0-9]+/g, "-") : undefined),
      surveyId: lp.surveyId || (config && config.surveyId),
      externalUrl: lp.externalUrl || (config && config.externalUrl)
    }
  };
  if (id && isUUID(id)) {
    payload.id = id;
  }
  return payload;
};

export const mapAutomationFromDb = (row: any): Automation => ({
  id: row.id,
  name: row.name || "",
  category: row.category || "Geral",
  triggerEvent: row.trigger_event || "",
  priority: row.priority || "media",
  active: !!row.active,
  actionType: row.action_type || "notify",
  actionConfig: row.action_config || {},
  runs: Number(row.runs) || 0,
  created_at: row.created_at || new Date().toISOString()
});

export const mapAutomationToDb = (a: Partial<Automation> & Record<string, any>) => {
  const payload: Record<string, any> = {};
  if (a.name !== undefined) payload.name = a.name;
  if (a.category !== undefined) payload.category = a.category;
  if (a.triggerEvent !== undefined || a.trigger_event !== undefined) {
    payload.trigger_event = a.triggerEvent || a.trigger_event;
  }
  if (a.priority !== undefined) payload.priority = a.priority;
  if (a.active !== undefined) payload.active = !!a.active;
  if (a.actionType !== undefined || a.action_type !== undefined) {
    payload.action_type = a.actionType || a.action_type;
  }
  if (a.actionConfig !== undefined || a.action_config !== undefined) {
    payload.action_config = a.actionConfig || a.action_config;
  }
  if (a.runs !== undefined) payload.runs = Number(a.runs) || 0;
  return payload;
};

export const getStoredUserCustomPerms = (): Record<string, { enabled: boolean; modules: string[] }> => {
  return cloudStore.getState().userModulePermissions || {};
};

export const mapUserFromDb = (row: any): User => {
  const customPermsMap = getStoredUserCustomPerms();
  const storedUserPerms = customPermsMap[row.id] || (row.email ? customPermsMap[row.email.toLowerCase()] : null);

  const customPermissionsEnabled = storedUserPerms 
    ? storedUserPerms.enabled 
    : Boolean(row.custom_permissions_enabled || row.customPermissionsEnabled);

  const allowedModules = storedUserPerms
    ? storedUserPerms.modules
    : (Array.isArray(row.allowed_modules) ? row.allowed_modules : (Array.isArray(row.allowedModules) ? row.allowedModules : undefined));

  return {
    id: row.id,
    name: row.name || "Membro",
    email: row.email || "",
    role: row.role || "Closer",
    contact: row.contact || "",
    avatarUrl: row.avatar_url || "",
    avatar_url: row.avatar_url || "",
    status: (row.status === "Pendente" ? "Pendente" : (row.status === "Inativo" || row.status === "Bloqueado" ? "Inativo" : (row.status || "Ativo"))),
    goals: Array.isArray(row.goals) ? row.goals : [],
    operationalGoals: Array.isArray(row.operational_goals) ? row.operational_goals : [],
    allowedModules,
    customPermissionsEnabled,
  };
};

export const mapUserToDb = (u: Partial<User> & Record<string, any>) => {
  const payload: Record<string, any> = {};
  if (u.name !== undefined) payload.name = u.name;
  if (u.role !== undefined) payload.role = u.role;
  if (u.contact !== undefined) payload.contact = u.contact;
  if (u.avatarUrl !== undefined || u.avatar_url !== undefined) {
    payload.avatar_url = u.avatarUrl || u.avatar_url;
  }
  if (u.status !== undefined) payload.status = u.status;
  if (u.goals !== undefined) payload.goals = Array.isArray(u.goals) ? u.goals : [];
  if (u.operationalGoals !== undefined || u.operational_goals !== undefined) {
    payload.operational_goals = u.operationalGoals || u.operational_goals || [];
  }
  if (u.allowedModules !== undefined) {
    payload.allowed_modules = u.allowedModules;
  }
  if (u.customPermissionsEnabled !== undefined) {
    payload.custom_permissions_enabled = u.customPermissionsEnabled;
  }
  payload.updated_at = new Date().toISOString();
  return payload;
};

// ==========================================
// MAIN HOOK (ZERO-LOCALSTORAGE CLOUD ARCHITECTURE)
// ==========================================

let isGlobalSyncInitialized = false;
let initialCheckpointCreated = false;

function setupGlobalRealtimeSync(queryClient: any) {
  if (typeof window === "undefined" || isGlobalSyncInitialized) return;
  isGlobalSyncInitialized = true;

  purgeLegacyBusinessLocalStorage();

  let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedInvalidateAll = () => {
    if (invalidateTimer) clearTimeout(invalidateTimer);
    invalidateTimer = setTimeout(() => {
      queryClient.invalidateQueries();
    }, 180);
  };

  cloudStore.subscribe(() => {
    debouncedInvalidateAll();
  });

  cloudStore.startRealtimeEngine();

  window.addEventListener("salead_drive_synced", debouncedInvalidateAll);
  window.addEventListener("lp_visit_incremented", () => {
    cloudStore.pullNow(false).catch(() => {});
    debouncedInvalidateAll();
  });
  window.addEventListener("salead_database_root_updated", debouncedInvalidateAll);
}

export function useData() {
  const queryClient = useQueryClient();
  const invalidate = (key: string) => queryClient.invalidateQueries({ queryKey: [key] });

  // Sincronizador Global Unificado em Tempo Real (Singleton CloudStore)
  useEffect(() => {
    setupGlobalRealtimeSync(queryClient);
  }, [queryClient]);

  // Checkpoint Inicial Automático em RAM ao iniciar sessão
  useEffect(() => {
    if (typeof window !== "undefined" && !initialCheckpointCreated) {
      initialCheckpointCreated = true;
      try {
        const now = new Date();
        const checkpointName = formatCheckpointName(now);
        saveSystemCheckpoint({
          id: `cp_initial_${Date.now()}`,
          name: checkpointName,
          timestamp: now.toISOString(),
          leadsCount: (cloudStore.getState().leads || []).length,
          data: { version: "3.0.0", type: "initial_checkpoint", exportedAt: now.toISOString() }
        });
      } catch (err) {
        console.warn("Aviso ao criar checkpoint inicial:", err);
      }
    }
  }, []);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      if (typeof window !== "undefined") {
        const local = localStorage.getItem("comet_local_session");
        if (local) {
          try { return JSON.parse(local); } catch {}
        }
      }
      return null;
    }
  });

  const asArray = <T,>(v: T[] | null | undefined): T[] => Array.isArray(v) ? v : [];

  // 1. LEADS
  const leads = asArray(useQuery({ 
    queryKey: ['leads'], 
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    queryFn: async () => { 
      let dbLeads: Lead[] = [];

      // 1b. Server in-memory submissions (capturados via /api/submit-lead ou /api/leads)
      const parseLeadMinAndScore = (item: any) => {
        let minQual = item.minQualification;
        if (!minQual) {
          const rawMin = item.minScore || item.MinScore || item["Matriz MIN"] || item["MIN"] || item["Score MIN"] || "";
          if (typeof rawMin === "string") {
            const lower = rawMin.toLowerCase().trim();
            if (lower.includes("descarte") || lower.includes("nenhum") || lower === "0/3" || lower === "0" || lower === "desqualificado") {
              minQual = calculateMinQualification(0, 0, 0);
            } else {
              minQual = parseLegacyMinScore(rawMin);
            }
          } else if (item.M !== undefined || item.m !== undefined || item.I !== undefined || item.i !== undefined || item.N !== undefined || item.n !== undefined) {
            minQual = calculateMinQualification(
              item.M ?? item.m,
              item.I ?? item.i,
              item.N ?? item.n
            );
          }
        }

        const isDescarte = minQual?.classification === "DESCARTE" || item.classification === "Lead Desqualificado" || item.minScore === "Descarte" || item.minScore === "Nenhum";

        let minScore = item.minScore || item["Matriz MIN"] || item["MIN"] || (
          minQual?.classification === "QUENTE" ? "MIN" : 
          minQual?.classification === "MORNO" ? "MI" : 
          minQual?.classification === "FRIO" ? "M" : 
          "Nenhum"
        );
        if (isDescarte && minScore !== "Descarte") {
          minScore = "Descarte";
        }

        let temperature: any = item.temperature || item.Temperatura;
        if (isDescarte) {
          temperature = "Frio";
        } else if (!temperature) {
          temperature = minQual?.classification === "QUENTE" ? "Quente" : minQual?.classification === "MORNO" ? "Morno" : "Frio";
        }

        let finalScore: number;
        if (isDescarte) {
          const rawScore = Number(item.score ?? item.Score);
          finalScore = (!isNaN(rawScore) && rawScore <= 25 && rawScore >= 0) ? rawScore : (minQual?.total === 0 ? 0 : 15);
        } else {
          const rawScore = Number(item.score ?? item.Score);
          if (!isNaN(rawScore) && rawScore > 0 && rawScore !== 85) {
            finalScore = rawScore;
          } else {
            finalScore = calculateLeadScore({
              ...item,
              minScore,
              minQualification: minQual,
              temperature
            });
          }
        }

        return {
          minQual,
          minScore,
          temperature,
          score: finalScore
        };
      };

      // 1c. Nuvem Google Drive / Google Sheets via cloudStore (Zero-LocalStorage)
      let driveLeads: Lead[] = [];
      try {
        const cloudDb = cloudStore.getState();
        const rawDriveLeads = Array.isArray(cloudDb?.leads) ? cloudDb.leads : [];
        const rawDriveLpLeads = Array.isArray(cloudDb?.leads_landing_pages) ? cloudDb.leads_landing_pages : [];

        const mappedDriveLeads = [...rawDriveLeads, ...rawDriveLpLeads].map((item: any) => {
          const name = item.name || item.Nome || item["Nome"] || "Lead Capturado";
          const email = item.email || item.Email || item["Email"] || "";
          const whatsapp = item.whatsapp || item.WhatsApp || item["WhatsApp"] || "";
          const pageTitle = item.landingPageTitle || item["Landing Page (Título)"] || item.landingPage || item.landing_page || item.pageTitle || "Landing Page";
          const pageId = item.landingPageId || item["ID Landing Page"] || item.pageId || item.landing_page_id || "";
          const source = item.source || item.Origem || `LP: ${pageTitle}`;
          const { minQual, minScore, temperature, score } = parseLeadMinAndScore(item);

          return {
            ...item,
            id: item.id || item["ID Lead"] || item["ID"] || `drive_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name,
            company: item.company || item.Empresa || `${name} (LP: ${pageTitle})`,
            email,
            whatsapp,
            value: Number(item.value || item.Valor) || 0,
            stage: item.stage || item["Fase / Etapa"] || "Leads",
            owner: item.owner || item.Responsável || "Inbound LP",
            source,
            classification: item.classification || item.Classificação || "Lead",
            temperature,
            type: item.type || "Inbound",
            strategy: item.strategy || "CRO Auto",
            decisionRole: item.decisionRole || "Decisor",
            minScore,
            minQualification: minQual,
            landingPage: pageTitle,
            landingPageId: pageId,
            tags: Array.isArray(item.tags) ? item.tags : (typeof item.Tags === "string" ? item.Tags.split(",").map((t: string) => t.trim()).filter(Boolean) : ["inbound", "gdrive"]),
            score,
            sla: item.sla || "ok",
            lastInteraction: item.lastInteraction || item["Última Interação"] || "Sincronizado via Google Sheets",
            createdAt: item.createdAt || item.created_at || item["Data Cadastro"] || item["Data / Hora"] || new Date().toISOString(),
            activities: Array.isArray(item.activities) ? item.activities : [],
            completedCheckpoints: Array.isArray(item.completedCheckpoints) ? item.completedCheckpoints : [],
            status: item.status || "Ativo",
            personType: item.personType || "PJ",
            role: item.role || "",
            revenue: item.revenue || "",
            capag: item.capag || "",
            metadata: item.metadata || item
          };
        });
        driveLeads = mappedDriveLeads as any;
      } catch (err) {
        console.warn("Aviso ao processar leads do Google Drive/Sheets:", err);
      }

      const isFictitiousLead = (l: any) => {
        if (!l) return true;
        const id = String(l.id || "");
        const email = String(l.email || "").toLowerCase();
        const name = String(l.name || "").toLowerCase();
        if (id.startsWith("lead-00") || id === "lead-001" || id === "lead-002" || id === "lead-003" || id === "lead-004" || id === "lead-005" || id === "lead-006") return true;
        if (email.includes("nexussolucoes.com.br") || email.includes("luminaestetica.med.br") || email.includes("vanguardlog.com") || email.includes("bloomarquitetura.com.br") || email.includes("alencardistribuidora.com.br") || email.includes("inovareodonto.com.br")) return true;
        if (name.includes("carlos eduardo mendes") || name.includes("mariana vasconcelos") || name.includes("rodrigo silveira") || name.includes("beatriz nogueira") || name.includes("lucas alencar") || name.includes("fernanda costa ribeiro")) return true;
        return false;
      };

      const allRawLeads: Lead[] = [...dbLeads, ...driveLeads].filter(l => !isFictitiousLead(l));

      function mergeSourcesStr(...sources: (string | undefined)[]): string {
        const set = new Set<string>();
        for (const src of sources) {
          if (!src) continue;
          const parts = src.split(",");
          for (const p of parts) {
            const clean = p.trim();
            if (!clean) continue;
            const exists = Array.from(set).some(existing => existing.toLowerCase() === clean.toLowerCase());
            if (!exists) set.add(clean);
          }
        }
        return Array.from(set).join(", ");
      }

      function consolidateLeadsList(rawList: Lead[]): Lead[] {
        if (!rawList || rawList.length === 0) return [];

        const n = rawList.length;
        const parent = Array.from({ length: n }, (_, i) => i);

        function findRoot(i: number): number {
          if (parent[i] === i) return i;
          parent[i] = findRoot(parent[i]);
          return parent[i];
        }

        function unionNodes(i: number, j: number) {
          const rootI = findRoot(i);
          const rootJ = findRoot(j);
          if (rootI !== rootJ) {
            parent[rootI] = rootJ;
          }
        }

        const idIdx = new Map<string, number>();
        const emailIdx = new Map<string, number>();

        // 1. Agrupamento estrito por ID e por E-mail exato
        for (let i = 0; i < n; i++) {
          const l = rawList[i];
          if (!l) continue;

          // Mescla por ID idêntico
          if (l.id) {
            const cleanId = String(l.id).trim();
            if (idIdx.has(cleanId)) {
              unionNodes(i, idIdx.get(cleanId)!);
            } else {
              idIdx.set(cleanId, i);
            }
          }

          // Mescla por E-mail idêntico (apenas quando não vazio e válido)
          const normEmail = l.email && l.email.trim() ? l.email.trim().toLowerCase() : "";
          if (normEmail && normEmail.includes("@")) {
            if (emailIdx.has(normEmail)) {
              unionNodes(i, emailIdx.get(normEmail)!);
            } else {
              emailIdx.set(normEmail, i);
            }
          }
        }

        // 2. Agrupamento otimizado por Telefone em O(N) (apenas quando e-mails e nomes são compatíveis)
        const phoneIdx = new Map<string, number[]>();
        for (let i = 0; i < n; i++) {
          const l = rawList[i];
          if (!l) continue;
          const phone = l.whatsapp && l.whatsapp.trim() ? l.whatsapp.replace(/\D/g, "") : "";
          if (phone && phone.length >= 8) {
            if (!phoneIdx.has(phone)) phoneIdx.set(phone, []);
            phoneIdx.get(phone)!.push(i);
          }
        }

        for (const indices of phoneIdx.values()) {
          if (indices.length <= 1) continue;
          const firstIdx = indices[0];
          for (let k = 1; k < indices.length; k++) {
            const i = firstIdx;
            const j = indices[k];
            const l1 = rawList[i];
            const l2 = rawList[j];
            if (!l1 || !l2) continue;

            const email1 = l1.email && l1.email.trim() ? l1.email.trim().toLowerCase() : "";
            const email2 = l2.email && l2.email.trim() ? l2.email.trim().toLowerCase() : "";
            const name1 = (l1.name || "").trim().toLowerCase();
            const name2 = (l2.name || "").trim().toLowerCase();

            // Se ambos têm e-mails e são diferentes, NUNCA MESCLA!
            if (email1 && email2 && email1 !== email2) continue;

            // Se têm nomes e são totalmente diferentes e não-genéricos, NUNCA MESCLA!
            const isGeneric1 = !name1 || name1 === "novo lead" || name1 === "lead" || name1 === "sem nome" || name1.length < 3;
            const isGeneric2 = !name2 || name2 === "novo lead" || name2 === "lead" || name2 === "sem nome" || name2.length < 3;

            if (!isGeneric1 && !isGeneric2) {
              const areNamesCompatible = name1 === name2 || name1.includes(name2) || name2.includes(name1);
              if (!areNamesCompatible) continue;
            }

            // Telefones iguais, e-mails compatíveis e nomes compatíveis -> Unifica!
            unionNodes(i, j);
          }
        }

        const groups = new Map<number, Lead[]>();
        for (let i = 0; i < n; i++) {
          if (!rawList[i]) continue;
          const root = findRoot(i);
          if (!groups.has(root)) groups.set(root, []);
          groups.get(root)!.push(rawList[i]);
        }

        const STAGE_PRIORITY: Record<string, number> = {
          "Recebimento": 10,
          "Ganho": 9,
          "Proposta Sent": 8,
          "Proposta": 8,
          "Diagnóstico": 7,
          "Reunião Agendada": 6,
          "Qualificado": 5,
          "Contatado": 4,
          "Tentativa de Contato": 3,
          "Leads": 1,
          "Perdido": 0
        };

        const result: Lead[] = [];

        for (const group of groups.values()) {
          if (group.length === 1) {
            result.push(group[0]);
            continue;
          }

          const primaryUuid = group.find(x => isUUID(x.id));
          const primaryId = primaryUuid ? primaryUuid.id : group[0].id;

          // Seleção inteligente do melhor nome (prioriza nomes de pessoa reais ao invés de nomes genéricos)
          const candidateNames = group
            .map(x => (x.name || "").trim())
            .filter(n => {
              if (!n) return false;
              const lower = n.toLowerCase();
              return lower !== "novo lead" && lower !== "lead" && lower !== "sem nome" && lower !== "lead lp" && lower !== "lead planilha" && lower !== "empresa";
            });

          // Se tiver um nome que não seja nome puramente corporativo quando há nome pessoal
          const personalNames = candidateNames.filter(n => {
            const lower = n.toLowerCase();
            return !lower.includes("ltda") && !lower.includes("consultoria") && !lower.includes("mentoria") && !lower.includes("treinamento") && !lower.includes("sistemas");
          });

          const bestName = personalNames[0] || candidateNames[0] || group[0].name || "Novo Lead";

          // Seleção da melhor empresa (que não seja a repetição do nome nem sufixo de LP)
          const companyCandidates = group
            .map(x => (x.company || "").replace(/\s*\(LP:.*?\)/gi, "").replace(/\s*\(Planilha\)/gi, "").trim())
            .filter(c => c && c.toLowerCase() !== "empresa" && c.toLowerCase() !== bestName.toLowerCase());
          
          const bestComp = companyCandidates[0] || group.map(x => x.company).find(c => c && c.trim()) || "";

          const bestEmail = group.map(x => (x.email || "").trim()).find(e => e && e.includes("@")) || "";
          const bestPhone = group.map(x => (x.whatsapp || "").trim()).find(w => w && w.replace(/\D/g, "").length >= 8) || "";

          const mergedSource = mergeSourcesStr(...group.map(x => x.source));

          let bestStage = group[0].stage || "Leads";
          let maxPrio = STAGE_PRIORITY[bestStage] ?? 1;
          for (const g of group) {
            const p = STAGE_PRIORITY[g.stage || ""] ?? 1;
            if (p > maxPrio) {
              maxPrio = p;
              bestStage = g.stage || "Leads";
            }
          }

          const isTestLead = group.some(x => 
            x.classification === "Lead Teste" || 
            x.status === "lead_teste" || 
            (Array.isArray(x.tags) && (x.tags.includes("leadtest") || x.tags.includes("modo-teste") || x.tags.includes("teste"))) ||
            x.source?.toLowerCase().includes("[modo-teste]") ||
            x.source?.toLowerCase().includes("[teste]")
          );

          const visitSum = group.reduce((sum, item) => sum + (Number(item.lpVisits) || 1), 0);
          const calculatedVisits = Math.max(group.length, visitSum);

          const isCust = !isTestLead && group.some(x => x.isCustomer || x.classification === "Cliente" || x.stage === "Ganho" || x.stage === "Recebimento");
          const isRec = !isTestLead && (group.length > 1 || calculatedVisits > 1 || isCust || group.some(x => x.isRecurring || x.type === "Recorrente"));

          const mergedTagsSet = new Set<string>();
          group.forEach(g => {
            if (Array.isArray(g.tags)) g.tags.forEach(t => t && mergedTagsSet.add(t));
          });
          if (isCust) mergedTagsSet.add("cliente");
          if (isRec) mergedTagsSet.add("recorrência");
          if (isTestLead) {
            mergedTagsSet.add("leadtest");
            mergedTagsSet.add("modo-teste");
          }

          const activitiesMap = new Map<string, Activity>();
          group.forEach(g => {
            if (Array.isArray(g.activities)) {
              g.activities.forEach(act => {
                if (act && act.id) activitiesMap.set(act.id, act);
              });
            }
          });

          const dates = group.map(x => new Date(x.createdAt || 0).getTime()).filter(d => !isNaN(d) && d > 0);
          const earliestDate = dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : group[0].createdAt;
          const maxValue = Math.max(...group.map(x => Number(x.value) || 0));

          const merged: Lead = {
            ...group[0],
            id: primaryId,
            name: bestName,
            company: bestComp,
            email: bestEmail,
            whatsapp: bestPhone,
            source: mergedSource || "Manual",
            stage: bestStage,
            value: maxValue,
            lpVisits: calculatedVisits,
            isCustomer: isCust,
            isRecurring: isRec,
            classification: isTestLead ? "Lead Teste" : (isCust ? "Cliente" : "Lead"),
            type: isTestLead ? "Novo" : (isRec ? "Recorrente" : "Novo"),
            tags: Array.from(mergedTagsSet),
            activities: Array.from(activitiesMap.values()),
            createdAt: earliestDate,
            lastInteraction: isTestLead 
              ? `Capturado em Modo Teste (${group.length}x)`
              : `Recorrente / Capturas Unificadas (${group.length}x)`,
          };

          result.push(merged);
        }

        return result;
      }

      const consolidated = consolidateLeadsList(allRawLeads);

      return consolidated.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } 
  }).data);

  // 2. TASKS
  const tasks = asArray(useQuery({ 
    queryKey: ['tasks'], 
    queryFn: async () => { 
      const driveTasks = cloudStore.getState().tasks || [];
      return driveTasks.map(mapTaskFromDb);
    } 
  }).data);

  // 3. USERS / PROFILES
  const usersRaw = asArray(useQuery({ 
    queryKey: ['users'], 
    queryFn: async () => { 
      const cloudUsers = getRegisteredUsers();
      return cloudUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        contact: u.contact || "",
        avatar_url: u.avatarUrl || "",
        status: u.status
      }));
    } 
  }).data);
  
  const mappedUsers = usersRaw.map(mapUserFromDb);

  const GHOST_NAMES = [
    "comet public",
    "cometleads2026",
    "comet_app_worl",
    "comet_sync_wo",
    "admin-sistemas",
    "615483b3",
    "d6132ce0",
    "bc70c5d1"
  ];

  const cleanUsers = mappedUsers.filter(u => {
    if (!u) return false;
    if ((u as any).isStandbyAdmin || u.id === "system-standby-admin" || u.email?.toLowerCase() === "admin@comet.com") {
      return false;
    }
    const nameLow = (u.name || "").toLowerCase();
    const emailLow = (u.email || "").toLowerCase();
    const idLow = (u.id || "").toLowerCase();

    for (const g of GHOST_NAMES) {
      if (nameLow.includes(g) || emailLow.includes(g) || idLow.includes(g)) {
        return false;
      }
    }
    return true;
  });

  const tiagoIdx = cleanUsers.findIndex(u => 
    u.email?.toLowerCase() === "tiagorezeck@hotmail.com" || 
    u.name?.toLowerCase().includes("tiago rezeck") ||
    u.id === "327399fb-3511-41a4-bd01-cf3b803aa859"
  );

  if (tiagoIdx === -1) {
    cleanUsers.unshift({
      id: DEFAULT_REGISTERED_ADMIN.id,
      name: DEFAULT_REGISTERED_ADMIN.name,
      email: DEFAULT_REGISTERED_ADMIN.email,
      role: "Admin Geral",
      contact: DEFAULT_REGISTERED_ADMIN.contact || "(11) 98888-7777",
      avatarUrl: "",
      avatar_url: "",
      status: "Ativo",
      goals: [],
      operationalGoals: [],
      allowedModules: SYSTEM_MODULES.map(m => m.id),
      customPermissionsEnabled: false
    });
  } else {
    cleanUsers[tiagoIdx] = {
      ...cleanUsers[tiagoIdx],
      name: cleanUsers[tiagoIdx].name || "Tiago Rezeck",
      email: "tiagorezeck@hotmail.com",
      role: "Admin Geral",
      status: "Ativo"
    };
  }

  const users = cleanUsers.map(u => {
    const isTiago = u.email?.toLowerCase() === "tiagorezeck@hotmail.com" || u.id === "327399fb-3511-41a4-bd01-cf3b803aa859";
    if (isTiago) {
      return u.role === "Admin Geral" ? u : { ...u, role: "Admin Geral" };
    }
    if (u.role === "Admin Geral" || u.role === "Admin") {
      return { ...u, role: "Gestor" };
    }
    return u;
  });

  // 4. PRODUCTS
  const products = asArray(useQuery({ 
    queryKey: ['products'], 
    queryFn: async () => { 
      return (cloudStore.getState().products || []).map(mapProductFromDb);
    } 
  }).data);

  // 5. OBJECTIONS
  const objections = asArray(useQuery({ 
    queryKey: ['objections'], 
    queryFn: async () => { 
      return cloudStore.getState().objections || [];
    } 
  }).data);

  // 6. MARKETING INVESTMENTS
  const marketingInvestments = asArray(useQuery({ 
    queryKey: ['marketing_investments'], 
    queryFn: async () => { 
      return cloudStore.getState().marketingInvestments || [];
    } 
  }).data);

  // 7. LANDING PAGES (100% Cloud + RAM, zero localStorage)
  const landingPages = asArray(useQuery({ 
    queryKey: ['landing_pages'], 
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    queryFn: async () => { 
      const deletedIds = new Set(getDeletedLandingPageIds());
      const isDeleted = (lp: any) => {
        if (!lp) return true;
        if (lp.id && deletedIds.has(lp.id)) return true;
        if (lp.slug && deletedIds.has(lp.slug)) return true;
        return false;
      };

      const cloudDb = cloudStore.getState();
      const isCorruptedLead = (lp: any) => {
        if (!lp || typeof lp !== "object") return true;
        if (lp.hero || lp.externalUrl || (lp as any).external_url || lp.heroModel) return false;
        return String(lp.status || "").trim().toLowerCase() === "novo lead";
      };
      const cloudLps: LandingPage[] = (cloudDb.landingPages || [])
        .filter((lp: any) => !isCorruptedLead(lp))
        .map(mapLPFromDb)
        .filter((lp) => !isDeleted(lp) && !isCorruptedLead(lp));

      const getLpKey = (lp: LandingPage) => {
        if (lp.id) return `id:${lp.id}`;
        if (lp.slug) return `slug:${lp.slug.trim().toLowerCase()}`;
        return `anon:${Math.random().toString(36).substring(2, 6)}`;
      };

      const mergedMap = new Map<string, LandingPage>();

      for (const lp of cloudLps) {
        if (!lp || isDeleted(lp)) continue;
        const key = getLpKey(lp);
        if (!mergedMap.has(key)) {
          mergedMap.set(key, lp);
        } else {
          const prev = mergedMap.get(key)!;
          const prevTime = Math.max(
            new Date((prev as any).updatedAt || 0).getTime() || 0,
            new Date((prev as any).updated_at || 0).getTime() || 0,
            new Date((prev as any).createdAt || 0).getTime() || 0
          );
          const lpTime = Math.max(
            new Date((lp as any).updatedAt || 0).getTime() || 0,
            new Date((lp as any).updated_at || 0).getTime() || 0,
            new Date((lp as any).createdAt || 0).getTime() || 0
          );
          const base = lpTime >= prevTime ? { ...prev, ...lp } : { ...lp, ...prev };
          const newer = lpTime >= prevTime ? lp : prev;
          const heroModel = (newer as any).heroModel || newer.hero?.model || (base as any).heroModel || base.hero?.model || "split_image";
          mergedMap.set(key, {
            ...base,
            id: isUUID(prev.id) ? prev.id : (isUUID(lp.id) ? lp.id : (prev.id || lp.id)),
            heroModel,
            hero: (newer.hero && newer.hero.model) ? { ...newer.hero, model: heroModel } : (base.hero ? { ...base.hero, model: heroModel } : base.hero),
            quiz: base.quiz || prev.quiz || lp.quiz,
            bentoGrid: base.bentoGrid || prev.bentoGrid || lp.bentoGrid,
            testimonials: base.testimonials || prev.testimonials || lp.testimonials,
            formSection: base.formSection || prev.formSection || lp.formSection,
            photoGrid: base.photoGrid || prev.photoGrid || lp.photoGrid,
            visibility: base.visibility || prev.visibility || lp.visibility,
            sectionOrder: base.sectionOrder || prev.sectionOrder || lp.sectionOrder,
            customElementStyles: base.customElementStyles || prev.customElementStyles || lp.customElementStyles,
            floatingImages: base.floatingImages || prev.floatingImages || lp.floatingImages,
            faq: base.faq || prev.faq || lp.faq,
          });
        }
      }

      let result = Array.from(mergedMap.values()).filter(lp => !isDeleted(lp));

      if (result.length === 0 && deletedIds.size === 0 && !cloudStore.getStatus().loadedFromCloud) {
        result = getInitialAILandingPages().filter(lp => !isDeleted(lp));
      }

      const allLeads = [
        ...(cloudDb.leads || []),
        ...(cloudDb.leads_landing_pages || []),
      ];

      result = result.map((lp) => {
        const normLpName = (lp.name || lp.title || "").trim().toLowerCase();
        const normLpSlug = (lp.slug || "").trim().toLowerCase();
        const normLpId = (lp.id || "").trim().toLowerCase();

        const crmLeadsCount = allLeads.filter((lead: any) => {
          const leadLp = String(lead.landing_page || lead.landingPage || lead["Landing Page (Título)"] || lead.landingPageTitle || lead.pageTitle || lead.metadata?.pageTitle || "").trim().toLowerCase();
          const leadIdStr = String(lead.landingPageId || lead["ID Landing Page"] || lead.pageId || lead.metadata?.pageId || "").trim().toLowerCase();
          const leadCompany = String(lead.company || lead.Empresa || "").trim().toLowerCase();
          const leadSource = String(lead.source || lead.Origem || "").trim().toLowerCase();

          if (normLpId && (leadIdStr === normLpId || leadLp === normLpId)) return true;
          if (normLpName && (leadLp === normLpName || leadCompany.includes(normLpName) || leadSource.includes(normLpName))) return true;
          if (normLpSlug && (leadLp === normLpSlug || leadSource.includes(normLpSlug))) return true;
          return false;
        }).length;

        const effectiveLeads = Math.max(Number(lp.leads) || 0, Number(lp.leads_count) || 0, crmLeadsCount);
        const recordedVisits = Math.max(Number(lp.visits) || 0, Number(lp.viewsCount) || 0);
        const effectiveVisits = Math.max(recordedVisits, effectiveLeads);
        const effectiveConv = effectiveVisits > 0
          ? Math.min(100, Math.round((effectiveLeads / effectiveVisits) * 100))
          : 0;

        return {
          ...lp,
          visits: effectiveVisits,
          viewsCount: effectiveVisits,
          leads: effectiveLeads,
          leads_count: effectiveLeads,
          conv: effectiveConv,
        };
      });

      return result;
    } 
  }).data);

  // 8. PIPELINES
  const pipelinesRaw = asArray(useQuery({ 
    queryKey: ['pipelines'], 
    queryFn: async () => { 
      return cloudStore.getState().pipelines || [];
    } 
  }).data);
  
  const pipelines = useMemo(() => {
    const sourceList = pipelinesRaw || [];
    const mergedList: Pipeline[] = DEFAULT_PIPELINES.map(def => {
      const found = sourceList.find((p: any) => 
        p.id === def.id || 
        (p.code && def.code && p.code.toLowerCase() === def.code.toLowerCase()) || 
        (p.name && def.name && p.name.trim().toUpperCase() === def.name.trim().toUpperCase())
      );
      if (found) {
        return {
          ...def,
          ...found,
          stages: Array.isArray(found.stages) && found.stages.length > 0 ? found.stages : def.stages
        };
      }
      return def;
    });

    sourceList.forEach((p: any) => {
      const isDefault = DEFAULT_PIPELINES.some(def => 
        def.id === p.id || 
        (p.code && def.code && p.code.toLowerCase() === def.code.toLowerCase()) || 
        (p.name && def.name && p.name.trim().toUpperCase() === p.name.trim().toUpperCase())
      );
      if (!isDefault && p.id && !mergedList.some(m => m.id === p.id)) {
        mergedList.push({
          ...p,
          stages: Array.isArray(p.stages) ? p.stages : []
        });
      }
    });

    return mergedList.sort((a, b) => (a.order || 99) - (b.order || 99));
  }, [pipelinesRaw]);

  // 8.1 HISTÓRICO DE MOVIMENTAÇÃO DE PIPELINES
  const pipelineHistory = asArray(useQuery({
    queryKey: ['pipeline_history'],
    queryFn: async () => {
      return cloudStore.getState().historico_pipeline || [];
    }
  }).data) as PipelineMovementHistory[];

  // 9. STAGE WORKFLOWS
  const stageWorkflows = asArray(useQuery({ 
    queryKey: ['stage_workflows'], 
    queryFn: async () => { 
      const raw = cloudStore.getState().stageWorkflows;
      if (Array.isArray(raw)) return raw as StageWorkflow[];
      if (raw && typeof raw === "object") {
        return Object.entries(raw).map(([key, val]: [string, any]) => {
          const [pipelineId, ...rest] = key.split("_");
          return {
            pipelineId: val?.pipelineId || pipelineId,
            stageName: val?.stageName || rest.join("_"),
            rules: Array.isArray(val?.rules) ? val.rules : [],
            ...val,
          } as StageWorkflow;
        });
      }
      return [] as StageWorkflow[]; 
    } 
  }).data);

  // 10. HANDOFF RULES
  const handoffRules = asArray(useQuery({ 
    queryKey: ['handoff_rules'], 
    queryFn: async () => { 
      return (cloudStore.getState().handoffRules || []) as HandoffRule[];
    } 
  }).data);

  // 11. AUTOMATIONS
  const automations = asArray(useQuery({ 
    queryKey: ['automations'], 
    queryFn: async () => { 
      return (cloudStore.getState().automations || []).map(mapAutomationFromDb);
    } 
  }).data);

  // 12. SURVEYS & RESPONSES
  const surveys = asArray(useQuery({ 
    queryKey: ['surveys'], 
    queryFn: async () => { 
      const cloudSurveys = cloudStore.getState().surveys || [];
      const map = new Map<string, Survey>();
      for (const s of DEFAULT_SURVEYS) {
        map.set(s.id, { ...s, questions: s.questions ? JSON.parse(JSON.stringify(s.questions)) : [] });
      }
      for (const s of cloudSurveys) {
        if (s && s.id) {
          const prev = map.get(s.id);
          map.set(s.id, { 
            ...(prev || {}), 
            ...s, 
            questions: (Array.isArray(s.questions) && s.questions.length > 0) ? s.questions : (prev?.questions || []) 
          });
        }
      }
      return Array.from(map.values()); 
    } 
  }).data);

  const surveysResponses = asArray(useQuery({ 
    queryKey: ['survey_responses'], 
    queryFn: async () => { 
      const dbResp: SurveyResponse[] = [...(cloudStore.getState().surveyResponses || [])];

      const map = new Map<string, SurveyResponse>();
      for (const r of dbResp) {
        const key = r.id || `${r.survey_id || r.surveyId}_${r.lead_id || r.leadId}_${r.created_at || r.completedAt}`;
        map.set(key, r);
      }
      return Array.from(map.values()); 
    } 
  }).data);

  // 13. SETTINGS & CONFIGS
  const workingDays = asArray(useQuery({ 
    queryKey: ['working_days'], 
    queryFn: async () => { 
      return cloudStore.getState().workingDays || [1, 2, 3, 4, 5]; 
    } 
  }).data) as number[];

  const holidays = asArray(useQuery({ 
    queryKey: ['holidays'], 
    queryFn: async () => { 
      return cloudStore.getState().holidays || []; 
    } 
  }).data) as string[];

  const funnelTypes = asArray(useQuery({ 
    queryKey: ['funnel_types'], 
    queryFn: async () => { 
      const list = cloudStore.getState().funnelTypes;
      return Array.isArray(list) && list.length > 0 ? list : ["Voucher", "Ebook", "Webinar", "Diagnóstico"]; 
    } 
  }).data) as string[];

  // 14. PLAYBOOKS
  const playbooksDb = asArray(useQuery({ 
    queryKey: ['playbooks'], 
    queryFn: async () => { 
      return (cloudStore.getState().playbooks || []).map(mapPlaybookFromDb);
    } 
  }).data);

  const playbooks = useMemo(() => {
    const dbPlaybooks = playbooksDb.map(p => ({ ...p }));
    const filteredDb = dbPlaybooks.filter(db => !DEFAULT_PLAYBOOKS.some(def => def.id === db.id));
    return [...DEFAULT_PLAYBOOKS, ...filteredDb];
  }, [playbooksDb]);

  // 15. PERMISSIONS
  const rolePermissionsRaw = useQuery({ 
    queryKey: ['role_permissions'], 
    queryFn: async () => { 
      return cloudStore.getState().rolePermissions || {};
    } 
  }).data;

  const rolePermissions = useMemo(() => {
    if (Array.isArray(rolePermissionsRaw)) {
      const dbPerms = rolePermissionsRaw.reduce((acc: any, r: any) => { 
        acc[r.role] = r.stages; 
        return acc; 
      }, {});
      return { ...DEFAULT_ROLE_PERMISSIONS, ...dbPerms };
    }
    return { ...DEFAULT_ROLE_PERMISSIONS, ...(rolePermissionsRaw || {}) };
  }, [rolePermissionsRaw]);

  // 15.1 ROLE MODULE PERMISSIONS (Nuvem + RAM)
  const roleModulePermissionsQuery = useQuery({
    queryKey: ['role_module_permissions'],
    queryFn: async () => {
      return { ...DEFAULT_ROLE_MODULES, ...(cloudStore.getState().roleModulePermissions || {}) };
    }
  });
  const localRoleModules = roleModulePermissionsQuery.data ?? DEFAULT_ROLE_MODULES;

  const updateRoleModulePermissions = async (role: string, modules: string[]) => {
    const next = { ...localRoleModules, [role]: modules };
    cloudStore.mutate((draft) => {
      draft.roleModulePermissions = next;
    }, { immediate: true });
    queryClient.setQueryData(['role_module_permissions'], next);
    invalidate('role_module_permissions');
    toast.success(`Módulos liberados para ${role} atualizados na nuvem!`);
  };

  const resetRoleModulePermissions = async (role: string) => {
    const next = { ...localRoleModules };
    if (DEFAULT_ROLE_MODULES[role]) {
      next[role] = [...DEFAULT_ROLE_MODULES[role]];
    } else {
      next[role] = SYSTEM_MODULES.map(m => m.id);
    }
    cloudStore.mutate((draft) => {
      draft.roleModulePermissions = next;
    }, { immediate: true });
    queryClient.setQueryData(['role_module_permissions'], next);
    invalidate('role_module_permissions');
    toast.success(`Módulos de ${role} restaurados para a configuração padrão.`);
  };

  // 16. VISIBILITY & SINGLETONS
  const visibility = useQuery({ 
    queryKey: ['visibility_settings'], 
    queryFn: async () => { 
      return cloudStore.getState().visibility || DEFAULT_VISIBILITY; 
    } 
  }).data ?? DEFAULT_VISIBILITY;
  
  const slaThresholds = useQuery({ 
    queryKey: ['sla_thresholds'], 
    queryFn: async () => { 
      return cloudStore.getState().slaThresholds || { alerta: 24, critico: 48, vencido: 72 }; 
    } 
  }).data ?? { alerta: 24, critico: 48, vencido: 72 };

  const aiSettings = useQuery({ 
    queryKey: ['ai_settings'], 
    queryFn: async () => { 
      return cloudStore.getState().aiConfig || null; 
    } 
  }).data;

  const company = useQuery({ 
    queryKey: ['company_settings'], 
    queryFn: async () => { 
      return cloudStore.getState().company || ({ id: '00000000-0000-0000-0000-000000000000', name: "Minha Empresa" } as CompanySettings); 
    } 
  }).data;

  const dateFilter = useQuery<DateFilter>({ 
    queryKey: ['dateFilter'], 
    queryFn: () => queryClient.getQueryData<DateFilter>(['dateFilter']) || { 
      from: startOfMonth(new Date()), 
      to: endOfMonth(new Date()), 
      label: "Este mês", 
      type: "thisMonth" 
    }, 
    staleTime: Infinity 
  }).data ?? { from: startOfMonth(new Date()), to: endOfMonth(new Date()), label: "Este mês", type: "thisMonth" };

  // 17. LEAD ROUTING CONFIG
  const leadRoutingConfigQuery = useQuery<LeadRoutingConfig>({
    queryKey: ['lead_routing_config'],
    queryFn: async () => {
      return cloudStore.getState().leadRoutingConfig || DEFAULT_LEAD_ROUTING_CONFIG;
    }
  });

  const leadRoutingConfig = leadRoutingConfigQuery.data ?? DEFAULT_LEAD_ROUTING_CONFIG;

  const updateLeadRoutingConfig = async (newConfig: LeadRoutingConfig) => {
    cloudStore.mutate((draft) => {
      draft.leadRoutingConfig = newConfig;
    }, { immediate: true });
    queryClient.setQueryData(['lead_routing_config'], newConfig);
    queryClient.invalidateQueries({ queryKey: ['lead_routing_config'] });
  };



  const authSessionUser = getCurrentUser();
  const localEmail = typeof window !== "undefined" ? localStorage.getItem("comet_user_email") : null;
  const targetEmail = session?.user?.email || localEmail;

  let currentUser: User;

  // Se o usuário logado for o Standby Admin (ADMIN), ele tem acesso total a tudo, mas não aparece na lista de usuários do sistema
  if (
    authSessionUser?.isStandbyAdmin || 
    authSessionUser?.email?.toLowerCase() === "admin@comet.com" ||
    authSessionUser?.name?.toLowerCase().includes("standby") ||
    targetEmail?.toLowerCase() === "admin@comet.com"
  ) {
    currentUser = {
      id: SYSTEM_STANDBY_ADMIN.id,
      name: "Administrador (Standby)",
      email: SYSTEM_STANDBY_ADMIN.email,
      role: "Admin Geral",
      contact: "(11) 99999-9999",
      avatarUrl: "",
      avatar_url: "",
      status: "Ativo",
      goals: [],
      operationalGoals: [],
      allowedModules: SYSTEM_MODULES.map(m => m.id),
      customPermissionsEnabled: false
    };
  } else {
    currentUser = (targetEmail ? users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase()) : null) || users[0] || {
      id: DEFAULT_REGISTERED_ADMIN.id,
      name: DEFAULT_REGISTERED_ADMIN.name,
      email: DEFAULT_REGISTERED_ADMIN.email,
      role: "Admin Geral",
      contact: DEFAULT_REGISTERED_ADMIN.contact || "(11) 98888-7777",
      avatarUrl: "",
      avatar_url: "",
      status: "Ativo",
      goals: [],
      operationalGoals: [],
      allowedModules: SYSTEM_MODULES.map(m => m.id),
      customPermissionsEnabled: false
    };
  }

  return {
    initialized: !!company && !!currentUser,
    cloudStatus: cloudStore.getStatus(),
    leads, 
    tasks, 
    users, 
    products, 
    landingPages, 
    company, 
    marketingInvestments, 
    pipelines, 
    pipelineHistory,
    stageWorkflows, 
    handoffRules, 
    automations, 
    surveys, 
    surveyResponses: surveysResponses, 
    surveysResponses: surveysResponses, 
    rolePermissions, 
    roleModulePermissions: localRoleModules,
    updateRoleModulePermissions,
    resetRoleModulePermissions,
    SYSTEM_MODULES,
    DEFAULT_ROLE_MODULES,
    leadRoutingConfig,
    updateLeadRoutingConfig,
    visibility, 
    slaThresholds, 
    dateFilter, 
    currentUser, 
    team: users, 
    playbooks, 
    objections, 
    workingDays, 
    holidays, 
    funnelTypes,
    stages: (pipelines[0]?.stages || []).map((s: any) => s.name).filter(Boolean) || STAGES,
    
    aiConfig: {
      activeProvider: aiSettings?.provider || aiSettings?.activeProvider || 'openrouter',
      openRouterKey: aiSettings?.openrouter_key || aiSettings?.openRouterKey || '',
      googleKey: aiSettings?.google_key || aiSettings?.googleKey || '',
      modelId: aiSettings?.model_id || aiSettings?.modelId || 'openai/gpt-4o-mini',
      modelName: aiSettings?.model_name || aiSettings?.modelName || 'GPT-4o Mini'
    },

    // ====================
    // MUTATIONS COM DTOs (ZERO-LOCALSTORAGE CLOUD ENGINE)
    // ====================

    // LEADS
    addLead: async (l: any) => { 
      const generatedId = isUUID(l.id) ? l.id : (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
      
      let existingLeadMatch: any = null;
      try {
        const cachedLeads = (queryClient.getQueryData(['leads']) as any[]) || cloudStore.getState().leads || [];
        const cleanPhone = (l.whatsapp || "").replace(/\D/g, "");
        const normEmail = (l.email || "").trim().toLowerCase();
        const cleanName = (l.name || "").trim().toLowerCase();

        existingLeadMatch = cachedLeads.find((x: any) => {
          if (!x) return false;
          if (x.id && l.id && String(x.id).trim() === String(l.id).trim()) return true;

          const xEmail = (x.email || "").trim().toLowerCase();
          const xPhone = (x.whatsapp || "").replace(/\D/g, "");
          const xName = (x.name || "").trim().toLowerCase();

          if (normEmail && xEmail) return normEmail === xEmail;

          if (cleanPhone && cleanPhone.length >= 8 && xPhone === cleanPhone) {
            const isGenericX = !xName || xName === "novo lead" || xName === "lead" || xName === "sem nome" || xName.length < 3;
            const isGenericL = !cleanName || cleanName === "novo lead" || cleanName === "lead" || cleanName === "sem nome" || cleanName.length < 3;
            if (isGenericX || isGenericL || xName === cleanName || xName.includes(cleanName) || cleanName.includes(xName)) {
              return true;
            }
          }
          return false;
        });
      } catch {}

      if (existingLeadMatch) {
        const sourcesSet = new Set<string>();
        if (existingLeadMatch.source) existingLeadMatch.source.split(',').forEach((s: string) => s.trim() && sourcesSet.add(s.trim()));
        if (l.source) l.source.split(',').forEach((s: string) => s.trim() && sourcesSet.add(s.trim()));
        const mergedSource = Array.from(sourcesSet).join(', ') || existingLeadMatch.source || l.source || "Manual";

        const isPreviousCustomer = (
          existingLeadMatch.stage === 'Ganho' || 
          existingLeadMatch.stage === 'Recebimento' || 
          existingLeadMatch.classification === 'Cliente' || 
          existingLeadMatch.isCustomer === true ||
          (existingLeadMatch.value && existingLeadMatch.value > 0 && existingLeadMatch.stage === 'Ganho')
        );

        const calculatedVisits = (Number(existingLeadMatch.lpVisits) || 1) + 1;
        const isCustomer = isPreviousCustomer || l.classification === 'Cliente' || l.stage === 'Ganho' || !!l.isCustomer;
        const mergedTagsSet = new Set<string>([...(existingLeadMatch.tags || []), ...(l.tags || []), "recorrência"]);
        if (isCustomer) mergedTagsSet.add("cliente");

        const updatedFields = {
          name: (l.name && l.name !== "Novo Lead" && l.name !== "Lead") ? l.name : existingLeadMatch.name,
          email: l.email || existingLeadMatch.email,
          whatsapp: l.whatsapp || existingLeadMatch.whatsapp,
          company: l.company || existingLeadMatch.company,
          source: mergedSource,
          lpVisits: calculatedVisits,
          isRecurring: true,
          type: "Recorrente",
          isCustomer,
          classification: isCustomer ? "Cliente" : (existingLeadMatch.classification || "Lead"),
          tags: Array.from(mergedTagsSet),
          lastInteraction: `Re-interagiu / Nova captura (${l.source || 'Geral'})`,
          lastVisitedLp: l.landingPage || existingLeadMatch.landingPage,
          lastLpVisitAt: new Date().toISOString(),
          activities: [
            ...(existingLeadMatch.activities || []),
            {
              id: `act_${Date.now()}`,
              type: "re_interaction",
              description: `Re-interagiu via ${l.source || 'nova captura'}`,
              timestamp: new Date().toISOString()
            }
          ]
        };

        try {
          fetch(`/api/leads/${encodeURIComponent(existingLeadMatch.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedFields),
          }).catch(() => {});

          cloudStore.mutate((draft) => {
            draft.leads = (draft.leads || []).map((item: any) => item.id === existingLeadMatch.id ? { ...item, ...updatedFields } : item);
          }, { immediate: true });
        } catch {}

        invalidate('leads');
        return { ...existingLeadMatch, ...updatedFields };
      }

      const isTestLead = Boolean(
        l.isTest === true ||
        l.classification === 'Lead Teste' ||
        l.metadata?.isTest === true ||
        (Array.isArray(l.tags) && (l.tags.includes('leadtest') || l.tags.includes('modo-teste') || l.tags.includes('teste'))) ||
        l.source?.toLowerCase().includes('[modo-teste]') ||
        l.source?.toLowerCase().includes('[teste]') ||
        l.company?.toLowerCase().includes('(lp: teste')
      );

      const isCustomer = !isTestLead && (l.classification === 'Cliente' || l.stage === 'Ganho' || !!l.isCustomer);
      const isRecurring = !isTestLead && (l.type === 'Recorrente' || !!l.isRecurring);

      const tags = Array.isArray(l.tags) ? [...l.tags] : [];
      if (isTestLead) {
        if (!tags.includes("leadtest")) tags.push("leadtest");
        if (!tags.includes("modo-teste")) tags.push("modo-teste");
      }
      if (isCustomer && !tags.includes("cliente")) tags.push("cliente");
      if (isRecurring && !tags.includes("recorrência")) tags.push("recorrência");

      let resolvedPipelineId = l.pipelineId;
      let resolvedStage = l.stage;
      let resolvedOwner = l.owner;

      if (leadRoutingConfig?.enabled) {
        if (!resolvedPipelineId || resolvedPipelineId === "prospection") {
          resolvedPipelineId = leadRoutingConfig.targetPipelineId || "prospection";
        }
        if (!resolvedStage || resolvedStage === "Leads" || resolvedStage === "Novo Lead") {
          resolvedStage = leadRoutingConfig.targetStage || "Novo Lead";
        }

        if (!resolvedOwner || resolvedOwner === "Sem dono" || resolvedOwner === "Sem responsável") {
          if (leadRoutingConfig.distributionType === "specific_user") {
            resolvedOwner = leadRoutingConfig.specificUserName || "Responsável Comercial";
          } else if (leadRoutingConfig.distributionType === "unassigned") {
            resolvedOwner = "Sem responsável";
          } else if (leadRoutingConfig.distributionType === "role_round_robin") {
            const tr = (leadRoutingConfig.targetRole || "LDR").toLowerCase();
            const matchingUsers = users.filter(u => {
              const r = (u.role || "").toLowerCase();
              if (r.includes(tr)) return true;
              if (tr === "seller" && (r.includes("vendedor") || r.includes("comercial") || r.includes("closer"))) return true;
              if (tr === "ldr" && (r.includes("qualificador") || r.includes("prospector") || r.includes("inbound"))) return true;
              return false;
            });

            const candidatePool = matchingUsers.length > 0 ? matchingUsers : (users.length > 0 ? users : []);
            if (candidatePool.length > 0) {
              const lastIdx = leadRoutingConfig.lastAssignedIndex ?? -1;
              const nextIdx = (lastIdx + 1) % candidatePool.length;
              resolvedOwner = candidatePool[nextIdx].name;
              updateLeadRoutingConfig({
                ...leadRoutingConfig,
                lastAssignedIndex: nextIdx
              }).catch(() => {});
            } else {
              resolvedOwner = "Sem responsável";
            }
          }
        }
      }

      const fullLead: Lead = {
        id: generatedId,
        name: l.name || "Novo Lead",
        company: l.company || "",
        email: l.email || "",
        whatsapp: l.whatsapp || "",
        value: Number(l.value) || 0,
        stage: resolvedStage || "Leads",
        owner: resolvedOwner || "Sem dono",
        source: l.source || "Manual",
        classification: isTestLead ? "Lead Teste" : (isCustomer ? "Cliente" : (l.classification || "Lead")),
        temperature: l.temperature || "Frio",
        type: isRecurring ? "Recorrente" : (l.type || "Novo"),
        strategy: l.strategy || "Nenhuma",
        decisionRole: l.decisionRole || "Não Decisor",
        minScore: l.minScore || "Nenhum",
        landingPage: l.landingPage,
        productId: l.productId,
        pipelineId: resolvedPipelineId || "prospection",
        tags,
        score: Number(l.score) || 0,
        sla: l.sla || "ok",
        lastInteraction: l.lastInteraction || "Cadastrado",
        createdAt: l.createdAt || new Date().toISOString(),
        activities: Array.isArray(l.activities) ? l.activities : [],
        completedCheckpoints: Array.isArray(l.completedCheckpoints) ? l.completedCheckpoints : [],
        status: l.status || "Ativo",
        personType: l.personType || "PJ",
        role: l.role || "",
        revenue: l.revenue || "",
        capag: l.capag || "",
        lpVisits: Number(l.lpVisits) || 1,
        isCustomer,
        isRecurring,
        purchaseCount: isCustomer ? (Number(l.purchaseCount) || 1) : 0,
        lastVisitedLp: l.landingPage,
        lastLpVisitAt: new Date().toISOString(),
        metadata: {
          ...(l.metadata || {}),
          isTest: isTestLead,
          lpVisits: Number(l.lpVisits) || 1,
          isCustomer,
          isRecurring
        }
      };

      try {
        cloudStore.mutate((draft) => {
          draft.leads = [fullLead, ...(draft.leads || []).filter((x: any) => x.id !== fullLead.id)];
        }, { immediate: true });
      } catch (err) {
        console.warn("Aviso ao salvar lead:", err);
      }

      invalidate('leads');
      return fullLead;
    },

    updateLead: async (id: string, u: any) => { 
      queryClient.setQueryData(['leads'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((lead: any) => lead.id === id ? { ...lead, ...u } : lead);
      });

      try {
        fetch(`/api/leads/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(u)
        }).catch(() => {});

        cloudStore.mutate((draft) => {
          draft.leads = (draft.leads || []).map((l: any) => l.id === id ? { ...l, ...u } : l);
        }, { immediate: true });
      } catch (err) {
        console.warn("Aviso ao atualizar lead na nuvem:", err);
      }

      invalidate('leads');
    },

    deleteLead: async (id: string) => { 
      let targetEmail = "";
      let targetPhone = "";

      queryClient.setQueryData(['leads'], (old: any) => {
        if (!Array.isArray(old)) return old;
        const target = old.find((l: any) => l.id === id);
        if (target) {
          if (target.email) targetEmail = target.email.trim().toLowerCase();
          if (target.whatsapp) targetPhone = target.whatsapp.replace(/\D/g, "");
        }
        return old.filter((lead: any) => {
          if (lead.id === id) return false;
          if (targetEmail && lead.email && lead.email.trim().toLowerCase() === targetEmail) return false;
          if (targetPhone && targetPhone.length >= 8 && lead.whatsapp && lead.whatsapp.replace(/\D/g, "") === targetPhone) return false;
          return true;
        });
      });

      try {
        fetch(`/api/leads/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
        await deleteLeadFromDrive(id, targetEmail, targetPhone);
        cloudStore.mutate((draft) => {
          draft.leads = (draft.leads || []).filter((l: any) => {
            if (l.id === id) return false;
            if (targetEmail && l.email && l.email.trim().toLowerCase() === targetEmail) return false;
            if (targetPhone && targetPhone.length >= 8 && l.whatsapp && l.whatsapp.replace(/\D/g, "") === targetPhone) return false;
            return true;
          });
        }, { immediate: true });
      } catch (driveErr) {
        console.warn("Aviso ao remover lead na nuvem:", driveErr);
      }

      invalidate('leads');
    },

    bulkDeleteLeads: async (ids: string[]) => { 
      const idSet = new Set(ids);
      queryClient.setQueryData(['leads'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((l: any) => !idSet.has(l.id));
      });

      try {
        await deleteLeadFromDrive(ids);
        cloudStore.mutate((draft) => {
          draft.leads = (draft.leads || []).filter((l: any) => !idSet.has(l.id));
        }, { immediate: true });
      } catch (driveErr) {
        console.warn("Aviso ao deletar leads em massa na nuvem:", driveErr);
      }

      toast.success("Leads excluídos com sucesso.");
      invalidate('leads');
    },

    bulkUpdateLeadStatus: async (ids: string[], status: string) => { 
      const idSet = new Set(ids);
      queryClient.setQueryData(['leads'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((lead: any) => idSet.has(lead.id) ? { ...lead, classification: status } : lead);
      });

      try {
        cloudStore.mutate((draft) => {
          draft.leads = (draft.leads || []).map((l: any) => idSet.has(l.id) ? { ...l, classification: status } : l);
        }, { immediate: true });
      } catch {}

      toast.success("Status atualizado com sucesso!");
      invalidate('leads');
    },

    // TASKS
    addTask: async (t: any) => { 
      const newTask = {
        id: t.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: t.title || "Nova Tarefa",
        done: Boolean(t.done),
        dueDate: t.dueDate || t.due_date || new Date().toISOString(),
        due_date: t.dueDate || t.due_date || new Date().toISOString(),
        assignedTo: t.assignedTo || t.assigned_to || "",
        assigned_to: t.assignedTo || t.assigned_to || "",
        priority: t.priority || "media",
        leadId: t.leadId || t.lead_id,
        lead_id: t.leadId || t.lead_id,
        leadName: t.leadName || t.lead_name,
        lead_name: t.leadName || t.lead_name,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      try {
        cloudStore.mutate((draft) => {
          draft.tasks = [newTask, ...(draft.tasks || []).filter((x: any) => x.id !== newTask.id)];
        }, { immediate: true });
      } catch (err: any) {
        console.warn("Aviso ao salvar tarefa:", err);
      }

      toast.success("Tarefa adicionada!");
      invalidate('tasks');
      return newTask;
    },

    updateTask: async (id: string, t: any) => { 
      queryClient.setQueryData(['tasks'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((task: any) => task.id === id ? { ...task, ...t } : task);
      });

      try {
        cloudStore.mutate((draft) => {
          draft.tasks = (draft.tasks || []).map((task: any) => task.id === id ? { ...task, ...t } : task);
        }, { immediate: true });
      } catch (err) {
        console.warn("Aviso ao atualizar tarefa:", err);
      }

      invalidate('tasks');
    },

    deleteTask: async (id: string) => { 
      queryClient.setQueryData(['tasks'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((task: any) => task.id !== id);
      });

      try {
        await deleteTaskFromDrive(id);
        cloudStore.mutate((draft) => {
          draft.tasks = (draft.tasks || []).filter((task: any) => task.id !== id);
        }, { immediate: true });
      } catch {}
      invalidate('tasks');
    },

    toggleTask: async (id: string) => { 
      const task = tasks.find(t => t.id === id); 
      if (task) { 
        const nextDone = !task.done;
        const updates = { 
          done: nextDone,
          completedAt: nextDone ? new Date().toISOString() : null,
          completed_at: nextDone ? new Date().toISOString() : null
        };
        
        queryClient.setQueryData(['tasks'], (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((t: any) => t.id === id ? { ...t, ...updates } : t);
        });

        try {
          cloudStore.mutate((draft) => {
            draft.tasks = (draft.tasks || []).map((t: any) => t.id === id ? { ...t, ...updates } : t);
          }, { immediate: true });
        } catch {}

        invalidate('tasks');
      }
    },

    // PROFILES / USERS
    addUser: async (u: any) => {
      const id = u.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}`);
      
      const fullUser = {
        id,
        name: u.name || "Usuário",
        email: u.email || "",
        role: u.role || "Consultor Comercial",
        contact: u.contact || "",
        avatarUrl: u.avatarUrl || u.avatar_url || "",
        status: u.status || "Ativo",
        goals: u.goals || [],
        operationalGoals: u.operationalGoals || [],
        allowedModules: u.allowedModules || SYSTEM_MODULES.map(m => m.id),
        customPermissionsEnabled: Boolean(u.customPermissionsEnabled)
      };

      try {
        if (u.customPermissionsEnabled !== undefined || u.allowedModules !== undefined) {
          cloudStore.mutate((draft) => {
            const nextMap = { ...(draft.userModulePermissions || {}) };
            const permEntry = {
              enabled: Boolean(u.customPermissionsEnabled),
              modules: Array.isArray(u.allowedModules) ? u.allowedModules : []
            };
            nextMap[id] = permEntry;
            if (u.email) nextMap[u.email.toLowerCase()] = permEntry;
            draft.userModulePermissions = nextMap;
          });
        }
        saveRegisteredUser(fullUser);
      } catch (e) {
        console.warn("Aviso ao cadastrar usuário:", e);
      }
      invalidate('users');
      return fullUser;
    },

    updateUser: async (id: string, u: any) => { 
      try {
        if (u.customPermissionsEnabled !== undefined || u.allowedModules !== undefined) {
          cloudStore.mutate((draft) => {
            const nextMap = { ...(draft.userModulePermissions || {}) };
            const permEntry = {
              enabled: Boolean(u.customPermissionsEnabled),
              modules: Array.isArray(u.allowedModules) ? u.allowedModules : []
            };
            nextMap[id] = permEntry;
            if (u.email) nextMap[u.email.toLowerCase()] = permEntry;
            draft.userModulePermissions = nextMap;
          });
        }

        const localUsers = getRegisteredUsers();
        const updated = localUsers.map(user => user.id === id ? { ...user, ...u } : user);
        saveRegisteredUsers(updated);
      } catch (err) {
        console.warn("Erro ao atualizar usuário:", err);
      }
      invalidate('users');
    },

    deleteUser: async (id: string) => { 
      const targetUser = users.find(u => u.id === id);

      if (
        targetUser && 
        (targetUser.email?.toLowerCase() === "tiagorezeck@hotmail.com" || 
         targetUser.role === "Admin Geral" ||
         targetUser.name?.toLowerCase().includes("tiago rezeck"))
      ) {
        toast.error("O Administrador Titular (Tiago Rezeck) é protegido pelo sistema e não pode ser excluído!");
        throw new Error("O Administrador Titular (Tiago Rezeck) não pode ser excluído!");
      }

      try {
        removeRegisteredUser(id);
        if (targetUser?.email) {
          removeRegisteredUser(targetUser.email);
        }
      } catch {}

      invalidate('users');
    },

    // PRODUCTS
    addProduct: async (p: any) => { 
      const newProduct = {
        id: p.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: p.name || "Novo Produto",
        price: Number(p.price) || 0,
        active: p.active !== undefined ? Boolean(p.active) : true,
        description: p.description || "",
        created_at: new Date().toISOString()
      };

      try {
        cloudStore.mutate((draft) => {
          draft.products = [newProduct, ...(draft.products || []).filter((x: any) => x.id !== newProduct.id)];
        }, { immediate: true });
      } catch (err: any) {
        console.warn("Aviso ao cadastrar produto:", err);
      }

      toast.success("Produto cadastrado com sucesso!");
      invalidate('products');
      return newProduct;
    },

    updateProduct: async (id: string, p: any) => { 
      queryClient.setQueryData(['products'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((prod: any) => prod.id === id ? { ...prod, ...p } : prod);
      });

      try {
        cloudStore.mutate((draft) => {
          draft.products = (draft.products || []).map((prod: any) => prod.id === id ? { ...prod, ...p } : prod);
        }, { immediate: true });
      } catch (err) {
        console.warn("Aviso ao atualizar produto:", err);
      }

      toast.success("Produto atualizado!");
      invalidate('products');
    },

    deleteProduct: async (id: string) => { 
      queryClient.setQueryData(['products'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((prod: any) => prod.id !== id);
      });

      try {
        await deleteProductFromDrive(id);
        cloudStore.mutate((draft) => {
          draft.products = (draft.products || []).filter((prod: any) => prod.id !== id);
        }, { immediate: true });
      } catch {}

      toast.success("Produto removido com sucesso.");
      invalidate('products');
    },

    // PLAYBOOKS
    addPlaybook: async (p: any) => { 
      const newPlaybook: Playbook = {
        id: p.id || `pb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: p.title || "Novo Playbook",
        description: p.description || "",
        category: p.category || "Vendas",
        content: p.content || "",
        tags: Array.isArray(p.tags) ? p.tags : [],
        stage: p.stage || "Geral",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        cloudStore.mutate((draft) => {
          draft.playbooks = [newPlaybook, ...(draft.playbooks || []).filter((x: any) => x.id !== newPlaybook.id)];
        }, { immediate: true });
      } catch (err: any) {
        console.warn("Aviso ao criar playbook:", err);
      }

      toast.success("Playbook criado com sucesso!");
      invalidate('playbooks');
      return newPlaybook;
    },

    updatePlaybook: async (id: string, p: any) => { 
      queryClient.setQueryData(['playbooks'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((pb: any) => pb.id === id ? { ...pb, ...p, updatedAt: new Date().toISOString() } : pb);
      });

      try {
        cloudStore.mutate((draft) => {
          draft.playbooks = (draft.playbooks || []).map((pb: any) => pb.id === id ? { ...pb, ...p, updatedAt: new Date().toISOString() } : pb);
        }, { immediate: true });
      } catch (err) {
        console.warn("Aviso ao atualizar playbook:", err);
      }

      toast.success("Playbook atualizado com sucesso!");
      invalidate('playbooks');
    },

    deletePlaybook: async (id: string) => { 
      queryClient.setQueryData(['playbooks'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((pb: any) => pb.id !== id);
      });

      try {
        cloudStore.mutate((draft) => {
          draft.playbooks = (draft.playbooks || []).filter((pb: any) => pb.id !== id);
        }, { immediate: true });
      } catch {}

      toast.success("Playbook excluído com sucesso!");
      invalidate('playbooks');
    },

    // OBJECTIONS
    addObjection: async (o: any) => { 
      const newObjection: Objection = {
        id: o.id || `obj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: o.title || "Nova Objeção",
        category: o.category || "Preço",
        response: o.response || ""
      };

      try {
        cloudStore.mutate((draft) => {
          draft.objections = [newObjection, ...(draft.objections || []).filter((x: any) => x.id !== newObjection.id)];
        }, { immediate: true });
      } catch (err: any) {
        console.warn("Aviso ao criar objeção:", err);
      }

      toast.success("Objeção cadastrada com sucesso!");
      invalidate('objections');
      return newObjection;
    },

    updateObjection: async (id: string, o: any) => { 
      queryClient.setQueryData(['objections'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((obj: any) => obj.id === id ? { ...obj, ...o } : obj);
      });

      try {
        cloudStore.mutate((draft) => {
          draft.objections = (draft.objections || []).map((obj: any) => obj.id === id ? { ...obj, ...o } : obj);
        }, { immediate: true });
      } catch (err) {
        console.warn("Aviso ao atualizar objeção:", err);
      }

      toast.success("Objeção atualizada!");
      invalidate('objections');
    },

    deleteObjection: async (id: string) => { 
      queryClient.setQueryData(['objections'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((obj: any) => obj.id !== id);
      });

      try {
        cloudStore.mutate((draft) => {
          draft.objections = (draft.objections || []).filter((obj: any) => obj.id !== id);
        }, { immediate: true });
      } catch {}

      toast.success("Objeção removida!");
      invalidate('objections');
    },

    // LANDING PAGES
    addLandingPage: async (lp: any) => { 
      const fallbackUuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      const generatedId = isUUID(lp.id) ? lp.id : (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : fallbackUuid);
      const heroModel = lp.hero?.model || lp.heroModel || lp.model || "split_image";
      const nowIso = new Date().toISOString();
      const item: LandingPage = {
        name: lp.name || lp.title || "Nova Landing Page",
        title: lp.title || lp.name || "Nova Landing Page",
        template: lp.template || "COMET",
        status: lp.status || "Ativa",
        visits: lp.visits !== undefined ? Number(lp.visits) : 0,
        leads: (lp.leads ?? lp.leads_count) !== undefined ? Number(lp.leads ?? lp.leads_count) : 0,
        conv: lp.conv !== undefined ? Number(lp.conv) : 0,
        type: lp.type || "COMET CRO",
        ...lp,
        createdAt: lp.createdAt || lp.created_at || nowIso,
        created_at: lp.created_at || lp.createdAt || nowIso,
        updatedAt: nowIso,
        updated_at: nowIso,
        heroModel,
        hero: lp.hero ? { ...lp.hero, model: heroModel } : undefined,
        id: generatedId,
      };

      item.id = generatedId;
      item.originalId = generatedId;
      if (item.config) {
        item.config.client_id = generatedId;
        item.config.id = generatedId;
        item.config.originalId = generatedId;
        item.config.heroModel = heroModel;
      }

      if (item.id) removeDeletedLandingPageId(item.id);
      if (item.slug) removeDeletedLandingPageId(item.slug);

      queryClient.setQueryData(['landing_pages'], (old: LandingPage[] | undefined) => {
        const list = Array.isArray(old) ? old : [];
        return [item, ...list.filter(p => p.id !== item.id && p.slug !== item.slug)];
      });

      try {
        await Promise.allSettled([
          cloudStore.saveLandingPageOnly(item as any, { immediate: true }),
          fetch('/api/landing-pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          }),
        ]);
      } catch (netErr) {
        console.warn("Erro ao chamar API de landing pages:", netErr);
      }

      invalidate('landing_pages');
      notifyRealtimeSync();
      return item;
    },

    updateLandingPage: async (id: string | any, lp?: any) => { 
      let targetObj = lp;
      let targetIdStr = typeof id === "string" ? id : "";
      if (typeof id === "object" && id !== null) {
        targetObj = id;
        targetIdStr = id.id || id.client_id || id.originalId || "";
      } else if (!targetObj) {
        targetObj = {};
      }

      const cleanId = targetIdStr || targetObj.id || "";
      if (cleanId) removeDeletedLandingPageId(cleanId);
      if (targetObj.slug) removeDeletedLandingPageId(targetObj.slug);
      
      const currentCache = queryClient.getQueryData<LandingPage[]>(['landing_pages']) || [];
      const cloudList = getLocalLandingPages();
      const existing = currentCache.find(p => p.id === cleanId || (p as any).originalId === cleanId || (targetObj.slug && p.slug === targetObj.slug)) ||
                       cloudList.find(p => p.id === cleanId || (p as any).originalId === cleanId || (targetObj.slug && p.slug === targetObj.slug)) ||
                       getInitialAILandingPages().find(p => p.id === cleanId || (targetObj.slug && p.slug === targetObj.slug));
      const targetId = existing?.id || cleanId;
      
      const prevStatus = existing?.status;
      const nextStatus = targetObj.status;
      const isExitingTestMode = prevStatus === "Teste" && (nextStatus === "Ativa" || nextStatus === "Pausada");

      const heroModel = targetObj.hero?.model || targetObj.heroModel || targetObj.model || (existing as any)?.hero?.model || (existing as any)?.heroModel || "split_image";
      const mergedHero = (targetObj.hero || (existing as any)?.hero) ? {
        ...((existing as any)?.hero || {}),
        ...(targetObj.hero || {}),
        model: heroModel,
      } : undefined;

      const nowIso = new Date().toISOString();
      let updatedItem: LandingPage = {
        ...(existing || {}),
        ...targetObj,
        id: targetId,
        heroModel,
        hero: mergedHero || targetObj.hero || (existing as any)?.hero,
        updatedAt: nowIso,
        updated_at: nowIso,
      };

      if (updatedItem.config) {
        updatedItem.config = {
          ...updatedItem.config,
          heroModel,
          hero: updatedItem.hero || updatedItem.config.hero,
        };
      }

      if (isExitingTestMode) {
        updatedItem = {
          ...updatedItem,
          visits: 0,
          leads: 0,
          conv: 0,
          leads_count: 0,
          viewsCount: 0,
        };

        const targetTitle = existing?.name || existing?.title || updatedItem.name || updatedItem.title || "";
        const targetSlug = existing?.slug || updatedItem.slug || "";

        const isLeadFromThisLP = (l: any) => {
          if (!l) return false;
          if (l.landingPageId && (l.landingPageId === targetId || l.landingPageId === id)) return true;
          if (l.landing_page_id && (l.landing_page_id === targetId || l.landing_page_id === id)) return true;
          if (l.pageId && (l.pageId === targetId || l.pageId === id)) return true;
          if (targetTitle) {
            const lowerTitle = targetTitle.toLowerCase();
            if (l.landingPage && String(l.landingPage).toLowerCase() === lowerTitle) return true;
            if (l.landing_page && String(l.landing_page).toLowerCase() === lowerTitle) return true;
            if (l.pageTitle && String(l.pageTitle).toLowerCase() === lowerTitle) return true;
            if (l.source && String(l.source).toLowerCase().includes(lowerTitle)) return true;
            if (l.company && String(l.company).toLowerCase().includes(lowerTitle)) return true;
            if (l.metadata?.pageTitle && String(l.metadata.pageTitle).toLowerCase() === lowerTitle) return true;
          }
          if (targetSlug) {
            const lowerSlug = targetSlug.toLowerCase();
            if (l.landingPage && String(l.landingPage).toLowerCase().includes(lowerSlug)) return true;
            if (l.source && String(l.source).toLowerCase().includes(lowerSlug)) return true;
          }
          return false;
        };

        queryClient.setQueryData(['leads'], (old: Lead[] | undefined) => {
          if (!Array.isArray(old)) return [];
          return old.filter(l => !isLeadFromThisLP(l));
        });

        cloudStore.mutate((draft) => {
          draft.leads = (draft.leads || []).filter(l => !isLeadFromThisLP(l));
        });

        try {
          await fetch(`/api/landing-pages/${encodeURIComponent(targetId)}/clear-test-leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pageTitle: targetTitle, pageSlug: targetSlug })
          }).catch(() => {});
        } catch {}

        try {
          clearLpTestDataInDrive(targetId, targetTitle);
        } catch (gasErr) {
          console.warn("Aviso ao limpar dados de teste no Google Drive:", gasErr);
        }

        toast.info(`Fim do modo Teste: contadores zerados e dados fake da Landing Page excluídos com sucesso!`);
        invalidate('leads');
      }

      queryClient.setQueryData(['landing_pages'], (old: LandingPage[] | undefined) => {
        const list = Array.isArray(old) ? old : [];
        const found = list.some(p => p.id === targetId || (p as any).originalId === targetId);
        if (!found) {
          return [updatedItem, ...list];
        }
        return list.map(p => (p.id === targetId || (p as any).originalId === targetId) ? updatedItem : p);
      });

      try {
        const [saveRes] = await Promise.all([
          cloudStore.saveLandingPageOnly(updatedItem as any, { immediate: true }),
          fetch(`/api/landing-pages/${encodeURIComponent(targetId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedItem),
          }).catch(() => null),
        ]);

        if (isExitingTestMode) {
          cloudStore.pushNow().catch(() => {});
        }

        if (saveRes && !saveRes.synced) {
          console.warn("Aviso ao sincronizar LP com Google Sheets (fila em memória mantida).");
        }
      } catch {}

      invalidate('landing_pages');
      notifyRealtimeSync();
      return updatedItem;
    },

    deleteLandingPage: async (id: string) => { 
      const currentCache = queryClient.getQueryData<LandingPage[]>(['landing_pages']) || [];
      const target = currentCache.find(p => p.id === id || p.slug === id);

      const idsToMark = new Set<string>([id]);
      if (target) {
        if (target.id) idsToMark.add(target.id);
        if (target.slug) idsToMark.add(target.slug);
      }

      idsToMark.forEach(identifier => {
        if (identifier) addDeletedLandingPageId(identifier);
      });

      const isTarget = (p: any) => p && (idsToMark.has(p.id) || (p.slug && idsToMark.has(p.slug)));

      cloudStore.mutate((draft) => {
        draft.landingPages = (draft.landingPages || []).filter((p: any) => !isTarget(p));
        if (draft.activePreviewPage && isTarget(draft.activePreviewPage)) {
          draft.activePreviewPage = null;
        }
      }, { immediate: true });

      queryClient.setQueryData(['landing_pages'], (old: LandingPage[] | undefined) => {
        const list = Array.isArray(old) ? old : [];
        return list.filter(p => !isTarget(p));
      });

      try {
        fetch(`/api/landing-pages/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
        if (target?.id && target.id !== id) {
          fetch(`/api/landing-pages/${encodeURIComponent(target.id)}`, { method: "DELETE" }).catch(() => {});
        }
      } catch {}

      try {
        const targetTitle = target?.title || target?.name || "";
        const targetSlug = target?.slug || "";
        await deleteLandingPageFromDrive(Array.from(idsToMark), targetSlug, targetTitle);
      } catch (driveErr) {
        console.warn("Aviso ao remover LP do Google Drive:", driveErr);
      }

      try {
        fetch(`/api/pages/preview/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
        if (target?.id && target.id !== id) {
          fetch(`/api/pages/preview/${encodeURIComponent(target.id)}`, { method: "DELETE" }).catch(() => {});
        }
      } catch {}

      toast.success("Landing Page excluída com sucesso.");
      invalidate('landing_pages');
      notifyRealtimeSync();
    },

    deleteMultipleLandingPages: async (ids: string[]) => {
      if (!Array.isArray(ids) || ids.length === 0) return;
      for (const id of ids) {
        addDeletedLandingPageId(id);
      }

      const idsSet = new Set(ids);
      cloudStore.mutate((draft) => {
        draft.landingPages = (draft.landingPages || []).filter((p: any) => !idsSet.has(p.id) && !idsSet.has(p.slug || ""));
      }, { immediate: true });

      queryClient.setQueryData(['landing_pages'], (old: LandingPage[] | undefined) => {
        const list = Array.isArray(old) ? old : [];
        return list.filter(p => !idsSet.has(p.id) && !idsSet.has((p as any).originalId || "") && !idsSet.has(p.slug || ""));
      });

      try {
        fetch('/api/landing-pages/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        }).catch(() => {});
        await deleteLandingPageFromDrive(ids);
      } catch (driveErr) {
        console.warn("Aviso ao remover LPs em massa no Google Drive:", driveErr);
      }

      toast.success("Landing Pages selecionadas foram excluídas.");
      invalidate('landing_pages');
      notifyRealtimeSync();
    },

    cleanDatabaseKeepOne: async () => {
      const currentCache = queryClient.getQueryData<LandingPage[]>(['landing_pages']) || [];

      if (currentCache.length <= 1) {
        toast.info("A base já possui apenas 1 Landing Page.");
        return;
      }

      const toKeep = currentCache[0];
      const toDeleteIds = currentCache.slice(1).map(p => p.id).filter(Boolean);

      for (const id of toDeleteIds) {
        addDeletedLandingPageId(id);
      }

      cloudStore.mutate((draft) => {
        draft.landingPages = [toKeep];
      }, { immediate: true });

      queryClient.setQueryData(['landing_pages'], [toKeep]);

      try {
        fetch('/api/landing-pages/clean-keep-one', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keepId: toKeep.id }),
        }).catch(() => {});
        await cleanDatabaseKeepOneInDrive(toKeep.id);
      } catch (driveErr) {
        console.warn("Aviso ao limpar banco no Google Drive:", driveErr);
      }

      toast.success("Banco de dados limpo! Apenas 1 Landing Page foi mantida.");
      invalidate('landing_pages');
      notifyRealtimeSync();
    },

    // SURVEYS
    addSurvey: async (s: any) => { 
      const generatedId = isUUID(s.id) ? s.id : (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `survey_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
      const newSurvey: Survey = {
        id: s.id || generatedId,
        name: s.name || "Nova Pesquisa",
        type: s.type || 'mass',
        status: s.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: Array.isArray(s.questions) ? JSON.parse(JSON.stringify(s.questions)) : [],
        settings: s.settings || {
          headline: s.name || "Diagnóstico",
          description: s.description || "",
          buttonText: "Iniciar Diagnóstico",
          thankYouMessage: "Obrigado por responder nosso diagnóstico!",
          accentColor: s.accentColor || "#FF6B00"
        },
        reward: s.reward || { title: "Diagnóstico Completo", type: "whatsapp", value: "" },
        template: s.template || 'Modern',
        completions: s.completions || 0,
        visits: s.visits || 0,
        created_at: new Date().toISOString()
      };

      cloudStore.mutate((draft) => {
        draft.surveys = [newSurvey, ...(draft.surveys || []).filter((x: any) => x.id !== newSurvey.id)];
      }, { immediate: true });

      invalidate('surveys');
      return newSurvey;
    },

    updateSurvey: async (id: string, s: any) => { 
      const current = getLocalSurveys();
      const existing = current.find(x => x.id === id) || DEFAULT_SURVEYS.find(x => x.id === id);
      const updatedSurvey: Survey = {
        ...(existing || {}),
        ...s,
        id,
        name: s.name !== undefined ? s.name : (existing?.name || "Pesquisa"),
        questions: Array.isArray(s.questions) ? JSON.parse(JSON.stringify(s.questions)) : (existing?.questions || []),
        updated_at: new Date().toISOString()
      };

      cloudStore.mutate((draft) => {
        const list = Array.isArray(draft.surveys) ? draft.surveys : [];
        const exists = list.some((x: any) => x.id === id);
        draft.surveys = exists
          ? list.map((x: any) => x.id === id ? updatedSurvey : x)
          : [updatedSurvey, ...list];
      }, { immediate: true });

      invalidate('surveys');
      return updatedSurvey;
    },

    deleteSurvey: async (id: string) => { 
      const current = getLocalSurveys();
      const targetSurvey = current.find(x => x.id === id);
      cloudStore.mutate((draft) => {
        draft.surveys = (draft.surveys || []).filter((x: any) => x.id !== id);
      }, { immediate: true });
      try {
        await deleteSurveyFromDrive(id, targetSurvey?.name);
      } catch {}
      invalidate('surveys');
    },

    submitSurveyResponse: async (surveyId: string, leadForm: any, answers: any, duration: number, extraPayload?: any) => { 
      const responseId = `resp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const leadIdVal = leadForm?.id || extraPayload?.leadId || extraPayload?.lead_id || null;
      const lpIdVal = extraPayload?.landingPageId || extraPayload?.landing_page_id || null;
      const nowIso = new Date().toISOString();

      const newResponse: SurveyResponse = {
        id: responseId,
        surveyId,
        survey_id: surveyId,
        leadId: leadIdVal,
        lead_id: leadIdVal,
        landingPageId: lpIdVal,
        landing_page_id: lpIdVal,
        answers,
        completedAt: nowIso,
        created_at: nowIso,
        durationSeconds: duration,
        duration_seconds: duration,
        leadName: leadForm?.name || extraPayload?.leadName,
        leadCompany: leadForm?.company || extraPayload?.leadCompany,
        minClassification: extraPayload?.minClassification
      };

      cloudStore.mutate((draft) => {
        draft.surveyResponses = [newResponse, ...(draft.surveyResponses || [])];
      }, { immediate: true });

      invalidate('survey_responses');
      return newResponse;
    },

    // PIPELINES & GESTÃO KANBAN
    addPipeline: async (nameOrData: string | Partial<Pipeline>) => { 
      const pipeData = typeof nameOrData === "string" ? { name: nameOrData } : nameOrData;
      const pipeId = pipeData.id || `pipe_${Date.now()}`;
      const defaultStages: PipelineStage[] = [
        { id: `stg_${Date.now()}_1`, name: "Novo Lead", order: 1, type: "NORMAL", color: "default", slaHours: 24, active: true },
        { id: `stg_${Date.now()}_2`, name: "Contato Realizado", order: 2, type: "NORMAL", color: "info", slaHours: 24, active: true },
        { id: `stg_${Date.now()}_3`, name: "Qualificação", order: 3, type: "NORMAL", color: "warning", slaHours: 48, active: true },
        { id: `stg_${Date.now()}_4`, name: "Proposta", order: 4, type: "NORMAL", color: "purple", slaHours: 48, active: true },
        { id: `stg_${Date.now()}_5`, name: "Ganho", order: 5, type: "GANHO", color: "success", active: true },
        { id: `stg_${Date.now()}_6`, name: "Perdido", order: 6, type: "PERDIDO", color: "destructive", active: true },
        { id: `stg_${Date.now()}_7`, name: "Stand By", order: 7, type: "STAND_BY", color: "amber", active: true }
      ];

      const newPipe: Pipeline = {
        id: pipeId,
        name: pipeData.name || "Novo Pipeline",
        code: pipeData.code || (pipeData.name || "NOVO").toUpperCase().replace(/[^A-Z0-9]/g, "_").substring(0, 10),
        functionRole: pipeData.functionRole || "Seller",
        description: pipeData.description || "",
        color: pipeData.color || "primary",
        active: pipeData.active !== undefined ? pipeData.active : true,
        order: (pipelines.length || 0) + 1,
        stages: Array.isArray(pipeData.stages) && pipeData.stages.length > 0 ? pipeData.stages : defaultStages,
        is_default: false,
        created_at: new Date().toISOString()
      };

      queryClient.setQueryData(['pipelines'], (old: any) => {
        const list = Array.isArray(old) ? old : [];
        return [...list, newPipe];
      });

      cloudStore.mutate((draft) => {
        const baseList = Array.isArray(draft.pipelines) && draft.pipelines.length > 0 ? draft.pipelines : DEFAULT_PIPELINES;
        draft.pipelines = [...baseList, newPipe];
      }, { immediate: true });

      toast.success(`Pipeline "${newPipe.name}" criado com sucesso!`);
      invalidate('pipelines');
      return [newPipe];
    },

    updatePipeline: async (id: string, u: Partial<Pipeline>) => { 
      queryClient.setQueryData(['pipelines'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((p: any) => p.id === id ? { ...p, ...u } : p);
      });

      cloudStore.mutate((draft) => {
        const baseList: Pipeline[] = Array.isArray(draft.pipelines) && draft.pipelines.length > 0 ? draft.pipelines : DEFAULT_PIPELINES;
        const pipes = baseList.map((p: any) => p.id === id ? { ...p, ...u } : p);
        if (!pipes.some((p: any) => p.id === id)) {
          const defPipe = DEFAULT_PIPELINES.find(d => d.id === id);
          if (defPipe) pipes.push({ ...defPipe, ...u });
        }
        draft.pipelines = pipes;
      }, { immediate: true });

      toast.success("Pipeline atualizado com sucesso!");
      invalidate('pipelines');
    },

    savePipelineStages: async (pipelineId: string, stages: PipelineStage[]) => {
      const updatedStages = stages.map((s, idx) => ({ ...s, order: idx + 1 }));
      queryClient.setQueryData(['pipelines'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((p: any) => p.id === pipelineId ? { ...p, stages: updatedStages } : p);
      });

      cloudStore.mutate((draft) => {
        const baseList: Pipeline[] = Array.isArray(draft.pipelines) && draft.pipelines.length > 0 ? draft.pipelines : DEFAULT_PIPELINES;
        const pipes = baseList.map((p: any) => p.id === pipelineId ? { ...p, stages: updatedStages } : p);
        if (!pipes.some((p: any) => p.id === pipelineId)) {
          const defPipe = DEFAULT_PIPELINES.find(d => d.id === pipelineId);
          if (defPipe) pipes.push({ ...defPipe, stages: updatedStages });
        }
        draft.pipelines = pipes;
      }, { immediate: true });

      toast.success("Etapas do pipeline atualizadas!");
      invalidate('pipelines');
    },

    deletePipelineStage: async (pipelineId: string, stageName: string, fallbackStageName?: string) => {
      if (fallbackStageName && fallbackStageName !== stageName) {
        const leadsToMigrate = leads.filter(l => (l.pipelineId === pipelineId || (!l.pipelineId && pipelineId === "prospection")) && l.stage === stageName);
        if (leadsToMigrate.length > 0) {
          queryClient.setQueryData(['leads'], (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.map((l: any) => {
              if ((l.pipelineId === pipelineId || (!l.pipelineId && pipelineId === "prospection")) && l.stage === stageName) {
                return { ...l, stage: fallbackStageName };
              }
              return l;
            });
          });
        }
      }

      const currentPipe = pipelines.find(p => p.id === pipelineId);
      if (currentPipe) {
        const nextStages = currentPipe.stages.filter(s => s.name !== stageName);
        const updatedStages = nextStages.map((s, idx) => ({ ...s, order: idx + 1 }));
        queryClient.setQueryData(['pipelines'], (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((p: any) => p.id === pipelineId ? { ...p, stages: updatedStages } : p);
        });

        cloudStore.mutate((draft) => {
          if (fallbackStageName && fallbackStageName !== stageName) {
            draft.leads = (draft.leads || []).map((l: any) => {
              if ((l.pipelineId === pipelineId || (!l.pipelineId && pipelineId === "prospection")) && l.stage === stageName) {
                return { ...l, stage: fallbackStageName };
              }
              return l;
            });
          }
          const baseList: Pipeline[] = Array.isArray(draft.pipelines) && draft.pipelines.length > 0 ? draft.pipelines : DEFAULT_PIPELINES;
          draft.pipelines = baseList.map((p: any) => p.id === pipelineId ? { ...p, stages: updatedStages } : p);
        }, { immediate: true });
      }

      toast.success(`Etapa "${stageName}" excluída do pipeline.`);
      invalidate('pipelines');
      invalidate('leads');
    },

    deletePipeline: async (id: string) => { 
      queryClient.setQueryData(['pipelines'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((p: any) => p.id !== id);
      });

      cloudStore.mutate((draft) => {
        const baseList: Pipeline[] = Array.isArray(draft.pipelines) && draft.pipelines.length > 0 ? draft.pipelines : DEFAULT_PIPELINES;
        draft.pipelines = baseList.filter((p: any) => p.id !== id);
      }, { immediate: true });

      toast.success("Pipeline removido com sucesso!");
      invalidate('pipelines');
    },

    // TRANSFERÊNCIAS DE LEADS E CARTEIRAS (ZERO-LOCALSTORAGE CLOUD ENGINE)
    transferLead: async (
      leadId: string, 
      targetPipelineId: string, 
      targetStage: string, 
      targetOwner?: string, 
      note?: string
    ) => {
      const targetLead = leads.find(l => l.id === leadId);
      if (!targetLead) {
        toast.error("Lead não encontrado para transferência.");
        return;
      }

      const sourcePipe = pipelines.find(p => p.id === (targetLead.pipelineId || "prospection")) || pipelines[0];
      const destPipe = pipelines.find(p => p.id === targetPipelineId) || sourcePipe;
      const prevOwner = targetLead.owner || "Sem responsável";
      const newOwner = targetOwner || prevOwner;
      const prevStage = targetLead.stage;
      const nowIso = new Date().toISOString();

      const transferActivity: Activity = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: 'pipeline_transfer',
        description: `Transferido de [${sourcePipe.name}] (${prevStage}) para [${destPipe.name}] (${targetStage}). Responsável: ${newOwner}.${note ? ` Obs: ${note}` : ''}`,
        timestamp: nowIso,
        user: currentUser?.name || "Usuário",
        metadata: {
          fromPipeline: sourcePipe.id,
          toPipeline: destPipe.id,
          fromStage: prevStage,
          toStage: targetStage,
          fromOwner: prevOwner,
          toOwner: newOwner,
          note
        }
      };

      const histEntry: PipelineMovementHistory = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        leadId,
        leadName: targetLead.name || "Lead",
        previousPipelineId: sourcePipe.id,
        previousPipelineName: sourcePipe.name,
        previousStage: prevStage,
        newPipelineId: destPipe.id,
        newPipelineName: destPipe.name,
        newStage: targetStage,
        previousOwner: prevOwner,
        newOwner: newOwner,
        movementType: 'PIPELINE_TRANSFER',
        user: currentUser?.name || "Usuário",
        timestamp: nowIso,
        note: note || ""
      };

      const updatedLeadFields: Partial<Lead> = {
        pipelineId: targetPipelineId,
        stage: targetStage,
        owner: newOwner,
        previousPipelineId: sourcePipe.id,
        previousStage: prevStage,
        previousOwner: prevOwner,
        dataMovimentacao: nowIso,
        dataTransferencia: nowIso,
        activities: [transferActivity, ...(targetLead.activities || [])]
      };

      queryClient.setQueryData(['leads'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((l: any) => l.id === leadId ? { ...l, ...updatedLeadFields } : l);
      });

      queryClient.setQueryData(['pipeline_history'], (old: any) => {
        const list = Array.isArray(old) ? old : [];
        return [histEntry, ...list].slice(0, 1000);
      });

      cloudStore.mutate((draft) => {
        draft.leads = (draft.leads || []).map((l: any) => l.id === leadId ? { ...l, ...updatedLeadFields } : l);
        draft.historico_pipeline = [histEntry, ...(draft.historico_pipeline || [])].slice(0, 1000);
      }, { immediate: true });

      invalidate('leads');
      invalidate('pipeline_history');
      toast.success(`Lead transferido para ${destPipe.name} com sucesso!`);
    },

    claimLeadToPipeline: async (
      leadId: string,
      targetPipelineId: string,
      targetStage: string,
      targetOwner?: string,
      note?: string
    ) => {
      const targetLead = leads.find(l => l.id === leadId);
      if (!targetLead) {
        toast.error("Lead não encontrado.");
        return;
      }

      const eligibility = checkLeadClaimEligibility(targetLead, currentUser, pipelines);
      if (!eligibility.canClaim && currentUser?.role !== "Admin Geral") {
        toast.error(eligibility.reason);
        throw new Error(eligibility.reason);
      }

      const activeUser = getCurrentUser();
      const finalOwner = targetOwner || currentUser?.name || activeUser?.name || "Vendedor";
      const customNote = note || `Lead puxado da base de leads por ${finalOwner}`;

      const sourcePipe = pipelines.find(p => p.id === (targetLead.pipelineId || "prospection")) || pipelines[0];
      const destPipe = pipelines.find(p => p.id === targetPipelineId) || sourcePipe;
      const prevOwner = targetLead.owner || "Sem responsável";
      const prevStage = targetLead.stage;
      const nowIso = new Date().toISOString();

      const transferActivity: Activity = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: 'pipeline_transfer',
        description: `Lead puxado da base para [${destPipe.name}] (${targetStage}). Responsável: ${finalOwner}.${note ? ` Obs: ${note}` : ''}`,
        timestamp: nowIso,
        user: currentUser?.name || activeUser?.name || "Usuário",
        metadata: {
          fromPipeline: sourcePipe.id,
          toPipeline: destPipe.id,
          fromStage: prevStage,
          toStage: targetStage,
          fromOwner: prevOwner,
          toOwner: finalOwner,
          action: 'CLAIM_LEAD',
          note
        }
      };

      const histEntry: PipelineMovementHistory = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        leadId,
        leadName: targetLead.name || "Lead",
        previousPipelineId: sourcePipe.id,
        newPipelineId: destPipe.id,
        previousStage: prevStage,
        newStage: targetStage,
        previousOwner: prevOwner,
        newOwner: finalOwner,
        movementType: 'PIPELINE_TRANSFER',
        user: currentUser?.name || activeUser?.name || "Usuário",
        timestamp: nowIso,
        note: customNote
      };

      const updatedLeadFields = {
        pipelineId: destPipe.id,
        stage: targetStage,
        owner: finalOwner,
        previousPipelineId: sourcePipe.id,
        previousStage: prevStage,
        previousOwner: prevOwner,
        dataMovimentacao: nowIso,
        dataTransferencia: nowIso,
        activities: [transferActivity, ...(targetLead.activities || [])]
      };

      queryClient.setQueryData(['leads'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((l: any) => l.id === leadId ? { ...l, ...updatedLeadFields } : l);
      });

      queryClient.setQueryData(['pipeline_history'], (old: any) => {
        const list = Array.isArray(old) ? old : [];
        return [histEntry, ...list].slice(0, 1000);
      });

      cloudStore.mutate((draft) => {
        draft.leads = (draft.leads || []).map((l: any) => l.id === leadId ? { ...l, ...updatedLeadFields } : l);
        draft.historico_pipeline = [histEntry, ...(draft.historico_pipeline || [])].slice(0, 1000);
      }, { immediate: true });

      invalidate('leads');
      invalidate('pipeline_history');
      toast.success(`Lead colocado no seu pipeline (${destPipe.name}) com sucesso!`);
    },

    transferMultipleLeads: async (
      leadIds: string[],
      targetPipelineId: string,
      targetStage: string,
      targetOwner?: string,
      note?: string
    ) => {
      if (!leadIds || leadIds.length === 0) return;
      const toastId = toast.loading(`Transferindo ${leadIds.length} leads em lote...`);
      const nowIso = new Date().toISOString();
      const destPipe = pipelines.find(p => p.id === targetPipelineId) || pipelines[0];
      const historyEntries: PipelineMovementHistory[] = [];

      const applyBatchUpdate = (list: any[]) =>
        list.map((lead: any) => {
          if (!leadIds.includes(lead.id)) return lead;

          const sourcePipe = pipelines.find(p => p.id === (lead.pipelineId || "prospection")) || pipelines[0];
          const prevOwner = lead.owner || "Sem responsável";
          const newOwner = targetOwner || prevOwner;
          const prevStage = lead.stage;

          const hist: PipelineMovementHistory = {
            id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            leadId: lead.id,
            leadName: lead.name || "Lead",
            previousPipelineId: sourcePipe.id,
            previousPipelineName: sourcePipe.name,
            previousStage: prevStage,
            newPipelineId: destPipe.id,
            newPipelineName: destPipe.name,
            newStage: targetStage,
            previousOwner: prevOwner,
            newOwner: newOwner,
            movementType: 'PIPELINE_TRANSFER',
            user: currentUser?.name || "Usuário",
            timestamp: nowIso,
            note: note || "Transferência em lote"
          };
          if (!historyEntries.some(h => h.leadId === lead.id)) {
            historyEntries.push(hist);
          }

          const act: Activity = {
            id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            type: 'pipeline_transfer',
            description: `Transferência em lote de [${sourcePipe.name}] para [${destPipe.name}] (${targetStage}).`,
            timestamp: nowIso,
            user: currentUser?.name || "Usuário"
          };

          return {
            ...lead,
            pipelineId: targetPipelineId,
            stage: targetStage,
            owner: newOwner,
            previousPipelineId: sourcePipe.id,
            previousStage: prevStage,
            previousOwner: prevOwner,
            dataMovimentacao: nowIso,
            dataTransferencia: nowIso,
            activities: [act, ...(lead.activities || [])]
          };
        });

      queryClient.setQueryData(['leads'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return applyBatchUpdate(old);
      });

      queryClient.setQueryData(['pipeline_history'], (old: any) => {
        const list = Array.isArray(old) ? old : [];
        return [...historyEntries, ...list].slice(0, 1000);
      });

      cloudStore.mutate((draft) => {
        draft.leads = applyBatchUpdate(draft.leads || []);
        draft.historico_pipeline = [...historyEntries, ...(draft.historico_pipeline || [])].slice(0, 1000);
      }, { immediate: true });

      invalidate('leads');
      invalidate('pipeline_history');
      toast.dismiss(toastId);
      toast.success(`${leadIds.length} leads transferidos com sucesso!`);
    },

    distributeLeadsByRoutingConfig: async (
      targetLeadIds?: string[],
      customConfig?: Partial<LeadRoutingConfig>
    ) => {
      const activeConfig: LeadRoutingConfig = {
        ...leadRoutingConfig,
        ...(customConfig || {})
      };

      if (customConfig) {
        await updateLeadRoutingConfig(activeConfig);
      }

      let leadsToProcess: Lead[] = [];
      if (targetLeadIds && targetLeadIds.length > 0) {
        leadsToProcess = leads.filter(l => targetLeadIds.includes(l.id));
      } else {
        leadsToProcess = leads.filter(l => {
          const elig = checkLeadClaimEligibility(l, currentUser, pipelines);
          const isUnassigned = !l.owner || l.owner === "Sem dono" || l.owner === "Sem responsável";
          const isInitialStage = l.stage === "Novo Lead" || l.stage === "Leads" || l.stage === "Sem Contato";
          return elig.canClaim && (isUnassigned || isInitialStage);
        });
      }

      if (leadsToProcess.length === 0) {
        toast.info("Nenhum lead elegível para distribuição encontrado.");
        return { count: 0 };
      }

      const targetRole = activeConfig.targetRole || "LDR";
      const tr = targetRole.toLowerCase();
      let candidates = users.filter(u => {
        const r = (u.role || "").toLowerCase();
        if (r.includes(tr)) return true;
        if (tr === "seller" && (r.includes("vendedor") || r.includes("comercial") || r.includes("closer"))) return true;
        if (tr === "ldr" && (r.includes("qualificador") || r.includes("prospector") || r.includes("inbound"))) return true;
        return false;
      });

      if (candidates.length === 0) {
        candidates = users.filter(u => !u.role?.toLowerCase().includes("desenvolvedor")) || users;
        if (candidates.length === 0 && currentUser) {
          candidates = [currentUser];
        }
      }

      const destPipe = pipelines.find(p => p.id === activeConfig.targetPipelineId) || pipelines[0];
      const destStage = activeConfig.targetStage || (destPipe.stages[0]?.name || "Novo Lead");
      const distType = activeConfig.distributionType || "role_round_robin";

      const nowIso = new Date().toISOString();
      const historyEntries: PipelineMovementHistory[] = [];
      const toastId = toast.loading(`Distribuindo ${leadsToProcess.length} leads (${targetRole})...`);

      const leadIdToAssignedOwner: Record<string, string> = {};

      leadsToProcess.forEach((l, idx) => {
        let assignedOwner = "Sem responsável";
        if (distType === "specific_user") {
          const spec = users.find(u => u.id === activeConfig.specificUserId);
          assignedOwner = spec?.name || activeConfig.specificUserName || currentUser?.name || "Vendedor";
        } else if (distType === "role_round_robin") {
          const c = candidates[idx % candidates.length];
          assignedOwner = c?.name || currentUser?.name || "Vendedor";
        } else if (distType === "unassigned") {
          assignedOwner = "Sem responsável";
        }
        leadIdToAssignedOwner[l.id] = assignedOwner;
      });

      const updatedLeadIds = new Set(leadsToProcess.map(l => l.id));

      const applyDistribution = (list: any[]) =>
        list.map((lead: any) => {
          if (!updatedLeadIds.has(lead.id)) return lead;

          const assignedOwner = leadIdToAssignedOwner[lead.id] || "Sem responsável";
          const sourcePipe = pipelines.find(p => p.id === (lead.pipelineId || "prospection")) || pipelines[0];
          const prevOwner = lead.owner || "Sem responsável";
          const prevStage = lead.stage;

          if (!historyEntries.some(h => h.leadId === lead.id)) {
            historyEntries.push({
              id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              leadId: lead.id,
              leadName: lead.name || "Lead",
              previousPipelineId: sourcePipe.id,
              previousPipelineName: sourcePipe.name,
              previousStage: prevStage,
              newPipelineId: destPipe.id,
              newPipelineName: destPipe.name,
              newStage: destStage,
              previousOwner: prevOwner,
              newOwner: assignedOwner,
              movementType: 'PIPELINE_TRANSFER',
              user: currentUser?.name || "Distribuição Automática",
              timestamp: nowIso,
              note: `Distribuído para ${assignedOwner} no funil ${destPipe.name} (${destStage})`
            });
          }

          const act: Activity = {
            id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            type: 'pipeline_transfer',
            description: `Distribuído via regra de ${targetRole} para [${destPipe.name}] (${destStage}). Responsável: ${assignedOwner}.`,
            timestamp: nowIso,
            user: currentUser?.name || "Distribuição Automática",
            metadata: {
              targetRole,
              distributionType: distType,
              assignedOwner
            }
          };

          return {
            ...lead,
            pipelineId: destPipe.id,
            stage: destStage,
            owner: assignedOwner,
            previousPipelineId: sourcePipe.id,
            previousStage: prevStage,
            previousOwner: prevOwner,
            dataMovimentacao: nowIso,
            dataTransferencia: nowIso,
            activities: [act, ...(lead.activities || [])]
          };
        });

      queryClient.setQueryData(['leads'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return applyDistribution(old);
      });

      queryClient.setQueryData(['pipeline_history'], (old: any) => {
        const list = Array.isArray(old) ? old : [];
        return [...historyEntries, ...list].slice(0, 1000);
      });

      cloudStore.mutate((draft) => {
        draft.leads = applyDistribution(draft.leads || []);
        draft.historico_pipeline = [...historyEntries, ...(draft.historico_pipeline || [])].slice(0, 1000);
      }, { immediate: true });

      invalidate('leads');
      invalidate('pipeline_history');
      toast.dismiss(toastId);
      toast.success(`${leadsToProcess.length} leads distribuídos com sucesso!`);
      return { count: leadsToProcess.length };
    },

    transferEntirePipeline: async (
      sourcePipelineId: string, 
      targetOwner: string, 
      targetPipelineId?: string, 
      note?: string
    ) => {
      const sourcePipe = pipelines.find(p => p.id === sourcePipelineId);
      if (!sourcePipe) return;

      const leadsInSource = leads.filter(l => l.pipelineId === sourcePipelineId || (!l.pipelineId && sourcePipelineId === "prospection"));
      if (leadsInSource.length === 0) {
        toast.info("Não há leads neste pipeline para transferir.");
        return;
      }

      const destPipeId = targetPipelineId || sourcePipelineId;
      const destPipe = pipelines.find(p => p.id === destPipeId) || sourcePipe;
      const defaultDestStage = destPipe.stages[0]?.name || "Novo Lead";
      const leadIds = leadsInSource.map(l => l.id);

      const toastId = toast.loading(`Transferindo carteira completa de ${sourcePipe.name} (${leadIds.length} leads)...`);
      const nowIso = new Date().toISOString();
      const historyEntries: PipelineMovementHistory[] = [];

      const applyTransfer = (list: any[]) =>
        list.map((lead: any) => {
          if (!leadIds.includes(lead.id)) return lead;
          const prevOwner = lead.owner || "Sem responsável";
          const prevStage = lead.stage;

          if (!historyEntries.some(h => h.leadId === lead.id)) {
            historyEntries.push({
              id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              leadId: lead.id,
              leadName: lead.name || "Lead",
              previousPipelineId: sourcePipe.id,
              previousPipelineName: sourcePipe.name,
              previousStage: prevStage,
              newPipelineId: destPipe.id,
              newPipelineName: destPipe.name,
              newStage: defaultDestStage,
              previousOwner: prevOwner,
              newOwner: targetOwner,
              movementType: 'PIPELINE_TRANSFER',
              user: currentUser?.name || "Usuário",
              timestamp: nowIso,
              note: note || `Transferência integral da carteira do funil ${sourcePipe.name}`
            });
          }

          return {
            ...lead,
            pipelineId: destPipeId,
            stage: defaultDestStage,
            owner: targetOwner,
            previousPipelineId: sourcePipe.id,
            previousStage: prevStage,
            previousOwner: prevOwner,
            dataMovimentacao: nowIso,
            dataTransferencia: nowIso
          };
        });

      queryClient.setQueryData(['leads'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return applyTransfer(old);
      });

      queryClient.setQueryData(['pipeline_history'], (old: any) => {
        const list = Array.isArray(old) ? old : [];
        return [...historyEntries, ...list].slice(0, 1000);
      });

      cloudStore.mutate((draft) => {
        draft.leads = applyTransfer(draft.leads || []);
        draft.historico_pipeline = [...historyEntries, ...(draft.historico_pipeline || [])].slice(0, 1000);
      }, { immediate: true });

      invalidate('leads');
      invalidate('pipeline_history');
      toast.dismiss(toastId);
      toast.success(`Carteira inteira (${leadIds.length} leads) transferida com sucesso para ${targetOwner}!`);
    },

    // PERMISSIONS & CONFIGS (ZERO-LOCALSTORAGE CLOUD ENGINE)
    updateRolePermissions: async (role: string, stages: string[]) => { 
      cloudStore.mutate((draft) => {
        draft.rolePermissions = { ...(draft.rolePermissions || {}), [role]: stages };
      }, { immediate: true });

      toast.success("Permissões atualizadas com sucesso!");
      invalidate('role_permissions');
    },
    
    setWorkingDays: async (days: number[]) => { 
      cloudStore.mutate((draft) => {
        draft.workingDays = days;
      }, { immediate: true });

      toast.success("Dias úteis atualizados com sucesso!");
      invalidate('working_days');
    },

    setHolidays: async (dates: string[]) => { 
      cloudStore.mutate((draft) => {
        draft.holidays = dates;
      }, { immediate: true });

      toast.success("Feriados atualizados com sucesso!");
      invalidate('holidays');
    },

    setVisibility: async (v: VisibilitySettings) => { 
      cloudStore.mutate((draft) => {
        draft.visibility = v;
      }, { immediate: true });

      toast.success("Visibilidade atualizada com sucesso!");
      invalidate('visibility_settings');
    },

    setSlaThresholds: async (t: any) => { 
      cloudStore.mutate((draft) => {
        draft.slaThresholds = t;
      }, { immediate: true });

      toast.success("SLA atualizado com sucesso!");
      invalidate('sla_thresholds');
    },

    // MARKETING INVESTMENTS
    addMarketingInvestment: async (inv: any) => { 
      const newInv = {
        id: inv.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        amount: Number(inv.amount) || 0,
        channel: inv.channel || "Meta Ads",
        start_date: inv.start_date || inv.startDate || new Date().toISOString(),
        end_date: inv.end_date || inv.endDate || new Date().toISOString(),
        landing_page_id: inv.landing_page_id || inv.landingPageId || null,
        description: inv.description || "",
        created_at: new Date().toISOString()
      };

      cloudStore.mutate((draft) => {
        draft.marketingInvestments = [newInv, ...(draft.marketingInvestments || [])];
      }, { immediate: true });

      toast.success("Investimento lançado com sucesso!");
      invalidate('marketing_investments');
      return [newInv];
    },

    deleteMarketingInvestment: async (id: string) => { 
      cloudStore.mutate((draft) => {
        draft.marketingInvestments = (draft.marketingInvestments || []).filter((x: any) => x.id !== id);
      }, { immediate: true });

      toast.success("Investimento removido!");
      invalidate('marketing_investments');
    },

    // AUTOMATIONS
    addAutomation: async (a: any) => { 
      const newAuto = {
        ...a,
        id: a.id || Date.now(),
        active: a.active !== undefined ? a.active : true,
        created_at: new Date().toISOString()
      };

      cloudStore.mutate((draft) => {
        draft.automations = [newAuto, ...(draft.automations || [])];
      }, { immediate: true });

      toast.success("Automação criada com sucesso!");
      invalidate('automations');
      return [newAuto];
    },

    updateAutomation: async (id: number, a: any) => { 
      cloudStore.mutate((draft) => {
        draft.automations = (draft.automations || []).map((x: any) => x.id === id ? { ...x, ...a } : x);
      }, { immediate: true });

      toast.success("Automação atualizada com sucesso!");
      invalidate('automations');
      return [{ id, ...a }];
    },

    deleteAutomation: async (id: number) => { 
      cloudStore.mutate((draft) => {
        draft.automations = (draft.automations || []).filter((x: any) => x.id !== id);
      }, { immediate: true });

      toast.success("Automação removida com sucesso!");
      invalidate('automations');
    },

    toggleAutomation: async (id: number) => { 
      const aut = automations.find(a => a.id === id); 
      if (aut) { 
        const updated = !aut.active;
        cloudStore.mutate((draft) => {
          draft.automations = (draft.automations || []).map((x: any) => x.id === id ? { ...x, active: updated } : x);
        }, { immediate: true });

        invalidate('automations');
      }
    },

    // HANDOFF RULES
    addHandoffRule: async (r: any) => { 
      const newRule = {
        id: r.id || `hr_${Date.now()}`,
        ...r,
        created_at: new Date().toISOString()
      };

      cloudStore.mutate((draft) => {
        draft.handoffRules = [newRule, ...(draft.handoffRules || [])];
      }, { immediate: true });

      toast.success("Regra de handoff criada com sucesso!");
      invalidate('handoff_rules');
      return [newRule];
    },

    updateHandoffRule: async (id: string, r: any) => { 
      cloudStore.mutate((draft) => {
        draft.handoffRules = (draft.handoffRules || []).map((x: any) => x.id === id ? { ...x, ...r } : x);
      }, { immediate: true });

      toast.success("Regra de handoff atualizada!");
      invalidate('handoff_rules');
      return [{ id, ...r }];
    },

    deleteHandoffRule: async (id: string) => { 
      cloudStore.mutate((draft) => {
        draft.handoffRules = (draft.handoffRules || []).filter((x: any) => x.id !== id);
      }, { immediate: true });

      toast.success("Regra de handoff excluída!");
      invalidate('handoff_rules');
    },

    // STAGE WORKFLOWS (normalizado como StageWorkflow[])
    updateWorkflow: async (pipelineId: string, stageName: string, updates: Partial<StageWorkflow>) => { 
      cloudStore.mutate((draft) => {
        const raw = draft.stageWorkflows;
        let list: StageWorkflow[] = [];
        if (Array.isArray(raw)) {
          list = [...raw];
        } else if (raw && typeof raw === "object") {
          list = Object.entries(raw).map(([key, val]: [string, any]) => {
            const [pid, ...rest] = key.split("_");
            return {
              pipelineId: val?.pipelineId || pid,
              stageName: val?.stageName || rest.join("_"),
              rules: Array.isArray(val?.rules) ? val.rules : [],
              ...val,
            } as StageWorkflow;
          });
        }
        const idx = list.findIndex(w => w.pipelineId === pipelineId && w.stageName === stageName);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...updates, pipelineId, stageName };
        } else {
          list.push({
            id: `${pipelineId}_${stageName}`,
            pipelineId,
            stageName,
            rules: Array.isArray(updates.rules) ? updates.rules : [],
            ...updates,
          });
        }
        draft.stageWorkflows = list;
      }, { immediate: true });

      invalidate('stage_workflows');
    },

    // COMPANY SETTINGS
    setCompany: async (c: any) => { 
      const updated = {
        ...company,
        name: c.name || company?.name || "Minha Empresa",
        sector: c.sector ?? company?.sector ?? "",
        purpose: c.purpose ?? company?.purpose ?? "",
        logo: c.logo ?? company?.logo ?? "",
        contact: c.contact ?? company?.contact ?? "",
        email: c.email ?? company?.email ?? "",
        address: c.address ?? company?.address ?? "",
        website: c.website ?? company?.website ?? "",
        updated_at: new Date().toISOString()
      };

      cloudStore.mutate((draft) => {
        draft.company = { ...(draft.company || {}), ...updated };
      }, { immediate: true });

      toast.success("Dados da empresa atualizados!");
      invalidate('company_settings');
    },

    setDateFilter: (f: DateFilter) => { 
      queryClient.setQueryData(['dateFilter'], f); 
      invalidate('leads'); 
    },

    setAIConfig: async (config: any) => { 
      const updated = {
        ...(cloudStore.getState().aiConfig || {}),
        ...config,
        openrouter_key: config.openRouterKey ?? config.openrouter_key,
        model_id: config.modelId ?? config.model_id,
        model_name: config.modelName ?? config.model_name
      };

      cloudStore.mutate((draft) => {
        draft.aiConfig = updated;
      }, { immediate: true });

      invalidate('ai_settings'); 
      toast.success("Configuração de IA salva com sucesso!");
    },

    // ==========================================
    // EXPORTAÇÃO & IMPORTAÇÃO REAL
    // ==========================================

    exportData: () => { 
      try {
        const fullBackup = {
          version: "3.0.0",
          exportedAt: new Date().toISOString(),
          company,
          visibility,
          slaThresholds,
          workingDays,
          holidays,
          funnelTypes,
          leads,
          tasks,
          products,
          playbooks,
          objections,
          landingPages,
          surveys,
          automations,
          marketingInvestments,
          pipelines
        };

        const dateStr = new Date().toISOString().split('T')[0];
        downloadDataFile(
          JSON.stringify(fullBackup, null, 2), 
          `COMET_CRM_BACKUP_COMPLETO_${dateStr}.json`, 
          "application/json"
        );
        toast.success("Backup completo exportado com sucesso!");
      } catch (err: any) {
        toast.error(`Erro ao gerar backup: ${err.message}`);
      }
    },

    importData: async (newData: any, mode: 'merge' | 'replace') => { 
      toast.loading(mode === 'replace' ? "Substituindo base de dados..." : "Mesclando dados no sistema...");

      try {
        cloudStore.mutate((draft) => {
          const mergeList = (cur: any[], inc: any[]) =>
            mode === 'replace'
              ? inc
              : [...inc, ...(cur || []).filter((c: any) => !inc.some((n: any) => n.id === c.id))];

          if (Array.isArray(newData.leads) && newData.leads.length > 0) {
            draft.leads = mergeList(draft.leads || [], newData.leads);
          }
          if (Array.isArray(newData.tasks) && newData.tasks.length > 0) {
            draft.tasks = mergeList(draft.tasks || [], newData.tasks);
          }
          if (Array.isArray(newData.products) && newData.products.length > 0) {
            draft.products = mergeList(draft.products || [], newData.products);
          }
          if (Array.isArray(newData.playbooks) && newData.playbooks.length > 0) {
            draft.playbooks = mergeList(draft.playbooks || [], newData.playbooks);
          }
          if (Array.isArray(newData.objections) && newData.objections.length > 0) {
            draft.objections = mergeList(draft.objections || [], newData.objections);
          }
          if (Array.isArray(newData.landingPages) && newData.landingPages.length > 0) {
            draft.landingPages = mergeList(draft.landingPages || [], newData.landingPages);
          }
          if (Array.isArray(newData.surveys) && newData.surveys.length > 0) {
            draft.surveys = mergeList(draft.surveys || [], newData.surveys);
          }
          if (Array.isArray(newData.automations) && newData.automations.length > 0) {
            draft.automations = mergeList(draft.automations || [], newData.automations);
          }
          if (newData.company) draft.company = newData.company;
          if (newData.visibility) draft.visibility = newData.visibility;
          if (newData.slaThresholds) draft.slaThresholds = newData.slaThresholds;
        }, { immediate: true });

        await cloudStore.pushNow().catch(() => {});
        queryClient.invalidateQueries();
        toast.dismiss();
        toast.success(mode === 'replace' ? "Dados substituídos com sucesso!" : "Dados mesclados com sucesso!");
      } catch (err: any) {
        toast.dismiss();
        toast.error(`Falha na importação: ${err.message}`);
      }
    },

    importModuleData: async (key: string, data: any, mode: string) => { 
      toast.loading(`Importando registros de ${key}...`);
      try {
        const items = Array.isArray(data) ? data : [data];

        cloudStore.mutate((draft) => {
          const mergeByMode = (cur: any[]) =>
            mode === 'replace'
              ? items
              : [...items, ...(cur || []).filter((c: any) => !items.some((i: any) => i.id === c.id))];

          switch (key) {
            case 'leads':
              draft.leads = mergeByMode(draft.leads || []);
              break;
            case 'tasks':
              draft.tasks = mergeByMode(draft.tasks || []);
              break;
            case 'products':
              draft.products = mergeByMode(draft.products || []);
              break;
            case 'objections':
              draft.objections = mergeByMode(draft.objections || []);
              break;
            case 'landingPages':
              draft.landingPages = mergeByMode(draft.landingPages || []);
              break;
            case 'surveys':
              draft.surveys = mergeByMode(draft.surveys || []);
              break;
            case 'playbooks':
              draft.playbooks = mergeByMode(draft.playbooks || []);
              break;
            case 'automations':
              draft.automations = mergeByMode(draft.automations || []);
              break;
            default:
              console.warn(`Módulo ${key} não possui handler específico.`);
          }
        }, { immediate: true });

        await cloudStore.pushNow().catch(() => {});
        queryClient.invalidateQueries();
        toast.dismiss();
        toast.success(`Módulo ${key} importado com sucesso!`);
      } catch (err: any) {
        toast.dismiss();
        toast.error(`Erro ao importar ${key}: ${err.message}`);
      }
    },

    addFunnelType: async (type: string) => { 
      const next = [...funnelTypes, type]; 
      cloudStore.mutate((draft) => {
        draft.funnelTypes = next;
      }, { immediate: true });
      invalidate('funnel_types'); 
      toast.success("Tipo de funil adicionado com sucesso!");
    },

    deleteFunnelType: async (type: string) => { 
      const next = funnelTypes.filter(t => t !== type); 
      cloudStore.mutate((draft) => {
        draft.funnelTypes = next;
      }, { immediate: true });
      invalidate('funnel_types'); 
      toast.success("Tipo de funil removido!");
    },

    resetData: async () => {
      const activeSessionUser = getCurrentUser();
      const userRole = currentUser?.role || activeSessionUser?.role;
      if (userRole !== "Admin Geral") {
        toast.error("Acesso Negado: Apenas o Administrador Geral pode resetar o banco de dados!");
        return;
      }

      const toastId = toast.loading("Criando checkpoint e executando limpeza do banco...");

      // 0. CRIAR CHECKPOINT COMPLETO ANTES DA LIMPEZA
      try {
        const fullBackup = {
          version: "3.0.0",
          type: "pre_reset_checkpoint",
          exportedAt: new Date().toISOString(),
          company,
          visibility,
          slaThresholds,
          workingDays,
          holidays,
          funnelTypes,
          leads,
          tasks,
          products,
          playbooks,
          objections,
          landingPages,
          surveys,
          automations,
          marketingInvestments,
          pipelines
        };

        const now = new Date();
        const checkpointName = formatCheckpointName(now);

        saveSystemCheckpoint({
          id: `cp_${Date.now()}`,
          name: checkpointName,
          timestamp: now.toISOString(),
          leadsCount: leads.length,
          data: fullBackup
        });

        const driveCfg = getDriveConfig();
        if (driveCfg && driveCfg.webappUrl) {
          try {
            await createCheckpoint(driveCfg.webappUrl, fullBackup);
          } catch (driveErr) {
            console.warn("Aviso ao salvar checkpoint no Google Drive:", driveErr);
          }
        }
      } catch (cpErr) {
        console.warn("Aviso na criação do checkpoint pré-reset:", cpErr);
      }

      // 1. Limpeza na nuvem e RAM (Base de Leads 100% preservada, zero localStorage)
      try {
        purgeLegacyBusinessLocalStorage();

        cloudStore.mutate((draft) => {
          draft.tasks = [];
          draft.surveys = [];
          draft.surveyResponses = [];
          draft.landingPages = [];
          draft.deletedLpIds = [];
          draft.activePreviewPage = null;
          draft.marketingInvestments = [];
          draft.products = [];
          draft.objections = [];
          draft.handoffRules = [];
          draft.stageWorkflows = [];
          draft.pipelines = DEFAULT_PIPELINES;
          draft.playbooks = DEFAULT_PLAYBOOKS;
          draft.automations = [
            {
              id: 1,
              name: "SLA: Alerta de Inatividade (24h)",
              category: "SLA",
              trigger_event: "lead.sla_breach",
              priority: "alta",
              active: true,
              action_type: "notify",
              action_config: { message: "Atenção! Um lead entrou em zona de alerta por falta de interação." }
            },
            {
              id: 2,
              name: "Tarefa: Primeiro Contato Inbound",
              category: "Vendas",
              trigger_event: "lead.created",
              priority: "urgente",
              active: true,
              action_type: "create_task",
              action_config: { title: "Realizar primeiro contato via WhatsApp (Lead Novo)" }
            }
          ];
        }, { immediate: true });

        await cloudStore.pushNow().catch(() => {});
      } catch (err: any) {
        console.warn("Aviso no reset dos dados:", err);
      }

      queryClient.invalidateQueries();
      toast.dismiss(toastId);
      toast.success("Banco de dados resetado com sucesso! Checkpoint criado e Base de Leads 100% preservada.");
    }
  };
}
