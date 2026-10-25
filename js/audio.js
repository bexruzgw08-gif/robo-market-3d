// Synthesised sound effects (Web Audio API) and English voice lines (speechSynthesis).

let ctx = null;
let master = null;
let motor = null;
let enabled = true;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);
  startAmbience();
  startMotor();
}

export function setSoundEnabled(on) {
  enabled = on;
  if (master) master.gain.value = on ? 0.6 : 0;
  if (!on) window.speechSynthesis?.cancel();
}
export const soundEnabled = () => enabled;

function noiseBuffer(seconds) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// Store ambience: soft filtered crowd noise plus the hum of fridges and lights.
function startAmbience() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(4);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.6;
  const g = ctx.createGain(); g.gain.value = 0.035;
  src.connect(f).connect(g).connect(master);
  src.start();

  const hum = ctx.createOscillator();
  hum.type = 'sine'; hum.frequency.value = 60;
  const hg = ctx.createGain(); hg.gain.value = 0.018;
  hum.connect(hg).connect(master);
  hum.start();
}

function startMotor() {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth'; osc.frequency.value = 70;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 400;
  const g = ctx.createGain(); g.gain.value = 0;
  osc.connect(f).connect(g).connect(master);
  osc.start();
  motor = { osc, g };
}

// level 0..1 — robot motor loudness/pitch. distance attenuates it.
export function setMotor(level, distance = 5) {
  if (!motor) return;
  const vol = level * 0.07 / Math.max(1, distance * 0.35);
  motor.g.gain.setTargetAtTime(vol, ctx.currentTime, 0.08);
  motor.osc.frequency.setTargetAtTime(60 + level * 50, ctx.currentTime, 0.1);
}

function tone(freq, start, dur, type = 'sine', vol = 0.2) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(g).connect(master);
  o.start(start); o.stop(start + dur + 0.05);
}

export function sfx(name) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime;
  switch (name) {
    case 'notify': tone(880, t, 0.25); tone(1320, t + 0.12, 0.35); break;
    case 'click': tone(1500, t, 0.05, 'square', 0.05); break;
    case 'success': tone(523, t, 0.2); tone(659, t + 0.1, 0.2); tone(784, t + 0.2, 0.4); break;
    case 'error': tone(220, t, 0.25, 'square', 0.08); tone(180, t + 0.15, 0.3, 'square', 0.08); break;
    case 'pick': tone(600, t, 0.08, 'triangle', 0.15); tone(900, t + 0.06, 0.1, 'triangle', 0.12); break;
    case 'beep': tone(1000, t, 0.12, 'sine', 0.1); break;
    case 'levelup': [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.12, 0.35, 'triangle', 0.18)); break;
    case 'step': {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuffer(0.08);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600 + Math.random() * 300;
      const g = ctx.createGain(); g.gain.value = 0.12;
      s.connect(f).connect(g).connect(master); s.start(t);
      break;
    }
    case 'door': {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuffer(0.9);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(1200, t + 0.8);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.08, t + 0.2); g.gain.linearRampToValueAtTime(0, t + 0.9);
      s.connect(f).connect(g).connect(master); s.start(t);
      break;
    }
  }
}

let voices = [];
function loadVoices() { voices = window.speechSynthesis?.getVoices() || []; }
if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

// Speak an English line with the customer's accent and pitch.
export function speak(text, { lang = 'en-US', rate = 1, pitch = 1 } = {}) {
  if (!enabled || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  u.pitch = pitch;
  const v = voices.find((x) => x.lang.replace('_', '-') === lang) || voices.find((x) => x.lang.startsWith('en'));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
