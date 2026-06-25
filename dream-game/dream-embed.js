// ── 夢の散歩 (埋め込み版) ──────────────────────────────
// window.startDreamGame(containerEl) で起動する
// Three.js が読み込み済みであること前提

window.startDreamGame = function(containerEl) {
  if (!window.THREE) { console.warn('Three.js not loaded'); return; }
  if (containerEl._dreamStarted) return;
  containerEl._dreamStarted = true;

  // 寿司ゲームのキー入力を無効化
  window._dreamRunning = true;

  // ── 1. オーバーレイ作成 ──────────────────────────────
  if (getComputedStyle(containerEl).position === 'static')
    containerEl.style.position = 'relative';

  const ov = document.createElement('div');
  ov.style.cssText = 'position:absolute;inset:0;z-index:200;overflow:hidden;background:#000;';
  containerEl.appendChild(ov);

  const cvs = document.createElement('canvas');
  cvs.style.cssText = 'display:block;width:100%;height:100%;';
  ov.appendChild(cvs);

  // HUD
  function el(tag, css, html='') {
    const e = document.createElement(tag);
    e.style.cssText = css;
    if(html) e.innerHTML = html;
    ov.appendChild(e);
    return e;
  }
  const BUBBLE = el('div','position:absolute;left:50%;transform:translateX(-50%);top:10%;background:rgba(255,255,255,0.95);color:#222;padding:8px 14px;border-radius:14px;font-size:9px;max-width:85%;text-align:center;line-height:1.6;display:none;z-index:10;pointer-events:none;');
  const DEPTH  = el('div','position:absolute;top:8px;left:8px;font-size:7px;color:rgba(255,255,255,0.4);letter-spacing:.12em;z-index:10;pointer-events:none;','DREAM □ □ □ □ □');
  const INTER  = el('div','position:absolute;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.25);color:rgba(255,255,255,.85);padding:4px 12px;border-radius:12px;font-size:8px;display:none;z-index:10;pointer-events:none;');
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const HINT   = el('div','position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.35);font-size:7px;text-align:center;z-index:10;pointer-events:none;transition:opacity 1s;','');
  const FADE   = el('div','position:absolute;inset:0;background:#000;opacity:1;z-index:15;pointer-events:none;transition:opacity .6s;');
  // 起動直後に黒からフェードイン（寿司画面との切れ目をなくす）
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ FADE.style.opacity='0'; }));

  // ── 操作説明オーバーレイ ──────────────────────────────
  const CTRL = document.createElement('div');
  CTRL.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.82);z-index:25;display:none;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;cursor:pointer;';
  const ctrlInner = isTouchDevice ? `
    <div style="font-size:9px;color:#aaa;letter-spacing:.15em;margin-bottom:14px;">操作方法</div>
    <table style="font-size:9px;color:#fff;border-collapse:collapse;line-height:2;">
      <tr><td style="color:#888;padding-right:12px;">左下ジョイスティック</td><td>移動</td></tr>
      <tr><td style="color:#888;">右側スワイプ</td><td>視点</td></tr>
      <tr><td style="color:#888;">右下 Eボタン</td><td>夢の扉に入る</td></tr>
    </table>
    <div style="margin-top:18px;font-size:8px;color:#555;">タップで閉じる</div>
  ` : `
    <div style="font-size:9px;color:#aaa;letter-spacing:.15em;margin-bottom:14px;">操作方法</div>
    <table style="font-size:9px;color:#fff;border-collapse:collapse;line-height:2.2;">
      <tr><td style="color:#888;padding-right:14px;">W A S D</td><td>前後左右に移動</td></tr>
      <tr><td style="color:#888;">マウスドラッグ</td><td>視点を動かす</td></tr>
      <tr><td style="color:#888;">E キー</td><td>夢の扉に入る / 目を覚ます</td></tr>
    </table>
    <div style="margin-top:18px;font-size:8px;color:#555;">クリックで閉じる</div>
  `;
  CTRL.innerHTML = ctrlInner;
  ov.appendChild(CTRL);

  function showControls(){
    CTRL.style.display='flex';
  }
  function hideControls(){
    CTRL.style.opacity='1';
    CTRL.style.transition='opacity 0.4s';
    CTRL.style.opacity='0';
    setTimeout(()=>{ CTRL.style.display='none'; CTRL.style.opacity='1'; CTRL.style.transition=''; },400);
  }
  CTRL.addEventListener('click',  hideControls);
  CTRL.addEventListener('touchend', e=>{ e.preventDefault(); hideControls(); },{passive:false});

  // ? ボタン（右上）
  const QBTN = document.createElement('div');
  QBTN.style.cssText = 'position:absolute;top:8px;right:8px;width:18px;height:18px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.3);border-radius:50%;z-index:20;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:9px;cursor:pointer;font-family:sans-serif;user-select:none;';
  QBTN.textContent = '?';
  ov.appendChild(QBTN);
  QBTN.addEventListener('click',  e=>{ e.stopPropagation(); showControls(); });
  QBTN.addEventListener('touchend', e=>{ e.preventDefault(); e.stopPropagation(); showControls(); },{passive:false});

  // ── 仮想ジョイスティック（スマホ用）──────────────────
  const JOY_R = 32;
  const joyOuter = document.createElement('div');
  joyOuter.style.cssText = `position:absolute;bottom:14px;left:14px;width:${JOY_R*2}px;height:${JOY_R*2}px;background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.3);border-radius:50%;z-index:20;touch-action:none;display:${isTouchDevice?'block':'none'};`;
  const joyKnob = document.createElement('div');
  joyKnob.style.cssText = `position:absolute;width:${JOY_R}px;height:${JOY_R}px;background:rgba(255,255,255,0.32);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;transition:transform 0.05s;`;
  joyOuter.appendChild(joyKnob);
  ov.appendChild(joyOuter);

  // Eボタン（スマホ用）
  const eBtn = document.createElement('div');
  eBtn.style.cssText = `position:absolute;bottom:14px;right:14px;width:52px;height:52px;background:rgba(150,80,255,0.35);border:2px solid rgba(180,120,255,0.6);border-radius:50%;z-index:20;touch-action:none;display:${isTouchDevice?'flex':'none'};align-items:center;justify-content:center;color:rgba(255,255,255,0.9);font-size:13px;font-weight:bold;font-family:sans-serif;user-select:none;`;
  eBtn.textContent = 'E';
  ov.appendChild(eBtn);

  // ── 2. Three.js セットアップ ────────────────────────
  const { THREE } = window;

  const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.autoClear = false;

  const scene        = new THREE.Scene();
  const previewScene = new THREE.Scene();
  // 初期サイズは仮置き（ResizeObserverが正確な値で即上書きする）
  const camera       = new THREE.PerspectiveCamera(70, 1, 0.1, 400);
  const previewTarget = new THREE.WebGLRenderTarget(180, 180, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const previewCam = new THREE.PerspectiveCamera(65, 1, 0.1, 200);

  let W = 220, H = 480;

  function applySize(w, h){
    if(w < 1 || h < 1) return;
    W = w; H = h;
    // false = CSS を上書きしない → canvas の width:100%;height:100% が有効のまま
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(entries => {
    const e = entries[0];
    const w = e.contentRect.width;
    const h = e.contentRect.height;
    applySize(w, h);
  });
  ro.observe(ov);

  // レイアウト確定後にも一度測定（スマホで初回0になる対策）
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const r = ov.getBoundingClientRect();
    applySize(r.width || 220, r.height || 480);
  }));

  // ── 3. コントロール ──────────────────────────────────
  const keys = { w:false,a:false,s:false,d:false,e:false };
  let yaw=0, pitch=0;

  // キーボード
  const onKey = ev => {
    const k=ev.key.toLowerCase(), dn=ev.type==='keydown';
    if(k==='w'||k==='arrowup')    keys.w=dn;
    if(k==='s'||k==='arrowdown')  keys.s=dn;
    if(k==='a'||k==='arrowleft')  keys.a=dn;
    if(k==='d'||k==='arrowright') keys.d=dn;
    if(k==='e') keys.e=dn;
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup',   onKey);

  // マウス（視点ドラッグ）
  let drag=false, dragId=null, lx=0, ly=0;
  cvs.addEventListener('mousedown', e=>{ drag=true; dragId=null; lx=e.clientX; ly=e.clientY; });
  document.addEventListener('mouseup', ()=>{ drag=false; });
  document.addEventListener('mousemove', e=>{
    if(!drag) return;
    yaw  -= (e.clientX-lx)*0.004; pitch -= (e.clientY-ly)*0.004;
    pitch  = Math.max(-1.1,Math.min(1.1,pitch));
    lx=e.clientX; ly=e.clientY;
  });

  // タッチ：右側スワイプ→視点、左側ジョイスティック→移動
  let joyActive=false, joyId=null, joyBx=0, joyBy=0;

  joyOuter.addEventListener('touchstart', e=>{
    e.preventDefault(); e.stopPropagation();
    const t=e.changedTouches[0];
    joyActive=true; joyId=t.identifier;
    const r=joyOuter.getBoundingClientRect();
    joyBx=r.left+r.width/2; joyBy=r.top+r.height/2;
  },{passive:false});

  // カメラドラッグ（キャンバス上のタッチ）
  cvs.addEventListener('touchstart', e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(t.identifier!==joyId && dragId===null){
        drag=true; dragId=t.identifier; lx=t.clientX; ly=t.clientY; break;
      }
    }
  },{passive:false});

  document.addEventListener('touchend', e=>{
    for(const t of e.changedTouches){
      if(t.identifier===dragId){ drag=false; dragId=null; }
      if(t.identifier===joyId){
        joyActive=false; joyId=null;
        keys.w=keys.a=keys.s=keys.d=false;
        joyKnob.style.transform='translate(-50%,-50%)';
      }
    }
  });

  document.addEventListener('touchmove', e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      // 視点ドラッグ
      if(t.identifier===dragId && drag){
        yaw  -= (t.clientX-lx)*0.004; pitch -= (t.clientY-ly)*0.004;
        pitch  = Math.max(-1.1,Math.min(1.1,pitch));
        lx=t.clientX; ly=t.clientY;
      }
      // ジョイスティック
      if(t.identifier===joyId && joyActive){
        const dx=t.clientX-joyBx, dy=t.clientY-joyBy;
        const dist=Math.sqrt(dx*dx+dy*dy);
        const ang=Math.atan2(dy,dx);
        const clamped=Math.min(dist,JOY_R);
        joyKnob.style.transform=`translate(calc(-50% + ${Math.cos(ang)*clamped}px),calc(-50% + ${Math.sin(ang)*clamped}px))`;
        const thr=JOY_R*0.28;
        keys.w=dy<-thr; keys.s=dy>thr; keys.a=dx<-thr; keys.d=dx>thr;
      }
    }
  },{passive:false});

  // Eボタン
  eBtn.addEventListener('touchstart', e=>{ e.preventDefault(); e.stopPropagation(); keys.e=true; },{passive:false});
  eBtn.addEventListener('touchend',   e=>{ e.preventDefault(); keys.e=false; },{passive:false});
  eBtn.addEventListener('mousedown',  ()=>keys.e=true);
  eBtn.addEventListener('mouseup',    ()=>keys.e=false);

  // ── 4. ヴェイパーウェイブ音楽 ───────────────────────
  let actx=null, masterGain=null, convolverNode=null, musicArea=null, musicTimer=null;
  const MUSIC = {
    opening:  {bpm:72, chords:[[65,69,72,76],[62,65,69,72],[60,64,67,71],[58,62,65,70]]},
    corridor: {bpm:80, chords:[[60,63,67,70],[68,72,75,79],[63,67,70,74],[65,68,72,75]]},
    sky:      {bpm:70, chords:[[65,69,72,76],[62,65,69,74],[60,64,67,71],[64,67,71,74]]},
    ocean:    {bpm:65, chords:[[53,57,60,65],[58,62,65,70],[56,60,63,68],[51,55,58,63]]},
    backrooms:{bpm:72, chords:[[57,60,64,67],[55,59,62,65],[60,63,67,70],[64,68,71,75]]},
    night:    {bpm:68, chords:[[62,65,69,72],[67,70,74,79],[63,67,70,74],[58,62,65,70]]},
    forest:   {bpm:75, chords:[[64,67,71,74],[60,64,67,71],[62,65,69,72],[57,60,64,67]]},
    meadow:   {bpm:80, chords:[[67,71,74,78],[64,67,71,74],[60,64,67,71],[62,65,69,72]]},
  };
  function midiToFreq(m){ return 440*Math.pow(2,(m-69)/12); }
  function initAudio(){
    if(actx) return;
    actx = new (window.AudioContext||window.webkitAudioContext)();
    masterGain = actx.createGain(); masterGain.gain.value=0.32;
    masterGain.connect(actx.destination);
    const sr=actx.sampleRate, len=sr*2.5;
    const buf=actx.createBuffer(2,len,sr);
    for(let c=0;c<2;c++){ const d=buf.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.5); }
    convolverNode=actx.createConvolver(); convolverNode.buffer=buf;
    convolverNode.connect(masterGain);
  }
  function playArea(type){
    if(!actx) return;
    if(musicTimer) clearTimeout(musicTimer);
    musicArea=type;
    const md=MUSIC[type]||MUSIC.opening;
    const bt=60/md.bpm, ct=bt*4;
    function sched(){
      if(musicArea!==type) return;
      const now=actx.currentTime;
      md.chords.forEach((ch,i)=>{
        ch.forEach(midi=>{
          [1,1.004,0.996].forEach(det=>{
            const o=actx.createOscillator(), g=actx.createGain();
            o.type='sine'; o.frequency.value=midiToFreq(midi)*det;
            const amp=0.055/ch.length;
            const st2=now+i*ct;
            g.gain.setValueAtTime(0,st2); g.gain.linearRampToValueAtTime(amp,st2+0.4);
            g.gain.setValueAtTime(amp,st2+ct-0.45); g.gain.linearRampToValueAtTime(0,st2+ct);
            o.connect(g); g.connect(convolverNode); g.connect(masterGain);
            o.start(st2); o.stop(st2+ct+.1);
          });
          // bass
          const bo=actx.createOscillator(), bg=actx.createGain(), bf=actx.createBiquadFilter();
          bf.type='lowpass'; bf.frequency.value=200;
          bo.type='sawtooth'; bo.frequency.value=midiToFreq(midi-12);
          const bs2=now+i*ct;
          bg.gain.setValueAtTime(0,bs2); bg.gain.linearRampToValueAtTime(0.1,bs2+0.2);
          bg.gain.setValueAtTime(0.1,bs2+ct-0.3); bg.gain.linearRampToValueAtTime(0,bs2+ct);
          bo.connect(bf); bf.connect(bg); bg.connect(masterGain);
          bo.start(bs2); bo.stop(bs2+ct+.1);
        });
      });
      const total=md.chords.length*ct*1000;
      musicTimer=setTimeout(sched, total-300);
    }
    sched();
  }
  cvs.addEventListener('mousedown',()=>{ initAudio(); },{ once:true });
  document.addEventListener('keydown',()=>{ initAudio(); },{ once:true });

  // ── 5. シーンヘルパー ────────────────────────────────
  let sceneObjs=[], portals=[], previewObjs=[], targetScene=null;
  const PERMANENTS = new Set();

  function gs(){ return targetScene||scene; }
  function addMesh(geo,color,x,y,z,opts={}){
    const s=gs();
    const mat=new THREE.MeshStandardMaterial({color,roughness:0.82,metalness:0,...opts});
    const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z);
    s.add(m);
    if(s===scene) sceneObjs.push(m); else previewObjs.push(m);
    return m;
  }
  function addL(type,color,intensity,x,y,z,dist=50){
    const s=gs(); let l;
    if(type==='ambient') l=new THREE.AmbientLight(color,intensity);
    else if(type==='hemi'){ l=new THREE.HemisphereLight(color,0x444444,intensity); }
    else if(type==='dir'){ l=new THREE.DirectionalLight(color,intensity); l.position.set(x,y,z); }
    else { l=new THREE.PointLight(color,intensity,dist); l.position.set(x,y,z); }
    s.add(l);
    if(s===scene) sceneObjs.push(l); else previewObjs.push(l);
    return l;
  }
  function bx(w,h,d,c,x,y,z,op={}) { return addMesh(new THREE.BoxGeometry(w,h,d),c,x,y+h/2,z,op); }
  // cy(radiusTop, radiusBottom, height, color, x, y, z, opts)
  // または cy(radius, height, color, x, y, z, opts) の両方に対応
  function cy(a,b,c,d,e,f,g,h={}){
    if(typeof d==='number'){ // cy(rt, rb, height, color, x, y, z, opts)
      return addMesh(new THREE.CylinderGeometry(a,b,c,14),d,e,f+c/2,g,h);
    } else { // cy(r, height, color, x, y, z, opts)
      return addMesh(new THREE.CylinderGeometry(a,a,b,14),c,d,e+b/2,f,g||{});
    }
  }
  function sp(r,c,x,y,z,op={})     { return addMesh(new THREE.SphereGeometry(r,18,14),c,x,y,z,op); }
  function rnd(a,b){ return a+Math.random()*(b-a); }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }

  // ── 水面（波形ジオメトリ + PBR反射）──
  function makeWater(w,d,x,y,z,col=0x4499cc,op=0.55){
    const geo=new THREE.PlaneGeometry(w,d,Math.max(4,Math.floor(w/2)),Math.max(4,Math.floor(d/2)));
    const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const px=pos.getX(i),py=pos.getY(i);
      pos.setZ(i, Math.sin(px*0.45)*0.07+Math.cos(py*0.38)*0.06+Math.sin(px*0.9+py*0.7)*0.03);
    }
    geo.computeVertexNormals();
    const mat=new THREE.MeshStandardMaterial({color:col,transparent:true,opacity:op,side:THREE.DoubleSide,roughness:0.04,metalness:0.14});
    const m=new THREE.Mesh(geo,mat);
    m.rotation.x=-Math.PI/2; m.position.set(x,y,z);
    m.userData={baseY:y,fAmp:0.03,fSpd:0.6,fOff:Math.random()*Math.PI*2,rSpd:0};
    scene.add(m); sceneObjs.push(m); return m;
  }
  // ── 上昇気泡 ──
  function makeBubbles(n,col,x1,x2,y1,y2,z1,z2){
    for(let i=0;i<n;i++){
      const m=sp(rnd(0.04,0.13),col,rnd(x1,x2),rnd(y1,y2),rnd(z1,z2),{transparent:true,opacity:rnd(0.2,0.5)});
      m.userData={isRising:true,riseSpd:rnd(0.2,0.8),riseMin:y1,riseMax:y2,baseY:0,fAmp:0,fSpd:0,fOff:0,rSpd:0};
    }
  }
  // ── 紙片 ──
  function makePapers(n,col=0xfff8ee){
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2,r=rnd(5,45);
      const m=new THREE.Mesh(new THREE.PlaneGeometry(rnd(0.18,0.5),rnd(0.25,0.65)),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:col,side:THREE.DoubleSide,transparent:true,opacity:0.88}));
      m.position.set(Math.cos(a)*r,rnd(1.2,3.2),Math.sin(a)*r);
      m.rotation.set(rnd(-0.4,0.4),Math.random()*Math.PI*2,rnd(-0.4,0.4));
      m.userData={baseY:m.position.y,fAmp:rnd(0.08,0.28),fSpd:rnd(0.15,0.45),fOff:Math.random()*Math.PI*2,rSpd:rnd(-0.15,0.15)};
      scene.add(m); sceneObjs.push(m);
    }
  }
  // ── 石灯籠（改）──
  function makeLantern(x,z){
    const stone={roughness:0.92,metalness:0};
    // 基礎
    addMesh(new THREE.CylinderGeometry(0.38,0.44,0.2,8),  0x888880,x, 0.1, z, stone);
    // 竿（軸）
    addMesh(new THREE.CylinderGeometry(0.1, 0.16,0.85,8), 0x797870,x, 0.52,z, stone);
    // 中台
    addMesh(new THREE.CylinderGeometry(0.36,0.36,0.1, 8), 0x888880,x, 0.97,z, stone);
    // 火袋（8角柱、半透明）
    addMesh(new THREE.CylinderGeometry(0.22,0.22,0.55,8), 0x9a9888,x, 1.3, z, {...stone,transparent:true,opacity:0.68});
    // 笠
    addMesh(new THREE.CylinderGeometry(0.0, 0.36,0.24,8), 0x888880,x, 1.69,z, stone);
    // 宝珠
    addMesh(new THREE.SphereGeometry(0.07,10,8),           0x7a7870,x, 1.86,z, stone);
    // 炎コア（発光）
    const flame=new THREE.Mesh(new THREE.SphereGeometry(0.1,10,8),
      new THREE.MeshStandardMaterial({color:0xffdd88,emissive:new THREE.Color(0xffaa33),emissiveIntensity:1.1,roughness:1,metalness:0}));
    flame.position.set(x,1.3,z); scene.add(flame); sceneObjs.push(flame);
    const lt=new THREE.PointLight(0xffcc77,1.3,6); lt.position.set(x,1.3,z); scene.add(lt); sceneObjs.push(lt);
  }
  // ── 鳥居（改）──
  function makeTorii(x,z,ry=0,col=0xcc2200){
    const mat={roughness:0.68,metalness:0.05};
    const h=4.2, half=1.6;
    // 柱（上が少し細い）
    addMesh(new THREE.CylinderGeometry(0.13,0.17,h,14),col, x-half,h/2,z,mat);
    addMesh(new THREE.CylinderGeometry(0.13,0.17,h,14),col, x+half,h/2,z,mat);
    // 島木（柱頭キャップ）
    addMesh(new THREE.CylinderGeometry(0.21,0.21,0.14,14),col,x-half,h+0.07,z,mat);
    addMesh(new THREE.CylinderGeometry(0.21,0.21,0.14,14),col,x+half,h+0.07,z,mat);
    // 笠木（最上段・やや幅広）
    addMesh(new THREE.BoxGeometry(half*2+1.1,0.22,0.32),col,x,h+0.22,z,mat);
    // 笠木端の反り
    [-1,1].forEach(s=>{
      const end=new THREE.Mesh(new THREE.BoxGeometry(0.38,0.16,0.3),new THREE.MeshStandardMaterial({color:col,...mat}));
      end.position.set(x+s*(half+0.6),h+0.28,z); end.rotation.z=s*0.2; scene.add(end); sceneObjs.push(end);
    });
    // 貫（中桁）
    addMesh(new THREE.BoxGeometry(half*2+0.3,0.16,0.22),col,x,h-1.0,z,mat);
  }
  // ── 射出する流れ星 ──
  function makeShootingStar(col=0xffffff){
    const m=sp(0.08,col,rnd(-40,40),rnd(10,30),rnd(-40,40),{transparent:true,opacity:0.95});
    m.material.emissive=new THREE.Color(col); m.material.emissiveIntensity=1;
    const angle=Math.random()*Math.PI*2, elev=rnd(-0.3,0.3);
    const spd=rnd(20,40);
    m.userData={isRising:false,fSpd:0,fAmp:0,fOff:0,rSpd:0,baseY:0,
      isShooting:true,shootVx:Math.cos(angle)*spd,shootVy:elev*spd,shootVz:Math.sin(angle)*spd,
      shootDist:rnd(35,55),shootOrigin:m.position.clone()};
    scene.add(m); sceneObjs.push(m);
    const trail=new THREE.PointLight(col,2,4); trail.position.copy(m.position);
    trail.userData={shootRef:m}; scene.add(trail); sceneObjs.push(trail);
  }
  // ── 浮遊階段 ──
  function makeStairs(sx,sy,sz,steps=8,dx=0.8,dy=0.55,dz=0,col=0xddd8cc){
    for(let i=0;i<steps;i++) bx(1.8,0.15,0.9,col,sx+dx*i,sy+dy*i,sz+dz*i);
  }
  // ── コケむした石 ──
  function makeMossyStone(x,z){
    const s=rnd(0.3,0.9);
    const m=new THREE.Mesh(new THREE.SphereGeometry(s,7,6),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:pick([0x445533,0x556644,0x334422])}));
    m.scale.y=rnd(0.4,0.7); m.position.set(x,s*0.3,z);
    scene.add(m); sceneObjs.push(m);
  }
  // ── 海草 ──
  function makeKelp(x,z){
    const h=rnd(2,6), col=pick([0x1a5a22,0x226633,0x1a4422]);
    for(let i=0;i<h;i++){
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,1,5),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:col}));
      seg.position.set(x+Math.sin(i*0.8)*0.15, i+0.5, z+Math.cos(i*0.8)*0.1);
      seg.userData={baseY:seg.position.y,fAmp:0.12,fSpd:0.4+i*0.1,fOff:i*0.5+Math.random()*Math.PI,rSpd:0};
      scene.add(seg); sceneObjs.push(seg);
    }
  }

  function checkerTex(c1,c2){
    const cv2=document.createElement('canvas'); cv2.width=cv2.height=256;
    const ctx=cv2.getContext('2d');
    for(let x=0;x<8;x++) for(let y=0;y<8;y++){ ctx.fillStyle=(x+y)%2===0?c1:c2; ctx.fillRect(x*32,y*32,32,32); }
    const t=new THREE.CanvasTexture(cv2); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(28,28); return t;
  }

  function disposeAll(){
    scene.children.filter(o=>!PERMANENTS.has(o)).forEach(o=>{
      scene.remove(o);
      o.traverse(c=>{ c.geometry?.dispose(); if(Array.isArray(c.material)) c.material.forEach(m=>m.dispose()); else c.material?.dispose(); });
    });
    sceneObjs=[]; portals=[];
  }
  function clearPreview(){
    previewObjs.forEach(o=>{ previewScene.remove(o); o.geometry?.dispose(); o.material?.dispose(); });
    previewObjs=[];
  }

  // ── 6. 永続オブジェクト（バブル + 出口リング）──────
  const BUBBLE_GRP = new THREE.Group();
  const BUBBLE_PLN = new THREE.Mesh(
    new THREE.CircleGeometry(1.0,36),
    new THREE.MeshBasicMaterial({map:previewTarget.texture,side:THREE.DoubleSide})
  );
  const BUBBLE_RNG = new THREE.Mesh(
    new THREE.TorusGeometry(1.05,0.05,8,36),
    new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9})
  );
  BUBBLE_GRP.add(BUBBLE_PLN); BUBBLE_GRP.add(BUBBLE_RNG);
  BUBBLE_GRP.visible=false; scene.add(BUBBLE_GRP);
  PERMANENTS.add(BUBBLE_GRP);

  const EXIT_RNG = new THREE.Mesh(
    new THREE.TorusGeometry(1.5,0.1,10,32),
    new THREE.MeshBasicMaterial({color:0x44ccff,transparent:true,opacity:0.85})
  );
  EXIT_RNG.visible=false; EXIT_RNG.userData.pOff=Math.random()*Math.PI*2;
  scene.add(EXIT_RNG); PERMANENTS.add(EXIT_RNG);

  const EXIT_LIGHT = new THREE.PointLight(0x44ccff,0,10);
  scene.add(EXIT_LIGHT); PERMANENTS.add(EXIT_LIGHT);
  const BUBBLE_LIGHT = new THREE.PointLight(0xffffff,0,8);
  scene.add(BUBBLE_LIGHT); PERMANENTS.add(BUBBLE_LIGHT);

  // ── 7. 生き物 + バブル配置 ───────────────────────────
  // 指定座標に生き物とビーコンを配置する（全シーンで共用）
  function addCreatureAt(cx, cz){
    const rug=new THREE.Mesh(new THREE.PlaneGeometry(2,2.8),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0x9966aa}));
    rug.rotation.x=-Math.PI/2; rug.position.set(cx,0.01,cz); scene.add(rug); sceneObjs.push(rug);
    const body=new THREE.Mesh(new THREE.SphereGeometry(0.38,16,12),new THREE.MeshStandardMaterial({roughness:0.72,metalness:0,color:0xffe0cc}));
    body.scale.set(1.5,0.8,1.0); body.position.set(cx,0.78,cz+0.15); scene.add(body); sceneObjs.push(body);
    sp(0.3,0xffe0cc,cx+0.04,0.82,cz-0.58);
    const eGeo=new THREE.SphereGeometry(0.1,10,8), eMat=new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0xffcaaa});
    [0.24,-0.24].forEach(ox=>{ const e=new THREE.Mesh(eGeo,eMat); e.scale.set(.7,1.4,.7); e.position.set(cx+ox,1.07,cz-0.58); scene.add(e); sceneObjs.push(e); });
    [0.11,-0.11].forEach(ox=>{ const ey=sp(0.055,0x4a3020,cx+ox+0.04,0.85,cz-0.9); ey.scale.set(1.1,0.25,0.5); });
    bx(1.45,0.14,1.7,0x7a9fc0,cx,0.52,cz+0.3);
    bx(1.75,0.28,2.6,0x6b4a30,cx,0,cz);

    // ビーコン（外層）
    const beamOuter=new THREE.Mesh(
      new THREE.CylinderGeometry(0.22,0.04,22,16,1,true),
      new THREE.MeshBasicMaterial({color:0xcc88ff,transparent:true,opacity:0.1,side:THREE.DoubleSide})
    );
    beamOuter.position.set(cx,11,cz); scene.add(beamOuter); sceneObjs.push(beamOuter);
    // ビーコン（内コア）
    const beamCore=new THREE.Mesh(
      new THREE.CylinderGeometry(0.06,0.02,22,8,1,true),
      new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.28,side:THREE.DoubleSide})
    );
    beamCore.position.set(cx,11,cz); beamCore.userData={rSpd:0.4,baseY:11,fAmp:0,fSpd:0,fOff:0};
    scene.add(beamCore); sceneObjs.push(beamCore);
    // 足元ハロー
    const halo=new THREE.Mesh(
      new THREE.TorusGeometry(0.8,0.06,8,32),
      new THREE.MeshBasicMaterial({color:0xcc88ff,transparent:true,opacity:0.7})
    );
    halo.rotation.x=Math.PI/2; halo.position.set(cx,0.08,cz);
    halo.userData={baseY:0.08,fAmp:0.02,fSpd:1.2,fOff:Math.random()*Math.PI*2,rSpd:0.6};
    scene.add(halo); sceneObjs.push(halo);
    const ringLight=new THREE.PointLight(0xcc88ff,2.8,20);
    ringLight.position.set(cx,0.5,cz); scene.add(ringLight); sceneObjs.push(ringLight);
    // 上昇粒子
    for(let i=0;i<14;i++){
      const m=new THREE.Mesh(new THREE.SphereGeometry(0.04,8,8),
        new THREE.MeshBasicMaterial({color:0xcc88ff,transparent:true,opacity:rnd(0.5,0.9)}));
      m.position.set(cx+rnd(-0.25,0.25),rnd(0.5,8),cz+rnd(-0.25,0.25));
      m.userData={isRising:true,riseSpd:rnd(0.6,1.8),riseMin:0.3,riseMax:9,baseY:0,fAmp:0,fSpd:0,fOff:0,rSpd:0};
      scene.add(m); sceneObjs.push(m);
    }

    const atMax = dreamStack.length >= MAX_DEPTH;

    if(!atMax){
      // 通常：次の夢への入口バブル＋ビーコン
      const beamOuter2=new THREE.Mesh(
        new THREE.CylinderGeometry(0.22,0.04,22,16,1,true),
        new THREE.MeshBasicMaterial({color:0xcc88ff,transparent:true,opacity:0.1,side:THREE.DoubleSide})
      );
      beamOuter2.position.set(cx,11,cz); scene.add(beamOuter2); sceneObjs.push(beamOuter2);
      const beamCore2=new THREE.Mesh(
        new THREE.CylinderGeometry(0.06,0.02,22,8,1,true),
        new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.28,side:THREE.DoubleSide})
      );
      beamCore2.position.set(cx,11,cz); beamCore2.userData={rSpd:0.4,baseY:11,fAmp:0,fSpd:0,fOff:0};
      scene.add(beamCore2); sceneObjs.push(beamCore2);
      const halo=new THREE.Mesh(
        new THREE.TorusGeometry(0.8,0.06,8,32),
        new THREE.MeshBasicMaterial({color:0xcc88ff,transparent:true,opacity:0.7})
      );
      halo.rotation.x=Math.PI/2; halo.position.set(cx,0.08,cz);
      halo.userData={baseY:0.08,fAmp:0.02,fSpd:1.2,fOff:Math.random()*Math.PI*2,rSpd:0.6};
      scene.add(halo); sceneObjs.push(halo);
      const ringLight=new THREE.PointLight(0xcc88ff,2.8,20);
      ringLight.position.set(cx,0.5,cz); scene.add(ringLight); sceneObjs.push(ringLight);
      for(let i=0;i<14;i++){
        const m=new THREE.Mesh(new THREE.SphereGeometry(0.04,8,8),
          new THREE.MeshBasicMaterial({color:0xcc88ff,transparent:true,opacity:rnd(0.5,0.9)}));
        m.position.set(cx+rnd(-0.25,0.25),rnd(0.5,8),cz+rnd(-0.25,0.25));
        m.userData={isRising:true,riseSpd:rnd(0.6,1.8),riseMin:0.3,riseMax:9,baseY:0,fAmp:0,fSpd:0,fOff:0,rSpd:0};
        scene.add(m); sceneObjs.push(m);
      }
      BUBBLE_GRP.position.set(cx,2.6,cz);
      BUBBLE_GRP.visible=true;
      BUBBLE_LIGHT.position.set(cx,2.6,cz); BUBBLE_LIGHT.intensity=2.0; BUBBLE_LIGHT.distance=22;
    } else {
      // 最深層：バブルを隠す。出口のみ存在
      BUBBLE_GRP.visible=false;
      BUBBLE_LIGHT.intensity=0;
      // 「最深層」を示す赤い光
      const endLight=new THREE.PointLight(0xff2244,2.5,15);
      endLight.position.set(cx,3,cz); scene.add(endLight); sceneObjs.push(endLight);
      const endGlow=new THREE.Mesh(
        new THREE.SphereGeometry(0.3,12,10),
        new THREE.MeshBasicMaterial({color:0xff2244,transparent:true,opacity:0.8})
      );
      endGlow.position.set(cx,2.8,cz);
      endGlow.userData={baseY:2.8,fAmp:0.15,fSpd:1.5,fOff:0,rSpd:0.3};
      scene.add(endGlow); sceneObjs.push(endGlow);
    }

    // 出口リング：最深層はキャラの真上、それ以外は逆方向
    if(atMax){
      EXIT_RNG.position.set(cx, 3.4, cz); // 生き物の真上
    } else {
      const toCreatureAng = Math.atan2(cz, cx);
      const exitAng = toCreatureAng + Math.PI;
      const ed = rnd(14,22);
      EXIT_RNG.position.set(Math.cos(exitAng)*ed, 1.5, Math.sin(exitAng)*ed);
    }
    EXIT_RNG.visible = dreamStack.length > 0;
    EXIT_LIGHT.position.copy(EXIT_RNG.position);
    EXIT_LIGHT.intensity = dreamStack.length > 0 ? 1.5 : 0; EXIT_LIGHT.distance=12;
  }

  // 一般シーン用：プレイヤーの正面方向（yaw基準）に配置
  function addCreature(){
    // yaw=0 → 前方=-z。前方2Dアングル = -π/2 - yaw
    const forwardAng = -Math.PI/2 - yaw;
    const baseAng = forwardAng + rnd(-Math.PI/3, Math.PI/3);
    const dist = rnd(18, 28);
    addCreatureAt(Math.cos(baseAng)*dist, Math.sin(baseAng)*dist);
  }

  // ── 8. シーンビルダー ────────────────────────────────
  const SCENES = {
    corridor(){
      disposeAll();
      scene.background=new THREE.Color(0xf4eedd); scene.fog=new THREE.FogExp2(0xf4eedd,0.036);
      addL('ambient',0xfff8e0,0.95); addL('dir',0xfff5cc,0.4,0,5,2);
      // 床
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(9,300),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,map:checkerTex('#e8dfc8','#d4c8a8')}));
      fl.rotation.x=-Math.PI/2; scene.add(fl); sceneObjs.push(fl);
      // 天井
      const ceil=new THREE.Mesh(new THREE.PlaneGeometry(9,300),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0xf0e8d8}));
      ceil.rotation.x=Math.PI/2; ceil.position.y=3.5; scene.add(ceil); sceneObjs.push(ceil);
      // 壁
      [-4.5,4.5].forEach(x=>{
        const w=new THREE.Mesh(new THREE.PlaneGeometry(300,3.5),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0xe0d4b8,side:THREE.DoubleSide}));
        w.rotation.y=x<0?Math.PI/2:-Math.PI/2; w.position.set(x,1.75,0); scene.add(w); sceneObjs.push(w);
      });
      // 蛍光灯 + 光
      for(let z=-100;z<100;z+=5){
        const lg=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.05,0.9),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0xffffee,emissive:new THREE.Color(0xffffcc),emissiveIntensity:rnd(0.7,1.0)}));
        lg.position.set(0,3.44,z); scene.add(lg); sceneObjs.push(lg);
        addL('point',0xfff8e0,0.6,0,3.2,z,12);
      }
      // ロッカー列
      for(let z=-80;z<80;z+=1.1) bx(0.15,1.9,1.0,pick([0x8090a0,0x7a8898]),-4.4,0,z);
      // ドア（右壁・光が漏れる）
      for(let z=-60;z<60;z+=10){
        bx(0.06,2.8,1.1,0xc8b898,4.42,0,z);
        const glow=new THREE.Mesh(new THREE.PlaneGeometry(0.9,2.5),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0xfffacc,emissive:new THREE.Color(0xfffacc),emissiveIntensity:0.5,transparent:true,opacity:0.12,side:THREE.DoubleSide}));
        glow.rotation.y=-Math.PI/2; glow.position.set(4.39,1.3,z); scene.add(glow); sceneObjs.push(glow);
        addL('point',0xfffacc,0.4,4.2,1.3,z,3);
      }
      // 天井パイプ
      for(let z=-80;z<80;z+=15) cy(0.12,9,0xaaaaaa,0,3.3,z,{});
      // 床の水たまり
      for(let i=0;i<8;i++) makeWater(rnd(1,3.5),rnd(0.8,2),rnd(-3,3),0.005,rnd(-50,50),0x99bbcc,0.4);
      // 浮遊する紙片
      makePapers(18);
      // EXITサイン
      for(let z=-70;z<70;z+=18){
        const s=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.3,0.05),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0x22aa44,emissive:new THREE.Color(0x00cc44),emissiveIntensity:0.8}));
        s.position.set(rnd(-3,3),3.1,z); scene.add(s); sceneObjs.push(s);
      }
      // どこへも続かない階段
      makeStairs(2,0,20,10,0,0.55,-1.0);
      // 廊下の奥（-z方向）に配置。廊下幅内に収める（x: -2〜2）
      addCreatureAt(rnd(-1.5,1.5), -rnd(22,32));
    },

    sky(){
      disposeAll();
      scene.background=new THREE.Color(0x7ec8e8); scene.fog=new THREE.FogExp2(0xb8e0f8,0.007);
      addL('hemi',0x87ceeb,1.2); addL('dir',0xfff8e0,0.8,5,10,3);
      // 雲の床
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0xeef8ff,transparent:true,opacity:0.6}));
      fl.rotation.x=-Math.PI/2; fl.position.y=-0.5; scene.add(fl); sceneObjs.push(fl);
      // 雲（複数レイヤー）
      const mkCloud=(x,y,z,s)=>{
        [[0,0,0,1],[s*.7,0,s*.4,.8],[-.6*s,0,s*.3,.75],[s*.3,s*.4,0,.7],[0,s*.3,s*.6,.65]].forEach(([dx,dy,dz,sc])=>{
          const m=sp(s*.5*sc,0xffffff,x+dx,y+dy,z+dz,{transparent:true,opacity:rnd(.75,.95)});
          m.userData={baseY:y+dy,fAmp:rnd(.15,.5),fSpd:rnd(.08,.22),fOff:Math.random()*Math.PI*2,rSpd:0};
        });
      };
      for(let i=0;i<22;i++) mkCloud(rnd(-80,80),rnd(1,15),rnd(-80,80),rnd(2,7));
      // 浮き島
      for(let i=0;i<7;i++){
        const x=rnd(-45,45),z=rnd(-45,45),y=rnd(-0.5,3.5);
        bx(rnd(5,12),rnd(.5,1.2),rnd(5,12),0x88cc66,x,y,z);
        bx(rnd(4,10),.28,rnd(4,10),0xaae888,x,y+.55,z);
        // 島の上に何か置く
        if(Math.random()>0.5) cy(0.2,rnd(2,5),0x6a4a20,x+rnd(-1,1),y+.7,z+rnd(-1,1));
        else bx(1,rnd(1,2.5),1,pick([0xcc8844,0x4488cc,0xcc4488]),x+rnd(-1,1),y+.7,z+rnd(-1,1));
      }
      // 虹（パステルカラーのトーラス）
      const rainbowColors=[0xff6688,0xff9944,0xffdd44,0x88dd44,0x44aaff,0x8844ff];
      rainbowColors.forEach((c,i)=>{
        const m=new THREE.Mesh(new THREE.TorusGeometry(12+i*1.2,0.25,6,36,Math.PI),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:c,transparent:true,opacity:0.55}));
        m.position.set(-15,2,25); m.rotation.x=Math.PI/2;
        scene.add(m); sceneObjs.push(m);
      });
      // どこへも続かない浮遊階段
      makeStairs(-8,6,-15,12,0.7,0.5,0);
      // 逆さの木
      for(let i=0;i<4;i++){
        const x=rnd(-50,50),z=rnd(-50,50),h=rnd(4,9);
        const tr=cy(0.25,h,0x5a3a1a,x,8+h/2,z); tr.rotation.z=Math.PI;
        sp(h*.3,0x1a5a1a,x,8+h+h*.3,z);
      }
      addCreature();
    },

    ocean(){
      disposeAll();
      scene.background=new THREE.Color(0x010e1e); scene.fog=new THREE.FogExp2(0x021525,0.025);
      addL('ambient',0x062040,0.6); addL('dir',0x2266aa,0.5,2,8,3); addL('point',0x0088cc,1.2,0,6,0,60);
      // 海底
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,map:checkerTex('#091828','#0a2030')}));
      fl.rotation.x=-Math.PI/2; scene.add(fl); sceneObjs.push(fl);
      // 海面（半透明）
      makeWater(300,300,0,10,0,0x0055aa,0.3);
      // 珊瑚・海藻
      for(let i=0;i<50;i++){
        const a=Math.random()*Math.PI*2,r=rnd(6,70),h=rnd(1,5.5);
        cy(rnd(.1,.4),h,pick([0xff6688,0xff8844,0x44aaff,0xaa44ff,0x44ddaa]),Math.cos(a)*r,0,Math.sin(a)*r);
        if(Math.random()>0.5) sp(rnd(0.3,0.8),pick([0xff6688,0x44ddaa,0xffaa44]),Math.cos(a)*r,h,Math.sin(a)*r);
      }
      // 海草
      for(let i=0;i<30;i++){ const a=Math.random()*Math.PI*2,r=rnd(5,55); makeKelp(Math.cos(a)*r,Math.sin(a)*r); }
      // クラゲ
      for(let i=0;i<20;i++){
        const a=Math.random()*Math.PI*2,r=rnd(5,50),y=rnd(1,8);
        const m=sp(rnd(.3,1.0),pick([0x88ccff,0x44aaff,0x66ffcc]),Math.cos(a)*r,y,Math.sin(a)*r,{transparent:true,opacity:rnd(.35,.7)});
        m.userData={baseY:y,fAmp:rnd(.5,1.4),fSpd:rnd(.2,.5),fOff:Math.random()*Math.PI*2,rSpd:rnd(-.15,.15)};
        // 触手
        for(let j=0;j<3;j++) cy(0.025,rnd(0.5,1.5),m.material.color.getHex(),Math.cos(a)*r+rnd(-0.3,0.3),y-rnd(0.3,0.8),Math.sin(a)*r+rnd(-0.3,0.3),{transparent:true,opacity:0.5});
      }
      // 気泡
      makeBubbles(50,0xaaddff,-60,60,0,10,-60,60);
      // 光の柱（上から差し込む）
      for(let i=0;i<10;i++){
        const a=Math.random()*Math.PI*2,r=rnd(8,45);
        const shaft=cy(0.15,12,0x88ccff,Math.cos(a)*r,5,Math.sin(a)*r,{transparent:true,opacity:0.08});
        addL('point',0x2299ff,1.0,Math.cos(a)*r,9,Math.sin(a)*r,15);
      }
      // 古代遺跡
      for(let i=0;i<5;i++){
        const a=Math.random()*Math.PI*2,r=rnd(15,50);
        const x=Math.cos(a)*r,z=Math.sin(a)*r;
        cy(rnd(0.3,0.7),rnd(2,5),0x667788,x,0,z); // 半埋まりの柱
        if(Math.random()>0.5){ bx(3,0.3,0.4,0x667788,x,rnd(1.5,3),z+rnd(-1,1)); } // アーチ
      }
      // 宝箱
      bx(0.8,0.5,0.6,0x8b6020,rnd(-15,15),0,rnd(-15,15));
      addL('point',0xffcc44,0.8,0,0.5,0,6);
      addCreature();
    },

    backrooms(){
      disposeAll();
      scene.background=new THREE.Color(0xd4c870); scene.fog=new THREE.FogExp2(0xd4c870,0.055);
      addL('ambient',0xf0e070,0.8); addL('dir',0xffe090,0.45,2,6,1);
      // 床（カーペット）
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,map:checkerTex('#c8bc5c','#bfb34d')}));
      fl.rotation.x=-Math.PI/2; scene.add(fl); sceneObjs.push(fl);
      // 天井
      const ceil=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0xe8dca0}));
      ceil.rotation.x=Math.PI/2; ceil.position.y=2.8; scene.add(ceil); sceneObjs.push(ceil);
      // 蛍光灯（ランダム輝度）
      for(let i=0;i<35;i++){
        const x=rnd(-40,40),z=rnd(-40,40);
        const lg=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.05,0.85),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0xfffff0,emissive:new THREE.Color(0xffffaa),emissiveIntensity:rnd(0.3,1.0)}));
        lg.position.set(x,2.74,z); lg.userData={baseY:2.74,fAmp:0,fSpd:0,fOff:0,rSpd:0,isFlicker:true,flickerSpd:rnd(1,5),flickerOff:Math.random()*Math.PI*2};
        scene.add(lg); sceneObjs.push(lg);
        addL('point',0xffffe0,0.7,x,2.5,z,10);
      }
      // 柱
      for(let i=0;i<22;i++) bx(.55,2.8,.55,0xccc060,rnd(-50,50),0,rnd(-50,50));
      // 天井パイプ
      for(let i=0;i<15;i++){
        const ang=Math.random()*Math.PI, len=rnd(10,30);
        const x=rnd(-30,30),z=rnd(-30,30);
        const pipe=cy(0.08,len,0x888844,x,2.6,z); pipe.rotation.z=ang;
      }
      // 水たまり（床の反射）
      for(let i=0;i<12;i++) makeWater(rnd(1,4),rnd(0.8,2.5),rnd(-40,40),0.005,rnd(-40,40),0xd4c020,0.35);
      // 古いテレビ
      for(let i=0;i<5;i++){
        const x=rnd(-30,30),z=rnd(-30,30);
        bx(0.9,0.7,0.5,0x333322,x,0,z);
        const screen=new THREE.Mesh(new THREE.PlaneGeometry(0.72,0.52),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:pick([0x88ffaa,0xff8844,0x4488ff]),emissive:new THREE.Color(pick([0x44aa44,0xaa4400,0x0044aa])),emissiveIntensity:rnd(0.4,0.8)}));
        screen.rotation.y=Math.random()*Math.PI*2; screen.position.set(x,0.7+0.35,z); screen.position.y=0.7+0.35;
        scene.add(screen); sceneObjs.push(screen);
        addL('point',pick([0x88ffaa,0xff8844,0x4488ff]),0.6,x,0.8,z,4);
      }
      // 散乱した書類
      makePapers(20,0xf5f0cc);
      // 積み上げられた椅子
      for(let i=0;i<6;i++){
        const x=rnd(-35,35),z=rnd(-35,35);
        for(let j=0;j<rnd(2,5)|0;j++) bx(0.7,0.8,0.7,0xc8b870,x,j*0.75,z);
      }
      addCreature();
    },

    night(){
      disposeAll();
      scene.background=new THREE.Color(0x000510); scene.fog=new THREE.FogExp2(0x000510,0.01);
      addL('ambient',0x111133,0.45); addL('dir',0x8888ff,0.35,-3,10,5); addL('point',0x8888ff,0.8,0,15,0,100);
      // 地面グリッド
      const base=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0x000510}));
      base.rotation.x=-Math.PI/2; base.position.y=-0.01; scene.add(base); sceneObjs.push(base);
      const grid=new THREE.Mesh(new THREE.PlaneGeometry(500,500,60,60),new THREE.MeshBasicMaterial({color:0x2233aa,wireframe:true,transparent:true,opacity:0.1}));
      grid.rotation.x=-Math.PI/2; scene.add(grid); sceneObjs.push(grid);
      // 星
      for(let i=0;i<220;i++){
        const a=Math.random()*Math.PI*2,r=rnd(5,120),y=rnd(1,42);
        const m=sp(rnd(.03,.22),pick([0xffffff,0xaacdff,0xffe8aa,0xffaaaa,0xaaffcc]),Math.cos(a)*r,y,Math.sin(a)*r);
        m.material.emissive=new THREE.Color(m.material.color.getHex()); m.material.emissiveIntensity=rnd(.3,.9);
        m.userData={baseY:y,fAmp:rnd(.04,.18),fSpd:rnd(.04,.14),fOff:Math.random()*Math.PI*2,rSpd:0};
      }
      // 月
      const moon=sp(5,0xfff8dd,0,32,-65); moon.material.emissive=new THREE.Color(0xfff0aa); moon.material.emissiveIntensity=0.55;
      addL('point',0xfff8dd,0.6,0,30,-65,150);
      // 惑星
      for(let i=0;i<8;i++){
        const a=Math.random()*Math.PI*2,r=rnd(20,65),y=rnd(5,20);
        const m=sp(rnd(1.5,4.5),pick([0x4466cc,0xcc4466,0x44cc88,0xaa66cc,0xcc8844]),Math.cos(a)*r,y,Math.sin(a)*r);
        m.userData={baseY:y,fAmp:rnd(.3,.9),fSpd:rnd(.04,.14),fOff:Math.random()*Math.PI*2,rSpd:rnd(-.08,.08)};
      }
      // 流れ星
      for(let i=0;i<5;i++) makeShootingStar(pick([0xffffff,0xaaddff,0xffddaa]));
      // 星雲（大きな半透明球）
      for(let i=0;i<4;i++){
        const a=Math.random()*Math.PI*2,r=rnd(25,60),y=rnd(8,25);
        const m=sp(rnd(5,12),pick([0x4466aa,0xaa4466,0x44aa88]),Math.cos(a)*r,y,Math.sin(a)*r,{transparent:true,opacity:rnd(0.06,0.15)});
      }
      // 浮遊灯籠
      for(let i=0;i<12;i++){
        const a=Math.random()*Math.PI*2,r=rnd(6,40),y=rnd(1.5,8);
        const m=sp(0.2,0xffdd88,Math.cos(a)*r,y,Math.sin(a)*r,{transparent:true,opacity:0.9});
        m.material.emissive=new THREE.Color(0xffaa44); m.material.emissiveIntensity=0.8;
        m.userData={baseY:y,fAmp:rnd(0.3,0.8),fSpd:rnd(0.2,0.5),fOff:Math.random()*Math.PI*2,rSpd:0};
        addL('point',0xffdd88,0.5,Math.cos(a)*r,y,Math.sin(a)*r,4);
      }
      // 観測ドーム
      const dome=new THREE.Mesh(new THREE.SphereGeometry(4,16,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0x223344,transparent:true,opacity:0.7,side:THREE.DoubleSide,wireframe:false}));
      dome.position.set(rnd(20,35),0,rnd(20,35)); scene.add(dome); sceneObjs.push(dome);
      cy(4.1,0.3,0x334455,dome.position.x,0,dome.position.z);
      addCreature();
    },

    forest(){
      disposeAll();
      scene.background=new THREE.Color(0x0d1a0d); scene.fog=new THREE.FogExp2(0x0d1a0d,0.026);
      addL('hemi',0x44aa44,0.55); addL('dir',0x88ff88,0.3,2,8,3);
      // 苔の地面
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,map:checkerTex('#0d2a0d','#0a200a')}));
      fl.rotation.x=-Math.PI/2; scene.add(fl); sceneObjs.push(fl);
      // 地面霧（薄い半透明plane）
      const mist=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0x224422,transparent:true,opacity:0.18}));
      mist.rotation.x=-Math.PI/2; mist.position.y=0.25;
      scene.add(mist); sceneObjs.push(mist);
      // 木
      for(let i=0;i<75;i++){
        const a=Math.random()*Math.PI*2,r=rnd(6,75),h=rnd(4,14),tr=rnd(.18,.48);
        cy(tr,h,pick([0x5a3a1a,0x4a2a0a,0x6a4a2a]),Math.cos(a)*r,0,Math.sin(a)*r);
        const crown=sp(h*.32,pick([0x1a5a1a,0x2a6a2a,0x0a4a0a,0x1a4a1a]),Math.cos(a)*r,h*.68,Math.sin(a)*r);
        crown.userData={baseY:h*.68,fAmp:rnd(0.03,0.08),fSpd:rnd(0.2,0.4),fOff:Math.random()*Math.PI*2,rSpd:rnd(-0.01,0.01)};
      }
      // 石灯籠
      for(let i=0;i<8;i++){
        const a=Math.random()*Math.PI*2,r=rnd(8,45);
        makeLantern(Math.cos(a)*r,Math.sin(a)*r);
      }
      // 鳥居
      makeTorii(rnd(15,30)*pick([-1,1]),rnd(15,30)*pick([-1,1]));
      // コケ石
      for(let i=0;i<25;i++) makeMossyStone(rnd(-60,60),rnd(-60,60));
      // キノコのフェアリーリング
      for(let k=0;k<3;k++){
        const cx=rnd(-30,30),cz=rnd(-30,30),cr=rnd(3,7);
        for(let i=0;i<10;i++){
          const a=i/10*Math.PI*2;
          cy(0.07,rnd(0.3,0.6),0xddddaa,cx+Math.cos(a)*cr,0,cz+Math.sin(a)*cr);
          const cap=new THREE.Mesh(new THREE.SphereGeometry(rnd(0.2,0.35),7,6),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:pick([0xcc3322,0xee5533,0xff4422])}));
          cap.scale.y=0.5; cap.position.set(cx+Math.cos(a)*cr,rnd(0.35,0.62),cz+Math.sin(a)*cr);
          cap.material.emissive=new THREE.Color(0x441100); cap.material.emissiveIntensity=0.2;
          scene.add(cap); sceneObjs.push(cap);
        }
        addL('point',0x88ffaa,0.6,cx,0.8,cz,8);
      }
      // ホタル
      for(let i=0;i<30;i++){
        const a=Math.random()*Math.PI*2,r=rnd(5,50),y=rnd(1,4);
        const lt=new THREE.PointLight(pick([0x88ffaa,0xaaffcc,0x44ff88]),0.7,5);
        lt.position.set(Math.cos(a)*r,y,Math.sin(a)*r);
        lt.userData={baseY:y,fAmp:rnd(.3,.9),fSpd:rnd(.3,.8),fOff:Math.random()*Math.PI*2,rSpd:0};
        scene.add(lt); sceneObjs.push(lt);
      }
      addCreature();
    },

    meadow(){
      disposeAll();
      scene.background=new THREE.Color(0xffe8f8); scene.fog=new THREE.FogExp2(0xffeef8,0.009);
      addL('hemi',0xffaacc,1.0); addL('dir',0xffffff,0.6,3,10,4);
      // 草原
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0x99cc88}));
      fl.rotation.x=-Math.PI/2; scene.add(fl); sceneObjs.push(fl);
      // 花畑
      const fc=[0xff88aa,0xffaacc,0xffcc88,0xaaffcc,0x88ccff,0xddaaff,0xffff88,0xff88ff];
      for(let i=0;i<90;i++){
        const a=Math.random()*Math.PI*2,r=rnd(3,80),s=rnd(.3,1.6);
        const m=sp(s,pick(fc),Math.cos(a)*r,s,Math.sin(a)*r,{transparent:true,opacity:rnd(.7,.95)});
        m.userData={baseY:s,fAmp:rnd(.08,.3),fSpd:rnd(.2,.55),fOff:Math.random()*Math.PI*2,rSpd:rnd(-.18,.18)};
        cy(.04,s*1.4,0x88aa44,Math.cos(a)*r,0,Math.sin(a)*r);
      }
      // 流れる川
      makeWater(6,120,12,0.01,0,0x55aacc,0.65);
      makeWater(6,120,-12,0.01,0,0x55aacc,0.65);
      // 橋
      bx(30,0.2,3,0x8b6a40,0,0.1,0);
      bx(0.2,0.8,3,0x7a5a30,-14.5,0.1,0); bx(0.2,0.8,3,0x7a5a30,14.5,0.1,0);
      bx(0.2,0.8,3,0x7a5a30,-7,0.1,0);    bx(0.2,0.8,3,0x7a5a30,7,0.1,0);
      // 風車
      const wmx=rnd(20,35),wmz=rnd(20,35);
      cy(0.3,8,0xddccaa,wmx,0,wmz);
      bx(2,0.2,0.2,0xddccaa,wmx,8,wmz);
      for(let i=0;i<4;i++){
        const blade=new THREE.Mesh(new THREE.PlaneGeometry(0.6,3.5),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0xeeddaa,side:THREE.DoubleSide}));
        blade.position.set(wmx,8,wmz); blade.rotation.z=i*Math.PI/2;
        blade.userData={baseY:8,fAmp:0,fSpd:0,fOff:0,rSpd:1.5};
        scene.add(blade); sceneObjs.push(blade);
      }
      // 蝶（小さな平面）
      for(let i=0;i<20;i++){
        const a=Math.random()*Math.PI*2,r=rnd(5,60),y=rnd(1,3.5);
        const butter=new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.3),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:pick(fc),transparent:true,opacity:0.85,side:THREE.DoubleSide}));
        butter.position.set(Math.cos(a)*r,y,Math.sin(a)*r);
        butter.userData={baseY:y,fAmp:rnd(0.2,0.6),fSpd:rnd(0.8,2.0),fOff:Math.random()*Math.PI*2,rSpd:rnd(1.5,3.0)};
        scene.add(butter); sceneObjs.push(butter);
      }
      // アーチ
      for(let i=0;i<4;i++){
        const a=Math.random()*Math.PI*2,r=rnd(12,45),c=pick(fc);
        bx(0.18,2.8,0.18,c,Math.cos(a)*r-1.3,0,Math.sin(a)*r);
        bx(0.18,2.8,0.18,c,Math.cos(a)*r+1.3,0,Math.sin(a)*r);
        bx(2.8,0.18,0.18,c,Math.cos(a)*r,2.8,Math.sin(a)*r);
      }
      addCreature();
    },
  };

  // ── 9. プレビュー ────────────────────────────────────
  function buildPreview(type){
    clearPreview();
    targetScene=previewScene;
    const pa=(g,c,x,y,z,op={})=>{ const mat=new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:c,...op}); const m=new THREE.Mesh(g,mat); m.position.set(x,y,z); previewScene.add(m); previewObjs.push(m); return m; };
    const pal=(type2,c,i,x,y,z,d=50)=>{ let l; if(type2==='ambient') l=new THREE.AmbientLight(c,i); else{l=new THREE.PointLight(c,i,d); l.position.set(x,y,z);} previewScene.add(l); previewObjs.push(l); };
    const presets={
      corridor:()=>{ previewScene.background=new THREE.Color(0xf4eedd); previewScene.fog=new THREE.FogExp2(0xf4eedd,.06); pal('ambient',0xfff8e0,.9); for(let z=-20;z<20;z+=5){ pa(new THREE.BoxGeometry(.25,.05,.8),0xffffee,0,3.4,z,{emissive:new THREE.Color(0xffffcc),emissiveIntensity:1}); } pa(new THREE.PlaneGeometry(9,60),0xe8dfc8,0,0,0).rotation.x=-Math.PI/2; },
      sky:()=>{ previewScene.background=new THREE.Color(0x87ceeb); previewScene.fog=new THREE.FogExp2(0xc8e8ff,.008); pal('ambient',0x87ceeb,1.2); for(let i=0;i<8;i++) pa(new THREE.SphereGeometry(rnd(1,3),7,7),0xffffff,rnd(-15,15),rnd(3,10),rnd(-15,15),{transparent:true,opacity:.9}); },
      ocean:()=>{ previewScene.background=new THREE.Color(0x010e1e); previewScene.fog=new THREE.FogExp2(0x021525,.04); pal('ambient',0x062040,.5); pal('point',0x0088cc,1.2,0,6,0,60); for(let i=0;i<12;i++) pa(new THREE.CylinderGeometry(.2,.25,rnd(1,4),7),pick([0xff6688,0x44aaff,0xaa44ff]),rnd(-12,12),0,rnd(-12,12)); pa(new THREE.PlaneGeometry(60,60),0x091828,0,0,0).rotation.x=-Math.PI/2; },
      backrooms:()=>{ previewScene.background=new THREE.Color(0xd4c870); previewScene.fog=new THREE.FogExp2(0xd4c870,.07); pal('ambient',0xf0e070,.85); for(let i=0;i<8;i++) pa(new THREE.BoxGeometry(.2,.04,.8),0xfffff0,rnd(-10,10),2.7,rnd(-10,10),{emissive:new THREE.Color(0xffffaa),emissiveIntensity:.9}); pa(new THREE.PlaneGeometry(80,80),0xc8bc5c,0,0,0).rotation.x=-Math.PI/2; },
      night:()=>{ previewScene.background=new THREE.Color(0x000510); for(let i=0;i<60;i++) { const m=pa(new THREE.SphereGeometry(rnd(.03,.15),5,5),0xffffff,rnd(-20,20),rnd(1,20),rnd(-20,20)); m.material.emissive=new THREE.Color(0xffffff); m.material.emissiveIntensity=.7; } pal('ambient',0x111133,.4); },
      forest:()=>{ previewScene.background=new THREE.Color(0x0d1a0d); previewScene.fog=new THREE.FogExp2(0x0d1a0d,.04); pal('hemi',0x44aa44,.6); for(let i=0;i<16;i++){ const a=Math.random()*Math.PI*2,r=rnd(3,15),h=rnd(3,10); pa(new THREE.CylinderGeometry(.2,.25,h,7),0x5a3a1a,Math.cos(a)*r,h/2,Math.sin(a)*r); pa(new THREE.SphereGeometry(h*.28,7,7),pick([0x1a5a1a,0x2a6a2a]),Math.cos(a)*r,h*.65,Math.sin(a)*r); } pa(new THREE.PlaneGeometry(80,80),0x0a200a,0,0,0).rotation.x=-Math.PI/2; },
      meadow:()=>{ previewScene.background=new THREE.Color(0xffe8f8); previewScene.fog=new THREE.FogExp2(0xffeef8,.01); pal('hemi',0xffaacc,1.0); for(let i=0;i<20;i++) pa(new THREE.SphereGeometry(rnd(.5,1.5),8,8),pick([0xff88aa,0xffaacc,0x88ccff,0xddaaff]),rnd(-15,15),rnd(.5,1.8),rnd(-15,15),{transparent:true,opacity:.85}); pa(new THREE.PlaneGeometry(80,80),0xaaddaa,0,0,0).rotation.x=-Math.PI/2; },
    };
    (presets[type]||presets.meadow)();
    targetScene=null;
  }

  // ── 10. ドリームライブラリ + スタック ────────────────
  const DREAMS = [
    {text:'誰もいない廊下をひとり歩いていた',    scene:'corridor'},
    {text:'空の上をのんびり散歩していた',         scene:'sky'},
    {text:'深い海の底で光を見ていた',            scene:'ocean'},
    {text:'黄色い壁が続く不思議な部屋にいた',    scene:'backrooms'},
    {text:'星空の宇宙を漂っていた',             scene:'night'},
    {text:'霧の中の不思議な森を歩いていた',      scene:'forest'},
    {text:'パステル色の草原をひとりで歩いていた', scene:'meadow'},
  ];
  let dreamIdx=0;
  const dreamStack=[];
  let upcomingDream=null;

  function nextDream(){ const d=DREAMS[dreamIdx%DREAMS.length]; dreamIdx++; return d; }

  const MAX_DEPTH = 7;

  let controlsShownOnce = false;
  function enterDream(dream){
    dreamStack.push(dream);
    // 最深層でなければ次の夢をプレビュー
    if(dreamStack.length < MAX_DEPTH){
      upcomingDream=nextDream();
      buildPreview(upcomingDream.scene);
    } else {
      upcomingDream=null;
      clearPreview();
    }
    SCENES[dream.scene]?.();
    camera.position.set(0,1.7,0); yaw=0; pitch=0;
    refreshDepth();
    showBubbleText(dream.text);
    if(!controlsShownOnce){ controlsShownOnce=true; setTimeout(showControls, 300); }
    if(actx) setTimeout(()=>playArea(dream.scene),500);
    else { const fn=()=>{ initAudio(); playArea(dream.scene); }; cvs.addEventListener('mousedown',fn,{once:true}); document.addEventListener('keydown',fn,{once:true}); }
  }

  function exitDream(){
    // 第7層（最深層）から出る → グリッチエンディング
    if(dreamStack.length >= MAX_DEPTH){
      startGlitchEnding();
      return;
    }
    dreamStack.pop();
    if(dreamStack.length===0){
      // 第1層から現実へ戻る → 普通にオープニングへ
      buildOpening();
      gameState='opening';
      return;
    }
    const prev=dreamStack[dreamStack.length-1];
    upcomingDream=nextDream();
    buildPreview(upcomingDream.scene);
    SCENES[prev.scene]?.();
    camera.position.set(0,1.7,0); yaw=0; pitch=0;
    gameState='playing';
    refreshDepth();
    showBubbleText(prev.text);
    if(actx) setTimeout(()=>playArea(prev.scene),500);
  }

  function refreshDepth(){
    const d=dreamStack.length;
    const bar=Array.from({length:MAX_DEPTH},(_,i)=>i<d?'■':'□').join(' ');
    DEPTH.textContent=`DREAM  ${bar}`;
  }

  function showBubbleText(txt){ BUBBLE.textContent=txt; BUBBLE.style.display='block'; clearTimeout(BUBBLE._t); BUBBLE._t=setTimeout(()=>{ BUBBLE.style.opacity='0'; setTimeout(()=>{ BUBBLE.style.display='none'; BUBBLE.style.opacity='1'; },500); },5000); }

  function fadeTransition(cb){
    FADE.style.opacity='1';
    setTimeout(()=>{ cb(); FADE.style.opacity='0'; },560);
  }

  // ── グリッチエンディング ──────────────────────────────
  function startGlitchEnding(){
    gameState='transitioning';
    FADE.style.transition='opacity 0.8s';
    FADE.style.opacity='1';
    setTimeout(()=>{
      ov.style.transition='opacity 0.4s';
      ov.style.opacity='0';
      cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup',   onKey);
      ro.disconnect();
      window._dreamRunning=false;
      setTimeout(()=>{ ov.remove(); _startGlitch(containerEl); }, 450);
    }, 850);
  }

  function _startGlitch(screen){
    // ── 弱めのグリッチCSS ──
    const style=document.createElement('style');
    style.textContent=`
      @keyframes sg-shake{
        0%,80%,100%{transform:translate(0)skew(0);filter:none}
        8%{transform:translate(-3px,1px)skew(-1deg);filter:hue-rotate(40deg)saturate(2)}
        16%{transform:translate(3px,-1px);filter:hue-rotate(80deg)}
        24%{transform:translate(-5px,0);filter:contrast(1.8)brightness(1.3)}
        32%{transform:translate(5px,0);filter:saturate(3)}
        42%{transform:translate(-2px,2px)skew(.5deg);filter:hue-rotate(20deg)}
        52%{transform:translate(2px,-2px);filter:none}
      }
      @keyframes sg-scan{to{background-position:0 6px}}
      @keyframes sg-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      @keyframes sg-bubblepop{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}
    `;
    document.head.appendChild(style);

    const con=document.querySelector('.sfc-console');
    if(con) con.style.animation='sg-shake .28s infinite';

    const scan=document.createElement('div');
    scan.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:50;'+
      'background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,200,80,.03) 3px,rgba(0,200,80,.03) 4px);'+
      'animation:sg-scan .12s linear infinite;';
    screen.appendChild(scan);

    // ── 3秒後：グリッチ終了 → 白ポン登場 ──
    setTimeout(()=>{
      if(con){ con.style.animation='none'; con.style.transform=''; con.style.filter=''; }
      scan.remove();

      // 黒フェードイン
      const blackout=document.createElement('div');
      blackout.style.cssText='position:absolute;inset:0;background:#000;z-index:200;opacity:0;transition:opacity 0.7s;pointer-events:none;';
      screen.appendChild(blackout);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ blackout.style.opacity='1'; }));

      // 白ポンシーン
      setTimeout(()=>{ _showWhitePonScene(screen, blackout); }, 750);
    }, 3000);
  }

  function _showWhitePonScene(screen, blackout){
    // シーンコンテナ
    const scene2=document.createElement('div');
    scene2.style.cssText='position:absolute;inset:0;background:#000;z-index:300;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity 0.8s;pointer-events:none;';
    screen.appendChild(scene2);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ scene2.style.opacity='1'; blackout.style.opacity='0'; }));

    // 白ポン画像
    const ponWrap=document.createElement('div');
    ponWrap.style.cssText='display:flex;flex-direction:column;align-items:center;animation:sg-float 2.4s ease-in-out infinite;';

    // 吹き出し（白ポンの上）
    const bubble=document.createElement('div');
    bubble.style.cssText=[
      'background:rgba(255,255,255,0.96)',
      'color:#333',
      'padding:10px 14px',
      'border-radius:14px',
      'font-size:11px',
      'font-family:serif',
      'text-align:center',
      'max-width:150px',
      'line-height:1.7',
      'margin-bottom:10px',
      'position:relative',
      'opacity:0',
      'transition:opacity .8s',
      'transition-delay:.6s',
      'animation:sg-bubblepop .4s .6s both',
    ].join(';');
    // シンハラ語：「また夢で逢いましょう」
    bubble.textContent='සිහිනයෙන් නැවත හමුවෙමු';
    // 吹き出しのしっぽ（下向き）
    const tail=document.createElement('div');
    tail.style.cssText='position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:9px solid rgba(255,255,255,0.96);';
    bubble.appendChild(tail);
    ponWrap.appendChild(bubble);

    // しろいポンスプライト
    const ponEl=document.createElement('div');
    if(window.SUSHI_SPRITES && window.SUSHI_SPRITES.length>0){
      const img=document.createElement('img');
      img.src=window.SUSHI_SPRITES[window.SUSHI_SPRITES.length-1].canvas.toDataURL();
      img.style.cssText='width:80px;height:80px;image-rendering:pixelated;display:block;';
      ponEl.appendChild(img);
    } else {
      ponEl.style.cssText='width:60px;height:60px;background:#fff;border-radius:50%;';
    }
    ponWrap.appendChild(ponEl);
    scene2.appendChild(ponWrap);

    // 吹き出しフェードイン
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ bubble.style.opacity='1'; }));

    // 5秒後にフェードアウト → 逆スイカゲームへ
    setTimeout(()=>{
      scene2.style.opacity='0';
      setTimeout(()=>{
        scene2.remove(); blackout.remove();
        if(window.startReverseGame) window.startReverseGame(screen);
        else location.reload();
      }, 900);
    }, 5000);
  }

  // ── 11. オープニングシーン ───────────────────────────
  let zoomT=0, gameState='opening';
  const CAM_OPEN=new THREE.Vector3(.3,2.8,7);
  const CAM_ZOOM=new THREE.Vector3(0,1.8,0.8);
  const CAM_TGTO=new THREE.Vector3(0,.85,0);

  function buildOpening(){
    disposeAll();
    gameState='opening'; zoomT=0;
    scene.background=new THREE.Color(0x0d0d22);
    scene.fog=new THREE.FogExp2(0x0d0d22,0.006);
    addL('ambient',0xfff0e0,0.55); addL('dir',0xc8d8ff,.35,-4,8,6); addL('point',0xffcc88,1.8,2.2,2.2,1,10);
    // 床
    const flM=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0x7a5a3a})); flM.rotation.x=-Math.PI/2; scene.add(flM); sceneObjs.push(flM);
    // ベッド
    bx(2.0,.32,2.9,0x6b4a30,0,0,0); bx(1.75,.22,2.65,0xf0e8d8,0,.32,0);
    bx(2.0,.85,.1,0x6b4a30,0,.15,-1.45); bx(.85,.13,.55,0xfef5ee,0,.56,-.95);
    bx(1.6,.16,1.85,0x7a9fc0,0,.55,.35);
    // 生き物
    const body2=new THREE.Mesh(new THREE.SphereGeometry(0.4,12,12),new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0xffe0cc}));
    body2.scale.set(1.55,.82,1.0); body2.position.set(0,.82,.2); scene.add(body2); sceneObjs.push(body2);
    sp(0.32,0xffe0cc,.05,.86,-.65);
    const eGeo=new THREE.SphereGeometry(.1,8,8),eMat=new THREE.MeshStandardMaterial({roughness:0.82,metalness:0,color:0xffcaaa});
    [.26,-.26].forEach(x=>{ const e=new THREE.Mesh(eGeo,eMat); e.scale.set(.7,1.4,.7); e.position.set(x,1.1,-.65); scene.add(e); sceneObjs.push(e); });
    // zzz
    for(let i=0;i<3;i++){ const z=sp(.03+i*.012,0xffffff,.3+i*.12,1.05+i*.16,-.78-i*.1); z.material.emissive=new THREE.Color(0xffffff); z.material.emissiveIntensity=.6; z.userData={baseY:1.05+i*.16,fAmp:.06,fSpd:.5+i*.2,fOff:i*1.2,rSpd:0}; }
    // ナイトスタンド
    bx(.5,.6,.5,0x6b4a30,1.25,0,-.85); bx(.12,.3,.12,0x8a7a6a,1.25,.65,-.85);
    addL('point',0xffcc88,1.5,1.25,.95,-.85,7);
    // 星
    for(let i=0;i<50;i++){ const m=sp(rnd(.012,.035),0xffffff,rnd(-10,10),rnd(2,8),rnd(-12,-3)); m.material.emissive=new THREE.Color(0xffffff); m.material.emissiveIntensity=.5; }

    // 最初の夢を選んでプレビュー
    upcomingDream=nextDream();
    buildPreview(upcomingDream.scene);
    BUBBLE_GRP.position.set(0,2.4,-.4); BUBBLE_GRP.visible=true;
    BUBBLE_LIGHT.position.set(0,2.4,-.4); BUBBLE_LIGHT.intensity=1.2;
    EXIT_RNG.visible=false; EXIT_LIGHT.intensity=0;

    camera.position.copy(CAM_OPEN);
    camera.lookAt(CAM_TGTO);

    refreshDepth();
    setTimeout(()=>{ if(gameState==='opening') startZoom(); }, 3000);
  }

  function startZoom(){ gameState='zooming'; }

  function skipOpening(){
    if(gameState==='playing'||gameState==='transitioning') return;
    gameState='transitioning'; // 複数回呼ばれても1回だけ実行
    fadeTransition(()=>{
      enterDream(upcomingDream);
      gameState='playing';
    });
  }

  cvs.addEventListener('mousedown',()=>{ if(gameState!=='playing'&&gameState!=='transitioning') skipOpening(); },{passive:true});
  cvs.addEventListener('touchend', ()=>{ if(gameState!=='playing'&&gameState!=='transitioning') skipOpening(); },{passive:true});
  document.addEventListener('keydown',ev=>{ if(gameState!=='playing'&&gameState!=='transitioning'&&ev.key!=='Tab') skipOpening(); },{passive:true});

  // ── 12. ポータル近接チェック ─────────────────────────
  let nearBubble=false, nearExit=false;

  function checkProximity(){
    if(gameState!=='playing') return;
    const bd = BUBBLE_GRP.visible ? camera.position.distanceTo(BUBBLE_GRP.position) : Infinity;
    const ed = EXIT_RNG.visible   ? camera.position.distanceTo(EXIT_RNG.position) : Infinity;

    nearBubble = bd < 3;
    nearExit   = ed < 3.5;

    if(nearBubble){
      INTER.textContent='[ E ]  さらに深い夢へ'; INTER.style.display='block';
    } else if(nearExit){
      INTER.textContent='[ E ]  目を覚ます'; INTER.style.display='block';
    } else {
      INTER.style.display='none';
    }

    if(keys.e){
      keys.e=false;
      INTER.style.display='none';
      if(nearBubble){
        gameState='transitioning';
        fadeTransition(()=>{ enterDream(upcomingDream); gameState='playing'; });
      } else if(nearExit){
        gameState='transitioning';
        fadeTransition(()=>{ exitDream(); });
      }
    }
  }

  // ── 13. アニメーションループ ─────────────────────────
  let previewAngle=0;
  const clock2=new THREE.Clock();
  const moveV=new THREE.Vector3();
  let rafId;

  function loop(){
    rafId=requestAnimationFrame(loop);
    const dt=Math.min(clock2.getDelta(),.05);
    const t=clock2.getElapsedTime();

    if(gameState==='opening'){
      camera.lookAt(new THREE.Vector3(CAM_TGTO.x+Math.sin(t*.0003)*.05,CAM_TGTO.y,CAM_TGTO.z));
    } else if(gameState==='zooming'){
      zoomT+=dt*.25; const te=Math.min(zoomT,1), ease=te*te*(3-2*te);
      camera.position.lerpVectors(CAM_OPEN,CAM_ZOOM,ease);
      camera.lookAt(new THREE.Vector3(0,1.5+ease*.2,-.3));
      if(te>=.92) skipOpening();
    } else if(gameState==='playing'){
      camera.rotation.order='YXZ'; camera.rotation.y=yaw; camera.rotation.x=pitch;
      moveV.set((keys.d?1:0)-(keys.a?1:0),0,(keys.s?1:0)-(keys.w?1:0));
      if(moveV.lengthSq()>0){ moveV.normalize().applyEuler(new THREE.Euler(0,yaw,0)); camera.position.addScaledVector(moveV,5*dt); }
      camera.position.y=1.7;
      checkProximity();
    }

    // オブジェクトアニメ
    for(const obj of sceneObjs){
      const ud=obj.userData;
      if(ud.fSpd>0) obj.position.y=ud.baseY+Math.sin(t*ud.fSpd+ud.fOff)*ud.fAmp;
      if(ud.rSpd)  { obj.rotation.y+=ud.rSpd*dt; obj.rotation.x+=ud.rSpd*.2*dt; }
      // 上昇（気泡など）
      if(ud.isRising){
        obj.position.y+=ud.riseSpd*dt;
        if(obj.position.y>ud.riseMax) obj.position.y=ud.riseMin+Math.random()*(ud.riseMax-ud.riseMin)*.2;
      }
      // 流れ星
      if(ud.isShooting){
        obj.position.x+=ud.shootVx*dt; obj.position.y+=ud.shootVy*dt; obj.position.z+=ud.shootVz*dt;
        if(obj.position.distanceTo(ud.shootOrigin)>ud.shootDist){
          obj.position.copy(ud.shootOrigin);
          obj.position.x+=rnd(-40,40); obj.position.y+=rnd(-10,10); obj.position.z+=rnd(-40,40);
          ud.shootOrigin.copy(obj.position);
        }
      }
      // 蛍光灯フリッカー
      if(ud.isFlicker && obj.material && obj.material.emissiveIntensity!==undefined){
        const flick=0.6+0.4*Math.sin(t*ud.flickerSpd+ud.flickerOff)+0.15*(Math.random()-.5);
        obj.material.emissiveIntensity=Math.max(0,Math.min(1,flick));
      }
      // 流れ星のトレイルライト追従
      if(ud.shootRef){ obj.position.copy(ud.shootRef.position); }
    }
    // バブル・出口リングアニメ
    if(BUBBLE_GRP.visible){
      BUBBLE_GRP.lookAt(new THREE.Vector3(camera.position.x,BUBBLE_GRP.position.y,camera.position.z));
      const p=.65+.35*Math.sin(t*2.2);
      BUBBLE_RNG.material.opacity=p*.92;
    }
    if(EXIT_RNG.visible){
      EXIT_RNG.rotation.z+=.38*dt; EXIT_RNG.rotation.x+=.11*dt;
      EXIT_RNG.material.opacity=.6+.4*Math.sin(t*2+EXIT_RNG.userData.pOff);
    }

    // プレビューレンダー
    previewAngle+=dt*.28;
    previewCam.position.set(Math.cos(previewAngle)*11,5,Math.sin(previewAngle)*11);
    previewCam.lookAt(0,2,0);
    renderer.setRenderTarget(previewTarget);
    renderer.clear();
    renderer.render(previewScene,previewCam);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene,camera);
  }

  buildOpening();
  loop();

  // クリーンアップ関数
  ov._cleanup=()=>{
    cancelAnimationFrame(rafId);
    document.removeEventListener('keydown',onKey);
    document.removeEventListener('keyup',onKey);
    ro.disconnect();
    renderer.dispose();
  };
};
