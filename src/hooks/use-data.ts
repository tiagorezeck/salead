"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { SURVEY_PRESETS } from "@/lib/survey-templates";
import { normalizePhone, validateEmail, parseCurrencyBR } from "@/lib/validators";
import { 
  getLocalDatabaseRoot, 
  saveLocalDatabaseRoot,
  getDriveConfig, 
  fetchFromGoogleDrive, 
  pushToGoogleDrive,
  clearLpTestDataInDrive,
  deleteLandingPageFromDrive,
  deleteLeadFromDrive,
  deleteProductFromDrive,
  deleteTaskFromDrive,
  deleteSurveyFromDrive,
  cleanDatabaseKeepOneInDrive,
  createCheckpoint,
  saveSystemCheckpoint,
  formatCheckpointName
} from "@/services/googleDriveDatabaseService";
import { getCurrentUser, getRegisteredUsers, removeRegisteredUser } from "@/lib/auth-service";

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
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("comet_crm_surveys");
    if (raw) return JSON.parse(raw);
    const rawCrm = localStorage.getItem("comet_crm_data");
    if (rawCrm) {
      const parsed = JSON.parse(rawCrm);
      if (Array.isArray(parsed.surveys)) return parsed.surveys;
    }
  } catch {}
  return [];
};

const saveLocalSurveys = (surveys: Survey[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("comet_crm_surveys", JSON.stringify(surveys));
    const rawCrm = localStorage.getItem("comet_crm_data");
    const parsed = rawCrm ? JSON.parse(rawCrm) : {};
    parsed.surveys = surveys;
    localStorage.setItem("comet_crm_data", JSON.stringify(parsed));
  } catch {}
};

const getLocalSurveyResponses = (): SurveyResponse[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("comet_crm_survey_responses");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveLocalSurveyResponses = (responses: SurveyResponse[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("comet_crm_survey_responses", JSON.stringify(responses));
  } catch {}
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

import { parseLegacyMinScore } from "@/lib/min-qualification";

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
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_LP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addDeletedLandingPageId = (id: string) => {
  if (typeof window === "undefined" || !id) return;
  try {
    const ids = getDeletedLandingPageIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(DELETED_LP_STORAGE_KEY, JSON.stringify(ids));
    }
  } catch {}
};

export const removeDeletedLandingPageId = (id: string) => {
  if (typeof window === "undefined" || !id) return;
  try {
    const ids = getDeletedLandingPageIds();
    const filtered = ids.filter((item) => item !== id);
    localStorage.setItem(DELETED_LP_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
};

export const getLocalLandingPages = (): LandingPage[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_LP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveLocalLandingPages = (lps: LandingPage[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_LP_STORAGE_KEY, JSON.stringify(lps));
  } catch (err) {
    console.warn("Falha ao salvar landing pages no localStorage:", err);
  }
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
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
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
  const config = typeof row.config === 'object' && row.config !== null ? row.config : {};
  return {
    ...config,
    id: row.id,
    originalId: config.client_id || config.id || row.id,
    name: row.name || config.name || config.title || "Landing Page",
    title: row.name || config.title || config.name || "Landing Page",
    template: row.template || config.template || "Modern",
    status: row.status || config.status || "Ativa",
    visits: Number(row.visits) || 0,
    leads: Number(row.leads_count) || 0,
    conv: (row.visits > 0 && row.leads_count > 0) ? Math.round((row.leads_count / row.visits) * 100) : 0,
    type: config.type || "COMET CRO",
    surveyId: config.surveyId || row.survey_id || undefined,
    externalUrl: config.externalUrl || row.external_url || undefined,
  };
};

export const mapLPToDb = (lp: Partial<LandingPage> & Record<string, any>) => {
  const { id, name, template, status, visits, leads, leads_count, created_at, updated_at, conv, ...config } = lp;
  const payload: Record<string, any> = {
    name: name || lp.title || "Nova Landing Page",
    template: template || "Modern",
    status: status || "Ativa",
    visits: visits !== undefined ? Number(visits) : 0,
    leads_count: (leads_count ?? leads) !== undefined ? Number(leads_count ?? leads) : 0,
    config: {
      ...(config || {}),
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
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("comet_user_module_permissions");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
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
// MAIN HOOK
// ==========================================

export function useData() {
  const queryClient = useQueryClient();
  const invalidate = (key: string) => queryClient.invalidateQueries({ queryKey: [key] });

  // Sincronizador Automático com Google Drive & Google Sheets
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isPolling = false;

    // Sincroniza e recarrega dados quando a configuração do Google Drive é alterada
    const handleDriveConfigUpdate = async () => {
      const cfg = getDriveConfig();
      if (cfg.webappUrl) {
        try {
          const remote = await fetchFromGoogleDrive(cfg.webappUrl);
          if (remote) {
            invalidate('leads');
            invalidate('landing_pages');
            invalidate('tasks');
            invalidate('products');
            invalidate('surveys');
            invalidate('pipelines');
            invalidate('users');
            invalidate('objections');
            invalidate('playbooks');
            invalidate('automations');
            invalidate('marketing_investments');
          }
        } catch {}
      }
    };

    window.addEventListener('salead_drive_config_updated', handleDriveConfigUpdate);

    // Polling periódico em segundo plano para manter dados sincronizados com a planilha/Drive
    const interval = setInterval(async () => {
      const cfg = getDriveConfig();
      if (cfg.webappUrl && cfg.autoSync !== false && !isPolling) {
        try {
          isPolling = true;
          const remote = await fetchFromGoogleDrive(cfg.webappUrl);
          if (remote) {
            invalidate('leads');
            invalidate('landing_pages');
          }
        } catch {} finally {
          isPolling = false;
        }
      }
    }, 15000);

    return () => {
      window.removeEventListener('salead_drive_config_updated', handleDriveConfigUpdate);
      clearInterval(interval);
    };
  }, []);

  // Checkpoint Inicial Automático ao abrir a primeira URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const alreadyCreated = localStorage.getItem("salead_initial_checkpoint_created");
      if (!alreadyCreated) {
        try {
          const now = new Date();
          const checkpointName = formatCheckpointName(now);
          saveSystemCheckpoint({
            id: `cp_initial_${Date.now()}`,
            name: checkpointName,
            timestamp: now.toISOString(),
            leadsCount: 0,
            data: { version: "2.0.0", type: "initial_checkpoint", exportedAt: now.toISOString() }
          });
          localStorage.setItem("salead_initial_checkpoint_created", "true");
        } catch (err) {
          console.warn("Aviso ao criar checkpoint inicial:", err);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisitIncremented = () => {
      invalidate('landing_pages');
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || e.key.includes("landing") || e.key.includes("preview") || e.key.includes("cro")) {
        invalidate('landing_pages');
      }
    };

    window.addEventListener("lp_visit_incremented", handleVisitIncremented);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("lp_visit_incremented", handleVisitIncremented);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session;
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
      try {
        const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }); 
        if (!error && data) {
          dbLeads = data.map(mapLeadFromDb);
        }
      } catch (err) {
        console.warn("Aviso ao carregar leads do Supabase, fallback ativo:", err);
      }

      // 1b. Server in-memory submissions (capturados via /api/submit-lead)
      let apiLeads: Lead[] = [];
      try {
        const res = await fetch("/api/leads");
        if (res.ok) {
          const resJson = await res.json();
          if (Array.isArray(resJson.leads)) {
            apiLeads = resJson.leads.map((item: any) => ({
              id: item.id || `api_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: item.name || "Lead Capturado",
              company: item.name ? `${item.name} (LP: ${item.pageTitle || item.pageId || "Landing Page"})` : "Empresa",
              email: item.email || "",
              whatsapp: item.whatsapp || "",
              value: 0,
              stage: "Leads",
              owner: "Inbound LP",
              source: `LP: ${item.pageTitle || item.pageId || "Landing Page"}`,
              classification: "Lead",
              temperature: "Quente",
              type: "Inbound",
              strategy: "CRO Auto",
              decisionRole: "Decisor",
              minScore: "Aprovado",
              landingPage: item.pageTitle || item.pageId,
              tags: ["inbound", "landing-page"],
              score: 85,
              sla: "ok",
              lastInteraction: "Formulário enviado na LP",
              createdAt: item.submittedAt || new Date().toISOString(),
              activities: [],
              completedCheckpoints: [],
              status: "Ativo",
              personType: "PJ",
              role: "",
              revenue: "",
              capag: "",
              metadata: item
            }));
          }
        }
      } catch {}

      // 1c. Filas locais do browser (comet_inbound_leads_queue e people_cro_leads_v1)
      let queueLeads: Lead[] = [];
      if (typeof window !== "undefined") {
        try {
          const rawQ1 = localStorage.getItem("comet_inbound_leads_queue");
          const rawQ2 = localStorage.getItem("people_cro_leads_v1");
          const combinedQ = [
            ...(rawQ1 ? JSON.parse(rawQ1) : []),
            ...(rawQ2 ? JSON.parse(rawQ2) : []),
          ];

          if (Array.isArray(combinedQ) && combinedQ.length > 0) {
            queueLeads = (combinedQ.map((item: any) => {
              const raw = item.rawLead || item.lead || item;
              const name = raw.name || item.name || "Lead Capturado";
              const email = raw.email || item.email || "";
              const whatsapp = raw.whatsapp || item.whatsapp || "";
              const pageTitle = item.pageTitle || item.landingPage || raw.landingPage || "Landing Page";
              const source = item.source || raw.source || "Landing Page";

              return {
                id: item.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name,
                company: `${name} (LP: ${pageTitle})`,
                email,
                whatsapp,
                value: 0,
                stage: item.stage || "Leads",
                owner: item.owner || "Inbound LP",
                source: `LP: ${pageTitle} [${source}]`,
                classification: "Lead",
                temperature: "Quente",
                type: "Inbound",
                strategy: "CRO Auto",
                decisionRole: "Decisor",
                minScore: "Aprovado",
                landingPage: pageTitle,
                tags: ["inbound", "landing-page"],
                score: 80,
                sla: "ok",
                lastInteraction: "Capturado via LP",
                createdAt: item.capturedAt || item.createdAt || item.submittedAt || new Date().toISOString(),
                activities: [],
                completedCheckpoints: [],
                status: "Ativo",
                personType: "PJ",
                role: "",
                revenue: "",
                capag: "",
                metadata: item
              };
            }) as any);
          }
        } catch {}
      }

      // 1d. Leads criados localmente quando offline (comet_local_leads)
      let localLeads: Lead[] = [];
      if (typeof window !== "undefined") {
        try {
          const rawLoc = localStorage.getItem("comet_local_leads");
          if (rawLoc) {
            const parsed = JSON.parse(rawLoc);
            if (Array.isArray(parsed)) localLeads = parsed;
          }
        } catch {}
      }

      // 1e. Google Drive / Sheets Sync (capturados na planilha do Google Drive)
      let driveLeads: Lead[] = [];
      if (typeof window !== "undefined") {
        try {
          const driveConfig = getDriveConfig();
          const driveRoot: any = getLocalDatabaseRoot();
          if (driveRoot) {
            const rawDriveLeads = Array.isArray(driveRoot.leads) 
              ? driveRoot.leads 
              : (Array.isArray(driveRoot.data?.leads) ? driveRoot.data.leads : []);
            const rawDriveLpLeads = Array.isArray(driveRoot.leads_landing_pages) 
              ? driveRoot.leads_landing_pages 
              : (Array.isArray(driveRoot.data?.leads_landing_pages) ? driveRoot.data.leads_landing_pages : []);

            const mappedDriveLeads = [...rawDriveLeads, ...rawDriveLpLeads].map((item: any) => {
              const name = item.name || item.Nome || item["Nome"] || "Lead Capturado";
              const email = item.email || item.Email || item["Email"] || "";
              const whatsapp = item.whatsapp || item.WhatsApp || item["WhatsApp"] || "";
              const pageTitle = item.landingPageTitle || item["Landing Page (Título)"] || item.landingPage || item.landing_page || item.pageTitle || "Landing Page";
              const pageId = item.landingPageId || item["ID Landing Page"] || item.pageId || item.landing_page_id || "";
              const source = item.source || item.Origem || `LP: ${pageTitle}`;

              return {
                id: item.id || item["ID Lead"] || item["ID"] || `drive_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name,
                company: item.company || item.Empresa || `${name} (LP: ${pageTitle})`,
                email,
                whatsapp,
                value: Number(item.value || item.Valor) || 0,
                stage: item.stage || item["Fase / Etapa"] || "Leads",
                owner: item.owner || item.Responsável || "Inbound LP",
                source,
                classification: item.classification || "Lead",
                temperature: item.temperature || item.Temperatura || "Quente",
                type: "Inbound",
                strategy: "CRO Auto",
                decisionRole: "Decisor",
                minScore: "Aprovado",
                landingPage: pageTitle,
                landingPageId: pageId,
                tags: Array.isArray(item.tags) ? item.tags : (typeof item.Tags === "string" ? item.Tags.split(",") : ["inbound", "gdrive"]),
                score: Number(item.score || item.Score) || 85,
                sla: "ok",
                lastInteraction: item.lastInteraction || item["Última Interação"] || "Sincronizado via Google Sheets",
                createdAt: item.createdAt || item.created_at || item["Data Cadastro"] || item["Data / Hora"] || new Date().toISOString(),
                activities: [],
                completedCheckpoints: [],
                status: "Ativo",
                personType: "PJ",
                role: "",
                revenue: "",
                capag: "",
                metadata: item
              };
            });
            driveLeads = mappedDriveLeads as any;
          }

          // Se tiver URL configurada do WebApp, busca atualizações no Drive em background se desconectado
          if (driveConfig.webappUrl && driveConfig.webappUrl.startsWith("http")) {
            fetchFromGoogleDrive(driveConfig.webappUrl).catch(() => {});
          }
        } catch (err) {
          console.warn("Aviso ao processar leads do Google Drive/Sheets:", err);
        }
      }

      // Consolidação e desduplicação por Union-Find (e-mail, WhatsApp, nome/empresa e ID)
      const allRawLeads: Lead[] = [...dbLeads, ...queueLeads, ...apiLeads, ...localLeads, ...driveLeads];

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

        const emailIdx = new Map<string, number>();
        const phoneIdx = new Map<string, number>();
        const nameIdx = new Map<string, number>();
        const idIdx = new Map<string, number>();

        for (let i = 0; i < n; i++) {
          const l = rawList[i];
          if (!l) continue;

          const normEmail = l.email && l.email.trim() ? l.email.trim().toLowerCase() : "";
          const cleanPhone = l.whatsapp && l.whatsapp.trim() ? l.whatsapp.replace(/\D/g, "") : "";
          const cleanName = (l.name || "").trim().toLowerCase();
          const cleanComp = (l.company || "").replace(/\s*\(LP:.*?\)/gi, "").trim().toLowerCase();

          if (l.id) {
            if (idIdx.has(l.id)) unionNodes(i, idIdx.get(l.id)!);
            else idIdx.set(l.id, i);
          }

          if (normEmail) {
            if (emailIdx.has(normEmail)) unionNodes(i, emailIdx.get(normEmail)!);
            else emailIdx.set(normEmail, i);
          }

          if (cleanPhone && cleanPhone.length >= 8) {
            if (phoneIdx.has(cleanPhone)) unionNodes(i, phoneIdx.get(cleanPhone)!);
            else phoneIdx.set(cleanPhone, i);
          }

          const isGeneric = !cleanName || cleanName === "novo lead" || cleanName === "lead" || cleanName === "sem nome" || cleanName.length < 3;
          if (!isGeneric) {
            const nameKey = (cleanComp && cleanComp !== cleanName) ? `${cleanName}__${cleanComp}` : cleanName;
            if (nameIdx.has(nameKey)) unionNodes(i, nameIdx.get(nameKey)!);
            else nameIdx.set(nameKey, i);
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

          const sortedNames = group
            .map(x => (x.name || "").trim())
            .filter(n => n && n !== "Novo Lead" && n !== "Lead")
            .sort((a, b) => b.length - a.length);
          const bestName = sortedNames[0] || group[0].name || "Novo Lead";

          const bestComp = group.map(x => x.company).find(c => c && c.trim()) || "";
          const bestEmail = group.map(x => x.email).find(e => e && e.trim()) || "";
          const bestPhone = group.map(x => x.whatsapp).find(w => w && w.trim()) || "";

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

          const visitSum = group.reduce((sum, item) => sum + (Number(item.lpVisits) || 1), 0);
          const calculatedVisits = Math.max(group.length, visitSum);

          const isCust = group.some(x => x.isCustomer || x.classification === "Cliente" || x.stage === "Ganho" || x.stage === "Recebimento");
          const isRec = group.length > 1 || calculatedVisits > 1 || isCust || group.some(x => x.isRecurring || x.type === "Recorrente");

          const mergedTagsSet = new Set<string>();
          group.forEach(g => {
            if (Array.isArray(g.tags)) g.tags.forEach(t => t && mergedTagsSet.add(t));
          });
          if (isCust) mergedTagsSet.add("cliente");
          if (isRec) mergedTagsSet.add("recorrência");

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
            classification: isCust ? "Cliente" : "Lead",
            type: isRec ? "Recorrente" : "Novo",
            tags: Array.from(mergedTagsSet),
            activities: Array.from(activitiesMap.values()),
            createdAt: earliestDate,
            lastInteraction: `Recorrente / Capturas Unificadas (${group.length}x)`,
          };

          result.push(merged);
        }

        return result;
      }

      const consolidated = consolidateLeadsList(allRawLeads);

      // Sincroniza em segundo plano leads capturados via fila ou localmente com o Supabase
      if (consolidated.length > 0) {
        const sbEmails = new Set(dbLeads.map(l => l.email ? l.email.toLowerCase() : "").filter(Boolean));
        const unsyncedLeads = consolidated.filter(l => l.email && !sbEmails.has(l.email.toLowerCase()));
        if (unsyncedLeads.length > 0) {
          Promise.allSettled(
            unsyncedLeads.map(l => {
              const payload = mapLeadToDb(l);
              return supabase.from('leads').insert([payload]);
            })
          ).catch(() => {});
        }
      }

      return consolidated.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } 
  }).data);

  // 2. TASKS
  const tasks = asArray(useQuery({ 
    queryKey: ['tasks'], 
    queryFn: async () => { 
      let dbTasks: any[] = [];
      try {
        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }); 
        if (!error && data && data.length > 0) {
          dbTasks = data.map(mapTaskFromDb);
        }
      } catch {}

      if (dbTasks.length === 0) {
        try {
          const driveRoot: any = getLocalDatabaseRoot();
          const driveTasks = Array.isArray(driveRoot?.tasks) ? driveRoot.tasks : (Array.isArray(driveRoot?.data?.tasks) ? driveRoot.data.tasks : []);
          if (driveTasks.length > 0) {
            dbTasks = driveTasks.map(mapTaskFromDb);
          }
        } catch {}
      }

      if (dbTasks.length === 0 && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("comet_local_tasks");
          if (raw) dbTasks = JSON.parse(raw);
        } catch {}
      }

      return dbTasks;
    } 
  }).data);

  // 3. USERS / PROFILES
  const usersRaw = asArray(useQuery({ 
    queryKey: ['users'], 
    queryFn: async () => { 
      let sbUsers: any[] = [];
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('name'); 
        if (!error && data) sbUsers = data;
      } catch {}

      const localAuthUsers = getRegisteredUsers();
      if (sbUsers.length === 0 && localAuthUsers.length > 0) {
        sbUsers = localAuthUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          contact: u.contact || "",
          avatar_url: u.avatarUrl || "",
          status: u.status
        }));
      } else if (localAuthUsers.length > 0) {
        const sbEmailSet = new Set(sbUsers.map(u => u.email ? u.email.toLowerCase() : ""));
        const missingLocal = localAuthUsers.filter(u => u.email && !sbEmailSet.has(u.email.toLowerCase()));
        if (missingLocal.length > 0) {
          sbUsers = [...sbUsers, ...missingLocal.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            contact: u.contact || "",
            avatar_url: u.avatarUrl || "",
            status: u.status
          }))];
        }
      }

      return sbUsers; 
    } 
  }).data);
  
  const mappedUsers = usersRaw.map(mapUserFromDb);

  // Garantia Rígida: APENAS 1 ADMIN NO SISTEMA (o admin principal do ambiente)
  const sessionUser = getCurrentUser();
  const mainAdminEmail = (sessionUser?.email || "sistemascomet@gmail.com").toLowerCase();

  let mainAdminAssigned = false;
  const users = mappedUsers.map(u => {
    const isMainAdmin = u.email?.toLowerCase() === mainAdminEmail;
    if (isMainAdmin) {
      mainAdminAssigned = true;
      return u.role === "Admin Geral" ? u : { ...u, role: "Admin Geral" };
    }
    // Qualquer outro usuário que estivesse como Admin Geral passa para Gestor
    if (u.role === "Admin Geral" || u.role === "Admin") {
      return { ...u, role: "Gestor" };
    }
    return u;
  });

  if (!mainAdminAssigned && users.length > 0) {
    let firstAdminSeen = false;
    for (let i = 0; i < users.length; i++) {
      if (users[i].role === "Admin Geral") {
        if (!firstAdminSeen) {
          firstAdminSeen = true;
        } else {
          users[i] = { ...users[i], role: "Gestor" };
        }
      }
    }
  }

  // 4. PRODUCTS
  const products = asArray(useQuery({ 
    queryKey: ['products'], 
    queryFn: async () => { 
      let dbProducts: any[] = [];
      try {
        const { data, error } = await supabase.from('products').select('*').order('name'); 
        if (!error && data && data.length > 0) {
          dbProducts = data.map(mapProductFromDb);
        }
      } catch {}

      if (dbProducts.length === 0) {
        try {
          const driveRoot: any = getLocalDatabaseRoot();
          const driveProds = Array.isArray(driveRoot?.products) ? driveRoot.products : (Array.isArray(driveRoot?.data?.products) ? driveRoot.data.products : []);
          if (driveProds.length > 0) {
            dbProducts = driveProds.map(mapProductFromDb);
          }
        } catch {}
      }

      if (dbProducts.length === 0 && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("comet_local_products");
          if (raw) dbProducts = JSON.parse(raw);
        } catch {}
      }

      return dbProducts;
    } 
  }).data);

  // 5. OBJECTIONS
  const objections = asArray(useQuery({ 
    queryKey: ['objections'], 
    queryFn: async () => { 
      let dbObjections: any[] = [];
      try {
        const { data, error } = await supabase.from('objections').select('*'); 
        if (!error && data && data.length > 0) {
          dbObjections = data as Objection[];
        }
      } catch {}

      if (dbObjections.length === 0) {
        try {
          const driveRoot: any = getLocalDatabaseRoot();
          const driveObjs = Array.isArray(driveRoot?.objections) ? driveRoot.objections : (Array.isArray(driveRoot?.data?.objections) ? driveRoot.data.objections : []);
          if (driveObjs.length > 0) {
            dbObjections = driveObjs;
          }
        } catch {}
      }

      if (dbObjections.length === 0 && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("comet_local_objections");
          if (raw) dbObjections = JSON.parse(raw);
        } catch {}
      }

      return dbObjections;
    } 
  }).data);

  // 6. MARKETING INVESTMENTS
  const marketingInvestments = asArray(useQuery({ 
    queryKey: ['marketing_investments'], 
    queryFn: async () => { 
      let dbInvestments: any[] = [];
      try {
        const { data, error } = await supabase.from('marketing_investments').select('*').order('start_date', { ascending: false }); 
        if (!error && data && data.length > 0) {
          dbInvestments = data;
        }
      } catch {}

      if (dbInvestments.length === 0) {
        try {
          const driveRoot: any = getLocalDatabaseRoot();
          const driveInv = Array.isArray(driveRoot?.marketing_investments) ? driveRoot.marketing_investments : (Array.isArray(driveRoot?.data?.marketing_investments) ? driveRoot.data.marketing_investments : []);
          if (driveInv.length > 0) {
            dbInvestments = driveInv;
          }
        } catch {}
      }

      if (dbInvestments.length === 0 && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("comet_local_investments");
          if (raw) dbInvestments = JSON.parse(raw);
        } catch {}
      }

      return dbInvestments;
    } 
  }).data);

  // 7. LANDING PAGES
  const landingPages = asArray(useQuery({ 
    queryKey: ['landing_pages'], 
    queryFn: async () => { 
      const deletedIds = new Set(getDeletedLandingPageIds());
      const isDeleted = (lp: any) => {
        if (!lp) return true;
        if (lp.id && deletedIds.has(lp.id)) return true;
        if (lp.slug && deletedIds.has(lp.slug)) return true;
        return false;
      };

      let serverLps: LandingPage[] = [];
      try {
        const resp = await fetch('/api/landing-pages');
        if (resp.ok) {
          const json = await resp.json();
          if (json && Array.isArray(json.landingPages)) {
            serverLps = json.landingPages.filter(lp => !isDeleted(lp));
          }
        }
      } catch (err) {
        console.warn("Erro ao buscar landing pages da API do servidor:", err);
      }

      let dbLps: LandingPage[] = [];
      try {
        const { data, error } = await supabase.from('landing_pages').select('*').order('created_at', { ascending: false }); 
        if (!error && data) {
          dbLps = data.map(mapLPFromDb).filter(lp => !isDeleted(lp));
        }
      } catch (err) {
        console.warn("Erro ao carregar landing pages do Supabase, usando local:", err);
      }

      const localLps = getLocalLandingPages().filter(lp => !isDeleted(lp));

      // Mescla todas as fontes mantendo autonomia total por id ou slug exclusivo
      const getLpKey = (lp: LandingPage) => {
        if (lp.id) return `id:${lp.id}`;
        if (lp.slug) return `slug:${lp.slug.trim().toLowerCase()}`;
        return `anon:${Math.random().toString(36).substring(2, 6)}`;
      };

      const mergedMap = new Map<string, LandingPage>();

      for (const lp of [...localLps, ...serverLps, ...dbLps]) {
        if (!lp || isDeleted(lp)) continue;
        const key = getLpKey(lp);
        if (!mergedMap.has(key)) {
          mergedMap.set(key, lp);
        } else {
          const prev = mergedMap.get(key)!;
          const bestId = isUUID(prev.id) ? prev.id : (isUUID(lp.id) ? lp.id : (prev.id || lp.id));
          mergedMap.set(key, {
            ...prev,
            ...lp,
            id: bestId,
            visits: Math.max(Number(prev.visits) || 0, Number(lp.visits) || 0),
            leads: Math.max(Number(prev.leads) || 0, Number(lp.leads) || 0),
            conv: Math.max(Number(prev.conv) || 0, Number(lp.conv) || 0),
          });
        }
      }

      let result = Array.from(mergedMap.values()).filter(lp => !isDeleted(lp));

      // Background Sync / Self-Healing: Garante que toda LP salva no banco de dados Supabase ou cache local 
      // também esteja persistida fisicamente no arquivo landing_pages.json do servidor Express.
      // Isso resolve o problema de LPs não abrirem em outros navegadores ou dispositivos devido a RLS ou cache local.
      if (result.length > 0) {
        setTimeout(async () => {
          try {
            // 1. Sincronização Server-Side (Garante arquivos físicos no disco do Express)
            for (const lp of result) {
              const matchedServer = serverLps.find(s => s.id === lp.id || (lp.slug && s.slug === lp.slug));
              
              const lpTime = lp.updated_at ? new Date(lp.updated_at).getTime() : 0;
              const serverTime = matchedServer?.updated_at ? new Date(matchedServer.updated_at).getTime() : 0;

              // Se a página não existir no servidor local do Express ou se a versão do banco/local for mais recente
              if (!matchedServer || lpTime > serverTime + 5000) {
                console.info(`[Self-Healing] Sincronizando landing page "${lp.name || lp.title}" para persistência física no servidor...`);
                await fetch(`/api/landing-pages/${encodeURIComponent(lp.id)}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(lp),
                });
              }
            }

            // 2. Sincronização Client-Side -> Supabase (Garante persistência de LPs que só existem no localStorage)
            for (const localLp of localLps) {
              const matchedDb = dbLps.find(d => d.id === localLp.id || (localLp.slug && d.slug === localLp.slug));
              if (!matchedDb && isUUID(localLp.id)) {
                console.info(`[Self-Healing] Sincronizando LP local "${localLp.name || localLp.title}" com o Supabase...`);
                const dbPayload = mapLPToDb(localLp);
                dbPayload.id = localLp.id;
                await supabase.from('landing_pages').upsert(dbPayload);
              }
            }
          } catch (syncErr) {
            console.warn("Erro ao executar self-healing de landing pages:", syncErr);
          }
        }, 1500);
      }

      // Se todas as fontes estiverem vazias e nenhum ID foi deletado pelo usuário, semeia os dados padrões
      if (result.length === 0 && deletedIds.size === 0) {
        result = getInitialAILandingPages().filter(lp => !isDeleted(lp));
      }

      // Normaliza métricas de Visitas, Leads e Taxa de Conversão garantindo consistência
      result = result.map((lp) => {
        let crmLeadsCount = 0;
        try {
          const rawL = localStorage.getItem("comet_local_leads") || "[]";
          const rawQ1 = localStorage.getItem("comet_inbound_leads_queue") || "[]";
          const rawQ2 = localStorage.getItem("people_cro_leads_v1") || "[]";
          const driveRoot: any = getLocalDatabaseRoot();
          const driveLeadsList = Array.isArray(driveRoot?.leads) ? driveRoot.leads : (Array.isArray(driveRoot?.data?.leads) ? driveRoot.data.leads : []);
          const driveLpLeadsList = Array.isArray(driveRoot?.leads_landing_pages) ? driveRoot.leads_landing_pages : (Array.isArray(driveRoot?.data?.leads_landing_pages) ? driveRoot.data.leads_landing_pages : []);

          const allLeads = [
            ...JSON.parse(rawL),
            ...JSON.parse(rawQ1),
            ...JSON.parse(rawQ2),
            ...driveLeadsList,
            ...driveLpLeadsList
          ];

          const normLpName = (lp.name || lp.title || "").trim().toLowerCase();
          const normLpSlug = (lp.slug || "").trim().toLowerCase();
          const normLpId = (lp.id || "").trim().toLowerCase();

          crmLeadsCount = allLeads.filter((lead: any) => {
            const leadLp = String(lead.landing_page || lead.landingPage || lead["Landing Page (Título)"] || lead.landingPageTitle || lead.pageTitle || lead.metadata?.pageTitle || "").trim().toLowerCase();
            const leadIdStr = String(lead.landingPageId || lead["ID Landing Page"] || lead.pageId || lead.metadata?.pageId || "").trim().toLowerCase();
            const leadCompany = String(lead.company || lead.Empresa || "").trim().toLowerCase();
            const leadSource = String(lead.source || lead.Origem || "").trim().toLowerCase();

            if (normLpId && (leadIdStr === normLpId || leadLp === normLpId)) return true;
            if (normLpName && (leadLp === normLpName || leadCompany.includes(normLpName) || leadSource.includes(normLpName))) return true;
            if (normLpSlug && (leadLp === normLpSlug || leadSource.includes(normLpSlug))) return true;
            return false;
          }).length;
        } catch {}

        const effectiveLeads = Math.max(Number(lp.leads) || 0, Number(lp.leads_count) || 0, crmLeadsCount);
        // Cada lead obrigatoriamente representa ao menos 1 visita na página
        const recordedVisits = Math.max(Number(lp.visits) || 0, Number(lp.viewsCount) || 0);
        const effectiveVisits = Math.max(recordedVisits, effectiveLeads);
        
        // Fórmula de Conversão: (Leads / Visitas) * 100 com teto de 100%
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

      // Mantém o cache local sincronizado
      saveLocalLandingPages(result);

      // Sincroniza em segundo plano com o Supabase para persistência remota global
      if (result.length > 0) {
        const sbIds = new Set(dbLps.map(p => p.id));
        const unsynced = result.filter(p => !sbIds.has(p.id));
        if (unsynced.length > 0) {
          Promise.allSettled(
            unsynced.map(p => {
              const dbPayload = mapLPToDb(p);
              return supabase.from('landing_pages').upsert(dbPayload, { onConflict: 'id' });
            })
          ).catch(() => {});
        }
      }

      return result;
    } 
  }).data);

  // 8. PIPELINES
  const pipelinesRaw = asArray(useQuery({ 
    queryKey: ['pipelines'], 
    queryFn: async () => { 
      const { data, error } = await supabase
        .from('pipelines')
        .select('*, stages:pipeline_stages(*)')
        .order('created_at', { ascending: false }); 
      if (error) {
        console.warn("Pipelines query:", error.message);
        return [];
      }
      return data || []; 
    } 
  }).data);
  
  const pipelines = useMemo(() => {
    const fromDb = (pipelinesRaw || []).map(p => ({ 
      ...p, 
      stages: Array.isArray((p as any).stages) ? (p as any).stages.sort((a: any, b: any) => (a.position || 0) - (b.position || 0)) : [] 
    }));
    const filteredDb = fromDb.filter(db => !DEFAULT_PIPELINES.some(def => def.name === db.name));
    return [...DEFAULT_PIPELINES, ...filteredDb];
  }, [pipelinesRaw]);

  // 9. STAGE WORKFLOWS
  const stageWorkflows = asArray(useQuery({ 
    queryKey: ['stage_workflows'], 
    queryFn: async () => { 
      const { data, error } = await supabase.from('stage_workflows').select('*'); 
      if (error) {
        console.warn("Stage workflows query:", error.message);
        return [];
      }
      return (data || []) as StageWorkflow[]; 
    } 
  }).data);

  // 10. HANDOFF RULES
  const handoffRules = asArray(useQuery({ 
    queryKey: ['handoff_rules'], 
    queryFn: async () => { 
      const { data, error } = await supabase.from('handoff_rules').select('*'); 
      if (error) {
        return [];
      }
      return (data || []) as HandoffRule[]; 
    } 
  }).data);

  // 11. AUTOMATIONS
  const automations = asArray(useQuery({ 
    queryKey: ['automations'], 
    queryFn: async () => { 
      let dbAutomations: any[] = [];
      try {
        const { data, error } = await supabase.from('automations').select('*').order('created_at', { ascending: false }); 
        if (!error && data && data.length > 0) {
          dbAutomations = data.map(mapAutomationFromDb);
        }
      } catch {}

      if (dbAutomations.length === 0) {
        try {
          const driveRoot: any = getLocalDatabaseRoot();
          const driveAutos = Array.isArray(driveRoot?.automations) ? driveRoot.automations : (Array.isArray(driveRoot?.data?.automations) ? driveRoot.data.automations : []);
          if (driveAutos.length > 0) {
            dbAutomations = driveAutos.map(mapAutomationFromDb);
          }
        } catch {}
      }

      if (dbAutomations.length === 0 && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("comet_local_automations");
          if (raw) dbAutomations = JSON.parse(raw);
        } catch {}
      }

      return dbAutomations;
    } 
  }).data);

  // 12. SURVEYS & RESPONSES
  const surveys = asArray(useQuery({ 
    queryKey: ['surveys'], 
    queryFn: async () => { 
      const localSurveys = getLocalSurveys();
      let dbSurveys: Survey[] = [];
      try {
        const { data, error } = await supabase.from('surveys').select('*').order('created_at', { ascending: false }); 
        if (!error && data) {
          dbSurveys = data as Survey[];
        }
      } catch (err) {
        console.warn("Supabase surveys offline:", err);
      }

      const map = new Map<string, Survey>();
      for (const s of DEFAULT_SURVEYS) {
        map.set(s.id, { ...s, questions: s.questions ? JSON.parse(JSON.stringify(s.questions)) : [] });
      }
      for (const s of dbSurveys) {
        if (s.id) {
          const prev = map.get(s.id);
          map.set(s.id, { 
            ...(prev || {}), 
            ...s, 
            questions: (Array.isArray(s.questions) && s.questions.length > 0) ? s.questions : (prev?.questions || []) 
          });
        }
      }
      for (const s of localSurveys) {
        if (s.id) {
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
      const localResp = getLocalSurveyResponses();
      let dbResp: SurveyResponse[] = [];
      try {
        const { data, error } = await supabase.from('survey_responses').select('*').order('created_at', { ascending: false }); 
        if (!error && data) {
          dbResp = data as SurveyResponse[];
        }
      } catch (err) {
        console.warn("Supabase survey_responses offline:", err);
      }

      // Tenta buscar também da rota local da API Express
      try {
        const apiRes = await fetch("/api/surveys/responses");
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (Array.isArray(apiData)) {
            dbResp = [...dbResp, ...apiData];
          }
        }
      } catch {}

      const map = new Map<string, SurveyResponse>();
      for (const r of dbResp) {
        const key = r.id || `${r.survey_id || r.surveyId}_${r.lead_id || r.leadId}_${r.created_at || r.completedAt}`;
        map.set(key, r);
      }
      for (const r of localResp) {
        const key = r.id || `${r.survey_id || r.surveyId}_${r.lead_id || r.leadId}_${r.created_at || r.completedAt}`;
        if (!map.has(key)) {
          map.set(key, r);
        }
      }
      return Array.from(map.values()); 
    } 
  }).data);

  // 13. SETTINGS & CONFIGS
  const workingDays = asArray(useQuery({ 
    queryKey: ['working_days'], 
    queryFn: async () => { 
      const { data } = await supabase.from('working_days').select('*').maybeSingle(); 
      return (data?.days as number[]) || [1,2,3,4,5]; 
    } 
  }).data) as number[];

  const holidays = asArray(useQuery({ 
    queryKey: ['holidays'], 
    queryFn: async () => { 
      const { data } = await supabase.from('holidays').select('*').maybeSingle(); 
      return (data?.dates as string[]) || []; 
    } 
  }).data) as string[];

  const funnelTypes = asArray(useQuery({ 
    queryKey: ['funnel_types'], 
    queryFn: async () => { 
      const { data } = await supabase.from('funnel_types').select('*').maybeSingle(); 
      return (data?.types as string[]) || ["Voucher", "Ebook", "Webinar", "Diagnóstico"]; 
    } 
  }).data) as string[];

  // 14. PLAYBOOKS
  const playbooksDb = asArray(useQuery({ 
    queryKey: ['playbooks'], 
    queryFn: async () => { 
      let dbPbs: any[] = [];
      try {
        const { data, error } = await supabase.from('playbooks').select('*'); 
        if (!error && data && data.length > 0) {
          dbPbs = data.map(mapPlaybookFromDb);
        }
      } catch {}

      if (dbPbs.length === 0) {
        try {
          const driveRoot: any = getLocalDatabaseRoot();
          const drivePbs = Array.isArray(driveRoot?.playbooks) ? driveRoot.playbooks : (Array.isArray(driveRoot?.data?.playbooks) ? driveRoot.data.playbooks : []);
          if (drivePbs.length > 0) {
            dbPbs = drivePbs.map(mapPlaybookFromDb);
          }
        } catch {}
      }

      return dbPbs;
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
      const { data } = await supabase.from('role_permissions').select('*'); 
      return data || []; 
    } 
  }).data;

  const rolePermissions = useMemo(() => {
    const dbPerms = (rolePermissionsRaw || []).reduce((acc: any, r) => { 
      acc[r.role] = r.stages; 
      return acc; 
    }, {});
    return { ...DEFAULT_ROLE_PERMISSIONS, ...dbPerms };
  }, [rolePermissionsRaw]);

  // 15.1 ROLE MODULE PERMISSIONS (Configurações dinâmicas de módulos por cargo)
  const [localRoleModules, setLocalRoleModules] = useState<Record<string, string[]>>(() => {
    if (typeof window === "undefined") return DEFAULT_ROLE_MODULES;
    try {
      const saved = localStorage.getItem("comet_role_module_permissions");
      if (saved) return { ...DEFAULT_ROLE_MODULES, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_ROLE_MODULES;
  });

  const updateRoleModulePermissions = async (role: string, modules: string[]) => {
    const next = { ...localRoleModules, [role]: modules };
    setLocalRoleModules(next);
    try {
      localStorage.setItem("comet_role_module_permissions", JSON.stringify(next));
      await supabase.from('role_permissions').upsert({ role: `modules_${role}`, stages: modules });
    } catch (err) {
      console.warn("Aviso ao sincronizar permissões de módulos:", err);
    }
    toast.success(`Módulos liberados para ${role} atualizados!`);
  };

  const resetRoleModulePermissions = async (role: string) => {
    const next = { ...localRoleModules };
    if (DEFAULT_ROLE_MODULES[role]) {
      next[role] = [...DEFAULT_ROLE_MODULES[role]];
    } else {
      next[role] = SYSTEM_MODULES.map(m => m.id);
    }
    setLocalRoleModules(next);
    try {
      localStorage.setItem("comet_role_module_permissions", JSON.stringify(next));
    } catch {}
    toast.success(`Módulos de ${role} restaurados para a configuração padrão.`);
  };

  // 16. VISIBILITY & SINGLETONS
  const visibility = useQuery({ 
    queryKey: ['visibility_settings'], 
    queryFn: async () => { 
      const { data } = await supabase.from('visibility_settings').select('*').maybeSingle(); 
      return data || DEFAULT_VISIBILITY; 
    } 
  }).data ?? DEFAULT_VISIBILITY;
  
  const slaThresholds = useQuery({ 
    queryKey: ['sla_thresholds'], 
    queryFn: async () => { 
      const { data } = await supabase.from('sla_thresholds').select('*').maybeSingle(); 
      return data || { alerta: 24, critico: 48, vencido: 72 }; 
    } 
  }).data ?? { alerta: 24, critico: 48, vencido: 72 };

  const aiSettings = useQuery({ 
    queryKey: ['ai_settings'], 
    queryFn: async () => { 
      const { data } = await supabase.from('ai_settings').select('*').maybeSingle(); 
      return data; 
    } 
  }).data;

  const company = useQuery({ 
    queryKey: ['company_settings'], 
    queryFn: async () => { 
      const { data } = await supabase.from('company_settings').select('*').maybeSingle(); 
      return (data || { id: '00000000-0000-0000-0000-000000000000', name: "Minha Empresa" }) as CompanySettings; 
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

  // ==========================================
  // REALTIME SUBSCRIPTIONS (SUPABASE CHANNELS)
  // ==========================================
  useEffect(() => {
    // Usar identificador único por instância ou gerenciar canal com segurança
    const channelId = `salead-rt-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipelines' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_settings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['company_settings'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const localEmail = typeof window !== "undefined" ? localStorage.getItem("comet_user_email") : null;
  const targetEmail = session?.user?.email || localEmail;
  const currentUser = (targetEmail ? users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase()) : null) || users[0] || {
    id: "admin-tiago",
    name: "Tiago Rezeck",
    email: "tiagorezeck@hotmail.com",
    role: "Admin Geral",
    contact: "",
    avatar: "",
    status: "Ativo",
    goals: [],
    operationalGoals: []
  };

  return {
    initialized: !!company && !!currentUser,
    leads, 
    tasks, 
    users, 
    products, 
    landingPages, 
    company, 
    marketingInvestments, 
    pipelines, 
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
      activeProvider: aiSettings?.provider || 'openrouter',
      openRouterKey: aiSettings?.openrouter_key || '',
      googleKey: aiSettings?.google_key || '',
      modelId: aiSettings?.model_id || 'openai/gpt-4o-mini',
      modelName: aiSettings?.model_name || 'GPT-4o Mini'
    },

    // ====================
    // MUTATIONS COM DTOs
    // ====================

    // LEADS
    addLead: async (l: any) => { 
      const generatedId = isUUID(l.id) ? l.id : (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
      
      // Busca lead existente no cache para mesclagem automática
      let existingLeadMatch: any = null;
      try {
        const cachedLeads = (queryClient.getQueryData(['leads']) as any[]) || [];
        const cleanPhone = (l.whatsapp || "").replace(/\D/g, "");
        const normEmail = (l.email || "").trim().toLowerCase();
        const cleanName = (l.name || "").trim().toLowerCase();
        const cleanComp = (l.company || "").replace(/\s*\(LP:.*?\)/gi, "").trim().toLowerCase();

        existingLeadMatch = cachedLeads.find((x: any) => {
          if (!x) return false;
          if (x.id === l.id) return true;
          if (normEmail && x.email && x.email.trim().toLowerCase() === normEmail) return true;
          if (cleanPhone && cleanPhone.length >= 8 && x.whatsapp && x.whatsapp.replace(/\D/g, "") === cleanPhone) return true;
          if (cleanName && cleanName !== "novo lead" && cleanName !== "lead" && cleanName.length >= 3) {
            const xName = (x.name || "").trim().toLowerCase();
            const xComp = (x.company || "").replace(/\s*\(LP:.*?\)/gi, "").trim().toLowerCase();
            if (cleanComp && xComp && cleanComp === xComp && cleanName === xName) return true;
          }
          return false;
        });
      } catch {}

      // Se já existe um lead cadastrado, unifica no mesmo registro!
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
          const dbPayload = mapLeadToDb({ ...existingLeadMatch, ...updatedFields });
          if (Object.keys(dbPayload).length > 0) {
            await supabase.from('leads').update(dbPayload).eq('id', existingLeadMatch.id);
          }
          await fetch(`/api/leads/${encodeURIComponent(existingLeadMatch.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedFields),
          }).catch(() => {});
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

      const fullLead: Lead = {
        id: generatedId,
        name: l.name || "Novo Lead",
        company: l.company || "",
        email: l.email || "",
        whatsapp: l.whatsapp || "",
        value: Number(l.value) || 0,
        stage: l.stage || "Leads",
        owner: l.owner || "Sem dono",
        source: l.source || "Manual",
        classification: isTestLead ? "Lead Teste" : (isCustomer ? "Cliente" : (l.classification || "Lead")),
        temperature: l.temperature || "Frio",
        type: isRecurring ? "Recorrente" : (l.type || "Novo"),
        strategy: l.strategy || "Nenhuma",
        decisionRole: l.decisionRole || "Não Decisor",
        minScore: l.minScore || "Nenhum",
        landingPage: l.landingPage,
        productId: l.productId,
        pipelineId: l.pipelineId || "prospection",
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

      // 1. Salva diretamente no banco de dados (Supabase e backend Express)
      try {
        const dbPayload = mapLeadToDb(fullLead);
        await supabase.from('leads').insert([dbPayload]).select();
        await fetch("/api/submit-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: fullLead.landingPage || "crm-manual",
            pageTitle: fullLead.landingPage || "Cadastro Direto",
            name: fullLead.name,
            whatsapp: fullLead.whatsapp,
            email: fullLead.email,
            quizAnswers: fullLead.metadata?.answers || {},
            source: fullLead.source,
            isTest: fullLead.classification === "Lead Teste" || fullLead.tags.includes("leadtest"),
          }),
        }).catch(() => {});
      } catch (err) {
        console.warn("Supabase lead insert notice:", err);
      }

      invalidate('leads');
      return fullLead;
    },

    updateLead: async (id: string, u: any) => { 
      // 1. Atualização Otimista imediata no React Query cache
      queryClient.setQueryData(['leads'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((lead: any) => lead.id === id ? { ...lead, ...u } : lead);
      });

      // 2. Atualiza no backend server (Express / Banco de Dados)
      try {
        await fetch(`/api/leads/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(u)
        });
      } catch {}

      // 3. Atualiza diretamente no Supabase
      try {
        const dbPayload = mapLeadToDb(u);
        if (Object.keys(dbPayload).length > 0) {
          await supabase.from('leads').update(dbPayload).eq('id', id).select();
        }
      } catch (err) {
        console.warn("Supabase lead update pendente:", err);
      }

      invalidate('leads');
    },

    deleteLead: async (id: string) => { 
      let targetEmail = "";
      let targetPhone = "";

      // 1. Atualização Otimista no React Query cache e identificação do lead
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

      // 2. Remove no backend Express se presente
      try {
        await fetch(`/api/leads/${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch {}

      // 3. Remove no Google Drive e Google Sheets
      try {
        await deleteLeadFromDrive(id, targetEmail, targetPhone);
        const driveCfg = getDriveConfig();
        if (driveCfg.webappUrl) {
          const rootDb = getLocalDatabaseRoot<any>() || {};
          rootDb.leads = (rootDb.leads || []).filter((l: any) => {
            if (l.id === id) return false;
            if (targetEmail && l.email && l.email.trim().toLowerCase() === targetEmail) return false;
            if (targetPhone && targetPhone.length >= 8 && l.whatsapp && l.whatsapp.replace(/\D/g, "") === targetPhone) return false;
            return true;
          });
          saveLocalDatabaseRoot(rootDb);
          pushToGoogleDrive(driveCfg.webappUrl, rootDb).catch(() => {});
        }
      } catch (driveErr) {
        console.warn("Aviso ao remover lead no Google Drive:", driveErr);
      }

      // 4. Remove no Supabase por id, email ou whatsapp se aplicável
      try {
        await supabase.from('leads').delete().eq('id', id);
        if (targetEmail) {
          await supabase.from('leads').delete().eq('email', targetEmail);
        }
      } catch (err) {
        console.warn("Supabase lead delete notice:", err);
      }

      invalidate('leads');
    },

    bulkDeleteLeads: async (ids: string[]) => { 
      // 1. Atualização do cache
      queryClient.setQueryData(['leads'], (old: any) => {
        if (!Array.isArray(old)) return old;
        const idSet = new Set(ids);
        return old.filter((l: any) => !idSet.has(l.id));
      });

      // 2. Deleta no Google Drive & Sheets
      try {
        await deleteLeadFromDrive(ids);
        const driveCfg = getDriveConfig();
        if (driveCfg.webappUrl) {
          const rootDb = getLocalDatabaseRoot<any>() || {};
          const idSet = new Set(ids);
          rootDb.leads = (rootDb.leads || []).filter((l: any) => !idSet.has(l.id));
          saveLocalDatabaseRoot(rootDb);
          pushToGoogleDrive(driveCfg.webappUrl, rootDb).catch(() => {});
        }
      } catch (driveErr) {
        console.warn("Aviso ao deletar leads em massa no Google Drive:", driveErr);
      }

      // 3. Deleta no Supabase se aplicável
      try {
        const { error } = await supabase.from('leads').delete().in('id', ids);
        if (error) {
          console.warn("Supabase bulk delete aviso:", error);
        }
      } catch {}

      toast.success("Leads excluídos com sucesso.");
      invalidate('leads');
    },

    bulkUpdateLeadStatus: async (ids: string[], status: string) => { 
      const { error } = await supabase.from('leads').update({ classification: status }).in('id', ids);
      if (error) {
        console.error("Erro em bulk status:", error);
        toast.error(`Falha ao atualizar status: ${error.message}`);
        throw error;
      }
      invalidate('leads');
    },

    // TASKS
    addTask: async (t: any) => { 
      const dbPayload = mapTaskToDb(t);
      const { data, error } = await supabase.from('tasks').insert([dbPayload]).select();
      if (error) {
        console.error("Erro ao criar tarefa:", error);
        toast.error(`Falha ao criar tarefa: ${error.message}`);
        throw error;
      }
      invalidate('tasks');
      return data;
    },

    updateTask: async (id: string, t: any) => { 
      const dbPayload = mapTaskToDb(t);
      const { data, error } = await supabase.from('tasks').update(dbPayload).eq('id', id).select();
      if (error) {
        console.error("Erro ao atualizar tarefa:", error);
        toast.error(`Falha ao atualizar tarefa: ${error.message}`);
        throw error;
      }
      invalidate('tasks');
      return data;
    },

    deleteTask: async (id: string) => { 
      try {
        await deleteTaskFromDrive(id);
      } catch {}
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) {
          console.warn("Supabase deleteTask notice:", error);
        }
      } catch {}
      invalidate('tasks');
    },

    toggleTask: async (id: string) => { 
      const task = tasks.find(t => t.id === id); 
      if (task) { 
        const nextDone = !task.done;
        const { error } = await supabase.from('tasks').update({ 
          done: nextDone,
          completed_at: nextDone ? new Date().toISOString() : null
        }).eq('id', id);
        if (error) {
          toast.error("Erro ao alterar tarefa.");
          return;
        }
        invalidate('tasks');
      }
    },

    // PROFILES / USERS
    addUser: async (u: any) => {
      const id = u.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}`);
      
      if (u.customPermissionsEnabled !== undefined || u.allowedModules !== undefined) {
        try {
          const map = getStoredUserCustomPerms();
          map[id] = {
            enabled: Boolean(u.customPermissionsEnabled),
            modules: Array.isArray(u.allowedModules) ? u.allowedModules : []
          };
          if (u.email) {
            map[u.email.toLowerCase()] = map[id];
          }
          localStorage.setItem("comet_user_module_permissions", JSON.stringify(map));
        } catch {}
      }

      const dbPayload = {
        id,
        ...mapUserToDb(u)
      };

      try {
        await supabase.from('profiles').insert([dbPayload]);
      } catch (e) {
        console.warn("Aviso ao cadastrar profiles no Supabase:", e);
      }
      invalidate('users');
      return { id, ...u };
    },

    updateUser: async (id: string, u: any) => { 
      if (u.customPermissionsEnabled !== undefined || u.allowedModules !== undefined) {
        try {
          const map = getStoredUserCustomPerms();
          map[id] = {
            enabled: Boolean(u.customPermissionsEnabled),
            modules: Array.isArray(u.allowedModules) ? u.allowedModules : []
          };
          if (u.email) {
            map[u.email.toLowerCase()] = map[id];
          }
          localStorage.setItem("comet_user_module_permissions", JSON.stringify(map));
        } catch {}
      }

      const dbPayload = mapUserToDb(u);
      try {
        const { error } = await supabase.from('profiles').update(dbPayload).eq('id', id);
        if (error) {
          console.warn("Aviso ao atualizar perfil no Supabase (usando armazenamento local):", error);
        }
      } catch (err) {
        console.warn("Erro ao atualizar profiles no Supabase:", err);
      }
      invalidate('users');
    },

    deleteUser: async (id: string) => { 
      const sessionUser = getCurrentUser();
      const targetUser = users.find(u => u.id === id);
      const activeAdminEmail = (sessionUser?.email || "sistemascomet@gmail.com").toLowerCase();

      if (targetUser && (targetUser.email?.toLowerCase() === activeAdminEmail || (targetUser.role === "Admin Geral" && (targetUser.id === currentUser?.id || targetUser.email?.toLowerCase() === currentUser?.email?.toLowerCase())))) {
        toast.error("Você não pode excluir a sua própria conta de Administrador Geral!");
        throw new Error("Você não pode excluir a sua própria conta de Administrador Geral!");
      }

      try {
        await supabase.from('profiles').delete().eq('id', id);
      } catch (err: any) {
        console.warn("Aviso ao deletar profile no Supabase:", err);
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
      const dbPayload = mapProductToDb(p);
      const { data, error } = await supabase.from('products').insert([dbPayload]).select();
      if (error) {
        console.error("Erro ao adicionar produto:", error);
        toast.error(`Falha ao cadastrar produto: ${error.message}`);
        throw error;
      }
      invalidate('products');
      return data;
    },

    updateProduct: async (id: string, p: any) => { 
      const dbPayload = mapProductToDb(p);
      const { data, error } = await supabase.from('products').update(dbPayload).eq('id', id).select();
      if (error) {
        console.error("Erro ao atualizar produto:", error);
        toast.error(`Falha ao atualizar produto: ${error.message}`);
        throw error;
      }
      invalidate('products');
      return data;
    },

    deleteProduct: async (id: string) => { 
      try {
        await deleteProductFromDrive(id);
      } catch {}
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
          console.warn("Supabase deleteProduct notice:", error);
        }
      } catch {}
      invalidate('products');
    },

    // PLAYBOOKS
    addPlaybook: async (p: any) => { 
      const dbPayload = mapPlaybookToDb(p);
      const { data, error } = await supabase.from('playbooks').insert([dbPayload]).select();
      if (error) {
        console.error("Erro ao adicionar playbook:", error);
        toast.error(`Falha ao criar playbook: ${error.message}`);
        throw error;
      }
      invalidate('playbooks');
      return data;
    },

    updatePlaybook: async (id: string, p: any) => { 
      const dbPayload = mapPlaybookToDb(p);
      const { data, error } = await supabase.from('playbooks').update(dbPayload).eq('id', id).select();
      if (error) {
        console.error("Erro ao atualizar playbook:", error);
        toast.error(`Falha ao atualizar playbook: ${error.message}`);
        throw error;
      }
      invalidate('playbooks');
      return data;
    },

    deletePlaybook: async (id: string) => { 
      const { error } = await supabase.from('playbooks').delete().eq('id', id);
      if (error) {
        console.error("Erro ao apagar playbook:", error);
        toast.error(`Falha ao excluir playbook: ${error.message}`);
        throw error;
      }
      invalidate('playbooks');
    },

    // OBJECTIONS
    addObjection: async (o: any) => { 
      const { data, error } = await supabase.from('objections').insert([{
        title: o.title,
        category: o.category,
        response: o.response
      }]).select();
      if (error) {
        toast.error(`Falha ao criar objeção: ${error.message}`);
        throw error;
      }
      invalidate('objections');
      return data;
    },

    updateObjection: async (id: string, o: any) => { 
      const { data, error } = await supabase.from('objections').update({
        title: o.title,
        category: o.category,
        response: o.response
      }).eq('id', id).select();
      if (error) {
        toast.error(`Falha ao atualizar objeção: ${error.message}`);
        throw error;
      }
      invalidate('objections');
      return data;
    },

    deleteObjection: async (id: string) => { 
      const { error } = await supabase.from('objections').delete().eq('id', id);
      if (error) {
        toast.error(`Falha ao remover objeção: ${error.message}`);
        throw error;
      }
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
      const item: LandingPage = {
        name: lp.name || lp.title || "Nova Landing Page",
        title: lp.title || lp.name || "Nova Landing Page",
        template: lp.template || "COMET",
        status: lp.status || "Ativa",
        visits: lp.visits !== undefined ? Number(lp.visits) : 0,
        leads: (lp.leads ?? lp.leads_count) !== undefined ? Number(lp.leads ?? lp.leads_count) : 0,
        conv: lp.conv !== undefined ? Number(lp.conv) : 0,
        type: lp.type || "COMET CRO",
        created_at: lp.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...lp,
        id: generatedId,
      };

      // Ensure the generated UUID is set on the item
      item.id = generatedId;
      item.originalId = generatedId;
      if (item.config) {
        item.config.client_id = generatedId;
        item.config.id = generatedId;
        item.config.originalId = generatedId;
      }

      // Se o ID ou slug estava na lista de deletados, remove da lista
      if (item.id) removeDeletedLandingPageId(item.id);
      if (item.slug) removeDeletedLandingPageId(item.slug);

      // 1. Salva imediatamente no localStorage para garantir que NUNCA seja perdida
      try {
        const localList = getLocalLandingPages();
        const nextLocals = [item, ...localList.filter(p => p.id !== item.id && p.slug !== item.slug)];
        saveLocalLandingPages(nextLocals);
        if (typeof window !== "undefined") {
          localStorage.setItem("active_preview_page", JSON.stringify(item));
        }
      } catch (lsErr) {
        console.warn("Aviso ao salvar localmente:", lsErr);
      }

      // 2. Atualização imediata no cache do React Query
      queryClient.setQueryData(['landing_pages'], (old: LandingPage[] | undefined) => {
        const list = Array.isArray(old) ? old : [];
        return [item, ...list.filter(p => p.id !== item.id && p.slug !== item.slug)];
      });

      // 3. Salva no banco de dados persistente do servidor e no preview store
      try {
        await Promise.allSettled([
          fetch('/api/landing-pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          }),
          fetch('/api/pages/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          }),
        ]);
      } catch (netErr) {
        console.warn("Erro ao chamar API de landing pages:", netErr);
      }

      // 4. Sincroniza com Supabase se disponível
      try {
        const dbPayload = mapLPToDb(item);
        const { data, error } = await supabase.from('landing_pages').insert([dbPayload]).select();
        if (!error && data && data[0]) {
          const syncedItem = mapLPFromDb(data[0]);
          item.id = syncedItem.id;
        } else if (error) {
          console.info("Landing Page criada e salva com sucesso no armazenamento seguro (Supabase notice):", error.message);
        }
      } catch (err: any) {
        console.warn("Sincronização com Supabase:", err);
      }

      invalidate('landing_pages');
      return item;
    },

    updateLandingPage: async (id: string, lp: any) => { 
      removeDeletedLandingPageId(id);
      if (lp.slug) removeDeletedLandingPageId(lp.slug);
      
      const currentCache = queryClient.getQueryData<LandingPage[]>(['landing_pages']) || [];
      const localList = getLocalLandingPages();
      const existing = currentCache.find(p => p.id === id || (p as any).originalId === id || p.slug === id) ||
                       localList.find(p => p.id === id || (p as any).originalId === id || p.slug === id) ||
                       getInitialAILandingPages().find(p => p.id === id || p.slug === id);
      const targetId = existing?.id || id;
      
      const prevStatus = existing?.status;
      const nextStatus = lp.status;
      const isExitingTestMode = prevStatus === "Teste" && (nextStatus === "Ativa" || nextStatus === "Pausada");

      let updatedItem: LandingPage = {
        ...(existing || {}),
        ...lp,
        id: targetId,
        updated_at: new Date().toISOString()
      };

      // Se saiu do status "Teste" para "Ativa" ou "Pausada", zera contadores e apaga leads fake de teste
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

        // 1. Limpa leads do cache local do React Query
        queryClient.setQueryData(['leads'], (old: Lead[] | undefined) => {
          if (!Array.isArray(old)) return [];
          return old.filter(l => !isLeadFromThisLP(l));
        });

        // 2. Limpa leads do localStorage
        if (typeof window !== "undefined") {
          try {
            const cleanLeadStorage = (key: string) => {
              const raw = localStorage.getItem(key);
              if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                  localStorage.setItem(key, JSON.stringify(list.filter(l => !isLeadFromThisLP(l))));
                }
              }
            };
            cleanLeadStorage("comet_local_leads");
            cleanLeadStorage("comet_inbound_leads_queue");
            cleanLeadStorage("people_cro_leads_v1");
          } catch (cleanLsErr) {
            console.warn("Aviso ao limpar leads de teste do localStorage:", cleanLsErr);
          }
        }

        // 3. Remove leads do Supabase e do servidor Express associados a esta LP
        try {
          if (targetTitle) {
            await supabase.from('leads').delete().or(`landing_page.eq.${targetTitle},source.ilike.%${targetTitle}%`);
          }
          await fetch(`/api/landing-pages/${encodeURIComponent(targetId)}/clear-test-leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pageTitle: targetTitle, pageSlug: targetSlug })
          }).catch(() => {});
        } catch (supErr) {
          console.warn("Aviso ao deletar leads de teste do Supabase:", supErr);
        }

        // 4. Limpa e zera contadores nas Planilhas e JSON do Google Drive
        try {
          clearLpTestDataInDrive(targetId, targetTitle);
        } catch (gasErr) {
          console.warn("Aviso ao limpar dados de teste no Google Drive:", gasErr);
        }

        toast.info(`Fim do modo Teste: contadores zerados e dados fake da Landing Page excluídos com sucesso!`);
        invalidate('leads');
      }

      // 1. Atualiza no localStorage
      try {
        const nextLocals = localList.map(p => (p.id === targetId || (p as any).originalId === targetId) ? updatedItem : p);
        if (!nextLocals.some(p => p.id === targetId)) nextLocals.unshift(updatedItem);
        saveLocalLandingPages(nextLocals);
        if (typeof window !== "undefined") {
          localStorage.setItem("active_preview_page", JSON.stringify(updatedItem));
        }
      } catch (lsErr) {
        console.warn("Aviso ao atualizar localmente:", lsErr);
      }

      // 2. Atualiza no cache do React Query
      queryClient.setQueryData(['landing_pages'], (old: LandingPage[] | undefined) => {
        const list = Array.isArray(old) ? old : [];
        const found = list.some(p => p.id === targetId || (p as any).originalId === targetId);
        if (!found) {
          return [updatedItem, ...list];
        }
        return list.map(p => (p.id === targetId || (p as any).originalId === targetId) ? updatedItem : p);
      });

      // 3. Atualiza no servidor API e preview store
      try {
        await Promise.allSettled([
          fetch(`/api/landing-pages/${encodeURIComponent(targetId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedItem),
          }),
          fetch('/api/pages/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedItem),
          }),
        ]);
      } catch {}

      // 4. Sincroniza com Supabase de forma resiliente usando upsert (insere se não existir, atualiza se existir)
      try {
        const dbPayload = mapLPToDb(updatedItem);
        if (isUUID(targetId)) {
          dbPayload.id = targetId;
          const { error } = await supabase.from('landing_pages').upsert(dbPayload);
          if (error) {
            console.warn("Erro ao fazer upsert no Supabase, tentando update direto:", error.message);
            const { data } = await supabase.from('landing_pages').select('id').eq('id', targetId).maybeSingle();
            if (data) {
              await supabase.from('landing_pages').update(dbPayload).eq('id', targetId);
            } else {
              await supabase.from('landing_pages').insert([dbPayload]);
            }
          }
        } else {
          // Busca por client_id, slug ou name caso não seja UUID
          const { data: existingRow } = await supabase
            .from('landing_pages')
            .select('id')
            .or(`config->>client_id.eq.${targetId},config->>slug.eq.${updatedItem.slug || targetId},name.eq.${updatedItem.name || targetId}`)
            .limit(1)
            .maybeSingle();

          if (existingRow?.id) {
            await supabase.from('landing_pages').update(dbPayload).eq('id', existingRow.id);
          } else {
            const { data: inserted } = await supabase.from('landing_pages').insert([dbPayload]).select().maybeSingle();
            if (inserted?.id) {
              updatedItem.id = inserted.id;
            }
          }
        }
      } catch (err: any) {
        console.warn("Supabase update/upsert notice:", err);
      }

      invalidate('landing_pages');
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

      if (typeof window !== "undefined") {
        try {
          const activePrev = localStorage.getItem("active_preview_page");
          if (activePrev) {
            const parsed = JSON.parse(activePrev);
            if (isTarget(parsed)) {
              localStorage.removeItem("active_preview_page");
            }
          }
        } catch {}
      }

      // 1. Remove do localStorage
      let updatedLocalList: LandingPage[] = [];
      try {
        const localList = getLocalLandingPages();
        updatedLocalList = localList.filter(p => !isTarget(p));
        saveLocalLandingPages(updatedLocalList);
      } catch {}

      // 2. Atualiza cache do React Query
      queryClient.setQueryData(['landing_pages'], (old: LandingPage[] | undefined) => {
        const list = Array.isArray(old) ? old : [];
        return list.filter(p => !isTarget(p));
      });

      // 3. Remove da API do servidor Express
      try {
        fetch(`/api/landing-pages/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
        if (target?.id && target.id !== id) {
          fetch(`/api/landing-pages/${encodeURIComponent(target.id)}`, { method: "DELETE" }).catch(() => {});
        }
      } catch {}

      // 4. Remove do Supabase por ID isolado se aplicável
      try {
        if (isUUID(id)) {
          await supabase.from('landing_pages').delete().eq('id', id);
        }
        if (target && target.id && isUUID(target.id) && target.id !== id) {
          await supabase.from('landing_pages').delete().eq('id', target.id);
        }
      } catch (err: any) {
        console.warn("Supabase delete notice:", err);
      }

      // 5. Exclui permanentemente no Google Drive & Google Sheets
      try {
        const targetTitle = target?.title || target?.name || "";
        const targetSlug = target?.slug || "";
        await deleteLandingPageFromDrive(Array.from(idsToMark), targetSlug, targetTitle);

        const driveCfg = getDriveConfig();
        if (driveCfg.webappUrl) {
          const rootDb = getLocalDatabaseRoot<any>() || {};
          rootDb.landingPages = (rootDb.landingPages || []).filter((p: any) => !isTarget(p));
          saveLocalDatabaseRoot(rootDb);
          pushToGoogleDrive(driveCfg.webappUrl, rootDb).catch(() => {});
        }
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
    },

    deleteMultipleLandingPages: async (ids: string[]) => {
      if (!Array.isArray(ids) || ids.length === 0) return;
      for (const id of ids) {
        addDeletedLandingPageId(id);
      }

      const idsSet = new Set(ids);
      // 1. Remove do localStorage
      try {
        const localList = getLocalLandingPages();
        saveLocalLandingPages(localList.filter(p => !idsSet.has(p.id) && !idsSet.has(p.slug || "")));
      } catch {}

      // 2. Atualiza cache
      queryClient.setQueryData(['landing_pages'], (old: LandingPage[] | undefined) => {
        const list = Array.isArray(old) ? old : [];
        return list.filter(p => !idsSet.has(p.id) && !idsSet.has((p as any).originalId || "") && !idsSet.has(p.slug || ""));
      });

      // 3. Remove do servidor API
      try {
        fetch('/api/landing-pages/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        }).catch(() => {});
      } catch {}

      // 4. Remove do Supabase
      try {
        const validUuids = ids.filter(isUUID);
        if (validUuids.length > 0) {
          await supabase.from('landing_pages').delete().in('id', validUuids);
        }
      } catch (err: any) {
        console.warn("Supabase bulk delete notice:", err);
      }

      // 5. Remove no Google Drive e Google Sheets
      try {
        await deleteLandingPageFromDrive(ids);
        const driveCfg = getDriveConfig();
        if (driveCfg.webappUrl) {
          const rootDb = getLocalDatabaseRoot<any>() || {};
          rootDb.landingPages = (rootDb.landingPages || []).filter((p: any) => !idsSet.has(p.id) && !idsSet.has(p.slug || ""));
          saveLocalDatabaseRoot(rootDb);
          pushToGoogleDrive(driveCfg.webappUrl, rootDb).catch(() => {});
        }
      } catch (driveErr) {
        console.warn("Aviso ao remover LPs em massa no Google Drive:", driveErr);
      }

      toast.success("Landing Pages selecionadas foram excluídas.");
      invalidate('landing_pages');
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

      // 1. Atualiza no localStorage
      try {
        saveLocalLandingPages([toKeep]);
      } catch {}

      // 2. Atualiza cache
      queryClient.setQueryData(['landing_pages'], [toKeep]);

      // 3. Limpa servidor
      try {
        fetch('/api/landing-pages/clean-keep-one', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keepId: toKeep.id }),
        }).catch(() => {});
      } catch {}

      // 4. Limpa no Supabase
      try {
        const uuidsToDelete = toDeleteIds.filter(isUUID);
        if (uuidsToDelete.length > 0) {
          await supabase.from('landing_pages').delete().in('id', uuidsToDelete);
        }
      } catch (err) {
        console.warn("Supabase clean database notice:", err);
      }

      // 5. Limpa no Google Drive e Google Sheets
      try {
        await cleanDatabaseKeepOneInDrive(toKeep.id);
        const driveCfg = getDriveConfig();
        if (driveCfg.webappUrl) {
          const rootDb = getLocalDatabaseRoot<any>() || {};
          rootDb.landingPages = [toKeep];
          saveLocalDatabaseRoot(rootDb);
          pushToGoogleDrive(driveCfg.webappUrl, rootDb).catch(() => {});
        }
      } catch (driveErr) {
        console.warn("Aviso ao limpar banco no Google Drive:", driveErr);
      }

      toast.success("Banco de dados limpo! Apenas 1 Landing Page foi mantida.");
      invalidate('landing_pages');
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

      const current = getLocalSurveys();
      const updated = [newSurvey, ...current.filter(x => x.id !== newSurvey.id)];
      saveLocalSurveys(updated);

      try {
        const { data } = await supabase.from('surveys').insert([{
          id: isUUID(newSurvey.id) ? newSurvey.id : undefined,
          name: newSurvey.name,
          type: newSurvey.type,
          status: newSurvey.status,
          questions: newSurvey.questions,
          settings: newSurvey.settings,
          reward: newSurvey.reward,
          template: newSurvey.template
        }]).select();
        if (data && data[0] && data[0].id) {
          newSurvey.id = data[0].id;
        }
      } catch (err) {
        console.warn("Supabase survey add pendente, salvo localmente:", err);
      }

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

      const updatedList = [updatedSurvey, ...current.filter(x => x.id !== id)];
      saveLocalSurveys(updatedList);

      try {
        await supabase.from('surveys').update({
          name: updatedSurvey.name,
          type: updatedSurvey.type,
          status: updatedSurvey.status,
          questions: updatedSurvey.questions,
          settings: updatedSurvey.settings,
          reward: updatedSurvey.reward,
          template: updatedSurvey.template
        }).eq('id', id);
      } catch (err) {
        console.warn("Supabase survey update pendente, salvo localmente:", err);
      }

      invalidate('surveys');
      return updatedSurvey;
    },

    deleteSurvey: async (id: string) => { 
      const current = getLocalSurveys();
      const targetSurvey = current.find(x => x.id === id);
      saveLocalSurveys(current.filter(x => x.id !== id));
      try {
        await deleteSurveyFromDrive(id, targetSurvey?.name);
      } catch {}
      try {
        await supabase.from('surveys').delete().eq('id', id);
      } catch (err) {
        console.warn("Supabase survey delete pendente:", err);
      }
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

      const localList = getLocalSurveyResponses();
      saveLocalSurveyResponses([newResponse, ...localList]);

      try {
        await supabase.from('survey_responses').insert([{ 
          id: isUUID(responseId) ? responseId : undefined,
          survey_id: surveyId, 
          lead_id: isUUID(leadIdVal) ? leadIdVal : null, 
          landing_page_id: isUUID(lpIdVal) ? lpIdVal : null,
          answers, 
          duration_seconds: duration 
        }]);
      } catch (err) {
        console.warn("Supabase survey_response sync notice:", err);
      }
      invalidate('survey_responses');
      return newResponse;
    },

    // PIPELINES
    addPipeline: async (name: string) => { 
      const { data, error } = await supabase.from('pipelines').insert([{ name }]).select();
      if (error) {
        toast.error(`Falha ao criar pipeline: ${error.message}`);
        throw error;
      }
      invalidate('pipelines');
      return data;
    },

    updatePipeline: async (id: string, u: any) => { 
      const { error } = await supabase.from('pipelines').update(u).eq('id', id);
      if (error) {
        toast.error(`Falha ao atualizar pipeline: ${error.message}`);
        throw error;
      }
      invalidate('pipelines');
    },

    deletePipeline: async (id: string) => { 
      const { error } = await supabase.from('pipelines').delete().eq('id', id);
      if (error) {
        toast.error(`Falha ao apagar pipeline: ${error.message}`);
        throw error;
      }
      invalidate('pipelines');
    },

    // PERMISSIONS & CONFIGS
    updateRolePermissions: async (role: string, stages: string[]) => { 
      const { error } = await supabase.from('role_permissions').upsert({ role, stages });
      if (error) {
        toast.error(`Falha ao salvar permissões: ${error.message}`);
        throw error;
      }
      invalidate('role_permissions');
    },
    
    setWorkingDays: async (days: number[]) => { 
      const { error } = await supabase.from('working_days').upsert({ id: '00000000-0000-0000-0000-000000000000', days });
      if (error) {
        toast.error(`Falha ao salvar dias úteis: ${error.message}`);
        throw error;
      }
      invalidate('working_days');
    },

    setHolidays: async (dates: string[]) => { 
      const { error } = await supabase.from('holidays').upsert({ id: '00000000-0000-0000-0000-000000000000', dates });
      if (error) {
        toast.error(`Falha ao salvar feriados: ${error.message}`);
        throw error;
      }
      invalidate('holidays');
    },

    setVisibility: async (v: VisibilitySettings) => { 
      const { error } = await supabase.from('visibility_settings').upsert({ id: '00000000-0000-0000-0000-000000000000', ...v });
      if (error) {
        toast.error(`Falha ao atualizar visibilidade: ${error.message}`);
        throw error;
      }
      invalidate('visibility_settings');
    },

    setSlaThresholds: async (t: any) => { 
      const { error } = await supabase.from('sla_thresholds').upsert({ id: '00000000-0000-0000-0000-000000000000', ...t });
      if (error) {
        toast.error(`Falha ao atualizar SLA: ${error.message}`);
        throw error;
      }
      invalidate('sla_thresholds');
    },

    // MARKETING INVESTMENTS
    addMarketingInvestment: async (inv: any) => { 
      const payload = {
        amount: Number(inv.amount) || 0,
        channel: inv.channel,
        start_date: inv.start_date || inv.startDate,
        end_date: inv.end_date || inv.endDate,
        landing_page_id: isUUID(inv.landing_page_id || inv.landingPageId) ? (inv.landing_page_id || inv.landingPageId) : null,
        description: inv.description || ""
      };
      const { data, error } = await supabase.from('marketing_investments').insert([payload]).select();
      if (error) {
        toast.error(`Falha ao lançar investimento: ${error.message}`);
        throw error;
      }
      toast.success("Investimento lançado com sucesso!");
      invalidate('marketing_investments');
      return data;
    },

    deleteMarketingInvestment: async (id: string) => { 
      const { error } = await supabase.from('marketing_investments').delete().eq('id', id);
      if (error) {
        toast.error(`Falha ao remover investimento: ${error.message}`);
        throw error;
      }
      toast.success("Investimento removido!");
      invalidate('marketing_investments');
    },

    // AUTOMATIONS
    addAutomation: async (a: any) => { 
      const dbPayload = mapAutomationToDb(a);
      const { data, error } = await supabase.from('automations').insert([dbPayload]).select();
      if (error) {
        toast.error(`Falha ao criar automação: ${error.message}`);
        throw error;
      }
      invalidate('automations');
      return data;
    },

    updateAutomation: async (id: number, a: any) => { 
      const dbPayload = mapAutomationToDb(a);
      const { data, error } = await supabase.from('automations').update(dbPayload).eq('id', id).select();
      if (error) {
        toast.error(`Falha ao atualizar automação: ${error.message}`);
        throw error;
      }
      invalidate('automations');
      return data;
    },

    deleteAutomation: async (id: number) => { 
      const { error } = await supabase.from('automations').delete().eq('id', id);
      if (error) {
        toast.error(`Falha ao apagar automação: ${error.message}`);
        throw error;
      }
      invalidate('automations');
    },

    toggleAutomation: async (id: number) => { 
      const aut = automations.find(a => a.id === id); 
      if (aut) { 
        const { error } = await supabase.from('automations').update({ active: !aut.active }).eq('id', id);
        if (error) {
          toast.error("Erro ao alterar status da automação.");
          return;
        }
        invalidate('automations');
      }
    },

    // HANDOFF RULES
    addHandoffRule: async (r: any) => { 
      const { data, error } = await supabase.from('handoff_rules').insert([r]).select();
      if (error) {
        toast.error(`Falha ao criar regra de handoff: ${error.message}`);
        throw error;
      }
      invalidate('handoff_rules');
      return data;
    },

    updateHandoffRule: async (id: string, r: any) => { 
      const { data, error } = await supabase.from('handoff_rules').update(r).eq('id', id).select();
      if (error) {
        toast.error(`Falha ao atualizar regra de handoff: ${error.message}`);
        throw error;
      }
      invalidate('handoff_rules');
      return data;
    },

    deleteHandoffRule: async (id: string) => { 
      const { error } = await supabase.from('handoff_rules').delete().eq('id', id);
      if (error) {
        toast.error(`Falha ao apagar regra de handoff: ${error.message}`);
        throw error;
      }
      invalidate('handoff_rules');
    },

    // STAGE WORKFLOWS
    updateWorkflow: async (pipelineId: string, stageName: string, updates: Partial<StageWorkflow>) => { 
      const { error } = await supabase.from('stage_workflows').upsert({ 
        stage_id: isUUID(pipelineId) ? pipelineId : undefined, 
        rule_text: updates.rules?.map(r => r.text).join('; ') || '',
        ...updates 
      });
      if (error) {
        console.warn("Erro ao atualizar workflow:", error.message);
      }
      invalidate('stage_workflows');
    },

    // COMPANY SETTINGS
    setCompany: async (c: any) => { 
      const { error } = await supabase.from('company_settings').upsert({ 
        id: '00000000-0000-0000-0000-000000000000', 
        name: c.name,
        sector: c.sector,
        purpose: c.purpose,
        logo: c.logo,
        contact: c.contact,
        email: c.email,
        address: c.address,
        website: c.website,
        updated_at: new Date().toISOString()
      });
      if (error) {
        toast.error(`Falha ao salvar dados da empresa: ${error.message}`);
        throw error;
      }
      toast.success("Dados da empresa atualizados!");
      invalidate('company_settings');
    },

    setDateFilter: (f: DateFilter) => { 
      queryClient.setQueryData(['dateFilter'], f); 
      invalidate('leads'); 
    },

    setAIConfig: async (config: any) => { 
      const { error } = await supabase.from('ai_config').upsert({ 
        id: '00000000-0000-0000-0000-000000000000', 
        openrouter_key: config.openRouterKey, 
        model_id: config.modelId, 
        model_name: config.modelName 
      });
      if (error) {
        toast.error(`Falha ao configurar IA: ${error.message}`);
        throw error;
      }
      invalidate('ai_settings'); 
      toast.success("Configuração de IA salva com sucesso!");
    },

    // ==========================================
    // EXPORTAÇÃO & IMPORTAÇÃO REAL
    // ==========================================

    exportData: () => { 
      try {
        const fullBackup = {
          version: "2.0.0",
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
        if (mode === 'replace') {
          // Limpeza inicial antes de reinserir
          const wipeList = ['tasks', 'leads', 'products', 'playbooks', 'objections', 'landing_pages', 'surveys', 'automations', 'marketing_investments'];
          for (const tbl of wipeList) {
            await supabase.from(tbl).delete().not('id', 'is', null);
          }
        }

        // 1. Leads
        if (Array.isArray(newData.leads) && newData.leads.length > 0) {
          const leadRows = newData.leads.map((l: any) => mapLeadToDb(l));
          await supabase.from('leads').upsert(leadRows);
        }

        // 2. Tasks
        if (Array.isArray(newData.tasks) && newData.tasks.length > 0) {
          const taskRows = newData.tasks.map((t: any) => mapTaskToDb(t));
          await supabase.from('tasks').upsert(taskRows);
        }

        // 3. Products
        if (Array.isArray(newData.products) && newData.products.length > 0) {
          const prodRows = newData.products.map((p: any) => mapProductToDb(p));
          await supabase.from('products').upsert(prodRows);
        }

        // 4. Playbooks
        if (Array.isArray(newData.playbooks) && newData.playbooks.length > 0) {
          const pbRows = newData.playbooks.map((pb: any) => mapPlaybookToDb(pb));
          await supabase.from('playbooks').upsert(pbRows);
        }

        // 5. Objections
        if (Array.isArray(newData.objections) && newData.objections.length > 0) {
          await supabase.from('objections').upsert(newData.objections);
        }

        // 6. Landing Pages
        if (Array.isArray(newData.landingPages) && newData.landingPages.length > 0) {
          const lpRows = newData.landingPages.map((lp: any) => mapLPToDb(lp));
          await supabase.from('landing_pages').upsert(lpRows);
        }

        // 7. Automations
        if (Array.isArray(newData.automations) && newData.automations.length > 0) {
          const autoRows = newData.automations.map((a: any) => mapAutomationToDb(a));
          await supabase.from('automations').upsert(autoRows);
        }

        // 8. Configurações gerais
        if (newData.visibility) {
          await supabase.from('visibility_settings').upsert({ id: '00000000-0000-0000-0000-000000000000', ...newData.visibility });
        }
        if (newData.slaThresholds) {
          await supabase.from('sla_thresholds').upsert({ id: '00000000-0000-0000-0000-000000000000', ...newData.slaThresholds });
        }
        if (newData.company) {
          await supabase.from('company_settings').upsert({ id: '00000000-0000-0000-0000-000000000000', ...newData.company });
        }

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

        switch (key) {
          case 'leads': {
            const dbPayloads = items.map(mapLeadToDb);
            await supabase.from('leads').insert(dbPayloads);
            break;
          }
          case 'tasks': {
            const dbPayloads = items.map(mapTaskToDb);
            await supabase.from('tasks').insert(dbPayloads);
            break;
          }
          case 'products': {
            const dbPayloads = items.map(mapProductToDb);
            await supabase.from('products').insert(dbPayloads);
            break;
          }
          case 'objections': {
            await supabase.from('objections').insert(items);
            break;
          }
          case 'landingPages': {
            const dbPayloads = items.map(mapLPToDb);
            await supabase.from('landing_pages').insert(dbPayloads);
            break;
          }
          case 'playbooks': {
            const dbPayloads = items.map(mapPlaybookToDb);
            await supabase.from('playbooks').insert(dbPayloads);
            break;
          }
          case 'automations': {
            const dbPayloads = items.map(mapAutomationToDb);
            await supabase.from('automations').insert(dbPayloads);
            break;
          }
          default: {
            console.warn(`Módulo ${key} não possui handler específico.`);
          }
        }

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
      const { error } = await supabase.from('funnel_types').upsert({ id: '00000000-0000-0000-0000-000000000000', types: next }); 
      if (error) toast.error("Erro ao salvar tipo de funil.");
      invalidate('funnel_types'); 
    },

    deleteFunnelType: async (type: string) => { 
      const next = funnelTypes.filter(t => t !== type); 
      const { error } = await supabase.from('funnel_types').upsert({ id: '00000000-0000-0000-0000-000000000000', types: next }); 
      if (error) toast.error("Erro ao remover tipo de funil.");
      invalidate('funnel_types'); 
    },

    resetData: async () => {
      const activeSessionUser = getCurrentUser();
      const userRole = currentUser?.role || activeSessionUser?.role;
      if (userRole !== "Admin Geral") {
        toast.error("Acesso Negado: Apenas o Administrador Geral pode resetar o banco de dados!");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const toastId = toast.loading("Criando checkpoint e executando limpeza do banco...");

      // 0. CRIAR CHECKPOINT COMPLETO ANTES DA LIMPEZA
      try {
        const fullBackup = {
          version: "2.0.0",
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

        // Salva histórico de checkpoints locais com recuperação garantida
        saveSystemCheckpoint({
          id: `cp_${Date.now()}`,
          name: checkpointName,
          timestamp: now.toISOString(),
          leadsCount: leads.length,
          data: fullBackup
        });

        // Se o Google Drive estiver configurado, envia também o snapshot para a nuvem
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

      // 1. Limpeza de tabelas transacionais e customizadas (A BASE DE LEADS NUNCA É APAGADA NO RESET)
      const tablesToWipe = [
        'tasks', 'marketing_investments', 
        'survey_responses', 'handoff_rules', 'stage_workflows', 'automations',
        'objections', 'playbooks', 'landing_pages', 'surveys', 'products', 'pipelines'
      ];

      for (const table of tablesToWipe) {
        await supabase.from(table).delete().not('id', 'is', null);
      }

      // 2. Limpeza de Membros (Mantém apenas o usuário ativo)
      await supabase.from('profiles').delete().neq('id', user.id);

      // 3. Limpeza de caches e LPs locais para abrir ambiente zerado e limpo
      try {
        localStorage.removeItem(LOCAL_LP_STORAGE_KEY);
        localStorage.removeItem(DELETED_LP_STORAGE_KEY);
        localStorage.removeItem(LP_SEED_INITIALIZED_KEY);
      } catch {}

      // 4. RECRIAR PADRÕES (SEED)
      
      // 4a. Inserir Pipelines Padrão
      for (const pipe of DEFAULT_PIPELINES) {
        await supabase.from('pipelines').insert([{
          name: pipe.name,
          color: pipe.color,
          is_default: pipe.id === "prospection"
        }]);
      }

      // 4b. Inserir Playbooks Padrão
      for (const pb of DEFAULT_PLAYBOOKS) {
        await supabase.from('playbooks').insert([mapPlaybookToDb(pb)]);
      }

      // 4c. Automações Padrão
      await supabase.from('automations').insert([
        {
          name: "SLA: Alerta de Inatividade (24h)",
          category: "SLA",
          trigger_event: "lead.sla_breach",
          priority: "alta",
          active: true,
          action_type: "notify",
          action_config: { message: "Atenção! Um lead entrou em zona de alerta por falta de interação." }
        },
        {
          name: "Tarefa: Primeiro Contato Inbound",
          category: "Vendas",
          trigger_event: "lead.created",
          priority: "urgente",
          active: true,
          action_type: "create_task",
          action_config: { title: "Realizar primeiro contato via WhatsApp (Lead Novo)" }
        }
      ]);

      // 5. Resetar cache e avisar usuário
      queryClient.invalidateQueries();
      toast.dismiss(toastId);
      toast.success("Banco de dados resetado com sucesso! Checkpoint criado e Base de Leads 100% preservada.");
    }
  };
}
