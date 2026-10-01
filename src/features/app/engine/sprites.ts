// Sprites 8x8 em bitmap (2 frames cada) — estilo Space Invaders clássico.

export const INVADER_SPRITES: string[][][] = [
  // 0 — lula
  [
    [
      "...XX...",
      "..XXXX..",
      ".XXXXXX.",
      "XX.XX.XX",
      "XXXXXXXX",
      "..X..X..",
      ".X.XX.X.",
      "X.X..X.X",
    ],
    [
      "...XX...",
      "..XXXX..",
      ".XXXXXX.",
      "XX.XX.XX",
      "XXXXXXXX",
      ".X.XX.X.",
      "X......X",
      ".X....X.",
    ],
  ],
  // 1 — caranguejo
  [
    [
      "..X..X..",
      "...XX...",
      "..XXXX..",
      ".XX..XX.",
      "XXXXXXXX",
      "X.XXXX.X",
      "X.X..X.X",
      "...XX...",
    ],
    [
      "..X..X..",
      "X..XX..X",
      "X.XXXX.X",
      "XXX..XXX",
      "XXXXXXXX",
      ".XXXXXX.",
      "..X..X..",
      ".X....X.",
    ],
  ],
  // 2 — polvo
  [
    [
      "..XXXX..",
      ".XXXXXX.",
      "XXXXXXXX",
      "XX.XX.XX",
      "XXXXXXXX",
      "..X..X..",
      ".X.XX.X.",
      "X.X..X.X",
    ],
    [
      "..XXXX..",
      ".XXXXXX.",
      "XXXXXXXX",
      "XX.XX.XX",
      "XXXXXXXX",
      ".X.XX.X.",
      "X..XX..X",
      ".X....X.",
    ],
  ],
  // 3 — boss (caveira)
  [
    [
      "..XXXX..",
      ".XXXXXX.",
      "XXXXXXXX",
      "X..XX..X",
      "XXXXXXXX",
      ".XX..XX.",
      ".X.XX.X.",
      "X......X",
    ],
    [
      "..XXXX..",
      ".XXXXXX.",
      "XXXXXXXX",
      "X..XX..X",
      "XXXXXXXX",
      ".XX..XX.",
      "X..XX..X",
      ".X....X.",
    ],
  ],
];

export const UFO_SPRITE = [
  "..XXXXXX..",
  ".XXXXXXXX.",
  "XX.XX.XX.X",
  "XXXXXXXXXX",
  "..X....X..",
];

export function drawBitmap(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const rh = rows.length;
  const rw = rows[0].length;
  const px = w / rw;
  const py = h / rh;
  for (let r = 0; r < rh; r++) {
    for (let c = 0; c < rw; c++) {
      if (rows[r][c] === "X")
        ctx.fillRect(x + c * px, y + r * py, Math.ceil(px), Math.ceil(py));
    }
  }
}
