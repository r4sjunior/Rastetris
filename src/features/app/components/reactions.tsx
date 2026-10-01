"use client";
// Reações em jogo: popups estilo AAA com a arte dos CryptoRastas (carinhas do sprite sheet,
// BIG UP!, WGMI e Sound System) disparados pelos eventos do motor.

import { BOSS_EVERY } from "@/features/app/engine/constants";
import type { GameEvent } from "@/features/app/engine/engine";

const F = "'Press Start 2P', monospace";

// sprite sheet 680x320 → 5 colunas x 2 linhas
const FACE_W = 124;
const FACE_H = 125;
const FACE_X0 = 18; // margem do sprite sheet
const FACE_Y0 = 25;
export const FACE = {
  chill: 0,
  mindBlown: 1,
  grin: 2,
  sweatGrin: 3,
  relieved: 4,
  worried: 5,
  crying: 6,
  hearts: 7,
  stars: 8,
  dead: 9,
} as const;

type Art = "bigup" | "wgmi" | "soundsystem";

export type Reaction = {
  id: number;
  face?: number;
  art?: Art;
  title: string;
  sub?: string;
  color: string;
  priority: number;
  ms: number;
};

export type ReactionSpec = Omit<Reaction, "id">;

const ART_SRC: Record<Art, string> = {
  bigup: "/reactions/bigup.gif",
  wgmi: "/reactions/wgmi.gif",
  soundsystem: "/reactions/soundsystem.gif",
};

/** Traduz um evento do motor em uma reação (ou null se não merece popup). */
export function reactionFor(ev: GameEvent): ReactionSpec | null {
  switch (ev.type) {
    case "tetris":
      return {
        art: "soundsystem",
        title: "TETRIS!",
        sub: "SOUND SYSTEM ON!",
        color: "#FFD700",
        priority: 6,
        ms: 2200,
      };
    case "clear":
      if (ev.lines >= 4) return null; // o evento "tetris" cuida
      if (ev.combo >= 2)
        return {
          face: FACE.stars,
          title: `COMBO x${ev.combo}`,
          sub: "KEEP IT ROLLING",
          color: "#f472b6",
          priority: 3,
          ms: 1400,
        };
      if (ev.lines === 3)
        return {
          face: FACE.sweatGrin,
          title: "TRIPLE!",
          sub: "RESPECT, MON",
          color: "#22c55e",
          priority: 2,
          ms: 1300,
        };
      if (ev.lines === 2)
        return {
          face: FACE.grin,
          title: "DOUBLE!",
          sub: "IRIE",
          color: "#22c55e",
          priority: 1,
          ms: 1100,
        };
      return null;
    case "match":
      return ev.n >= 10
        ? {
            art: "wgmi",
            title: "FULL RASTA LINE!",
            sub: "ALL THE SAME AVATAR",
            color: "#f472b6",
            priority: 7,
            ms: 2200,
          }
        : ev.n >= 6
          ? {
              face: FACE.hearts,
              title: `AVATAR x${ev.n}`,
              sub: `+${ev.bonus} MATCH BONUS`,
              color: "#f472b6",
              priority: 5,
              ms: 1700,
            }
          : {
              face: FACE.grin,
              title: `AVATAR x${ev.n}`,
              sub: `+${ev.bonus} MATCH BONUS`,
              color: "#f472b6",
              priority: 3,
              ms: 1400,
            };
    case "multi":
      return ev.n >= 3
        ? {
            face: FACE.stars,
            title: `MULTI x${ev.n}`,
            sub: "BIG UP!",
            color: "#22c55e",
            priority: 4,
            ms: 1500,
          }
        : null;
    case "kill":
      return ev.boss
        ? {
            art: "bigup",
            title: "BOSS DOWN!",
            sub: "JAH BLESS",
            color: "#f472b6",
            priority: 7,
            ms: 2200,
          }
        : null;
    case "wave":
      if (ev.wave % BOSS_EVERY === 0)
        return {
          face: FACE.mindBlown,
          title: "BOSS INCOMING!",
          sub: "BRACE YOURSELF",
          color: "#ef4444",
          priority: 5,
          ms: 1900,
        };
      if (ev.wave === 1)
        return {
          face: FACE.chill,
          title: "READY, MON?",
          sub: "ONE LOVE",
          color: "#FFD700",
          priority: 2,
          ms: 1600,
        };
      return null;
    case "waveclear":
      return {
        art: "bigup",
        title: "WAVE CLEARED!",
        sub: "+SHIELD",
        color: "#22c55e",
        priority: 4,
        ms: 1700,
      };
    case "ufokill":
      return {
        face: FACE.hearts,
        title: "UFO DOWN!",
        sub: "BONUS!",
        color: "#f472b6",
        priority: 3,
        ms: 1400,
      };
    case "shield":
      return ev.shields <= 0
        ? {
            face: FACE.crying,
            title: "LAST SHIELD USED!",
            sub: "NO MORE SECOND CHANCES",
            color: "#ef4444",
            priority: 5,
            ms: 1800,
          }
        : {
            face: FACE.worried,
            title: "SHIELD SAVED YOU!",
            sub: "STACK CLEARED",
            color: "#60a5fa",
            priority: 4,
            ms: 1500,
          };
    case "level":
      return {
        art: "wgmi",
        title: `LEVEL ${ev.level}`,
        sub: "WGMI",
        color: "#FFD700",
        priority: 3,
        ms: 1600,
      };
    case "continue":
      return {
        art: "wgmi",
        title: "WE'RE BACK!",
        sub: "WGMI",
        color: "#FFD700",
        priority: 8,
        ms: 1800,
      };
    case "gameover":
      return {
        face: FACE.dead,
        title: "GAME OVER",
        color: "#ef4444",
        priority: 9,
        ms: 1500,
      };
    default:
      return null;
  }
}

function Face({ index, scale }: { index: number; scale: number }) {
  const col = index % 5;
  const row = Math.floor(index / 5);
  return (
    <div
      aria-hidden
      style={{
        width: FACE_W * scale,
        height: FACE_H * scale,
        backgroundImage: "url(/reactions/faces.png)",
        backgroundSize: `${680 * scale}px ${320 * scale}px`,
        backgroundPosition: `${-(FACE_X0 + col * FACE_W) * scale}px ${-(FACE_Y0 + row * FACE_H) * scale}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        filter: "drop-shadow(0 4px 0 rgba(0,0,0,0.6))",
        flexShrink: 0,
      }}
    />
  );
}

export function ReactionPopup({ reaction }: { reaction: Reaction | null }) {
  if (!reaction) return null;
  const { face, art, title, sub, color, ms } = reaction;
  return (
    <div
      key={reaction.id}
      className="absolute pointer-events-none z-30 flex justify-center"
      style={{ top: "14%", left: 0, right: 0 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px 8px 10px",
          borderRadius: 16,
          background:
            "linear-gradient(135deg, rgba(0,0,0,0.82), rgba(10,30,10,0.82))",
          border: `2px solid ${color}`,
          boxShadow: `0 0 28px ${color}88, inset 0 0 18px ${color}22`,
          animation: `rt-react ${ms}ms cubic-bezier(.2,1.4,.4,1) both`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* raio de luz atrás da arte */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -20,
            top: -40,
            width: 150,
            height: 150,
            background: `radial-gradient(circle, ${color}55, transparent 65%)`,
            animation: "rt-spin 3s linear infinite",
          }}
        />
        {face !== undefined && <Face index={face} scale={0.78} />}
        {art && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ART_SRC[art]}
            alt=""
            style={{
              height: art === "soundsystem" ? 92 : 84,
              width: "auto",
              position: "relative",
              // o BIG UP! é preto sobre transparente: inverte para branco no fundo escuro
              filter:
                art === "bigup"
                  ? `invert(1) drop-shadow(0 0 6px ${color})`
                  : "drop-shadow(0 4px 0 rgba(0,0,0,0.5))",
              borderRadius: art === "wgmi" ? 14 : 0,
            }}
          />
        )}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          <div
            style={{
              fontFamily: F,
              fontSize: 13,
              color,
              textShadow: `0 0 12px ${color}, 0 3px 0 rgba(0,0,0,0.9)`,
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
          {sub && (
            <div
              style={{
                fontFamily: F,
                fontSize: 6,
                color: "#e5f5e5",
                letterSpacing: 1,
              }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
