import { type Lead, type Temperature } from "@/data/mock";

export function calculateLeadScore(lead: Partial<Lead>): number {
  if (lead.isCustomer || lead.classification === 'Cliente' || lead.stage === 'Ganho' || lead.stage === 'Recebimento') {
    return 100;
  }

  let score = 0;

  // 1 - Matriz MIN (50 pontos)
  const min = lead.minScore || "Nenhum";
  const minQual = lead.minQualification;
  
  if (min === "MIN" || min === "Aprovado" || minQual?.classification === "QUENTE") {
    score += 50;
  } else if (["MI", "MN", "IN"].includes(min) || minQual?.classification === "MORNO") {
    score += 30;
  } else if (["M", "I", "N"].includes(min) || minQual?.classification === "FRIO") {
    score += 10;
  }

  // 2 - Tipo de Lead (10 pontos)
  const type = lead.type || "Novo";
  if (type === "Recorrente") score += 10;
  else if (type === "Inbound" || type === "Novo") score += 5;

  // 3 - Papel na Decisão (20 pontos)
  const role = lead.decisionRole || "Não Decisor";
  if (role === "Decisor") score += 20;
  else if (role === "Co-Decisor") score += 10;
  else if (role === "Influenciador") score += 5;

  // 4 - Estratégia (20 pontos)
  const strategy = lead.strategy || "Nenhuma";
  if (strategy === "Up Sell") score += 20;
  else if (strategy === "Bundle Sell") score += 15;
  else if (strategy === "Cross Sell") score += 5;
  else if (strategy === "Down Sell") score += 2;
  else if (strategy === "Free") score += 1;

  // Ajusta a pontuação com base na temperatura ativa do lead para evitar inconsistências visuais
  const temp = lead.temperature || "Frio";
  if (temp === "Quente" && score < 70) {
    score = 70 + (score % 20); // Garante score compatível com Quente (70-89)
  } else if (temp === "Morno" && score < 50) {
    score = 50 + (score % 15); // Garante score compatível com Morno (50-64)
  }

  // Se o lead já possui um score válido salvo no banco/objeto, e não foi reduzido ativamente, use o maior valor
  if (lead.score && lead.score > score) {
    if (min === "Nenhum" || min === "Aprovado" || min === "MIN") {
      score = lead.score;
    }
  }

  return Math.min(100, score);
}

export function calculateLeadTemperature(score: number, lead?: Partial<Lead>): Temperature {
  if (lead?.temperature) {
    return lead.temperature;
  }
  if (score >= 70) return "Quente";
  if (score >= 50) return "Morno";
  return "Frio";
}

export function getScoreColor(score: number): string {
  if (score >= 70) return "text-destructive"; // Quente
  if (score >= 50) return "text-warning";     // Morno
  return "text-info";                         // Frio
}

export function getScoreBg(score: number): string {
  if (score >= 70) return "bg-destructive";
  if (score >= 50) return "bg-warning";
  return "bg-info";
}

export function getScoreDeltaInfo(current: number, prev?: number) {
  if (prev === undefined || current === prev) return null;
  const diff = current - prev;
  return {
    diff,
    label: `${diff > 0 ? '+' : ''}${diff}`,
    color: diff > 0 ? "text-success" : "text-destructive",
    bg: diff > 0 ? "bg-success/10" : "bg-destructive/10"
  };
}