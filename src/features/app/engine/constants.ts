// RASTETRIS — constantes de balanceamento e layout.
// Todo o "feeling" do jogo (velocidade dos invaders, dano, pontuação) mora aqui.

/** Colunas / linhas do tabuleiro de Tetris */
export const COLS = 10;
export const ROWS = 23;

/**
 * Não há mais "céu" separado: o tabuleiro cobre também a área dos invaders.
 * Linha 0 = pista do UFO, linhas 1..4 = frota. A peça nasce nas linhas 0-1 e a pilha
 * pode subir até o LIMIT, colado na fileira de baixo da frota (ver Engine.limitRow). Linha de mundo = linha do tabuleiro.
 */
export const SKY = 0;
export const WORLD_ROWS = SKY + ROWS;

/** Painéis laterais (HOLD / NEXT), em colunas de célula */
export const PANEL_COLS = 3;
export const VIEW_COLS = COLS + PANEL_COLS * 2;

/** Tamanho lógico de uma célula (o canvas escala isso para a tela) */
export const CELL = 24;
export const VIEW_W = VIEW_COLS * CELL;
export const VIEW_H = WORLD_ROWS * CELL;

// ─── Tetris ──────────────────────────────────────────────────────────────────
export const DAS_DELAY = 0.14; // s até começar a repetir
export const DAS_RATE = 0.045; // s entre repetições
export const SOFT_DROP_RATE = 0.035; // s por célula com ↓ pressionado
export const LOCK_DELAY = 0.5;
export const MAX_LOCK_RESETS = 15;
export const LINE_CLEAR_TIME = 0.32;
export const NEXT_COUNT = 3;
/** Tiro independente (botão FIRE): intervalo mínimo entre disparos, em s */
export const FIRE_COOLDOWN = 0.28;

/** Segundos por linha de gravidade (fórmula oficial do guideline) */
export function gravity(level: number): number {
  const l = Math.min(level, 20) - 1;
  return Math.pow(0.8 - l * 0.007, l);
}

/** Bônus por maior sequência do MESMO avatar numa linha limpa (× nível). Índice = tamanho da sequência. */
export const AVATAR_BONUS = [0, 0, 0, 0, 200, 350, 500, 700, 1000, 1800, 5000];
export const LINE_SCORE = [0, 100, 300, 500, 800];

// ─── Invaders ────────────────────────────────────────────────────────────────
export const FLEET_PER_ROW = 4; // invaders por fileira (espaçados de 2 em 2 colunas)
export const INVADER_SPACING = 2;
export const FLEET_START_ROW = 1;
export const BREACH_ROW = SKY; // frota tocando essa linha = invasão
export const MAX_SHIELDS = 3;
export const START_SHIELDS = 0;
export const BOSS_EVERY = 5;
/** Sequência horizontal do MESMO avatar que libera o desafio RASTA MEMO. */
export const MEMO_RUN = 4;
export const UFO_EVERY = [22, 34] as const; // s entre UFOs (min, max)
export const UFO_SPEED = 3.2; // células/s

export function fleetRows(wave: number): number {
  return Math.min(4, 1 + Math.ceil(wave / 2));
}
export function fleetStepInterval(wave: number, aliveRatio: number): number {
  const base = Math.max(0.32, 1.05 - wave * 0.06);
  return Math.max(0.12, base * (0.35 + 0.65 * aliveRatio));
}
/** Intervalo entre tiros da frota: começa calmo e acelera aos poucos a cada LEVEL (10 linhas). */
export function fleetFireInterval(level: number): number {
  return Math.max(1.6, 6 - (level - 1) * 0.3);
}
/** Velocidade das balas (células/s): lenta no início, sobe por LEVEL. */
export function bulletSpeed(level: number): number {
  return Math.min(6, 2.2 + (level - 1) * 0.25);
}

// ─── Paleta (rasta neon) ─────────────────────────────────────────────────────
export const PIECE_COLORS: Record<string, string> = {
  I: "#22d3ee",
  J: "#3b82f6",
  L: "#f59e0b",
  O: "#FFD700",
  S: "#22c55e",
  T: "#a855f7",
  Z: "#ef4444",
};
export const GARBAGE_COLOR = "#6b7280";
export const INVADER_COLORS = ["#ef4444", "#FFD700", "#22c55e", "#f472b6"];
