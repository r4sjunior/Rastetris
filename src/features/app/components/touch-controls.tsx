"use client";
// Controles de toque: ◀ ▼ ▶ à esquerda, HOLD / GIRAR / FIRE (hard drop = tiro) à direita.

import { memo, useRef, useState } from "react";
import type { Action, Engine } from "@/features/app/engine/engine";
import type { Sfx } from "@/features/app/engine/sfx";

const F = "'Press Start 2P', monospace";

type BtnProps = {
  engine: Engine;
  sfx: Sfx;
  action: Action;
  label: string;
  sub?: string;
  size?: number;
  color?: string;
  glow?: string;
  disabled?: boolean;
};

function PadButton({
  engine,
  sfx,
  action,
  label,
  sub,
  size = 56,
  color = "#22c55e",
  glow,
  disabled,
}: BtnProps) {
  const [on, setOn] = useState(false);
  const pointer = useRef<number | null>(null);

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    if (disabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointer.current = e.pointerId;
    setOn(true);
    sfx.unlock();
    engine.press(action);
  };
  const up = (e: React.PointerEvent) => {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    setOn(false);
    engine.release(action);
  };

  return (
    <button
      type="button"
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={sub ?? label}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 14,
        border: `2px solid ${color}`,
        background: on
          ? `linear-gradient(180deg, ${color}, ${color}99)`
          : "linear-gradient(180deg, rgba(20,40,20,0.9), rgba(5,15,5,0.95))",
        color: on ? "#000" : color,
        boxShadow: on
          ? `0 0 18px ${glow ?? color}`
          : `0 3px 0 rgba(0,0,0,0.6), 0 0 8px ${glow ?? color}33`,
        transform: on ? "translateY(2px) scale(0.96)" : "none",
        transition: "transform 60ms, box-shadow 60ms, background 60ms",
        fontFamily: F,
        fontSize: size > 60 ? 10 : 15,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        opacity: disabled ? 0.4 : 1,
        cursor: "pointer",
      }}
    >
      <span style={{ lineHeight: 1 }}>{label}</span>
      {sub && <span style={{ fontSize: 6, opacity: 0.85 }}>{sub}</span>}
    </button>
  );
}

function TouchControlsImpl({
  engine,
  sfx,
  disabled,
  compact,
}: {
  engine: Engine;
  sfx: Sfx;
  disabled?: boolean;
  compact?: boolean;
}) {
  const sc = compact ? 0.8 : 1;
  const common = { engine, sfx, disabled };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
        padding: "6px 8px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", gap: 5 }}>
        <PadButton
          {...common}
          action="left"
          label="◀"
          size={Math.round(48 * sc)}
        />
        <PadButton
          {...common}
          action="down"
          label="▼"
          size={Math.round(48 * sc)}
          color="#FFD700"
        />
        <PadButton
          {...common}
          action="right"
          label="▶"
          size={Math.round(48 * sc)}
        />
      </div>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <PadButton
          {...common}
          action="hold"
          label="⇄"
          sub="HOLD"
          size={Math.round(40 * sc)}
          color="#3b82f6"
        />
        <PadButton
          {...common}
          action="cw"
          label="⟳"
          size={Math.round(44 * sc)}
          color="#a855f7"
        />
        <PadButton
          {...common}
          action="hard"
          label="⤓"
          sub="DROP"
          size={Math.round(50 * sc)}
          color="#FFD700"
        />
        <PadButton
          {...common}
          action="fire"
          label="FIRE"
          sub="LASER"
          size={Math.round(68 * sc)}
          color="#ef4444"
          glow="#ef4444"
        />
      </div>
    </div>
  );
}

export const TouchControls = memo(TouchControlsImpl);
