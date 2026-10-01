"use client";
// Canvas do RASTETRIS: loop de jogo (rAF), teclado, gestos de toque e ponte de eventos → SFX/haptics.

import { memo, useEffect, useRef } from "react";
import { AttractBot } from "@/features/app/engine/bot";
import { CELL, VIEW_H, VIEW_W } from "@/features/app/engine/constants";
import type {
  Action,
  Engine,
  GameEvent,
  Snapshot,
} from "@/features/app/engine/engine";
import { render } from "@/features/app/engine/renderer";
import { Sfx, haptic } from "@/features/app/engine/sfx";

type Props = {
  engine: Engine;
  sfx: Sfx;
  /** true = partida valendo. false + attract = demo jogando sozinha. false sem attract = congelado. */
  running: boolean;
  attract: boolean;
  onHud: (s: Snapshot) => void;
  onGameOver: (s: Snapshot) => void;
  onTogglePause: () => void;
  onEvent?: (e: GameEvent) => void;
};

const KEYMAP: Record<string, Action> = {
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowUp: "cw",
  w: "cw",
  W: "cw",
  x: "cw",
  X: "cw",
  z: "ccw",
  Z: "ccw",
  Control: "ccw",
  " ": "hard",
  f: "fire",
  F: "fire",
  Enter: "fire",
  c: "hold",
  C: "hold",
  Shift: "hold",
};

function GameCanvasImpl({
  engine,
  sfx,
  running,
  attract,
  onHud,
  onGameOver,
  onTogglePause,
  onEvent,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // refs para o loop não precisar ser recriado a cada render
  const runningRef = useRef(running);
  const attractRef = useRef(attract);
  const cbRef = useRef({ onHud, onGameOver, onTogglePause, onEvent });
  useEffect(() => {
    runningRef.current = running;
    attractRef.current = attract;
    cbRef.current = { onHud, onGameOver, onTogglePause, onEvent };
  });

  // ─── Layout responsivo do canvas ────────────────────────────────────────────
  const scaleRef = useRef({ scale: 1, dpr: 1 });
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const { width, height } = wrap.getBoundingClientRect();
      if (width < 10 || height < 10) return;
      const scale = Math.min(width / VIEW_W, height / VIEW_H);
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.style.width = `${VIEW_W * scale}px`;
      canvas.style.height = `${VIEW_H * scale}px`;
      canvas.width = Math.round(VIEW_W * scale * dpr);
      canvas.height = Math.round(VIEW_H * scale * dpr);
      scaleRef.current = { scale, dpr };
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // ─── Loop principal ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    void document.fonts?.load("10px 'Press Start 2P'");

    const bot = new AttractBot();
    let raf = 0;
    let last = performance.now();
    let hudT = 0;
    let wasOver = false;

    const frame = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;

      if (runningRef.current) {
        engine.update(dt);
        for (const ev of engine.drainEvents()) {
          sfx.play(ev);
          haptic(ev);
          cbRef.current.onEvent?.(ev);
        }
        hudT += dt;
        if (hudT > 0.08) {
          hudT = 0;
          cbRef.current.onHud(engine.snapshot());
        }
        if (engine.over && !wasOver) {
          wasOver = true;
          cbRef.current.onHud(engine.snapshot());
          cbRef.current.onGameOver(engine.snapshot());
        }
        if (!engine.over) wasOver = false;
      } else if (attractRef.current) {
        bot.update(dt, engine);
        engine.update(dt);
        engine.drainEvents(); // demo é muda
        wasOver = false;
      } else {
        // pausado / game over: só efeitos visuais continuam (partículas, stars)
        if (engine.over)
          engine.update(dt); // deixa explosões/flash terminarem
        else engine.releaseAll();
        wasOver = engine.over;
      }

      const { scale, dpr } = scaleRef.current;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      render(ctx, engine, t / 1000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [engine, sfx]);

  // ─── Teclado ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        if (runningRef.current || !attractRef.current)
          cbRef.current.onTogglePause();
        return;
      }
      if (!runningRef.current) return;
      const a = KEYMAP[e.key];
      if (!a) return;
      e.preventDefault();
      if (e.repeat) return;
      sfx.unlock();
      engine.press(a);
    };
    const up = (e: KeyboardEvent) => {
      const a = KEYMAP[e.key];
      if (a) engine.release(a);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [engine, sfx]);

  // ─── Gestos no canvas ───────────────────────────────────────────────────────
  // tap = girar · arrastar ← → = mover · arrastar ↓ = soft drop · flick ↓ = tiro (hard drop) · flick ↑ = hold
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    ax: number;
    ay: number;
    t: number;
    moved: boolean;
  } | null>(null);

  const cellPx = () => CELL * scaleRef.current.scale;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!runningRef.current) return;
    sfx.unlock();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      ax: e.clientX,
      ay: e.clientY,
      t: performance.now(),
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId || !runningRef.current) return;
    const step = cellPx() * 0.9;
    while (e.clientX - g.ax >= step) {
      engine.nudge(1);
      g.ax += step;
      g.moved = true;
    }
    while (g.ax - e.clientX >= step) {
      engine.nudge(-1);
      g.ax -= step;
      g.moved = true;
    }
    while (e.clientY - g.ay >= step * 1.1) {
      engine.softDrop();
      g.ay += step * 1.1;
      g.moved = true;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.id !== e.pointerId || !runningRef.current) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    const dt = performance.now() - g.t;
    const cp = cellPx();
    if (!g.moved && Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 280) {
      engine.press("cw");
    } else if (dy > cp * 2.5 && dt < 260 && Math.abs(dx) < dy) {
      engine.press("hard");
    } else if (dy < -cp * 2.5 && dt < 320 && Math.abs(dx) < -dy) {
      engine.press("hold");
    }
  };

  return (
    <div
      ref={wrapRef}
      className="w-full h-full flex items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (gesture.current = null)}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          touchAction: "none",
          display: "block",
          WebkitTouchCallout: "none",
        }}
        aria-label="RASTETRIS game board"
      />
    </div>
  );
}

export const GameCanvas = memo(GameCanvasImpl);
