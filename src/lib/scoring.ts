import { type Lead, type Temperature } from "@/data/mock";

export function calculateLeadScore(lead: Partial<Lead>): number {
  let score = 0;

  // 1 - Matriz MIN (50 pontos)
  const min = lead.minScore || "Nenhum";
  if (min === "MIN") score += 50;
  else if (["MI", "MN", "IN"].includes(min)) score += 30;
  else if (["M", "I", "N"].includes(min)) score += 10;

  // 2 - Tipo de Lead (10 pontos)
  const type = lead.type || "Novo";
  if (type === "Recorrente") score += 10;
  else if (type === "Novo") score += 5;

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

  return Math.min(100, score);
}

export function calculateLeadTemperature(score: number): Temperature {
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