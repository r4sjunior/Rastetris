// Ícones CryptoRastas usados nos blocos (um por tipo de peça).
// Mesmo blob das cartas do Rasta Memo. Troque as URLs para mudar os personagens.

import type { PieceType } from "@/features/app/engine/pieces";

const BLOB = "https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com";

export const PIECE_ICON_URLS: Record<PieceType, string> = {
  I: `${BLOB}/11.jpeg`,
  J: `${BLOB}/12.jpeg`,
  L: `${BLOB}/13.jpeg`,
  O: `${BLOB}/14.jpeg`,
  S: `${BLOB}/15.jpeg`,
  T: `${BLOB}/16.jpeg`,
  Z: `${BLOB}/19.jpeg`,
};

const cache = new Map<PieceType, HTMLImageElement>();

/** Retorna a imagem já carregada (ou null enquanto carrega → o renderer usa cor sólida). */
export function getPieceIcon(type: PieceType): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  let img = cache.get(type);
  if (!img) {
    img = new Image();
    img.crossOrigin = "anonymous";
    img.src = PIECE_ICON_URLS[type];
    cache.set(type, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}
