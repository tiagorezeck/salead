import { type Lead, type Temperature } from "@/data/mock";

export function calculateLeadScore(lead: Partial<Lead>): number {
  if (lead.isCustomer || lead.classification === 'Cliente' || lead.stage === 'Ganho' || lead.stage === 'Recebimento') {
    return 100;
  }

  const min = lead.minScore || "Nenhum";
  const minQual = lead.minQualification;
  const isDescarte = minQual?.classification === "DESCARTE" || min === "Nenhum" || min === "Descarte" || lead.classification === "Lead Desqualificado";

  let score = 0;

  // 1 - Matriz MIN (50 pontos)
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

  // Se o lead for descarte no MIN, garante score baixo coerente (máximo 20)
  if (isDescarte) {
    return Math.min(20, score);
  }

  // Ajusta a pontuação com base na temperatura ativa do lead para evitar inconsistências visuais
  const temp = lead.temperature;
  if (temp === "Quente" && score < 70) {
    score = 70 + (score % 20); // Garante score compatível com Quente (70-89)
  } else if (temp === "Morno" && score < 50) {
    score = 50 + (score % 15); // Garante score compatível com Morno (50-64)
  }

  // Se o lead já possui um score válido salvo no banco/objeto, e não é descarte
  if (typeof lead.score === "number" && !isNaN(lead.score) && lead.score > score) {
    if (min === "Aprovado" || min === "MIN" || minQual?.classification === "QUENTE") {
      score = lead.score;
    }
  }

  return Math.min(100, Math.max(0, score));
}

export function calculateLeadTemperature(score: number, lead?: Partial<Lead>): Temperature {
  if (lead?.minQualification?.classification === 'DESCARTE' || lead?.minScore === 'Descarte') {
    return "Frio";
  }
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