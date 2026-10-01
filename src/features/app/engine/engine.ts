// RASTETRIS — motor do jogo (puro TypeScript, sem React/DOM).
//
// Regras do híbrido:
//  • Tetris clássico (SRS, 7-bag, hold, ghost, lock delay, combo, back-to-back).
//  • Uma frota de Space Invaders marcha no "céu" acima do tabuleiro.
//  • HARD DROP = tiro: cada coluna da peça dispara um laser que derruba o invader mais baixo.
//  • LINHA COMPLETA = rajada: cada linha limpa acerta TODAS as colunas (Tetris = varredura total).
//  • Invaders atiram: a bala cai pela coluna e vira um bloco de LIXO no topo da pilha.
//  • Frota chegando à linha de invasão = perde 1 escudo. Sem escudos ou pilha no topo = game over.

import {
  BOSS_EVERY,
  COLS,
  FLEET_PER_ROW,
  FLEET_START_ROW,
  FIRE_COOLDOWN,
  AVATAR_BONUS,
  INVADER_SPACING,
  MEMO_RUN,
  LINE_CLEAR_TIME,
  LINE_SCORE,
  LOCK_DELAY,
  MAX_LOCK_RESETS,
  MAX_SHIELDS,
  NEXT_COUNT,
  ROWS,
  SKY,
  SOFT_DROP_RATE,
  START_SHIELDS,
  DAS_DELAY,
  DAS_RATE,
  UFO_EVERY,
  UFO_SPEED,
  bulletSpeed,
  fleetFireInterval,
  fleetRows,
  fleetStepInterval,
  gravity,
} from "@/features/app/engine/constants";
import {
  GARBAGE,
  avatarOf,
  PieceType,
  SHAPES,
  cellValue,
  getKicks,
  makeBag,
  spawnPosition,
} from "@/features/app/engine/pieces";

// ─── Tipos públicos ──────────────────────────────────────────────────────────
export type Action =
  | "left"
  | "right"
  | "down"
  | "cw"
  | "ccw"
  | "hard"
  | "hold"
  | "fire";

export type GameEvent =
  | { type: "move" }
  | { type: "rotate" }
  | { type: "hold" }
  | { type: "land" }
  | { type: "hard" }
  | { type: "shot"; n: number }
  | { type: "kill"; boss: boolean }
  | { type: "hit" }
  | { type: "clear"; lines: number; combo: number }
  | { type: "tetris" }
  | { type: "garbage" }
  | { type: "absorb" }
  | { type: "shield"; shields: number }
  | { type: "invfire" }
  | { type: "memo" }
  | { type: "multi"; n: number }
  | { type: "match"; n: number; bonus: number }
  | { type: "wave"; wave: number }
  | { type: "waveclear" }
  | { type: "level"; level: number }
  | { type: "ufo" }
  | { type: "ufokill" }
  | { type: "gameover" }
  | { type: "continue" };

export type Piece = { type: PieceType; rot: number; x: number; y: number };

export type Invader = {
  id: number;
  x: number; // offset dentro da formação (células)
  y: number;
  w: number;
  h: number;
  type: number; // 0..3 (3 = boss)
  hp: number;
  maxHp: number;
  flash: number; // s restantes de flash branco
};

export type Bullet = { x: number; y: number };
export type Shot = {
  x: number;
  y0: number;
  y1: number;
  life: number;
  color: string;
  wide: boolean;
};
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  gravity: number;
};
export type Floater = {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  size: number;
};
export type RunFx = {
  row: number;
  start: number;
  len: number;
  life: number;
  max: number;
};
export type ComboFx = { n: number; life: number; max: number };
export type Ring = {
  x: number;
  y: number;
  life: number;
  max: number;
  color: string;
  size: number;
};
export type Ufo = { x: number; dir: 1 | -1 };

export type Stats = {
  invaders: number;
  tetrises: number;
  maxCombo: number;
  hardDrops: number;
  shotsFired: number;
  shotsHit: number;
  lines: number;
  waves: number;
  ufos: number;
  time: number;
};

export type Snapshot = {
  score: number;
  lines: number;
  level: number;
  wave: number;
  shields: number;
  combo: number;
  over: boolean;
  cause: "topout" | "invaded" | null;
  stats: Stats;
};

type Clearing = { rows: number[]; t: number };

const rnd = (a: number, b: number, r: () => number) => a + r() * (b - a);

export class Engine {
  // tabuleiro
  grid: number[][] = [];
  piece: Piece | null = null;
  holdType: PieceType | null = null;
  canHold = true;
  queue: PieceType[] = [];
  private bag: PieceType[] = [];

  // progresso
  score = 0;
  lines = 0;
  level = 1;
  combo = -1;
  b2b = false;
  shields = START_SHIELDS;
  over = false;
  cause: "topout" | "invaded" | null = null;
  stats: Stats = this.freshStats();

  // frota
  wave = 1;
  invaders: Invader[] = [];
  ox = 0;
  oy = FLEET_START_ROW;
  dir: 1 | -1 = 1;
  animFrame = 0;
  private stepT = 0;
  private fireT = 1.5;
  private fleetFreeze = 0; // s sem mover/atirar
  private waveDelay = 0; // s até a próxima onda nascer
  private nextId = 1;
  bullets: Bullet[] = [];
  ufo: Ufo | null = null;
  private ufoT = 0;

  // efeitos visuais
  shots: Shot[] = [];
  particles: Particle[] = [];
  floaters: Floater[] = [];
  rings: Ring[] = [];
  runFx: RunFx[] = [];
  comboFx: ComboFx[] = [];
  /** brilho de combo na moldura (0..1) */
  glow = 0;
  /** s restantes de câmera lenta (Tetris / chefe) */
  slow = 0;
  /**
   * LIMIT: primeira linha onde a pilha ainda é segura. Fica COLADO na fileira de baixo da frota
   * (acompanha frotas maiores / chefe). Pilha acima dessa linha = encostou nos invaders.
   */
  limitRow = FLEET_START_ROW + 2;
  private limitTarget = FLEET_START_ROW + 2;
  private fireCd = 0;
  shake = 0;
  flash = 0;
  clearing: Clearing | null = null;
  waveBanner = 0; // s restantes do banner "WAVE n"
  time = 0;

  // entrada / gravidade
  private held = { left: false, right: false, down: false };
  private lastH: "left" | "right" | null = null;
  private dasT = 0;
  private softT = 0;
  private gravT = 0;
  private lockT = 0;
  private lockResets = 0;

  private events: GameEvent[] = [];
  private rand: () => number;

  constructor(rand: () => number = Math.random) {
    this.rand = rand;
    this.reset();
  }

  private freshStats(): Stats {
    return {
      invaders: 0,
      tetrises: 0,
      maxCombo: 0,
      hardDrops: 0,
      shotsFired: 0,
      shotsHit: 0,
      lines: 0,
      waves: 0,
      ufos: 0,
      time: 0,
    };
  }

  reset() {
    this.grid = Array.from({ length: ROWS }, () =>
      new Array<number>(COLS).fill(0),
    );
    this.piece = null;
    this.holdType = null;
    this.canHold = true;
    this.queue = [];
    this.bag = [];
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.b2b = false;
    this.shields = START_SHIELDS;
    this.over = false;
    this.cause = null;
    this.stats = this.freshStats();
    this.wave = 1;
    this.invaders = [];
    this.bullets = [];
    this.ufo = null;
    this.ufoT = rnd(UFO_EVERY[0], UFO_EVERY[1], this.rand);
    this.shots = [];
    this.particles = [];
    this.floaters = [];
    this.rings = [];
    this.runFx = [];
    this.comboFx = [];
    this.glow = 0;
    this.slow = 0;
    this.fireCd = 0;
    this.shake = 0;
    this.flash = 0;
    this.clearing = null;
    this.time = 0;
    this.held = { left: false, right: false, down: false };
    this.lastH = null;
    this.gravT = 0;
    this.lockT = 0;
    this.lockResets = 0;
    this.events = [];
    this.fillQueue();
    this.spawnWave();
    this.spawnPiece();
  }

  // ─── API pública ───────────────────────────────────────────────────────────
  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  snapshot(): Snapshot {
    return {
      score: this.score,
      lines: this.lines,
      level: this.level,
      wave: this.wave,
      shields: this.shields,
      combo: this.combo,
      over: this.over,
      cause: this.cause,
      stats: { ...this.stats },
    };
  }

  press(a: Action) {
    if (this.over) return;
    switch (a) {
      case "left":
      case "right":
        this.held[a] = true;
        this.lastH = a;
        this.dasT = -DAS_DELAY;
        if (!this.clearing) this.move(a === "left" ? -1 : 1);
        break;
      case "down":
        this.held.down = true;
        this.softT = 0;
        break;
      case "cw":
        this.rotate(1);
        break;
      case "ccw":
        this.rotate(-1);
        break;
      case "hard":
        this.hardDrop();
        break;
      case "hold":
        this.doHold();
        break;
      case "fire":
        this.fire();
        break;
    }
  }

  release(a: Action) {
    if (a === "left" || a === "right") {
      this.held[a] = false;
      if (this.lastH === a) {
        const other = a === "left" ? "right" : "left";
        this.lastH = this.held[other] ? other : null;
        this.dasT = -DAS_DELAY;
      }
    } else if (a === "down") {
      this.held.down = false;
    }
  }

  /** Um passo lateral avulso (gestos de arrastar). */
  nudge(dx: -1 | 1) {
    if (!this.over && !this.clearing) this.move(dx);
  }

  /** Um passo de soft drop avulso (gestos de arrastar). */
  softDrop() {
    if (this.over || this.clearing) return;
    if (this.tryMove(0, 1)) this.score += 1;
  }

  releaseAll() {
    this.held = { left: false, right: false, down: false };
    this.lastH = null;
  }

  /** Continue pago: mantém score/onda/nível, abre espaço e devolve escudos. */
  continueRun() {
    if (!this.over) return;
    this.over = false;
    this.cause = null;
    this.shields = START_SHIELDS;
    // limpa a metade de cima da pilha para dar ar
    for (let r = 0; r < Math.floor(ROWS / 2); r++) this.grid[r].fill(0);
    this.bullets = [];
    this.oy = FLEET_START_ROW;
    this.fleetFreeze = 1.6;
    this.clearing = null;
    this.combo = -1;
    this.piece = null;
    this.releaseAll();
    this.spawnPiece();
    this.flash = 0.6;
    this.shake = 0.6;
    this.addFloater(COLS / 2, SKY + 6, "CONTINUE!", "#FFD700", 1.6, 18);
    this.events.push({ type: "continue" });
  }

  /** Linha de topo da pilha (0 = cheio). Usado para efeito de perigo. */
  stackTop(): number {
    for (let r = 0; r < ROWS; r++) if (this.grid[r].some(Boolean)) return r;
    return ROWS;
  }

  /** Invaders que o próximo hard drop vai acertar (para desenhar a mira). */
  aimTargets(): Invader[] {
    const p = this.piece;
    if (!p) return [];
    const out = new Set<Invader>();
    for (const [cx] of SHAPES[p.type][p.rot]) {
      const t = this.lowestInvaderAt(p.x + cx);
      if (t) out.add(t.inv);
    }
    return [...out];
  }

  ghostY(): number {
    const p = this.piece;
    if (!p) return 0;
    let y = p.y;
    while (!this.collides(p.type, p.rot, p.x, y + 1)) y++;
    return y;
  }

  // ─── Loop ──────────────────────────────────────────────────────────────────
  update(dtRaw: number) {
    if (this.slow > 0) {
      this.slow = Math.max(0, this.slow - dtRaw);
      dtRaw *= 0.4;
    }
    // sub-passos para manter a física estável em quedas de FPS
    let dt = Math.min(dtRaw, 0.1);
    while (dt > 0) {
      const step = Math.min(dt, 1 / 60);
      this.step(step);
      dt -= step;
    }
  }

  private step(dt: number) {
    this.updateEffects(dt);
    if (this.over) return;

    this.time += dt;
    this.stats.time += dt;

    if (this.clearing) {
      this.clearing.t += dt;
      if (this.clearing.t >= LINE_CLEAR_TIME) this.finishClear();
      return;
    }

    this.fireCd = Math.max(0, this.fireCd - dt);
    this.updateInput(dt);
    this.updateGravity(dt);
    this.updateFleet(dt);
    this.updateBullets(dt);
    this.updateUfo(dt);
  }

  private updateEffects(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.waveBanner = Math.max(0, this.waveBanner - dt);
    for (const i of this.invaders) i.flash = Math.max(0, i.flash - dt);
    for (const s of this.shots) s.life -= dt;
    this.shots = this.shots.filter((s) => s.life > 0);
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= dt * 1.1;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    this.glow = Math.max(0, this.glow - dt * 0.7);
    for (const f of this.runFx) f.life -= dt;
    this.runFx = this.runFx.filter((f) => f.life > 0);
    for (const f of this.comboFx) f.life -= dt;
    this.comboFx = this.comboFx.filter((f) => f.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
  }

  // ─── Entrada / gravidade ───────────────────────────────────────────────────
  private updateInput(dt: number) {
    if (!this.piece) return;
    if (this.lastH && this.held[this.lastH]) {
      this.dasT += dt;
      while (this.dasT >= DAS_RATE) {
        this.dasT -= DAS_RATE;
        if (!this.move(this.lastH === "left" ? -1 : 1)) break;
      }
    }
    if (this.held.down) {
      this.softT += dt;
      while (this.softT >= SOFT_DROP_RATE) {
        this.softT -= SOFT_DROP_RATE;
        if (this.tryMove(0, 1)) this.score += 1;
        else break;
      }
    }
  }

  private updateGravity(dt: number) {
    const p = this.piece;
    if (!p) return;
    const grounded = this.collides(p.type, p.rot, p.x, p.y + 1);
    if (grounded) {
      this.lockT += dt;
      if (this.lockT >= LOCK_DELAY) this.lockPiece(false);
      return;
    }
    this.lockT = 0;
    this.gravT += dt;
    const g = gravity(this.level);
    while (this.gravT >= g) {
      this.gravT -= g;
      if (!this.tryMove(0, 1)) break;
    }
  }

  // ─── Peças ─────────────────────────────────────────────────────────────────
  private fillQueue() {
    while (this.queue.length < NEXT_COUNT + 7) {
      if (this.bag.length === 0) this.bag = makeBag(this.rand);
      this.queue.push(this.bag.pop() as PieceType);
    }
  }

  private spawnPiece(type?: PieceType) {
    this.fillQueue();
    const t = type ?? (this.queue.shift() as PieceType);
    this.fillQueue();
    const { x, y } = spawnPosition(t);
    this.piece = { type: t, rot: 0, x, y };
    this.gravT = 0;
    this.lockT = 0;
    this.lockResets = 0;
    if (this.collides(t, 0, x, y)) {
      if (!this.rescue() || this.collides(t, 0, x, y)) this.endGame("topout");
    }
  }

  private collides(
    type: PieceType,
    rot: number,
    x: number,
    y: number,
  ): boolean {
    for (const [cx, cy] of SHAPES[type][rot]) {
      const gx = x + cx;
      const gy = y + cy;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && this.grid[gy][gx]) return true;
    }
    return false;
  }

  private tryMove(dx: number, dy: number): boolean {
    const p = this.piece;
    if (!p || this.collides(p.type, p.rot, p.x + dx, p.y + dy)) return false;
    p.x += dx;
    p.y += dy;
    if (dy > 0) this.lockT = 0;
    return true;
  }

  private bumpLock() {
    const p = this.piece;
    if (
      p &&
      this.collides(p.type, p.rot, p.x, p.y + 1) &&
      this.lockResets < MAX_LOCK_RESETS
    ) {
      this.lockT = 0;
      this.lockResets++;
    }
  }

  private move(dx: number): boolean {
    if (!this.tryMove(dx, 0)) return false;
    this.bumpLock();
    this.events.push({ type: "move" });
    return true;
  }

  private rotate(dir: 1 | -1) {
    const p = this.piece;
    if (!p || this.clearing) return;
    const to = (p.rot + (dir === 1 ? 1 : 3)) % 4;
    for (const [kx, ky] of getKicks(p.type, p.rot, to)) {
      if (!this.collides(p.type, to, p.x + kx, p.y + ky)) {
        p.x += kx;
        p.y += ky;
        p.rot = to;
        this.bumpLock();
        this.events.push({ type: "rotate" });
        return;
      }
    }
  }

  /** Tiro independente: sai das colunas da peça atual, atravessa os blocos, a peça NÃO cai. */
  private fire() {
    const p = this.piece;
    if (!p || this.clearing || this.fireCd > 0) return;
    this.fireCd = FIRE_COOLDOWN;
    const cells = SHAPES[p.type][p.rot];
    const cols = [...new Set(cells.map(([cx]) => p.x + cx))];
    const top = Math.max(0, p.y + Math.min(...cells.map(([, cy]) => cy)));
    this.stats.shotsFired += cols.length;
    const hits = this.volley(cols, 1, SKY + top, false);
    this.events.push({ type: "shot", n: cols.length });
    this.shake = Math.max(this.shake, 0.08);
    if (hits >= 2) {
      const bonus = 100 * hits;
      this.score += bonus;
      this.addFloater(
        COLS / 2,
        SKY + 3,
        `MULTI x${hits}  +${bonus}`,
        "#22c55e",
        1.2,
        13,
      );
    }
  }

  /** Maior sequência horizontal do mesmo avatar numa linha (células vazias quebram). */
  private rowRunInfo(r: number): { len: number; start: number } {
    let best = { len: 0, start: 0 };
    let run = 0;
    for (let c = 0; c < COLS; c++) {
      const v = this.grid[r][c];
      if (
        v &&
        c > 0 &&
        this.grid[r][c - 1] &&
        avatarOf(v) === avatarOf(this.grid[r][c - 1])
      )
        run++;
      else run = v ? 1 : 0;
      if (run > best.len) best = { len: run, start: c - run + 1 };
    }
    return best;
  }

  private rowRun(r: number): number {
    return this.rowRunInfo(r).len;
  }

  /** Paga a diferença de bônus quando a maior sequência de uma linha cresce (sem farm). */
  private awardAvatar(rows: number[], before: Map<number, number>) {
    for (const r of rows) {
      const prev = before.get(r) ?? 0;
      const info = this.rowRunInfo(r);
      const now = info.len;
      const gain =
        (AVATAR_BONUS[Math.min(now, COLS)] ?? 0) -
        (AVATAR_BONUS[Math.min(prev, COLS)] ?? 0);
      if (gain <= 0) continue;
      const bonus = gain * this.level;
      this.score += bonus;
      this.events.push({ type: "match", n: now, bonus });
      if (prev < MEMO_RUN && now >= MEMO_RUN)
        this.events.push({ type: "memo" }); // 4 iguais = desafio RASTA MEMO
      this.runFx.push({
        row: r,
        start: info.start,
        len: now,
        life: 1.1,
        max: 1.1,
      });
      this.glow = Math.max(this.glow, Math.min(1, 0.5 + now * 0.06));
      this.rings.push({
        x: info.start + now / 2,
        y: SKY + r + 0.5,
        life: 0.6,
        max: 0.6,
        color: "#f472b6",
        size: 1.5 + now * 0.5,
      });
      this.addFloater(
        COLS / 2,
        SKY + r - 0.5,
        `AVATAR x${now}  +${bonus}`,
        "#f472b6",
        1.5,
        12,
      );
      this.burst(COLS / 2, SKY + r + 0.5, "#f472b6", 14, 4);
    }
  }

  private doHold() {
    const p = this.piece;
    if (!p || !this.canHold || this.clearing) return;
    const prev = this.holdType;
    this.holdType = p.type;
    this.canHold = false;
    this.events.push({ type: "hold" });
    this.spawnPiece(prev ?? undefined);
  }

  private hardDrop() {
    const p = this.piece;
    if (!p || this.clearing) return;
    const y = this.ghostY();
    this.score += (y - p.y) * 2;
    p.y = y;
    this.stats.hardDrops++;
    this.shake = Math.max(this.shake, 0.18);
    this.events.push({ type: "hard" });
    this.lockPiece(true);
  }

  private lockPiece(hard: boolean) {
    const p = this.piece;
    if (!p) return;
    const cols = new Set<number>();
    const before = new Map<number, number>();
    for (const [, cy] of SHAPES[p.type][p.rot]) {
      const gy = p.y + cy;
      if (gy >= 0 && !before.has(gy)) before.set(gy, this.rowRun(gy));
    }
    let topRow = ROWS;
    for (const [cx, cy] of SHAPES[p.type][p.rot]) {
      const gx = p.x + cx;
      const gy = p.y + cy;
      if (gy < 0) {
        this.piece = null;
        if (this.rescue()) {
          this.canHold = true;
          this.spawnPiece();
        } else this.endGame("topout");
        return;
      }
      this.grid[gy][gx] = cellValue(p.type);
      cols.add(gx);
      topRow = Math.min(topRow, gy);
      this.burst(gx + 0.5, SKY + gy + 0.5, "#ffffff", 2, 2.5);
    }
    this.piece = null;
    this.canHold = true;
    this.awardAvatar([...before.keys()], before);
    this.events.push({ type: "land" });

    // HARD DROP = tiro
    if (hard) {
      this.stats.shotsFired += cols.size;
      const hits = this.volley([...cols], 1, SKY + topRow, false);
      this.events.push({ type: "shot", n: cols.size });
      if (hits >= 2) {
        const bonus = 100 * hits;
        this.score += bonus;
        this.events.push({ type: "multi", n: hits });
        this.addFloater(
          COLS / 2,
          SKY + 3,
          `MULTI x${hits}  +${bonus}`,
          "#22c55e",
          1.2,
          13,
        );
      }
    }

    this.evaluateLines();
  }

  // ─── Linhas ────────────────────────────────────────────────────────────────
  private evaluateLines() {
    const full: number[] = [];
    for (let r = 0; r < ROWS; r++)
      if (this.grid[r].every(Boolean)) full.push(r);

    if (full.length === 0) {
      this.combo = -1;
      this.afterResolve();
      return;
    }

    const n = full.length;
    this.combo = Math.min(this.combo + 1, 9); // limite: 10X
    this.glow = Math.max(this.glow, Math.min(1, 0.35 + this.combo * 0.2));
    this.comboFx.push({ n: this.combo + 1, life: 1.2, max: 1.2 });
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
    this.stats.lines += n;
    let pts = LINE_SCORE[Math.min(n, 4)] * this.level;
    const tetris = n >= 4;
    if (tetris) {
      this.stats.tetrises++;
      if (this.b2b) pts = Math.floor(pts * 1.5);
      this.b2b = true;
    } else {
      this.b2b = false;
    }
    if (this.combo > 0) pts += 50 * this.combo * this.level;
    this.score += pts;

    const before = this.level;
    this.lines += n;
    this.level = 1 + Math.floor(this.lines / 10);
    if (this.level > before) {
      this.events.push({ type: "level", level: this.level });
      this.addFloater(
        COLS / 2,
        SKY + 8,
        `LEVEL ${this.level}`,
        "#FFD700",
        1.4,
        15,
      );
    }

    // rajada: cada linha acerta todas as colunas
    const allCols = Array.from({ length: COLS }, (_, i) => i);
    this.volley(allCols, n, SKY + full[0], true);

    const label = tetris
      ? "TETRIS!"
      : n === 3
        ? "TRIPLE"
        : n === 2
          ? "DOUBLE"
          : "SINGLE";
    const midRow = SKY + full[Math.floor(full.length / 2)];
    this.addFloater(
      COLS / 2,
      midRow,
      `${label} +${pts}`,
      tetris ? "#FFD700" : "#ffffff",
      1.3,
      tetris ? 17 : 13,
    );
    if (this.combo > 0)
      this.addFloater(
        COLS / 2,
        midRow + 1.1,
        `COMBO x${this.combo}`,
        "#f472b6",
        1.2,
        12,
      );
    if (tetris && this.stats.tetrises > 0)
      this.flash = Math.max(this.flash, 0.7);
    this.shake = Math.max(this.shake, tetris ? 0.9 : 0.4);

    for (const r of full)
      for (let c = 0; c < COLS; c++)
        this.burst(c + 0.5, SKY + r + 0.5, "#FFD700", 2, 4);

    this.events.push({ type: "clear", lines: n, combo: this.combo });
    if (tetris) this.slow = 0.5;
    this.events.push({ type: "tetris" });
    this.clearing = { rows: full, t: 0 };
  }

  private finishClear() {
    const c = this.clearing;
    if (!c) return;
    const rows = new Set(c.rows);
    const kept = this.grid.filter((_, r) => !rows.has(r));
    const fresh = Array.from({ length: c.rows.length }, () =>
      new Array<number>(COLS).fill(0),
    );
    this.grid = [...fresh, ...kept];
    this.clearing = null;
    this.afterResolve();
  }

  /** Depois de travar (e limpar): decide o que vem a seguir. */
  private afterResolve() {
    if (this.over) return;
    if (this.touchedInvaders()) return;
    this.updateLimit();
    this.checkWaveClear();
    this.spawnPiece();
  }

  /** Pilha chegou na zona LIMIT = encostou nos invaders → game over (ou gasta um escudo). */
  /**
   * Move o LIMIT em direção ao alvo (fileira de baixo da frota). Se a frota cresce, o limit só
   * desce até onde a pilha atual permite, para nunca causar game over de repente.
   */
  private updateLimit() {
    if (this.limitTarget < this.limitRow) this.limitRow = this.limitTarget;
    else
      this.limitRow = Math.max(
        this.limitRow,
        Math.min(this.limitTarget, this.stackTop()),
      );
  }

  private touchedInvaders(): boolean {
    if (this.stackTop() >= this.limitRow) return false;
    this.addFloater(
      COLS / 2,
      SKY + this.limitRow,
      "INVADERS TOUCHED YOU!",
      "#ef4444",
      1.6,
      12,
    );
    if (this.rescue()) return false;
    this.endGame("invaded");
    return true;
  }

  /** Bônus externo (ex.: desafio RASTA MEMO). */
  addBonus(points: number, shield = false) {
    if (this.over) return;
    this.score += points;
    if (shield && this.shields < MAX_SHIELDS) this.shields++;
    this.flash = 0.5;
    this.addFloater(
      COLS / 2,
      SKY + 5,
      `RASTA MEMO +${points}`,
      "#FFD700",
      1.8,
      14,
    );
    this.events.push({ type: "waveclear" });
  }

  // ─── Combate ───────────────────────────────────────────────────────────────
  /**
   * Dispara `hits` acertos em cada coluna. Cada acerto pega o invader mais baixo
   * da coluna (ou o UFO, se não houver invader). Retorna o número de abates.
   */
  private volley(
    cols: number[],
    hits: number,
    fromWorldRow: number,
    sweep: boolean,
  ): number {
    let kills = 0;
    for (const col of cols) {
      let reached = 1;
      let hit = false;
      for (let h = 0; h < hits; h++) {
        const target = this.lowestInvaderAt(col);
        if (target) {
          hit = true;
          reached = target.wy + target.inv.h;
          kills += this.damage(target.inv, 1) ? 1 : 0;
          continue;
        }
        if (this.ufo && col >= this.ufo.x - 0.5 && col < this.ufo.x + 2.5) {
          hit = true;
          reached = 1;
          this.killUfo();
          kills++;
          break;
        }
        break;
      }
      this.shots.push({
        x: col + 0.5,
        y0: fromWorldRow,
        y1: hit ? reached : 0,
        life: sweep ? 0.35 : 0.22,
        color: sweep ? "#FFD700" : "#22c55e",
        wide: sweep,
      });
      if (hit) this.stats.shotsHit++;
    }
    return kills;
  }

  private lowestInvaderAt(col: number): { inv: Invader; wy: number } | null {
    let best: { inv: Invader; wy: number } | null = null;
    for (const inv of this.invaders) {
      const wx = this.ox + inv.x;
      // hitbox generosa: o invader "cobre" também a coluna vazia ao lado (aim assist)
      const reach = inv.w === 1 ? INVADER_SPACING : inv.w;
      if (col < wx || col >= wx + reach) continue;
      const wy = this.oy + inv.y;
      if (!best || wy > best.wy) best = { inv, wy };
    }
    return best;
  }

  /** Aplica dano; retorna true se o invader morreu. */
  private damage(inv: Invader, dmg: number): boolean {
    inv.hp -= dmg;
    inv.flash = 0.12;
    const cx = this.ox + inv.x + inv.w / 2;
    const cy = this.oy + inv.y + inv.h / 2;
    if (inv.hp > 0) {
      this.events.push({ type: "hit" });
      this.burst(cx, cy, "#ffffff", 4, 3);
      return false;
    }
    const boss = inv.type === 3;
    const base = [100, 150, 200, 1500][inv.type] ?? 100;
    const pts = Math.round(base * (1 + (this.wave - 1) * 0.1));
    this.score += pts;
    this.stats.invaders++;
    this.invaders = this.invaders.filter((i) => i !== inv);
    const color = boss
      ? "#f472b6"
      : (["#ef4444", "#FFD700", "#22c55e"][inv.type] ?? "#fff");
    this.burst(cx, cy, color, boss ? 60 : 16, boss ? 9 : 5);
    this.addFloater(cx, cy, `+${pts}`, color, 0.9, boss ? 16 : 11);
    if (boss) this.slow = 0.7;
    this.rings.push({
      x: cx,
      y: cy,
      life: boss ? 0.8 : 0.45,
      max: boss ? 0.8 : 0.45,
      color,
      size: boss ? 5 : 2.2,
    });
    this.events.push({ type: "kill", boss });
    if (boss) {
      this.shake = 1;
      this.flash = 0.8;
    }
    this.checkWaveClear();
    return true;
  }

  private killUfo() {
    const u = this.ufo;
    if (!u) return;
    this.ufo = null;
    this.stats.ufos++;
    const pts = 500;
    this.score += pts;
    let bonus = "";
    if (this.shields < MAX_SHIELDS && this.rand() < 0.6) {
      this.shields++;
      bonus = " +SHIELD";
    } else {
      this.score += 1000;
      bonus = " +1000";
    }
    this.burst(u.x + 1, 0.5, "#f472b6", 30, 6);
    this.addFloater(COLS / 2, 1.5, `UFO! +${pts}${bonus}`, "#f472b6", 1.4, 13);
    this.events.push({ type: "ufokill" });
  }

  private checkWaveClear() {
    if (this.over || this.invaders.length > 0 || this.waveDelay > 0) return;
    const bonus = 500 * this.wave;
    this.score += bonus;
    this.stats.waves++;
    this.wave++;
    this.bullets = [];
    if (this.shields < MAX_SHIELDS) this.shields++;
    this.waveDelay = 1.6;
    this.addFloater(
      COLS / 2,
      SKY + 2,
      `WAVE CLEAR +${bonus}`,
      "#22c55e",
      1.6,
      14,
    );
    this.events.push({ type: "waveclear" });
  }

  // ─── Frota ─────────────────────────────────────────────────────────────────
  private spawnWave() {
    this.invaders = [];
    this.dir = 1;
    this.oy = FLEET_START_ROW;
    this.stepT = 0;
    this.fireT = 3;
    this.fleetFreeze = 1.2;
    this.waveDelay = 0;
    this.waveBanner = 1.8;
    const w = this.wave;
    if (w % BOSS_EVERY === 0) {
      const hp = 8 + w;
      this.invaders.push({
        id: this.nextId++,
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        type: 3,
        hp,
        maxHp: hp,
        flash: 0,
      });
      this.ox = Math.floor((COLS - 4) / 2);
    } else {
      const rows = fleetRows(w);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < FLEET_PER_ROW; c++) {
          const hp =
            Math.min(3, 1 + Math.floor((w - 1) / 6)) +
            (w >= 4 && r === 0 ? 1 : 0);
          this.invaders.push({
            id: this.nextId++,
            x: c * INVADER_SPACING,
            y: r,
            w: 1,
            h: 1,
            type: r % 3,
            hp,
            maxHp: hp,
            flash: 0,
          });
        }
      }
      this.ox = Math.floor(
        (COLS - ((FLEET_PER_ROW - 1) * INVADER_SPACING + 1)) / 2,
      );
    }
    // LIMIT colado na fileira de baixo da frota
    const bottom = this.invaders.reduce((m, i) => Math.max(m, i.y + i.h), 0);
    this.limitTarget = this.oy + bottom;
    this.updateLimit();
    this.events.push({ type: "wave", wave: w });
  }

  private fleetBounds() {
    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const i of this.invaders) {
      minX = Math.min(minX, i.x);
      maxX = Math.max(maxX, i.x + i.w);
      maxY = Math.max(maxY, i.y + i.h - 1);
    }
    return { minX, maxX, maxY };
  }

  private maxInvaders() {
    return this.wave % BOSS_EVERY === 0
      ? 1
      : fleetRows(this.wave) * FLEET_PER_ROW;
  }

  private updateFleet(dt: number) {
    if (this.waveDelay > 0) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) this.spawnWave();
      return;
    }
    if (this.invaders.length === 0) return;
    if (this.fleetFreeze > 0) {
      this.fleetFreeze -= dt;
      return;
    }

    // passo da marcha
    const alive = this.invaders.length / this.maxInvaders();
    this.stepT += dt;
    const interval = fleetStepInterval(
      this.wave,
      this.wave % BOSS_EVERY === 0 ? 1 : alive,
    );
    if (this.stepT >= interval) {
      this.stepT = 0;
      this.animFrame ^= 1;
      const { minX, maxX } = this.fleetBounds();
      const nx = this.ox + this.dir;
      if (nx + minX < 0 || nx + maxX > COLS) {
        this.dir = this.dir === 1 ? -1 : 1;
      } else {
        this.ox = nx;
      }
    }

    // tiro dos invaders
    this.fireT -= dt;
    if (this.fireT <= 0 && this.invaders.length > 0) {
      this.fireT = fleetFireInterval(this.level) * rnd(0.7, 1.3, this.rand);
      this.fleetFire();
    }
  }

  private fleetFire() {
    this.events.push({ type: "invfire" });
    const boss = this.invaders.find((i) => i.type === 3);
    if (boss) {
      const n = 1 + Math.floor(this.rand() * 2);
      for (let k = 0; k < n; k++) {
        const col = this.ox + boss.x + Math.floor(this.rand() * boss.w);
        this.bullets.push({ x: col, y: this.oy + boss.y + boss.h });
      }
      return;
    }
    // atiradores = invader mais baixo de cada coluna
    const byCol = new Map<number, Invader>();
    for (const inv of this.invaders) {
      const cur = byCol.get(inv.x);
      if (!cur || inv.y > cur.y) byCol.set(inv.x, inv);
    }
    const shooters = [...byCol.values()];
    const s = shooters[Math.floor(this.rand() * shooters.length)];
    if (!s) return;
    this.bullets.push({ x: this.ox + s.x, y: this.oy + s.y + 1 });
  }

  /**
   * Pilha estourou o topo: gasta um ESCUDO para limpar a parte de cima e continuar.
   * Sem escudo = game over. Retorna true se foi salvo.
   */
  private rescue(): boolean {
    if (this.shields <= 0) return false;
    this.shields--;
    for (let r = 0; r < Math.floor(ROWS / 2) - 1; r++) this.grid[r].fill(0);
    this.bullets = [];
    this.shake = 1;
    this.flash = 0.9;
    this.slow = 0.5;
    this.addFloater(
      COLS / 2,
      SKY + 4,
      this.shields > 0 ? "SHIELD SAVED YOU!" : "LAST SHIELD USED!",
      "#60a5fa",
      1.6,
      13,
    );
    this.events.push({ type: "shield", shields: this.shields });
    return true;
  }

  // ─── Balas dos invaders ────────────────────────────────────────────────────
  private pieceAt(col: number, row: number): boolean {
    const p = this.piece;
    if (!p) return false;
    return SHAPES[p.type][p.rot].some(
      ([cx, cy]) => p.x + cx === col && p.y + cy === row,
    );
  }

  private updateBullets(dt: number) {
    const speed = bulletSpeed(this.level);
    const next: Bullet[] = [];
    let closedRow = false;
    for (const b of this.bullets) {
      const newY = b.y + speed * dt;
      let alive = true;
      for (let r = Math.floor(b.y) + 1; r <= Math.floor(newY); r++) {
        const br = r - SKY;
        if (br < 0) continue;
        if (this.pieceAt(b.x, br)) {
          // a peça ativa serve de escudo
          this.burst(b.x + 0.5, r, "#ef4444", 6, 3);
          this.events.push({ type: "absorb" });
          alive = false;
          break;
        }
        if (br >= ROWS || this.grid[br][b.x]) {
          alive = false;
          const land = br - 1;
          if (land < 0) {
            if (this.rescue()) break;
            this.endGame("topout");
            this.bullets = [];
            return;
          }
          const prevRun = new Map([[land, this.rowRun(land)]]);
          this.grid[land][b.x] = GARBAGE + 1 + Math.floor(this.rand() * 7);
          this.awardAvatar([land], prevRun);
          this.burst(b.x + 0.5, SKY + land + 0.5, "#ef4444", 8, 3);
          this.events.push({ type: "garbage" });
          this.shake = Math.max(this.shake, 0.25);
          if (this.grid[land].every(Boolean)) closedRow = true;
          break;
        }
      }
      if (alive) next.push({ x: b.x, y: newY });
    }
    this.bullets = next;
    if (closedRow) this.friendlyFire();
    closedRow = false;
    if (this.touchedInvaders()) return;
    // lixo pode fechar uma linha: "fogo amigo" — limpa sem combo
    if (closedRow) this.friendlyFire();
  }

  private friendlyFire() {
    const full: number[] = [];
    for (let r = 0; r < ROWS; r++)
      if (this.grid[r].every(Boolean)) full.push(r);
    if (full.length === 0) return;
    const rows = new Set(full);
    const kept = this.grid.filter((_, r) => !rows.has(r));
    const fresh = Array.from({ length: full.length }, () =>
      new Array<number>(COLS).fill(0),
    );
    this.grid = [...fresh, ...kept];
    // se a peça ativa ficou presa dentro de blocos, empurra para cima
    const p = this.piece;
    if (p) {
      let guard = 0;
      while (this.collides(p.type, p.rot, p.x, p.y) && guard++ < ROWS) p.y--;
    }
    const pts = 50 * full.length * this.level;
    this.score += pts;
    this.lines += full.length;
    this.stats.lines += full.length;
    this.addFloater(
      COLS / 2,
      SKY + full[0],
      `FRIENDLY FIRE +${pts}`,
      "#22c55e",
      1.2,
      11,
    );
    for (const r of full)
      for (let c = 0; c < COLS; c++)
        this.burst(c + 0.5, SKY + r + 0.5, "#22c55e", 1, 3);
    this.events.push({ type: "clear", lines: full.length, combo: 0 });
  }

  // ─── UFO ───────────────────────────────────────────────────────────────────
  private updateUfo(dt: number) {
    if (this.ufo) {
      this.ufo.x += this.ufo.dir * UFO_SPEED * dt;
      if (this.ufo.x < -2.5 || this.ufo.x > COLS + 0.5) this.ufo = null;
      return;
    }
    if (this.invaders.length === 0) return;
    this.ufoT -= dt;
    if (this.ufoT <= 0) {
      this.ufoT = rnd(UFO_EVERY[0], UFO_EVERY[1], this.rand);
      const dir: 1 | -1 = this.rand() < 0.5 ? 1 : -1;
      this.ufo = { x: dir === 1 ? -2 : COLS, dir };
      this.events.push({ type: "ufo" });
    }
  }

  // ─── Fim de jogo / efeitos ────────────────────────────────────────────────
  private endGame(cause: "topout" | "invaded") {
    if (this.over) return;
    this.over = true;
    this.cause = cause;
    this.releaseAll();
    this.shake = 1;
    this.flash = 0.9;
    this.events.push({ type: "gameover" });
  }

  private burst(x: number, y: number, color: string, n: number, speed: number) {
    for (let i = 0; i < n; i++) {
      const a = this.rand() * Math.PI * 2;
      const s = speed * (0.35 + this.rand() * 0.65);
      const life = 0.35 + this.rand() * 0.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.3,
        life,
        max: life,
        color,
        size: 0.1 + this.rand() * 0.14,
        gravity: 9,
      });
    }
    if (this.particles.length > 500)
      this.particles.splice(0, this.particles.length - 500);
  }

  private addFloater(
    x: number,
    y: number,
    text: string,
    color: string,
    life: number,
    size: number,
  ) {
    this.floaters.push({ x, y, text, color, life, max: life, size });
    if (this.floaters.length > 12) this.floaters.shift();
  }
}
