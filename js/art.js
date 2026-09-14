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

  // Maids follow the look of the original sprites: near-black outlines, pale-blue shading on white,
  // a black dress with grey sheen, hair in four tones (H dark, h base, l light, L shine) and two-tone eyes (E over e).
  // keys: k outline, w/c white + shade, s/t skin + shade, p blush, m mouth, d/D dress + sheen, r/R collar bow,
  // b/B socks, x/X hair ribbon; per maid H/h/l/L hair dark..shine and E/e iris top/bottom
  const MAID_BASE = { k: '#000000', w: '#ffffff', c: '#c3dff5', s: '#ffe3ce', t: '#f5bbaf', p: '#ff9fb0', m: '#b93753', d: '#000000', D: '#555555', r: '#000000', R: '#555555', b: '#ffffff', B: '#c3dff5', x: '#ffffff', X: '#c3dff5' };
  const MAIDS = {
    // hair and eye ramps follow the original sprites
    berry: { H: '#b93753', h: '#ff4c65', l: '#ffb9c3', L: '#ffeff1', E: '#004e7d', e: '#0682cd' },
    yoru: { H: '#000000', h: '#161616', l: '#555555', L: '#a0a0a0', E: '#bc4206', e: '#e48702' },
    honey: { H: '#c98000', h: '#ffc01e', l: '#ffdd5a', L: '#ffefaa', E: '#0e7900', e: '#29c515' },
    yukino: { H: '#0c88a2', h: '#15e1de', l: '#71ecfc', L: '#bdf7ff', E: '#b93753', e: '#ff4c65' },
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
      ['...k|wckk|kkcw|k...', '....|ksDk|kDsk|....', '....|kscw|wcsk|....', '....|ktdw|wdtk|....', '....|kwsd|dswk|....', '...k|dDdw|wdDd|k...', '...k|wdcw|wcdw|k...', '....|.ksk|ksk.|....', '....|.kck|kck.|....', '....|.kkk|kkk.|....'],
      ['...k|wckk|kkcw|k...', '....|ksDk|kDsk|....', '....|kscw|wcsk|....', '....|ktdw|wdtk|....', '....|kwsd|dswk|....', '...k|dDdw|wdDd|k...', '...k|wdcw|wcdw|k...', '....|.ksk|ksk.|....', '....|.kck|.kk.|....', '....|.kkk|....|....'],
      ['...k|wckk|kkcw|k...', '....|ksDk|kDsk|....', '....|kscw|wcsk|....', '....|ktdw|wdtk|....', '....|kwsd|dswk|....', '...k|dDdw|wdDd|k...', '...k|wdcw|wcdw|k...', '....|.ksk|ksk.|....', '....|.kk.|kck.|....', '....|....|kkk.|....'],
    ],
    up: [
      ['...k|cddd|dddc|k...', '....|kDdd|ddDk|....', '....|ksdd|ddsk|....', '....|ktww|wwtk|....', '....|kwwk|kwwk|....', '...k|dDdw|wdDd|k...', '...k|wcdd|ddcw|k...', '....|.ksk|ksk.|....', '....|.kck|kck.|....', '....|.kkk|kkk.|....'],
      ['...k|cddd|dddc|k...', '....|kDdd|ddDk|....', '....|ksdd|ddsk|....', '....|ktww|wwtk|....', '....|kwwk|kwwk|....', '...k|dDdw|wdDd|k...', '...k|wcdd|ddcw|k...', '....|.ksk|ksk.|....', '....|.kck|.kk.|....', '....|.kkk|....|....'],
      ['...k|cddd|dddc|k...', '....|kDdd|ddDk|....', '....|ksdd|ddsk|....', '....|ktww|wwtk|....', '....|kwwk|kwwk|....', '...k|dDdw|wdDd|k...', '...k|wcdd|ddcw|k...', '....|.ksk|ksk.|....', '....|.kk.|kck.|....', '....|....|kkk.|....'],
    ],
    // facing left; right is the mirror image
    side: [
      ['....|kcwk|....|....', '....|kkDd|k...|....', '....|kcsd|k...|....', '....|kwtd|k...|....', '....|kcsd|k...|....', '...k|wdDd|wk..|....', '...k|cwdc|wk..|....', '....|ksk.|....|....', '....|kck.|....|....', '...k|kkk.|....|....'],
      ['....|kcwk|....|....', '....|kkDd|k...|....', '....|kcds|k...|....', '....|kwdt|k...|....', '....|kcds|k...|....', '...k|wdDd|wk..|....', '...k|cwdc|wk..|....', '...k|sk.k|sk..|....', '..kc|k...|kck.|....', '.kkk|....|kkk.|....'],
      ['....|kcwk|....|....', '....|kkDd|k...|....', '...k|scdd|k...|....', '...k|tcdd|k...|....', '...k|scdd|k...|....', '...k|wdDd|wk..|....', '...k|cwdc|wk..|....', '....|.ksk|....|....', '....|.kck|....|....', '....|kkkk|....|....'],
    ],
  };

  // ---------------------------------------------------------------- maid heads (rows 0..13) and hair layers
  // head rows: lace headdress 0-2, hair 3-8, eyelids 9, eyes 10-11, cheeks 12, chin 13 (the side view's headdress is edge-on).
  // under / over: hair drawn behind / in front of the body (24 rows).
  const MAID_PARTS = {
    berry: {
      down: {
        head: [
          '....|..kk|kk..|....',
          '....|.kww|wwk.|..k.',
          '....|cwcw|wcwc|.khk',
          '...k|cHHH|HHHc|kkhk',
          '...c|HhhH|hhhH|chk.',
          '..kH|hhHh|hlLh|Hhk.',
          '..cH|hHhh|hllh|hHk.',
          '.kHh|Hhhh|Hhhh|hHk.',
          '..kH|HhHH|hHhH|Hk..',
          '..kH|skks|skks|Hk..',
          '..sH|kcEs|sEck|Hs..',
          '..tH|swes|sews|Ht..',
          '...k|Htss|sstH|k...',
          '....|kHtt|ttHk|....',
        ],
      },
      up: {
        head: [
          '....|..kk|kk..|....',
          '.k..|.kww|wwk.|....',
          'khk.|cwcw|wcwc|....',
          'khkk|cHHH|HHHc|k...',
          '.khc|hhhh|hhhh|c...',
          '..kh|hhhh|hLlh|Hk..',
          '..ch|hhhh|hllh|Hc..',
          '.kHh|hhhh|hhhh|hHk.',
          '..kH|hhHh|hHhh|Hk..',
          '..kH|hHhh|hhHh|Hk..',
          '..kH|HhHh|hHhH|Hk..',
          '..sk|HHHH|HHHH|ks..',
          '...k|kHHH|HHHk|k...',
          '....|kHkH|HkHk|....',
        ],
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
          'kHHh|HhhH|hHk.|....',
          'kHkk|Hhhh|HHk.|....',
          'ksEc|sHhH|hHk.|....',
          'ksew|stHh|Hk..|....',
          '.kss|tkHH|k...|....',
          '..kt|tk..|....|....',
        ],
      },
    },
    yoru: {
      down: {
        head: [
          '....|..kk|kk..|....',
          '....|.kww|wwk.|....',
          '....|cwcw|wcwc|....',
          '...k|chhh|hhhc|kxk.',
          '...c|hlhh|hhlh|cxXk',
          '..kh|lhlL|Llhl|hkk.',
          '..ch|lhhl|lhhl|hc..',
          '.khl|hhlh|hlhh|lhk.',
          'khhh|hhhh|hhhh|hhhk',
          '.kHk|skks|skks|kHk.',
          '.khk|kcEs|sEck|khk.',
          '.khk|swes|sews|khk.',
          '.khk|ktss|sstk|khk.',
          '.klk|.ktt|ttk.|klk.',
        ],
        over: pad(14, ['.khk|....|....|khk.', '.klk|....|....|klk.', '.khk|....|....|khk.', '.klk|....|....|klk.', '.khk|....|....|khk.', '..k.|....|....|.k..']),
      },
      up: {
        head: [
          '....|..kk|kk..|....',
          '....|.kww|wwk.|....',
          '....|cwcw|wcwc|....',
          '.kxk|chhh|hhhc|k...',
          'kXxc|hhlh|hlhh|c...',
          '.kkh|lhlL|Lhlh|hk..',
          '..ch|hlhh|hhlh|hc..',
          '.khl|hhlh|hlhh|lhk.',
          'khhh|hhhh|hhhh|hhhk',
          '.khh|hhhh|hhhh|hhk.',
          '.khh|hlhh|hhlh|hhk.',
          '.khh|hlhh|hhlh|hhk.',
          '.khh|hhhh|hhhh|hhk.',
          '.khl|hhhh|hhhh|lhk.',
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
          'khhh|hhhh|hcwk|k...',
          'khhl|hhhh|hwck|xk..',
          'khhh|hhhh|hhhk|Xk..',
          'kHkk|hhhh|hlhh|k...',
          'ksEc|shhh|hlhh|k...',
          'ksew|sthh|hhlh|k...',
          '.kss|tkhh|hhlh|k...',
          '..kt|tkhh|hhhl|k...',
        ],
        over: pad(14, ['....|kkhh|hlhk|....', '....|.khh|hlhk|....', '....|.khh|hhlk|....', '....|.khh|hhlk|....', '....|..kh|hhk.|....', '....|...k|kk..|....']),
      },
    },
    honey: {
      down: {
        head: [
          '....|..kk|kk..|....',
          '....|.kww|wwk.|....',
          '....|cwcw|wcwc|....',
          '...k|cHHH|HHHc|k...',
          '...c|hLHh|hHLh|c...',
          '..kh|hlHh|hHlh|hk..',
          '..ch|hlHh|hHlh|hc..',
          '.kHh|hlHh|hHlh|hHk.',
          '..kH|hHhH|HhHh|Hk..',
          '..kH|skks|skks|Hk..',
          '..sH|kcEs|sEck|Hs..',
          '..tH|swes|sews|Ht..',
          '...k|Htss|sstH|k...',
          '....|kHtt|ttHk|....',
        ],
        over: pad(12, ['.k..|....|....|..k.', 'khk.|....|....|.khk', 'hlHk|....|....|kHlh', 'kHhl|k...|...k|lhHk', '.kkH|k...|...k|Hkk.', '...k|....|....|k...']),
      },
      up: {
        head: [
          '....|..kk|kk..|....',
          '....|.kww|wwk.|....',
          '....|cwcw|wcwc|....',
          '...k|cHHH|HHHc|k...',
          '...c|hLHh|hHLh|c...',
          '..kh|hlHh|hHlh|hk..',
          '..ch|hlHh|hHlh|hc..',
          '.kHh|hlHh|hHlh|hHk.',
          '..kH|hHhH|HhHh|Hk..',
          '..kH|HhHh|hHhH|Hk..',
          '..kH|hHHh|HHhH|Hk..',
          '..sk|HHHH|HHHH|ks..',
          '...k|kHHH|HHHk|k...',
          '....|kHkH|HkHk|....',
        ],
        over: pad(10, ['.k..|....|....|..k.', 'khk.|....|....|.khk', 'hlHk|....|....|kHlh', 'kHhl|k...|...k|lhHk', 'khHh|k...|...k|hHhk', '.kkH|k...|...k|Hkk.', '...k|....|....|k...']),
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
        under: pad(8, ['....|....|kk..|....', '....|...k|hhk.|....', '....|...k|Hlhk|....', '....|....|khHh|k...', '....|....|kHlh|k...', '....|....|.kHk|....', '....|....|..k.|....']),
      },
    },
    yukino: {
      down: {
        head: [
          '....|..kk|kk..|....',
          '.k..|.kww|wwk.|..k.',
          'khk.|cwcw|wcwc|.khk',
          '.khk|cHHH|HHHc|khk.',
          '..kh|HhlH|HlhH|hk..',
          '.kHh|lLhh|hhlh|hHk.',
          'khHh|hHlh|hlHh|hHhk',
          '.kHh|HhhH|HhhH|hHk.',
          'khHH|hHkH|HkHh|HHhk',
          '..kH|skks|skks|Hk..',
          '..sH|kcEs|sEck|Hs..',
          '.kHt|swes|sews|tHk.',
          'khHk|Htss|sstH|kHhk',
          'lHhk|kHtt|ttHk|khHl',
        ],
        over: pad(14, ['kHlh|k...|...k|hlHk', '.khH|k...|...k|Hhk.', 'khk.|....|....|.khk', '.k..|....|....|..k.']),
      },
      up: {
        head: [
          '....|..kk|kk..|....',
          '.k..|.kww|wwk.|..k.',
          'khk.|cwcw|wcwc|.khk',
          '.khk|cHHH|HHHc|khk.',
          '..kh|hhlh|hlhh|hk..',
          '.kHh|hlLh|hhlh|hHk.',
          'khHh|hhhh|hhhh|hHhk',
          '.kHh|Hhhh|hhhH|hHk.',
          'khHh|hHhh|hhHh|hHhk',
          '..kH|hhHh|hHhh|Hk..',
          '.kHH|hHHh|HHhH|HHk.',
          '.kHk|HHHH|HHHH|kHk.',
          'khHk|kHHH|HHHk|kHhk',
          'lHhk|kHkH|HkHk|khHl',
        ],
        over: pad(14, ['kHlh|k...|...k|hlHk', '.khH|k...|...k|Hhk.', 'khk.|....|....|.khk', '.k..|....|....|..k.']),
      },
      side: {
        head: [
          '....|.kk.|....|....',
          '....|kwc.|k.k.|....',
          '...k|Hwck|hkhk|....',
          '..kH|hhwc|Hhk.|....',
          'kkHh|lLhh|wcHk|k...',
          '.kHh|llhh|hwck|hk..',
          'kHhh|hhhH|hcwk|k...',
          '.kHH|hHhh|Hwck|hk..',
          'kHHh|HhhH|hHhk|k...',
          'kHkk|Hhhh|HHk.|....',
          'ksEc|sHhH|hHk.|....',
          'ksew|stHh|Hk..|....',
          '.kss|tkHH|k...|....',
          '..kt|tk..|....|....',
        ],
        under: pad(8, ['....|....|kk..|....', '....|...k|Hhk.|....', '....|...k|hlHk|....', '....|....|kHhl|k...', '....|....|khHh|k...', '....|....|.kkH|k...', '....|....|...k|....']),
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
    const out = top.concat(rows.slice(top.length)).map((r) => r.replace(/\|/g, '').replace(/[xX]/g, 'h'));
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
  function buildMaid(name, outfit) {
    outfit = outfit || 'maid';
    const P = Object.assign(pal(name), OUTFIT_STYLE[outfit].pal(name));
    const parts = MAID_PARTS[name];
    const layer = (rows, label) => (rows ? fromRows(rows16(rows, label), P) : null);
    const out = { down: [], up: [], left: [], right: [] };
    const compose = (dir, headRows, f, bob) => {
      const part = parts[dir];
      const pix = new Pix(16, 24);
      const under = layer(part.under, name + ' under ' + dir);
      const over = layer(part.over, name + ' over ' + dir);
      if (under) pix.blit(under, 0, bob);
      pix.blit(fromRows(pad(14, rows16(BODY[dir][f], 'body ' + dir + f)), P), 0, 0);
      pix.blit(fromRows(pad(0, rows16(headRows, name + ' head ' + dir)), P), 0, bob);
      if (over) pix.blit(over, 0, bob);
      return pix;
    };
    for (const dir of ['down', 'up', 'side']) {
      const head = withHeadwear(parts[dir].head, outfit, dir);
      for (let f = 0; f < 3; f++) {
        const pix = compose(dir, head, f, f === 0 ? 0 : 1);
        if (dir === 'side') {
          out.left.push(pix);
          out.right.push(pix.flipped());
        } else out[dir].push(pix);
      }
    }
    // facial expressions (front view, standing) for the room, the title screen and dialogue
    out.faces = { normal: out.down[0] };
    for (const key of Object.keys(FACES)) {
      const head = withHeadwear(parts.down.head, outfit, 'down').map((r) => r.replace(/\|/g, ''));
      FACES[key].forEach((r, i) => {
        if (!r) return;
        const row = head[9 + i];
        head[9 + i] = row.slice(0, 4) + r.split('').map((ch, j) => (ch === '?' ? row[4 + j] : ch)).join('') + row.slice(12);
      });
      out.faces[key] = compose('down', head, 0, 0);
    }
    return out;
  }
  // expressions replace the eye block (columns 4-11) of head rows 9-12; null keeps the row
  const FACES = {
    happy: ['ssssssss', 'skksskks', 'ksskkssk', '?psmmsp?'],
    blush: [null, null, null, '?ppsspp?'],
    angry: ['kksssskk', 'skEssEks', 'swessews', '?tskkst?'],
    tired: ['ssssssss', 'skksskks', 'sEessEes', null],
    sleep: ['ssssssss', 'ssssssss', 'skksskks', null],
    surprise: ['skksskks', 'kwEssEwk', 'swessews', '?tsmmst?'],
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
  function buildDrill(f, hurt) {
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
    // gold crescent ears on the upper sides and little gold drops lower down
    layer((L) => {
      put(L, ['..yyo', '.yYo.', 'yYWo.', 'yyo..', 'oyd..', 'od...', '.d...'], 1, 13);
      put(L, ['y.', 'o.', 'W.', 'yo'], 1, 28);
      mirror(L);
    });

    // ---- top: the threaded spire; the white core and the thread turn every frame
    const spin = f % 2;
    layer((L) => put(L, [
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
  function buildSpider(f, hurt) {
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
      bossFire(L, cx, 6, 20, curve([[6, 1.5], [8, 3], [10, 5], [12, 6.5], [15, 7.5], [18, 7], [20, 5.5]]), ['#fffbe0', '#ffe04a', '#ff5a2a', '#d81830', '#7a0c28'], 16);
      const tongues = [[23, 4, 3], [24, 5, 2], [21, 5 + s, 3], [26, 5 - s, 3], [19, 7, 3], [28, 7, 3], [17, 10 - s, 3], [30, 10 + s, 3]];
      for (const [x, y, hgt] of tongues) for (let t = 0; t < hgt; t++) L.set(x, y + t, t === 0 ? '#ff7a3a' : t === 1 ? '#ff5a2a' : '#d81830');
      for (const [x0, y0, dir] of [[19, 12, 1], [20, 9, 1], [27, 9, -1], [28, 12, -1]]) { L.set(x0, y0, '#ff8a4a'); L.set(x0 + dir, y0 - 1, '#ff8a4a'); L.set(x0 + dir * 2, y0 - 1, '#7a0c28'); }
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
    for (let y = 0; y < 5; y++) { out.set(23, y, '#ffffff'); out.set(24, y, '#a8a8c0'); }
    return hurt ? brightenBoss(out) : out;
  }

  // ------------------------------------------------------------ BOSS 3 — gold bear mech (36x58)
  // Built from the original's features, top to bottom. Top: a flat-topped glass dome with a teddy pilot at the
  // controls, round ears with rivets, a gold face with big grey-rimmed goggles, a snout over a toothy grille and a
  // bear-mouth jaw seam. Middle: shoulder pistons, a striped chest and pincer arms. Bottom: ridged legs in wide
  // boots. Each part goes down on its own layer with a black outline, so parts are separated by ink.
  function buildBoss(f, hurt) {
    const W = 36, H = 58, cx = 18;
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
    });
    // shoulder pistons: grey caps on gold barrels with a chrome shaft
    layer((L) => { put(L, ['mWm', 'yho', 'ohd'], 4, 36); put(L, ['mWm', 'yho', 'ohd'], 8, 36); mirror(L); });
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
  function buildBomb(f) {
    const pal = f === 3 ? Object.assign({}, BOMB_PAL, BOMB_HOT) : BOMB_PAL;
    // frame 1 pulses the bomb down a pixel
    const dy = f === 1 ? 1 : 0;
    const p = new Pix(16, 16);
    p.blit(fromRows(BOMB_BODY, pal, 16), 0, dy);
    const top = 3 + dy;
    p.set(8, top - 1, pal.n); p.set(8, top, pal.n);
    p.blit(fromRows(BOMB_SPARK[f % 3], pal), 7, top - 4);
    return p;
  }

  // fireball radius by stage (grow, peak, fade) and the flame's colours
  const FLAME_BALL_R = [3.4, 5.6, 7.3, 6.6, 4.6];
  const FLAME_FIRE = { deep: '#5a0818', rim: '#a81028', red: '#e0182c', lit: '#ff4a3a', orange: '#ff8a1a', yellow: '#ffd23f', pale: '#fff4b0', white: '#ffffff' };
  function buildFlame(mask, stage) {
    const p = new Pix(16, 16);
    const c = 7.5;
    const ends = [1, 2, 4, 8].includes(mask);
    const R = FLAME_BALL_R[stage] - (ends && stage > 2 ? 0.6 : 0);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const u = (x - c) / R, v = (y - c) / R;
        const d = Math.hypot(u, v * 0.96);
        if (d > 1) continue;
        let col = d > 0.86 ? (u + v > 0.2 ? FLAME_FIRE.deep : FLAME_FIRE.rim) : u + v < -0.5 ? FLAME_FIRE.lit : FLAME_FIRE.red;
        // teardrop flame inside: a round base low in the ball rising to a leaning point, with an orange tongue curling up
        // its left side and a white-hot base
        const vb = 0.25;
        const half = v < vb ? 0.64 * Math.pow(Math.max(0, (v + 0.74) / (vb + 0.74)), 0.8) : 0.64 * Math.sqrt(Math.max(0, 1 - ((v - vb) / 0.5) ** 2));
        const lean = v < vb ? (vb - v) * 0.3 : 0;
        const t = half > 0 ? Math.abs(u - lean) / half : 9;
        if (t < 1 && d < 0.9) {
          col = t > 0.7 ? FLAME_FIRE.orange : t > 0.3 ? FLAME_FIRE.yellow : FLAME_FIRE.pale;
          if (u - lean < -0.2 && v < 0.1 && t > 0.45 && t < 0.75) col = FLAME_FIRE.orange;
          if (v > 0.3 && v < 0.62 && Math.abs(u) < 0.26) col = stage === 2 ? FLAME_FIRE.white : FLAME_FIRE.pale;
        }
        p.set(x, y, col);
      }
    // licks of flame breaking out round the top edge, changing every stage
    if (stage >= 1 && stage <= 3) {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * (0.15 + 0.7 * hash(i, stage, mask + 3));
        const lx = Math.round(c + Math.cos(a) * (R + 0.6)), ly = Math.round(c + Math.sin(a) * (R + 0.6));
        p.set(lx, ly, FLAME_FIRE.red); p.set(lx, ly - 1, i % 2 ? FLAME_FIRE.lit : FLAME_FIRE.rim);
      }
    }
    return p;
  }

  // ---------------------------------------------------------------- item icons (16x16)
  const ICON_PAL = {
    k: K, w: '#ffffff', c: '#bdd2ef', d: '#3a2d50', D: '#6b5a8e', r: '#ec3d5f', R: '#a51f40', y: '#ffd23f', Y: '#e09a14',
    o: '#ff7a1a', b: '#3d86f0', B: '#1f3b8f', g: '#4cb84c', G: '#2c7a33', p: '#ff9fb4', n: '#8a5a3c', s: '#ffe4d2',
  };
  const ICONS = {
    bomb: ['.....k.y..', '....k.ywy.', '..kkkk.y..', '.kddddk...', 'kdDwdddk..', 'kdwddddk..', 'kddddddk..', 'kddddddk..', '.kddddk...', '..kkkk....'],
    fire: ['....k.....', '...kok....', '...kook...', '..koyok.k.', '..koyyokok', '.koyyyyook', '.koywwyyok', '.koywwwyok', '..koyyyok.', '...kkkkk..'],
    speed: ['..........', '....kkkk..', '...kbbbbk.', '..kbwbbbk.', 'kkkbbbbbk.', '...kbbbbbk', 'kkk.kbbbbk', '...kBBBBBk', '....kkkkk.', '..........'],
    heart: ['.kk...kk..', 'krrk.krrk.', 'krwrkrrrk.', 'krwrrrrrk.', 'krrrrrrrk.', '.krrrrrk..', '..krrrk...', '...krk....', '....k.....', '..........'],
    clock: ['...kkk....', '....k.....', '..kkkkk...', '.kwwkwwk..', 'kwwwkwwwk.', 'kwwwkkwwk.', 'kwwwwwwwk.', '.kwwwwwk..', '..kkkkk...', '..........'],
    star: ['....k.....', '...kyk....', '...kyk....', 'kkkyyykkk.', 'kyyywyyyk.', '.kyyyyyk..', '..kyyyk...', '.kyykyyk..', '.kyk.kyk..', '.kk...kk..'],
    tea: ['...w.w....', '....w.....', '.kkkkkkk..', '.kwwwwwkkk', '.kwrrrwk.k', '.kwwwwwkkk', '..kwwwk...', 'kkkkkkkkk.', '.kcccccck.', '..kkkkkk..'],
  };

  const ITEM_BG = {
    bomb: ['#fff4f8', '#ff6f91'], fire: ['#fff6e6', '#ff8a2e'], speed: ['#eef6ff', '#3d86f0'], heart: ['#fff0f4', '#ec3d5f'],
    clock: ['#eefcff', '#27a7b8'], star: ['#fffbe0', '#e0a014'], tea: ['#f2fff0', '#4cb84c'],
  };
  function buildItem(type) {
    const p = new Pix(16, 16);
    const [bg, rim] = ITEM_BG[type];
    // rounded panel
    p.rect(2, 1, 12, 14, rim); p.rect(1, 2, 14, 12, rim);
    p.rect(3, 2, 10, 12, bg); p.rect(2, 3, 12, 10, bg);
    p.hline(3, 13, 10, mix(bg, rim, 0.35));
    stamp(p, ICONS[type], 3, 3, ICON_PAL);
    return p.outlined(K);
  }
  function buildCoin(f) {
    const p = new Pix(16, 16);
    const widths = [10, 7, 3, 7];
    const w = widths[f % 4];
    ball(p, 8 - w / 2, 3, w, 11, '#fff6b0', '#ffc53a', '#c47f16', 0.2);
    if (w >= 7) stamp(p, ['w.w', 'www', '.w.'], 7, 7, { w: '#fff0a0' });
    return p.outlined(K);
  }
  function buildDust(f) {
    const p = new Pix(16, 16);
    ball(p, 2, 8, 12, 7, '#e8e4f2', '#b7b1cc', '#8a84a3');
    ball(p, 4, 5, 6, 5, '#e8e4f2', '#c6c0d8', '#8a84a3');
    ball(p, 9, 7, 4, 4, null, '#c6c0d8', '#8a84a3');
    const out = p.outlined('#6d6788');
    const tw = [[12, 3], [3, 4], [13, 6]][f % 3];
    stamp(out, ['.w.', 'www', '.w.'], tw[0] - 1, tw[1] - 1, { w: '#ffffff' });
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
        const base = i ? '#dc9a5a' : '#e2a262';
        p.rect(0, 0, 16, 16, base);
        for (let r = 0; r < 4; r++) {
          const y = r * 4;
          p.hline(0, y + 3, 16, '#b87440');
          p.hline(0, y, 16, '#eab47a');
          const j = Math.floor(hash(r, i, 3) * 12) + 2;
          p.vline(j, y, 3, '#b87440');
          p.set((j + 6) % 16, y + 1, '#c78448');
          if (hash(r, i, 9) > 0.6) p.set((j + 3) % 16, y + 1, '#8c5230');
        }
        return p;
      },
      hard() { // steel locker
        const p = new Pix(16, 20);
        p.rect(0, 0, 16, 5, '#b8cbe2'); p.hline(0, 0, 16, '#dfe9f5');
        p.rect(0, 5, 16, 15, '#6f89ad'); p.vline(8, 5, 15, '#4e6688');
        for (let y = 7; y < 12; y += 2) { p.hline(2, y, 4, '#4e6688'); p.hline(10, y, 4, '#4e6688'); }
        p.set(6, 14, '#dfe9f5'); p.set(9, 14, '#dfe9f5');
        p.hline(0, 19, 16, '#3c5070');
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
      floor(i) { // two-tone grass checker with blades
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, i ? '#4aa83c' : '#5cbc48');
        for (let n = 0; n < 7; n++) {
          const x = Math.floor(hash(n, i, 21) * 15), y = Math.floor(hash(n, i, 22) * 14) + 1;
          p.set(x, y, i ? '#2e7a2a' : '#3a8e30'); p.set(x + 1, y - 1, i ? '#6ad04a' : '#86e060');
        }
        p.hline(0, 15, 16, i ? '#3a8e30' : '#48a038'); p.vline(15, 0, 16, i ? '#3a8e30' : '#48a038');
        return p;
      },
      hard() { // trimmed hedge cube
        const p = new Pix(16, 20);
        p.rect(0, 0, 16, 6, '#5dbf55'); p.rect(0, 6, 16, 14, '#2f8a3c');
        for (let n = 0; n < 16; n++) {
          const x = Math.floor(hash(n, 1, 21) * 16), y = Math.floor(hash(n, 2, 21) * 18);
          p.set(x, y, y < 6 ? '#86dd72' : '#246e30');
        }
        p.hline(0, 19, 16, '#6b4a2c');
        return p.outlined(K);
      },
      soft(i) { // rose bush
        const p = new Pix(16, 20);
        ball(p, 0, 5, 16, 14, '#6fd060', '#3f9c44', '#2a6e32');
        const roses = [[3, 6], [9, 4], [8, 11]];
        for (const [x, y] of roses) {
          ball(p, x, y, 6, 6, '#ff8a9a', '#e8384f', '#a01c33');
          p.set(x + 2, y + 2, '#a01c33'); p.set(x + 3, y + 3, '#ffc2cb');
        }
        return p.outlined(K);
      },
      wallTop(i) { // strip of sky over a hedge dotted with little red flowers
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 6, '#6ab8ff'); p.hline(0, 4, 16, '#a8dcff');
        p.rect(0, 6, 16, 10, '#2e7a2a');
        for (let x = 0; x < 16; x++) { p.set(x, 6, '#000000'); p.set(x, 7 + ((x + i) % 2), '#4aa83c'); }
        const flower = (x, y) => { for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) p.set(x + dx, y + dy, '#ff3a4a'); p.set(x, y, '#ffe040'); };
        flower(4, 10); flower(11, 12 - i);
        p.hline(0, 15, 16, '#1a5018');
        return p;
      },
      wall(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#b0603c');
        for (let r = 0; r < 4; r++) {
          p.hline(0, r * 4 + 3, 16, '#7e3e24');
          const o = r % 2 ? 4 : 0;
          p.vline(o + 2, r * 4, 3, '#7e3e24'); p.vline(o + 10, r * 4, 3, '#7e3e24');
        }
        p.set(3, 1, '#4cb84c'); p.set(12, 9, '#4cb84c');
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
        p.rect(0, 0, 16, 6, '#dcf7ff'); p.rect(0, 6, 16, 14, '#8fd8f2');
        p.hline(0, 6, 16, '#4aa3c8');
        for (let n = 0; n < 5; n++) p.set(3 + n, 13 - n, '#e6fbff');
        p.set(11, 9, '#e6fbff'); p.set(12, 8, '#e6fbff');
        p.hline(0, 19, 16, '#4aa3c8');
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
      wallTop(i) { // small snowy pine trees on white snow
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#e8f4ff');
        p.set(2 + i * 5, 2, '#ffffff'); p.set(13 - i * 3, 5, '#ffffff');
        const t = new Pix(12, 14);
        tri(t, 1, 0, 10, 12, '#2e7a4a'); tri(t, 3, 0, 6, 5, '#ffffff'); t.hline(2, 8, 8, '#1e5a36'); t.rect(5, 12, 2, 2, '#6d4a36');
        p.blit(t.outlined('#000000'), 2, 0);
        p.rect(0, 14, 16, 2, '#b8d4f0');
        return p;
      },
      wall(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#7d8fb3');
        p.rect(0, 0, 16, 5, '#ffffff'); p.hline(0, 5, 16, '#c9dcf5');
        p.rect(2, 8, 5, 3, '#6a7ba0'); p.rect(9, 11, 5, 3, '#6a7ba0');
        return p;
      },
    },
    candy: {
      name: '糖果城', bg: '#4a1f3a',
      floor(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, i ? '#ffd3e4' : '#fff1f7');
        const sp = ['#ec3d5f', '#3d86f0', '#ffd23f', '#4cb84c'];
        for (let n = 0; n < 3; n++) {
          const x = Math.floor(hash(n, i, 41) * 14) + 1, y = Math.floor(hash(n, i, 42) * 14) + 1;
          p.set(x, y, sp[n % 4]); p.set(x + 1, y, sp[n % 4]);
        }
        return p;
      },
      hard() { // chocolate block
        const p = new Pix(16, 20);
        p.rect(0, 0, 16, 6, '#9c5f3a'); p.rect(0, 6, 16, 14, '#6a3c26');
        p.hline(0, 3, 16, '#7e4a2e'); p.vline(8, 0, 6, '#7e4a2e');
        p.rect(1, 7, 6, 5, '#7e4a2e'); p.rect(9, 7, 6, 5, '#7e4a2e'); p.rect(1, 13, 6, 5, '#7e4a2e'); p.rect(9, 13, 6, 5, '#7e4a2e');
        p.hline(1, 7, 6, '#a8704c'); p.hline(9, 7, 6, '#a8704c'); p.hline(1, 13, 6, '#a8704c'); p.hline(9, 13, 6, '#a8704c');
        return p.outlined(K);
      },
      soft(i) { // strawberry
        const p = new Pix(16, 20);
        ball(p, 1, 5, 14, 14, '#ff9aae', '#ec3d5f', '#a51f40', 0.15);
        for (let n = 0; n < 7; n++) p.set(3 + Math.floor(hash(n, i, 43) * 10), 8 + Math.floor(hash(n, i, 44) * 9), '#ffe14d');
        tri(p, 3, 2, 10, 5, '#4cb84c'); p.rect(7, 0, 2, 3, '#2c7a33');
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
      wall(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#e0a45a'); p.rect(1, 1, 14, 14, '#eab46e');
        p.set(4, 4, '#b8763c'); p.set(11, 5, '#b8763c'); p.set(5, 11, '#b8763c'); p.set(11, 11, '#b8763c');
        return p;
      },
    },
    lab: {
      name: '研究所', bg: '#171a26',
      floor(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, i ? '#a7adc2' : '#b3b9cc');
        p.hline(0, 0, 16, '#c9cedd'); p.hline(0, 15, 16, '#878ca3'); p.vline(15, 0, 16, '#878ca3');
        p.set(2, 2, '#878ca3'); p.set(13, 2, '#878ca3'); p.set(2, 13, '#878ca3'); p.set(13, 13, '#878ca3');
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
      soft(i) { // cardboard box
        const p = new Pix(16, 20);
        p.rect(1, 3, 14, 6, '#e0b47a'); p.rect(1, 9, 14, 10, '#c9955a');
        p.rect(7, 3, 2, 6, '#f5e6c8'); p.rect(7, 9, 2, 4, '#f5e6c8');
        p.hline(1, 9, 14, '#9c6e3c');
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
        p.rect(0, 0, 16, 16, '#ffc53a');
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (((x + y) >> 3) % 2) p.set(x, y, '#2a2b40');
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
      soft(i) { // toy crates with a star, a heart or a moon
        const p = new Pix(16, 20);
        const [lt, mid, dk] = [['#c9ecff', '#6fb8f0', '#3d86f0'], ['#dcf9b8', '#8ad86a', '#3f9c44'], ['#fff3b0', '#ffd23f', '#d49a14']][i % 3];
        p.rect(1, 3, 14, 5, lt); p.rect(1, 8, 14, 11, mid); p.hline(1, 8, 14, dk); p.vline(1, 8, 11, lt);
        const motif = [['.w.', 'www', '.w.'], ['w.w', 'www', '.w.'], ['ww.', 'w..', 'ww.']][i % 3];
        stamp(p, motif, 6, 11, { w: '#ffffff' });
        return p.outlined(K);
      },
      wallTop(i) { // a shelf of little toy cups
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#3a3a48');
        p.rect(0, 12, 16, 4, '#8a8a9a'); p.hline(0, 12, 16, '#c8c8d8'); p.hline(0, 15, 16, '#000000');
        const cup = (x, col, dark) => {
          const c = new Pix(6, 9);
          c.rect(0, 0, 6, 2, '#ffffff'); c.rect(1, 2, 4, 5, col); c.vline(4, 2, 5, dark); c.rect(2, 7, 2, 2, dark);
          p.blit(c.outlined('#000000'), x, 3);
        };
        cup(1, i ? '#ff6a8a' : '#6ad04a', i ? '#c83a5a' : '#2e8a2a');
        cup(8, i ? '#3a9df0' : '#ffd23f', i ? '#1a5ec4' : '#c88a00');
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
      floor(i) { // gold tiles with inset gems
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, i ? '#f0bd4a' : '#f7cb5c');
        p.hline(0, 0, 16, '#ffe38a'); p.hline(0, 15, 16, '#c98f24'); p.vline(15, 0, 16, '#c98f24');
        stamp(p, ['.y.', 'yoy', '.y.'], 6, 6, { y: '#ffe38a', o: i ? '#ec3d5f' : '#3d86f0' });
        return p;
      },
      hard() { // blue orb on a gold pedestal
        const p = new Pix(16, 20);
        p.rect(3, 13, 10, 5, '#e0a014'); p.hline(3, 13, 10, '#ffe38a'); p.rect(2, 17, 12, 3, '#c98f24');
        ball(p, 1, 0, 14, 14, '#e6fbff', '#5cb8f4', '#1f5fb0', 0.18);
        return p.outlined(K);
      },
      hard2() { // crystal
        const p = new Pix(16, 20);
        for (let j = 0; j < 19; j++) {
          const half = j < 5 ? 2 + j : j < 14 ? 7 : Math.max(1, 7 - (j - 13) * 2);
          for (let x = -half; x < half; x++) p.set(8 + x, j, x < -2 ? '#ffffff' : x < 2 ? '#cdeeff' : '#8fd3ff');
        }
        p.vline(8, 1, 16, '#ffffff'); p.set(5, 7, '#ffffff'); p.set(11, 11, '#ffffff');
        return p.outlined('#3a6a9a');
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
  function buildTheme(key) {
    const T = THEMES[key];
    return {
      key, name: T.name, bg: T.bg,
      floor: [T.floor(0), T.floor(1)],
      hard: inkOutline(T.hard()),
      hard2: T.hard2 ? inkOutline(T.hard2()) : null,
      soft: [T.soft(0), T.soft(1), T.soft(2)].map(inkOutline),
      wallTop: [T.wallTop(0), T.wallTop(1)],
      wall: T.wall(0),
    };
  }

  // ---------------------------------------------------------------- decor (3x3 tile centrepieces)
  function buildDecor(kind) {
    let p;
    if (kind === 'treehouse') {
      p = new Pix(48, 62);
      ball(p, 5, 18, 38, 42, '#d99058', '#a8683c', '#74421f');
      for (let i = 0; i < 9; i++) p.vline(9 + i * 4, 30 + (i % 3) * 3, 8, '#8c5530');
      p.rect(19, 44, 10, 16, '#5a3422'); p.rect(20, 45, 8, 1, '#8c5530'); p.set(26, 52, '#ffd23f');
      p.rect(11, 32, 6, 6, '#2a1b30'); p.rect(12, 33, 4, 4, '#ffe38a');
      p.rect(31, 30, 6, 6, '#2a1b30'); p.rect(32, 31, 4, 4, '#ffe38a');
      ball(p, 0, 0, 48, 28, '#8ee27a', '#4cb84c', '#2c7a33');
      ball(p, 6, -4, 22, 16, '#a6ee8e', '#5cc65a', null);
      for (const [x, y] of [[9, 12], [20, 18], [34, 10], [40, 18], [27, 6]]) { p.rect(x, y, 3, 3, '#ec3d5f'); p.set(x, y, '#ff9aae'); }
      p.rect(22, 58, 4, 4, '#b78a5a');
      return p.outlined(K);
    }
    if (kind === 'igloo') {
      p = new Pix(48, 50);
      ball(p, 1, 6, 46, 50, '#ffffff', '#e8f2ff', '#aac3e6', 0.18);
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!p.solid(x, y) || y > 43) p.clear(x, y);
      for (const y of [16, 26, 36]) for (let x = 0; x < 48; x++) if (p.solid(x, y)) p.set(x, y, '#c3d5ef');
      for (let x = 8; x < 44; x += 10) { p.vline(x, 17, 9, '#c3d5ef'); p.vline(x + 5, 27, 9, '#c3d5ef'); }
      ball(p, 16, 28, 16, 22, null, '#3a5a8a', '#2a4570');
      for (let y = 44; y < 50; y++) for (let x = 0; x < 48; x++) p.clear(x, y);
      p.rect(22, 0, 1, 8, '#6d4a36'); p.rect(23, 0, 6, 4, '#ec3d5f');
      return p.outlined('#2c3b5c');
    }
    if (kind === 'castle') {
      p = new Pix(48, 64);
      p.rect(4, 28, 40, 34, '#ffc2d8');
      for (let y = 30; y < 62; y += 6) p.hline(4, y, 40, '#ff9fbb');
      for (let x = 8; x < 44; x += 8) p.vline(x, 28, 34, '#ffd6e4');
      for (let x = 4; x < 44; x += 4) p.rect(x, 28, 2, 3 + ((x >> 2) % 2) * 2, '#ffffff');
      ball(p, 18, 44, 12, 24, null, '#6a3c26', null);
      for (let y = 62; y < 64; y++) for (let x = 0; x < 48; x++) p.clear(x, y);
      const tower = (x, y, w, h) => {
        p.rect(x, y, w, h, '#fff1f7'); p.vline(x + 2, y, h, '#ffd6e4');
        const roof = new Pix(w + 2, 12);
        tri(roof, 0, 0, w + 2, 12, '#ec3d5f');
        for (let j = 2; j < 12; j += 4) for (let i = 0; i < w + 2; i++) if (roof.solid(i, j)) roof.set(i, j, '#ffffff');
        p.blit(roof, x - 1, y - 12);
      };
      tower(0, 22, 12, 26); tower(36, 22, 12, 26); tower(17, 14, 14, 20);
      p.rect(23, 0, 1, 4, '#6d4a36'); stamp(p, ['r.r', 'rrr', '.r.'], 24, 0, { r: '#ec3d5f' });
      p.rect(3, 30, 6, 6, '#2a1b30'); p.rect(4, 31, 4, 4, '#ffe38a');
      p.rect(39, 30, 6, 6, '#2a1b30'); p.rect(40, 31, 4, 4, '#ffe38a');
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
    if (kind === 'egg') { // 3x3: the palace's giant jewelled egg
      p = new Pix(48, 62);
      ball(p, 7, 2, 34, 50, '#ffffff', '#f4eefc', '#c9bfe0', 0.2);
      for (const y of [16, 33]) for (let x = 0; x < 48; x++) if (p.solid(x, y)) { p.set(x, y, '#e0a014'); p.set(x, y + 1, '#ffd23f'); }
      for (const [x, y, c] of [[15, 17, '#ec3d5f'], [24, 16, '#3d86f0'], [33, 17, '#4cb84c'], [19, 34, '#9b87c9'], [29, 34, '#ec3d5f']]) stamp(p, ['.c.', 'ccc', '.c.'], x - 1, y - 1, { c });
      stamp(p, ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], 21, 22, { r: '#ff6f91' });
      p.set(24, 23, '#ffd6e2');
      for (const [x, y] of [[14, 8], [13, 9], [15, 9], [14, 10]]) p.set(x, y, '#ffffff');
      p.rect(8, 50, 32, 9, '#e0a014'); p.hline(8, 50, 32, '#ffe38a'); p.rect(4, 58, 40, 4, '#c98f24');
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
    heart: ['.kk.kk.', 'krrkrrk', 'krwrrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'],
    heartEmpty: ['.kk.kk.', 'kddkddk', 'kdddddk', 'kdddddk', '.kdddk.', '..kdk..', '...k...'],
    coin: ['.kkkk.', 'kyyyyk', 'kywyYk', 'kyyyYk', 'kyYYYk', '.kkkk.'],
    bomb: ['....y.', '...k..', '.kkkk.', 'kdwddk', 'kdddDk', 'kddddk', '.kkkk.'],
    fire: ['..k...', '.kok..', '.koyok', 'koyyok', 'koywok', '.kkkk.'],
    speed: ['..kkk..', '.kbbbk.', 'kbwbbk.', 'kbbbbbk', '.kBBBBk', '..kkkk.'],
    enemy: ['.k...k.', 'kgk.kgk', 'kgggggk', 'kgwgwgk', 'kgggggk', '.kkkkk.'],
    clock: ['.kkk.', 'kwkwk', 'kwkkk', 'kwwwk', '.kkk.'],
    broom: ['...k..', '...k..', '...k..', '..krk.', '.kyyyk', '.kyyyk', '.kkkkk'],
  };
  const UI_PAL = Object.assign({}, ICON_PAL, { d: '#6b5a8e', g: '#a9a2c2', Y: '#e09a14' });

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
  const GLOVE_PAL = { k: K, w: '#ffffff', c: '#d9dcea', p: '#ff9fbb' };
  const GLOVE = {
    point: [
      '....kk..........', '...kwwk.........', '...kwwk.........', '...kwwkkk.......',
      '.kkkwwkwwkk.....', 'kwwkwwkwwkwk....', 'kwwkwwkwwkwwk...', 'kwwwwwwwwwwwk...',
      'kwwwcwwwwwwwk...', '.kwwwwwwwwwk....', '.kwwwwwwwwk.....', '..kwwwwwwwk.....',
      '..kkkkkkkkk.....', '..kpppppppk.....', '..kkkkkkkkk.....', '................',
    ],
    pat: [
      '................', '...kkkkkkk......', '..kpppppppk.....', '..kkkkkkkkk.....',
      '.kwwwwwwwwwk....', 'kwwwwwwwwwwwk...', 'kwwwwwwwwwwwkk..', 'kwwwwwwwwwwwkwk.',
      'kwwcwwcwwcwwkwk.', 'kwwkwwkwwkwwkwk.', 'kwwkwwkwwkwwkk..', 'kwwkwwkwwkwwk...',
      '.kk.kk.kk.kk....', '................', '................', '................',
    ],
  };
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
    F.lamp = () => T([
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
    ]);

    // goldfish bowl: a round glass bowl with a lip, clear glass above a lighter water line, a goldfish swimming sideways
    // with a flicking tail, bubbles and glints, on a little wood stand
    F.fishbowl = () => T([
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
    ]);


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
    }
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
      const frames = [MONSTERS[k](0), MONSTERS[k](1)];
      art.monsters[k] = { frames, flipped: frames.map((f) => f.flipped()), white: frames.map((f) => tinted(f, '#ffffff', 0.8)) };
    }
    art.boss = { frames: [buildBoss(0, false), buildBoss(1, false)], hurt: buildBoss(0, true) };
    art.bosses = {
      drill: { frames: [buildDrill(0, false), buildDrill(1, false)], hurt: buildDrill(0, true) },
      spider: { frames: [buildSpider(0, false), buildSpider(1, false)], hurt: buildSpider(0, true) },
      bear: art.boss,
    };
    for (const t of Object.keys(THEMES)) art.themes[t] = buildTheme(t);
    art.bomb = [0, 1, 2, 3].map(buildBomb);
    art.flame = {};
    for (let mask = 0; mask < 16; mask++) art.flame[mask] = [0, 1, 2, 3, 4].map((s) => buildFlame(mask, s));
    art.decor = {};
    for (const k of ['treehouse', 'igloo', 'castle', 'podium', 'cane', 'stage', 'egg']) art.decor[k] = buildDecor(k);
    art.bgTile = buildBgTile();
    for (const k of Object.keys(ICONS)) art.items[k] = buildItem(k);
    art.items.coin = [0, 1, 2, 3].map(buildCoin);
    art.items.dust = [0, 1, 2].map(buildDust);
    for (const k of Object.keys(UI)) art.ui[k] = fromRows(UI[k], UI_PAL);
    // status-bar badges like the original's: a gold sunburst with a green orb, and a bunny head
    art.ui.emblem = fromRows(['...y.y...', '.y.yyy.y.', '..kGGGk..', 'yykGgwGky', '.yGgggGy.', 'yykGggGky', '..kGGGk..', '.y.yyy.y.', '...y.y...'], { y: '#ffc020', k: '#000000', G: '#2e8a2a', g: '#6ad04a', w: '#e8ffd0' });
    art.ui.bunny = fromRows(['.o...o.', 'oio.oio', 'oio.oio', 'owoooow', 'owwwwwo', 'owewewo', 'owwnwwo', '.owwwo.', '..ooo..'], { o: '#e89ab4', i: '#ffb6cc', w: '#ffffff', e: '#6a3a50', n: '#ff8aa8' });
    art.fx.star = [buildStar(0), buildStar(1)];
    art.fx.heart = buildHeartFx();
    art.fx.sparkle = [0, 1, 2].map(buildSparkle);
    art.fx.puff = [0, 1, 2, 3].map(buildPuff);
    art.fx.slash = [0, 1, 2].map(buildSlash);
    art.room = {
      glove: { point: fromRows(rows16(GLOVE.point, 'glove point'), GLOVE_PAL), pat: fromRows(rows16(GLOVE.pat, 'glove pat'), GLOVE_PAL) },
      emotes: {},
      furniture: {},
      walls: {},
      floors: {},
      gifts: {},
      window: buildWindow(),
      broom: buildProp('broom'), vacuum: buildProp('vacuum'), cushion: buildProp('cushion'), book: buildProp('book'), cup: buildProp('cup'), mat: buildProp('mat'),
      bunny: BUNNY.map((rows) => fromRows(rows, BUNNY_PAL, 9)),
    };
    for (const k of Object.keys(EMOTES)) art.room.emotes[k] = buildEmote(k);
    for (const k of ['bed', 'princess', 'desk', 'wardrobe', 'teatable', 'bookshelf', 'plant', 'plush', 'rug', 'piano', 'lamp', 'fishbowl', 'dresser', 'sofa', 'gramophone']) art.room.furniture[k] = buildFurniture(k);
    for (const k of ['bunny', 'stripe', 'strawberry', 'night']) art.room.walls[k] = [buildWall(k, 0), buildWall(k, 1)];
    for (const k of ['wood', 'carpet', 'checker']) art.room.floors[k] = [buildFloor(k, 0), buildFloor(k, 1)];
    for (const k of ['daifuku', 'matcha', 'honeycake', 'icecream', 'bouquet', 'ribbon']) art.room.gifts[k] = buildGift(k);
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
      for (const k of Object.keys(ICONS)) put(art.items[k]);
      for (const c of art.items.coin) put(c);
      for (const d of art.items.dust) put(d);
      nl();
      for (const m of [15, 10, 5, 2, 8, 1, 4]) for (let s = 0; s < 5; s++) put(art.flame[m][s]);
      nl();
      for (const k of Object.keys(art.ui)) put(art.ui[k]);
      for (const s of art.fx.star) put(s);
      put(art.fx.heart);
      for (const s of art.fx.sparkle) put(s);
      for (const s of art.fx.puff) put(s);
      for (const s of art.fx.slash) put(s);
    }
    if (want('room')) {
      nl();
      for (const m of Object.keys(art.maids)) for (const f of Object.keys(art.maids[m].faces)) put(art.maids[m].faces[f]);
      nl();
      put(art.room.glove.point); put(art.room.glove.pat);
      for (const k of Object.keys(art.room.emotes)) put(art.room.emotes[k]);
      put(art.room.broom); put(art.room.book); put(art.room.cup); put(art.room.mat); put(art.room.window);
      for (const k of Object.keys(art.room.gifts)) put(art.room.gifts[k]);
      nl();
      for (const k of Object.keys(art.room.furniture)) put(art.room.furniture[k]);
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
