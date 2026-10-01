// RASTETRIS — efeitos sonoros sintetizados com WebAudio (zero assets, zero dependências).
// A música de fundo vem da playlist do Audius (music-player.tsx); aqui são só os SFX.

import type { GameEvent } from "@/features/app/engine/engine";

type OscType = OscillatorType;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  /** Precisa ser chamado dentro de um gesto do usuário (toque/tecla). */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      // compressor evita estourar quando vários sons tocam juntos (explosões + combos)
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 6;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscType,
    vol: number,
    slideTo?: number,
    delay = 0,
  ) {
    const c = this.ctx;
    if (!c || !this.master || this.muted) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo)
      o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(
    dur: number,
    vol: number,
    cutoff = 2400,
    delay = 0,
    type: BiquadFilterType = "lowpass",
  ) {
    const c = this.ctx;
    if (!c || !this.master || !this.noiseBuf || this.muted) return;
    const t0 = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(cutoff, t0);
    f.frequency.exponentialRampToValueAtTime(
      type === "lowpass" ? 180 : cutoff * 1.6,
      t0 + dur,
    );
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }

  private arp(
    notes: number[],
    step: number,
    type: OscType,
    vol: number,
    len = 0.16,
    delay = 0,
  ) {
    notes.forEach((n, i) =>
      this.tone(n, len, type, vol, undefined, delay + i * step),
    );
  }

  /** Explosão em camadas: estouro de ruído + corpo grave + estalo agudo. */
  private explosion(size: number) {
    this.noise(0.25 + size * 0.35, 0.22 + size * 0.18, 3800);
    this.tone(
      220 - size * 60,
      0.25 + size * 0.4,
      "sawtooth",
      0.1 + size * 0.06,
      32,
    );
    this.tone(95, 0.3 + size * 0.5, "sine", 0.22 + size * 0.1, 28);
    this.noise(0.08, 0.2, 7000, 0, "highpass");
    if (size > 0.6) {
      this.noise(0.5, 0.25, 2500, 0.12);
      this.tone(70, 0.7, "sine", 0.25, 24, 0.1);
    }
  }

  play(e: GameEvent) {
    switch (e.type) {
      case "move":
        this.tone(210, 0.03, "square", 0.025);
        break;
      case "rotate":
        this.tone(420, 0.05, "square", 0.04, 560);
        break;
      case "hold":
        this.tone(300, 0.09, "triangle", 0.08, 450);
        break;
      case "land":
        this.tone(110, 0.08, "sine", 0.12, 55);
        break;
      case "hard":
        this.noise(0.16, 0.22, 1800);
        this.tone(160, 0.14, "sine", 0.18, 45);
        break;

      // ─── TIROS ─────────────────────────────────────────────────────────────
      case "shot":
        // laser do jogador: "pew" descendente + estalo
        for (let i = 0; i < Math.min(e.n, 4); i++) {
          this.tone(1500 - i * 140, 0.16, "sawtooth", 0.06, 240, i * 0.03);
          this.tone(760 - i * 70, 0.12, "square", 0.035, 180, i * 0.03 + 0.01);
        }
        this.noise(0.05, 0.12, 6500, 0, "highpass");
        break;
      case "invfire":
        // tiro do invader: zap grave e curto
        this.tone(520, 0.2, "square", 0.04, 130);
        this.tone(260, 0.16, "sawtooth", 0.035, 90, 0.02);
        break;
      case "hit":
        this.tone(240, 0.07, "square", 0.07, 120);
        this.noise(0.06, 0.12, 3000);
        break;
      case "absorb":
        this.tone(190, 0.08, "triangle", 0.1, 100);
        break;
      case "garbage":
        this.tone(75, 0.18, "sawtooth", 0.14, 40);
        this.noise(0.12, 0.15, 900);
        break;

      // ─── EXPLOSÕES ─────────────────────────────────────────────────────────
      case "kill":
        this.explosion(e.boss ? 1 : 0.25);
        break;
      case "ufokill":
        this.explosion(0.5);
        this.tone(1400, 0.45, "square", 0.08, 120);
        this.arp([880, 1175, 1568], 0.06, "triangle", 0.09, 0.16, 0.12);
        break;

      // ─── COMBOS (sobem de tom a cada nível, até 10X) ───────────────────────
      case "clear": {
        const k = Math.pow(2, Math.min(Math.max(e.combo, 0), 9) / 12); // ~1 semitom por combo
        const base = [523, 659, 784, 1047]
          .slice(0, 1 + Math.min(e.lines, 3))
          .map((n) => n * k);
        this.arp(base, 0.055, "square", 0.07);
        if (e.combo >= 1) {
          // "ding" de combo, mais brilhante a cada nível
          this.tone(1568 * k, 0.28, "triangle", 0.09, undefined, 0.2);
          this.tone(2093 * k, 0.35, "sine", 0.07, undefined, 0.24);
        }
        if (e.combo >= 5) this.noise(0.4, 0.14, 5000, 0.1, "highpass");
        if (e.combo >= 9)
          this.arp(
            [1047, 1319, 1568, 2093, 2637],
            0.05,
            "square",
            0.07,
            0.22,
            0.3,
          );
        break;
      }
      case "tetris":
        this.arp([392, 523, 659, 784, 1047, 1319], 0.06, "square", 0.08, 0.22);
        this.noise(0.5, 0.25, 4000, 0.1);
        this.tone(70, 0.8, "sine", 0.25, 30);
        break;
      case "multi":
        this.arp([784, 988, 1175, 1568], 0.05, "square", 0.07, 0.14);
        break;

      // ─── BÔNUS DE PONTOS (avatar): "moeda" brilhante ───────────────────────
      case "match": {
        const k = 1 + Math.min(Math.max(e.n - 4, 0), 6) * 0.06;
        this.tone(1319 * k, 0.09, "square", 0.08);
        this.tone(1760 * k, 0.3, "square", 0.08, undefined, 0.08);
        this.arp(
          [2093, 2637, 3136, 4186].map((n) => n * k),
          0.045,
          "triangle",
          0.06,
          0.16,
          0.16,
        );
        if (e.n >= 7)
          this.arp(
            [523, 659, 784, 1047, 1319],
            0.06,
            "square",
            0.06,
            0.2,
            0.35,
          );
        break;
      }

      case "shield":
        this.arp([660, 520, 400, 300], 0.12, "sawtooth", 0.1, 0.16);
        this.noise(0.4, 0.28, 1500);
        break;
      case "wave":
        this.arp([262, 330, 392], 0.12, "triangle", 0.1, 0.18);
        break;
      case "waveclear":
        this.arp([523, 659, 784, 1047, 784, 1047], 0.07, "square", 0.07, 0.14);
        this.arp([2093, 2637], 0.08, "triangle", 0.06, 0.2, 0.35);
        break;
      case "level":
        this.arp([440, 554, 659, 880], 0.07, "triangle", 0.11, 0.18);
        break;
      case "ufo":
        for (let i = 0; i < 6; i++)
          this.tone(i % 2 ? 620 : 820, 0.1, "sine", 0.05, undefined, i * 0.1);
        break;
      case "gameover":
        this.tone(440, 1.1, "sawtooth", 0.16, 45);
        this.noise(0.9, 0.3, 2000);
        break;
      case "continue":
        this.arp([262, 330, 392, 523, 659, 784], 0.07, "square", 0.08, 0.2);
        break;
    }
  }
}

/** Vibração curta para mobile (ignorada onde não existe). */
export function haptic(e: GameEvent) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  switch (e.type) {
    case "hard":
      navigator.vibrate(12);
      break;
    case "clear":
      navigator.vibrate(e.lines >= 4 ? [30, 30, 60] : 25);
      break;
    case "match":
      navigator.vibrate([15, 20, 15]);
      break;
    case "shield":
      navigator.vibrate([60, 40, 60]);
      break;
    case "kill":
      navigator.vibrate(e.boss ? [50, 30, 90] : 10);
      break;
    case "gameover":
      navigator.vibrate(180);
      break;
  }
}
