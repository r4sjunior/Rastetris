"use client";
// src/features/app/components/music-player.tsx
//
// Player de música da playlist do Audius (CryptoRastas Family).
// - Toca em ordem ALEATÓRIA (com histórico p/ poder voltar)
// - Começa só quando isStarted = true (após a 1ª carta)
// - O mute do jogo (isMuted) pausa/dá play de verdade (áudio nativo)
// - Mostra "♪ nome da música — artista" rolando na tela, com botões
//   de voltar/avançar faixa nas laterais do nome.
//
// Usa <audio> nativo (não iframe) para ter controle real. As faixas vêm da
// API pública do Audius via use-audius-playlist.

import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import { useAudiusPlaylist } from "@/hooks/use-audius-playlist";

type Props = {
  isMuted: boolean;
  isStarted: boolean;
};

function MusicPlayerComponent({ isMuted, isStarted }: Props) {
  const { tracks, loading } = useAudiusPlaylist();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Histórico de faixas tocadas + posição atual (permite "voltar" mesmo
  // tocando em ordem aleatória). Mantidos juntos para atualizar atomicamente.
  const [playback, setPlayback] = useState<{ history: number[]; pos: number }>({
    history: [],
    pos: 0,
  });

  // Sorteia a faixa inicial quando a playlist carrega
  useEffect(() => {
    if (tracks.length > 0 && playback.history.length === 0) {
      setPlayback({
        history: [Math.floor(Math.random() * tracks.length)],
        pos: 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.length]);

  // Avança: se já existe uma próxima faixa no histórico (voltamos antes),
  // reaproveita; senão sorteia uma nova (sem repetir a atual)
  const pickNext = useCallback(() => {
    if (tracks.length <= 1) return;
    setPlayback(({ history, pos }) => {
      if (pos < history.length - 1) {
        return { history, pos: pos + 1 };
      }
      let next = Math.floor(Math.random() * tracks.length);
      if (next === history[pos]) next = (next + 1) % tracks.length;
      return { history: [...history, next], pos: history.length };
    });
  }, [tracks.length]);

  // Volta para a faixa anterior do histórico (se houver)
  const pickPrev = useCallback(() => {
    setPlayback(({ history, pos }) => ({
      history,
      pos: pos > 0 ? pos - 1 : pos,
    }));
  }, []);

  const index = playback.history[playback.pos] ?? 0;
  const canGoPrev = playback.pos > 0;

  // Quando troca de faixa: carrega e toca (se já iniciado e não mutado)
  useEffect(() => {
    const a = audioRef.current;
    if (!a || tracks.length === 0) return;
    a.load();
    if (isStarted && !isMuted) a.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tracks.length]);

  // Sincroniza play/pause com isStarted + isMuted
  useEffect(() => {
    const a = audioRef.current;
    if (!a || tracks.length === 0) return;
    if (isStarted && !isMuted) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, [isStarted, isMuted, tracks.length]);

  const current = tracks[index];
  const canGoNext = tracks.length > 1;

  const label = current
    ? `${isMuted ? "🔇" : "♪"} ${current.title} — ${current.artist}`
    : "";

  // Duração da rolagem proporcional ao tamanho do texto (velocidade constante)
  const scrollDuration = useMemo(
    () => Math.max(6, label.length * 0.22),
    [label],
  );

  const navButtonStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid #2d5a2d",
    borderRadius: "6px",
    color: "#4CAF50",
    cursor: "pointer",
    fontSize: "9px",
    lineHeight: 1,
    width: "18px",
    height: "18px",
    minWidth: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontFamily: "'Press Start 2P', monospace",
  } as const;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
      }}
    >
      {/* áudio nativo controlável (mute de verdade) */}
      <audio
        ref={audioRef}
        src={current?.streamUrl}
        onEnded={pickNext}
        preload="none"
        loop={false}
      />

      {/* Now playing — botão voltar / nome rolando / botão avançar */}
      {isStarted && current && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            width: "90%",
            opacity: isMuted ? 0.4 : 1,
            transition: "opacity 0.3s",
          }}
        >
          <button
            type="button"
            onClick={pickPrev}
            disabled={!canGoPrev}
            aria-label="Faixa anterior"
            style={{
              ...navButtonStyle,
              opacity: canGoPrev ? 1 : 0.35,
              cursor: canGoPrev ? "pointer" : "default",
            }}
          >
            ◀
          </button>

          <div
            style={{
              flex: 1,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
            title={`${current.title} — ${current.artist}`}
          >
            <span
              key={current.id}
              style={{
                display: "inline-block",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "6px",
                color: "#4CAF50",
                paddingLeft: "100%",
                animation: `rastetris-marquee ${scrollDuration}s linear infinite`,
              }}
            >
              {label}
            </span>
          </div>

          <button
            type="button"
            onClick={pickNext}
            disabled={!canGoNext}
            aria-label="Próxima faixa"
            style={{
              ...navButtonStyle,
              opacity: canGoNext ? 1 : 0.35,
              cursor: canGoNext ? "pointer" : "default",
            }}
          >
            ▶
          </button>
        </div>
      )}
      {isStarted && loading && (
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "6px",
            color: "#2d5a2d",
          }}
        >
          ♪ carregando playlist...
        </div>
      )}

      <style>{`
        @keyframes rastetris-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

// memo evita re-render durante a partida (só re-renderiza se props mudarem)
export const MusicPlayer = memo(MusicPlayerComponent);
