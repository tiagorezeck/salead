"use client";

import { type AutomationEvent, type AutomationPriority, type AutomationCategory } from "./automation-types";

export interface AutomationRecipe {
  id: string;
  name: string;
  category: AutomationCategory;
  badge: string;
  description: string;
  triggerEvent: AutomationEvent;
  priority: AutomationPriority;
  actionType: "create_task" | "move_lead" | "update_score" | "notify" | "add_note";
  actionConfig: Record<string, any>;
  triggerLabel: string;
  actionLabel: string;
  iconName: string;
  recommended?: boolean;
}

export const AUTOMATION_RECIPES: AutomationRecipe[] = [
  {
    id: "recipe-hot-lead-route",
    name: "Roteamento Imediato de Lead Quente",
    category: "Vendas",
    badge: "Alta Conversão",
    recommended: true,
    description: "Quando uma pesquisa de qualificação ou formulário indicar um lead 'Quente', move automaticamente para a etapa de Oportunidade e cria tarefa de contato em até 15 minutos.",
    triggerEvent: "survey.responded",
    priority: "urgente",
    actionType: "create_task",
    actionConfig: {
      title: "🔥 Ligar Imediato: Lead Quente Qualificado pelo Diagnóstico",
      points: 30
    },
    triggerLabel: "Pesquisa Respondida (Lead Quente)",
    actionLabel: "Criar Tarefa Urgente de Contato",
    iconName: "Flame"
  },
  {
    id: "recipe-min-qualification",
    name: "Qualificação MIN Automática (+25 Pts)",
    category: "Marketing",
    badge: "Score Inteligente",
    recommended: true,
    description: "Quando o lead concluir a pesquisa MIN (Momento, Interesse, Necessidade), soma +25 pontos ao score do lead e adiciona tags de maturidade.",
    triggerEvent: "survey.responded",
    priority: "alta",
    actionType: "update_score",
    actionConfig: {
      points: 25,
      text: "Diagnóstico MIN Concluído com Sucesso"
    },
    triggerLabel: "Conclusão de Diagnóstico MIN",
    actionLabel: "Somar +25 pontos no Score e atualizar tags",
    iconName: "Zap"
  },
  {
    id: "recipe-sla-rescue",
    name: "Alerta de SLA Estourado (Sem Primeiro Contato)",
    category: "SLA",
    badge: "Proteção de Leads",
    recommended: true,
    description: "Se um novo lead aguardar mais que o limite do SLA sem atendimento do consultor, dispara alerta prioritário no painel do gestor.",
    triggerEvent: "lead.sla_breach",
    priority: "urgente",
    actionType: "notify",
    actionConfig: {
      message: "🚨 ATENÇÃO: Lead atingiu tempo crítico de espera sem contato!"
    },
    triggerLabel: "Tempo de SLA Excedido",
    actionLabel: "Disparar Alerta Prioritário para Gestor",
    iconName: "AlertTriangle"
  },
  {
    id: "recipe-followup-inactive",
    name: "Resgate de Lead Inativo (Follow-up 24h)",
    category: "Operacional",
    badge: "Follow-up",
    description: "Cria automaticamente uma tarefa de retorno pelo WhatsApp quando um lead ficar mais de 24 horas parado na mesma etapa do funil.",
    triggerEvent: "lead.stage_changed",
    priority: "media",
    actionType: "create_task",
    actionConfig: {
      title: "📞 Follow-up WhatsApp: Retomar contato com lead parado",
      points: 5
    },
    triggerLabel: "Mudança de Etapa no Funil",
    actionLabel: "Criar Tarefa de Follow-up WhatsApp",
    iconName: "Clock"
  },
  {
    id: "recipe-round-robin",
    name: "Distribuição Round-Robin de Oportunidades",
    category: "Vendas",
    badge: "Equipe",
    description: "Distribui automaticamente novas oportunidades comerciais entre os vendedores da equipe de forma justa e equilibrada.",
    triggerEvent: "lead.created",
    priority: "media",
    actionType: "add_note",
    actionConfig: {
      text: "Lead distribuído automaticamente para a fila de atendimento da equipe comercial."
    },
    triggerLabel: "Novo Lead Criado no CRM",
    actionLabel: "Registrar atribuição de atendimento",
    iconName: "Users"
  },
  {
    id: "recipe-post-sale-csat",
    name: "Disparo de Satisfação Pós-Venda (CSAT/NPS)",
    category: "Marketing",
    badge: "Fidelização",
    description: "Quando uma tarefa de entrega ou onboarding for concluída, registra o envio da pesquisa de satisfação e qualidade.",
    triggerEvent: "task.completed",
    priority: "baixa",
    actionType: "add_note",
    actionConfig: {
      text: "Pesquisa de Satisfação & NPS liberada para envio ao cliente."
    },
    triggerLabel: "Tarefa de Entrega Concluída",
    actionLabel: "Registrar disparo de Pesquisa CSAT",
    iconName: "Star"
  }
];
