import { type User, type Task, type ExtendedLead } from "@/hooks/use-data";

export interface ICPBreakdown {
  total: number;
  resultado: {
    total: number;
    meta: number;
    receita: number;
    ticket: number;
  };
  eficiencia: {
    total: number;
    conversao: number;
    aproveitamento: number;
    receitaLead: number;
    sla: number;
  };
  execucao: {
    total: number;
    atividades: number;
    followup: number;
    crm: number;
    pesquisas: number;
    processo: number;
  };
}

export function calculateICP(
  user: User, 
  leads: ExtendedLead[], 
  tasks: Task[], 
  teamMaxRevenue: number,
  teamAvgTicket: number
): ICPBreakdown {
  const userLeads = leads.filter(l => l.owner === user.name);
  const wonLeads = userLeads.filter(l => l.stage === "Ganho" || l.stage === "Recebimento");
  const userTasks = tasks.filter(t => t.owners.includes(user.name));
  
  const revenue = wonLeads.reduce((acc, curr) => acc + curr.value, 0);
  const meta = user.goals?.find(g => g.type === 'money')?.target || 100000;
  
  // 1. RESULTADO (Max 400)
  const scoreMeta = meta > 0 ? Math.min(1, revenue / meta) * 200 : 0;
  const scoreReceita = (revenue / Math.max(teamMaxRevenue, 1)) * 120;
  
  const avgTicket = wonLeads.length > 0 ? revenue / wonLeads.length : 0;
  const scoreTicket = Math.min(1, avgTicket / Math.max(teamAvgTicket, 1)) * 80;

  // 2. EFICIÊNCIA (Max 400)
  const convRate = userLeads.length > 0 ? wonLeads.length / userLeads.length : 0;
  const scoreConversao = Math.min(1, convRate / 0.3) * 150; 
  
  const aproveitamento = userLeads.length > 0 ? (userLeads.length - userLeads.filter(l => l.stage === "Perdido").length) / userLeads.length : 0;
  const scoreAproveitamento = aproveitamento * 100;
  
  const revPerLead = userLeads.length > 0 ? revenue / userLeads.length : 0;
  const scoreReceitaLead = Math.min(1, revPerLead / 5000) * 80; 
  
  const criticalSlaLeads = userLeads.filter(l => l.sla === 'critico' || l.sla === 'vencido').length;
  const slaHealth = userLeads.length > 0 ? 1 - (criticalSlaLeads / userLeads.length) : 1;
  const scoreSLA = slaHealth * 70;

  // 3. EXECUÇÃO (Max 200)
  const completedTasks = userTasks.filter(t => t.done).length;
  const taskRate = userTasks.length > 0 ? completedTasks / userTasks.length : 0;
  const scoreAtividades = taskRate * 60;
  
  const scoreFollowup = 0; 
  const scoreCRM = 50; 
  const scorePesquisas = 0; 
  const scoreProcesso = 20; 

  return {
    total: Math.round(scoreMeta + scoreReceita + scoreTicket + scoreConversao + scoreAproveitamento + scoreReceitaLead + scoreSLA + scoreAtividades + scoreFollowup + scoreCRM + scorePesquisas + scoreProcesso),
    resultado: {
      total: Math.round(scoreMeta + scoreReceita + scoreTicket),
      meta: Math.round(scoreMeta),
      receita: Math.round(scoreReceita),
      ticket: Math.round(scoreTicket)
    },
    eficiencia: {
      total: Math.round(scoreConversao + scoreAproveitamento + scoreReceitaLead + scoreSLA),
      conversao: Math.round(scoreConversao),
      aproveitamento: Math.round(scoreAproveitamento),
      receitaLead: Math.round(scoreReceitaLead),
      sla: Math.round(scoreSLA)
    },
    execucao: {
      total: Math.round(scoreAtividades + scoreFollowup + scoreCRM + scorePesquisas + scoreProcesso),
      atividades: Math.round(scoreAtividades),
      followup: Math.round(scoreFollowup),
      crm: Math.round(scoreCRM),
      pesquisas: Math.round(scorePesquisas),
      processo: Math.round(scoreProcesso)
    }
  };
}

export function getMedal(rank: number): string {
  if (rank === 1) return "🥇 Ouro";
  if (rank === 2) return "🥈 Prata";
  if (rank === 3) return "🥉 Bronze";
  if (rank <= 10) return "TOP 10";
  return "";
}

export function generateHistory(userId: string, isEmpty: boolean = false) {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  if (isEmpty) return months.map(m => ({ month: m, icp: 0 }));
  
  const seed = parseInt(userId.split("-")[1]) || 5;
  return months.map((m, i) => {
    const val = 600 + (Math.sin(seed + i) * 300);
    return { month: m, icp: Math.round(Math.max(200, Math.min(1000, val))) };
  });
}