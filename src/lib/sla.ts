import { type SLA } from "@/data/mock";

// Configuração de tempos (em horas) para cada nível de SLA
const SLA_THRESHOLDS = {
  alerta: 24,   // 24h sem interação
  critico: 48,  // 48h sem interação
  vencido: 72   // 72h sem interação
};

export function calculateSLA(lastInteractionStr: string): SLA {
  // Como estamos usando dados mockados como "2h atrás", vamos converter para horas
  const match = lastInteractionStr.match(/(\d+)/);
  if (!match) return "ok";
  
  const hours = parseInt(match[1]);
  
  if (hours >= SLA_THRESHOLDS.vencido) return "vencido";
  if (hours >= SLA_THRESHOLDS.critico) return "critico";
  if (hours >= SLA_THRESHOLDS.alerta) return "alerta";
  
  return "ok";
}