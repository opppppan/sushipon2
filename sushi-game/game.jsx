// Main sushi-suika game view.
// Expects sprites.js, physics.js, audio.js to be loaded globally.

const { useEffect, useRef, useState, useCallback } = React;

// --- Playfield constants (internal coordinate space). ---
// We design against this pixel grid, then scale up via CSS for crispness.
const FIELD_W = 220;
const FIELD_H = 480;
const DANGER_Y = 80;
const WALL_INSET = 4;

// ------- Small pixel-text helper (English/number only, 5x7 font) -------
const FONT5x7 = {
  '0':['01110','10001','10011','10101','11001','10001','01110'],
  '1':['00100','01100','00100','00100','00100','00100','01110'],
  '2':['01110','10001','00001','00110','01000','10000','11111'],
  '3':['11110','00001','00001','01110','00001','00001','11110'],
  '4':['00010','00110','01010','10010','11111','00010','00010'],
  '5':['11111','10000','11110','00001','00001','10001','01110'],
  '6':['00110','01000','10000','11110','10001','10001','01110'],
  '7':['11111','00001','00010','00100','01000','01000','01000'],
  '8':['01110','10001','10001','01110','10001','10001','01110'],
  '9':['01110','10001','10001','01111','00001','00010','01100'],
  ':':['00000','00100','00000','00000','00000','00100','00000'],
  '-':['00000','00000','00000','11111','00000','00000','00000'],
  '.':['00000','00000','00000','00000','00000','00100','00000'],
  '/':['00001','00010','00010','00100','01000','01000','10000'],
  '!':['00100','00100','00100','00100','00100','00000','00100'],
  '?':['01110','10001','00001','00110','00100','00000','00100'],
  ' ':['00000','00000','00000','00000','00000','00000','00000'],
};
// letters (upper)
const LETTERS = {
  'A':['01110','10001','10001','11111','10001','10001','10001'],
  'B':['11110','10001','10001','11110','10001','10001','11110'],
  'C':['01110','10001','10000','10000','10000','10001','01110'],
  'D':['11110','10001','10001','10001','10001','10001','11110'],
  'E':['11111','10000','10000','11110','10000','10000','11111'],
  'F':['11111','10000','10000','11110','10000','10000','10000'],
  'G':['01110','10001','10000','10111','10001','10001','01110'],
  'H':['10001','10001','10001','11111','10001','10001','10001'],
  'I':['01110','00100','00100','00100','00100','00100','01110'],
  'J':['00111','00010','00010','00010','00010','10010','01100'],
  'K':['10001','10010','10100','11000','10100','10010','10001'],
  'L':['10000','10000','10000','10000','10000','10000','11111'],
  'M':['10001','11011','10101','10101','10001','10001','10001'],
  'N':['10001','11001','10101','10011','10001','10001','10001'],
  'O':['01110','10001','10001','10001','10001','10001','01110'],
  'P':['11110','10001','10001','11110','10000','10000','10000'],
  'Q':['01110','10001','10001','10001','10101','10010','01101'],
  'R':['11110','10001','10001','11110','10100','10010','10001'],
  'S':['01111','10000','10000','01110','00001','00001','11110'],
  'T':['11111','00100','00100','00100','00100','00100','00100'],
  'U':['10001','10001','10001','10001','10001','10001','01110'],
  'V':['10001','10001','10001','10001','10001','01010','00100'],
  'W':['10001','10001','10001','10101','10101','10101','01010'],
  'X':['10001','10001','01010','00100','01010','10001','10001'],
  'Y':['10001','10001','10001','01010','00100','00100','00100'],
  'Z':['11111','00001','00010','00100','01000','10000','11111'],
};
Object.assign(FONT5x7, LETTERS);

function drawText(ctx, str, x, y, color = '#fcfcfc', scale = 1) {
  const s = String(str).toUpperCase();
  let cx = x;
  ctx.fillStyle = color;
  for (const ch of s) {
    const glyph = FONT5x7[ch] || FONT5x7[' '];
    for (let row = 0; row < 7; row++) {
      const line = glyph[row];
      for (let col = 0; col < 5; col++) {
        if (line[col] === '1') {
          ctx.fillRect(cx + col * scale, y + row * scale, scale, scale);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextShadow(ctx, str, x, y, color, shadow, scale = 1) {
  drawText(ctx, str, x + scale, y + scale, shadow, scale);
  drawText(ctx, str, x, y, color, scale);
}

// ---------- Particles (score pops, dust) ----------
class Particles {
  constructor() { this.list = []; }
  add(p) { this.list.push(p); }
  step() {
    for (const p of this.list) {
      p.x += p.vx; p.y += p.vy;
      p.vy += (p.gravity ?? 0.15);
      p.life--;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }
  draw(ctx) {
    for (const p of this.list) {
      if (p.kind === 'text') {
        const a = Math.min(1, p.life / 30);
        ctx.globalAlpha = a;
        drawTextShadow(ctx, p.text, p.x | 0, p.y | 0, p.color, '#000', p.scale || 1);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'dot') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x | 0, p.y | 0, p.size || 2, p.size || 2);
      } else if (p.kind === 'sparkle') {
        const a = Math.min(1, p.life / 20);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#fcfcfc';
        const s = p.size || 2;
        ctx.fillRect(p.x - s, p.y, s * 2 + 1, 1);
        ctx.fillRect(p.x, p.y - s, 1, s * 2 + 1);
        ctx.globalAlpha = 1;
      }
    }
  }
}

// ---------- Main component ----------
function SushiGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    const v = parseInt(localStorage.getItem('sushi_best') || '0', 10);
    return isNaN(v) ? 0 : v;
  });
  const [nextIdx, setNextIdx] = useState(0);
  const [queueIdx, setQueueIdx] = useState(0); // the one after next
  const [discovered, setDiscovered] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sushi_seen') || '[0]'); }
    catch (e) { return [0]; }
  });
  const [over, setOver] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [eatBanner, setEatBanner] = useState(null);
  const [muted, setMuted] = useState(false);
  const [quip, setQuip] = useState(null); // transient message

  const QUIPS_MERGE = [
    'OISHII!', 'NICE!', 'UMAI!', 'YATTA!', 'COMBO!', 'SUGOI!', 'MAIUU!',
  ];
  const QUIPS_BIG = [
    '大トロの気配…', 'WHAT IS THIS', 'STILL SUSHI?', '板前 APPROACHES',
    '寿司の向こう側', 'MAXIMUM SUSHI',
  ];

  // Randomize next-drop level (only first 5 levels appear from the queue).
  const randomDropLevel = () => {
    const r = Math.random();
    if (r < 0.45) return 0;
    if (r < 0.78) return 1;
    if (r < 0.92) return 2;
    if (r < 0.99) return 3;
    return 4;
  };

  const restart = useCallback(() => {
    const W = new window.SushiPhysics.World(FIELD_W - WALL_INSET * 2, FIELD_H);
    W.leftX = WALL_INSET;
    W.rightX = FIELD_W - WALL_INSET;
    W.groundY = FIELD_H - 6;
    W.dangerY = DANGER_Y;
    const p = new Particles();
    const first = randomDropLevel();
    const second = randomDropLevel();
    setScore(0);
    setOver(false);
    setNextIdx(first);
    setQueueIdx(second);
    setQuip(null);
    setEatBanner(null);
    stateRef.current = {
      world: W,
      particles: p,
      cursorX: FIELD_W / 2,
      holding: true,
      holdLevel: first,
      nextLevel: second,
      lastDrop: 0,
      scoreLocal: 0,
      flash: 0,
      shake: 0,
      tick: 0,
    };

    W.onMerge = (nb, a, b) => {
      const sp = window.SUSHI_SPRITES[nb.level];
      stateRef.current.scoreLocal += sp.score;
      setScore(stateRef.current.scoreLocal);
      // update discovered
      setDiscovered((prev) => {
        if (prev.includes(nb.level)) return prev;
        const next = [...prev, nb.level].sort((x, y) => x - y);
        localStorage.setItem('sushi_seen', JSON.stringify(next));
        return next;
      });
      // SHIROI PON born (max level) → trigger the "eat everything" sequence
      if (nb.level === window.SUSHI_SPRITES.length - 1) {
        stateRef.current.ponBorn = nb;
        stateRef.current.flash = 10;
        stateRef.current.shake = 14;
        window.SushiSFX.bigMerge();
        return;
      }
      // sound + particles
      if (nb.level >= 7) {
        window.SushiSFX.bigMerge();
        stateRef.current.shake = 16;
        setQuip({ text: QUIPS_BIG[Math.floor(Math.random() * QUIPS_BIG.length)], life: 90 });
      } else {
        window.SushiSFX.merge(nb.level);
      }
      stateRef.current.flash = 6;
      const quipText = `+${sp.score}`;
      p.add({ kind: 'text', text: quipText, x: nb.x - 10, y: nb.y - nb.r - 10, vx: 0, vy: -1.2, gravity: 0.05, life: 40, color: '#fcfcfc', scale: 1 });
      // sparkles
      const count = 6 + nb.level * 2;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const spd = 1 + Math.random() * 2;
        p.add({ kind: 'sparkle', x: nb.x, y: nb.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 18 + Math.random() * 10, size: 2, gravity: 0.1 });
      }
      // merge random quip text above playfield
      if (Math.random() < 0.6 && nb.level < 7) {
        setQuip({ text: QUIPS_MERGE[Math.floor(Math.random() * QUIPS_MERGE.length)], life: 50 });
      }
    };

    W.onGameOver = () => {
      window.SushiSFX.over();
      setOver(true);
      setBest((prev) => {
        const nb = Math.max(prev, stateRef.current.scoreLocal);
        localStorage.setItem('sushi_best', String(nb));
        return nb;
      });
    };

    W.onMaxClash = (a, b) => {
      // 2 SHIROI PON collided → enter shooter mini-game
      if (!window.SushiShooter) return;
      const st = stateRef.current;
      st.shooter = window.SushiShooter.create(FIELD_W, FIELD_H);
      st.shooter.onComplete = (bonus, survived) => {
        st.scoreLocal += bonus;
        setScore(st.scoreLocal);
        st.shooter = null;
        // remove all bodies — fresh field
        st.world.bodies = [];
        if (window.SushiSFX) window.SushiSFX.bigMerge();
      };
      window.SushiSFX.bigMerge();
      stateRef.current.shake = 24;
      stateRef.current.flash = 12;
    };
  }, []);

  // Initial setup
  useEffect(() => {
    if (!window.SUSHI_SPRITES) return;
    restart();
    window.SushiSFX.start();
  }, [restart]);

  // Quip life
  useEffect(() => {
    if (!quip) return;
    const id = setInterval(() => {
      setQuip((q) => (q ? (q.life > 1 ? { ...q, life: q.life - 1 } : null) : null));
    }, 30);
    return () => clearInterval(id);
  }, [quip]);

  // Drop logic
  const doDrop = useCallback(() => {
    const st = stateRef.current;
    if (!st || over || st.shooter || st.eater || !st.holding) return;
    if (st.tick - st.lastDrop < 18) return; // cooldown
    const level = st.holdLevel;
    const sp = window.SUSHI_SPRITES[level];
    const x = Math.max(WALL_INSET + sp.radius, Math.min(FIELD_W - WALL_INSET - sp.radius, st.cursorX));
    const b = new window.SushiPhysics.Body(x, 34, sp.radius, level);
    b.spawnProtect = 6;
    st.world.add(b);
    st.lastDrop = st.tick;
    window.SushiSFX.drop();
    // queue advance
    st.holdLevel = st.nextLevel;
    st.nextLevel = randomDropLevel();
    setNextIdx(st.holdLevel);
    setQueueIdx(st.nextLevel);
    // brief hold-disable
    st.holding = false;
    setTimeout(() => { if (stateRef.current) stateRef.current.holding = true; }, 280);
  }, [over]);

  // Input
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const getX = (e) => {
      const rect = cvs.getBoundingClientRect();
      const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return (px / rect.width) * FIELD_W;
    };

    const onMove = (e) => {
      if (!stateRef.current) return;
      const x = getX(e);
      const prev = stateRef.current.cursorX;
      stateRef.current.cursorX = Math.max(0, Math.min(FIELD_W, x));
      if (Math.abs(prev - stateRef.current.cursorX) > 8) window.SushiSFX.move();
    };
    const onDown = (e) => {
      e.preventDefault();
      window.SushiSFX.resume();
      if (over) return;
      onMove(e);
      doDrop();
    };
    const onKey = (e) => {
      if (!stateRef.current) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') stateRef.current.cursorX = Math.max(0, stateRef.current.cursorX - 10);
      if (e.key === 'ArrowRight' || e.key === 'd') stateRef.current.cursorX = Math.min(FIELD_W, stateRef.current.cursorX + 10);
      if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); doDrop(); }
      if (e.key === 'r' || e.key === 'R') restart();
    };

    cvs.addEventListener('mousemove', onMove);
    cvs.addEventListener('mousedown', onDown);
    cvs.addEventListener('touchmove', onMove, { passive: false });
    cvs.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      cvs.removeEventListener('mousemove', onMove);
      cvs.removeEventListener('mousedown', onDown);
      cvs.removeEventListener('touchmove', onMove);
      cvs.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [doDrop, over, restart]);

  // Render loop
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // --- "SHIROI PON eats everything" sequence ---
    const updateEater = (st) => {
      const E = st.eater;
      if (E.state === 'announce') {
        E.timer--;
        if (E.timer <= 0) E.state = 'eating';
        return;
      }
      if (E.state === 'eating') {
        if (E.chomp > 0) E.chomp--;
        const bodies = st.world.bodies;
        if (bodies.length === 0) {
          E.state = 'full';
          E.timer = 80;
          setEatBanner('ごちそうさまポン！');
          if (window.SushiSFX) window.SushiSFX.bigMerge();
          return;
        }
        // chase the nearest sushi
        let target = null, bestD = Infinity;
        for (const b of bodies) {
          const dx0 = b.x - E.pon.x, dy0 = b.y - E.pon.y;
          const d = dx0 * dx0 + dy0 * dy0;
          if (d < bestD) { bestD = d; target = b; }
        }
        const dx = target.x - E.pon.x, dy = target.y - E.pon.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < E.pon.r + target.r * 0.35) {
          // chomp!
          st.world.bodies = bodies.filter((x) => x !== target);
          const tsp = window.SUSHI_SPRITES[target.level];
          st.scoreLocal += tsp.score;
          setScore(st.scoreLocal);
          E.eaten++;
          E.chomp = 7;
          st.particles.add({ kind: 'text', text: `+${tsp.score}`, x: target.x - 8, y: target.y - 12, vx: 0, vy: -1, gravity: 0.04, life: 28, color: '#fce018', scale: 1 });
          for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 2;
            st.particles.add({ kind: 'sparkle', x: target.x, y: target.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 12 + Math.random() * 8, size: 2, gravity: 0.12 });
          }
          if (window.SushiSFX) window.SushiSFX.merge(1);
          E.pon.r = Math.min(E.pon.r + 1.0, 84);
        } else {
          const spd = 6.5;
          E.pon.x += (dx / dist) * spd;
          E.pon.y += (dy / dist) * spd;
        }
        return;
      }
      if (E.state === 'full') {
        E.timer--;
        E.pon.y -= 1.4;
        if (E.timer <= 0) {
          st.eater = null;
          st.scoreLocal += 100;
          setScore(st.scoreLocal);
          setEatBanner(null);
          // しろいポンが全部食べた → 夢の散歩スタート
          if (window.startDreamGame) {
            const screen = document.querySelector('.sfc-screen');
            if (screen) setTimeout(() => window.startDreamGame(screen), 400);
          }
        }
        return;
      }
    };

    let raf;
    const loop = () => {
      const st = stateRef.current;
      if (!st) { raf = requestAnimationFrame(loop); return; }
      if (!over) {
        if (st.shooter) {
          st.shooter.handleInput({ cursorX: st.cursorX, fire: st.firing });
          st.shooter.step();
        } else if (st.eater) {
          updateEater(st);
        } else {
          st.world.step();
          if (st.ponBorn) {
            const nb = st.ponBorn; st.ponBorn = null;
            st.world.bodies = st.world.bodies.filter((x) => x !== nb);
            st.eater = { pon: { x: nb.x, y: nb.y, r: nb.r }, state: 'announce', timer: 70, eaten: 0, chomp: 0 };
            setEatBanner('ぜんぶ食べるポン！');
          }
        }
      }
      st.particles.step();
      st.tick++;
      if (st.flash > 0) st.flash--;
      if (st.shake > 0) st.shake--;

      // BG
      ctx.fillStyle = '#1a1020';
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
      // shake offset
      const sx = st.shake > 0 ? (Math.random() * 4 - 2) | 0 : 0;
      const sy = st.shake > 0 ? (Math.random() * 4 - 2) | 0 : 0;
      ctx.save();
      ctx.translate(sx, sy);

      // playfield background (checker to evoke sushi bar tile)
      if (!st.shooter) {
      for (let y = 0; y < FIELD_H; y += 16) {
        for (let x = 0; x < FIELD_W; x += 16) {
          const dark = ((x / 16 + y / 16) & 1) === 0;
          ctx.fillStyle = dark ? '#221528' : '#2a1a32';
          ctx.fillRect(x, y, 16, 16);
        }
      }

      // danger line
      ctx.fillStyle = '#d03030';
      for (let x = 0; x < FIELD_W; x += 8) ctx.fillRect(x, DANGER_Y, 4, 1);
      // "DANGER" text
      drawText(ctx, 'DANGER', FIELD_W - 48, DANGER_Y - 10, '#d03030', 1);

      // side walls visual (brick-ish)
      ctx.fillStyle = '#704028';
      ctx.fillRect(0, 0, WALL_INSET, FIELD_H);
      ctx.fillRect(FIELD_W - WALL_INSET, 0, WALL_INSET, FIELD_H);
      // ground
      ctx.fillStyle = '#704028';
      ctx.fillRect(0, FIELD_H - 6, FIELD_W, 6);
      ctx.fillStyle = '#a86030';
      for (let x = 0; x < FIELD_W; x += 8) ctx.fillRect(x, FIELD_H - 6, 4, 1);

      // aim cursor (the hanging piece)
      if (!over && st.holding && !st.eater) {
        const sp = window.SUSHI_SPRITES[st.holdLevel];
        const x = Math.max(WALL_INSET + sp.radius, Math.min(FIELD_W - WALL_INSET - sp.radius, st.cursorX));
        // vertical dotted guide
        ctx.fillStyle = '#fcfcfc';
        for (let y = 30; y < FIELD_H - 8; y += 6) {
          ctx.fillRect((x - 0.5) | 0, y, 1, 3);
        }
        // sprite
        const img = sp.canvas;
        const bob = Math.sin(st.tick * 0.1) * 1;
        ctx.drawImage(img, (x - img.width / 2) | 0, (24 + bob - img.height / 2) | 0);
      }

      // bodies
      for (const b of st.world.bodies) {
        const sp = window.SUSHI_SPRITES[b.level];
        const img = sp.canvas;
        const scale = b.pop > 0 ? (1 + b.pop * 0.02) : 1;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        if (scale !== 1) ctx.scale(scale, scale);
        ctx.drawImage(img, (-img.width / 2) | 0, (-img.height / 2) | 0);
        ctx.restore();
      }

      // SHIROI PON eating everything
      if (st.eater) {
        const E = st.eater;
        const pimg = window.SUSHI_SPRITES[window.SUSHI_SPRITES.length - 1].canvas;
        const sc = (E.pon.r * 2) / pimg.width;
        let sxk = 1, syk = 1;
        if (E.chomp > 0) {
          const k = Math.sin((E.chomp / 7) * Math.PI);
          sxk = 1 + k * 0.18; syk = 1 - k * 0.12;
        }
        const bob = E.state === 'eating' ? Math.abs(Math.sin(st.tick * 0.3)) * 3 : 0;
        ctx.save();
        ctx.translate(E.pon.x, E.pon.y - bob);
        ctx.scale(sc * sxk, sc * syk);
        ctx.drawImage(pimg, (-pimg.width / 2) | 0, (-pimg.height / 2) | 0);
        ctx.restore();
      }

      st.particles.draw(ctx);
      } // end if !st.shooter

      if (st.shooter) {
        st.shooter.draw(ctx, { drawText });
      }

      // flash overlay
      if (st.flash > 0) {
        ctx.fillStyle = `rgba(252,252,252,${st.flash / 12})`;
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);
      }

      // HUD at top
      // quip (if any)
      if (quip) {
        const q = quip.text;
        const w = q.length * 6;
        drawTextShadow(ctx, q, ((FIELD_W - w) / 2) | 0, 12, '#fce018', '#000', 1);
      }

      ctx.restore();

      // game over overlay (not shaken)
      if (over) {
        ctx.fillStyle = 'rgba(10,10,10,0.7)';
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);
        drawTextShadow(ctx, 'GAME OVER', 108, 180, '#d03030', '#000', 2);
        drawTextShadow(ctx, 'SCORE', 120, 220, '#fcfcfc', '#000', 1);
        drawTextShadow(ctx, String(st.scoreLocal), 200, 220, '#fce018', '#000', 1);
        drawTextShadow(ctx, 'BEST', 128, 236, '#fcfcfc', '#000', 1);
        drawTextShadow(ctx, String(best), 200, 236, '#fce018', '#000', 1);
        drawTextShadow(ctx, 'PRESS R OR CLICK', 88, 280, '#fcfcfc', '#000', 1);
        drawTextShadow(ctx, 'TO PLAY AGAIN', 100, 296, '#fcfcfc', '#000', 1);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [over, quip, best]);

  // Clicking after game over → restart
  useEffect(() => {
    if (!over) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const onClick = () => restart();
    cvs.addEventListener('click', onClick);
    return () => cvs.removeEventListener('click', onClick);
  }, [over, restart]);

  const toggleMute = () => {
    const nv = !muted;
    setMuted(nv);
    window.SushiSFX.setMuted(nv);
  };

  const sprites = window.SUSHI_SPRITES || [];

  return (
    <div className="game-shell">
      <div className="top-hud">
        <div className="hud-box">
          <div className="hud-label">SCORE</div>
          <div className="hud-val">{String(score).padStart(6, '0')}</div>
        </div>
        <div className="hud-box">
          <div className="hud-label">BEST</div>
          <div className="hud-val">{String(best).padStart(6, '0')}</div>
        </div>
        <div className="hud-box next-box">
          <div className="hud-label">NEXT</div>
          <div className="next-sprites">
            {sprites[nextIdx] && (
              <div className="next-slot big">
                <img src={sprites[nextIdx].canvas.toDataURL()} alt="" />
              </div>
            )}
            {sprites[queueIdx] && (
              <div className="next-slot small">
                <img src={sprites[queueIdx].canvas.toDataURL()} alt="" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="game-layout">
        <div className="evo-panel">
          <div className="evo-title">EVOLUTION</div>
          <div className="evo-sub">しんか じゅん</div>
          <ol className="evo-list-inner">
            {sprites.map((s, i) => (
              <React.Fragment key={i}>
                <li className="evo-item-inner">
                  <div className="evo-num">{String(i + 1).padStart(2, '0')}</div>
                  <img src={s.canvas.toDataURL()} className="evo-img" alt="" />
                  <div className="evo-meta">
                    <div className="evo-name">{s.name}</div>
                    <div className="evo-en">{s.nameEn}</div>
                  </div>
                </li>
                {i < sprites.length - 1 && (
                  <div className="evo-arrow">▼</div>
                )}
              </React.Fragment>
            ))}
          </ol>
        </div>

        <div className="canvas-frame">
          <canvas
            ref={canvasRef}
            width={FIELD_W}
            height={FIELD_H}
            style={{ cursor: over ? 'pointer' : 'crosshair' }}
          />
          {eatBanner && <div className="eat-banner">{eatBanner}</div>}
        </div>
      </div>

      <div className="controls-row">
        <button className="pix-btn" onClick={() => setShowHelp((v) => !v)}>
          {showHelp ? 'CLOSE' : 'HELP / ヘルプ'}
        </button>
        <button className="pix-btn" onClick={toggleMute}>
          {muted ? 'SOUND: OFF' : 'SOUND: ON'}
        </button>
        <button className="pix-btn" onClick={restart}>RESET</button>
      </div>

      {showHelp && (
        <HelpOverlay
          sprites={sprites}
          discovered={discovered}
          onClose={() => setShowHelp(false)}
        />
      )}
    </div>
  );
}

function HelpOverlay({ sprites, discovered, onClose }) {
  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-box" onClick={(e) => e.stopPropagation()}>
        <div className="help-title">HOW TO PLAY / あそびかた</div>
        <ul className="help-list">
          <li>MOVE: マウス / ←→キー</li>
          <li>DROP: CLICK / SPACE</li>
          <li>SAME × SAME = EVOLVE!</li>
          <li>DANGERラインを超えたら GAME OVER</li>
        </ul>
        <div className="help-title">SUSHI CHART / しんかチャート</div>
        <div className="chart">
          {sprites.map((s, i) => {
            const seen = discovered.includes(i);
            return (
              <div key={i} className={'chart-item' + (seen ? '' : ' locked')}>
                <div className="chart-sprite">
                  {seen
                    ? <img src={s.canvas.toDataURL()} alt="" />
                    : <div className="q-mark">?</div>}
                </div>
                <div className="chart-name">{seen ? s.name : '???'}</div>
                <div className="chart-en">{seen ? s.nameEn : '???'}</div>
              </div>
            );
          })}
        </div>
        <div className="help-foot">CLICK ANYWHERE TO CLOSE</div>
      </div>
    </div>
  );
}

window.SushiGame = SushiGame;
