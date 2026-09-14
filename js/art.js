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
      ['...k|cwkk|kkwc|k...', '....|kDkd|dkDk|....', '...k|sdkc|ckds|k...', '...k|wkdw|wdkw|k...', '...k|sdDc|cDds|k...', '..kw|dDww|wwDd|wk..', '...k|cwcw|wcwc|k...', '....|.ksk|ksk.|....', '....|.kwk|kwk.|....', '....|.kkk|kkk.|....'],
      ['...k|cwkk|kkwc|k...', '....|kDkd|dkDk|....', '...k|sdcw|wcdd|k...', '...k|wkdw|wdks|k...', '...k|sdDw|wDdw|k...', '..kw|dDww|wwDd|wk..', '...k|cwcw|wcwc|k...', '....|.ksk|ksk.|....', '....|.kwk|.kk.|....', '....|.kkk|....|....'],
      ['...k|cwkk|kkwc|k...', '....|kDkd|dkDk|....', '...k|ddcw|wcds|k...', '...k|skdw|wdkw|k...', '...k|wdDw|wDds|k...', '..kw|dDww|wwDd|wk..', '...k|cwcw|wcwc|k...', '....|.ksk|ksk.|....', '....|.kk.|kwk.|....', '....|....|kkk.|....'],
    ],
    up: [
      ['...k|cddd|dddc|k...', '....|kDdd|ddDk|....', '...k|sddd|ddds|k...', '...k|wkww|wwkw|k...', '...k|sdwk|kwds|k...', '..kw|dDdw|wdDd|wk..', '...k|cwcw|wcwc|k...', '....|.ksk|ksk.|....', '....|.kwk|kwk.|....', '....|.kkk|kkk.|....'],
      ['...k|cddd|dddc|k...', '....|kDdd|ddDk|....', '...k|sddd|dddd|k...', '...k|wkww|wwks|k...', '...k|sdwk|kwdw|k...', '..kw|dDdw|wdDd|wk..', '...k|cwcw|wcwc|k...', '....|.ksk|ksk.|....', '....|.kwk|.kk.|....', '....|.kkk|....|....'],
      ['...k|cddd|dddc|k...', '....|kDdd|ddDk|....', '...k|dddd|ddds|k...', '...k|skww|wwkw|k...', '...k|wdwk|kwds|k...', '..kw|dDdw|wdDd|wk..', '...k|cwcw|wcwc|k...', '....|.ksk|ksk.|....', '....|.kk.|kwk.|....', '....|....|kkk.|....'],
    ],
    // facing left; right is the mirror image
    side: [
      ['....|kcwk|k...|....', '....|kkDd|dk..|....', '....|kcsd|Dk..|....', '....|kwwd|dk..|....', '....|kcsd|dk..|....', '...k|wdDd|dwk.|....', '...k|cwcw|cwk.|....', '....|.ksk|....|....', '....|.kwk|....|....', '....|kkkk|....|....'],
      ['....|kcwk|k...|....', '....|kkDd|dk..|....', '....|kcds|Dk..|....', '....|kwdw|dk..|....', '....|kcds|dk..|....', '...k|wdDd|dwk.|....', '...k|cwcw|cwk.|....', '...k|sk.k|sk..|....', '..kw|k...|kwk.|....', '.kkk|....|kkk.|....'],
      ['....|kcwk|k...|....', '....|kkDd|dk..|....', '...k|scdd|Dk..|....', '...k|wwdd|dk..|....', '...k|scdd|dk..|....', '...k|wdDd|dwk.|....', '...k|cwcw|cwk.|....', '....|.ksk|....|....', '....|..kw|k...|....', '....|.kkk|k...|....'],
    ],
  };

  // ---------------------------------------------------------------- maid heads (rows 0..13) and hair layers
  // head rows: lace headdress 0-2, hair 3-8, eyelids 9, eyes 10-11, cheeks 12, chin 13 (the side view's headdress is edge-on).
  // under / over: hair drawn behind / in front of the body (24 rows).
  const MAID_PARTS = {
    berry: {
      down: {
        head: [
          '....|.kkk|kkk.|..k.',
          '....|kwww|wwwk|.khk',
          '...c|wcww|wwcw|ckhk',
          '..kc|HHHH|HHHH|ckhk',
          '.cHH|hhhh|hhhh|Hhhk',
          '.kHh|hhhh|hhlL|hHk.',
          'cHHh|Hhhh|hhll|hhHc',
          'kHhh|hHhh|hhhh|hHHk',
          '.kHH|hHhH|hHhH|HHk.',
          '..kH|skks|skks|Hk..',
          '.sHs|kcEs|sEck|sHs.',
          '.tHt|swes|sews|tHt.',
          '..kH|tsss|ssst|Hk..',
          '...k|Htts|sttH|k...',
        ],
      },
      up: {
        head: [
          '..k.|.kkk|kkk.|....',
          'khk.|kwww|wwwk|....',
          'khkc|wcww|wwcw|c...',
          'khkc|HHHH|HHHH|ck..',
          'khhH|hhhh|hhhh|HHc.',
          '.kHh|hhhh|hLlh|hHk.',
          'cHhh|hhhh|hllh|hhHc',
          'kHhh|hhhh|hhhh|hhHk',
          'kHhh|Hhhh|hhhH|hhHk',
          '.kHh|hHhh|hhHh|hHk.',
          '.kHH|hHHh|HHhH|HHk.',
          '.tkH|HHHH|HHHH|Hkt.',
          '..kk|HHHH|HHHH|kk..',
          '....|kHkH|HkHk|....',
        ],
      },
      side: {
        head: [
          '....|..kk|....|....',
          '....|.kwc|k...|....',
          '...k|kHwc|Hkk.|....',
          '..kH|Hhhc|wHHk|....',
          '.kHh|hhhh|hcHH|k...',
          '.kHh|lLhh|hhwh|Hk..',
          'kHhh|llhh|hhhc|wHk.',
          'kHhh|hhhh|hhcw|cwk.',
          'kHhH|hhHh|hhhw|cHk.',
          'kHHk|kHhh|HhhH|hHk.',
          'ksEc|sHhh|hhHh|HHk.',
          'ksew|stHh|hHhH|Hk..',
          '.kts|stHH|HhHH|k...',
          '..kt|tkkH|HHkk|....',
        ],
      },
    },
    yoru: {
      down: {
        head: [
          '....|.kkk|kkk.|....',
          '....|kwww|wwwk|....',
          '...c|wcww|wwcw|c...',
          '..kc|hhhh|hhhh|ck..',
          '.chh|hlhh|hhlh|hhc.',
          '.khh|hlLh|hhlh|hhk.',
          '.chh|lhhh|lhhh|hhc.',
          '.khl|hhhl|lhhh|lhk.',
          'khhh|hhhh|hhhh|hhhk',
          '.kHk|skks|skks|kHk.',
          '.khk|kcEs|sEck|khk.',
          '.khl|swes|sews|lhk.',
          '.khh|tsss|ssst|hhk.',
          '.khl|ktts|sttk|lhk.',
        ],
        over: pad(14, ['.khk|....|....|khk.', '.khl|k...|...k|lhk.', '.khh|k...|...k|hhk.', '.khl|k...|...k|lhk.', '.khh|k...|...k|hhk.', '..kh|k...|...k|hk..', '...k|....|....|k...']),
      },
      up: {
        head: [
          '....|.kkk|kkk.|....',
          '....|kwww|wwwk|....',
          '...c|wcww|wwcw|c...',
          '..kc|hhhh|hhhh|ck..',
          '.chh|hhhh|lLhh|hhc.',
          '.khh|hhhh|llhh|hhk.',
          '.chh|hhhh|hlhh|hhc.',
          '.khh|hhhh|hhhh|hhk.',
          'khhh|hhhh|hhhh|hhhk',
          '.khh|hhhh|hhhh|hhk.',
          '.khh|hlhh|hhhh|hhk.',
          '.khh|hlhh|hhlh|hhk.',
          '.khh|hhhh|hhlh|hhk.',
          '.khh|hhhh|hhhh|hhk.',
        ],
        over: pad(14, ['.khh|hhhh|hhhh|hhk.', '.khh|hlhh|hhhh|hhk.', '.khh|hlhh|hhlh|hhk.', '..kh|hhhh|hhlh|hk..', '..kh|hhhh|hhhh|hk..', '...k|hkhh|hhkh|k...', '....|k.kk|kk.k|....']),
      },
      side: {
        head: [
          '....|..kk|....|....',
          '....|.kwc|k...|....',
          '...k|khwc|hkk.|....',
          '..kh|hhhc|whhk|....',
          '.khh|hhhh|hchh|k...',
          '.khh|lLhh|hhwh|hk..',
          'khhh|llhh|hhhc|whk.',
          'khhh|hhhh|hhcw|cwhk',
          'khhh|hhhh|hhhw|chhk',
          'kHHk|khhh|hhlh|hhhk',
          'ksEc|shhh|hhlh|hhhk',
          'ksew|sthh|hhlh|hhhk',
          '.kts|sthh|hhhl|hhhk',
          '..kt|tkhh|hhhl|hhhk',
        ],
        over: pad(14, ['....|..kh|hhhl|hhk.', '....|..kh|hhhl|hhk.', '....|...k|hhhl|hhk.', '....|...k|hhhh|lhk.', '....|...k|hhhh|lk..', '....|....|khhk|k...', '....|....|.kk.|....']),
      },
    },
    honey: {
      down: {
        head: [
          '....|.kkk|kkk.|....',
          '....|kwww|wwwk|....',
          '...c|wcww|wwcw|c...',
          '..kc|HHHH|HHHH|ck..',
          '.cHh|hhhh|hhhL|hHc.',
          '.kHh|hhhh|hhlL|hHk.',
          'cHhh|Hhhh|hhll|hhHc',
          'kHhH|hhHh|hhhh|HhHk',
          '.kHh|HhhH|hHhh|hHk.',
          '..kH|skks|skks|Hk..',
          '.kHs|kcEs|sEck|sHk.',
          '.kHt|swes|sews|tHk.',
          '..kH|tsss|ssst|Hk..',
          '...k|Htts|sttH|k...',
        ],
        over: pad(12, ['k...|....|....|...k', 'hk..|....|....|..kh', 'Hhkk|....|....|kkhH', 'klhH|k...|...k|Hhlk', '.kHh|k...|...k|hHk.', '..kk|....|....|kk..']),
      },
      up: {
        head: [
          '....|.kkk|kkk.|....',
          '....|kwww|wwwk|....',
          '...c|wcww|wwcw|c...',
          '..kc|HHHH|HHHH|ck..',
          '.cHh|hhhh|hhhh|hHc.',
          '.kHh|hhhh|hlLh|hHk.',
          'cHhh|hhhh|hllh|hhHc',
          'kHhh|Hhhh|hhhh|hhHk',
          'kHhH|hhHh|hHhh|HhHk',
          '.kHh|hhhH|Hhhh|hHk.',
          '.kHH|hHHh|HHhH|HHk.',
          '..kH|HHHH|HHHH|Hk..',
          '...k|kHHH|HHHk|k...',
          '....|kHkH|HkHk|....',
        ],
        over: pad(11, ['k...|....|....|...k', 'hk..|....|....|..kh', 'Hhkk|....|....|kkhH', 'klhH|k...|...k|Hhlk', 'kHhh|k...|...k|hhHk', '.kHh|k...|...k|hHk.', '..kk|....|....|kk..']),
      },
      side: {
        head: [
          '....|..kk|....|....',
          '....|.kwc|k...|....',
          '...k|kHwc|Hkk.|....',
          '..kH|Hhhc|wHHk|....',
          '.kHh|hhhh|hcHH|k...',
          '.kHh|lLhh|hhwh|Hk..',
          'kHhh|llhh|hhhc|wHk.',
          'kHhh|hhhh|hhcw|cwk.',
          'kHhH|hhHh|hhhw|cHk.',
          'kHHk|kHhh|HhhH|hHk.',
          'ksEc|sHhh|hhHh|HHk.',
          'ksew|stHh|hHhH|Hk..',
          '.kts|stHH|HhHH|k...',
          '..kt|tkkH|HHkk|....',
        ],
        under: pad(9, ['....|....|....|kk..', '....|....|...k|hhk.', '....|....|...k|Hlhk', '....|....|...k|hHhh', '....|....|....|kHhk', '....|....|....|.kk.']),
      },
    },
    yukino: {
      down: {
        head: [
          '....|.kkk|kkk.|....',
          '.k..|kwww|wwwk|..k.',
          'khkc|wcww|wwcw|ckhk',
          '.khc|HHHH|HHHH|chk.',
          'kHhh|hhlh|hLhh|hhHk',
          '.kHh|hhll|hlhh|hHk.',
          'khHh|Hhhh|hhhH|hHhk',
          '.kHh|hHhh|hhHh|hHk.',
          'kHhH|HhHH|HHhH|HhHk',
          '.kHk|skks|skks|kHk.',
          '..kH|kcEs|sEck|Hk..',
          '.kHt|swes|sews|tHk.',
          'kHHk|tsss|ssst|kHHk',
          'hHhk|Htts|sttH|khHh',
        ],
        over: pad(14, ['lHk.|....|....|.kHl', 'kHhk|....|....|khHk', 'hHk.|....|....|.kHh', 'kk..|....|....|..kk']),
      },
      up: {
        head: [
          '....|.kkk|kkk.|....',
          '.k..|kwww|wwwk|..k.',
          'khkc|wcww|wwcw|ckhk',
          '.khc|HHHH|HHHH|chk.',
          'kHhh|hhhh|hhhh|hhHk',
          '.kHh|hhhh|hlLh|hHk.',
          'khHh|hhhh|hllh|hHhk',
          '.kHh|Hhhh|hhhh|hHk.',
          'kHhH|hhHh|hHhh|HhHk',
          '.kHh|hhhH|Hhhh|hHk.',
          '.kHH|hHHh|HHhH|HHk.',
          'kHhk|HHHH|HHHH|khHk',
          'hHhk|kHHH|HHHk|khHh',
          'lHhk|kHkH|HkHk|khHl',
        ],
        over: pad(14, ['kHhk|....|....|khHk', 'hHk.|....|....|.kHh', 'kk..|....|....|..kk']),
      },
      side: {
        head: [
          '....|..kk|....|....',
          '....|.kwc|k.k.|....',
          '...k|kHwc|Hkhk|....',
          '..kH|Hhhc|wHHk|k...',
          '.kHh|hhhh|hcHH|hk..',
          'kHhh|lLhh|hhwh|Hk..',
          '.kHh|llhh|hhhc|wHk.',
          'kHhh|hhhh|hhcw|cwhk',
          '.kHH|hhHh|hhhw|cHk.',
          'kHHk|kHhh|HhhH|hHhk',
          'ksEc|sHhh|hhHh|HHk.',
          'ksew|stHh|hHhH|Hk..',
          '.kts|stHH|HhHH|hk..',
          '..kt|tkkH|HHkk|....',
        ],
        under: pad(9, ['....|....|....|.kk.', '....|....|...k|hHhk', '....|....|...k|Hlhh', '....|....|....|khHk', '....|....|....|kHhh', '....|....|....|.kk.']),
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
      FACES[key].forEach((r, i) => { if (r) head[9 + i] = head[9 + i].slice(0, 4) + r + head[9 + i].slice(12); });
      out.faces[key] = compose('down', head, 0, 0);
    }
    return out;
  }
  // expressions replace the eye block (columns 4-11) of head rows 9-12; null keeps the row
  const FACES = {
    happy: ['ssssssss', 'skksskks', 'ksskkssk', 'tpsmmspt'],
    blush: [null, null, null, 'ppsssspp'],
    angry: ['kksssskk', 'skEssEks', 'swessews', 'tpskkspt'],
    tired: ['ssssssss', 'skksskks', 'sEessEes', null],
    sleep: ['ssssssss', 'ssssssss', 'skksskks', 'tpsssspt'],
    surprise: ['skksskks', 'kwEssEwk', 'swessews', 'tpsmmspt'],
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

  // ---------------------------------------------------------------- monsters (16x18, facing down; flip for left/right)
  const MON_PAL = {
    k: K, w: '#ffffff', y: '#ffe14d', p: '#ff9fb4', r: '#ec3d5f', R: '#a51f40', o: '#ff9a2e', g: '#4cb84c', b: '#3d86f0', B: '#1f3b8f', n: '#8a5a3c',
  };

  const MONSTERS = {
    // 塵塵貓 — a dust ball with cat ears, lives under school desks
    dustcat(f) {
      const p = new Pix(16, 18), b = f;
      const L = '#e4e0f0', M = '#a9a2c2', D = '#736c8f';
      tri(p, 2, 1 + b, 5, 5, M); tri(p, 9, 1 + b, 5, 5, M);
      p.set(4, 3 + b, '#ff9fb4'); p.set(11, 3 + b, '#ff9fb4');
      ball(p, 1, 4 + b, 14, 12 - b, L, M, D);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + f * 0.3;
        const px = Math.round(7.5 + Math.cos(a) * 7.6), py = Math.round(10 + b / 2 + Math.sin(a) * (6.3 - b / 2));
        p.set(px, py, Math.sin(a) > 0.3 ? D : M);
      }
      stamp(p, ['kk..', 'wyk.', 'wkk.'], 3, 8 + b, MON_PAL);
      stamp(p, ['..kk', '.kyw', '.kkw'], 9, 8 + b, MON_PAL);
      stamp(p, ['kwk'], 6, 12 + b, MON_PAL);
      const out = p.outlined(K);
      out.rect(4 - (f ? 1 : 0), 16, 3, 2, D); out.rect(9 + (f ? 1 : 0), 16, 3, 2, D);
      return out.outlined(K);
    },
    // 貪吃豬 — eats the pantry, pink and round
    piggy(f) {
      const p = new Pix(16, 18), b = f;
      const L = '#ffe3ea', M = '#ff9fbb', D = '#d86690';
      tri(p, 2, 3 + b, 4, 4, D); tri(p, 10, 3 + b, 4, 4, D);
      ball(p, 1, 4 + b, 14, 12 - b, L, M, D);
      ball(p, 5, 9 + b, 6, 4, null, '#ffc6d6', null);
      p.set(6, 10 + b, '#b23a58'); p.set(9, 10 + b, '#b23a58');
      stamp(p, ['wk', 'kk'], 3, 7 + b, MON_PAL);
      stamp(p, ['kw', 'kk'], 11, 7 + b, MON_PAL);
      p.set(4, 12 + b, '#ff7aa0'); p.set(11, 12 + b, '#ff7aa0');
      const out = p.outlined(K);
      out.rect(4, 16 - (f ? 1 : 0), 2, 2, D); out.rect(10, 16 - (f ? 0 : 1), 2, 2, D);
      return out.outlined(K);
    },
    // 暴走熊 — a runaway stuffed bear from the rose garden
    teddy(f) {
      const p = new Pix(16, 18), b = f;
      const L = '#ffc98a', M = '#e38d42', D = '#a85c24';
      ball(p, 1, 1 + b, 5, 5, null, M, D); ball(p, 10, 1 + b, 5, 5, null, M, D);
      p.set(3, 3 + b, '#ffd9b0'); p.set(12, 3 + b, '#ffd9b0');
      ball(p, 3, 11, 10, 6, L, M, D);
      ball(p, 2, 2 + b, 12, 10, L, M, D);
      ball(p, 5, 7 + b, 6, 4, null, '#ffe2bd', null);
      p.set(7, 7 + b, K); p.set(8, 7 + b, K);
      p.set(7, 9 + b, '#b23a58'); p.set(8, 9 + b, '#b23a58');
      stamp(p, ['k.', 'kw', 'kk'], 4, 4 + b, MON_PAL);
      stamp(p, ['.k', 'wk', 'kk'], 10, 4 + b, MON_PAL);
      ball(p, 6, 12, 4, 3, null, '#ffe2bd', null);
      const out = p.outlined(K);
      out.rect(3 + (f ? 1 : 0), 16, 3, 2, D); out.rect(10 - (f ? 1 : 0), 16, 3, 2, D);
      return out.outlined(K);
    },
    // 果凍怪 — wobbly jelly that slips through furniture
    jelly(f) {
      const p = new Pix(16, 18);
      const L = '#e3f9ff', M = '#5cc8f4', D = '#2a82c8';
      const w = f ? 16 : 14, h = f ? 10 : 12, x = f ? 0 : 1, y = f ? 7 : 5;
      ball(p, x, y, w, h, L, M, D, 0.2);
      tri(p, 5, f ? 3 : 0, 6, f ? 6 : 7, M);
      p.set(7, f ? 5 : 2, L); p.set(6, f ? 6 : 3, L);
      p.set(3, y + 3, '#ffffff'); p.set(4, y + 2, '#ffffff');
      stamp(p, ['k', 'k'], 5, y + 4, MON_PAL);
      stamp(p, ['k', 'k'], 10, y + 4, MON_PAL);
      stamp(p, ['k..k', '.kk.'], 6, y + 7, MON_PAL);
      return p.outlined(K);
    },
    // 企鵝紳士 — a very fast penguin butler
    penguin(f) {
      const p = new Pix(16, 18);
      const L = '#5a5f84', M = '#2d3050', D = '#1a1c30';
      ball(p, 2, 2, 12, 15, L, M, D);
      ball(p, 4, 7, 8, 9, null, '#ffffff', '#d4dcf0');
      ball(p, 4, 3, 8, 5, null, '#ffffff', null);
      p.set(5, 5, K); p.set(10, 5, K);
      stamp(p, ['oo', 'oo'], 7, 6, MON_PAL);
      stamp(p, ['rr.rr', 'rrRrr', 'rr.rr'], 5, 9, MON_PAL);
      if (f) { p.rect(0, 9, 2, 4, M); p.rect(14, 7, 2, 4, M); } else { p.rect(0, 7, 2, 4, M); p.rect(14, 9, 2, 4, M); }
      const out = p.outlined(K);
      out.rect(4, 16, 3, 2, '#ffb238'); out.rect(9, 16, 3, 2, '#ffb238');
      return out.outlined(K);
    },
    // 雪寶寶 — a snow child with a blue scarf
    snowkid(f) {
      const p = new Pix(16, 18), b = f;
      ball(p, 2, 7, 12, 10, '#ffffff', '#eef4ff', '#b8cdeb');
      ball(p, 3, 0 + b, 10, 9, '#ffffff', '#f4f8ff', '#c3d5ef');
      p.rect(3, 8 + b, 10, 2, '#3d86f0'); p.rect(10, 10 + b, 2, 3, '#1f3b8f');
      p.set(5, 4 + b, K); p.set(10, 4 + b, K);
      p.set(7, 5 + b, '#ff8c2e'); p.set(8, 5 + b, '#ff8c2e'); p.set(8, 6 + b, '#ff8c2e');
      p.set(7, 12, '#6d7a99'); p.set(7, 14, '#6d7a99');
      const out = p.outlined(K);
      const arm = f ? 1 : 0;
      out.set(1, 9 - arm, '#8a5a3c'); out.set(0, 8 - arm, '#8a5a3c');
      out.set(14, 9 + arm, '#8a5a3c'); out.set(15, 8 + arm, '#8a5a3c');
      return out;
    },
    // 杯子蛋糕怪 — a cupcake with a temper (takes 2 hits)
    cupcake(f) {
      const p = new Pix(16, 18), b = f;
      // cup
      for (let j = 0; j < 7; j++) {
        const inset = Math.floor(j / 3);
        for (let i = 2 + inset; i < 14 - inset; i++) p.set(i, 10 + j, (i + j) % 3 === 0 ? '#6e3f26' : i < 6 ? '#c98a5a' : '#9c5f3a');
      }
      // frosting
      ball(p, 1, 4 + b, 14, 8, '#fff4f8', '#ffb3cf', '#e27aa6');
      ball(p, 3, 1 + b, 10, 6, '#fff4f8', '#ffc4da', '#e27aa6');
      ball(p, 6, -1 + b, 4, 4, '#ff9aae', '#ec3d5f', '#a51f40');
      p.set(8, -1 + b, '#4cb84c'); p.set(9, 0 + b, '#4cb84c');
      stamp(p, ['kk.', 'wkk'], 3, 7 + b, MON_PAL);
      stamp(p, ['.kk', 'kkw'], 10, 7 + b, MON_PAL);
      stamp(p, ['kwwk'], 6, 11, MON_PAL);
      return p.outlined(K);
    },
    // 糖果龍 — a small candy dragon with a lemon crest
    dragon(f) {
      const p = new Pix(16, 18), b = f;
      const L = '#bff59a', M = '#62c64c', D = '#2f7f36';
      tri(p, 4, 0 + b, 3, 3, '#ffd23f'); tri(p, 7, -1 + b, 3, 4, '#ffd23f'); tri(p, 10, 0 + b, 3, 3, '#ffd23f');
      ball(p, 3, 10, 10, 7, L, M, D);
      ball(p, 2, 2 + b, 12, 10, L, M, D);
      ball(p, 6, 12, 4, 4, null, '#fff3b0', null);
      stamp(p, ['kkk', 'wwk', 'wkk'], 3, 5 + b, MON_PAL);
      stamp(p, ['kkk', 'kww', 'kkw'], 10, 5 + b, MON_PAL);
      p.set(6, 9 + b, D); p.set(9, 9 + b, D);
      stamp(p, ['w..w'], 6, 10 + b, MON_PAL);
      if (f) p.rect(13, 13, 3, 2, M); else p.rect(13, 12, 3, 2, M);
      return p.outlined(K);
    },
    // 鼓鼓兔 — a toy bunny that marches after you banging its drum
    drumbun(f) {
      const p = new Pix(16, 18), b = f;
      const L = '#ffffff', M = '#eceef8', D = '#b3b8d4';
      p.rect(4, 0 + b, 3, 6, M); p.rect(9, 0 + b, 3, 6, M);
      p.vline(5, 1 + b, 4, '#ffb8c8'); p.vline(10, 1 + b, 4, '#ffb8c8');
      ball(p, 2, 4 + b, 12, 9, L, M, D);
      stamp(p, ['kw', 'kk'], 4, 7 + b, MON_PAL);
      stamp(p, ['wk', 'kk'], 10, 7 + b, MON_PAL);
      p.set(7, 10 + b, '#ff7aa0'); p.set(8, 10 + b, '#ff7aa0');
      p.rect(4, 12, 8, 5, '#ec3d5f'); p.hline(4, 12, 8, '#ffffff'); p.hline(4, 16, 8, '#ffffff');
      p.set(6, 14, '#ffd23f'); p.set(9, 14, '#ffd23f');
      const up = f ? [2, 9] : [13, 9], down = f ? [13, 12] : [2, 12];
      for (const [x, y] of [up, down]) { p.rect(x, y + 1, 1, 3, '#c98a5a'); p.set(x, y, '#ffd23f'); }
      const out = p.outlined(K);
      out.rect(5 - (f ? 1 : 0), 17, 2, 1, D); out.rect(9 + (f ? 1 : 0), 17, 2, 1, D);
      return out;
    },
    // 寶石騎士 — a tiny armoured knight guarding the jewel palace (takes two hits)
    gemknight(f) {
      const p = new Pix(16, 18), b = f;
      const L = '#f4f6fb', M = '#b9bfd3', D = '#6f7690';
      tri(p, 6, 0 + b, 4, 4, '#3d86f0');
      ball(p, 3, 11, 10, 6, L, M, D);
      ball(p, 2, 2 + b, 12, 11, L, M, D);
      p.rect(4, 7 + b, 8, 2, '#2a2b40');
      p.set(6, 7 + b, '#ffe14d'); p.set(9, 7 + b, '#ffe14d');
      stamp(p, ['rwr', 'rrR', '.R.'], 7, 3 + b, MON_PAL);
      p.rect(0, 10 + (f ? 1 : 0), 5, 6, '#3d86f0'); p.hline(0, 10 + (f ? 1 : 0), 5, '#8fd3ff'); p.set(2, 12 + (f ? 1 : 0), '#ffd23f');
      const out = p.outlined(K);
      out.rect(4 + (f ? 1 : 0), 16, 3, 2, D); out.rect(9 - (f ? 1 : 0), 16, 3, 2, D);
      return out.outlined(K);
    },
  };

  // 金熊機甲 — boss, 40x44
  function buildBoss(f, hurt) {
    const p = new Pix(40, 44);
    const GL = '#fff0a0', GM = '#ffc53a', GD = '#c47f16';
    const SL = '#dfe3f0', SM = '#8d93ad', SD = '#565b75';
    // treads
    for (let i = 0; i < 34; i++) {
      p.rect(3 + i, 36, 1, 7, (i + f * 2) % 4 < 2 ? SD : SM);
    }
    p.rect(3, 36, 34, 1, SL);
    // body
    ball(p, 6, 18, 28, 20, GL, GM, GD);
    p.rect(14, 24, 12, 8, SD); p.rect(15, 25, 10, 6, '#2a2b40');
    p.rect(17, 27, 2, 2, f % 2 ? '#ec3d5f' : '#ff9aae'); p.rect(21, 27, 2, 2, f % 2 ? '#ffd23f' : '#fff0a0');
    // arms (cannons)
    ball(p, 0, 20, 9, 14, SL, SM, SD); ball(p, 31, 20, 9, 14, SL, SM, SD);
    p.rect(2, 31, 5, 4, '#2a2b40'); p.rect(33, 31, 5, 4, '#2a2b40');
    // head: ears
    ball(p, 5, 0, 11, 11, GL, GM, GD); ball(p, 24, 0, 11, 11, GL, GM, GD);
    ball(p, 8, 3, 5, 5, null, '#ffe0a0', null); ball(p, 27, 3, 5, 5, null, '#ffe0a0', null);
    // head: dome
    ball(p, 8, 3, 24, 19, GL, GM, GD);
    ball(p, 12, 5, 16, 11, '#e6fbff', '#7fd8f2', '#3a8fc0', 0.2);
    // pilot silhouette in the dome
    ball(p, 16, 6, 3, 3, null, '#2e4a6e', null); ball(p, 21, 6, 3, 3, null, '#2e4a6e', null); ball(p, 16, 8, 8, 7, null, '#2e4a6e', null); p.set(18, 11, '#7fd8f2'); p.set(21, 11, '#7fd8f2'); p.set(14, 7, '#ffffff'); p.set(13, 8, '#ffffff');
    // visor eyes
    const eye = hurt ? '#ffffff' : '#ec3d5f';
    p.rect(10, 16, 7, 3, '#2a2b40'); p.rect(23, 16, 7, 3, '#2a2b40');
    p.rect(12, 17, 3, 1, eye); p.rect(25, 17, 3, 1, eye);
    let out = p.outlined(K);
    if (hurt) out = out.map((c) => [Math.min(255, c[0] + 110), Math.min(255, c[1] + 110), Math.min(255, c[2] + 110), 255]);
    return out;
  }

  function brighten(pix) {
    return pix.map((c) => [Math.min(255, c[0] + 110), Math.min(255, c[1] + 110), Math.min(255, c[2] + 110), 255]);
  }
  // 2px-wide segment for spindly legs
  function seg(p, x0, y0, x1, y1, col) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
      p.rect(x, y, 2, 2, col);
    }
  }

  // BOSS 1 — drill bot: a school cleaning robot with a spinning drill on its head (40x44)
  function buildDrill(f, hurt) {
    const p = new Pix(40, 44);
    const SL = '#f4f6fb', SM = '#b9bfd3', SD = '#6f7690', SX = '#474c63';
    for (let i = 0; i < 26; i++) p.rect(7 + i, 37, 1, 6, (i + f * 2) % 4 < 2 ? SX : SD);
    p.rect(7, 37, 26, 1, SM);
    ball(p, 0, 21, 9, 12, SL, SM, SD); ball(p, 31, 21, 9, 12, SL, SM, SD);
    p.rect(1, 31, 4, 3, '#ec3d5f'); p.rect(35, 31, 4, 3, '#ec3d5f');
    ball(p, 6, 12, 28, 27, SL, SM, SD, 0.12);
    p.rect(8, 31, 24, 3, '#ec3d5f'); p.hline(8, 31, 24, '#ff8aa0');
    p.set(12, 32, '#ffd23f'); p.set(20, 32, '#ffd23f'); p.set(27, 32, '#ffd23f');
    ball(p, 11, 17, 18, 11, null, '#2a2b40', null);
    const eye = hurt ? '#ffffff' : f % 2 ? '#8ff6ff' : '#45d2e2';
    p.rect(14, 21, 4, 3, eye); p.rect(22, 21, 4, 3, eye);
    p.set(14, 21, '#ffffff'); p.set(22, 21, '#ffffff');
    p.rect(17, 26, 6, 1, '#45d2e2');
    // the drill: spiral bands shift each frame so it looks like it spins
    for (let j = 0; j < 14; j++) {
      const half = Math.max(1, Math.round(((j + 1) * 7) / 14));
      for (let i = -half; i < half; i++) p.set(20 + i, j, ((j + i + f * 2) & 3) < 2 ? '#fff0a0' : '#d9961a');
    }
    p.rect(12, 13, 16, 3, SD); p.hline(12, 13, 16, SM);
    const out = p.outlined(K);
    return hurt ? brighten(out) : out;
  }

  // BOSS 2 — flame spider: a red mechanical spider with a fire crest (40x44)
  function buildSpider(f, hurt) {
    const p = new Pix(40, 44);
    const RL = '#ff9f8f', RM = '#d8323f', RD = '#8e1a2a', LEG = '#6a2a38', JOINT = '#ffd23f';
    const s = f % 2 ? 1 : -1;
    for (const side of [-1, 1]) {
      const bx = 19 + side * 8;
      const legs = [
        [bx, 23, 19 + side * 16, 16, 19 + side * 19, 29 + s * side],
        [bx, 27, 19 + side * 15, 25, 19 + side * 18, 37 - s * side],
        [bx, 30, 19 + side * 11, 34, 19 + side * 13, 41 + s * side],
      ];
      for (const [x0, y0, x1, y1, x2, y2] of legs) {
        seg(p, x0, y0, x1, y1, LEG);
        seg(p, x1, y1, x2, y2, LEG);
        p.rect(x1, y1, 2, 2, JOINT);
      }
    }
    ball(p, 7, 15, 26, 22, RL, RM, RD);
    for (const x of [11, 19, 27]) p.set(x, 17, JOINT);
    p.hline(10, 33, 20, RD); p.set(14, 34, JOINT); p.set(25, 34, JOINT);
    p.rect(12, 20, 6, 5, '#ffffff'); p.rect(22, 20, 6, 5, '#ffffff');
    const pupil = hurt ? '#ffffff' : '#2a1b30';
    p.rect(14, 22, 3, 3, pupil); p.rect(23, 22, 3, 3, pupil);
    p.hline(11, 19, 7, K); p.hline(22, 19, 7, K);
    // grinning mouth with two fangs
    p.rect(14, 28, 12, 2, '#4a0e1c');
    p.rect(15, 30, 2, 1, '#ffffff'); p.set(15, 31, '#ffffff');
    p.rect(23, 30, 2, 1, '#ffffff'); p.set(24, 31, '#ffffff');
    // fire crest flickers between frames
    const fl = f % 2;
    tri(p, 11, 1 + fl, 18, 16 - fl, '#ff8a2e');
    tri(p, 14, 4 - fl, 12, 13 + fl, '#ffd23f');
    tri(p, 17, 9, 6, 8, '#fff6cc');
    const out = p.outlined(K);
    return hurt ? brighten(out) : out;
  }

  // ---------------------------------------------------------------- bomb (16x16), maid-cap cherry bomb
  function buildBomb(f) {
    const p = new Pix(16, 16);
    const sq = f === 1;
    ball(p, sq ? 1 : 2, sq ? 5 : 4, sq ? 14 : 12, sq ? 11 : 12, '#ffb3c1', '#ea3c5e', '#a51f40', 0.16);
    // maid cap frill
    const y = sq ? 4 : 3;
    p.rect(5, y, 6, 2, '#ffffff');
    p.set(4, y + 1, '#ffffff'); p.set(11, y + 1, '#ffffff');
    p.set(6, y + 1, '#bdd2ef'); p.set(9, y + 1, '#bdd2ef');
    // heart emblem
    stamp(p, ['w.w', 'www', '.w.'], 8, sq ? 9 : 8, { w: '#ffd6de' });
    let out = p.outlined(K);
    // fuse + spark
    out.set(8, y - 1, '#8a5a3c'); out.set(9, y - 2, '#8a5a3c');
    const sparks = [
      ['.y.', 'ywy', '.y.'],
      ['y.y', '.w.', 'y.y'],
      ['.w.', 'wyw', '.w.'],
    ];
    stamp(out, sparks[f % 3], 9, y - 5, { y: '#ffd23f', w: '#ffffff' });
    return out;
  }

  // ---------------------------------------------------------------- flames (16x16) by connection mask + stage
  // mask bits: 1=up 2=right 4=down 8=left
  const FLAME_R = [3.2, 6.4, 7.6, 6.2, 3.6];
  function buildFlame(mask, stage) {
    const p = new Pix(16, 16);
    const c = 7.5;
    const segs = [];
    if (mask & 1) segs.push([c, -2]);
    if (mask & 2) segs.push([17.5, c]);
    if (mask & 4) segs.push([c, 17.5]);
    if (mask & 8) segs.push([-2, c]);
    const isCenter = segs.length !== 1 && !((mask === 5) || (mask === 10));
    const R = FLAME_R[stage] + (isCenter ? 0.8 : 0);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        let d = Math.hypot(x - c, y - c) * 0.94;
        for (const s of segs) {
          // distance to segment c->s
          const vx = s[0] - c, vy = s[1] - c;
          const t = Math.max(0, Math.min(1, ((x - c) * vx + (y - c) * vy) / (vx * vx + vy * vy)));
          const bx = c + vx * t, by = c + vy * t;
          d = Math.min(d, Math.hypot(x - bx, y - by) * 1.42);
        }
        const n = (hash(x, y, stage * 7 + mask) - 0.5) * 1.6;
        const r = R + n;
        if (d > r) continue;
        const q = d / r;
        let col = '#d8243c';
        if (q < 0.3) col = stage === 2 ? '#ffffff' : '#fff6cc';
        else if (q < 0.6) col = '#ffd23f';
        else if (q < 0.84) col = '#ff7a1a';
        p.set(x, y, col);
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
      wallTop(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#fbe6c8');
        p.rect(0, 12, 16, 4, '#9c5a34'); p.hline(0, 12, 16, '#c47a48');
        if (i % 2 === 0) {
          p.rect(3, 2, 10, 8, K); p.rect(4, 3, 8, 6, '#8fd3ff');
          p.rect(4, 3, 8, 2, '#c9ecff'); p.vline(8, 3, 6, '#ffffff'); p.hline(4, 6, 8, '#ffffff');
        } else {
          p.rect(5, 3, 6, 7, '#2e7d4f'); p.rect(6, 4, 4, 5, '#3fa065');
          p.set(7, 5, '#ffffff'); p.set(8, 7, '#ffffff');
        }
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
      floor(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, i ? '#79c957' : '#86d462');
        for (let n = 0; n < 7; n++) {
          const x = Math.floor(hash(n, i, 11) * 15), y = Math.floor(hash(n, i, 12) * 14);
          p.set(x, y + 1, '#5ea93f'); p.set(x + 1, y, '#5ea93f');
        }
        if (hash(i, 5, 13) > 0.5) { p.set(4, 11, '#ffffff'); p.set(12, 5, '#ffe14d'); }
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
      wallTop(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 7, '#8fd3ff'); p.hline(0, 5, 16, '#c9ecff');
        ball(p, -2, 5, 20, 12, '#6fd060', '#3f9c44', '#2a6e32');
        p.set(4 + (i % 3) * 3, 9, '#ff5c7a'); p.set(11 - (i % 2) * 5, 11, '#ffe14d');
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
      wallTop(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#314a78');
        tri(p, 2, 1, 12, 13, '#2e7d5a'); tri(p, 4, 0, 8, 6, '#ffffff');
        p.rect(7, 13, 2, 3, '#6d4a36');
        p.set(3 + (i % 5) * 2, 3, '#ffffff');
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
      wallTop(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#ffe0ec');
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (((x + y + i * 2) >> 2) % 2 === 0) p.set(x, y, '#ffffff');
        p.rect(0, 12, 16, 4, '#e0a45a'); p.hline(0, 12, 16, '#ffd08a');
        p.set(4, 14, '#9c5f3a'); p.set(11, 14, '#9c5f3a');
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
      wallTop(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#3a3e56');
        p.rect(2, 2, 12, 8, '#2a2b40'); p.rect(3, 3, 10, 6, i % 2 ? '#3fa065' : '#3d86f0');
        p.hline(4, 5, 6, '#b8f28a'); p.hline(4, 7, 4, '#b8f28a');
        p.rect(0, 12, 16, 4, '#ffc53a');
        for (let x = 0; x < 16; x += 4) p.rect(x, 12, 2, 4, '#2a2b40');
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
      wallTop(i) { // stage lights
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#3b2f52');
        p.rect(0, 11, 16, 5, '#ffd23f'); p.hline(0, 11, 16, '#fff0a0');
        p.rect(7, 0, 2, 3, '#1c1526');
        ball(p, 3, 2, 10, 8, '#ffffff', i ? '#ff9fbb' : '#8fd3ff', i ? '#ec3d5f' : '#3d86f0');
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
      wallTop(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#7a1f3a');
        p.rect(0, 11, 16, 5, '#e0a014'); p.hline(0, 11, 16, '#ffe38a');
        stamp(p, ['.y.', 'yry', '.y.'], 6, 3, { y: '#ffd23f', r: i ? '#3d86f0' : '#ec3d5f' });
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
      wallTop(i) {
        const p = new Pix(16, 16);
        p.rect(0, 0, 16, 16, '#ffc9da');
        for (let x = 0; x < 16; x += 4) p.vline(x + 1, 0, 12, '#ffb0c8');
        for (let x = 0; x < 16; x++) p.set(x, 12 + ((x >> 1) % 2), '#ffffff');
        p.rect(0, 14, 16, 2, '#3b2f52');
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

  function buildTheme(key) {
    const T = THEMES[key];
    return {
      key, name: T.name, bg: T.bg,
      floor: [T.floor(0), T.floor(1)],
      hard: T.hard(),
      hard2: T.hard2 ? T.hard2() : null,
      soft: [T.soft(0), T.soft(1), T.soft(2)],
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
  function buildBgTile() {
    const p = new Pix(32, 32);
    p.rect(0, 0, 32, 32, '#ffd9e5');
    p.rect(0, 0, 16, 16, '#ffe9f0'); p.rect(16, 16, 16, 16, '#ffe9f0');
    stamp(p, ['.w...w.', '.w...w.', 'wwwwwww', 'wkwwwkw', 'wwwpwww', '.wwwww.'], 4, 5, { w: '#ffffff', k: '#e27aa6', p: '#ff9fbb' });
    stamp(p, ['.w...w.', '.w...w.', 'wwwwwww', 'wkwwwkw', 'wwwpwww', '.wwwww.'], 20, 21, { w: '#ffffff', k: '#e27aa6', p: '#ff9fbb' });
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
  function buildFurniture(id) {
    let p;
    switch (id) {
      case 'bed': {
        p = new Pix(16, 36);
        p.rect(1, 1, 14, 8, '#a8683c'); p.hline(1, 1, 14, '#d99058'); p.rect(3, 3, 10, 4, '#8c5530');
        p.rect(1, 9, 14, 24, '#ffffff');
        ball(p, 3, 9, 10, 7, '#ffffff', '#f4f0fa', '#d8d0e8');
        p.rect(1, 16, 14, 17, '#ff9fbb'); p.hline(1, 16, 14, '#ffffff'); p.hline(1, 17, 14, '#ffd6e2');
        stamp(p, ['w.w', 'www', '.w.'], 4, 21, { w: '#ffd6e2' });
        stamp(p, ['w.w', 'www', '.w.'], 9, 26, { w: '#ffd6e2' });
        p.rect(1, 32, 14, 3, '#a8683c'); p.hline(1, 32, 14, '#d99058');
        return p.outlined(K);
      }
      case 'princess': {
        p = new Pix(32, 42);
        p.rect(1, 9, 2, 30, '#ffd23f'); p.rect(29, 9, 2, 30, '#ffd23f');
        p.rect(3, 12, 26, 24, '#ffffff');
        ball(p, 5, 12, 10, 7, '#ffffff', '#f4f0fa', '#d8d0e8'); ball(p, 17, 12, 10, 7, '#ffffff', '#f4f0fa', '#d8d0e8');
        p.rect(3, 19, 26, 17, '#ffc2d8'); p.hline(3, 19, 26, '#ffffff'); p.hline(3, 20, 26, '#ffe0ea');
        stamp(p, ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], 12, 25, { r: '#ff6f91' });
        p.rect(1, 36, 30, 4, '#ffd23f'); p.hline(1, 36, 30, '#fff0a0');
        p.rect(1, 1, 30, 9, '#ff9fbb'); p.hline(1, 1, 30, '#ffd23f'); p.hline(1, 2, 30, '#ffd6e2');
        for (let x = 1; x < 31; x += 4) { p.rect(x, 10, 3, 2, '#ffffff'); p.set(x + 1, 12, '#ffffff'); }
        return p.outlined(K);
      }
      case 'desk': {
        p = new Pix(16, 24);
        tri(p, 1, 1, 8, 5, '#ec3d5f'); p.hline(2, 5, 6, '#a51f40');
        p.rect(4, 6, 1, 4, '#6d4a36');
        p.rect(1, 9, 14, 6, '#e0a262'); p.hline(1, 9, 14, '#f5c48a');
        p.rect(9, 10, 5, 3, '#3d86f0'); p.hline(9, 10, 5, '#ffffff');
        p.rect(1, 15, 14, 8, '#b8763c'); p.rect(4, 17, 8, 3, '#9c5f3a'); p.set(8, 18, '#ffd23f');
        return p.outlined(K);
      }
      case 'wardrobe': {
        p = new Pix(16, 28);
        p.rect(1, 1, 14, 3, '#a8683c'); p.hline(1, 1, 14, '#d99058');
        p.rect(1, 4, 14, 22, '#c98a5a');
        p.rect(3, 6, 4, 17, '#b8763c'); p.rect(9, 6, 4, 17, '#b8763c'); p.vline(8, 4, 22, '#8c5530');
        p.set(7, 14, '#ffd23f'); p.set(9, 14, '#ffd23f');
        p.rect(1, 26, 14, 1, '#8c5530');
        return p.outlined(K);
      }
      case 'teatable': {
        p = new Pix(16, 20);
        p.rect(7, 14, 2, 5, '#8c5530');
        ball(p, 1, 7, 14, 10, '#fff4f8', '#ffc2d4', '#e2769c');
        for (let x = 2; x < 14; x += 2) p.set(x, 15 + (x % 4 === 0 ? 1 : 0), '#ffffff');
        ball(p, 3, 3, 6, 6, '#ffffff', '#ffffff', '#b8cdeb'); p.set(5, 5, '#3d86f0'); p.set(6, 6, '#3d86f0'); p.set(2, 5, '#b8cdeb'); p.rect(5, 2, 2, 1, '#b8cdeb');
        p.rect(10, 8, 3, 3, '#ffffff'); p.set(11, 8, '#c98a5a');
        return p.outlined(K);
      }
      case 'bookshelf': {
        p = new Pix(16, 28);
        p.rect(1, 1, 14, 26, '#8c5530'); p.rect(2, 2, 12, 24, '#5e3423');
        const cols = ['#ec3d5f', '#3d86f0', '#4cb84c', '#ffd23f', '#ff9fbb', '#9b87c9'];
        for (let s = 0; s < 3; s++) {
          const y = 3 + s * 8;
          let x = 2;
          let n = s * 2;
          while (x < 13) {
            const w = 1 + ((n * 7) % 2);
            p.rect(x, y + ((n * 3) % 2), w, 6 - ((n * 3) % 2), cols[n % cols.length]);
            x += w + (n % 3 === 0 ? 1 : 0);
            n++;
          }
          p.hline(2, y + 6, 12, '#a8683c');
        }
        return p.outlined(K);
      }
      case 'plant': {
        p = new Pix(16, 24);
        ball(p, 2, 2, 12, 12, '#8ee27a', '#4cb84c', '#2c7a33');
        ball(p, 5, 0, 6, 6, '#a6ee8e', '#5cc65a', null);
        stamp(p, ['.p.', 'pyp', '.p.'], 9, 3, { p: '#ff6f91', y: '#ffd23f' });
        for (let j = 0; j < 8; j++) p.rect(4 + (j >> 3), 14 + j, 8 - (j >> 3) * 2, 1, j === 0 ? '#e07a44' : '#c9602c');
        return p.outlined(K);
      }
      case 'plush': {
        p = new Pix(16, 20);
        p.rect(4, 1, 3, 7, '#ffffff'); p.rect(9, 1, 3, 7, '#ffffff'); p.vline(5, 2, 5, '#ffc2d4'); p.vline(10, 2, 5, '#ffc2d4');
        ball(p, 2, 6, 12, 12, '#ffffff', '#f7f3fb', '#d8d0e8');
        p.set(5, 11, K); p.set(10, 11, K); p.set(7, 13, '#ff9fbb'); p.set(8, 13, '#ff9fbb');
        p.rect(5, 16, 6, 2, '#ec3d5f'); p.set(8, 15, '#ec3d5f');
        return p.outlined(K);
      }
      case 'rug': {
        p = new Pix(32, 32);
        ball(p, 1, 1, 30, 30, '#ffe0ea', '#ff9fbb', '#e2769c');
        ball(p, 6, 6, 20, 20, null, '#ffc2d4', null);
        stamp(p, ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], 12, 13, { r: '#ec3d5f' });
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          p.set(Math.round(15.5 + Math.cos(a) * 13.5), Math.round(15.5 + Math.sin(a) * 13.5), '#ffffff');
        }
        return p.outlined('#b8557c');
      }
      case 'piano': {
        p = new Pix(32, 26);
        p.rect(1, 1, 30, 16, '#2e2440'); p.hline(1, 1, 30, '#5b4c78');
        p.rect(9, 4, 14, 6, '#4a3d66'); p.rect(11, 5, 10, 4, '#ffffff');
        for (let x = 12; x < 20; x += 2) p.set(x, 6, K);
        p.rect(1, 17, 30, 6, '#ffffff');
        for (let x = 3; x < 30; x += 4) p.rect(x, 17, 2, 3, '#1c1526');
        p.rect(1, 23, 30, 2, '#2e2440');
        return p.outlined(K);
      }
      case 'lamp': {
        p = new Pix(16, 28);
        for (let j = 0; j < 8; j++) p.rect(5 - (j >> 2), 1 + j, 6 + (j >> 2) * 2, 1, j < 2 ? '#fff6cc' : '#ffe38a');
        p.rect(7, 9, 2, 14, '#6d4a36');
        ball(p, 4, 22, 8, 5, null, '#8c5530', '#5e3423');
        return p.outlined(K);
      }
      case 'fishbowl': {
        p = new Pix(16, 20);
        p.rect(3, 15, 10, 3, '#c98a5a'); p.hline(3, 15, 10, '#e0a262'); p.rect(4, 18, 2, 1, '#8c5530'); p.rect(10, 18, 2, 1, '#8c5530');
        ball(p, 1, 2, 14, 13, '#ffffff', '#dff3ff', '#a9d8f5', 0.2);
        ball(p, 2, 6, 12, 8, null, '#7cc8f7', '#4fa6e0');
        p.hline(3, 6, 10, '#bfe6ff');
        p.rect(5, 2, 6, 1, '#ffffff'); p.hline(4, 1, 8, '#a9d8f5');
        stamp(p, ['.oo..o', 'ooooo.', '.oo..o'], 5, 8, { o: '#ff8a2e' });
        p.set(6, 9, K); p.set(7, 8, '#ffd23f');
        p.set(4, 5, '#ffffff'); p.set(11, 4, '#ffffff');
        return p.outlined(K);
      }
      case 'dresser': {
        p = new Pix(16, 28);
        ball(p, 3, 1, 10, 11, null, '#ffd23f', '#e0a014');
        ball(p, 5, 3, 6, 7, '#ffffff', '#d6efff', '#a9d8f5');
        p.set(6, 4, '#ffffff'); p.rect(7, 11, 2, 2, '#e0a014');
        p.rect(1, 13, 14, 2, '#ffffff'); p.hline(1, 14, 14, '#f0d6e2');
        p.rect(2, 11, 1, 2, '#ec3d5f'); p.set(2, 10, '#ffd23f'); p.rect(12, 11, 2, 2, '#ff9fbb');
        p.rect(2, 15, 12, 11, '#ffe0ea'); p.vline(2, 15, 11, '#ffffff');
        p.hline(2, 20, 12, '#e2a0bc'); p.set(8, 17, '#ffd23f'); p.set(8, 23, '#ffd23f');
        p.rect(2, 26, 2, 1, '#c98a5a'); p.rect(12, 26, 2, 1, '#c98a5a');
        return p.outlined(K);
      }
      case 'sofa': {
        p = new Pix(32, 22);
        ball(p, 3, 1, 26, 13, '#ffe0ea', '#ff9fbb', '#e2769c');
        stamp(p, ['.rr.rr.', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], 13, 4, { r: '#ec3d5f' });
        p.rect(4, 11, 24, 5, '#ffc2d4'); p.hline(4, 11, 24, '#ffe0ea'); p.vline(16, 12, 4, '#ff9fbb');
        ball(p, 0, 8, 7, 10, '#ffe0ea', '#ff9fbb', '#e2769c');
        ball(p, 25, 8, 7, 10, '#ffe0ea', '#ff9fbb', '#e2769c');
        p.rect(3, 16, 26, 3, '#e2769c'); p.hline(3, 16, 26, '#f28fb0');
        p.rect(4, 19, 2, 2, '#8c5530'); p.rect(26, 19, 2, 2, '#8c5530');
        return p.outlined(K);
      }
      case 'gramophone': {
        p = new Pix(16, 28);
        ball(p, 1, 1, 12, 10, '#fff6cc', '#ffd23f', '#e0a014');
        ball(p, 3, 3, 7, 5, null, '#a86f12', null);
        p.rect(8, 10, 2, 4, '#e0a014'); p.set(9, 10, '#fff0a0');
        p.rect(3, 13, 10, 1, K); p.set(8, 13, '#ec3d5f');
        p.rect(3, 14, 10, 6, '#a8683c'); p.hline(3, 14, 10, '#d99058'); p.rect(5, 16, 6, 2, '#8c5530');
        p.set(13, 16, '#ffd23f'); p.set(14, 15, '#ffd23f');
        p.rect(3, 20, 10, 2, '#8c5530');
        p.rect(4, 22, 1, 5, '#6d4a36'); p.rect(11, 22, 1, 5, '#6d4a36');
        return p.outlined(K);
      }
    }
    return null;
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
    art.bomb = [buildBomb(0), buildBomb(1), buildBomb(2)];
    art.flame = {};
    for (let mask = 0; mask < 16; mask++) art.flame[mask] = [0, 1, 2, 3, 4].map((s) => buildFlame(mask, s));
    art.decor = {};
    for (const k of ['treehouse', 'igloo', 'castle', 'podium', 'cane', 'stage', 'egg']) art.decor[k] = buildDecor(k);
    art.bgTile = buildBgTile();
    for (const k of Object.keys(ICONS)) art.items[k] = buildItem(k);
    art.items.coin = [0, 1, 2, 3].map(buildCoin);
    art.items.dust = [0, 1, 2].map(buildDust);
    for (const k of Object.keys(UI)) art.ui[k] = fromRows(UI[k], UI_PAL);
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
