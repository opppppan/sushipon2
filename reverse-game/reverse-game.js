// ── 逆スイカゲーム「夢を溶かせ」──────────────────────────
// window.startReverseGame(screen) で起動
// window.SUSHI_SPRITES / window.SushiPhysics が必要

window.startReverseGame = function(screen) {
  if(screen._reverseStarted) return;
  screen._reverseStarted = true;

  const FIELD_W = 220, FIELD_H = 480;
  const DANGER_Y = 80, WALL_INSET = 4;

  const sprites  = window.SUSHI_SPRITES;
  const Physics  = window.SushiPhysics;
  if(!sprites || !Physics) return;

  // ── オーバーレイ ──────────────────────────────────────
  const ov = document.createElement('div');
  ov.style.cssText = 'position:absolute;inset:0;z-index:250;background:#0a0015;overflow:hidden;font-family:"DotGothic16",monospace;';
  screen.style.position = 'relative';
  screen.appendChild(ov);

  const cvs = document.createElement('canvas');
  cvs.width = FIELD_W; cvs.height = FIELD_H;
  cvs.style.cssText = 'display:block;width:100%;height:100%;image-rendering:pixelated;cursor:crosshair;touch-action:none;';
  ov.appendChild(cvs);
  const ctx = cvs.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // HUD
  const scoreEl = document.createElement('div');
  scoreEl.style.cssText = 'position:absolute;top:4px;left:0;right:0;text-align:center;color:#cc88ff;font-size:9px;letter-spacing:.1em;pointer-events:none;';
  scoreEl.textContent = 'SCORE: 0';
  ov.appendChild(scoreEl);

  const remainEl = document.createElement('div');
  remainEl.style.cssText = 'position:absolute;top:14px;left:0;right:0;text-align:center;color:#8844aa;font-size:8px;pointer-events:none;';
  ov.appendChild(remainEl);

  const msgEl = document.createElement('div');
  msgEl.style.cssText = 'position:absolute;top:38%;left:0;right:0;text-align:center;color:#fff;font-size:14px;pointer-events:none;display:none;line-height:1.8;';
  ov.appendChild(msgEl);

  // ── ゲーム状態 ────────────────────────────────────────
  let score = 0, tick = 0, lastDrop = -20;
  let cursorX = FIELD_W / 2;
  let over = false, cleared = false, started = false;

  function randDropLv() {
    const r = Math.random();
    if(r < 0.45) return 0;
    if(r < 0.80) return 1;
    return 2;
  }

  let holdLv = randDropLv(), nextLv = randDropLv();

  // ── 物理ワールド ──────────────────────────────────────
  const world = new Physics.World(FIELD_W - WALL_INSET * 2, FIELD_H);
  world.leftX  = WALL_INSET;
  world.rightX = FIELD_W - WALL_INSET;
  world.groundY = FIELD_H - 6;
  world.dangerY = DANGER_Y;
  world.gravity = 0.26;

  // ── 分裂ロジック（逆マージ）──────────────────────────
  world.onMerge = (nb, a, b) => {
    // nb.level = a.level + 1（通常マージ結果）
    // 逆ゲーム：nb を消して level-2 の2個に分裂
    world.bodies = world.bodies.filter(x => x !== nb);

    const splitLv = nb.level - 2; // = a.level - 1

    if(splitLv < 0) {
      // level 0 同士の衝突 → 消滅 + ボーナス
      score += 500;
      updateHUD();
      checkClear();
      return;
    }

    const sp = sprites[splitLv];
    const offset = sp.radius * 1.6;
    const x1 = Math.max(WALL_INSET + sp.radius, nb.x - offset);
    const x2 = Math.min(FIELD_W - WALL_INSET - sp.radius, nb.x + offset);

    const b1 = new Physics.Body(x1, nb.y, sp.radius, splitLv);
    const b2 = new Physics.Body(x2, nb.y, sp.radius, splitLv);
    b1.spawnProtect = 12; b2.spawnProtect = 12;
    b1.vx = -1.5;         b2.vx =  1.5;
    world.add(b1); world.add(b2);

    score += Math.max(10, 6 - splitLv) * 120;
    updateHUD();
  };

  world.onGameOver = () => {
    if(!over && !cleared) { over = true; doGameOver(); }
  };

  // ── フィールドの初期配置 ─────────────────────────────
  function prefill() {
    const cfg = [
      {lv:3, x:50,  y:300}, {lv:2, x:100, y:360},
      {lv:3, x:165, y:310}, {lv:2, x:80,  y:420},
      {lv:2, x:145, y:400}, {lv:3, x:190, y:360},
    ];
    cfg.forEach(({lv, x, y}) => {
      const sp = sprites[lv];
      const bx = Math.max(WALL_INSET + sp.radius,
                  Math.min(FIELD_W - WALL_INSET - sp.radius, x));
      const b = new Physics.Body(bx, y, sp.radius, lv);
      b.spawnProtect = 90;
      world.add(b);
    });
  }
  prefill();

  // ── HUD更新 ───────────────────────────────────────────
  function updateHUD() {
    scoreEl.textContent = `SCORE: ${score}`;
    const n = world.bodies.length;
    remainEl.textContent = n > 0 ? `残り ${n} 個` : '';
  }

  // ── 勝利判定 ─────────────────────────────────────────
  function checkClear() {
    if(world.bodies.length === 0 && !over && !cleared) {
      cleared = true;
      doClear();
    }
  }

  // ── ゲームオーバー / クリア ───────────────────────────
  function doGameOver() {
    msgEl.innerHTML = 'GAME OVER<br><span style="font-size:10px;color:#aa44ff">夢が溢れた…</span>';
    msgEl.style.display = 'block';
    setTimeout(()=>{ location.reload(); }, 4000);
  }

  function doClear() {
    msgEl.innerHTML = `夢が全て溶けた！<br><span style="font-size:10px;color:#cc88ff">SCORE: ${score}</span>`;
    msgEl.style.display = 'block';
    setTimeout(()=>{ location.reload(); }, 5000);
  }

  // ── level-0 の自動消滅 ────────────────────────────────
  function autoDissolve() {
    const toRemove = world.bodies.filter(
      b => b.level === 0 && b.spawnProtect <= 0 && b.age > 90
    );
    if(toRemove.length > 0) {
      world.bodies = world.bodies.filter(b => !toRemove.includes(b));
      score += toRemove.length * 50;
      updateHUD();
      checkClear();
    }
  }

  // ── 入力 ─────────────────────────────────────────────
  function getX(e) {
    const rect = cvs.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    return (px / rect.width) * FIELD_W;
  }

  function doDrop() {
    if(!started || over || cleared) return;
    if(tick - lastDrop < 8) return;
    const sp = sprites[holdLv];
    const x = Math.max(WALL_INSET + sp.radius,
                Math.min(FIELD_W - WALL_INSET - sp.radius, cursorX));
    const b = new Physics.Body(x, 34, sp.radius, holdLv);
    b.spawnProtect = 6;
    world.add(b);
    lastDrop = tick;
    holdLv = nextLv;
    nextLv = randDropLv();
  }

  cvs.addEventListener('mousemove',  e => { cursorX = getX(e); });
  cvs.addEventListener('mousedown',  e => { e.preventDefault(); cursorX = getX(e); doDrop(); });
  cvs.addEventListener('touchmove',  e => { e.preventDefault(); cursorX = getX(e); }, {passive:false});
  cvs.addEventListener('touchstart', e => { e.preventDefault(); cursorX = getX(e); doDrop(); }, {passive:false});

  const onKey = e => {
    if(!started) { started = true; return; }
    const k = e.key;
    if(k==='ArrowLeft' ||k==='a') cursorX = Math.max(0, cursorX - 10);
    if(k==='ArrowRight'||k==='d') cursorX = Math.min(FIELD_W, cursorX + 10);
    if(k===' '||k==='ArrowDown'||k==='Enter') { e.preventDefault(); doDrop(); }
  };
  document.addEventListener('keydown', onKey);

  // ── 描画ヘルパー ─────────────────────────────────────
  function drawText(str, x, y, color='#cc88ff', scale=1) {
    ctx.fillStyle = color;
    ctx.font = `${scale * 7}px monospace`;
    ctx.fillText(String(str).toUpperCase(), x, y);
  }

  // ── イントロ画面 ─────────────────────────────────────
  let introTimer = 0;
  const INTRO_FRAMES = 120; // 2秒

  function drawIntro() {
    ctx.fillStyle = '#0a0015';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    // 背景チェッカー（薄紫）
    for(let y=0; y<FIELD_H; y+=16)
      for(let x=0; x<FIELD_W; x+=16) {
        ctx.fillStyle = ((x/16+y/16)&1)===0 ? '#100820' : '#160a28';
        ctx.fillRect(x, y, 16, 16);
      }

    // タイトル
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cc88ff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('夢を溶かせ', FIELD_W/2, FIELD_H/2 - 30);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#8844aa';
    ctx.fillText('REVERSE DREAM', FIELD_W/2, FIELD_H/2 - 12);

    ctx.font = '8px monospace';
    ctx.fillStyle = '#6633aa';
    ctx.fillText('同じ種類 → 分裂して消える', FIELD_W/2, FIELD_H/2 + 20);
    ctx.fillText('全部消したらクリア', FIELD_W/2, FIELD_H/2 + 35);

    const alpha = introTimer > INTRO_FRAMES - 30
      ? (INTRO_FRAMES - introTimer) / 30
      : Math.min(1, introTimer / 20);
    const blink = Math.floor(introTimer / 20) % 2 === 0;
    ctx.globalAlpha = alpha * (blink ? 1 : 0);
    ctx.fillStyle = '#aa66ff';
    ctx.font = '9px monospace';
    ctx.fillText('TAP / CLICK TO START', FIELD_W/2, FIELD_H/2 + 65);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    introTimer++;
    if(introTimer >= INTRO_FRAMES) started = true;
  }

  // ── メインループ ─────────────────────────────────────
  let raf;
  function loop() {
    raf = requestAnimationFrame(loop);

    if(!started) { drawIntro(); return; }

    if(!over && !cleared) {
      world.step();
      autoDissolve();
      tick++;
    }

    // 背景
    ctx.fillStyle = '#0a0015';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    for(let y=0; y<FIELD_H; y+=16)
      for(let x=0; x<FIELD_W; x+=16) {
        ctx.fillStyle = ((x/16+y/16)&1)===0 ? '#100820' : '#160a28';
        ctx.fillRect(x, y, 16, 16);
      }

    // DANGERライン
    ctx.fillStyle = '#6622aa';
    for(let x=0; x<FIELD_W; x+=8) ctx.fillRect(x, DANGER_Y, 4, 1);
    drawText('DANGER', FIELD_W - 52, DANGER_Y - 2, '#6622aa');

    // 壁・床
    ctx.fillStyle = '#4a1a6a';
    ctx.fillRect(0, 0, WALL_INSET, FIELD_H);
    ctx.fillRect(FIELD_W - WALL_INSET, 0, WALL_INSET, FIELD_H);
    ctx.fillRect(0, FIELD_H - 6, FIELD_W, 6);

    // カーソル
    if(!over && !cleared) {
      const sp = sprites[holdLv];
      const x = Math.max(WALL_INSET + sp.radius,
                  Math.min(FIELD_W - WALL_INSET - sp.radius, cursorX));
      ctx.fillStyle = 'rgba(180,100,255,0.35)';
      for(let y=30; y<FIELD_H-8; y+=6) ctx.fillRect(x - 0.5, y, 1, 3);
      const bob = Math.sin(tick * 0.1) * 1;
      ctx.drawImage(sp.canvas,
        (x - sp.canvas.width/2)|0,
        (24 + bob - sp.canvas.height/2)|0);
    }

    // ボディ描画
    for(const b of world.bodies) {
      const sp = sprites[b.level];
      // level-0 は徐々に透明に
      if(b.level === 0 && b.age > 60 && b.spawnProtect <= 0) {
        ctx.globalAlpha = Math.max(0, 1 - (b.age - 60) / 30);
      }
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.drawImage(sp.canvas, (-sp.canvas.width/2)|0, (-sp.canvas.height/2)|0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // NEXTパネル
    ctx.fillStyle = 'rgba(20,0,40,0.7)';
    ctx.fillRect(FIELD_W - 40, 22, 36, 36);
    drawText('NEXT', FIELD_W - 40, 30, '#8844aa');
    if(sprites[nextLv]) {
      const ns = sprites[nextLv];
      ctx.drawImage(ns.canvas,
        (FIELD_W - 22 - ns.canvas.width/2)|0, 32);
    }

    updateHUD();
  }

  loop();

  // スタート入力でイントロをスキップ
  cvs.addEventListener('mousedown',  () => { if(!started) started = true; }, {once:false});
  cvs.addEventListener('touchstart', () => { if(!started) started = true; }, {once:false, passive:true});
};
