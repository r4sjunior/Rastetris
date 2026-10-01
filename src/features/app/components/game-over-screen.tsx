"use client";
// Tela de fim de jogo: patente, score animado, recorde, estatísticas da missão,
// CONTINUE / MINT on-chain (Celo), share no Farcaster e ranking.

import { useEffect, useState } from "react";
import { ShareButton } from "@/neynar-farcaster-sdk/mini";
import { AssetPayWidget } from "@/features/app/components/asset-pay-widget";
import type { Snapshot } from "@/features/app/engine/engine";
import { formatTime, getRank, nextRank } from "@/features/app/engine/rank";

const F = "'Press Start 2P', monospace";

// Imagens herdadas do Rasta Memo: game over normal vs. bônus (novo recorde)
const BLOB = "https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com";
const GAME_OVER_IMG = `${BLOB}/1lov3.png`;
const BONUS_IMG = `${BLOB}/1%24Lov3001.png`;

export type GameResult = Snapshot & { isBest: boolean; prevBest: number };

type Props = {
  result: GameResult;
  fid: number;
  onPlayAgain: () => void;
  onContinuePaid: () => void;
  onMintPaid: () => void;
  onLeaderboard: () => void;
  onQuit: () => void;
};

/** Conta de 0 até `target` com ease-out. */
function useCountUp(target: number, ms = 1300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Stat({
  label,
  value,
  color = "#fff",
  delay = 0,
}: {
  label: string;
  value: string;
  color?: string;
  delay?: number;
}) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.45)",
        border: "1px solid #2d5a2d",
        borderRadius: 8,
        padding: "7px 8px",
        textAlign: "center",
        animation: `rt-rise 0.4s ease ${delay}s both`,
      }}
    >
      <div style={{ fontFamily: F, fontSize: 5.5, color: "#22c55e" }}>
        {label}
      </div>
      <div style={{ fontFamily: F, fontSize: 10, color, marginTop: 5 }}>
        {value}
      </div>
    </div>
  );
}

export function GameOverScreen({
  result,
  fid,
  onPlayAgain,
  onContinuePaid,
  onMintPaid,
  onLeaderboard,
  onQuit,
}: Props) {
  const score = useCountUp(result.score);
  const rank = getRank(result.score);
  const next = nextRank(result.score);
  const { stats } = result;
  const accuracy =
    stats.shotsFired > 0
      ? Math.round((stats.shotsHit / stats.shotsFired) * 100)
      : 0;
  const invaded = result.cause === "invaded";
  const toNext = next
    ? Math.min(1, (result.score - rank.min) / (next.min - rank.min))
    : 1;

  const shareText =
    `I scored ${result.score.toLocaleString()} pts in RASTETRIS! ${rank.icon} ${rank.name} · ` +
    `wave ${result.wave} · ${stats.invaders} invaders down · ${stats.lines} lines 👾🧱 Can you beat me?`;

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center px-4 py-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(4px)" }}
    >
      <div
        style={{
          background: "linear-gradient(160deg, #0d1a0d 0%, #1a3a1a 100%)",
          border: `2px solid ${result.isBest ? "#FFD700" : "#ef4444"}`,
          boxShadow: `0 0 30px ${result.isBest ? "rgba(255,215,0,0.35)" : "rgba(239,68,68,0.3)"}`,
          borderRadius: 18,
          padding: "20px 16px",
          width: "100%",
          maxWidth: 340,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          animation: "rt-pop 0.35s ease both",
          margin: "auto 0",
        }}
      >
        {/* imagem: game over normal ou BÔNUS (novo recorde) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.isBest ? BONUS_IMG : GAME_OVER_IMG}
          alt={result.isBest ? "Bonus" : "Game over"}
          style={{
            width: 84,
            height: 84,
            objectFit: "contain",
            animation: result.isBest
              ? "rt-float 2s ease-in-out infinite"
              : undefined,
            filter: result.isBest
              ? "drop-shadow(0 0 12px rgba(255,215,0,0.7))"
              : undefined,
          }}
        />
        {/* título */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: F,
              fontSize: 14,
              color: "#ef4444",
              textShadow: "0 0 12px #ef4444aa",
            }}
          >
            {invaded ? "EARTH INVADED" : "STACK OVERFLOW"}
          </div>
          <div
            style={{
              fontFamily: F,
              fontSize: 6,
              color: "#a3c4a3",
              marginTop: 7,
              lineHeight: 1.8,
            }}
          >
            {invaded
              ? "The invaders touched your stack, mon."
              : "The junk reached the sky, mon."}
          </div>
        </div>

        {/* patente */}
        <div
          style={{
            width: "100%",
            background: `linear-gradient(90deg, ${rank.color}22, transparent)`,
            border: `1px solid ${rank.color}`,
            borderRadius: 10,
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 28,
              filter: `drop-shadow(0 0 6px ${rank.color})`,
            }}
          >
            {rank.icon}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F, fontSize: 5.5, color: "#a3c4a3" }}>
              RANK
            </div>
            <div
              style={{
                fontFamily: F,
                fontSize: 9,
                color: rank.color,
                marginTop: 4,
              }}
            >
              {rank.name}
            </div>
            <div
              style={{
                height: 4,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 2,
                marginTop: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${toNext * 100}%`,
                  height: "100%",
                  background: rank.color,
                  transition: "width 1s ease",
                }}
              />
            </div>
            {next && (
              <div
                style={{
                  fontFamily: F,
                  fontSize: 5,
                  color: "#6b8f6b",
                  marginTop: 4,
                }}
              >
                {(next.min - result.score).toLocaleString()} to {next.name}
              </div>
            )}
          </div>
        </div>

        {/* score */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: F, fontSize: 7, color: "#22c55e" }}>
            SCORE
          </div>
          <div
            style={{
              fontFamily: F,
              fontSize: 26,
              color: "#FFD700",
              marginTop: 8,
              textShadow:
                "0 0 14px rgba(255,215,0,0.6), 0 3px 0 rgba(0,0,0,0.7)",
            }}
          >
            {score.toLocaleString()}
          </div>
          {result.isBest ? (
            <div
              style={{
                marginTop: 10,
                fontFamily: F,
                fontSize: 8,
                padding: "5px 10px",
                borderRadius: 6,
                color: "#000",
                background: "linear-gradient(90deg,#FFD700,#fff3a0,#FFD700)",
                backgroundSize: "200% auto",
                animation: "rt-shine 1.8s linear infinite",
              }}
            >
              ★ NEW BEST ★
            </div>
          ) : (
            <div
              style={{
                fontFamily: F,
                fontSize: 6,
                color: "#6b8f6b",
                marginTop: 10,
              }}
            >
              BEST {result.prevBest.toLocaleString()}
            </div>
          )}
        </div>

        {/* estatísticas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
            width: "100%",
          }}
        >
          <Stat
            label="WAVE"
            value={String(result.wave)}
            color="#f472b6"
            delay={0.05}
          />
          <Stat
            label="LEVEL"
            value={String(result.level)}
            color="#FFD700"
            delay={0.1}
          />
          <Stat
            label="LINES"
            value={String(stats.lines)}
            color="#22c55e"
            delay={0.15}
          />
          <Stat
            label="INVADERS"
            value={String(stats.invaders)}
            color="#ef4444"
            delay={0.2}
          />
          <Stat
            label="TETRIS"
            value={String(stats.tetrises)}
            color="#FFD700"
            delay={0.25}
          />
          <Stat
            label="COMBO"
            value={`x${stats.maxCombo}`}
            color="#f472b6"
            delay={0.3}
          />
          <Stat
            label="ACCURACY"
            value={`${accuracy}%`}
            color="#22d3ee"
            delay={0.35}
          />
          <Stat
            label="UFOS"
            value={String(stats.ufos)}
            color="#f472b6"
            delay={0.4}
          />
          <Stat label="TIME" value={formatTime(stats.time)} delay={0.45} />
        </div>

        {/* ações */}
        <button
          type="button"
          onClick={onPlayAgain}
          style={{
            width: "100%",
            minHeight: 46,
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "#fff",
            fontFamily: F,
            fontSize: 10,
            cursor: "pointer",
          }}
        >
          ▶ PLAY AGAIN
        </button>

        {/* CONTINUE — 0.05, segue do mesmo ponto */}
        <AssetPayWidget
          action="continue"
          label="⚡ CONTINUE"
          price="0.05"
          accent="#22c55e"
          onSuccess={onContinuePaid}
        />

        {/* MINT DO SCORE — 0.01, on-chain (Celo). O contrato grava "level": aqui vai a WAVE. */}
        <AssetPayWidget
          action="mint"
          label="⛓ MINT SCORE"
          price="0.01"
          accent="#22c55e"
          fid={fid}
          score={result.score}
          level={result.wave}
          onSuccess={onMintPaid}
        />

        <button
          type="button"
          onClick={onLeaderboard}
          style={{
            width: "100%",
            minHeight: 44,
            borderRadius: 10,
            border: "1px solid #FFD700",
            background: "rgba(255,215,0,0.1)",
            color: "#FFD700",
            fontFamily: F,
            fontSize: 9,
            cursor: "pointer",
          }}
        >
          🏆 LEADERBOARD
        </button>

        <ShareButton
          text={shareText}
          queryParams={{
            score: String(result.score),
            wave: String(result.wave),
            lines: String(stats.lines),
            invaders: String(stats.invaders),
            rank: rank.name,
          }}
          variant="outline"
        >
          SHARE SCORE 🌿
        </ShareButton>

        <button
          type="button"
          onClick={onQuit}
          style={{
            width: "100%",
            minHeight: 40,
            borderRadius: 10,
            border: "1px solid #2d5a2d",
            background: "rgba(255,255,255,0.04)",
            color: "#a3c4a3",
            fontFamily: F,
            fontSize: 8,
            cursor: "pointer",
          }}
        >
          🚪 MENU
        </button>
      </div>
    </div>
  );
}
