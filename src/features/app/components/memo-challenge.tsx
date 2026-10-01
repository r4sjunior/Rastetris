"use client";
// DESAFIO RASTA MEMO — liberado ao formar 4 avatares IGUAIS em sequência na horizontal.
// Rodada 0 = 4 cartas (2 pares). As cartas ficam viradas por 4,20 s para memorizar,
// depois viram como no Rasta Memo original. Encontre os pares antes de gastar as vidas.

import { useEffect, useRef, useState } from "react";
import type { Sfx } from "@/features/app/engine/sfx";

const F = "'Press Start 2P', monospace";
const BLOB = "https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com";

// mesmas cartas do Rasta Memo original
const POOL = [
  ...Array.from(
    { length: 10 },
    (_, i) => `${BLOB}/${String(i + 1).padStart(2, "0")}.jpeg`,
  ),
  ...[17, 20, 21, 22, 23].map((n) => `${BLOB}/${n}.jpeg`),
  ...[24, 25, 26, 27, 28].map((n) => `${BLOB}/${n}.png`),
];
const BACK_SRC =
  "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/409848fd-a78f-43b9-bde4-3fd5d7371865/Carta-g5HrBpqXZdeGh0c7EKQ0vkdJjhCw4T.png?LCZR";

/** Tempo que as cartas ficam à mostra antes de virar. */
export const PREVIEW_MS = 4200;
/** Rodada 0 = 2 duplas; cada nova sequência de 4 acrescenta +1 dupla (até o máximo). */
export const BASE_PAIRS = 2;
export const MAX_PAIRS = 15;
export const pairsForRound = (round: number) =>
  Math.min(MAX_PAIRS, BASE_PAIRS + round);
const livesForRound = (round: number) => Math.min(10, 4 + round);

// pontos base (× level)
const PAIR_PTS = 500;
const WIN_PTS = 3000;
const PERFECT_PTS = 2000;

type Card = {
  uid: number;
  src: string;
  flipped: boolean;
  matched: boolean;
  wrong: boolean;
};

export type MemoResult = {
  won: boolean;
  pairs: number;
  mistakes: number;
  points: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairs: number): Card[] {
  const chosen = shuffle(POOL).slice(0, pairs);
  const faces = [...chosen, ...chosen];
  return shuffle(faces).map((src, uid) => ({
    uid,
    src,
    flipped: true, // começam viradas para cima (fase de memorização)
    matched: false,
    wrong: false,
  }));
}

type Props = {
  level: number;
  /** Quantas vezes o desafio já foi ganho/jogado nesta partida (0 = primeira). */
  round: number;
  sfx: Sfx;
  onDone: (r: MemoResult) => void;
};

export function MemoChallenge({ level, round, sfx, onDone }: Props) {
  const totalPairs = pairsForRound(round);
  const maxLives = livesForRound(round);
  const cols = Math.ceil(Math.sqrt(totalPairs * 2));
  const mult = level * (1 + round * 0.5);
  const [cards, setCards] = useState<Card[]>(() => buildDeck(totalPairs));
  const [phase, setPhase] = useState<"preview" | "play" | "result">("preview");
  const [lives, setLives] = useState(maxLives);
  const [pairs, setPairs] = useState(0);
  const [won, setWon] = useState(false);

  const firstRef = useRef<number | null>(null);
  const lockRef = useRef(false);
  const mistakesRef = useRef(0);
  const pairsRef = useRef(0);
  const doneRef = useRef(false);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    const list = timers.current;
    // 4,20 s de memorização → as cartas viram
    later(() => {
      setCards((prev) => prev.map((c) => ({ ...c, flipped: false })));
      setPhase("play");
    }, PREVIEW_MS);
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  const finish = (didWin: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    lockRef.current = true;
    setWon(didWin);
    setPhase("result");
    const points = Math.round(
      (pairsRef.current * PAIR_PTS +
        (didWin
          ? WIN_PTS + (mistakesRef.current === 0 ? PERFECT_PTS : 0)
          : 0)) *
        mult,
    );
    if (didWin) sfx.play({ type: "waveclear" });
    else sfx.play({ type: "shield", shields: 0 });
    // mostra o resultado e devolve o controle ao jogo
    later(
      () =>
        onDone({
          won: didWin,
          pairs: pairsRef.current,
          mistakes: mistakesRef.current,
          points,
        }),
      1900,
    );
  };

  const flip = (card: Card) => {
    if (phase !== "play" || lockRef.current || card.flipped || card.matched)
      return;
    sfx.unlock();

    setCards((prev) =>
      prev.map((c) => (c.uid === card.uid ? { ...c, flipped: true } : c)),
    );
    sfx.play({ type: "rotate" });

    if (firstRef.current === null) {
      firstRef.current = card.uid;
      return;
    }

    const first = cards.find((c) => c.uid === firstRef.current);
    firstRef.current = null;
    if (!first) return;
    lockRef.current = true;

    if (first.src === card.src) {
      // PAR!
      pairsRef.current += 1;
      setPairs(pairsRef.current);
      sfx.play({ type: "match", n: 5, bonus: 0 });
      setCards((prev) =>
        prev.map((c) =>
          c.uid === first.uid || c.uid === card.uid
            ? { ...c, matched: true }
            : c,
        ),
      );
      lockRef.current = false;
      if (pairsRef.current >= totalPairs) later(() => finish(true), 450);
    } else {
      mistakesRef.current += 1;
      sfx.play({ type: "hit" });
      setCards((prev) =>
        prev.map((c) =>
          c.uid === first.uid || c.uid === card.uid ? { ...c, wrong: true } : c,
        ),
      );
      const left = maxLives - mistakesRef.current;
      later(() => {
        setLives(left);
        setCards((prev) =>
          prev.map((c) =>
            c.uid === first.uid || c.uid === card.uid
              ? { ...c, flipped: false, wrong: false }
              : c,
          ),
        );
        lockRef.current = false;
        if (left <= 0) {
          // revela tudo antes de encerrar
          setCards((prev) => prev.map((c) => ({ ...c, flipped: true })));
          finish(false);
        }
      }, 800);
    }
  };

  return (
    <div
      className="absolute inset-0 z-[55] flex flex-col items-center justify-center gap-3 px-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(5px)" }}
    >
      <style>{`
        @keyframes mc-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes mc-glow { 0%,100% { box-shadow: 0 0 8px rgba(255,215,0,.5); } 50% { box-shadow: 0 0 20px rgba(255,215,0,1); } }
        @keyframes mc-bar { from { width: 100%; } to { width: 0%; } }
      `}</style>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: F, fontSize: 9, color: "#f472b6" }}>
          4 IN A ROW!
        </div>
        <div
          style={{
            fontFamily: F,
            fontSize: 16,
            color: "#FFD700",
            marginTop: 8,
            textShadow: "0 0 14px #FFD700aa, 0 3px 0 rgba(0,0,0,.8)",
          }}
        >
          RASTA MEMO
        </div>
      </div>

      {/* status */}
      <div style={{ width: "100%", maxWidth: 320, minHeight: 34 }}>
        {phase === "preview" && (
          <div>
            <div
              style={{
                fontFamily: F,
                fontSize: 8,
                color: "#22c55e",
                textAlign: "center",
              }}
            >
              MEMORIZE THE CARDS!
            </div>
            <div
              style={{
                height: 6,
                background: "rgba(255,255,255,.12)",
                borderRadius: 3,
                marginTop: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg,#22c55e,#FFD700,#ef4444)",
                  animation: `mc-bar ${PREVIEW_MS}ms linear forwards`,
                }}
              />
            </div>
          </div>
        )}
        {phase === "play" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontFamily: F, fontSize: 8, color: "#22c55e" }}>
              PAIRS {pairs}/{totalPairs}
            </span>
            <span style={{ fontFamily: F, fontSize: 10 }}>
              {Array.from({ length: maxLives }).map((_, i) => (
                <span key={i} style={{ opacity: i < lives ? 1 : 0.2 }}>
                  ❤️
                </span>
              ))}
            </span>
          </div>
        )}
        {phase === "result" && (
          <div
            style={{
              fontFamily: F,
              fontSize: 11,
              textAlign: "center",
              color: won ? "#FFD700" : "#ef4444",
              textShadow: "0 0 12px currentColor",
            }}
          >
            {won ? "YAH MON! BONUS!" : "NEXT TIME, MON"}
          </div>
        )}
      </div>

      {/* cartas (grade centralizada) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 6,
          width: "100%",
          maxWidth: Math.min(330, cols * 90),
        }}
      >
        {cards.map((card) => {
          const up = card.flipped || card.matched;
          return (
            <div
              key={card.uid}
              onClick={() => flip(card)}
              style={{
                position: "relative",
                width: `calc((100% - ${(cols - 1) * 6}px) / ${cols})`,
                aspectRatio: "1 / 1",
                perspective: 600,
                cursor: phase === "play" && !up ? "pointer" : "default",
                animation: card.wrong ? "mc-shake .4s ease" : undefined,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  transformStyle: "preserve-3d",
                  transform: up ? "rotateY(180deg)" : "rotateY(0deg)",
                  transition: "transform .45s ease",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "2px solid #2d5a2d",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={BACK_SRC}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    borderRadius: 8,
                    overflow: "hidden",
                    border: `2px solid ${card.wrong ? "#ef4444" : card.matched ? "#FFD700" : "#22c55e"}`,
                    animation: card.matched
                      ? "mc-glow 1.2s ease-in-out infinite"
                      : undefined,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.src}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontFamily: F,
          fontSize: 6,
          color: "#6b8f6b",
          textAlign: "center",
          lineHeight: 1.9,
        }}
      >
        PAIR +{Math.round(PAIR_PTS * mult)} · CLEAR +
        {Math.round(WIN_PTS * mult)} + SHIELD
      </div>
    </div>
  );
}
