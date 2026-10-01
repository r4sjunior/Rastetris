// RASTETRIS — renderer de canvas (estilo neon 8-bit).
// Tudo é desenhado em coordenadas lógicas (VIEW_W x VIEW_H); quem chama aplica a escala/DPR.

import type { Engine, Invader } from "@/features/app/engine/engine";
import {
  BOSS_EVERY,
  CELL,
  COLS,
  INVADER_COLORS,
  MAX_SHIELDS,
  NEXT_COUNT,
  PANEL_COLS,
  PIECE_COLORS,
  ROWS,
  SKY,
  VIEW_H,
  VIEW_W,
} from "@/features/app/engine/constants";
import { getPieceIcon } from "@/features/app/engine/icons";
import {
  GARBAGE,
  PieceType,
  SHAPES,
  typeFromCell,
} from "@/features/app/engine/pieces";
import {
  INVADER_SPRITES,
  UFO_SPRITE,
  drawBitmap,
} from "@/features/app/engine/sprites";

const FONT = "'Press Start 2P', monospace";
const BX = PANEL_COLS * CELL; // x do tabuleiro
const BW = COLS * CELL;
const BOARD_Y = SKY * CELL;

// estrelas fixas (determinísticas) para o parallax do fundo
const STARS = Array.from({ length: 70 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return {
    x: (a - Math.floor(a)) * BW,
    y: (b - Math.floor(b)) * VIEW_H,
    s: 0.6 + ((i * 7) % 5) * 0.35,
    v: 4 + ((i * 13) % 9),
  };
});

function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "center",
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.min(6, Math.max(2, size / 4));
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

function block(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: string,
  alpha = 1,
  icon: HTMLImageElement | null = null,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (icon) {
    // ícone CryptoRasta em cor cheia (é o protagonista): só uma moldura na cor da peça
    ctx.drawImage(icon, x, y, s, s);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    ctx.restore();
    return;
  }
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
  const b = Math.max(2, s * 0.14);
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fillRect(x + 1, y + 1, s - 2, b);
  ctx.fillRect(x + 1, y + 1, b, s - 2);
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fillRect(x + 1, y + s - 1 - b, s - 2, b);
  ctx.fillRect(x + s - 1 - b, y + 1, b, s - 2);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(x + s * 0.3, y + s * 0.3, s * 0.4, s * 0.4);
  ctx.restore();
}

/** Lixo dos invaders: avatar aleatório com marca vermelha de "infectado". */
function garbageBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  t: PieceType,
) {
  block(ctx, x, y, s, PIECE_COLORS[t], 1, getPieceIcon(t));
  ctx.save();
  ctx.fillStyle = "rgba(60,0,0,0.35)";
  ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
  ctx.strokeStyle = "rgba(239,68,68,0.95)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 4);
  ctx.lineTo(x + 10, y + 10);
  ctx.moveTo(x + s - 4, y + 4);
  ctx.lineTo(x + s - 10, y + 10);
  ctx.stroke();
  ctx.restore();
}

function miniPiece(
  ctx: CanvasRenderingContext2D,
  type: PieceType,
  cx: number,
  cy: number,
  s: number,
  alpha = 1,
) {
  const cells = SHAPES[type][0];
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = (maxX - minX + 1) * s;
  const h = (maxY - minY + 1) * s;
  for (const [x, y] of cells) {
    block(
      ctx,
      cx - w / 2 + (x - minX) * s,
      cy - h / 2 + (y - minY) * s,
      s,
      PIECE_COLORS[type],
      alpha,
      getPieceIcon(type),
    );
  }
}

function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color = "#22c55e",
) {
  ctx.save();
  ctx.fillStyle = "rgba(2,10,4,0.62)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
  ctx.restore();
  text(ctx, label, x + w / 2, y + 9, 7, color);
}

function drawInvader(ctx: CanvasRenderingContext2D, inv: Invader, e: Engine) {
  const x = BX + (e.ox + inv.x) * CELL;
  const y = (e.oy + inv.y) * CELL;
  const w = inv.w * CELL;
  const h = inv.h * CELL;
  const boss = inv.type === 3;
  const color = boss ? INVADER_COLORS[3] : INVADER_COLORS[inv.type];
  const pad = boss ? 4 : 2.5;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = boss ? 18 : 10;
  ctx.fillStyle =
    inv.flash > 0
      ? "#ffffff"
      : inv.hp < inv.maxHp && inv.maxHp > 1 && !boss
        ? "#ffffff"
        : color;
  drawBitmap(
    ctx,
    INVADER_SPRITES[inv.type][e.animFrame],
    x + pad,
    y + pad,
    w - pad * 2,
    h - pad * 2,
  );
  ctx.restore();
  // olhos
  if (!boss) {
    ctx.fillStyle = "#000";
    ctx.fillRect(x + CELL * 0.33, y + CELL * 0.4, 2.5, 2.5);
    ctx.fillRect(x + CELL * 0.6, y + CELL * 0.4, 2.5, 2.5);
  }
  // barra de vida do boss
  if (boss) {
    const bw = w - 8;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x + 4, y - 5, bw, 5);
    ctx.fillStyle =
      inv.hp / inv.maxHp > 0.5
        ? "#22c55e"
        : inv.hp / inv.maxHp > 0.25
          ? "#FFD700"
          : "#ef4444";
    ctx.fillRect(x + 5, y - 4, (bw - 2) * (inv.hp / inv.maxHp), 3);
  }
}

export function render(ctx: CanvasRenderingContext2D, e: Engine, now: number) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();

  // screen shake
  if (e.shake > 0) {
    const m = e.shake * 6;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }

  // ─── fundo: tabuleiro + faixa dos invaders ───────────────────────────────
  ctx.fillStyle = "rgba(2,8,3,0.50)";
  ctx.fillRect(BX, 0, BW, VIEW_H);
  const skyH = 5 * CELL;
  const sky = ctx.createLinearGradient(0, 0, 0, skyH);
  sky.addColorStop(0, "rgba(6,4,22,0.42)");
  sky.addColorStop(1, "rgba(20,4,10,0.0)");
  ctx.fillStyle = sky;
  ctx.fillRect(BX, 0, BW, skyH);

  // estrelas
  ctx.save();
  ctx.beginPath();
  ctx.rect(BX, 0, BW, VIEW_H);
  ctx.clip();
  for (const s of STARS) {
    const y = (s.y + now * s.v) % VIEW_H;
    ctx.globalAlpha = y < 5 * CELL ? 0.6 : 0.18;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(BX + s.x, y, s.s, s.s);
  }
  ctx.restore();

  // grade
  ctx.strokeStyle = "rgba(34,197,94,0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) {
    ctx.moveTo(BX + c * CELL + 0.5, BOARD_Y);
    ctx.lineTo(BX + c * CELL + 0.5, VIEW_H);
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.moveTo(BX, BOARD_Y + r * CELL + 0.5);
    ctx.lineTo(BX + BW, BOARD_Y + r * CELL + 0.5);
  }
  ctx.stroke();

  // perigo: vinheta vermelha quando a pilha chega perto do topo
  const top = e.stackTop();
  const L = e.limitRow;
  if (top <= L + 5) {
    const a = (0.12 + 0.12 * Math.sin(now * 8)) * (1 - (top - L) / 6);
    const vy = (L + 1) * CELL;
    const g = ctx.createLinearGradient(0, vy, 0, vy + CELL * 5);
    g.addColorStop(0, `rgba(239,68,68,${a * 2.2})`);
    g.addColorStop(1, "rgba(239,68,68,0)");
    ctx.fillStyle = g;
    ctx.fillRect(BX, vy, BW, CELL * 5);
  }

  // ─── LIMITE: zona de contato com os invaders ─────────────────────────────
  {
    const ly = BOARD_Y + e.limitRow * CELL;
    const hot = e.stackTop() <= e.limitRow + 3;
    const pulse = hot ? 0.55 + 0.45 * Math.sin(now * 10) : 0.5;
    const g = ctx.createLinearGradient(0, BOARD_Y, 0, ly);
    g.addColorStop(0, `rgba(239,68,68,${0.05 + pulse * 0.12})`);
    g.addColorStop(1, `rgba(239,68,68,${0.14 + pulse * 0.2})`);
    ctx.fillStyle = g;
    ctx.fillRect(BX, BOARD_Y, BW, e.limitRow * CELL);
    ctx.save();
    ctx.strokeStyle = `rgba(239,68,68,${0.55 + pulse * 0.45})`;
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = hot ? 14 : 6;
    ctx.setLineDash([8, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(BX, ly);
    ctx.lineTo(BX + BW, ly);
    ctx.stroke();
    ctx.restore();
    text(
      ctx,
      "LIMIT",
      BX + BW - 4,
      ly + 8,
      6,
      "#ef4444",
      "right",
      0.5 + pulse * 0.5,
    );
  }

  // ─── blocos travados ─────────────────────────────────────────────────────
  const clearingRows = new Set(e.clearing?.rows ?? []);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = e.grid[r][c];
      if (!v) continue;
      const x = BX + c * CELL;
      const y = BOARD_Y + r * CELL;
      if (v > GARBAGE) garbageBlock(ctx, x, y, CELL, typeFromCell(v) ?? "I");
      else {
        const t = typeFromCell(v) ?? "I";
        block(ctx, x, y, CELL, PIECE_COLORS[t], 1, getPieceIcon(t));
      }
    }
  }

  // animação de linha limpa: flash branco + varredura dourada
  if (e.clearing) {
    const k = Math.min(1, e.clearing.t / 0.32);
    for (const r of clearingRows) {
      const y = BOARD_Y + r * CELL;
      ctx.fillStyle = `rgba(255,255,255,${0.95 - k * 0.6})`;
      ctx.fillRect(BX, y, BW, CELL);
      ctx.fillStyle = `rgba(255,215,0,${0.7 * (1 - k)})`;
      ctx.fillRect(BX + BW * k, y, BW * (1 - k), CELL);
    }
  }

  // ─── efeito de SEQUÊNCIA de avatar: onda de luz + moldura rosa ───────────
  for (const f of e.runFx) {
    const k = 1 - f.life / f.max;
    const x0 = BX + f.start * CELL;
    const y = BOARD_Y + f.row * CELL;
    const w = f.len * CELL;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - k) * 1.4);
    ctx.shadowColor = "#f472b6";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    const grow = 3 + k * 6;
    ctx.strokeRect(x0 - grow, y - grow, w + grow * 2, CELL + grow * 2);
    ctx.strokeStyle = "#f472b6";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      x0 - grow - 3,
      y - grow - 3,
      w + grow * 2 + 6,
      CELL + grow * 2 + 6,
    );
    ctx.restore();
    const shine = k * (f.len + 3) - 1.5;
    for (let i = 0; i < f.len; i++) {
      const d = Math.abs(i - shine);
      const a = Math.max(0, 1 - d / 1.4) * (1 - k * 0.5);
      if (a <= 0) continue;
      ctx.fillStyle = `rgba(255,255,255,${a * 0.75})`;
      ctx.fillRect(x0 + i * CELL, y, CELL, CELL);
    }
    ctx.fillStyle = "#fff";
    for (let i = 0; i < f.len; i++) {
      const sy = y + CELL / 2 - k * 34 - ((i * 7) % 5) * 3;
      const sx = x0 + i * CELL + CELL / 2 + Math.sin(i * 2.1 + k * 6) * 5;
      ctx.globalAlpha = 1 - k;
      ctx.fillRect(sx - 1, sy - 4, 2, 8);
      ctx.fillRect(sx - 4, sy - 1, 8, 2);
    }
    ctx.globalAlpha = 1;
  }

  // ─── peça ativa + ghost ──────────────────────────────────────────────────
  const p = e.piece;
  if (p) {
    const gy = e.ghostY();
    const color = PIECE_COLORS[p.type];
    if (gy !== p.y) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      for (const [cx, cy] of SHAPES[p.type][p.rot]) {
        const y = gy + cy;
        if (y < 0) continue;
        ctx.strokeRect(
          BX + (p.x + cx) * CELL + 2,
          BOARD_Y + y * CELL + 2,
          CELL - 4,
          CELL - 4,
        );
      }
      ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    for (const [cx, cy] of SHAPES[p.type][p.rot]) {
      const y = p.y + cy;
      if (y < 0) continue;
      block(
        ctx,
        BX + (p.x + cx) * CELL,
        BOARD_Y + y * CELL,
        CELL,
        color,
        1,
        getPieceIcon(p.type),
      );
    }
    ctx.restore();
  }

  // ─── mira: onde o próximo hard drop vai acertar ─────────────────────────
  if (p) {
    const cols = [...new Set(SHAPES[p.type][p.rot].map(([cx]) => p.x + cx))];
    ctx.save();
    ctx.strokeStyle = "rgba(34,197,94,0.35)";
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const c of cols) {
      ctx.moveTo(BX + c * CELL + CELL / 2, BOARD_Y + Math.max(0, p.y) * CELL);
      ctx.lineTo(BX + c * CELL + CELL / 2, CELL);
    }
    ctx.stroke();
    ctx.restore();
    const pulse = 0.6 + 0.4 * Math.sin(now * 12);
    for (const t of e.aimTargets()) {
      const x = BX + (e.ox + t.x) * CELL - 2;
      const y = (e.oy + t.y) * CELL - 2;
      const w = t.w * CELL + 4;
      const h = t.h * CELL + 4;
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      const k = 6;
      ctx.beginPath();
      for (const [px, py, dx, dy] of [
        [x, y, 1, 1],
        [x + w, y, -1, 1],
        [x, y + h, 1, -1],
        [x + w, y + h, -1, -1],
      ]) {
        ctx.moveTo(px + dx * k, py);
        ctx.lineTo(px, py);
        ctx.lineTo(px, py + dy * k);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // ─── invaders, UFO, balas, tiros ─────────────────────────────────────────
  for (const inv of e.invaders) drawInvader(ctx, inv, e);

  if (e.ufo) {
    ctx.save();
    ctx.shadowColor = "#f472b6";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#f472b6";
    drawBitmap(ctx, UFO_SPRITE, BX + e.ufo.x * CELL, 3, CELL * 2, CELL - 6);
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = "#ef4444";
  ctx.shadowBlur = 10;
  for (const b of e.bullets) {
    const x = BX + b.x * CELL + CELL / 2;
    const y = b.y * CELL;
    const wob = Math.sin(now * 30 + b.y * 3) * 2;
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(x - 2 + wob, y - 9, 4, 12);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 1 + wob, y - 4, 2, 6);
  }
  ctx.restore();

  for (const s of e.shots) {
    const k = Math.max(0, s.life / (s.wide ? 0.35 : 0.22));
    const x = BX + s.x * CELL;
    const y0 = s.y0 * CELL;
    const y1 = s.y1 * CELL;
    ctx.save();
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 14;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, s.color);
    g.addColorStop(1, "rgba(255,255,255,0.9)");
    ctx.globalAlpha = k;
    ctx.fillStyle = g;
    const w = (s.wide ? 7 : 4) * k + 1;
    ctx.fillRect(x - w / 2, y1, w, y0 - y1);
    ctx.restore();
  }

  // ─── anéis de explosão ───────────────────────────────────────────────────
  for (const r of e.rings) {
    const k = 1 - r.life / r.max;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = r.color;
    ctx.shadowColor = r.color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4 * (1 - k) + 1;
    ctx.beginPath();
    ctx.arc(BX + r.x * CELL, r.y * CELL, r.size * CELL * k + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ─── partículas ──────────────────────────────────────────────────────────
  for (const pt of e.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    const s = pt.size * CELL;
    ctx.fillRect(BX + pt.x * CELL - s / 2, pt.y * CELL - s / 2, s, s);
  }
  ctx.globalAlpha = 1;

  // ─── brilho de COMBO: luz subindo do chão + moldura pulsante ─────────────
  if (e.glow > 0) {
    const g = ctx.createLinearGradient(0, VIEW_H, 0, BOARD_Y);
    g.addColorStop(0, `rgba(244,114,182,${e.glow * 0.35})`);
    g.addColorStop(1, "rgba(244,114,182,0)");
    ctx.fillStyle = g;
    ctx.fillRect(BX, BOARD_Y, BW, ROWS * CELL);
    ctx.save();
    ctx.strokeStyle = `rgba(244,114,182,${0.4 + 0.6 * e.glow})`;
    ctx.shadowColor = "#f472b6";
    ctx.shadowBlur = 30 * e.glow;
    ctx.lineWidth = 3 + 4 * e.glow;
    ctx.strokeRect(BX - 2, 0, BW + 4, VIEW_H);
    ctx.restore();
  }

  // ─── BANNER DE COMBO: 1X, 2X, 3X... gigante, cresce e esquenta de cor ───
  const COMBO_COLORS = [
    "#ffffff",
    "#FFD700",
    "#f59e0b",
    "#fb923c",
    "#f472b6",
    "#ef4444",
    "#a855f7",
    "#22d3ee",
    "#22c55e",
    "#FFD700",
  ];
  for (const f of e.comboFx) {
    const k = 1 - f.life / f.max;
    const cx = BX + BW / 2;
    const cy = BOARD_Y + 6 * CELL;
    const color = COMBO_COLORS[Math.min(f.n - 1, COMBO_COLORS.length - 1)];
    const pop =
      k < 0.18 ? 0.3 + (k / 0.18) * 1.0 : 1.3 - Math.min(0.3, (k - 0.18) * 0.5);
    const alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    // raios radiais
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 3;
    const rays = 8 + f.n * 2;
    ctx.beginPath();
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + k * 0.6;
      ctx.moveTo(Math.cos(a) * (20 + k * 40), Math.sin(a) * (20 + k * 40));
      ctx.lineTo(Math.cos(a) * (50 + k * 120), Math.sin(a) * (50 + k * 120));
    }
    ctx.stroke();
    // anel de choque
    ctx.globalAlpha = alpha * (1 - k);
    ctx.lineWidth = 6 * (1 - k) + 1;
    ctx.beginPath();
    ctx.arc(0, 0, 30 + k * 130, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // o número
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(k * 20) * 0.05 * (1 - k));
    ctx.scale(pop, pop);
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    text(
      ctx,
      `${f.n}X`,
      0,
      0,
      40 + Math.min(f.n, 7) * 5,
      color,
      "center",
      alpha,
    );
    text(
      ctx,
      f.n >= 10 ? "MAX COMBO!" : "COMBO",
      0,
      34 + Math.min(f.n, 7) * 3,
      10,
      "#ffffff",
      "center",
      alpha,
    );
    ctx.restore();
  }

  // ─── moldura neon do campo ───────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 10;
  ctx.strokeRect(BX - 1, 1, BW + 2, VIEW_H - 2);
  ctx.restore();
  // fita rasta no topo da moldura
  const stripe = BW / 3;
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(BX, 0, stripe, 3);
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(BX + stripe, 0, stripe, 3);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(BX + stripe * 2, 0, stripe, 3);

  // ─── painéis laterais ────────────────────────────────────────────────────
  const pw = PANEL_COLS * CELL - 6;

  // HOLD
  panel(ctx, 3, 4, pw, 62, "HOLD");
  if (e.holdType)
    miniPiece(
      ctx,
      e.holdType,
      3 + pw / 2,
      40,
      CELL * 0.6,
      e.canHold ? 1 : 0.35,
    );

  // stats esquerda
  const stats: [string, string, string][] = [
    ["LEVEL", String(e.level), "#FFD700"],
    ["LINES", String(e.lines), "#22c55e"],
    ["WAVE", String(e.wave), "#f472b6"],
  ];
  stats.forEach(([label, val, color], i) => {
    const y = 74 + i * 46;
    panel(ctx, 3, y, pw, 40, label, color);
    text(ctx, val, 3 + pw / 2, y + 27, 12, "#fff");
  });
  // combo
  if (e.combo > 0) {
    const pulse = 1 + 0.08 * Math.sin(now * 12);
    text(
      ctx,
      `x${e.combo}`,
      3 + pw / 2,
      74 + 3 * 46 + 14,
      13 * pulse,
      "#f472b6",
    );
    text(ctx, "COMBO", 3 + pw / 2, 74 + 3 * 46 + 30, 6, "#f472b6");
  }

  // NEXT
  const rx = BX + BW + 3;
  panel(ctx, rx, 4, pw, 8 + NEXT_COUNT * 52, "NEXT");
  for (let i = 0; i < NEXT_COUNT; i++) {
    miniPiece(
      ctx,
      e.queue[i],
      rx + pw / 2,
      38 + i * 50,
      CELL * (i === 0 ? 0.6 : 0.5),
      i === 0 ? 1 : 0.75,
    );
  }

  // escudos
  const sy = 4 + 8 + NEXT_COUNT * 52 + 10;
  panel(ctx, rx, sy, pw, 66, "SHIELD", "#3b82f6");
  for (let i = 0; i < MAX_SHIELDS; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = rx + 6 + col * 21;
    const y = sy + 20 + row * 20;
    const on = i < e.shields;
    ctx.save();
    if (on) {
      ctx.shadowColor = "#60a5fa";
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = on ? "#60a5fa" : "rgba(96,165,250,0.15)";
    // escudo simples em pixel
    ctx.fillRect(x, y, 14, 10);
    ctx.fillRect(x + 2, y + 10, 10, 3);
    ctx.fillRect(x + 4, y + 13, 6, 2);
    ctx.restore();
  }

  // próxima onda é chefe?
  const bossNext = e.wave % BOSS_EVERY === 0;
  text(
    ctx,
    bossNext ? "BOSS" : `BOSS ${BOSS_EVERY - (e.wave % BOSS_EVERY)}`,
    rx + pw / 2,
    sy + 82,
    7,
    bossNext ? "#f472b6" : "#4a7a4a",
  );
  text(
    ctx,
    bossNext ? "WAVE!" : "WAVES",
    rx + pw / 2,
    sy + 94,
    6,
    bossNext ? "#f472b6" : "#4a7a4a",
  );

  // ─── textos flutuantes ───────────────────────────────────────────────────
  for (const f of e.floaters) {
    const k = f.life / f.max;
    const pop = k > 0.85 ? 1 + (k - 0.85) * 4 : 1;
    text(
      ctx,
      f.text,
      BX + f.x * CELL,
      f.y * CELL,
      f.size * pop,
      f.color,
      "center",
      Math.min(1, k * 2.2),
    );
  }

  // banner de onda
  if (e.waveBanner > 0 && !e.over) {
    const k = Math.min(
      1,
      e.waveBanner / 0.4,
      (1.8 - e.waveBanner) / 0.25 + 0.001,
    );
    const boss = e.wave % BOSS_EVERY === 0;
    text(
      ctx,
      boss ? "WARNING" : `WAVE ${e.wave}`,
      BX + BW / 2,
      3.1 * CELL,
      16,
      boss ? "#ef4444" : "#FFD700",
      "center",
      Math.max(0, Math.min(1, k)),
    );
    text(
      ctx,
      boss ? "BOSS INCOMING" : "INVADERS INBOUND",
      BX + BW / 2,
      3.9 * CELL,
      7,
      "#fff",
      "center",
      Math.max(0, Math.min(1, k)),
    );
  }

  // flash global
  if (e.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, e.flash) * 0.6})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  ctx.restore();
}
