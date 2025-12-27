export class SoundscapeEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.whiteGain = null;
    this.pinkGain = null;
    this.toneGain = null;
    this.whiteSrc = null;
    this.pinkSrc = null;
    this.osc = null;
  }

  _ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0;
    this.master.connect(this.ctx.destination);

    this.whiteGain = this.ctx.createGain();
    this.whiteGain.gain.value = 0.0;
    this.whiteGain.connect(this.master);

    this.pinkGain = this.ctx.createGain();
    this.pinkGain.gain.value = 0.0;
    this.pinkGain.connect(this.master);

    this.toneGain = this.ctx.createGain();
    this.toneGain.gain.value = 0.0;
    this.toneGain.connect(this.master);

    this.osc = this.ctx.createOscillator();
    this.osc.type = "sine";
    this.osc.frequency.value = 144;
    this.osc.connect(this.toneGain);
    this.osc.start();
  }

  async resume() {
    this._ensure();
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  _ramp(param, value, tau = 0.03) {
    this._ensure();
    const t = this.ctx.currentTime;
    param.setTargetAtTime(value, t, tau);
  }

  _makeNoiseBuffer(seconds = 2) {
    this._ensure();
    const length = Math.floor(seconds * this.ctx.sampleRate);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  _startWhiteNoise() {
    if (this.whiteSrc) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._makeNoiseBuffer(2);
    src.loop = true;
    src.connect(this.whiteGain);
    src.start();
    this.whiteSrc = src;
  }

  _startPinkishNoise() {
    if (this.pinkSrc) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._makeNoiseBuffer(2);
    src.loop = true;

    const lp1 = this.ctx.createBiquadFilter();
    lp1.type = "lowpass";
    lp1.frequency.value = 1200;
    lp1.Q.value = 0.7;

    const lp2 = this.ctx.createBiquadFilter();
    lp2.type = "lowpass";
    lp2.frequency.value = 500;
    lp2.Q.value = 0.8;

    src.connect(lp1);
    lp1.connect(lp2);
    lp2.connect(this.pinkGain);

    src.start();
    this.pinkSrc = src;
  }

  start() {
    this._ensure();
    this._startWhiteNoise();
    this._startPinkishNoise();
  }

  stop() {
    this._ensure();
    this._ramp(this.master.gain, 0.0, 0.05);

    const stopAt = this.ctx.currentTime + 0.15;
    const safeStop = (node) => { try { node?.stop(stopAt); } catch {} };
    safeStop(this.whiteSrc);
    safeStop(this.pinkSrc);
    this.whiteSrc = null;
    this.pinkSrc = null;
  }

  applyPreset(preset) {
    this._ensure();
    const layers = preset?.layers ?? {};
    const master = clamp01(layers.master?.vol ?? 0.55);
    const white = clamp01(layers.white?.vol ?? 0.0);
    const pink = clamp01(layers.pink?.vol ?? 0.35);
    const tone = clamp01(layers.tone?.vol ?? 0.12);
    const hz = clampRange(layers.tone?.hz ?? 144, 60, 320);

    this.start();

    this._ramp(this.master.gain, master, 0.04);
    this._ramp(this.whiteGain.gain, white, 0.04);
    this._ramp(this.pinkGain.gain, pink, 0.04);
    this._ramp(this.toneGain.gain, tone, 0.04);
    this._ramp(this.osc.frequency, hz, 0.04);
  }
}

function clamp01(v) { return Math.max(0, Math.min(1, Number(v) || 0)); }
function clampRange(v, a, b) { v = Number(v) || a; return Math.max(a, Math.min(b, v)); }
