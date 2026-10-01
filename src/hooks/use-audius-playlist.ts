"use client";
// src/hooks/use-audius-playlist.ts
// Busca as faixas de uma playlist pública do Audius via API oficial.
// Retorna [{ id, title, artist, streamUrl }] para tocar com <audio> nativo,
// o que dá controle real de mute, aleatório e nome da faixa.

import { useEffect, useState } from "react";

// Playlist do projeto (handle + slug extraídos da URL do embed)
const PLAYLIST_URL =
  "https://audius.co/digitaldubs/playlist/cryptorastas-family-playlist";

// App name é exigido pela API do Audius (qualquer string identificando seu app)
const APP_NAME = "Rastetris";

// Host público da API (api.audius.co redireciona para um nó saudável)
const API = "https://discoveryprovider.audius.co/v1";

export type AudiusTrack = {
  id: string;
  title: string;
  artist: string;
  streamUrl: string;
  artworkUrl?: string;
};

export function useAudiusPlaylist() {
  const [tracks, setTracks] = useState<AudiusTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Resolve a URL da playlist → objeto da playlist (com id)
        const resolveRes = await fetch(
          `${API}/resolve?url=${encodeURIComponent(PLAYLIST_URL)}&app_name=${APP_NAME}`
        );
        if (!resolveRes.ok) throw new Error("resolve failed");
        const resolved = await resolveRes.json();
        const playlist = Array.isArray(resolved.data) ? resolved.data[0] : resolved.data;
        const playlistId = playlist?.id;
        if (!playlistId) throw new Error("playlist id não encontrado");

        // 2. Busca as faixas da playlist
        const tracksRes = await fetch(
          `${API}/playlists/${playlistId}/tracks?app_name=${APP_NAME}`
        );
        if (!tracksRes.ok) throw new Error("tracks failed");
        const tracksData = await tracksRes.json();
        const rawTracks = tracksData.data ?? [];

        // 3. Monta a lista com URL de streaming
        const list: AudiusTrack[] = rawTracks.map((t: any) => ({
          id: t.id,
          title: t.title ?? "Faixa sem título",
          artist: t.user?.name ?? t.user?.handle ?? "Artista desconhecido",
          streamUrl: `${API}/tracks/${t.id}/stream?app_name=${APP_NAME}`,
          artworkUrl: t.artwork?.["150x150"] ?? undefined,
        }));

        if (!cancelled) {
          setTracks(list);
          setLoading(false);
          if (list.length === 0) setError("Playlist vazia");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar Audius");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { tracks, loading, error };
}
