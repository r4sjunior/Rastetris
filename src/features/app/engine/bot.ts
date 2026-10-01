// Bot do modo "attract": joga sozinho atrás do menu para dar vida à tela inicial.
// Heurística clássica (altura agregada, linhas, buracos, irregularidade).
// Usa apenas a API pública do Engine (press), então exercita o jogo de verdade.

import { COLS, ROWS } from "@/features/app/engine/constants";
import type { Engine } from "@/features/app/engine/engine";
import { SHAPES, cellValue } from "@/features/app/engine/pieces";
import type { PieceType } from "@/features/app/engine/pieces";

function fits(
  grid: number[][],
  type: PieceType,
  rot: number,
  x: number,
  y: number,
): boolean {
  for (const [cx, cy] of SHAPES[type][rot]) {
    const gx = x + cx;
    const gy = y + cy;
    if (gx < 0 || gx >= COLS || gy >= ROWS) return false;
    if (gy >= 0 && grid[gy][gx]) return false;
  }
  return true;
}

function evaluate(grid: number[][]): number {
  const heights = new Array<number>(COLS).fill(0);
  let holes = 0;
  for (let c = 0; c < COLS; c++) {
    let seen = false;
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][c]) {
        if (!seen) {
          heights[c] = ROWS - r;
          seen = true;
        }
      } else if (seen) holes++;
    }
  }
  let bump = 0;
  for (let c = 0; c < COLS - 1; c++)
    bump += Math.abs(heights[c] - heights[c + 1]);
  const agg = heights.reduce((a, b) => a + b, 0);
  const lines = grid.filter((row) => row.every(Boolean)).length;
  return -0.51 * agg + 0.76 * lines - 0.36 * holes - 0.18 * bump;
}

function bestPlacement(engine: Engine): { rot: number; x: number } | null {
  const p = engine.piece;
  if (!p) return null;
  let best: { rot: number; x: number; score: number } | null = null;
  const rots = p.type === "O" ? 1 : 4;
  for (let rot = 0; rot < rots; rot++) {
    for (let x = -3; x < COLS; x++) {
      if (!fits(engine.grid, p.type, rot, x, -1)) continue;
      let y = -1;
      while (fits(engine.grid, p.type, rot, x, y + 1)) y++;
      const g = engine.grid.map((r) => r.slice());
      let ok = true;
      for (const [cx, cy] of SHAPES[p.type][rot]) {
        if (y + cy < 0) ok = false;
        else g[y + cy][x + cx] = cellValue(p.type);
      }
      if (!ok) continue;
      const s = evaluate(g);
      if (!best || s > best.score) best = { rot, x, score: s };
    }
  }
  return best;
}

export class AttractBot {
  private think = 0.6;
  private overT = 0;
  private lastPiece: unknown = null;

  update(dt: number, engine: Engine) {
    if (engine.over) {
      this.overT += dt;
      if (this.overT > 1.6) {
        engine.reset();
        this.overT = 0;
        this.think = 0.8;
      }
      return;
    }
    if (!engine.piece || engine.clearing) return;
    if (engine.piece !== this.lastPiece) {
      this.lastPiece = engine.piece;
      this.think = 0.35 + Math.random() * 0.5;
    }
    this.think -= dt;
    if (this.think > 0) return;

    const target = bestPlacement(engine);
    if (target && engine.piece) {
      for (let i = 0; i < target.rot; i++) engine.press("cw");
      let guard = 0;
      while (
        engine.piece &&
        engine.piece.x !== target.x &&
        guard++ < COLS + 4
      ) {
        const before = engine.piece.x;
        engine.press(engine.piece.x < target.x ? "right" : "left");
        engine.release("right");
        engine.release("left");
        if (engine.piece.x === before) break;
      }
    }
    engine.press("hard");
    this.lastPiece = null;
  }
}
