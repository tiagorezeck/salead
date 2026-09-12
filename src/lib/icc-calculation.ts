"use client";

import { type User, type ExtendedLead, type Task } from "@/hooks/use-data";

export interface ICCResult {
  score: number;
  label: "Crítico" | "Regular" | "Bom" | "Excelente" | "Elite";
  color: string;
  breakdown: {
    resultado: number;
    eficiencia: number;
    execucao: number;
  };
}

export function calculateICC(user: User, leads: ExtendedLead[], tasks: Task[]): ICCResult {
  const userLeads = leads.filter(l => l.owner === user.name);
  const wonLeads = userLeads.filter(l => l.stage === "Ganho" || l.stage === "Recebimento");
  const userTasks = tasks.filter(t => t.owners.includes(user.name));

  // Se não houver dados, o score é zero
  if (userLeads.length === 0 && userTasks.length === 0) {
    return {
      score: 0,
      label: "Crítico",
      color: "text-destructive",
      breakdown: { resultado: 0, eficiencia: 0, execucao: 0 }
    };
  }

  // 1. RESULTADO (Peso 40%) - Foco em Meta e Receita
  const revenue = wonLeads.reduce((acc, curr) => acc + curr.value, 0);
  const meta = user.goals?.find(g => g.type === 'money')?.target || 50000;
  const resScore = meta > 0 ? Math.min(100, (revenue / meta) * 100) : 0;

  // 2. EFICIÊNCIA (Peso 30%) - Conversão e SLA
  const convRate = userLeads.length > 0 ? (wonLeads.length / userLeads.length) : 0;
  const slaHealth = userLeads.length > 0 
    ? 1 - (userLeads.filter(l => l.sla === 'critico' || l.sla === 'vencido').length / userLeads.length) 
    : 0; // Mudado de 1 para 0 se não houver leads
  const effScore = ((Math.min(1, convRate / 0.25) * 60) + (slaHealth * 40));

  // 3. EXECUÇÃO (Peso 30%) - Atividades e Pontualidade
  const completedTasks = userTasks.filter(t => t.done).length;
  const execScore = userTasks.length > 0 ? (completedTasks / userTasks.length) * 100 : 0; // Mudado de 80 para 0 se não houver tarefas

  const total = (resScore * 0.4) + (effScore * 0.3) + (execScore * 0.3);

  let label: ICCResult['label'] = "Regular";
  let color = "text-warning";

  if (total >= 90) { label = "Elite"; color = "text-primary"; }
  else if (total >= 80) { label = "Excelente"; color = "text-success"; }
  else if (total >= 60) { label = "Bom"; color = "text-info"; }
  else if (total < 40) { label = "Crítico"; color = "text-destructive"; }

  return {
    score: Math.round(total),
    label,
    color,
    breakdown: {
      resultado: Math.round(resScore),
      eficiencia: Math.round(effScore),
      execucao: Math.round(execScore)
    }
  };
}