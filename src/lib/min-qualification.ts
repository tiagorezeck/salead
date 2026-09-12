export type MinScoreValue = 0 | 1;
export type MinClassification = 'QUENTE' | 'MORNO' | 'FRIO' | 'DESCARTE';

export interface MinQualification {
  m?: MinScoreValue; // 0 = não, 1 = sim
  i?: MinScoreValue; // 0 = não, 1 = sim
  n?: MinScoreValue; // 0 = não, 1 = sim
  total?: number;    // 0, 1, 2, 3
  classification?: MinClassification;
}

export function calculateMinQualification(
  m?: number | null, 
  i?: number | null, 
  n?: number | null
): MinQualification | undefined {
  const hasM = m !== undefined && m !== null;
  const hasI = i !== undefined && i !== null;
  const hasN = n !== undefined && n !== null;

  if (!hasM && !hasI && !hasN) {
    return undefined;
  }

  const valM: MinScoreValue = (m === 1 ? 1 : 0);
  const valI: MinScoreValue = (i === 1 ? 1 : 0);
  const valN: MinScoreValue = (n === 1 ? 1 : 0);

  const total = valM + valI + valN;

  let classification: MinClassification = 'DESCARTE';
  if (total === 3) classification = 'QUENTE';
  else if (total === 2) classification = 'MORNO';
  else if (total === 1) classification = 'FRIO';
  else classification = 'DESCARTE';

  return {
    m: valM,
    i: valI,
    n: valN,
    total,
    classification
  };
}

export interface MinBadgeConfig {
  label: string;
  emoji: string;
  scoreText: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export function getMinClassificationBadge(min?: MinQualification | null): MinBadgeConfig {
  if (!min || min.classification === undefined) {
    return {
      label: "Não avaliado",
      emoji: "⚪",
      scoreText: "-",
      bg: "bg-muted/40",
      text: "text-muted-foreground",
      border: "border-border/60",
      dot: "bg-muted-foreground"
    };
  }

  switch (min.classification) {
    case 'QUENTE':
      return {
        label: "QUENTE",
        emoji: "🔥",
        scoreText: `${min.total || 3}/3`,
        bg: "bg-rose-500/10",
        text: "text-rose-500 font-black",
        border: "border-rose-500/30",
        dot: "bg-rose-500"
      };
    case 'MORNO':
      return {
        label: "MORNO",
        emoji: "🟠",
        scoreText: `${min.total || 2}/3`,
        bg: "bg-amber-500/10",
        text: "text-amber-500 font-black",
        border: "border-amber-500/30",
        dot: "bg-amber-500"
      };
    case 'FRIO':
      return {
        label: "FRIO",
        emoji: "🔵",
        scoreText: `${min.total || 1}/3`,
        bg: "bg-sky-500/10",
        text: "text-sky-500 font-black",
        border: "border-sky-500/30",
        dot: "bg-sky-500"
      };
    case 'DESCARTE':
    default:
      return {
        label: "DESCARTE",
        emoji: "⚫",
        scoreText: `${min.total ?? 0}/3`,
        bg: "bg-zinc-800/20",
        text: "text-zinc-400 font-bold",
        border: "border-zinc-700/40",
        dot: "bg-zinc-500"
      };
  }
}

export function parseLegacyMinScore(legacy?: string): MinQualification | undefined {
  if (!legacy || legacy === "Nenhum") return undefined;
  
  let m: MinScoreValue = legacy.includes("M") ? 1 : 0;
  let i: MinScoreValue = legacy.includes("I") ? 1 : 0;
  let n: MinScoreValue = legacy.includes("N") ? 1 : 0;

  return calculateMinQualification(m, i, n);
}
