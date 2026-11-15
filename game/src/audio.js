// Procedural WebAudio sound synthesizer for Vanguard Depot.
// Produces tactical gunfire, impacts, footfalls, and objective telemetry with zero binary assets.
let ctx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      ctx = new AudioCtx();
    }
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

// Generate shared 0.5s white noise buffer
let noiseBuffer = null;
function getNoiseBuffer(ac) {
  if (!noiseBuffer) {
    const length = ac.sampleRate * 0.5;
    noiseBuffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
}

export function playGunshot(type = 'rifle') {
  const ac = getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const oscGain = ac.createGain();
  const noise = ac.createBufferSource();
  const noiseGain = ac.createGain();
  const filter = ac.createBiquadFilter();

  noise.buffer = getNoiseBuffer(ac);
  filter.type = 'lowpass';

  let oscFreq = 140;
  let noiseDecay = 0.18;
  let filterCutoff = 3200;

  if (type === 'pistol') {
    oscFreq = 180;
    noiseDecay = 0.12;
    filterCutoff = 4200;
  } else if (type === 'smg') {
    oscFreq = 160;
    noiseDecay = 0.10;
    filterCutoff = 3600;
  } else if (type === 'shotgun') {
    oscFreq = 90;
    noiseDecay = 0.32;
    filterCutoff = 2200;
  } else if (type === 'sniper') {
    oscFreq = 70;
    noiseDecay = 0.45;
    filterCutoff = 1800;
  }

  // Low frequency punch
  osc.type = 'sine';
  osc.frequency.setValueAtTime(oscFreq, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
  oscGain.gain.setValueAtTime(0.7, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  osc.connect(oscGain);
  oscGain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.15);

  // Noise crack & body
  filter.frequency.setValueAtTime(filterCutoff, now);
  filter.frequency.exponentialRampToValueAtTime(400, now + noiseDecay);
  noiseGain.gain.setValueAtTime(0.6, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDecay);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ac.destination);
  noise.start(now);
  noise.stop(now + noiseDecay + 0.02);
}

export function playHitmarker(headshot = false) {
  const ac = getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'triangle';
  const freq = headshot ? 1400 : 850;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.08);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

export function playFootstep() {
  const ac = getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.07);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}

export function playReload() {
  const ac = getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(500, now);
  osc.frequency.exponentialRampToValueAtTime(250, now + 0.06);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}

export function playExplosion() {
  const ac = getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const noise = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();

  noise.buffer = getNoiseBuffer(ac);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.exponentialRampToValueAtTime(60, now + 0.8);

  gain.gain.setValueAtTime(1.0, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  noise.start(now);
  noise.stop(now + 0.9);
}

export function playObjectiveBeep(intensity = 0.5) {
  const ac = getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'sine';
  const freq = 600 + intensity * 600;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}
