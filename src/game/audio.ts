// Original synthesized sound effects + a tiny original swing loop (Web Audio only).
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private nextNote = 0;
  private step = 0;
  muted = false;

  ensure() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0, dest?: AudioNode) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, freq: number, delay = 0, dest?: AudioNode) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest ?? this.master);
    src.start(t);
  }

  shoot() { this.tone(1100 + Math.random() * 200, 0.06, "square", 0.035, 1700); }
  slash() { this.noise(0.12, 0.2, 3200); this.tone(600, 0.1, "triangle", 0.08, 160); }
  jump() { this.tone(320, 0.16, "triangle", 0.18, 700); }
  dash() { this.noise(0.18, 0.25, 2400); this.tone(500, 0.12, "sine", 0.08, 1200); }
  hit() { this.tone(220, 0.05, "square", 0.04, 140); }
  hurt() { this.tone(520, 0.35, "sawtooth", 0.18, 90); this.noise(0.2, 0.2, 800); }
  tele() { this.tone(660, 0.07, "square", 0.06); this.tone(990, 0.09, "square", 0.06, undefined, 0.08); }
  whistle() { this.tone(900, 0.5, "sine", 0.12, 1800); }
  thud() { this.tone(110, 0.2, "sine", 0.25, 50); this.noise(0.12, 0.15, 400); }
  boom() { this.noise(0.6, 0.45, 500); this.tone(130, 0.5, "sine", 0.35, 35); }
  phase() { [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.18, "square", 0.08, undefined, i * 0.09)); }
  victory() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.2, undefined, i * 0.13)); }
  defeat() { [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.35, "triangle", 0.2, undefined, i * 0.22)); }
  click() { this.tone(700, 0.05, "triangle", 0.12, 900); }

  startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextNote = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.musicTimer = window.setInterval(() => this.schedule(), 50);
  }
  stopMusic() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
  private schedule() {
    if (!this.ctx || !this.musicGain) return;
    const beat = 60 / 150;
    // original walking bass line (C minor-ish, swing feel)
    const bass = [65.4, 77.8, 87.3, 98, 103.8, 98, 87.3, 77.8, 87.3, 103.8, 116.5, 130.8, 116.5, 98, 87.3, 73.4];
    while (this.nextNote < this.ctx.currentTime + 0.2) {
      const delay = this.nextNote - this.ctx.currentTime;
      const s = this.step % 16;
      const note = bass[s] ?? 65.4;
      const musicGain = this.musicGain;
      this.tone(note, beat * 0.9, "triangle", 0.5, undefined, delay, musicGain);
      this.noise(0.04, 0.12, 7000, delay + beat * 0.66, this.musicGain);
      if (s % 4 === 0) {
        const root = note * 4;
        [1, 1.19, 1.5].forEach((m) => this.tone(root * m, 0.18, "square", 0.04, undefined, delay + beat * 0.66, musicGain));
      }
      this.nextNote += beat;
      this.step++;
    }
  }
}
