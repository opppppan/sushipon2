// Boss battle mini-game triggered when 2 SHIROI PON collide.
// 3-phase boss fight with HP bar, waves, and victory payoff.
(function () {
  const PLAYER_Y_OFFSET = 36;
  const BOSS_MAX_HP = 120;

  const PAL = {
    K: '#0a0a0a', W: '#fcfcfc', R: '#d03030', Y: '#fce018',
    G: '#3cb878', B: '#3060d0', P: '#f098b8', T: '#a86030', X: '#7a1e1c',
    M: '#9020c0', O: '#f88030',
    '.': null, ' ': null,
  };

  function makeSprite(grid) {
    const h = grid.length, w = grid[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const col = PAL[grid[y][x]];
      if (col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
    }
    return c;
  }

  const ONI = makeSprite([
    '..KK......KK..',
    '.KYK......KYK.',
    '.KYYK....KYYK.',
    'KRRRRRRRRRRRRK',
    'KRWRRRRRRRRWRK',
    'KRWKRRRRRRKWRK',
    'KRRRRKKKKRRRRK',
    'KRRRRRRRRRRRRK',
    'KRRKRRRRRRKRRK',
    'KRRKKKKKKKKRRK',
    'KRRWWWWWWWWRRK',
    '.KRRRRRRRRRRK.',
    '..KRRRRRRRRK..',
    '...KKKKKKKK...',
  ]);
  const SOY = makeSprite([
    '.....KK.....',
    '....KWWK....',
    '....KXXK....',
    '...KXXXXK...',
    '..KXXXXXXK..',
    '.KXXXXXXXXK.',
    'KXXXKXXXXXXK',
    'KXXKKXXXXXXK',
    'KXXXXXXXXXXK',
    'KXXXXXXXXXXK',
    '.KKKKKKKKKK.',
    '...KKKKKK...',
  ]);
  const WASABI = makeSprite([
    '....KKKK....',
    '..KKGGGGKK..',
    '.KGGGGGGGGK.',
    'KGGGWGGGGGGK',
    'KGGWWGGGKGGK',
    'KGGGGGGKKGGK',
    'KGGGKGGGGGGK',
    'KGGKKGGGGGGK',
    '.KGGGGGGGGK.',
    '..KKKKKKKK..',
  ]);
  const GARI = makeSprite([
    '....KKKK....',
    '..KKPPPPKK..',
    '.KPPPPPPPPK.',
    'KPPPWPPPPPPK',
    'KPPPPPPPPPPK',
    'KPPPPKKPPPPK',
    '.KPPPKKPPPK.',
    '..KKPPPPKK..',
    '....KKKK....',
  ]);

  // Player ship
  const PLAYER = makeSprite([
    '.......KK.......',
    '......KWWK......',
    '....KKKWWKKK....',
    '...KWWWWWWWWK...',
    '..KWWWWWWWWWWK..',
    '.KWWKWWWWWWKWWK.',
    'KWWWWWWWWWWWWWWK',
    'KWWRRWWWWWWRRWWK',
    'KWWWWWWWWWWWWWWK',
    '.KWWWWWWWWWWWWK.',
    '..KWWWWWWWWWWK..',
    '...KKKKKKKKKK...',
  ]);

  // Phase-specific boss sprites (each progressively wilder)
  const BOSS_P1 = makeSprite([
    '......KKKKKKK.........',
    '....KKWWWWWWWKK.......',
    '....KWWWWWWWWWK.......',
    '...KWWWKWWKKWWWK......',
    '...KWWWKWWKKWWWK......',
    '..KWWWWWWWWWWWWWK.....',
    '.KWWWWWWWWWWWWWWWK....',
    'KWWWWWWWWWWWWWWWWWK...',
    'KWWWKWWWWWWWWWWKWWK...',
    'KWWWKWWKKKKKKWWKWWK...',
    'KWWWWWKKKKKKKKWWWWK...',
    'KWWWWWWWWWWWWWWWWWK...',
    '.KWWWWWWWWWWWWWWWK....',
    '..KKWWWWWWWWWWWKK.....',
    '...KKKKWWWWWKKKK......',
    '......KWWKWWK.........',
    '......KKK.KKK.........',
    '......................',
  ]);
  // Phase 2: red angry eyes
  const BOSS_P2 = makeSprite([
    '......KKKKKKK.........',
    '....KKWWWWWWWKK.......',
    '....KWWWWWWWWWK.......',
    '...KWWWRWWRRWWWK......',
    '...KWWWRRWRRRWWK......',
    '..KWWWWWWWWWWWWWK.....',
    '.KWWWWWWWWWWWWWWWK....',
    'KWRWWWWWWWWWWWWWRWK...',
    'KWWWRRWWWWWWWWRRWWK...',
    'KWWWRRKKRRRRKKRRWWK...',
    'KWWWWWRRRRRRRRWWWWK...',
    'KWWWWWWWWWWWWWWWWWK...',
    '.KWWWWWWWWWWWWWWWK....',
    '..KKWWWWWWWWWWWKK.....',
    '...KKKKWWWWWKKKK......',
    '......KWWKWWK.........',
    '......KKK.KKK.........',
    '......................',
  ]);
  // Phase 3: berserk - purple aura, multi-eyes
  const BOSS_P3 = makeSprite([
    'M.....KKKKKKK......M..',
    '.M..KKWWWWWWWKK..M....',
    '....KWWWMMWWMMWK......',
    '...KMWWMMWWMMWWWK.....',
    '...KWWMMWWWWMMMWK.....',
    '..KMWWWWMMMMWWWWWMK...',
    '.KWWWMMWWWWWWWWMMWK...',
    'KWRRMWWWWMMWWWWWMRWK..',
    'KWRRWWWWMMMMWWWWRRWK..',
    'KWWWMRRMMMMMMRRMRWWK..',
    'KWWWWMRRRRRRRRMMWWWK..',
    'KWMMWWWWWWWWWWWMMWWK..',
    '.KWWMWWWWWWWWWWMWWK...',
    '..KKWWWWWWWWWWWKK.....',
    '...KMMKWWWWWKMMK......',
    '......KWMKWMK.........',
    '......KKK.KKK.........',
    'M..................M..',
  ]);

  const BOSS_SPRITES = [BOSS_P1, BOSS_P2, BOSS_P3];

  // Quips by phase
  const QUIPS = [
    ['ポンポンポン…', 'WHO AM I?', 'OISHII?', 'おなかすいた'],
    ['ワレワレハ ポンダ', 'YOUR SUSHI BELONGS TO US', 'WASABI!?', 'ポンポンっ!!!'],
    ['さいごのポン', 'FINAL FORM', 'ポォォォン', 'WE ARE FOREVER'],
  ];

  class BossBattle {
    constructor(W, H) { this.W = W; this.H = H; this.reset(); }
    reset() {
      this.tick = 0;
      this.player = { x: this.W / 2, y: this.H - PLAYER_Y_OFFSET, cd: 0, hp: 3, iframes: 0 };
      this.bullets = [];
      this.enemyBullets = [];
      this.enemies = [];
      this.particles = [];
      this.score = 0;
      this.kills = 0;
      this.state = 'intro';
      this.stateTimer = 110;
      this.shake = 0;
      this.flash = 0;
      this.flashCol = '#d03030';
      // boss
      this.bossX = this.W / 2;
      this.bossY = -20;
      this.bossDir = 1;
      this.bossHp = BOSS_MAX_HP;
      this.bossMaxHp = BOSS_MAX_HP;
      this.bossPhase = 0;
      this.bossAttackTimer = 90;
      this.bossHitFlash = 0;
      this.fireWish = false;
      this.victoryStage = 0;
      this.outroSurvived = false;
      this.quip = null;
      this.setQuip(QUIPS[0][0], 140);
    }
    setQuip(t, life) { this.quip = { t, life, max: life }; }
    handleInput(input) {
      if (input.cursorX != null) this.player.x = Math.max(10, Math.min(this.W - 10, input.cursorX));
      if (input.fire || input.fireOnce) this.fireWish = true;
    }
    step() {
      this.tick++;
      if (this.shake > 0) this.shake--;
      if (this.flash > 0) this.flash--;
      if (this.bossHitFlash > 0) this.bossHitFlash--;
      if (this.quip) { this.quip.life--; if (this.quip.life <= 0) this.quip = null; }

      if (this.state === 'intro') {
        this.stateTimer--;
        this.bossY = -20 + (110 - this.stateTimer) * 0.4;
        if (this.bossY > 24) this.bossY = 24;
        if (this.stateTimer <= 0) { this.state = 'play'; this.setQuip('FIGHT!', 50); }
        return;
      }
      if (this.state === 'victory') {
        this.stateTimer--;
        // Continuous fireworks
        if (this.tick % 4 === 0) this.firework();
        if (this.stateTimer <= 0 && this.onComplete) {
          const total = this.score + 500 + this.player.hp * 200; // tier bonuses
          this.onComplete(total, true);
          this.onComplete = null;
        }
        // update particles only
        for (const p of this.particles) { p.x += p.vx; p.y += p.vy; p.vy += (p.g||0); p.life--; }
        this.particles = this.particles.filter(p => p.life > 0);
        return;
      }
      if (this.state === 'defeat') {
        this.stateTimer--;
        if (this.stateTimer <= 0 && this.onComplete) {
          this.onComplete(this.score, false);
          this.onComplete = null;
        }
        for (const p of this.particles) { p.x += p.vx; p.y += p.vy; p.vy += (p.g||0); p.life--; }
        this.particles = this.particles.filter(p => p.life > 0);
        return;
      }

      // PLAY
      if (this.player.cd > 0) this.player.cd--;
      if (this.player.iframes > 0) this.player.iframes--;

      // auto-fire
      if ((this.fireWish || this.tick % 11 === 0) && this.player.cd === 0) {
        if (this.bossPhase >= 1) {
          // 3-way from phase 2
          this.bullets.push({ x: this.player.x, y: this.player.y - 8, vx: 0, vy: -3.6, life: 200 });
          if (this.bossPhase >= 1) {
            this.bullets.push({ x: this.player.x, y: this.player.y - 6, vx: -0.7, vy: -3.4, life: 200 });
            this.bullets.push({ x: this.player.x, y: this.player.y - 6, vx: 0.7, vy: -3.4, life: 200 });
          }
        } else {
          this.bullets.push({ x: this.player.x, y: this.player.y - 8, vx: 0, vy: -3.6, life: 200 });
        }
        this.player.cd = 7;
        if (window.SushiSFX) window.SushiSFX.move();
      }
      this.fireWish = false;

      // boss movement
      const speed = 0.5 + this.bossPhase * 0.35;
      this.bossX += this.bossDir * speed;
      if (this.bossX > this.W - 24) this.bossDir = -1;
      if (this.bossX < 24) this.bossDir = 1;
      this.bossY = 24 + Math.sin(this.tick * 0.04) * 4;

      // boss attacks
      this.bossAttackTimer--;
      if (this.bossAttackTimer <= 0) this.bossAttack();

      // update bullets
      for (const b of this.bullets) { b.x += b.vx; b.y += b.vy; b.life--; }
      this.bullets = this.bullets.filter(b => b.life > 0 && b.y > -10);
      for (const b of this.enemyBullets) { b.x += b.vx; b.y += b.vy; b.life--; }
      this.enemyBullets = this.enemyBullets.filter(b => b.life > 0 && b.y < this.H + 10 && b.x > -10 && b.x < this.W + 10);

      // enemies
      for (const e of this.enemies) {
        e.wobble += 0.1;
        e.x += e.vx + Math.sin(e.wobble) * 0.2;
        e.y += e.vy;
      }
      this.enemies = this.enemies.filter(e => e.hp > 0 && e.y < this.H + 20);

      // bullet vs boss
      const bossW = BOSS_SPRITES[this.bossPhase].width;
      const bossH = BOSS_SPRITES[this.bossPhase].height;
      for (const b of this.bullets) {
        if (b.life <= 0) continue;
        const dx = Math.abs(b.x - this.bossX);
        const dy = Math.abs(b.y - (this.bossY + bossH/2));
        if (dx < bossW/2 - 2 && dy < bossH/2 - 2) {
          this.bossHp--;
          b.life = 0;
          this.bossHitFlash = 4;
          this.score += 5;
          this.spark(b.x, b.y);
        }
      }

      // bullet vs enemy
      for (const b of this.bullets) {
        if (b.life <= 0) continue;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const dx = Math.abs(b.x - e.x);
          const dy = Math.abs(b.y - e.y);
          if (dx < e.def.w/2 && dy < e.def.h/2) {
            e.hp--;
            b.life = 0;
            this.spark(b.x, b.y);
            if (e.hp <= 0) {
              this.score += e.def.score;
              this.kills++;
              this.boom(e.x, e.y);
              if (window.SushiSFX) window.SushiSFX.merge(2);
            }
          }
        }
      }

      // enemy/enemyBullet vs player
      if (this.player.iframes === 0) {
        for (const e of this.enemies) {
          if (Math.abs(e.x - this.player.x) < e.def.w/2 + 5 && Math.abs(e.y - this.player.y) < e.def.h/2 + 4) {
            this.hitPlayer();
            e.hp = 0;
            this.boom(e.x, e.y);
          }
        }
        for (const b of this.enemyBullets) {
          if (Math.abs(b.x - this.player.x) < 6 && Math.abs(b.y - this.player.y) < 6) {
            this.hitPlayer();
            b.life = 0;
          }
        }
      }

      // particles
      for (const p of this.particles) { p.x += p.vx; p.y += p.vy; p.vy += (p.g||0); p.life--; }
      this.particles = this.particles.filter(p => p.life > 0);

      // phase transitions
      const hpPct = this.bossHp / this.bossMaxHp;
      if (this.bossPhase === 0 && hpPct < 0.66) this.enterPhase(1);
      if (this.bossPhase === 1 && hpPct < 0.33) this.enterPhase(2);

      // end conditions
      if (this.bossHp <= 0) {
        this.state = 'victory';
        this.stateTimer = 200;
        this.setQuip('VICTORY!!', 200);
        this.shake = 30;
        this.flash = 16;
        this.flashCol = '#fce018';
        // big boom
        for (let i = 0; i < 40; i++) this.boom(this.bossX + (Math.random()-0.5)*40, this.bossY + 30 + (Math.random()-0.5)*30);
        if (window.SushiSFX) window.SushiSFX.bigMerge();
      } else if (this.player.hp <= 0) {
        this.state = 'defeat';
        this.stateTimer = 120;
        this.setQuip('PON WINS', 120);
        if (window.SushiSFX) window.SushiSFX.over();
      }
    }
    enterPhase(p) {
      this.bossPhase = p;
      this.bossAttackTimer = 60;
      this.shake = 18;
      this.flash = 10;
      this.flashCol = p === 2 ? '#9020c0' : '#d03030';
      this.setQuip(QUIPS[p][Math.floor(Math.random()*QUIPS[p].length)], 110);
      if (window.SushiSFX) window.SushiSFX.bigMerge();
    }
    hitPlayer() {
      this.player.hp--;
      this.player.iframes = 70;
      this.shake = 14;
      this.flash = 8;
      this.flashCol = '#d03030';
      if (window.SushiSFX) window.SushiSFX.over();
    }
    bossAttack() {
      const p = this.bossPhase;
      const cooldowns = [70, 50, 32];
      this.bossAttackTimer = cooldowns[p];
      // pattern depends on phase + random
      if (p === 0) {
        // spread of gari
        for (let i = -2; i <= 2; i++) {
          this.enemyBullets.push({
            x: this.bossX, y: this.bossY + 32,
            vx: i * 0.6, vy: 1.5, life: 200,
            kind: 'gari',
          });
        }
      } else if (p === 1) {
        const r = Math.random();
        if (r < 0.5) {
          // aimed soy-laser
          const dx = this.player.x - this.bossX;
          const dy = this.player.y - (this.bossY + 30);
          const d = Math.hypot(dx, dy) || 1;
          const sp = 2.4;
          this.enemyBullets.push({ x: this.bossX, y: this.bossY + 32, vx: dx/d*sp, vy: dy/d*sp, life: 220, kind: 'soy' });
        } else {
          // spawn oni
          this.enemies.push({
            def: { sprite: ONI, w: 14, h: 14 },
            x: 20 + Math.random() * (this.W - 40),
            y: 40, vx: (Math.random()-0.5)*0.6, vy: 0.8,
            hp: 2, score: 30, wobble: Math.random()*Math.PI*2,
          });
        }
      } else {
        // phase 3 — chaos
        const r = Math.random();
        if (r < 0.35) {
          // wasabi rain
          for (let i = 0; i < 5; i++) {
            this.enemies.push({
              def: { sprite: WASABI, w: 12, h: 12 },
              x: 16 + Math.random() * (this.W - 32),
              y: -10 - Math.random() * 30, vx: 0, vy: 1.4 + Math.random()*0.5,
              hp: 1, score: 20, wobble: Math.random()*Math.PI*2,
            });
          }
        } else if (r < 0.7) {
          // radial soy
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            this.enemyBullets.push({ x: this.bossX, y: this.bossY + 32, vx: Math.cos(a)*1.8, vy: Math.sin(a)*1.8, life: 240, kind: 'soy' });
          }
        } else {
          // dash + summon oni
          this.bossDir *= -1;
          for (let i = 0; i < 2; i++) {
            this.enemies.push({
              def: { sprite: ONI, w: 14, h: 14 },
              x: 20 + Math.random() * (this.W - 40), y: 40,
              vx: (Math.random()-0.5)*1.2, vy: 1.2, hp: 2, score: 30,
              wobble: Math.random()*Math.PI*2,
            });
          }
        }
      }
    }
    spark(x, y) {
      for (let i = 0; i < 3; i++) this.particles.push({ x, y, vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2, life: 8, c: '#fcfcfc' });
    }
    boom(x, y) {
      for (let i = 0; i < 14; i++) this.particles.push({
        x, y, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3,
        life: 16 + Math.random()*10, c: i%2 ? '#fce018' : '#d03030',
      });
    }
    firework() {
      const x = 20 + Math.random()*(this.W-40);
      const y = 60 + Math.random()*180;
      const cols = ['#fce018','#d03030','#3cb878','#3060d0','#f098b8','#fcfcfc'];
      const col = cols[Math.floor(Math.random()*cols.length)];
      for (let i = 0; i < 16; i++) {
        const a = (i/16)*Math.PI*2;
        this.particles.push({ x, y, vx: Math.cos(a)*2, vy: Math.sin(a)*2, g: 0.06, life: 30+Math.random()*20, c: col });
      }
      if (window.SushiSFX) window.SushiSFX.merge(3);
    }
    draw(ctx, fonts) {
      const sx = this.shake > 0 ? (Math.random()*4-2)|0 : 0;
      const sy = this.shake > 0 ? (Math.random()*4-2)|0 : 0;

      // BG — depends on phase
      const bgs = ['#0a0820', '#1a0510', '#200818'];
      ctx.fillStyle = this.state === 'victory' ? '#080820' : bgs[Math.min(this.bossPhase,2)];
      ctx.fillRect(0,0,this.W,this.H);
      // stars
      for (let i = 0; i < 50; i++) {
        const x = (i*53 + this.tick*0.6) % this.W;
        const y = (i*71 + this.tick*1.4) % this.H;
        ctx.fillStyle = i%5===0 ? '#fce018' : '#fcfcfc';
        ctx.fillRect(x|0, y|0, 1, 1);
      }

      ctx.save();
      ctx.translate(sx, sy);

      // boss (unless defeated)
      if (this.state !== 'victory') {
        const sprite = BOSS_SPRITES[this.bossPhase];
        if (this.bossHitFlash > 0) {
          // tint red flash
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.drawImage(sprite, (this.bossX - sprite.width/2)|0, this.bossY|0);
        if (this.bossHitFlash > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect((this.bossX - sprite.width/2)|0, this.bossY|0, sprite.width, sprite.height);
        }
      }

      // enemies
      for (const e of this.enemies) {
        ctx.drawImage(e.def.sprite, (e.x - e.def.w/2)|0, (e.y - e.def.h/2)|0);
      }

      // enemy bullets
      for (const b of this.enemyBullets) {
        if (b.kind === 'soy') {
          ctx.fillStyle = '#7a1e1c';
          ctx.fillRect((b.x-2)|0, (b.y-2)|0, 4, 4);
          ctx.fillStyle = '#d03030';
          ctx.fillRect((b.x-1)|0, (b.y-1)|0, 2, 2);
        } else {
          ctx.fillStyle = '#f098b8';
          ctx.fillRect((b.x-2)|0, (b.y-2)|0, 4, 4);
          ctx.fillStyle = '#fcfcfc';
          ctx.fillRect((b.x-1)|0, (b.y-1)|0, 1, 1);
        }
      }

      // player bullets
      for (const b of this.bullets) {
        ctx.fillStyle = '#fce018';
        ctx.fillRect((b.x-1)|0, (b.y-3)|0, 2, 6);
        ctx.fillStyle = '#fcfcfc';
        ctx.fillRect((b.x)|0, (b.y-2)|0, 1, 4);
      }

      // particles
      for (const p of this.particles) {
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x|0, p.y|0, 2, 2);
      }

      // player
      if (this.state !== 'defeat' && (this.player.iframes === 0 || this.tick % 4 < 2)) {
        ctx.drawImage(PLAYER, (this.player.x - PLAYER.width/2)|0, (this.player.y - PLAYER.height/2)|0);
      }

      ctx.restore();

      // flash overlay
      if (this.flash > 0) {
        const a = this.flash / 16;
        const c = this.flashCol;
        // convert hex to rgba
        const rgb = c.length === 7 ? [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)] : [255,255,255];
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
        ctx.fillRect(0,0,this.W,this.H);
      }

      // HUD: hearts
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < this.player.hp ? '#d03030' : '#3a1a1a';
        const hx = 6 + i*9, hy = 6;
        ctx.fillRect(hx, hy+1, 1, 2);
        ctx.fillRect(hx+1, hy, 2, 1);
        ctx.fillRect(hx+3, hy+1, 1, 2);
        ctx.fillRect(hx+4, hy, 2, 1);
        ctx.fillRect(hx+6, hy+1, 1, 2);
        ctx.fillRect(hx+1, hy+3, 5, 1);
        ctx.fillRect(hx+2, hy+4, 3, 1);
        ctx.fillRect(hx+3, hy+5, 1, 1);
      }

      // HUD: boss HP bar
      if (this.state !== 'victory') {
        const bw = this.W - 80;
        const pct = Math.max(0, this.bossHp / this.bossMaxHp);
        ctx.fillStyle = '#3a1a1a';
        ctx.fillRect(40, 8, bw, 5);
        const col = this.bossPhase === 0 ? '#3cb878' : (this.bossPhase === 1 ? '#fce018' : '#9020c0');
        ctx.fillStyle = col;
        ctx.fillRect(40, 8, (bw * pct)|0, 5);
        ctx.fillStyle = '#fcfcfc';
        ctx.fillRect(40, 8, bw, 1); // top edge
        // phase pips
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i <= this.bossPhase ? '#fce018' : '#fcfcfc40';
          ctx.fillRect(40 + (bw - 6) * (i === 0 ? 0 : i === 1 ? 0.34 : 0.67), 15, 6, 2);
        }
      }

      // score
      if (fonts && fonts.drawText) {
        fonts.drawText(ctx, 'SCORE ' + this.score, this.W - 60, 18, '#fce018', 1);
      }

      // quip / banner
      if (this.quip && fonts && fonts.drawText) {
        const a = Math.min(1, this.quip.life / 30);
        const t = this.quip.t.toUpperCase();
        const w = t.length * 6;
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        const bx = ((this.W - w)/2 - 4)|0;
        ctx.fillRect(bx, this.H/2 - 30, w + 8, 12);
        fonts.drawText(ctx, t, ((this.W - w)/2)|0, this.H/2 - 28, '#fce018', 1);
        ctx.globalAlpha = 1;
      }

      // victory screen
      if (this.state === 'victory' && fonts && fonts.drawText) {
        const yc = this.H/2 + 10;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, yc - 30, this.W, 100);
        fonts.drawText(ctx, 'VICTORY!!', (this.W - 54)/2, yc - 22, '#fce018', 2);
        fonts.drawText(ctx, 'SUSHI SAVED', (this.W - 66)/2, yc - 2, '#fcfcfc', 1);
        fonts.drawText(ctx, 'BONUS +500', (this.W - 60)/2, yc + 10, '#fcfcfc', 1);
        const hpBonus = this.player.hp * 200;
        fonts.drawText(ctx, 'LIFE  +' + String(hpBonus), (this.W - 60)/2, yc + 22, '#fcfcfc', 1);
        fonts.drawText(ctx, 'TOTAL ' + String(this.score + 500 + hpBonus), (this.W - 78)/2, yc + 38, '#fce018', 1);
      }
      if (this.state === 'defeat' && fonts && fonts.drawText) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, this.H/2 - 30, this.W, 60);
        fonts.drawText(ctx, 'PON WINS', (this.W - 48)/2, this.H/2 - 22, '#d03030', 2);
        fonts.drawText(ctx, 'BACK TO SUSHI', (this.W - 78)/2, this.H/2 + 4, '#fcfcfc', 1);
      }
    }
  }

  window.SushiShooter = { create: (W, H) => new BossBattle(W, H) };
})();
