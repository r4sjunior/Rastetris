"use client";
// src/features/app/components/leaderboard-onchain.tsx
// Leaderboard on-chain ILIMITADO do RASTETRIS: lê o contrato na Celo,
// resolve nomes (ENS -> Base -> endereco), pódio Top 3 + cascata.

import { useMemo } from "react";
import { useReadContract, useAccount } from "wagmi";
import {
  LEADERBOARD_ADDRESS,
  LEADERBOARD_ABI,
  CONTRACT_DEPLOYED,
} from "@/lib/celo-config";
import { PlayerName } from "@/features/app/components/player-name";

const SOUNDTRACK_ARTISTS = [
  "DigitalDubs",
  "Dada Yute",
  "Arcanjo Ras",
  "Taylor Youth",
].join("  •  ");

const F = "'Press Start 2P', monospace";

type Entry = {
  player: `0x${string}`;
  fid: bigint;
  score: bigint;
  level: bigint;
  timestamp: bigint;
};

type Props = { currentFid?: number; onClose: () => void };

function timeAgo(ts: bigint): string {
  const s = Math.floor(Date.now() / 1000) - Number(ts);
  if (s <= 0) return "agora";
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function LeaderboardOnChain({ onClose }: Props) {
  const { address } = useAccount();

  const { data: newScores, isLoading: loadingNew } = useReadContract({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: "getRecentScores",
    args: [200n],
    query: { enabled: CONTRACT_DEPLOYED },
  });

  const isLoading = loadingNew;

  const ranked = useMemo(() => {
    const all: Entry[] = [...((newScores ?? []) as readonly Entry[])];
    return all.sort((a, b) =>
      a.score > b.score ? -1 : a.score < b.score ? 1 : 0,
    );
  }, [newScores]);

  const myRank = useMemo(() => {
    if (!address) return null;
    const i = ranked.findIndex(
      (e) => e.player.toLowerCase() === address.toLowerCase(),
    );
    return i >= 0 ? i + 1 : null;
  }, [ranked, address]);

  const soundtrackScrollDuration = useMemo(
    () => Math.max(6, SOUNDTRACK_ARTISTS.length * 0.22),
    [],
  );

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)" }}
    >
      <style>{`
        @keyframes lb-row-in { 0% { opacity: 0; transform: translateY(12px);} 100% { opacity: 1; transform: translateY(0);} }
        @keyframes lb-gold-glow { 0%,100% { box-shadow: 0 0 8px rgba(255,215,0,0.5);} 50% { box-shadow: 0 0 20px rgba(255,215,0,1);} }
        @keyframes lb-podium-in { 0% { opacity: 0; transform: translateY(18px) scale(0.92);} 100% { opacity: 1; transform: translateY(0) scale(1);} }
        @keyframes rastetris-credits-shine { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        @keyframes rastetris-credits-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
        @keyframes rastetris-credits-letter { 0%, 100% { color: #e63946; } 33% { color: #FFD700; } 66% { color: #22c55e; } }
      `}</style>

      <div
        style={{
          background: "linear-gradient(135deg, #0d1a0d 0%, #1a3a1a 100%)",
          border: "2px solid #FFD700",
          boxShadow: "0 0 30px rgba(255,215,0,0.25)",
          borderRadius: "18px",
          padding: "22px 18px",
          width: "100%",
          maxWidth: "340px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontFamily: F, fontSize: "12px", color: "#FFD700" }}>
              🏆 RANKING
            </div>
            <div
              style={{
                fontFamily: F,
                fontSize: "5px",
                color: "#4CAF50",
                marginTop: "3px",
              }}
            >
              ⛓ on-chain · Celo · {ranked.length} scores
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid #ef4444",
              borderRadius: "6px",
              color: "#ef4444",
              cursor: "pointer",
              fontFamily: F,
              fontSize: "8px",
              padding: "6px 12px",
              minHeight: "36px",
            }}
          >
            ✕ SAIR
          </button>
        </div>

        {myRank && (
          <div
            style={{
              background: "rgba(255,215,0,0.08)",
              border: "2px solid #FFD700",
              borderRadius: "10px",
              padding: "8px 12px",
              fontFamily: F,
              fontSize: "7px",
              color: "#FFD700",
              textAlign: "center",
            }}
          >
            🏅 Você está em #{myRank}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {isLoading && (
            <div
              style={{
                fontFamily: F,
                fontSize: "8px",
                color: "#a3c4a3",
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              ⏳ Lendo a Celo...
            </div>
          )}
          {!isLoading && ranked.length === 0 && (
            <div
              style={{
                fontFamily: F,
                fontSize: "8px",
                color: "#a3c4a3",
                textAlign: "center",
                padding: "24px 0",
                lineHeight: 2.5,
              }}
            >
              {CONTRACT_DEPLOYED ? (
                <>Sem scores ainda!{"\n"}Seja o primeiro, mon 🌿</>
              ) : (
                <>
                  Ranking abre em breve!{"\n"}O contrato do RASTETRIS{"\n"}ainda
                  não foi publicado.
                </>
              )}
            </div>
          )}

          {!isLoading &&
            ranked.length > 0 &&
            (() => {
              const podium = ranked.slice(0, 3);
              const order = [podium[1], podium[0], podium[2]];
              const ranks = [2, 1, 3];
              const medals = ["🥈", "🥇", "🥉"];
              const heights = ["78px", "96px", "66px"];
              const borders = ["#c0c0c0", "#FFD700", "#cd7f32"];
              const bgs = [
                "rgba(192,192,192,0.08)",
                "rgba(255,215,0,0.12)",
                "rgba(205,127,50,0.08)",
              ];
              return (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    gap: "6px",
                    marginBottom: "4px",
                  }}
                >
                  {order.map((entry, idx) => {
                    if (!entry) return <div key={idx} style={{ flex: 1 }} />;
                    const isMe =
                      address?.toLowerCase() === entry.player.toLowerCase();
                    const isFirst = ranks[idx] === 1;
                    return (
                      <div
                        key={`${entry.player}-pod-${idx}`}
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          background: bgs[idx],
                          border: `2px solid ${borders[idx]}`,
                          borderRadius: "10px",
                          padding: "8px 4px",
                          minHeight: heights[idx],
                          animation: `lb-podium-in 0.5s ease ${idx * 0.12}s both${isFirst ? ", lb-gold-glow 1.6s ease-in-out infinite 0.6s" : ""}`,
                        }}
                      >
                        <div style={{ fontSize: isFirst ? "20px" : "16px" }}>
                          {medals[idx]}
                        </div>
                        <div
                          style={{
                            fontSize: "5px",
                            marginTop: "4px",
                            textAlign: "center",
                            lineHeight: 1.4,
                            wordBreak: "break-all",
                          }}
                        >
                          <PlayerName
                            address={entry.player}
                            fid={entry.fid}
                            color={isMe ? "#FFD700" : "#fff"}
                          />
                        </div>
                        <div
                          style={{
                            fontFamily: F,
                            fontSize: isFirst ? "13px" : "10px",
                            color: borders[idx],
                            marginTop: "3px",
                          }}
                        >
                          {entry.score.toString()}
                        </div>
                        <div
                          style={{
                            fontFamily: F,
                            fontSize: "4px",
                            color: "#4a7a4a",
                            marginTop: "2px",
                          }}
                        >
                          WAVE {entry.level.toString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          {ranked.slice(3).map((entry, idx) => {
            const i = idx + 3;
            const isMe = address?.toLowerCase() === entry.player.toLowerCase();
            return (
              <div
                key={`${entry.player}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: isMe ? "rgba(255,215,0,0.12)" : "rgba(0,0,0,0.3)",
                  border: `1px solid ${isMe ? "#FFD700" : "#2d5a2d"}`,
                  borderRadius: "8px",
                  padding: "6px 10px",
                  animation: `lb-row-in 0.35s ease ${Math.min(idx * 0.05, 0.6)}s both`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: F,
                      fontSize: "8px",
                      color: "#FFD700",
                      minWidth: "20px",
                    }}
                  >
                    {i + 1}.
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "7px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      <PlayerName
                        address={entry.player}
                        fid={entry.fid}
                        color={isMe ? "#FFD700" : "#fff"}
                        suffix={isMe ? " (voce)" : ""}
                      />
                    </div>
                    <div
                      style={{
                        fontFamily: F,
                        fontSize: "5px",
                        color: "#4a7a4a",
                        marginTop: "2px",
                      }}
                    >
                      WAVE {entry.level.toString()}
                      {entry.timestamp > 0n
                        ? ` · ${timeAgo(entry.timestamp)}`
                        : ""}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "10px",
                      color: isMe ? "#FFD700" : "#fff",
                    }}
                  >
                    {entry.score.toString()}
                  </div>
                  <a
                    href={`https://celoscan.io/address/${entry.player}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: F,
                      fontSize: "5px",
                      color: "#4CAF50",
                      textDecoration: "underline",
                    }}
                  >
                    ↗ celo
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Credits */}
        <div
          style={{
            flexShrink: 0,
            marginTop: "4px",
            paddingTop: "14px",
            borderTop: "2px solid transparent",
            borderImage: "linear-gradient(90deg, #e63946, #FFD700, #22c55e) 1",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontFamily: F,
              fontSize: "10px",
              textAlign: "center",
              letterSpacing: "1px",
              backgroundImage:
                "linear-gradient(90deg, #e63946, #FFD700, #22c55e, #FFD700, #e63946)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: "rastetris-credits-shine 4s linear infinite",
            }}
          >
            CREDITS
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { role: "Lead Developer & Programmer", name: "r4sjunior" },
              { role: "Concept & Asset Design", name: "CR_Labs" },
              { role: "Background Animation", name: "Giu_NFT" },
            ].map(({ role, name }) => (
              <div key={role} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: F,
                    fontSize: "6px",
                    color: "#a3c4a3",
                    marginBottom: "3px",
                  }}
                >
                  {role}
                </div>
                <div
                  style={{ fontFamily: F, fontSize: "8px", color: "#e0e0e0" }}
                >
                  {name}
                </div>
              </div>
            ))}

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: F,
                  fontSize: "6px",
                  color: "#a3c4a3",
                  marginBottom: "3px",
                }}
              >
                Original Soundtrack
              </div>
              <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: F,
                    fontSize: "8px",
                    color: "#e0e0e0",
                    paddingLeft: "100%",
                    animation: `rastetris-credits-marquee ${soundtrackScrollDuration}s linear infinite`,
                  }}
                >
                  {SOUNDTRACK_ARTISTS}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              marginTop: "4px",
              padding: "10px",
              borderRadius: "8px",
              background: "rgba(255,215,0,0.06)",
              border: "1px dashed #2d5a2d",
            }}
          >
            <div
              style={{
                fontFamily: F,
                fontSize: "6px",
                color: "#a3c4a3",
                marginBottom: "5px",
              }}
            >
              Special Thanks
            </div>
            <div
              style={{
                fontFamily: F,
                fontSize: "7px",
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {'"The Cryptorasta Community"'.split("").map((ch, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    whiteSpace: ch === " " ? "pre" : "normal",
                    animation:
                      "rastetris-credits-letter 1.8s ease-in-out infinite",
                    animationDelay: `${i * 0.06}s`,
                  }}
                >
                  {ch}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
