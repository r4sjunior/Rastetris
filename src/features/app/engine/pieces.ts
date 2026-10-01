import { COLS } from "@/features/app/engine/constants";

export type PieceType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
export const PIECE_TYPES: PieceType[] = ["I", "J", "L", "O", "S", "T", "Z"];
/** Valor gravado na grade: índice+1 (0 = vazio). Lixo dos invaders = 8 + índice+1 (avatar aleatório marcado). */
export const GARBAGE = 8;
/** Tipo de avatar de uma célula (peça normal ou lixo). */
export const avatarOf = (v: number) => (v > GARBAGE ? v - GARBAGE : v);
export const cellValue = (t: PieceType) => PIECE_TYPES.indexOf(t) + 1;
export const typeFromCell = (v: number): PieceType | null =>
  PIECE_TYPES[(v > 8 ? v - 8 : v) - 1] ?? null;

type Matrix = number[][];

const BASE: Record<PieceType, Matrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

function rotateCW(m: Matrix): Matrix {
  const n = m.length;
  return m.map((_, r) => m.map((__, c) => m[n - 1 - c][r]));
}

export type Cell = [number, number]; // [col, row] relativo à origem da peça

/** SHAPES[tipo][rotação] = lista de células ocupadas */
export const SHAPES = {} as Record<PieceType, Cell[][]>;
for (const t of PIECE_TYPES) {
  let m = BASE[t];
  const rots: Cell[][] = [];
  for (let r = 0; r < 4; r++) {
    const cells: Cell[] = [];
    m.forEach((row, y) => row.forEach((v, x) => v && cells.push([x, y])));
    rots.push(cells);
    m = t === "O" ? m : rotateCW(m);
  }
  SHAPES[t] = rots;
}

export function spawnPosition(t: PieceType): { x: number; y: number } {
  const size = BASE[t].length;
  return { x: Math.floor((COLS - size) / 2), y: t === "I" ? -1 : 0 };
}

// ─── SRS wall kicks (guideline usa y para cima → invertido para y para baixo) ─
type Kick = [number, number];
const JLSTZ: Record<string, Kick[]> = {
  "01": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "10": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "12": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "21": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "23": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "32": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "30": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "03": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
};
const I_KICKS: Record<string, Kick[]> = {
  "01": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  "10": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  "12": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
  "21": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  "23": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  "32": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  "30": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  "03": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
};

export function getKicks(t: PieceType, from: number, to: number): Kick[] {
  if (t === "O") return [[0, 0]];
  const table = t === "I" ? I_KICKS : JLSTZ;
  return (table[`${from}${to}`] ?? [[0, 0]]).map(([x, y]) => [x, -y] as Kick);
}

/** Saco 7-bag */
export function makeBag(rand: () => number): PieceType[] {
  const bag = [...PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}
