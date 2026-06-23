// 8-bit sushi sprite painter. Each sprite is drawn procedurally into an offscreen
// canvas from a pixel-grid string map. Deliberately chunky, NES-ish palette.

(function () {
  // NES-ish palette (not the real NES pal, just vibes)
  const P = {
    _: null,                 // transparent
    K: '#0a0a0a',            // black outline
    W: '#fcfcfc',            // white
    R: '#d03030',            // red (maguro)
    r: '#fc5050',            // light red
    O: '#e87020',            // orange (salmon / ebi)
    o: '#fcc070',            // peach
    Y: '#fce018',            // yellow (tamago)
    y: '#fff098',            // pale yellow
    G: '#2cb050',            // green
    g: '#78d898',            // pale green
    B: '#2060d8',            // blue
    b: '#70a0f8',            // sky
    P: '#b048c8',            // purple
    p: '#f898e0',            // pink
    N: '#704028',            // nori dark
    n: '#302820',            // near-black nori
    S: '#e8d0a0',            // shari (rice) highlight
    s: '#fcf0d0',            // shari light
    T: '#a86030',            // tan / skin
    t: '#d89860',            // light skin
    X: '#606060',            // grey
    x: '#a0a0a0',            // light grey
    E: '#d00050',            // magenta (uni highlight)
    e: '#fc80a0',            // pink highlight
  };

  // Each sprite is an array of strings. Space = transparent.
  // 16x16 for levels 0-4, 20x20 for 5-7, 24x24 for 8-10.

  // Level 0: シャリ (rice ball, no nori)
  const SHARI = [
    '                ',
    '                ',
    '    KKKKKKKK    ',
    '   KssssssssK   ',
    '  KsSSssSsssSK  ',
    '  KssSsssSSssK  ',
    ' KSsssSsssSssSK ',
    ' KsSssssSsssSsK ',
    ' KssSSsssSsSssK ',
    ' KsssSsSssSssSK ',
    '  KsSssSssSsssK ',
    '  KssSsssSssSSK ',
    '   KSsssSsSsSK  ',
    '    KKKKKKKK    ',
    '                ',
    '                ',
  ];

  // Level 1: 玉子 (tamago nigiri - yellow block on rice with nori belt)
  const TAMAGO = [
    '                ',
    '  KKKKKKKKKKKK  ',
    ' KYYYYYYYYYYYYK ',
    ' KYyYYyYYYyYYYK ',
    ' KYYYYYYyYYYYYK ',
    ' KYyYYYYYYYYyYK ',
    ' KnnnnnnnnnnnnK ',
    ' KnNnNnNnNnNnNK ',
    ' KsssssssssssSK ',
    ' KsSsssSsssSssK ',
    ' KssSssSsssSsSK ',
    ' KSssSsssSssSsK ',
    '  KssSssSsssSK  ',
    '   KKKKKKKKKK   ',
    '                ',
    '                ',
  ];

  // Level 2: エビ (ebi nigiri - orange striped shrimp on rice)
  const EBI = [
    '                ',
    '                ',
    '  KKKKKKKKKKKK  ',
    ' KOoOOOoOOoOOOK ',
    ' KKKKooKooKooKK ',
    ' KOOoOoOoOoOoOK ',
    ' KoOKKooKKooKoK ',
    ' KOoOoOoOoOoOoK ',
    ' KKoOKKoOKKoOKK ',
    ' KOoOoOoOoOoOoK ',
    ' KsssSssssSsssK ',
    ' KsSssSsSssSssK ',
    ' KssSsssSssSsSK ',
    '  KssSssSssSsK  ',
    '   KKKKKKKKKK   ',
    '                ',
  ];

  // Level 3: マグロ (maguro - red block on rice)
  const MAGURO = [
    '                ',
    '                ',
    ' KKKKKKKKKKKKKK ',
    ' KRrRRRrRRRrRrK ',
    ' KRRWRrRrRWRrRK ',
    ' KRrRRrRWRrRRrK ',
    ' KrRRrRrRrRRrRK ',
    ' KRWrRRrRRrRWRK ',
    ' KRrRrRWRrRrRrK ',
    ' KKKKKKKKKKKKKK ',
    ' KsSsSsssSsSssK ',
    ' KssSsssSsssSsK ',
    ' KsSsSsSsSsSsSK ',
    '  KsSsSsSsSsSK  ',
    '   KKKKKKKKKK   ',
    '                ',
  ];

  // Level 4: サーモン (salmon - orange with white stripes)
  const SALMON = [
    '                ',
    ' KKKKKKKKKKKKKK ',
    ' KOoOOoOOoOOoOK ',
    ' KWWOoOOoOWWoOK ',
    ' KOoWWOoOOWWOoK ',
    ' KOoOOWWoOOoWWK ',
    ' KoOOoOOWWoOoOK ',
    ' KOWWOoOOoWWoOK ',
    ' KoOOWWoOOoOOoK ',
    ' KKKKKKKKKKKKKK ',
    ' KsSssSsssSsSsK ',
    ' KssSssSssSssSK ',
    ' KsSsSsSsSsSssK ',
    '  KssSsSsSssSK  ',
    '   KKKKKKKKKK   ',
    '                ',
  ];

  // Level 5: イクラ軍艦 (ikura gunkan - nori wrapped, orange roe on top)
  const IKURA = [
    '                    ',
    '                    ',
    '  KKKKKKKKKKKKKKKK  ',
    ' KOoOoOOoOOoOoOoOoK ',
    ' KoOoOoOoOoOoOoOoOK ',
    ' KOoOKoOKoKoOKoOoOK ',
    ' KoOoOoOoOoOoOoOoOK ',
    ' KnnnnnnnnnnnnnnnnK ',
    ' KNNnNnNNnNnNNnNnNK ',
    ' KnNnNnNnNnNnNnNnNK ',
    ' KNnNnNNnNnNnNNnNnK ',
    ' KnnnnnnnnnnnnnnnnK ',
    ' KssSsSsSsSsSsSsSsK ',
    ' KsSssSssSssSsSssSK ',
    ' KssSsSsSsSsSsSsSsK ',
    ' KsSsSsSsSsSsSsSsSK ',
    '  KssSsSsSsSsSsSsK  ',
    '   KKKKKKKKKKKKKK   ',
    '                    ',
    '                    ',
  ];

  // Level 6: ウニ軍艦 (uni gunkan - spiky yellow-orange with nori)
  const UNI = [
    '                    ',
    '      K    K        ',
    '    K YK  KY K      ',
    '  KKKYYYKKYYYKKK    ',
    ' KYYEYYYYYYYEYYYK   ',
    ' KYYYEYYEYEYYEYYYK  ',
    ' KOYYYYEYYYEYYYYOK  ',
    ' KYYEYYYYEYYYYEYYK  ',
    ' KYYYYEYYYYYEYYYYK  ',
    ' KKKKKKKKKKKKKKKKK  ',
    ' KnnnnnnnnnnnnnnnnK ',
    ' KNnNnNNnNnNnNNnNnK ',
    ' KnNnNnNnNnNnNnNnNK ',
    ' KnnnnnnnnnnnnnnnnK ',
    ' KssSsSsSsSsSsSsSsK ',
    ' KsSsSsSsSsSsSsSsSK ',
    ' KssSsSsSsSsSsSsSsK ',
    '  KssSsSsSsSsSsSsK  ',
    '   KKKKKKKKKKKKKK   ',
    '                    ',
  ];

  // Level 7: トロ (toro - pink-red block with white marbling on rice)
  const TORO = [
    '                    ',
    '                    ',
    '  KKKKKKKKKKKKKKKK  ',
    ' KrRrrRrrRrrRrrRrrK ',
    ' KRWrRRWrRRrWRRrWRK ',
    ' KrRRrWRrRRWrRrRWRK ',
    ' KRrWrRrWrRrWrRWrRK ',
    ' KrRrRWRrRWrRrWrRrK ',
    ' KRWrRrRWrRrWRrRWRK ',
    ' KrRrWRrRWrRrWrRrWK ',
    ' KRrRrRWRrRrWrRrRrK ',
    ' KKKKKKKKKKKKKKKKK  ',
    ' KsSsSsSsSsSsSsSsK  ',
    ' KssSsSsSsSsSsSsSK  ',
    ' KsSsSsSsSsSsSsSsK  ',
    ' KssSsSsSsSsSsSsSK  ',
    '  KsSsSsSsSsSsSsK   ',
    '   KKKKKKKKKKKKK    ',
    '                    ',
    '                    ',
  ];

  // Level 8: 大トロ (o-toro - bigger, fancier, sparkle)
  const OTORO = [
    '                        ',
    '          W             ',
    '         WWW   W        ',
    '  KKKKKKKKKWKKWWWKKKKK  ',
    ' KrRrRrRrRrRrRrRrRrRrRK ',
    ' KRWWrRrWWrRrRWWRrRWRrK ',
    ' KrRWWRrRWWRrRrWWrRrWRK ',
    ' KRrRrWWRrRWWRrRrWRrRrK ',
    ' KrRWRrRrWWRrRrWWRrWRrK ',
    ' KRrRWWRrRrWWRrRrWRrRrK ',
    ' KrRrRrWWRrRrWRrRWWRrRK ',
    ' KRWWrRrRWWrRrWWRrRrWRK ',
    ' KrRrWWRrRrWWRrRrWWRrRK ',
    ' KKKKKKKKKKKKKKKKKKKKKK ',
    ' KsSsSsSsSsSsSsSsSsSsSK ',
    ' KssSsSsSsSsSsSsSsSsSsK ',
    ' KsSsSsSsSsSsSsSsSsSsSK ',
    ' KssSsSsSsSsSsSsSsSsSsK ',
    ' KsSsSsSsSsSsSsSsSsSsSK ',
    '  KsSsSsSsSsSsSsSsSsK   ',
    '   KKKKKKKKKKKKKKKKK    ',
    '                        ',
    '                        ',
    '                        ',
  ];

  // Level 9: 回る皿 (rotating conveyor plate, sushi riding it - getting absurd)
  const KAITEN = [
    '                        ',
    '           K            ',
    '         KRRRK          ',
    '        KRrRrRK         ',
    '        KsSsSsK         ',
    '         KKKKK          ',
    '       KKKKKKKKK        ',
    '     KBBBBBBBBBBBK      ',
    '    KBbBBbBBbBBbBBK     ',
    '   KBBbBBbBBbBBbBBBK    ',
    '  KBbBBbBBbBBbBBbBBBK   ',
    '  KBBbBBbBBbBBbBBbBBK   ',
    '  KBbBBbBBbBBbBBbBBBK   ',
    '   KBBbBBbBBbBBbBBBK    ',
    '    KBbBBbBBbBBbBBK     ',
    '     KBBBBBBBBBBBK      ',
    '       KKKKKKKKK        ',
    '        XXXXXXXX        ',
    '        XxXxXxXx        ',
    '         XXXXXX         ',
    '          KKKK          ',
    '                        ',
    '                        ',
    '                        ',
  ];

  // Level 10: 板前 (itamae / sushi chef — top of the food chain)
  const ITAMAE = [
    '                        ',
    '     WWWWWWWWWWWWWW     ',
    '    WWWWWWWWWWWWWWWW    ',
    '   WW W WWWWWWWW W WW   ',
    '   W  W WWWWWWWW W  W   ',
    '   WWWWWWWWWWWWWWWWWW   ',
    '    KKKKKKKKKKKKKKKK    ',
    '   KtttttttttttttttK    ',
    '   KttKttKtttKttKttK    ',
    '   KttKttKtttKttKttK    ',
    '   KtttttttKtttttttK    ',
    '   KttKKKKtttKKKKttK    ',
    '   KtttKKtKKtKKttttK    ',
    '    KttttttttttttK      ',
    '     KKKKKKKKKKKK       ',
    '    WWWWWWWWWWWWWW      ',
    '   WBWWWWWWWWWWWWBW     ',
    '   WBWWKKKKKKKKWWBW     ',
    '   WBWKRRRRRRRRKWBW     ',
    '   WBWKRWRrRrRRKWBW     ',
    '    WWKKKKKKKKKKWW      ',
    '      WWWWWWWWWW        ',
    '       WW    WW         ',
    '      KKK    KKK        ',
  ];

  // Level 8: しろいポン (shiroi pon - mysterious white ghost creature)
  const SHIROIPON = [
    '                    ',
    '        KKKKK       ',
    '  KKKKKKWWWWWKKKKK  ',
    '  KKKKKKWWWWWKKKKK  ',
    '  KKWWWWWWWWWWWWKK  ',
    '    KWWWWWWWWWWK    ',
    '  KKWWWWWWWWWWWWKK  ',
    '    KWWWKWWKKWWK    ',
    '    KWWWKWWKKWWK    ',
    '  KKWWWWKWWKKWWWKK  ',
    '    KKWWWWWWWWKK    ',
    '     KKKKKKKKKK     ',
    '    KWWWWWWWWWWK    ',
    '    KWWWWWWWWWWK    ',
    '  KKWWKKWWWWWKWWKK  ',
    '  KKWWKKWWWWWKWWKK  ',
    '    KKWWWWWWWWKK    ',
    '     KWWWWWWWWK     ',
    '     KWWWKKWWWK     ',
    '      KKKKKKKK      ',
  ];

  const SPRITES = [
    { name: 'シャリ', nameEn: 'SHARI', map: SHARI, radius: 14, score: 1 },
    { name: '玉子',   nameEn: 'TAMAGO', map: TAMAGO, radius: 18, score: 3 },
    { name: 'エビ',   nameEn: 'EBI',    map: EBI,    radius: 22, score: 6 },
    { name: 'マグロ', nameEn: 'MAGURO', map: MAGURO, radius: 26, score: 10 },
    { name: 'サーモン', nameEn: 'SALMON', map: SALMON, radius: 30, score: 15 },
    { name: 'イクラ軍艦', nameEn: 'IKURA', map: IKURA, radius: 36, score: 21 },
    { name: 'ウニ軍艦', nameEn: 'UNI', map: UNI, radius: 42, score: 28 },
    { name: 'トロ',   nameEn: 'TORO',   map: TORO, radius: 50, score: 36 },
    { name: 'しろいポン', nameEn: 'SHIROI PON', map: SHIROIPON, radius: 64, score: 100 },
  ];

  // Render a sprite map to an offscreen canvas, scaled up by `scale`.
  function renderSprite(map, scale) {
    const h = map.length;
    const w = map[0].length;
    const c = document.createElement('canvas');
    c.width = w * scale;
    c.height = h * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = map[y][x];
        if (ch === ' ' || ch === '_') continue;
        const col = P[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return c;
  }

  // Pre-render every sprite at the scale needed so that its sprite roughly
  // fits the gameplay radius. We keep image pixel art crisp by only using
  // integer scales.
  function buildAll() {
    return SPRITES.map((s) => {
      const mapSize = s.map[0].length; // assume square-ish
      // scale so that sprite width ~= 2*radius + small padding
      const target = s.radius * 2 + 4;
      let scale = Math.max(1, Math.round(target / mapSize));
      const canvas = renderSprite(s.map, scale);
      return { ...s, canvas, scale };
    });
  }

  window.SUSHI_SPRITES = buildAll();
  window.SUSHI_PALETTE = P;
})();
