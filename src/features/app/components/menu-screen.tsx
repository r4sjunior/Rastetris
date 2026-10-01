"use client";
// Tela inicial: o bot joga sozinho atrás (modo attract) e este painel fica por cima.

import { RastetrisLogo } from "@/features/app/components/rastetris-logo";

const F = "'Press Start 2P', monospace";

type Props = {
  best: number;
  onPlay: () => void;
  onLeaderboard: () => void;
};

const HOWTO: { icon: string; title: string; text: string; color: string }[] = [
  {
    icon: "🔥",
    title: "FIRE = LASER",
    text: "Lasers pierce every block and hit the invaders. FIRE shoots without dropping!",
    color: "#ef4444",
  },
  {
    icon: "🧱",
    title: "CLEAR LINES = SWEEP",
    text: "Every cleared line hits ALL columns. 4 lines = total wipeout.",
    color: "#FFD700",
  },
  {
    icon: "🛡️",
    title: "AVATAR MATCH",
    text: "Line up 4 same avatars for BONUS and RASTA MEMO! Never touch the invaders!",
    color: "#22c55e",
  },
];

export function MenuScreen({ best, onPlay, onLeaderboard }: Props) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 px-4"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(0,0,0,0.55), rgba(0,0,0,0.82))",
        backdropFilter: "blur(1.5px)",
      }}
    >
      <div
        style={{
          animation: "rt-float 3s ease-in-out infinite",
          textAlign: "center",
        }}
      >
        <RastetrisLogo size={22} />
        <div
          style={{
            fontFamily: F,
            fontSize: 7,
            color: "#a3c4a3",
            marginTop: 10,
            letterSpacing: 1,
          }}
        >
          TETRIS <span style={{ color: "#FFD700" }}>×</span> SPACE INVADERS
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          width: "100%",
          maxWidth: 320,
        }}
      >
        {HOWTO.map((h) => (
          <div
            key={h.title}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              background: "rgba(0,0,0,0.55)",
              border: `1px solid ${h.color}66`,
              borderLeft: `3px solid ${h.color}`,
              borderRadius: 8,
              padding: "7px 9px",
            }}
          >
            <span style={{ fontSize: 18 }}>{h.icon}</span>
            <div>
              <div style={{ fontFamily: F, fontSize: 7, color: h.color }}>
                {h.title}
              </div>
              <div
                style={{
                  fontFamily: F,
                  fontSize: 5.5,
                  color: "#c7d9c7",
                  marginTop: 4,
                  lineHeight: 1.7,
                }}
              >
                {h.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onPlay}
        style={{
          width: "100%",
          maxWidth: 320,
          minHeight: 52,
          borderRadius: 14,
          border: "2px solid #FFD700",
          background: "linear-gradient(135deg, #22c55e, #15803d)",
          color: "#fff",
          fontFamily: F,
          fontSize: 13,
          cursor: "pointer",
          animation: "rt-pulse 1.6s ease-in-out infinite",
          textShadow: "0 2px 0 rgba(0,0,0,0.6)",
        }}
      >
        ▶ PLAY
      </button>

      <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 320 }}>
        <button
          type="button"
          onClick={onLeaderboard}
          style={{
            flex: 1,
            minHeight: 44,
            borderRadius: 10,
            border: "1px solid #FFD700",
            background: "rgba(255,215,0,0.1)",
            color: "#FFD700",
            fontFamily: F,
            fontSize: 8,
            cursor: "pointer",
          }}
        >
          🏆 RANKING
        </button>
        <div
          style={{
            flex: 1,
            minHeight: 44,
            borderRadius: 10,
            border: "1px solid #2d5a2d",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <span style={{ fontFamily: F, fontSize: 6, color: "#22c55e" }}>
            YOUR BEST
          </span>
          <span style={{ fontFamily: F, fontSize: 10, color: "#FFD700" }}>
            {best.toLocaleString()}
          </span>
        </div>
      </div>

      <div
        style={{
          fontFamily: F,
          fontSize: 5.5,
          color: "#6b8f6b",
          textAlign: "center",
          lineHeight: 2,
        }}
      >
        ← → MOVE · ↓ SOFT · ↑ ROTATE · F FIRE · SPACE DROP · C HOLD · P PAUSE
        <br />
        TOUCH: TAP ROTATE · DRAG MOVE · FLICK ↓ DROP
      </div>
    </div>
  );
}
