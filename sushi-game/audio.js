// Tiny chiptune SFX. 100% synthesized — no assets.
(function () {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
  }

  function blip({ freq = 440, dur = 0.08, type = 'square', gain = 0.25, slide = 0 } = {}) {
    if (muted) return;
    ensure();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) {
      o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + dur);
    }
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start();
    o.stop(ctx.currentTime + dur + 0.02);
  }

  function noise({ dur = 0.12, gain = 0.2 } = {}) {
    if (muted) return;
    ensure();
    if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g); g.connect(master);
    src.start();
  }

  const SFX = {
    drop: () => blip({ freq: 320, dur: 0.06, type: 'square', slide: -80 }),
    bump: () => blip({ freq: 180, dur: 0.04, type: 'triangle', gain: 0.15 }),
    merge: (level) => {
      const base = 260 + level * 40;
      blip({ freq: base, dur: 0.06, type: 'square' });
      setTimeout(() => blip({ freq: base * 1.5, dur: 0.08, type: 'square' }), 50);
      setTimeout(() => blip({ freq: base * 2, dur: 0.12, type: 'square' }), 110);
    },
    bigMerge: () => {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => blip({ freq: 300 + i * 120, dur: 0.1, type: 'square' }), i * 60);
      }
    },
    over: () => {
      blip({ freq: 220, dur: 0.2, type: 'square', slide: -120 });
      setTimeout(() => blip({ freq: 180, dur: 0.22, type: 'square', slide: -90 }), 220);
      setTimeout(() => blip({ freq: 140, dur: 0.4, type: 'square', slide: -60 }), 460);
      setTimeout(() => noise({ dur: 0.4, gain: 0.1 }), 900);
    },
    move: () => blip({ freq: 880, dur: 0.02, type: 'square', gain: 0.08 }),
    start: () => {
      blip({ freq: 440, dur: 0.08 });
      setTimeout(() => blip({ freq: 660, dur: 0.08 }), 90);
      setTimeout(() => blip({ freq: 880, dur: 0.16 }), 180);
    },
  };

  window.SushiSFX = {
    ...SFX,
    setMuted: (v) => { muted = !!v; },
    isMuted: () => muted,
    resume: () => { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
  };
})();
