"use client";

import { type Lead, type SLA } from "@/data/mock";
import { type Task, type User } from "@/hooks/use-data";

export type AutomationCategory = 'Vendas' | 'Marketing' | 'SLA' | 'Operacional';
export type AutomationEvent = 
  | 'lead.created' 
  | 'lead.stage_changed' 
  | 'lead.owner_changed' 
  | 'lead.score_gained' 
  | 'lead.sla_breach'
  | 'task.created'
  | 'task.completed'
  | 'survey.responded';

export type AutomationPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface AutomationLog {
  id: string;
  automationId: number;
  timestamp: string;
  targetId: string; // Lead ID ou Task ID
  targetName: string;
  action: string;
  result: 'sucesso' | 'falha';
  durationMs: number;
  error?: string;
}

export interface AutomationStats {
  activeCount: number;
  executedToday: number;
  avgDurationMs: number;
  failureRate: number;
  lastExecution?: string;
}

// Interface interna do Motor que estende o mock sem alterá-lo
export interface AutomationExtended {
  id: number;
  name: string;
  category: AutomationCategory;
  triggerEvent: AutomationEvent;
  priority: AutomationPriority;
  active: boolean;
  conditions?: (data: any) => boolean;
  actionType: 'create_task' | 'move_lead' | 'update_score' | 'notify' | 'add_note';
  actionConfig: any;
}