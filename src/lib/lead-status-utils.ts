"use client";

import { differenceInDays } from "date-fns";
import { type Lead, type Product } from "@/data/mock";
import { 
  Crown, Sparkles, Ban, Trash2, User, Clock, Calendar, AlertCircle, 
  Check, X, CheckCircle2, XCircle, FlaskConical, type LucideIcon 
} from "lucide-react";

export type LeadStatusCode = 
  | 'novo'                      // Visto Verde - Novo / Lead (Primeiro contato)
  | 'recorrente_sem_compra'     // Visto Amarelo - Recorrente que Nunca comprou
  | 'desqualificado'           // Visto Vermelho - Desqualificado
  | 'cliente_recorrente'        // Visto Azul - Cliente Recorrente
  | 'excluido'                  // X Vermelho - Excluído
  | 'lead_teste';               // 🧪 Modo Teste - Lead cadastrado via LP de teste

export interface LeadStatusCodeInfo {
  code: LeadStatusCode;
  label: string;
  badgeLabel: string;
  shortLabel: string;
  visualCodeName: string; // "Visto Verde", "Visto Amarelo", etc.
  visualCodeEmoji: string; // "🟢", "🟡", "🔴", "🔵", "❌", "🧪"
  icon: LucideIcon;
  iconShape: 'check' | 'x';
  textClass: string;
  bgClass: string;
  borderClass: string;
  dotColor: string;
  ringClass: string;
  checkboxAccentClass: string;
  description: string;
}

export const LEAD_STATUS_CONFIG: Record<LeadStatusCode, LeadStatusCodeInfo> = {
  novo: {
    code: 'novo',
    label: 'Lead (Primeiro contato)',
    badgeLabel: 'Lead (1º Contato)',
    shortLabel: 'Novo',
    visualCodeName: 'Visto Verde',
    visualCodeEmoji: '🟢',
    icon: Check,
    iconShape: 'check',
    textClass: 'text-emerald-500 dark:text-emerald-400',
    bgClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    ringClass: 'ring-emerald-500/30',
    checkboxAccentClass: 'text-emerald-500 border-emerald-500/40 bg-emerald-500/10',
    description: 'Novo lead em primeiro contato na base'
  },
  lead_teste: {
    code: 'lead_teste',
    label: 'Lead Teste (LP em Teste)',
    badgeLabel: '🧪 Modo Teste',
    shortLabel: 'Teste',
    visualCodeName: 'Modo Teste',
    visualCodeEmoji: '🧪',
    icon: FlaskConical,
    iconShape: 'check',
    textClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    ringClass: 'ring-amber-500/30',
    checkboxAccentClass: 'text-amber-500 border-amber-500/40 bg-amber-500/10',
    description: 'Lead capturado em Landing Page de Teste (será excluído automaticamente ao ativar a LP)'
  },
  recorrente_sem_compra: {
    code: 'recorrente_sem_compra',
    label: 'Recorrente (Nunca comprou)',
    badgeLabel: 'Recorrente (Nunca comprou)',
    shortLabel: 'Recorrente (Sem compra)',
    visualCodeName: 'Visto Amarelo',
    visualCodeEmoji: '🟡',
    icon: Check,
    iconShape: 'check',
    textClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    ringClass: 'ring-amber-500/30',
    checkboxAccentClass: 'text-amber-500 border-amber-500/40 bg-amber-500/10',
    description: 'Lead com 2+ visitas/interações que ainda não realizou compra'
  },
  cliente_recorrente: {
    code: 'cliente_recorrente',
    label: 'Cliente Recorrente',
    badgeLabel: 'Cliente Recorrente',
    shortLabel: 'Cliente',
    visualCodeName: 'Visto Azul',
    visualCodeEmoji: '🔵',
    icon: Check,
    iconShape: 'check',
    textClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-500/15',
    borderClass: 'border-blue-500/30',
    dotColor: 'bg-blue-500',
    ringClass: 'ring-blue-500/30',
    checkboxAccentClass: 'text-blue-500 border-blue-500/40 bg-blue-500/10',
    description: 'Cliente que já comprou anteriormente e possui histórico de recorrência'
  },
  desqualificado: {
    code: 'desqualificado',
    label: 'Desqualificado',
    badgeLabel: 'Desqualificado',
    shortLabel: 'Desqualificado',
    visualCodeName: 'Visto Vermelho',
    visualCodeEmoji: '🔴',
    icon: Check,
    iconShape: 'check',
    textClass: 'text-rose-500 dark:text-rose-400',
    bgClass: 'bg-rose-500/15',
    borderClass: 'border-rose-500/30',
    dotColor: 'bg-rose-500',
    ringClass: 'ring-rose-500/30',
    checkboxAccentClass: 'text-rose-500 border-rose-500/40 bg-rose-500/10',
    description: 'Lead desqualificado no fluxo comercial'
  },
  excluido: {
    code: 'excluido',
    label: 'Excluído',
    badgeLabel: 'Excluído',
    shortLabel: 'Excluído',
    visualCodeName: 'X Vermelho',
    visualCodeEmoji: '❌',
    icon: X,
    iconShape: 'x',
    textClass: 'text-red-500 dark:text-red-400',
    bgClass: 'bg-red-500/15',
    borderClass: 'border-red-500/30',
    dotColor: 'bg-red-500',
    ringClass: 'ring-red-500/30',
    checkboxAccentClass: 'text-red-500 border-red-500/40 bg-red-500/10',
    description: 'Registro excluído / arquivado'
  }
};

export function getLeadStatusCode(lead: Lead | any): LeadStatusCode {
  if (!lead) return 'novo';
  
  if (lead.status === 'Excluido') {
    return 'excluido';
  }

  if (lead.status === 'Desqualificado') {
    return 'desqualificado';
  }

  const isTest = Boolean(
    lead.isTest === true ||
    lead.classification === 'Lead Teste' ||
    lead.metadata?.isTest === true ||
    (Array.isArray(lead.tags) && (lead.tags.includes('leadtest') || lead.tags.includes('modo-teste') || lead.tags.includes('teste'))) ||
    lead.source?.toLowerCase().includes('[modo-teste]') ||
    lead.source?.toLowerCase().includes('[teste]')
  );

  if (isTest) {
    return 'lead_teste';
  }

  const isCustomer = Boolean(
    lead.isCustomer || 
    lead.classification === 'Cliente' || 
    lead.stage === 'Ganho' || 
    lead.stage === 'Recebimento' ||
    (Number(lead.purchaseCount || 0) > 0)
  );

  if (isCustomer) {
    return 'cliente_recorrente';
  }

  const isRecurringNoPurchase = Boolean(
    lead.isRecurring || 
    lead.type === 'Recorrente' || 
    (Number(lead.lpVisits || 0) > 1)
  );

  if (isRecurringNoPurchase) {
    return 'recorrente_sem_compra';
  }

  return 'novo';
}

export function getLeadStatusCodeInfo(lead: Lead | any): LeadStatusCodeInfo {
  const code = getLeadStatusCode(lead);
  return LEAD_STATUS_CONFIG[code];
}

export interface LeadMomentInfo {
  label: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  variant: 'client' | 'new' | 'disqualified' | 'excluded' | 'active';
}

export type AgeCategory = 'new' | 'growing' | 'old';

export function getLeadMoment(lead: Lead, products: Product[]): LeadMomentInfo {
  if (lead.status === 'Excluido') {
    return {
      label: "Excluído",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      icon: Trash2,
      variant: 'excluded'
    };
  }

  if (lead.status === 'Desqualificado') {
    return {
      label: "Desqualificado",
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      icon: Ban,
      variant: 'disqualified'
    };
  }

  const isWon = lead.stage === "Ganho" || lead.stage === "Recebimento";
  const linkedProduct = products.find(p => p.id === lead.productId);
  const isRecurring = linkedProduct?.recurring || false;

  if (isWon || isRecurring) {
    return {
      label: isRecurring ? "Cliente Recorrente" : "Cliente",
      color: "text-success",
      bgColor: "bg-success/10",
      icon: Crown,
      variant: 'client'
    };
  }

  const daysOld = differenceInDays(new Date(), new Date(lead.createdAt));
  if (daysOld <= 3) {
    return {
      label: "Novo Registro",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      icon: Sparkles,
      variant: 'new'
    };
  }

  return {
    label: "Ativo",
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: User,
    variant: 'active'
  };
}

export function getLeadAgeInfo(createdAt: string): { label: string; icon: LucideIcon; color: string; category: AgeCategory } {
  const days = differenceInDays(new Date(), new Date(createdAt));

  if (days <= 3) {
    return { label: "Recente (1-3d)", icon: Sparkles, color: "text-blue-500", category: 'new' };
  }
  if (days <= 7) {
    return { label: "Em curso (4-7d)", icon: Clock, color: "text-warning", category: 'growing' };
  }
  return { label: "Antigo (8d+)", icon: AlertCircle, color: "text-destructive", category: 'old' };
}