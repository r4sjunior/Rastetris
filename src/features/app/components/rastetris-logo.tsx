"use client";
// Logo em texto pixel, cada letra numa cor rasta (vermelho / dourado / verde) com glow.

const COLORS = ["#ef4444", "#FFD700", "#22c55e"];

export function RastetrisLogo({
  size = 14,
  glow = true,
}: {
  size?: number;
  glow?: boolean;
}) {
  return (
    <span
      aria-label="RASTETRIS"
      style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: size,
        letterSpacing: size > 20 ? 3 : 1,
        whiteSpace: "nowrap",
        display: "inline-flex",
      }}
    >
      {"RASTETRIS".split("").map((ch, i) => (
        <span
          key={i}
          style={{
            color: COLORS[i % 3],
            textShadow: glow
              ? `0 0 ${size * 0.6}px ${COLORS[i % 3]}99, 0 ${Math.max(2, size / 8)}px 0 rgba(0,0,0,0.85)`
              : "none",
          }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
