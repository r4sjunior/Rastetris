"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFarcasterUser } from "@/neynar-farcaster-sdk/mini";
import { GameCanvas } from "@/features/app/components/game-canvas";
import {
  GameOverScreen,
  type GameResult,
} from "@/features/app/components/game-over-screen";
import { LeaderboardOnChain } from "@/features/app/components/leaderboard-onchain";
import {
  MemoChallenge,
  type MemoResult,
} from "@/features/app/components/memo-challenge";
import { MenuScreen } from "@/features/app/components/menu-screen";
import { MusicPlayer } from "@/features/app/components/music-player";
import {
  ReactionPopup,
  reactionFor,
  type Reaction,
} from "@/features/app/components/reactions";
import { RastetrisLogo } from "@/features/app/components/rastetris-logo";
import { TouchControls } from "@/features/app/components/touch-controls";
import {
  Engine,
  type GameEvent,
  type Snapshot,
} from "@/features/app/engine/engine";
import { loadBest, saveBest } from "@/features/app/engine/rank";
import { Sfx } from "@/features/app/engine/sfx";

// Visuais herdados do Rasta Memo (fundo animado + animações de comemoração)
const BG_URL =
  "https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com/back%20ground%20-%20rasta%20-%20giunft.gif";
const CONTINUE_ANIM_URL =
  "https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com/Crypto%20Bitcoin%20GIF%20by%20cryptorastas.gif";
const MINT_ANIM_URL =
  "https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com/Game%20Art%20Sticker%20by%20cryptorastas.gif";

const F = "'Press Start 2P', monospace";
const GAME_OVER_DELAY_MS = 1100; // deixa a explosão final acontecer antes da tela de resultado

type Phase = "menu" | "playing" | "paused" | "memo" | "over";

export function MiniApp() {
  const [engine] = useState(() => new Engine());
  const [sfx] = useState(() => new Sfx());
  const [phase, setPhase] = useState<Phase>("menu");
  const [hud, setHud] = useState<Snapshot>(() => engine.snapshot());
  const [best, setBest] = useState(0);
  const [muted, setMuted] = useState(false);
  const [gameStarted, setGameStarted] = useState(false); // música começa no 1º PLAY
  const [result, setResult] = useState<GameResult | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showContinueAnim, setShowContinueAnim] = useState(false);
  const [showMintAnim, setShowMintAnim] = useState(false);

  const { data: user } = useFarcasterUser();
  const fid = user?.fid ?? 0;

  const [reaction, setReaction] = useState<Reaction | null>(null);
  const reactionRef = useRef<{ id: number; priority: number; until: number }>({
    id: 0,
    priority: 0,
    until: 0,
  });

  // reações: maior prioridade vence enquanto a anterior ainda está na tela
  const handleEvent = useCallback(
    (ev: GameEvent) => {
      if (ev.type === "memo") {
        engine.releaseAll();
        window.setTimeout(
          () => setPhase((p) => (p === "playing" ? "memo" : p)),
          900,
        );
      }
      const spec = reactionFor(ev);
      if (!spec) return;
      const now = performance.now();
      const cur = reactionRef.current;
      if (now < cur.until && spec.priority < cur.priority) return;
      const id = cur.id + 1;
      reactionRef.current = {
        id,
        priority: spec.priority,
        until: now + spec.ms,
      };
      setReaction({ ...spec, id });
      window.setTimeout(
        () => setReaction((r) => (r && r.id === id ? null : r)),
        spec.ms,
      );
    },
    [engine],
  );

  // telas baixas (celular deitado, janelas pequenas): controles menores
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const on = () => setCompact(window.innerHeight < 640);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // quantas vezes o desafio RASTA MEMO já veio nesta partida (cada vez ganha +1 dupla)
  const memoRound = useRef(0);
  const bestRef = useRef(0);
  const fidRef = useRef(0);
  const phaseRef = useRef<Phase>("menu");
  useEffect(() => {
    fidRef.current = fid;
    phaseRef.current = phase;
  });

  useEffect(() => {
    const b = loadBest();
    bestRef.current = b;
    setBest(b);
  }, []);

  useEffect(() => {
    sfx.setMuted(muted);
  }, [muted, sfx]);

  // ─── Fluxo de jogo ─────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    memoRound.current = 0;
    sfx.unlock();
    engine.reset();
    setHud(engine.snapshot());
    setResult(null);
    setShowLeaderboard(false);
    setGameStarted(true);
    setPhase("playing");
  }, [engine, sfx]);

  const togglePause = useCallback(() => {
    setPhase((p) => {
      if (p === "playing") {
        engine.releaseAll();
        return "paused";
      }
      return p === "paused" ? "playing" : p;
    });
  }, [engine]);

  // pausa automática ao sair da aba / app
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && phaseRef.current === "playing") togglePause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [togglePause]);

  const handleGameOver = useCallback(
    (snap: Snapshot) => {
      window.setTimeout(() => {
        if (!engine.over) return; // já continuou/reiniciou
        const prevBest = bestRef.current;
        const isBest = snap.score > prevBest;
        if (isBest) {
          bestRef.current = snap.score;
          saveBest(snap.score);
          setBest(snap.score);
        }
        setResult({ ...engine.snapshot(), isBest, prevBest });
        setPhase("over");

        const f = fidRef.current;
        if (f && snap.score > 0) {
          fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fid: f,
              score: snap.score,
              level: snap.level,
              lines: snap.stats.lines,
              invaders: snap.stats.invaders,
            }),
          }).catch(() => {});
        }
      }, GAME_OVER_DELAY_MS);
    },
    [engine],
  );

  // CONTINUE pago: mesma partida, mesmo score/onda; o motor abre espaço e devolve escudos.
  const playContinueAnim = useCallback(() => {
    setShowContinueAnim(true);
    window.setTimeout(() => {
      setShowContinueAnim(false);
      engine.continueRun();
      setHud(engine.snapshot());
      setResult(null);
      setPhase("playing");
    }, 2200);
  }, [engine]);

  const playMintAnim = useCallback(() => {
    setShowMintAnim(true);
    window.setTimeout(() => setShowMintAnim(false), 2200);
  }, []);

  const backToMenu = useCallback(() => {
    memoRound.current = 0;
    engine.reset();
    setHud(engine.snapshot());
    setResult(null);
    setPhase("menu");
  }, [engine]);

  const running = phase === "playing";
  const inMatch = phase === "playing" || phase === "paused";
  const shieldsLow = hud.shields <= 0;

  return (
    <div
      className="h-dvh flex flex-col overflow-hidden relative"
      style={{
        backgroundImage: `url("${BG_URL}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: F,
        userSelect: "none",
        touchAction: "manipulation", // sem zoom por duplo toque
        overscrollBehavior: "none", // sem "puxar para atualizar" no meio da partida
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
      }}
    >
      <style>{`
        @keyframes rt-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes rt-pulse { 0%,100% { box-shadow: 0 0 10px rgba(255,215,0,0.4); transform: scale(1); } 50% { box-shadow: 0 0 24px rgba(255,215,0,0.9); transform: scale(1.025); } }
        @keyframes rt-pop { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes rt-rise { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes rt-shine { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        @keyframes rt-score { 0% { transform: scale(1); } 40% { transform: scale(1.18); color: #fff; } 100% { transform: scale(1); } }
        @keyframes rt-react {
          0% { opacity: 0; transform: scale(0.3) rotate(-8deg); }
          14% { opacity: 1; transform: scale(1.18) rotate(2deg); }
          24% { transform: scale(1) rotate(0deg); }
          84% { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.95) translateY(-16px); }
        }
        @keyframes rt-spin { to { transform: rotate(360deg); } }
        @keyframes rt-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "rgba(0,0,0,0.3)" }}
      />

      {/* HEADER */}
      <header
        className="relative z-10 shrink-0 flex items-center justify-between px-3"
        style={{
          background: "rgba(5,20,5,0.9)",
          borderBottom: "2px solid #2d5a2d",
          height: 46,
        }}
      >
        <RastetrisLogo size={13} />
        <div style={{ display: "flex", gap: 6 }}>
          {inMatch && (
            <HeaderButton
              label={phase === "paused" ? "▶" : "❚❚"}
              aria="Pause"
              onClick={togglePause}
              color="#3b82f6"
            />
          )}
          <HeaderButton
            label="🏆"
            aria="Leaderboard"
            onClick={() => setShowLeaderboard(true)}
            color="#FFD700"
          />
          <HeaderButton
            label={muted ? "🔇" : "🔈"}
            aria="Mute"
            onClick={() => setMuted((m) => !m)}
            color="#2d5a2d"
          />
        </div>
      </header>

      {/* SCORE */}
      <div
        className="relative z-10 shrink-0 flex items-center justify-between px-3"
        style={{
          background: "rgba(10,30,10,0.85)",
          borderBottom: "1px solid #2d5a2d",
          height: 38,
        }}
      >
        <div>
          <div style={{ fontSize: 6, color: "#22c55e" }}>SCORE</div>
          <div
            key={hud.score}
            style={{
              fontSize: 14,
              color: "#FFD700",
              marginTop: 3,
              display: "inline-block",
              animation: hud.score ? "rt-score 0.25s ease" : undefined,
            }}
          >
            {hud.score.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 6, color: "#22c55e" }}>BEST</div>
          <div style={{ fontSize: 10, color: "#a3c4a3", marginTop: 3 }}>
            {Math.max(best, hud.score).toLocaleString()}
          </div>
        </div>
      </div>

      {/* NOW PLAYING (Audius) */}
      <div
        className="relative z-10 shrink-0"
        style={{ minHeight: 14, padding: "2px 0" }}
      >
        <MusicPlayer isMuted={muted} isStarted={gameStarted} />
      </div>

      {/* TABULEIRO */}
      <main className="relative z-10 flex-1 min-h-0">
        <GameCanvas
          engine={engine}
          sfx={sfx}
          running={running}
          attract={phase === "menu"}
          onHud={setHud}
          onGameOver={handleGameOver}
          onTogglePause={togglePause}
          onEvent={handleEvent}
        />
        <ReactionPopup reaction={reaction} />

        {phase === "menu" && (
          <MenuScreen
            best={best}
            onPlay={startGame}
            onLeaderboard={() => setShowLeaderboard(true)}
          />
        )}

        {phase === "paused" && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-6"
            style={{
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(3px)",
            }}
          >
            <div
              style={{
                fontSize: 16,
                color: "#FFD700",
                textShadow: "0 0 12px #FFD700aa",
              }}
            >
              PAUSED
            </div>
            <button
              type="button"
              onClick={togglePause}
              style={menuBtn("#22c55e")}
            >
              ▶ RESUME
            </button>
            <button
              type="button"
              onClick={startGame}
              style={menuBtn("#FFD700")}
            >
              ↻ RESTART
            </button>
            <button
              type="button"
              onClick={backToMenu}
              style={menuBtn("#a3c4a3")}
            >
              🚪 MENU
            </button>
          </div>
        )}
      </main>

      {/* CONTROLES DE TOQUE */}
      <div
        className="relative z-10 shrink-0"
        style={{
          background: "rgba(5,15,5,0.92)",
          borderTop: "2px solid #2d5a2d",
          paddingBottom: "max(4px, env(safe-area-inset-bottom))",
        }}
      >
        <TouchControls
          engine={engine}
          sfx={sfx}
          disabled={!running}
          compact={compact}
        />
      </div>

      {/* alerta de escudos baixos */}
      {running && shieldsLow && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            top: 92,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 7,
            color: "#ef4444",
            animation: "rt-blink 0.7s infinite",
          }}
        >
          ⚠ NO SHIELD - DONT TOP OUT
        </div>
      )}

      {/* LEADERBOARD */}
      {showLeaderboard && (
        <LeaderboardOnChain
          currentFid={fid}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* DESAFIO RASTA MEMO (linha inteira do mesmo avatar) */}
      {phase === "memo" && (
        <MemoChallenge
          level={hud.level}
          round={memoRound.current}
          sfx={sfx}
          onDone={(r: MemoResult) => {
            engine.addBonus(r.points, r.won);
            memoRound.current += 1;
            setHud(engine.snapshot());
            setPhase("playing");
          }}
        />
      )}

      {/* RESULTADO */}
      {phase === "over" && result && (
        <GameOverScreen
          result={result}
          fid={fid}
          onPlayAgain={startGame}
          onContinuePaid={playContinueAnim}
          onMintPaid={playMintAnim}
          onLeaderboard={() => setShowLeaderboard(true)}
          onQuit={backToMenu}
        />
      )}

      {/* CONTINUE ANIM */}
      {showContinueAnim && (
        <CelebrateOverlay
          src={CONTINUE_ANIM_URL}
          alt="Continue"
          text="CONTINUE UNLOCKED!"
        />
      )}

      {/* MINT ANIM */}
      {showMintAnim && (
        <CelebrateOverlay
          src={MINT_ANIM_URL}
          alt="Score minted"
          text="SCORE ON-CHAIN!"
        />
      )}
    </div>
  );
}

function HeaderButton({
  label,
  aria,
  onClick,
  color,
}: {
  label: string;
  aria: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${color}`,
        borderRadius: 8,
        color: "#fff",
        cursor: "pointer",
        fontSize: 13,
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: F,
      }}
    >
      {label}
    </button>
  );
}

function menuBtn(color: string): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 240,
    minHeight: 46,
    borderRadius: 12,
    border: `2px solid ${color}`,
    background: "rgba(0,0,0,0.5)",
    color,
    fontFamily: F,
    fontSize: 10,
    cursor: "pointer",
  };
}

function CelebrateOverlay({
  src,
  alt,
  text,
}: {
  src: string;
  alt: string;
  text: string;
}) {
  return (
    <div
      className="absolute inset-0 z-[70] flex flex-col items-center justify-center gap-4 px-6"
      style={{ background: "rgba(0,0,0,0.92)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{ width: "min(240px, 80vw)", height: "auto", borderRadius: 16 }}
      />
      <div style={{ fontSize: 12, color: "#FFD700", textAlign: "center" }}>
        {text}
      </div>
    </div>
  );
}
