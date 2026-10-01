// Patentes do RASTETRIS — mostradas na tela de fim de jogo e no share.

export type Rank = { name: string; icon: string; color: string; min: number };

export const RANKS: Rank[] = [
  { name: "SEEDLING", icon: "🌱", color: "#a3c4a3", min: 0 },
  { name: "YOUTH", icon: "🌿", color: "#22c55e", min: 3_000 },
  { name: "DREAD WARRIOR", icon: "⚔️", color: "#22d3ee", min: 15_000 },
  { name: "ROOTS SOLDIER", icon: "🛡️", color: "#FFD700", min: 50_000 },
  { name: "LION OF ZION", icon: "🦁", color: "#f59e0b", min: 120_000 },
  { name: "JAH LEGEND", icon: "👑", color: "#f472b6", min: 300_000 },
];

export function getRank(score: number): Rank {
  let r = RANKS[0];
  for (const x of RANKS) if (score >= x.min) r = x;
  return r;
}

export function nextRank(score: number): Rank | null {
  return RANKS.find((r) => r.min > score) ?? null;
}

export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const BEST_KEY = "rastetris:best";

export function loadBest(): number {
  try {
    return parseInt(window.localStorage.getItem(BEST_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    /* storage bloqueado: ignora */
  }
}
