/* 炸彈女僕 BOMB MAIDS — original pixel art, authored as strings + procedural painters */
(function (G) {
  'use strict';
  const { Pix, fromRows, mix, hash } = G.PX;

  // ---------------------------------------------------------------- palettes
  const BASE = {
    k: '#2a1b30', // outline
    w: '#ffffff',
    c: '#bdd2ef', // white shade
    s: '#ffe4d2', // skin
    t: '#f2b3a3', // skin shade
    p: '#ff8ea4', // blush
    m: '#b23a58', // mouth
    d: '#3a2d50', // dress
    D: '#5d4b7d', // dress light
    r: '#ec3d5f', // ribbon
    R: '#a51f40', // ribbon dark
    b: '#1c1526', // stockings
    g: '#8d86a8',
    y: '#ffd23f', // gold
  };

  // Maids keep the 16x24 shapes and take their colours from the Genshin chibi sheet the user chose as the standard:
  // warm white with a lavender-grey shade, peach skin, a violet-grey dress, muted hair ramps lit from the top left
  // (H dark, h base, l light, L shine), soft irises (E over e), and inks instead of black (see inkHair).
  // keys: k outline, w/c white + shade, s/t skin + shade, p blush, m mouth, d/D dress + sheen, r/R collar bow,
  // b/B socks, x/X hair ribbon; per maid H/h/l/L hair dark..shine, E/e iris top/bottom, hairInk and lash
  const MAID_BASE = { k: '#000000', w: '#fbf8f4', c: '#dcdde8', s: '#fde5d8', t: '#f0bdab', p: '#f6adb0', m: '#c46a6e', d: '#403a54', D: '#6e6886', r: '#2a2137', R: '#5b5070', b: '#fbf8f4', B: '#dcdde8', x: '#fbf8f4', X: '#dcdde8', g: '#aeb0c6', Y: '#c9920e', bodyInk: '#241f33', skinInk: '#b07868', whiteInk: '#6c6c8a' };
  const MAIDS = {
    // salmon-pink bob, blue eyes, red bow
    berry: { H: '#b0485e', h: '#f38aa2', l: '#ffb2b4', L: '#ffdcc8', Q: '#7a2a48', E: '#2c5a8c', e: '#6aa2d2', r: '#e0435c', R: '#9e2238', v: '#9cd0f6', hairInk: '#541a30', lash: '#4a2434' },
    // black hair, grey-blue eyes, black bow with an amber brooch, black rose and dark red ribbon
    yoru: { H: '#1c1830', h: '#2a2840', l: '#403c62', L: '#6c6698', Q: '#110e1e', shade: 0.55, E: '#445a6e', e: '#8aa2b6', r: '#2e2840', R: '#e0a040', x: '#b02a3e', X: '#6a1426', O: '#2a2030', v: '#c8dae6', hairInk: '#100e1a', lash: '#241c2a' },
    // golden twin tails, green eyes, orange bow, white thigh-highs
    honey: { H: '#b47236', h: '#e8b964', l: '#fad890', L: '#fff0bc', Q: '#84502a', E: '#3a6a4c', e: '#7ab08a', r: '#f39a3c', R: '#b8641c', v: '#b4e6a8', hairInk: '#5e3a26', lash: '#5a2e2a' },
    // steel-blue long hair, blue eyes behind red glasses, blue bow
    yukino: { H: '#38548e', h: '#74a2d8', l: '#a4d4f6', L: '#dcf6ff', Q: '#243a70', E: '#2a4e86', e: '#6a96d0', r: '#3a90d8', R: '#1f5a9a', G: '#a8404a', v: '#a4cff6', hairInk: '#1e2e56', lash: '#1e2a42' },
  };

  function pal(maid) {
    return Object.assign({}, BASE, MAID_BASE, MAIDS[maid] || {});
  }

  const ROW_ERRORS = [];
  function rowsW(list, name, w) {
    const out = list.map((r) => r.replace(/\|/g, ''));
    for (let i = 0; i < out.length; i++) {
      if (out[i].length !== w) ROW_ERRORS.push(name + ' row ' + i + ' has ' + out[i].length + ' chars (want ' + w + '): ' + list[i]);
    }
    return out;
  }
  const rows16 = (list, name) => rowsW(list, name, 16);
  const E16 = '................';
  function pad(top, list, total) {
    const out = [];
    for (let i = 0; i < top; i++) out.push(E16);
    for (const r of list) out.push(r);
    while (out.length < (total || 24)) out.push(E16);
    return out;
  }

  // ---------------------------------------------------------------- maid bodies (rows 14..23)
  // frames: standing, step A, step B
  const BODY = {
    down: [
      ['...k|worR|Rorw|k...', '....|kurY|yruk|....', '....|kagw|wgAk|....', '....|kadw|wdAk|....', '....|kwsc|cswk|....', '...k|dDdw|wcDd|k...', '...k|wdgw|wgdw|k...', '....|.kjk|kjk.|....', '....|.kck|kck.|....', '....|.kDk|kDk.|....'],
      ['...k|worR|Rorw|k...', '....|kurY|yruk|....', '....|kagw|wgAk|....', '....|kadw|wdAk|....', '....|kwsc|cswk|....', '...k|dDdw|wcDd|k...', '...k|wdgw|wgdw|k...', '....|.kjk|kjk.|....', '....|.kck|.kk.|....', '....|.kDk|....|....'],
      ['...k|worR|Rorw|k...', '....|kurY|yruk|....', '....|kagw|wgAk|....', '....|kadw|wdAk|....', '....|kwsc|cswk|....', '...k|dDdw|wcDd|k...', '...k|wdgw|wgdw|k...', '....|.kjk|kjk.|....', '....|.kk.|kck.|....', '....|....|kDk.|....'],
    ],
    up: [
      ['...k|cddd|dddc|k...', '....|kudd|dduk|....', '....|kadd|ddak|....', '....|kAwc|cwAk|....', '....|kwwg|gwwk|....', '...k|dDdw|wdDd|k...', '...k|wcdd|ddcw|k...', '....|.kjk|kjk.|....', '....|.kck|kck.|....', '....|.kDk|kDk.|....'],
      ['...k|cddd|dddc|k...', '....|kudd|dduk|....', '....|kadd|ddak|....', '....|kAwc|cwAk|....', '....|kwwg|gwwk|....', '...k|dDdw|wdDd|k...', '...k|wcdd|ddcw|k...', '....|.kjk|kjk.|....', '....|.kck|.kk.|....', '....|.kDk|....|....'],
      ['...k|cddd|dddc|k...', '....|kudd|dduk|....', '....|kadd|ddak|....', '....|kAwc|cwAk|....', '....|kwwg|gwwk|....', '...k|dDdw|wdDd|k...', '...k|wcdd|ddcw|k...', '....|.kjk|kjk.|....', '....|.kk.|kck.|....', '....|....|kDk.|....'],
    ],
    // facing left; right is the mirror image
    side: [
      ['....|krwk|....|....', '....|kkud|k...|....', '....|kcad|k...|....', '....|kwAd|k...|....', '....|kcsd|k...|....', '...k|wdDd|wk..|....', '...k|cwdc|wk..|....', '....|kjk.|....|....', '....|kck.|....|....', '...k|kDk.|....|....'],
      ['....|krwk|....|....', '....|kkud|k...|....', '....|kcda|k...|....', '....|kwdA|k...|....', '....|kcds|k...|....', '...k|wdDd|wk..|....', '...k|cwdc|wk..|....', '...k|jk.k|jk..|....', '..kc|k...|kck.|....', '.kkk|....|kkk.|....'],
      ['....|krwk|....|....', '....|kkud|k...|....', '...k|acdd|k...|....', '...k|Acdd|k...|....', '...k|scdd|k...|....', '...k|wdDd|wk..|....', '...k|cwdc|wk..|....', '....|.kjk|....|....', '....|.kck|....|....', '....|kDkk|....|....'],
    ],
  };

  // ---------------------------------------------------------------- maid heads (rows 0..13) and hair layers
  // head rows: lace headdress 0-2, hair 3-8, eyelids 9, eyes 10-11, cheeks 12, chin 13 (the side view's headdress is edge-on).
  // Front eyes are two-pixel coloured irises with a catchlight (chibi pixel sprites read by their eyes); the cheek row carries
  // each maid's everyday face from the CG: Berry's open smile, Honey's fluster blush, Yukino's small smile, Yoru calm.
  // under / over: hair drawn behind / in front of the body (24 rows).
  const MAID_PARTS = {
    // chin-length bob flicking out at the ends, the curled ahoge over her left temple
    berry: {
      down: {
        head: [
          '....|..kk|kk..|.kk.',
          '....|.kwc|cwk.|khLk',
          '....|cwcw|wcwc|kHkH',
          '...k|cHHH|HHHc|khkk',
          '...c|HhlL|lhhH|chk.',
          '..kH|hlLl|hhlh|Hhk.',
          '..cH|hhlh|hhhH|hHk.',
          '.kHh|Hlhh|Hlhh|hHk.',
          '..kH|hHhh|hhHh|Hk..',
          '..kH|tkkt|tkkt|Hk..',
          '..kH|kwEs|swEk|Hk..',
          '.khH|sevs|sevs|Hhk.',
          'khhH|Hpsm|mspH|Hhhk',
          '.kkk|kHtt|ttHk|kkk.',
        ],
      },
      up: {
        head: [
          '.kk.|..kk|kk..|....',
          'kLhk|.kwc|cwk.|....',
          'HkHk|cwcw|wcwc|....',
          'kkhk|cHHH|HHHc|k...',
          '.khc|hlLl|hhhh|c...',
          '..kh|lLlh|hhhh|Hk..',
          '..ch|hlhh|hhhh|Hc..',
          '.kHh|hlhh|hlhh|hHk.',
          '..kH|hhHh|hHhh|Hk..',
          '..kH|hHhl|hhHh|Hk..',
          '..kH|hHhh|hhHh|Hk..',
          '.khH|HhHH|HHhH|Hhk.',
          'khhH|HHhH|HhHH|Hhhk',
          '.kkk|kHkH|HkHk|kkk.',
        ],
      },
      side: {
        head: [
          '....|.kk.|.kk.|....',
          '....|kwc.|khLk|....',
          '...k|Hwck|hkkH|....',
          '..kH|hhwc|Hhkk|....',
          '.kHh|lLhh|wcHk|....',
          '.kHh|llhh|hwck|....',
          'kHhh|hhhH|hcwk|....',
          'kHhH|hHhh|Hwck|....',
          'kHHh|HhhH|hHk.|....',
          'kHkk|Hhhh|HHk.|....',
          'ksEc|sHhH|hHk.|....',
          'ksew|stHh|Hhk.|....',
          '.kss|tkHH|hHhk|....',
          '..kt|tk.k|kkk.|....',
        ],
      },
    },
    // long black hair, a black rose on her hairband with a dark red ribbon hanging from it
    yoru: {
      down: {
        head: [
          '....|..kk|kk..|....',
          '....|.kwc|cwk.|....',
          '....|cwcw|wcwc|.kk.',
          '...k|chhh|hhhc|OlLk',
          '...c|hLlh|hhhh|OLok',
          '..kh|lLlh|hhlh|hOxk',
          '..ch|hlhh|hhhh|hxXk',
          '.khh|Hlhh|Hlhh|lhxk',
          'khhh|hHhh|hhHh|hhXk',
          '.kHk|tkkt|tkkt|kHk.',
          '.khk|kwEs|swEk|khk.',
          '.khk|sevs|sevs|khk.',
          '.khk|kpss|sspk|khk.',
          '.klk|.ktt|ttk.|klk.',
        ],
        over: pad(14, ['.khk|....|....|khk.', '.klk|....|....|klk.', '.khk|....|....|khk.', '.klk|....|....|klk.', '.khk|....|....|khk.', '..k.|....|....|.k..']),
      },
      up: {
        head: [
          '....|..kk|kk..|....',
          '....|.kwc|cwk.|....',
          '.kk.|cwcw|wcwc|....',
          'kLlO|chhh|hhhc|k...',
          'klLO|hLlh|hhhh|c...',
          'kxOh|lLlh|hhhh|hk..',
          'kXxh|hlhh|hhhh|hc..',
          'kxhl|hhlh|hlhh|lhk.',
          'kXhh|hhhh|hhhh|hhhk',
          '.khh|hhlh|hlhh|hhk.',
          '.khh|hlhh|hhlh|hhk.',
          '.khh|hlhh|hhlh|hhk.',
          '.khh|hlhh|hhlh|hhk.',
          '.khl|hlhh|hhlh|lhk.',
        ],
        over: pad(14, ['.khl|hhhh|hhhh|lhk.', '.khh|hlhh|hhlh|hhk.', '.khh|hlhh|hhlh|hhk.', '..kh|hhhh|hhhh|hk..', '..kh|hlhh|hhlh|hk..', '...k|hkhh|hhkh|k...', '....|k.kk|kk.k|....']),
      },
      side: {
        head: [
          '....|.kk.|....|....',
          '....|kwc.|k...|....',
          '...k|hwck|hk..|....',
          '..kh|hhwc|hhk.|....',
          '.khh|lLhh|wchk|....',
          '.khh|llhh|hwck|....',
          'khhh|hhhh|hcwk|OO..',
          'khhl|hhhh|hwck|LlO.',
          'khhh|hhhh|hhhk|lLO.',
          'kHkk|hhhh|hlhh|kxk.',
          'ksEc|shhh|hlhh|kX..',
          'ksew|sthh|hhlh|kx..',
          '.kss|tkhh|hhlh|k...',
          '..kt|tkhh|hhhl|k...',
        ],
        over: pad(14, ['....|kkhh|hlhk|....', '....|.khh|hlhk|....', '....|.khh|hhlk|....', '....|.khh|hhlk|....', '....|..kh|hhk.|....', '....|...k|kk..|....']),
      },
    },
    // long twin tails from high on her head, flaring out and down past her shoulders
    honey: {
      down: {
        head: [
          '....|..kk|kk..|....',
          '....|.kwc|cwk.|....',
          '....|cwcw|wcwc|....',
          '...k|cHHH|HHHc|k...',
          '...c|hLHh|hHlh|c...',
          '..rh|LlHh|hHlh|hr..',
          '..Rh|hlHh|hHhh|HR..',
          '.kHh|hlHh|hHlh|hHk.',
          '..kH|hHhh|hhHh|Hk..',
          '..kH|tkkt|tkkt|Hk..',
          '..sH|kwEs|swEk|Hs..',
          '..tH|sevs|sevs|Ht..',
          '...k|Hpss|sspH|k...',
          '....|kHtt|ttHk|....',
        ],
        under: pad(3, ['.kk.|....|....|.kk.', 'khLk|....|....|kLhk', 'khlh|....|....|hlhk', 'kHhk|....|....|khHk', '..kh|....|....|hk..', '..kH|....|....|Hk..', '..kH|....|....|Hk..', '..kH|....|....|Hk..', '..kH|....|....|Hk..', '..kH|....|....|Hk..', '.khH|....|....|Hhk.', 'khlH|....|....|Hlhk', 'khlk|....|....|klhk', 'kHlk|....|....|klHk', 'kHhk|....|....|khHk', '.kHk|....|....|kHk.', 'kHk.|....|....|.kHk', 'kk..|....|....|..kk']),
      },
      up: {
        head: [
          '....|..kk|kk..|....',
          '....|.kwc|cwk.|....',
          '....|cwcw|wcwc|....',
          '...k|cHHH|HHHc|k...',
          '...c|hLHh|hHlh|c...',
          '..rh|LlHh|hHhh|hr..',
          '..Rh|hlHh|hHhh|HR..',
          '.kHh|hlHh|hHlh|hHk.',
          '..kH|hHhH|HhHh|Hk..',
          '..kH|hHlh|hlHh|Hk..',
          '..kH|hHHh|HHlH|Hk..',
          '..sk|HhHH|HHhH|ks..',
          '...k|kHhH|HhHk|k...',
          '....|kHkH|HkHk|....',
        ],
        under: pad(3, ['.kk.|....|....|.kk.', 'khLk|....|....|kLhk', 'khlh|....|....|hlhk', 'kHhk|....|....|khHk', '..kh|....|....|hk..', '..kH|....|....|Hk..', '..kH|....|....|Hk..', '..kH|....|....|Hk..', '..kH|....|....|Hk..', '..kH|....|....|Hk..', '.khH|....|....|Hhk.', 'khlH|....|....|Hlhk', 'khlk|....|....|klhk', 'kHlk|....|....|klHk', 'kHhk|....|....|khHk', '.kHk|....|....|kHk.', 'kHk.|....|....|.kHk', 'kk..|....|....|..kk']),
      },
      side: {
        head: [
          '....|.kk.|....|....',
          '....|kwc.|k...|....',
          '...k|Hwck|hk..|....',
          '..kH|hhwc|Hhk.|....',
          '.kHh|LHhh|wcHk|....',
          '.kHh|lHhl|hwck|....',
          'kHhl|hHhl|hcwk|....',
          'kHhl|hHhl|Hwck|....',
          'kHhH|HhHh|hHk.|....',
          'kHkk|Hhhh|HHk.|....',
          'ksEc|sHhH|hHk.|....',
          'ksew|stHh|Hk..|....',
          '.kss|tkHH|k...|....',
          '..kt|tk..|....|....',
        ],
        under: pad(2, ['....|....|.kk.|....', '....|....|khhk|....', '....|....|khLh|k...', '....|....|kHlh|k...', '....|....|.kHl|hk..', '....|....|.kHl|hk..', '....|....|..kH|hk..', '....|....|..kH|hhk.', '....|....|..kH|lhk.', '....|....|..kH|hhk.', '....|....|...k|Hhk.', '....|....|...k|Hhk.', '....|....|...k|Hhk.', '....|....|..kH|hk..', '....|....|..kh|k...', '....|....|...k|....']),
      },
    },
    // long straight hair down her back, red-rimmed glasses
    yukino: {
      down: {
        head: [
          '....|..kk|kk..|....',
          '....|.kwc|cwk.|....',
          '....|cwcw|wcwc|....',
          '...k|cHHH|HHHc|k...',
          '...c|hlLl|hhhH|c...',
          '..kH|lLlh|hhlh|Hk..',
          '..kH|hlhh|hhhr|wk..',
          '.kHh|Hlhh|Hlhh|hHk.',
          '.kHh|hHhh|hhHh|hHk.',
          '.kHk|tkkt|tkkt|kHk.',
          '.kHk|kwEs|swEk|kHk.',
          '.kHk|sevs|sevs|kHk.',
          '.kHk|Hpss|mspH|kHk.',
          '.kHk|kHtt|ttHk|kHk.',
        ],
        over: pad(10, ['....|G..G|G..G|....', '....|G...|...G|....', '....|....|....|....', '....|....|....|....', '.kHk|....|....|kHk.', '.kHk|....|....|kHk.', '.klk|....|....|klk.', '.kHk|....|....|kHk.', '..k.|....|....|.k..']),
      },
      up: {
        head: [
          '....|..kk|kk..|....',
          '....|.kwc|cwk.|....',
          '....|cwcw|wcwc|....',
          '...k|cHHH|HHHc|k...',
          '...c|hhhh|hhhh|c...',
          '..kh|lLlh|hhhh|hk..',
          '..kw|rlhh|hhhh|hk..',
          '..kH|hlhh|hhlh|Hk..',
          '..kH|hlhh|hhlh|Hk..',
          '..kH|hlHh|hHlh|Hk..',
          '..kH|hHhh|hhHh|Hk..',
          '..kH|hlhh|hhlh|Hk..',
          '..kH|hHhh|hhHh|Hk..',
          '...k|Hhlh|hlhH|k...',
        ],
        over: pad(14, ['...k|Hhlh|hlhH|k...', '...k|HhHl|lHhH|k...', '....|kHhH|HhHk|....', '....|kHkH|HkHk|....', '....|.k.k|k.k.|....']),
      },
      side: {
        head: [
          '....|.kk.|....|....',
          '....|kwc.|k...|....',
          '...k|Hwck|hk..|....',
          '..kH|hhwc|Hhk.|....',
          '.kHh|lLhh|wcHk|....',
          '.kHh|llhh|hwck|....',
          'kHhh|hhhH|hcwk|....',
          'kHhH|hHhh|Hwck|....',
          'kHHh|HhhH|hHhk|....',
          'kHkk|Hhhh|HHhk|....',
          'ksEc|sHhH|hHhk|....',
          'ksew|stHh|Hhlk|....',
          '.kss|tkHH|hhHk|....',
          '..kt|tkHh|hhHk|....',
        ],
        under: pad(14, ['....|..kH|hhHk|....', '....|..kH|hlhk|....', '....|..kH|hhHk|....', '....|...k|HhHk|....', '....|...k|HkHk|....', '....|....|k.k.|....']),
        over: pad(10, ['.G..|G...|....|....', '.G..|....|....|....']),
      },
    },
  };

  // ---------------------------------------------------------------- outfits: body palette + what replaces the lace headdress
  // (front and back rows 0-3, side rows 0-4); hair ribbons come off with the uniform
  const YUKATA = {
    berry: { 'd': '#d9435f', 'D': '#f07d92', 'w': '#ffc9d4', 'c': '#f28aa0', 'r': '#ffd23f', 'R': '#c9920e', 'b': '#f4c7b0', 'B': '#e0a896' },
    honey: { 'd': '#e38a1e', 'D': '#ffbd55', 'w': '#fff0b8', 'c': '#ffd57a', 'r': '#ec3d5f', 'R': '#a51f40', 'b': '#f4c7b0', 'B': '#e0a896' },
    yukino: { 'd': '#3a86d0', 'D': '#78bdf2', 'w': '#e2f4ff', 'c': '#9fd3f5', 'r': '#ff8ea4', 'R': '#d65a78', 'b': '#f4c7b0', 'B': '#e0a896' },
    yoru: { 'd': '#4a3f78', 'D': '#7466a8', 'w': '#dcd4f2', 'c': '#9b8fc8', 'r': '#ec3d5f', 'R': '#a51f40', 'b': '#f4c7b0', 'B': '#e0a896' },
  };
  const OUTFIT_STYLE = {
    maid: { pal: () => ({}), head: null },
    cat: { pal: () => ({ 'd': '#3b2f45', 'D': '#66557a', 'w': '#ffd6e2', 'c': '#f2a6bf', 'r': '#ffd23f', 'R': '#c9920e', 'b': '#3b2f45', 'B': '#241c2c' }), head: 'cat' },
    yukata: { pal: (m) => Object.assign({}, YUKATA[m]), head: 'flower' },
    princess: { pal: () => ({ 'd': '#ff82a8', 'D': '#ffc2d6', 'w': '#ffffff', 'c': '#ffe0ea', 'r': '#ffd23f', 'R': '#e0a014', 'b': '#ffffff', 'B': '#ffe0ea' }), head: 'tiara' },
  };
  const HEADWEAR = {
    cat: {
      front: ['..k.|....|....|.k..', '.kdk|....|....|kdk.', '.kpd|kkkk|kkkk|dpk.', '.kpd|Hhhh|hhhH|dpk.'],
      side: ['....|k...|k...|....', '...k|dk.k|dk..|....', '...k|pdkk|pdk.|....', '..kk|Hhhh|hhkk|....', '.kHh|hhhh|hhhH|k...'],
    },
    flower: {
      front: ['....|....|..kr|k...', '....|....|.kry|rk..', '...k|kkkk|kkkr|k...', '..kH|hhhh|hhhh|Hk..'],
      back: ['...k|rk..|....|....', '..kr|yrk.|....|....', '...k|rkkk|kkkk|k...', '..kH|hhhh|hhhh|Hk..'],
      side: ['....|....|..kr|k...', '....|....|.kry|rk..', '....|kkkk|kkkr|k...', '..kk|Hhhh|hhkk|....', '.kHh|hhhh|hhhH|k...'],
    },
    tiara: {
      front: ['....|.y.y|y.y.|....', '....|kyky|ykyk|....', '...k|yyyp|pyyy|k...', '..kH|hhhh|hhhh|Hk..'],
      side: ['....|.y.y|....|....', '....|kyky|k...|....', '...k|yypy|kk..|....', '..kk|Hhhh|hhkk|....', '.kHh|hhhh|hhhH|k...'],
    },
  };
  G.OUTFIT_IDS = Object.keys(OUTFIT_STYLE);
  function withHeadwear(rows, outfit, dir) {
    const hw = HEADWEAR[OUTFIT_STYLE[outfit].head];
    if (!hw) return rows;
    const top = dir === 'side' ? hw.side : dir === 'up' ? hw.back || hw.front : hw.front;
    const out = top.concat(rows.slice(top.length)).map((r) => r.replace(/\|/g, '').replace(/[xXO]/g, 'h'));
    // the lace headdress comes off: its trim along the hair edge becomes outline, its band across the hair becomes hair
    for (let y = top.length; y < 9; y++) {
      const row = out[y];
      out[y] = row.split('').map((ch, x) => {
        if (ch !== 'w' && ch !== 'c') return ch;
        return x === 0 || x === 15 || row[x - 1] === '.' || row[x + 1] === '.' ? 'k' : 'h';
      }).join('');
    }
    return out;
  }

  // ---------------------------------------------------------------- compose maids
  // what the illustration dresses each maid in: long or short sleeves (u shoulder, a forearm, A forearm shade) and
  // bare legs or white thigh-highs (j)
  const STYLE = { berry: {  }, yoru: { longSleeves: true }, honey: { longSleeves: true, stockings: true }, yukino: { longSleeves: true } };
  // outlines are inked by what they wrap, as in the Genshin chibi sheet the user chose: the silhouette along hair takes a deep
  // hair hue, along skin a warm brown, along white cloth a blue-grey, elsewhere the body ink; black lines inside the face (lids,
  // lash corners, closed eyes) take the lash colour and the other inner lines the body ink, so no pure black is left
  function inkHair(pix, P) {
    const hex = (c) => '#' + [c[0], c[1], c[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    const group = {};
    const put = (keys, g) => keys.forEach((k) => { if (P[k] && !group[P[k].toLowerCase()]) group[P[k].toLowerCase()] = g; });
    put(['E', 'e'], 'eye');
    put(['H', 'h', 'l', 'L'], 'hair');
    put(['s', 't', 'p', 'm'], 'skin');
    put(['w', 'c'], 'white');
    put(['j'], P.j === P.s ? 'skin' : P.j === P.w ? 'white' : 'body');
    put(['a'], P.a === P.s ? 'skin' : 'body');
    const INK = { hair: P.hairInk || mix(P.H, '#000000', 0.45), skin: P.skinInk, white: P.whiteInk, body: P.bodyInk, eye: P.lash };
    return pix.map((c, x, y) => {
      if (c[0] || c[1] || c[2]) return c;
      const seen = {};
      let edge = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = pix.get(x + dx, y + dy);
        if (!n) { edge = true; continue; }
        const g = n[0] || n[1] || n[2] ? group[hex(n)] || 'body' : null;
        if (g) seen[g] = (seen[g] || 0) + 1;
      }
      const inFace = y >= 9 && y <= 12 && x >= 4 && x <= 11;
      if (inFace && !edge && (seen.eye || seen.skin) && !seen.hair) return INK.eye;
      if (!edge) return seen.hair && Object.keys(seen).length === 1 ? INK.hair : INK.body;
      if (seen.body) return INK.body;
      if (seen.hair) return INK.hair;
      if (seen.skin) return INK.skin;
      if (seen.white) return INK.white;
      return INK.body;
    });
  }
  // Hair lit from above: going down from the eyes the hair sinks towards its deep tone Q, so the crown reads light and the
  // locks by the cheeks and over the shoulders dark, while each lock keeps its own highlight. The hair outline goes lighter
  // along the upper head (selective outline) and stays dark below. Rows count from the top of the head (bob), so a walking
  // frame never changes colour. Only hair and hair-ink pixels change.
  function shadeHair(pix, P, bob) {
    if (!P.Q) return pix;
    const hex = (c) => '#' + [c[0], c[1], c[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    const hair = new Set(['H', 'h', 'l', 'L'].map((k) => P[k].toLowerCase()));
    const ink = (P.hairInk || '').toLowerCase();
    return pix.map((c, x, y) => {
      const col = hex(c);
      const r = y - bob;
      if (hair.has(col)) {
        const k = (r >= 16 ? 0.55 : r >= 13 ? 0.45 : r >= 11 ? 0.32 : r >= 9 ? 0.18 : 0) * (P.shade || 1);
        return k ? mix(col, P.Q, k) : col;
      }
      if (col === ink) {
        if (r <= 7) return mix(ink, P.H, 0.42);
        if (r <= 9) return mix(ink, P.H, 0.2);
      }
      return c;
    });
  }
  // hair below the shoulders (layer rows from `from` down) moved a pixel sideways: the follow-through of a step
  function swayRows(pix, from, dx) {
    const out = new Pix(pix.w, pix.h);
    for (let y = 0; y < pix.h; y++) {
      for (let x = 0; x < pix.w; x++) {
        const c = pix.get(x, y);
        if (c) out.set(y >= from ? x + dx : x, y, c);
      }
    }
    return out;
  }
  function buildMaid(name, outfit) {
    outfit = outfit || 'maid';
    const P = Object.assign(pal(name), OUTFIT_STYLE[outfit].pal(name));
    const st = STYLE[name] || {};
    P.u = P.D;
    P.a = st.longSleeves ? P.D : P.s;
    P.A = st.longSleeves ? P.d : P.t;
    P.j = st.stockings ? P.w : P.s;
    P.o = mix(P.r, '#ffffff', 0.45);
    const parts = MAID_PARTS[name];
    const layer = (rows, label) => (rows ? fromRows(rows16(rows, label), P) : null);
    const out = { down: [], up: [], left: [], right: [] };
    // sway: long hair and twin tails swing a pixel one way on the left step and back on the right step (walk frames 1, 2)
    const compose = (dir, headRows, f, bob, sway) => {
      const part = parts[dir];
      const pix = new Pix(16, 24);
      const swing = (p) => (p && sway ? swayRows(p, 16, sway) : p);
      const under = layer(part.under, name + ' under ' + dir);
      const over = layer(part.over, name + ' over ' + dir);
      if (under) pix.blit(swing(under), 0, bob);
      pix.blit(fromRows(pad(14, rows16(BODY[dir][f], 'body ' + dir + f)), P), 0, 0);
      pix.blit(fromRows(pad(0, rows16(headRows, name + ' head ' + dir)), P), 0, bob);
      if (over) pix.blit(swing(over), 0, bob);
      return shadeHair(inkHair(pix, P), P, bob);
    };
    const heads = {};
    for (const dir of ['down', 'up', 'side']) {
      const head = (heads[dir] = withHeadwear(parts[dir].head, outfit, dir));
      for (let f = 0; f < 3; f++) {
        const pix = compose(dir, head, f, f === 0 ? 0 : 1, f === 1 ? 1 : f === 2 ? -1 : 0);
        if (dir === 'side') {
          out.left.push(pix);
          out.right.push(pix.flipped());
        } else out[dir].push(pix);
      }
    }
    // breathing in: the standing pose with head and hair a pixel lower, shown now and then while she stands still
    out.breath = { down: compose('down', heads.down, 0, 1), up: compose('up', heads.up, 0, 1), left: compose('side', heads.side, 0, 1) };
    out.breath.right = out.breath.left.flipped();
    // facial expressions (front view, standing) for the room, the title screen and dialogue
    out.faces = { normal: out.down[0] };
    out.facesBreath = { normal: out.breath.down };
    for (const key of Object.keys(FACES)) {
      const head = withHeadwear(parts.down.head, outfit, 'down').map((r) => r.replace(/\|/g, ''));
      FACES[key].forEach((r, i) => {
        if (!r) return;
        const row = head[9 + i];
        head[9 + i] = row.slice(0, 4) + r.split('').map((ch, j) => (ch === '?' ? row[4 + j] : ch)).join('') + row.slice(12);
      });
      out.faces[key] = compose('down', head, 0, 0);
      out.facesBreath[key] = compose('down', head, 0, 1);
    }
    return out;
  }
  // expressions replace the eye block (columns 4-11) of head rows 9-12; null keeps the row
  const FACES = {
    happy: ['tssttsst', 'skksskks', 'ksskkssk', '?psmmsp?'],
    blush: [null, null, null, '?ppsspp?'],
    angry: ['kksttskk', 'skEssEks', 'swessews', '?tskkst?'],
    tired: ['tssttsst', 'skksskks', 'sEessEes', '?tsssst?'],
    sleep: ['tssttsst', 'ssssssss', 'skksskks', '?tsssst?'],
    surprise: ['tkkttkkt', 'kwEssEwk', 'swessews', '?tsmmst?'],
  };

  // ---------------------------------------------------------------- painters
  const K = BASE.k;

  // shaded ellipse, lit from the top-left
  function ball(p, x, y, w, h, L, M, D, hl) {
    const cx = x + w / 2 - 0.5, cy = y + h / 2 - 0.5, rx = w / 2, ry = h / 2;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const dx = (x + i - cx) / rx, dy = (y + j - cy) / ry;
        if (dx * dx + dy * dy > 1.05) continue;
        let col = M;
        if (D && dx * 0.35 + dy * 0.95 > 0.52) col = D;
        else if (L) {
          const hx = dx + 0.38, hy = dy + 0.45;
          if (hx * hx + hy * hy < (hl || 0.13)) col = L;
        }
        p.set(x + i, y + j, col);
      }
  }
  function tri(p, x, y, w, h, col) {
    const cx = x + (w - 1) / 2;
    for (let j = 0; j < h; j++) {
      const half = ((j + 1) / h) * (w / 2);
      for (let i = 0; i < w; i++) if (Math.abs(x + i - cx) < half) p.set(x + i, y + j, col);
    }
  }
  function stamp(p, rows, x, y, palette, flip) {
    const s = fromRows(rows, palette);
    p.blit(s, x, y, flip);
  }
  function darkRim(p, col) {
    // darken bottom-most opaque pixel of each column (cheap grounding)
    for (let x = 0; x < p.w; x++)
      for (let y = p.h - 1; y >= 0; y--) if (p.solid(x, y)) { p.set(x, y, col); break; }
  }

  // ---------------------------------------------------------------- monsters (15 wide, 17-26 tall, facing down; flip for left/right)
  // Redrawn part by part from the original game's roster at its proportions: a head, body, arms and feet each with its
  // own outline, four-tone ramps and highlights. Rows are full width (a single centre column); rows of 8 would be the
  // left half and get mirrored. The second frame bobs everything above the feet down a pixel.
  const MON_BASE = { k: '#000000', w: '#ffffff' };
  const MON_ART = {
    // hamster: round ringed ears, a cream face mask with sparkly eyes and a pink snout, arms at its sides, pink feet
    piggy: {
      pal: { O: '#ffa45c', o: '#e0642a', d: '#a23a14', D: '#5a1e0a', c: '#ffe8d0', C: '#f0b88e', p: '#ff8aa8', P: '#d4507a' },
      rows: [
        '.kkk.......kkk.',
        'kOopk.....kpoOk',
        'koPpokkkkkopPok',
        'kooOOOOOOOOOook',
        'kdOOcccccccOOdk',
        'kdOccwcccwccOdk',
        'kdOcckccckccOdk',
        'kdOwccpppccwOdk',
        '.kdOccpPpccOdk.',
        '.kddOcccccOddk.',
        'kodkOcccccOkdok',
        'kOdkOcccccOkdOk',
        '.kkdocccccodkk.',
        '..kdoOcccOodk..',
        '..kdooCCCoodk..',
        '..kkdddddddkk..',
        '.kppk.....kppk.',
        '.kPPk.....kPPk.',
        '..kk.......kk..',
      ],
    },
    // flame lion: a flame on its head, a spiky mane, brow line, muzzle with glaring eyes, fangs, belly and feet
    teddy: {
      pal: { r: '#e8203c', y: '#ffd23f', Y: '#fff4a8', R: '#9a1020', L: '#f0a040', M: '#b05a1c', D: '#6a3010', c: '#ffd08a', g: '#c8c8d8' },
      rows: [
        '.......r.......',
        '......ryr......',
        '.....ryYyr.....',
        '...kkryyyrkk...',
        '.kkLMkRyRkMLkk.',
        'kLkLLMMMMMLLkLk',
        'kMLMMMMMMMMMLMk',
        'LkMMMkkkkkMMMkL',
        'kMMMLMMMMMLMMMk',
        'LkMkwkMMMkwkMkL',
        'kMkMMMcccMMMkMk',
        'MkMkMccDccMkMkM',
        'kMkwMkkkkkMwkMk',
        '.kMkMkwRwkMkMk.',
        '..kMkkkkkkkMk..',
        '.kgMLcccccLMgk.',
        '.kDMMcccccMMDk.',
        '..kDkkkkkkkDk..',
        '..kLLk...kLLk..',
        '...kk.....kk...',
      ],
    },
    // slime: a curly antenna with a bead, a droplet body outlined in dark grey, round eyes, a pale band, a deeper skirt
    jelly: {
      pal: { L: '#d0ecff', l: '#8cc8ff', M: '#3a9af0', D: '#1a62c8', X: '#0e3c8a', G: '#344058' },
      rows: [
        '.......kk......',
        '......kwlk.....',
        '......klMk.....',
        '.......kkG.....',
        '.........G.....',
        '......GGG......',
        '.....GlMlG.....',
        '....GlMMMMG....',
        '...GlMMMMLwG...',
        '..GlMMMMMLwMG..',
        '.GMMMMMMMMLLMG.',
        '.GMMkMMMMMkMMG.',
        'GMMkwkMMMkwkMMG',
        'GMMMkMMMMMkMMMG',
        'GMMlLLLLLLLlMMG',
        'GMLLwwwwwwwLLMG',
        'GMlLLLLLLLLLlMG',
        'GDMMDDDDDDDMMDG',
        'GDMDDDDDDDDDMDG',
        'GwDDDDDDDDDDDwG',
        'GwDDXDDDDDXDDwG',
        '.GDXXDDDDDXXDG.',
        '..GGGXXXXXGGG..',
        '....GGGGGGG....',
      ],
    },
    // grey cat: hooked ears, a light brow band, big sleepy closed eyes, front legs, a pale belly and orange paw pads
    dustcat: {
      pal: { L: '#b8b8c8', M: '#76768a', D: '#4a4a5c', X: '#2c2c38', o: '#ffa040', p: '#ff8aa0' },
      rows: [
        '..kk.......kk..',
        '.kLMk.....kMLk.',
        '.kMkMk...kMkMk.',
        '.kMkDkkkkkDkMk.',
        '..kkDDMMMDDkk..',
        '.kDMMLLLLLMMDk.',
        '.kDLLLLLLLLLDk.',
        '.kMDDDDDDDDDMk.',
        '.kDDDDDDDDDDDk.',
        '.kDkkkDpDkkkDk.',
        '.kDDDDDDDDDDDk.',
        '..kXDDDDDDDXk..',
        '.kMkMkkkkkMkMk.',
        '.kMkLkLLLkLkMk.',
        '.kDkMLLLLLMkDk.',
        '.kDkMMMMMMMkDk.',
        '..kokkkkkkkok..',
        '..kookMMMkook..',
        '...kk.kkk.kk...',
      ],
    },
    // white bunny: pointed ears with white insides, a red gem between them, red eyes and mouth, a collar and a round belly
    snowkid: {
      pal: { l: '#dce8f8', m: '#a8b8d0', M: '#6a7890', r: '#e8203c', R: '#9a1020', Y: '#fff4a8', o: '#ffa040', b: '#c8e0f8' },
      rows: [
        '.......r.......',
        '.kkkk.rYr.kkkk.',
        '.kmllk.o.kllmk.',
        '.kmwlkkRkklwmk.',
        '..kmwlmmmlwmk..',
        '...kmwwwwwmk...',
        '..kmwwwwwwwmk..',
        '..kmwRwwwRwmk..',
        '..kmlwrrrwlmk..',
        '...kmlllllmk...',
        '....kkkkkkk....',
        '....kbwwwbk....',
        '...kbwwwwwbk...',
        '...kbwwwwwbk...',
        '....kbbbbbk....',
        '....kmkkkmk....',
        '....kk...kk....',
      ],
    },
    // cat in a red helmet: blue ribbon bow, a banded dome over a white face with happy eyes and blush, a dark jacket,
    // a gold bell and little feet
    drumbun: {
      pal: { r: '#ff5a5a', R: '#d01828', h: '#7a0a1e', b: '#6ab0ff', B: '#2a60d0', U: '#1a3a80', l: '#dce6f4', m: '#a8b4cc', p: '#ff9ab0', y: '#ffd23f', Y: '#fff4a8', o: '#c88a00', K: '#2a2a3c', G: '#4a4a60' },
      rows: [
        '....BbB.BbB....',
        '...BbwbBbwbB...',
        '....BBBkBBB....',
        '...kkRrRrRkk...',
        '..kRrwrrrrRRk..',
        '.kRrwrrrrrrRhk.',
        '.kBbbBBBBBBBUk.',
        '.kRrrRRRRRRRhk.',
        '.khRRRRRRRRRhk.',
        '.kBUkkkkkkkUBk.',
        '.kbwlwwwwwlwbk.',
        '.kbwkwwwwwkwbk.',
        '.kbkwkwwwkwkbk.',
        '.kBpwwwkwwwpBk.',
        '..kmlwwwwwlmk..',
        '...kkKKKKKkk...',
        '..kwkKyYyKkwk..',
        '..kwKKyyoKKwk..',
        '..kmKKKoKKKmk..',
        '...kKKKKKKKk...',
        '...kwk...kwk...',
        '...kkk...kkk...',
      ],
    },
    // gold ring robot: an antenna bead, a gold oval frame round a pink toothy visor, a ribbed white body, gold feet
    gemknight: {
      pal: { y: '#ffd23f', Y: '#fff4a8', o: '#e0a010', O: '#a06a00', p: '#ff6a8a', P: '#c83a5a', q: '#ffc0d0', l: '#dce6f4', m: '#a8b4cc', M: '#6a7890', b: '#5a8af0' },
      rows: [
        '.......k.......',
        '......kwk......',
        '......kkk......',
        '....kkyyykk....',
        '..kkyYYYYyykk..',
        '.kyYkkkkkkkoyk.',
        '.kykqqqqqqqkok.',
        'kyYkpPwPwPpkoOk',
        'kyokwqwqwqwkoOk',
        'kyokpPPPPPpkoOk',
        '.kykkqqqqqkkok.',
        '.kyykkkkkkkyok.',
        '..koyyyyyyyok..',
        '...kkOOOOOkk...',
        '....klmmmlk....',
        '...kllbmblmk...',
        '...kmlmlmlMk...',
        '...kllmmmlmk...',
        '....kmlmlMk....',
        '....kkyyykk....',
        '...kyYoooyok...',
        '...kkkkkkkkk...',
      ],
    },
    // crocodile: a gold spiky crest, dark shades, a wide toothy grin, a ribbed pale neck and body, little feet
    dragon: {
      pal: { L: '#9ae04c', M: '#5cb42c', D: '#2e7a18', X: '#1a4a0e', y: '#ffd23f', Y: '#fff4a8', o: '#e07818', O: '#a04a10', s: '#2a2a3a', S: '#5a5a70', l: '#dce6f4', m: '#a8b4cc', r: '#e8203c' },
      rows: [
        '.......y.......',
        '......yYo......',
        '.....kyYok.....',
        '....kyoyoOk....',
        '...kyoOyOoOk...',
        '..kDMMMMMMMDk..',
        '.kDMLLMMMLLMDk.',
        '.kMLMMMMMMMLMk.',
        'kDMkkkkkkkkkMDk',
        'kMkssSsksSsskMk',
        'kMkssssksssskMk',
        'kDMkkkMMMkkkMDk',
        'kDMMMMLLLMMMMDk',
        '.kDkkkkkkkkkDk.',
        '.kMkwkwkwkwkMk.',
        '.kDMkrrrrrkMDk.',
        '..kDkwkwkwkDk..',
        '...kDkkkkkDk...',
        '....kDMMMDk....',
        '....klmmmlk....',
        '....kkkkkkk....',
        '....klmmmlk....',
        '....kmmMmmk....',
        '....kkkkkkk....',
        '....kDk.kDk....',
        '....kkk.kkk....',
      ],
    },
    // cake: a glossy strawberry on a cream dome, a striped tart base and little feet
    cupcake: {
      pal: { r: '#ff4a5a', R: '#d01828', h: '#7a0a1e', p: '#ffb0b8', g: '#3cb44a', l: '#e8f0fa', m: '#b8c8e0', M: '#7a8aa8', D: '#6a3418', d: '#3a1c0c', o: '#ffb03a', O: '#c86a10' },
      rows: [
        '......kgk......',
        '.....kgRgk.....',
        '....krrRrRk....',
        '...krprRRrRk...',
        '...krrRpRRhk...',
        '...kRRRRRhhk...',
        '..kkkRRhhhkkk..',
        '.kwwwkkkkkwwlk.',
        'kwwwwwwwwwwwlmk',
        'kwwlwwwwwwwlmMk',
        'kmwwwwwwwwwlmMk',
        '.kmllwwwwllmMk.',
        '..kmmmmmmmmMk..',
        '..kkkkkkkkkkk..',
        '.kDoDoDoDoDoDk.',
        '.kOdOdOdOdOdOk.',
        '.kDDDDDDDDDDDk.',
        '..kdddddddddk..',
        '...kkkkkkkkk...',
        '...kdk...kdk...',
        '...kkk...kkk...',
      ],
    },
    // penguin: a blue-black round head with bright eyes, an orange beak, flippers, a big white belly and orange feet
    penguin: {
      pal: { L: '#5a6a90', M: '#2a3350', D: '#161c30', o: '#ffb03a', O: '#d06a10', l: '#dce6f4', m: '#a8b4cc', b: '#7ab0ff' },
      rows: [
        '.....kkkkk.....',
        '...kkMLLLMkk...',
        '..kMLLMMMMMMk..',
        '.kMLMMMMMMMMMk.',
        '.kMMkwMMMMwkMk.',
        'kMMMkbMMMMbkMMk',
        'kMMMMMkoOkMMMMk',
        'kDMMMkooooOkMDk',
        'kDMMklkOOklkMDk',
        'kDMklllllllkMDk',
        'kMklllllllllkMk',
        'kMkllllllllmkMk',
        'kDkllllllllmkDk',
        '.kkmlllllllmkk.',
        '..kmmlllllmmk..',
        '...kkmmmmmkk...',
        '..kookkkkkook..',
        '..kkkk...kkkk..',
      ],
    },
  };
  // monsters stand on the bottom row: draw them with their feet on the tile's bottom edge
  function monsterFrame(key, f) {
    const m = MON_ART[key];
    const rows = m.rows.map((r) => (r.length === 8 ? r + r.split('').reverse().join('') : r));
    const P = Object.assign({}, MON_BASE, m.pal);
    if (!f) return fromRows(rows, P, 16);
    const p = new Pix(16, rows.length);
    p.blit(fromRows(rows.slice(0, rows.length - 2), P, 16), 0, 1);
    p.blit(fromRows(rows.slice(rows.length - 2), P, 16), 0, rows.length - 2);
    return p;
  }
  const MONSTERS = {};
  for (const key of Object.keys(MON_ART)) MONSTERS[key] = (f) => monsterFrame(key, f);

  // ---------------------------------------------------------------- bosses (sized like the originals; drawn centred on their feet)
  function brighten(pix) {
    return pix.map((c) => [Math.min(255, c[0] + 110), Math.min(255, c[1] + 110), Math.min(255, c[2] + 110), 255]);
  }
  // segment for spindly legs (w pixels thick)
  function seg(p, x0, y0, x1, y1, col, wdt) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
      p.rect(x, y, wdt || 2, wdt || 2, col);
    }
  }

  // Bosses drawn like the originals: silhouette profiles lit as 3D forms with hue-shifted ramps (warm lights,
  // cool purple shadows, a sharp glint and a little bounce light), black outlines, and hand-placed parts stamped
  // symmetrically. Fire glows from within instead of taking the scene light.
  const BK = '#000000';


  // fill rows y0..y1 of a symmetric shape centred between columns cx-1 and cx; hw(y) = half width in pixels
  // tones: [centre, light, mid, rim]; stops: |dx| fractions where each tone ends
  function bossBody(p, cx, y0, y1, hw, tones, stops) {
    const st = stops || [0.18, 0.55, 0.82];
    for (let y = y0; y <= y1; y++) {
      const h = hw(y);
      if (h <= 0) continue;
      for (let i = 0; i < Math.ceil(h); i++) {
        const t = (i + 0.5) / h;
        const col = t < st[0] ? tones[0] : t < st[1] ? tones[1] : t < st[2] ? tones[2] : tones[3];
        p.set(cx + i, y, col);
        p.set(cx - 1 - i, y, col);
      }
    }
  }
  // stamp template rows at (x, y) and mirrored on the other side of the centre line
  function bossPair(p, rows, x, y, pal, cx) {
    const s = fromRows(rows, pal);
    p.blit(s, x, y);
    p.blit(s, 2 * cx - x - s.w, y, true);
  }
  
  const bossPairLab = (p, rows, x, y, pal, cx) => bossPair(p, rows, x, y, pal, cx);
  function bossFire(p, cx, y0, y1, hw, ramp, coreY) {
    for (let y = y0; y <= y1; y++) {
      const h = hw(y); if (h <= 0) continue;
      for (let i = -Math.ceil(h); i < Math.ceil(h); i++) {
        const u = (i + 0.5) / h; if (Math.abs(u) > 1) continue;
        const r = Math.hypot(u * 0.9, (y - coreY) / ((y1 - y0) * 0.75));
        p.set(cx + i, y, ramp[r < 0.22 ? 0 : r < 0.4 ? 1 : r < 0.62 ? 2 : r < 0.88 ? 3 : 4]);
      }
    }
  }
  // black outline plus a dark rim just inside it on the lower right
  function bossFinish(p, rim) {
    const out = p.outlined(BK);
    if (rim) {
      for (let y = 0; y < out.h; y++)
        for (let x = 0; x < out.w; x++) {
          if (!p.solid(x, y)) continue;
          if (!p.solid(x + 1, y) || !p.solid(x, y + 1) || !p.solid(x - 1, y) || !p.solid(x, y - 1)) out.set(x, y, rim);
        }
    }
    return out;
  }
  const brightenBoss = (pix) => pix.map((c) => [Math.min(255, c[0] + 110), Math.min(255, c[1] + 110), Math.min(255, c[2] + 110), 255]);

  // piecewise-linear profile through [y, halfWidth] points
  const curve = (pts) => (y) => {
    if (y < pts[0][0] || y > pts[pts.length - 1][0]) return 0;
    for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const [y0, h0] = pts[i - 1], [y1, h1] = pts[i]; return h0 + ((h1 - h0) * (y - y0)) / Math.max(1, y1 - y0); }
    return 0;
  };

  // hue-shifted ramps [shine, light, mid, shadow, deep]: shadows lean cool/purple, lights lean warm
  const RAMP = {
    silver: ['#ffffff', '#e8f0ff', '#aabee8', '#6a7cbc', '#3e3c7c'],
    gold: ['#fffce0', '#ffe868', '#ffb61c', '#d06812', '#7a2c24'],
    red: ['#ffe4c8', '#ff7448', '#e62838', '#a01848', '#561038'],
    orange: ['#fff0b0', '#ffc050', '#e8801c', '#a84a16', '#5a2418'],
    glass: ['#ffffff', '#c8ecff', '#7ab8f0', '#4a78c8', '#2a3a88'],
    pilot: ['#f0fff0', '#d4ead8', '#a6c6b0', '#76968a', '#4a5c6a'],
    grey: ['#ffffff', '#e0e2ee', '#a8aac4', '#6c6c8c', '#3e3c5c'],
    blue: ['#e8f8ff', '#8ccaff', '#3a8ae8', '#2a52b0', '#1a2a70'],
    brown: ['#ffd8a0', '#d08a40', '#a85c20', '#763818', '#46201a'],
  };
  const LIGHT = (() => { const l = [-0.3, -0.52, 0.8], n = Math.hypot(...l); return l.map((v) => v / n); })();
  // shade a surface of revolution (rows y0..y1, half width hw(y)) as a lit 3D form: light from the upper left and front,
  // a sharp specular glint, and a sliver of reflected light along the lower shadow edge (no banding along the outline)
  // o.odd: centred on column cx (odd widths, 2*hw+1 wide) instead of the line between cx-1 and cx; o.light: light vector
  function bossSolid(p, cx, y0, y1, hw, ramp, o) {
    o = o || {};
    const spec = o.spec == null ? 0.93 : o.spec;
    const lv = o.light || LIGHT;
    for (let y = y0; y <= y1; y++) {
      const h = hw(y);
      if (h <= 0) continue;
      const win = o.win || 1;
      const slope = (hw(Math.min(y1, y + win)) - hw(Math.max(y0, y - win))) / (Math.min(y1, y + win) - Math.max(y0, y - win) || 1);
      const n = Math.ceil(h);
      for (let i = -n; i < (o.odd ? n + 1 : n); i++) {
        const u = o.odd ? i / Math.max(h, 0.5) : (i + 0.5) / h;
        if (Math.abs(u) > 1) continue;
        const nz = Math.sqrt(Math.max(0, 1 - u * u));
        let nx = u, ny = -slope * 0.8 * nz + (o.tilt || 0), len = Math.hypot(nx, ny, nz);
        nx /= len; ny /= len;
        const d = nx * lv[0] + ny * lv[1] + (nz / len) * lv[2];
        let t = d > spec ? 0 : d > 0.84 ? 1 : d > 0.56 ? 2 : d > 0.2 ? 3 : 4;
        // reflected light: the far lower rim picks up a little bounce
        if (t === 4 && u > 0.82 && y > y0 + (y1 - y0) * 0.45) t = 3;
        p.set(cx + i, y, ramp[t]);
      }
    }
  }

  const unit = (v) => { const n = Math.hypot(...v); return v.map((c) => c / n); };
  // a sprite canvas with helpers: put() stamps template rows, layer() draws a part on its own layer and lays it down
  // outlined in ink (so parts are separated like the original), mirror() copies a layer's left half onto the right
  function bossKit(W, H, pal) {
    const p = new Pix(W, H);
    const put = (L, rows, x, y) => L.blit(fromRows(rows, pal), x, y);
    // stamp rows at x and mirrored on the other side (works for odd and even widths)
    const both = (L, rows, x, y) => { const t = fromRows(rows, pal); L.blit(t, x, y); L.blit(t, W - x - t.w, y, true); };
    const layer = (draw, target, ink) => { const L = new Pix(W, H); draw(L); (target || p).blit(L.outlined(ink || BK), 0, 0); return L; };
    const mirror = (L) => { const half = W >> 1; for (let y = 0; y < H; y++) for (let x = 0; x < half; x++) { const c = L.get(x, y); if (c) L.set(W - 1 - x, y, c); } };
    return { p, put, both, layer, mirror };
  }

  // ------------------------------------------------------------ BOSS 1 — drill robot (31x46)
  // Built from the original's features, top to bottom. Top: a threaded spire with a white core, a gold collar near the
  // tip and a gold ring at its base, set in a socket between two gold horns. Middle: an onion body lit from the front,
  // gold crescent ears, small slanted eyes, a gold-rimmed mouth slot, big black cheek sockets with a grey glint, gold
  // drops on the lower sides and a gold V necklace with a pendant. Bottom: a neck standing in a gold-rimmed dish.
  // Odd width, so the spire comes to a single-pixel point on the centre column.
  function buildDrill(f, hurt, broken) {
    broken = broken || {};
    const W = 31, H = 46, cx = 15;
    const S = RAMP.silver, Au = RAMP.gold, GR = RAMP.grey;
    const PAL = { k: BK, W: S[0], w: S[1], m: S[2], s: S[3], S: S[4], Y: Au[0], y: Au[1], o: Au[2], d: Au[3], D: Au[4], g: GR[2], G: GR[3], n: '#262440', N: '#6a6890' };
    const { p, put, both, layer, mirror } = bossKit(W, H, PAL);

    // ---- bottom: a gold-rimmed dish; the neck's ink makes the hole it stands in
    layer((L) => put(L, [
      'yo.............od',
      'yoSGG.......GGSod',
      'yoGgggggggggggGod',
      'yogwwwwwwwWWwwgod',
      '.yoGGGGGGGGGGGod.',
      '...Yyyyyyyyood...',
    ], 7, 39));

    // ---- middle: the onion body lit from the front, shoulders beside the socket, gold horns and the neck
    layer((L) => {
      bossSolid(L, cx, 12, 38, curve([[12, 8], [13, 8], [14, 9], [15, 9], [16, 10], [17, 10], [18, 11], [19, 11], [20, 12], [23, 12], [24, 13], [27, 13], [28, 12], [30, 12], [31, 11], [33, 11], [34, 10], [35, 10], [36, 9], [37, 8], [38, 6]]), S, { odd: true, light: unit([-0.25, 0.22, 1]), spec: 0.992, win: 4 });
      both(L, ['.sw.', 'smyo'], 8, 10);
      both(L, ['oyy'], 10, 12);
      put(L, ['mwWWwms'], 12, 39);
    });
    // gold crescent ears on the upper sides and little gold drops lower down (broken off: only a scorched socket)
    layer((L) => {
      if (!broken.ears) put(L, ['..yyo', '.yYo.', 'yYWo.', 'yyo..', 'oyd..', 'od...', '.d...'], 1, 13);
      else put(L, ['.smS.', 'snNns', '.sYS.', '..d..'], 2, 14);
      put(L, ['y.', 'o.', 'W.', 'yo'], 1, 28);
      mirror(L);
    });

    // ---- top: the threaded spire; the white core and the thread turn every frame
    const spin = f % 2;
    // snapped off: a jagged stub of thread on the gold collar
    if (broken.spire) layer((L) => put(L, [
      '..s.S.m.s..',
      '.SmnNnNnmS.',
      '.soyYyYyos.',
      '..smwWwms..',
    ], 10, 7));
    else layer((L) => put(L, [
      '.....W.....',
      '....wWs....',
      '....yYo....',
      '....oyd....',
      spin ? '....w.m....' : '...m.W.s...',
      spin ? '...wWwms...' : '...mwWms...',
      spin ? '..mwWwmsS..' : '..smwWwmS..',
      spin ? '.smwWwwmsS.' : '.smwwWwmsS.',
      '..soyYyoS..',
      '...smwms...',
    ], 10, 1));

    // ---- face: slanted eyes with a gold streak, the mouth slot, cheek sockets, and the V necklace with its pendant
    both(p, ['.mm.....', 'mkkmm...', 'mkWkkmm.', 'mkWWWkkm', '.mkWWWkm', '..mkkkm.'], 6, 12);
    both(p, ['Yy..', '.oyy'], 3, 16);
    put(p, ['..kkk..', '.kYyok.', 'kykkkok', 'sykkkos', 'soknkds', 'sokkkds', 'sdyooDs', '.sdddS.'], 12, 17);
    both(p, ['....yYWW..', '...oy..kk.', '..od..kkkk', '..d..kknkk', '.k..kkNNk.', '.k.kkNNkk.', '.kk.kkkk..', '..kk.kk...'], 3, 20);
    both(p, ['...WW.....', 'yyWyYW...W', 'doyoyyW.WY', '.dodoyy.yy', '....dood.o', '.....dD..d'], 5, 31);
    put(p, ['.', 'W', 'Y', 'y', 'o', 'd', 'd'], 15, 31);

    return hurt ? brightenBoss(bossFinish(p, null)) : bossFinish(p, null);
  }

  // ------------------------------------------------------------ BOSS 2 — flame spider (48x50)
  // Built from the original's features, top to bottom. Top: a flame head with a white wick, bright licks, a hot core
  // and two small eyes, held in a gold cup set with blue gems; horn legs rising from the head and arching legs that
  // hang their tips at the edges. Middle: thick banded legs reaching out with hooked tips, and a face below the cup —
  // brow plate, big white eyes, nose ridge, fangs and mandibles, chin plate. Bottom: jointed lower legs and big
  // banded claw feet. Each part is outlined on its own layer so the legs stay readable against each other.
  // thick limb from (x0, y0) to (x1, y1): lit top edge, core, shaded underside
  function rod(L, x0, y0, x1, y1, w, lit, core, dark) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
      for (let j = 0; j < w; j++) for (let k = 0; k < w; k++) L.set(x + k, y + j, j === 0 ? lit : j === w - 1 ? dark : core);
    }
  }
  function buildSpider(f, hurt, broken) {
    broken = broken || {};
    // legs torn off one side: the outer part of that side's leg layers is cleared, stumps stay at the shoulders
    const cut = (L) => {
      for (let y = 0; y < 50; y++) for (let x = 0; x < 48; x++) {
        if ((broken.legsL && x < 17) || (broken.legsR && x > 30)) L.clear(x, y);
      }
      // the torn ends: dark, with a hot glint where the joint snapped
      for (let y = 0; y < 50; y++) {
        if (broken.legsL && L.solid(17, y)) {
          L.set(17, y, y % 3 === 0 ? '#ffb03a' : '#4a0412');
          if (L.solid(18, y)) L.set(18, y, y % 3 === 1 ? '#c8462a' : '#6e0c1c');
        }
        if (broken.legsR && L.solid(30, y)) {
          L.set(30, y, y % 3 === 0 ? '#ffb03a' : '#4a0412');
          if (L.solid(29, y)) L.set(29, y, y % 3 === 1 ? '#c8462a' : '#6e0c1c');
        }
      }
    };
    const W = 48, H = 50, cx = 24;
    const RED = RAMP.red, OR = RAMP.orange, Au = RAMP.gold, BL = RAMP.blue;
    // deep armour reds and browns with orange highlights, as in the original; gold and blue for the cup
    const PAL = {
      k: BK, W: '#ffffff', g: '#c8c8dc', G: '#8a8aa8', e: '#e8f4ff',
      p: '#ffb8a0', r: '#ff4a3a', R: '#d01828', h: '#8a0a1e', H: '#4a0412',
      a: '#ffe08a', n: '#ffb03a', j: '#e0781a', i: '#a04a10', I: '#5a2408',
      Y: Au[0], y: Au[1], o: Au[2], d: Au[3], D: Au[4],
      b: BL[1], B: BL[2], u: BL[3], U: BL[4],
    };
    const { p, put, both, layer, mirror } = bossKit(W, H, PAL);
    const s = f % 2;

    // ---- middle legs, furthest back: an inner brown segment, a red joint, an outer segment and a tip hooking down
    layer((L) => {
      put(L, [
        '.nnjjirrRhnnjjji',
        'najjiiprRhjanjii',
        'jjiiIirRhHijjiiI',
        'jiIIIIhhHHIiIII.',
        'jI..............',
        'ij..............',
        'iI..............',
        '.i..............',
      ], 1, 22 + s);
      mirror(L);
      cut(L);
    });
    // ---- arching legs: a red upper segment from the shoulder out to a brown knee, the tip hanging down at the edge
    layer((L) => {
      put(L, [
        '.nj.........',
        'njiRh.......',
        'ji.rRh......',
        'ji..rRh.....',
        'iI...rRh....',
        'iI....rRh...',
        'i......nji..',
        'I.......nji.',
        '.........iI.',
      ], 4, 10 - s);
      mirror(L);
      cut(L);
    });
    // ---- horn legs rising from the sides of the head to a point
    layer((L) => { put(L, ['.a.....', '.nj....', '..ni...', '...ni..', '....ji.', '.....ji', '......i'], 12, 7); mirror(L); });
    // ---- shoulders: a red plate over an orange one where the legs meet the body
    layer((L) => {
      put(L, ['..rrR..', '.rprRh.', '.RrRhh.', '..hhH..'], 11, 15);
      put(L, ['.nrRh..', 'nrpRRh.', 'jRrRhhH', '.hRhhH.', '..hHH..'], 11, 19);
      mirror(L);
    });
    // ---- lower legs: an upper segment, a red joint, a lower segment stepping down to the feet
    layer((L) => {
      put(L, [
        '......nji..',
        '.....naji..',
        '....naji...',
        '...rRjiI...',
        '..rpRhI....',
        '.nRRhH.....',
        'naji.......',
        'njiI.......',
        'jiI........',
        'iI.........',
      ], 7, 30);
      mirror(L);
    });
    // ---- bottom: deep red claw feet, three knuckles lit on top, slits between them
    layer((L) => {
      put(L, [
        '..hRrrRh..',
        '.hRrprRRh.',
        'hRrRRRkkkr',
        'hhRrrRhRRh',
        '.hRrprRh..',
        'hhhhhhkkR.',
        '.hRrrRRhrh',
        '..hRprRRh.',
        '..HhhhhhH.',
      ], 10, 40);
      mirror(L);
    });

    // ---- the face below the cup (left half): brow plate and bar, big eyes with pupils low and inward, nose ridge,
    // red cheeks, inner fangs round the tongue, white mandibles with pale tips, a dark mouth and a lit chin plate
    layer((L) => {
      put(L, [
        '..ijnnan',
        '.ijkikkk',
        '.hkWWkij',
        '.hWWWWji',
        'hRgWkkjn',
        'hRRkkRhj',
        'hrRRhkij',
        'hRkWWkRr',
        'ihkWgkRr',
        'iWkkkkrR',
        'gWkHHHHH',
        'ekgkkkkk',
        'Gkkiiiii',
        '.kjjnnnn',
        '..kjjjjj',
      ], 16, 24);
      mirror(L);
    });

    // ---- top: a flame head glowing from within: a jagged crown of tongues, flame strokes, a small star-bright core with
    // the eyes beside it
    layer((L) => {
      if (broken.flame) {
        // blown out: a lump of smouldering ash, a few embers still glowing in it
        bossFire(L, cx, 9, 20, curve([[9, 3], [11, 5], [13, 6.5], [16, 7], [18, 6.5], [20, 5]]), ['#b8b0c0', '#8a8494', '#645e70', '#46404e', '#2a2432'], 16);
        for (const [x, y] of [[20, 13], [26, 12], [23, 16], [18, 16], [29, 15]]) L.set(x, y, (x + s) % 3 ? '#ff7a3a' : '#ffd23f');
      } else {
      bossFire(L, cx, 6, 20, curve([[6, 1.5], [8, 3], [10, 5], [12, 6.5], [15, 7.5], [18, 7], [20, 5.5]]), ['#fffbe0', '#ffe04a', '#ff5a2a', '#d81830', '#7a0c28'], 16);
      const tongues = [[23, 4, 3], [24, 5, 2], [21, 5 + s, 3], [26, 5 - s, 3], [19, 7, 3], [28, 7, 3], [17, 10 - s, 3], [30, 10 + s, 3]];
      for (const [x, y, hgt] of tongues) for (let t = 0; t < hgt; t++) L.set(x, y + t, t === 0 ? '#ff7a3a' : t === 1 ? '#ff5a2a' : '#d81830');
      for (const [x0, y0, dir] of [[19, 12, 1], [20, 9, 1], [27, 9, -1], [28, 12, -1]]) { L.set(x0, y0, '#ff8a4a'); L.set(x0 + dir, y0 - 1, '#ff8a4a'); L.set(x0 + dir * 2, y0 - 1, '#7a0c28'); }
      }
      put(L, ['..yy..', '.yWWy.', 'yWWWWy', '.yWWy.', '.oyyo.'], 21, 13);
      put(L, ['kWk......kWk'], 18, 13);
    });
    // gold cup set with blue gems, holding the flame
    layer((L) => {
      put(L, [
        'U.......',
        'uy......',
        'yeBy....',
        'YBuo....',
        'oyodkk..',
        '.doyyk kk'.replace(' ', 'k'),
        '..dooyYY',
      ], 16, 17);
      mirror(L);
    });

    // the wick stands clear of the outline, like the original's
    const out = bossFinish(p, null);
    if (!broken.flame) for (let y = 0; y < 5; y++) { out.set(23, y, '#ffffff'); out.set(24, y, '#a8a8c0'); }
    return hurt ? brightenBoss(out) : out;
  }

  // ------------------------------------------------------------ BOSS 3 — gold bear mech (36x58)
  // Built from the original's features, top to bottom. Top: a flat-topped glass dome with a teddy pilot at the
  // controls, round ears with rivets, a gold face with big grey-rimmed goggles, a snout over a toothy grille and a
  // bear-mouth jaw seam. Middle: shoulder pistons, a striped chest and pincer arms. Bottom: ridged legs in wide
  // boots. Each part goes down on its own layer with a black outline, so parts are separated by ink.
  function buildBoss(f, hurt, broken) {
    broken = broken || {};
    const W = 36, H = 58, cx = 18;
    // an arm torn off: that side of the arm's layer is cleared
    const cutArm = (L) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((broken.armL && x < cx) || (broken.armR && x >= cx)) L.clear(x, y); };
    const p = new Pix(W, H);
    const Au = RAMP.gold, GR = RAMP.grey, BR = RAMP.brown;
    const PAL = {
      Y: Au[0], y: Au[1], o: Au[2], d: Au[3], D: Au[4],
      W: GR[0], g: GR[1], m: GR[2], s: GR[3], S: GR[4],
      n: BR[2], N: BR[3], k: BK,
      w: '#ffffff', e: '#e8f6ff', h: '#bcdcf6', i: '#a0c4ea', j: '#7c9ed4',
    };
    // the pilot seen through tinted glass: outline, light/mid/shadow fur, eyes, muzzle, mouth
    const TQ = '#3a68a6', TP = ['#bcdccc', '#9cbfb0', '#80a2a8'], TE = '#1c2c58', TU = '#d4ecdc', TV = '#b87aa8';
    const put = (L, rows, x, y) => L.blit(fromRows(rows, PAL), x, y);
    const layer = (draw, target) => { const L = new Pix(W, H); draw(L); (target || p).blit(L.outlined(target ? TQ : BK), 0, 0); };
    const mirror = (L) => { for (let y = 0; y < H; y++) for (let x = 0; x < cx; x++) { const c = L.get(x, y); if (c) L.set(W - 1 - x, y, c); } };

    // ---- bottom: ridged grey legs stepping into wide boots, a dark coupling between them, claw tips beside
    layer((L) => {
      put(L, ['s..', 'ss.', 'SSm', 'ssg', 'SSm', 'ssg', 'SSm', 'mmg'], 11, 45);
      put(L, ['gWWgggge', 'sSSSSSSS', 'mssssssS', 'sSSSSSSS'], 7, 53);
      put(L, ['yo', 'od', '.d'], 4, 53);
      mirror(L);
    });
    layer((L) => put(L, ['nnnn', 'NNNN'], 16, 53));
    // pelvis: a bolted grey plate over a gold block
    layer((L) => put(L, ['gWWggm', 'mSmmSs'], 15, 46));
    layer((L) => put(L, ['yYyyoo', 'yooood', 'odddDD'], 15, 49));

    // ---- middle: pincer arms — two curved jaws on a pivot, straight blades below, a chrome rod between
    layer((L) => {
      put(L, [
        '..o.DyD.o..',
        '.oy..d..yo.',
        '.oY..D..Yo.',
        '.oyy.D.yyo.',
        '.dyo.D.oyd.',
        '..dd.D.dd..',
        '..D..D..D..',
        '.doy...yod.',
        '.doo...ood.',
        '.doo...ood.',
        '.ddo...odd.',
        '.DdD...DdD.',
      ], 0, 40);
      mirror(L);
      cutArm(L);
    });
    // shoulder pistons: grey caps on gold barrels with a chrome shaft (a torn-off arm leaves its piston bent)
    layer((L) => { put(L, ['mWm', 'yho', 'ohd'], 4, 36); put(L, ['mWm', 'yho', 'ohd'], 8, 36); mirror(L); cutArm(L); });
    if (broken.armL || broken.armR) layer((L) => {
      const stub = ['sSm', 'nNn', 'mYs', '.s.']; // torn rim, dark socket, a wire still live
      if (broken.armL) put(L, stub, 8, 36);
      if (broken.armR) put(L, stub, 25, 36);
    });
    // chest: a notched lintel, a lit capsule between striped ribs, and a notched base
    layer((L) => put(L, [
      'oyYyyyyood',
      'doyDDDDodD',
      'DdDyYyoDdD',
      'DyDYYyoDoD',
      'DyDyYyoDoD',
      'DoDyyooDdD',
      'DoDooodDdD',
      'DdDddddDDD',
      'dooDDDDodd',
    ], 13, 36));

    // ---- top: the gold face (left half, mirrored) sits behind the dome: rimmed cheeks, a brow band with rivets
    // and scowling brow wedges, a lit snout, a toothy grille over a lip, and the bear-mouth seam round the chin
    layer((L) => {
      put(L, [
        '......Dooooooooooo',
        '.....Ddyyyyyyyyyyy',
        '....Ddyyyyyyyyyyyy',
        '....DoyYyooooooooo',
        '....DoyYydDooooooo',
        '....DoyoWoooddoooo',
        '....Dyodoooodkdooy',
        '....DydooooooooyyY',
        '....DyoooooooooyYY',
        '....Dyooooooooodoy',
        '....Dooooooooodddd',
        '....Doooooooookkkk',
        '....DoooooooookWgW',
        '....Dokdooooddkkkk',
        '.....Dykoooooooyod',
        '......Dykkkoodkkkk',
        '.......DyYykkkyYYY',
        '........Ddoyyooddd',
        '.........Ddyoooooo',
      ], 0, 16);
      mirror(L);
    });
    put(p, ['sgWggs'], 15, 35);
    const goggle = ['.gWWm.', 'gweehs', 'Weehis', 'gehiis', 'mhiijS', '.msSS.'];
    layer((L) => { put(L, goggle, 7, 23); put(L, goggle, 23, 23); });
    // side bolts beside the goggles
    layer((L) => { put(L, ['gm', 'Yh', 'od', 'ms'], 1, 24); mirror(L); });

    // round ears with a rivet, tucked behind the dome
    layer((L) => {
      const ear = curve([[1, 2], [2, 3.5], [3, 4], [6, 4], [7, 3.5], [8, 2]]);
      bossSolid(L, 5, 1, 8, ear, Au, { spec: 0.95 });
      bossSolid(L, 31, 1, 8, ear, Au, { spec: 0.95 });
      bossPair(L, ['.h.', 'hwh', '.h.'], 3, 3, PAL, cx);
    });

    // glass dome: flat on top, widest low down, with the teddy pilot at the controls seen through the tint
    const glass = ['#ffffff', '#6ea4de', '#5088c4', '#4476b6', '#2e5c9c'];
    layer((L) => {
      bossSolid(L, cx, 1, 19, curve([[1, 6], [2, 8], [4, 8.5], [5, 9.5], [6, 11], [7, 12], [8, 12.5], [9, 13.5], [10, 15], [13, 15], [14, 14], [15, 13.5], [16, 12.5], [17, 11.5], [18, 10.5], [19, 8.5]]), glass, { spec: 0.995 });
      const pl = new Pix(W, H);
      // each part lit on its own: light upper left, shadow lower right
      const blob = (Q, x, y, w, h) => { Q.oval(x, y, w, h, TP[1]); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (!Q.solid(x + i, y + j)) continue; const t = (i / w) + (j / h); if (t < 0.55) Q.set(x + i, y + j, TP[0]); else if (t > 1.3) Q.set(x + i, y + j, TP[2]); } };
      layer((Q) => { Q.rect(8, 16, 2, 3, '#4a6e9e'); Q.rect(26, 16, 2, 3, '#4a6e9e'); }, pl);
      layer((Q) => { blob(Q, 3, 10, 7, 6); blob(Q, 26, 10, 7, 6); }, pl);
      layer((Q) => { blob(Q, 12, 13, 12, 7); }, pl);
      layer((Q) => { blob(Q, 10, 3, 5, 5); blob(Q, 21, 3, 5, 5); }, pl);
      layer((Q) => { blob(Q, 11, 4, 14, 12); }, pl);
      for (let x = 12; x < 24; x++) pl.set(x, 6, TQ);
      const helm = f % 2 ? ['#7ad0ff', '#7ae0a8', '#c890e0'] : ['#c890e0', '#7ad0ff', '#7ae0a8'];
      [[14, 0], [17, 1], [18, 1], [21, 2]].forEach(([x, k]) => pl.set(x, 6, helm[k]));
      for (const [x, y, col] of [[14, 9, TE], [21, 9, TE], [14, 10, TE], [21, 10, TE], [16, 11, TU], [17, 11, TE], [18, 11, TE], [19, 11, TU], [15, 12, TU], [16, 12, TU], [17, 12, TU], [18, 12, TU], [19, 12, TU], [20, 12, TU], [16, 13, TU], [17, 13, TV], [18, 13, TV], [19, 13, TU]]) pl.set(x, y, col);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = pl.get(x, y); if (c && L.solid(x, y)) L.set(x, y, c); }
      // reflections: a soft light-blue glare on the upper right, a white glint arc on the upper left
      for (let y = 3; y < 13; y++) for (let x = 20; x < 32; x++) {
        const dx = (x - 25.5) / 3.6, dy = (y - 8) / 2.6;
        const r = dx * dx + dy * dy;
        if (r < 1 && L.solid(x, y)) { const c = L.get(x, y); L.set(x, y, r < 0.18 ? '#e8f6ff' : [(c[0] + 170) >> 1, (c[1] + 220) >> 1, (c[2] + 255) >> 1, 255]); }
      }
      for (const [x, y] of [[9, 5], [10, 4], [11, 3], [12, 3]]) L.set(x, y, '#ffffff');
      // cracked open: the glass splits from a hole over the pilot, shards missing round it
      if (broken.dome) {
        const crack = [[22, 2], [21, 3], [21, 4], [20, 5], [21, 6], [22, 7], [21, 8], [20, 9], [20, 10], [21, 11], [19, 6], [18, 6], [17, 7], [16, 7], [15, 8], [23, 8], [24, 9], [25, 10], [26, 10], [27, 11]];
        for (const [x, y] of crack) if (L.solid(x, y)) L.set(x, y, '#ffffff');
        for (const [x, y] of [[22, 3], [22, 4], [21, 5], [22, 5], [23, 5], [22, 6], [23, 6]]) if (L.solid(x, y)) L.set(x, y, '#1c2c58');
        for (const [x, y] of crack) { if (L.solid(x + 1, y) && L.get(x + 1, y)[0] !== 255) L.set(x + 1, y, '#2e5c9c'); }
      }
    });
    // hinges clamping the dome to the head
    layer((L) => { put(L, ['.m', 'yW', 'od', '.s'], 1, 14); mirror(L); });
    // see-through gaps between each arm and the chest, and between the blades of each pincer
    const out = bossFinish(p, null);
    for (const [x, y] of [[11, 40], [11, 41], [11, 42], [11, 43], [5, 48], [5, 49], [5, 50], [5, 51]]) { out.clear(x, y); out.clear(W - 1 - x, y); }
    return hurt ? brightenBoss(out) : out;
  }

  // ---------------------------------------------------------------- bomb (16x16) and blast fireballs, in the original's style
  // The bomb is a two-lobed red heart with a pale crease, a short fuse and a flickering spark; frame 3 is the orange
  // "about to go" look. The blast puts a round fireball on every tile: a dark red rim, a red disc and a leaning
  // teardrop flame burning orange to yellow with a white-hot base (stages grow, peak and fade).
  const BOMB_PAL = {
    k: '#000000', n: '#5a3a2a', y: '#ffd23f', w: '#ffffff',
    R: '#e8203c', r: '#ff5a6a', p: '#ffb8c4', h: '#9a1024', H: '#5a0a18',
  };
  const BOMB_HOT = { R: '#ff7a1a', r: '#ffa040', p: '#ffe0a0', h: '#c04a10', H: '#6a2408' };
  const BOMB_BODY = [
    '................',
    '................',
    '................',
    '...kkkk..kkkk...',
    '..kRrprkkrprRk..',
    '.kRrpwprRrpprRk.',
    '.kRrppRRRRrRRhk.',
    '.kRRRRpRRpRRRhk.',
    '.kRRRRRppRRRRhk.',
    '.khRRRRRRRRRRhk.',
    '..khRRRRRRRRhk..',
    '..kHhRRRRRRhHk..',
    '...kHhhhhhhHk...',
    '....kkkkkkkk....',
    '................',
    '................',
  ];
  const BOMB_SPARK = [['.y.', 'ywy', '.y.'], ['y.y', '.w.', 'y.y'], ['.w.', 'wyw', '.w.']];
  // Each maid throws her own bomb (the user's picks): Berry a cleaning bucket with a star, Honey a bunny, Yukino a
  // European teacup on its saucer, Yoru a Japanese yunomi with a camellia. Refined after pixel references on Pinterest
  // (2026-09-19): openings drawn as seen from a little above, a lit stripe on the left and a hue-shifted shade on the
  // right, outlines in a dark shade of each object instead of black. R r p h H are the body ramp, which flashes the same
  // orange for everyone just before the bang, so the warning reads the same; fuse is the top of the fuse.
  const BOMB_DESIGNS = {
    berry: {
      // a red bucket seen a little from above: the rim with the dark inside of the bucket, tapering to the bottom, a white star, the silver handle behind the fuse
      rows: [
        '................',
        '................',
        '....kkkkkkk.....',
        '...kSSSSSssk....',
        '..kSk.....ksk...',
        '.kkkkkkkkkkkkkk.',
        'kSrprrrrrrrrrhsk',
        'krIIIIIIIIIIIihk',
        'kkrrrrrrrrrrrhkk',
        '.kRprRRRwRRRRhk.',
        '.kRprRRwwwRRRhk.',
        '..kRrwwwwwwWhk..',
        '..kRrRwwwwWRhk..',
        '..kRrRwWRwWRhk..',
        '...kHhhhhhhHk...',
        '....kkkkkkkk....',
      ],
      pal: { k: '#360612', R: '#e8203c', r: '#ff5a6a', p: '#ffc8d0', h: '#a8102a', H: '#6a0a1c', I: '#300610', i: '#5a1420', w: '#ffffff', W: '#ffc8d0', S: '#eef0f8', s: '#9aa0b8' },
      fuse: [13, 5],
    },
    honey: {
      // a round cream bunny: tall ears lined pink, red eyes with a glint, blush and a pink nose, a golden bow
      rows: [
        '...kk......kk...',
        '..kRRk....kRRk..',
        '..kRqk....kqRk..',
        '..kRqk....kqRk..',
        '..kRqk....kqRk..',
        '..kRRkkkkkkRRk..',
        '.kRRRRRRRRRRRRk.',
        'kRpRRRRRRRRRRRhk',
        'kRRREwRRRREwRRhk',
        'kRRReERRRReERRhk',
        'kRqRRRRnnRRRRqhk',
        'kRRRRyYRRYyRRRhk',
        '.kRRRyyOOyyRRhk.',
        '.kRRRRRRRRRRhhk.',
        '..kkhhhhhhhhkk..',
        '....kkkkkkkk....',
      ],
      pal: { k: '#6a4a3a', R: '#fff6e8', r: '#ffffff', p: '#ffffff', h: '#e6d2b8', H: '#b89c7c', q: '#ffb0c4', E: '#e8203c', e: '#8a1028', w: '#ffffff', n: '#ff8aa8', y: '#ffd23f', Y: '#f0b020', O: '#c07810' },
      fuse: [7, 4],
    },
    yukino: {
      // a white porcelain teacup: the tea showing inside the rim, a blue band and sprigs, the handle, a saucer with depth
      rows: [
        '................',
        '................',
        '................',
        '..kkkkkkkkkk....',
        '.kWWWWWWWWWWk...',
        'kWtttttttTTTWk..',
        'kWtgttttTTTTWkkk',
        'kWWWWWWWWWWWWk.k',
        'kRbbbbbbbbbbhkkk',
        'kRRbRRRbRRRbhk..',
        '.kRRRRRRRRRRhk..',
        '.kpRbRRRbRRhk...',
        'kSkRRRRRRRRhksk.',
        'kSSkkkkkkkkksSk.',
        '.kkSSSSSSSSSsk..',
        '...kkkkkkkkkk...',
      ],
      pal: { k: '#1e2440', R: '#ffffff', r: '#ffffff', p: '#f4faff', h: '#c8d4ec', H: '#8aa0c0', W: '#f0f4fc', t: '#e8a44a', T: '#c07a30', g: '#fff4d0', b: '#3d86f0', S: '#e8eef8', s: '#a8b8d0' },
      fuse: [6, 4],
    },
    yoru: {
      // a yunomi in indigo glaze: green tea inside the rim, a pale glaze running down, a red camellia, a foot ring
      rows: [
        '................',
        '................',
        '................',
        '...kkkkkkkkkk...',
        '..kgttttttttgk..',
        '..kgtllttttGgk..',
        '..kGgggggggGGk..',
        '..kRgRgggRgRhk..',
        '..kRRgRRRRgRhk..',
        '..kpRRRmmRRRhk..',
        '..kpRRmMmRRRhk..',
        '..krRRRmlRRRhk..',
        '..kRRRRRRRRhHk..',
        '...khRRRRRhHk...',
        '....kFFFFFFk....',
        '.....kkkkkk.....',
      ],
      pal: { k: '#140f28', R: '#2a2848', r: '#3e3c62', p: '#6a6898', h: '#1a1830', H: '#0e0c1c', g: '#b8c4d4', G: '#8894a8', t: '#7ab04a', l: '#b8e080', m: '#e8203c', M: '#8a0f28', F: '#3a3458' },
      fuse: [8, 4],
    },
  };
  function buildBomb(f, key) {
    const d = BOMB_DESIGNS[key];
    const pal = Object.assign({}, BOMB_PAL, d ? d.pal : {}, f === 3 ? BOMB_HOT : {});
    // frame 1 pulses the bomb down a pixel
    const dy = f === 1 ? 1 : 0;
    const p = new Pix(16, 16);
    p.blit(fromRows(d ? d.rows : BOMB_BODY, pal, 16), 0, dy);
    if (d) {
      const [fx, fy] = d.fuse;
      p.set(fx, fy - 1 + dy, pal.n); p.set(fx, fy + dy, pal.n);
      p.blit(fromRows(BOMB_SPARK[f % 3], pal), fx - 1, fy - 4 + dy);
      return p;
    }
    const top = 3 + dy;
    p.set(8, top - 1, pal.n); p.set(8, top, pal.n);
    p.blit(fromRows(BOMB_SPARK[f % 3], pal), 7, top - 4);
    return p;
  }

  // Fireball radius by stage (grow, peak, fade; 5 is the peak flickered) and the tongues that join a tile's fire to its
  // burning neighbours (to the shared tile edge), so the arms of a blast read as one cross of fire. Colour runs from a
  // white-hot heart through yellow and orange to a dark red rim, the bands broken up a little so it reads as flame.
  const FLAME_BALL_R = [3.4, 5.6, 7.3, 6.6, 4.6, 7.0];
  const FLAME_TUBE_R = [0, 2.5, 3.7, 3.2, 1.8, 3.4];
  const FLAME_FIRE = { deep: '#5a0818', rim: '#a81028', red: '#e0182c', lit: '#ff4a3a', orange: '#ff8a1a', yellow: '#ffd23f', pale: '#fff4b0', white: '#ffffff' };
  function buildFlame(mask, stage) {
    const p = new Pix(16, 16);
    const c = 7.5;
    const ends = [1, 2, 4, 8].includes(mask);
    const R = FLAME_BALL_R[stage] - (ends && (stage === 3 || stage === 4) ? 0.6 : 0);
    const TR = FLAME_TUBE_R[stage];
    const tongues = [[1, 0, -1], [2, 1, 0], [4, 0, 1], [8, -1, 0]].filter(([bit]) => mask & bit);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const u = x - c, v = y - c;
        let n = Math.hypot(u, v * 1.04) / R;
        for (const [, dx, dy] of tongues) {
          const along = u * dx + v * dy;
          if (along < 0 || TR <= 0) continue;
          const across = Math.abs(u * dy - v * dx);
          const waver = 0.45 * Math.sin(along * 1.2 + stage * 1.9 + dx * 2 + dy * 3);
          n = Math.min(n, across / (TR + waver));
        }
        n += (hash(x, y, stage * 7 + mask) - 0.5) * 0.14;
        if (n > 1) continue;
        const litSide = u + v < -3;
        let col;
        if (n > 0.84) col = litSide ? FLAME_FIRE.rim : FLAME_FIRE.deep;
        else if (n > 0.62) col = litSide ? FLAME_FIRE.lit : FLAME_FIRE.red;
        else if (n > 0.44) col = FLAME_FIRE.orange;
        else if (n > 0.26) col = FLAME_FIRE.yellow;
        else col = (stage === 2 || stage === 5) && n < 0.14 ? FLAME_FIRE.white : FLAME_FIRE.pale;
        p.set(x, y, col);
      }
    }
    // licks of flame breaking out round the top edge, changing every stage
    if (stage >= 1 && stage !== 4) {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * (0.15 + 0.7 * hash(i, stage, mask + 3));
        const lx = Math.round(c + Math.cos(a) * (R + 0.6)), ly = Math.round(c + Math.sin(a) * (R + 0.6));
        if (p.get(lx, ly + 1)) { p.set(lx, ly, FLAME_FIRE.red); p.set(lx, ly - 1, i % 2 ? FLAME_FIRE.lit : FLAME_FIRE.rim); }
      }
    }
    return p;
  }

  // the moment a bomb goes off: a white-hot flash with rays (0), the burst at its widest (1), rays breaking up (2)
  function buildBlast(f) {
    const S = 32, c = 15.5;
    const p = new Pix(S, S);
    const rayLen = [9, 15, 14][f], core = [5.5, 7.5, 4][f], rays = 8;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const u = x - c, v = y - c;
        const d = Math.hypot(u, v);
        const a = Math.atan2(v, u);
        const k = Math.abs(Math.cos((a * rays) / 2));
        const reach = core + (rayLen - core) * Math.pow(k, 6) * (0.85 + 0.3 * hash(Math.round(a * 3), f, 5));
        if (d > reach) continue;
        if (f === 2 && d < core * 0.6) continue; // hollowing out
        const t = d / reach;
        const col = t < 0.35 ? '#ffffff' : t < 0.6 ? (f === 0 ? '#ffffff' : '#fff4b0') : t < 0.82 ? '#ffd23f' : '#ff8a1a';
        p.set(x, y, col);
      }
    }
    return p;
  }
  // smoke left where the fire was: a soft grey-lavender cloud that thins out (4 frames, 12x12)
  function buildSmoke(f) {
    const p = new Pix(12, 12);
    const sets = [[[6, 7, 3.2]], [[5, 7, 3.4], [8, 6, 3]], [[4, 7, 3.2], [8, 7, 3.4], [6, 4, 3]], [[3, 7, 2.6], [8, 7, 2.8], [6, 3, 2.6]]][f];
    for (const [x0, y0, r] of sets) {
      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 12; x++) {
          const d = Math.hypot(x - x0, y - y0) / r;
          if (d > 1) continue;
          // thinning: later frames drop pixels in a checker so the cloud fades out instead of vanishing
          if (f >= 2 && (x + y + f) % (f === 3 ? 2 : 3) === 0) continue;
          p.set(x, y, d < 0.45 && y < y0 ? '#f4f0fa' : d < 0.8 ? '#cfc8dc' : '#a098b4');
        }
      }
    }
    return p;
  }

  // ---------------------------------------------------------------- item icons (16x16)
  const ICON_PAL = {
    k: K, w: '#ffffff', c: '#bdd2ef', d: '#3a2d50', D: '#6b5a8e', r: '#ec3d5f', R: '#a51f40', y: '#ffd23f', Y: '#e09a14',
    o: '#ff7a1a', b: '#3d86f0', B: '#1f3b8f', g: '#4cb84c', G: '#2c7a33', p: '#ff9fb4', n: '#8a5a3c', s: '#ffe4d2',
    // the shading tones the icons pick up: deep bomb shadow, ember rim, hot core, wood, bone grey, curse violet
    x: '#241b33', q: '#d9281c', e: '#fff3c0', m: '#c08a5a', z: '#5a4630', l: '#dcd8ea', h: '#8f88a8', v: '#c8a0ff', a: '#8ee07a',
  };
  const ICONS = {
    bomb: ['.....k.q..', '....k.qeq.', '..kkyk.q..', '.kyYYYk...', 'kdDwdddk..', 'kdwddddxk.', 'kddddddxk.', 'kdddddxxk.', '.kdddxxk..', '..kkkkk...'],
    fire: ['....k.....', '...kqk....', '...kqok...', '..kqook.k.', '..kqoyokok', '.kqoyyeook', '.kqoywweok', '.kqoywwyok', '..kqoyyok.', '...kkkkk..'],
    speed: ['..........', '....kkkk..', '...kccbbk.', '..kcwbbbk.', 'BBBbbbbbk.', '...kbbbbbk', 'BBB.kbbbbk', '...kBBBBBk', '....kkkkk.', '..........'],
    heart: ['.kk...kk..', 'krrk.krrk.', 'krwrkrrRk.', 'krprrrrRk.', 'krrrrrrRk.', '.krrrrRk..', '..krrRk...', '...kRk....', '....k.....', '..........'],
    clock: ['...kkk....', '....k.....', '..kkkkk...', '.kwwkwwk..', 'kwwwkwwck.', 'kwwwkkwck.', 'kwwwwwcck.', '.kwwccck..', '..kkkkk...', '..........'],
    star: ['....k.....', '...kyk....', '...kek....', 'kkkyeykkk.', 'kyyewyeyk.', '.kyeeeyk..', '..kyyYk...', '.kyYkYyk..', '.kYk.kYk..', '.kk...kk..'],
    tea: ['...l.l....', '....l.....', '.kkkkkkk..', '.kGGaGGkkk', '.kwwwwck.k', '.kwwwwcckk', '..kwwcck..', 'kkkkkkkkk.', '.kcccccck.', '..kkkkkk..'],
    // the newer power-ups: a kicking boot, a blast through a crate, three bombs in a row, a double flame, a skull, a glove
    kick: ['..kkk.....', '..krRk....', '..krRk....', '..krRk....', '..krrRkk..', '..krrrrRk.', 'w.krwrrrRk', '..kwwwlllk', 'w..kkkkkk.', '..........'],
    pierce: ['..........', '...kkkk...', '...kmnk...', 'kkkkmnkkk.', 'qoywwwyoqk', 'kkkkznkkk.', '...kznk...', '...kkkk...', '..........', '..........'],
    line: ['..........', '..q..q..q.', '..y..y..y.', 'kkkkkkkkkk', 'kdwkdwkdwk', 'kddkddkddk', 'kdxkdxkdxk', 'kkkkkkkkkk', '..........', '.llllllll.'],
    fullfire: ['....k.....', '...kqk..k.', '..kqqk.kqk', '..kqoyoqyk', '.kqoyyoyyk', '.kqoywyyok', 'kqoywweyok', 'kqoywwwyqk', '.kqoyyyqk.', '..kkkkkk..'],
    skull: ['..kkkkk...', '.kwwwwlk..', 'kwwwwwllk.', 'kwvkwvkwk.', 'kwkkwkklk.', 'kwwwkwllk.', '.kwwwllk..', '..kwkwk...', '..kkkkk...', '..........'],
    glove: ['.......q..', '......kyk.', '.....kdxk.', '..kk..kkk.', '.kwwk.....', 'kwwwwkk...', 'kwwwwcck..', 'kwwwwcck..', 'kbbbbbbk..', '.kkkkkk...'],
  };
  const ITEM_KEYS = Object.keys(ICONS);

  const ITEM_BG = {
    bomb: ['#fff4f8', '#ff6f91'], fire: ['#fff6e6', '#ff8a2e'], speed: ['#eef6ff', '#3d86f0'], heart: ['#fff0f4', '#ec3d5f'],
    clock: ['#eefcff', '#27a7b8'], star: ['#fffbe0', '#e0a014'], tea: ['#f2fff0', '#4cb84c'],
    kick: ['#fff0f0', '#e8403a'], pierce: ['#f6f0ff', '#8a5ac8'], line: ['#fff4f8', '#ff6f91'], fullfire: ['#fff8d8', '#e8a014'],
    skull: ['#ece6f2', '#5a4a6e'], glove: ['#eefaff', '#3aa0d8'],
  };
  function buildItem(type) {
    const p = new Pix(16, 16);
    const [bg, rim] = ITEM_BG[type];
    // the card: a coloured rim with cut corners, darker along the bottom and right, and a face that is lit at the top
    p.rect(2, 1, 12, 14, rim); p.rect(1, 2, 14, 12, rim);
    p.hline(3, 14, 10, mix(rim, '#2a1b30', 0.4));
    p.vline(14, 3, 11, mix(rim, '#2a1b30', 0.4));
    p.rect(3, 2, 10, 12, bg); p.rect(2, 3, 12, 10, bg);
    for (let y = 9; y < 13; y++) p.hline(y === 12 ? 3 : 2, y, y === 12 ? 10 : 12, mix(bg, rim, 0.08 + (y - 9) * 0.06));
    p.hline(3, 2, 10, mix(bg, '#ffffff', 0.75));
    p.vline(2, 3, 9, mix(bg, '#ffffff', 0.6));
    stamp(p, ICONS[type], 3, 3, ICON_PAL);
    return p.outlined(K);
  }
  // an icy plate over a snow tile: lit at the top-left, a glint, a hairline crack, corners left open
  function buildIce(v) {
    const p = new Pix(16, 16);
    p.rect(1, 1, 14, 14, '#dceeff');
    for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]]) p.clear(x, y);
    p.hline(2, 1, 12, '#f4fbff'); p.vline(1, 2, 12, '#eaf6ff');
    p.hline(2, 14, 12, '#a9ccE4'.toLowerCase()); p.vline(14, 2, 12, '#b6d4e8');
    p.hline(2, 13, 12, '#c8e0f4');
    if (v === 0) {
      p.hline(3, 4, 4, '#ffffff'); p.set(7, 5, '#ffffff');
      p.hline(9, 9, 3, '#b6d4e8'); p.set(8, 10, '#b6d4e8'); p.set(12, 8, '#b6d4e8');
    } else {
      p.hline(9, 3, 4, '#ffffff'); p.set(8, 4, '#ffffff');
      p.hline(3, 10, 4, '#b6d4e8'); p.set(7, 9, '#b6d4e8'); p.set(3, 6, '#b6d4e8');
    }
    return p;
  }
  function buildCoin(f) {
    const p = new Pix(16, 16);
    const widths = [10, 7, 3, 7];
    const w = widths[f % 4];
    const x0 = Math.round(8 - w / 2);
    ball(p, x0, 3, w, 11, '#fff6b0', '#ffc53a', '#c47f16', 0.2);
    // a milled rim one shade down, the mark stamped in it, and the light catching the top-left edge
    const rim = [];
    for (let y = 2; y < 15; y++)
      for (let x = 0; x < 16; x++) {
        if (!p.solid(x, y)) continue;
        if (!p.solid(x - 1, y) || !p.solid(x + 1, y) || !p.solid(x, y - 1) || !p.solid(x, y + 1)) rim.push([x, y]);
      }
    for (const [x, y] of rim) p.set(x, y, y < 8 ? '#ffe06a' : '#c47f16');
    if (w >= 7) {
      stamp(p, ['w.w', 'www', '.w.'], 7, 7, { w: '#fff0a0' });
      p.set(x0 + 1, 5, '#fffce0'); p.set(x0 + 2, 4, '#fffce0');
      p.set(x0 + w - 2, 11, '#a8660c');
    } else {
      p.set(x0, 5, '#fffce0');
    }
    return p.outlined(K);
  }
  function buildDust(f) {
    const p = new Pix(16, 16);
    ball(p, 2, 8, 12, 7, '#f2eefb', '#b7b1cc', '#857f9e');
    ball(p, 4, 5, 6, 5, '#f2eefb', '#c6c0d8', '#857f9e');
    ball(p, 9, 7, 4, 4, null, '#c6c0d8', '#857f9e');
    // tufts of fluff round the edge, a lit crown and a shaded underside
    for (const [x, y] of [[2, 7], [5, 4], [11, 5], [14, 9], [3, 13], [12, 13]]) p.set(x, y, '#d8d2e8');
    p.set(4, 6, '#ffffff'); p.set(5, 5, '#ffffff'); p.set(6, 9, '#fbf8ff');
    for (let x = 4; x < 12; x++) if (p.solid(x, 13)) p.set(x, 13, '#6f6a8a');
    const out = p.outlined('#6d6788');
    const tw = [[12, 3], [3, 4], [13, 6]][f % 3];
    stamp(out, ['.w.', 'wew', '.w.'], tw[0] - 1, tw[1] - 1, { w: '#ffffff', e: '#e8e4f2' });
    return out;
  }

  // ---------------------------------------------------------------- tiles
  // floor: 16x16; blocks: 16x20 drawn 4px above the cell
  function box(p, x, y, w, h, top, front, topH, lines) {
    p.rect(x, y, w, topH, top);
    p.rect(x, y + topH, w, h - topH, front);
  }

  const THEMES = {
    classroom: {
      name: '教室', bg: '#2b1b30',
      floor(i) {
        const p = new Pix(16, 16);
        const base = i ? '#e8a34e' : '#f0ae5a';
        p.rect(0, 0, 16, 16, base);
        for (let r = 0; r < 2; r++) {
          const y = r * 8;
          p.hline(0, y, 16, '#ffcb8a');
          p.hline(0, y + 7, 16, '#b0681c');
          const j = Math.floor(hash(r, i, 3) * 10) + 3;
          p.vline(j, y, 7, '#b0681c'); p.vline(j + 1, y + 1, 6, '#ffcb8a');
          // grain: short streaks a shade darker than the plank
          const g = Math.floor(hash(r, i, 5) * 8) + 1;
          p.hline((j + 3) % 16, y + 3, 4, '#d89443'); p.hline((g + 9) % 16, y + 5, 3, '#d89443');
        }
        return p;
      },
      hard() { // the classroom's own wooden cabinet, warm like the original's
        const p = new Pix(16, 20);
        p.rect(0, 0, 16, 5, '#f0a85c'); p.hline(0, 0, 16, '#ffd29c'); p.hline(0, 4, 16, '#b86c28');
        p.rect(0, 5, 16, 15, '#d4762e');
        p.vline(8, 5, 15, '#8c4414');
        p.rect(1, 7, 6, 9, '#e08a3c'); p.rect(9, 7, 6, 9, '#e08a3c');
        p.hline(1, 7, 6, '#ffbe78'); p.hline(9, 7, 6, '#ffbe78');
        p.set(6, 11, '#ffe9c0'); p.set(9, 11, '#ffe9c0');
        stamp(p, ['.r.r.', 'rrrrr', '.rrr.', '..r..'], 5, 16, { r: '#e8384f' });
        p.hline(0, 19, 16, '#8c4414');
        return p.outlined(K);
      },
      hard2() { // bookshelf
        const p = new Pix(16, 20);
        p.rect(0, 0, 16, 20, '#8c5530'); p.rect(1, 1, 14, 18, '#5e3423');
        const cols = ['#ec3d5f', '#3d86f0', '#4cb84c', '#ffd23f', '#ff9fbb'];
        for (let sh = 0; sh < 3; sh++) {
          const y = 2 + sh * 6;
          for (let x = 2, n = sh; x < 14; n++) {
            const w = 1 + (n % 2);
            p.rect(x, y + (n % 3 === 0 ? 1 : 0), Math.min(w, 14 - x), 5 - (n % 3 === 0 ? 1 : 0), cols[n % cols.length]);
            x += w;
          }
          p.hline(1, y + 5, 14, '#a8683c');
        }
        return p.outlined(K);
      },
      soft(i) { // school desk with a book
        const p = new Pix(16, 20);
        p.rect(1, 3, 14, 7, '#f6b36a'); p.hline(1, 3, 14, '#ffd29c');
        p.rect(1, 10, 14, 4, '#c0703a'); p.rect(3, 11, 10, 2, '#8c4a24');
        p.rect(2, 14, 2, 5, '#5a3a2e'); p.rect(12, 14, 2, 5, '#5a3a2e');
        const bk = ['#3d86f0', '#ec3d5f', '#4cb84c'][i % 3];
        p.rect(4, 4, 6, 4, bk); p.hline(4, 4, 6, '#ffffff');
        return p.outlined(K);
      },
      wallTop(i) { // dark wood wall with a row of windows
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#8a4a24');
        for (let x = 0; x < 16; x += 4) p.vline(x, 0, 12, '#6a3414');
        p.rect(0, 12, 16, 4, '#c87838'); p.hline(0, 12, 16, '#f0a860'); p.hline(0, 15, 16, '#5a2a10');
        p.rect(2, 2, 12, 9, '#000000'); p.rect(3, 3, 10, 7, '#ffffff');
        p.rect(4, 4, 8, 5, '#5aa8e8'); p.rect(4, 4, 8, 2, '#a8dcff'); p.vline(8, 4, 5, '#ffffff'); p.set(5 + i, 7, '#dff2ff');
        return p;
      },
      wall(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#8a4b2a');
        p.rect(2, 2, 12, 12, '#a45c34'); p.hline(2, 2, 12, '#c47a48'); p.hline(2, 13, 12, '#6e3a20');
        return p;
      },
    },
    garden: {
      name: '花園', bg: '#1d3b24',
      floor(i) { // mown grass: the mower's stripe across each tile, blades catching the light
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, i ? '#7cc44e' : '#8ad158');
        for (let y = 2; y < 16; y += 5) p.hline(0, y, 16, i ? '#74bc46' : '#82c950');
        for (let n = 0; n < 6; n++) {
          const x = Math.floor(hash(n, i, 21) * 13) + 1, y = Math.floor(hash(n, i, 22) * 12) + 2;
          p.set(x, y, i ? '#5fa83e' : '#6cb648'); p.set(x + 2, y, i ? '#5fa83e' : '#6cb648');
          p.set(x + 1, y - 1, i ? '#a2df76' : '#aee882');
        }
        p.hline(0, 15, 16, i ? '#6cb648' : '#74bd4e'); p.vline(15, 0, 16, i ? '#6cb648' : '#74bd4e');
        return p;
      },
      hard() { // trimmed hedge cube: a lit top, a deep green front with leaf clumps
        const p = new Pix(16, 20);
        p.rect(0, 0, 16, 6, '#3f9e4e'); p.rect(0, 6, 16, 14, '#22683a');
        for (let n = 0; n < 9; n++) {
          const x = Math.floor(hash(n, 1, 21) * 14), y = Math.floor(hash(n, 2, 21) * 4);
          p.set(x, y, '#6cc96a'); p.set(x + 1, y, '#6cc96a'); p.set(x + 1, y + 1, '#55b45a');
        }
        for (let n = 0; n < 9; n++) {
          const x = Math.floor(hash(n, 3, 21) * 15), y = 8 + Math.floor(hash(n, 4, 21) * 9);
          p.set(x, y, '#18502d'); p.set(x + 1, y, '#18502d'); p.set(x, y - 1, '#2f7d45');
        }
        p.hline(0, 6, 16, '#1c5a33');
        p.hline(0, 19, 16, '#6b4a2c');
        return p.outlined(K);
      },
      soft(i) { // one big rose over its leaves, the way the original's garden is planted
        const p = new Pix(16, 20);
        ball(p, 0, 11, 16, 9, '#6fd060', '#3f9c44', '#2a6e32');
        for (const [x, y] of [[1, 13], [12, 12], [6, 17]]) { p.set(x, y, '#8ae070'); p.set(x + 1, y + 1, '#2a6e32'); }
        ball(p, 2, 2, 12, 11, '#ff8a9a', '#e8384f', '#9c1a30', 0.2);
        stamp(p, ['.ddd.', 'dmlmd', 'dlmld', '.dmd.'], 5, 5, { d: '#9c1a30', m: '#e8384f', l: '#ff8a9a' });
        p.set(6, 4, '#ffc2cb'); p.set(10, 9, '#9c1a30');
        p.set(3 + (i % 3), 10, '#ffe14d');
        return p.outlined(K);
      },
      wallTop(i) { // the original's band of sky, a white horizon, then the hedge and its flower bed
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 8, '#6ab8ff'); p.hline(0, 0, 16, '#8fcdff'); p.hline(0, 5, 16, '#a8dcff'); p.hline(0, 7, 16, '#eaf7ff');
        p.rect(0, 8, 16, 8, '#2e7a2a');
        for (let x = 0; x < 16; x++) { p.set(x, 8, '#1a5018'); p.set(x, 9 + ((x + i) % 2), '#4aa83c'); }
        const flower = (x, y) => { for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) p.set(x + dx, y + dy, '#ff3a4a'); p.set(x, y, '#ffe040'); };
        flower(4, 12); flower(11, 13 - i);
        p.hline(0, 15, 16, '#1a5018');
        return p;
      },
      wall(i) { // a clipped hedge, lit along the top, leaf clumps in the shade
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#2c7a34');
        p.rect(0, 0, 16, 4, '#3f9e4e'); p.hline(0, 0, 16, '#63c162');
        for (let n = 0; n < 10; n++) {
          const x = Math.floor(hash(n, i, 61) * 15), y = 3 + Math.floor(hash(n, i, 62) * 12);
          p.set(x, y, '#1c5a2a'); p.set(x + 1, y, '#1c5a2a'); p.set(x, y - 1, '#49a854');
        }
        p.hline(0, 15, 16, '#17491f');
        return p;
      },
    },
    snow: {
      name: '雪原', bg: '#1c2a4a',
      floor(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, i ? '#e6f0ff' : '#f2f8ff');
        p.hline(0, 15, 16, '#d3e3f8'); p.vline(15, 0, 16, '#d3e3f8');
        if (hash(i, 1, 31) > 0.4) p.set(4, 5, '#ffffff');
        p.set(12, 3, '#d3e3f8'); p.set(2, 12, '#d3e3f8'); p.set(3, 12, '#ffffff');
        p.set(10, 11, '#c9dcf5');
        return p;
      },
      hard() { // ice block
        const p = new Pix(16, 20);
        p.rect(0, 0, 16, 6, '#c2eeff'); p.rect(0, 6, 16, 14, '#6cc2ea');
        p.hline(0, 6, 16, '#3a8fc0'); p.rect(0, 15, 16, 4, '#58b0de');
        for (let n = 0; n < 5; n++) p.set(3 + n, 13 - n, '#e6fbff');
        p.set(11, 9, '#e6fbff'); p.set(12, 8, '#e6fbff');
        p.hline(0, 19, 16, '#3a8fc0');
        return p.outlined('#2c5d85');
      },
      hard2() { // snow-covered pine
        const p = new Pix(16, 20);
        tri(p, 1, 7, 14, 11, '#2e7d5a'); tri(p, 3, 3, 10, 9, '#3a9a6c'); tri(p, 5, 0, 6, 6, '#47b07a');
        tri(p, 6, 0, 4, 3, '#ffffff');
        for (let x = 4; x < 12; x++) if ((x * 7) % 3) p.set(x, 9 + ((x >> 1) % 2), '#ffffff');
        for (let x = 2; x < 14; x++) if ((x * 5) % 3) p.set(x, 15 + ((x >> 1) % 2), '#ffffff');
        p.rect(7, 18, 2, 2, '#6d4a36');
        return p.outlined('#2c3b5c');
      },
      soft(i) { // snowman
        const p = new Pix(16, 20);
        ball(p, 1, 8, 14, 12, '#ffffff', '#eef4ff', '#b8cdeb');
        ball(p, 3, 1, 10, 9, '#ffffff', '#f4f8ff', '#c3d5ef');
        p.rect(3, 8, 10, 2, i % 2 ? '#ec3d5f' : '#3d86f0');
        p.set(6, 4, K); p.set(9, 4, K);
        p.set(7, 6, '#ff8c2e'); p.set(8, 6, '#ff8c2e');
        return p.outlined('#2c3b5c');
      },
      wallTop(i) { // snow falling out of a blue sky onto a line of little pines
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 7, '#8fc8f2'); p.hline(0, 0, 16, '#a8dcff');
        for (const [x, y] of [[2 + i * 5, 2], [9 - i * 3, 4], [13, 1]]) p.set(x, y, '#ffffff');
        p.rect(0, 7, 16, 9, '#e8f4ff');
        const t = new Pix(12, 12);
        tri(t, 1, 0, 10, 10, '#2e7a4a'); tri(t, 3, 0, 6, 4, '#ffffff'); t.hline(2, 7, 8, '#1e5a36'); t.rect(5, 10, 2, 2, '#6d4a36');
        p.blit(t.outlined('#000000'), 2, 3);
        p.rect(0, 14, 16, 2, '#b8d4f0');
        return p;
      },
      wall(i) { // packed snow bricks, icy where the light hits them
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#bcd9f2');
        p.rect(0, 0, 16, 5, '#f2f8ff'); p.hline(0, 5, 16, '#8fb4d8');
        p.rect(2, 8, 5, 3, '#a4c6e8'); p.rect(9, 11, 5, 3, '#a4c6e8');
        p.hline(0, 15, 16, '#8fb4d8');
        return p;
      },
    },
    candy: {
      name: '糖果城', bg: '#4a1f3a',
      floor(i) { // sugar cubes, as in the original: white blocks with a soft seam and a sprinkle now and then
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, i ? '#f0f0f6' : '#fafaff');
        p.hline(0, 0, 16, '#ffffff'); p.vline(0, 0, 16, '#ffffff');
        p.hline(0, 15, 16, '#d6d6e2'); p.vline(15, 0, 16, '#d6d6e2');
        p.hline(1, 14, 14, '#e8e8f0');
        const sp = ['#ec3d5f', '#3d86f0', '#ffd23f', '#4cb84c'];
        if (hash(i, 3, 41) > 0.45) {
          const x = Math.floor(hash(1, i, 41) * 10) + 3, y = Math.floor(hash(2, i, 42) * 10) + 3;
          p.set(x, y, sp[Math.floor(hash(3, i, 43) * 4)]); p.set(x + 1, y, sp[Math.floor(hash(4, i, 44) * 4)]);
        }
        return p;
      },
      hard() { // a candy-cane pillar: white bands round red, lit down its left side
        const p = new Pix(16, 20);
        for (let y = 0; y < 20; y++) {
          const w = y < 3 ? 12 - (3 - y) * 2 : 12;
          const x0 = 8 - (w >> 1);
          for (let x = x0; x < x0 + w; x++) {
            const white = (((y + 2) >> 2) % 2) === 1;
            const t = (x - x0) / w;
            p.set(x, y, white ? (t < 0.22 ? '#ffffff' : t < 0.68 ? '#f2f2fa' : '#c4c8d8') : (t < 0.22 ? '#ff8a8a' : t < 0.68 ? '#e8203c' : '#9c0c18'));
          }
        }
        p.hline(4, 0, 8, '#ffc0c0');
        return p.outlined(K);
      },
      hard2() { // a cupcake: a swirl of icing under a cherry, in a striped case
        const p = new Pix(16, 20);
        for (let j = 0; j < 8; j++) {
          const half = 7 - ((j / 3) | 0);
          for (let x = 8 - half; x < 8 + half; x++) p.set(x, 12 + j, ((x + (j >> 2)) >> 1) % 2 ? '#eef1f8' : '#8fb4d8');
        }
        p.hline(1, 12, 14, '#ffffff'); p.hline(3, 19, 10, '#5f83a8');
        ball(p, 2, 6, 12, 8, '#ffffff', '#f2f2fa', '#cfd4e4');
        ball(p, 3, 3, 10, 7, '#ffffff', '#f6f6ff', '#d8dceb');
        ball(p, 5, 1, 6, 5, '#ffffff', '#fafaff', '#dde1ee');
        for (const [x, y] of [[4, 9], [11, 7], [6, 5]]) { p.set(x, y, '#d2d7e8'); p.set(x + 1, y + 1, '#eef0f8'); }
        ball(p, 6, 0, 4, 4, '#ff8a9a', '#e8203c', '#9c1020');
        p.set(9, 0, '#2c7a33');
        return p.outlined(K);
      },
      soft(i) { // a plump strawberry: seeds in rows, a leafy crown, the light on its shoulder
        const p = new Pix(16, 20);
        for (let j = 0; j < 14; j++) {
          const half = j < 3 ? 5 + j : j < 8 ? 7 : Math.max(2, 7 - (j - 7));
          for (let x = 8 - half; x < 8 + half; x++) {
            const t = (x - (8 - half)) / Math.max(1, half * 2 - 1);
            p.set(x, 5 + j, t < 0.22 ? '#ff8a9a' : t < 0.6 ? '#e8384f' : '#a51f40');
          }
        }
        p.set(5, 7, '#ffc2cb'); p.set(6, 7, '#ff8a9a'); p.set(5, 8, '#ff8a9a');
        for (const [x, y] of [[6, 9], [10, 9], [8, 11], [5, 12], [11, 12], [7, 14], [10, 15]]) { p.set(x + (i % 2), y, '#ffe14d'); p.set(x + (i % 2), y + 1, '#c8960c'); }
        stamp(p, ['g.g.g.g', 'gGgGgGg', '.gGGGg.', '..gGg..'], 4, 1, { g: '#4cb84c', G: '#2c7a33' });
        p.rect(8, 0, 2, 3, '#2c7a33'); p.set(8, 0, '#6cd06a');
        return p.outlined(K);
      },
      wallTop(i) { // strawberries in white cups on a candy stripe
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#fff0f4');
        for (let y = 12; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, ((x + y + i) >> 1) % 2 ? '#ffffff' : '#e8203c');
        const c = new Pix(12, 12);
        ball(c, 3, 0, 7, 7, '#ff9a9a', '#e8203c', '#9a1020');
        c.set(5, 0, '#3cb44a'); c.set(6, 0, '#3cb44a'); c.set(4, 3, '#ffe040'); c.set(7, 4, '#ffe040');
        c.rect(1, 6, 10, 2, '#ffffff'); c.rect(2, 8, 8, 3, '#e6ecf6'); c.hline(2, 10, 8, '#b8c4d8');
        p.blit(c.outlined('#000000'), 2, 0);
        return p;
      },
      wall(i) { // candy-cane stripes down the sides, as the original frames this stage
        const p = new Pix(16, 16);
        for (let y = 0; y < 16; y++)
          for (let x = 0; x < 16; x++) {
            const band = ((x + y + i * 4) >> 2) % 2;
            p.set(x, y, band ? '#e8203c' : '#fff4f8');
            if (band && (x + y + i * 4) % 4 === 0) p.set(x, y, '#ff6a80');
            if (!band && (x + y + i * 4) % 4 === 3) p.set(x, y, '#ffd8e2');
          }
        return p;
      },
    },
    lab: {
      name: '研究所', bg: '#171a26',
      floor(i) { // pale metal plate, speckled, riveted at the corners
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, i ? '#e0e2ec' : '#eceef6');
        p.hline(0, 0, 16, '#fbfcff'); p.hline(0, 15, 16, '#b4b8c8'); p.vline(15, 0, 16, '#b4b8c8');
        for (let n = 0; n < 5; n++) p.set(Math.floor(hash(n, i, 51) * 12) + 2, Math.floor(hash(n, i, 52) * 12) + 2, '#cdd1de');
        for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) { p.set(x, y, '#9aa0b4'); p.set(x, y - 1, '#ffffff'); }
        return p;
      },
      hard() {
        const p = new Pix(16, 20);
        p.rect(0, 0, 16, 5, '#8d93ad');
        for (let x = 0; x < 16; x++) if (((x >> 2) % 2) === 0) p.rect(x, 1, 1, 3, '#ffc53a'); else p.rect(x, 1, 1, 3, '#2a2b40');
        p.rect(0, 5, 16, 15, '#5a6080'); p.rect(3, 8, 10, 6, '#2a2b40'); p.rect(4, 9, 8, 4, '#3fa065');
        p.set(5, 10, '#b8f28a'); p.set(9, 11, '#b8f28a');
        p.hline(0, 19, 16, '#3a3e56');
        return p.outlined(K);
      },
      hard2() { // a lab terminal: a tower beside a monitor, the screen catching the light
        const p = new Pix(16, 20);
        p.rect(0, 2, 5, 18, '#4a4f68'); p.rect(1, 3, 3, 16, '#6a7090');
        p.hline(1, 3, 3, '#8e94b0');
        p.rect(1, 5, 3, 1, '#2a2b40'); p.rect(1, 7, 3, 1, '#2a2b40');
        p.set(2, 10, '#e8384f'); p.set(3, 12, '#4cb84c');
        p.rect(5, 4, 11, 11, '#c9cedd'); p.hline(5, 4, 11, '#eef1f8'); p.hline(5, 14, 11, '#9aa0b4');
        p.rect(6, 5, 9, 8, '#1c2c58');
        for (let n = 0; n < 2; n++)
          for (let j = 0; j < 8; j++) {
            const x = 7 + n * 4 + Math.floor(j * 0.55);
            if (x < 15) p.set(x, 5 + j, n ? '#4e86c8' : '#9ad8ff');
          }
        p.rect(8, 15, 5, 2, '#9aa0b4'); p.rect(6, 17, 9, 3, '#7a8098'); p.hline(6, 17, 9, '#b4bacd');
        p.set(7, 18, '#e8384f'); p.set(9, 18, '#ffd23f'); p.set(11, 18, '#4cb84c');
        return p.outlined(K);
      },
      soft(i) { // a hazard-striped crate, like the barriers the original's lab is stacked with
        const p = new Pix(16, 20);
        p.rect(0, 2, 16, 4, '#eeb04a'); p.hline(0, 2, 16, '#ffd898');
        p.rect(0, 6, 16, 13, '#dc9a2e');
        for (let y = 6; y < 19; y++)
          for (let x = 0; x < 16; x++) if ((((x + y + i * 3) >> 2) % 2) === 0) p.set(x, y, '#6a4415');
        p.hline(0, 6, 16, '#8c5a14'); p.hline(0, 18, 16, '#8c5a14');
        return p.outlined(K);
      },
      wallTop(i) { // warning signs over a red and blue hazard band
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#f4f4f8');
        const t = new Pix(14, 12);
        tri(t, 0, 0, 14, 12, '#e8203c'); tri(t, 3, 4, 8, 7, '#ffffff');
        t.rect(6, 5, 2, 3, '#000000'); t.rect(6, 9, 2, 1, '#000000');
        p.blit(t.outlined('#000000'), 1, 0);
        for (let y = 13; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, ((x + y + i * 2) >> 1) % 2 ? '#3a78e0' : '#e8203c');
        return p;
      },
      wall(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#d8a940');
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (((x + y) >> 3) % 2) p.set(x, y, '#3a3c52');
        return p;
      },
    },
    toy: {
      name: '玩具箱', bg: '#2a1f4a',
      floor(i) { // play mat
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, i ? '#ffe7a8' : '#cde9ff');
        p.hline(0, 15, 16, i ? '#f5d27e' : '#aad5f5'); p.vline(15, 0, 16, i ? '#f5d27e' : '#aad5f5');
        if (i) { p.set(7, 7, '#ffffff'); p.set(8, 8, '#ffffff'); } else stamp(p, ['.w.', 'www', '.w.'], 6, 6, { w: '#ffffff' });
        return p;
      },
      hard() { // alphabet block
        const p = new Pix(16, 20);
        p.rect(0, 0, 16, 5, '#ff9fbb'); p.hline(0, 0, 16, '#ffd6e2');
        p.rect(0, 5, 16, 15, '#ec3d5f');
        p.rect(2, 7, 12, 11, '#fff4f8');
        stamp(p, ['..bb..', '.b..b.', '.bbbb.', 'b....b', 'b....b'], 5, 10, { b: '#3d86f0' });
        p.hline(0, 19, 16, '#a51f40');
        return p.outlined(K);
      },
      hard2() { // speaker
        const p = new Pix(16, 20);
        p.rect(0, 0, 16, 20, '#3b2f52'); p.rect(1, 1, 14, 18, '#2a2240');
        ball(p, 4, 2, 8, 7, '#8d86a8', '#4a3d66', '#1c1526'); p.set(7, 5, '#ffd23f'); p.set(8, 5, '#ffd23f');
        ball(p, 2, 9, 12, 10, '#8d86a8', '#4a3d66', '#1c1526'); ball(p, 6, 12, 4, 4, null, '#ffd23f', null);
        return p.outlined(K);
      },
      soft(i) { // a frothy mug, the toy box's own prize, handle out to one side
        const p = new Pix(16, 20);
        p.rect(2, 6, 10, 13, '#ffc53a');
        p.rect(3, 6, 8, 13, '#ffd76a'); p.vline(3, 7, 11, '#fff0b0');
        for (let n = 0; n < 4; n++) p.set(5 + ((n * 3 + i) % 6), 10 + n * 2, '#ffe9a8');
        p.rect(12, 9, 3, 6, '#f0b224'); p.rect(13, 10, 1, 4, '#ffe9a8');
        p.rect(1, 3, 12, 4, '#ffffff');
        ball(p, 1, 1, 6, 5, '#ffffff', '#f4f4fc', '#dcdce8');
        ball(p, 6, 0, 7, 5, '#ffffff', '#f8f8ff', '#dcdce8');
        p.hline(2, 18, 10, '#c88a00');
        return p.outlined(K);
      },
      wallTop(i) { // a wall of amps, as the original stacks them behind its stage
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#2e2e3c');
        p.rect(1, 1, 14, 12, '#6e6e82'); p.hline(1, 1, 14, '#9d9db4'); p.vline(1, 1, 12, '#8b8ba2');
        p.rect(3, 3, 10, 8, '#4a4a5c');
        for (let y = 4; y < 11; y += 2) for (let x = 4; x < 12; x += 2) p.set(x + (i % 2), y, '#2a2a38');
        ball(p, 5, 4, 6, 6, '#8d86a8', '#3a3a4c', '#1c1526');
        p.set(7 + i, 6, '#ffd23f');
        p.hline(1, 12, 14, '#22222e');
        p.rect(0, 13, 16, 3, '#8a8a9a'); p.hline(0, 13, 16, '#c8c8d8'); p.hline(0, 15, 16, '#000000');
        return p;
      },
      wall(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#4a3d66'); p.rect(2, 2, 12, 12, '#5d4f80'); p.hline(2, 2, 12, '#7a6aa0');
        p.set(8, 8, '#ffd23f');
        return p;
      },
    },
    jewel: {
      name: '寶石宮殿', bg: '#2b1a12',
      floor(i) { // a gold plate framed in filigree with a little gem set in the middle, as the palace's floor is laid
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, i ? '#f0b81e' : '#f7c62c');
        p.hline(0, 0, 16, '#ffe486'); p.vline(0, 0, 16, '#ffe486');
        p.hline(0, 15, 16, '#a8760a'); p.vline(15, 0, 16, '#a8760a');
        // the frame: a darker gold border with a corner flourish at each corner
        p.rect(2, 2, 12, 12, '#d69a10');
        p.rect(3, 3, 10, 10, i ? '#f6c227' : '#fdcf35');
        p.hline(3, 3, 10, '#ffeaa8'); p.vline(3, 3, 10, '#ffeaa8');
        for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) { p.set(x, y, '#fff3c0'); }
        for (const [x, y] of [[4, 2], [11, 2], [2, 4], [2, 11], [13, 4], [13, 11], [4, 13], [11, 13]]) p.set(x, y, '#a8760a');
        // the gem, cut and set: colour rotates with the tile
        const gem = [['#8ae07a', '#2c9a3a', '#165c22'], ['#ffb3c1', '#e8384f', '#9c1a30'], ['#a8d4ff', '#3a8fe0', '#12457e']][i % 3];
        stamp(p, ['.ggg.', 'gGllG', 'gGGlG', '.gGg.'], 6, 6, { g: gem[2], G: gem[1], l: gem[0] });
        p.set(7, 7, '#ffffff');
        return p;
      },
      hard() { // a blue orb held in a gold cradle: arms up each side, a plate under it
        const p = new Pix(16, 20);
        // cradle arms
        stamp(p, [
          'y........y',
          'yY......Yy',
          '.yY....Yy.',
          '..yY..Yy..',
          '..yo..oy..',
        ], 3, 11, { y: '#ffd23f', Y: '#e0a014', o: '#a8730c' });
        // base plate, lit on top and deep underneath
        p.rect(1, 16, 14, 3, '#e0a014'); p.hline(1, 16, 14, '#ffe38a'); p.hline(1, 18, 14, '#8c6410');
        p.rect(3, 15, 10, 1, '#c8860c');
        // the orb itself, lit from the top-left with a hard specular
        ball(p, 2, 0, 12, 13, '#cfeaff', '#3a8fe0', '#0f3c70', 0.22);
        p.set(5, 2, '#ffffff'); p.set(6, 2, '#eaf6ff'); p.set(5, 3, '#eaf6ff');
        for (let x = 5; x < 11; x++) p.set(x, 11, '#0c3260');
        p.set(4, 9, '#8fd0ff'); p.set(11, 5, '#1a5fa8');
        return p.outlined(K);
      },
      hard2() { // a cut diamond: a flat table, a girdle, and facets running down to the point
        const p = new Pix(16, 20);
        // crown: the table and the sloping facets round it
        p.rect(4, 2, 8, 4, '#eef6ff');
        p.hline(4, 2, 8, '#ffffff'); p.rect(5, 3, 3, 2, '#ffffff');
        for (let j = 0; j < 2; j++) { const half = 6 + j; p.rect(8 - half, 6 + j, half * 2, 1, '#dfeaf8'); }
        p.set(2, 6, '#ffffff'); p.set(13, 7, '#a8bcd6');
        // the girdle
        p.hline(1, 8, 14, '#b9c9e0'); p.hline(1, 9, 14, '#ffffff');
        // pavilion: facets tapering to the point, light on the left, shade on the right
        for (let j = 0; j < 10; j++) {
          const half = Math.max(1, 7 - Math.round(j * 0.72));
          for (let x = 8 - half; x < 8 + half; x++) {
            const t = (x - (8 - half)) / Math.max(1, half * 2 - 1);
            p.set(x, 10 + j, t < 0.22 ? '#ffffff' : t < 0.48 ? '#eef6ff' : t < 0.76 ? '#c6d6ec' : '#9fb4d0');
          }
        }
        // the seams between facets
        for (let j = 0; j < 9; j++) {
          p.set(8 - Math.round(j * 0.6) - 1, 10 + j, '#93a8c6');
          p.set(8 + Math.round(j * 0.5), 10 + j, '#8fa4c0');
        }
        p.set(6, 12, '#ffffff'); p.set(7, 13, '#ffffff');
        return p.outlined('#3f5878');
      },
      soft(i) { // a treasure heap topped with a ruby, an emerald or an amethyst
        const p = new Pix(16, 20);
        const [lt, mid, dk] = [['#ffb3c1', '#ec3d5f', '#a51f40'], ['#c9f5b8', '#4cb84c', '#2c7a33'], ['#e2d4ff', '#9b87c9', '#5d4b7d']][i % 3];
        ball(p, 0, 9, 16, 11, '#fff0a0', '#e0a014', '#a86f12');
        p.set(3, 13, '#fff6cc'); p.set(11, 15, '#fff6cc'); p.set(7, 17, '#fff6cc');
        stamp(p, ['.llll.', 'lllmmm', 'lmmmmd', '.mmmd.', '..md..'], 5, 3, { l: lt, m: mid, d: dk });
        return p.outlined(K);
      },
      wallTop(i) { // gold ornament strung with jewels
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#c88a00');
        p.rect(0, 1, 16, 10, '#ffc020'); p.hline(0, 1, 16, '#fff2a8'); p.hline(0, 10, 16, '#9a5a04');
        for (let x = 1; x < 16; x += 4) { p.set(x, 5, '#9a5a04'); p.set(x + 1, 6, '#9a5a04'); }
        const gem = (x, col) => { const g = new Pix(5, 5); ball(g, 0, 0, 5, 5, '#ffffff', col, '#000000'); p.blit(g.outlined('#000000'), x, 3); };
        gem(1, i ? '#e8203c' : '#3a9df0'); gem(9, i ? '#3cb44a' : '#e8203c');
        p.rect(0, 12, 16, 4, '#7a1f3a'); p.hline(0, 12, 16, '#e0a014');
        return p;
      },
      wall(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#5e1830'); p.rect(1, 1, 14, 14, '#7a1f3a');
        for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) p.set(x, y, '#e0a014');
        return p;
      },
    },
    cafe: {
      name: '女僕咖啡廳', bg: '#2b1b30',
      floor(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, i ? '#eee2fb' : '#fff7fa');
        p.hline(0, 15, 16, i ? '#ddd0ee' : '#f3e6ee');
        if (i) { p.set(7, 7, '#ffffff'); p.set(8, 7, '#ffffff'); p.set(7, 8, '#ffffff'); p.set(8, 8, '#ffffff'); }
        return p;
      },
      hard() { // pink column with gold trim
        const p = new Pix(16, 20);
        p.rect(0, 0, 16, 5, '#ffe14d'); p.hline(0, 0, 16, '#fff6b0');
        p.rect(1, 5, 14, 13, '#ff9fbb'); p.rect(4, 5, 2, 13, '#ffd6e2'); p.rect(11, 5, 2, 13, '#e2769c');
        p.rect(0, 17, 16, 3, '#ffc53a');
        return p.outlined(K);
      },
      soft(i) { // stacked tea crates
        const p = new Pix(16, 20);
        p.rect(1, 3, 14, 16, '#b8763c'); p.rect(1, 3, 14, 3, '#dca06a');
        p.hline(1, 11, 14, '#7e4a2e'); p.rect(5, 7, 6, 3, '#fff1f7'); p.rect(5, 14, 6, 3, '#fff1f7');
        p.set(7, 8, '#ec3d5f'); p.set(8, 15, '#4cb84c');
        return p.outlined(K);
      },
      wallTop(i) { // red roses in white vases along the tea room wall
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#3a78e0');
        for (let x = 0; x < 16; x += 4) p.vline(x, 0, 16, '#2c5cb8');
        const v = new Pix(10, 14);
        ball(v, 1, 0, 8, 7, '#ff9a9a', '#e8203c', '#8e1018'); v.set(4, 2, '#ffd0d0');
        v.set(3, 6, '#2e8a2a'); v.set(6, 6, '#2e8a2a'); v.vline(5, 6, 3, '#2e8a2a');
        v.rect(3, 9, 4, 5, '#ffffff'); v.vline(6, 9, 5, '#c8d4e8');
        p.blit(v.outlined('#000000'), 3, 1);
        return p;
      },
      wall(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#3b2f52'); p.rect(2, 2, 12, 12, '#4a3d66');
        p.hline(2, 2, 12, '#6b5a8e');
        return p;
      },
    },
  };

  // the originals outline their blocks in pure black
  const inkOutline = (pix) => pix.map((c) => (c[0] === 0x2a && c[1] === 0x1b && c[2] === 0x30 ? [0, 0, 0, 255] : c));
  // Stage finishing, after the pixel-art references: the ground and the border recede (contrast pulled toward each tile's
  // own average, so maids, monsters and blocks read first) and every block gets a bevel — the rim just inside its outline
  // lit where it faces the top-left light and shaded where it faces away — so it stands up off the floor.
  function calm(pix, amt) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < pix.d.length; i += 4) if (pix.d[i + 3]) { r += pix.d[i]; g += pix.d[i + 1]; b += pix.d[i + 2]; n++; }
    const avg = [r / n, g / n, b / n];
    return pix.map((c) => [0, 1, 2].map((k) => Math.round(c[k] + (avg[k] - c[k]) * amt)).concat(255));
  }
  // Outlines take a dark tint of whatever they wrap instead of flat black — the same ink the maids use, so monsters,
  // furniture, props and icons sit in the same picture. Shapes never move: only near-black pixels are recoloured.
  function softInk(pix, amt) {
    const k = amt == null ? 0.62 : amt;
    const dark = (c) => c && c[0] + c[1] + c[2] < 140;
    const ring = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
    return pix.map((c, x, y) => {
      if (!dark(c)) return c;
      let r = 0, g = 0, b = 0, n = 0;
      for (const [dx, dy] of ring) {
        const s = pix.get(x + dx, y + dy);
        if (!s || dark(s)) continue;
        r += s[0]; g += s[1]; b += s[2]; n++;
      }
      if (!n) return c;
      const avg = [Math.round(r / n), Math.round(g / n), Math.round(b / n), 255];
      // light subjects need a deeper ink to stay readable on a light floor
      const luma = (avg[0] * 0.3 + avg[1] * 0.6 + avg[2] * 0.1) / 255;
      return mix(avg, '#140f1c', Math.min(0.88, k + 0.25 * luma));
    });
  }
  // Light from above over the whole figure, as in the chibi reference sheets: the top third warms a little toward the
  // light and the bottom third sinks toward a cool violet shadow (hue shifted), so every figure reads round and grounded.
  // Inks (near-black) are left alone and shapes never change.
  function volume(pix, amt) {
    const k = amt == null ? 1 : amt;
    let top = pix.h, bot = -1;
    for (let y = 0; y < pix.h; y++) for (let x = 0; x < pix.w; x++) if (pix.solid(x, y)) { if (y < top) top = y; if (y > bot) bot = y; }
    if (bot <= top) return pix;
    return pix.map((c, x, y) => {
      if (c[0] + c[1] + c[2] < 140) return c;
      const t = (y - top) / (bot - top);
      if (t < 0.35) return mix(c, '#fff4e0', (0.35 - t) * 0.3 * k);
      if (t > 0.6) return mix(c, '#3a2c5a', (t - 0.6) * 0.42 * k);
      return c;
    });
  }
  function bevel(pix) {
    const edge = (x, y) => pix.solid(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !pix.solid(x + dx, y + dy));
    return pix.map((c, x, y) => {
      if (edge(x, y)) return c;
      const lit = edge(x - 1, y) || edge(x, y - 1), shade = edge(x + 1, y) || edge(x, y + 1);
      if (lit && !shade) return mix(c, '#ffffff', 0.28);
      if (shade && !lit) return mix(c, '#2a1b30', 0.24);
      return c;
    });
  }
  const block = (pix) => softInk(bevel(inkOutline(pix)), 0.5);
  // the frame round the field: give each wall tile a lit top-left and a shaded bottom-right so it has thickness
  function wallDepth(p, amt) {
    const a = amt == null ? 1 : amt;
    for (let x = 0; x < p.w; x++) {
      const t0 = p.get(x, 0), t1 = p.get(x, 1);
      if (t0) p.set(x, 0, mix(t0, '#ffffff', 0.42 * a));
      if (t1) p.set(x, 1, mix(t1, '#ffffff', 0.2 * a));
      const b0 = p.get(x, p.h - 1), b1 = p.get(x, p.h - 2);
      if (b0) p.set(x, p.h - 1, mix(b0, '#000000', 0.44 * a));
      if (b1) p.set(x, p.h - 2, mix(b1, '#000000', 0.22 * a));
    }
    for (let y = 1; y < p.h - 1; y++) {
      const l = p.get(0, y), l1 = p.get(1, y), r = p.get(p.w - 1, y), r1 = p.get(p.w - 2, y);
      if (l) p.set(0, y, mix(l, '#ffffff', 0.3 * a));
      if (l1) p.set(1, y, mix(l1, '#ffffff', 0.12 * a));
      if (r) p.set(p.w - 1, y, mix(r, '#000000', 0.34 * a));
      if (r1) p.set(p.w - 2, y, mix(r1, '#000000', 0.14 * a));
    }
    return p;
  }
  // Little things lying about on each theme's floor, three per theme: a knot, a scratch and a dropped pencil in the
  // classroom; a daisy, a tuft and a clover in the garden; a glint, footprints and a drift in the snow; sprinkles, a
  // heart candy and crumbs on the candy floor; a rivet, a scratch and a vent in the lab; a star, a brick and a marble in
  // the toy box; a pebble, a ripple and a glint on the jewel sand; a petal, a sugar cube and crumbs in the café.
  const FLOOR_DECALS = {
    classroom: [
      [['.hh.', 'hHHh', '.hh.'], { h: '#c8864a', H: '#a86a38' }],
      [['l....', '.l...', '..ll.'], { l: '#f0bc80' }],
      [['kyyyyp'], { k: '#5a3a2a', y: '#ffd23f', p: '#ff9fb4' }],
    ],
    garden: [
      [['.w.', 'wyw', '.w.'], { w: '#ffffff', y: '#ffd23f' }],
      [['g.g.g', '.ggg.'], { g: '#4a9a3a' }],
      [['.l.', 'lLl', '.l.'], { l: '#56b048', L: '#3e8a34' }],
    ],
    snow: [
      [['..w..', '..w..', 'ww.ww', '..w..', '..w..'], { w: '#ffffff' }],
      [['bb...', 'bb...', '.....', '...bb', '...bb'], { b: '#d0def2' }],
      [['.ww.', 'wwwb'], { w: '#ffffff', b: '#d8e6f8' }],
    ],
    candy: [
      [['r..b.', '...y.', 'g....', '..r..'], { r: '#ff6f91', b: '#6ad0ff', y: '#ffd23f', g: '#8ee07a' }],
      [['.rr.rr.', 'rwrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff9fbb', w: '#ffffff' }],
      [['c.c.', '.c..', '...c'], { c: '#e0bc88' }],
    ],
    lab: [
      [['.D.', 'DwD', '.D.'], { D: '#80869e', w: '#e4e8f2' }],
      [['w...', '.w..', '..ww'], { w: '#cfd4e4' }],
      [['DDDDD', '.....', 'DDDDD'], { D: '#8c92aa' }],
    ],
    toy: [
      [['.y.', 'yyy', 'y.y'], { y: '#ffd23f' }],
      [['R.R', 'rrr', 'rrr'], { r: '#ff6f91', R: '#ffb0c4' }],
      [['.bb.', 'bwbb', '.bb.'], { b: '#6aa8ff', w: '#ffffff' }],
    ],
    jewel: [
      [['.pp.', 'pPPp'], { p: '#c9a870', P: '#ae8c56' }],
      [['.hhh.', 'h...h'], { h: '#d2b27a' }],
      [['..w..', '.www.', '..w..'], { w: '#fff6d4' }],
    ],
    cafe: [
      [['.p', 'pp'], { p: '#ffb4cc' }],
      [['ww', 'wc'], { w: '#ffffff', c: '#e4dcec' }],
      [['c.c', '...', '.c.'], { c: '#dcc09a' }],
    ],
  };
  function buildTheme(key) {
    const T = THEMES[key];
    return {
      key, name: T.name, bg: T.bg,
      decals: (FLOOR_DECALS[key] || []).map(([rows, pal]) => fromRows(rows, pal)),
      floor: [calm(T.floor(0), 0.4), calm(T.floor(1), 0.4)],
      hard: block(T.hard()),
      hard2: T.hard2 ? block(T.hard2()) : null,
      soft: [T.soft(0), T.soft(1), T.soft(2)].map(block),
      wallTop: [wallDepth(T.wallTop(0), 0.5), wallDepth(T.wallTop(1), 0.5)],
      wall: wallDepth(calm(T.wall(0), 0.3)),
    };
  }

  // ---------------------------------------------------------------- decor (3x3 tile centrepieces)
  function buildDecor(kind) {
    let p;
    if (kind === 'treehouse') {
      p = new Pix(48, 62);
      ball(p, 5, 18, 38, 42, '#d99058', '#a8683c', '#74421f');
      // bark: deep grooves, lighter ridges between them, a knot and roots flaring at the foot
      for (let i = 0; i < 9; i++) p.vline(9 + i * 4, 30 + (i % 3) * 3, 8, '#8c5530');
      for (let i = 0; i < 5; i++) p.vline(8 + i * 8, 25 + (i % 2) * 6, 6, '#e0a878');
      ball(p, 11, 33, 7, 6, '#8c5530', '#74421f', '#5a3422');
      p.set(13, 35, '#c08048'); p.set(14, 35, '#a8683c');
      for (const [x, w] of [[7, 5], [17, 7], [30, 6], [38, 4]]) { p.rect(x, 57, w, 3, '#8c5530'); p.hline(x, 57, w, '#c08048'); }
      // door with plank lines and a lit frame
      p.rect(19, 44, 10, 16, '#5a3422'); p.rect(20, 45, 8, 1, '#8c5530'); p.set(26, 52, '#ffd23f');
      p.hline(18, 43, 12, '#c08048'); p.vline(18, 44, 16, '#8c5530');
      for (const x of [21, 24, 27]) p.vline(x, 46, 13, '#4a2a1a');
      // windows: a cross frame and the light spilling on the sill
      for (const [x, y] of [[11, 32], [31, 30]]) {
        p.rect(x, y, 6, 6, '#2a1b30'); p.rect(x + 1, y + 1, 4, 4, '#ffe38a');
        p.vline(x + 3, y + 1, 4, '#c8952c'); p.hline(x + 1, y + 3, 4, '#c8952c');
        p.set(x + 1, y + 1, '#fff6d0'); p.hline(x, y + 6, 6, '#c08048');
      }
      ball(p, 0, 0, 48, 28, '#8ee27a', '#4cb84c', '#2c7a33');
      ball(p, 6, -4, 22, 16, '#a6ee8e', '#5cc65a', null);
      // the canopy in clumps: lit crowns on top, shade tucked underneath
      for (const [x, y, w, h] of [[2, 4, 16, 13], [16, 0, 18, 14], [30, 3, 16, 13], [8, 12, 14, 12], [26, 12, 16, 12]]) {
        ball(p, x, y, w, h, '#b6f49e', '#63cc5c', null, 0.16);
      }
      for (let x = 1; x < 47; x++) for (let y = 27; y > 14; y--) if (p.solid(x, y) && !p.solid(x, y + 1)) { p.set(x, y, '#2c7a33'); if (p.solid(x, y - 1)) p.set(x, y - 1, '#3f9440'); break; }
      for (const [x, y] of [[9, 12], [20, 18], [34, 10], [40, 18], [27, 6]]) { p.rect(x, y, 3, 3, '#ec3d5f'); p.set(x, y, '#ff9aae'); p.set(x + 2, y + 2, '#a51f40'); p.set(x + 1, y - 1, '#2c7a33'); }
      p.rect(22, 58, 4, 4, '#b78a5a');
      return p.outlined(K);
    }
    if (kind === 'well') { // the garden's wishing well: a wooden barrel under a red roof on two posts
      p = new Pix(48, 62);
      // the roof, overhanging, with its ridges
      for (let j = 0; j < 12; j++) {
        const half = 5 + j * 2;
        for (let x = 24 - half; x < 24 + half; x++) p.set(x, 8 + j, x < 24 - half + 2 ? '#ff8a72' : x > 24 + half - 3 ? '#9c2418' : '#e8402a');
      }
      for (let x = 6; x < 42; x += 7) p.vline(x, 10, 9, '#c8301e');
      p.hline(2, 20, 44, '#7a1a10');
      p.rect(23, 2, 2, 7, '#8c5530'); p.rect(21, 0, 6, 3, '#ffd23f'); p.set(21, 0, '#fff3c0');
      // the posts
      p.rect(8, 20, 4, 21, '#a8683c'); p.rect(36, 20, 4, 21, '#a8683c');
      p.vline(8, 20, 21, '#c98a5a'); p.vline(39, 20, 21, '#6b4527');
      // the crank across them, with its rope
      p.rect(10, 25, 28, 3, '#8c5530'); p.hline(10, 25, 28, '#c08a5a');
      p.vline(24, 28, 5, '#e8e4d8');
      p.rect(21, 33, 6, 4, '#a8683c'); p.hline(21, 33, 6, '#d9a05e');
      // the barrel: staves round a dark mouth with water in it
      ball(p, 6, 36, 36, 20, '#d9a05e', '#b0743c', '#7a4a20');
      for (let x = 9; x < 40; x += 5) p.vline(x, 40, 14, '#8c5a2c');
      p.rect(9, 38, 30, 4, '#c08a4a'); p.hline(9, 38, 30, '#e8b878');
      ball(p, 12, 36, 24, 9, null, '#3a2a18', null);
      ball(p, 14, 38, 20, 6, '#6aa8d8', '#2e6ea8', '#17436e');
      p.set(20, 40, '#bfe4ff'); p.set(21, 41, '#8fc8ee');
      // grass tucked round its foot
      for (const [x, y] of [[4, 55], [42, 54], [12, 58], [34, 58]]) { p.set(x, y, '#4cb84c'); p.set(x + 1, y - 1, '#6cd06a'); }
      return p.outlined(K);
    }
    if (kind === 'igloo') {
      p = new Pix(48, 50);
      ball(p, 1, 6, 46, 50, '#ffffff', '#e8f2ff', '#aac3e6', 0.18);
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!p.solid(x, y) || y > 43) p.clear(x, y);
      // snow blocks: a seam between the courses, each block lit along its top edge
      for (const y of [16, 26, 36]) for (let x = 0; x < 48; x++) if (p.solid(x, y)) { p.set(x, y, '#b8cde9'); if (p.solid(x, y + 1)) p.set(x, y + 1, '#ffffff'); }
      for (let x = 8; x < 44; x += 10) { p.vline(x, 17, 9, '#c3d5ef'); p.vline(x + 5, 27, 9, '#c3d5ef'); }
      // the sun on the left shoulder, cold shade down the right
      for (let y = 6; y < 44; y++) for (let x = 0; x < 48; x++) {
        if (!p.solid(x, y)) continue;
        if (!p.solid(x - 1, y) && x < 24) { p.set(x, y, '#ffffff'); if (p.solid(x + 1, y)) p.set(x + 1, y, '#f4faff'); }
        if (!p.solid(x + 1, y) && x > 24) { p.set(x, y, '#9fbadd'); if (p.solid(x - 1, y)) p.set(x - 1, y, '#c3d5ef'); }
      }
      ball(p, 16, 28, 16, 22, null, '#3a5a8a', '#2a4570');
      // the arch: a lit lip over the mouth and darkness inside it
      for (let x = 16; x < 32; x++) for (let y = 28; y < 44; y++) if (p.get(x, y) && p.get(x, y)[2] > 100 && !p.solid(x, y - 1)) p.set(x, y, '#5e82b4');
      ball(p, 19, 34, 10, 12, null, '#22355c', null);
      for (let y = 44; y < 50; y++) for (let x = 0; x < 48; x++) p.clear(x, y);
      // drifts at the foot and a glint on the crown
      for (const [x, w] of [[4, 8], [38, 7], [14, 5]]) { p.rect(x, 41, w, 3, '#eef6ff'); p.hline(x, 41, w, '#ffffff'); }
      stamp(p, ['.w.', 'wew', '.w.'], 12, 12, { w: '#ffffff', e: '#dcecff' });
      p.rect(22, 0, 1, 8, '#6d4a36'); p.rect(23, 0, 6, 4, '#ec3d5f'); p.hline(23, 0, 6, '#ff8aa0'); p.set(22, 2, '#8c6a50');
      return p.outlined('#2c3b5c');
    }
    if (kind === 'castle') { // the candy house: a white keep under four red domes, a gold window full of sweets
      p = new Pix(48, 64);
      const brick = (x, y, w, h) => {
        p.rect(x, y, w, h, '#e4e8f2');
        for (let j = y + 3; j < y + h; j += 5) { p.hline(x, j, w, '#9aa2b8'); p.hline(j % 2 ? x : x + 3, j + 1, w - 3, '#fbfdff'); }
        for (let i = x + 5; i < x + w; i += 7) p.vline(i, y, h, '#c6ccdc');
        p.vline(x, y, h, '#ffffff'); p.vline(x + 1, y, h, '#f4f7fc');
        p.vline(x + w - 1, y, h, '#8d95ab'); p.vline(x + w - 2, y, h, '#b8c0d2');
      };
      // a fat red dome with a white collar under it
      const dome = (cx, top, r) => {
        for (let j = 0; j < r + 1; j++) {
          const half = Math.round(Math.sqrt(Math.max(0, r * r - (r - j) * (r - j))));
          for (let x = cx - half; x <= cx + half; x++) {
            const t = (x - (cx - half)) / Math.max(1, half * 2);
            p.set(x, top + j, t < 0.26 ? '#ff9a9a' : t < 0.58 ? '#e8202c' : '#9c0c18');
          }
        }
        p.set(cx - Math.round(r * 0.45), top + 2, '#ffd8d8'); p.set(cx - Math.round(r * 0.45) + 1, top + 2, '#ff8a8a');
        p.rect(cx - r - 1, top + r + 1, r * 2 + 3, 3, '#e4e8f2');
        p.hline(cx - r - 1, top + r + 1, r * 2 + 3, '#ffffff'); p.hline(cx - r - 1, top + r + 3, r * 2 + 3, '#9aa2b8');
      };
      // the keep, its turrets, and the battlements across the top of the keep
      brick(0, 16, 14, 46);
      brick(34, 16, 14, 46);
      brick(12, 10, 24, 52);
      for (let x = 13; x < 35; x += 5) { p.rect(x, 6, 4, 5, '#e4e8f2'); p.hline(x, 6, 4, '#ffffff'); }
      p.rect(12, 10, 24, 2, '#c6ccdc'); p.hline(12, 10, 24, '#ffffff');
      // four domes: two over the turret tops, two lower down
      dome(7, 4, 7); dome(41, 4, 7);
      dome(7, 32, 6); dome(41, 32, 6);
      // the gold window: a thick frame round a dark case of sweets
      p.rect(15, 20, 18, 17, '#a8730c');
      p.rect(16, 21, 16, 15, '#ffd23f'); p.hline(16, 21, 16, '#fff3c0');
      p.rect(18, 23, 12, 11, '#6a2a1a');
      stamp(p, [
        '.rr.gg.y',
        'rrrrgg.y',
        '.rr.b.yy',
        'y.bbbb..',
        '.gg.bb.r',
        'gg...rrr',
      ], 19, 24, { r: '#e8384f', g: '#4cb84c', y: '#ffd23f', b: '#3d86f0' });
      p.rect(15, 37, 18, 2, '#c8860c'); p.hline(15, 37, 18, '#ffe38a');
      // candies set in a row along the foot of the walls
      const sweets = ['#e8384f', '#4cb84c', '#ffd23f', '#3d86f0', '#ffffff'];
      for (let x = 2; x < 46; x += 4) {
        if (x > 17 && x < 31) continue;
        const c = sweets[(x >> 2) % 5];
        p.set(x, 45, c); p.set(x + 1, 45, c); p.set(x, 46, c); p.set(x + 1, 46, c);
        p.set(x, 44, '#ffffff');
      }
      // the arch, framed in stone
      p.rect(18, 46, 12, 16, '#c6ccdc'); p.hline(18, 46, 12, '#ffffff');
      ball(p, 20, 48, 8, 20, null, '#5a2c1a', null);
      p.rect(20, 56, 8, 6, '#4a2414');
      // a cane leaning by the gate
      for (let y = 50; y < 62; y++) p.rect(11, y, 3, 1, (y >> 1) % 2 ? '#e8203c' : '#ffffff');
      p.set(11, 49, '#ffffff'); p.set(12, 48, '#e8203c'); p.set(13, 49, '#ffffff');
      // the plinth it all stands on
      p.rect(0, 59, 48, 3, '#b8c0d2'); p.hline(0, 59, 48, '#e4e8f2'); p.hline(0, 61, 48, '#8d95ab');
      for (let y = 62; y < 64; y++) for (let x = 0; x < 48; x++) p.clear(x, y);
      return p.outlined(K);
    }
    if (kind === 'podium') { // 3x2: blackboard on the wall, teacher's desk in front
      p = new Pix(48, 44);
      p.rect(2, 0, 44, 24, '#8c5530'); p.rect(4, 2, 40, 20, '#2e5d45');
      stamp(p, ['.ww.', 'wwww', 'wwww', '.ww.'], 8, 9, { w: '#e8f2ea' }); p.set(10, 8, '#e8f2ea'); p.set(11, 7, '#ffd23f');
      stamp(p, ['w.w', 'www', '.w.'], 37, 7, { w: '#ff9fbb' });
      p.hline(17, 7, 14, '#e8f2ea'); p.hline(17, 11, 10, '#e8f2ea'); p.hline(17, 15, 12, '#e8f2ea');
      p.rect(6, 21, 6, 1, '#ffffff');
      p.rect(4, 26, 40, 8, '#c98a5a'); p.hline(4, 26, 40, '#e0b47a');
      p.rect(4, 34, 40, 8, '#a8683c'); p.rect(20, 35, 8, 3, '#8c5530'); p.set(23, 36, '#ffd23f');
      p.rect(8, 23, 10, 4, '#3d86f0'); p.hline(8, 23, 10, '#ffffff');
      ball(p, 33, 20, 7, 7, '#ff9aae', '#ec3d5f', '#a51f40'); p.set(36, 19, '#4cb84c');
      p.rect(6, 42, 3, 2, '#5a3a2e'); p.rect(39, 42, 3, 2, '#5a3a2e');
      return p.outlined(K);
    }
    if (kind === 'cane') { // 2x2: a giant swirl lollipop leaning on a candy cane
      p = new Pix(32, 44);
      for (let y = 10; y < 42; y++) p.rect(23, y, 5, 1, (y >> 2) % 2 ? '#ec3d5f' : '#ffffff');
      for (let a = 0; a <= 10; a++) {
        const t = (a / 10) * Math.PI;
        ball(p, Math.round(20 + Math.cos(t) * 5.5) - 2, Math.round(10 - Math.sin(t) * 6) - 2, 5, 5, null, a % 2 ? '#ec3d5f' : '#ffffff', null);
      }
      p.rect(11, 28, 3, 14, '#f5e6c8'); p.vline(11, 28, 14, '#ffffff');
      for (let y = 0; y < 26; y++)
        for (let x = 0; x < 26; x++) {
          const dx = x - 12.5, dy = y - 12.5, rr = Math.hypot(dx, dy);
          if (rr > 12.6) continue;
          const swirl = (Math.atan2(dy, dx) / (Math.PI * 2) + rr / 9 + 1) % 1;
          p.set(x, y + 4, swirl < 0.5 ? '#ff6f91' : '#fff4f8');
        }
      stamp(p, ['g...g', 'gg.gg', '.ggg.', 'gg.gg', 'g...g'], 10, 28, { g: '#4cb84c' });
      return p.outlined(K);
    }
    if (kind === 'stage') { // 3x3: the toy band's music machine
      p = new Pix(48, 60);
      p.rect(0, 42, 48, 16, '#8c5530'); p.hline(0, 42, 48, '#c98a5a');
      for (let x = 2; x < 46; x += 6) p.rect(x, 46, 4, 10, '#a8683c');
      for (const sx of [0, 36]) {
        p.rect(sx, 16, 12, 27, '#2a2240'); p.hline(sx, 16, 12, '#4a3d66');
        ball(p, sx + 2, 18, 8, 8, '#8d86a8', '#4a3d66', '#1c1526');
        ball(p, sx + 1, 28, 10, 10, '#8d86a8', '#4a3d66', '#1c1526'); p.set(sx + 5, 32, '#ffd23f'); p.set(sx + 6, 33, '#ffd23f');
      }
      p.rect(12, 10, 24, 33, '#ffc53a'); p.hline(12, 10, 24, '#fff0a0'); p.vline(12, 10, 33, '#fff0a0');
      p.rect(15, 13, 18, 10, '#2a2b40');
      [4, 7, 5, 8, 3, 6].forEach((h, i) => p.rect(16 + i * 3, 22 - h, 2, h, ['#ec3d5f', '#ffd23f', '#4cb84c', '#3d86f0', '#ff9fbb', '#b8f28a'][i]));
      ball(p, 17, 26, 14, 14, '#fff6cc', '#e0a014', '#8c5a12'); ball(p, 21, 30, 6, 6, null, '#2a2b40', null);
      stamp(p, ['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '.yy.yy.', 'y.....y'], 20, 2, { y: '#ffe14d' });
      return p.outlined(K);
    }
    if (kind === 'eggOld') { // kept: the banded egg the palace used before
      p = new Pix(48, 62);
      ball(p, 7, 2, 34, 50, '#ffffff', '#f4eefc', '#c9bfe0', 0.2);
      // enamel: a long highlight down the left, a cool crescent on the right, and the light gathering at the foot
      for (let y = 2; y < 52; y++) for (let x = 0; x < 48; x++) {
        if (!p.solid(x, y)) continue;
        if (!p.solid(x - 1, y)) { p.set(x, y, '#e2d8f2'); if (p.solid(x + 1, y)) p.set(x + 1, y, '#ffffff'); }
        if (!p.solid(x + 1, y)) { p.set(x, y, '#a89cc8'); if (p.solid(x - 1, y)) p.set(x - 1, y, '#c9bfe0'); }
      }
      for (let y = 40; y < 50; y++) for (let x = 14; x < 34; x++) if (p.solid(x, y) && (x + y) % 7 === 0) p.set(x, y, '#efe8fa');
      // the gold bands, lit on top and deep underneath
      for (const y of [16, 33]) for (let x = 0; x < 48; x++) if (p.solid(x, y)) { p.set(x, y - 1, '#fff0b0'); p.set(x, y, '#e0a014'); p.set(x, y + 1, '#ffd23f'); p.set(x, y + 2, '#a8730c'); }
      for (const [x, y, c] of [[15, 17, '#ec3d5f'], [24, 16, '#3d86f0'], [33, 17, '#4cb84c'], [19, 34, '#9b87c9'], [29, 34, '#ec3d5f']]) stamp(p, ['.c.', 'ccc', '.c.'], x - 1, y - 1, { c });
      stamp(p, ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], 21, 22, { r: '#ff6f91' });
      p.set(24, 23, '#ffd6e2');
      for (const [x, y] of [[14, 8], [13, 9], [15, 9], [14, 10]]) p.set(x, y, '#ffffff');
      p.rect(8, 50, 32, 9, '#e0a014'); p.hline(8, 50, 32, '#ffe38a'); p.hline(8, 57, 32, '#a8730c');
      p.rect(4, 58, 40, 4, '#c98f24'); p.hline(4, 58, 40, '#ffd23f'); p.hline(4, 61, 40, '#8c6410');
      for (const [x, y] of [[12, 53], [24, 53], [36, 53]]) stamp(p, ['.c.', 'cec', '.c.'], x - 1, y - 1, { c: '#ffe38a', e: '#fff6d0' });
      return p.outlined(K);
    }
    if (kind === 'egg') { // 3x3: the palace's jewelled egg, as the close-up shows it
      p = new Pix(48, 62);
      // enamel: pale blue-white, lit from the top-left
      ball(p, 7, 1, 34, 52, '#ffffff', '#dfeaf8', '#a8bcd6', 0.22);
      for (let y = 4; y < 50; y++)
        for (let x = 7; x < 41; x++) {
          if (!p.solid(x, y)) continue;
          if (!p.solid(x - 1, y)) { p.set(x, y, '#c2d2e8'); if (p.solid(x + 1, y)) p.set(x + 1, y, '#ffffff'); }
          if (!p.solid(x + 1, y)) { p.set(x, y, '#8fa4c0'); if (p.solid(x - 1, y)) p.set(x - 1, y, '#b9c9e0'); }
        }
      stamp(p, ['.ww.', 'wwww', '.ww.'], 13, 8, { w: '#ffffff' });
      // the gold crown of scrolls over the shoulder of the egg
      const gold = '#ffd23f', goldL = '#fff3c0', goldD = '#c8860c';
      for (const [x, y] of [[20, 5], [21, 4], [22, 4], [25, 4], [26, 4], [27, 5]]) { p.set(x, y, gold); p.set(x, y - 1, goldL); }
      for (const [x, y, d] of [[17, 8, -1], [30, 8, 1]]) {
        for (let n = 0; n < 5; n++) { p.set(x + d * n, 8 + (n > 2 ? 1 : 0), gold); p.set(x + d * n, 9 + (n > 2 ? 1 : 0), goldD); }
        p.set(x + d * 5, 10, goldL); p.set(x + d * 5, 11, gold);
      }
      p.hline(18, 12, 12, gold); p.hline(18, 13, 12, goldD);
      // the portrait window: a gold ring round warm cream, with a little figure in it
      ball(p, 13, 17, 22, 20, goldL, gold, goldD, 0.2);
      ball(p, 15, 19, 18, 16, '#fff0cc', '#ffd9a0', '#e0a86a', 0.2);
      stamp(p, [
        '..dddd..',
        '.dddddd.',
        'ddssssdd',
        'dskssksd',
        '.sssrss.',
        '..wwww..',
        '.wwrrww.',
      ], 20, 21, { d: '#3a3350', s: '#ffe0c8', k: '#1c1830', w: '#ffffff', r: '#e8384f' });
      p.set(22, 22, '#5a5270'); p.set(27, 26, '#f0c8ae');
      // filigree under the window, and a pair of scrolls at the sides
      for (const [x, d] of [[15, -1], [33, 1]]) {
        for (let n = 0; n < 4; n++) p.set(x + d * n, 38 + n, gold);
        p.set(x + d * 4, 41, goldL); p.set(x + d * 3, 43, goldD);
      }
      p.hline(19, 40, 10, gold); p.hline(19, 41, 10, goldD);
      stamp(p, ['.g.', 'glg', '.g.'], 23, 43, { g: gold, l: goldL });
      // two little white birds at its foot
      const bird = (x, flip) => {
        const b = new Pix(9, 9);
        ball(b, 0, 3, 8, 6, '#ffffff', '#eef3fa', '#c2cede');
        ball(b, 4, 0, 5, 5, '#ffffff', '#f4f8ff', '#c2cede');
        b.set(7, 2, '#ff9a2e'); b.set(6, 1, '#2a1b30');
        p.blit(b.outlined('#8fa4c0'), x, 48, flip);
      };
      bird(4, false); bird(35, true);
      // the stand
      p.rect(14, 53, 20, 5, '#c98f24'); p.hline(14, 53, 20, '#ffe38a'); p.hline(14, 57, 20, '#8c6410');
      p.rect(10, 58, 28, 4, '#a8722c'); p.hline(10, 58, 28, '#ffd23f'); p.hline(10, 61, 28, '#6d4a12');
      return p.outlined(K);
    }
    return null;
  }

  // strawberry-milk checker with tiny bunnies (menu backgrounds), 32x32
  // menu backdrop like the original game's: a pink checkerboard with little white bunny heads
  function buildBgTile() {
    const p = new Pix(32, 32);
    p.rect(0, 0, 32, 32, '#ffe8ef');
    p.rect(0, 0, 16, 16, '#ffd0dd'); p.rect(16, 16, 16, 16, '#ffd0dd');
    const bunny = ['..ooo..ooo..', '..oio..oio..', '..oio..oio..', '.oowoooowoo.', 'owwwwwwwwwwo', 'owweewweewwo', 'owwpwnnwpwwo', '.owwwwwwwwo.', '..oooooooo..'];
    const pal = { o: '#e89ab4', i: '#ffb6cc', w: '#ffffff', e: '#c86a90', n: '#ff8aa8', p: '#ffd0dc' };
    stamp(p, bunny, 2, 4, pal);
    stamp(p, bunny, 18, 20, pal);
    return p;
  }

  // ---------------------------------------------------------------- effects
  function buildStar(f) { // dizzy star 5x5
    return fromRows([['..y..', '.yyy.', 'yywyy', '.yyy.', '..y..'], ['.....', '..y..', '.ywy.', '..y..', '.....']][f % 2], { y: '#ffd23f', w: '#ffffff' });
  }
  function buildHeartFx() {
    return fromRows(['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'], { r: '#ff6f91' });
  }
  function buildSparkle(f) {
    return fromRows([['..w..', '..w..', 'ww.ww', '..w..', '..w..'], ['.....', '..w..', '.w.w.', '..w..', '.....'], ['w...w', '.....', '..w..', '.....', 'w...w']][f % 3], { w: '#ffffff' });
  }
  function buildPuff(f) {
    const p = new Pix(16, 16);
    const sets = [
      [[8, 8, 4]],
      [[6, 9, 4], [10, 8, 4], [8, 5, 3]],
      [[4, 9, 4], [12, 9, 4], [8, 4, 4], [8, 11, 3]],
      [[3, 10, 2], [13, 10, 2], [8, 2, 2], [10, 13, 2], [5, 4, 2]],
    ][f % 4];
    for (const [x, y, r] of sets) ball(p, x - r, y - r, r * 2, r * 2, '#ffffff', '#ece8f6', '#c2bcd6');
    return p;
  }
  function buildSlash(f) { // katana arc 24x24 (facing right)
    const p = new Pix(24, 24);
    const a0 = -1.3 + f * 0.7, a1 = a0 + 1.6;
    for (let t = 0; t < 40; t++) {
      const a = a0 + (a1 - a0) * (t / 39);
      for (let r = 7; r < 11; r++) {
        const x = Math.round(12 + Math.cos(a) * r), y = Math.round(12 + Math.sin(a) * r);
        p.set(x, y, r > 9 ? '#bdd2ef' : '#ffffff');
      }
    }
    return p;
  }
  // ---- room effects: what the maids' reactions and gifts throw into the air
  const FX_ROWS = {
    flame: [
      ['..o..', '..o..', '.oyo.', '.oyo.', 'oywyo', 'oywyo', '.rrr.'],
      ['.o...', '.oo..', '.oyo.', 'oyyo.', 'oywyo', 'oywyo', '.rrr.'],
      ['.....', '..o..', '..o..', '.oyo.', 'oywyo', 'oyyyo', '.rrr.'],
    ],
    bubble: [
      ['.bbb.', 'bw..b', 'b...b', 'b...b', '.bbb.'],
      ['..bbb..', '.bw..b.', 'bw....b', 'b.....b', 'b.....b', '.b...b.', '..bbb..'],
    ],
    snow: [
      ['..w..', 'w.w.w', '.wbw.', 'w.w.w', '..w..'],
      ['.....', '..w..', '.wbw.', '..w..', '.....'],
    ],
    petal: [['.pp', 'pPp', 'pp.'], ['pp.', 'pPp', '.pp'], ['.p.', 'pPp', '.p.']],
    blossom: [['.pp.', 'pyyp', 'pyyp', '.pp.']],
    glint: [
      ['...w...', '...w...', '..wyw..', 'wwyWyww', '..wyw..', '...w...', '...w...'],
      ['.......', '...w...', '...w...', '.wwWww.', '...w...', '...w...', '.......'],
    ],
  };
  const FX_PAL = {
    flame: { w: '#fff6c0', y: '#ffd23f', o: '#ff8a2a', r: '#d8402a' },
    bubble: { b: '#ffb8d8', w: '#ffffff' },
    snow: { w: '#ffffff', b: '#9fd8ff' },
    rose: { p: '#ec3d5f', P: '#ff8aa8' },
    sakura: { p: '#ffc8dc', P: '#ffffff' },
    night: { p: '#4a1030', P: '#a01a48' },
    blossom: { p: '#ffb0cc', y: '#ffd23f' },
    glint: { w: '#ffffff', y: '#fff3a0', W: '#ffffff' },
  };
  const fxRows = (key, pal) => FX_ROWS[key].map((rows) => fromRows(rows, FX_PAL[pal || key]));
  // a big outlined heart for the moments that deserve one
  function buildBigHeart(col, dark) {
    const p = fromRows(['...........', '..rrr.rrr..', '.rrwrrrrrR.', '.rwrrrrrrR.', '.rrrrrrrRR.', '..rrrrrRR..', '...rrrRR...', '....rRR....', '.....R.....', '...........'], { r: col, R: dark, w: '#ffffff' });
    return p.outlined('#2a1b30');
  }
  // the wrapped present that comes down to her before she opens it (closed, then opened with the lid off)
  const GIFTBOX_PAL = { p: '#ff9fbb', P: '#e2769c', L: '#ffd6e2', r: '#ec3d5f', R: '#a51f40', d: '#7a2848' };
  const GIFTBOX_BODY = ['..pLpprrpppp..', '..pLpprrpppp..', '..ppppRRppPp..', '..ppppRRppPp..', '..ppppRRpPPp..', '..PPPPRRPPPP..', '..............'];
  function buildGiftBox(open) {
    const top = open
      ? ['..............', '..............', '..............', '..............', '..............', '..............', '..dddddddddd..']
      : ['..............', '....rr..rr....', '...rRRrrRRr...', '....rrrrrr....', '.LLLLLrrLLLLL.', '.pppppRRppppp.', '..PPPPrrPPPP..'];
    return fromRows(top.concat(GIFTBOX_BODY), GIFTBOX_PAL).outlined('#2a1b30');
  }
  function buildGiftLid() {
    return fromRows(['..............', '....rr..rr....', '...rRRrrRRr...', '....rrrrrr....', '.LLLLLrrLLLLL.', '.pppppRRppppp.', '..............'], GIFTBOX_PAL).outlined('#2a1b30');
  }
  // a grey little cloud for a gift that did not land
  function buildGloom() {
    return fromRows(['...........', '....ggg....', '..ggGGGgg..', '.gGGGGGGGg.', '.gGGGGGGGg.', '..ggggggg..', '...........'], { g: '#8a8aa0', G: '#b8b8cc' }).outlined('#2a1b30');
  }
  // how she felt about a gift, shown beside it in the menus once you know
  const TASTE_ROWS = {
    love: ['.rr.rr.', 'rwrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
    like: ['.pp.pp.', 'pwppppp', 'ppppppp', '.ppppp.', '..ppp..', '...p...'],
    normal: ['..ggg..', '.g...g.', 'g.....g', 'g.....g', '.g...g.', '..ggg..'],
    meh: ['...b...', '..bb...', '.bbbb..', '.bwbb..', '.bbbb..', '..bb...'],
    unknown: ['..kkk..', '.k...k.', '....k..', '...k...', '.......', '...k...'],
  };
  const TASTE_PAL = { r: '#ec3d5f', p: '#ff9fbb', w: '#ffffff', g: '#9a8ab0', b: '#3d86f0', k: '#9a8ab0' };

  function burnt(pix) {
    return pix.map((c) => {
      const lum = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      if (lum > 235) return '#ffffff';
      return lum > 150 ? '#4a4458' : '#1d1a24';
    });
  }
  function tinted(pix, col, amt) {
    return pix.map((c) => mix([c[0], c[1], c[2], 255], col, amt));
  }

  // ---------------------------------------------------------------- UI icons (small)
  const UI = {
    heart: ['.kk.kk.', 'krwrrrk', 'krwrrRk', 'krrrrRk', '.krrRk.', '..krk..', '...k...'],
    heartEmpty: ['.kk.kk.', 'kddkddk', 'kdddddk', 'kdddddk', '.kdddk.', '..kdk..', '...k...'],
    coin: ['.kkkk.', 'kyeyyk', 'kewyYk', 'kyyyYk', 'kyYYYk', '.kkkk.'],
    bomb: ['....q.', '...y..', '.kkkk.', 'kdwddk', 'kddddk', 'kdddxk', '.kkkk.'],
    fire: ['..k...', '.kqk..', '.kqoyk', 'kqoywk', 'kqoywk', '.kkkk.'],
    speed: ['..kkk..', '.kcbbk.', 'kcwbbk.', 'kbbbbbk', '.kBBBBk', '..kkkk.'],
    enemy: ['.k...k.', 'kgk.kgk', 'kgggggk', 'kgwgwgk', 'khhhhhk', '.kkkkk.'],
    clock: ['.kkk.', 'kwkwk', 'kwkkk', 'kwwck', '.kkk.'],
    broom: ['...k..', '...k..', '...n..', '..krk.', '.kyeyk', '.kyyYk', '.kkkkk'],
    // what she has picked up, for the HUD; the skull also floats over a cursed maid
    kick: ['.kk....', '.krk...', '.krk...', '.krRkk.', '.krrrRk', '.klwwlk', '..kkkk.'],
    pierce: ['.......', '..kkk..', 'kkkmkkk', 'qoywyoq', 'kkkzkkk', '..kkk..', '.......'],
    line: ['.q.q.q.', 'kkkkkkk', 'kwkwkwk', 'kdkdkdk', 'kkkkkkk'],
    skull: ['.kkkkk.', 'kwwwwlk', 'kwvkwvk', 'kwwwwlk', '.kwkwk.', '.kkkkk.'],
    glove: ['..kk...', '.kwwkk.', 'kwwwwlk', 'kwcwwck', 'kwbbblk', '.kkkkk.'],
  };
  const UI_PAL = Object.assign({}, ICON_PAL, { d: '#6b5a8e', g: '#a9a2c2', Y: '#e09a14' });

  // today's sky, shown beside the clock (9x9)
  const WEATHER_ICONS = {
    sun: ['...yky...', '.y.kkk.y.', '..kyyyk..', 'ykyyyyyky', '.kyyoyyk.', 'ykyyyyyky', '..kyyyk..', '.y.kkk.y.', '...yky...'],
    cloud: ['.........', '...kkk...', '..kwwwkk.', '.kwwwwwwk', 'kwwwwwwwk', 'kwcwwcwwk', '.kkkkkkk.', '.........', '.........'],
    rain: ['...kkk...', '..kwwwkk.', '.kwwwwwwk', 'kwcwwcwwk', '.kkkkkkk.', '..b..b..b', '.b..b..b.', 'b..b..b..', '.........'],
    snow: ['...kkk...', '..kwwwkk.', '.kwwwwwwk', 'kwcwwcwwk', '.kkkkkkk.', '..s..s..s', '.s..s..s.', 's..s..s..', '.........'],
    petal: ['...yky...', '.y.kkk.y.', '..kyyyk..', 'ykyyyyyky', '.kyyyyk..', '.pkyyk.p.', 'p..pp....', '...p..p..', '.p.....p.'],
    storm: ['...kkk...', '..kgggkk.', '.kgggggdk', 'kgcggcggk', '.kkkkkkk.', '....ky...', '...ky....', '..kyyy...', '....ky...'],
  };
  const WEATHER_PAL = { k: '#2a1b30', y: '#ffd23f', o: '#f5921e', w: '#ffffff', c: '#c9d6e8', g: '#a9a2c2', d: '#6b5a8e', b: '#4d93d6', s: '#e6f4ff', p: '#ff9fbb' };

  // ---------------------------------------------------------------- pixel font 5x7 (ASCII subset)
  const FONT5 = {
    '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    '2': ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
    '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    ' ': ['...', '...', '...', '...', '...', '...', '...'],
    '.': ['.', '.', '.', '.', '.', '#', '#'],
    ',': ['..', '..', '..', '..', '..', '.#', '#.'],
    ':': ['.', '#', '#', '.', '#', '#', '.'],
    '!': ['#', '#', '#', '#', '#', '.', '#'],
    '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
    '-': ['....', '....', '....', '####', '....', '....', '....'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
    '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
    '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
    '<': ['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'],
    '>': ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
    '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'],
    ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.'],
    '#': ['.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.', '.....'],
    "'": ['#', '#', '.', '.', '.', '.', '.'],
    '&': ['.##..', '#..#.', '.##..', '.#..#', '#.##.', '#..#.', '.##.#'],
    // lowercase (rows 7-8 are descenders)
    a: ['....', '....', '.##.', '...#', '.###', '#..#', '.###'],
    b: ['#...', '#...', '###.', '#..#', '#..#', '#..#', '###.'],
    c: ['...', '...', '.##', '#..', '#..', '#..', '.##'],
    d: ['...#', '...#', '.###', '#..#', '#..#', '#..#', '.###'],
    e: ['....', '....', '.##.', '#..#', '####', '#...', '.###'],
    f: ['..#', '.#.', '###', '.#.', '.#.', '.#.', '.#.'],
    g: ['....', '....', '.###', '#..#', '#..#', '#..#', '.###', '...#', '.##.'],
    h: ['#...', '#...', '###.', '#..#', '#..#', '#..#', '#..#'],
    i: ['#', '.', '#', '#', '#', '#', '#'],
    j: ['..#', '...', '..#', '..#', '..#', '..#', '..#', '#.#', '.#.'],
    k: ['#...', '#...', '#..#', '#.#.', '##..', '#.#.', '#..#'],
    l: ['#.', '#.', '#.', '#.', '#.', '#.', '.#'],
    m: ['.....', '.....', '####.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
    n: ['....', '....', '###.', '#..#', '#..#', '#..#', '#..#'],
    o: ['....', '....', '.##.', '#..#', '#..#', '#..#', '.##.'],
    p: ['....', '....', '###.', '#..#', '#..#', '#..#', '###.', '#...', '#...'],
    q: ['....', '....', '.###', '#..#', '#..#', '#..#', '.###', '...#', '...#'],
    r: ['....', '....', '#.##', '##..', '#...', '#...', '#...'],
    s: ['....', '....', '.###', '#...', '.##.', '...#', '###.'],
    t: ['.#..', '.#..', '###.', '.#..', '.#..', '.#..', '..##'],
    u: ['....', '....', '#..#', '#..#', '#..#', '#..#', '.###'],
    v: ['.....', '.....', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
    w: ['.....', '.....', '#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
    y: ['....', '....', '#..#', '#..#', '#..#', '#..#', '.###', '...#', '.##.'],
    z: ['....', '....', '####', '...#', '.##.', '#...', '####'],
    '"': ['#.#', '#.#', '...', '...', '...', '...', '...'],
    ';': ['..', '..', '.#', '..', '..', '.#', '#.'],
    '=': ['....', '....', '####', '....', '####', '....', '....'],
    '[': ['##', '#.', '#.', '#.', '#.', '#.', '##'],
    ']': ['##', '.#', '.#', '.#', '.#', '.#', '##'],
    '~': ['....', '....', '....', '.#.#', '#.#.', '....', '....'],
    '_': ['....', '....', '....', '....', '....', '....', '####'],
    '|': ['#', '#', '#', '#', '#', '#', '#'],
    '$': ['.###.', '#.#..', '.###.', '..#.#', '.###.', '..#..', '.....'],
    '…': ['.....', '.....', '.....', '.....', '.....', '.....', '#.#.#'],
    '♪': ['..#.', '..##', '..#.', '..#.', '###.', '###.', '....'],
    '♥': ['.....', '##.##', '#####', '#####', '.###.', '..#..', '.....'],
    '★': ['..#..', '..#..', '#####', '.###.', '.#.#.', '#...#', '.....'],
    '→': ['.....', '..#..', '...#.', '#####', '...#.', '..#..', '.....'],
    '←': ['.....', '..#..', '.#...', '#####', '.#...', '..#..', '.....'],
    '↑': ['..#..', '.###.', '#.#.#', '..#..', '..#..', '..#..', '.....'],
    '↓': ['..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..', '.....'],
    '▼': ['.....', '.....', '#####', '.###.', '..#..', '.....', '.....'],
    '▲': ['.....', '.....', '..#..', '.###.', '#####', '.....', '.....'],
    '◀': ['...#', '..##', '.###', '####', '.###', '..##', '...#'],
    '▶': ['#...', '##..', '###.', '####', '###.', '##..', '#...'],
    '・': ['.', '.', '.', '#', '.', '.', '.'],
    '◇': ['.....', '..#..', '.#.#.', '#...#', '.#.#.', '..#..', '.....'],
  };
  const FONT3 = {
    '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'],
    '3': ['###', '..#', '.##', '..#', '###'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
    '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'],
    '9': ['###', '#.#', '###', '..#', '###'], x: ['...', '#.#', '.#.', '#.#', '...'], ':': ['.', '#', '.', '#', '.'], ' ': ['.', '.', '.', '.', '.'],
    '/': ['..#', '..#', '.#.', '#..', '#..'], '-': ['...', '...', '###', '...', '...'], '+': ['...', '.#.', '###', '.#.', '...'],
  };

  // ---------------------------------------------------------------- room: cursor, emotes, props
  // The glove, in the original's style: a black silhouette, white shaded in four greys lit from the top-left, a rolled
  // cuff with its dark opening. Drawn the way pixel artists draw small hands: a mitten first (fingers read from notches
  // and short separators that stop at the knuckles), index finger and thumb carrying the pose, each plane one solid
  // tone with a clustered shadow side, inner lines dark grey, and fingers that bend toward the viewer a tone darker.
  // point is the pointer (fingertip hot spot at x 6); pat0/pat1 pat her hair from the upper right with the fingers
  // curling over it; poke reaches for her cheek; open is the high-five palm; tickle0/1 wiggle.
  const GLOVE_PAL = { k: '#000000', w: '#ffffff', l: '#e1e1e1', m: '#c0bebe', d: '#989898', D: '#555555' };
  const GLOVE = {
    point: [
      '.....kk.............',
      '....kwwk............',
      '...kwwwlk...........',
      '...kwwwlk...........',
      '...kwwwlk...........',
      '...kwwwlk...........',
      '...kwwwlk...........',
      '...kwwwlkkkk.kk.....',
      '...kwwwldwwwkwwk....',
      '...kwwwldwwldwwwkkk.',
      '...kwwwldwwldwwldwwk',
      '.kkkdwwldwwldwwldwlk',
      'kwwwwdwldwwldwwldwlk',
      'kwwwwwddwwwwwwwwwllk',
      'kwwwwwwwwwwwwwwllllk',
      '.kkwwwwwwwwwwwllllk.',
      '...kwwwwwwwwwlllmmk.',
      '....kkwwwwwllllmmk..',
      '.....kdddddddddmk...',
      '....kwwwwwwwwwwk....',
      '...kwwwwwwwwwwwwk...',
      '...kwwwwwwwwwwlmk...',
      '....kwlllllllllk....',
      '.....kkkkkkkkkk.....',
      '....................',
    ],
    open: [
      '........kk..kkk........',
      '.......kwwkkwwwk.......',
      '......kwwwldwwwk.......',
      '...kkkkwwwldwwlk.kk....',
      '..kwwwdwwwdwwwlkkwwk...',
      '..kwwwdwwwdwwwldwwwlk..',
      '..kwwwwdwwdwwwldwwwlk..',
      '..kwwwwdwwdwwwdwwwlk...',
      '...kwwwdwwdwwwdwwwlk...',
      '..kkdwwdwwwwwwwwwllk...',
      '.kwwdwwwwwwwwwwwwlk....',
      'kwwwwdwwwwwwwwwwwlk....',
      'kwwwwwwwwwwwwwwwwlk....',
      '.kwwwwwwwwwwwwwwwlk....',
      '..kwwwwwwwwwwwwwwlk....',
      '..kwwwwwwwwwwwwwllk....',
      '...kwwwwwwwwwwllllk....',
      '....kwwwwwwwwlllllk....',
      '.....kdddddddddddk.....',
      '.....kwwwwwwwwwwwk.....',
      '....kwwwwwwwwwwwwwk....',
      '....kwwwwwwwwwwwmmk....',
      '....kwwlllllllllmmk....',
      '.....kmmmmmmmmmmmk.....',
      '......kkkkkkkkkkk......',
    ],
    poke: [
      '...........................',
      '.....................kkk...',
      '....................kwwwk..',
      '.............kkkkkkkwwwwwk.',
      '..kkkkkkkkkkkwwwwwwdwwwlmk.',
      '.kwwwwwwwwwwwwwwwwwdwwwlmk.',
      'kwwwwwwwwwwwwwwwwwwdwwwlmk.',
      'kwwwwwwwwwddddddddddwwwlmk.',
      '.kwlllllldwwwwwwwwwdwwwlmk.',
      '..kkkkkkkkwwwwwwwwwdwwwlmk.',
      '.........kwlllllllldwwwlmk.',
      '..........kkddddddddwwwlmk.',
      '...........kllllllldwwwlmk.',
      '...........kkddllmkkwwwlk..',
      '............kllllmk.kkkk...',
      '.............kkkkk.........',
      '...........................',
    ],
    pat0: [
      '............................',
      '............................',
      '..........kkkkkkkkkk........',
      '........kkwwwwwwwwwwkk......',
      '......kkwwwwwwwwwwwwwkk.....',
      '....kkllwwwwwwwwwwwwdwwk....',
      '...klldlwwwwwwwwwwwdwwwwk...',
      '..klldwwwwwwwwwwwwdwwwwlk...',
      '..kddllwwwwwwwwwwwdwwwwllk..',
      '..klllldwwwwwwwwwwdwwwwllk..',
      '.klllddwwwwwwwwwwwldwwwwlk..',
      '.klldllwwwwwwdddllldwwwwllk.',
      '.kldlllldwwwdwwwdlldwwwwllk.',
      '..klllldwwwdwwwwdllkkwwwDDk.',
      '.klllldllwdwwwllkkk.kwwDkDk.',
      '.kllldllldllwllk....kwwkkkk.',
      '..kldlllldllllk......kwDkk..',
      '...kkllldllllk........kDDD..',
      '....kllldkllmk..............',
      '.....kkkk.kkk...............',
      '............................',
    ],
    pat1: [
      '............................',
      '............................',
      '........kkkkkkkkkkkk........',
      '....kkkkwwwwwwwwwwwwkk......',
      '...kllllwwwwwwwwwwwwwkk.....',
      '..klddddwwwwwwwwwwwwdwwk....',
      '..kdlllwwwwwwwwwwwwdwwwwk...',
      '.klllllwwwwwwwwwwwdwwwwlk...',
      'klllldddwwwwwwwwwwdwwwwllk..',
      '.kdddllwwwwwwwwwwwdwwwwllk..',
      '.klllllwdwwwwddwwwldwwwwlk..',
      '.kllllddwwwwdwwdllldwwwwllk.',
      '.kllddllwwddwwwwdlldwwwwllk.',
      '.kldllllldllwwwwdllkkwwwDDk.',
      '..kklllldlllwwwwkkk.kwwDkDk.',
      '...kllmmdlllllkk....kwwkkkk.',
      '...klldkkllldk.......kwDkk..',
      '....kkk..kkkk.........kDDD..',
      '............................',
      '............................',
      '............................',
    ],
    tickle0: [
      '.......kkkkkkkkk.......',
      '.....kkwwwwwwwwwkk.....',
      '....kwwwwwwwwwwwwlk....',
      '....kwwwwwwwwwwwllk....',
      '....kwwlllllllllllk....',
      '.....klllllllllllk.....',
      '....kdddddddddddddk....',
      '...kkwwwwwwwwwwwwwk....',
      '..kwwwwwwwwwwwwwwwlk...',
      '..kwwwwwwwwwwwwwlllk...',
      '.kllwwwwwwwwwwwllmk....',
      '.kllmdwwwwwwwlllmmk....',
      '.kllmdlwwwwwlllllmk....',
      'klllmdldlllllldllmk....',
      'kllldlldllldlldllmk....',
      '.kkkklldllmdlldllmk....',
      '....klldllmdllmdldk....',
      '....klllkkkkllmkkk.....',
      '....kllk...kllk........',
      '.....kk.....kk.........',
      '.......................',
    ],
    tickle1: [
      '.......kkkkkkkkk.......',
      '.....kkwwwwwwwwwkk.....',
      '....kwwwwwwwwwwwwlk....',
      '....kwwwwwwwwwwwllk....',
      '....kwwlllllllllllk....',
      '.....klllllllllllk.....',
      '....kdddddddddddddk....',
      '...kkwwwwwwwwwwwwwk....',
      '..kwwwwwwwwwwwwwwwlk...',
      '..kwwwwwwwwwwwwwlllk...',
      '.kllwwwwwwwwwwwllmk....',
      '.kllmdwwwwwwwlllmmk....',
      '.kllmdlwwwwwlllllmk....',
      'klllmdldlllllldllmk....',
      'kllldlldllldlldllmk....',
      '.kkkklldllldlldllmk....',
      '....klldllmdlldllmk....',
      '.....kkkllmkkkkllmk....',
      '.......kllmk...kldk....',
      '........kkk.....kk.....',
      '.......................',
    ],
  };
  const glovePose = (k) => fromRows(rowsW(GLOVE[k], 'glove ' + k, GLOVE[k][0].length), GLOVE_PAL);
  const EMOTE_BUBBLE = ['.kkkkkkkkk.', 'kwwwwwwwwwk', 'kwwwwwwwwwk', 'kwwwwwwwwwk', 'kwwwwwwwwwk', 'kwwwwwwwwwk', 'kwwwwwwwwwk', '.kkkkwkkkk.', '....kwk....', '.....k.....'];
  const EMOTES = {
    heart: ['.rr.rr.', 'rrrrrrr', 'rrwrrrr', '.rrrrr.', '..rrr..', '...r...'],
    note: ['...kkk.', '...k.k.', '...k.k.', '.kkk.k.', 'kkkk.k.', '.kk....'],
    anger: ['.r...r.', 'rr...rr', '.......', '.......', 'rr...rr', '.r...r.'],
    sweat: ['...b...', '..bb...', '.bbbb..', '.bwbb..', '.bbbb..', '..bb...'],
    dots: ['.......', '.......', '.......', 'k.k.k..', '.......', '.......'],
    exclaim: ['...r...', '...r...', '...r...', '...r...', '.......', '...r...'],
    zzz: ['bbbb...', '..b....', '.b..bbb', 'bbbb.b.', '....b..', '....bbb'],
    question: ['..kkk..', '.k...k.', '....k..', '...k...', '.......', '...k...'],
    sparkle: ['...y...', '..yyy..', 'yyywyyy', '..yyy..', '...y...', '.......'],
  };
  function buildEmote(key) {
    const p = fromRows(EMOTE_BUBBLE, { k: K, w: '#ffffff' });
    stamp(p, EMOTES[key], 2, 1, { k: K, r: '#ec3d5f', b: '#3d86f0', w: '#ffffff', y: '#ffc53a' });
    return p;
  }
  // Honey's little pet bunny (9x12), in the style of the original's white rabbit: black outline, white fur shaded pale
  // blue, red eyes, pink inner ears and a red bow between the ears. Frame 0 sits; frame 1 is mid-hop, stretched with the ears swept back.
  const BUNNY_PAL = { k: K, W: '#ffffff', l: '#d8e8f8', m: '#a8bcd8', n: '#ffb0c4', p: '#ffc8d8', R: '#c0102a', r: '#ff4a6a', b: '#e8203c', B: '#9a1020' };
  const BUNNY = [
    ['.kk...kk.', 'kWnk.knWk', 'kWnkbknWk', '.kWkBkWk.', '.kWWWWWk.', 'kWWWWWWlk', 'kWRWWWRlk', 'kpWWrWWpk', '.klWWWlk.', '.kWWllmk.', '.kWlkmmk.', '..kk.kk..'],
    ['kk.....kk', 'kWnk.knWk', '.kWnbnWk.', '..kkBkk..', '.kWWWWWk.', 'kWWWWWWlk', 'kWRWWWRlk', 'kpWWrWWpk', '.klWWWlk.', '.kWWllmk.', '..kWlmk..', '...k.k...'],
  ];
  function buildProp(kind) {
    if (kind === 'broom') {
      const p = new Pix(8, 18);
      p.rect(3, 0, 1, 11, '#8a5a3c'); p.rect(4, 0, 1, 11, '#b07a4f');
      p.rect(1, 11, 6, 2, '#ec3d5f');
      for (let i = 0; i < 6; i++) p.rect(1 + i, 13, 1, 4 + (i % 2), i % 2 ? '#e0a014' : '#ffd23f');
      return p.outlined(K);
    }
    if (kind === 'vacuum') { // Berry's cyclone vacuum from her design sheet
      const p = new Pix(12, 22);
      p.rect(5, 0, 2, 9, '#8d93ad'); p.rect(4, 0, 4, 3, '#ec3d5f');
      ball(p, 1, 5, 10, 9, '#fff0a0', '#ffc53a', '#c47f16');
      p.rect(4, 8, 4, 4, '#dfe9f5'); p.set(5, 9, '#ffffff');
      p.rect(5, 14, 2, 4, '#8d93ad');
      p.rect(0, 17, 12, 4, '#6f7690'); p.hline(0, 17, 12, '#b9bfd3'); p.hline(1, 20, 10, '#474c63');
      return p.outlined(K);
    }
    if (kind === 'cushion') { // floor cushion the maids sit on
      const p = new Pix(16, 8);
      ball(p, 0, 1, 16, 7, '#ffe0ea', '#ff9fbb', '#e2769c');
      stamp(p, ['r.r', 'rrr', '.r.'], 7, 2, { r: '#ec3d5f' });
      return p.outlined(K);
    }
    if (kind === 'book') {
      const p = new Pix(10, 8);
      p.rect(1, 1, 8, 6, '#3d86f0'); p.rect(2, 2, 3, 4, '#ffffff'); p.rect(5, 2, 3, 4, '#f4f0fa'); p.vline(5, 1, 6, '#1f3b8f');
      return p.outlined(K);
    }
    if (kind === 'cup') {
      const p = new Pix(8, 8);
      p.rect(1, 2, 5, 4, '#ffffff'); p.rect(2, 2, 3, 1, '#c98a5a'); p.rect(6, 3, 1, 2, '#ffffff');
      return p.outlined(K);
    }
    if (kind === 'mat') { // door mat with the exit arrow
      const p = new Pix(24, 14);
      p.rect(1, 1, 22, 12, '#9c5f3a'); p.rect(2, 2, 20, 10, '#c9955a');
      stamp(p, ['rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], 8, 4, { r: '#ec3d5f' });
      return p.outlined(K);
    }
    return null;
  }

  // gift icons 16x16
  function buildGift(id) {
    const p = new Pix(16, 16);
    switch (id) {
      case 'daifuku':
        ball(p, 2, 5, 12, 9, '#ffffff', '#fff0f4', '#e8c8d4');
        ball(p, 6, 2, 5, 5, '#ff9aae', '#ec3d5f', '#a51f40');
        p.set(8, 2, '#4cb84c');
        break;
      case 'matcha':
        p.rect(2, 6, 12, 8, '#4c8f3a'); p.rect(2, 6, 12, 2, '#7fbf5a'); p.rect(2, 12, 12, 2, '#2f6a28');
        p.rect(4, 3, 8, 3, '#d8c9a0');
        break;
      case 'honeycake':
        p.rect(2, 7, 12, 7, '#f5c05a'); p.rect(2, 10, 12, 1, '#fff0c8'); p.rect(2, 5, 12, 3, '#ffe38a');
        p.set(5, 5, '#ffffff'); p.set(9, 6, '#e09a14'); p.rect(7, 2, 2, 3, '#ffd23f');
        break;
      case 'icecream':
        for (let j = 0; j < 7; j++) {
          const half = Math.max(1, Math.round(((7 - j) * 4) / 7));
          for (let x = 8 - half; x < 8 + half; x++) p.set(x, 8 + j, (x + j) % 3 ? '#e0a262' : '#b8763c');
        }
        ball(p, 3, 1, 10, 9, '#ffffff', '#fff6e0', '#e8d6b0');
        p.set(9, 3, '#ec3d5f');
        break;
      case 'bouquet':
        tri(p, 5, 9, 6, 7, '#b8f28a');
        p.rect(4, 10, 8, 2, '#ff6f91');
        for (const [x, y] of [[3, 3], [8, 2], [6, 6], [10, 5]]) { ball(p, x, y, 5, 5, '#ff9aae', '#ec3d5f', '#a51f40'); }
        break;
      case 'drink': // sports drink: a clear bottle of pale blue, blue cap, a label with a white wave
        stamp(p, [
          '......cCCc......',
          '......cCCc......',
          '......gwgg......',
          '.....gwGGGg.....',
          '....gwGGGGGD....',
          '....gwGGGGGD....',
          '....llllllll....',
          '....lwwwlllL....',
          '....llwwwwlL....',
          '....lllllwwL....',
          '....llllllll....',
          '....gwGGGGGD....',
          '....gwGGGGGD....',
          '....gGGGGGDD....',
        ], 0, 1, { c: '#2f6fd8', C: '#6aa8ff', g: '#dff5ff', G: '#9fdcff', D: '#5aaee8', w: '#ffffff', l: '#3d86f0', L: '#2a5cc0' });
        break;
      case 'novel': // a mystery novel: navy cloth cover, gold title band and magnifier, cream page block
        stamp(p, [
          '..dNNNNNNNNNp...',
          '..dnnnnnnnnnpP..',
          '..dnyyyyyyynpP..',
          '..dnnnnnnnnnpP..',
          '..dnnnwwwnnnpP..',
          '..dnnwgggwnnpP..',
          '..dnnwgGgwnnpP..',
          '..dnnnwwwnnnpP..',
          '..dnnnnnnYnnpP..',
          '..dnnnnnnnYnpP..',
          '..dnnnnnnnnnpP..',
          '..dnnnnnnnnnpP..',
          '...PPPPPPPPPPP..',
        ], 0, 2, { d: '#141c48', N: '#5a6ac0', n: '#2a3a88', y: '#ffd23f', Y: '#c9920e', w: '#ffffff', g: '#bfe8ff', G: '#7fc0f0', p: '#fff4dc', P: '#d8c49a' });
        break;
      case 'charm': // omamori: a red brocade pouch with a gold crest, tied with a pale cord
        stamp(p, [
          '......cccc......',
          '.....c....c.....',
          '......cyyc......',
          '.....rryyrr.....',
          '....rLrrrrrR....',
          '....rLryyrrR....',
          '....rLyYYyrR....',
          '....rLryyrrR....',
          '....rLrrrrrR....',
          '....rLyyyyrR....',
          '....rLrrrrrR....',
          '....rLrYrYrR....',
          '....rrrrrrRR....',
          '.....RRRRRR.....',
        ], 0, 1, { r: '#ec3d5f', R: '#a51f40', L: '#ff8aa8', y: '#ffd23f', Y: '#c9920e', c: '#fff0a0' });
        break;
      case 'ribbon':
        tri(p, 1, 3, 7, 9, '#ff9fbb'); tri(p, 8, 3, 7, 9, '#ff9fbb');
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (p.solid(x, y) && x < 8) p.set(x, y, '#ff9fbb');
        p.rect(1, 4, 6, 6, '#ff9fbb'); p.rect(9, 4, 6, 6, '#ff9fbb');
        p.rect(3, 5, 2, 4, '#ffd6e2'); p.rect(11, 5, 2, 4, '#ffd6e2');
        p.rect(6, 5, 4, 5, '#ec3d5f'); p.rect(5, 10, 2, 4, '#ec3d5f'); p.rect(9, 10, 2, 4, '#ec3d5f');
        break;
    }
    return p.outlined(K);
  }

  // ---------------------------------------------------------------- room: furniture (drawn with the bottom edge on the footprint)
  // ---------------------------------------------------------------- room furniture
  // Drawn in the style of the original's room and café props: seen from above at three-quarters (a lit top over a
  // shaded front), black outlines, four-tone ramps lit from the upper left, and material detail — wood grain, fabric
  // tufting and folds, glazed bands, glass glints. Wide pieces mirror a left half and shade the right a step darker.
  // Sizes follow each piece's footprint (w x h tiles) plus how far it rises above it.
  const FURNITURE = (function () {

    const K = '#000000';
    const PAL = {
      k: K,
      // wood
      Y: '#ffe0a8', L: '#f4ac62', M: '#d8843e', D: '#a05a26', X: '#643214',
      // linen
      W: '#ffffff', w: '#eef0fa', g: '#cdd0e4', G: '#9496b4',
      // pink fabric
      P: '#ffe4ee', p: '#ffb4cc', q: '#ff86ae', Q: '#d65a8c', R: '#9a3664',
      // red
      f: '#ffc0c0', r: '#ff5a66', e: '#d8203c', E: '#8a0f28',
      // gold
      y: '#ffe666', o: '#e8a41a', O: '#9a6200',
      // blue
      a: '#eaf8ff', b: '#9cd6ff', B: '#4c9ae8', n: '#2c5aa6',
      // green
      v: '#b4ec7c', V: '#62c24c', h: '#2e8a2c', H: '#1a5418',
      // dark wood / iron
      c: '#7a4a2c', C: '#4a2a1a', s: '#b8b8c8', S: '#6c6c84',
    };
    const T = (rows) => fromRows(rows, PAL);
    const F = {};

    // single wooden bed: knobbed posts, a headboard with a carved heart, a plump pillow, the sheet folded over a quilted
    // pink blanket, and a footboard rail
    F.bed = () => T([
      '.kk..........kk.',
      'kyok.kkkkkk.kyok',
      'koOkkYLLLLMkkoOk',
      '.kLkLLeLLeMMkDk.',
      '.kLkLeeeeeeMkDk.',
      '.kMkLMeeeeMMkDk.',
      '.kMkLMMeeMMDkDk.',
      '.kMkDDDDDDDDkDk.',
      '.kkWWWWWWWWWWgkk',
      '.kwWWWWWWWWWWggk',
      '.kwWWWWWWWWWggGk',
      '.kgwWWWWWWWggGGk',
      '.kggwwwwwwgGGGGk',
      '.kWWWWWWWWWWWWgk',
      '.kggggggggggggGk',
      '.kPppppppppppqQk',
      '.kpppqpppqpppqQk',
      '.kppqpqpqpqppqQk',
      '.kpqpppqpppqpqQk',
      '.kqpppqpppqppqQk',
      '.kppppprrprrpqQk',
      '.kpppprrrrrrpqQk',
      '.kqppprrrrrrpqQk',
      '.kpqppprrrrppqQk',
      '.kppqpppprrppqQk',
      '.kpppqpppqpppqQk',
      '.kppqpqpqpqppqQk',
      '.kpqpppqpppqpqQk',
      '.kqpppqpppqppqQk',
      '.kppppppppppqqQk',
      '.kqqqqqqqqqqqQRk',
      '.kQQQQQQQQQQQRRk',
      'kyokkkkkkkkkkyok',
      'kLLLLLLLLLLLLLDk',
      'kMDDDDDDDDDDDDXk',
      '.kk..........kk.',
    ]);

    // study desk like the original's: a warm wood top with an open book, a red dome lamp glowing on its gold stand,
    // a drawer with a brass pull and sturdy legs
    F.desk = () => T([
      '..........kkk...',
      '.........krfrk..',
      '........krfrrek.',
      '........krrreek.',
      '........kkkkkkk.',
      '..........kok...',
      'kkkkkkkkkkkokkkk',
      'kYYLLLLLLkyoykDk',
      'kLWWWkWWWkoOokDk',
      'kLWgWkWgWLkkkLDk',
      'kLWWWkWWWLLLLLDk',
      'kMMMMMMMMMMMMMXk',
      'kDDDDDDDDDDDDDXk',
      'kLMMMMMMMMMMMDXk',
      'kLMkkkkkkkkkMDXk',
      'kLMkLLLyLLLkMDXk',
      'kLMkDDDDDDDkMDXk',
      'kLMMMMMMMMMMMDXk',
      'kMDDDDDDDDDDDDXk',
      'kkkkkkkkkkkkkkkk',
      'kLDk........kDXk',
      'kLDk........kDXk',
      'kMXk........kDXk',
      'kkkk........kkkk',
    ]);

    // wardrobe: a moulded crown, two panelled doors with brass knobs and a centre seam, a plinth on feet
    F.wardrobe = () => T([
      'kkkkkkkkkkkkkkkk',
      'kYYYLLLLLLLLLLDk',
      'kLLLLLLLLLLLLDXk',
      'kkkkkkkkkkkkkkkk',
      '.kLMMMMkkMMMMDk.',
      '.kLkkkkMkLkkkkDk'.slice(0, 16),
      '.kLkLLMMkLLMDkDk',
      '.kLkLMMDkLMMDkDk',
      '.kLkLMMDkLMMDkDk',
      '.kLkLMMDkLMMDkDk',
      '.kLkLMMDkLMMDkDk',
      '.kLkDDDDkDDDDkDk',
      '.kLMMMyMkMyMMMDk',
      '.kLMMMoMkMoMMMDk',
      '.kLkkkkMkMkkkkDk',
      '.kLkLMMDkLMMDkDk',
      '.kLkLMMDkLMMDkDk',
      '.kLkLMMDkLMMDkDk',
      '.kLkLMMDkLMMDkDk',
      '.kLkLMMDkLMMDkDk',
      '.kLkDDDDkDDDDkDk',
      '.kLMMMMMkMMMMMDk',
      '.kDDDDDDkDDDDDXk',
      'kkkkkkkkkkkkkkkk',
      'kLLLLLLLLLLLLLDk',
      'kDDDDDDDDDDDDDXk',
      'kXkk........kkXk',
      'kkk..........kkk',
    ].map((r) => (r.length < 16 ? r + '.'.repeat(16 - r.length) : r.slice(0, 16))));

    F.wardrobeInside = () => T([
      'XXXXXXXXXX',
      'oyyyyyyyyo',
      'XkXXXkXXkX',
      'kkkXpppbbb',
      'kWkXPpqabB',
      'kWkXppqbbB',
      'kWkXpqqbbB',
      'kkkpppqbbB',
      'kWkpPpqbaB',
      'kkkqppqBbB',
      'XXXXXXXXXX',
      'XXXXXXXXXX',
      'DDDDDDDDDD',
      'XrrXXXXyyX',
      'XeeXXXXooX',
      'XXXXXXXXXX',
      'XXXXXXXXXX',
      'XXXXXXXXXX',
    ]);

    // tea table like the original's café table: a round white cloth with a lace hem hanging over a wood rim, a little
    // vase of pink flowers in the middle, and a turned leg on a round foot
    F.teatable = () => T([
      '......kkkk......',
      '....kkqPqkkk....',
      '..kkWkpqpkWWkk..',
      '.kWWWWkhkWWWwgk.',
      'kWWWWkbabkWWwwgk',
      'kWWWWkbbBkWwwggk',
      'kwWWWWkkkWWwwggk',
      'kwwWWWWWWWwwggGk',
      '.kwwwwwwwwwggGk.',
      '.kgWkgWkgWkgWGk.',
      'kMkgkMkgkMkgkMDk',
      'kLMkkLMkkLMkkMXk',
      '.kLMk.kMk.kMkDk.',
      '..kk..kMDk..kk..',
      '......kMDk......',
      '......kMDk......',
      '.....kLMDXk.....',
      '....kLMMDDXk....',
      '....kkkkkkkk....',
      '................',
    ]);

    // bookshelf: a crowned frame, three shelves of books with lit spines and dark gaps, a little gold trophy, a stack lying
    // flat and a box, on a plinth
    const shelfRow = (inner) => 'kL' + inner + 'Dk';
    F.bookshelf = () => T([
      'kkkkkkkkkkkkkkkk',
      'kYYLLLLLLLLLLLDk',
      'kLMMMMMMMMMMMMXk',
      'kkkkkkkkkkkkkkkk',
      shelfRow('CCCCCCCCCCCC'),
      shelfRow('rCbBCCVhCpqC'),
      shelfRow('reabBCVhypqC'),
      shelfRow('reabBsVhyoqy'),
      shelfRow('reabBsVhyoqo'),
      shelfRow('EEnnnSHHOOQO'),
      'kLkkkkkkkkkkkkDk',
      shelfRow('CCCCCCCCCCCC'),
      shelfRow('CyCCCbBCrCVC'),
      shelfRow('yyyCCbBreCVh'),
      shelfRow('CoCBbbBreeVh'),
      shelfRow('CoCBbbBreeVh'),
      shelfRow('OOOnnnnEEEHH'),
      'kLkkkkkkkkkkkkDk',
      shelfRow('CCCCCCCCCCCC'),
      shelfRow('CCCCCCCkkkkC'),
      shelfRow('ppppppqkyyok'),
      shelfRow('VVVVVVhkoooO'),
      shelfRow('bbbbbbBkoooO'),
      shelfRow('QQQnnnnkkkkk'),
      'kLkkkkkkkkkkkkDk',
      'kLLLLLLLLLLLLLDk',
      'kDDDDDDDDDDDDDXk',
      'kkkkkkkkkkkkkkkk',
    ]);

    // potted plant like the original's rose: a leafy bush in clustered leaves with two pink blooms, in a glazed white
    // pot with an orange band on a saucer
    F.plant = () => T([
      '......kkk.......',
      '....kkvVVkkk....',
      '...kvVVhkvVVk...',
      '..kvVkkVVVVhVk..',
      '.kvVkqPqkVhVVhk.',
      '.kVVkqyqkVVkVhk.',
      'kvVhVkqkVVhkkVhk',
      'kVVVhVVVhVVkqPqk',
      'kVhVVVhVVhVkqyqk',
      'kVVhVVVhVVhVkqkk',
      '.khVVhVVVhVVhHk.',
      '.kHhhHhhhHhhHHk.',
      '..kkHkkhkkHkkk..',
      '....kkkhkkk.....',
      '...kWWWWWWWWk...',
      '..kWwwwwwwwwgk..',
      '..kkkkkkkkkkkk..',
      '...kWWwwwwwgk...',
      '...koyoooooOk...',
      '...kOOOOOOOOk...',
      '...kwwwwwwgGk...',
      '....kggggGGk....',
      '..kkWWWWWWWgkk..',
      '..kkkkkkkkkkkk..',
    ]);

    // bunny cushion: a round plush with long pink-lined ears, stitched eyes and cheeks, a red bow by one ear, soft shading
    F.plush = () => withBow(T([
      '....kk....kk....',
      '...kWPk..kPWk...',
      '...kWpk..kpWk...',
      '...kWpk..kpWk...',
      '...kWpkkkkpgk...',
      '..kkWWWWWWWggk..',
      '.kWWWWWWWWWwwgk.',
      'kWWWWWWWWWWWwwgk',
      'kWWWkWWWWkWWwwgk',
      'kWWWkWWWWkWWwggk',
      'kWpWWWWqWWWpwggk',
      'kWWWWWkkWWWWwggk',
      'kwWWWWWWWWWwwgGk',
      'kwWWWWWWWWWwwgGk',
      '.kwWWWWWWWwwgGk.',
      '.kwwwwwwwwwggGk.',
      '..kgwwkkwwggGk..',
      '...kkgggggGkk...',
      '.....kkkkkk.....',
      '................',
    ]));
    function withBow(p) { p.blit(fromRows(['kk.kk', 'krkek', 'kfkrk', 'kk.kk'], PAL), 10, 3); return p; }

    // floor lamp like the original's red dome lamp: a pleated shade with a lit top and gold trim, a glowing bulb, a gold
    // pole with a knot, a round weighted base
    const LAMP_ROWS = [
      '.....kkkkkk.....',
      '....kfffrrek....',
      '...kfrrrrreek...',
      '...kfrkrrkrek...',
      '..kfrrkrrkreEk..',
      '..kfrrkrrkreEk..',
      '.kfrrrkrrkrreEk.',
      '.kyyyyyyyyyyooOk',
      '..kkkkyWykkkkkk.',
      '......kyk.......',
      '......kok.......',
      '......kok.......',
      '......kok.......',
      '.....kyooOk.....',
      '......kok.......',
      '......kok.......',
      '......kok.......',
      '......kok.......',
      '......kok.......',
      '......kok.......',
      '......kok.......',
      '......kok.......',
      '.....kyooOk.....',
      '...kkLLLLDDkk...',
      '..kLLMMMMMMDXk..',
      '..kMDDDDDDDDXk..',
      '...kkkkkkkkkk...',
      '................',
    ];
    F.lamp = () => T(LAMP_ROWS);
    const UNLIT = { f: 'r', r: 'e', e: 'E', y: 'o', o: 'O', W: 'g' };
    F.lampOff = () => T(LAMP_ROWS.map((row, y) => (y > 8 ? row : row.replace(/[freyoW]/g, (ch) => UNLIT[ch]))));

    // goldfish bowl: a round glass bowl with a lip, clear glass above a lighter water line, a goldfish swimming sideways
    // with a flicking tail, bubbles and glints, on a little wood stand
    const FISHBOWL_ROWS = [
      '....kkkkkkkk....',
      '...kWaaaaaagk...',
      '..kkkkkkkkkkkk..',
      '.kaWaaaaaaaagGk.',
      'kaWaaaaaaaaaaggk',
      'kaaaaaaWaaaaaggk',
      'kWbbbbbbbbbbbbBk',
      'kbbbbbbbWbbbbBBk',
      'kbbbWbbbbbbbbBBk',
      'kbbbbOOOObbOBBnk',
      'kbbbOyoooOOoOBnk',
      'kbbbOkoooooOBBnk',
      'kbBbbOOOObbOBBnk',
      'kaBBBBBBBBBBBnnk',
      '.kBBBBBBBBBBBnk.',
      '..knnBBBBBBnnk..',
      '...kkkkkkkkkk...',
      '..kYLLLLLLLLDk..',
      '..kkDkkkkkkDkk..',
      '...kkk....kkk...',
    ];
    F.fishbowl = () => T(FISHBOWL_ROWS);
    // the same bowl with the water where the goldfish was (rows 9-12, columns 4-12), so the fish can swim on its own
    F.fishbowlEmpty = () => T(FISHBOWL_ROWS.map((row, y) => (y < 9 || y > 12 ? row : row.split('').map((ch, x) => (x >= 4 && x <= 12 && 'Ooyk'.includes(ch) ? (x === 12 ? 'B' : 'b') : ch)).join(''))));
    // the goldfish (9x4, facing left): tail straight, then flicked
    F.fish0 = () => T(['.OOOO..O.', 'OyoooOOoO', 'OkoooooO.', '.OOOO..O.']);
    F.fish1 = () => T(['.OOOO.OO.', 'OyoooOOo.', 'OkoooooO.', '.OOOO....']);


    const DARKER = { P: 'p', p: 'q', q: 'Q', Q: 'R', Y: 'L', L: 'M', M: 'D', D: 'X', W: 'w', w: 'g', g: 'G', y: 'o', o: 'O', a: 'b', b: 'B', v: 'V', V: 'h', h: 'H', f: 'r', r: 'e', e: 'E' };
    // mirror a left half into a full row; columns from shadeFrom rightwards take one step darker
    const sym = (half, shadeFrom) => {
      const right = half.split('').reverse().join('');
      const full = half + right;
      return full.split('').map((ch, x) => (x >= shadeFrom && DARKER[ch] ? DARKER[ch] : ch)).join('');
    };

    // vanity dresser: an oval gold-framed mirror with a glint, a perfume bottle and a lipstick on the lacquered top,
    // two drawers with gold pulls, turned feet
    F.dresser = () => T([
      '.....kkkkkk.....',
      '....kyyyyyyk....',
      '...kyoaWaaaok...',
      '...kyaWaaabok...',
      '..kyoaaaaabbOk..',
      '..kyoaaaabbbOk..',
      '..kyoaaabbbbOk..',
      '...kyabbbbbOk...',
      '.k.koobbbbOOk...',
      'kqk.kOOOOOOk.kk.',
      'kPpk..kook..kek.',
      'kppk.kkookk.kEk.',
      'kWWWWWWWWWWWWWgk',
      'kwwwwwwwwwwwwggk',
      'kkkkkkkkkkkkkkkk',
      'kPpkkkkkkkkkkqQk',
      'kpkPppppppppqkQk',
      'kpkppppyyppqqkQk',
      'kpkQQQQQQQQQQkQk',
      'kpkkkkkkkkkkkkQk',
      'kpkPppppppppqkQk',
      'kpkppppyyppqqkQk',
      'kpkQQQQQQQQQQkQk',
      'kpkkkkkkkkkkkkQk',
      'kQQQQQQQQQQQQQRk',
      'kkkkkkkkkkkkkkkk',
      '.kPk........kQk.',
      '.kkk........kkk.',
    ]);

    // loveseat like the original's tufted armchair, in pink: an arched back with a gold trim and buttoned tufting, rolled
    // arms, two plump seat cushions, a pleated skirt and gold feet
    F.sofa = () => {
      const p = T([
        sym('................', 20),
        sym('................', 20),
        sym('......kkkkkkkkkk', 20),
        sym('....kkyyyyyyyyyy', 20),
        sym('...kPPPPPPPPPPPP', 20),
        sym('..kPppQpppppQppp', 20),
        sym('..kPpppppQpppppp', 20),
        sym('..kppQpppppQpppp', 20),
        sym('kkkpppppQppppppQ', 20),
        sym('kPPkppQpppppQppp', 20),
        sym('kPpkqqqqqqqqqqqq', 20),
        sym('kPpkkkkkkkkkkkkk', 20),
        sym('kPpkPPPPPPPPPPPk', 20),
        sym('kppkPpppppppppqk', 20),
        sym('kppkppppppppppqk', 20),
        sym('kqqkqqqqqqqqqqqk', 20),
        sym('kQQkkkkkkkkkkkkk', 20),
        sym('kQQpqpqpqpqpqpqp', 20),
        sym('kRQQQQQQQQQQQQQQ', 20),
        sym('kkkkkkkkkkkkkkkk', 20),
        sym('..kyok..........', 20),
        sym('..kkkk..........', 20),
      ]);
      // the heart on the back that gives the sofa its name
      p.blit(fromRows(['.kk..kk.', 'kfrkkrrk', 'krrrrrek', '.krrrek.', '..krek..', '...kk...'], PAL), 12, 4);
      return p;
    };

    // gramophone like the original's: a flower-shaped gold horn with a dark throat, a black record with a red label and a
    // silver tone arm on a wooden cabinet with a brass crank, standing on legs
    F.gramophone = () => T([
      '..kkkkkkkkkkkk..',
      '.kyYyyYyyYyyyok.',
      'kyooyoOOOoyoooOk',
      'kyoOCCCCCCCOooOk',
      'kyoOCCCCCCCOooOk',
      '.kyoOCCCCCOooOk.',
      '..kyooOOOoooOk..',
      '...kkyooooOkk...',
      '.....kkyoOk.....',
      '.......kyok.....',
      '.......kook.....',
      '..kkkkkkookkkk..',
      '.kYLLLLLLLLLLLDk',
      '.kLkkkkkkkkkMDXk',
      '.kLkCCCCCCCkSDXk',
      '.kLkCCeeeCCSkDXk',
      '.kLkCCeWeCSkMDXk',
      '.kLkCCCCCCkkMDXk',
      '.kLkkkkkkkkkMDXk',
      '.kMMMMMMMMMMMDXk',
      '.kLDDDDDDDDDDDXk',
      '.kLMMkyyyykMMDXkk',
      '.kLMMkoOOOkMMDkyk',
      '.kDDDDDDDDDDDDXkk',
      '.kkkkkkkkkkkkkkk',
      '..kLk......kDk..',
      '..kMk......kDk..',
      '..kkk......kkk..',
    ].map((r) => r.slice(0, 16)));

    // upright piano: polished dark wood with highlight streaks, a music stand with a sheet of notes, candle sconces, the
    // keyboard with black keys, a carved front panel and gold pedals
    F.piano = () => T([
      sym('kkkkkkkkkkkkkkkk', 22),
      sym('kcccccccccccccCC', 22),
      sym('kcsCCCCCCCCCCCCC', 22),
      sym('kcCCCCCCCCCCCCCC', 22),
      sym('kcCykCCCkkkkkkkk', 22),
      sym('kcCokCCCkWWWWWWW', 22),
      sym('kcCCCCCCkWkWkWkW', 22),
      sym('kcsCCCCCkWWWWWWW', 22),
      sym('kcCCCCCCkWkWkWkW', 22),
      sym('kcCCCCCCkkkkkkkk', 22),
      sym('kcCCCCCCCCCCCCCC', 22),
      sym('kkkkkkkkkkkkkkkk', 22),
      sym('kcccccccccccccCC', 22),
      sym('kkkkkkkkkkkkkkkk', 22),
      sym('kWkWkkWkkWkWkkWk', 22),
      sym('kWkWkkWkkWkWkkWk', 22),
      sym('kWWWWWWWWWWWWWWW', 22),
      sym('kggggggggggggggg', 22),
      sym('kkkkkkkkkkkkkkkk', 22),
      sym('kcCCCCCCCCCCCCCC', 22),
      sym('kcCkkkkkkkkkkkkk', 22),
      sym('kcCkcccccccccccc', 22),
      sym('kcCkCCCCCCCCCCCC', 22),
      sym('kCCCCCCCCCCCkyok', 22),
      sym('kkkkkkkkkkkkkkkk', 22),
      sym('.kCk............', 22),
    ]);

    // princess bed: a canopy with a gold crown, pink drapes tied at the posts, a gold headboard, two lace pillows, a quilt
    // with a big heart and a lace hem, a gold footboard
    const princessRows = [
      '..............kk',
      '.............kyo',
      '............kyYy',
      '..........kkkyoy',
      '......kkkkPPkkyo',
      '....kkPPPPPpppkk',
      '..kkPPPppppppppp',
      '.kPPppppqppppqpp',
      'kPppqppppqppppqp',
      'kppppqQqppqQqppq',
      'kkQQkkkQQQkkkQQQ',
      'kpqkyyyyyyyyyyyy',
      'kpqkyoooooooooyo',
      'kpqkkWWWWWWWkkWW',
      'kpqkWPWWWWWWWkWW',
      'kpqkWWWWWWWwwkWW',
      'kpqkwWWWWWwwgkwW',
      'kpqkkgggggggkkgg',
      'kpqkPppppppppppp',
      'kpqkpppppqpppppp',
      'kpqkppppqpqpppqp',
      'kpqkpppqpppqppqq',
      'kpqkppqpppppqrrp',
      'kppkpqpppppprrrr',
      'kppkqppppppprrrr',
      'kqpkpqpppppprrrr',
      'kqpkppqpppppprrr',
      'kqqkpppqpppppprr',
      'kqqkppppqpppppqp',
      'kqqkpppppqpppqpq',
      'kQqkppppppqpqppp',
      'kQqkpppppppqpppp',
      'kQqkppppppppppqp',
      'kQQkWkWkWkWkWkWk',
      'kQQkwWwWwWwWwWwW',
      'kRQkkkkkkkkkkkkk',
      'kRRkyyyyyyyyyyyy',
      'kkkkyooooooooooo',
      '.kyoOOOOOOOOOOOO',
      '.kkkkkkkkkkkkkkk',
      '..kyk...........',
      '..kkk...........',
    ];
    F.princess = () => T(princessRows.map((r) => sym(r, 18)));

    // round rug: a scalloped lace border, a pink body with a dotted ring, and a heart with a glint in the middle
    // Berry's punching bag: a leather bag strapped at the waist, on a weighted stand
    F.sandbag = () => T([
      '.....kkkkkk.....',
      '....kCMMMMCk....',
      '...kMLLLLLLMk...',
      '..kMLYYLLLLLMk..',
      '..kMLYYLLLLLMk..',
      '..kMLLLLLLLLMk..',
      '..kCMMMMMMMMCk..',
      '..kMLLLLLLLLMk..',
      '..kMLLLLLLLLMk..',
      '..kMLLLLLLLLMk..',
      '..kMLLLLLLLLMk..',
      '..kCMMMMMMMMCk..',
      '..kMLLLLLLLLMk..',
      '..kMLLLLLLLLMk..',
      '..kMLLLLLLLLMk..',
      '..kMLLLLLLLLMk..',
      '...kMLLLLLLMk...',
      '....kMDDDDMk....',
      '.....kkkkkk.....',
      '......kSSk......',
      '......kSsk......',
      '......kSSk......',
      '......kSSk......',
      '......kSSk......',
      '....kkkSSkkk....',
      '...kSssssssSk...',
      '..kSssSSSSssSk..',
      '..kSSSSSSSSSSk..',
      '..kCCCCCCCCCCk..',
      '...kkkkkkkkkk...',
    ]);
    // Honey's toy chest: the lid thrown open, a bunny and blocks spilling out
    F.toybox = () => T([
      '....kk....kk....',
      '...kqPk..kbak...',
      '...kqPk..kbak...',
      '..kqPPqk.kbbak..',
      '..kqWWqkkkbbak..',
      '.kkqqqqkkkkbak..',
      'kMLLLLLLLLLLLMk.',
      'kMLYYLLLLLLLLMk.',
      'kMLLLLLLLLLLLMk.',
      'kkkkkkkkkkkkkkk.',
      'kMLLLLLLLLLLLMk.',
      'kMLYLLLvVLLLLMk.',
      'kMLLLLLVVLLLLMk.',
      'kMLLbaLLLqPLLMk.',
      'kMLLbbLLLqqLLMk.',
      'kMDDDDDDDDDDDMk.',
      'kMLLLLLLLLLLLMk.',
      'kMLLLLLLLLLLLMk.',
      'kMDDDDDDDDDDDMk.',
      'kkkkkkkkkkkkkkk.',
      '.kXXXXXXXXXXXk..',
      '..kkkkkkkkkkk...',
    ]);
    // Yukino's rose vase: three roses over long leaves in a tall white vase
    F.vase = () => T([
      '....kk....kk....',
      '...kfrk..kfrk...',
      '..kfrrek.krrek..',
      '..krreEk.kreEk..',
      '...kekk...kek...',
      '....kh.kk.hk....',
      '.....hkfrk.h....',
      '.....hkrrek.h...',
      '....vhkreEkh....',
      '...vVhkekkhVv...',
      '....VhkhkkhV....',
      '.....hhhhhh.....',
      '....kkhhhhkk....',
      '...kWWwwwwWWk...',
      '..kWWwwwwwwWWk..',
      '..kWwwwwwwwwWk..',
      '..kWwwWWwwwwWk..',
      '..kWwwWWwwwwWk..',
      '..kWwwwwwwwwWk..',
      '..kWwwwwwwwwWk..',
      '..kWwwwwwwwwWk..',
      '...kWwwwwwwWk...',
      '...kWwwwwwwWk...',
      '....kWwwwwWk....',
      '....kgwwwwgk....',
      '....kGggggGk....',
      '.....kkkkkk.....',
      '................',
    ]);
    // Yoru's folding screen: three paper panels in a dark frame, a branch painted across them
    F.screen = () => T([
      '..kkkkkkkk..kkkkkkkkkk..kkkkkkk.',
      '.kCCCCCCCCk.kCCCCCCCCk.kCCCCCCk.',
      '.kCWWWWWWCk.kCWWWWWWCk.kCWWWWCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCWwwCwWCk.kCWwCwwWCk.kCWwCwCk.',
      '.kCWwCCwWCk.kCWCCwwWCk.kCWCCwCk.',
      '.kCWCCwwWCk.kCWwCwwWCk.kCWwCwCk.',
      '.kCWwCwwWCk.kCWwwCwWCk.kCWwCwCk.',
      '.kCWwwCwWCk.kCWwwwCWCk.kCWwwCCk.',
      '.kCWwwwCWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCCCCCCCCk.kCCCCCCCCk.kCCCCCCk.',
      '.kCWWWWWWCk.kCWWWWWWCk.kCWWWWCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCWwwwwWCk.kCWwwwwWCk.kCWwwwCk.',
      '.kCCCCCCCCk.kCCCCCCCCk.kCCCCCCk.',
      '.kXXXXXXXXk.kXXXXXXXXk.kXXXXXXk.',
      '.kkkkkkkkkk.kkkkkkkkkk.kkkkkkkk.',
      '................................',
      '................................',
      '................................',
    ]);
    F.rug = () => {
      const p = new Pix(32, 32);
      const col = (ch) => PAL[ch];
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) {
          const dx = x - 15.5, dy = y - 15.5, d = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);
          const scallop = 14.6 + Math.cos(ang * 16) * 0.9;
          if (d > scallop + 0.6) continue;
          let c = d > scallop - 0.6 ? 'k' : d > 13.2 ? (Math.cos(ang * 16) > 0 ? 'W' : 'w') : d > 12.4 ? 'q' : 'p';
          if (c === 'p' && Math.abs(d - 9.5) < 0.7 && Math.round(((ang + Math.PI) / (Math.PI * 2)) * 24) % 2 === 0) c = 'P';
          if (c === 'p' && dx + dy > 10) c = 'q';
          p.set(x, y, col(c));
        }
      p.blit(fromRows(['..kkk..kkk..', '.kfrrkkrrrk.', 'kfWrrrrrrrek', 'krrrrrrrrrek', 'krrrrrrrreEk', '.krrrrrrreEk', '..krrrrrreEk', '...krrrrEk..', '....krrEk...', '.....kEk....', '......k.....'].map((r) => r.padEnd(12, '.')), PAL), 10, 10);
      return p;
    };
    return F;
  })();
  function buildFurniture(id) {
    return FURNITURE[id] ? FURNITURE[id]() : null;
  }

  // wallpaper strips (16x24) and floors (16x16)
  function buildWall(kind, i) {
    const p = new Pix(16, 24);
    switch (kind) {
      case 'bunny':
        p.rect(0, 0, 16, 24, '#ffd9e5');
        if (i % 2 === 0) stamp(p, ['.w...w.', '.w...w.', 'wwwwwww', 'wkwwwkw', 'wwwpwww', '.wwwww.'], 4, 4, { w: '#ffffff', k: '#e27aa6', p: '#ff9fbb' });
        break;
      case 'stripe':
        for (let x = 0; x < 16; x++) p.vline(x, 0, 24, (x >> 2) % 2 ? '#ffd6e2' : '#fff4f8');
        break;
      case 'strawberry':
        p.rect(0, 0, 16, 24, '#fff6e6');
        if (i % 2 === 0) { ball(p, 5, 6, 6, 6, '#ff9aae', '#ec3d5f', '#a51f40'); p.rect(7, 5, 2, 1, '#4cb84c'); p.set(7, 9, '#ffe14d'); }
        else { p.set(4, 14, '#ffc2d4'); p.set(11, 3, '#ffc2d4'); }
        break;
      case 'night':
        p.rect(0, 0, 16, 24, '#314a78');
        p.set(3 + (i * 5) % 10, 4, '#ffffff'); p.set(10 - (i * 3) % 8, 11, '#fff0a0'); p.set(6, 16, '#9fb8e6');
        break;
      case 'lace': // Yukino's room: a calm damask with a lace band along the skirting
        p.rect(0, 0, 16, 24, '#e9eff9');
        for (let y = 2; y < 16; y += 6) p.hline(0, y, 16, '#d6e0f0');
        if (i % 2 === 0) stamp(p, ['..w..', '.wkw.', 'wkbkw', '.wkw.', '..w..'], 5, 4, { w: '#ffffff', k: '#c3d0e6', b: '#a8bcd8' });
        else { p.set(3, 10, '#ffffff'); p.set(12, 4, '#ffffff'); p.set(8, 13, '#c3d0e6'); }
        for (let x = 0; x < 16; x += 4) stamp(p, ['.ww.', 'wwww'], x, 14, { w: '#ffffff' });
        break;
      case 'shoji': // Yoru's room: paper panels in a dark wooden grid
        p.rect(0, 0, 16, 24, '#f4eedc');
        for (let y = 0; y < 17; y += 6) { p.hline(0, y, 16, '#6b4a2c'); p.hline(0, y + 1, 16, '#8c6a42'); }
        p.vline(0, 0, 17, '#6b4a2c'); p.vline(8, 0, 17, '#6b4a2c');
        p.vline(1, 0, 17, '#8c6a42'); p.vline(9, 0, 17, '#8c6a42');
        if (i % 2 === 0) { p.set(4, 8, '#e4dcc4'); p.set(12, 3, '#e4dcc4'); }
        break;
    }
    for (let x = 0; x < 16; x++) p.set(x, 16, mix(p.get(x, 16) || [255, 255, 255, 255], '#2a1b30', 0.12));
    p.rect(0, 17, 16, 7, '#b8763c'); p.hline(0, 17, 16, '#e0a262'); p.hline(0, 23, 16, '#8c5530');
    return p;
  }
  function buildFloor(kind, i) {
    const p = new Pix(16, 16);
    switch (kind) {
      case 'wood':
        p.rect(0, 0, 16, 16, i ? '#e7ad6d' : '#eab474');
        for (let r = 0; r < 4; r++) {
          p.hline(0, r * 4 + 3, 16, '#c98a4e');
          const j = (r * 5 + i * 3) % 12 + 2;
          p.vline(j, r * 4, 3, '#c98a4e');
        }
        break;
      case 'carpet':
        p.rect(0, 0, 16, 16, '#ffc2d4');
        if (i) { p.set(4, 4, '#ffd6e2'); p.set(12, 12, '#ffd6e2'); } else { p.set(12, 4, '#ffb0c8'); p.set(4, 12, '#ffb0c8'); }
        break;
      case 'checker':
        p.rect(0, 0, 16, 16, i ? '#e8def8' : '#fff7fa');
        p.hline(0, 15, 16, i ? '#d6c9ee' : '#f0e4ec');
        break;
      case 'tatami': // Yoru's room: woven mats bound in dark green
        p.rect(0, 0, 16, 16, i ? '#d2d78e' : '#dae09a');
        for (let y = 2; y < 15; y += 2) p.hline(2, y, 12, i ? '#c3c983' : '#cbd28d');
        for (let x = 2; x < 15; x += 4) p.vline(x, 2, 12, i ? '#e2e7a8' : '#e8eeb2');
        p.rect(0, 0, 16, 2, '#2f5a3a'); p.rect(0, 14, 16, 2, '#2f5a3a');
        p.vline(0, 0, 16, '#25482e'); p.vline(15, 0, 16, '#25482e');
        p.hline(0, 1, 16, '#3f7a4c'); p.hline(0, 14, 16, '#25482e');
        break;
    }
    return p;
  }
  function buildWindow() {
    const p = new Pix(18, 14);
    p.rect(1, 1, 16, 12, '#8c5530'); p.rect(3, 3, 12, 8, '#8fd3ff'); p.rect(3, 3, 12, 3, '#c9ecff');
    p.vline(8, 3, 8, '#ffffff'); p.hline(3, 6, 12, '#ffffff');
    p.rect(2, 2, 3, 10, '#ff9fbb'); p.rect(13, 2, 3, 10, '#ff9fbb');
    return p.outlined(K);
  }

  // ---------------------------------------------------------------- build all
  function build() {
    const art = { maids: {}, monsters: {}, themes: {}, items: {}, ui: {}, fx: {} };
    art.outfits = {};
    for (const m of Object.keys(MAIDS)) {
      art.outfits[m] = {};
      for (const o of Object.keys(OUTFIT_STYLE)) {
        const s = buildMaid(m, o);
        s.burnt = burnt(s.down[0]);
        art.outfits[m][o] = s;
      }
      art.maids[m] = art.outfits[m].maid;
    }
    for (const k of Object.keys(MONSTERS)) {
      const frames = [volume(softInk(bevel(MONSTERS[k](0)))), volume(softInk(bevel(MONSTERS[k](1))))];
      art.monsters[k] = { frames, flipped: frames.map((f) => f.flipped()), white: frames.map((f) => tinted(f, '#ffffff', 0.8)) };
    }
    art.boss = { frames: [volume(buildBoss(0, false)), volume(buildBoss(1, false))], hurt: buildBoss(0, true) };
    const BOSS_BUILD = { drill: buildDrill, spider: buildSpider, bear: buildBoss };
    const bossSets = {};
    art.bossSet = (kind, broken) => {
      const key = kind + ':' + Object.keys(broken || {}).filter((k) => broken[k]).sort().join(',');
      if (!bossSets[key]) {
        const b = BOSS_BUILD[kind];
        bossSets[key] = { frames: [volume(b(0, false, broken)), volume(b(1, false, broken))], hurt: b(0, true, broken) };
      }
      return bossSets[key];
    };
    art.bosses = {
      drill: { frames: [volume(buildDrill(0, false)), volume(buildDrill(1, false))], hurt: buildDrill(0, true) },
      spider: { frames: [volume(buildSpider(0, false)), volume(buildSpider(1, false))], hurt: buildSpider(0, true) },
      bear: art.boss,
    };
    for (const t of Object.keys(THEMES)) art.themes[t] = buildTheme(t);
    art.bomb = [0, 1, 2, 3].map((f) => buildBomb(f));
    art.bombs = {};
    for (const k of Object.keys(BOMB_DESIGNS)) art.bombs[k] = [0, 1, 2, 3].map((f) => buildBomb(f, k));
    art.flame = {};
    for (let mask = 0; mask < 16; mask++) art.flame[mask] = [0, 1, 2, 3, 4, 5].map((s) => buildFlame(mask, s));
    art.decor = {};
    for (const k of ['treehouse', 'well', 'igloo', 'castle', 'podium', 'cane', 'stage', 'egg']) art.decor[k] = volume(softInk(bevel(buildDecor(k))), 0.8);
    art.bgTile = buildBgTile();
    for (const k of ITEM_KEYS) art.items[k] = softInk(bevel(buildItem(k)));
    art.items.coin = [0, 1, 2, 3].map(buildCoin);
    art.ice = [buildIce(0), buildIce(1)];
    art.items.dust = [0, 1, 2].map(buildDust);
    for (const k of Object.keys(UI)) art.ui[k] = fromRows(UI[k], UI_PAL);
    art.ui.weather = {};
    for (const k of Object.keys(WEATHER_ICONS)) art.ui.weather[k] = fromRows(WEATHER_ICONS[k], WEATHER_PAL, 9);
    // status-bar badges like the original's: a gold sunburst with a green orb, and a bunny head
    art.ui.emblem = fromRows(['...y.y...', '.y.yyy.y.', '..kGGGk..', 'yykGgwGky', '.yGgggGy.', 'yykGggGky', '..kGGGk..', '.y.yyy.y.', '...y.y...'], { y: '#ffc020', k: '#000000', G: '#2e8a2a', g: '#6ad04a', w: '#e8ffd0' });
    art.ui.bunny = fromRows(['.o...o.', 'oio.oio', 'oio.oio', 'owoooow', 'owwwwwo', 'owewewo', 'owwnwwo', '.owwwo.', '..ooo..'], { o: '#e89ab4', i: '#ffb6cc', w: '#ffffff', e: '#6a3a50', n: '#ff8aa8' });
    art.fx.star = [buildStar(0), buildStar(1)];
    art.fx.heart = buildHeartFx();
    art.fx.sparkle = [0, 1, 2].map(buildSparkle);
    art.fx.puff = [0, 1, 2, 3].map(buildPuff);
    art.fx.blast = [0, 1, 2].map(buildBlast);
    art.fx.smoke = [0, 1, 2, 3].map(buildSmoke);
    art.fx.slash = [0, 1, 2].map(buildSlash);
    art.fx.slashL = art.fx.slash.map((f) => f.flipped());
    art.fx.flame = fxRows('flame');
    art.fx.bubble = fxRows('bubble');
    art.fx.snow = fxRows('snow');
    art.fx.petal = { rose: fxRows('petal', 'rose'), sakura: fxRows('petal', 'sakura'), night: fxRows('petal', 'night') };
    art.fx.blossom = fxRows('blossom')[0];
    art.fx.glint = fxRows('glint');
    art.fx.bigHeart = { love: buildBigHeart('#ff5a82', '#c0284f'), like: buildBigHeart('#ff9fbb', '#e2769c') };
    art.fx.giftbox = { closed: buildGiftBox(false), open: buildGiftBox(true), lid: buildGiftLid() };
    art.fx.gloom = buildGloom();
    art.ui.taste = {};
    for (const k of Object.keys(TASTE_ROWS)) art.ui.taste[k] = fromRows(TASTE_ROWS[k], TASTE_PAL);
    art.room = {
      glove: { point: glovePose('point'), pat: [glovePose('pat0'), glovePose('pat1')], poke: glovePose('poke'), open: glovePose('open'), tickle: [glovePose('tickle0'), glovePose('tickle1')] },
      emotes: {},
      furniture: {},
      walls: {},
      floors: {},
      gifts: {},
      window: buildWindow(),
      broom: softInk(buildProp('broom')), vacuum: softInk(buildProp('vacuum')), cushion: softInk(buildProp('cushion')), book: softInk(buildProp('book')), cup: softInk(buildProp('cup')), mat: softInk(buildProp('mat')),
      bunny: BUNNY.map((rows) => fromRows(rows, BUNNY_PAL, 9)),
    };
    for (const k of Object.keys(EMOTES)) art.room.emotes[k] = buildEmote(k);
    for (const k of ['bed', 'princess', 'desk', 'wardrobe', 'teatable', 'bookshelf', 'plant', 'plush', 'rug', 'piano', 'lamp', 'fishbowl', 'dresser', 'sofa', 'gramophone', 'sandbag', 'toybox', 'vase', 'screen']) art.room.furniture[k] = softInk(bevel(buildFurniture(k)));
    // the moving parts: the bowl without its fish and the fish itself, the lamp switched off, the inside of the wardrobe
    art.room.furnParts = {
      fishbowlEmpty: softInk(bevel(buildFurniture('fishbowlEmpty'))),
      fish: [softInk(buildFurniture('fish0')), softInk(buildFurniture('fish1'))],
      lampOff: softInk(bevel(buildFurniture('lampOff'))),
      wardrobeInside: softInk(buildFurniture('wardrobeInside')),
    };
    art.room.furnParts.fishFlip = art.room.furnParts.fish.map((f) => f.flipped());
    for (const k of ['bunny', 'stripe', 'strawberry', 'night', 'lace', 'shoji']) art.room.walls[k] = [buildWall(k, 0), buildWall(k, 1)];
    for (const k of ['wood', 'carpet', 'checker', 'tatami']) art.room.floors[k] = [buildFloor(k, 0), buildFloor(k, 1)];
    for (const k of ['daifuku', 'honeycake', 'icecream', 'matcha', 'drink', 'novel', 'charm', 'bouquet', 'ribbon']) art.room.gifts[k] = softInk(bevel(buildGift(k)));
    if (ROW_ERRORS.length) throw new Error('sprite rows:\n' + ROW_ERRORS.join('\n'));
    return art;
  }

  // lay out a preview sheet (used by tools/preview.js)
  function previewSheet(art, group) {
    const items = [];
    let x = 2, y = 2, rowH = 0, W = 2;
    const nl = () => { if (x > 2) { x = 2; y += rowH + 3; rowH = 0; } };
    const put = (pix) => {
      items.push({ pix, x, y });
      x += pix.w + 3;
      rowH = Math.max(rowH, pix.h);
      W = Math.max(W, x);
    };
    const want = (g) => group === g || group === 'all';
    if (want('maids')) {
      for (const m of Object.keys(art.maids)) {
        nl();
        const s = art.maids[m];
        for (const dir of ['down', 'up', 'left', 'right']) for (const f of s[dir]) put(f);
        put(s.burnt);
      }
    }
    if (want('outfits')) {
      for (const m of Object.keys(art.outfits)) {
        nl();
        for (const o of Object.keys(art.outfits[m])) {
          const s = art.outfits[m][o];
          put(s.down[0]); put(s.up[1]); put(s.left[0]); put(s.faces.happy);
        }
      }
    }
    if (want('monsters')) {
      nl();
      for (const k of Object.keys(art.monsters)) { put(art.monsters[k].frames[0]); put(art.monsters[k].frames[1]); }
      nl();
      for (const k of Object.keys(art.bosses)) { put(art.bosses[k].frames[0]); put(art.bosses[k].frames[1]); put(art.bosses[k].hurt); }
    }
    if (want('fx')) {
      nl();
      for (const b of art.bomb) put(b);
      for (const k of Object.keys(art.bombs)) for (const b of art.bombs[k]) put(b);
      for (const k of ITEM_KEYS) put(art.items[k]);
      for (const i of art.ice) put(i);
      for (const c of art.items.coin) put(c);
      for (const d of art.items.dust) put(d);
      nl();
      for (const m of [15, 10, 5, 2, 8, 1, 4]) for (let s = 0; s < 6; s++) put(art.flame[m][s]);
      nl();
      for (const k of Object.keys(art.ui)) if (art.ui[k] instanceof Pix) put(art.ui[k]);
      for (const s of art.fx.star) put(s);
      put(art.fx.heart);
      for (const s of art.fx.sparkle) put(s);
      for (const s of art.fx.puff) put(s);
      for (const s of art.fx.blast) put(s);
      for (const s of art.fx.smoke) put(s);
      for (const s of art.fx.slash) put(s);
      nl();
      for (const k of ['flame', 'bubble', 'snow', 'glint']) for (const f of art.fx[k]) put(f);
      for (const k of Object.keys(art.fx.petal)) for (const f of art.fx.petal[k]) put(f);
      put(art.fx.blossom); put(art.fx.bigHeart.love); put(art.fx.bigHeart.like);
      put(art.fx.giftbox.closed); put(art.fx.giftbox.open); put(art.fx.giftbox.lid); put(art.fx.gloom);
      for (const k of Object.keys(art.ui.taste)) put(art.ui.taste[k]);
    }
    if (want('room')) {
      nl();
      for (const m of Object.keys(art.maids)) for (const f of Object.keys(art.maids[m].faces)) put(art.maids[m].faces[f]);
      nl();
      const gl = art.room.glove;
      for (const s of [gl.point, ...gl.pat, gl.poke, gl.open, ...gl.tickle]) put(s);
      for (const k of Object.keys(art.room.emotes)) put(art.room.emotes[k]);
      put(art.room.broom); put(art.room.book); put(art.room.cup); put(art.room.mat); put(art.room.window);
      for (const k of Object.keys(art.room.gifts)) put(art.room.gifts[k]);
      nl();
      for (const k of Object.keys(art.room.furniture)) put(art.room.furniture[k]);
      const fp = art.room.furnParts;
      put(fp.fishbowlEmpty); put(fp.fish[0]); put(fp.fish[1]); put(fp.fishFlip[0]); put(fp.lampOff); put(fp.wardrobeInside);
      nl();
      for (const k of Object.keys(art.room.walls)) { put(art.room.walls[k][0]); put(art.room.walls[k][1]); }
      for (const k of Object.keys(art.room.floors)) { put(art.room.floors[k][0]); put(art.room.floors[k][1]); }
    }
    if (want('decor')) {
      nl();
      for (const k of Object.keys(art.decor)) put(art.decor[k]);
      put(art.bgTile);
    }
    if (want('tiles')) {
      for (const t of Object.keys(art.themes)) {
        nl();
        const T = art.themes[t];
        put(T.floor[0]); put(T.floor[1]); put(T.hard); if (T.hard2) put(T.hard2); for (const s of T.soft) put(s); put(T.wallTop[0]); put(T.wallTop[1]); put(T.wall);
        // mini scene: 5x3 layout
        const scene = new Pix(80, 52);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) scene.blit(T.floor[(r + c) % 2], c * 16, 4 + r * 16);
        scene.blit(T.hard, 0, 4); scene.blit(T.soft[0], 32, 4); scene.blit(T.hard, 64, 4);
        scene.blit(T.soft[1], 16, 20); scene.blit(T.hard, 48, 20);
        scene.blit(art.maids.berry.down[0], 32, 12 + 16);
        put(scene);
      }
    }
    return { w: W + 2, h: y + rowH + 3, items };
  }

  G.ART = { build, previewSheet, pal, BASE, MAIDS, FONT5, FONT3, THEMES };
})(typeof window !== 'undefined' ? window : globalThis);
