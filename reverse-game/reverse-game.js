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
    // フィールドのレベルに合わせて level 0-2 が主体
    const r = Math.random();
    if(r < 0.25) return 0;
    if(r < 0.60) return 1;
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
    b1.spawnProtect = 55; b2.spawnProtect = 55;
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
    // 各レベルを偶数個にする → 必ず全部ペアが作れる
    // level 2 × 4個、level 1 × 2個 = 計6個
    const cfg = [
      {lv:2, x:55,  y:310}, {lv:1, x:105, y:380},
      {lv:2, x:165, y:300}, {lv:2, x:80,  y:430},
      {lv:1, x:150, y:415}, {lv:2, x:195, y:360},
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

  // ── ゲームオーバー ────────────────────────────────────
  function doGameOver() {
    msgEl.innerHTML = 'GAME OVER<br><span style="font-size:10px;color:#aa44ff">夢が溢れた…</span>';
    msgEl.style.display = 'block';
    setTimeout(()=>{ location.reload(); }, 4000);
  }

  // ── クリア → 哲学的エンディング ───────────────────────
  function doClear() {
    cancelAnimationFrame(raf);
    msgEl.style.display = 'none';
    scoreEl.style.display = 'none';
    remainEl.style.display = 'none';
    document.removeEventListener('keydown', onKey);
    // フォントロード確認後にエンディング開始
    document.fonts.ready.then(() => startEnding());
  }

  // ── 夢の周回数管理 ───────────────────────────────────
  function getCycle(){ return parseInt(localStorage.getItem('dream_cycle')||'0'); }
  function incrementCycle(){
    const n=getCycle()+1;
    localStorage.setItem('dream_cycle', String(n));
    localStorage.setItem('dream_date',  String(Date.now())); // D：日付保存
    return n;
  }

  // ── ドット絵エンディングシーン ───────────────────────
  function startEnding() {
    const cycle = getCycle() + 1; // 今回が何周目か（1始まり）

    // ── 周回ごとのセリフ変化 ──────────────────────────
    const BASE_MESSAGES = [
      ['形あるものはすべて', '崩れる前から', 'すでに夢だった', '', '寿司も 廊下も 海底も', 'あなた自身でさえも'],
      ['この宇宙は', '誰かが見ている夢だ', '', '目を覚ました者は', 'まだ一人もいない'],
      ['溶けていった欠片たちは', 'また別の夢の中にいる', '', '次に目を閉じるとき', 'またどこかで会うだろう'],
      ['目が覚めるということは', '別の眠りの入口だ', '', 'ではまた—', '夢の中で', 'あなたを待っています'],
    ];

    let MESSAGES;
    if(cycle >= 7){
      // 7周目：特別セリフ構成
      MESSAGES = [
        ['七つの巡りが満ちた'],
        ['あなたは今', 'いくつの夢の中にいますか'],
        ['形あるものはすべて', '崩れる前から', 'すでに夢だった'],
        ['七度目の夢の果てで', '全ては還る', '', 'また——夢で会いましょう'],
      ];
    } else if(cycle >= 2){
      // 2周目以降：冒頭に一言追加
      const opening = cycle === 2
        ? ['また来ましたね', 'また夢を見ているのですか']
        : [`${cycle}度目の夢`, 'それでもまだ、眠りますか'];
      MESSAGES = [opening, ...BASE_MESSAGES];
    } else {
      MESSAGES = BASE_MESSAGES;
    }

    // 星を事前生成
    const STARS = Array.from({length:90}, ()=>({
      x: (Math.random()*FIELD_W)|0,
      y: (Math.random()*FIELD_H)|0,
      sz: Math.random()<0.12 ? 2 : 1,
      phase: Math.random()*Math.PI*2,
    }));

    const ponSprite = sprites[sprites.length-1]?.canvas;
    const PON_X = (FIELD_W/2)|0;
    const PON_Y = 330;

    const FADEIN=45, HOLD=210, FADEOUT=45;
    const MSG_DUR = FADEIN+HOLD+FADEOUT;
    let et=0, msgIdx=0;

    // ── ピクセル吹き出し描画 ─────────────────────────
    function drawBubble(lines, alpha) {
      const FS=10, LH=14, PX=10, PY=8;
      ctx.font=`${FS}px DotGothic16,monospace`;

      let maxW=40;
      lines.forEach(l=>{ if(l) maxW=Math.max(maxW, ctx.measureText(l).width); });
      maxW = Math.min(maxW, FIELD_W-28); // はみ出し防止

      const bw=(maxW+PX*2)|0;
      const bh=(lines.length*LH+PY*2)|0;
      const bx=((FIELD_W-bw)/2)|0;
      const by=(PON_Y - bh - 28)|0;

      ctx.globalAlpha=alpha;

      // 背景（ピクセルアート角丸）
      ctx.fillStyle='#fff8ff';
      ctx.fillRect(bx+2,by,    bw-4,bh);   // 上下
      ctx.fillRect(bx,  by+2,  bw,  bh-4); // 左右（内側）

      // 枠（2pxずつ4辺）
      ctx.fillStyle='#cc88ff';
      ctx.fillRect(bx+2, by,       bw-4, 2);  // 上
      ctx.fillRect(bx+2, by+bh-2,  bw-4, 2);  // 下
      ctx.fillRect(bx,   by+2,     2,    bh-4);// 左
      ctx.fillRect(bx+bw-2,by+2,   2,    bh-4);// 右

      // しっぽ（ポンへ向かう下向き三角）
      const tx=(FIELD_W/2)|0;
      const ty=by+bh;
      ctx.fillStyle='#fff8ff';
      ctx.fillRect(tx-4,ty,   8,2);
      ctx.fillRect(tx-2,ty+2, 4,2);
      ctx.fillRect(tx-1,ty+4, 2,2);
      ctx.fillStyle='#cc88ff';
      ctx.fillRect(tx-6,ty,   2,6);
      ctx.fillRect(tx+4,ty,   2,6);
      ctx.fillRect(tx-4,ty+6, 2,2);
      ctx.fillRect(tx+2,ty+6, 2,2);
      ctx.fillRect(tx-2,ty+8, 2,2);

      // テキスト
      ctx.fillStyle='#1a0a30';
      ctx.font=`${FS}px DotGothic16,monospace`;
      lines.forEach((l,i)=>{
        if(!l) return;
        const lx=((FIELD_W-ctx.measureText(l).width)/2)|0;
        ctx.fillText(l, lx, by+PY+FS+i*LH);
      });

      ctx.globalAlpha=1;
    }

    // ── エンディングループ ───────────────────────────
    function endLoop() {
      // 全メッセージ終了後 → 黒フェードしてエンディングムービーへ
      if(msgIdx >= MESSAGES.length) {
        const fa=Math.min(1,(et-MESSAGES.length*MSG_DUR)/40);
        ctx.fillStyle='#04001a';
        ctx.fillRect(0,0,FIELD_W,FIELD_H);
        if(ponSprite) ctx.drawImage(ponSprite,
          (PON_X-ponSprite.width/2)|0,
          (PON_Y-ponSprite.height/2)|0);
        ctx.fillStyle='#000'; ctx.globalAlpha=fa;
        ctx.fillRect(0,0,FIELD_W,FIELD_H); ctx.globalAlpha=1;
        et++;
        if(fa>=1){ startEndingMovie(); return; }
        requestAnimationFrame(endLoop);
        return;
      }

      // 背景（深宇宙）
      ctx.fillStyle='#04001a';
      ctx.fillRect(0,0,FIELD_W,FIELD_H);

      // 星
      STARS.forEach(s=>{
        const tw=0.35+0.65*Math.sin(et*0.04+s.phase);
        ctx.fillStyle=`rgba(220,200,255,${tw*0.9})`;
        ctx.fillRect(s.x,s.y,s.sz,s.sz);
      });
      // 周回数インジケーター（2周目以降、左下に極小表示）
      if(cycle >= 2){
        ctx.font='7px DotGothic16,monospace';
        ctx.fillStyle='rgba(160,80,255,0.38)';
        ctx.fillText(`第${cycle}巡`, 6, FIELD_H-6);
      }

      // しろいポン（ふわふわ浮遊）
      if(ponSprite){
        const by2=(Math.sin(et*0.035)*5)|0;
        ctx.drawImage(ponSprite,
          (PON_X-ponSprite.width/2)|0,
          (PON_Y+by2-ponSprite.height/2)|0);
      }

      // メッセージ alpha
      const t=et%MSG_DUR;
      const alpha = t<FADEIN ? t/FADEIN
                  : t<FADEIN+HOLD ? 1
                  : 1-(t-FADEIN-HOLD)/FADEOUT;

      drawBubble(MESSAGES[msgIdx], alpha);
      if(t>=MSG_DUR-1) msgIdx++;
      et++;
      requestAnimationFrame(endLoop);
    }

    endLoop();
  }

  // ── エンディングムービー（案A+D）────────────────────────
  function startEndingMovie() {
    const completedCycle = incrementCycle(); // ここで+1（今回の周回完了）
    const ponSpr = sprites[sprites.length-1]?.canvas;

    // 7つの夢のフラッシュデータ
    const BASE_FLASHES = [
      { bg:'#f4eedd' },
      { bg:'#87ceeb' },
      { bg:'#010e1e' },
      { bg:'#d4c870' },
      { bg:'#000510' },
      { bg:'#0d1a0d' },
      { bg:'#ffe8f8' },
    ];
    // 7周目：逆再生（夢の最深層から現実へ遡る）
    const FLASHES = completedCycle >= 7
      ? [...BASE_FLASHES].reverse()
      : BASE_FLASHES;
    const FLASH_DUR = 28;         // 1フラッシュあたりのフレーム数
    const FLASH_TOTAL = FLASHES.length * FLASH_DUR;
    const GAP       = 25;         // フラッシュ後の黒い間
    const EYE_START = FLASH_TOTAL + GAP;
    const EYE_DUR   = 140;        // まぶたが開くフレーム数
    const HOLD      = 80;         // 開ききった後のホールド
    const FADE_DUR  = 70;         // 最後の黒フェード

    let mt = 0;

    // まぶたの開く量をイージングで計算
    function eyeProgress(t) {
      const p = Math.min(1, t / EYE_DUR);
      return p * p * (3 - 2 * p); // smoothstep
    }

    // 目を開いた先に見えるフィールド
    function drawSushiField() {
      if(completedCycle >= 7){
        // 7周目：深い夢の空間（宇宙）が見える
        ctx.fillStyle='#04001a';
        ctx.fillRect(0,0,FIELD_W,FIELD_H);
        // 星
        for(let i=0;i<120;i++){
          const sx=((i*137+23)%FIELD_W)|0, sy=((i*97+17)%FIELD_H)|0;
          ctx.fillStyle=i%8===0?'rgba(220,200,255,0.9)':'rgba(180,160,255,0.5)';
          ctx.fillRect(sx,sy,i%12===0?2:1,i%12===0?2:1);
        }
        // しろいポンとテキスト
        if(ponSpr){
          ctx.drawImage(ponSpr,((FIELD_W-ponSpr.width)/2)|0,((FIELD_H-ponSpr.height)/2-30)|0);
        }
        ctx.font='8px DotGothic16,monospace';
        ctx.fillStyle='rgba(180,120,255,0.7)';
        ctx.textAlign='center';
        ctx.fillText('七巡完了', FIELD_W/2, FIELD_H/2+40);
        ctx.textAlign='left';
      } else {
        // 通常：寿司ゲームのフィールドが見える
        for(let y=0;y<FIELD_H;y+=16)
          for(let x=0;x<FIELD_W;x+=16){
            ctx.fillStyle=((x/16+y/16)&1)===0?'#221528':'#2a1a32';
            ctx.fillRect(x,y,16,16);
          }
        ctx.fillStyle='#d03030';
        for(let x=0;x<FIELD_W;x+=8) ctx.fillRect(x,DANGER_Y,4,1);
        ctx.fillStyle='#704028';
        ctx.fillRect(0,0,WALL_INSET,FIELD_H);
        ctx.fillRect(FIELD_W-WALL_INSET,0,WALL_INSET,FIELD_H);
        ctx.fillRect(0,FIELD_H-6,FIELD_W,6);
        if(ponSpr){
          ctx.drawImage(ponSpr,
            ((FIELD_W-ponSpr.width)/2)|0,
            ((FIELD_H-ponSpr.height)/2-20)|0);
        }
      }
    }

    // まぶた描画（ピクセルアート的な直線的開き）
    function drawEyelids(progress) {
      const halfH = FIELD_H / 2;
      const open  = (halfH * progress)|0;
      // 上まぶた
      ctx.fillStyle='#000';
      ctx.fillRect(0, 0, FIELD_W, Math.max(0, halfH - open));
      // 下まぶた
      ctx.fillRect(0, halfH + open, FIELD_W, FIELD_H);
      // まぶたの縁（2pxの暗い線）
      if(open > 0 && open < halfH){
        ctx.fillStyle='#110022';
        ctx.fillRect(0, halfH - open - 2, FIELD_W, 2);
        ctx.fillRect(0, halfH + open,     FIELD_W, 2);
      }
    }

    function movieLoop() {
      // ── フェーズ1：夢のフラッシュバック ──
      if(mt < FLASH_TOTAL){
        const fi = (mt / FLASH_DUR)|0;
        const ft = mt % FLASH_DUR;
        const f  = FLASHES[fi];
        // フラッシュのアルファ（両端でフェード）
        const a  = ft < 6 ? ft/6 : ft > FLASH_DUR-6 ? (FLASH_DUR-ft)/6 : 1;

        ctx.fillStyle='#000';
        ctx.fillRect(0,0,FIELD_W,FIELD_H);
        ctx.globalAlpha=a;
        ctx.fillStyle=f.bg;
        ctx.fillRect(0,0,FIELD_W,FIELD_H);
        ctx.globalAlpha=1;
      }
      // ── 暗転インターバル ──
      else if(mt < EYE_START){
        ctx.fillStyle='#000';
        ctx.fillRect(0,0,FIELD_W,FIELD_H);
      }
      // ── フェーズ2：まぶたが開く ──
      else if(mt < EYE_START + EYE_DUR + HOLD){
        const ep = eyeProgress(mt - EYE_START);
        drawSushiField();
        drawEyelids(ep);
      }
      // ── フェーズ3：黒フェードしてリロード ──
      else{
        const fa = Math.min(1,(mt-(EYE_START+EYE_DUR+HOLD))/FADE_DUR);
        drawSushiField();
        ctx.globalAlpha=fa;
        ctx.fillStyle='#000';
        ctx.fillRect(0,0,FIELD_W,FIELD_H);
        ctx.globalAlpha=1;
        if(fa>=1){ location.reload(); return; }
      }
      mt++;
      requestAnimationFrame(movieLoop);
    }
    movieLoop();
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

    // 操作説明のみ（タイトルなし）
    ctx.textAlign = 'center';
    ctx.font = '8px monospace';
    ctx.fillStyle = '#8844aa';
    ctx.fillText('同じ種類 → 分裂して小さくなる', FIELD_W/2, FIELD_H/2 + 10);
    ctx.fillText('全部消したらクリア', FIELD_W/2, FIELD_H/2 + 26);

    const alpha = introTimer > INTRO_FRAMES - 30
      ? (INTRO_FRAMES - introTimer) / 30
      : Math.min(1, introTimer / 20);
    const blink = Math.floor(introTimer / 20) % 2 === 0;
    ctx.globalAlpha = alpha * (blink ? 1 : 0);
    ctx.fillStyle = '#aa66ff';
    ctx.font = '9px monospace';
    ctx.fillText('TAP / CLICK TO START', FIELD_W/2, FIELD_H/2 + 52);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    introTimer++;
    if(introTimer >= INTRO_FRAMES) started = true;
  }

  // ── メインループ ─────────────────────────────────────
  // ── B：夢の影（ゴースト）状態 ─────────────────────────
  const GHOST_COLS = ['#f4eedd','#87ceeb','#010e1e','#d4c870','#000510','#0d1a0d','#ffe8f8'];
  let ghostIdx = 0, ghostTick = 0, ghostNext = 300; // 最初は5秒後

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

    // ── B：夢の色が背景にうっすら浮かぶ ──────────────
    if(started && !over && !cleared){
      const FADE_IN=50, HOLD=60, FADE_OUT=50, TOTAL=160, INTERVAL=480;
      if(tick >= ghostNext){
        const gt = tick - ghostNext;
        if(gt < TOTAL){
          let a;
          if(gt < FADE_IN)            a = (gt/FADE_IN)*0.07;
          else if(gt < FADE_IN+HOLD)  a = 0.07;
          else                         a = Math.max(0,(1-(gt-FADE_IN-HOLD)/FADE_OUT)*0.07);
          ctx.globalAlpha = a;
          ctx.fillStyle = GHOST_COLS[ghostIdx % GHOST_COLS.length];
          ctx.fillRect(0, 0, FIELD_W, FIELD_H);
          ctx.globalAlpha = 1;
        } else {
          ghostIdx++;
          ghostNext = tick + INTERVAL;
        }
      }
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
      if(b.level === 0 && b.age > 40 && b.spawnProtect <= 0) {
        ctx.globalAlpha = Math.max(0, 1 - (b.age - 40) / 55);
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
