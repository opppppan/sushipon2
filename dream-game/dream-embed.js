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
  const FADE   = el('div','position:absolute;inset:0;background:#000;opacity:0;z-index:15;pointer-events:none;transition:opacity .55s;');

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
  const rect0 = ov.getBoundingClientRect();
  const W0 = rect0.width  || 220;
  const H0 = rect0.height || 480;

  const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W0, H0);
  renderer.autoClear = false;

  const scene        = new THREE.Scene();
  const previewScene = new THREE.Scene();
  const camera       = new THREE.PerspectiveCamera(70, W0/H0, 0.1, 400);
  const previewTarget = new THREE.WebGLRenderTarget(180, 180, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const previewCam = new THREE.PerspectiveCamera(65, 1, 0.1, 200);

  let W = W0, H = H0;
  const ro = new ResizeObserver(() => {
    W = ov.clientWidth || W0;
    H = ov.clientHeight || H0;
    renderer.setSize(W, H);
    camera.aspect = W/H;
    camera.updateProjectionMatrix();
  });
  ro.observe(ov);

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
    const s=gs(), mat=new THREE.MeshLambertMaterial({color,...opts});
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
  function cy(r,h,c,x,y,z,op={})   { return addMesh(new THREE.CylinderGeometry(r,r,h,9),c,x,y+h/2,z,op); }
  function sp(r,c,x,y,z,op={})     { return addMesh(new THREE.SphereGeometry(r,10,10),c,x,y,z,op); }
  function rnd(a,b){ return a+Math.random()*(b-a); }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }

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
  function addCreature(){
    const ang=Math.random()*Math.PI*2, dist=rnd(35,55);
    const cx=Math.cos(ang)*dist, cz=Math.sin(ang)*dist;

    const rug=new THREE.Mesh(new THREE.PlaneGeometry(2,2.8),new THREE.MeshLambertMaterial({color:0x9966aa}));
    rug.rotation.x=-Math.PI/2; rug.position.set(cx,0.01,cz); scene.add(rug); sceneObjs.push(rug);
    const body=new THREE.Mesh(new THREE.SphereGeometry(0.38,12,12),new THREE.MeshLambertMaterial({color:0xffe0cc}));
    body.scale.set(1.5,0.8,1.0); body.position.set(cx,0.78,cz+0.15); scene.add(body); sceneObjs.push(body);
    sp(0.3,0xffe0cc,cx+0.04,0.82,cz-0.58);
    const eGeo=new THREE.SphereGeometry(0.1,8,8), eMat=new THREE.MeshLambertMaterial({color:0xffcaaa});
    [0.24,-0.24].forEach(ox=>{ const e=new THREE.Mesh(eGeo,eMat); e.scale.set(.7,1.4,.7); e.position.set(cx+ox,1.07,cz-0.58); scene.add(e); sceneObjs.push(e); });
    [0.11,-0.11].forEach(ox=>{ const ey=sp(0.055,0x4a3020,cx+ox+0.04,0.85,cz-0.9); ey.scale.set(1.1,0.25,0.5); });
    bx(1.45,0.14,1.7,0x7a9fc0,cx,0.52,cz+0.3);
    bx(1.75,0.28,2.6,0x6b4a30,cx,0,cz);

    BUBBLE_GRP.position.set(cx,2.6,cz);
    BUBBLE_GRP.visible=true;
    BUBBLE_LIGHT.position.set(cx,2.6,cz); BUBBLE_LIGHT.intensity=1.5;

    // 出口リング（逆方向）
    const ea=ang+Math.PI, ed=rnd(20,30);
    EXIT_RNG.position.set(Math.cos(ea)*ed,1.5,Math.sin(ea)*ed);
    EXIT_RNG.visible = dreamStack.length > 0;
    EXIT_LIGHT.position.copy(EXIT_RNG.position); EXIT_LIGHT.intensity = dreamStack.length > 0 ? 1.5 : 0;
  }

  // ── 8. シーンビルダー ────────────────────────────────
  const SCENES = {
    corridor(){
      disposeAll();
      scene.background=new THREE.Color(0xf4eedd); scene.fog=new THREE.FogExp2(0xf4eedd,0.036);
      addL('ambient',0xfff8e0,0.95); addL('dir',0xfff5cc,0.4,0,5,2);
      const flM=new THREE.Mesh(new THREE.PlaneGeometry(9,200),new THREE.MeshLambertMaterial({map:checkerTex('#e8dfc8','#d4c8a8')}));
      flM.rotation.x=-Math.PI/2; scene.add(flM); sceneObjs.push(flM);
      const ceilM=new THREE.Mesh(new THREE.PlaneGeometry(9,200),new THREE.MeshLambertMaterial({color:0xf0e8d8}));
      ceilM.rotation.x=Math.PI/2; ceilM.position.y=3.5; scene.add(ceilM); sceneObjs.push(ceilM);
      [-4.5,4.5].forEach(x=>{ const w=new THREE.Mesh(new THREE.PlaneGeometry(200,3.5),new THREE.MeshLambertMaterial({color:0xe0d4b8,side:THREE.DoubleSide})); w.rotation.y=x<0?Math.PI/2:-Math.PI/2; w.position.set(x,1.75,0); scene.add(w); sceneObjs.push(w); });
      for(let z=-80;z<80;z+=5){
        const lg=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.05,0.9),new THREE.MeshLambertMaterial({color:0xffffee,emissive:new THREE.Color(0xffffcc),emissiveIntensity:1.0}));
        lg.position.set(0,3.44,z); scene.add(lg); sceneObjs.push(lg);
        addL('point',0xfff8e0,0.65,0,3.2,z,12);
      }
      for(let z=-60;z<60;z+=1.1) bx(0.15,1.9,1.0,pick([0x8090a0,0x7a8898]),-4.4,0,z);
      addCreature();
    },
    sky(){
      disposeAll();
      scene.background=new THREE.Color(0x87ceeb); scene.fog=new THREE.FogExp2(0xc8e8ff,0.007);
      addL('hemi',0x87ceeb,1.2); addL('dir',0xfff8e0,0.8,5,10,3);
      const flM=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshLambertMaterial({color:0xeef8ff,transparent:true,opacity:0.65}));
      flM.rotation.x=-Math.PI/2; flM.position.y=-0.5; scene.add(flM); sceneObjs.push(flM);
      const mkCloud=(x,y,z,s)=>{ [[0,0,0,1],[s*.7,0,s*.4,.8],[-.6*s,0,s*.3,.75],[s*.3,s*.4,0,.7]].forEach(([dx,dy,dz,sc])=>{ const m=sp(s*.5*sc,pick([0xffffff,0xeef8ff,0xb8d4f0]),x+dx,y+dy,z+dz,{transparent:true,opacity:rnd(.8,.96)}); m.userData={baseY:y+dy,fAmp:rnd(.2,.7),fSpd:rnd(.1,.25),fOff:Math.random()*Math.PI*2,rSpd:0}; }); };
      for(let i=0;i<16;i++) mkCloud(rnd(-65,65),rnd(2,12),rnd(-65,65),rnd(2.5,6.5));
      for(let i=0;i<5;i++){ const x=rnd(-35,35),z=rnd(-35,35),y=rnd(0,2.5); bx(rnd(4,9),rnd(.5,1.1),rnd(4,9),0x88cc66,x,y,z); bx(rnd(3,7),.25,rnd(3,7),0xaaee88,x,y+.55,z); }
      addCreature();
    },
    ocean(){
      disposeAll();
      scene.background=new THREE.Color(0x010e1e); scene.fog=new THREE.FogExp2(0x021525,0.028);
      addL('ambient',0x062040,0.5); addL('point',0x0088cc,1.2,0,6,0,60);
      const flM=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshLambertMaterial({map:checkerTex('#091828','#0a2030')}));
      flM.rotation.x=-Math.PI/2; scene.add(flM); sceneObjs.push(flM);
      for(let i=0;i<45;i++){ const a=Math.random()*Math.PI*2,r=rnd(6,65),h=rnd(1,5); cy(rnd(.12,.45),h,pick([0xff6688,0xff8844,0x44aaff,0xaa44ff]),Math.cos(a)*r,0,Math.sin(a)*r); }
      for(let i=0;i<25;i++){ const a=Math.random()*Math.PI*2,r=rnd(5,50); const m=sp(rnd(.3,1.1),pick([0x88ccff,0x44aaff,0x66ffcc]),Math.cos(a)*r,rnd(1,8),Math.sin(a)*r,{transparent:true,opacity:rnd(.4,.75)}); m.userData={baseY:m.position.y,fAmp:rnd(.5,1.5),fSpd:rnd(.2,.5),fOff:Math.random()*Math.PI*2,rSpd:rnd(-.2,.2)}; }
      for(let i=0;i<8;i++){ const a=Math.random()*Math.PI*2,r=rnd(10,40); addL('point',0x2299ff,1.2,Math.cos(a)*r,8,Math.sin(a)*r,15); }
      addCreature();
    },
    backrooms(){
      disposeAll();
      scene.background=new THREE.Color(0xd4c870); scene.fog=new THREE.FogExp2(0xd4c870,0.058);
      addL('ambient',0xf0e070,0.85);
      const flM=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshLambertMaterial({map:checkerTex('#c8bc5c','#c0b450')}));
      flM.rotation.x=-Math.PI/2; scene.add(flM); sceneObjs.push(flM);
      const ceilM=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshLambertMaterial({color:0xe8dca0}));
      ceilM.rotation.x=Math.PI/2; ceilM.position.y=2.8; scene.add(ceilM); sceneObjs.push(ceilM);
      for(let i=0;i<25;i++){
        const x=rnd(-30,30),z=rnd(-30,30);
        const lg=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.05,0.85),new THREE.MeshLambertMaterial({color:0xfffff0,emissive:new THREE.Color(0xffffaa),emissiveIntensity:rnd(0.5,1.0)}));
        lg.position.set(x,2.74,z); lg.userData.flickerBase=lg.material; scene.add(lg); sceneObjs.push(lg);
        addL('point',0xffffe0,0.75,x,2.5,z,10);
      }
      for(let i=0;i<18;i++) bx(.5,2.8,.5,0xccc060,rnd(-40,40),0,rnd(-40,40));
      addCreature();
    },
    night(){
      disposeAll();
      scene.background=new THREE.Color(0x000510); scene.fog=new THREE.FogExp2(0x000510,0.01);
      addL('ambient',0x111133,0.4); addL('point',0x8888ff,0.8,0,15,0,100);
      const base=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshLambertMaterial({color:0x000510}));
      base.rotation.x=-Math.PI/2; base.position.y=-0.01; scene.add(base); sceneObjs.push(base);
      const grid=new THREE.Mesh(new THREE.PlaneGeometry(400,400,50,50),new THREE.MeshBasicMaterial({color:0x2233aa,wireframe:true,transparent:true,opacity:0.12}));
      grid.rotation.x=-Math.PI/2; scene.add(grid); sceneObjs.push(grid);
      for(let i=0;i<180;i++){ const a=Math.random()*Math.PI*2,r=rnd(5,110),y=rnd(1,38); const m=sp(rnd(.03,.2),pick([0xffffff,0xaacdff,0xffe8aa,0xffaaaa]),Math.cos(a)*r,y,Math.sin(a)*r); m.material.emissive=new THREE.Color(m.material.color.getHex()); m.material.emissiveIntensity=rnd(.3,.8); m.userData={baseY:y,fAmp:rnd(.05,.18),fSpd:rnd(.05,.15),fOff:Math.random()*Math.PI*2,rSpd:0}; }
      const moon=sp(4,0xfff8dd,0,28,-55); moon.material.emissive=new THREE.Color(0xfff0aa); moon.material.emissiveIntensity=0.5;
      for(let i=0;i<6;i++){ const a=Math.random()*Math.PI*2,r=rnd(18,55),y=rnd(4,16); const m=sp(rnd(1.2,3.8),pick([0x4466cc,0xcc4466,0x44cc88,0xaa66cc]),Math.cos(a)*r,y,Math.sin(a)*r); m.userData={baseY:y,fAmp:rnd(.3,.8),fSpd:rnd(.05,.15),fOff:Math.random()*Math.PI*2,rSpd:rnd(-.1,.1)}; }
      addCreature();
    },
    forest(){
      disposeAll();
      scene.background=new THREE.Color(0x0d1a0d); scene.fog=new THREE.FogExp2(0x0d1a0d,0.028);
      addL('hemi',0x44aa44,0.55); addL('dir',0x88ff88,0.3,2,8,3);
      const flM=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshLambertMaterial({map:checkerTex('#0d2a0d','#0a200a')}));
      flM.rotation.x=-Math.PI/2; scene.add(flM); sceneObjs.push(flM);
      for(let i=0;i<70;i++){ const a=Math.random()*Math.PI*2,r=rnd(6,70),h=rnd(4,13),tr=rnd(.18,.45); cy(tr,h,pick([0x5a3a1a,0x4a2a0a]),Math.cos(a)*r,0,Math.sin(a)*r); sp(h*.32,pick([0x1a5a1a,0x2a6a2a,0x0a4a0a]),Math.cos(a)*r,h*.68,Math.sin(a)*r); }
      for(let i=0;i<22;i++){ const a=Math.random()*Math.PI*2,r=rnd(5,45); const lt=new THREE.PointLight(pick([0x88ffaa,0xaaffcc,0x44ff88]),0.75,5); lt.position.set(Math.cos(a)*r,rnd(1,4),Math.sin(a)*r); lt.userData={baseY:lt.position.y,fAmp:rnd(.2,.8),fSpd:rnd(.3,.8),fOff:Math.random()*Math.PI*2,rSpd:0}; scene.add(lt); sceneObjs.push(lt); }
      addCreature();
    },
    meadow(){
      disposeAll();
      scene.background=new THREE.Color(0xffe8f8); scene.fog=new THREE.FogExp2(0xffeef8,0.009);
      addL('hemi',0xffaacc,1.0); addL('dir',0xffffff,0.6,3,10,4);
      const flM=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshLambertMaterial({color:0xaaddaa}));
      flM.rotation.x=-Math.PI/2; scene.add(flM); sceneObjs.push(flM);
      const fc=[0xff88aa,0xffaacc,0xffcc88,0xaaffcc,0x88ccff,0xddaaff];
      for(let i=0;i<65;i++){ const a=Math.random()*Math.PI*2,r=rnd(4,75),s=rnd(.4,1.8); const m=sp(s,pick(fc),Math.cos(a)*r,s,Math.sin(a)*r,{transparent:true,opacity:rnd(.7,.9)}); m.userData={baseY:s,fAmp:rnd(.1,.4),fSpd:rnd(.2,.5),fOff:Math.random()*Math.PI*2,rSpd:rnd(-.2,.2)}; cy(.05,s*1.4,0x88aa44,Math.cos(a)*r,0,Math.sin(a)*r); }
      addCreature();
    },
  };

  // ── 9. プレビュー ────────────────────────────────────
  function buildPreview(type){
    clearPreview();
    targetScene=previewScene;
    const pa=(g,c,x,y,z,op={})=>{ const mat=new THREE.MeshLambertMaterial({color:c,...op}); const m=new THREE.Mesh(g,mat); m.position.set(x,y,z); previewScene.add(m); previewObjs.push(m); return m; };
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

  let controlsShownOnce = false;
  function enterDream(dream){
    dreamStack.push(dream);
    upcomingDream=nextDream();
    buildPreview(upcomingDream.scene);
    SCENES[dream.scene]?.();
    camera.position.set(0,1.7,0); yaw=0; pitch=0;
    refreshDepth();
    showBubbleText(dream.text);
    // 初回だけ操作説明を表示
    if(!controlsShownOnce){ controlsShownOnce=true; setTimeout(showControls, 300); }
    if(actx) setTimeout(()=>playArea(dream.scene),500);
    else { const fn=()=>{ initAudio(); playArea(dream.scene); }; cvs.addEventListener('mousedown',fn,{once:true}); document.addEventListener('keydown',fn,{once:true}); }
  }

  function exitDream(){
    dreamStack.pop();
    if(dreamStack.length===0){
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
    const bar=Array.from({length:5},(_,i)=>i<d?'■':'□').join(' ');
    DEPTH.textContent=`DREAM  ${bar}`;
  }

  function showBubbleText(txt){ BUBBLE.textContent=txt; BUBBLE.style.display='block'; clearTimeout(BUBBLE._t); BUBBLE._t=setTimeout(()=>{ BUBBLE.style.opacity='0'; setTimeout(()=>{ BUBBLE.style.display='none'; BUBBLE.style.opacity='1'; },500); },5000); }

  function fadeTransition(cb){
    FADE.style.opacity='1';
    setTimeout(()=>{ cb(); FADE.style.opacity='0'; },560);
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
    const flM=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshLambertMaterial({color:0x7a5a3a})); flM.rotation.x=-Math.PI/2; scene.add(flM); sceneObjs.push(flM);
    // ベッド
    bx(2.0,.32,2.9,0x6b4a30,0,0,0); bx(1.75,.22,2.65,0xf0e8d8,0,.32,0);
    bx(2.0,.85,.1,0x6b4a30,0,.15,-1.45); bx(.85,.13,.55,0xfef5ee,0,.56,-.95);
    bx(1.6,.16,1.85,0x7a9fc0,0,.55,.35);
    // 生き物
    const body2=new THREE.Mesh(new THREE.SphereGeometry(0.4,12,12),new THREE.MeshLambertMaterial({color:0xffe0cc}));
    body2.scale.set(1.55,.82,1.0); body2.position.set(0,.82,.2); scene.add(body2); sceneObjs.push(body2);
    sp(0.32,0xffe0cc,.05,.86,-.65);
    const eGeo=new THREE.SphereGeometry(.1,8,8),eMat=new THREE.MeshLambertMaterial({color:0xffcaaa});
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
